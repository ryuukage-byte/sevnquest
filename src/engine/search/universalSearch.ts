// ==============================================================================
// UNIVERSAL JAPANESE SEARCH ENGINE
// Satu-satunya sumber kebenaran pencarian materi (Kotoba, Kanji, Bunpou).
//
//   query mentah → normalizeJapaneseQuery() → varian (teks, kana, katakana, romaji)
//        → indeks turunan (dibangun sekali per sumber data) → skor deterministik
//        → hasil dengan ID kanonik + entity asli dari database
//
// Indeks hanyalah DATA TURUNAN: tidak menyimpan salinan materi, hanya string siap-cari
// yang menunjuk ke entity di database sumber. Pencarian tidak memberi EXP/mastery.
// ==============================================================================

import * as wanakana from 'wanakana';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KOTOBA_ID_ALIASES } from '../../data/entityIds';
import { matchBunpouItem } from '../../utils/bunpouSearchUtils';
import { getCanonicalGrammarTitle } from '../../utils/bunpouTitleUtils';
import type { KotobaItem, KanjiItem, BunpouItem } from '../../types/content';

export type SearchEntityType = 'kotoba' | 'kanji' | 'bunpou';

export type SearchMatchType =
  | 'exact-text'
  | 'exact-reading'
  | 'exact-romaji'
  | 'exact-alias'
  | 'prefix-text'
  | 'prefix-reading'
  | 'meaning'
  | 'contains'
  | 'formula'
  | 'fuzzy';

export type SearchMatchedField = 'text' | 'reading' | 'romaji' | 'alias' | 'meaning' | 'formula';

interface SearchResultBase {
  entityId: string;
  /** Teks utama untuk ditampilkan (kata / karakter / judul pola). */
  primaryText: string;
  reading: string;
  romaji: string;
  meaning: string;
  matchType: SearchMatchType;
  matchedField: SearchMatchedField;
  /** 0..1, makin tinggi makin relevan. */
  score: number;
}

export type SearchResult =
  | (SearchResultBase & { entityType: 'kotoba'; entity: KotobaItem })
  | (SearchResultBase & { entityType: 'kanji'; entity: KanjiItem })
  | (SearchResultBase & { entityType: 'bunpou'; entity: BunpouItem });

export interface SearchOptions {
  /** Default: semua jenis yang ada di indeks. */
  entityTypes?: SearchEntityType[];
  /** Default 50. Gunakan Infinity untuk tanpa batas. */
  limit?: number;
  /** Indeks khusus (mis. subset Kotoba milik sebuah deck/Library). Default: indeks global. */
  index?: UniversalSearchIndex;
}

// ------------------------------------------------------------------------------
// NORMALISASI QUERY
// ------------------------------------------------------------------------------

export interface NormalizedQuery {
  raw: string;
  /** NFKC + trim + huruf kecil + spasi dirapatkan. */
  text: string;
  /** Tanpa spasi/tanda baca pemisah ("benkyou suru" → "benkyousuru"). */
  compact: string;
  /** Varian hiragana dari compact ("nomu" → "のむ", "ノム" → "のむ"). */
  hira: string;
  /** Varian katakana. */
  kata: string;
  /** Romaji dari varian kana (untuk membandingkan dengan romaji dokumen). */
  romaji: string;
  /** Query mengandung huruf Latin (dibaca sebagai romaji / arti). */
  isLatin: boolean;
}

