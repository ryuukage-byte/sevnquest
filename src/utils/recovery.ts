import type { PlayerStats } from '../types/rpg';

/** HP minimum setelah kalah: 10% HP maks (minimal 1) agar pemain tidak terkunci di 0 HP. */
export function getGameOverHp(maxHp: number): number {
  return Math.max(1, Math.round(Math.max(0, maxHp) * 0.1));
}

/**
 * Biaya Istirahat di Dojo: 1 koin per 2 HP yang hilang + 1 koin per 4 MP yang hilang
 * (minimal 10 koin bila ada yang perlu dipulihkan, HP maupun MP).
 */
export function getDojoRestCost(hp: number, maxHp: number, mp = 0, maxMp = 0): number {
  const missingHp = Math.max(0, maxHp - hp);
  const missingMp = Math.max(0, maxMp - mp);
  if (missingHp === 0 && missingMp === 0) return 0;
  return Math.max(10, Math.ceil(missingHp / 2) + Math.ceil(missingMp / 4));
}

export function canRestAtDojo(stats: Pick<PlayerStats, 'hp' | 'maxHp' | 'mp' | 'maxMp' | 'gold'>): boolean {
  const cost = getDojoRestCost(stats.hp, stats.maxHp, stats.mp, stats.maxMp);
  return cost > 0 && stats.gold >= cost;
}

/** Istirahat: pulihkan HP & MP penuh dengan membayar koin. Mengembalikan stats yang sama bila tidak mungkin. */
export function applyDojoRest(stats: PlayerStats): PlayerStats {
  if (!canRestAtDojo(stats)) return stats;
  const cost = getDojoRestCost(stats.hp, stats.maxHp, stats.mp, stats.maxMp);
  return { ...stats, gold: stats.gold - cost, hp: stats.maxHp, mp: stats.maxMp };
}

export const HP_POTION_ID = 'pot_hp_small';
/** Potion HP kecil memulihkan 30% HP maks. */
export const HP_POTION_HEAL_RATIO = 0.3;

export function countPotions(inventory: string[] = []): number {
  return inventory.filter(id => id === HP_POTION_ID).length;
}

/** Pakai satu potion HP; hanya satu kemunculan ID yang dihapus dari inventory. */
export function applyPotion(stats: PlayerStats): PlayerStats {
  const idx = stats.inventory.indexOf(HP_POTION_ID);
  if (idx === -1 || stats.hp >= stats.maxHp) return stats;
  const inventory = [...stats.inventory.slice(0, idx), ...stats.inventory.slice(idx + 1)];
  const heal = Math.max(1, Math.round(stats.maxHp * HP_POTION_HEAL_RATIO));
  return { ...stats, inventory, hp: Math.min(stats.maxHp, stats.hp + heal) };
}
