import { OFFICIAL_BOOKS } from '../data/officialBooks';
import type { OfficialBook } from '../types/books';
import { KANJI_DATABASE } from '../data/kanji';
import { KanjiItem } from '../types/content';
import { VerbItem, VERB_CONJUGATION_DATABASE, kotobaItemToVerbItem } from '../data/conjugationRules';
import { KOTOBA_DATABASE as kotobaDb } from '../data/kotoba';

const kotobaMap = kotobaDb as Record<string, any>;
const rawKotobaList = Object.values(kotobaMap);

// Quick character -> KanjiItem lookup map
const kanjiByCharCache = new Map<string, KanjiItem>();
for (const item of Object.values(KANJI_DATABASE || {})) {
  if (item && item.character) {
    kanjiByCharCache.set(item.character, item);
  }
}

const U_KANA_REGEX = /[うくぐすつぬぶむる]$/;
const NON_VERB_WORDS = new Set([
  '赤ん坊', 'お茶', 'ニュース', 'ペン', 'フォーク', 'フィルム', '黒', '台所', '花瓶', '葉書', '毎朝', '問題', '午後', '午前', '今晩', '昨夜', '今夜'
]);

export function isConjugatableKotoba(item: any): boolean {
  if (!item || !item.word) return false;
  const w = item.word.trim();
  if (NON_VERB_WORDS.has(w)) return false;
  const r = (item.reading || '').trim();
  const m = (item.meaningId || '').toLowerCase();

  // If already tagged verb
  if (item.wordType === 'verb' && (U_KANA_REGEX.test(w) || U_KANA_REGEX.test(r))) {
    if (!m.startsWith('bayi') && !m.startsWith('anak')) return true;
  }

  // Indonesian meaning verb prefixes / keywords:
  const isVerbMeaning =
    /^(mem|meng|men|me|ber|ter|di)[a-z]/i.test(item.meaningId || '') ||
    /\b(pergi|makan|minum|tidur|bangun|datang|pulang|masuk|keluar|beli|jual|baca|tulis|lihat|dengar|bicara|tanya|jawab|jalan|lari|berenang|naik|turun|tunggu|pakai|buka|tutup|nyala|mati|taruh|ambil|cuci|buat|masak|bantu|potong|kirim|pinjam|kembali)\b/i.test(item.meaningId || '');

  if (isVerbMeaning && (U_KANA_REGEX.test(w) || U_KANA_REGEX.test(r))) {
    if (w.length <= 7 && !w.endsWith('こと') && !w.endsWith('もの') && !w.endsWith('さん') && !w.endsWith('じん')) {
      return true;
    }
  }

  return false;
}

/**
 * Extract all playable KanjiItems for a specific template book
 */
export function getKanjiPoolForBook(bookId: string): KanjiItem[] {
  const book = OFFICIAL_BOOKS.find(b => b.id === bookId);
  if (!book) return [];

  const seenChars = new Set<string>();
  const pool: KanjiItem[] = [];

  for (const chapter of book.chapters) {
    for (const itemRef of chapter.items) {
      if (itemRef.category === 'kanji') {
        const direct = KANJI_DATABASE[itemRef.id] || kanjiByCharCache.get(itemRef.id);
        if (direct && direct.character && !seenChars.has(direct.character)) {
          seenChars.add(direct.character);
          pool.push(direct);
        }
      } else if (itemRef.category === 'kotoba') {
        const kt = kotobaMap[itemRef.id];
        if (kt && kt.word) {
          // Extract each kanji character from the vocabulary word
          for (const char of kt.word) {
            const kanji = kanjiByCharCache.get(char);
            if (kanji && kanji.character && !seenChars.has(kanji.character)) {
              seenChars.add(kanji.character);
              pool.push(kanji);
            }
          }
        }
      }
    }
  }

  return pool;
}

/**
 * Extract all playable vocabulary items for a specific template book
 */
export function getKotobaPoolForBook(bookId: string): any[] {
  const book = OFFICIAL_BOOKS.find(b => b.id === bookId);
  if (!book) return [];

  const targetIds = new Set<string>();
  for (const chapter of book.chapters) {
    for (const itemRef of chapter.items) {
      if (itemRef.category === 'kotoba') {
        targetIds.add(itemRef.id);
      }
    }
  }

  const pool: any[] = [];
  const seenWords = new Set<string>();

  for (const item of rawKotobaList) {
    if (item && item.id && targetIds.has(item.id)) {
      if (item.word && !seenWords.has(item.word)) {
        seenWords.add(item.word);
        pool.push(item);
      }
    }
  }

  // Fallback: if book items weren't found in rawKotobaList by ID, check by chapter directly
  if (pool.length === 0) {
    for (const chapter of book.chapters) {
      for (const itemRef of chapter.items) {
        const direct = kotobaMap[itemRef.id];
        if (direct && direct.word && !seenWords.has(direct.word)) {
          seenWords.add(direct.word);
          pool.push(direct);
        }
      }
    }
  }

  return pool;
}

