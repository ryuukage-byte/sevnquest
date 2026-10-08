// ==============================================================================
// NIHONGO TOWER — MASTERY ENGINE & PROGRESSION TRACKER
// ==============================================================================

import { PlayerMastery, TowerPlayerProfile, MemoryState } from '../../types/tower';

/**
 * Calculates updated MemoryState using spaced repetition intervals and forgetting curve
 */
export function updateMemoryState(
  existing: MemoryState | undefined,
  isCorrect: boolean,
  currentFloor: number
): MemoryState {
  const introducedAt = existing?.introducedAt ?? currentFloor;
  const reviewCount = (existing?.reviewCount ?? 0) + 1;
  const lastCorrectAt = isCorrect ? currentFloor : (existing?.lastCorrectAt ?? currentFloor);

  // Spaced repetition interval expands on correct, resets/shrinks on mistake
  let intervalFloors = existing?.intervalFloors ?? 5;
  if (isCorrect) {
    intervalFloors = Math.min(100, Math.round(intervalFloors * 1.8) + 2);
  } else {
    intervalFloors = Math.max(3, Math.round(intervalFloors * 0.5));
  }

  // Forgetting rate (Ebbinghaus decay coefficient: 0.05 = sticky, 0.8 = rapid loss)
  let forgettingRate = existing?.forgettingRate ?? 0.3;
  if (isCorrect) {
    forgettingRate = Math.max(0.05, Number((forgettingRate * 0.85).toFixed(3)));
  } else {
    forgettingRate = Math.min(0.8, Number((forgettingRate * 1.4).toFixed(3)));
  }

  return {
    introducedAt,
    lastCorrectAt,
    lastReviewedAt: currentFloor,
    forgettingRate,
    reviewCount,
    intervalFloors
  };
}

/**
 * Calculates a 0-100 mastery score based on attempts, accuracy, recency, and memory state
 */
