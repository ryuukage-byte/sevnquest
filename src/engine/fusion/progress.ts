// Progres Grammar Fusion (localStorage). Pola sama dengan engine/tower1/progress.ts.
export const FUSION_STORAGE_KEY = 'nq_fusion_progress';

export interface FusionClearRecord {
  clears: number;
  bestMistakes: number;
  bestHints: number;
  clearedAt: string;
}
export interface FusionProgress { cleared: Record<string, FusionClearRecord> }

export function loadFusionProgress(): FusionProgress {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(FUSION_STORAGE_KEY) : null;
    if (!raw) return { cleared: {} };
    const parsed = JSON.parse(raw);
    const cleared: FusionProgress['cleared'] = {};
    for (const [id, r] of Object.entries((parsed?.cleared ?? {}) as Record<string, any>)) {
      if (!r || typeof r.clears !== 'number') continue;
      cleared[id] = {
        clears: r.clears,
        bestMistakes: Number(r.bestMistakes) || 0,
        bestHints: Number(r.bestHints) || 0,
        clearedAt: typeof r.clearedAt === 'string' ? r.clearedAt : new Date(0).toISOString(),
      };
    }
    return { cleared };
  } catch {
    return { cleared: {} };
  }
}

export function saveFusionProgress(p: FusionProgress): void {
  try { window.localStorage.setItem(FUSION_STORAGE_KEY, JSON.stringify(p)); } catch { /* memori saja */ }
}

/** Catat clear. Mengembalikan progres baru + apakah ini clear pertama (hadiah penuh). */
export function recordFusionClear(p: FusionProgress, stageId: string, mistakes: number, hints: number, now = new Date()): { progress: FusionProgress; firstClear: boolean } {
  const prev = p.cleared[stageId];
  const rec: FusionClearRecord = prev
    ? { clears: prev.clears + 1, bestMistakes: Math.min(prev.bestMistakes, mistakes), bestHints: Math.min(prev.bestHints, hints), clearedAt: now.toISOString() }
    : { clears: 1, bestMistakes: mistakes, bestHints: hints, clearedAt: now.toISOString() };
  return { progress: { cleared: { ...p.cleared, [stageId]: rec } }, firstClear: !prev };
}
