// Latihan singkat yang dibangun dari hasil analisis teks pengguna.
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import type { TextAnalysis } from './textAnalyzer';

export interface TextQuizQuestion {
  id: string;
  kind: 'meaning' | 'reading' | 'grammar';
  prompt: string;
  /** Kalimat sumber dari teks pengguna (konteks). */
  context?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Kata/pola yang diuji, untuk EXP. */
  entityId: string;
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function withDistractors(correct: string, pool: string[], n = 3): { options: string[]; correctIndex: number } {
  const picks = shuffle([...new Set(pool.filter(p => p && p !== correct))]).slice(0, n);
  const options = shuffle([correct, ...picks]);
  return { options, correctIndex: options.indexOf(correct) };
}

const KANJI_RE = /[一-龯]/;
const firstMeaning = (s: string) => s.split(/[;/]/)[0].trim();

export function buildTextQuiz(analysis: TextAnalysis, max = 10): TextQuizQuestion[] {
  const allKotoba = Object.values(KOTOBA_DATABASE);
  const allBunpou = Object.values(BUNPOU_DATABASE);
  const questions: TextQuizQuestion[] = [];

  // Kata yang sering muncul / lebih sulit diprioritaskan, dibatasi agar variasi jenis soal terjaga.
  const vocab = analysis.vocab.filter(v => v.item.wordType !== 'particle' && v.item.meaningId);
  for (const v of vocab.slice(0, Math.ceil(max * 0.5))) {
    const pool = allKotoba.filter(k => k.wordType === v.item.wordType && k.id !== v.item.id).map(k => firstMeaning(k.meaningId));
    const { options, correctIndex } = withDistractors(firstMeaning(v.item.meaningId), shuffle(pool).slice(0, 30));
    if (options.length < 3) continue;
    questions.push({
      id: `m_${v.item.id}`,
      kind: 'meaning',
      prompt: `Apa arti 「${v.surfaces[0]}」?`,
      context: v.sentence,
      options,
      correctIndex,
      explanation: `${v.item.word}（${v.item.reading}）= ${v.item.meaningId}`,
      entityId: v.item.id,
    });
  }

  for (const v of vocab.filter(x => KANJI_RE.test(x.item.word) && x.item.reading).slice(0, Math.floor(max * 0.25))) {
    const pool = allKotoba.filter(k => KANJI_RE.test(k.word) && k.id !== v.item.id && Math.abs(k.reading.length - v.item.reading.length) <= 1).map(k => k.reading);
    const { options, correctIndex } = withDistractors(v.item.reading, shuffle(pool).slice(0, 30));
    if (options.length < 3) continue;
    questions.push({
      id: `r_${v.item.id}`,
      kind: 'reading',
      prompt: `Bagaimana cara baca 「${v.item.word}」?`,
      context: v.sentence,
      options,
      correctIndex,
      explanation: `${v.item.word} dibaca ${v.item.reading}（${v.item.meaningId}）`,
      entityId: v.item.id,
    });
  }

  for (const g of analysis.grammar.slice(0, Math.ceil(max * 0.35))) {
    const title = g.item.title;
    const pool = allBunpou.filter(b => b.id !== g.item.id && b.level === g.item.level).map(b => b.title);
    const { options, correctIndex } = withDistractors(title, shuffle(pool).slice(0, 30));
    if (options.length < 3) continue;
    questions.push({
      id: `g_${g.item.id}`,
      kind: 'grammar',
      prompt: `Kalimat ini memakai pola yang mana? (potongan: 「${g.matched}」)`,
      context: g.sentence,
      options,
      correctIndex,
      explanation: `${title} — ${g.item.meaningId}`,
      entityId: g.item.id,
    });
  }

  return shuffle(questions).slice(0, max);
}
