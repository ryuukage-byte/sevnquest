// Engine "Pemahaman Kotoba": menyusun pelajaran 1–3 menit untuk satu kotoba dari
// database Kotoba + Kanji SevnQuest. Semua tahap dibangun dari data yang ada:
//   01 Kenali Kotoba → 02 Bedah Kanji → 03 Pembentukan Makna →
//   04 Keluarga Kosakata → 05 Penggunaan dalam Kalimat → 06 Uji Pemahaman
// Tahap yang tidak relevan (mis. pembentukan makna untuk kanji tunggal) tidak ditampilkan.

import * as wanakana from 'wanakana';
import type { KanjiItem, KotobaItem } from '../../types/content';
import { getFormationNote, type FormationTransparency, type KotobaFormationNote } from '../../data/kotobaInsights';
import { isKanjiChar, splitWordReading, toHiragana, type ReadingPart, type ReadingType } from './readingSplit';

export type InsightStepKind = 'recognize' | 'breakdown' | 'formation' | 'family' | 'usage' | 'quiz';

export const INSIGHT_STEP_LABEL: Record<InsightStepKind, { no: string; title: string }> = {
  recognize: { no: '01', title: 'Kenali Kotoba' },
  breakdown: { no: '02', title: 'Bedah Kanji' },
  formation: { no: '03', title: 'Pembentukan Makna' },
  family: { no: '04', title: 'Keluarga Kosakata' },
  usage: { no: '05', title: 'Penggunaan dalam Kalimat' },
  quiz: { no: '06', title: 'Uji Pemahaman' },
};

export type WordStructure = 'jukugo' | 'okurigana' | 'single' | 'jukujikun' | 'mixed' | 'kana';

export const WORD_STRUCTURE_LABEL: Record<WordStructure, { ja: string; reading: string; id: string }> = {
  jukugo: { ja: '熟語', reading: 'じゅくご', id: 'gabungan kanji' },
  okurigana: { ja: '送り仮名', reading: 'おくりがな', id: 'kanji + akhiran kana' },
  single: { ja: '単漢字', reading: 'たんかんじ', id: 'kanji tunggal' },
  jukujikun: { ja: '熟字訓', reading: 'じゅくじくん', id: 'dibaca sebagai satu kesatuan' },
  mixed: { ja: '混ぜ書き', reading: 'まぜがき', id: 'gabungan kanji & kana' },
  kana: { ja: '仮名', reading: 'かな', id: 'ditulis dengan kana' },
};

export interface InsightKanji {
  char: string;
  /** Bacaan kanji di dalam kata ini (hiragana); kosong bila tidak terurai. */
  reading: string;
  readingType?: ReadingType;
  baseReading?: string;
  /** Arti kanji di dalam kata ini (kurasi) atau arti utama dari database. */
  meaning: string;
  /** Arti utama kanji di database (untuk tautan ke Library Kanji). */
  dbMeaning?: string;
  onyomi: string[];
  kunyomi: string[];
  strokeCount?: number;
  jlpt?: string;
  kanjiId?: string;
}

export interface FamilyWord {
  id: string;
  word: string;
  reading: string;
  meaningId: string;
  jlpt: string;
  /** Posisi kanji jangkar di dalam kata. */
  anchorIndex: number;
  /** Kanji jangkar dibaca sama seperti di kata asal. */
  sameReading: boolean;
}

export interface KanjiFamily {
  kanji: string;
  kanjiMeaning: string;
  reading: string;
  words: FamilyWord[];
}

export interface InsightUsage {
  japanese: string;
  reading: string;
  meaningId: string;
  /** Rentang kata di dalam kalimat [awal, akhir) — untuk disorot. */
  highlight?: [number, number];
  /** Bentuk yang muncul di kalimat, mis. 安心した. */
  surface?: string;
  /** Bentuk kamus yang dipelajari, mis. 安心する. */
  lemma: string;
  /** Sumber kalimat: contoh milik kata ini, atau dipinjam dari kata lain. */
  borrowed: boolean;
}

