// ==============================================================================
// WRITING COMPANION
// Pendamping menyalin paragraf Jepang dengan tangan (di buku/kertas). SevnQuest tidak meminta pengguna
// mengetik: paragraf dipecah menjadi token yang bisa dipilih (kata, kanji, atau frasa), lalu bagian yang
// dipilih dijelaskan (bacaan, romaji, arti, perubahan bentuk, partikel, pola, makna sesuai konteks).
//
// Pemecahan memakai analyzeText (pemindai longest-match atas database) sehingga hasilnya heuristik:
// potongan di luar database tetap bisa dipilih dan ditandai "belum dikenal".
// ==============================================================================

import * as wanakana from 'wanakana';
import { analyzeText, FORM_LABEL, PARTICLE_FN, type GrammarHit, type ParticleHit, type WordHit } from '../textStudy/textAnalyzer';
import { isLikelyFalseHit, sentenceGloss } from '../dokkaiStudy/study';
import { normSentence, splitParagraphs } from '../dokkaiStudy/text';
import { conjugateAdjective, conjugateVerb } from '../morphology/inflectionEngine';
import { splitWordReading, toHiragana, isKanjiChar } from '../kotobaInsight/readingSplit';
import { KANJI_DATABASE } from '../../data/kanji';
import { getFuriganaSegments } from '../../utils/furiganaUtils';
import { getWordTypeLabel, getWordTypeLabelJp } from '../../utils/wordType';
import type { BunpouItem, KanjiItem, KotobaItem } from '../../types/content';

export type TokenKind = 'word' | 'particle' | 'kana' | 'unknown' | 'punct' | 'other';
export type SelectMode = 'word' | 'kanji' | 'phrase';

export interface CompanionToken {
  /** Unik per dokumen: `${sentenceIndex}:${start}`. */
  id: string;
  si: number;
  start: number;
  end: number;
  text: string;
  kind: TokenKind;
  word?: WordHit;
  particle?: ParticleHit;
}

export interface CompanionChunk {
  start: number;
  end: number;
  text: string;
  particle?: string;
  role: string;
}

export interface CompanionSentence {
  index: number;
  paragraph: number;
  text: string;
  tokens: CompanionToken[];
  grammar: GrammarHit[];
  chunks: CompanionChunk[];
  translation?: string;
  gloss: string;
}

export interface CompanionDoc {
  paragraphs: number[][]; // indeks kalimat per paragraf
  sentences: CompanionSentence[];
}

export interface Selection {
  si: number;
  start: number;
  end: number;
  mode: SelectMode;
}

