// ==============================================================================
// NIHONGO TOWER — REWARD ENGINE (STAGE 3)
// ==============================================================================

import {
  TowerFloorBlueprint,
  RoundResult,
  FloorCompletionReport,
  FloorReward
} from '../../../types/tower';

export interface RewardCalculationParams {
  blueprint: TowerFloorBlueprint;
  roundResults: RoundResult[];
  hpRemaining: number;
  maxHp: number;
  activeStreak?: number;
}

/**
 * Pure Reward Engine: Decoupled from Round Execution.
 * Translates round performance records into rich rewards, bonuses, and mastery gains.
 */
export class RewardEngine {
  /**
   * Calculates comprehensive Floor Completion Report
   */
  public static calculateFloorReward({
    blueprint,
    roundResults,
    hpRemaining,
    maxHp,
    activeStreak = 0
  }: RewardCalculationParams): FloorCompletionReport {
    const isAlive = hpRemaining > 0;
    const totalRounds = blueprint.rounds.length;
    const roundsCompleted = roundResults.length;
    const isCompleted = isAlive && roundsCompleted >= totalRounds;
    const status: 'CLEAR' | 'FAILED' = isCompleted ? 'CLEAR' : 'FAILED';

    // 1. Accuracy Calculation
    const totalScore = roundResults.reduce((acc, r) => acc + (r.score || 0), 0);
    const accuracy = roundsCompleted > 0 ? Math.round(totalScore / roundsCompleted) : 0;

    // 2. Total Time Calculation
    const totalTimeSpentMs = roundResults.reduce((acc, r) => acc + (r.timeSpentMs || 0), 0);

    // 3. Flawless Victory Assessment
    const hasZeroMistakes = roundResults.every(
      r => r.correct && (!r.mistakes || r.mistakes.length === 0)
    );
    const isFlawless = isCompleted && hpRemaining === maxHp && hasZeroMistakes;

    // 4. Base Reward Handling
    const baseReward: FloorReward = blueprint.reward || {
      exp: blueprint.floor * 25 + 100,
      gold: blueprint.floor * 15 + 50
    };

    if (!isCompleted) {
      // Partial consolation reward for failure (20% exp, 10% gold)
      const consolationExp = Math.round(baseReward.exp * 0.2);
      const consolationGold = Math.round(baseReward.gold * 0.1);

      return {
        floor: blueprint.floor,
        status: 'FAILED',
        roundsCompleted,
        totalRounds,
        hpRemaining,
        maxHp,
        baseReward,
        bonusExp: 0,
        bonusGold: 0,
        totalExp: consolationExp,
        totalGold: consolationGold,
        isFlawless: false,
        accuracy,
        totalTimeSpentMs,
        masteryGain: this.extractMasteryGains(roundResults),
        unlockedNextFloor: false,
        clearedAt: new Date().toISOString()
      };
    }

    // 5. Bonus Multipliers for Clear
    let bonusExp = 0;
    let bonusGold = 0;

    // Flawless Bonus: +30% EXP, +20% Gold
    if (isFlawless) {
      bonusExp += Math.round(baseReward.exp * 0.3);
      bonusGold += Math.round(baseReward.gold * 0.2);
    }

    // Streak Multiplier: +5% per streak day/floor, capped at +50%
    if (activeStreak > 0) {
      const streakMultiplier = Math.min(0.5, activeStreak * 0.05);
      bonusExp += Math.round(baseReward.exp * streakMultiplier);
      bonusGold += Math.round(baseReward.gold * streakMultiplier);
    }

    // High Accuracy Bonus: >= 90% accuracy gives +15% EXP
    if (accuracy >= 90 && !isFlawless) {
      bonusExp += Math.round(baseReward.exp * 0.15);
    }

    const totalExp = baseReward.exp + bonusExp;
    const totalGold = baseReward.gold + bonusGold;

    // 6. Aggregate Mastery Gains
    const masteryGain = this.extractMasteryGains(roundResults);

    return {
      floor: blueprint.floor,
      status: 'CLEAR',
      roundsCompleted,
      totalRounds,
      hpRemaining,
      maxHp,
      baseReward,
      bonusExp,
      bonusGold,
      totalExp,
      totalGold,
      isFlawless,
      accuracy,
      totalTimeSpentMs,
      masteryGain,
      unlockedNextFloor: true,
      clearedAt: new Date().toISOString()
    };
  }

  /**
   * Aggregates item mastery score deltas from all rounds
   */
  private static extractMasteryGains(roundResults: RoundResult[]): Record<string, number> {
    const masteryGains: Record<string, number> = {};

    for (const round of roundResults) {
      if (round.masteryUpdates && round.masteryUpdates.length > 0) {
        for (const update of round.masteryUpdates) {
          const current = masteryGains[update.targetId] || 0;
          masteryGains[update.targetId] = current + update.delta;
        }
      } else {
        // Fallback default mastery delta based on round outcome
        const delta = round.correct ? 15 : -5;
        const key = `round_${round.roundIndex}_${round.phase}`;
        masteryGains[key] = (masteryGains[key] || 0) + delta;
      }
    }

    return masteryGains;
  }
}
