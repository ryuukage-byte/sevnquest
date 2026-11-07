// ==============================================================================
// TRANSCRIPT PASTE
// Ubah teks transkrip yang disalin dari panel "Tampilkan transkrip" YouTube menjadi baris berwaktu.
// Bentuk yang diterima (boleh campur):
//   0:03                      0:03 どれくらい、理解できるか
//   どれくらい、理解できるか      1:02:15 次の文
// Waktu akhir tiap baris = waktu mulai baris berikutnya (baris terakhir + perkiraan dari panjang teks).
// ==============================================================================

import type { CaptionLineInput } from './captionAnalysis';

const STAMP_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\s+(.*))?$/;
const LAST_LINE_MIN_MS = 1500;
const MS_PER_CHAR = 180;

function stampToMs(h: string | undefined, m: string, s: string): number {
  return ((Number(h ?? 0) * 60 + Number(m)) * 60 + Number(s)) * 1000;
}

export function parseTranscriptPaste(raw: string): CaptionLineInput[] {
  const entries: { startMs: number; parts: string[] }[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = STAMP_RE.exec(line);
    if (m) {
      entries.push({ startMs: stampToMs(m[1], m[2], m[3]), parts: m[4] ? [m[4].trim()] : [] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].parts.push(line);
    }
    // Teks sebelum stempel waktu pertama (judul/bab) diabaikan.
  }

  const lines: CaptionLineInput[] = [];
  const kept = entries
    .map(e => ({ startMs: e.startMs, text: e.parts.join(' ').replace(/\s+/g, ' ').trim() }))
    .filter(e => e.text.length > 0)
    .sort((a, b) => a.startMs - b.startMs);
  kept.forEach((e, i) => {
    const next = kept[i + 1];
    const endMs = next && next.startMs > e.startMs
      ? next.startMs
      : e.startMs + Math.max(LAST_LINE_MIN_MS, e.text.length * MS_PER_CHAR);
    lines.push({ startMs: e.startMs, endMs, text: e.text });
  });
  return lines;
}

// ------------------------------------------------------------------------------
// SRT / WebVTT (mis. keluaran Whisper: whisper audio.mp3 --language ja --output_format srt)
// ------------------------------------------------------------------------------

const CUE_TIME_RE = /^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})/;

function cueTimeToMs(t: string): number {
  const [clock, frac] = t.replace(',', '.').split('.');
  const parts = clock.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000 + Number((frac ?? '0').padEnd(3, '0').slice(0, 3));
}

/** True bila teks tampak seperti SRT/VTT (ada baris "00:00:01,000 --> 00:00:03,000"). */
export function looksLikeSubtitleFile(raw: string): boolean {
  return raw.split(/\r?\n/).some(l => CUE_TIME_RE.test(l));
}

export function parseSubtitleFile(raw: string): CaptionLineInput[] {
  const lines: CaptionLineInput[] = [];
  for (const block of raw.replace(/\r/g, '').split(/\n\s*\n/)) {
    const rows = block.split('\n');
    const idx = rows.findIndex(r => CUE_TIME_RE.test(r));
    if (idx < 0) continue;
    const m = CUE_TIME_RE.exec(rows[idx])!;
    const text = rows.slice(idx + 1).join(' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const startMs = cueTimeToMs(m[1]);
    const endMs = cueTimeToMs(m[2]);
    if (text && endMs > startMs) lines.push({ startMs, endMs, text });
  }
  return lines.sort((a, b) => a.startMs - b.startMs);
}
