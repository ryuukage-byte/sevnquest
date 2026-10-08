import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';

/**
 * EXP = Base EXP item × multiplier engine (× faktor performa, bila ada).
 * Base EXP berasal dari identitas materi (getKotobaBaseExp / getKanjiBaseExp / getBunpouBaseExp);
 * setiap engine/mode latihan hanya menentukan multiplier-nya di tabel ini — jangan menulis angka EXP per mode.
 */
export type ExpEngineId =
  | 'flashcard_flip'  // membalik kartu (mikro-EXP per balik)
  | 'flashcard'       // menyelesaikan kartu
  | 'quiz'            // pilihan ganda
  | 'writing'         // menulis (kanji / kosakata)
  | 'sentence'        // menyusun kalimat
  | 'recall'          // tinjau SRS
  | 'arcade';         // mode arcade cepat (kecepatan > kedalaman)

export const ENGINE_EXP_MULTIPLIER: Readonly<Record<ExpEngineId, number>> = {
  flashcard_flip: 0.005,
  flashcard: 1.0,
  quiz: 1.2,
  writing: 1.5,
  sentence: 2.0,
  recall: 1.0,
  arcade: 0.35,
};

/** EXP akhir untuk satu materi pada satu engine. `performanceFactor` ≈ 1 (bonus/penalti performa). */
export function calcEngineExp(baseExp: number, engine: ExpEngineId, performanceFactor = 1): number {
  return Math.max(0, Math.round(baseExp * ENGINE_EXP_MULTIPLIER[engine] * performanceFactor));
}

/** Base EXP materi berdasarkan kategori + ID kanonik; null bila materi tidak dikenal. */
export function getEntityBaseExp(category: string, id: string): number | null {
  if (category === 'kotoba') { const k = KOTOBA_DATABASE[id]; return k ? getKotobaBaseExp(k) : null; }
  if (category === 'kanji') { const k = KANJI_DATABASE[id]; return k ? getKanjiBaseExp(k) : null; }
  if (category === 'bunpou') { const b = BUNPOU_DATABASE[id]; return b ? getBunpouBaseExp(b) : null; }
  return null;
}

/**
 * Base EXP constants based on JLPT tier difficulty.
 */
const KANJI_LEVEL_BASE_EXP: Record<string, number> = {
  KANA: 12,
  SUUJI: 12,
  N5: 20,
  N4: 30,
  N3: 45,
  N2: 65,
  N1: 90,
};

const KOTOBA_LEVEL_BASE_EXP: Record<string, number> = {
  N5: 15,
  N4: 22,
  N3: 32,
  N2: 48,
  N1: 65,
};

const BUNPOU_LEVEL_BASE_EXP: Record<string, number> = {
  N5: 25,
  N4: 35,
  N3: 50,
  N2: 70,
  N1: 95,
};

const QUIZ_LEVEL_BASE_EXP: Record<string, number> = {
  N5: 18,
  N4: 25,
  N3: 35,
  N2: 50,
  N1: 70,
};

/**
 * Calculates the intrinsic Base EXP of a Kanji/Kana/Suuji character.
 * Formula: Level Weight + (strokeCount * 2.5)
 */
export function getKanjiBaseExp(kanji: {
  character: string;
  strokeCount?: number;
  jlpt?: string;
  radical?: string;
}): number {
  const char = kanji.character || '';
  const isKana = char.length > 0 && char.charCodeAt(0) >= 0x3040 && char.charCodeAt(0) <= 0x30ff;
  const isSuuji = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零'].includes(char);

  let levelKey = kanji.jlpt?.toUpperCase() || 'N3';
  if (isKana || kanji.radical === 'Hiragana' || kanji.radical === 'Katakana') {
    levelKey = 'KANA';
  } else if (isSuuji) {
    levelKey = 'SUUJI';
  }

  const levelBase = KANJI_LEVEL_BASE_EXP[levelKey] || KANJI_LEVEL_BASE_EXP.N3;
  const strokes = kanji.strokeCount || (isKana ? 3 : 8);

  return levelBase + Math.round(strokes * 2.5);
}

/**
 * Calculates the intrinsic Base EXP of a vocabulary word (Kotoba).
 * Formula: Level Weight + (word.length * 2) + (kanjiComponents.length * 5)
 */
export function getKotobaBaseExp(kotoba: {
  word: string;
  jlpt?: string;
  kanjiComponents?: string[];
}): number {
  const levelKey = kotoba.jlpt?.toUpperCase() || 'N5';
  const levelBase = KOTOBA_LEVEL_BASE_EXP[levelKey] || KOTOBA_LEVEL_BASE_EXP.N5;

  const wordLength = Array.from(kotoba.word || '').length;
  const kanjiCount = kotoba.kanjiComponents?.length || 0;

  return levelBase + (wordLength * 2) + (kanjiCount * 5);
}

