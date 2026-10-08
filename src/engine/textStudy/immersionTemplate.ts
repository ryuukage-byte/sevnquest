// ==============================================================================
// IMMERSION TEMPLATE
// Format JSON yang bisa dibuat AI di luar aplikasi lalu dijalankan di Dungeon Imersi untuk sebuah
// video YouTube. Dua bagian murni (tanpa UI): penyusun prompt dan validator hasilnya.
//
// JSON dari luar = masukan tak tepercaya: dibatasi ukurannya, dibersihkan, dan hanya dipakai sebagai teks.
// ==============================================================================

import type { CaptionLineInput } from './captionAnalysis';
import type { TimedWord } from './wordTiming';

export const TEMPLATE_SCHEMA = 'sevnquest.immersion.v1';

const MAX_LINES = 2000;
const MAX_PROMPT_LINES = 400;
const MAX_TEXT = 300;
const MAX_TRANSLATION = 500;
const MAX_WORDS_PER_LINE = 80;
const FALLBACK_LINE_MS = 3000;
const MERGE_TOLERANCE_MS = 80;
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export interface ImmersionTemplate {
  videoId: string;
  title?: string;
  lines: CaptionLineInput[];
}

export type TemplateParseResult =
  | { ok: true; template: ImmersionTemplate; dropped: number }
  | { ok: false; error: string };

// ------------------------------------------------------------------------------
// PROMPT
// ------------------------------------------------------------------------------

const EXAMPLE_JSON = `{
  "schema": "${TEMPLATE_SCHEMA}",
  "videoId": "<ID video 11 karakter>",
  "title": "<judul, opsional>",
  "lines": [
    {
      "startMs": 640,
      "endMs": 4900,
      "text": "<kalimat Jepang>",
      "translation": "<terjemahan Indonesia>"
    }
  ]
}`;

/** Prompt untuk AI di luar aplikasi. Bila `lines` ada, AI hanya memperbaiki teks dan menerjemahkan. */
export function buildImmersionPrompt(videoId: string, lines?: readonly CaptionLineInput[]): string {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const head = [
    'Kamu asisten belajar bahasa Jepang untuk orang Indonesia.',
    `Tugas: hasilkan data JSON untuk video YouTube ini: ${url}`,
  ];

  const format = ['FORMAT JSON (ikuti persis):', EXAMPLE_JSON];

  if (lines && lines.length > 0) {
    const sent = lines.slice(0, MAX_PROMPT_LINES).map(l => ({ startMs: Math.round(l.startMs), endMs: Math.round(l.endMs), text: l.text }));
    return [
      ...head,
      '',
      'ATURAN',
      '1. Balas HANYA dengan satu blok JSON valid. Tanpa penjelasan, tanpa teks di luar JSON.',
      '2. Pertahankan "startMs" dan "endMs" PERSIS seperti data di bawah. Jangan mengarang atau mengubah waktu.',
      '3. Jumlah dan urutan baris harus sama dengan data. Jangan menggabung atau memecah baris.',
      '4. Perbaiki "text" bila jelas salah dengar (caption otomatis sering salah). Jika sudah benar, biarkan.',
      '5. Isi "translation" dengan terjemahan bahasa Indonesia yang natural untuk tiap baris.',
      '6. Isi "videoId" dengan nilai yang sama seperti pada URL.',
      '',
      ...format,
      '',
      `DATA BARIS (subtitle dari YouTube, urut waktu${lines.length > MAX_PROMPT_LINES ? `, hanya ${MAX_PROMPT_LINES} baris pertama` : ''}):`,
      JSON.stringify(sent),
    ].join('\n');
  }

  return [
    ...head,
    '',
    'ATURAN',
    '1. Balas HANYA dengan satu blok JSON valid. Tanpa penjelasan, tanpa teks di luar JSON.',
    '2. Hanya kerjakan jika kamu benar-benar bisa mengakses isi video (suara/subtitle-nya). Jika tidak bisa, katakan terus terang dan JANGAN mengarang lirik atau waktu.',
    '3. Satu baris JSON = satu kalimat atau satu baris lirik. "startMs" dan "endMs" dalam milidetik dari awal video, urut dan tidak tumpang tindih.',
    '4. Isi "text" dengan teks Jepang yang benar (kanji/kana yang wajar).',
    '5. Isi "translation" dengan terjemahan bahasa Indonesia yang natural.',
    '6. Isi "videoId" dengan ID pada URL.',
    '',
    ...format,
  ].join('\n');
}

