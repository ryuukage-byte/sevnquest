// ==============================================================================
// NIHONGO TOWER — QUIZ ADAPTER (STAGE 3)
// ==============================================================================

import { RoundPhase, RoundResult, MasteryDelta, RoundMistake } from '../../../types/tower';

export interface QuizQuestionAnswer {
  targetId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentMs?: number;
}

export interface QuizExecutionInput {
  answers: QuizQuestionAnswer[];
  roundIndex?: number;
  phase?: RoundPhase;
  passThresholdPercentage?: number;
}

/**
 * Adapter translating Quiz Engine question runs into standardized RoundResult contracts
 */
export class QuizAdapter {
  /**
   * Transforms multiple-choice quiz evaluations into a Tower RoundResult
   */
  public static toRoundResult(input: QuizExecutionInput): RoundResult {
    const total = input.answers.length;
    const correctCount = input.answers.filter(a => a.isCorrect).length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const threshold = input.passThresholdPercentage ?? 70;
    const isCorrect = score >= threshold;

    const mistakes: RoundMistake[] = input.answers
      .filter(a => !a.isCorrect)
      .map(a => ({
        targetId: a.targetId,
        expected: a.correctAnswer,
        actual: a.selectedAnswer,
        reason: 'Pilihan jawaban tidak sesuai dengan kunci jawaban.'
      }));

    const masteryUpdates: MasteryDelta[] = input.answers.map(a => ({
      targetId: a.targetId,
      targetType: 'vocabulary',
      previousScore: 0,
      newScore: 0,
      delta: a.isCorrect ? 15 : -8,
      isCorrect: a.isCorrect
    }));

    const totalTimeSpentMs = input.answers.reduce((acc, a) => acc + (a.timeSpentMs || 0), 0);

    return {
      roundIndex: input.roundIndex ?? 0,
      phase: input.phase || RoundPhase.IDENTIFICATION,
      score,
      correct: isCorrect,
      mistakes,
      hpDamage: isCorrect ? 0 : 1,
      timeSpentMs: totalTimeSpentMs,
      masteryUpdates,
      metadata: {
        totalQuestions: total,
        correctCount
      }
    };
  }
}
