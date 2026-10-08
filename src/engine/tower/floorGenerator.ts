// ==============================================================================
// NIHONGO TOWER — PROCEDURAL FLOOR BLUEPRINT GENERATOR (TAHAP 2)
// ==============================================================================

import {
  TowerFloorBlueprint,
  TowerArc,
  JLPTLevel,
  VocabularyTarget,
  KanjiTarget,
  GrammarTarget,
  ConjugationTier,
  RoundPhase,
  FloorReward,
  TowerPlayerProfile
} from '../../types/tower';
import { extractPlayerWeaknesses } from './masteryEngine';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KANJI_DATABASE } from '../../data/kanji';
import { KotobaItem, BunpouItem, KanjiItem } from '../../types/content';
import { FOUNDATION_FLOORS_DATA } from './foundationFloorsData';

// ------------------------------------------------------------------------------
// IN-MEMORY INDEX POOLS (Cached once for sub-millisecond retrieval)
// ------------------------------------------------------------------------------

let kotobaPoolsByLevel: Record<JLPTLevel, KotobaItem[]> | null = null;
let bunpouPoolsByLevel: Record<JLPTLevel, BunpouItem[]> | null = null;
let kanjiPoolsByLevel: Record<JLPTLevel, KanjiItem[]> | null = null;

function normalizeJLPTLevel(levelStr?: string): JLPTLevel {
  if (!levelStr) return JLPTLevel.N5;
  const upper = levelStr.toUpperCase();
  if (upper.includes('N1')) return JLPTLevel.N1;
  if (upper.includes('N2')) return JLPTLevel.N2;
  if (upper.includes('N3')) return JLPTLevel.N3;
  if (upper.includes('N4')) return JLPTLevel.N4;
  return JLPTLevel.N5;
}

function initializePools() {
  if (kotobaPoolsByLevel && bunpouPoolsByLevel && kanjiPoolsByLevel) return;

  kotobaPoolsByLevel = {
    [JLPTLevel.N5]: [],
    [JLPTLevel.N4]: [],
    [JLPTLevel.N3]: [],
    [JLPTLevel.N2]: [],
    [JLPTLevel.N1]: []
  };

  bunpouPoolsByLevel = {
    [JLPTLevel.N5]: [],
    [JLPTLevel.N4]: [],
    [JLPTLevel.N3]: [],
    [JLPTLevel.N2]: [],
    [JLPTLevel.N1]: []
  };

  kanjiPoolsByLevel = {
    [JLPTLevel.N5]: [],
    [JLPTLevel.N4]: [],
    [JLPTLevel.N3]: [],
    [JLPTLevel.N2]: [],
    [JLPTLevel.N1]: []
  };

  // 1. Index Kotoba
  for (const item of Object.values(KOTOBA_DATABASE)) {
    const lvl = normalizeJLPTLevel(item.jlpt);
    kotobaPoolsByLevel[lvl].push(item);
  }

  // 2. Index Bunpou
  for (const item of Object.values(BUNPOU_DATABASE)) {
    const lvl = normalizeJLPTLevel(item.level || item.baseLevel);
    bunpouPoolsByLevel[lvl].push(item);
  }

  // 3. Index Kanji (Strict CJK Ideographs only, deduplicated)
  const seenKanjiChars = new Set<string>();
  for (const item of Object.values(KANJI_DATABASE)) {
    if (!item.character) continue;
    const code = item.character.charCodeAt(0);
    // Only accept genuine CJK Kanji (Unicode 4E00 - 9FAF)
    if (code < 0x4e00 || code > 0x9faf) continue;
    if (seenKanjiChars.has(item.character)) continue;
    seenKanjiChars.add(item.character);
    const lvl = normalizeJLPTLevel(item.jlpt);
    kanjiPoolsByLevel[lvl].push(item);
  }
}

// ------------------------------------------------------------------------------
// DETERMINISTIC PRNG UTILITIES (Floor Seed Foundation)
// ------------------------------------------------------------------------------

/**
 * 32-bit FNV-1a hash algorithm converting string seeds into numeric states
 */
