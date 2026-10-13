import type { RewardSource } from './types';

/**
 * Aturan reward terpusat. SATU tempat untuk batas dan cakupan; tidak ada lagi flag per-komponen
 * (`rewardClaimed`, `quizScoreRecorded`, `Set` in-memory, dst.).
 *
 *  - scope 'none'     : tidak ada batas per-ref (hanya perlindungan kejadian ganda lewat eventKey) — dicatat di ledger.
 *  - scope 'day'      : maksimal `limit` pembayaran per (source, ref) per hari kalender lokal.
 *  - scope 'lifetime' : maksimal `limit` pembayaran per (source, ref) selamanya (atau sampai `ttlDays`).
 *
 * Angka `limit` di bawah adalah NILAI AWAL yang ditetapkan untuk menutup celah farming hasil audit;
 * mudah disetel di sini. Sumber yang belum diaudit tetap 'none' (perilaku lama, tapi sekarang tercatat).
 */
/** Keluarga sumber yang berbagi batas EXP harian (mencegah farming lewat mode yang berulang-ulang). */
export type RewardFamily = 'arcade' | 'dungeon' | 'drill' | 'writing' | 'tryout' | 'recall_extra' | 'fusion';

export interface RewardPolicy {
  scope: 'none' | 'day' | 'lifetime';
  limit?: number;
  /** Umur penanda untuk scope lifetime (hari). Kosong = permanen. */
  ttlDays?: number;
  /** Bila diisi, EXP sumber ini dihitung ke batas harian keluarganya (`FAMILY_DAILY_EXP_CAP`). */
  family?: RewardFamily;
}

/**
 * Batas EXP per hari (kalender lokal) untuk tiap keluarga. NILAI AWAL — mudah disetel di sini.
 * Saat sisa batas lebih kecil dari reward, sisanya tetap diberikan (sebagian); setelah itu ditolak (`daily_cap`).
 * Latihan tetap tercatat di mastery/SRS; hanya EXP/gold yang dibatasi.
 */
export const FAMILY_DAILY_EXP_CAP: Readonly<Record<RewardFamily, number>> = {
  arcade: 1500,
  dungeon: 3000,
  drill: 1500,
  writing: 2000,
  tryout: 2400,
  recall_extra: 500,
  fusion: 600,
};

export const REWARD_POLICY: Readonly<Record<RewardSource, RewardPolicy>> = {
  // Mikro-EXP balik kartu: sekali per kartu per hari (sebelumnya: sekali per sesi -> Restart bisa mengulang).
  flashcard_flip: { scope: 'day', limit: 1 },
  // Menyelesaikan kartu: sebelumnya tak terbatas (Next/Restart berulang).
  flashcard_complete: { scope: 'day', limit: 3 },
  // Soal tunggal di detail bunpou / modal materi: sebelumnya "sekali per buka modal".
  bunpou_detail_quiz: { scope: 'day', limit: 1 },
  entity_quiz: { scope: 'day', limit: 1 },
  // Conjugation Dojo: sebelumnya 15 EXP di SETIAP jawaban benar. Kini sekali per kombinasi verb|bentuk per hari.
  conjugation_dojo: { scope: 'day', limit: 1 },
  // Clear pertama lantai Tower: sekali selamanya; ikut tersimpan ke cloud sehingga berlaku lintas perangkat.
  tower_floor: { scope: 'lifetime', limit: 1 },
  // Klaim misi: sekali per misi per periode (ref memuat ID periode). Penanda dibersihkan setelah 8 hari.
  mission_claim: { scope: 'lifetime', limit: 1, ttlDays: 8 },
  // Grammar Fusion latihan bebas: sekali per kombinasi pola|verb per hari (sebelumnya Set in-memory yang hilang saat refresh).
  fusion_free: { scope: 'day', limit: 1, family: 'fusion' },
  // Simulasi ujian: 10 EXP × skor skala (maks 120–180) = hingga ±1.200 EXP per ujian dan sebelumnya bisa diulang tanpa batas.
  // Sekali per ujian per hari.
  tryout_exam: { scope: 'day', limit: 1, family: 'tryout' },
  // Text Study: sekali per entitas (kata/pola) per hari; menggantikan Set modul-level yang hilang saat refresh.
  text_study_entity: { scope: 'day', limit: 1 },
  // Belum diatur batasnya; dicatat.
  // Grammar Fusion stage: clear pertama sekali selamanya (lintas perangkat lewat ledger); ulangan dibatasi harian.
  fusion_stage_first: { scope: 'lifetime', limit: 1, family: 'fusion' },
  fusion_stage_repeat: { scope: 'day', limit: 5, family: 'fusion' },
  // Arcade: jawaban benar berulang-ulang by design -> dibatasi lewat keluarga (EXP harian), bukan per ref.
  arcade_kanji_speed: { scope: 'none', family: 'arcade' },
  arcade_kotoba_guess: { scope: 'none', family: 'arcade' },
  arcade_sudden_death: { scope: 'none', family: 'arcade' },
  arcade_conjugation_rush: { scope: 'none', family: 'arcade' },
  arcade_star_sentence: { scope: 'none', family: 'arcade' },
  // Dungeon: reward agregat per sesi (eventKey = ID sesi); total harian dibatasi.
  dungeon_session: { scope: 'none', family: 'dungeon' },
  // Drill soal Library: dibatasi total harian.
  drill_session: { scope: 'none', family: 'drill' },
  // Menulis kanji/kosakata: sheet berulang pada materi yang sama dibatasi per hari + total harian.
  writing_practice: { scope: 'day', limit: 5, family: 'writing' },
  // Latihan Ekstra Recall (di luar jatah harian 40 jawaban): dibatasi total harian.
  recall_extra: { scope: 'none', family: 'recall_extra' },
  recall_session: { scope: 'none' },
  study_unclassified: { scope: 'none' },
  legacy_unclassified: { scope: 'none' },
};

/** Umur penanda kejadian (eventKey) dan penanda harian. */
export const EVENT_KEY_TTL_DAYS = 2;
export const DAY_CLAIM_TTL_DAYS = 3;
/** Jumlah entri riwayat yang disimpan (lokal + cloud). */
export const REWARD_LEDGER_MAX = 200;
