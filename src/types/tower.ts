// ==============================================================================
// NIHONGO TOWER — PROGRESSION & FLOOR BLUEPRINT TYPES (TAHAP 1)
// ==============================================================================

/**
 * 1,000 Floor Tower Arcs representing the hero's linguistic journey
 */
export enum TowerArc {
  FOUNDATION = 'foundation',      // Lantai 1-100: Hiragana, Katakana, basic kanji, basic sentence
  ELEMENTARY = 'elementary',      // Lantai 101-300: N5 consolidation & N4
  INTERMEDIATE = 'intermediate',  // Lantai 301-600: N3 core fluency
  ADVANCED = 'advanced',          // Lantai 601-800: N2 nuanced expressions
  MASTER = 'master'               // Lantai 801-1000: N1 mastery & native synthesis
}

/**
 * JLPT Levels
 */
export enum JLPTLevel {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1'
}

/**
 * Vocabulary target within a floor blueprint
 */
export interface VocabularyTarget {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  source: 'new' | 'review';
  masteryRequired: number; // e.g. 80 (80% accuracy/mastery score)
}

/**
 * Kanji target within a floor blueprint
 */
export interface KanjiTarget {
  id?: string;
  kanji: string;
  onyomi: string[];
  kunyomi: string[];
  meaning: string;
  writingRequired: boolean;
}

/**
 * Grammar pattern target within a floor blueprint
 */
export interface GrammarTarget {
  id: string;
  pattern: string;
  jlpt: JLPTLevel;
  example: string;
  unlockedFloor: number;
}

/**
 * Conjugation Difficulty Tiers
 */
export enum ConjugationTier {
  BASIC = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3
}

/**
 * Conjugation rules mapped to their tier
 */
export const CONJUGATION_RULES: Record<ConjugationTier, string[]> = {
  [ConjugationTier.BASIC]: [
    'ます',
    'ない',
    'た',
    'て'
  ],
  [ConjugationTier.INTERMEDIATE]: [
    'たい',
    'ながら',
    'たことがある',
    'たら'
  ],
  [ConjugationTier.ADVANCED]: [
    '受身',
    '使役',
    '使役受身',
    'ば'
  ]
};

/**
 * Round phases available across the 1000 floors
 */
export enum RoundPhase {
  INSCRIPTION = 'inscription',       // Stroke canvas writing practice
  IDENTIFICATION = 'identification', // Tebak arti & bacaan kata/kanji
  ALCHEMY = 'alchemy',               // Verb & adjective conjugation
  SENTENCE = 'sentence',             // Bunpou / pattern application
  LISTENING = 'listening',           // Choukai audio recognition
  READING = 'reading',               // Dokkai reading comprehension
  PRODUCTION = 'production',         // Sentence assembly / word ordering
  
  // Special Boss Floor (every 100 floors) Diagnostic Phases:
  JLPT_VOCABULARY = 'jlpt_vocabulary',
  JLPT_GRAMMAR = 'jlpt_grammar',
  JLPT_READING = 'jlpt_reading',
  JLPT_LISTENING = 'jlpt_listening'
}

/**
 * Rewards granted upon clearing a floor
 */
export interface FloorReward {
  exp: number;
  gold: number;
  gems?: number;
  itemReward?: string;
  titleReward?: string;
}

/**
 * Memory state tracking Ebbinghaus forgetting curve & spaced repetition
 */
export interface MemoryState {
  introducedAt: number;     // Floor or timestamp first encountered
  lastCorrectAt: number;    // Floor or timestamp last answered correctly
  lastReviewedAt: number;   // Floor or timestamp last reviewed
  forgettingRate: number;   // 0.0 to 1.0 (Ebbinghaus decay coefficient)
  reviewCount: number;      // Total review occurrences
  intervalFloors: number;   // Spaced repetition interval in floors
}

/**
 * Individual item mastery record for spiral repetition
 */
export interface PlayerMastery {
  wordId: string;
  attempt: number;
  correct: number;
  lastSeen: number; // Floor number or epoch timestamp
  masteryScore: number; // 0 to 100
  /** Kategori materi dari itemMastery (kotoba/kanji/bunpou/...); dipakai gerbang boss agar tidak menebak dari awalan ID. */
  category?: string;
  memoryState?: MemoryState;
}

/**
 * Player progression profile input to the procedural generator
 */
export interface TowerPlayerProfile {
  userId?: string;
  currentFloor: number;
  highestFloorCleared: number;
  lives: number; // typically 3
  masteryRecords?: Record<string, PlayerMastery>;
  weakVocabularyIds?: string[];
  weakGrammarIds?: string[];
  weakKanjiCharacters?: string[];
  clearedFloors?: Record<number, { clearedAt: string; mistakes: number; score: number }>;
  activeStreak?: number;
  isTestMode?: boolean;
  bypassBossGate?: boolean;
}

