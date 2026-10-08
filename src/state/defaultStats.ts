import { PlayerStats, DEFAULT_NAMES } from '../types/rpg';
import { ItemMasteryRecord } from '../types/content';
import { getTodayLocalDate } from '../utils/time';
import { createDefaultBookmarkDeck } from '../utils/decks';
import { buildSmartRecallQueue } from '../utils/mastery';
import { INITIAL_STUDY_STATS } from '../utils/activity';

// Seed initial item mastery for an authentic start
export const INITIAL_ITEM_MASTERY: Record<string, ItemMasteryRecord> = {};

export const DEFAULT_STATS: PlayerStats = {
  playerName: DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)],
  characterGender: 'male',
  level: 1,
  totalExp: 0,
  tierIndex: 0,
  hp: 110,
  maxHp: 110,
  mp: 45,
  maxMp: 45,
  str: 0,
  agi: 0,
  int: 0,
  vit: 0,
  unallocatedPoints: 0,
  gold: 0,
  gems: 0,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  todayStudySeconds: 0,
  totalStudySeconds: 0,
  lastStudyDate: getTodayLocalDate(),
  currentWorldId: 'world_training',
  currentMapId: 'map_kana_hiragana',
  currentStageId: 'stage_kana_hira_1',
  soundEnabled: true,
  theme: 'dark',
  equippedSkin: 'skin_default',
  inventory: ['pot_hp_small', 'scroll_exp_sm'],
  itemMastery: INITIAL_ITEM_MASTERY,
  recallQueue: buildSmartRecallQueue(INITIAL_ITEM_MASTERY),
  userDecks: [createDefaultBookmarkDeck()],
  studyStats: INITIAL_STUDY_STATS,
};
