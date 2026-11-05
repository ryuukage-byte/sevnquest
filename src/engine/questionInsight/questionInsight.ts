// Engine "Bedah Soal": membongkar satu soal Bank Soal menjadi pelajaran bertahap.
//   Pahami Perintah → Bedah Kalimat → (Susun Kalimat ★) → Analisis Pilihan → Kunci & Alasan → Soal Serupa
// Semua isi diturunkan dari data yang ada (Kotoba, Kanji, Bunpou, mesin konjugasi, pembahasan soal).
// Bila database tidak tahu jawabannya, engine mengatakannya apa adanya — tidak mengarang alasan.

import type { BunpouItem, KanjiItem, KotobaItem } from '../../types/content';
import type { UnifiedQuestionItem } from '../../data/questionLibrary';
import {
  EXTRA_FORM_LABEL,
  FORM_MEANING,
  INSTRUCTION_TERMS,
  MONDAI_GUIDE,
  PARTICLE_GLOSSARY,
  type MondaiGuide,
  type QuestionKind,
} from '../../data/questionInsightGuide';
import { analyzeText, FORM_LABEL } from '../textStudy/textAnalyzer';
import { conjugateAdjective, conjugateVerb } from '../morphology/inflectionEngine';
import { hasKotobaInsight, isKanjiChar, normalizeEntry, splitWordReading, toHiragana } from '../kotobaInsight/readingSplit';
import { cleanReadingOption, detectReadingTraps, isKanaOnly, readingDiff, type DiffPiece, type ReadingTrap } from './readingTraps';
import { questionInsightKind } from './kind';

export { questionInsightKind, hasQuestionInsight } from './kind';

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export type QuestionStepKind = 'task' | 'sentence' | 'build' | 'options' | 'answer' | 'similar';

export const QUESTION_STEP_TITLE: Record<QuestionStepKind, string> = {
  task: 'Pahami Perintah',
  sentence: 'Bedah Kalimat',
  build: 'Susun Kalimat',
  options: 'Analisis Pilihan',
  answer: 'Kunci & Alasan',
  similar: 'Soal Serupa',
};

export interface WordInfo {
  kotobaId?: string;
  word: string;
  reading?: string;
  meaning?: string;
  jlpt?: string;
  /** Kata berkanji di database → bisa dibuka di Pemahaman Kotoba. */
  insight: boolean;
}

export interface PatternInfo {
  id: string;
  title: string;
  meaning: string;
  formula?: string;
  level: string;
  /** exact = pilihan persis pola ini; partial = pilihan memuat pola ini. */
  quality: 'exact' | 'partial';
}

export interface FormInfo {
  lemma: string;
  lemmaReading?: string;
  kotobaId?: string;
  /** Kunci bentuk, mis. 'passive+te'. */
  formKey: string;
  label: string;
  meaning?: string;
}

export interface KanjiPart {
  text: string;
  reading: string;
  isKanji: boolean;
  readingType?: 'on' | 'kun' | 'irregular';
  meaning?: string;
}

export interface KanjiSwap {
  from: string;
  to: string;
  fromMeaning?: string;
  toMeaning?: string;
  /** Bacaan on yang dimiliki kedua kanji (pengecoh homofon). */
  sharedReading?: string;
}

export interface OptionOwner {
  /** Kanji / pola / kata pemilik pilihan pengecoh. */
  text: string;
  meaning?: string;
  readingType?: 'on' | 'kun';
  patternId?: string;
  kotobaId?: string;
}

export interface OptionInsight {
  index: number;
  /** Teks pilihan tanpa penanda (@@). */
  text: string;
  isCorrect: boolean;
  /** Kesimpulan satu-dua kalimat. */
  verdict: string;
  word?: WordInfo;
  /** Kata lain dengan bacaan/tulisan yang sama (konteks pengecoh). */
  altWords?: WordInfo[];
  pattern?: PatternInfo;
  form?: FormInfo;
  particles?: { ja: string; fn: string }[];
  traps?: ReadingTrap[];
  diff?: DiffPiece[];
  kanjiSwaps?: KanjiSwap[];
  owner?: OptionOwner;
  /** Soal 用法: posisi kata yang diuji di kalimat pilihan. */
  highlight?: [number, number];
  /** Potongan panjang (走っていくことが) diurai per kata/pola/partikel. */
  pieces?: FragmentPiece[];
}

export interface FragmentPiece {
  surface: string;
  gloss: string;
  kind: 'word' | 'pattern' | 'particle';
}

export interface SentenceSegment {
  text: string;
  role: 'plain' | 'answer' | 'target' | 'fragment';
}

export interface SentenceWord extends WordInfo {
  surface: string;
  formLabel?: string;
  /** Bentuk kamus lain yang juga menghasilkan bentuk ini (mis. 行って ← 行く / 行う). */
  alternatives?: string[];
}

export interface SentenceInsight {
  text: string;
  segments: SentenceSegment[];
  translation?: string;
  translationSource?: 'explanation' | 'database';
  words: SentenceWord[];
  grammar: { id: string; title: string; meaning: string; matched: string }[];
  chunks: { text: string; role: string }[];
}

export interface StarBuild {
  before: string;
  after: string;
  /** Indeks pilihan dalam urutan kalimat. */
  order: number[];
  /** Posisi ★ (0-based) di antara empat kotak. */
  starPos: number;
  separator: string;
}

export interface TaskInsight {
  guide: MondaiGuide;
  mondai?: string;
  instructionJa?: string;
  instructionId: string;
  terms: { ja: string; reading: string; id: string }[];
  /** Pertanyaan di dalam prompt (mis. "Cara baca kata yang dikurung adalah..."). */
  question?: string;
}

export interface AnswerInsight {
  text: string;
  curated: boolean;
  lines: { label?: string; text: string }[];
  summary: string[];
  words: WordInfo[];
  patterns: PatternInfo[];
  kanji: string[];
}

export interface SimilarQuestion {
  item: UnifiedQuestionItem;
  reason: string;
}

export interface QuestionInsight {
  question: UnifiedQuestionItem;
  kind: QuestionKind;
  /** Kata/kanji/pola yang diuji. */
  target?: string;
  targetInfo?: WordInfo;
  /** Rincian bacaan per kanji untuk jawaban benar (soal bacaan/penulisan). */
  parts?: KanjiPart[];
  /** Data kanji (soal on/kun & arti kanji). */
  kanji?: { char: string; meaning: string; onyomi: string[]; kunyomi: string[]; words: { word: string; reading: string; meaning: string }[] };
  task: TaskInsight;
  sentence?: SentenceInsight;
  build?: StarBuild;
  options: OptionInsight[];
  optionsHeadline: string;
  answer: AnswerInsight;
  similar: SimilarQuestion[];
  steps: QuestionStepKind[];
  narration: Partial<Record<QuestionStepKind, string>>;
}

export interface QuestionInsightSources {
  kotoba: Record<string, KotobaItem>;
  kanji: Record<string, KanjiItem>;
  bunpou: Record<string, BunpouItem>;
}

// ---------------------------------------------------------------------------
// Indeks sumber (dibangun sekali per objek database)
// ---------------------------------------------------------------------------

interface PatternEntry {
  item: BunpouItem;
  fromTitle: boolean;
}

interface Prepared {
  byWord: Map<string, KotobaItem>;
  byReading: Map<string, KotobaItem[]>;
  byFirstChar: Map<string, KotobaItem[]>;
  /** Verba/kata sifat menurut huruf pertama bacaannya (untuk pilihan kana terkonjugasi). */
  kanaInflectables: Map<string, KotobaItem[]>;
  kanjiByChar: Map<string, KanjiItem>;
  kanjiByReading: Map<string, { kanji: KanjiItem; type: 'on' | 'kun' }[]>;
  kanjiByMeaning: Map<string, KanjiItem[]>;
  patternIndex: Map<string, PatternEntry[]>;
  patternKeys: string[];
  patternByMeaning: Map<string, BunpouItem[]>;
}

const preparedCache = new WeakMap<object, Prepared>();

const JLPT_RANK: Record<string, number> = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
const jlptRank = (lvl?: string) => (lvl ? JLPT_RANK[lvl] ?? 0 : 0);
const hasKanji = (s: string) => Array.from(s).some(isKanjiChar);
const INFLECTABLE = new Set(['verb', 'adjective-i', 'adjective-na']);
const normMeaning = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[.。]$/, '').trim();

function entryScore(k: KotobaItem): number {
  return jlptRank(k.jlpt) * 10 + (k.exampleSentence ? 2 : 0) + (k.id.startsWith('kotoba_jm_') ? 0 : 1);
}

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

const splitVariants = (s?: string) => (s || '').split(/\s*[／/]\s*/).map(x => x.trim()).filter(Boolean);

/** Kunci pencarian pola: "書かれている（受身形）" → 書かれている; "〜方" → 方; rumus "Vれる" → れる. */
function cleanPatternKey(s: string): string {
  return s.normalize('NFKC').replace(/[〜～~\s。.「」]/g, '').trim();
}
const PATTERN_FORMULA_NOISE = /形|詞|^(する|です|だ|ます|の|が|を|に|は|と|で|も|な|い|る|た|て)$/;

/**
 * Bentuk umum di dalam kurung judul: "努力によって（Nに＋よって／よっては／より／よるN）" →
 * によって, によっては, により, による. Slot (N, V, na …) dibuang lalu bagian depan × bagian belakang.
 */
function parenthesizedKeys(title: string): string[] {
  const body = title.match(/[（(]([^）)]+)[）)]/)?.[1];
  if (!body || !/[ぁ-ゖ一-龯]/.test(body)) return [];
  const noSlot = (x: string) => x.replace(/[A-Za-zＡ-Ｚａ-ｚ]+/g, '').replace(/[〜～~\s]/g, '');
  const alts = (seg: string) => seg.split(/[／/・、]/).map(noSlot).filter(Boolean);
  const segs = body.split(/[＋+]/);
  if (segs.length === 1) return alts(body);
  const tail = alts(segs[segs.length - 1]);
  const head = alts(segs.slice(0, -1).join(''));
  return head.length ? head.flatMap(h => tail.map(t => h + t)) : tail;
}

function patternKeysOf(item: BunpouItem): Map<string, boolean> {
  const keys = new Map<string, boolean>();
  const add = (k: string, fromTitle: boolean) => {
    if (!k || !/[ぁ-ゖァ-ヺ一-龯々]/.test(k)) return;
    if (!keys.has(k) || fromTitle) keys.set(k, fromTitle);
  };
  const head = (item.title || '').split(/[（(]/)[0];
  add(cleanPatternKey(head), true);
  for (const piece of head.split(/[・／/、,]/)) add(cleanPatternKey(piece), true);
  for (const k of parenthesizedKeys(item.title || '')) {
    if (k.length >= 2 && !PATTERN_FORMULA_NOISE.test(k)) add(cleanPatternKey(k), true);
  }
  const formula = (item.formula || '').replace(/[[［(（][^\]］)）]*[\]］)）]/g, ' ');
  for (const run of formula.match(/[ぁ-ゖァ-ヺー一-龯々]+/g) || []) {
    if (run.length >= 2 && !PATTERN_FORMULA_NOISE.test(run)) add(cleanPatternKey(run), false);
  }
  return keys;
}

