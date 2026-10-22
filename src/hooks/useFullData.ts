import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { ensureFullData } from '../data/fullData';
import { buildSmartRecallQueue } from '../utils/mastery';
import type { PlayerStats } from '../types/rpg';

// Mulai memuat setelah tampilan pertama sempat interaktif; layar lazy yang dibuka lebih dulu memicunya langsung.
const IDLE_TIMEOUT_MS = 1500;

/**
 * Muat data lengkap (detail kotoba, bank soal) di latar belakang setelah tampilan pertama, lalu bangun ulang
 * antrean Recall: soal contoh yang dibuat saat boot memakai soal cadangan karena bank soal belum dimuat.
 */
export function useFullData(setStats: Dispatch<SetStateAction<PlayerStats>>): void {
  useEffect(() => {
    let cancelled = false;
    const start = () => {
      ensureFullData()
        .then(() => {
          if (cancelled) return;
          setStats(prev => (prev.recallQueue?.length
            ? { ...prev, recallQueue: buildSmartRecallQueue(prev.itemMastery || {}) }
            : prev));
        })
        .catch(err => console.warn('[data] Gagal memuat data lengkap di latar belakang:', err));
    };
    const ric = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback : null;
    const handle = ric ? ric(start, { timeout: IDLE_TIMEOUT_MS }) : window.setTimeout(start, IDLE_TIMEOUT_MS);
    return () => {
      cancelled = true;
      if (ric) window.cancelIdleCallback(handle); else window.clearTimeout(handle);
    };
  }, [setStats]);
}
