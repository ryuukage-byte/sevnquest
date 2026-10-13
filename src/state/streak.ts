import type { PlayerStats } from '../types/rpg';

/**
 * Streak berbasis BELAJAR (bukan sekadar membuka aplikasi).
 *  - touchActiveDay : dipanggil saat ada aktivitas belajar nyata -> hari ini dihitung aktif.
 *  - expireStreak   : dipanggil saat rollover -> bila terakhir belajar lebih lama dari kemarin, streak = 0.
 * Kalender lokal (YYYY-MM-DD), sama dengan reset misi harian.
 */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function touchActiveDay(stats: PlayerStats, today: string): PlayerStats {
  const streak = stats.streakDays || 0;
  const last = stats.lastActiveDate;
  // Sudah dihitung hari ini (dan streak valid).
  if (last === today && streak >= 1) return stats;

  const gap = last ? daysBetween(last, today) : Infinity;
  const next = gap === 1 ? streak + 1 : gap <= 0 ? Math.max(streak, 1) : 1;
  return {
    ...stats,
    streakDays: next,
    longestStreak: Math.max(stats.longestStreak || 0, next),
    totalActiveDays: (stats.totalActiveDays || 0) + 1,
    lastActiveDate: today,
  };
}

export function expireStreak(stats: PlayerStats, today: string): PlayerStats {
  if (!stats.streakDays || !stats.lastActiveDate) return stats;
  return daysBetween(stats.lastActiveDate, today) > 1 ? { ...stats, streakDays: 0 } : stats;
}
