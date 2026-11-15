import type { Lesson } from '../engine/lessonSchema';
import type { Focus, Goal, StartLevel } from '../planner/types';

export interface ProductModule {
  id: string;
  title: string;
  subtitle: string;
  lessonIds: string[];
}

/** Satu produk = satu sub-situs. Semua teks, materi, dan pilihan planner dibatasi oleh konfigurasi ini. */
export interface ProductConfig {
  id: string;
  title: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  modules: ProductModule[];
  planner: {
    goals: { v: Goal; l: string }[];
    starts: { v: StartLevel; l: string }[];
    focuses: Focus[];
    defaults: { durationDays: number; dailyMinutes: number; daysPerWeek: number };
  };
}

export interface Product {
  config: ProductConfig;
  lessons: Lesson[];
}