export interface InsightQuestion {
  id: string;
  prompt: string;
  /** Kata/kanji Jepang yang ditanyakan (ditampilkan besar). */
  subject?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  optionsJp: boolean;
}

export interface KotobaInsight {
  item: KotobaItem;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  definition?: string;
  structure: WordStructure;
  /** Rincian bacaan jukugo: 音読み / 訓読み / 重箱読み / 湯桶読み. */
  readingStyle?: { ja: string; reading: string; id: string };
  parts: ReadingPart[];
  kanji: InsightKanji[];
  formation?: {
    note?: KotobaFormationNote;
    transparency: FormationTransparency | 'umum';
    literal?: string;
    explanation: string;
  };
  families: KanjiFamily[];
  usage?: InsightUsage;
  collocations: string[];
  quiz: InsightQuestion[];
  steps: InsightStepKind[];
  narration: Record<InsightStepKind, string>;
}

// ---------------------------------------------------------------------------
// Sumber data (disuntikkan supaya engine mudah diuji)
// ---------------------------------------------------------------------------

export interface InsightSources {
  kotoba: Record<string, KotobaItem>;
  kanji: Record<string, KanjiItem>;
}

interface PreparedSources {
  all: KotobaItem[];
  byChar: Map<string, KotobaItem[]>;
  byWord: Map<string, KotobaItem>;
  kanjiByChar: Map<string, KanjiItem>;
  kanjiList: KanjiItem[];
}

const prepared = new WeakMap<object, PreparedSources>();

const JLPT_RANK: Record<string, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
const jlptRank = (lvl?: string) => (lvl ? JLPT_RANK[lvl] ?? 0 : 0);

/** Entri yang lebih "inti" menang saat ada kata ganda (mis. dua entri 心配). */
function betterEntry(a: KotobaItem, b: KotobaItem): KotobaItem {
  const score = (k: KotobaItem) => jlptRank(k.jlpt) * 10 + (k.exampleSentence ? 2 : 0) + (k.id.startsWith('kotoba_jm_') ? 0 : 1);
  return score(b) > score(a) ? b : a;
}

function prepare(src: InsightSources): PreparedSources {
  const cached = prepared.get(src.kotoba);
  if (cached) return cached;
  const all = Object.values(src.kotoba);
  const byWord = new Map<string, KotobaItem>();
  for (const k of all) {
    if (!k?.word) continue;
    const prev = byWord.get(k.word);
    byWord.set(k.word, prev ? betterEntry(prev, k) : k);
  }
  const byChar = new Map<string, KotobaItem[]>();
  for (const k of byWord.values()) {
    for (const ch of new Set(Array.from(k.word))) {
      if (!isKanjiChar(ch) || ch === '々') continue;
      const list = byChar.get(ch);
      if (list) list.push(k);
      else byChar.set(ch, [k]);
    }
  }
  const kanjiList = Object.values(src.kanji);
  const kanjiByChar = new Map<string, KanjiItem>();
  for (const kj of kanjiList) if (kj?.character && !kanjiByChar.has(kj.character)) kanjiByChar.set(kj.character, kj);
  const out = { all, byChar, byWord, kanjiByChar, kanjiList };
  prepared.set(src.kotoba, out);
  return out;
}

// ---------------------------------------------------------------------------
// Utilitas
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Arti utama yang ringkas: "Hati / Jantung" → "Hati / Jantung"; "Lega; tenang" → "Lega". */
export function shortMeaning(meaning?: string): string {
  if (!meaning) return '';
  return meaning
    .replace(/^\s*[(（]1[)）]\s*/, '')
    .split(/[;；]|\s*[(（]2[)）]/)[0]
    .replace(/[,，]\s*$/, '')
    .trim();
}

