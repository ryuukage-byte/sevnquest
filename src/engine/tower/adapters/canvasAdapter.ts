// ==============================================================================
// NIHONGO TOWER — CANVAS ADAPTER (STAGE 3)
// ==============================================================================

import { RoundPhase, RoundResult, MasteryDelta } from '../../../types/tower';

export interface CanvasExecutionInput {
  kanjiChar: string;
  accuracy: number; // 0 to 100
  mistakeCount?: number;
  timeSpentMs?: number;
  targetId?: string;
  passed?: boolean;
  minAccuracy?: number;
  roundIndex?: number;
}

/**
 * Adapter translating Kanji Writing Canvas interaction results into standardized RoundResult contracts
 */
export class CanvasAdapter {
  /**
   * Transforms raw stroke recognition events into a Tower RoundResult
   */
  public static toRoundResult(input: CanvasExecutionInput): RoundResult {
    const minAcc = input.minAccuracy ?? 70;
    const isCorrect = input.passed !== undefined ? input.passed : input.accuracy >= minAcc;
    const targetKey = input.targetId || input.kanjiChar;

    const mistakes = isCorrect
      ? []
      : [
          {
            targetId: targetKey,
            expected: input.kanjiChar,
            actual: `Akurasi ${Math.round(input.accuracy)}% (minimal ${minAcc}%)`,
            reason: 'Ketepatan goresan kanji belum memenuhi standar ketuntasan.'
          }
        ];

    // Mastery progression delta
    const delta = isCorrect ? (input.accuracy >= 90 ? 20 : 15) : -8;
    const masteryUpdates: MasteryDelta[] = [
      {
        targetId: targetKey,
        targetType: 'kanji',
        previousScore: 0,
        newScore: 0,
        delta,
        isCorrect
      }
    ];

    return {
      roundIndex: input.roundIndex ?? 0,
      phase: RoundPhase.INSCRIPTION,
      score: Math.round(input.accuracy),
      correct: isCorrect,
      mistakes,
      hpDamage: isCorrect ? 0 : 1,
      timeSpentMs: input.timeSpentMs || 0,
      masteryUpdates,
      metadata: {
        kanjiChar: input.kanjiChar,
        mistakeCount: input.mistakeCount || 0
      }
    };
  }
}