export function calculateMasteryScore(
  attempt: number,
  correct: number,
  lastSeenFloor: number,
  currentFloor: number,
  memoryState?: MemoryState
): number {
  if (attempt <= 0) return 0;

  // Base accuracy (0 - 100)
  const accuracy = Math.min(100, Math.max(0, (correct / attempt) * 100));

  // Confidence scaling based on sample size (needs at least 3 attempts to reach full confidence)
  const confidenceMultiplier = Math.min(1.0, attempt / 3);

  // Recency decay factor factoring in MemoryState forgetting curve
  const floorsSinceLastSeen = Math.max(0, currentFloor - lastSeenFloor);
  let decayFactor = 1.0;

  if (memoryState) {
    // Ebbinghaus exponential decay approximation over floor intervals
    const decayT = floorsSinceLastSeen / Math.max(1, memoryState.intervalFloors);
    decayFactor = Math.max(0.6, Math.exp(-memoryState.forgettingRate * decayT));
  } else if (floorsSinceLastSeen > 25) {
    const excess = floorsSinceLastSeen - 25;
    decayFactor = Math.max(0.75, 1.0 - (excess / 10) * 0.01);
  }

  const rawScore = accuracy * confidenceMultiplier * decayFactor;
  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

/**
 * Checks if a word is due for spiral review based on memory state or low accuracy
 */
export function isWordDueForReview(record: PlayerMastery, currentFloor: number): boolean {
  if (record.attempt === 0) return false;

  // Weak accuracy is immediately flagged
  const accuracy = record.correct / record.attempt;
  if (accuracy < 0.70 || record.masteryScore < 70) {
    return true;
  }

  // MemoryState interval check
  if (record.memoryState) {
    const floorsPassed = currentFloor - record.memoryState.lastReviewedAt;
    return floorsPassed >= record.memoryState.intervalFloors;
  }

  // Default spaced repetition interval based on mastery score
  const floorsSinceLastSeen = currentFloor - record.lastSeen;
  if (record.masteryScore >= 90) {
    return floorsSinceLastSeen >= 80;
  } else if (record.masteryScore >= 75) {
    return floorsSinceLastSeen >= 40;
  } else {
    return floorsSinceLastSeen >= 15;
  }
}

/**
 * Normalizes input profile from either TowerPlayerProfile or general PlayerStats
 */
export function extractPlayerWeaknesses(
  profile?: TowerPlayerProfile | any
): {
  weakWords: string[];
  weakGrammar: string[];
  weakKanji: string[];
  masteryMap: Record<string, PlayerMastery>;
} {
  const weakWords: string[] = [];
  const weakGrammar: string[] = [];
  const weakKanji: string[] = [];
  const masteryMap: Record<string, PlayerMastery> = {};

  if (!profile) {
    return { weakWords, weakGrammar, weakKanji, masteryMap };
  }

  // 1. Direct TowerPlayerProfile structure
  if (profile.weakVocabularyIds && Array.isArray(profile.weakVocabularyIds)) {
    weakWords.push(...profile.weakVocabularyIds);
  }
  if (profile.weakGrammarIds && Array.isArray(profile.weakGrammarIds)) {
    weakGrammar.push(...profile.weakGrammarIds);
  }
  if (profile.weakKanjiCharacters && Array.isArray(profile.weakKanjiCharacters)) {
    weakKanji.push(...profile.weakKanjiCharacters);
  }
  if (profile.masteryRecords && typeof profile.masteryRecords === 'object') {
    Object.assign(masteryMap, profile.masteryRecords);
  }

  // 2. Compatibility with existing RPG PlayerStats (itemMastery & errorHistory)
  if (profile.itemMastery && typeof profile.itemMastery === 'object') {
    for (const [itemId, record] of Object.entries<any>(profile.itemMastery)) {
      if (!record) continue;
      const score = record.masteryPercentage ?? 0;
      const attempts = record.attemptsCount ?? (record.quizCount || 0) + (record.writingCount || 0);
      const mistakes = record.mistakeCount ?? 0;
      const correct = Math.max(0, attempts - mistakes);

      // Map to PlayerMastery
      masteryMap[itemId] = {
        wordId: itemId,
        attempt: attempts,
        correct,
        lastSeen: profile.currentFloor || 1,
        masteryScore: score,
        category: record.category
      };

      // Categorize weakness
      if (score < 70 || mistakes > 1) {
        if (record.category === 'kotoba' || itemId.startsWith('kt_') || itemId.startsWith('v_')) {
          if (!weakWords.includes(itemId)) weakWords.push(itemId);
        } else if (record.category === 'bunpou' || itemId.startsWith('bp_') || itemId.includes('_n')) {
          if (!weakGrammar.includes(itemId)) weakGrammar.push(itemId);
        } else if (record.category === 'kanji' || itemId.startsWith('kj_')) {
          if (!weakKanji.includes(itemId)) weakKanji.push(itemId);
        }
      }
    }
  }

  // 3. Evaluate any records in masteryMap for low score or due status
  for (const [wordId, m] of Object.entries(masteryMap)) {
    // Hanya kosakata (atau record tanpa kategori); kanji/bunpou rawan sudah dikategorikan di atas.
    const isVocab = !m.category || m.category === 'kotoba';
    if (isVocab && m.masteryScore < 70 && !weakWords.includes(wordId)) {
      weakWords.push(wordId);
    }
  }

  return { weakWords, weakGrammar, weakKanji, masteryMap };
}

/**
 * Updates a player mastery record following a practice session or round
 */
export function updateMasteryRecord(
  existing: PlayerMastery | undefined,
  wordId: string,
  isCorrect: boolean,
  currentFloor: number
): PlayerMastery {
  const attempt = (existing?.attempt ?? 0) + 1;
  const correct = (existing?.correct ?? 0) + (isCorrect ? 1 : 0);
  const memoryState = updateMemoryState(existing?.memoryState, isCorrect, currentFloor);
  const masteryScore = calculateMasteryScore(
    attempt,
    correct,
    currentFloor,
    currentFloor,
    memoryState
  );

  return {
    wordId,
    attempt,
    correct,
    lastSeen: currentFloor,
    masteryScore,
    memoryState
  };
}