/**
 * Core Tower Floor Blueprint generated procedurally per floor
 */
export interface TowerFloorBlueprint {
  floor: number;
  arc: TowerArc;
  jlptTarget: JLPTLevel;
  theme: string;
  difficulty: number; // 1.0 to 10.0 scale
  vocabulary: VocabularyTarget[];
  kanji: KanjiTarget[];
  grammar: GrammarTarget[];
  conjugationTier: ConjugationTier;
  rounds: RoundPhase[];
  reviewRatio: number; // 0.0 to 1.0 (e.g. 0.3 = 30% spiral review)
  reward: FloorReward;
  isCheckpoint: boolean; // Every 10 floors (restore HP, checkpoint save)
  isBossFloor: boolean;  // Every 100 floors (JLPT Trial Boss)
  isBossPreparation?: boolean; // Last 5 floors before a Boss floor (heavy synthesis)
  isReplay?: boolean;    // If the player is re-running an already cleared floor
  seed?: string;         // Deterministic seed for reproducible procedural generation
}

// ==============================================================================
// NIHONGO TOWER — STAGE 3: ROUND CONTRACT & STATE MACHINE TYPES
// ==============================================================================

/**
 * Tower State Machine states covering the entire floor lifecycle
 */
export enum TowerState {
  IDLE = 'IDLE',                       // Initial state before starting a floor
  FLOOR_ACTIVE = 'FLOOR_ACTIVE',       // Floor initialized and running
  ROUND_STARTED = 'ROUND_STARTED',     // Round initialized and ready for player input
  ROUND_ACTIVE = 'ROUND_ACTIVE',       // Player is currently interacting with the round
  ROUND_RESOLVING = 'ROUND_RESOLVING', // Evaluating player response / playing animation
  ROUND_RESULT = 'ROUND_RESULT',       // Displaying round score / feedback
  ROUND_COMPLETED = 'ROUND_COMPLETED', // Round finished successfully
  ROUND_FAILED = 'ROUND_FAILED',       // Round ended with failure/damage
  FLOOR_PAUSED = 'FLOOR_PAUSED',       // Floor paused by player
  FLOOR_CLEAR = 'FLOOR_CLEAR',         // All rounds conquered -> floor cleared!
  FLOOR_FAILED = 'FLOOR_FAILED'        // HP depleted to 0 -> floor attempt failed
}

/**
 * Detailed mistake item captured in a round
 */
export interface RoundMistake {
  targetId: string;
  expected: string;
  actual: string;
  reason?: string;
}

/**
 * Mastery delta calculated for a single item after a round
 */
export interface MasteryDelta {
  targetId: string;
  targetType: 'vocabulary' | 'kanji' | 'grammar';
  previousScore: number;
  newScore: number;
  delta: number;
  isCorrect: boolean;
}

/**
 * Standardized Round Result Contract
 * Tower Engine receives this unified contract from any Adapter (Canvas, Quiz, etc.)
 */
export interface RoundResult {
  roundIndex: number;
  phase: RoundPhase;
  score: number;            // 0 - 100 percentage
  correct: boolean;          // Passed threshold (e.g. >= 70%)
  mistakes: RoundMistake[] | string[];
  hpDamage: number;          // 0 if correct, > 0 if penalty
  timeSpentMs?: number;      // Duration spent in round
  masteryUpdates?: MasteryDelta[]; // Mastery score adjustments
  metadata?: Record<string, any>;  // Extra adapter-specific telemetry
}

// ------------------------------------------------------------------------------
// ROUND INPUT CONTRACTS (Tower Engine -> Round Orchestrator -> UI/Adapters)
// ------------------------------------------------------------------------------

/**
 * Dynamic difficulty parameters adjusting pressure, pacing, and distractor difficulty
 */
export interface RoundDifficulty {
  questionCount: number;
  timeLimitMs: number;       // in milliseconds (e.g. 30000 for 30s)
  accuracyRequired: number;  // passing accuracy percentage e.g. 70
  distractorLevel: number;   // 1 (basic) to 5 (subtle confusions)
}

export interface BaseRoundInput {
  roundIndex: number;
  phase: RoundPhase;
  floor: number;
  difficulty: number;
  difficultySettings?: RoundDifficulty;
}

export interface InscriptionRoundInput extends BaseRoundInput {
  phase: RoundPhase.INSCRIPTION;
  targetKanji: KanjiTarget;
  targets?: KanjiTarget[];
  prompt: string;
  minAccuracyScore: number; // e.g. 70
}

export interface IdentificationQuestion {
  targetId: string;
  questionType: 'reading' | 'meaning';
  prompt: string;
  options: string[];
  correctAnswer: string;
}

export interface IdentificationRoundInput extends BaseRoundInput {
  phase: RoundPhase.IDENTIFICATION;
  targets: VocabularyTarget[];
  questions: IdentificationQuestion[];
}