/**
 * Calculates the intrinsic Base EXP of a grammar point (Bunpou).
 * Formula: Level Weight + (subFormulas.length * 5)
 */
export function getBunpouBaseExp(bunpou: {
  level?: string;
  subFormulas?: any[];
}): number {
  const levelKey = bunpou.level?.toUpperCase() || 'N3';
  const levelBase = BUNPOU_LEVEL_BASE_EXP[levelKey] || BUNPOU_LEVEL_BASE_EXP.N3;
  const subCount = bunpou.subFormulas?.length || 0;

  return levelBase + (subCount * 5);
}

/**
 * Performance-based writing reward calculation.
 * Factors in:
 * - Base EXP of the character/word
 * - Watermark usage (Blind recall bonus: +0.35x)
 * - Animation usage (No animation bonus: +0.25x, excessive animation penalty: -0.1x per hint > 1)
 * - Accuracy (0 mistakes: +0.25x, excessive mistakes penalty)
 * - Pacing / Stopwatch (within reasonable focused writing window: +0.1x)
 */
export interface WritingPerformanceOptions {
  baseExp: number;
  mistakesCount: number;
  watermarkUsed: boolean;
  animationCount: number;
  elapsedSeconds: number;
  strokeCount?: number;
}

export interface WritingRewardResult {
  expGained: number;
  goldGained: number;
  multiplier: number;
  bonusReasons: string[];
  breakdown: {
    baseExp: number;
    blindRecallBonus: boolean;
    noAnimationBonus: boolean;
    perfectStrokesBonus: boolean;
    focusTimeBonus: boolean;
    mistakesPenalty: number;
    animationPenalty: number;
    watermarkUsed?: boolean;
    hintsUsed?: number;
  };
}

export function calculateWritingReward(
  optionsOrBaseExp: WritingPerformanceOptions | number,
  maybeOptions?: Partial<WritingPerformanceOptions> & { mistakes?: number }
): WritingRewardResult {
  const options: WritingPerformanceOptions =
    typeof optionsOrBaseExp === 'number'
      ? {
          baseExp: optionsOrBaseExp,
          mistakesCount: maybeOptions?.mistakesCount ?? maybeOptions?.mistakes ?? 0,
          watermarkUsed: maybeOptions?.watermarkUsed ?? false,
          animationCount: maybeOptions?.animationCount ?? 0,
          elapsedSeconds: maybeOptions?.elapsedSeconds ?? 0,
          strokeCount: maybeOptions?.strokeCount ?? 6,
        }
      : optionsOrBaseExp;

  const {
    baseExp = 10,
    mistakesCount = 0,
    watermarkUsed = false,
    animationCount = 0,
    elapsedSeconds = 0,
    strokeCount = 6,
  } = options;

  let multiplier = 1.2; // Base Writing Multiplier
  const bonusReasons: string[] = [];

  // 1. Watermark Guide Bonus
  const blindRecallBonus = !watermarkUsed;
  if (blindRecallBonus) {
    multiplier += 0.35; // +35% for pure memory writing without tracing
    bonusReasons.push('Tanpa Panduan (+35%)');
  }

  // 2. Animation Hint Bonus / Penalty
  const noAnimationBonus = animationCount === 0;
  let animationPenalty = 0;
  if (noAnimationBonus) {
    multiplier += 0.25; // +25% for knowing stroke order without checking animation
    bonusReasons.push('Tanpa Animasi (+25%)');
  } else if (animationCount > 1) {
    animationPenalty = Math.min(0.2, (animationCount - 1) * 0.08);
    multiplier -= animationPenalty;
  }

  // 3. Accuracy & Mistakes
  const perfectStrokesBonus = mistakesCount === 0;
  let mistakesPenalty = 0;
  if (perfectStrokesBonus) {
    multiplier += 0.25; // +25% for flawless stroke execution
    bonusReasons.push('Goresan Sempurna (+25%)');
  } else if (mistakesCount >= 3) {
    mistakesPenalty = Math.min(0.3, (mistakesCount - 2) * 0.05);
    multiplier -= mistakesPenalty;
  }

  // 4. Time / Stopwatch focus bonus
  // Expected reasonable time: 3s + (strokeCount * 2)s up to 60s
  const minSensibleTime = 2; // Below this is impossible / spam scribbling
  const maxSensibleTime = Math.max(25, strokeCount * 6);
  const focusTimeBonus = elapsedSeconds >= minSensibleTime && elapsedSeconds <= maxSensibleTime;
  if (focusTimeBonus) {
    multiplier += 0.10;
    bonusReasons.push('Fokus Cepat (+10%)');
  }

  // Mode menulis: Base EXP × multiplier engine writing × faktor performa. Bonus/penalti di atas (basis 1.2)
  // dinormalkan ke faktor 0.8–1.25 agar total tetap proporsional terhadap multiplier engine.
  const performanceFactor = Math.min(1.25, Math.max(0.8, multiplier / 1.2));
  const expGained = calcEngineExp(baseExp, 'writing', performanceFactor);
  const goldGained = 0;
  const finalMultiplier = Number((ENGINE_EXP_MULTIPLIER.writing * performanceFactor).toFixed(2));

  return {
    expGained,
    goldGained,
    multiplier: finalMultiplier,
    bonusReasons,
    breakdown: {
      baseExp,
      blindRecallBonus,
      noAnimationBonus,
      perfectStrokesBonus,
      focusTimeBonus,
      mistakesPenalty: Number(mistakesPenalty.toFixed(2)),
      animationPenalty: Number(animationPenalty.toFixed(2)),
      watermarkUsed: options.watermarkUsed,
      hintsUsed: options.animationCount,
    },
  };
}

