// ==============================================================================
// KALIMAT CHOUKAI DI RECALL (sentence mining, ala asbplayer)
//
// Pemain menyimpan satu kalimat dari video Library Choukai yang transkripnya tersimpan. Kalimat masuk Recall
// sebagai ItemMasteryRecord kategori 'choukai' dengan id `cs:<videoId>:<startMs>`; isinya dibaca ulang dari
// transkrip statis (src/data/choukaiTranscripts), jadi tidak ada data kalimat baru di PlayerStats.
//
// Soal Recall harus bisa dinilai sistem (bukan "ingat / lupa"): potongan video kalimat itu diputar, lalu
// pemain memilih kata yang hilang dari kalimat (isian mendengar). Murni, tanpa React.
// ==============================================================================

const ID_PREFIX = 'cs:';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function choukaiSentenceId(videoId: string, startMs: number): string {
  return `${ID_PREFIX}${videoId}:${Math.round(startMs)}`;
}

export function isChoukaiSentenceId(id: string): boolean {
  return parseChoukaiSentenceId(id) !== null;
}

export function parseChoukaiSentenceId(id: string): { videoId: string; startMs: number } | null {
  if (!id.startsWith(ID_PREFIX)) return null;
  const rest = id.slice(ID_PREFIX.length);
  const sep = rest.lastIndexOf(':');
  if (sep < 0) return null;
  const videoId = rest.slice(0, sep);
  const startMs = Number(rest.slice(sep + 1));
  if (!VIDEO_ID_RE.test(videoId) || !Number.isInteger(startMs) || startMs < 0) return null;
  return { videoId, startMs };
}

/** Kata yang ditemukan di kalimat (bentuk di teks + entri kamus). */
export interface ClozeWord {
  surface: string;
  item: { id: string; word: string; reading?: string; meaningId?: string; jlpt?: string };
}

/** Kosakata lain untuk pengecoh. */
export interface ClozePoolWord {
  id: string;
  word: string;
  jlpt?: string;
}

export interface SentenceCloze {
  /** Kalimat dengan kata target diganti BLANK. */
  masked: string;
  options: string[];
  correctIndex: number;
  target: ClozeWord;
}

export const BLANK = '＿＿＿';
const KANA_ONLY = /^[ぁ-ゟー]+$/;
const KANJI = /[一-龯㐀-䶿々]/;

/** Kata yang layak dijadikan target: muncul utuh di kalimat dan bukan sekadar 1 huruf kana. */
export function clozeCandidates(text: string, words: readonly ClozeWord[]): ClozeWord[] {
  return words.filter(w => w.surface.length > 0 && text.includes(w.surface) && !(w.surface.length < 2 && KANA_ONLY.test(w.surface)));
}

/** Bilangan semu yang stabil dari string (pemilihan target/pengecoh yang bisa diulang di tes). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Soal isian mendengar. `seed` (mis. jumlah percobaan) memutar kata target antar sesi supaya kalimat diuji dari
 * beberapa kata. Pengecoh: kata lain dari pool, level JLPT sama bila ada, panjang mirip, tidak sama dengan target.
 * Null bila kalimat tidak punya kata yang bisa dijadikan target atau pengecoh tidak cukup.
 */
export function buildSentenceCloze(
  text: string,
  words: readonly ClozeWord[],
  pool: readonly ClozePoolWord[],
  seed: number,
): SentenceCloze | null {
  const candidates = clozeCandidates(text, words);
  if (candidates.length === 0) return null;
  // Utamakan kata berkanji (lebih bermakna sebagai target dengar), lalu yang lebih panjang.
  const ranked = [...candidates].sort((a, b) =>
    Number(KANJI.test(b.surface)) - Number(KANJI.test(a.surface)) || b.surface.length - a.surface.length);
  const target = ranked[Math.abs(seed) % ranked.length];

  const taken = new Set([target.surface, target.item.word]);
  const sameScript = (w: string) => KANJI.test(w) === KANJI.test(target.surface);
  const scored = pool
    .filter(p => p.word && !taken.has(p.word) && !text.includes(p.word) && sameScript(p.word))
    .map(p => ({
      p,
      score: (p.jlpt && p.jlpt === target.item.jlpt ? 0 : 10) + Math.abs(p.word.length - target.surface.length) * 3 + (hash(`${target.item.id}|${p.id}|${seed}`) % 7),
    }))
    .sort((a, b) => a.score - b.score);

  const distractors: string[] = [];
  for (const { p } of scored) {
    if (distractors.length === 3) break;
    if (!distractors.includes(p.word)) distractors.push(p.word);
  }
  if (distractors.length < 3) return null;

  const correctIndex = hash(`${target.item.id}|${seed}`) % 4;
  const options = [...distractors];
  options.splice(correctIndex, 0, target.surface);
  const at = text.indexOf(target.surface);
  const masked = text.slice(0, at) + BLANK + text.slice(at + target.surface.length);
  return { masked, options, correctIndex, target };
}
