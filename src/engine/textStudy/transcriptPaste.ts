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