const PUNCT_RE = /[\s　、。，．,.!！?？「」『』（）()［］[\]【】・：:；;…\-―～〜"'“”]/;
const KANA_RE = /[぀-ゟ゠-ヿー]/;

const CHUNK_ROLE: Record<string, string> = {
  は: 'topik', が: 'subjek', を: 'objek', に: 'waktu / tujuan / sasaran', で: 'tempat / alat / cara',
  へ: 'arah', と: 'bersama / kutipan', も: 'juga', から: 'titik awal / alasan', まで: 'batas',
  より: 'pembanding', や: 'daftar',
};
const CHUNK_SPLIT = new Set(Object.keys(CHUNK_ROLE));

function charClass(ch: string): 'kanji' | 'kana' | 'punct' | 'other' {
  if (PUNCT_RE.test(ch)) return 'punct';
  if (isKanjiChar(ch)) return 'kanji';
  if (KANA_RE.test(ch)) return 'kana';
  return 'other';
}

const LEAD_PARTICLES = ['から', 'まで', 'より', 'が', 'は', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'や'];
const particleToken = (si: number, text: string, start: number, p: string): CompanionToken => ({
  id: `${si}:${start}`, si, start, end: start + p.length, text: p, kind: 'particle',
  particle: { particle: p, start, end: start + p.length, function: PARTICLE_FN[p] },
});

/**
 * Deretan kana yang tidak dikenali sebagai kata (sering karena tertelan pola, mis. がありました):
 * pisahkan partikel yang hampir pasti — を di mana pun, partikel di awal deretan setelah kata/kanji,
 * dan の/へ di akhir deretan panjang sebelum kanji (先生たちの部屋 → たち + の).
 */
function kanaRunTokens(si: number, text: string, from: number, to: number, out: CompanionToken[]) {
  let i = from;
  let pieceStart = from;
  const flush = (upto: number) => {
    if (upto > pieceStart) out.push({ id: `${si}:${pieceStart}`, si, start: pieceStart, end: upto, text: text.slice(pieceStart, upto), kind: 'kana' });
  };
  // Partikel di awal deretan, tepat setelah kata / kanji / katakana.
  const prev = from > 0 ? text[from - 1] : '';
  const prevTok = out[out.length - 1];
  const afterContent = !!prev && (prevTok?.kind === 'word' || prevTok?.kind === 'unknown' || prevTok?.kind === 'other' || isKanjiChar(prev) || /[゠-ヿ]/.test(prev));
  if (afterContent) {
    const lead = LEAD_PARTICLES.find(p => text.startsWith(p, from) && from + p.length <= to);
    if (lead) { out.push(particleToken(si, text, from, lead)); i = from + lead.length; pieceStart = i; }
  }
  for (; i < to; i++) {
    if (text[i] === 'を') { flush(i); out.push(particleToken(si, text, i, 'を')); pieceStart = i + 1; }
  }
  const last = to - 1;
  const next = text[to] ?? '';
  if (to - pieceStart >= 3 && (text[last] === 'の' || text[last] === 'へ') && isKanjiChar(next)) {
    flush(last);
    out.push(particleToken(si, text, last, text[last]));
    return;
  }
  flush(to);
}

/** Isi celah antara kata/partikel yang dikenali: deretan kanji, deretan kana, tanda baca per huruf. */
function gapTokens(si: number, text: string, from: number, to: number, out: CompanionToken[]) {
  let i = from;
  while (i < to) {
    const cls = charClass(text[i]);
    let j = i + 1;
    if (cls !== 'punct') while (j < to && charClass(text[j]) === cls) j++;
    if (cls === 'kana') kanaRunTokens(si, text, i, j, out);
    else out.push({ id: `${si}:${i}`, si, start: i, end: j, text: text.slice(i, j), kind: cls === 'kanji' ? 'unknown' : cls });
    i = j;
  }
}

function buildTokens(si: number, text: string, words: WordHit[], particles: ParticleHit[]): CompanionToken[] {
  const marks: { start: number; end: number; word?: WordHit; particle?: ParticleHit }[] = [
    ...words.map(w => ({ start: w.start, end: w.end, word: w })),
    ...particles.map(p => ({ start: p.start, end: p.end, particle: p })),
  ].sort((a, b) => a.start - b.start);
  const out: CompanionToken[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start < cursor) continue;
    if (m.start > cursor) gapTokens(si, text, cursor, m.start, out);
    out.push({
      id: `${si}:${m.start}`, si, start: m.start, end: m.end, text: text.slice(m.start, m.end),
      kind: m.word ? 'word' : 'particle', word: m.word, particle: m.particle,
    });
    cursor = m.end;
  }
  if (cursor < text.length) gapTokens(si, text, cursor, text.length, out);
  return out;
}

/** Unit "kata + partikel" lengkap dengan posisinya, untuk mode Frasa dan peran dalam kalimat. */
function buildChunks(text: string, particles: ParticleHit[]): CompanionChunk[] {
  const splitters = particles.filter(p => CHUNK_SPLIT.has(p.particle));
  const bounds = new Set<number>([text.length]);
  for (const p of splitters) bounds.add(p.end);
  for (let i = 0; i < text.length; i++) if (text[i] === '、' || text[i] === '，') bounds.add(i + 1);
  const chunks: CompanionChunk[] = [];
  let from = 0;
  for (const to of [...bounds].sort((a, b) => a - b)) {
    // Buang tanda baca di tepi agar sorotan rapi.
    let s = from;
    let e = to;
    while (s < e && PUNCT_RE.test(text[s])) s++;
    while (e > s && PUNCT_RE.test(text[e - 1])) e--;
    if (e > s) {
      const particle = splitters.find(p => p.end === to)?.particle;
      chunks.push({
        start: s, end: e, text: text.slice(s, e), particle,
        role: particle ? CHUNK_ROLE[particle] : to === text.length ? 'predikat (inti kalimat)' : 'keterangan',
      });
    }
    from = to;
  }
  return chunks;
}

/**
 * Bangun dokumen belajar dari teks bebas. `translations` (opsional) = peta normSentence → terjemahan
 * (mis. dari DokkaiPassage.sentenceTranslations).
 */
