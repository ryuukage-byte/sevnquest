// Skema materi Guide. Materi = JSON; penambahan materi tidak butuh perubahan kode selama memakai tipe scene yang ada.
export type TokenRole = 'subject' | 'object' | 'verb' | 'particle' | 'other';

/** 12 bagian standar pengajaran. Tidak wajib dipakai semuanya; sesuaikan dengan kebutuhan materi. */
export const SECTIONS = {
  introduction: '01 PENGANTAR',
  definition: '02 DEFINISI',
  concept: '03 KONSEP INTI',
  logic: '04 LOGIKA',
  explanation: '05 PENJELASAN',
  examples: '06 CONTOH',
  breakdown: '07 URAIAN',
  usage: '08 PENGGUNAAN NYATA',
  comparison: '09 PERBANDINGAN',
  mistakes: '10 KESALAHAN UMUM',
  summary: '11 RANGKUMAN',
  exercises: '12 LATIHAN',
} as const;
export type Section = keyof typeof SECTIONS;

export interface Token {
  id: string;
  /** Teks bahasa Jepang. */
  ja: string;
  /** Padanan bahasa Indonesia. */
  id_text: string;
  role: TokenRole;
}

interface Base { id: string; duration?: number; section?: Section }

export interface IntroductionScene extends Base {
  type: 'introduction';
  content: { title: string; subtitle: string };
}
export interface StructureScene extends Base {
  type: 'structure';
  content: { heading: string; caption: string; pattern: TokenRole[]; language: 'id' | 'ja' };
}
export interface TransformationScene extends Base {
  type: 'transformation';
  content: { heading: string; caption: string; tokens: Token[]; from: string[]; to: string[] };
}
export interface ComparisonScene extends Base {
  type: 'comparison';
  content: { left: string; right: string; leftLabel?: string; rightLabel?: string };
}
export interface PracticeScene extends Base {
  type: 'practice';
  content: { prompt: string; tokens: Token[]; answer: string[] };
}
export interface SummaryScene extends Base {
  type: 'summary';
  content: { heading: string; points: string[] };
}
export interface KanaItem { char: string; romaji: string }
export interface KanaScene extends Base {
  type: 'kana';
  content: { heading: string; caption?: string; items: KanaItem[] };
}
export interface VocabItem { ja: string; reading: string; id_text: string }
export interface VocabScene extends Base {
  type: 'vocab';
  content: { heading: string; items: VocabItem[] };
}
export interface QuizScene extends Base {
  type: 'quiz';
  content: {
    question: string; big?: string; options: string[]; answer: number; explanation?: string;
    /** Alasan per opsi (indeks sejajar dengan options); ditampilkan bila opsi itu dipilih. */
    why?: (string | null)[];
  };
}
export interface Term { term: string; reading: string; meaning: string }
/** Penjelasan guru: paragraf, analogi, dan istilah Jepang yang diperkenalkan. */
export interface ExplainScene extends Base {
  type: 'explain';
  content: { heading: string; paragraphs: string[]; analogy?: string; terms?: Term[] };
}
/**
 * Satu bagian kalimat. `reading` = bacaan hiragana lengkap (partikel ditulis apa adanya: は/を/へ),
 * `romaji` = Hepburn tanpa makron (vokal panjang: ou, uu, ee, ii, oo). Keduanya divalidasi oleh tes.
 */
export interface Part {
  ja: string; reading: string; romaji: string; id_text: string; role: TokenRole;
}
/** Contoh kalimat interaktif: ketuk tiap bagian untuk melihat analisisnya. */
export interface ExampleScene extends Base {
  type: 'example';
  content: { heading?: string; parts: Part[]; translation: string; note?: string };
}
export interface MistakesScene extends Base {
  type: 'mistakes';
  content: { heading: string; items: { wrong: string; right: string; why: string }[] };
}
export type Scene =
  | KanaScene | VocabScene | QuizScene | ExplainScene | ExampleScene | MistakesScene
  | IntroductionScene | StructureScene | TransformationScene | ComparisonScene | PracticeScene | SummaryScene;

export interface Lesson {
  id: string;
  level: 'BEGINNER' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'JFT' | 'SSW2';
  category: 'kana' | 'grammar' | 'vocabulary' | 'kanji' | 'reading' | 'conversation' | 'concept';
  title: string;
  summary: string;
  minutes: number;
  scenes: Scene[];
}

const SCENE_TYPES = [
  'introduction', 'structure', 'transformation', 'comparison', 'practice', 'summary',
  'kana', 'vocab', 'quiz', 'explain', 'example', 'mistakes',
];
const PARTICLE_ROMAJI: Record<string, string> = { は: 'wa', を: 'o', へ: 'e' };

/** Gabungan kalimat dari parts, untuk tampilan dan tes. */
export const sentenceJa = (parts: Part[]) => parts.map(p => p.ja).join('') + '。';
export const sentenceRomaji = (parts: Part[]) => parts.map(p => p.romaji).join(' ');
export const sentenceReading = (parts: Part[]) => parts.map(p => p.reading).join('');
export const particleRomaji = (ja: string) => PARTICLE_ROMAJI[ja];

/** Validasi struktur materi; mengembalikan daftar masalah (kosong = valid). */
export function validateLesson(l: Lesson): string[] {
  const errs: string[] = [];
  if (!l.id || !l.title) errs.push('id/title kosong');
  if (!l.scenes?.length) errs.push('tidak ada scene');
  const seen = new Set<string>();
  for (const s of l.scenes ?? []) {
    if (seen.has(s.id)) errs.push(`id scene ganda: ${s.id}`);
    seen.add(s.id);
    if (!SCENE_TYPES.includes(s.type)) errs.push(`tipe scene tidak dikenal: ${s.type}`);
    if (s.section && !(s.section in SECTIONS)) errs.push(`${s.id}: section tidak dikenal: ${s.section}`);
    if ((s.type === 'kana' || s.type === 'vocab') && s.content.items.length === 0) errs.push(`${s.id}: items kosong`);
    if (s.type === 'explain' && s.content.paragraphs.length === 0) errs.push(`${s.id}: paragraf kosong`);
    if (s.type === 'example' && s.content.parts.length === 0) errs.push(`${s.id}: parts kosong`);
    if (s.type === 'mistakes' && s.content.items.length === 0) errs.push(`${s.id}: items kosong`);
    if (s.type === 'quiz') {
      const { options, answer, why } = s.content;
      if (options.length < 2) errs.push(`${s.id}: opsi kurang dari 2`);
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) errs.push(`${s.id}: indeks jawaban di luar opsi`);
      if (new Set(options).size !== options.length) errs.push(`${s.id}: opsi ganda`);
      if (why && why.length !== options.length) errs.push(`${s.id}: why harus sejajar dengan options`);
    }
    if (s.type === 'transformation' || s.type === 'practice') {
      const ids = new Set(s.content.tokens.map(t => t.id));
      const refs = s.type === 'transformation' ? [...s.content.from, ...s.content.to] : s.content.answer;
      for (const r of refs) if (!ids.has(r)) errs.push(`${s.id}: token "${r}" tidak ada`);
      if (s.type === 'practice' && s.content.answer.length !== s.content.tokens.length)
        errs.push(`${s.id}: jawaban harus memakai semua token`);
      if (s.type === 'transformation' && (s.content.from.length !== s.content.tokens.length || s.content.to.length !== s.content.tokens.length))
        errs.push(`${s.id}: from/to harus memuat semua token`);
    }
  }
  return errs;
}
