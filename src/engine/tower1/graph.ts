// ==============================================================================
// TOWER 1 — LOGIKA GRAF (unlock, rekomendasi, peringkat tata letak)
// Murni (tanpa React/localStorage) agar mudah diuji.
// ==============================================================================

import { FloorNodeState, FloorSpec, Tower1Progress } from './types';

export function floorMap(floors: FloorSpec[]): Record<number, FloorSpec> {
  return Object.fromEntries(floors.map(f => [f.id, f]));
}

/** Memastikan graf adalah DAG: semua prasyarat ada dan tidak ada siklus. Mengembalikan daftar masalah. */
export function validateGraph(floors: FloorSpec[]): string[] {
  const issues: string[] = [];
  const byId = floorMap(floors);
  for (const f of floors) {
    for (const p of [...f.hard, ...f.soft]) {
      if (!byId[p]) issues.push(`Lantai ${f.id}: prasyarat ${p} tidak ada`);
      if (p === f.id) issues.push(`Lantai ${f.id}: prasyarat ke dirinya sendiri`);
    }
    for (const p of f.hard) {
      if (f.soft.includes(p)) issues.push(`Lantai ${f.id}: ${p} ada di hard sekaligus soft`);
    }
  }
  const state: Record<number, 0 | 1 | 2> = {};
  const visit = (id: number, trail: number[]) => {
    if (state[id] === 2) return;
    if (state[id] === 1) {
      issues.push(`Siklus: ${[...trail, id].join(' → ')}`);
      return;
    }
    state[id] = 1;
    const f = byId[id];
    if (f) for (const p of [...f.hard, ...f.soft]) visit(p, [...trail, id]);
    state[id] = 2;
  };
  floors.forEach(f => visit(f.id, []));
  return issues;
}

/** Peringkat tata letak = jalur terpanjang dari akar (hard + soft). 0 = dasar menara. */
export function computeRanks(floors: FloorSpec[]): Record<number, number> {
  const byId = floorMap(floors);
  const memo: Record<number, number> = {};
  const rank = (id: number): number => {
    if (memo[id] !== undefined) return memo[id];
    const f = byId[id];
    const deps = [...f.hard, ...f.soft];
    memo[id] = deps.length === 0 ? 0 : Math.max(...deps.map(rank)) + 1;
    return memo[id];
  };
  floors.forEach(f => rank(f.id));
  return memo;
}

export function isCleared(progress: Tower1Progress, id: number): boolean {
  return !!progress.cleared[id];
}

export function getFloorState(spec: FloorSpec, progress: Tower1Progress): FloorNodeState {
  if (isCleared(progress, spec.id)) return 'cleared';
  if (spec.status === 'sealed') return 'sealed';
  return spec.hard.every(p => isCleared(progress, p)) ? 'available' : 'locked';
}

/** Prasyarat keras yang belum selesai (untuk pesan "kenapa terkunci"). */
export function missingHard(spec: FloorSpec, progress: Tower1Progress): number[] {
  return spec.hard.filter(p => !isCleared(progress, p));
}

/**
 * Rekomendasi langkah berikutnya: lantai terbuka & belum selesai dengan nomor terkecil
 * yang prasyarat lunaknya sudah selesai; bila tidak ada, nomor terkecil yang terbuka.
 */
export function getRecommendedFloor(floors: FloorSpec[], progress: Tower1Progress): number | null {
  const open = floors
    .filter(f => getFloorState(f, progress) === 'available')
    .sort((a, b) => a.id - b.id);
  if (open.length === 0) return null;
  const softReady = open.find(f => f.soft.every(p => isCleared(progress, p)));
  return (softReady ?? open[0]).id;
}

export function starsForAccuracy(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 90) return 3;
  if (accuracy >= 75) return 2;
  return 1;
}
