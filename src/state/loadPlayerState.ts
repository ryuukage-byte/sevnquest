import { v4 as uuidv4 } from 'uuid';
import { PlayerStats, StageClearData, Mission, DEFAULT_NAMES } from '../types/rpg';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import { ensureUserDecks, createDefaultBookmarkDeck } from '../utils/decks';
import { buildSmartRecallQueue } from '../utils/mastery';
import { INITIAL_STUDY_STATS } from '../utils/activity';
import { getTodayLocalDate } from '../utils/time';
import { DEFAULT_STATS, INITIAL_ITEM_MASTERY } from './defaultStats';
import { canonicalizeStats } from './canonicalizeStats';
import { applyLevelFromExp } from './derivedState';
import {
  STORAGE_KEY_STATS,
  STORAGE_KEY_STAGES,
  STORAGE_KEY_DAILY,
  STORAGE_KEY_WEEKLY,
  STORAGE_KEY_SIGNATURE,
} from './storageKeys';

/** Muat PlayerStats dari localStorage (migrasi/validasi + ID kanonik) atau buat state baru. */
export function loadInitialStats(): PlayerStats {
  return applyLevelFromExp(canonicalizeStats(loadInitialStatsRaw())).stats;
}

function loadInitialStatsRaw(): PlayerStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATS);
    if (saved) {
      const parsed = JSON.parse(saved);

      const loadedMastery = parsed.itemMastery || INITIAL_ITEM_MASTERY;
      
      // Migrate old default name to random name
      let loadedName = parsed.playerName;
      if (!loadedName || loadedName === 'Pemilik WebApp') {
        loadedName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
      }

      const todayStr = getTodayLocalDate();
      const loadedTodaySeconds = (parsed.lastStudyDate === todayStr) ? (parsed.todayStudySeconds || 0) : 0;

      return {
        ...DEFAULT_STATS,
        ...parsed,
        totalExp: Math.round(Number(parsed.totalExp) || 0),
        level: Math.round(Number(parsed.level) || 1),
        gold: Math.round(Number(parsed.gold) || 0),
        gems: Math.round(Number(parsed.gems) || 0),
        playerName: loadedName,
        signature: parsed.signature || localStorage.getItem(STORAGE_KEY_SIGNATURE) || '',
        itemMastery: loadedMastery,
        recallQueue: (() => {
          try {
            return buildSmartRecallQueue(loadedMastery);
          } catch (e) {
            console.warn('Failed to build initial recall queue', e);
            return [];
          }
        })(),
        userId: parsed.userId || uuidv4(),
        todayStudySeconds: loadedTodaySeconds,
        totalStudySeconds: parsed.totalStudySeconds || 0,
        lastStudyDate: todayStr,
        userDecks: ensureUserDecks(parsed.userDecks),
        studyStats: {
          ...INITIAL_STUDY_STATS,
          ...(parsed.studyStats || {}),
        },
      };
    }
    return { ...DEFAULT_STATS, userId: uuidv4(), lastStudyDate: getTodayLocalDate(), userDecks: [createDefaultBookmarkDeck()] };
  } catch {
    return { ...DEFAULT_STATS, userId: uuidv4(), lastStudyDate: getTodayLocalDate(), userDecks: [createDefaultBookmarkDeck()] };
  }
}

/** Muat progres stage dari localStorage. */
export function loadStageProgress(): Record<string, StageClearData> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STAGES);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function loadMissions(key: string, fallback: Mission[]): Mission[] {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export const loadDailyMissions = () => loadMissions(STORAGE_KEY_DAILY, INITIAL_DAILY_MISSIONS);
export const loadWeeklyMissions = () => loadMissions(STORAGE_KEY_WEEKLY, INITIAL_WEEKLY_MISSIONS);