const titleKeyCache = new Map<string, string[]>();
/** Kunci judul sebuah pola (tanpa potongan rumus). */
function titleKeysOf(item: BunpouItem): string[] {
  let keys = titleKeyCache.get(item.id);
  if (!keys) {
    keys = [...patternKeysOf(item)].filter(([, fromTitle]) => fromTitle).map(([k]) => k);
    titleKeyCache.set(item.id, keys);
  }
  return keys;
}

/**
 * Hit pola dari textAnalyzer hanya dipercaya bila bentuk dasarnya sesuai judul pola. Pencocokan lewat
 * potongan rumus saja menyesatkan (ことか → pola いかに, padahal kalimatnya memakai ことから).
 */
function trustedGrammarHit(g: { key: string; matched: string; item: BunpouItem }): boolean {
  const keys = titleKeysOf(g.item);
  const base = cleanPatternKey(g.key);
  // 京都というと → というと diterima (judul diakhiri bentuk dasar); いかに ← ことか ditolak.
  return keys.some(k => k === base || (k.length >= 2 && base.includes(k)) || (base.length >= 3 && k.endsWith(base)));
}

function prepare(src: QuestionInsightSources): Prepared {
  const cached = preparedCache.get(src.kotoba);
  if (cached) return cached;

  const byWord = new Map<string, KotobaItem>();
  const byReading = new Map<string, KotobaItem[]>();
  const byFirstChar = new Map<string, KotobaItem[]>();
  const kanaInflectables = new Map<string, KotobaItem[]>();
  for (const k of Object.values(src.kotoba)) {
    if (!k?.word) continue;
    const variants = splitVariants(k.word);
    for (const w of variants) {
      const prev = byWord.get(w);
      if (!prev || entryScore(k) > entryScore(prev)) byWord.set(w, k);
    }
    for (const r of splitVariants(k.reading)) pushMap(byReading, toHiragana(r), k);
    const first = variants[0]?.[0];
    if (first && isKanjiChar(first)) pushMap(byFirstChar, first, k);
    const r0 = splitVariants(k.reading)[0];
    // Hanya kata inti (N5–N3) agar homofon langka tidak menang (なって ← 成る, bukan 綯う).
    if (r0 && INFLECTABLE.has(k.wordType) && jlptRank(k.jlpt) >= 3) pushMap(kanaInflectables, toHiragana(r0)[0], k);
  }
  for (const list of byReading.values()) list.sort((a, b) => entryScore(b) - entryScore(a));

  const kanjiByChar = new Map<string, KanjiItem>();
  const kanjiByReading = new Map<string, { kanji: KanjiItem; type: 'on' | 'kun' }[]>();
  const kanjiByMeaning = new Map<string, KanjiItem[]>();
  for (const kj of Object.values(src.kanji)) {
    if (!kj?.character || kanjiByChar.has(kj.character)) continue;
    kanjiByChar.set(kj.character, kj);
    for (const raw of kj.onyomi || []) {
      const n = normalizeEntry(raw);
      if (n) pushMap(kanjiByReading, n.stem, { kanji: kj, type: 'on' as const });
    }
    for (const raw of kj.kunyomi || []) {
      const n = normalizeEntry(raw);
      if (!n) continue;
      pushMap(kanjiByReading, n.stem, { kanji: kj, type: 'kun' as const });
      if (n.okurigana) pushMap(kanjiByReading, n.stem + n.okurigana, { kanji: kj, type: 'kun' as const });
    }
    if (kj.meaningId) pushMap(kanjiByMeaning, normMeaning(kj.meaningId), kj);
  }
  for (const list of kanjiByReading.values()) list.sort((a, b) => jlptRank(b.kanji.jlpt) - jlptRank(a.kanji.jlpt));

  const patternIndex = new Map<string, PatternEntry[]>();
  const patternByMeaning = new Map<string, BunpouItem[]>();
  const seen = new Set<string>();
  for (const item of Object.values(src.bunpou)) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    for (const [key, fromTitle] of patternKeysOf(item)) pushMap(patternIndex, key, { item, fromTitle });
    if (item.meaningId) pushMap(patternByMeaning, normMeaning(item.meaningId), item);
  }
  const patternKeys = [...patternIndex.keys()].sort((a, b) => b.length - a.length);

  const out: Prepared = { byWord, byReading, byFirstChar, kanaInflectables, kanjiByChar, kanjiByReading, kanjiByMeaning, patternIndex, patternKeys, patternByMeaning };
  preparedCache.set(src.kotoba, out);
  return out;
}

// ---------------------------------------------------------------------------
// Utilitas teks
// ---------------------------------------------------------------------------

