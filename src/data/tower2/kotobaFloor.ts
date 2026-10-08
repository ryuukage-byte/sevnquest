// ==============================================================================
// MENARA 2 — LANTAI KOSAKATA (N5 / N4)
// 24 kata per lantai: Temukan → arti → dengar → kata untuk arti → kalimat rumpang → susun bacaan → ujian.
// ==============================================================================

import { BuildItem, ChoiceQuestion, Room } from '../../engine/tower1/types';
import { splitBeats } from '../../engine/tower1/jp';
import { FloorContent, Word, allWords, chunk, floorWords, makeOptions, overlaps, plain, rb, shuffle, wordsOf } from './common';
import { KOTOBA_PER_FLOOR } from './floors';

const TYPE_LABEL: Record<string, string> = {
  noun: 'benda', verb: 'kata kerja', 'adjective-i': 'sifat-i', 'adjective-na': 'sifat-na', adverb: 'keterangan',
  pronoun: 'kata ganti', numeral: 'angka', expression: 'ungkapan', conjunction: 'penghubung', interjection: 'seruan'
};

/** Pengecoh: kata sejenis (jenis kata sama) dari tingkat yang sama, lalu dari semua kata. */
function sameKind(w: Word, level: string): Word[] {
  const pool = wordsOf(level).filter(x => x.id !== w.id && !overlaps(x.meaning, w.meaning));
  const same = pool.filter(x => x.type === w.type);
  return shuffle(same.length >= 12 ? same : pool, `d:${w.id}`);
}

const sameScript = (a: string, b: string) => /[ァ-ヶー]/.test(a[0]) === /[ァ-ヶー]/.test(b[0]);

const readQ = (w: Word, level: string): ChoiceQuestion => {
  const { options, answer } = makeOptions(w.meaning, sameKind(w, level).map(x => x.meaning), `rq:${w.id}`);
  return {
    prompt: 'Baca kata ini. Apa artinya?',
    glyph: rb(w.word, w.reading),
    say: w.reading,
    options,
    answer,
    explain: `「${rb(w.word, w.reading)}」 (${w.reading}) berarti "${w.meaning}".`
  };
};

const reverseQ = (w: Word, level: string): ChoiceQuestion => {
  const { options, answer } = makeOptions(rb(w.word, w.reading), sameKind(w, level).map(x => rb(x.word, x.reading)), `rv:${w.id}`);
  return {
    prompt: `Mana kata untuk "${w.meaning}"?`,
    options,
    answer,
    explain: `"${w.meaning}" = ${rb(w.word, w.reading)} (${w.reading}).`
  };
};

const listenQ = (w: Word, level: string): ChoiceQuestion => {
  const { options, answer } = makeOptions(w.meaning, sameKind(w, level).map(x => x.meaning), `lq:${w.id}`);
  return {
    prompt: 'Dengarkan kata ini. Apa artinya?',
    say: w.reading,
    listenOnly: true,
    fallback: w.reading,
    options,
    answer,
    explain: `${w.reading} = ${rb(w.word, w.reading)} berarti "${w.meaning}".`
  };
};

const clozeQ = (w: Word, level: string): ChoiceQuestion | null => {
  if (!w.ex || !w.ex.jp.includes(w.word) || !w.ex.id) return null;
  const sentence = w.ex.jp.replace(w.word, '（　）');
  const { options, answer } = makeOptions(rb(w.word, w.reading), sameKind(w, level).map(x => rb(x.word, x.reading)), `cz:${w.id}`);
  return {
    prompt: `Lengkapi kalimat: "${w.ex.id}"`,
    glyph: sentence,
    options,
    answer,
    explain: `${plain(w.ex.jp)} — ${w.ex.id}`
  };
};

const buildItem = (w: Word, extraPool: string[]): BuildItem | null => {
  const answer = splitBeats(w.reading);
  if (answer.length < 2 || answer.length > 7) return null;
  const extra = shuffle(extraPool.filter(c => !answer.includes(c) && sameScript(c, answer[0])), `bx:${w.id}`).slice(0, 2);
  return { prompt: `Susun bacaan kata "${w.meaning}".`, say: w.reading, answer, extra, explain: `"${w.meaning}" = ${rb(w.word, w.reading)} (${w.reading}).` };
};

export function buildKotobaFloor(level: 'N5' | 'N4', nth: number, floor: number): FloorContent {
  const words = floorWords(level, nth, KOTOBA_PER_FLOOR);
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;
  const tilePool = Array.from(new Set(allWords().filter(w => w.jlpt === level).flatMap(w => splitBeats(w.reading))));

  const lessonSteps = chunk(words, 6).map((grp, i) => ({
    title: `Kata ${i * 6 + 1}–${i * 6 + grp.length}`,
    body: i === 0 ? 'Ketuk sebuah kata untuk mendengar bacaannya. Perhatikan arti dan jenis kata.' : undefined,
    grid: grp.map(w => ({ glyph: rb(w.word, w.reading), sub: `${w.meaning}${TYPE_LABEL[w.type] ? ` · ${TYPE_LABEL[w.type]}` : ''}`, say: w.reading })),
    example: grp.find(w => w.ex && w.ex.jp.includes(w.word)) ? (() => {
      const w = grp.find(x => x.ex && x.ex.jp.includes(x.word))!;
      return { jp: w.ex!.jp, meaning: w.ex!.id, say: plain(w.ex!.jp) };
    })() : undefined
  }));

  const firstHalf = words.slice(0, 12);
  const secondHalf = words.slice(12);
  const reads = firstHalf.map(w => readQ(w, level));
  const reverses = secondHalf.map(w => reverseQ(w, level));
  const listens = shuffle(words, `listen:${floor}`).slice(0, 8).map(w => listenQ(w, level));
  const cloze = shuffle(words, `cloze:${floor}`).map(w => clozeQ(w, level)).filter((q): q is ChoiceQuestion => q !== null).slice(0, 8);
  const builds = shuffle(words, `build:${floor}`).map(w => buildItem(w, tilePool)).filter((b): b is BuildItem => b !== null).slice(0, 6);
  const trial = shuffle(words, `trial:${floor}`).slice(0, 10).map((w, i) => (i % 2 === 0 ? readQ(w, level) : reverseQ(w, level)));

  const rooms: Room[] = [
    { id: id('learn'), skill: 'kata', kind: 'lesson', kicker: 'Temukan', title: `${level} · 24 kata baru`, steps: lessonSteps },
    { id: id('read'), skill: 'kata', kind: 'choice', kicker: 'Latih', title: 'Baca & Pahami', questions: reads },
    { id: id('word'), skill: 'kata', kind: 'choice', kicker: 'Latih', title: 'Kata untuk Sebuah Arti', questions: reverses },
    { id: id('listen'), skill: 'bunyi', kind: 'choice', kicker: 'Latih', title: 'Dengar & Pahami', questions: listens }
  ];
  if (cloze.length >= 4) rooms.push({ id: id('cloze'), skill: 'kalimat', kind: 'choice', kicker: 'Latih', title: 'Lengkapi Kalimat', questions: cloze });
  if (builds.length >= 3) rooms.push({ id: id('build'), skill: 'menulis', kind: 'build', kicker: 'Latih', title: 'Susun Bacaan', items: builds });
  rooms.push({ id: id('trial'), skill: 'kata', kind: 'choice', kicker: 'Ingat', title: 'Ujian Lantai', passRatio: 0.8, questions: trial });

  return { rooms, bank: [...reads, ...reverses, ...cloze] };
}
