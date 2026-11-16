import type { Category, Goal, Level, StartLevel } from './types';

export const LEVELS: readonly Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const CATEGORIES: readonly Category[] = ['kotoba', 'kanji', 'bunpou'];

/**
 * Jumlah materi per level. Sumber: audit basis data SevnQuest (src/data/db: kotoba.json, kanji.json, bunpou.json).
 * `estimated: true` = angka belum bisa dipastikan dari data (bunpou N3 tidak terpisah di JSON) -> perkiraan.
 * Fase integrasi (Supabase) akan mengganti tabel ini dengan hitungan dari database kurikulum yang sama.
 */
export const LEVEL_COUNTS: Readonly<Record<Level, Record<Category, number>>> = {
  N5: { kotoba: 700, kanji: 80, bunpou: 119 },
  N4: { kotoba: 731, kanji: 167, bunpou: 189 },
  N3: { kotoba: 1960, kanji: 366, bunpou: 150 },
  N2: { kotoba: 3333, kanji: 378, bunpou: 208 },
  N1: { kotoba: 11369, kanji: 1373, bunpou: 267 },
};
export const ESTIMATED_COUNTS: ReadonlyArray<`${Level}.${Category}`> = ['N3.bunpou'];

/** Menit dasar menguasai satu materi baru di N5 (selaras dengan Guided Learning di aplikasi utama). */
export const BASE_MINUTES: Readonly<Record<Category, number>> = { kotoba: 2, kanji: 3, bunpou: 6 };
export const LEVEL_DIFFICULTY: Readonly<Record<Level, number>> = { N5: 1, N4: 1.1, N3: 1.25, N2: 1.4, N1: 1.6 };

export interface ScopeSlice {
  level: Level;
  /** Bagian level yang masuk target (0..1). */
  share: number;
}

const cumulative = (upTo: Level): ScopeSlice[] =>
  LEVELS.slice(0, LEVELS.indexOf(upTo) + 1).map(level => ({ level, share: 1 }));

/** Cakupan materi per target. JFT/SSW 2 memakai porsi heuristik, bukan klaim resmi. */
export function scopeForGoal(goal: Goal): ScopeSlice[] {
  if (goal === 'JFT') return [{ level: 'N5', share: 1 }, { level: 'N4', share: 0.5 }];
  if (goal === 'SSW2') return [{ level: 'N5', share: 1 }, { level: 'N4', share: 1 }, { level: 'N3', share: 0.4 }];
  return cumulative(goal);
}

/** Buang level yang sudah dikuasai (startLevel dianggap tuntas). */
export function scopeForPlan(goal: Goal, start: StartLevel): ScopeSlice[] {
  if (start === 'none') return scopeForGoal(goal);
  const known = LEVELS.indexOf(start);
  return scopeForGoal(goal).filter(s => LEVELS.indexOf(s.level) > known);
}

export interface ScopeSegment {
  level: Level;
  count: number;
}

/** Segmen materi per kategori, terurut dari level terendah. */
export function segmentsFor(scope: ScopeSlice[], category: Category): ScopeSegment[] {
  return scope
    .map(s => ({ level: s.level, count: Math.round(LEVEL_COUNTS[s.level][category] * s.share) }))
    .filter(s => s.count > 0);
}

export function totalFor(scope: ScopeSlice[], category: Category): number {
  return segmentsFor(scope, category).reduce((n, s) => n + s.count, 0);
}

/** Level materi ke-`index` (1-based) di dalam urutan kategori. */
export function levelAt(segments: ScopeSegment[], index: number): Level {
  let acc = 0;
  for (const s of segments) {
    acc += s.count;
    if (index <= acc) return s.level;
  }
  return segments[segments.length - 1]?.level ?? 'N5';
}

/** Menit rata-rata per materi (terbobot jumlah & kesulitan level). */
export function avgMinutesPerItem(scope: ScopeSlice[], category: Category): number {
  const segs = segmentsFor(scope, category);
  const total = segs.reduce((n, s) => n + s.count, 0);
  if (!total) return BASE_MINUTES[category];
  return segs.reduce((n, s) => n + s.count * BASE_MINUTES[category] * LEVEL_DIFFICULTY[s.level], 0) / total;
}