/** Teks pilihan untuk dibandingkan: tanpa @@, romaji dalam kurung, dan spasi. */
export function cleanOption(opt: string): string {
  return opt.replace(/@@/g, '').replace(/\s*[（(][A-Za-z\s'’.-]+[)）]/g, '').replace(/[\s　]+/g, '').trim();
}

const displayOption = (opt: string) => opt.replace(/@@/g, '').trim();

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Arti ringkas untuk kartu: dua bagian pertama ("Naik; masuk; ..." → "Naik; masuk"). */
function briefMeaning(meaning?: string): string | undefined {
  if (!meaning) return undefined;
  const parts = meaning.split(/\s*;\s*/).filter(Boolean);
  const out = parts.slice(0, 2).join('; ');
  return out.length > 90 ? `${out.slice(0, 87)}…` : out;
}

function toWordInfo(k: KotobaItem, src: QuestionInsightSources): WordInfo {
  const word = splitVariants(k.word)[0] || k.word;
  return {
    kotobaId: src.kotoba[k.id] ? k.id : undefined,
    word,
    reading: splitVariants(k.reading)[0],
    meaning: briefMeaning(k.meaningId),
    jlpt: k.jlpt,
    insight: Boolean(src.kotoba[k.id]) && hasKotobaInsight({ word }),
  };
}

// ---------------------------------------------------------------------------
// Prompt: kalimat, kata yang diuji, bagian kosong
// ---------------------------------------------------------------------------

export interface ParsedPrompt {
  sentence: string;
  question?: string;
  target?: string;
  blank?: { start: number; end: number; trailing: boolean };
}

const BLANK_RE = /[（(][\s　]*[)）]|_{3,}|＿{2,}/;
const META_RE = /cara baca|apa arti|dibaca|bagaimana|pilih|kalimat di atas|読み方|意味|上の文|下線部|この文|kata\s/i;

export function parsePrompt(prompt: string, targetHint?: string): ParsedPrompt {
  let p = prompt.replace(/@@/g, '').trim();
  let target: string | undefined;
  let question: string | undefined;

  // Paket JFT menandai kata yang diuji dengan 「kata「.
  const jft = p.match(/「([^「」]+)「/);
  if (jft) {
    target = jft[1];
    p = p.replace(jft[0], jft[1]);
  }
  p = p.replace(/^Kalimat\s*[:：]\s*/, '');

  const quoted = p.match(/^「([\s\S]+?)」\s*([\s\S]*)$/);
  const colon = p.match(/^([^「」]+?)[:：]\s*「([\s\S]+)」\s*$/);
  let sentence = p;
  if (quoted && quoted[2] && META_RE.test(quoted[2])) {
    sentence = quoted[1];
    question = quoted[2].trim();
    const inner = [...question.matchAll(/「([^「」]+)」/g)].map(m => m[1]);
    if (!target && inner.length) target = inner[inner.length - 1];
  } else if (colon) {
    question = colon[1].trim();
    sentence = colon[2];
  }

  const paren = sentence.match(/[(（]([^()（）\s　]+)[)）]/);
  if (paren && hasKanji(paren[1])) {
    target = target ?? paren[1];
    sentence = sentence.replace(paren[0], paren[1]);
  }
  target = target ?? targetHint;

  let blank: ParsedPrompt['blank'];
  const b = sentence.match(BLANK_RE);
  if (b && b.index !== undefined) {
    const before = sentence.slice(0, b.index).trim();
    const after = sentence.slice(b.index + b[0].length).trim();
    blank = { start: b.index, end: b.index + b[0].length, trailing: /[。.!?！？」]$/.test(before) && !after };
  }
  return { sentence: sentence.trim(), question, target, blank };
}

// ---------------------------------------------------------------------------
// Pencarian kata, pola, partikel, bentuk konjugasi
// ---------------------------------------------------------------------------

export function lookupWord(text: string, src: QuestionInsightSources): { info: WordInfo; alts: WordInfo[]; formLabel?: string } | undefined {
  const P = prepare(src);
  const t = cleanOption(text).replace(/[〜～]/g, '');
  if (!t) return undefined;
  const direct = P.byWord.get(t);
  if (direct) return { info: toWordInfo(direct, src), alts: [] };
  if (isKanaOnly(t)) {
    const list = P.byReading.get(toHiragana(t));
    if (list?.length) {
      // Kata kana (たくさん, ゆっくり) lebih dulu daripada homofon berkanji.
      const sorted = list.slice().sort((a, b) => Number(hasKanji(a.word)) - Number(hasKanji(b.word)) || entryScore(b) - entryScore(a));
      const main = sorted[0];
      const alts = sorted.slice(1).filter(k => k.word !== main.word).slice(0, 2).map(k => toWordInfo(k, src));
      return { info: toWordInfo(main, src), alts };
    }
  }
  // 勉強して → 勉強. Pangkal satu kanji (直して, 試して) adalah verba biasa, bukan kata benda + する.
  const suru = t.match(/^(.+?)(する|した|して|します|しない|される|させる)$/);
  if (suru && /^[一-龯々]{2,}$/.test(suru[1])) {
    const noun = P.byWord.get(suru[1]);
    if (noun) return { info: toWordInfo(noun, src), alts: [] };
  }
  const inflected = deinflect(t, src);
  if (inflected) {
    return {
      info: toWordInfo(inflected.item, src),
      alts: inflected.alts.map(k => toWordInfo(k, src)),
      formLabel: inflected.keys.map(formLabelOf).join(' / '),
    };
  }
  const s = analyzeText(t).sentences[0];
  const w = s?.words[0];
  if (s && s.words.length === 1 && w.start === 0 && w.end === s.text.length) {
    return { info: toWordInfo(w.item, src), alts: [], formLabel: w.inflected && w.form ? FORM_LABEL[w.form] : undefined };
  }
  return undefined;
}

const SHORT_PATTERN_OK = new Set(['ので', 'のに', 'ても', 'たら', 'なら', 'ため', 'ほど', 'まま', 'ばかり', 'だけ', 'しか', 'こと', 'もの', 'よう', 'そう', 'らしい']);

function toPatternInfo(item: BunpouItem, quality: PatternInfo['quality']): PatternInfo {
  return { id: item.id, title: item.title, meaning: item.meaningId, formula: item.formula || undefined, level: item.level, quality };
}

function pickPattern(entries: PatternEntry[], key: string, level?: string): BunpouItem {
  const titleHead = (it: BunpouItem) => cleanPatternKey((it.title || '').split(/[（(]/)[0]);
  return entries
    .slice()
    .sort(
      (a, b) =>
        Number(titleHead(b.item) === key) - Number(titleHead(a.item) === key) ||
        Number(b.fromTitle) - Number(a.fromTitle) ||
        Number(b.item.level === level) - Number(a.item.level === level) ||
        a.item.title.length - b.item.title.length ||
        a.item.id.localeCompare(b.item.id),
    )[0].item;
}

interface PatternMatch {
  info: PatternInfo;
  /** Kunci berasal dari judul pola (lebih tepercaya daripada potongan rumus). */
  fromTitle: boolean;
}

function matchPatternDetailed(text: string, src: QuestionInsightSources, level?: string): PatternMatch | undefined {
  const P = prepare(src);
  const o = cleanPatternKey(cleanOption(text));
  if (!o) return undefined;
  const result = (entries: PatternEntry[], key: string, quality: PatternInfo['quality']): PatternMatch => {
    const item = pickPattern(entries, key, level);
    return { info: toPatternInfo(item, quality), fromTitle: entries.some(e => e.item.id === item.id && e.fromTitle) };
  };
  const exact = P.patternIndex.get(o);
  if (exact) return result(exact, o, 'exact');
  const variants = [
    o.replace(/く$/, 'い'),
    o.replace(/くて$/, 'い'),
    o.replace(/な$/, ''),
    o.replace(/に$/, ''),
    o.replace(/で$/, 'だ'),
    o.replace(/です$/, 'だ'),
  ].filter(v => v !== o && v.length >= 2);
  for (const v of variants) {
    const hit = P.patternIndex.get(v);
    if (hit) return result(hit, v, 'exact');
  }
  if (o.length < 3) return undefined;
  // "Memuat pola" hanya dari judul pola: potongan rumus (ない, いない …) terlalu umum dan menyesatkan.
  for (const key of P.patternKeys) {
    if (key.length >= o.length || key.length * 2 < o.length) continue;
    if (!(hasKanji(key) ? key.length >= 2 : key.length >= 3 || SHORT_PATTERN_OK.has(key))) continue;
    // Pola harus di awal/akhir pilihan, dan sisanya kata yang dikenali (する + しかない, して + しかたがない).
    // Sisa berupa partikel/potongan mengubah ungkapannya: に + したがって ≠ したがって, にし + がって ≠ がる.
    const rest = o.endsWith(key) ? o.slice(0, -key.length) : o.startsWith(key) ? o.slice(key.length) : null;
    if (rest === null || !rest) continue;
    if (decomposeParticles(rest)) continue;
    if (!hasKanji(rest) && !lookupWord(rest, src)) continue;
    const titled = P.patternIndex.get(key)!.filter(e => e.fromTitle);
    if (titled.length) return result(titled, key, 'partial');
  }
  return undefined;
}

/** Cocokkan teks pilihan ke pola Bunpou: persis dulu, lalu bentuk turunan, lalu "memuat pola". */
export function matchPattern(text: string, src: QuestionInsightSources, level?: string): PatternInfo | undefined {
  return matchPatternDetailed(text, src, level)?.info;
}

const PARTICLE_KEYS = Object.keys(PARTICLE_GLOSSARY).sort((a, b) => b.length - a.length);
const FINAL_ONLY = new Set(['よ', 'ね']);

/** "では" → で + は; null bila teks bukan rangkaian partikel. */
export function decomposeParticles(text: string): { ja: string; fn: string }[] | null {
  const t = cleanOption(text);
  if (!t || t.length > 6 || !isKanaOnly(t)) return null;
  const out: { ja: string; fn: string }[] = [];
  let i = 0;
  while (i < t.length) {
    const key = PARTICLE_KEYS.find(k => t.startsWith(k, i) && (!FINAL_ONLY.has(k) || i + k.length === t.length));
    if (!key) return null;
    out.push({ ja: key, fn: PARTICLE_GLOSSARY[key].fn });
    i += key.length;
  }
  return out.length ? out : null;
}

const SECOND_FORMS = new Set(['te', 'ta', 'nai', 'nakatta', 'masu', 'ba', 'tara', 'volitional', 'masu_stem', 'jisho']);
const DERIVED = ['potential', 'passive', 'causative', 'causative_passive'] as const;
const surfaceCache = new Map<string, Map<string, string[]>>();

function addSurface(map: Map<string, string[]>, surface: string | undefined, key: string) {
  if (!surface) return;
  const list = map.get(surface);
  if (!list) map.set(surface, [key]);
  else if (!list.includes(key)) list.push(key);
}

function verbExtras(map: Map<string, string[]>, forms: Record<string, { japanese: string } | undefined>, prefix: string) {
  const stem = forms.masu_stem?.japanese;
  if (stem) for (const t of ['すぎる', 'すぎ', 'すぎて', 'すぎた']) addSurface(map, stem + t, `${prefix}sugiru`);
  const te = forms.te?.japanese;
  if (te) {
    addSurface(map, `${te}いる`, `${prefix}teiru`);
    addSurface(map, `${te}います`, `${prefix}teiru`);
    addSurface(map, `${te}いた`, `${prefix}teita`);
    addSurface(map, `${te}いない`, `${prefix}teinai`);
    addSurface(map, `${te}いません`, `${prefix}teinai`);
    addSurface(map, `${te}も`, `${prefix}temo`);
  }
  const nai = forms.nai?.japanese;
  if (nai?.endsWith('ない')) {
    const stem = nai.slice(0, -2);
    addSurface(map, `${stem}なくて`, `${prefix}nakute`);
    addSurface(map, `${stem}ないで`, `${prefix}naide`);
    addSurface(map, `${stem}なければ`, `${prefix}nakereba`);
    addSurface(map, `${stem}なく`, `${prefix}naku`);
    addSurface(map, `${stem}ず`, `${prefix}zu`);
    addSurface(map, `${stem}ずに`, `${prefix}zuni`);
  }
}

/**
 * Semua bentuk permukaan sebuah kata → nama bentuknya (bisa lebih dari satu, mis. potensial = pasif).
 * `kana` = bentuk ditulis dengan bacaannya (成る → なって), untuk pilihan yang ditulis tanpa kanji.
 */
function formSurfaces(k: KotobaItem, kana = false): Map<string, string[]> {
  const cacheKey = kana ? `${k.id}#kana` : k.id;
  const cached = surfaceCache.get(cacheKey);
  if (cached) return cached;
  const map = new Map<string, string[]>();
  const reading = splitVariants(k.reading)[0];
  const word = kana && reading ? toHiragana(reading) : splitVariants(k.word)[0] || k.word;
  try {
    if (k.wordType === 'verb' || (k.wordType === 'noun' && hasKanji(word))) {
      const verb = k.wordType === 'verb' ? word : `${word}する`;
      const verbReading = k.wordType === 'verb' ? reading : reading ? `${reading}する` : undefined;
      if (k.wordType === 'verb' || /する$/.test(verb)) {
        const conj = conjugateVerb(verb, verbReading);
        for (const [name, f] of Object.entries(conj.forms)) addSurface(map, f?.japanese, name);
        verbExtras(map, conj.forms, '');
        for (const d of DERIVED) {
          const base = conj.forms[d];
          if (!base?.japanese?.endsWith('る')) continue;
          const second = conjugateVerb(base.japanese, base.reading, 'ichidan');
          for (const [name, f] of Object.entries(second.forms)) if (SECOND_FORMS.has(name) && name !== 'jisho') addSurface(map, f?.japanese, `${d}+${name}`);
          verbExtras(map, second.forms, `${d}+`);
        }
      }
    } else if (k.wordType === 'adjective-i' || k.wordType === 'adjective-na') {
      const conj = conjugateAdjective(word, reading, k.wordType === 'adjective-i' ? 'i' : 'na');
      for (const [name, f] of Object.entries(conj.forms)) addSurface(map, f?.japanese, name);
    }
  } catch {
    // Entri yang tidak bisa dikonjugasi: tanpa bentuk turunan.
  }
  surfaceCache.set(cacheKey, map);
  return map;
}

/**
 * Verba fungsi yang lazim ditulis kana: bila 「なって」 cocok dengan 成る dan 鳴る, yang dimaksud
 * hampir selalu verba fungsinya (なる = menjadi). Homofon lain tetap ditampilkan sebagai alternatif.
 */
const KANA_PREFERRED: Record<string, string> = {
  なる: '成る', いる: '居る', ある: '有る', する: '為る', くる: '来る', いく: '行く', できる: '出来る',
  みる: '見る', おく: '置く', しまう: '仕舞う', あげる: '上げる', くれる: '呉れる', もらう: '貰う', いう: '言う',
};

/** Bentuk konjugasi → kata dasarnya, memakai mesin konjugasi yang sama (bukan aturan kedua). */
function deinflect(t: string, src: QuestionInsightSources): { item: KotobaItem; keys: string[]; alts: KotobaItem[] } | undefined {
  const P = prepare(src);
  let best: { item: KotobaItem; keys: string[]; alts: KotobaItem[] } | undefined;
  const all: KotobaItem[] = [];
  const preferredScore = (k: KotobaItem) => {
    const r = toHiragana(splitVariants(k.reading)[0] ?? '');
    return KANA_PREFERRED[r] && splitVariants(k.word).includes(KANA_PREFERRED[r]) ? 100 : 0;
  };
  const consider = (k: KotobaItem, kana: boolean) => {
    const keys = formSurfaces(k, kana).get(t);
    if (!keys || keys.includes('jisho') || keys.includes('base')) return;
    all.push(k);
    const score = (x: KotobaItem) => (kana ? preferredScore(x) : 0) + entryScore(x);
    if (!best || score(k) > score(best.item)) best = { item: k, keys, alts: [] };
  };
  if (isKanjiChar(t[0])) {
    for (const k of (P.byFirstChar.get(t[0]) || []).slice(0, 200)) {
      if (!INFLECTABLE.has(k.wordType)) continue;
      const w = splitVariants(k.word)[0] || '';
      if (w.length > t.length + 1) continue;
      consider(k, false);
    }
  } else if (isKanaOnly(t)) {
    for (const k of P.kanaInflectables.get(toHiragana(t)[0]) || []) consider(k, true);
    // Verba tak beraturan berubah huruf awalnya (する → して, くる → きて): periksa verba fungsi langsung.
    for (const w of Object.values(KANA_PREFERRED)) {
      const k = P.byWord.get(w);
      if (k && !all.includes(k)) consider(k, true);
    }
  }
  if (best) {
    const chosen: KotobaItem = best.item;
    best.alts = all.filter(k => k.id !== chosen.id && k.word !== chosen.word).slice(0, 2);
  }
  return best;
}

function formLabelOf(key: string): string {
  return key
    .split('+')
    .map(part => FORM_LABEL[part] ?? EXTRA_FORM_LABEL[part] ?? part)
    .join(' + ');
}

function formMeaningOf(key: string): string | undefined {
  const parts = key.split('+').map(part => FORM_MEANING[part]).filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function commonPrefix(list: string[]): string {
  if (!list.length) return '';
  let pre = list[0];
  for (const s of list.slice(1)) {
    let i = 0;
    while (i < pre.length && i < s.length && pre[i] === s[i]) i++;
    pre = pre.slice(0, i);
  }
  return pre;
}

/**
 * Pilihan berupa bentuk-bentuk dari satu kata (読まれて / 読んで / 読ませて / 読めなくて):
 * temukan kata dasarnya dan nama bentuk tiap pilihan.
 */
export function detectFormFamily(options: string[], src: QuestionInsightSources): (FormInfo | undefined)[] {
  const P = prepare(src);
  const cleaned = options.map(cleanOption);
  const prefix = commonPrefix(cleaned);
  const kanjiRun = prefix.match(/^[一-龯々]+/)?.[0];
  if (!kanjiRun) return [];
  const candidates = (P.byFirstChar.get(kanjiRun[0]) || []).filter(k => {
    const w = splitVariants(k.word)[0] || '';
    return w.startsWith(kanjiRun) && w.length <= kanjiRun.length + 4 && ['verb', 'adjective-i', 'adjective-na', 'noun'].includes(k.wordType);
  });
  let best: { k: KotobaItem; surfaces: Map<string, string[]>; hits: number } | undefined;
  for (const k of candidates.slice(0, 80)) {
    const surfaces = formSurfaces(k);
    const hits = cleaned.filter(o => surfaces.has(o)).length;
    if (hits >= 2 && (!best || hits > best.hits || (hits === best.hits && entryScore(k) > entryScore(best.k)))) best = { k, surfaces, hits };
  }
  if (!best) return [];
  const { k, surfaces } = best;
  const lemma = splitVariants(k.word)[0] || k.word;
  const isSuruNoun = k.wordType === 'noun';
  return cleaned.map(o => {
    const keys = surfaces.get(o);
    if (!keys) return undefined;
    const label = keys.map(formLabelOf).join(' / ');
    return {
      lemma: isSuruNoun ? `${lemma}する` : lemma,
      lemmaReading: splitVariants(k.reading)[0],
      kotobaId: src.kotoba[k.id] ? k.id : undefined,
      formKey: keys[0],
      label,
      meaning: formMeaningOf(keys[0]),
    };
  });
}

/** Bentuk kamus lain dengan kanji awal sama yang juga menghasilkan `surface` (行って ← 行く / 行う). */
function lemmaAlternatives(surface: string, item: KotobaItem, src: QuestionInsightSources): string[] {
  const P = prepare(src);
  const word = splitVariants(item.word)[0] || item.word;
  const first = word[0];
  if (!first || !isKanjiChar(first)) return [];
  const out: string[] = [];
  for (const k of (P.byFirstChar.get(first) || []).slice(0, 120)) {
    if (k.id === item.id || (k.wordType !== 'verb' && k.wordType !== 'adjective-i')) continue;
    const w = splitVariants(k.word)[0];
    if (!w || w === word || out.includes(w)) continue;
    if (formSurfaces(k).has(surface)) out.push(w);
  }
  return out.slice(0, 2);
}

// ---------------------------------------------------------------------------
// Bedah kalimat
// ---------------------------------------------------------------------------

function explanationTranslation(explanation?: string): string | undefined {
  const m = explanation?.match(/Arti(?: kalimat)?\s*[:：]\s*["“]?([^"”\n]+?)["”]?\s*(?:\n|$)/);
  return m?.[1]?.trim() || undefined;
}

function analyzeSentenceText(text: string, src: QuestionInsightSources, exclude: Set<string>): Omit<SentenceInsight, 'segments' | 'text' | 'translationSource'> {
  const a = analyzeText(text);
  const words: SentenceWord[] = [];
  const seen = new Set<string>();
  const BOUNDARY_BEFORE = /[\s　、。「」『』（）()・！？!?をにはがのでもとへや]/;
  const BOUNDARY_AFTER = /[\s　、。「」『』（）()・！？!?をにはがのでもとへやかよね]/;
  for (const s of a.sentences) {
    for (const w of s.words) {
      if (seen.has(w.item.id) || w.item.wordType === 'particle') continue;
      if (isKanaOnly(w.surface) && w.surface.length <= 2) continue;
      const prev = w.start > 0 ? s.text[w.start - 1] : '';
      const next = s.text[w.end] ?? '';
      // Kana yang dicocokkan ke kata berkanji lewat bacaannya (ことに→殊に, してい→指定) hanya diterima bila
      // berdiri sebagai kata sendiri (diapit batas kata), seperti teks N5 berspasi: 「その いけんには」.
      if (isKanaOnly(w.surface) && hasKanji(w.item.word) && !w.inflected) {
        if ((prev && !BOUNDARY_BEFORE.test(prev)) || (next && !BOUNDARY_AFTER.test(next) && !/^(です|だ)/.test(s.text.slice(w.end)))) continue;
      }
      // Kanji tunggal yang menempel pada kanji lain biasanya bagian dari nama/kata yang tidak dikenal (田中 → 田 + 中).
      if (w.surface.length === 1 && isKanjiChar(w.surface) && (isKanjiChar(prev) || isKanjiChar(next))) continue;
      // Kata di dalam pola yang lebih panjang (うに di dalam ように) adalah salah potong.
      if (s.grammar.some(g => g.matched.length >= 3 && g.start <= w.start && g.end >= w.end && g.end - g.start > w.end - w.start)) continue;
      seen.add(w.item.id);
      const info = toWordInfo(w.item, src);
      if (exclude.has(info.word)) continue;
      words.push({
        ...info,
        surface: w.surface,
        formLabel: w.inflected && w.form ? FORM_LABEL[w.form] : undefined,
        alternatives: w.inflected ? lemmaAlternatives(w.surface, w.item, src) : undefined,
      });
    }
  }
  const grammar: SentenceInsight['grammar'] = [];
  for (const s of a.sentences) {
    for (const g of s.grammar) {
      if (g.matched.length < 3 || grammar.some(x => x.id === g.item.id) || !trustedGrammarHit(g)) continue;
      // Pola yang seluruhnya berada di dalam satu kata terkonjugasi (座ったら ⊃ ったら) adalah salah potong.
      if (s.words.some(w => w.start <= g.start && g.end <= w.end)) continue;
      // Kata biasa yang kebetulan juga judul pola (とても, いつも) sudah tampil sebagai kosakata.
      if (s.words.some(w => w.start === g.start && w.end === g.end)) continue;
      grammar.push({ id: g.item.id, title: g.item.title, meaning: g.item.meaningId, matched: g.matched });
    }
  }
  const chunks = a.sentences.flatMap(s => s.chunks.map(c => ({ text: c.text, role: c.role })));
  const translation = a.sentences.length === 1 ? a.sentences[0].translation : undefined;
  return { words: words.slice(0, 12), grammar: grammar.slice(0, 4), chunks, translation };
}

// ---------------------------------------------------------------------------
// Susun kalimat ★
// ---------------------------------------------------------------------------

const toHalfDigit = (d: string) => Number(d.replace(/[１-４]/, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)));

/** "Urutan yang benar: 目の疲れ(4) 見すぎ(3) による(2) が(1)" → [3, 2, 1, 0]. */
export function parseStarOrder(explanation: string | undefined, options: string[]): number[] | null {
  const m = explanation?.match(/Urutan(?:\s+yang\s+benar)?\s*[:：]\s*([^\n]+)/i);
  if (!m) return null;
  const nums = [...m[1].matchAll(/[（(]\s*([1-4１-４])\s*[)）]/g)].map(x => toHalfDigit(x[1]) - 1);
  const valid = (xs: number[]) => xs.length === options.length && new Set(xs).size === xs.length && xs.every(x => x >= 0 && x < options.length);
  if (valid(nums)) return nums;
  const seq = m[1].match(/^\s*([1-4１-４])\s*[-→>、,–]\s*([1-4１-４])\s*[-→>、,–]\s*([1-4１-４])\s*[-→>、,–]\s*([1-4１-４])/);
  if (seq) {
    const xs = seq.slice(1, 5).map(d => toHalfDigit(d) - 1);
    if (valid(xs)) return xs;
  }
  // Urutan ditulis sebagai teks pilihan tanpa nomor.
  const line = m[1];
  const positions = options.map(o => line.indexOf(displayOption(o)));
  if (positions.every(p => p >= 0)) {
    const xs = positions.map((p, i) => [p, i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
    if (valid(xs)) return xs;
  }
  return null;
}

/** Empat kotak di prompt (___ / ＿＿ / ★, termasuk "＿★＿" yang menyatu). */
export function findStarSlots(prompt: string): { start: number; end: number; star: boolean }[] {
  return [...prompt.matchAll(/[_＿]*★[_＿]*|[_＿]{2,}/g)].map(m => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, star: m[0].includes('★') }));
}

export function buildStar(q: UnifiedQuestionItem): StarBuild | undefined {
  if (!q.explanationCurated) return undefined;
  const order = parseStarOrder(q.explanation, q.options);
  if (!order) return undefined;
  const prompt = q.prompt.replace(/@@/g, '');
  const slots = findStarSlots(prompt);
  if (slots.length !== q.options.length) return undefined;
  const starPos = slots.findIndex(s => s.star);
  // Kunci dan urutan harus sepakat; bila tidak, data soal tidak konsisten → jangan tampilkan.
  if (starPos < 0 || order[starPos] !== q.correctIndex) return undefined;
  const before = prompt.slice(0, slots[0].start).replace(/[\s　]+$/, '');
  const after = prompt.slice(slots[slots.length - 1].end).replace(/^[\s　]+/, '');
  const spaced = /[^\s　][ ][^\s　]/.test(`${before} ${after}`.replace(/[_＿★]/g, '')) && /[ぁ-ゖ一-龯]\s[ぁ-ゖ一-龯]/.test(before + after);
  return { before, after, order, starPos, separator: spaced ? ' ' : '' };
}

export function assembleStar(q: UnifiedQuestionItem, build: StarBuild): SentenceSegment[] {
  const sep = build.separator;
  const segs: SentenceSegment[] = [];
  if (build.before) segs.push({ text: build.before + sep, role: 'plain' });
  build.order.forEach((optIdx, pos) => {
    segs.push({ text: displayOption(q.options[optIdx]) + (pos < build.order.length - 1 ? sep : ''), role: pos === build.starPos ? 'answer' : 'fragment' });
  });
  if (build.after) segs.push({ text: sep + build.after, role: 'plain' });
  return segs;
}

// ---------------------------------------------------------------------------
// Penjelasan kunci
// ---------------------------------------------------------------------------

function explanationLines(text: string): { label?: string; text: string }[] {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/\n+/)
    .map(line => line.replace(/<\/?b>/g, '').trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^([A-Za-z][A-Za-z\s/()-]{2,32})[:：]\s*(.+)$/);
      return m ? { label: m[1].trim(), text: m[2].trim() } : { text: line };
    });
}

// ---------------------------------------------------------------------------
// Pembangun utama
// ---------------------------------------------------------------------------

function buildTask(q: UnifiedQuestionItem, kind: QuestionKind, parsed: ParsedPrompt): TaskInsight {
  const guide = MONDAI_GUIDE[kind];
  const ins = q.instruction || '';
  // Perintah berbahasa Jepang (bukan perintah bank berbahasa Indonesia seperti "Pilih cara baca …").
  const japanese = /[ぁ-ゖ一-龯]/.test(ins) && !/[A-Za-z]{4,}/.test(ins);
  const mondai = ins.match(/(問題|もんだい)\s*([0-9０-９]+)/)?.[2]?.replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  const terms = japanese ? INSTRUCTION_TERMS.filter(t => t.pattern.test(ins)).map(({ ja, reading, id }) => ({ ja, reading, id })) : [];
  return {
    guide,
    mondai,
    instructionJa: japanese ? ins.replace(/^(問題|もんだい)\s*[0-9０-９]+\s*/, '').trim() : undefined,
    instructionId: japanese || !ins ? guide.instructionId : ins,
    terms,
    question: parsed.question,
  };
}

function kanjiCard(char: string, src: QuestionInsightSources): QuestionInsight['kanji'] | undefined {
  const kj = prepare(src).kanjiByChar.get(char);
  if (!kj) return undefined;
  const clean = (xs: string[]) => xs.map(x => x.replace(/\s*[（(][^)）]*[)）]/g, '').trim()).filter(Boolean);
  return {
    char,
    meaning: kj.meaningId,
    onyomi: clean(kj.onyomi || []),
    kunyomi: clean(kj.kunyomi || []),
    words: (kj.relatedWords || []).slice(0, 4).map(w => ({ word: w.word, reading: w.reading, meaning: w.meaningId })),
  };
}

function readingParts(word: string, reading: string, src: QuestionInsightSources): KanjiPart[] {
  const P = prepare(src);
  const split = splitWordReading(word, reading, c => P.kanjiByChar.get(c));
  return split.parts.map(p => ({
    text: p.text,
    reading: p.reading,
    isKanji: p.isKanji,
    readingType: p.readingType,
    meaning: p.isKanji && p.text.length === 1 ? briefMeaning(P.kanjiByChar.get(p.text)?.meaningId) : undefined,
  }));
}

/** Bacaan lain dari kanji di kata ini yang membentuk pilihan pengecoh (容器 → よう + うつわ). */
function altReadingOwner(parts: KanjiPart[], option: string, src: QuestionInsightSources): OptionOwner | undefined {
  const P = prepare(src);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.isKanji || part.text.length !== 1) continue;
    const kj = P.kanjiByChar.get(part.text);
    if (!kj) continue;
    const entries = [
      ...(kj.onyomi || []).map(r => ({ r, type: 'on' as const })),
      ...(kj.kunyomi || []).map(r => ({ r, type: 'kun' as const })),
    ];
    for (const { r, type } of entries) {
      const n = normalizeEntry(r);
      if (!n || n.stem === part.reading) continue;
      const candidate = parts.map((p, j) => (j === i ? n.stem : p.reading)).join('');
      if (candidate === option) return { text: part.text, meaning: n.stem, readingType: type };
    }
  }
  return undefined;
}

