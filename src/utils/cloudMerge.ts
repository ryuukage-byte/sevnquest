import type { PlayerStats, StageClearData, UserDeck } from '../types/rpg';
import type { ItemMasteryRecord } from '../types/content';
import { mergeRecallDaily } from '../engine/recall/session';
import { mergeRewardState } from '../engine/reward/ledger';
import { REWARD_LEDGER_MAX } from '../engine/reward/policy';
import type { RewardState } from '../engine/reward/types';
import { applyRewardToStats } from '../state/playerProgress';

/**
 * Penggabungan data lokal ↔ cloud tanpa menghapus progres yang hanya ada di salah satu sisi.
 * Skalar (level, EXP, gold, dst.) tetap ditentukan oleh sisi yang EXP-nya lebih tinggi
 * di pemanggil; fungsi di sini hanya menggabungkan koleksi (union).
 */

function ts(value?: string): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

export function mergeItemMastery(
  local: Record<string, ItemMasteryRecord> = {},
  cloud: Record<string, ItemMasteryRecord> = {}
): Record<string, ItemMasteryRecord> {
  const merged: Record<string, ItemMasteryRecord> = { ...cloud };
  for (const [id, localRec] of Object.entries(local)) {
    const cloudRec = merged[id];
    if (!cloudRec) {
      merged[id] = localRec;
      continue;
    }
    const localNewer =
      ts(localRec.lastReviewedAt) > ts(cloudRec.lastReviewedAt) ||
      (ts(localRec.lastReviewedAt) === ts(cloudRec.lastReviewedAt) &&
        (localRec.attemptsCount || 0) > (cloudRec.attemptsCount || 0));
    merged[id] = localNewer ? localRec : cloudRec;
  }
  return merged;
}

export function mergeUserDecks(local: UserDeck[] = [], cloud: UserDeck[] = []): UserDeck[] {
  const byId = new Map<string, UserDeck>();
  for (const deck of cloud) byId.set(deck.id, deck);
  for (const deck of local) {
    const existing = byId.get(deck.id);
    if (!existing || ts(deck.updatedAt) > ts(existing.updatedAt)) {
      byId.set(deck.id, deck);
    }
  }
  return Array.from(byId.values());
}

export function mergeStageProgress(
  local: Record<string, StageClearData> = {},
  cloud: Record<string, StageClearData> = {}
): Record<string, StageClearData> {
  const merged: Record<string, StageClearData> = { ...cloud };
  for (const [id, localStage] of Object.entries(local)) {
    const cloudStage = merged[id];
    if (!cloudStage) {
      merged[id] = localStage;
      continue;
    }
    const clearedModules = Array.from(
      new Set([...(cloudStage.clearedModules || []), ...(localStage.clearedModules || [])])
    );
    merged[id] = {
      ...(ts(localStage.lastPlayedAt) >= ts(cloudStage.lastPlayedAt) ? localStage : cloudStage),
      cleared: Boolean(localStage.cleared || cloudStage.cleared),
      stars: Math.max(localStage.stars || 0, cloudStage.stars || 0),
      clearedModules,
    };
  }
  return merged;
}

/**
 * Union koleksi pada PlayerStats (itemMastery, userDecks) tanpa menyentuh skalar.
 * `inventory` sengaja tidak digabung: array ID bisa berisi duplikat sebagai jumlah item,
 * sehingga union akan merusak stack / menghidupkan kembali item yang sudah dipakai.
 */
export function mergeStatsCollections(
  base: PlayerStats,
  local: Partial<PlayerStats>,
  cloud: Partial<PlayerStats>
): PlayerStats {
  return {
    ...base,
    itemMastery: mergeItemMastery(local.itemMastery, cloud.itemMastery),
    userDecks: mergeUserDecks(local.userDecks, cloud.userDecks),
    recallDaily: mergeRecallDaily(local.recallDaily, cloud.recallDaily),
    // Penanda & riwayat reward di-union supaya klaim di satu perangkat tidak bisa diulang di perangkat lain.
    ...mergeRewardState(local, cloud),
  };
}

/**
 * EXP/gold yang hanya ada di riwayat reward sisi LAIN (belum ada di sisi pemenang).
 * Sisi pemenang menyumbang skalar (EXP lebih tinggi menang), sehingga reward yang hanya diperoleh di sisi kalah
 * akan hilang; riwayat reward (id entri unik) memungkinkan menjumlahkannya kembali.
 *
 * Anchor: entri bersama paling baru = titik percabangan; hanya entri `other` yang lebih baru dari anchor dan
 * tidak ada di `base` yang dihitung. Tanpa entri bersama, riwayat hanya dipercaya bila kedua sisi belum
 * terpangkas (< REWARD_LEDGER_MAX); bila ragu mengembalikan null (perilaku lama: tidak menambah apa pun).
 */
export function ledgerDelta(base: RewardState, other: RewardState): { exp: number; gold: number; entries: number } | null {
  const baseLedger = base.rewardLedger || [];
  const otherLedger = other.rewardLedger || [];
  if (otherLedger.length === 0) return { exp: 0, gold: 0, entries: 0 };

  const baseIds = new Set(baseLedger.map(e => e.id));
  const shared = otherLedger.filter(e => baseIds.has(e.id));
  let anchorAt = '';
  if (shared.length > 0) {
    anchorAt = shared.reduce((m, e) => (e.at > m ? e.at : m), '');
  } else if (baseLedger.length >= REWARD_LEDGER_MAX || otherLedger.length >= REWARD_LEDGER_MAX) {
    return null;
  }

  let exp = 0;
  let gold = 0;
  let entries = 0;
  for (const e of otherLedger) {
    if (baseIds.has(e.id) || e.at <= anchorAt) continue;
    exp += e.exp;
    gold += e.gold;
    entries++;
  }
  return { exp: Math.round(exp * 10000) / 10000, gold, entries };
}

/** Tambahkan reward yang hanya ada di `other` ke hasil gabungan, lalu hitung ulang level & tier. */
export function reconcileRewardsFromLedger(merged: PlayerStats, base: RewardState, other: RewardState): PlayerStats {
  const delta = ledgerDelta(base, other);
  if (!delta || (delta.exp <= 0 && delta.gold <= 0)) return merged;
  return applyRewardToStats(merged, delta.exp, delta.gold);
}
