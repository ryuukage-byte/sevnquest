import { useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { PlayerStats, Mission } from '../types/rpg';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import { getTodayLocalDate, getLocalIsoWeekId } from '../utils/time';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { STORAGE_KEY_LAST_DAILY_RESET, STORAGE_KEY_LAST_WEEKLY_RESET } from '../state/storageKeys';

interface Params {
  setStats: Dispatch<SetStateAction<PlayerStats>>;
  setDailyMissions: Dispatch<SetStateAction<Mission[]>>;
  setWeeklyMissions: Dispatch<SetStateAction<Mission[]>>;
}

export function useDailyRollover({ setStats, setDailyMissions, setWeeklyMissions }: Params) {
// Rollover harian (misi harian + streak) & mingguan (misi mingguan, ISO week, Senin 00:00 lokal).
  // Dijalankan saat mount, saat tab kembali terlihat, dan tiap menit supaya aplikasi yang dibiarkan
  // terbuka melewati tengah malam tetap ter-reset.
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
      const lastActive = prev.lastActiveDate;
      if (lastActive === today) return prev;

      let newStreak = prev.streakDays || 0;
      if (!lastActive) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastActive + 'T00:00:00');
        const currentDate = new Date(today + 'T00:00:00');
        const diffMs = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        } else if (diffDays <= 0) {
          // Same day or clock manipulation backwards - do not increment streak
          return prev;
        }
      }

      return {
        ...prev,
        streakDays: newStreak,
        longestStreak: Math.max(prev.longestStreak || 0, newStreak),
        totalActiveDays: (prev.totalActiveDays || 0) + 1,
        lastActiveDate: today,
        todayStudySeconds: 0,
        lastStudyDate: today,
      };
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