function analyzeReading(q: UnifiedQuestionItem, target: string | undefined, src: QuestionInsightSources) {
  const P = prepare(src);
  const correct = cleanReadingOption(q.options[q.correctIndex]);
  const parts = target && hasKanji(target) ? readingParts(target, correct, src) : undefined;
  const lemma = target ? lookupWord(target, src) : undefined;
  const options: OptionInsight[] = q.options.map((opt, index) => {
    const text = displayOption(opt);
    const reading = cleanReadingOption(opt);
    if (index === q.correctIndex) {
      const pieces = parts?.filter(p => p.isKanji).map(p => `${p.text} = ${p.reading}${p.readingType === 'on' ? ' (on)' : p.readingType === 'kun' ? ' (kun)' : ''}`);
      return {
        index,
        text,
        isCorrect: true,
        word: lemma?.info,
        verdict: target
          ? `「${target}」 dibaca 「${correct}」${pieces?.length ? `: ${pieces.join(' · ')}` : ''}.`
          : `Bacaan yang benar adalah 「${correct}」.`,
      };
    }
    const traps = detectReadingTraps(correct, reading);
    const owner = parts ? altReadingOwner(parts, reading, src) : undefined;
    const others = (P.byReading.get(reading) || []).filter(k => k.word !== target && hasKanji(k.word)).slice(0, 2).map(k => toWordInfo(k, src));
    let verdict: string;
    if (traps.length) verdict = `${traps.map(t => t.label).join(' + ')}. ${traps[0].detail}`;
    else if (owner) {
      verdict = `「${owner.text}」 memang bisa dibaca 「${owner.meaning}」 (${owner.readingType === 'on' ? 'on’yomi' : 'kun’yomi'}), tetapi di 「${target}」 bacaannya berbeda.`;
    } else if (others.length) verdict = `「${reading}」 adalah bacaan kata lain: ${others[0].word}${others[0].meaning ? ` (${others[0].meaning})` : ''}.`;
    else verdict = target ? `Bukan bacaan 「${target}」.` : 'Bukan bacaan yang benar.';
    return {
      index,
      text,
      isCorrect: false,
      verdict,
      traps: traps.length ? traps : undefined,
      diff: isKanaOnly(reading) && isKanaOnly(correct) ? readingDiff(correct, reading) : undefined,
      owner,
      altWords: others.length ? others : undefined,
    };
  });
  return { options, parts, targetInfo: lemma?.info };
}

