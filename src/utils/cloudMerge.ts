import type { PlayerStats, StageClearData, UserDeck } from '../types/rpg';
import type { ItemMasteryRecord } from '../types/content';

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
  };
}
