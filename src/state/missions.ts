import type { Mission, PlayerStats } from '../types/rpg';

/**
 * Logika misi yang MURNI (sebelumnya inline di usePlayerActions.advanceMissions). Menjadikannya fungsi
 * murni membuat "misi mana yang bisa diselesaikan lewat jalur UI hidup" bisa diuji.
 */
export type MissionCategory =
  | 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'streak' | 'stage_clear' | 'boss' | 'quiz';

const bump = (m: Mission, amount: number): Mission => {
  const progress = Math.min(m.target, m.progress + amount);
  return { ...m, progress, completed: progress >= m.target };
};

export function advanceDailyMissions(missions: Mission[], category: MissionCategory, amount = 1): Mission[] {
  return missions.map(m => {
    if (m.id === 'dm_01' && category === 'bunpou') return bump(m, amount);
    if (m.id === 'dm_02' && category === 'kotoba') return bump(m, amount);
    if (m.id === 'dm_03' && category === 'kanji') return bump(m, amount);
    if (m.id === 'dm_04' && category === 'choukai') return bump(m, amount);
    // dm_05 = jumlah jawaban BENAR. Sebelumnya bunpou/kotoba/choukai ikut +1 sehingga satu kejadian terhitung dua kali.
    if (m.id === 'dm_05' && category === 'quiz') return bump(m, amount);
    return m;
  });
}

export function advanceWeeklyMissions(
  missions: Mission[],
  category: MissionCategory,
  amount = 1,
  extra?: { isPerfect?: boolean }
): Mission[] {
  return missions.map(m => {
    if (m.id === 'wm_01' && category === 'stage_clear') return bump(m, amount);
    if (m.id === 'wm_03' && category === 'dokkai' && extra?.isPerfect) return bump(m, amount);
    if (m.id === 'wm_04' && (category === 'boss' || category === 'stage_clear')) return bump(m, amount);
    return m;
  });
}

/** Hari ISO dalam minggu (Senin=1 … Minggu=7), kalender lokal. */
export function isoWeekday(now: Date): number {
  return now.getDay() || 7;
}

/**
 * Misi streak mingguan = jumlah hari BERURUTAN yang belajar dalam minggu ini
 * = min(streak berjalan, hari ke-n dalam minggu). Streak yang sudah terputus (terakhir belajar lebih lama
 * dari kemarin) dihitung 0. Progres tidak pernah turun dalam satu minggu.
 */
export function syncStreakMission(
  missions: Mission[],
  stats: Pick<PlayerStats, 'streakDays' | 'lastActiveDate'>,
  today: string,
  now: Date = new Date()
): Mission[] {
  const streakAlive = stats.lastActiveDate === today || stats.lastActiveDate === dayBefore(today);
  const current = streakAlive ? Math.min(stats.streakDays || 0, isoWeekday(now)) : 0;
  let changed = false;
  const out = missions.map(m => {
    if (m.id !== 'wm_02') return m;
    const progress = Math.min(m.target, Math.max(m.progress, current));
    if (progress === m.progress) return m;
    changed = true;
    return { ...m, progress, completed: progress >= m.target };
  });
  return changed ? out : missions;
}

function dayBefore(day: string): string {
  const [y, mo, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d - 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Misi yang saat ini TIDAK punya pemicu di UI hidup (dicatat agar tidak diam-diam menjadi "tak bisa selesai").
 * Keputusan produk diperlukan: hubungkan ke fitur hidup, ganti, atau sembunyikan.
 */
export const MISSIONS_WITHOUT_LIVE_TRIGGER: Readonly<Record<string, string>> = {
  dm_04: 'Choukai dinonaktifkan (CHOUKAI_ENABLED=false)',
  wm_01: 'Peta Stage tidak ada; tidak ada pemanggil advanceMissions("stage_clear")',
  wm_03: 'Dokkai sempurna: DokkaiModule (dihapus) satu-satunya pemanggil; Library memakai "questions"',
  wm_04: 'Boss Battle: BossBattleModule (dihapus) satu-satunya pemanggil',
};