/** Arti yang layak dijadikan pengecoh (bukan catatan tata bahasa / huruf kana). */
const usableMeaning = (m: string) => !!m && m.length <= 28 && !/^[(（]/.test(m) && !/huruf|katakana|hiragana|radikal|lihat/i.test(m);

const normalizeMeaning = (m: string) => m.toLowerCase().replace(/[^a-zÀ-ɏ]+/g, ' ').trim();

function cleanReadingList(list: string[] | undefined): string[] {
  return (list ?? [])
    .map(r => r.replace(/[（(].*?[)）]/g, '').trim())
    .filter(Boolean);
}

export function primaryReading(reading: string, word?: string): string {
  let r = (reading.split(/\s*[/／]\s*/)[0] ?? reading).trim();
  // Beberapa entri menyimpan bacaan bentuk する (勉強 / べんきょうする).
  if (word && r.endsWith('する') && !word.endsWith('する') && r.length > 2) r = r.slice(0, -2);
  return r;
}

// ---------------------------------------------------------------------------
// Struktur kata
// ---------------------------------------------------------------------------

function detectStructure(word: string, parts: ReadingPart[], aligned: boolean): WordStructure {
  const chars = Array.from(word);
  const kanjiCount = chars.filter(isKanjiChar).length;
  if (kanjiCount === 0) return 'kana';
  if (!aligned && parts.some(p => p.isKanji && p.readingType === 'irregular' && Array.from(p.text).length > 1)) return 'jukujikun';
  const allKanji = kanjiCount === chars.length;
  if (allKanji) return kanjiCount === 1 ? 'single' : 'jukugo';
  // Satu deretan kanji di depan + kana di belakang = okurigana (食べる, 新しい, 話し合う tetap mixed).
  const firstKana = chars.findIndex(c => !isKanjiChar(c));
  const kanjiAfterKana = chars.slice(firstKana).some(isKanjiChar);
  if (firstKana > 0 && !kanjiAfterKana) return kanjiCount === 1 ? 'okurigana' : 'mixed';
  return 'mixed';
}

function detectReadingStyle(parts: ReadingPart[]): KotobaInsight['readingStyle'] {
  const kanjiParts = parts.filter(p => p.isKanji);
  if (kanjiParts.length < 2 || kanjiParts.some(p => p.readingType === 'irregular')) return undefined;
  const types = kanjiParts.map(p => p.readingType);
  if (types.every(t => t === 'on')) return { ja: '音読み', reading: 'おんよみ', id: 'semua kanji dibaca dengan bacaan on (asal Tiongkok)' };
  if (types.every(t => t === 'kun')) return { ja: '訓読み', reading: 'くんよみ', id: 'semua kanji dibaca dengan bacaan kun (asli Jepang)' };
  if (kanjiParts.length === 2 && types[0] === 'on' && types[1] === 'kun') return { ja: '重箱読み', reading: 'じゅうばこよみ', id: 'kanji pertama on, kedua kun' };
  if (kanjiParts.length === 2 && types[0] === 'kun' && types[1] === 'on') return { ja: '湯桶読み', reading: 'ゆとうよみ', id: 'kanji pertama kun, kedua on' };
  return undefined;
}

// ---------------------------------------------------------------------------
// Keluarga kosakata
// ---------------------------------------------------------------------------

function buildFamilies(
  item: KotobaItem,
  kanji: InsightKanji[],
  ps: PreparedSources,
  limit: number,
): KanjiFamily[] {
  const lookup = (c: string) => ps.kanjiByChar.get(c);
  const seenChars = new Set<string>();
  const families: KanjiFamily[] = [];
  for (const k of kanji) {
    if (seenChars.has(k.char) || Array.from(k.char).length !== 1 || k.char === '々') continue;
    seenChars.add(k.char);
    const candidates = (ps.byChar.get(k.char) ?? []).filter(o => o.word !== item.word);
    const scored = candidates.map(o => {
      const chars = Array.from(o.word);
      const anchorIndex = chars.indexOf(k.char);
      const kanjiCount = chars.filter(isKanjiChar).length;
      let sameReading = false;
      if (k.reading && k.readingType !== 'irregular') {
        const split = splitWordReading(o.word, primaryReading(o.reading, o.word), lookup);
        const part = split.parts.find(p => p.text === k.char);
        if (part) sameReading = toHiragana(part.baseReading ?? part.reading) === toHiragana(k.baseReading ?? k.reading);
      }
      let score = jlptRank(o.jlpt) * 2;
      if (kanjiCount === 2 && chars.length === 2) score += 3;
      else if (kanjiCount >= 2 && chars.length <= 4) score += 1;
      if (sameReading) score += 2;
      if (o.exampleSentence) score += 0.5;
      if (o.id.startsWith('kotoba_jm_')) score -= 1;
      if (chars.length === 1) score -= 3; // kanji itu sendiri (心) sudah dibahas di Bedah Kanji
      return { o, score, anchorIndex, sameReading };
    });
    scored.sort((a, b) => b.score - a.score || a.o.word.localeCompare(b.o.word));
    families.push({
      kanji: k.char,
      kanjiMeaning: k.meaning,
      reading: k.reading,
      words: scored.slice(0, limit).map(({ o, anchorIndex, sameReading }) => ({
        id: o.id,
        word: o.word,
        reading: primaryReading(o.reading, o.word),
        meaningId: shortMeaning(o.meaningId),
        jlpt: o.jlpt,
        anchorIndex,
        sameReading,
      })),
    });
  }
  return families.filter(f => f.words.length > 0);
}

// ---------------------------------------------------------------------------
// Penggunaan dalam kalimat
// ---------------------------------------------------------------------------

const SURU_START = ['し', 'す', 'さ', 'せ'];

function findInSentence(word: string, wordType: KotobaItem['wordType'], sentence: string) {
  let idx = sentence.indexOf(word);
  let matchLen = word.length;
  if (idx < 0 && (wordType === 'verb' || wordType === 'adjective-i') && word.length >= 2) {
    // Bentuk terkonjugasi: cocokkan batang kata (食べる → 食べ, 新しい → 新し).
    const stem = word.slice(0, -1);
    idx = sentence.indexOf(stem);
    matchLen = stem.length;
  }
  if (idx < 0) return undefined;
  return { idx, matchLen };
}

function buildUsage(item: KotobaItem, ps: PreparedSources): InsightUsage | undefined {
  let ex = item.exampleSentence;
  let borrowed = false;
  if (!ex || !findInSentence(item.word, item.wordType, ex.japanese)) {
    // Pinjam contoh kalimat dari kata lain yang memuat kata ini (mis. kata keluarga).
    const pool = Array.from(item.word).filter(isKanjiChar).flatMap(c => ps.byChar.get(c) ?? []);
    const found = pool.find(o => o.word !== item.word && o.exampleSentence?.japanese.includes(item.word));
    if (found?.exampleSentence) {
      ex = found.exampleSentence;
      borrowed = true;
    }
  }
  if (!ex) return undefined;

  const hit = findInSentence(item.word, item.wordType, ex.japanese);
  let lemma = item.word;
  let surface: string | undefined;
  let highlight: [number, number] | undefined;
  if (hit) {
    let end = hit.idx + hit.matchLen;
    const next = ex.japanese.slice(end);
    const isNounLike = item.wordType === 'noun' || item.wordType === 'adjective-na';
    if (isNounLike && SURU_START.some(s => next.startsWith(s)) && !next.startsWith('しか')) {
      // 安心した / 安心します / 安心して → 安心する
      const run = next.match(/^(?:しました|しています|していた|している|して|します|した|する|すれば|させ\S{0,2}|しない|しよう)/);
      if (run) {
        end += run[0].length;
        lemma = `${item.word}する`;
      }
    } else if (item.wordType === 'adjective-na' && /^[なに]/.test(next)) {
      end += 1;
      lemma = `${item.word}な`;
    } else if (item.wordType === 'verb' || item.wordType === 'adjective-i') {
      const run = next.match(/^[ぁ-ゖ]{0,5}/)?.[0] ?? '';
      // Hentikan pada partikel umum agar sorotan tidak kebablasan.
      const cut = run.search(/(?:から|ので|のに|けど|ても|でも|ながら|ため|は|が|を|に|へ|と|も|よ|ね|か)$/);
      end += cut > 0 ? cut : run.length;
    }
    highlight = [hit.idx, end];
    surface = ex.japanese.slice(hit.idx, end);
    if (surface === item.word) surface = undefined;
  }
  return { japanese: ex.japanese, reading: ex.reading, meaningId: ex.meaningId, highlight, surface, lemma, borrowed };
}

// ---------------------------------------------------------------------------
// Uji Pemahaman
// ---------------------------------------------------------------------------

function pickDistinct<T>(pool: T[], n: number, rand: () => number, key: (t: T) => string, exclude: Set<string>): T[] {
  const out: T[] = [];
  const seen = new Set(exclude);
  const tries = Math.min(pool.length * 3, 400);
  for (let t = 0; t < tries && out.length < n && pool.length > 0; t++) {
    const cand = pool[Math.floor(rand() * pool.length)];
    const k = key(cand);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(cand);
  }
  return out;
}

function makeQuestion(
  id: string,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
  rand: () => number,
  optionsJp: boolean,
  subject?: string,
): InsightQuestion | undefined {
  const opts = Array.from(new Set([correct, ...distractors])).slice(0, 4);
  if (opts.length < 3) return undefined;
  const options = shuffle(opts, rand);
  return { id, prompt, subject, options, correctIndex: options.indexOf(correct), explanation, optionsJp };
}

/** Variasi bacaan yang mirip tapi salah (あんしん → あんじん, あんしい …). */
function readingDistractors(insight: Pick<KotobaInsight, 'parts' | 'reading'>, ps: PreparedSources, rand: () => number): string[] {
  const correct = toHiragana(insight.reading);
  const out = new Set<string>();
  const parts = insight.parts;
  parts.forEach((p, i) => {
    if (!p.isKanji || p.readingType === 'irregular') return;
    const kj = ps.kanjiByChar.get(p.text);
    const alts = [...cleanReadingList(kj?.onyomi), ...cleanReadingList(kj?.kunyomi).slice(0, 2)]
      .map(r => toHiragana(r.replace(/[-.].*$/, '').replace(/^-/, '')))
      .filter(r => r && r !== p.reading && r !== p.baseReading);
    for (const alt of alts.slice(0, 3)) {
      out.add(parts.map((q, j) => (j === i ? alt : q.reading)).join(''));
    }
  });
  // Perubahan bunyi yang sering dikacaukan: voiced/unvoiced, panjang/pendek.
  const swaps: [RegExp, string][] = [[/しん/, 'じん'], [/こう/, 'こ'], [/きょう/, 'きょ'], [/ゅう/, 'ゅ'], [/っ/, 'つ'], [/ん/, 'ん'], [/せい/, 'せ'], [/ぱ/, 'は'], [/が/, 'か'], [/じ/, 'し'], [/ど/, 'と']];
  for (const [re, rep] of swaps) {
    if (re.test(correct)) out.add(correct.replace(re, rep));
  }
  out.delete(correct);
  const list = shuffle(Array.from(out).filter(r => r.length > 0), rand);
  if (list.length < 3) {
    const sameLen = ps.all.filter(o => o.reading && o.reading.length === correct.length && o.reading !== correct);
    for (const o of pickDistinct(sameLen, 3 - list.length, rand, o => toHiragana(primaryReading(o.reading)), new Set([correct, ...list]))) {
      list.push(toHiragana(primaryReading(o.reading)));
    }
  }
  return list.slice(0, 3);
}

function buildQuiz(insight: KotobaInsight, ps: PreparedSources): InsightQuestion[] {
  const rand = mulberry32(hashString(insight.item.id));
  const qs: InsightQuestion[] = [];
  const meaning = shortMeaning(insight.meaning);
  const wordKanji = new Set(insight.kanji.map(k => k.char));

  // 1. Arti kata — pengecoh dari kata selevel yang tidak berbagi kanji.
  const unrelated = (o: KotobaItem) => !!o.meaningId && !Array.from(o.word).some(c => wordKanji.has(c)) && usableMeaning(shortMeaning(o.meaningId));
  const sameType = ps.all.filter(o => o.jlpt === insight.item.jlpt && o.wordType === insight.item.wordType && unrelated(o));
  const sameLevel = sameType.length >= 10 ? sameType : ps.all.filter(o => o.jlpt === insight.item.jlpt && unrelated(o));
  const pool = sameLevel.length >= 10 ? sameLevel : ps.all.filter(unrelated);
  const meaningDistractors = pickDistinct(pool, 3, rand, o => shortMeaning(o.meaningId), new Set([meaning]))
    .map(o => shortMeaning(o.meaningId))
    .filter(m => normalizeMeaning(m) !== normalizeMeaning(meaning));
  const q1 = makeQuestion(
    'meaning',
    'Apa arti kotoba ini?',
    meaning,
    meaningDistractors,
    `${insight.word} (${insight.reading}) berarti "${insight.meaning}".`,
    rand,
    false,
    insight.word,
  );
  if (q1) qs.push(q1);

  // 2. Arti salah satu kanji penyusun (bila ada kanji yang bermakna).
  const target = insight.kanji.find(k => k.meaning && Array.from(k.char).length === 1 && k.char !== '々');
  if (target) {
    const usableKanji = ps.kanjiList.filter(
      kj => kj.character && kj.meaningId && JLPT_RANK[kj.jlpt] && !wordKanji.has(kj.character) && usableMeaning(shortMeaning(kj.meaningId)),
    );
    const sameLevelKanji = usableKanji.filter(kj => kj.jlpt === target.jlpt);
    const kanjiPool = sameLevelKanji.length >= 10 ? sameLevelKanji : usableKanji;
    const correct = target.meaning;
    const ds = pickDistinct(kanjiPool, 3, rand, kj => shortMeaning(kj.meaningId).toLowerCase(), new Set([correct.toLowerCase()]))
      .map(kj => shortMeaning(kj.meaningId));
    const q2 = makeQuestion(
      'kanji',
      `Di dalam ${insight.word}, kanji ini bermakna…`,
      correct,
      ds,
      `${target.char} di dalam ${insight.word} bermakna "${correct}".`,
      rand,
      false,
      target.char,
    );
    if (q2) qs.push(q2);
  }

  // 3. Keluarga: kata mana yang memakai kanji yang sama?
  const fam = insight.families.find(f => f.words.length > 0);
  if (fam) {
    const correct = fam.words[0];
    const others = ps.all.filter(o => o.jlpt === correct.jlpt && Array.from(o.word).length === Array.from(correct.word).length && !o.word.includes(fam.kanji) && Array.from(o.word).every(isKanjiChar));
    const ds = pickDistinct(others.length >= 6 ? others : ps.all.filter(o => !o.word.includes(fam.kanji)), 3, rand, o => o.word, new Set([correct.word]))
      .map(o => o.word);
    const q3 = makeQuestion(
      'family',
      `Kotoba mana yang juga memakai kanji ${fam.kanji}?`,
      correct.word,
      ds,
      `${correct.word} (${correct.reading}) — ${correct.meaningId}. Sama-sama memakai ${fam.kanji}.`,
      rand,
      true,
    );
    if (q3) qs.push(q3);
  }

  // 4. Cara baca.
  const q4 = makeQuestion(
    'reading',
    'Bagaimana cara membaca kotoba ini?',
    toHiragana(insight.reading),
    readingDistractors(insight, ps, rand),
    `${insight.word} dibaca ${insight.reading} (${insight.romaji.toLowerCase()}).`,
    rand,
    true,
    insight.word,
  );
  if (q4) qs.push(q4);

  return qs.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Narasi
// ---------------------------------------------------------------------------

const joinId = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} dan ${items[items.length - 1]}`;

function buildNarration(ins: Omit<KotobaInsight, 'narration' | 'steps' | 'quiz'>): Record<InsightStepKind, string> {
  const kanjiCount = ins.kanji.length;
  const meaningPlain = ins.meaning.replace(/\s*[;；]\s*/g, ' atau ');
  const meaningLower = meaningPlain.charAt(0).toLowerCase() + meaningPlain.slice(1);
  const recognize =
    ins.structure === 'jukugo'
      ? `${ins.word} atau ${ins.romaji.toLowerCase()} berarti ${meaningLower}. Kata ini tersusun dari ${kanjiCount} kanji yang masing-masing memiliki makna sendiri.`
      : ins.structure === 'jukujikun'
        ? `${ins.word} atau ${ins.romaji.toLowerCase()} berarti ${meaningLower}. Uniknya, bacaannya tidak berasal dari bacaan tiap kanji.`
        : ins.structure === 'okurigana'
          ? `${ins.word} atau ${ins.romaji.toLowerCase()} berarti ${meaningLower}. Maknanya dibawa kanji ${ins.kanji[0]?.char}, sedangkan kana di belakangnya adalah akhiran (送り仮名).`
          : `${ins.word} atau ${ins.romaji.toLowerCase()} berarti ${meaningLower}.`;

  const ordinal = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima'];
  const breakdown = ins.kanji.length
    ? ins.kanji
        .map((k, i) =>
          i === 0
            ? `Kanji ${ins.kanji.length > 1 ? ordinal[0] + ' ' : ''}adalah ${k.char}, yang bermakna ${k.meaning.toLowerCase()}.`
            : `${i === ins.kanji.length - 1 ? 'Kemudian ada' : 'Lalu'} ${k.char}, yang berarti ${k.meaning.toLowerCase()}.`,
        )
        .join(' ')
    : '';

  const formation = ins.formation?.note
    ? ins.formation.note.explanation
    : ins.structure === 'okurigana' && ins.formation
      ? ins.formation.explanation
    : ins.formation
      ? `${joinId(ins.kanji.map(k => `${k.char} (${k.meaning.toLowerCase()})`))} bergabung menjadi ${ins.word}: ${meaningLower}. Arti kanji membantu mengingat, tetapi arti kata tetap mengikuti pemakaiannya.`
      : '';

  const family = ins.families.length
    ? `Setelah memahami ${joinId(ins.families.map(f => f.kanji))}, temukan kotoba lain yang memakai kanji yang sama. Satu kanji bisa muncul di banyak kata dengan benang makna yang serupa.`
    : '';

  const usage = ins.usage
    ? `Sekarang lihat ${ins.usage.lemma} di dalam kalimat nyata: "${ins.usage.meaningId}"`
    : '';

  return { recognize, breakdown, formation, family, usage, quiz: 'Uji sebentar pemahamanmu. Pilih jawaban yang paling tepat.' };
}

// ---------------------------------------------------------------------------
// Pembangun utama
// ---------------------------------------------------------------------------

function okuriganaExplanation(word: string, k: InsightKanji, parts: ReadingPart[]): string {
  const kana = parts.filter(p => !p.isKanji).map(p => p.text).join('');
  return `Makna ${word} dibawa oleh kanji ${k.char} (${k.meaning.toLowerCase()}). Kana ${kana} adalah okurigana: bagian yang ikut berubah saat kata dikonjugasi, sedangkan kanjinya tetap.`;
}

export interface BuildInsightOptions {
  familyLimit?: number;
}

export function buildKotobaInsight(item: KotobaItem, src: InsightSources, opts: BuildInsightOptions = {}): KotobaInsight {
  const ps = prepare(src);
  const reading = primaryReading(item.reading || item.word, item.word);
  const lookup = (c: string) => ps.kanjiByChar.get(c);
  const split = splitWordReading(item.word, reading, lookup);
  const structure = detectStructure(item.word, split.parts, split.aligned);
  const note = getFormationNote(item.word);

  const kanji: InsightKanji[] = split.parts
    .filter(p => p.isKanji)
    .flatMap(p => {
      // Deretan 熟字訓 (今日) tetap dibedah per kanji untuk maknanya, tanpa bacaan per kanji.
      const chars = Array.from(p.text);
      return chars.map(ch => {
        const source = ch === '々' ? undefined : ps.kanjiByChar.get(ch);
        const dbMeaning = source?.meaningId ? source.meaningId.trim() : undefined;
        return {
          char: ch,
          reading: chars.length === 1 ? p.reading : '',
          readingType: p.readingType,
          baseReading: chars.length === 1 ? p.baseReading : undefined,
          meaning: note?.parts[ch] ?? (ch === '々' ? 'pengulang kanji sebelumnya' : shortMeaning(dbMeaning?.split(/\s*[,，]\s*/).slice(0, 2).join(', ')) || ''),
          dbMeaning,
          onyomi: cleanReadingList(source?.onyomi),
          kunyomi: cleanReadingList(source?.kunyomi),
          strokeCount: source?.strokeCount,
          jlpt: source?.jlpt,
          kanjiId: source?.id,
        } satisfies InsightKanji;
      });
    });

  const meaningfulKanji = kanji.filter(k => k.char !== '々');
  const formation =
    note || meaningfulKanji.length >= 2 || (structure === 'okurigana' && meaningfulKanji.length === 1)
      ? {
          note,
          transparency: note?.transparency ?? ('umum' as const),
          literal: note?.literal,
          explanation:
            note?.explanation ??
            (structure === 'okurigana'
              ? okuriganaExplanation(item.word, meaningfulKanji[0], split.parts)
              : item.definitionId || item.meaningJaId || item.meaningId),
        }
      : undefined;

  const base = {
    item,
    word: item.word,
    reading,
    romaji: wanakana.toRomaji(toHiragana(reading)).toUpperCase(),
    meaning: item.meaningId,
    definition: item.definitionId || item.meaningJaId,
    structure,
    readingStyle: structure === 'jukugo' ? detectReadingStyle(split.parts) : undefined,
    parts: split.parts,
    kanji,
    formation,
    families: buildFamilies(item, meaningfulKanji, ps, opts.familyLimit ?? 4),
    usage: buildUsage(item, ps),
    collocations: item.collocations ?? [],
  };

  const insight: KotobaInsight = { ...base, quiz: [], steps: [], narration: buildNarration(base) };
  insight.quiz = buildQuiz(insight, ps);

  const steps: InsightStepKind[] = ['recognize'];
  if (kanji.length > 0) steps.push('breakdown');
  if (formation) steps.push('formation');
  if (insight.families.length > 0) steps.push('family');
  if (insight.usage) steps.push('usage');
  if (insight.quiz.length > 0) steps.push('quiz');
  insight.steps = steps;
  return insight;
}

/** Tombol "Pemahaman Kotoba" hanya muncul untuk kata yang memuat kanji. */
export function hasKotobaInsight(item: Pick<KotobaItem, 'word'>): boolean {
  return Array.from(item.word || '').some(c => isKanjiChar(c) && c !== '々');
}
