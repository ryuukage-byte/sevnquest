// ==============================================================================
// GUIDED LEARNING — TIPE (murni, tanpa React)
// Kurikulum = urutan ID materi INTI level target yang dipilih dari basis data (tanpa LLM).
// Yang disimpan hanya PROFIL + penugasan hari ini; status "sudah dipelajari" selalu diturunkan dari
// `itemMastery`, sehingga belajar lewat Library / Buku Saku / Recall otomatis terhitung.
// ==============================================================================

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
/** Level yang SUDAH dikuasai saat memulai program. */
export type StartLevel = 'PEMULA' | 'N5' | 'N4' | 'N3' | 'N2';
export type GuidedCategory = 'kotoba' | 'kanji' | 'bunpou';
export type GuidedFocus = 'balanced' | GuidedCategory;
export type GuidedMissionKey = GuidedCategory | 'recall' | 'evaluasi';

/**
 * Dua jenis program yang TIDAK sama:
 *  - 'target' : pengguna memilih target + menit/hari -> sistem menghitung durasi yang dibutuhkan untuk menuntaskan gap.
 *  - 'time'   : pengguna memilih durasi + menit/hari -> sistem menyatakan seberapa banyak materi prioritas yang realistis.
 */
export type GuidedMode = 'target' | 'time';

export interface GuidedProfile {
  mode: GuidedMode;
  currentLevel: StartLevel;
  targetLevel: JlptLevel;
  /** Lama program (hari). Pada mode 'target' diisi sistem saat program dibuat. */
  durationDays: number;
  /** Waktu belajar per hari (menit). */
  minutesPerDay: number;
  /** Prioritas bila waktu tidak cukup untuk semua kategori. */
  focus: GuidedFocus;
}

export type DayNote = 'recall_heavy' | 'recall_light' | 'retention_low';

/** Penugasan satu hari. Dibekukan saat hari dimulai supaya misi tidak bergeser ketika item diselesaikan. */
export interface GuidedDay {
  /** Tanggal lokal YYYY-MM-DD. */
  date: string;
  kotoba: string[];
  kanji: string[];
  bunpou: string[];
  /** ID yang sudah ditugaskan pada hari sebelumnya tetapi belum dipelajari (tertunda). */
  carried: string[];
  /** Target jawaban Recall hari ini — mengikuti jumlah materi yang jatuh tempo, bukan porsi waktu tetap. */
  recallTarget: number;
  /** Menit yang dipakai Recall hari ini (sisanya untuk materi baru). */
  recallMinutes?: number;
  /** Alasan jatah materi baru hari ini berbeda dari jatah dasar. */
  notes?: DayNote[];
  /** Evaluasi berkala (tiap 7 hari): jumlah soal latihan level target yang harus dikerjakan. */
  evalTarget?: number;
  /** Penghitung soal/simulasi saat hari dimulai; kemajuan evaluasi = selisih terhadap nilai ini. */
  evalBaseline?: { questions: number; tryOuts: number };
  claimed: Partial<Record<GuidedMissionKey, boolean>>;
}

export type CategoryCount = Record<GuidedCategory, number>;

export interface GuidedPlan {
  version: 1;
  /** 'stopped' = dihentikan pengguna; disimpan sebagai penanda agar tidak dihidupkan lagi oleh sinkronisasi cloud. */
  status: 'active' | 'stopped';
  profile: GuidedProfile;
  /** Tanggal lokal hari pertama program. */
  startDate: string;
  createdAt: string;
  updatedAt: string;
  /** Materi inti yang SUDAH dipelajari saat program dibuat (titik awal pengukuran laju). */
  baseline?: CategoryCount;
  /** Materi yang ditargetkan selesai dalam durasi program (mode 'target' = seluruh gap). */
  goal?: CategoryCount;
  today?: GuidedDay;
}

export type DailyQuota = CategoryCount;

export interface Curriculum {
  levels: JlptLevel[];
  /** Urutan belajar per kategori: SELURUH materi inti level program (ID kanonik). */
  kotoba: string[];
  kanji: string[];
  bunpou: string[];
  /** Jumlah entri di Library untuk level program (termasuk kosakata perluasan yang bukan materi inti). */
  library: CategoryCount;
  /** Perkiraan menit mempelajari satu materi baru, sudah memperhitungkan tingkat kesulitan level. */
  learnMinutes: CategoryCount;
}

/** Bentuk minimal materi yang dibutuhkan generator (basis data asli memenuhi bentuk ini). */
export interface CurriculumSources {
  kotoba: ReadonlyArray<{ id: string; jlpt: string; kanjiComponents?: string[]; tags?: string[]; exampleSentence?: unknown }>;
  kanji: ReadonlyArray<{ id: string; jlpt: string; character: string }>;
  bunpou: ReadonlyArray<{ id: string; level: string }>;
}

export interface CategoryAnalysis {
  /** Semua entri Library pada level program. */
  library: number;
  /** Materi inti target (yang masuk kurikulum). */
  core: number;
  /** Materi inti yang sudah dipelajari (tercatat di riwayat). */
  learned: number;
  /** Masih perlu dipelajari = core − learned. */
  gap: number;
  /** Yang realistis diselesaikan dalam durasi program. */
  planned: number;
  /** Materi baru per hari. */
  quota: number;
}

/** Analisis gap + estimasi beban + kelayakan target. */
export interface PlanAnalysis {
  mode: GuidedMode;
  /** Durasi yang dipakai program (mode 'target' = durasi yang dibutuhkan). */
  days: number;
  minutesPerDay: number;
  categories: Record<GuidedCategory, CategoryAnalysis>;
  /** Total menit untuk menuntaskan seluruh gap (belajar + pengulangan). */
  workloadMinutes: number;
  /** Hari yang dibutuhkan untuk menuntaskan gap dengan menit/hari ini. */
  requiredDays: number;
  /** Menit/hari yang dibutuhkan untuk menuntaskan gap dalam `days` hari. */
  requiredMinutesPerDay: number;
  /** Durasi + waktu harian cukup untuk menuntaskan seluruh gap. */
  feasible: boolean;
  /** Persentase gap yang tercakup (menurut jumlah materi). */
  coveragePercent: number;
  /** Rata-rata pengulangan per materi selama program (dari interval SRS). */
  reviewsPerItem: number;
  /** Perkiraan pembagian waktu harian. */
  newMinutesPerDay: number;
  recallMinutesPerDay: number;
}

/**
 * Tiga keadaan yang TIDAK sama:
 *  - baru       : belum pernah disentuh
 *  - dibuka     : hanya pernah dilihat (belum berlatih)
 *  - dipelajari : sudah berlatih (menulis / flashcard / kuis) -> memenuhi syarat Recall
 *  - dikuasai   : status mastery MASTERED / PERFECTED
 */
export type GuidedItemState = 'baru' | 'dibuka' | 'dipelajari' | 'dikuasai';
