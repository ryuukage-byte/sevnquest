// Penentu jenis "Bedah Soal" — sengaja ringan (tanpa database besar) agar daftar Bank Soal bisa
// menampilkan tombolnya tanpa ikut memuat engine. Engine lengkap ada di questionInsight.ts.

import { classifyKanjiBankPrompt, type UnifiedQuestionItem } from '../../data/questionLibrary';
import type { QuestionKind } from '../../data/questionInsightGuide';

type KindInput = Pick<UnifiedQuestionItem, 'id' | 'section' | 'subCategory' | 'prompt' | 'options' | 'correctIndex'>;

/** Jenis bedah untuk satu soal; null = belum didukung (Dokkai, Choukai, goresan, kana). */
export function questionInsightKind(q: KindInput): QuestionKind | null {
  if (!q || !Array.isArray(q.options) || q.options.length < 2) return null;
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) return null;
  switch (q.subCategory) {
    case 'kanji_reading':
      return 'reading';
    case 'kanji_writing':
      return 'writing';
    case 'vocab_context':
      return q.id.startsWith('kq_') ? 'wordMeaning' : 'context';
    case 'synonym':
      return 'synonym';
    case 'vocab_usage':
      return 'usage';
    case 'grammar_form':
      return 'grammar';
    case 'sentence_star':
      return 'star';
    case 'grammar_meaning':
      return 'patternMeaning';
    case 'moji_basic': {
      const shape = classifyKanjiBankPrompt(q.prompt);
      if (shape === 'onkun') return 'onkun';
      if (shape === 'kanji_meaning') return 'kanjiMeaning';
      return null;
    }
    default:
      return null;
  }
}

export function hasQuestionInsight(q: KindInput): boolean {
  return questionInsightKind(q) !== null;
}
