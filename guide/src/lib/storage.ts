import type { PlanInput } from '../planner/types';

// Mode tamu: progres disimpan di browser saja. Setiap akses dibungkus try/catch (mode privat / diblokir).
const PROGRESS_KEY = 'sqg_progress_v1';
const PLANS_KEY = 'sqg_plans_v1';

export interface LessonProgress { lastScene: number; completed: boolean; updatedAt: string }
export type ProgressMap = Record<string, LessonProgress>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* abaikan */ }
}

export const loadProgress = (): ProgressMap => read<ProgressMap>(PROGRESS_KEY, {});
export function saveLessonProgress(id: string, lastScene: number, completed: boolean): void {
  const all = loadProgress();
  all[id] = { lastScene, completed: completed || all[id]?.completed === true, updatedAt: new Date().toISOString() };
  write(PROGRESS_KEY, all);
}

export const loadPlans = (): PlanInput[] => read<PlanInput[]>(PLANS_KEY, []);
export function savePlan(input: PlanInput): void {
  const key = JSON.stringify(input);
  const plans = loadPlans().filter(p => JSON.stringify(p) !== key);
  write(PLANS_KEY, [input, ...plans].slice(0, 10));
}
export function deletePlan(input: PlanInput): void {
  const key = JSON.stringify(input);
  write(PLANS_KEY, loadPlans().filter(p => JSON.stringify(p) !== key));
}