export function buildCompanionDoc(raw: string, translations?: Record<string, string>): CompanionDoc {
  const paragraphs = splitParagraphs(raw);
  const doc: CompanionDoc = { paragraphs: [], sentences: [] };
  paragraphs.forEach((par, pi) => {
    const analysis = analyzeText(par);
    const ids: number[] = [];
    for (const s of analysis.sentences) {
      const si = doc.sentences.length;
      const words = s.words.filter(w => !isLikelyFalseHit(w));
      const grammar = s.grammar.map(g => ({ ...g, start: g.end - g.phrase.length }));
      const tokens = buildTokens(si, s.text, words, s.particles);
      doc.sentences.push({
        index: si,
        paragraph: pi,
        text: s.text,
        tokens,
        grammar,
        chunks: buildChunks(s.text, tokens.flatMap(t => (t.particle ? [t.particle] : []))),
        translation: translations?.[normSentence(s.text)] || s.translation,
        gloss: sentenceGloss({ words }),
      });
      ids.push(si);
    }
    if (ids.length) doc.paragraphs.push(ids);
  });
  return doc;
}

// ------------------------------------------------------------------------------
// SELEKSI
// ------------------------------------------------------------------------------

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

/** Ubah ketukan pada huruf ke-`at` kalimat `si` menjadi seleksi sesuai mode. Tanda baca tidak bisa dipilih. */
export function resolveSelection(doc: CompanionDoc, si: number, at: number, mode: SelectMode): Selection | null {
  const s = doc.sentences[si];
  if (!s || at < 0 || at >= s.text.length || PUNCT_RE.test(s.text[at])) return null;
  if (mode === 'kanji') return { si, start: at, end: at + 1, mode };
  if (mode === 'phrase') {
    const g = s.grammar.find(x => at >= x.start && at < x.end);
    if (g) return { si, start: g.start, end: g.end, mode };
    const c = s.chunks.find(x => at >= x.start && at < x.end);
    if (c) return { si, start: c.start, end: c.end, mode };
  }
  const t = s.tokens.find(x => at >= x.start && at < x.end);
  return t ? { si, start: t.start, end: t.end, mode } : null;
}

export const isSelectedChar = (sel: Selection | null, si: number, i: number) =>
  !!sel && sel.si === si && i >= sel.start && i < sel.end;

// ------------------------------------------------------------------------------
// PENJELASAN
// ------------------------------------------------------------------------------

export interface WordExplanation {
  surface: string;
  item: KotobaItem;
  /** Bacaan bentuk yang muncul di teks (hiragana). */
  reading: string;
  romaji: string;
  dictionaryForm: string;
  dictionaryReading: string;
  wordType: string;
  wordTypeJp: string;
  meaning: string;
  definition?: string;
  /** Penjelasan perubahan bentuk bila surface ≠ bentuk kamus. */
  inflection?: { form: string; label: string; note: string };
}

export interface KanjiExplanation {
  char: string;
  item?: KanjiItem;
  /** Bacaan huruf ini di dalam kata pada teks, bila bisa dipasangkan. */
  readingInContext?: string;
  inWord?: string;
}

export interface ParticleExplanation {
  particle: string;
  function: string;
  role?: string;
  /** Bagian kalimat yang ditandai partikel ini. */
  marks?: string;
}

export interface GrammarExplanation {
  item: BunpouItem;
  matched: string;
  phrase: string;
}

export interface SelectionExplanation {
  text: string;
  reading: string;
  romaji: string;
  mode: SelectMode;
  words: WordExplanation[];
  kanji: KanjiExplanation[];
  particles: ParticleExplanation[];
  grammar: GrammarExplanation[];
  /** Potongan yang tidak ada di database. */
  unknown: string[];
  context: {
    sentence: string;
    translation?: string;
    gloss: string;
    /** Peran bagian terpilih dalam kalimat (topik/objek/predikat ...). */
    role?: string;
    chunk?: string;
  };
}

let kanjiByChar: Map<string, KanjiItem> | null = null;
export function lookupKanji(ch: string): KanjiItem | undefined {
  if (!kanjiByChar) {
    kanjiByChar = new Map();
    for (const k of Object.values(KANJI_DATABASE)) if (k?.character && !kanjiByChar.has(k.character)) kanjiByChar.set(k.character, k);
  }
  return kanjiByChar.get(ch);
}

const romajiOf = (kana: string) => (kana ? wanakana.toRomaji(toHiragana(kana)) : '');
const firstVariant = (s: string) => (s || '').split(/\s*[/／;；]\s*/)[0].trim();

/** Bacaan bentuk terkonjugasi (食べました → たべました); bila gagal, pakai bacaan kamus. */
function surfaceReading(w: WordHit): string {
  const dictReading = firstVariant(w.item.reading) || w.item.word;
  if (!w.inflected || !w.form) return w.surface === w.item.word ? dictReading : (KANA_RE.test(w.surface) && !/[一-龯]/.test(w.surface) ? w.surface : dictReading);
  try {
    const word = firstVariant(w.item.word);
    if (w.item.wordType === 'verb') {
      const f = (conjugateVerb(word, dictReading).forms as Record<string, { japanese: string; reading: string }>)[w.form];
      if (f?.japanese === w.surface) return f.reading;
    } else if (w.item.wordType === 'adjective-i' || w.item.wordType === 'adjective-na') {
      const f = (conjugateAdjective(word, dictReading, w.item.wordType === 'adjective-i' ? 'i' : 'na').forms as Record<string, { japanese: string; reading: string }>)[w.form];
      if (f?.japanese === w.surface) return f.reading;
    }
  } catch {
    // jatuh ke bacaan kamus
  }
  return dictReading;
}

