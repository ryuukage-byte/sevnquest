// ==============================================================================
// NIHONGO TOWER — ROUND DIFFICULTY MODIFIER (STAGE 4)
// ==============================================================================

import { RoundPhase, RoundDifficulty } from '../../../types/tower';

/**
 * Procedurally generates dynamic round difficulty scaling across 1,000 floors
 * Adjusts question count, time pressure, accuracy requirements, and distractor subtlety
 * 
 * @param floor Floor number (1 - 1000)
 * @param phase RoundPhase
 * @returns RoundDifficulty
 */
export function generateRoundDifficulty(floor: number, phase: RoundPhase): RoundDifficulty {
  const clampedFloor = Math.max(1, Math.min(1000, Math.floor(floor)));
  const progressRatio = clampedFloor / 1000; // 0.001 to 1.0

  // 1. Base Scaling factors
  // Accuracy Required: 65% at Floor 1 -> 85% at Floor 1000
  const accuracyRequired = Math.min(90, Math.round(65 + progressRatio * 20));

  // Distractor Level: 1 (basic random) to 5 (subtle confusions, lookalike kanji, nuance traps)
  const distractorLevel = Math.min(5, Math.max(1, Math.ceil(progressRatio * 5)));

  // 2. Phase-specific Question Counts and Time Limits
  switch (phase) {
    case RoundPhase.IDENTIFICATION: {
      // 5 questions at F1 -> 15 questions at F1000
      const questionCount = Math.min(15, Math.max(5, 5 + Math.floor(progressRatio * 10)));
      // Time Limit: 30s per question at F1 -> 8s per question at F1000
      const perQuestionTimeSec = Math.max(8, Math.round(30 - progressRatio * 22));
      const timeLimitMs = questionCount * perQuestionTimeSec * 1000;

      return {
        questionCount,
        timeLimitMs,
        accuracyRequired,
        distractorLevel
      };
    }

    case RoundPhase.INSCRIPTION: {
      // 1-3 kanji characters per writing session
      const questionCount = clampedFloor <= 50 ? 1 : clampedFloor <= 300 ? 2 : 3;
      // Writing timer: 45s at F1 -> 20s at F1000 per character
      const perKanjiSec = Math.max(20, Math.round(45 - progressRatio * 25));
      const timeLimitMs = questionCount * perKanjiSec * 1000;

      return {
        questionCount,
        timeLimitMs,
        accuracyRequired: Math.min(85, accuracyRequired),
        distractorLevel
      };
    }

    case RoundPhase.ALCHEMY: {
      // 3 verbs at F1 -> 7 verbs at F1000
      const questionCount = Math.min(7, Math.max(3, 3 + Math.floor(progressRatio * 4)));
      // Time limit: 25s per verb at F1 -> 10s at F1000
      const perVerbSec = Math.max(10, Math.round(25 - progressRatio * 15));
      const timeLimitMs = questionCount * perVerbSec * 1000;

      return {
        questionCount,
        timeLimitMs,
        accuracyRequired,
        distractorLevel
      };
    }

    case RoundPhase.SENTENCE: {
      // 1 sentence at F1 -> 3 sentences at F1000
      const questionCount = clampedFloor <= 200 ? 1 : clampedFloor <= 600 ? 2 : 3;
      // Time limit: 40s per sentence -> 15s per sentence
      const perSentenceSec = Math.max(15, Math.round(40 - progressRatio * 25));
      const timeLimitMs = questionCount * perSentenceSec * 1000;

      return {
        questionCount,
        timeLimitMs,
        accuracyRequired: Math.min(85, accuracyRequired + 5),
        distractorLevel
      };
    }

    case RoundPhase.JLPT_VOCABULARY:
    case RoundPhase.JLPT_GRAMMAR:
    case RoundPhase.JLPT_READING:
    case RoundPhase.JLPT_LISTENING: {
      // Boss Floor Diagnostic tests: high intensity and strict timing
      const questionCount = phase === RoundPhase.JLPT_READING ? 3 : 5;
      const timeLimitMs = (phase === RoundPhase.JLPT_READING ? 60 : 30) * questionCount * 1000;

      return {
        questionCount,
        timeLimitMs,
        accuracyRequired: 75, // Boss gate standard
        distractorLevel: 5   // Authentic JLPT trap distractors
      };
    }

    default:
      return {
        questionCount: 5,
        timeLimitMs: 60000,
        accuracyRequired: 70,
        distractorLevel: 2
      };
  }
}
