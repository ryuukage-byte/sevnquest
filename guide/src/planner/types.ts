export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type Goal = Level | 'JFT' | 'SSW2';
export type StartLevel = 'none' | Level;
export type Focus = 'balanced' | 'kotoba' | 'kanji' | 'bunpou';
export type Category = 'kotoba' | 'kanji' | 'bunpou';

export interface PlanInput {
  goal: Goal;
  startLevel: StartLevel;
  durationDays: number;
  dailyMinutes: number;
  /** 1..7 hari belajar per minggu (Senin dulu, Minggu terakhir). */
  daysPerWeek: number;
  /** YYYY-MM-DD */
  startDate: string;
  focus: Focus;
}

export interface ItemRange {
  category: Category;
  /** Nomor urut 1-based di dalam urutan materi (terurut level). */
  from: number;
  to: number;
  count: number;
  level: Level;
}

export interface PlanDay {
  /** Hari belajar ke-n (bukan hari kalender). */
  dayNumber: number;
  date: string;
  kind: 'learn' | 'evaluation' | 'consolidation';
  newItems: ItemRange[];
  /** Nomor hari belajar yang diulang hari ini (spaced repetition). */
  reviewOf: number[];
  reviewMinutes: number;
  newMinutes: number;
  estimatedMinutes: number;
}

export interface PlanWeek {
  week: number;
  startDate: string;
  studyDays: number;
  newItems: Record<Category, number>;
  minutes: number;
  label: string;
}

export interface PlanSummary {
  totalItems: Record<Category, number>;
  plannedItems: Record<Category, number>;
  /** 0..1 — bagian materi yang sempat dijadwalkan. */
  coverage: number;
  studyDays: number;
  restDays: number;
  evaluationDays: number;
  consolidationDays: number;
  requiredMinutesPerDay: number;
  feasible: boolean;
  endDate: string;
}

export interface LearningPlan {
  fingerprint: string;
  input: PlanInput;
  days: PlanDay[];
  weeks: PlanWeek[];
  summary: PlanSummary;
  warnings: string[];
}

export type PlanError =
  | { code: 'invalid_input'; message: string }
  | { code: 'already_at_level'; message: string };
