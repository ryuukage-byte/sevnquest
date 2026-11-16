import type { Lesson } from '../engine/lessonSchema';
import type { Focus, Goal, StartLevel } from '../planner/types';

/** Satu bab di dalam jalur belajar. Tanpa lessonId = materi belum terbit (tampil sebagai "segera hadir"). */
export interface ProductChapter {
  id: string;
  title: string;
  lessonId?: string;
}

export interface ProductPath {
  id: string;
  title: string;
  subtitle: string;
  chapters: ProductChapter[];
}

/** Satu produk = satu sub-situs. Semua teks, materi, dan pilihan planner dibatasi oleh konfigurasi ini. */
export interface ProductConfig {
  id: string;
  title: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Fitur yang ditampilkan. Produk pemula sengaja dibuat sesederhana mungkin. */
  features: { planner: boolean; journey: boolean; account: boolean };
  ui: { sectionLabels: boolean; termChips: boolean };
  /** Semboyan metode belajar, ditampilkan di beranda. */
  method: string;
  paths: ProductPath[];
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
