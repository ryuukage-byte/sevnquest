// ==============================================================================
// MENARA 2 — UTILITAS BERSAMA (kolam kata, helper tampilan, pemilih pengecoh)
// ==============================================================================

import { ChoiceQuestion, Room } from '../../engine/tower1/types';
import { hashString, seededShuffle } from '../../engine/tower1/jp';
import { KOTOBA_DATABASE } from '../kotoba';

export interface FloorContent {
  rooms: Room[];
  /** Soal pilihan ganda mandiri yang boleh dipakai ulang oleh ujian Penjaga. */
  bank: ChoiceQuestion[];
}

export const first = (s: string): string => (s ?? '').split(/\s*[/／、,;；]\s*/)[0].trim();
export const hasKanji = (s: string): boolean => /[一-龯々]/.test(s);
export const isKana = (s: string): boolean => /^[ぁ-んァ-ヶー]+$/.test(s);

/** "[漢字|かんじ]" bila ada kanji, selain itu teks apa adanya. */
export const rb = (word: string, reading: string): string => {
  const w = first(word);
  const r = first(reading);
  return hasKanji(w) && r && isKana(r) ? `[${w}|${r}]` : w;
};

export const plain = (text: string): string => text.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1');

/** Arti singkat: potongan pertama sebelum ";" atau " / ". */
export const shortMeaning = (m: string): string => {
  const s = (m ?? '').split(/\s*[;；]\s*/)[0].trim();
  return s.length > 56 ? `${s.slice(0, 54).trim()}…` : s;
};

/** true bila dua arti terlalu mirip (satu memuat yang lain atau kata pertamanya sama) sehingga tidak boleh jadi pengecoh. */
export const overlaps = (a: string, b: string): boolean => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.includes(y) || y.includes(x)) return true;
  const fx = x.split(/[\s,]+/)[0];
  const fy = y.split(/[\s,]+/)[0];
  return fx.length > 2 && fx === fy;
};

export const shuffle = <T,>(items: T[], key: string): T[] => seededShuffle(items, hashString(key));

/** Menyusun pilihan jawaban: jawaban benar + pengecoh unik, diacak deterministik. */
export function makeOptions(right: string, wrongs: string[], key: string, total = 4): { options: string[]; answer: number } {
  const seen = new Set<string>([right]);
  const picked: string[] = [];
  for (const w of wrongs) {
    if (!w || seen.has(w)) continue;
    seen.add(w);
    picked.push(w);
    if (picked.length === total - 1) break;
  }
  const options = shuffle([right, ...picked], key);
  return { options, answer: options.indexOf(right) };
}

export const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

// --------------------------------------------------------------------------
// Kolam kata (dari database Kotoba)
// --------------------------------------------------------------------------

export interface Word {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  type: string;
  jlpt: string;
  kanji: string[];
  ex?: { jp: string; id: string };
}

const SKIP_TYPES = new Set(['suffix', 'prefix', 'auxiliary', 'particle', 'counter', 'adjective-pn']);

let wordCache: Word[] | null = null;

/** Semua kata yang bacaannya kana murni dan artinya ada (tanpa duplikat entri). */
export function allWords(): Word[] {
  if (wordCache) return wordCache;
  const seen = new Set<string>();
  const out: Word[] = [];
  for (const item of Object.values(KOTOBA_DATABASE)) {
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    const word = first(item.word);
    const reading = first(item.reading || (hasKanji(word) ? '' : word));
    if (!word || !reading || !isKana(reading) || !item.meaningId) continue;
    if (SKIP_TYPES.has(item.wordType)) continue;
    out.push({
      id: item.id,
      word,
      reading,
      meaning: shortMeaning(item.meaningId),
      type: item.wordType,
      jlpt: item.jlpt,
      kanji: (item.kanjiComponents ?? []).filter(k => hasKanji(k)),
      ex: item.exampleSentence?.japanese ? { jp: item.exampleSentence.japanese, id: item.exampleSentence.meaningId } : undefined
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  wordCache = out;
  return out;
}

export const wordsOf = (level: string): Word[] => allWords().filter(w => w.jlpt === level);

/** Kata untuk lantai Kosakata ke-n: bagian ke-n dari kolam yang diacak dengan seed tetap. */
export function floorWords(level: 'N5' | 'N4', nth: number, perFloor: number): Word[] {
  // Kata dengan arti kembar atau sama persis dengan kata lain dibuang agar pilihan jawaban tidak ambigu.
  const pool = wordsOf(level);
  const meaningCount = new Map<string, number>();
  pool.forEach(w => meaningCount.set(w.meaning, (meaningCount.get(w.meaning) ?? 0) + 1));
  const clean = pool.filter(w => meaningCount.get(w.meaning) === 1 && Array.from(w.reading).length <= 10);
  const shuffled = shuffle(clean, `tower2:${level}`);
  return shuffled.slice((nth - 1) * perFloor, nth * perFloor);
}
