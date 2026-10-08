import { useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import type { PlayerStats, StageClearData, Mission } from '../types/rpg';
import { safeSetItem } from '../utils/storage';
import { stripDerivedStats } from '../state/derivedState';
import {
  STORAGE_KEY_STATS,
  STORAGE_KEY_STAGES,
  STORAGE_KEY_DAILY,
  STORAGE_KEY_WEEKLY,
} from '../state/storageKeys';

interface Params {
  stats: PlayerStats;
  stageProgress: Record<string, StageClearData>;
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  statsRef: MutableRefObject<PlayerStats>;
  stageProgressRef: MutableRefObject<Record<string, StageClearData>>;
  dailyMissionsRef: MutableRefObject<Mission[]>;
  weeklyMissionsRef: MutableRefObject<Mission[]>;
  showToast: (message: string, ms?: number) => void;
}

/** Persistensi localStorage terdebounce + flush sinkron saat tab disembunyikan; menangani kuota penuh. */
export function usePersistence({
  stats, stageProgress, dailyMissions, weeklyMissions,
  statsRef, stageProgressRef, dailyMissionsRef, weeklyMissionsRef,
  showToast,
}: Params) {
// Tulis ke localStorage dengan penanganan QuotaExceededError (toast sekali per episode kuota penuh).
  const quotaWarnedRef = useRef(false);
  const persist = useCallback((key: string, value: unknown) => {
    const result = safeSetItem(key, JSON.stringify(value));
    if (result === 'quota') {
      if (!quotaWarnedRef.current) {
        quotaWarnedRef.current = true;
        showToast('Penyimpanan perangkat penuh — progres terbaru mungkin tidak tersimpan secara lokal. Kosongkan ruang lalu coba lagi.', 7000);
      }
    } else if (result === 'ok') {
      quotaWarnedRef.current = false;
    }
  }, [showToast]);

  // Sync to LocalStorage (debounced to avoid blocking main thread on every tiny state change)
  useEffect(() => {
    const timerId = setTimeout(() => persist(STORAGE_KEY_STATS, stripDerivedStats(stats)), 1000);
    return () => clearTimeout(timerId);
  }, [stats, persist]);

  useEffect(() => {
    const timerId = setTimeout(() => persist(STORAGE_KEY_STAGES, stageProgress), 1000);
    return () => clearTimeout(timerId);
  }, [stageProgress, persist]);

  useEffect(() => {
    const timerId = setTimeout(() => persist(STORAGE_KEY_DAILY, dailyMissions), 1000);
    return () => clearTimeout(timerId);
  }, [dailyMissions, persist]);

  useEffect(() => {
    const timerId = setTimeout(() => persist(STORAGE_KEY_WEEKLY, weeklyMissions), 1000);
    return () => clearTimeout(timerId);
  }, [weeklyMissions, persist]);

  // Flush sinkron saat tab disembunyikan / ditutup: debounce 1 detik di atas tidak sempat jalan
  // pada kasus ini (terutama di mobile, di mana beforeunload tidak andal).
  useEffect(() => {
    const flush = () => {
      persist(STORAGE_KEY_STATS, stripDerivedStats(statsRef.current));
      persist(STORAGE_KEY_STAGES, stageProgressRef.current);
      persist(STORAGE_KEY_DAILY, dailyMissionsRef.current);
      persist(STORAGE_KEY_WEEKLY, weeklyMissionsRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [persist]);
}
