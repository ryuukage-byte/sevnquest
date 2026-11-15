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
export type Scene =
  | IntroductionScene | StructureScene | TransformationScene | ComparisonScene | PracticeScene | SummaryScene;

export interface Lesson {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'JFT' | 'BEGINNER' | 'SSW2';
  category: 'grammar' | 'vocabulary' | 'kanji' | 'reading';
  title: string;
  summary: string;
  minutes: number;
  scenes: Scene[];
}

const SCENE_TYPES = ['introduction', 'structure', 'transformation', 'comparison', 'practice', 'summary'];

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
