import type { PlayerStats } from '../../types/rpg';
import { applyRewardToStats } from '../../state/playerProgress';
import { touchActiveDay } from '../../state/streak';
import { localDayKey } from './ledger';
import { commitReward, decideReward } from './ledger';
import type { RewardDecision, RewardMeta, RewardRequest } from './types';

export const LEGACY_META: RewardMeta = { source: 'legacy_unclassified' };

/**
 * PINTU TUNGGAL pemberian EXP/gold. Memutuskan (idempotency + batas), mencatat ke ledger, lalu menerapkan
 * ke state lewat `applyRewardToStats` (EXP pecahan, level, tier). Murni: tanpa efek samping.
 */
export function awardExp(
  prev: PlayerStats,
  req: RewardRequest,
  now: Date = new Date()
): { stats: PlayerStats; decision: RewardDecision } {
  const { state, decision } = commitReward(prev, req, now);
  if (!decision.granted) {
    return { stats: state.rewardClaims === prev.rewardClaims ? prev : { ...prev, rewardClaims: state.rewardClaims }, decision };
  }
  let rewarded = applyRewardToStats(prev, decision.exp, decision.gold);
  // Reward belajar menandai hari ini aktif (streak). Klaim misi bukan aktivitas belajar.
  if (req.source !== 'mission_claim') rewarded = touchActiveDay(rewarded, localDayKey(now));
  return { stats: { ...rewarded, rewardClaims: state.rewardClaims, rewardLedger: state.rewardLedger }, decision };
}

/** Pratinjau keputusan terhadap snapshot state (untuk UI); tidak mengubah apa pun. */
export function previewAward(prev: PlayerStats, req: RewardRequest, now: Date = new Date()): RewardDecision {
  return decideReward(prev, req, now);
}