function inflectionNote(w: WordHit): WordExplanation['inflection'] {
  if (!w.inflected || !w.form) return undefined;
  const label = FORM_LABEL[w.form] ?? w.form;
  const dict = firstVariant(w.item.word);
  return {
    form: w.form,
    label,
    note: `${dict} (bentuk kamus) berubah menjadi ${w.surface} — ${label}.`,
  };
}

function explainWord(w: WordHit): WordExplanation {
  const reading = surfaceReading(w);
  return {
    surface: w.surface,
    item: w.item,
    reading,
    romaji: romajiOf(reading),
    dictionaryForm: firstVariant(w.item.word),
    dictionaryReading: firstVariant(w.item.reading),
    wordType: getWordTypeLabel(w.item.wordType),
    wordTypeJp: getWordTypeLabelJp(w.item.wordType),
    meaning: (w.item.meaningId || '').trim(),
    definition: w.item.definitionId?.trim() || undefined,
    inflection: inflectionNote(w),
  };
}

/** Bacaan kanji ke-`offset` di dalam kata (日本語 + にほんご → 本 = ほん). */
function kanjiReadingInWord(w: WordHit, offset: number): string | undefined {
  if (w.inflected) {
    // Bagian kanji pada bentuk konjugasi sama dengan bentuk kamus (stem tidak berubah).
    if (offset >= firstVariant(w.item.word).length) return undefined;
  }
  const word = w.inflected ? firstVariant(w.item.word) : w.surface;
  const reading = w.inflected ? firstVariant(w.item.reading) : surfaceReading(w);
  try {
    const split = splitWordReading(word, reading, lookupKanji);
    let pos = 0;
    for (const part of split.parts) {
      const len = Array.from(part.text).length;
      if (offset >= pos && offset < pos + len) return part.isKanji && part.readingType !== 'irregular' && len === 1 ? part.reading : undefined;
      pos += len;
    }
  } catch {
    // tidak terpasangkan
  }
  return undefined;
}

const PARTICLE_ROMAJI: Record<string, string> = { は: 'wa', へ: 'e', を: 'o' };

/** Bacaan rentang per token: `reading` digabung tanpa spasi, `romaji` dipisah spasi per token. */
function readingOfRange(s: CompanionSentence, start: number, end: number): { reading: string; romaji: string } {
  const readings: string[] = [];
  const romaji: string[] = [];
  for (const t of s.tokens) {
    if (!overlaps(t, { start, end }) || t.kind === 'punct') continue;
    const full = t.start >= start && t.end <= end;
    let r: string;
    if (t.word && full) r = surfaceReading(t.word);
    else {
      const from = Math.max(t.start, start) - t.start;
      const to = Math.min(t.end, end) - t.start;
      const piece = t.text.slice(from, to);
      const inWord = t.word && piece.length === 1 && isKanjiChar(piece) ? kanjiReadingInWord(t.word, from) : undefined;
      if (inWord) r = inWord;
      else if (!/[一-龯㐀-䶿々]/.test(piece)) r = piece;
      // Kanji di luar kata yang dikenali: kamus furigana otomatis.
      else r = getFuriganaSegments(piece).map(seg => seg.ruby || seg.text).join('');
    }
    readings.push(r);
    romaji.push(t.particle && full && PARTICLE_ROMAJI[t.particle.particle] ? PARTICLE_ROMAJI[t.particle.particle] : romajiOf(r));
  }
  return { reading: readings.join(''), romaji: romaji.filter(Boolean).join(' ') };
}

