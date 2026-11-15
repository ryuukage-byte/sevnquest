// Skema materi Guide. Materi = JSON; penambahan materi tidak butuh perubahan kode selama memakai tipe scene yang ada.
export type TokenRole = 'subject' | 'object' | 'verb' | 'particle' | 'other';

export interface Token {
  id: string;
  /** Teks bahasa Jepang. */
  ja: string;
  /** Padanan bahasa Indonesia. */
  id_text: string;
  role: TokenRole;
}

export interface IntroductionScene {
  id: string; type: 'introduction'; duration?: number;
  content: { title: string; subtitle: string };
}
export interface StructureScene {
  id: string; type: 'structure'; duration?: number;
  content: { heading: string; caption: string; pattern: TokenRole[]; language: 'id' | 'ja' };
}
export interface TransformationScene {
  id: string; type: 'transformation'; duration?: number;
  content: { heading: string; caption: string; tokens: Token[]; from: string[]; to: string[] };
}
export interface ComparisonScene {
  id: string; type: 'comparison'; duration?: number;
  content: { left: string; right: string; leftLabel?: string; rightLabel?: string };
}
export interface PracticeScene {
  id: string; type: 'practice'; duration?: number;
  content: { prompt: string; tokens: Token[]; answer: string[] };
}
export interface SummaryScene {
  id: string; type: 'summary'; duration?: number;
  content: { heading: string; points: string[] };
}
export interface KanaItem { char: string; romaji: string }
export interface KanaScene {
  id: string; type: 'kana'; duration?: number;
  content: { heading: string; caption?: string; items: KanaItem[] };
}
export interface VocabItem { ja: string; reading: string; id_text: string }
export interface VocabScene {
  id: string; type: 'vocab'; duration?: number;
  content: { heading: string; items: VocabItem[] };
}
export interface QuizScene {
  id: string; type: 'quiz'; duration?: number;
  content: { question: string; big?: string; options: string[]; answer: number; explanation?: string };
}
export type Scene =
  | KanaScene | VocabScene | QuizScene
  | IntroductionScene | StructureScene | TransformationScene | ComparisonScene | PracticeScene | SummaryScene;

export interface Lesson {
  id: string;
  level: 'BEGINNER' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'JFT' | 'SSW2';
  category: 'kana' | 'grammar' | 'vocabulary' | 'kanji' | 'reading';
  title: string;
  summary: string;
  minutes: number;
  scenes: Scene[];
}

const SCENE_TYPES = ['introduction', 'structure', 'transformation', 'comparison', 'practice', 'summary', 'kana', 'vocab', 'quiz'];

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
    if ((s.type === 'kana' || s.type === 'vocab') && s.content.items.length === 0) errs.push(`${s.id}: items kosong`);
    if (s.type === 'quiz') {
      const { options, answer } = s.content;
      if (options.length < 2) errs.push(`${s.id}: opsi kurang dari 2`);
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) errs.push(`${s.id}: indeks jawaban di luar opsi`);
      if (new Set(options).size !== options.length) errs.push(`${s.id}: opsi ganda`);
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