function analyzeWriting(q: UnifiedQuestionItem, src: QuestionInsightSources) {
  const P = prepare(src);
  const correct = cleanOption(q.options[q.correctIndex]);
  const correctLookup = lookupWord(correct, src);
  const correctEntry = P.byWord.get(correct);
  let reading = correctEntry ? splitVariants(correctEntry.reading)[0] : undefined;
  // Bacaan bentuk terkonjugasi (待って): ambil dari kalimat bila bacaan kamus tidak muncul apa adanya.
  const promptText = q.prompt.replace(/@@/g, '');
  if (!reading || !promptText.includes(reading)) {
    const okuri = correct.match(/[ぁ-ゖ]+$/)?.[0] ?? '';
    const lemmaReading = correctLookup?.info.reading;
    if (lemmaReading && okuri) {
      const stemReading = lemmaReading.slice(0, -1);
      const guess = stemReading + okuri;
      if (promptText.includes(guess)) reading = guess;
    }
  }
  const target = reading && promptText.includes(reading) ? reading : undefined;
  const parts = reading ? readingParts(correct, reading, src) : undefined;
  const options: OptionInsight[] = q.options.map((opt, index) => {
    const text = displayOption(opt);
    const o = cleanOption(opt);
    if (index === q.correctIndex) {
      const meanings = Array.from(o)
        .filter(isKanjiChar)
        .map(c => `${c} = ${briefMeaning(P.kanjiByChar.get(c)?.meaningId) ?? '?'}`);
      return {
        index,
        text,
        isCorrect: true,
        word: correctLookup?.info,
        verdict: `${target ? `「${target}」 ditulis 「${o}」` : `Penulisan yang benar adalah 「${o}」`}${correctLookup?.info.meaning ? ` (${correctLookup.info.meaning})` : ''}.${meanings.length ? ` Kanji: ${meanings.join(' · ')}.` : ''}`,
      };
    }
    const swaps: KanjiSwap[] = [];
    const a = Array.from(correct);
    const b = Array.from(o);
    if (a.length === b.length) {
      a.forEach((ch, i) => {
        if (ch === b[i] || !isKanjiChar(ch) || !isKanjiChar(b[i])) return;
        const from = P.kanjiByChar.get(ch);
        const to = P.kanjiByChar.get(b[i]);
        const ons = (k?: KanjiItem) => new Set((k?.onyomi || []).map(r => normalizeEntry(r)?.stem).filter(Boolean) as string[]);
        const fromOn = ons(from);
        const shared = [...ons(to)].find(r => fromOn.has(r));
        swaps.push({ from: ch, to: b[i], fromMeaning: briefMeaning(from?.meaningId), toMeaning: briefMeaning(to?.meaningId), sharedReading: shared });
      });
    }
    const existsInfo = lookupWord(o, src)?.info;
    const parts2: string[] = [];
    for (const s of swaps) {
      parts2.push(
        `「${s.to}」${s.toMeaning ? ` (${s.toMeaning})` : ''} menggantikan 「${s.from}」${s.fromMeaning ? ` (${s.fromMeaning})` : ''}${s.sharedReading ? `. Keduanya dibaca 「${s.sharedReading}」, jadi bunyinya sama` : ''}.`,
      );
    }
    parts2.push(existsInfo ? `「${o}」 adalah kata lain: ${existsInfo.meaning ?? existsInfo.reading ?? ''}.` : `「${o}」 bukan penulisan kata yang lazim.`);
    return {
      index,
      text,
      isCorrect: false,
      verdict: parts2.join(' '),
      kanjiSwaps: swaps.length ? swaps : undefined,
      word: existsInfo,
    };
  });
  return { options, parts, target, targetInfo: correctLookup?.info };
}

