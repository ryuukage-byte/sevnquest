// ==============================================================================
// GUIDED LEARNING — TIPE (murni, tanpa React)
// Kurikulum = urutan ID materi SevnQuest yang dipilih dari basis data (tanpa LLM).
// Yang disimpan hanya PROFIL + penugasan hari ini; status "sudah dipelajari" selalu diturunkan dari
// `itemMastery`, sehingga belajar lewat Library / Buku Saku / Recall otomatis terhitung.
// ==============================================================================

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
/** Level yang SUDAH dikuasai saat memulai program. */
export type StartLevel = 'PEMULA' | 'N5' | 'N4' | 'N3' | 'N2';
export type GuidedCategory = 'kotoba' | 'kanji' | 'bunpou';
export type GuidedFocus = 'balanced' | GuidedCategory;
export type GuidedMissionKey = GuidedCategory | 'recall';

export interface GuidedProfile {
  currentLevel: StartLevel;
  targetLevel: JlptLevel;
  /** Lama program (hari). */
  durationDays: number;
  /** Waktu belajar per hari (menit). */
  minutesPerDay: number;
  focus: GuidedFocus;
}

/** Penugasan satu hari. Dibekukan saat hari dimulai supaya misi tidak bergeser ketika item diselesaikan. */
export interface GuidedDay {
  /** Tanggal lokal YYYY-MM-DD. */
  date: string;
  kotoba: string[];
  kanji: string[];
  bunpou: string[];
  /** ID yang sudah ditugaskan pada hari sebelumnya tetapi belum dipelajari (tertunda). */
  carried: string[];
  /** Target jawaban Recall hari ini (0 = belum ada materi untuk diulang). */
  recallTarget: number;
  claimed: Partial<Record<GuidedMissionKey, boolean>>;
}

export interface GuidedPlan {
  version: 1;
  /** 'stopped' = dihentikan pengguna; disimpan sebagai penanda agar tidak dihidupkan lagi oleh sinkronisasi cloud. */
  status: 'active' | 'stopped';
  profile: GuidedProfile;
  /** Tanggal lokal hari pertama program. */
  startDate: string;
  createdAt: string;
  updatedAt: string;
  today?: GuidedDay;
}

export type DailyQuota = Record<GuidedCategory, number>;

export interface CategoryCoverage {
  /** Materi yang tersedia di basis data untuk rentang level program. */
  available: number;
  /** Materi yang masuk kurikulum (dibatasi kapasitas waktu). */
  planned: number;
}

export interface Curriculum {
  levels: JlptLevel[];
  /** Urutan belajar per kategori (ID kanonik). */
  kotoba: string[];
  kanji: string[];
  bunpou: string[];
  /** Jatah materi baru per hari menurut kapasitas waktu. */
  quota: DailyQuota;
  /** Menit per hari yang dicadangkan untuk Recall. */
  recallMinutes: number;
  coverage: Record<GuidedCategory, CategoryCoverage>;
}

/** Bentuk minimal materi yang dibutuhkan generator (basis data asli memenuhi bentuk ini). */
export interface CurriculumSources {
  kotoba: ReadonlyArray<{ id: string; jlpt: string; kanjiComponents?: string[]; tags?: string[]; exampleSentence?: unknown }>;
  kanji: ReadonlyArray<{ id: string; jlpt: string; character: string }>;
  bunpou: ReadonlyArray<{ id: string; level: string }>;
}

/**
 * Tiga keadaan yang TIDAK sama:
 *  - baru       : belum pernah disentuh
 *  - dibuka     : hanya pernah dilihat (belum berlatih)
 *  - dipelajari : sudah berlatih (menulis / flashcard / kuis) -> memenuhi syarat Recall
 *  - dikuasai   : status mastery MASTERED / PERFECTED
 */
export type GuidedItemState = 'baru' | 'dibuka' | 'dipelajari' | 'dikuasai';
