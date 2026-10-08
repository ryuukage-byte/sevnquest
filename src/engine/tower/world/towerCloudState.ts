// ==============================================================================
// NIHONGO TOWER — CLOUD STATE (kumpulkan / gabungkan / terapkan)
// Progres Tower, ekonomi skill tree, dan achievement sebelumnya hanya di localStorage.
// Checkpoint sesi aktif (blueprint ronde) sengaja TIDAK disinkronkan: sementara, besar, kedaluwarsa 7 hari.
// ==============================================================================

import { loadTowerProgress, saveTowerProgress, TowerSavedProgress } from './towerProgress';
import { TowerAchievementManager } from './towerAchievements';
import { SkillTreeManager, PlayerTowerEconomy, TOWER_PASSIVE_SKILLS } from '../combat/skillTree';
import { loadTower1Progress, mergeTower1Progress, saveTower1Progress } from '../../tower1/progress';
import { Tower1Progress } from '../../tower1/types';

type AchievementProgress = Record<string, { currentValue: number; isUnlocked: boolean }>;

export interface TowerCloudState {
  progress: TowerSavedProgress;
  economy: PlayerTowerEconomy;
  achievements: AchievementProgress;
  /** Progres Menara 1 (Tutorial): lantai selesai + bintang. */
  tower1?: Tower1Progress;
  updatedAt: string;
}

type ClearedFloor = { clearedAt: string; mistakes: number; score: number };

function spentOnSkills(allocated: Record<string, number>): number {
  let total = 0;
  for (const [id, level] of Object.entries(allocated || {})) {
    const def = TOWER_PASSIVE_SKILLS.find(s => s.id === id);
    if (!def) continue;
    for (let i = 0; i < level; i++) total += def.costPerLevel[i] ?? 0;
  }
  return total;
}

function betterClear(a: ClearedFloor, b: ClearedFloor): ClearedFloor {
  if (a.mistakes !== b.mistakes) return a.mistakes < b.mistakes ? a : b;
  return a.score >= b.score ? a : b;
}

/** Penggabungan murni (diuji): lantai tertinggi menang, union lantai/skill/achievement. */
export function mergeTowerState(a: TowerCloudState | undefined | null, b: TowerCloudState | undefined | null): TowerCloudState | null {
  if (!a) return b ?? null;
  if (!b) return a;

  const clearedFloors: Record<number, ClearedFloor> = { ...(b.progress.clearedFloors || {}) };
  for (const [k, v] of Object.entries(a.progress.clearedFloors || {})) {
    const key = Number(k);
    clearedFloors[key] = clearedFloors[key] ? betterClear(v, clearedFloors[key]) : v;
  }
  const progress: TowerSavedProgress = {
    currentFloor: Math.max(a.progress.currentFloor, b.progress.currentFloor),
    highestFloorCleared: Math.max(a.progress.highestFloorCleared, b.progress.highestFloorCleared),
    flawlessFloorCount: Math.max(a.progress.flawlessFloorCount, b.progress.flawlessFloorCount),
    clearedFloors,
  };

  // Skill tree: level tertinggi per skill; total SP yang pernah didapat = max kedua sisi, sisa = total - terpakai
  const allocatedSkills: Record<string, number> = { ...(b.economy.allocatedSkills || {}) };
  for (const [id, lvl] of Object.entries(a.economy.allocatedSkills || {})) {
    allocatedSkills[id] = Math.max(allocatedSkills[id] || 0, lvl);
  }
  const earnedA = a.economy.skillPoints + spentOnSkills(a.economy.allocatedSkills);
  const earnedB = b.economy.skillPoints + spentOnSkills(b.economy.allocatedSkills);
  const economy: PlayerTowerEconomy = {
    skillPoints: Math.max(0, Math.max(earnedA, earnedB) - spentOnSkills(allocatedSkills)),
    allocatedSkills,
    reviveTokens: Math.max(a.economy.reviveTokens, b.economy.reviveTokens),
  };

  const achievements: AchievementProgress = { ...b.achievements };
  for (const [id, v] of Object.entries(a.achievements || {})) {
    const o = achievements[id];
    achievements[id] = o
      ? { currentValue: Math.max(o.currentValue, v.currentValue), isUnlocked: o.isUnlocked || v.isUnlocked }
      : v;
  }

  const tower1 = a.tower1 || b.tower1 ? mergeTower1Progress(a.tower1, b.tower1) : undefined;

  return { progress, economy, achievements, tower1, updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt };
}

/** Baca kondisi Tower lokal. */
export function collectTowerState(): TowerCloudState {
  const achievements: AchievementProgress = {};
  for (const a of TowerAchievementManager.load()) {
    achievements[a.id] = { currentValue: a.currentValue, isUnlocked: a.isUnlocked };
  }
  return {
    progress: loadTowerProgress(),
    economy: SkillTreeManager.load(),
    achievements,
    tower1: loadTower1Progress(),
    updatedAt: new Date().toISOString(),
  };
}

/** Tulis hasil gabungan ke localStorage lewat manager masing-masing. */
export function applyTowerState(state: TowerCloudState | null | undefined): void {
  if (!state) return;
  saveTowerProgress(state.progress);
  if (state.tower1) saveTower1Progress(state.tower1);
  SkillTreeManager.save(state.economy);
  const list = TowerAchievementManager.load().map(a => ({
    ...a,
    currentValue: state.achievements?.[a.id]?.currentValue ?? a.currentValue,
    isUnlocked: state.achievements?.[a.id]?.isUnlocked ?? a.isUnlocked,
  }));
  TowerAchievementManager.save(list);
}