function analyzeVocab(q: UnifiedQuestionItem, kind: QuestionKind, src: QuestionInsightSources) {
  return q.options.map((opt, index): OptionInsight => {
    const text = displayOption(opt);
    const isCorrect = index === q.correctIndex;
    const hit = lookupWord(opt, src);
    const meaning = hit?.info.meaning;
    const word = cleanOption(opt);
    let verdict: string;
    if (!hit) verdict = isCorrect ? `「${word}」 adalah jawaban yang tepat. Kata ini belum ada di database Kotoba.` : `「${word}」 belum ada di database Kotoba.`;
    else if (isCorrect)
      verdict =
        kind === 'synonym'
          ? `「${word}」 = ${meaning}. Artinya paling dekat dengan kata yang ditandai.`
          : `「${word}」 = ${meaning}. Cocok dengan konteks kalimat.`;
    else verdict = `「${word}」 = ${meaning}.${hit.formLabel ? ` (${hit.formLabel})` : ''}`;
    return { index, text, isCorrect, verdict, word: hit?.info, altWords: hit?.alts.length ? hit.alts : undefined };
  });
}

function analyzeUsage(q: UnifiedQuestionItem, target: string | undefined, src: QuestionInsightSources) {
  const info = target ? lookupWord(target, src)?.info : undefined;
  const options = q.options.map((opt, index): OptionInsight => {
    const text = displayOption(opt);
    const isCorrect = index === q.correctIndex;
    let highlight: [number, number] | undefined;
    const marked = opt.indexOf('@@');
    if (marked >= 0) {
      const end = opt.indexOf('@@', marked + 2);
      if (end > marked) highlight = [marked, end - 2];
    } else if (target) {
      const at = text.indexOf(target);
      const stem = target.length >= 2 ? target.slice(0, -1) : target;
      const at2 = at >= 0 ? at : text.indexOf(stem);
      if (at2 >= 0) highlight = [at2, at2 + (at >= 0 ? target.length : stem.length)];
    }
    return {
      index,
      text,
      isCorrect,
      highlight,
      verdict: isCorrect
        ? `Pemakaian 「${target ?? ''}」 yang wajar${info?.meaning ? `: dipakai dengan arti "${info.meaning}"` : ''}.`
        : `Pemakaian 「${target ?? ''}」 di kalimat ini tidak wajar. Arti atau pasangan katanya tidak cocok.`,
    };
  });
  return { options, info };
}

const AUX_GLOSS: Record<string, string> = {
  です: 'kopula sopan ("adalah")',
  でした: 'kopula sopan lampau',
  だ: 'kopula biasa ("adalah")',
  だった: 'kopula biasa lampau',
  ます: 'akhiran sopan',
  ました: 'akhiran sopan lampau',
  ません: 'akhiran sopan negatif',
};
const AUX_KEYS = Object.keys(AUX_GLOSS).sort((a, b) => b.length - a.length);

type Span = FragmentPiece & { start: number; end: number };

