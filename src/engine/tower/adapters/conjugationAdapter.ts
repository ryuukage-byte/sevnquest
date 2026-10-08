// ==============================================================================
// NIHONGO TOWER — CONJUGATION ADAPTER (STAGE 3)
// ==============================================================================

import { RoundPhase, RoundResult, MasteryDelta, RoundMistake } from '../../../types/tower';

export interface ConjugationAnswer {
  targetId: string;
  dictionaryForm: string;
  ruleName: string;
  userInput: string;
  expected: string;
  isCorrect: boolean;
  timeSpentMs?: number;
}

export interface ConjugationExecutionInput {
  answers: ConjugationAnswer[];
  roundIndex?: number;
  passThresholdPercentage?: number;
}

/**
 * Adapter translating Conjugation (Alchemy) engine executions into standardized RoundResult contracts
 */
export class ConjugationAdapter {
  /**
   * Transforms inflection challenge answers into a Tower RoundResult
   */
  public static toRoundResult(input: ConjugationExecutionInput): RoundResult {
    const total = input.answers.length;
    const correctCount = input.answers.filter(a => a.isCorrect).length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const threshold = input.passThresholdPercentage ?? 70;
    const isCorrect = score >= threshold;

    const mistakes: RoundMistake[] = input.answers
      .filter(a => !a.isCorrect)
      .map(a => ({
        targetId: a.targetId,
        expected: a.expected,
        actual: a.userInput,
        reason: `Konjugasi bentuk ${a.ruleName} belum tepat.`
      }));

    const masteryUpdates: MasteryDelta[] = input.answers.map(a => ({
      targetId: a.targetId,
      targetType: 'grammar',
      previousScore: 0,
      newScore: 0,
      delta: a.isCorrect ? 18 : -10,
      isCorrect: a.isCorrect
    }));

    const totalTimeSpentMs = input.answers.reduce((acc, a) => acc + (a.timeSpentMs || 0), 0);

    return {
      roundIndex: input.roundIndex ?? 0,
      phase: RoundPhase.ALCHEMY,
      score,
      correct: isCorrect,
      mistakes,
      hpDamage: isCorrect ? 0 : 1,
      timeSpentMs: totalTimeSpentMs,
      masteryUpdates,
      metadata: {
        totalRules: total,
        correctCount
      }
    };
  }
}