/**
 * Extract all conjugatable verbs for a specific level
 */
export function getVerbsForLevel(level: string): VerbItem[] {
  const result: VerbItem[] = [];
  const seenKanji = new Set<string>();

  const poolKotoba = level === 'ALL'
    ? rawKotobaList
    : rawKotobaList.filter(k => k.jlpt === level || k.level === level);

  for (const item of poolKotoba) {
    if (isConjugatableKotoba(item)) {
      const verb = kotobaItemToVerbItem(item);
      if (verb && !seenKanji.has(verb.kanji)) {
        seenKanji.add(verb.kanji);
        result.push(verb);
      }
    }
  }

  // Merge matching preset verbs
  for (const pv of VERB_CONJUGATION_DATABASE) {
    if (!seenKanji.has(pv.kanji)) {
      if (level === 'ALL' || level === 'N5' || level === 'N4' || pv.romaji?.includes(level)) {
        seenKanji.add(pv.kanji);
        result.push(pv);
      }
    }
  }

  return result.length > 0 ? result : VERB_CONJUGATION_DATABASE;
}

/**
 * Extract all conjugatable verbs for a specific template book
 */
export function getVerbsForBook(bookId: string): VerbItem[] {
  const book = OFFICIAL_BOOKS.find(b => b.id === bookId);
  if (!book) return VERB_CONJUGATION_DATABASE;

  const result: VerbItem[] = [];
  const seenKanji = new Set<string>();

  for (const chapter of book.chapters) {
    for (const itemRef of chapter.items) {
      if (itemRef.category === 'kotoba') {
        const kt = kotobaMap[itemRef.id];
        if (kt && isConjugatableKotoba(kt)) {
          const verb = kotobaItemToVerbItem(kt);
          if (verb && !seenKanji.has(verb.kanji)) {
            seenKanji.add(verb.kanji);
            result.push(verb);
          }
        }
      }
    }
  }

  // If book has fewer than 4 verbs, supplement from that book's level
  if (result.length < 4) {
    const fallbackLevel = book.level === 'TEMATIK' || book.level === 'KANA' || book.level === 'Kaigo' ? 'N5' : book.level;
    const fallbackVerbs = getVerbsForLevel(fallbackLevel);
    for (const fb of fallbackVerbs) {
      if (!seenKanji.has(fb.kanji)) {
        seenKanji.add(fb.kanji);
        result.push(fb);
      }
    }
  }

  return result.length > 0 ? result : VERB_CONJUGATION_DATABASE;
}

/**
 * Get allowed conjugation form IDs for a level
 */
export function getConjugationFormsForLevel(level: string): string[] {
  if (level === 'N5') {
    return ['te', 'nai', 'ta', 'masu'];
  }
  if (level === 'N4') {
    return ['te', 'nai', 'ta', 'masu', 'potential', 'volitional', 'ba', 'tai', 'tara'];
  }
  if (level === 'N3') {
    return ['te', 'nai', 'ta', 'masu', 'potential', 'passive', 'causative', 'ba', 'volitional', 'tai', 'tara', 'imperative'];
  }
  return ['te', 'nai', 'ta', 'masu', 'potential', 'passive', 'causative', 'causative_passive', 'ba', 'volitional', 'tai', 'tara', 'imperative'];
}

/**
 * Calculate available kanji, kotoba, and verb counts for each template book
 */
export function getBookStatsMap(): Record<string, { kanjiCount: number; kotobaCount: number; verbCount: number }> {
  const stats: Record<string, { kanjiCount: number; kotobaCount: number; verbCount: number }> = {};
  for (const book of OFFICIAL_BOOKS) {
    const kanjiPool = getKanjiPoolForBook(book.id);
    const kotobaPool = getKotobaPoolForBook(book.id);
    const verbPool = getVerbsForBook(book.id);
    stats[book.id] = {
      kanjiCount: kanjiPool.length,
      kotobaCount: kotobaPool.length,
      verbCount: verbPool.length,
    };
  }
  return stats;
}
