// ==============================================================================
// MENARA 2 — LANTAI POLA KALIMAT (bunpou N5 / N4)
// Pola dan soalnya diambil dari database bunpou (bp_n5_*, bp_n4_*).
// Setiap pola: rumus + arti + contoh; latihan = soal arti (recognition) dan
// soal melengkapi kalimat (fill_blank) yang sudah ada di database.
// ==============================================================================

import bunpouData from '../db/bunpou.json';
import bunpouQuestions from '../db/bunpou_questions.json';
import { ChoiceQuestion, LessonStep, Room } from '../../engine/tower1/types';
import { FloorContent, makeOptions, shuffle } from './common';
import { POLA4_SIZES, POLA5_SIZES } from './floors';

interface Pattern {
  id: string;
  title: string;
  formula: string;
  meaning_id: string;
  examples: { jp: string; id: string }[];
}
interface Question {
  id: string;
  material_id: string;
  type?: string;
  prompt: string;
  options?: string[];
  correct_answer?: number;
  explanation?: string;
}

const patterns = (level: 'N5' | 'N4'): Pattern[] =>
  (Object.values(bunpouData) as Pattern[])
    .filter(p => p.id.startsWith(`bp_${level.toLowerCase()}_`))
    .sort((a, b) => a.id.localeCompare(b.id));

let qIndex: Map<string, Question[]> | null = null;
const questionsOf = (patternId: string): Question[] => {
  if (!qIndex) {
    qIndex = new Map();
    for (const q of Object.values(bunpouQuestions) as Question[]) {
      const list = qIndex.get(q.material_id) ?? [];
      list.push(q);
      qIndex.set(q.material_id, list);
    }
  }
  return qIndex.get(patternId) ?? [];
};

const toChoice = (q: Question, titles: string[] = []): ChoiceQuestion | null => {
  const options = q.options ?? [];
  if (options.length < 3 || new Set(options).size !== options.length) return null;
  if (typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer >= options.length) return null;
  const explain = (q.explanation ?? '').replace(/\n+/g, ' ').trim();
  const right = options[q.correct_answer];
  // Soal rumpang di database memakai pengecoh yang sama untuk semua pola; ganti dengan pola lain dari lantai yang sama.
  if (q.type === 'fill_blank' && titles.includes(right)) {
    const rebuilt = makeOptions(right, shuffle(titles.filter(t => t !== right), `fo:${q.id}`), `fo2:${q.id}`);
    if (rebuilt.options.length >= 3) return { prompt: q.prompt, options: rebuilt.options, answer: rebuilt.answer, explain: explain || undefined };
  }
  return { prompt: q.prompt, options, answer: q.correct_answer, explain: explain || undefined };
};

const cleanTitle = (t: string) => t.replace(/（.*?）/g, '').trim() || t;

export function buildPolaFloor(level: 'N5' | 'N4', nth: number, floor: number): FloorContent {
  const sizes = level === 'N5' ? POLA5_SIZES : POLA4_SIZES;
  const start = sizes.slice(0, nth - 1).reduce((a, b) => a + b, 0);
  const group = patterns(level).slice(start, start + sizes[nth - 1]);
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;

  const steps: LessonStep[] = [
    {
      title: `${group.length} pola ${level} di lantai ini`,
      body: 'Setiap pola dijelaskan dengan rumus, arti, dan contoh. Bacalah rumusnya sebagai satu satuan makna.',
      grid: group.map(p => ({ glyph: cleanTitle(p.title).slice(0, 8), sub: p.meaning_id.slice(0, 28) }))
    },
    ...group.map<LessonStep>(p => ({
      title: cleanTitle(p.title),
      body: `${p.meaning_id}. Rumus: ${p.formula}`,
      example: p.examples[0] ? { jp: p.examples[0].jp, meaning: p.examples[0].id, say: p.examples[0].jp } : undefined
    }))
  ];

  const recog: ChoiceQuestion[] = [];
  const fill: ChoiceQuestion[] = [];
  for (const p of group) {
    for (const q of questionsOf(p.id)) {
      const c = toChoice(q, group.map(x => x.title));
      if (!c) continue;
      (q.type === 'fill_blank' ? fill : recog).push(c);
    }
  }
  const recogShuffled = shuffle(recog, `pr:${floor}`);
  const fillShuffled = shuffle(fill, `pf:${floor}`);
  const recogRoom = recogShuffled.slice(0, 10);
  const fillRoom = fillShuffled.slice(0, 10);
  const trial = shuffle([...recogShuffled.slice(10), ...fillShuffled.slice(10), ...recogShuffled.slice(0, 5), ...fillShuffled.slice(0, 5)], `pt:${floor}`).slice(0, 10);

  const rooms: Room[] = [{ id: id('learn'), skill: 'pola', kind: 'lesson', kicker: 'Temukan', title: `Pola ${level} · ${group.length} pola`, steps }];
  if (recogRoom.length >= 3) rooms.push({ id: id('meaning'), skill: 'pola', kind: 'choice', kicker: 'Latih', title: 'Arti Pola', questions: recogRoom });
  if (fillRoom.length >= 3) rooms.push({ id: id('fill'), skill: 'kalimat', kind: 'choice', kicker: 'Latih', title: 'Lengkapi Kalimat', questions: fillRoom });
  rooms.push({ id: id('trial'), skill: 'kalimat', kind: 'choice', kicker: 'Ingat', title: 'Ujian Lantai', passRatio: 0.75, questions: trial });

  return { rooms, bank: [...recogRoom, ...fillRoom] };
}

