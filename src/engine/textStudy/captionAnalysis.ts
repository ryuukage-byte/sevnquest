// ==============================================================================
// CAPTION ANALYSIS
// Menganalisis caption berwaktu (lirik / subtitle) baris demi baris dengan analyzeText, lalu
// merangkum kotoba dan pola seluruh video beserta baris (=timestamp) tempat munculnya.
// Hasilnya HEURISTIK, sama seperti analyzeText: hanya yang ada di database yang dikenali.
// ==============================================================================

import { analyzeText } from './textAnalyzer';
import type { KotobaItem, BunpouItem } from '../../types/content';
import type { TimedWord } from './wordTiming';

export interface CaptionLineInput {
  startMs: number;
  endMs: number;
  text: string;
  /** Waktu per kata bila sumbernya menyediakan (caption otomatis YouTube). */
  words?: TimedWord[];
  /** Terjemahan Indonesia bila ada (dari template JSON). */
  translation?: string;
}

export interface LineWord {
  item: KotobaItem;
  /** Bentuk tulis di baris (mis. 食べて untuk kamus 食べる). */
  surface: string;
  inflected: boolean;
  form?: string;
}

export interface LineGrammar {
  item: BunpouItem;
  matched: string;
  phrase: string;
}

export interface LineAnalysis {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
  words: LineWord[];
  grammar: LineGrammar[];
}

/** Satu entri kotoba/pola di seluruh video; `lines` = indeks baris tempat muncul (menaik). */
export interface TimedEntry<T> {
  item: T;
  /** Bentuk yang muncul di teks (unik). */
  forms: string[];
  lines: number[];
}

export interface CaptionAnalysis {
  perLine: LineAnalysis[];
  vocab: TimedEntry<KotobaItem>[];
  grammar: TimedEntry<BunpouItem>[];
}

export function analyzeCaptionLines(lines: readonly CaptionLineInput[]): CaptionAnalysis {
  const vocabMap = new Map<string, TimedEntry<KotobaItem>>();
  const grammarMap = new Map<string, TimedEntry<BunpouItem>>();

  const perLine = lines.map((line, index): LineAnalysis => {
    const words = new Map<string, LineWord>();
    const grammar = new Map<string, LineGrammar>();

    for (const s of analyzeText(line.text).sentences) {
      for (const w of s.words) {
        if (!words.has(w.item.id)) words.set(w.item.id, { item: w.item, surface: w.surface, inflected: w.inflected, form: w.form });
      }
      for (const g of s.grammar) {
        // Pola yang isinya hanya bentuk kamus sebuah kata di dalam kata itu (好き di 好きな, 出す, いない)
        // hampir selalu kata biasa, bukan pola.
        if (s.words.some(w => g.start >= w.start && g.end <= w.end && g.matched === w.item.word)) continue;
        if (!grammar.has(g.item.id)) grammar.set(g.item.id, { item: g.item, matched: g.matched, phrase: g.phrase });
      }
    }

    for (const w of words.values()) {
      const e = vocabMap.get(w.item.id) ?? { item: w.item, forms: [], lines: [] };
      if (!e.forms.includes(w.surface)) e.forms.push(w.surface);
      e.lines.push(index);
      vocabMap.set(w.item.id, e);
    }
    for (const g of grammar.values()) {
      const e = grammarMap.get(g.item.id) ?? { item: g.item, forms: [], lines: [] };
      if (!e.forms.includes(g.matched)) e.forms.push(g.matched);
      e.lines.push(index);
      grammarMap.set(g.item.id, e);
    }

    return { index, startMs: line.startMs, endMs: line.endMs, text: line.text, words: [...words.values()], grammar: [...grammar.values()] };
  });

  // Map menjaga urutan sisip = urutan kemunculan pertama di video.
  return { perLine, vocab: [...vocabMap.values()], grammar: [...grammarMap.values()] };
}

const MAX_GLOSS_CHARS = 28;
const KANJI_RE = /[一-龯㐀-䶿々]/;

/**
 * Arti singkat untuk satu kata berwaktu (mis. segmen ASR atau potongan perkiraan) dari hasil analisis baris.
 * Prioritas: bentuk tulis sama persis > kata berwaktu memuat bentuk tulis kamus (yang terpanjang) > kata berwaktu
 * hanya sebagian dari bentuk tulis yang lebih panjang (mis. 食べ dari 食べて; hanya untuk potongan yang memuat kanji, supaya
 * ない tidak ikut mendapat arti いない). Kata 1 huruf hanya cocok persis.
 */
export function glossForWord(text: string, words: readonly LineWord[]): string | null {
  const exact = words.find(w => w.surface === text);
  let hit = exact;
  if (!hit && text.length >= 2) {
    hit =
      [...words].filter(w => w.surface.length >= 2 && text.includes(w.surface)).sort((a, b) => b.surface.length - a.surface.length)[0] ??
      (KANJI_RE.test(text) ? [...words].filter(w => w.surface.includes(text)).sort((a, b) => a.surface.length - b.surface.length)[0] : undefined);
  }
  if (!hit) return null;
  const first = (hit.item.meaningId || '').split(/[;；,，／/]/)[0].trim();
  if (!first) return null;
  return first.length > MAX_GLOSS_CHARS ? `${first.slice(0, MAX_GLOSS_CHARS - 1)}…` : first;
}
