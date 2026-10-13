/**
 * Model reward SevnQuest: EXP/gold adalah TRANSAKSI (sumber + alasan + identitas), bukan sekadar penambahan angka.
 * Semua kode di sini murni (tanpa React) agar bisa diuji dan dipakai ulang.
 */

/** Jenis sumber reward. `legacy_unclassified` = pemanggil lama yang belum memberi sumber (tetap dicatat). */
export type RewardSource =
  | 'flashcard_flip'
  | 'flashcard_complete'
  | 'bunpou_detail_quiz'
  | 'entity_quiz'
  | 'conjugation_dojo'
  | 'tower_floor'
  | 'mission_claim'
  | 'fusion_free'
  | 'fusion_stage_first'
  | 'fusion_stage_repeat'
  | 'tryout_exam'
  | 'text_study_entity'
  | 'arcade_kanji_speed'
  | 'arcade_kotoba_guess'
  | 'arcade_sudden_death'
  | 'arcade_conjugation_rush'
  | 'arcade_star_sentence'
  | 'dungeon_session'
  | 'drill_session'
  | 'writing_practice'
  | 'recall_extra'
  | 'recall_session'
  | 'study_unclassified'
  | 'legacy_unclassified';

/** Metadata yang dikirim pemanggil bersama reward. */
export interface RewardMeta {
  source: RewardSource;
  /** Identitas hal yang diberi reward (ID materi, lantai, kombinasi verb|form, dst.). */
  ref?: string;
  /**
   * Identitas SATU kejadian (mis. ID sesi + indeks kartu). Kejadian yang sama tidak dibayar dua kali
   * (klik ganda, StrictMode, re-render, panggilan berulang). Berlaku 2 hari.
   */
  eventKey?: string;
  /** Alasan singkat yang dapat dibaca manusia (untuk riwayat). */
  note?: string;
}

/** Tanda tangan handler reward yang diteruskan ke komponen (meta opsional agar pemanggil lama tetap valid). */
/** Hasil handleStudyComplete: keputusan reward (void bila tidak ada reward yang diminta). */
export type StudyCompleteResult = RewardDecision | void;

export type RewardHandler = (exp: number, gold: number, meta?: RewardMeta) => RewardDecision | void;

export interface RewardRequest extends RewardMeta {
  exp: number;
  gold: number;
}

export type RewardDenyReason = 'duplicate_event' | 'limit_reached' | 'daily_cap' | 'empty';

export interface RewardDecision {
  granted: boolean;
  reason?: RewardDenyReason;
  /** Jumlah yang benar-benar diberikan (0 bila ditolak). */
  exp: number;
  gold: number;
  /** true bila hanya sebagian yang diberikan karena batas EXP harian keluarga sumber hampir habis. */
  capped?: boolean;
}

export interface RewardLedgerEntry {
  /** ID unik entri (waktu + nomor urut). */
  id: string;
  /** ISO waktu pemberian. */
  at: string;
  source: RewardSource;
  ref?: string;
  eventKey?: string;
  exp: number;
  gold: number;
  note?: string;
}

/** Penanda "sudah diklaim" untuk idempotency/batas. `n` = berapa kali dibayar; `until` = kedaluwarsa (ISO) atau tak ada. */
export interface RewardClaim {
  n: number;
  at: string;
  until?: string;
}

export interface RewardState {
  rewardLedger?: RewardLedgerEntry[];
  rewardClaims?: Record<string, RewardClaim>;
}
