// ==============================================================================
// TEXT STUDY ANALYZER
// Mengubah teks Jepang bebas (kalimat / paragraf / dokkai) menjadi bahan belajar:
// kotoba, pola tata bahasa, partikel, struktur, dan kanji — dicocokkan ke database yang sudah ada.
//
// Tanpa tokenizer eksternal: pemindai "longest match" atas indeks bentuk-tulis kotoba
// (termasuk bentuk konjugasi dari conjugateVerb / conjugateAdjective). Pola tata bahasa
// juga dicocokkan lewat bentuk-bentuk konjugasinya (ようになる → ようになった / ようになります / ようになって …),
// bukan hanya string mentah. Hasilnya HEURISTIK: kata di luar database ditandai "belum dikenal".
// ==============================================================================

import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { conjugateVerb, conjugateAdjective } from '../morphology/inflectionEngine';
import type { KotobaItem, KanjiItem, BunpouItem } from '../../types/content';

export interface WordHit {
  start: number; // offset dalam kalimat
  end: number;
  surface: string;
  item: KotobaItem;
  /** true bila surface berbeda dari bentuk kamus (hasil konjugasi). */
  inflected: boolean;
  /** Nama bentuk konjugasi (mis. 'te', 'ta', 'nai'), bila inflected. */
  form?: string;
}

export interface GrammarHit {
  item: BunpouItem;
  /** Potongan teks persis yang cocok di kalimat (bisa bentuk konjugasi, mis. ようになりました). */
  matched: string;
  /** Bentuk dasar pola (mis. ようになる). */
  key: string;
  start: number;
  end: number;
  /** Frasa lengkap = kata sebelum pola + pola (mis. 話せるようになりました). */
  phrase: string;
}

export interface ParticleHit {
  particle: string;
  start: number;
  end: number;
  function: string;
}

export interface Chunk {
  text: string;
  particle?: string;
  role: string;
}

export interface SentenceAnalysis {
  text: string;
  words: WordHit[];
  grammar: GrammarHit[];
  particles: ParticleHit[];
  chunks: Chunk[];
  /** Terjemahan dari contoh di database bila kalimat persis ada; selain itu kosong. */
  translation?: string;
  /** Gambaran kasar arti dari kata-kata yang dikenali (bukan terjemahan). */
  gloss: string;
}

export interface VocabEntry {
  item: KotobaItem;
  surfaces: string[];
  count: number;
  /** Kalimat pertama tempat kata muncul (konteks). */
  sentence: string;
}

export interface GrammarEntry {
  item: BunpouItem;
  matched: string;
  sentence: string;
}

export interface TextAnalysis {
  sentences: SentenceAnalysis[];
  vocab: VocabEntry[];
  grammar: GrammarEntry[];
  kanji: KanjiItem[];
  /** Deretan kanji ≥2 huruf yang tidak tercakup kotoba mana pun. */
  unknown: string[];
  charCount: number;
}

export const MAX_INPUT_CHARS = 3000;