export function explainSelection(doc: CompanionDoc, sel: Selection): SelectionExplanation | null {
  const s = doc.sentences[sel.si];
  if (!s) return null;
  const range = { start: sel.start, end: sel.end };
  const text = s.text.slice(sel.start, sel.end);
  const hitTokens = s.tokens.filter(t => overlaps(t, range));

  const words: WordExplanation[] = [];
  const seenWord = new Set<string>();
  for (const t of hitTokens) {
    if (!t.word || seenWord.has(t.id)) continue;
    seenWord.add(t.id);
    words.push(explainWord(t.word));
  }

  const kanji: KanjiExplanation[] = [];
  const seenKanji = new Set<string>();
  for (let i = sel.start; i < sel.end; i++) {
    const ch = s.text[i];
    if (!isKanjiChar(ch) || ch === '々' || seenKanji.has(ch)) continue;
    seenKanji.add(ch);
    const tok = s.tokens.find(t => i >= t.start && i < t.end);
    kanji.push({
      char: ch,
      item: lookupKanji(ch),
      readingInContext: tok?.word ? kanjiReadingInWord(tok.word, i - tok.start) : undefined,
      inWord: tok?.word && tok.text.length > 1 ? tok.text : undefined,
    });
  }

  const particles: ParticleExplanation[] = [];
  for (const t of hitTokens) {
    if (!t.particle) continue;
    const chunk = s.chunks.find(c => c.end === t.end || (t.end >= c.start && t.end <= c.end));
    particles.push({
      particle: t.particle.particle,
      function: t.particle.function,
      role: CHUNK_ROLE[t.particle.particle],
      marks: chunk && chunk.particle === t.particle.particle ? chunk.text.slice(0, chunk.text.length - t.particle.particle.length) || undefined : undefined,
    });
  }

  const grammar: GrammarExplanation[] = s.grammar
    .filter(g => overlaps(g, range))
    .map(g => ({ item: g.item, matched: g.matched, phrase: g.phrase }));

  const unknown = hitTokens.filter(t => t.kind === 'unknown').map(t => t.text);

  const chunk = s.chunks.find(c => sel.start >= c.start && sel.start < c.end);
  const { reading, romaji } = readingOfRange(s, sel.start, sel.end);

  return {
    text,
    reading,
    romaji,
    mode: sel.mode,
    words,
    kanji,
    particles,
    grammar,
    unknown,
    context: {
      sentence: s.text,
      translation: s.translation,
      gloss: s.gloss,
      role: chunk?.role,
      chunk: chunk?.text,
    },
  };
}

/** Huruf yang bisa dianimasikan urutan goresannya (kanji + kana), unik, sesuai urutan muncul. */
export function writableChars(text: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    if (out.includes(ch) || ch === 'ー' || ch === '々') continue;
    if (isKanjiChar(ch) || /[ぁ-ゖァ-ヺ]/.test(ch)) out.push(ch);
  }
  return out;
}

/** Bacaan token untuk furigana (hanya token yang memuat kanji). */
export function tokenReading(t: CompanionToken): string | undefined {
  if (!/[一-龯㐀-䶿々]/.test(t.text)) return undefined;
  if (t.word) return surfaceReading(t.word);
  const r = getFuriganaSegments(t.text).map(seg => seg.ruby || seg.text).join('');
  return r && r !== t.text ? r : undefined;
}

/** Token berikut/sebelumnya yang bisa dipilih (lewati tanda baca), lintas kalimat. */
export function stepSelection(doc: CompanionDoc, sel: Selection, dir: 1 | -1): Selection | null {
  if (sel.mode === 'kanji') {
    let si = sel.si;
    let i = sel.start + dir;
    while (doc.sentences[si]) {
      const text = doc.sentences[si].text;
      while (i >= 0 && i < text.length) {
        if (!PUNCT_RE.test(text[i])) return { si, start: i, end: i + 1, mode: 'kanji' };
        i += dir;
      }
      si += dir;
      i = dir === 1 ? 0 : (doc.sentences[si]?.text.length ?? 0) - 1;
    }
    return null;
  }
  const units = (s: CompanionSentence) => {
    if (sel.mode === 'word') return s.tokens.filter(t => t.kind !== 'punct').map(t => ({ start: t.start, end: t.end }));
    const out: { start: number; end: number }[] = [];
    for (const c of s.chunks) {
      const g = s.grammar.find(x => overlaps(x, c));
      const u = g ? { start: Math.min(g.start, c.start), end: Math.max(g.end, c.end) } : c;
      if (!out.some(o => overlaps(o, u))) out.push(u);
    }
    return out;
  };
  let si = sel.si;
  let list = units(doc.sentences[si]);
  let idx = list.findIndex(u => sel.start >= u.start && sel.start < u.end);
  idx += dir;
  while (doc.sentences[si]) {
    if (idx >= 0 && idx < list.length) {
      const target = list[idx];
      return resolveSelection(doc, si, target.start, sel.mode) ?? { si, ...target, mode: sel.mode };
    }
    si += dir;
    if (!doc.sentences[si]) break;
    list = units(doc.sentences[si]);
    idx = dir === 1 ? 0 : list.length - 1;
  }
  return null;
}
