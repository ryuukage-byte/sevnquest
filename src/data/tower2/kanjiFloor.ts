// ==============================================================================
// MENARA 2 — LANTAI KANJI (N5 / N4)
// Kanji diajarkan bersama kata nyata (dari database Kotoba) supaya bacaan melekat pada kata.
// ==============================================================================

import kanjiData from '../db/kanji.json';
import { BuildItem, ChoiceQuestion, LessonStep, Room } from '../../engine/tower1/types';
import { splitBeats } from '../../engine/tower1/jp';
import { FloorContent, Word, allWords, chunk, makeOptions, overlaps, rb, shuffle, shortMeaning } from './common';
import { KANJI4_SIZES, KANJI5_PER_FLOOR } from './floors';

interface KanjiRow {
  id: string;
  character: string;
  meaningId: string;
  onyomi?: string[];
  kunyomi?: string[];
  jlpt: string;
  strokeCount?: number;
}

export interface KanjiEntry {
  char: string;
  meaning: string;
  on: string;
  kun: string;
  /** Kata nyata yang memakai kanji ini (bacaan kana murni). */
  word?: Word;
}

const LEVEL_RANK: Record<string, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };

let wordIndex: Map<string, Word> | null = null;
/** Untuk tiap kanji: kata ber-kanji tunggal-pertama dengan tingkat paling mudah lalu paling pendek. */
function wordFor(char: string): Word | undefined {
  if (!wordIndex) {
    wordIndex = new Map();
    const best = new Map<string, Word>();
    for (const w of allWords()) {
      if (!w.kanji.length || !['noun', 'verb', 'adjective-i', 'adjective-na', 'adverb'].includes(w.type)) continue;
      for (const k of w.kanji) {
        const cur = best.get(k);
        const rank = LEVEL_RANK[w.jlpt] ?? 0;
        if (!cur) { best.set(k, w); continue; }
        // Utamakan kata yang persis kanji itu, lalu tingkat termudah, lalu yang terpendek.
        const exact = w.word === k;
        const curExact = cur.word === k;
        const curRank = LEVEL_RANK[cur.jlpt] ?? 0;
        const better = exact !== curExact ? exact : rank !== curRank ? rank > curRank : w.word.length < cur.word.length;
        if (better) best.set(k, w);
      }
    }
    wordIndex = best;
  }
  return wordIndex.get(char);
}

const clean = (list: string[] | undefined) =>
  (list ?? []).filter(r => !r.startsWith('-')).map(r => r.replace(/\./g, '・').replace(/-/g, '')).slice(0, 3).join('、');

