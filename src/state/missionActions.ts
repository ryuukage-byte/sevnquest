/**
 * Tombol "Kerjakan" di kartu misi: tiap misi mingguan diarahkan langsung ke fitur yang memajukannya,
 * supaya pemain tidak perlu mencari sendiri (saran pengguna lewat Kantor Pos).
 * Tujuan di sini HARUS sama dengan pemicu di state/missions.ts (advanceWeeklyMissions).
 */
export type MissionGoTarget = 'tower' | 'dungeon' | 'dokkai' | 'daily';

export interface MissionAction {
  label: string;
  target: MissionGoTarget;
}

export const MISSION_ACTIONS: Readonly<Record<string, MissionAction>> = {
  wm_01: { label: 'Ke Menara', target: 'tower' },
  // Streak naik dengan belajar apa saja hari ini; Misi Harian adalah jalur termudah.
  wm_02: { label: 'Belajar Hari Ini', target: 'daily' },
  wm_03: { label: 'Buka Dokkai', target: 'dokkai' },
  wm_04: { label: 'Masuk Dungeon', target: 'dungeon' },
};

export function getMissionAction(missionId: string): MissionAction | undefined {
  return MISSION_ACTIONS[missionId];
}
