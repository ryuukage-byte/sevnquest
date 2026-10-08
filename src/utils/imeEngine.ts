// ==============================================================================
// JAPANESE INPUT METHOD EDITOR (IME) & KANA-KANJI HENKAN ENGINE
// Provides real-time Romaji-to-Kana conversion, Kana-to-Kanji dictionary lookup,
// and candidate suggestions (Henkan) for typing and searching.
// ==============================================================================

import * as wanakana from 'wanakana';
import furiganaDictRaw from '../data/furiganaDictionary.json';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';

export interface HenkanCandidate {
  text: string;
  type: 'context' | 'kanji' | 'katakana' | 'hiragana' | 'romaji';
  label?: string;
  meaning?: string;
}

export interface DictItem {
  text: string;
  meaning?: string;
  type: 'kanji' | 'katakana' | 'context';
}

// Inverted dictionary built lazily on first access
let readingToDictionaryMap: Map<string, DictItem[]> | null = null;

function getReadingMap(): Map<string, DictItem[]> {
  if (readingToDictionaryMap) return readingToDictionaryMap;

  readingToDictionaryMap = new Map();

  const addEntry = (reading: string, text: string, meaning?: string, type: 'kanji' | 'katakana' | 'context' = 'kanji') => {
    if (!reading || !text) return;
    const cleanReading = reading.trim().toLowerCase();
    const cleanText = text.trim();
    if (!cleanReading || !cleanText) return;

    const existing = readingToDictionaryMap!.get(cleanReading) || [];
    if (!existing.some(x => x.text === cleanText)) {
      existing.push({ text: cleanText, meaning: meaning ? meaning.trim() : undefined, type });
      readingToDictionaryMap!.set(cleanReading, existing);
    }
  };

  // 1. Index KOTOBA_DATABASE (Words with meanings)
  if (KOTOBA_DATABASE) {
    for (const item of Object.values(KOTOBA_DATABASE)) {
      const word = item.word ? item.word.trim() : '';
      if (!word) continue;

      const reading = (item.reading ? item.reading.trim() : wanakana.toHiragana(word)).toLowerCase();
      const isKata = wanakana.isKatakana(word);
      const meaning = item.meaningId || item.meaningEn || '';

      // If word contains Kanji or Katakana, or is a meaningful vocabulary
      if (word !== reading || isKata) {
        // Clean word if it contains alternatives like "見る  観る"
        const cleanWord = word.split(/\s+/)[0];
        addEntry(reading, cleanWord, meaning, isKata ? 'katakana' : 'kanji');
      }
    }
  }

  // 2. Index KANJI_DATABASE (Characters with Kunyomi & Onyomi)
  if (KANJI_DATABASE) {
    for (const k of Object.values(KANJI_DATABASE)) {
      if (!k.character) continue;
      const char = k.character.trim();
      const meaning = k.meaningId || k.meaningEn || '';

      // Kunyomi
      if (Array.isArray(k.kunyomi)) {
        for (const rawKun of k.kunyomi) {
          const cleanReading = rawKun.replace(/\s*\(.*?\)/g, '').replace(/[-.]/g, '').trim().toLowerCase();
          if (cleanReading) {
            addEntry(cleanReading, char, meaning, 'kanji');
          }
        }
      }

      // Onyomi
      if (Array.isArray(k.onyomi)) {
        for (const rawOn of k.onyomi) {
          const cleanOn = rawOn.replace(/\s*\(.*?\)/g, '').replace(/[-.]/g, '').trim().toLowerCase();
          if (cleanOn) {
            const hiraReading = wanakana.toHiragana(cleanOn).toLowerCase();
            addEntry(hiraReading, char, meaning, 'kanji');
          }
        }
      }
    }
  }

  // 3. Index furiganaDictionary.json as comprehensive fallback
  const words = (furiganaDictRaw as any).words || {};
  for (const [kanjiWord, reading] of Object.entries(words)) {
    if (typeof reading === 'string') {
      const cleanReading = reading.replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
      addEntry(cleanReading, kanjiWord, undefined, 'kanji');
    }
  }

  const kanji = (furiganaDictRaw as any).kanji || {};
  for (const [kChar, reading] of Object.entries(kanji)) {
    if (typeof reading === 'string') {
      const cleanReading = reading.replace(/[-]/g, '').trim().toLowerCase();
      addEntry(cleanReading, kChar, undefined, 'kanji');
    }
  }

  return readingToDictionaryMap;
}

/**
 * Converts romaji to hiragana in real-time as user types.
 * Retains punctuation, spaces, and existing Japanese characters.
 */