/**
 * Flashcard event reward calculation: Base EXP × multiplier engine flashcard.
 */
export function calculateFlashcardReward(baseExp: number, _isMastered: boolean): {
  expGained: number;
  goldGained: number;
} {
  return { expGained: calcEngineExp(baseExp, 'flashcard'), goldGained: 0 };
}

export interface QuizRewardOptions {
  level?: string;
  totalQuestions?: number;
  correctCount?: number;
  playerInt?: number;
}

export interface QuizRewardResult {
  expGained: number;
  totalExpGained: number;
  goldGained: number;
  accuracyPercentage: number;
  accuracyBonusMultiplier: number;
}

/**
 * Quiz & Question Bank reward calculation based on JLPT level and accuracy.
 * Supports both object argument and legacy positional arguments:
 * calculateQuizReward({ level, totalQuestions, correctCount })
 * calculateQuizReward(level, correctCount, totalQuestions, playerInt)
 */
export function calculateQuizReward(
  optionsOrLevel?: QuizRewardOptions | string,
  maybeCorrectCount?: number,
  maybeTotalQuestions?: number,
  maybePlayerInt?: number
): QuizRewardResult {
  let level = 'N5';
  let totalQuestions = 0;
  let correctCount = 0;
  let playerInt = 0;

  if (typeof optionsOrLevel === 'object' && optionsOrLevel !== null) {
    level = optionsOrLevel.level || 'N5';
    totalQuestions = optionsOrLevel.totalQuestions ?? 0;
    correctCount = optionsOrLevel.correctCount ?? 0;
    playerInt = optionsOrLevel.playerInt ?? 0;
  } else {
    // Positional arguments: (level, correctCount, totalQuestions, playerInt)
    if (typeof optionsOrLevel === 'string') {
      level = optionsOrLevel;
    }
    correctCount = maybeCorrectCount ?? 0;
    totalQuestions = maybeTotalQuestions ?? 0;
    playerInt = maybePlayerInt ?? 0;
  }

  const cleanLevel = (level || 'N5').toUpperCase();
  const basePerQuestion = QUIZ_LEVEL_BASE_EXP[cleanLevel] || QUIZ_LEVEL_BASE_EXP.N5;

  const accuracy = totalQuestions > 0 ? Math.min(1, Math.max(0, correctCount / totalQuestions)) : 0;
  const accuracyPercentage = Math.round(accuracy * 100);

  let accuracyBonusMultiplier = 1.0;
  if (accuracy === 1.0) {
    accuracyBonusMultiplier = 1.3; // +30% Perfect Score
  } else if (accuracy >= 0.8) {
    accuracyBonusMultiplier = 1.1; // +10% High Mastery
  } else if (accuracy < 0.6) {
    accuracyBonusMultiplier = 0.8;
  }

  // Optional INT stat bonus (+0.5% exp per INT point)
  const intMultiplier = 1 + (Math.max(0, playerInt) * 0.005);

  // Base EXP per soal (menurut level) × multiplier engine quiz.
  const baseTotal = correctCount * basePerQuestion * ENGINE_EXP_MULTIPLIER.quiz;
  const expGained = Math.max(10, Math.round(baseTotal * accuracyBonusMultiplier * intMultiplier));
  const goldGained = Math.max(5, Math.round(expGained * 0.5));

  return {
    expGained,
    totalExpGained: expGained,
    goldGained,
    accuracyPercentage,
    accuracyBonusMultiplier,
  };
}
