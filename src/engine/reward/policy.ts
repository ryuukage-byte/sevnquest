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
export interface RewardPolicy {
  scope: 'none' | 'day' | 'lifetime';
  limit?: number;
  /** Umur penanda untuk scope lifetime (hari). Kosong = permanen. */
  ttlDays?: number;
}

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
  fusion_free: { scope: 'day', limit: 1 },
  // Belum diatur batasnya; dicatat.
  fusion_stage: { scope: 'none' },
  recall_session: { scope: 'none' },
  study_unclassified: { scope: 'none' },
  legacy_unclassified: { scope: 'none' },
};

/** Umur penanda kejadian (eventKey) dan penanda harian. */
export const EVENT_KEY_TTL_DAYS = 2;
export const DAY_CLAIM_TTL_DAYS = 3;
/** Jumlah entri riwayat yang disimpan (lokal + cloud). */
export const REWARD_LEDGER_MAX = 200;