const KANJI_RE = /[一-龯㐀-䶿々]/;
const KANA_ONLY_RE = /^[぀-ゟ゠-ヿー]+$/;
const BREAK_RE = /[\s。！？!?、，,．.「」『』（）()［］\[\]【】・：:；;…\-―～〜"'“”]/;

/** Label bentuk konjugasi (kata kerja + kata sifat) untuk ditampilkan ke pelajar. */
export const FORM_LABEL: Record<string, string> = {
  masu: 'bentuk sopan (ます形)',
  masu_stem: 'bentuk ます-stem (連用形)',
  te: 'bentuk て (て形)',
  ta: 'bentuk lampau (た形)',
  nai: 'bentuk negatif (ない形)',
  nakatta: 'lampau negatif (なかった形)',
  ba: 'bentuk pengandaian (ば形)',
  tara: 'bentuk kondisional (たら形)',
  volitional: 'bentuk ajakan/maksud (意向形)',
  imperative: 'bentuk perintah (命令形)',
  potential: 'bentuk potensial (可能形)',
  passive: 'bentuk pasif (受身形)',
  causative: 'bentuk kausatif (使役形)',
  causative_passive: 'bentuk kausatif-pasif (使役受身)',
  tai: 'bentuk keinginan (たい形)',
  sou_appearance: 'bentuk そう (tampaknya)',
  sou_hearsay: 'bentuk そう (katanya)',
  yasui: 'bentuk やすい (mudah)',
  nikui: 'bentuk にくい (sulit)',
  negative: 'bentuk negatif',
  past: 'bentuk lampau',
  past_negative: 'lampau negatif',
  adverbial: 'bentuk keterangan (〜く/〜に)',
  attributive: 'bentuk penjelas kata benda',
};

// ------------------------------------------------------------------------------
// INDEKS KOTOBA (dibangun sekali, malas)
// ------------------------------------------------------------------------------

const JLPT_RANK: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
const rank = (k: KotobaItem) => JLPT_RANK[k.jlpt] ?? 5;

interface SurfaceEntry { item: KotobaItem; inflected: boolean; form?: string }

let surfaceIndex: Map<string, SurfaceEntry> | null = null;
let maxSurfaceLen = 1;

// Akhiran sopan/umum yang tidak berguna sebagai 'kotoba' tersendiri.
const SURFACE_STOP = new Set(['ました', 'ません', 'ます', 'ませんでした', 'でした', 'でしょう', 'ください']);

function addSurface(map: Map<string, SurfaceEntry>, surface: string, item: KotobaItem, inflected: boolean, form?: string) {
  const s = surface.trim();
  if (!s || SURFACE_STOP.has(s)) return;
  // Satu huruf hanya boleh bentuk kamus kanji (水, 本); bentuk turunan 1 huruf terlalu ambigu.
  if (s.length === 1 && (inflected || !KANJI_RE.test(s))) return;
  // Bentuk turunan kana murni dari kata kana pendek (なる→ならない) memicu kecocokan palsu.
  if (inflected && KANA_ONLY_RE.test(s) && (s.length < 3 || item.word.length < 3)) return;
  const prev = map.get(s);
  if (prev && (rank(prev.item) < rank(item) || (rank(prev.item) === rank(item) && !prev.inflected))) return;
  map.set(s, { item, inflected, form });
  if (s.length > maxSurfaceLen) maxSurfaceLen = s.length;
}

function getSurfaceIndex(): Map<string, SurfaceEntry> {
  if (surfaceIndex) return surfaceIndex;
  const map = new Map<string, SurfaceEntry>();
  const seen = new Set<string>();
  for (const item of Object.values(KOTOBA_DATABASE)) {
    if (!item || seen.has(item.id) || item.wordType === 'particle') continue;
    seen.add(item.id);
    const word = item.word.split(/[／/]/)[0].trim();
    if (!word) continue;
    addSurface(map, word, item, false);
    // Bacaan kana hanya untuk kata yang cukup panjang agar tidak salah cocok.
    if (item.reading && item.reading.length >= 3 && item.reading !== word) {
      addSurface(map, item.reading.split(/[／/]/)[0].trim(), item, false);
    }
    try {
      if (item.wordType === 'verb') {
        const conj = conjugateVerb(word, item.reading);
        for (const [name, f] of Object.entries(conj.forms)) if (f?.japanese && f.japanese !== word) addSurface(map, f.japanese, item, true, name);
      } else if (item.wordType === 'adjective-i' || item.wordType === 'adjective-na') {
        const conj = conjugateAdjective(word, item.reading, item.wordType === 'adjective-i' ? 'i' : 'na');
        for (const [name, f] of Object.entries(conj.forms)) if (f?.japanese && f.japanese !== word) addSurface(map, f.japanese, item, true, name);
      }
    } catch {
      // Entri aneh yang tidak bisa dikonjugasi tetap dikenali bentuk kamusnya.
    }
  }
  surfaceIndex = map;
  return map;
}

// ------------------------------------------------------------------------------
// INDEKS POLA TATA BAHASA
// ------------------------------------------------------------------------------

interface GrammarKey {
  /** Bentuk yang dicari di teks (dasar atau hasil konjugasi). */
  key: string;
  /** Bentuk dasar pola (dasar tampilan). */
  base: string;
  item: BunpouItem;
}
let grammarKeys: GrammarKey[] | null = null;
const KEY_NOISE = /形|文|名詞|動詞|辞書|普通|丁寧|命令|接続|助詞|^(ます|ました|ません|でした|でしょう|です)|(ます|ません|ました)$/;
/** Pola 2 huruf yang aman karena nyaris selalu berfungsi sebagai tata bahasa. */
const SHORT_KEY_OK = new Set(['ので', 'のに']);

/**
 * Rumus "Vなければ ＋ ならない" → kandidat kunci teks: gabungan tiap alternatif bagian-depan dengan bagian
 * setelah ＋ ("なければならない"). Bila ada alternatif depan yang hanya berupa slot (N/V/A, mis. "N／Vて ＋ ばかり"),
 * bagian setelah ＋ juga dipakai sendiri.
 */
function grammarCandidates(formula: string): string[] {
  const noSlot = (x: string) => x.replace(/[A-Za-zＡ-Ｚａ-ｚ'’]+/g, '');
  const squash = (x: string) => x.replace(/[()（）[\]～〜→\s]+/g, '');
  const alts = (seg: string) => seg.split(/[／・；;,、]+/).map(x => squash(x)).filter(Boolean);
  const segments = formula.split(/[＋+]/).filter(x => x.trim());
  if (segments.length <= 1) return alts(noSlot(formula));
  const tail = alts(noSlot(segments[segments.length - 1]));
  const headRaw = alts(segments.slice(0, -1).join(''));
  // Bagian depan 1 huruf (Vる / Vて / Vた) hanya penanda bentuk kata kerja, bukan isi pola.
  const heads = headRaw.map(noSlot).filter(h => h.length >= 2);
  const out: string[] = heads.flatMap(h => tail.map(t => h + t));
  if (heads.length < headRaw.length || heads.length === 0) out.push(...tail);
  return out;
}

/** Rumus berpenjelasan bahasa Indonesia ("Kata Kerja[て form] ＋ いる"): ambil potongan Jepang di luar tanda kurung. */
function japaneseRuns(formula: string): string[] {
  const stripped = formula.replace(/[\[［(（][^\]］)）]*[\]］)）]/g, ' ');
  return (stripped.match(/[぀-ヿ一-龯]{2,}/g) || []);
}

const VERB_TAIL_RE = /(する|なる|いる|ある|できる|れる|せる|くれる|あげる|もらう|しまう|おく|みる|くる|いく)$/;
const ADJ_TAIL_RE = /(ない|たい|ほしい|らしい)$/;
/** Akhir あ-段 pada negatif godan → い-段 untuk bentuk ます (ならない → なりません). */
const A_TO_I: Record<string, string> = { わ: 'い', か: 'き', が: 'ぎ', さ: 'し', た: 'ち', な: 'に', ば: 'び', ま: 'み', ら: 'り' };
const FORMS_FOR_PATTERN = new Set(['jisho', 'masu', 'masu_stem', 'te', 'ta', 'nai', 'nakatta', 'ba', 'tara', 'volitional']);

/** Bentuk-bentuk yang mungkin muncul di teks dari satu bentuk dasar pola. */
function expandKey(base: string): string[] {
  const out = new Set<string>([base]);
  try {
    if (/(だ|です)$/.test(base)) {
      const stem = base.replace(/(だ|です)$/, '');
      for (const t of ['だ', 'です', 'だった', 'でした', 'で', 'な', 'だろう', 'でしょう']) out.add(stem + t);
    } else if (ADJ_TAIL_RE.test(base) && /[぀-ヿ一-龯]ない$|たい$|ほしい$|らしい$/.test(base)) {
      const conj = conjugateAdjective(base, base, 'i');
      for (const f of Object.values(conj.forms)) if (f?.japanese) out.add(f.japanese);
      if (base.endsWith('ない')) {
        // Negatif sopan: ならない → なりません, いけない → いけません, かもしれない → かもしれません
        const stem = base.slice(0, -2);
        const last = stem.slice(-1);
        const polite = A_TO_I[last] !== undefined ? stem.slice(0, -1) + A_TO_I[last] : stem;
        for (const t of ['ません', 'ませんでした']) out.add(polite + t);
      }
    } else if (VERB_TAIL_RE.test(base) && KANA_ONLY_RE.test(base.slice(-4))) {
      const conj = conjugateVerb(base, base);
      for (const [name, f] of Object.entries(conj.forms)) {
        if (!FORMS_FOR_PATTERN.has(name) || !f?.japanese) continue;
        out.add(f.japanese);
        if (name === 'masu' && f.japanese.endsWith('ます')) {
          const stem = f.japanese.slice(0, -2);
          for (const t of ['ました', 'ません', 'ませんでした', 'ましょう']) out.add(stem + t);
        }
      }
    }
  } catch {
    // Bentuk dasar tetap dipakai bila konjugasi gagal.
  }
  return [...out].filter(Boolean);
}

function getGrammarKeys(): GrammarKey[] {
  if (grammarKeys) return grammarKeys;
  const out: GrammarKey[] = [];
  const seen = new Set<string>();
  for (const item of Object.values(BUNPOU_DATABASE)) {
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    const formula = item.formula || '';
    const indonesian = /Kata |[a-z]{4,}/.test(formula);
    const formulaParts = indonesian ? japaneseRuns(formula) : grammarCandidates(formula);
    const titleHead = (item.title || '').split(/[（(]/)[0].replace(/[。\s]/g, '');
    const titleParts = titleHead && titleHead.length <= 12 && /^[぀-ヿ一-龯・／～〜]+$/.test(titleHead)
      ? titleHead.split(/[・／～〜]/).filter(Boolean)
      : [];
    const parts = [...formulaParts, ...titleParts];
    const added = new Set<string>();
    for (const p of new Set(parts)) {
      if (KEY_NOISE.test(p)) continue;
      const minLen = KANJI_RE.test(p) || /[゠-ヿ]/.test(p) ? 2 : 3;
      // Kanji murni pendek (昨日) lazimnya contoh kata, bukan pola.
      if (/^[一-龯]+$/.test(p) && p.length < 3) continue;
      if (!/[぀-ヿ一-龯]/.test(p)) continue;
      if (p.length < minLen && !SHORT_KEY_OK.has(p)) continue;
      for (const key of expandKey(p)) {
        if (added.has(key)) continue;
        // Bentuk turunan harus tetap cukup spesifik.
        if (key.length < 2 || (key.length < 3 && !SHORT_KEY_OK.has(key) && !KANJI_RE.test(key))) continue;
        added.add(key);
        out.push({ key, base: p, item });
      }
    }
  }
  out.sort((a, b) => b.key.length - a.key.length);
  grammarKeys = out;
  return out;
}

// ------------------------------------------------------------------------------
// PARTIKEL
// ------------------------------------------------------------------------------

const PARTICLE_FN: Record<string, string> = {
  は: 'Penanda topik: hal yang sedang dibicarakan.',
  が: 'Penanda subjek: pelaku/hal yang melakukan atau mengalami.',
  を: 'Penanda objek langsung dari kata kerja.',
  に: 'Menunjuk waktu, tujuan/arah, penerima, atau tempat keberadaan.',
  で: 'Menunjuk tempat berlangsungnya aksi, alat/cara, atau bahan.',
  へ: 'Menunjuk arah tujuan gerakan.',
  と: 'Bersama (teman beraksi), kutipan, atau "dan" (daftar lengkap).',
  も: 'Juga / pun: menambah hal yang sejenis.',
  の: 'Menghubungkan dua kata benda (kepemilikan/penjelas) atau membendakan.',
  から: 'Dari (titik awal waktu/tempat) atau karena (alasan).',
  まで: 'Sampai (batas waktu/tempat).',
  より: 'Daripada (pembanding) atau dari (titik awal).',
  や: '"dan" untuk daftar yang tidak lengkap (A, B, dan lain-lain).',
  か: 'Penanda pertanyaan, atau pilihan "atau".',
  ね: 'Partikel akhir: mencari persetujuan ("ya?").',
  よ: 'Partikel akhir: menegaskan atau memberi tahu.',
};
const CHUNK_ROLE: Record<string, string> = {
  は: 'topik', が: 'subjek', を: 'objek', に: 'waktu / tujuan / sasaran', で: 'tempat / alat',
  へ: 'arah', と: 'bersama / kutipan', も: 'juga', から: 'dari / karena', まで: 'sampai', より: 'pembanding', や: 'daftar',
};
const CHUNK_SPLIT = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで', 'より', 'や']);
const FINAL_PARTICLES = new Set(['か', 'ね', 'よ']);

function scanParticles(sentence: string, words: WordHit[], grammar: GrammarHit[]): ParticleHit[] {
  const inside = (i: number) => words.some(w => i >= w.start && i < w.end) || grammar.some(g => i >= g.start && i < g.end);
  const wordEndsAt = (i: number) => words.some(w => w.end === i);
  const hits: ParticleHit[] = [];
  let i = 0;
  while (i < sentence.length) {
    const two = sentence.slice(i, i + 2);
    const p = PARTICLE_FN[two] ? two : sentence[i];
    const fn = PARTICLE_FN[p];
    if (!fn || inside(i)) { i++; continue; }
    const prev = i > 0 ? sentence[i - 1] : '';
    const next = sentence[i + p.length] ?? '';
    const prevOk = !!prev && !BREAK_RE.test(prev) && (KANJI_RE.test(prev) || /[゠-ヿ]/.test(prev) || wordEndsAt(i));
    const atEnd = next === '' || BREAK_RE.test(next);
    let ok = false;
    if (FINAL_PARTICLES.has(p)) ok = atEnd && !!prev && !BREAK_RE.test(prev);
    else if (p === 'で' && next === 'す') ok = false; // です
    else if (p === 'や' || p === 'か') ok = prevOk;
    else ok = prevOk;
    if (ok) hits.push({ particle: p, start: i, end: i + p.length, function: fn });
    i += p.length;
  }
  return hits;
}

/** Potong kalimat menjadi unit "kata + partikel" untuk menjelaskan struktur. */
function buildChunks(sentence: string, particles: ParticleHit[]): Chunk[] {
  const splitters = particles.filter(p => CHUNK_SPLIT.has(p.particle));
  const bounds = new Set<number>([sentence.length]);
  for (const p of splitters) bounds.add(p.end);
  for (let i = 0; i < sentence.length; i++) if (sentence[i] === '、') bounds.add(i + 1);
  const chunks: Chunk[] = [];
  let from = 0;
  const sorted = [...bounds].sort((x, y) => x - y);
  for (const to of sorted) {
    const text = sentence.slice(from, to).replace(/[。！？!?s、]/g, '');
    const particle = splitters.find(p => p.end === to)?.particle;
    if (text) chunks.push({ text, particle, role: particle ? CHUNK_ROLE[particle] ?? '' : to === sentence.length ? 'predikat (inti kalimat)' : 'keterangan' });
    from = to;
  }
  return chunks;
}

// ------------------------------------------------------------------------------
// TERJEMAHAN (hanya bila kalimat persis ada sebagai contoh di database)
// ------------------------------------------------------------------------------

const normSentence = (s: string) => s.normalize('NFKC').replace(/[\s。！？!?、,.]/g, '');
let translationIndex: Map<string, string> | null = null;
function lookupTranslation(sentence: string): string | undefined {
  if (!translationIndex) {
    translationIndex = new Map();
    for (const b of Object.values(BUNPOU_DATABASE)) {
      for (const ex of b?.examples || []) if (ex?.japanese && ex.meaningId) translationIndex.set(normSentence(ex.japanese), ex.meaningId);
    }
    for (const k of Object.values(KOTOBA_DATABASE)) {
      const ex = k?.exampleSentence;
      if (ex?.japanese && ex.meaningId) translationIndex.set(normSentence(ex.japanese), ex.meaningId);
    }
  }
  return translationIndex.get(normSentence(sentence));
}

// ------------------------------------------------------------------------------
// ANALISIS
// ------------------------------------------------------------------------------

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?])|\n+/)
    .map(s => s.trim())
    .filter(s => /[぀-ヿ一-龯]/.test(s));
}