export function convertRomajiToKana(text: string): string {
  if (!text) return '';
  return wanakana.toHiragana(text, { IMEMode: true });
}

/**
 * Gets conversion (Henkan) candidates for a given input query.
 * Prioritizes:
 * 1. Contextual words (e.g. from current challenge)
 * 2. Database Kanji & Kotoba matches (with Indonesian meanings)
 * 3. Katakana form (e.g. てれび -> テレビ)
 * 4. Hiragana form
 * 5. Romaji form
 */
export function getHenkanCandidates(query: string, contextWords: string[] = []): HenkanCandidate[] {
  if (!query || !query.trim()) return [];

  const raw = query.trim();
  const kana = wanakana.toHiragana(raw, { IMEMode: true });
  const katakana = wanakana.toKatakana(kana);
  const romaji = wanakana.toRomaji(kana);

  const candidates: HenkanCandidate[] = [];
  const added = new Set<string>();

  const addCandidate = (text: string, type: HenkanCandidate['type'], label?: string, meaning?: string) => {
    if (!text || added.has(text)) return;
    added.add(text);
    candidates.push({ text, type, label, meaning });
  };

  // 1. Context words from current exercise/view (highest priority!)
  for (const word of contextWords) {
    if (!word) continue;
    const wordReading = wanakana.toHiragana(word, { IMEMode: true });
    if (word === kana || wordReading === kana || word === raw || wordReading === raw) {
      addCandidate(word, 'context', 'Konteks');
    }
  }

  // 2. Database matches from Kotoba & Kanji
  const dict = getReadingMap();
  const directMatches = dict.get(kana) || [];
  for (const item of directMatches) {
    const label = item.type === 'katakana' 
      ? 'Katakana' 
      : (item.meaning ? item.meaning.slice(0, 20) : 'Kanji');
    addCandidate(item.text, item.type, label, item.meaning);
  }

  // 3. Particle helpers for single kana
  if (kana === 'わ') {
    addCandidate('は', 'hiragana', 'Partikel WA');
  } else if (kana === 'お') {
    addCandidate('を', 'hiragana', 'Partikel O');
  } else if (kana === 'え') {
    addCandidate('へ', 'hiragana', 'Partikel HE');
  }

  // 4. Katakana candidate (e.g. てれび -> テレビ, あめ -> アメ)
  if (katakana !== kana) {
    addCandidate(katakana, 'katakana', 'Katakana');
  }

  // 5. Hiragana candidate (the pure phonetic form)
  addCandidate(kana, 'hiragana', 'Hiragana');

  // 6. Romaji candidate (original alphabet)
  if (romaji && romaji !== raw.toLowerCase()) {
    addCandidate(romaji, 'romaji', 'Romaji');
  }

  return candidates;
}

export interface JapaneseQueryMatcher {
  q: string;
  qKana: string;
  qKata: string;
  matches: (targetFields: (string | undefined | null)[]) => boolean;
  matchesText: (text: string) => boolean;
}

// Single-query memoization cache to avoid recalculating wanakana thousands of times in loops
let lastQueryInput = '';
let lastQKana = '';
let lastQKata = '';

export function createJapaneseQueryMatcher(query: string): JapaneseQueryMatcher {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    return {
      q: '',
      qKana: '',
      qKata: '',
      matches: () => true,
      matchesText: () => true,
    };
  }

  if (q !== lastQueryInput) {
    lastQueryInput = q;
    lastQKana = wanakana.toHiragana(q, { IMEMode: true }).toLowerCase();
    lastQKata = wanakana.toKatakana(q).toLowerCase();
  }

  const qKana = lastQKana;
  const qKata = lastQKata;

  return {
    q,
    qKana,
    qKata,
    matches: (targetFields: (string | undefined | null)[]) => {
      for (const field of targetFields) {
        if (!field) continue;
        const f = field.toLowerCase();
        if (f.includes(q) || f.includes(qKana) || f.includes(qKata)) {
          return true;
        }
      }
      return false;
    },
    matchesText: (text: string) => {
      if (!text) return false;
      return text.includes(q) || text.includes(qKana) || text.includes(qKata);
    },
  };
}

/**
 * Searches and matches user query against Japanese item (handling Romaji, Hiragana, Katakana, Kanji).
 * Uses query cache to ensure sub-millisecond execution even when filtering 10,000+ items.
 */
export function matchJapaneseQuery(query: string, targetFields: (string | undefined | null)[]): boolean {
  if (!query || !query.trim()) return true;
  const matcher = createJapaneseQueryMatcher(query);
  return matcher.matches(targetFields);
}