const SEPARATORS = /[\s　・、，,.。:;'"`´\-_/／+＋()（）[\]【】「」『』~～〜]+/g;

export function normalizeJapaneseQuery(raw: string): NormalizedQuery {
  const text = (raw || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const compact = text.replace(SEPARATORS, '');
  const hira = wanakana.toHiragana(compact, { IMEMode: false });
  const kata = wanakana.toKatakana(hira);
  const romaji = wanakana.toRomaji(hira);
  return { raw, text, compact, hira, kata, romaji, isLatin: /[a-z]/.test(compact) };
}

/** Kana apa pun → hiragana, huruf Latin → huruf kecil, untuk disimpan di dokumen indeks. */
function toSearchKana(s: string): string {
  return wanakana.toHiragana((s || '').normalize('NFKC').toLowerCase().replace(SEPARATORS, ''), { IMEMode: false });
}

// ------------------------------------------------------------------------------
// INDEKS TURUNAN
// ------------------------------------------------------------------------------

interface BaseDoc {
  id: string;
  text: string;      // bentuk tulis utama, dinormalisasi
  reading: string;   // hiragana tanpa pemisah
  romaji: string;
  meaning: string;   // arti + info pendukung, huruf kecil
  aliases: string[]; // ID lama / alias resmi dari database alias
  rank: number;      // tie-break deterministik (JLPT lebih mudah dulu)
}
interface KotobaDoc extends BaseDoc { item: KotobaItem }
interface KanjiDoc extends BaseDoc { item: KanjiItem; readings: string[] }
interface BunpouDoc extends BaseDoc { item: BunpouItem; title: string }

export interface UniversalSearchIndex {
  kotoba: KotobaDoc[];
  kanji: KanjiDoc[];
  bunpou: BunpouDoc[];
}

const JLPT_RANK: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
const rankOf = (level?: string) => (level && level in JLPT_RANK ? JLPT_RANK[level] : 5);

/** Alias → kanonik dibalik sekali: kanonik → daftar ID lama. */
let aliasesByCanonical: Map<string, string[]> | null = null;
function getAliasesFor(id: string): string[] {
  if (!aliasesByCanonical) {
    aliasesByCanonical = new Map();
    for (const [alias, canonical] of Object.entries(KOTOBA_ID_ALIASES)) {
      const list = aliasesByCanonical.get(canonical) || [];
      list.push(alias.toLowerCase());
      aliasesByCanonical.set(canonical, list);
    }
  }
  return aliasesByCanonical.get(id) || [];
}

function buildKotobaDoc(item: KotobaItem): KotobaDoc {
  const text = (item.word || '').normalize('NFKC').toLowerCase().replace(SEPARATORS, '');
  const reading = toSearchKana(item.reading || item.word || '');
  return {
    item,
    id: item.id,
    text,
    reading,
    romaji: wanakana.toRomaji(reading),
    meaning: `${item.meaningId || ''} ${item.meaningEn || ''} ${item.meaningJa || ''} ${item.unitName || ''}`.toLowerCase(),
    aliases: [item.id.toLowerCase(), ...getAliasesFor(item.id)],
    rank: rankOf(item.jlpt),
  };
}

function splitReadings(list: string[] | undefined): string[] {
  const out: string[] = [];
  for (const r of list || []) {
    // "た.べる" → "たべる" dan batang "た"; "-ぎ" → "ぎ"
    const clean = r.replace(/[-]/g, '');
    const [stem] = clean.split('.');
    for (const v of [clean.replace(/\./g, ''), stem]) {
      const k = toSearchKana(v);
      if (k && !out.includes(k)) out.push(k);
    }
  }
  return out;
}

function buildKanjiDoc(item: KanjiItem): KanjiDoc {
  const readings = [...splitReadings(item.kunyomi), ...splitReadings(item.onyomi)];
  return {
    item,
    id: item.id || item.character,
    text: item.character,
    reading: readings[0] || '',
    readings,
    romaji: readings[0] ? wanakana.toRomaji(readings[0]) : '',
    meaning: `${item.meaningId || ''} ${item.meaningEn || ''} ${item.radical || ''} ${item.radicalName || ''}`.toLowerCase(),
    aliases: [(item.id || item.character).toLowerCase()],
    rank: rankOf(item.jlpt),
  };
}

const stripTilde = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[~〜～\s]+/g, '');

function buildBunpouDoc(item: BunpouItem): BunpouDoc {
  const title = getCanonicalGrammarTitle(item);
  return {
    item,
    id: item.id,
    title: stripTilde(title),
    text: stripTilde(item.title),
    reading: toSearchKana(item.reading || ''),
    romaji: (item.reading || '').toLowerCase().replace(SEPARATORS, ''),
    meaning: `${item.meaningId || ''} ${item.meaningEn || ''}`.toLowerCase(),
    aliases: [item.id.toLowerCase()],
    rank: rankOf(item.level),
  };
}

const kotobaCache = new WeakMap<readonly KotobaItem[], KotobaDoc[]>();
const kanjiCache = new WeakMap<readonly KanjiItem[], KanjiDoc[]>();
const bunpouCache = new WeakMap<readonly BunpouItem[], BunpouDoc[]>();

function cachedDocs<T extends object, D>(cache: WeakMap<readonly T[], D[]>, items: readonly T[], build: (i: T) => D): D[] {
  let docs = cache.get(items);
  if (!docs) {
    docs = items.map(build);
    cache.set(items, docs);
  }
  return docs;
}

/** Bangun indeks Kotoba untuk koleksi tertentu (di-cache per array, dibangun sekali). */
export function buildKotobaDocs(items: readonly KotobaItem[]): KotobaDoc[] {
  let docs = kotobaCache.get(items);
  if (!docs) {
    docs = items.filter(i => i && i.id && i.word).map(buildKotobaDoc);
    kotobaCache.set(items, docs);
  }
  return docs;
}

let globalIndex: UniversalSearchIndex | null = null;

/** Indeks global dari database sumber (dibangun malas, sekali). */
export function getUniversalIndex(): UniversalSearchIndex {
  if (!globalIndex) {
    const seen = new Set<string>();
    const kanji: KanjiItem[] = [];
    for (const k of Object.values(KANJI_DATABASE)) {
      if (k && k.character && !seen.has(k.character)) {
        seen.add(k.character);
        kanji.push(k);
      }
    }
    globalIndex = {
      kotoba: buildKotobaDocs(getAllKotoba()),
      kanji: kanji.map(buildKanjiDoc),
      bunpou: Object.values(BUNPOU_DATABASE).filter(Boolean).map(buildBunpouDoc),
    };
  }
  return globalIndex;
}

let allKotobaCache: KotobaItem[] | null = null;
function getAllKotoba(): KotobaItem[] {
  if (!allKotobaCache) allKotobaCache = Object.values(KOTOBA_DATABASE);
  return allKotobaCache;
}

/** Indeks untuk subset materi (mis. Library dengan prop `items`). Sumber data tetap sama. */
export function createSubsetIndex(parts: { kotoba?: readonly KotobaItem[]; kanji?: readonly KanjiItem[]; bunpou?: readonly BunpouItem[] }): UniversalSearchIndex {
  // Dokumen dibangun MALAS (saat pertama kali dicari) dan di-cache per array sumber,
  // jadi membuat indeks saat sebuah layar dibuka tidak memakan waktu.
  return {
    get kotoba() { return parts.kotoba ? buildKotobaDocs(parts.kotoba) : []; },
    get kanji() { return parts.kanji ? cachedDocs(kanjiCache, parts.kanji, buildKanjiDoc) : []; },
    get bunpou() { return parts.bunpou ? cachedDocs(bunpouCache, parts.bunpou, buildBunpouDoc) : []; },
  };
}

// ------------------------------------------------------------------------------
// SKOR (deterministik; identitas selalu di atas arti, fuzzy paling bawah)
// ------------------------------------------------------------------------------

const SCORE = {
  exactText: 1.0,
  exactReading: 0.97,
  exactRomaji: 0.96,
  exactAlias: 0.95,
  prefixText: 0.85,
  prefixReading: 0.8,
  /** Ketikan Latin parsial: di atas arti sebagian, di bawah arti kata-utuh ("makan" bukan まかなう). */
  prefixRomaji: 0.6,
  formula: 0.6,
  meaningExact: 0.62,
  meaningPrefix: 0.58,
  meaning: 0.5,
  containsText: 0.45,
  containsReading: 0.4,
  /** Versi kana dari query Latin yang muncul di teks arti/definisi (kemampuan Library lama). */
  meaningKana: 0.3,
  fuzzy: 0.2,
} as const;

interface Hit { score: number; matchType: SearchMatchType; matchedField: SearchMatchedField }
const hit = (score: number, matchType: SearchMatchType, matchedField: SearchMatchedField): Hit => ({ score, matchType, matchedField });

/** Pencocokan identitas (teks/kana/romaji/alias) umum untuk semua jenis entity. */
function matchBase(d: BaseDoc, q: NormalizedQuery, readings: string[]): Hit | null {
  // 1. Teks kanonik
  if (d.text === q.compact || (q.compact && d.text === q.text)) return hit(SCORE.exactText, 'exact-text', 'text');

  // 2. Reading / romaji. Kueri latin dibaca sebagai romaji → kana, kueri kana dibandingkan langsung.
  if (q.hira) {
    if (readings.includes(q.hira)) {
      return q.isLatin ? hit(SCORE.exactRomaji, 'exact-romaji', 'romaji') : hit(SCORE.exactReading, 'exact-reading', 'reading');
    }
  }
  if (q.isLatin && d.romaji && d.romaji === q.romaji) return hit(SCORE.exactRomaji, 'exact-romaji', 'romaji');

  // 3. Alias resmi (ID lama / ID kanonik)
  const aliasKey = q.text.replace(/s+/g, '');
  if (aliasKey && d.aliases.includes(aliasKey)) return hit(SCORE.exactAlias, 'exact-alias', 'alias');

  // 4. Prefix
  if (q.compact && d.text.startsWith(q.compact)) return hit(SCORE.prefixText, 'prefix-text', 'text');
  if (q.hira) {
    for (const r of readings) {
      if (r.startsWith(q.hira)) return q.isLatin ? hit(SCORE.prefixRomaji, 'prefix-reading', 'romaji') : hit(SCORE.prefixReading, 'prefix-reading', 'reading');
    }
  }
  // Ketikan romaji yang belum lengkap ("nom" belum jadi のむ) dibandingkan di sisi romaji.
  if (q.isLatin && q.romaji && d.romaji.startsWith(q.romaji)) return hit(SCORE.prefixRomaji, 'prefix-reading', 'romaji');

  // 5. Arti (di bawah identitas)
  if (q.text && d.meaning) {
    const m = d.meaning;
    if (m === q.text || meaningWordRegExp(q.text).test(m)) return hit(SCORE.meaningExact, 'meaning', 'meaning');
    if (m.startsWith(q.text)) return hit(SCORE.meaningPrefix, 'meaning', 'meaning');
    if (m.includes(q.text)) return hit(SCORE.meaning, 'meaning', 'meaning');
  }

  // 6. Contains pada teks / reading
  if (q.compact && (d.text.includes(q.compact) || (q.hira && d.text.includes(q.hira)) || (q.kata && d.text.includes(q.kata)))) return hit(SCORE.containsText, 'contains', 'text');
  if (q.hira) {
    for (const r of readings) {
      if (r.includes(q.hira)) return hit(SCORE.containsReading, 'contains', 'reading');
    }
  }

  // 7. Query Latin → kana yang muncul di teks arti / definisi Jepang (paling bawah)
  if (q.hira !== q.text && d.meaning && (d.meaning.includes(q.hira) || d.meaning.includes(q.kata.toLowerCase()))) {
    return hit(SCORE.meaningKana, 'meaning', 'meaning');
  }
  return null;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex kata-utuh untuk arti, dibuat sekali per query (bukan per dokumen). */
let lastMeaningText = '';
let lastMeaningRe: RegExp | null = null;
function meaningWordRegExp(text: string): RegExp {
  if (text !== lastMeaningText || !lastMeaningRe) {
    lastMeaningText = text;
    lastMeaningRe = new RegExp(`(^|[\\s;,/()])${escapeRegExp(text)}($|[\\s;,/()])`);
  }
  return lastMeaningRe;
}

/** Jarak edit ≤ 1 (substitusi/sisip/hapus). Cukup untuk salah ketik kecil. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length || i === b.length) return Math.abs(a.length - b.length) <= 1;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// ------------------------------------------------------------------------------
// PENCARIAN
// ------------------------------------------------------------------------------

type Scored = { result: SearchResult; rank: number; len: number; order: number };
const TYPE_RANK: Record<SearchEntityType, number> = { kotoba: 0, bunpou: 1, kanji: 2 };

function toResult(type: 'kotoba', d: KotobaDoc, h: Hit): SearchResult;
function toResult(type: 'kanji', d: KanjiDoc, h: Hit): SearchResult;
function toResult(type: 'bunpou', d: BunpouDoc, h: Hit): SearchResult;
function toResult(type: SearchEntityType, d: KotobaDoc | KanjiDoc | BunpouDoc, h: Hit): SearchResult {
  const base = { ...h, entityId: d.id, reading: d.reading, romaji: d.romaji };
  if (type === 'kotoba') {
    const item = (d as KotobaDoc).item;
    return { ...base, entityType: 'kotoba', primaryText: item.word, reading: item.reading || item.word, meaning: item.meaningId || item.meaningEn || '', entity: item };
  }
  if (type === 'kanji') {
    const item = (d as KanjiDoc).item;
    return { ...base, entityType: 'kanji', primaryText: item.character, meaning: item.meaningId || item.meaningEn || '', entity: item };
  }
  const item = (d as BunpouDoc).item;
  return { ...base, entityType: 'bunpou', primaryText: item.title, reading: item.reading || '', meaning: item.meaningId || '', entity: item };
}

export function searchJapanese(rawQuery: string, options: SearchOptions = {}): SearchResult[] {
  const q = normalizeJapaneseQuery(rawQuery);
  if (!q.compact) return [];

  const index = options.index || getUniversalIndex();
  const types = options.entityTypes || (['kotoba', 'kanji', 'bunpou'] as SearchEntityType[]);
  const limit = options.limit ?? 50;
  const scored: Scored[] = [];
  let order = 0;

  if (types.includes('kotoba')) {
    for (const d of index.kotoba) {
      const h = matchBase(d, q, d.reading ? [d.reading] : []);
      if (h) scored.push({ result: toResult('kotoba', d, h), rank: d.rank, len: d.text.length, order: order++ });
      else order++;
    }
  }
  if (types.includes('kanji')) {
    for (const d of index.kanji) {
      const h = matchBase(d, q, d.readings);
      if (h) scored.push({ result: toResult('kanji', d, h), rank: d.rank, len: d.text.length, order: order++ });
      else order++;
    }
  }
  if (types.includes('bunpou')) {
    for (const d of index.bunpou) {
      let h: Hit | null = null;
      if (d.title === q.compact || d.text === q.compact || (q.isLatin && (d.title === q.hira || d.text === q.hira))) h = hit(SCORE.exactText, 'exact-text', 'text');
      else if (d.title.startsWith(q.compact) || d.text.startsWith(q.compact) || (q.isLatin && (d.title.startsWith(q.hira) || d.text.startsWith(q.hira)))) h = hit(SCORE.prefixText, 'prefix-text', 'text');
      else h = matchBase(d, q, d.reading ? [d.reading] : []);
      // Kemampuan lama Bunpou (rumus, variasi spasi/operator, token, fungsi) tetap dipakai.
      if (!h && matchBunpouItem(d.item, rawQuery)) h = hit(SCORE.formula, 'formula', 'formula');
      if (h) scored.push({ result: toResult('bunpou', d, h), rank: d.rank, len: d.title.length, order: order++ });
      else order++;
    }
  }

  // Fuzzy hanya sebagai cadangan bila tidak ada hasil lain, dan hanya pada identitas (kana/romaji).
  if (scored.length === 0 && q.compact.length >= 4) {
    if (types.includes('kotoba')) {
      for (const d of index.kotoba) {
        if (d.reading && (withinOneEdit(d.reading, q.hira) || (q.isLatin && withinOneEdit(d.romaji, q.romaji)))) {
          scored.push({ result: toResult('kotoba', d, hit(SCORE.fuzzy, 'fuzzy', 'reading')), rank: d.rank, len: d.text.length, order: order++ });
        }
      }
    }
  }

  scored.sort((a, b) =>
    b.result.score - a.result.score ||
    TYPE_RANK[a.result.entityType] - TYPE_RANK[b.result.entityType] ||
    a.rank - b.rank ||
    a.len - b.len ||
    a.order - b.order
  );
  const out = scored.map(s => s.result);
  return Number.isFinite(limit) ? out.slice(0, limit) : out;
}