// ------------------------------------------------------------------------------
// PARSE + VALIDATE
// ------------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 86_400_000;
const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Ambil objek JSON dari balasan AI: toleran terhadap pagar kode ``` dan kalimat pembuka/penutup. */
function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no_json');
  return JSON.parse(text.slice(start, end + 1));
}

function cleanWords(raw: unknown): TimedWord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const words: TimedWord[] = [];
  for (const w of raw.slice(0, MAX_WORDS_PER_LINE)) {
    if (!isObj(w)) return undefined;
    const text = clean(w.text, 40);
    if (!text || !isMs(w.startMs) || !isMs(w.endMs) || w.endMs < w.startMs) return undefined;
    words.push({ text, startMs: w.startMs, endMs: w.endMs });
  }
  return words.length > 0 ? words : undefined;
}

export function parseImmersionTemplate(raw: string, fallbackVideoId?: string): TemplateParseResult {
  let data: unknown;
  try {
    data = extractJson(raw);
  } catch {
    return { ok: false, error: 'Tidak ada JSON yang valid di teks yang ditempel.' };
  }
  if (!isObj(data)) return { ok: false, error: 'Isi JSON harus berupa objek.' };

  const videoId = typeof data.videoId === 'string' && ID_RE.test(data.videoId.trim()) ? data.videoId.trim() : fallbackVideoId;
  if (!videoId || !ID_RE.test(videoId)) return { ok: false, error: 'videoId tidak ada atau tidak valid (harus 11 karakter ID YouTube).' };

  if (!Array.isArray(data.lines) || data.lines.length === 0) return { ok: false, error: 'Daftar "lines" kosong atau tidak ada.' };
  if (data.lines.length > MAX_LINES) return { ok: false, error: `Terlalu banyak baris (maksimal ${MAX_LINES}).` };

  const lines: CaptionLineInput[] = [];
  let dropped = 0;
  for (const item of data.lines) {
    if (!isObj(item)) { dropped++; continue; }
    const text = clean(item.text, MAX_TEXT);
    if (!text || !isMs(item.startMs)) { dropped++; continue; }
    const line: CaptionLineInput = {
      startMs: item.startMs,
      endMs: isMs(item.endMs) && item.endMs > item.startMs ? item.endMs : 0, // dilengkapi setelah diurutkan
      text,
    };
    const translation = clean(item.translation, MAX_TRANSLATION);
    if (translation) line.translation = translation;
    const words = cleanWords(item.words);
    if (words) line.words = words;
    lines.push(line);
  }
  if (lines.length === 0) return { ok: false, error: 'Tidak ada baris yang valid (tiap baris butuh "text" dan "startMs").' };

  lines.sort((a, b) => a.startMs - b.startMs);
  lines.forEach((l, i) => {
    if (l.endMs === 0) l.endMs = lines[i + 1] ? Math.min(lines[i + 1].startMs, l.startMs + FALLBACK_LINE_MS) : l.startMs + FALLBACK_LINE_MS;
  });

  const title = clean(data.title, 120);
  return { ok: true, template: { videoId, ...(title ? { title } : {}), lines }, dropped };
}

/**
 * Pulihkan waktu per kata dari subtitle YouTube yang sudah terambil: hanya untuk baris yang waktu mulainya
 * sama (±80 ms) dan teksnya tidak diubah AI, supaya sorotan kata tidak salah tempat.
 */
export function mergeWordTimings(template: ImmersionTemplate, fetched: readonly CaptionLineInput[]): ImmersionTemplate {
  const lines = template.lines.map(line => {
    if (line.words) return line;
    const match = fetched.find(f => f.words && f.text === line.text && Math.abs(f.startMs - line.startMs) <= MERGE_TOLERANCE_MS);
    return match?.words ? { ...line, words: match.words } : line;
  });
  return { ...template, lines };
}