export interface AlchemyTarget {
  targetId: string;
  dictionaryForm: string;
  reading: string;
  ruleName: string;
  expectedConjugated: string;
  hiraganaPrompt: string;
  meaning: string;
}

export interface AlchemyRoundInput extends BaseRoundInput {
  phase: RoundPhase.ALCHEMY;
  tier: ConjugationTier;
  targets: AlchemyTarget[];
}

export interface SentenceExercise {
  prompt: string;
  englishMeaning?: string;
  scrambledSegments: string[];
  correctOrder: string[];
}

export interface SentenceRoundInput extends BaseRoundInput {
  phase: RoundPhase.SENTENCE;
  grammar: GrammarTarget;
  prompt: string;
  englishMeaning?: string;
  scrambledSegments: string[];
  correctOrder: string[];
  exercises?: SentenceExercise[];
}

export interface JLPTBossQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  contextText?: string;
  audioUrl?: string;
}

export interface JLPTRoundInput extends BaseRoundInput {
  phase:
    | RoundPhase.JLPT_VOCABULARY
    | RoundPhase.JLPT_GRAMMAR
    | RoundPhase.JLPT_READING
    | RoundPhase.JLPT_LISTENING;
  jlptLevel: JLPTLevel;
  questions: JLPTBossQuestion[];
}

export interface GenericRoundInput extends BaseRoundInput {
  title: string;
  description: string;
  payload: Record<string, any>;
}

export type RoundInput =
  | InscriptionRoundInput
  | IdentificationRoundInput
  | AlchemyRoundInput
  | SentenceRoundInput
  | JLPTRoundInput
  | GenericRoundInput;

// ------------------------------------------------------------------------------
// FLOOR COMPLETION & REWARD CONTRACTS
// ------------------------------------------------------------------------------

/**
 * Detailed report produced upon floor clear or fail
 */
export interface FloorCompletionReport {
  floor: number;
  status: 'CLEAR' | 'FAILED';
  roundsCompleted: number;
  totalRounds: number;
  hpRemaining: number;
  maxHp: number;
  baseReward: FloorReward;
  bonusExp: number;
  bonusGold: number;
  totalExp: number;
  totalGold: number;
  isFlawless: boolean;
  accuracy: number;
  totalTimeSpentMs: number;
  masteryGain: Record<string, number>;
  unlockedNextFloor: boolean;
  clearedAt: string;
}

/**
 * Serializable state for tower pause, resume, and checkpoint recovery
 */
export interface TowerCheckpointState {
  version: number;
  floor: number;
  seed: string;
  blueprint: TowerFloorBlueprint;
  state: TowerState;
  currentRoundIndex: number;
  hp: number;
  maxHp: number;
  roundResults: RoundResult[];
  startedAt: number;
  lastUpdatedAt: number;
}

// ------------------------------------------------------------------------------
// BOSS GATE & EVENT SYSTEM CONTRACTS (STAGE 4)
// ------------------------------------------------------------------------------

/**
 * Gate requirements to enter high-stakes Boss floors (every 100 floors)
 */
export interface BossGateRequirement {
  jlptLevel: JLPTLevel;
  minKanjiMastery: number;      // e.g. 70 (%)
  minGrammarMastery: number;    // e.g. 65 (%)
  minVocabularyMastery: number;  // e.g. 75 (%)
}

/**
 * Gate evaluation result detailing whether entry is granted or training is recommended
 */
export interface BossGateResult {
  canEnter: boolean;
  gateName: string;
  floor: number;
  requirements: BossGateRequirement;
  currentMastery: {
    kanji: number;
    grammar: number;
    vocabulary: number;
  };
  weaknesses: string[];
  recommendedFloors: [number, number]; // [startFloor, endFloor] e.g. [72, 80]
}

/**
 * Rich event notifications for UI animations, sound effects, and achievements
 */
export enum TowerEvent {
  FLOOR_START = 'FLOOR_START',
  ROUND_STARTED = 'ROUND_STARTED',
  ROUND_CLEAR = 'ROUND_CLEAR',
  ROUND_FAILED = 'ROUND_FAILED',
  PERFECT_ROUND = 'PERFECT_ROUND',
  HP_LOST = 'HP_LOST',
  SHIELD_ABSORBED = 'SHIELD_ABSORBED',
  COMBO_SHIELD_EARNED = 'COMBO_SHIELD_EARNED',
  BOSS_DEFEATED = 'BOSS_DEFEATED',
  TITLE_UNLOCKED = 'TITLE_UNLOCKED',
  GATE_LOCKED = 'GATE_LOCKED',
  FLOOR_CLEAR = 'FLOOR_CLEAR',
  FLOOR_FAILED = 'FLOOR_FAILED',
  CHECKPOINT_RESTORED = 'CHECKPOINT_RESTORED'
}


