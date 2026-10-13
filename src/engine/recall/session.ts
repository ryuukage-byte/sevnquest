// ==============================================================================
// RECALL — KUOTA & PERENCANAAN SESI (murni, tanpa React)
// Tiga batas yang saling melengkapi:
//  - sessionSize : item per sesi (satu "putaran" Recall; cukup pendek agar tetap fokus)
//  - dailyCap    : total jawaban Recall per hari (batas beban ulang; mencegah menumpuk lalu kewalahan)
//  - newPerDay   : materi "baru dilatih, belum pernah diuji" yang diperkenalkan per hari
//                  (item lama yang jatuh tempo SRS / lemah / kritis tidak dibatasi oleh kuota ini)
// Setelah dailyCap tercapai pemain boleh "Latihan Ekstra" (sesi kecil, tetap mengikuti prioritas).
// ==============================================================================

import type { RecallQueueItem } from '../../types/content';

export const RECALL_LIMITS = {
  sessionSize: 10,
  dailyCap: 40,
  newPerDay: 10,
  extraSessionSize: 5,
} as const;

/** Penghitung harian; disimpan di PlayerStats.recallDaily (ikut tersimpan lokal & cloud). */
export interface RecallDaily {
  /** Tanggal lokal YYYY-MM-DD. */
  date: string;
  /** Jumlah jawaban Recall hari ini. */
  answered: number;
  /** Jumlah materi yang untuk pertama kalinya diuji di Recall hari ini. */
  newTested: number;
  /** Jumlah sesi Recall yang diselesaikan hari ini. */
  sessions: number;
}

/** Hitungan hari ini; tanggal lain (kemarin / belum ada) dianggap mulai dari nol. */
export function normalizeRecallDaily(daily: RecallDaily | undefined, today: string): RecallDaily {
  return daily && daily.date === today
    ? daily
    : { date: today, answered: 0, newTested: 0, sessions: 0 };
}

/** Catat satu jawaban Recall. `wasNew` = materi ini baru pertama kali diuji. */
export function recordRecallAnswer(daily: RecallDaily | undefined, today: string, wasNew: boolean): RecallDaily {
  const d = normalizeRecallDaily(daily, today);
  return { ...d, answered: d.answered + 1, newTested: d.newTested + (wasNew ? 1 : 0) };
}

export function recordRecallSession(daily: RecallDaily | undefined, today: string): RecallDaily {
  const d = normalizeRecallDaily(daily, today);
  return { ...d, sessions: d.sessions + 1 };
}

/** Gabungan dua penghitung (lokal vs cloud): hari terbaru menang; hari sama -> angka terbesar. */
export function mergeRecallDaily(a: RecallDaily | undefined, b: RecallDaily | undefined): RecallDaily | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.date !== b.date) return a.date > b.date ? a : b;
  return {
    date: a.date,
    answered: Math.max(a.answered, b.answered),
    newTested: Math.max(a.newTested, b.newTested),
    sessions: Math.max(a.sessions, b.sessions),
  };
}

export interface RecallPlan {
  /** Item untuk sesi ini, urut prioritas. */
  items: RecallQueueItem[];
  /** Sisa jatah jawaban hari ini (sebelum sesi ini). */
  remainingToday: number;
  /** Sisa jatah materi baru hari ini. */
  newRemaining: number;
  /** Jatah harian habis dan bukan mode ekstra. */
  capReached: boolean;
  /** Item layak yang tidak masuk sesi ini (karena batas sesi / kuota baru); tetap di antrean untuk nanti. */
  deferred: number;
  extra: boolean;
}

/**
 * Pilih item sesi dari antrean berprioritas. Urutan antrean TIDAK diubah (prioritas SRS tetap berlaku);
 * yang dilakukan hanya memotong sesuai batas:
 *  1. jatah harian tersisa -> ukuran sesi maksimal
 *  2. materi baru (NEW_UNTESTED) dibatasi newPerDay; item lain (kritis/lemah/jatuh tempo) tidak
 */
export function planRecallSession(
  queue: RecallQueueItem[],
  daily: RecallDaily | undefined,
  today: string,
  opts: { extra?: boolean; limits?: Partial<typeof RECALL_LIMITS> } = {}
): RecallPlan {
  const limits = { ...RECALL_LIMITS, ...(opts.limits || {}) };
  const d = normalizeRecallDaily(daily, today);
  const extra = !!opts.extra;
  const remainingToday = Math.max(0, limits.dailyCap - d.answered);
  const newRemaining = Math.max(0, limits.newPerDay - d.newTested);
  const capReached = remainingToday === 0 && !extra;

  const size = extra ? limits.extraSessionSize : Math.min(limits.sessionSize, remainingToday);
  const items: RecallQueueItem[] = [];
  let newLeft = newRemaining;
  if (size > 0) {
    for (const item of queue) {
      if (items.length >= size) break;
      if (item.reason === 'NEW_UNTESTED') {
        if (newLeft <= 0) continue;
        newLeft--;
      }
      items.push(item);
    }
  }
  return { items, remainingToday, newRemaining, capReached, deferred: Math.max(0, queue.length - items.length), extra };
}
