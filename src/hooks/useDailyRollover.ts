import { useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { PlayerStats, Mission } from '../types/rpg';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import { getTodayLocalDate, getLocalIsoWeekId } from '../utils/time';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { STORAGE_KEY_LAST_DAILY_RESET, STORAGE_KEY_LAST_WEEKLY_RESET } from '../state/storageKeys';
import { expireStreak } from '../state/streak';
import { ensureToday } from '../engine/curriculum/curriculum';
import { getCurriculum } from '../engine/curriculum/sources';

interface Params {
  setStats: Dispatch<SetStateAction<PlayerStats>>;
  setDailyMissions: Dispatch<SetStateAction<Mission[]>>;
  setWeeklyMissions: Dispatch<SetStateAction<Mission[]>>;
}

export function useDailyRollover({ setStats, setDailyMissions, setWeeklyMissions }: Params) {
// Rollover harian (misi harian) & mingguan (misi mingguan, ISO week, Senin 00:00 lokal).
  // Dijalankan saat mount, saat tab kembali terlihat, dan tiap menit supaya aplikasi yang dibiarkan
  // terbuka melewati tengah malam tetap ter-reset.
  // Streak TIDAK naik di sini: streak dihitung dari aktivitas belajar (state/streak.ts -> touchActiveDay).
  // Rollover hanya memutus streak yang sudah lewat dari kemarin dan mereset penghitung waktu belajar harian.
  const applyRollover = useCallback(() => {
    const today = getTodayLocalDate();
    if (safeGetItem(STORAGE_KEY_LAST_DAILY_RESET) !== today) {
      setDailyMissions(INITIAL_DAILY_MISSIONS);
      safeSetItem(STORAGE_KEY_LAST_DAILY_RESET, today);
    }

    const weekId = getLocalIsoWeekId();
    if (safeGetItem(STORAGE_KEY_LAST_WEEKLY_RESET) !== weekId) {
      setWeeklyMissions(INITIAL_WEEKLY_MISSIONS);
      safeSetItem(STORAGE_KEY_LAST_WEEKLY_RESET, weekId);
    }

    setStats(prev => {
      let next = expireStreak(prev, today);
      if (next.lastStudyDate !== today) next = { ...next, todayStudySeconds: 0, lastStudyDate: today };
      // Misi kurikulum hari ini: disusun sekali per hari dari sisa materi (yang tertunda didahulukan).
      const plan = next.guidedPlan;
      if (plan?.status === 'active' && plan.today?.date !== today) {
        const guidedPlan = ensureToday(plan, getCurriculum(plan.profile), next.itemMastery, today, { studyStats: next.studyStats });
        if (guidedPlan && guidedPlan !== plan) next = { ...next, guidedPlan };
      }
      return next === prev ? prev : next;
    });
  }, []);

  useEffect(() => {
    applyRollover();
    const onVisible = () => {
      if (document.visibilityState === 'visible') applyRollover();
    };
    document.addEventListener('visibilitychange', onVisible);
    const intervalId = window.setInterval(applyRollover, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(intervalId);
    };
  }, [applyRollover]);
}