export function hashSeed(seedStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * High-performance Mulberry32 PRNG
 * Produces deterministic pseudo-random floats in [0, 1) based on a string seed
 */
export function createPrng(seedStr: string): () => number {
  let s = hashSeed(seedStr);
  return function mulberry32(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates array shuffler using seeded PRNG
 */
export function seededShuffle<T>(array: T[], prng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ------------------------------------------------------------------------------
// CORE CALCULATORS (Pure algorithmic helpers)
// ------------------------------------------------------------------------------

/**
 * Calculates the Tower Arc for any floor 1-1000
 */
export function calculateArc(floor: number): TowerArc {
  if (floor <= 100) return TowerArc.FOUNDATION;
  if (floor <= 300) return TowerArc.ELEMENTARY;
  if (floor <= 600) return TowerArc.INTERMEDIATE;
  if (floor <= 800) return TowerArc.ADVANCED;
  return TowerArc.MASTER;
}

/**
 * Calculates the JLPT level progression
 */
export function calculateJLPT(floor: number): JLPTLevel {
  if (floor <= 180) return JLPTLevel.N5;
  if (floor <= 300) return JLPTLevel.N4;
  if (floor <= 600) return JLPTLevel.N3;
  if (floor <= 800) return JLPTLevel.N2;
  return JLPTLevel.N1;
}

/**
 * Calculates conjugation difficulty tier (1: Basic, 2: Intermediate, 3: Advanced)
 */
export function calculateConjugationTier(floor: number): ConjugationTier {
  if (floor <= 180) return ConjugationTier.BASIC;
  if (floor <= 550) return ConjugationTier.INTERMEDIATE;
  return ConjugationTier.ADVANCED;
}

/**
 * Calculates spiral review ratio for the floor (0.0 to 1.0)
 */
export function calculateReview(floor: number): number {
  if (floor <= 5) return 0; // Pure introduction
  if (floor % 100 === 0) return 1.0; // Boss floor: 100% comprehensive evaluation
  if (floor % 100 >= 95) return 0.50; // Boss prep floors: 50% synthesis review
  if (floor <= 20) return 0.20; // Early spiral review
  return 0.30; // Standard 70% new, 30% review
}

/**
 * Generates dynamic, rotating round phases that adapt per Arc
 */
export function generateRounds(floor: number, arc: TowerArc): RoundPhase[] {
  // Every 100 floors is a JLPT Trial Boss Floor
  if (floor % 100 === 0) {
    return [
      RoundPhase.JLPT_VOCABULARY,
      RoundPhase.JLPT_GRAMMAR,
      RoundPhase.JLPT_READING,
      RoundPhase.JLPT_LISTENING
    ];
  }

  // Pre-Boss Preparation Floors (floors 95-99, 195-199, etc.)
  if (floor % 100 >= 95) {
    return [
      RoundPhase.IDENTIFICATION,
      RoundPhase.ALCHEMY,
      RoundPhase.READING,
      RoundPhase.LISTENING
    ];
  }

  // Dynamic round distribution per Arc to avoid repetitive 4-round fatigue:
  switch (arc) {
    case TowerArc.FOUNDATION: {
      // Floors 1-100: Heavy writing and recognition fundamentals
      const variant = floor % 3;
      if (floor <= 10) {
        return [
          RoundPhase.INSCRIPTION,
          RoundPhase.IDENTIFICATION,
          RoundPhase.ALCHEMY,
          RoundPhase.SENTENCE
        ];
      }
      if (variant === 0) {
        return [
          RoundPhase.INSCRIPTION,
          RoundPhase.IDENTIFICATION,
          RoundPhase.ALCHEMY,
          RoundPhase.SENTENCE
        ];
      } else if (variant === 1) {
        return [
          RoundPhase.IDENTIFICATION,
          RoundPhase.ALCHEMY,
          RoundPhase.SENTENCE,
          RoundPhase.LISTENING
        ];
      } else {
        return [
          RoundPhase.INSCRIPTION,
          RoundPhase.IDENTIFICATION,
          RoundPhase.SENTENCE,
          RoundPhase.PRODUCTION
        ];
      }
    }

    case TowerArc.ELEMENTARY: {
      // Floors 101-300: N5-N4 rotation introducing reading & listening
      const variant = floor % 3;
      if (variant === 0) {
        return [
          RoundPhase.IDENTIFICATION,
          RoundPhase.ALCHEMY,
          RoundPhase.SENTENCE,
          RoundPhase.READING
        ];
      } else if (variant === 1) {
        return [
          RoundPhase.INSCRIPTION,
          RoundPhase.IDENTIFICATION,
          RoundPhase.ALCHEMY,
          RoundPhase.LISTENING
        ];
      } else {
        return [
          RoundPhase.IDENTIFICATION,
          RoundPhase.SENTENCE,
          RoundPhase.READING,
          RoundPhase.PRODUCTION
        ];
      }
    }

    case TowerArc.INTERMEDIATE: {
      // Floors 301-600: N3 balance of reading, listening, and production
      const variant = floor % 4;
      if (variant === 0) {
        return [
          RoundPhase.IDENTIFICATION,
          RoundPhase.ALCHEMY,
          RoundPhase.READING,
          RoundPhase.PRODUCTION
        ];
      } else if (variant === 1) {
        return [
          RoundPhase.LISTENING,
          RoundPhase.READING,
          RoundPhase.ALCHEMY,
          RoundPhase.PRODUCTION
        ];
      } else if (variant === 2) {
        return [
          RoundPhase.INSCRIPTION,
          RoundPhase.ALCHEMY,
          RoundPhase.SENTENCE,
          RoundPhase.READING
        ];
      } else {
        return [
          RoundPhase.IDENTIFICATION,
          RoundPhase.SENTENCE,
          RoundPhase.READING,
          RoundPhase.PRODUCTION
        ];
      }
    }

    case TowerArc.ADVANCED: {
      // Floors 601-800: N2 high-speed reading, nuanced conditionals, listening
      const variant = floor % 3;
      if (variant === 0) {
        return [
          RoundPhase.READING,
          RoundPhase.LISTENING,
          RoundPhase.ALCHEMY,
          RoundPhase.PRODUCTION
        ];
      } else if (variant === 1) {
        return [
          RoundPhase.IDENTIFICATION,
          RoundPhase.READING,
          RoundPhase.SENTENCE,
          RoundPhase.PRODUCTION
        ];
      } else {
        return [
          RoundPhase.LISTENING,
          RoundPhase.ALCHEMY,
          RoundPhase.READING,
          RoundPhase.PRODUCTION
        ];
      }
    }

    case TowerArc.MASTER: {
      // Floors 801-1000: N1 native synthesis and complex production
      const variant = floor % 2;
      if (variant === 0) {
        return [
          RoundPhase.READING,
          RoundPhase.LISTENING,
          RoundPhase.ALCHEMY,
          RoundPhase.PRODUCTION
        ];
      } else {
        return [
          RoundPhase.READING,
          RoundPhase.SENTENCE,
          RoundPhase.LISTENING,
          RoundPhase.PRODUCTION
        ];
      }
    }
  }
}

/**
 * Generates an evocative, aesthetic theme name for each floor
 */
export function generateTheme(floor: number, arc: TowerArc, jlpt: JLPTLevel): string {
  if (floor === 1) return 'Basic Identity (初めの門)';
  if (floor === 10) return 'Resting Pavilion: First Steps & Greetings';
  if (floor === 100) return 'Trial of the Tenjin: N5 Grand Exam';
  if (floor === 200) return 'The Ronin Bridge: N4 Midpoint Crucible';
  if (floor === 300) return 'Samurai Gate: N4 Grand Exam';
  if (floor === 500) return 'Chamber of Five Rings: N3 Midpoint Crucible';
  if (floor === 600) return 'Intermediate Horizon: N3 Grand Exam';
  if (floor === 800) return "The Dragon's Ascent: N2 Grand Exam";
  if (floor === 1000) return "Apex of the Tengu: The Grand Master's Enlightenment";

  if (floor % 100 >= 95) {
    return `Sanctum of Preparation: ${jlpt} Final Synthesis`;
  }
  if (floor % 10 === 0) {
    return `Resting Pavilion (Lantai ${floor}) - Checkpoint`;
  }

  // Curated progression themes
  const baseThemes: Record<TowerArc, string[]> = {
    [TowerArc.FOUNDATION]: [
      'Basic Identity',
      'Daily Verbs & Motions',
      'Objects & Directions',
      'Numbers & Counters',
      'Desires & Requests',
      'Past Experiences',
      'Polite Inquiries',
      'Time & Calendar'
    ],
    [TowerArc.ELEMENTARY]: [
      'Giving & Receiving',
      'Conditional Pathways',
      'Conjectures & Predictions',
      'Causative Whispers',
      'Simultaneous Actions',
      'Expressions of Obligation',
      'Potential Capabilities',
      'Adverbial Modifiers'
    ],
    [TowerArc.INTERMEDIATE]: [
      'Spoken Nuances & Contractions',
      'Adversative Passives',
      'Hypothetical Scenarios',
      'Changes of State & Habit',
      'Judgments & Assertions',
      'Similes & Resemblance',
      'Emphatic Restrictions',
      'Unintended Consequences'
    ],
    [TowerArc.ADVANCED]: [
      'Formal Contexts & Keigo',
      'Contrasting Perspectives',
      'Tendencies & Inclinations',
      'Pretexts & Justifications',
      'Temporal Extremes',
      'Discursive Arguments',
      'Emotional Evocations',
      'Unavoidable Natural Laws'
    ],
    [TowerArc.MASTER]: [
      'Classical Syntheses',
      'Rhetorical Flourishes',
      'Extreme Metaphors',
      'Philosophical Concessions',
      'Absolute Affirmations',
      'Arcane Nuances',
      'Sublime Poetics',
      'Unified Mastery'
    ]
  };

  const pool = baseThemes[arc];
  const themeName = pool[(floor - 1) % pool.length];
  return `${themeName} (F.${floor})`;
}

/**
 * Selects 5-7 vocabulary targets with adaptive spiral review
 */
export function selectVocabulary(
  floor: number,
  jlpt: JLPTLevel,
  reviewRatio: number,
  playerProfile?: TowerPlayerProfile | any,
  prng?: () => number
): VocabularyTarget[] {
  initializePools();
  const pool = kotobaPoolsByLevel![jlpt] || kotobaPoolsByLevel![JLPTLevel.N5];
  const targets: VocabularyTarget[] = [];
  const selectedWordIds = new Set<string>();

  // Determine total words per floor (5 in early, up to 7 in higher floors)
  const totalWords = floor <= 20 ? 5 : floor <= 300 ? 6 : 7;
  const reviewCount = Math.min(totalWords - 2, Math.round(totalWords * reviewRatio));

  // 1. ADAPTIVE REVIEW SELECTION (Prioritizes player weaknesses!)
  const { weakWords } = extractPlayerWeaknesses(playerProfile);

  // First, pull any matching weak words the player struggled with
  for (const wordKey of weakWords) {
    if (targets.length >= reviewCount) break;
    // Find in KOTOBA_DATABASE
    const found = KOTOBA_DATABASE[wordKey] || Object.values(KOTOBA_DATABASE).find(k => k.word === wordKey || k.reading === wordKey);
    if (found && !selectedWordIds.has(found.id)) {
      selectedWordIds.add(found.id);
      targets.push({
        id: found.id,
        word: found.word,
        reading: found.reading,
        meaning: found.meaningId || found.meaningEn || 'Arti kosakata',
        source: 'review',
        masteryRequired: 80
      });
    }
  }

  // Second, if review slots still remain, deterministically spiral review earlier words in this level
  if (targets.length < reviewCount && floor > 5) {
    const spiralBack = Math.max(1, floor - 10);
    const startIdx = prng ? Math.floor(prng() * pool.length) : (spiralBack * 5) % pool.length;
    for (let i = 0; i < pool.length && targets.length < reviewCount; i++) {
      const candidateIndex = (startIdx + i * 7) % pool.length;
      const candidate = pool[candidateIndex];
      if (candidate && !selectedWordIds.has(candidate.id)) {
        selectedWordIds.add(candidate.id);
        targets.push({
          id: candidate.id,
          word: candidate.word,
          reading: candidate.reading,
          meaning: candidate.meaningId || candidate.meaningEn || 'Arti kosakata',
          source: 'review',
          masteryRequired: 80
        });
      }
    }
  }

  // 2. NEW VOCABULARY SELECTION
  // Deterministic seed / prng based offset
  const baseOffset = prng ? Math.floor(prng() * pool.length) : (floor * 5) % Math.max(1, pool.length);
  for (let i = 0; i < pool.length && targets.length < totalWords; i++) {
    const idx = (baseOffset + i) % pool.length;
    const item = pool[idx];
    if (item && !selectedWordIds.has(item.id)) {
      selectedWordIds.add(item.id);
      targets.push({
        id: item.id,
        word: item.word,
        reading: item.reading,
        meaning: item.meaningId || item.meaningEn || 'Arti kosakata',
        source: 'new',
        masteryRequired: 70
      });
    }
  }

  // Fallback if pool is exhausted or empty
  if (targets.length === 0) {
    targets.push({
      id: 'default_v1',
      word: '食べる',
      reading: 'たべる',
      meaning: 'makan',
      source: 'new',
      masteryRequired: 70
    });
  }

  return targets;
}

/**
 * Selects 1-2 grammar targets for the floor
 */
export function selectGrammar(
  floor: number,
  jlpt: JLPTLevel,
  playerProfile?: TowerPlayerProfile | any,
  prng?: () => number
): GrammarTarget[] {
  initializePools();
  const pool = bunpouPoolsByLevel![jlpt] || bunpouPoolsByLevel![JLPTLevel.N5];
  const targets: GrammarTarget[] = [];
  const selectedIds = new Set<string>();

  // 1. Check if player has weak grammar in this JLPT tier
  const { weakGrammar } = extractPlayerWeaknesses(playerProfile);
  for (const gId of weakGrammar) {
    if (targets.length >= 1) break;
    const found = pool.find(b => b.id === gId || b.title.includes(gId));
    if (found && !selectedIds.has(found.id)) {
      selectedIds.add(found.id);
      const ex = found.examples?.[0];
      targets.push({
        id: found.id,
        pattern: found.title,
        jlpt,
        example: ex ? ex.japanese : found.formula || found.title,
        unlockedFloor: floor
      });
    }
  }

  // 2. Deterministic grammar selection from pool
  const count = floor % 5 === 0 ? 2 : 1;
  const offset = prng ? Math.floor(prng() * pool.length) : floor % Math.max(1, pool.length);

  for (let i = 0; i < pool.length && targets.length < count; i++) {
    const idx = (offset + i) % pool.length;
    const item = pool[idx];
    if (item && !selectedIds.has(item.id)) {
      selectedIds.add(item.id);
      const ex = item.examples?.[0];
      targets.push({
        id: item.id,
        pattern: item.title,
        jlpt,
        example: ex ? ex.japanese : item.formula || item.title,
        unlockedFloor: floor
      });
    }
  }

  // Fallback
  if (targets.length === 0) {
    targets.push({
      id: 'bp_default_1',
      pattern: '〜です / 〜だ',
      jlpt: JLPTLevel.N5,
      example: '私は学生です。',
      unlockedFloor: 1
    });
  }

  return targets;
}

/**
 * Selects 2-3 kanji targets for the floor
 */
export function selectKanji(
  floor: number,
  jlpt: JLPTLevel,
  arc: TowerArc,
  playerProfile?: TowerPlayerProfile | any,
  writingRequired = true,
  prng?: () => number
): KanjiTarget[] {
  initializePools();
  let pool = kanjiPoolsByLevel![jlpt] || kanjiPoolsByLevel![JLPTLevel.N5];

  // Foundation calibration: For early floors (floors 1-30), calibrate by stroke complexity
  // so Floor 1-10 starts with foundational 1-4 stroke kanji (e.g. 一, 二, 三, 日, 月, 木, 人)
  // instead of jumping straight to 14-stroke kanji like 聞.
  if (floor <= 30 && jlpt === JLPTLevel.N5) {
    const sortedN5 = [...pool].sort((a, b) => (a.strokeCount || 1) - (b.strokeCount || 1));
    if (floor <= 10) {
      const easyPool = sortedN5.filter(k => (k.strokeCount || 1) <= 4);
      pool = easyPool.length >= 5 ? easyPool : sortedN5;
    } else if (floor <= 20) {
      const midPool = sortedN5.filter(k => (k.strokeCount || 1) <= 6);
      pool = midPool.length >= 5 ? midPool : sortedN5;
    } else {
      pool = sortedN5;
    }
  }

  const targets: KanjiTarget[] = [];
  const selectedChars = new Set<string>();

  // 1. Check player weak kanji
  const { weakKanji } = extractPlayerWeaknesses(playerProfile);
  for (const char of weakKanji) {
    if (targets.length >= 1) break;
    const found = pool.find(k => k.character === char || k.id === char);
    if (found && !selectedChars.has(found.character)) {
      selectedChars.add(found.character);
      targets.push({
        id: found.id,
        kanji: found.character,
        onyomi: found.onyomi || [],
        kunyomi: found.kunyomi || [],
        meaning: found.meaningId || found.meaningEn || 'Arti kanji',
        writingRequired
      });
    }
  }

  // 2. Deterministic kanji selection
  const targetCount = floor <= 20 ? 2 : 3;
  const offset = prng ? Math.floor(prng() * pool.length) : (floor * 2) % Math.max(1, pool.length);

  for (let i = 0; i < pool.length && targets.length < targetCount; i++) {
    const idx = (offset + i) % pool.length;
    const item = pool[idx];
    if (item && !selectedChars.has(item.character)) {
      selectedChars.add(item.character);
      targets.push({
        id: item.id,
        kanji: item.character,
        onyomi: item.onyomi || [],
        kunyomi: item.kunyomi || [],
        meaning: item.meaningId || item.meaningEn || 'Arti kanji',
        writingRequired
      });
    }
  }

  // Fallback
  if (targets.length === 0) {
    targets.push({
      id: 'kj_default_1',
      kanji: '日',
      onyomi: ['ニチ', 'ジツ'],
      kunyomi: ['ひ', 'か'],
      meaning: 'Matahari / Hari',
      writingRequired
    });
  }

  return targets;
}

/**
 * Calculates difficulty on a 1.0 to 10.0 scale
 */
export function calculateDifficulty(floor: number, isBoss: boolean, isCheckpoint: boolean): number {
  const base = 1.0 + (floor / 1000) * 8.0;
  let bump = 0;
  if (isBoss) bump = 0.8;
  else if (isCheckpoint) bump = 0.2;
  return Number(Math.min(10.0, base + bump).toFixed(1));
}

/**
 * Calculates EXP, Gold, Gems, and Titles for clearing the floor
 */
export function calculateReward(floor: number, isBoss: boolean, isCheckpoint: boolean): FloorReward {
  let exp = floor * 25 + 100;
  let gold = floor * 15 + 50;
  let gems: number | undefined;
  let titleReward: string | undefined;

  if (isBoss) {
    exp *= 4;
    gold *= 5;
    gems = 50;
    titleReward = `Conqueror of Floor ${floor}`;
  } else if (isCheckpoint) {
    exp = Math.round(exp * 1.5);
    gold *= 2;
    gems = 5;
  }

  return { exp, gold, gems, titleReward };
}

// ------------------------------------------------------------------------------
// MAIN EXPORT: PROGRESSION-AWARE PROCEDURAL GENERATOR
// ------------------------------------------------------------------------------

export const MAX_TOWER_FLOORS = 1000;

/**
 * Generates a complete Tower Floor Blueprint based on Floor Number, Player Progression Model, and Floor Seed
 * 
 * @param floor Floor number (1 to 10)
 * @param playerProfile Optional player progression profile or PlayerStats
 * @param seed Optional string seed for 100% deterministic reproducibility (e.g. "SEVNQUEST-5-A")
 * @returns TowerFloorBlueprint
 */
export function generateFloorBlueprint(
  floor: number,
  playerProfile?: TowerPlayerProfile | any,
  seed?: string
): TowerFloorBlueprint {
  // Cap strictly at 10 Foundation Floors as requested by user
  const clampedFloor = Math.max(1, Math.min(MAX_TOWER_FLOORS, Math.floor(floor)));
  const effectiveSeed = seed || `SEVNQUEST-${clampedFloor}-${playerProfile?.userId || 'DEFAULT'}`;

  // Check if player is replaying an already cleared floor
  const isReplay = Boolean(
    playerProfile?.clearedFloors?.[clampedFloor] ||
    (playerProfile?.highestFloorCleared && playerProfile.highestFloorCleared > clampedFloor)
  );

  // If within the 10 Foundation Floors, use the curated pedagogical curriculum
  const foundation = FOUNDATION_FLOORS_DATA[clampedFloor];
  if (foundation) {
    const isCheckpoint = foundation.isCheckpoint;
    const isBossFloor = foundation.isBossFloor;
    const isBossPreparation = clampedFloor === 9;
    const arc = TowerArc.FOUNDATION;
    const jlpt = JLPTLevel.N5;

    // Rounds for foundation floors:
    // Round 0: Inscription (Stroke practice: target kana / introductory kanji)
    // Round 1: Identification (Kana character & sound recognition)
    // Round 2: Identification (Vocabulary reading & meaning quiz)
    // Round 3: Sentence (Kana token unscramble & word assembly)
    const rounds: RoundPhase[] = [
      RoundPhase.INSCRIPTION,
      RoundPhase.IDENTIFICATION,
      RoundPhase.IDENTIFICATION,
      RoundPhase.SENTENCE
    ];

    const difficulty = calculateDifficulty(clampedFloor, isBossFloor, isCheckpoint);
    const reward = calculateReward(clampedFloor, isBossFloor, isCheckpoint);

    return {
      floor: clampedFloor,
      arc,
      jlptTarget: jlpt,
      theme: foundation.theme,
      difficulty,
      vocabulary: foundation.vocabularyTargets,
      kanji: foundation.inscriptionTargets || [foundation.inscriptionTarget],
      grammar: [
        {
          id: `bp_f${clampedFloor}`,
          pattern: clampedFloor === 10 ? '〜です (Sintesis Kana & Angka)' : `Dasar Aksara F.${clampedFloor}`,
          jlpt: JLPTLevel.N5,
          example: foundation.wordAssemblyQuestions[0]?.tokens.join('') || 'あいうえお',
          unlockedFloor: clampedFloor
        }
      ],
      conjugationTier: ConjugationTier.BASIC,
      rounds,
      reviewRatio: 0,
      reward,
      isCheckpoint,
      isBossFloor,
      isBossPreparation,
      isReplay,
      seed: effectiveSeed
    };
  }

  // Fallback for safety
  const prng = createPrng(effectiveSeed);
  const isCheckpoint = clampedFloor % 10 === 0;
  const isBossFloor = clampedFloor % 100 === 0;
  const isBossPreparation = !isBossFloor && clampedFloor % 100 >= 95;

  const arc = calculateArc(clampedFloor);
  const jlpt = calculateJLPT(clampedFloor);
  const conjugationTier = calculateConjugationTier(clampedFloor);
  const reviewRatio = calculateReview(clampedFloor);
  const rounds = generateRounds(clampedFloor, arc);

  const hasInscription = rounds.includes(RoundPhase.INSCRIPTION);

  const vocabulary = selectVocabulary(clampedFloor, jlpt, reviewRatio, playerProfile, prng);
  const grammar = selectGrammar(clampedFloor, jlpt, playerProfile, prng);
  const kanji = selectKanji(clampedFloor, jlpt, arc, playerProfile, hasInscription, prng);

  const difficulty = calculateDifficulty(clampedFloor, isBossFloor, isCheckpoint);
  const reward = calculateReward(clampedFloor, isBossFloor, isCheckpoint);
  const theme = generateTheme(clampedFloor, arc, jlpt);

  return {
    floor: clampedFloor,
    arc,
    jlptTarget: jlpt,
    theme,
    difficulty,
    vocabulary,
    kanji,
    grammar,
    conjugationTier,
    rounds,
    reviewRatio,
    reward,
    isCheckpoint,
    isBossFloor,
    isBossPreparation,
    isReplay,
    seed: effectiveSeed
  };
}