/** Sisa teks yang belum terurai: partikel, akhiran (です/ます), atau kata kana di kamus. */
function glossLeftover(text: string, start: number, src: QuestionInsightSources): Span[] {
  const out: Span[] = [];
  let i = 0;
  while (i < text.length) {
    const aux = AUX_KEYS.find(k => text.startsWith(k, i));
    if (aux) {
      out.push({ start: start + i, end: start + i + aux.length, surface: aux, kind: 'particle', gloss: AUX_GLOSS[aux] });
      i += aux.length;
      continue;
    }
    // Kata berkanji terkonjugasi yang lolos dari pemindai (買わず → 買う).
    let matched = false;
    if (isKanjiChar(text[i])) {
      for (let len = Math.min(6, text.length - i); len >= 1 && !matched; len--) {
        const piece = text.slice(i, i + len);
        const d = deinflect(piece, src);
        const k = d?.item ?? prepare(src).byWord.get(piece);
        if (!k) continue;
        const info = toWordInfo(k, src);
        const head = d ? `${info.word}, ${d.keys.map(formLabelOf).join(' / ')}` : '';
        out.push({ start: start + i, end: start + i + len, surface: piece, kind: 'word', gloss: [head, info.meaning].filter(Boolean).join(' — ') });
        i += len;
        matched = true;
      }
      if (matched) continue;
    }
    // Judul pola (ため, ように) lebih dulu daripada partikel agar ように tidak terbaca よ + うに.
    for (let len = Math.min(5, text.length - i); len >= 2; len--) {
      const piece = text.slice(i, i + len);
      const titled = prepare(src).patternIndex.get(piece)?.filter(e => e.fromTitle);
      if (!titled?.length) continue;
      const item = pickPattern(titled, piece);
      out.push({ start: start + i, end: start + i + len, surface: piece, kind: 'pattern', gloss: `pola ${item.title.split(/[（(]/)[0]}: ${briefMeaning(item.meaningId) ?? ''}` });
      i += len;
      matched = true;
      break;
    }
    if (matched) continue;
    // Partikel akhir kalimat (よ, ね) hanya sah di ujung potongan.
    const particle = PARTICLE_KEYS.find(k => text.startsWith(k, i) && (!FINAL_ONLY.has(k) || i + k.length === text.length));
    if (particle) {
      out.push({ start: start + i, end: start + i + particle.length, surface: particle, kind: 'particle', gloss: PARTICLE_GLOSSARY[particle].fn });
      i += particle.length;
      continue;
    }
    // Kata kana pendek (こと, いく, すぐ) yang lolos dari pemindai.
    for (let len = Math.min(5, text.length - i); len >= 2; len--) {
      const piece = text.slice(i, i + len);
      // Bacaan 2 huruf terlalu ambigu (すぎ → 杉); hanya kata kana di kamus atau bacaan ≥3 huruf.
      const d = isKanaOnly(piece) ? deinflect(piece, src) : undefined;
      const hit = d?.item ?? prepare(src).byWord.get(piece) ?? (isKanaOnly(piece) && len >= 3 ? prepare(src).byReading.get(piece)?.[0] : undefined);
      if (hit) {
        const info = toWordInfo(hit, src);
        const head = d ? `${info.word}, ${d.keys.map(formLabelOf).join(' / ')}` : '';
        out.push({ start: start + i, end: start + i + len, surface: piece, kind: 'word', gloss: [head, info.meaning].filter(Boolean).join(' — ') });
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return out;
}

/** Urai potongan (走っていくことが) menjadi kata, pola, dan partikel yang dikenali database. */
export function describeFragment(text: string, src: QuestionInsightSources): FragmentPiece[] {
  const t = cleanOption(text);
  const sent = analyzeText(t).sentences[0];
  if (!sent) return [];
  // Perpanjang pola bila judul pola yang lebih panjang dimulai di posisi yang sama (ことか → ことから).
  const P = prepare(src);
  const insideWord = (g: { start: number; end: number }) => sent.words.some(w => w.start <= g.start && g.end <= w.end);
  const grammar = sent.grammar
    .filter(g => g.matched.length >= 2 && trustedGrammarHit(g) && !insideWord(g))
    .map(g => {
      for (let len = Math.min(8, sent.text.length - g.start); len > g.matched.length; len--) {
        const key = sent.text.slice(g.start, g.start + len);
        const titled = P.patternIndex.get(key)?.filter(e => e.fromTitle);
        if (titled?.length) return { ...g, item: pickPattern(titled, key), matched: key, end: g.start + len };
      }
      return g;
    });
  const spans: Span[] = [];
  const free = (start: number, end: number) => spans.every(x => end <= x.start || start >= x.end);
  // 1. Kata — kecuali yang sepenuhnya berada di dalam pola yang lebih panjang (うに di dalam ように).
  for (const w of sent.words) {
    if (grammar.some(g => g.start <= w.start && g.end >= w.end && g.end - g.start > w.end - w.start)) continue;
    // Kana pendek yang dicocokkan ke kata berkanji lewat bacaannya (うに → 雲丹) tidak bisa dipercaya di dalam potongan.
    if (isKanaOnly(w.surface) && !w.inflected && hasKanji(w.item.word) && w.surface.length <= 3) continue;
    // Kata kana 2 huruf yang menempel pada kana sebelumnya (よ|うに) hampir selalu salah potong; sisanya
    // diurai ulang lewat judul pola (ように) atau kamus.
    if (isKanaOnly(w.surface) && w.surface.length <= 2 && w.start > 0 && isKanaOnly(sent.text[w.start - 1])) continue;
    const info = toWordInfo(w.item, src);
    const form = w.inflected && w.form ? `, ${FORM_LABEL[w.form] ?? w.form}` : '';
    const head = w.surface !== info.word ? `${info.word}${form}` : '';
    spans.push({ start: w.start, end: w.end, surface: w.surface, kind: 'word', gloss: [head, info.meaning].filter(Boolean).join(' — ') });
  }
  // 2. Pola — bagian yang menempel pada kata di depannya dipotong (走って + [て]くる → くる).
  for (const g of grammar.slice().sort((x, y) => y.end - y.start - (x.end - x.start))) {
    let start = g.start;
    for (const x of spans) if (x.start < start && x.end > start) start = x.end;
    if (start >= g.end || !free(start, g.end)) continue;
    const title = g.item.title.split(/[（(]/)[0];
    spans.push({ start, end: g.end, surface: sent.text.slice(start, g.end), kind: 'pattern', gloss: `pola ${title}: ${briefMeaning(g.item.meaningId) ?? ''}` });
  }
  // 3. Partikel yang dikenali pemindai.
  for (const p of sent.particles) {
    if (!free(p.start, p.end)) continue;
    spans.push({ start: p.start, end: p.end, surface: p.particle, kind: 'particle', gloss: PARTICLE_GLOSSARY[p.particle]?.fn ?? p.function });
  }
  // 4. Sisa yang belum tercakup.
  spans.sort((x, y) => x.start - y.start);
  const filled: Span[] = [];
  let at = 0;
  for (const x of spans) {
    if (x.start > at) filled.push(...glossLeftover(sent.text.slice(at, x.start), at, src));
    filled.push(x);
    at = Math.max(at, x.end);
  }
  if (at < sent.text.length) filled.push(...glossLeftover(sent.text.slice(at), at, src));
  return filled.sort((x, y) => x.start - y.start).map(({ start: _s, end: _e, ...rest }) => rest);
}

function analyzeGrammarOption(opt: string, index: number, isCorrect: boolean, form: FormInfo | undefined, level: string, src: QuestionInsightSources): OptionInsight {
  const P = prepare(src);
  const text = displayOption(opt);
  const o = cleanOption(opt);
  // Urutan keyakinan: partikel dasar → judul pola → bentuk konjugasi → kata di kamus → potongan rumus → urai.
  const particles = o.length <= 3 ? decomposeParticles(opt) : null;
  const match = particles ? undefined : matchPatternDetailed(opt, src, level);
  const titlePattern = match?.fromTitle && match.info.quality === 'exact' ? match.info : undefined;
  const dictWord = !particles && !titlePattern && !form ? (P.byWord.get(o) || (isKanaOnly(o) ? P.byReading.get(toHiragana(o))?.[0] : undefined)) : undefined;
  const word = dictWord ? { info: toWordInfo(dictWord, src), formLabel: undefined as string | undefined } : !particles && !titlePattern && !form ? lookupWord(opt, src) : undefined;
  const pattern = titlePattern ?? (!form && !word ? match?.info : undefined);
  const pieces = !particles && !pattern && !form && !word ? describeFragment(opt, src) : [];
  let verdict: string;
  if (particles) verdict = particles.map(p => `「${p.ja}」: ${p.fn}`).join(' ');
  else if (titlePattern) verdict = `「${o}」: ${titlePattern.meaning}.`;
  else if (form) verdict = `「${o}」 = ${form.lemma} → ${form.label}${form.meaning ? ` (${form.meaning})` : ''}.`;
  else if (word)
    verdict = word.formLabel
      ? `「${o}」 = ${word.info.word} → ${word.formLabel}. ${word.info.word}: ${word.info.meaning ?? ''}.`
      : `「${o}」 = ${word.info.meaning ?? word.info.reading ?? ''}.`;
  else if (pattern?.quality === 'exact') verdict = `「${o}」: ${pattern.meaning}.`;
  else if (pattern) verdict = `「${o}」 memuat pola 「${cleanPatternKey(pattern.title.split(/[（(]/)[0])}」: ${pattern.meaning}.`;
  else if (pieces.length) verdict = `「${o}」 tersusun dari ${pieces.map(x => `「${x.surface}」`).join(' + ')}.`;
  else verdict = `「${o}」 belum ada di database pola/kotoba.`;
  if (isCorrect) verdict += ' Inilah yang cocok dengan kalimat.';
  return {
    index,
    text,
    isCorrect,
    verdict,
    form,
    pattern,
    particles: particles ?? undefined,
    word: word?.info,
    altWords: word && 'alts' in word && word.alts.length ? word.alts : undefined,
    pieces: pieces.length ? pieces : undefined,
  };
}

function analyzeOnKun(q: UnifiedQuestionItem, char: string | undefined, src: QuestionInsightSources) {
  const P = prepare(src);
  const asked: 'on' | 'kun' = /Kunyomi/i.test(q.prompt) ? 'kun' : 'on';
  const kj = char ? P.kanjiByChar.get(char) : undefined;
  const readingsOf = (type: 'on' | 'kun') =>
    new Set(((type === 'on' ? kj?.onyomi : kj?.kunyomi) || []).flatMap(r => {
      const n = normalizeEntry(r);
      return n ? [n.stem, n.stem + (n.okurigana ?? '')] : [];
    }));
  const own = readingsOf(asked);
  const other = readingsOf(asked === 'on' ? 'kun' : 'on');
  const name = (t: 'on' | 'kun') => (t === 'on' ? 'on’yomi' : 'kun’yomi');
  return q.options.map((opt, index): OptionInsight => {
    const text = displayOption(opt);
    const r = cleanReadingOption(opt);
    const isCorrect = index === q.correctIndex;
    if (isCorrect) return { index, text, isCorrect, verdict: `「${r}」 adalah ${name(asked)} dari 「${char}」.` };
    if (other.has(r)) return { index, text, isCorrect, verdict: `Jebakan jenis bacaan: 「${r}」 adalah ${name(asked === 'on' ? 'kun' : 'on')} 「${char}」, bukan ${name(asked)}.`, owner: { text: char!, readingType: asked === 'on' ? 'kun' : 'on' } };
    if (own.has(r)) return { index, text, isCorrect, verdict: `「${r}」 juga ${name(asked)} dari 「${char}」, tetapi kunci soal memilih bacaan lain.` };
    const owners = (P.kanjiByReading.get(r) || []).filter(x => x.kanji.character !== char);
    const first = owners[0];
    return {
      index,
      text,
      isCorrect,
      verdict: first
        ? `「${r}」 adalah ${name(first.type)} kanji lain: 「${first.kanji.character}」 (${briefMeaning(first.kanji.meaningId)}).`
        : `「${r}」 bukan bacaan 「${char}」.`,
      owner: first ? { text: first.kanji.character, meaning: briefMeaning(first.kanji.meaningId), readingType: first.type } : undefined,
    };
  });
}

function analyzeKanjiMeaning(q: UnifiedQuestionItem, char: string | undefined, src: QuestionInsightSources) {
  const P = prepare(src);
  return q.options.map((opt, index): OptionInsight => {
    const text = displayOption(opt);
    const isCorrect = index === q.correctIndex;
    if (isCorrect) return { index, text, isCorrect, verdict: `Arti utama 「${char}」 adalah "${text}".` };
    const owner = (P.kanjiByMeaning.get(normMeaning(opt)) || []).find(k => k.character !== char);
    return {
      index,
      text,
      isCorrect,
      verdict: owner ? `"${text}" adalah arti kanji 「${owner.character}」.` : `Bukan arti 「${char}」.`,
      owner: owner ? { text: owner.character, meaning: briefMeaning(owner.meaningId) } : undefined,
    };
  });
}

function analyzePatternMeaning(q: UnifiedQuestionItem, src: QuestionInsightSources) {
  const P = prepare(src);
  const self = q.materialId ? src.bunpou[q.materialId] : undefined;
  return q.options.map((opt, index): OptionInsight => {
    const text = displayOption(opt);
    const isCorrect = index === q.correctIndex;
    if (isCorrect) return { index, text, isCorrect, verdict: `Inilah arti dan fungsi pola ${self ? `「${self.title}」` : 'ini'}.`, pattern: self ? toPatternInfo(self, 'exact') : undefined };
    const owner = (P.patternByMeaning.get(normMeaning(opt)) || []).find(b => b.id !== self?.id);
    return {
      index,
      text,
      isCorrect,
      verdict: owner ? `Ini arti pola lain: 「${owner.title}」.` : 'Bukan arti pola ini.',
      owner: owner ? { text: owner.title, patternId: owner.id, meaning: owner.meaningId } : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Soal serupa
// ---------------------------------------------------------------------------

interface PoolIndex {
  byKey: Map<string, number[]>;
}
const poolCache = new WeakMap<readonly UnifiedQuestionItem[], PoolIndex>();

const KANJI_CHAR_RE = /「(.)」/;

function poolKeys(q: UnifiedQuestionItem): string[] {
  const keys: string[] = [];
  if (q.targetWord) {
    keys.push(`t:${q.targetWord}`);
    for (const c of Array.from(q.targetWord)) if (isKanjiChar(c)) keys.push(`k:${c}`);
  }
  if (q.materialId) keys.push(`m:${q.materialId}`);
  if (q.subCategory === 'moji_basic') {
    const c = q.prompt.match(KANJI_CHAR_RE)?.[1];
    if (c && isKanjiChar(c)) keys.push(`k:${c}`);
  }
  const correct = q.options[q.correctIndex];
  if (correct) {
    const c = cleanOption(correct);
    if (q.section === 'bunpou') keys.push(`c:${c}`);
    if (q.subCategory === 'kanji_writing' || q.subCategory === 'vocab_context' || q.subCategory === 'synonym') {
      keys.push(`w:${c}`);
      for (const ch of Array.from(c)) if (isKanjiChar(ch)) keys.push(`k:${ch}`);
    }
  }
  return keys;
}

function poolIndex(pool: readonly UnifiedQuestionItem[]): PoolIndex {
  const cached = poolCache.get(pool);
  if (cached) return cached;
  const byKey = new Map<string, number[]>();
  pool.forEach((q, i) => {
    for (const k of new Set(poolKeys(q))) pushMap(byKey, k, i);
  });
  const out = { byKey };
  poolCache.set(pool, out);
  return out;
}

function findSimilar(q: UnifiedQuestionItem, wanted: { key: string; reason: string }[], pool: readonly UnifiedQuestionItem[]): SimilarQuestion[] {
  if (!pool.length) return [];
  const idx = poolIndex(pool);
  const out: SimilarQuestion[] = [];
  const used = new Set<string>([q.id]);
  const usedPrompts = new Set<string>([q.prompt]);
  const levelGap = (x: UnifiedQuestionItem) => Math.abs(jlptRank(x.level) - jlptRank(q.level));
  for (const { key, reason } of wanted) {
    const hits = (idx.byKey.get(key) || [])
      .map(i => pool[i])
      .filter(x => !used.has(x.id) && !usedPrompts.has(x.prompt) && questionInsightKind(x) !== null && x.options.length >= 2)
      .sort((a, b) => levelGap(a) - levelGap(b) || hashString(q.id + a.id) - hashString(q.id + b.id));
    let fromKey = 0;
    for (const x of hits) {
      if (out.length >= 3 || fromKey >= 2) break;
      used.add(x.id);
      usedPrompts.add(x.prompt);
      out.push({ item: x, reason });
      fromKey++;
    }
    if (out.length >= 3) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pembangun
// ---------------------------------------------------------------------------

export function buildQuestionInsight(
  q: UnifiedQuestionItem,
  src: QuestionInsightSources,
  pool: readonly UnifiedQuestionItem[] = [],
): QuestionInsight | null {
  const kind = questionInsightKind(q);
  if (!kind) return null;
  const parsed = parsePrompt(q.prompt, q.targetWord);
  const task = buildTask(q, kind, parsed);
  const correctText = cleanOption(q.options[q.correctIndex]);

  let options: OptionInsight[] = [];
  let target = parsed.target;
  let targetInfo: WordInfo | undefined;
  let parts: KanjiPart[] | undefined;
  let kanji: QuestionInsight['kanji'];
  let build: StarBuild | undefined;
  let optionsHeadline = '';

  switch (kind) {
    case 'reading': {
      const r = analyzeReading(q, target, src);
      options = r.options;
      parts = r.parts;
      targetInfo = r.targetInfo;
      optionsHeadline = 'Bandingkan tiap pilihan dengan bacaan yang benar. Huruf yang berbeda ditandai.';
      break;
    }
    case 'writing': {
      const r = analyzeWriting(q, src);
      options = r.options;
      parts = r.parts;
      target = r.target ?? target;
      targetInfo = r.targetInfo;
      optionsHeadline = 'Pengecoh memakai kanji yang bunyinya sama atau bentuknya mirip. Perhatikan arti tiap kanji.';
      break;
    }
    case 'context':
    case 'synonym':
      options = analyzeVocab(q, kind, src);
      optionsHeadline =
        kind === 'synonym'
          ? 'Bandingkan arti tiap pilihan dengan kata yang ditandai pada kalimat.'
          : 'Semua pilihan biasanya benar secara tata bahasa. Bandingkan artinya dengan konteks kalimat.';
      break;
    case 'wordMeaning': {
      targetInfo = target ? lookupWord(target, src)?.info : undefined;
      if (target && hasKanji(target) && targetInfo?.reading) parts = readingParts(target, targetInfo.reading, src);
      options = q.options.map((opt, index) => ({
        index,
        text: displayOption(opt),
        isCorrect: index === q.correctIndex,
        verdict: index === q.correctIndex ? `Arti 「${target ?? ''}」 dalam kalimat ini.` : `Bukan arti 「${target ?? ''}」 dalam kalimat ini.`,
      }));
      optionsHeadline = 'Pilihan berupa arti. Pecah kata menjadi kanji penyusunnya untuk menebak maknanya.';
      break;
    }
    case 'usage': {
      target = target ?? (q.prompt.split(/[:：]/).pop() || '').replace(/[「」\s]/g, '');
      const r = analyzeUsage(q, target, src);
      options = r.options;
      targetInfo = r.info;
      optionsHeadline = `Fokus pada pemakaian 「${target}」 di tiap kalimat.`;
      break;
    }
    case 'grammar':
    case 'star': {
      const forms = detectFormFamily(q.options, src);
      options = q.options.map((opt, index) => analyzeGrammarOption(opt, index, index === q.correctIndex, forms[index], q.level, src));
      if (kind === 'star') {
        build = buildStar(q);
        optionsHeadline = 'Kenali fungsi tiap potongan. Potongan yang pasti tersambung membantu menyusun urutan.';
      } else {
        optionsHeadline = forms.some(Boolean)
          ? `Semua pilihan adalah bentuk dari ${forms.find(Boolean)!.lemma}. Tentukan bentuk yang dibutuhkan kalimat.`
          : 'Kenali arti tiap pola atau partikel, lalu cocokkan dengan hubungan makna kalimat.';
      }
      break;
    }
    case 'onkun': {
      const ch = q.prompt.match(KANJI_CHAR_RE)?.[1];
      target = ch;
      kanji = ch ? kanjiCard(ch, src) : undefined;
      options = analyzeOnKun(q, ch, src);
      optionsHeadline = 'Pengecoh adalah bacaan kanji lain, atau jenis bacaan lain dari kanji yang sama.';
      break;
    }
    case 'kanjiMeaning': {
      const ch = q.prompt.match(KANJI_CHAR_RE)?.[1];
      target = ch;
      kanji = ch ? kanjiCard(ch, src) : undefined;
      options = analyzeKanjiMeaning(q, ch, src);
      optionsHeadline = 'Pengecoh adalah arti kanji lain.';
      break;
    }
    case 'patternMeaning': {
      const self = q.materialId ? src.bunpou[q.materialId] : undefined;
      target = self?.title ?? q.prompt.match(/「([^」]+)」/)?.[1];
      options = analyzePatternMeaning(q, src);
      optionsHeadline = 'Pengecoh adalah arti pola lain yang sering tertukar.';
      break;
    }
  }

  // --- Bedah kalimat ---
  let sentence: SentenceInsight | undefined;
  const wantsSentence = kind === 'reading' || kind === 'writing' || kind === 'context' || kind === 'synonym' || kind === 'grammar' || kind === 'star' || kind === 'wordMeaning';
  if (wantsSentence) {
    let segments: SentenceSegment[] | undefined;
    if (kind === 'star') {
      if (build) segments = assembleStar(q, build);
    } else if (parsed.blank && !parsed.blank.trailing && (kind === 'context' || kind === 'grammar' || kind === 'reading')) {
      const s = parsed.sentence;
      segments = [
        { text: s.slice(0, parsed.blank.start), role: 'plain' },
        { text: displayOption(q.options[q.correctIndex]).replace(/\s*[（(][A-Za-z\s'’.-]+[)）]/g, ''), role: 'answer' },
        { text: s.slice(parsed.blank.end), role: 'plain' },
      ];
    } else if (parsed.blank?.trailing) {
      segments = [{ text: parsed.sentence.slice(0, parsed.blank.start).trim(), role: 'plain' }];
    } else {
      const s = parsed.sentence;
      const mark = target;
      const at = mark ? s.indexOf(mark) : -1;
      if (at >= 0 && mark) {
        segments = [
          { text: s.slice(0, at), role: 'plain' },
          { text: kind === 'writing' ? correctText : mark, role: kind === 'writing' ? 'answer' : 'target' },
          { text: s.slice(at + mark.length), role: 'plain' },
        ];
      } else segments = [{ text: s, role: 'plain' }];
    }
    if (segments) {
      segments = segments.filter(x => x.text);
      const text = segments.map(x => x.text).join('');
      if (/[ぁ-ゖァ-ヺ一-龯]/.test(text) && text.replace(/\s/g, '').length >= 4) {
        const exclude = new Set<string>();
        const analysis = analyzeSentenceText(text, src, exclude);
        const fromExplanation = q.explanationCurated ? explanationTranslation(q.explanation) : undefined;
        sentence = {
          text,
          segments,
          ...analysis,
          translation: fromExplanation ?? analysis.translation,
          translationSource: fromExplanation ? 'explanation' : analysis.translation ? 'database' : undefined,
        };
      }
    }
  }

  // --- Kunci & alasan ---
  const correctOpt = options[q.correctIndex];
  const summary: string[] = [];
  if (correctOpt?.verdict) summary.push(correctOpt.verdict.replace(/ Inilah yang cocok dengan kalimat\.$/, ''));
  if (kind === 'star' && build) {
    summary.push(`Urutan: ${build.order.map(i => cleanOption(q.options[i])).join(' → ')}. Posisi ★ ada di kotak ke-${build.starPos + 1}.`);
  }
  const pattern = correctOpt?.pattern;
  if (pattern?.formula && (kind === 'grammar' || kind === 'star' || kind === 'patternMeaning')) summary.push(`Rumus: ${pattern.formula}`);
  if (kanji) {
    if (kanji.onyomi.length) summary.push(`On’yomi 「${kanji.char}」: ${kanji.onyomi.join('、')}`);
    if (kanji.kunyomi.length) summary.push(`Kun’yomi 「${kanji.char}」: ${kanji.kunyomi.join('、')}`);
  }

  const answerWords: WordInfo[] = [];
  const addWord = (w?: WordInfo) => {
    if (w?.insight && !answerWords.some(x => x.kotobaId === w.kotobaId)) answerWords.push(w);
  };
  addWord(targetInfo);
  addWord(correctOpt?.word);
  if (correctOpt?.form?.kotobaId) addWord(lookupWord(correctOpt.form.lemma, src)?.info);
  const answerPatterns: PatternInfo[] = [];
  for (const o of [correctOpt, ...options.filter(x => !x.isCorrect)]) {
    if (o?.pattern && !answerPatterns.some(p => p.id === o.pattern!.id)) answerPatterns.push(o.pattern);
  }
  if (kind === 'patternMeaning' && q.materialId && src.bunpou[q.materialId] && !answerPatterns.length) answerPatterns.push(toPatternInfo(src.bunpou[q.materialId], 'exact'));
  const kanjiChars = Array.from(new Set(Array.from(`${kind === 'writing' ? correctText : ''}${target && hasKanji(target) ? target : ''}`).filter(c => isKanjiChar(c) && c !== '々'))).slice(0, 6);

  const answer: AnswerInsight = {
    text: displayOption(q.options[q.correctIndex]),
    curated: Boolean(q.explanationCurated && q.explanation),
    lines: q.explanationCurated && q.explanation ? explanationLines(q.explanation) : [],
    summary,
    words: answerWords.slice(0, 4),
    patterns: answerPatterns.slice(0, 4),
    kanji: kanjiChars,
  };

  // --- Soal serupa ---
  const wanted: { key: string; reason: string }[] = [];
  if (kind === 'grammar' || kind === 'star') {
    if (q.materialId && q.materialId !== pattern?.id && src.bunpou[q.materialId]) {
      wanted.push({ key: `m:${q.materialId}`, reason: `Materi yang sama: ${cleanPatternKey(src.bunpou[q.materialId].title.split(/[（(]/)[0])}` });
    }
    if (pattern) wanted.push({ key: `m:${pattern.id}`, reason: `Pola yang sama: ${cleanPatternKey(pattern.title.split(/[（(]/)[0])}` });
    wanted.push({ key: `c:${correctText}`, reason: `Jawaban yang sama: ${correctText}` });
  } else if (kind === 'patternMeaning' && q.materialId) {
    wanted.push({ key: `m:${q.materialId}`, reason: `Pola yang sama: ${target ?? ''}` });
  } else if (kind === 'onkun' || kind === 'kanjiMeaning') {
    if (target) wanted.push({ key: `k:${target}`, reason: `Kanji yang sama: ${target}` });
  } else {
    if (target) wanted.push({ key: `t:${target}`, reason: `Kata yang sama: ${target}` });
    if (kind !== 'usage') wanted.push({ key: `w:${correctText}`, reason: `Kata yang sama: ${correctText}` });
    const chars = Array.from(new Set(Array.from(`${target ?? ''}${kind === 'writing' ? correctText : ''}`).filter(c => isKanjiChar(c) && c !== '々')));
    for (const c of chars) wanted.push({ key: `k:${c}`, reason: `Kanji yang sama: ${c}` });
  }
  const similar = findSimilar(q, wanted, pool);

  const steps: QuestionStepKind[] = ['task'];
  if (sentence) steps.push('sentence');
  if (build) steps.push('build');
  steps.push('options', 'answer');
  if (similar.length) steps.push('similar');

  const narration: Partial<Record<QuestionStepKind, string>> = {
    task: `Sebelum memilih jawaban, pahami dulu apa yang diminta. ${task.guide.asks}`,
    sentence:
      kind === 'reading' || kind === 'wordMeaning'
        ? 'Kata yang diuji ditandai. Konteks kalimat membantu memastikan bacaan dan artinya.'
        : kind === 'star'
          ? 'Inilah kalimat utuh setelah potongan disusun. Potongan di posisi ★ ditandai warna emas.'
          : 'Inilah kalimat utuh dengan jawaban yang benar terpasang. Pahami arti tiap bagiannya.',
    build: 'Potongan masuk ke kotak satu per satu. Perhatikan sambungan antarpotongan dan posisi ★.',
    options: optionsHeadline,
    answer: answer.curated
      ? 'Pembahasan ini ditulis untuk soal ini, dilengkapi ringkasan dari database.'
      : 'Soal ini belum punya pembahasan tertulis. Ringkasan di atas disusun dari database SevnQuest.',
    similar: 'Uji pemahamanmu dengan soal lain yang menguji hal yang sama.',
  };

  return {
    question: q,
    kind,
    target,
    targetInfo,
    parts,
    kanji,
    task,
    sentence,
    build,
    options,
    optionsHeadline,
    answer,
    similar,
    steps,
    narration,
  };
}
