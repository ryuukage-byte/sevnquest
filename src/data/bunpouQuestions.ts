/**
 * Bank soal bunpou (db/bunpou_questions.json, ±1,3 MB) tidak ikut chunk awal. Saat dievaluasi, modul ini
 * mengganti soal bawaan tiap pola di BUNPOU_DATABASE dengan soal kurasinya (in place). Dimuat lewat
 * `ensureFullData()` atau diimpor langsung oleh modul lazy yang membaca bank mentahnya.
 */
import bunpouQuestionsJson from './db/bunpou_questions.json';
import { BUNPOU_DATABASE } from './bunpou';
import type { Question } from '../types/content';

interface RawBunpouQuestion {
  id: string;
  material_id: string;
  type: string;
  prompt: string;
  ruby?: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export const BUNPOU_QUESTION_BANK = bunpouQuestionsJson;

const byMaterial = new Map<string, Question[]>();
for (const q of bunpouQuestionsJson as RawBunpouQuestion[]) {
  let list = byMaterial.get(q.material_id);
  if (!list) byMaterial.set(q.material_id, (list = []));
  list.push({
    id: q.id,
    prompt: q.prompt,
    ruby: q.ruby,
    options: q.options,
    correctIndex: q.correct_answer,
    explanation: q.explanation,
  });
}

for (const [id, item] of Object.entries(BUNPOU_DATABASE)) {
  const questions = byMaterial.get(id);
  if (questions && questions.length > 0) item.questions = questions;
}
