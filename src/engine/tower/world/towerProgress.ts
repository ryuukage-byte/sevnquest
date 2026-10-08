// ==============================================================================
// NIHONGO TOWER — PLAYER PROGRESSION & PERSISTENCE HELPER (STAGE 5)
// ==============================================================================

import { TowerPlayerProfile, PlayerMastery } from '../../../types/tower';
import { TowerAchievementManager } from './towerAchievements';
import { extractPlayerWeaknesses } from '../masteryEngine';

export interface TowerSavedProgress {
  currentFloor: number;
  highestFloorCleared: number;
  flawlessFloorCount: number;
  clearedFloors: Record<number, { clearedAt: string; mistakes: number; score: number }>;
}

const STORAGE_KEY = 'nq_tower_progression';

/**
 * Gerbang boss Tower (lantai 100, 200, …) menuntut rata-rata mastery kanji/tata bahasa/kosakata (lihat bossGate.ts).
 * false = gerbang selalu terbuka (mode uji, perilaku sebelumnya). Ubah ke true setelah ambang di
 * BOSS_GATE_REQUIREMENTS dikalibrasi terhadap data pemain nyata.
 */
export const TOWER_BOSS_GATE_ENFORCED = false;

const DEFAULT_PROGRESS: TowerSavedProgress = {
  currentFloor: 1,
  highestFloorCleared: 0,
  flawlessFloorCount: 0,
  clearedFloors: {}
};

/**
 * Loads persisted tower progress from local storage
 */
export function loadTowerProgress(): TowerSavedProgress {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_PROGRESS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      currentFloor: typeof parsed.currentFloor === 'number' ? parsed.currentFloor : 1,
      highestFloorCleared: typeof parsed.highestFloorCleared === 'number' ? parsed.highestFloorCleared : 0,
      flawlessFloorCount: typeof parsed.flawlessFloorCount === 'number' ? parsed.flawlessFloorCount : 0,
      clearedFloors: parsed.clearedFloors && typeof parsed.clearedFloors === 'object' ? parsed.clearedFloors : {}
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * Saves tower progress to local storage
 */
export function saveTowerProgress(progress: TowerSavedProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('[TowerProgress] Failed to save progress:', e);
  }
}

/**
 * Records completion of a tower floor and automatically updates achievements
 */
export function recordFloorClear(
  floor: number,
  score: number,
  mistakes: number
): TowerSavedProgress {
  const current = loadTowerProgress();
  const isFlawless = mistakes === 0;

  const updated: TowerSavedProgress = {
    ...current,
    clearedFloors: {
      ...current.clearedFloors,
      [floor]: {
        clearedAt: new Date().toISOString(),
        mistakes,
        score
      }
    },
    highestFloorCleared: Math.min(1000, Math.max(current.highestFloorCleared, floor)),
    currentFloor: Math.min(1000, Math.max(current.currentFloor, floor + 1)),
    flawlessFloorCount: isFlawless ? current.flawlessFloorCount + 1 : current.flawlessFloorCount
  };

  saveTowerProgress(updated);

  // Trigger achievement evaluations
  try {
    TowerAchievementManager.recordProgress('climb', floor);
    if (isFlawless) {
      TowerAchievementManager.recordProgress('flawless', 1);
    }
  } catch (err) {
    console.warn('[TowerProgress] Failed to evaluate achievements:', err);
  }

  return updated;
}

/**
 * Builds a complete TowerPlayerProfile for the floor generator
 * from the app's player stats and itemMastery database
 */
export function buildTowerPlayerProfile(
  stats?: any,
  itemMastery?: Record<string, any>
): TowerPlayerProfile {
  const progress = loadTowerProgress();
  const { weakWords, weakGrammar, weakKanji, masteryMap } = extractPlayerWeaknesses({
    itemMastery: itemMastery || stats?.itemMastery,
    currentFloor: progress.currentFloor
  });

  return {
    userId: stats?.userId,
    currentFloor: progress.currentFloor,
    highestFloorCleared: progress.highestFloorCleared,
    lives: 3,
    weakVocabularyIds: weakWords,
    weakGrammarIds: weakGrammar,
    weakKanjiCharacters: weakKanji,
    masteryRecords: masteryMap,
    clearedFloors: progress.clearedFloors,
    activeStreak: stats?.streakDays || 0,
    isTestMode: !TOWER_BOSS_GATE_ENFORCED,
    bypassBossGate: !TOWER_BOSS_GATE_ENFORCED
  };
}