function scanWords(sentence: string, index: Map<string, SurfaceEntry>): WordHit[] {
  const hits: WordHit[] = [];
  let i = 0;
  while (i < sentence.length) {
    if (BREAK_RE.test(sentence[i])) { i++; continue; }
    let found: WordHit | null = null;
    for (let len = Math.min(maxSurfaceLen, sentence.length - i); len >= 1; len--) {
      const entry = index.get(sentence.slice(i, i + len));
      if (entry) {
        found = { start: i, end: i + len, surface: sentence.slice(i, i + len), item: entry.item, inflected: entry.inflected, form: entry.form };
        break;
      }
    }
    if (found) { hits.push(found); i = found.end; } else i++;
  }
  return hits;
}

function scanGrammar(sentence: string, words: WordHit[]): GrammarHit[] {
  const candidates: GrammarHit[] = [];
  const usedItems = new Set<string>();
  for (const { key, base, item } of getGrammarKeys()) {
    if (usedItems.has(item.id)) continue;
    const at = sentence.indexOf(key);
    if (at < 0) continue;
    usedItems.add(item.id);
    const end = at + key.length;
    // Sertakan kata tepat di depan pola agar "Bagian yang terdeteksi" utuh (話せる + ようになりました).
    const prev = words.find(w => w.end === at);
    const phraseStart = prev ? prev.start : at;
    candidates.push({ item, matched: key, key: base, start: at, end, phrase: sentence.slice(phraseStart, end) });
  }
  // Tumpang tindih (penuh maupun sebagian): pola yang lebih panjang menang.
  candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start || a.item.title.length - b.item.title.length);
  const accepted: GrammarHit[] = [];
  for (const c of candidates) {
    if (accepted.some(a => c.start < a.end && a.start < c.end)) continue;
    accepted.push(c);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

function buildGloss(words: WordHit[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const w of words) {
    if (seen.has(w.item.id)) continue;
    seen.add(w.item.id);
    const first = (w.item.meaningId || '').split(/[;,／/]/)[0].trim();
    if (first) parts.push(first);
  }
  return parts.join(' · ');
}

let kanjiByChar: Map<string, KanjiItem> | null = null;
function getKanjiByChar() {
  if (!kanjiByChar) {
    kanjiByChar = new Map();
    for (const k of Object.values(KANJI_DATABASE)) if (k?.character && !kanjiByChar.has(k.character)) kanjiByChar.set(k.character, k);
  }
  return kanjiByChar;
}

export function analyzeText(raw: string): TextAnalysis {
  const text = raw.normalize('NFKC').slice(0, MAX_INPUT_CHARS);
  const index = getSurfaceIndex();
  const sentences: SentenceAnalysis[] = splitSentences(text).map(s => {
    const words = scanWords(s, index);
    const grammar = scanGrammar(s, words);
    const particles = scanParticles(s, words, grammar);
    return {
      text: s,
      words,
      grammar,
      particles,
      chunks: buildChunks(s, particles),
      translation: lookupTranslation(s),
      gloss: buildGloss(words),
    };
  });

  const vocabMap = new Map<string, VocabEntry>();
  const grammarMap = new Map<string, GrammarEntry>();
  const unknown = new Set<string>();

  for (const s of sentences) {
    const covered = new Array(s.text.length).fill(false);
    for (const w of s.words) {
      for (let i = w.start; i < w.end; i++) covered[i] = true;
      // Kata fungsi/penghubung sangat pendek dan sering → tetap dihitung, tapi hanya sekali per item.
      const e = vocabMap.get(w.item.id);
      if (e) { e.count++; if (!e.surfaces.includes(w.surface)) e.surfaces.push(w.surface); }
      else vocabMap.set(w.item.id, { item: w.item, surfaces: [w.surface], count: 1, sentence: s.text });
    }
    for (const g of s.grammar) if (!grammarMap.has(g.item.id)) grammarMap.set(g.item.id, { item: g.item, matched: g.matched, sentence: s.text });
    for (const m of s.text.matchAll(/[一-龯㐀-䶿々]{2,}/g)) {
      const from = m.index ?? 0;
      let free = true;
      for (let i = from; i < from + m[0].length; i++) if (covered[i]) { free = false; break; }
      if (free) unknown.add(m[0]);
    }
  }

  const byChar = getKanjiByChar();
  const kanji: KanjiItem[] = [];
  const seenKanji = new Set<string>();
  for (const ch of text) {
    if (!KANJI_RE.test(ch) || seenKanji.has(ch)) continue;
    seenKanji.add(ch);
    const k = byChar.get(ch);
    if (k) kanji.push(k);
  }

  const vocab = [...vocabMap.values()].sort((a, b) => rank(a.item) - rank(b.item) || b.count - a.count);
  const grammar = [...grammarMap.values()].sort((a, b) => b.matched.length - a.matched.length);
  return { sentences, vocab, grammar, kanji, unknown: [...unknown], charCount: text.length };
}