function kanjiList(level: 'N5' | 'N4'): KanjiEntry[] {
  const rows = (Object.values(kanjiData) as KanjiRow[]).filter(r => r.jlpt === level && r.character && r.meaningId);
  rows.sort((a, b) => (a.strokeCount ?? 0) - (b.strokeCount ?? 0) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const out: KanjiEntry[] = [];
  for (const r of rows) {
    if (seen.has(r.character)) continue;
    seen.add(r.character);
    out.push({
      char: r.character,
      meaning: shortMeaning(r.meaningId.split(/\s*\/\s*/)[0]),
      on: clean(r.onyomi),
      kun: clean(r.kunyomi),
      word: wordFor(r.character)
    });
  }
  return out;
}

function sliceFor(level: 'N5' | 'N4', nth: number): KanjiEntry[] {
  const list = kanjiList(level);
  const sizes = level === 'N5' ? null : KANJI4_SIZES;
  if (!sizes) return list.slice((nth - 1) * KANJI5_PER_FLOOR, nth * KANJI5_PER_FLOOR);
  const start = sizes.slice(0, nth - 1).reduce((a, b) => a + b, 0);
  return list.slice(start, start + sizes[nth - 1]);
}

export function buildKanjiFloor(level: 'N5' | 'N4', nth: number, floor: number): FloorContent {
  const entries = sliceFor(level, nth);
  const pool = kanjiList(level);
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;

  // Bacaan kata: pengecoh dari bacaan kata kanji lain yang panjangnya mirip.
  const withWord = entries.filter(e => e.word);
  const allReadings = pool.filter(e => e.word).map(e => e.word!);

  const toMeaning = (e: KanjiEntry): ChoiceQuestion => {
    const { options, answer } = makeOptions(e.meaning, shuffle(pool.filter(x => x.char !== e.char && !overlaps(x.meaning, e.meaning)), `km:${e.char}`).map(x => x.meaning), `kmo:${e.char}`);
    return { prompt: 'Apa arti kanji ini?', glyph: e.char, options, answer, explain: `${e.char} = "${e.meaning}". Bacaan: ${e.on || '—'} / ${e.kun || '—'}.` };
  };
  const toKanji = (e: KanjiEntry): ChoiceQuestion => {
    const { options, answer } = makeOptions(e.char, shuffle(pool.filter(x => x.char !== e.char), `kk:${e.char}`).map(x => x.char), `kko:${e.char}`);
    return { prompt: `Kanji mana yang berarti "${e.meaning}"?`, options, answer, explain: `"${e.meaning}" = ${e.char}.` };
  };
  const wordReading = (e: KanjiEntry): ChoiceQuestion | null => {
    const w = e.word;
    if (!w) return null;
    const lookalike = shuffle(allReadings.filter(x => x.id !== w.id && x.reading !== w.reading && Array.from(x.reading).length === Array.from(w.reading).length), `kr:${w.id}`);
    const rest = shuffle(allReadings.filter(x => x.id !== w.id && x.reading !== w.reading), `kr2:${w.id}`);
    const { options, answer } = makeOptions(w.reading, [...lookalike, ...rest].map(x => x.reading), `kro:${w.id}`);
    return { prompt: `Bagaimana bacaan kata ini? (${w.meaning})`, glyph: w.word, say: w.reading, options, answer, explain: `${w.word} dibaca ${w.reading}, "${w.meaning}".` };
  };
  const listenWord = (e: KanjiEntry): ChoiceQuestion | null => {
    const w = e.word;
    if (!w) return null;
    const { options, answer } = makeOptions(w.word, shuffle(allReadings.filter(x => x.id !== w.id && x.word !== w.word), `kl:${w.id}`).map(x => x.word), `klo:${w.id}`);
    return { prompt: 'Dengarkan, lalu pilih kata yang tepat.', say: w.reading, listenOnly: true, fallback: w.reading, options, answer, explain: `${w.reading} = ${w.word} (${w.meaning}).` };
  };
  const buildReading = (e: KanjiEntry): BuildItem | null => {
    const w = e.word;
    if (!w) return null;
    const answer = splitBeats(w.reading);
    if (answer.length < 2 || answer.length > 7) return null;
    const extraTiles = Array.from(new Set(allReadings.flatMap(x => splitBeats(x.reading)))).filter(c => !answer.includes(c));
    return { prompt: `Susun bacaan kata ${w.word} ("${w.meaning}").`, say: w.reading, answer, extra: shuffle(extraTiles, `kbx:${w.id}`).slice(0, 2), explain: `${w.word} dibaca ${w.reading}.` };
  };

  const meanings = entries.map(toMeaning);
  const kanjiQs = entries.map(toKanji);
  const readQs = shuffle(withWord, `krd:${floor}`).map(wordReading).filter((q): q is ChoiceQuestion => q !== null);
  const listenQs = shuffle(withWord, `kls:${floor}`).slice(0, 8).map(listenWord).filter((q): q is ChoiceQuestion => q !== null);
  const buildItems = shuffle(withWord, `kbd:${floor}`).map(buildReading).filter((b): b is BuildItem => b !== null).slice(0, 6);
  const trial = shuffle([...meanings, ...kanjiQs, ...readQs], `ktrial:${floor}`).slice(0, 10);

  const steps: LessonStep[] = [];
  if (entries.length <= 12) {
    for (const e of entries) {
      steps.push({
        title: `${e.char} · ${e.meaning}`,
        glyph: e.char,
        reading: [e.on && `On: ${e.on}`, e.kun && `Kun: ${e.kun}`].filter(Boolean).join('  ·  '),
        body: `Arti: ${e.meaning}.`,
        example: e.word ? { jp: rb(e.word.word, e.word.reading), meaning: `${e.word.meaning} (${e.word.reading})`, say: e.word.reading } : undefined
      });
    }
  } else {
    chunk(entries, 8).forEach((grp, i) =>
      steps.push({
        title: `Kanji ${i * 8 + 1}–${i * 8 + grp.length}`,
        body: i === 0 ? 'Ketuk kanji untuk melihat artinya; bacaan dipelajari lewat katanya di langkah berikutnya.' : undefined,
        grid: grp.map(e => ({ glyph: e.char, sub: e.meaning }))
      })
    );
    chunk(withWord, 8).forEach((grp, i) =>
      steps.push({
        title: `Kata nyata ${i + 1}`,
        grid: grp.map(e => ({ glyph: rb(e.word!.word, e.word!.reading), sub: e.word!.meaning, say: e.word!.reading }))
      })
    );
  }

  const rooms: Room[] = [
    { id: id('learn'), skill: 'tulisan', kind: 'lesson', kicker: 'Temukan', title: `Kanji ${level} · ${entries.length} aksara baru`, steps },
    { id: id('meaning'), skill: 'tulisan', kind: 'choice', kicker: 'Latih', title: 'Kanji → Arti', questions: meanings },
    { id: id('kanji'), skill: 'tulisan', kind: 'choice', kicker: 'Latih', title: 'Arti → Kanji', questions: kanjiQs }
  ];
  if (readQs.length >= 4) rooms.push({ id: id('read'), skill: 'kata', kind: 'choice', kicker: 'Latih', title: 'Bacaan Kata', questions: readQs.slice(0, 12) });
  if (listenQs.length >= 4) rooms.push({ id: id('listen'), skill: 'bunyi', kind: 'choice', kicker: 'Latih', title: 'Dengar & Pilih Kata', questions: listenQs });
  if (buildItems.length >= 3) rooms.push({ id: id('build'), skill: 'menulis', kind: 'build', kicker: 'Latih', title: 'Susun Bacaan Kata', items: buildItems });
  rooms.push({ id: id('trial'), skill: 'tulisan', kind: 'choice', kicker: 'Ingat', title: 'Ujian Lantai', passRatio: 0.8, questions: trial });

  return { rooms, bank: [...meanings, ...kanjiQs, ...readQs] };
}
