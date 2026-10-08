// Activity Tracking Types
export interface ActivityLog {
  total: number;
  uniqueIds: string[];
}

export interface StudyStatistics {
  questions: ActivityLog;
  flashcards: ActivityLog;
  kanjiWriting: ActivityLog;
  tryOuts: ActivityLog;
  dokkai: ActivityLog;
  choukai: ActivityLog;
  bunpou: ActivityLog;
  stages: ActivityLog;
  bossBattles: ActivityLog;
}

export const DEFAULT_NAMES = [
  'Wanderer', 'Ronin', 'Samurai', 'Kenshi', 'Ninja', 'Tabibito', 'Gakusei'
];

export interface PlayerStats {
  userId?: string; // Optional for backward compatibility, will be generated if missing
  playerName?: string;
  level: number;
  currentExp?: number;
  maxExp?: number;
  totalExp: number;
  tierIndex: number; // 0 to 9 (Tier 1 to Tier 10)
  
  // Base Attributes
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  str: number; // Strength (Boss battle damage multiplier)
  agi: number; // Agility (Combo multiplier & timer boosts)
  int: number; // Intelligence (EXP gain bonus percentage)
  vit: number; // Vitality (Max HP scaling)
  unallocatedPoints: number;

  // Economy & Progression
  gold: number;
  gems: number;
  streakDays: number;
  longestStreak?: number;
  totalActiveDays?: number;
  lastActiveDate: string; // YYYY-MM-DD
  
  // Real Study Activity & Time Tracking
  studyStats?: StudyStatistics;
  todayStudySeconds?: number;
  totalStudySeconds?: number;
  lastStudyDate?: string; // YYYY-MM-DD
  
  // Equipment & Customization
  characterGender?: 'male' | 'female';
  equippedTitle?: string;
  signature?: string;
  avatar?: string;
  selectedSkinId?: string;
  equippedSkin?: string;
  unlockedSkins?: string[];
  inventory: string[]; // item IDs

  // Stage & World Progression
  currentWorldId?: string; // 'world_n5' | 'world_n4' | 'world_n3' | 'world_n2' | 'world_n1'
  currentMapId: string;
  currentStageId: string;
  stageProgress?: Record<string, StageClearData>;

  // Tier Promotion Gate & Ascension System
  tierPromotionGated?: boolean;
  gatedReason?: string;
  targetTierIndex?: number;
  ascendedLevels?: ('N5' | 'N4' | 'N3' | 'N2' | 'N1')[];

  // Mastery Tracking & SRS
  itemMastery?: Record<string, import('./content').ItemMasteryRecord>;
  overallMasteryPercentage?: number; // True Japanese mastery (0-100%)
  languageProfile?: import('./content').LanguageProfile;
  errorHistory?: import('./content').ErrorPatternRecord[];
  categoryMastery?: {
    bunpou: number;
    kotoba: number;
    kanji: number;
    dokkai: number;
    choukai: number;
  };
  totalMasteredItems?: number;
  totalPerfectedItems?: number;
  recallQueue?: import('./content').RecallQueueItem[];

  // Sound & Preferences
  soundEnabled: boolean;
  theme?: 'dark' | 'light';
  speechRate?: number; // 0.8 to 1.2
  furiganaEnabled?: boolean;
  targetJlpt?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

  // User Pocket Decks (Buku Saku)
  userDecks?: UserDeck[];
}

export type DeckType = 'mixed' | 'flashcard' | 'writing' | 'kotoba' | 'kanji' | 'bunpou';
export type DeckItemCategory = 'kotoba' | 'kanji' | 'bunpou';

export interface CustomDeckItemPayload {
  word: string;
  reading?: string;
  meaning: string;
  exampleJp?: string;
  exampleReading?: string;
  exampleId?: string;
  level?: string;
}

export interface DeckItemRef {
  id: string; // Kotoba ID, Kanji character/ID, Bunpou ID, or unique generated ID
  category: DeckItemCategory;
  addedAt: string;
  notes?: string;
  customData?: CustomDeckItemPayload;
}

export interface UserDeck {
  id: string;
  title: string;
  description?: string;
  level?: string;
  type: DeckType;
  isDefault?: boolean; // True for default "Buku Saku Bookmark"
  coverIcon?: string;  // e.g. '🔖', '⚡', '✍️', '📖', '🎯', '🌸'
  createdAt: string;
  updatedAt: string;
  items: DeckItemRef[];
}

export interface StageClearData {
  stageId?: string;
  cleared: boolean;
  stars: number; // 1 to 3
  score?: number;
  clearedModules: ('bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss')[];
  lastPlayedAt?: string;
  clearedAt?: string;
}

export interface TierInfo {
  tier: number; // 1 to 10
  name: string;
  titleName: string;
  description: string;
  visualAssetDesc: string;
  baseColor: string;
  glowColor: string;
  requiredExpTotal: number;
  perks: string;
  iconName: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardExp: number;
  rewardGold: number;
  rewardGems?: number;
  completed: boolean;
  claimed: boolean;
  type: 'daily' | 'weekly';
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'streak' | 'general';
}
