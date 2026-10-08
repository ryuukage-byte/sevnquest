import { KOTOBA_DATABASE as kotobaDb } from '../data/kotoba';

export interface EnrichedRelatedWord {
  word: string;
  reading: string;
  meaningId: string;
  jlpt?: string;
}

const JLPT_RANK: Record<string, number> = {
  'N5': 1,
  'N4': 2,
  'N3': 3,
  'N2': 4,
  'N1': 5,
};

// In-memory cache to avoid recomputing on repeated renders
const enricherCache = new Map<string, EnrichedRelatedWord[]>();

function cleanText(str: string): string {
  return (str || '').replace(/^[・\s]+|[・\s]+$/g, '').trim();
}

/**
 * Returns an enriched, pedagogically ranked list of vocabulary words containing the specified Kanji.
 * High-priority words (N5/N4, common compound words like 先生, 先週, 学校, 大学) are prioritized.
 *
 * @param character The kanji character to look up (e.g. "先", "学")
 * @param initialWords Any existing relatedWords already attached to the kanji
 * @param maxWords Maximum number of words to return (default: 6)
 */
export function getEnrichedKanjiRelatedWords(
  character: string,
  initialWords?: Array<{ word: string; reading: string; meaningId: string; jlpt?: string }>,
  maxWords = 6
): EnrichedRelatedWord[] {
  if (!character) return [];

  // Check cache for this character and maxWords
  const cacheKey = `${character}_${maxWords}`;
  if (enricherCache.has(cacheKey) && (!initialWords || initialWords.length === 0)) {
    return enricherCache.get(cacheKey)!;
  }

  const rawInitial = initialWords || [];
  const existingSet = new Set(rawInitial.map(w => cleanText(w.word)));
  const candidates: Array<EnrichedRelatedWord & { length: number; startsWith: number }> = [];

  // Search through the full 8,600+ Kotoba database
  for (const item of Object.values(kotobaDb as Record<string, any>)) {
    if (!item.word || !item.word.includes(character) || !item.reading || !item.meaningId) {
      continue;
    }

    const cleanedWord = cleanText(item.word);
    if (existingSet.has(cleanedWord)) {
      continue;
    }

    candidates.push({
      word: cleanedWord,
      reading: cleanText(item.reading),
      meaningId: cleanText(item.meaningId),
      jlpt: item.jlpt || 'N5',
      length: cleanedWord.length,
      startsWith: cleanedWord.startsWith(character) ? 0 : 1,
    });
  }

  // Sort candidate vocabulary:
  // 1. JLPT Level (N5 first, then N4, N3, N2, N1)
  // 2. Starts with the kanji (e.g. 先生 before 勤め先)
  // 3. Shorter word length (concise 2-3 character compounds preferred)
  candidates.sort((a, b) => {
    const rankA = JLPT_RANK[a.jlpt || ''] || 99;
    const rankB = JLPT_RANK[b.jlpt || ''] || 99;
    if (rankA !== rankB) return rankA - rankB;
    if (a.startsWith !== b.startsWith) return a.startsWith - b.startsWith;
    return a.length - b.length;
  });

  // Combine initialWords with candidate words
  const combined: EnrichedRelatedWord[] = [...rawInitial];
  for (const c of candidates) {
    if (!combined.some(w => cleanText(w.word) === c.word)) {
      combined.push({
        word: c.word,
        reading: c.reading,
        meaningId: c.meaningId,
        jlpt: c.jlpt,
      });
    }
  }

  // Sort the combined list so essential, high-frequency words are always at the top
  combined.sort((a, b) => {
    const rankA = JLPT_RANK[a.jlpt || ''] || (a.word.length <= 2 ? 1 : 3);
    const rankB = JLPT_RANK[b.jlpt || ''] || (b.word.length <= 2 ? 1 : 3);
    if (rankA !== rankB) return rankA - rankB;

    const startsA = cleanText(a.word).startsWith(character) ? 0 : 1;
    const startsB = cleanText(b.word).startsWith(character) ? 0 : 1;
    if (startsA !== startsB) return startsA - startsB;

    return a.word.length - b.word.length;
  });

  const result = combined.slice(0, maxWords);

  if (!initialWords || initialWords.length === 0) {
    enricherCache.set(cacheKey, result);
  }

  return result;
}
