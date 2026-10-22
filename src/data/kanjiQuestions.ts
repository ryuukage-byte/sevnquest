/**
 * Bank soal kanji (db/kanji_questions.json, ±3,5 MB) tidak ikut chunk awal. Saat dievaluasi, modul ini
 * memasang soal kurasi ke `questions` tiap kanji di KANJI_DATABASE (in place). Dimuat lewat `ensureFullData()`
 * atau diimpor langsung oleh modul lazy yang membaca bank mentahnya.
 */
import kanjiQuestionsJson from './db/kanji_questions.json';
import { KANJI_DATABASE } from './kanji';
import type { Question } from '../types/content';

interface RawKanjiQuestion {
  id: string;
  prompt: string;
  ruby?: string;
  options: string[];
  correct_index: number;
  explanation: string;
  knowledge_refs?: string[];
  kanji_refs?: string[];
}

export const KANJI_QUESTION_BANK = kanjiQuestionsJson;

const byKanji = new Map<string, Question[]>();
for (const q of kanjiQuestionsJson as RawKanjiQuestion[]) {
  const kanjiId = q.knowledge_refs?.[0] || q.kanji_refs?.[0];
  if (!kanjiId) continue;
  let list = byKanji.get(kanjiId);
  if (!list) byKanji.set(kanjiId, (list = []));
  list.push({
    id: q.id,
    prompt: q.prompt,
    ruby: q.ruby,
    options: q.options,
    correctIndex: q.correct_index,
    explanation: q.explanation,
  });
}

// Kanji cadangan statis (kanji.ts) sudah membawa soalnya sendiri dan tetap dipakai apa adanya.
for (const [id, item] of Object.entries(KANJI_DATABASE)) {
  const questions = byKanji.get(id);
  if (questions && !(item.questions && item.questions.length > 0)) item.questions = questions;
}
