import type { PlayerStats } from '../types/rpg';
import { buildSmartRecallQueue } from '../utils/mastery';
import { calculateLevelFromExp, calculateMaxHp, calculateMaxMp, ATTRIBUTE_POINTS_PER_LEVEL } from '../data/tiers';

/**
 * Data TURUNAN tidak disimpan / dikirim ke cloud: dihitung ulang dari `itemMastery`.
 * Yang dipersistenkan hanyalah relasi pemain ↔ materi (ID + status + skor + jadwal SRS).
 * `recallQueue` berisi judul, soal contoh, dan salinan record mastery per item.
 */
export function stripDerivedStats<T extends Partial<PlayerStats>>(stats: T): Omit<T, 'recallQueue'> {
  const { recallQueue: _derived, ...persisted } = stats;
  return persisted;
}

/**
 * Level adalah fungsi dari totalExp. Naikkan `level` bila EXP sudah melampauinya, lalu beri poin atribut,
 * hitung ulang HP/MP maksimum, dan tambahkan selisih maks ke HP/MP saat ini. Level tidak pernah turun.
 * Mengembalikan objek yang sama bila tidak ada perubahan.
 */
export function applyLevelFromExp(stats: PlayerStats): { stats: PlayerStats; levelsGained: number } {
  const current = Math.max(1, Math.round(Number(stats.level) || 1));
  const target = Math.max(current, calculateLevelFromExp(stats.totalExp || 0));
  const levelsGained = target - current;
  if (levelsGained <= 0 && stats.level === current) return { stats, levelsGained: 0 };

  const maxHp = calculateMaxHp(target, stats.vit || 0);
  const maxMp = calculateMaxMp(target, stats.int || 0);
  return {
    levelsGained,
    stats: {
      ...stats,
      level: target,
      maxHp,
      maxMp,
      hp: Math.min(maxHp, Math.max(0, stats.hp) + Math.max(0, maxHp - stats.maxHp)),
      mp: Math.min(maxMp, Math.max(0, stats.mp) + Math.max(0, maxMp - stats.maxMp)),
      unallocatedPoints: (stats.unallocatedPoints || 0) + levelsGained * ATTRIBUTE_POINTS_PER_LEVEL,
    },
  };
}

/** Hitung ulang data turunan setelah stats dimuat/digabung dari sumber luar. */
export function withDerivedStats(stats: PlayerStats): PlayerStats {
  const leveled = applyLevelFromExp(stats).stats;
  try {
    return { ...leveled, recallQueue: buildSmartRecallQueue(leveled.itemMastery || {}) };
  } catch (err) {
    console.warn('Failed to rebuild recall queue', err);
    return { ...leveled, recallQueue: [] };
  }
}
