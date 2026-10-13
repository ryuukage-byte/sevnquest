import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import {
  advanceDailyMissions, advanceWeeklyMissions, syncStreakMission, isoWeekday,
  MISSIONS_WITHOUT_LIVE_TRIGGER, type MissionCategory,
} from './missions';
import { touchActiveDay, expireStreak, daysBetween } from './streak';
import { getStudyMissionAdvances } from './playerProgress';
import { awardExp } from '../engine/reward/awardExp';
import { applyStudyToStats } from './playerProgress';
import { DEFAULT_STATS } from './defaultStats';
import type { PlayerStats } from '../types/rpg';

const fresh = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  ...DEFAULT_STATS, userId: 'u', itemMastery: {}, recallQueue: [], ...over,
});
const prog = (ms: { id: string; progress: number }[], id: string) => ms.find(m => m.id === id)!.progress;

// ------------------------------------------------------------ misi

test('M1. dm_05 hanya menghitung jawaban benar (tidak dobel dengan bunpou/kotoba/choukai)', () => {
  let d = INITIAL_DAILY_MISSIONS;
  d = advanceDailyMissions(d, 'bunpou');
  d = advanceDailyMissions(d, 'kotoba', 3);
  d = advanceDailyMissions(d, 'choukai');
  assert.equal(prog(d, 'dm_05'), 0);
  d = advanceDailyMissions(d, 'quiz', 5);
  assert.equal(prog(d, 'dm_05'), 5);
  assert.equal(d.find(m => m.id === 'dm_05')!.completed, true);
});

test('M2. progres misi dibatasi target dan menandai completed', () => {
  const d = advanceDailyMissions(INITIAL_DAILY_MISSIONS, 'kanji', 99);
  assert.equal(prog(d, 'dm_03'), 3);
  assert.equal(d.find(m => m.id === 'dm_03')!.completed, true);
});

test('M3. misi mingguan tidak lagi mulai dengan progres gratis', () => {
  assert.equal(prog(INITIAL_WEEKLY_MISSIONS, 'wm_01'), 0);
  assert.equal(prog(INITIAL_WEEKLY_MISSIONS, 'wm_02'), 0);
});

test('M4. flashcard kanji tidak memajukan misi kanji; menulis kanji memajukan', () => {
  const cats = (o: Parameters<typeof getStudyMissionAdvances>[0]) => getStudyMissionAdvances(o).map(a => a.category);
  assert.deepEqual(cats({ moduleId: 'kanji', interaction: 'flashcard' }), []);
  assert.deepEqual(cats({ moduleId: 'kanji', interaction: 'writing', score: 1, total: 1 }), ['kanji', 'quiz']);
});

test('M5. daftar misi tanpa pemicu hidup eksplisit & benar-benar tak bisa maju lewat kategori yang ada', () => {
  const categories: MissionCategory[] = ['bunpou', 'kotoba', 'kanji', 'dokkai', 'choukai', 'streak', 'stage_clear', 'boss', 'quiz'];
  // Pemicu hidup = kategori yang dihasilkan getStudyMissionAdvances untuk modul yang masih terpasang di UI.
  const liveModules = ['bunpou', 'kotoba', 'kanji', 'questions', 'tryOuts'] as const;
  const live = new Set<string>();
  for (const moduleId of liveModules) {
    for (const interaction of ['writing', 'flashcard', 'quiz'] as const) {
      for (const a of getStudyMissionAdvances({ moduleId, interaction, score: 1, total: 1 })) live.add(a.category);
    }
  }
  live.add('streak'); // via syncStreakMission
  const daily = INITIAL_DAILY_MISSIONS.map(m => m.id);
  const weekly = INITIAL_WEEKLY_MISSIONS.map(m => m.id);
  const reachable = (id: string): boolean => categories.some(cat => {
    if (!live.has(cat)) return false;
    const before = id.startsWith('dm') ? INITIAL_DAILY_MISSIONS : INITIAL_WEEKLY_MISSIONS;
    const after = id.startsWith('dm')
      ? advanceDailyMissions(before, cat, 99)
      : advanceWeeklyMissions(before, cat, 99, { isPerfect: true });
    return prog(after, id) > prog(before, id);
  }) || id === 'wm_02';
  const unreachable = [...daily, ...weekly].filter(id => !reachable(id)).sort();
  assert.deepEqual(unreachable, Object.keys(MISSIONS_WITHOUT_LIVE_TRIGGER).sort());
});

// ------------------------------------------------------------ streak

test('S1. membuka aplikasi TIDAK menaikkan streak; belajar menaikkannya', () => {
  const s = fresh({ streakDays: 3, lastActiveDate: '2026-10-12', longestStreak: 3, totalActiveDays: 3 });
  assert.equal(expireStreak(s, '2026-10-13'), s, 'kemarin masih valid, tidak berubah');
  const studied = touchActiveDay(s, '2026-10-13');
  assert.equal(studied.streakDays, 4);
  assert.equal(studied.longestStreak, 4);
  assert.equal(studied.totalActiveDays, 4);
  assert.equal(touchActiveDay(studied, '2026-10-13'), studied, 'idempoten dalam hari yang sama');
});

test('S2. streak terputus bila terakhir belajar lebih lama dari kemarin; belajar lagi mulai dari 1', () => {
  const s = fresh({ streakDays: 5, lastActiveDate: '2026-10-10', longestStreak: 9 });
  assert.equal(expireStreak(s, '2026-10-13').streakDays, 0);
  const again = touchActiveDay(expireStreak(s, '2026-10-13'), '2026-10-13');
  assert.equal(again.streakDays, 1);
  assert.equal(again.longestStreak, 9);
});

test('S3. hari pertama (streak 0, lastActive hari ini) tetap dihitung 1 saat belajar', () => {
  const s = fresh({ streakDays: 0, lastActiveDate: '2026-10-13' });
  assert.equal(touchActiveDay(s, '2026-10-13').streakDays, 1);
});

test('S4. jam mundur (lastActive di masa depan) tidak menurunkan streak', () => {
  const s = fresh({ streakDays: 4, lastActiveDate: '2026-10-20' });
  assert.equal(touchActiveDay(s, '2026-10-13').streakDays, 4);
});

test('S5. batas bulan/tahun & daysBetween', () => {
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
  assert.equal(touchActiveDay(fresh({ streakDays: 2, lastActiveDate: '2026-12-31' }), '2027-01-01').streakDays, 3);
});

test('S6. hasil belajar nyata menandai hari aktif walau EXP ditolak; reward belajar juga; klaim misi tidak', () => {
  const now = new Date(2026, 9, 13, 9, 0, 0);
  const studied = applyStudyToStats(fresh({ streakDays: 0, lastActiveDate: '2026-10-01' }),
    { moduleId: 'kotoba', itemId: 'k1', interaction: 'flashcard' }, now);
  assert.equal(studied.streakDays, 1);
  assert.equal(studied.lastActiveDate, '2026-10-13');

  const rewarded = awardExp(fresh({ streakDays: 0, lastActiveDate: '2026-10-01' }), { source: 'tower_floor', ref: '1', exp: 10, gold: 0 }, now).stats;
  assert.equal(rewarded.streakDays, 1);

  const claimed = awardExp(fresh({ streakDays: 0, lastActiveDate: '2026-10-01' }), { source: 'mission_claim', ref: 'dm_01:2026-10-13', exp: 80, gold: 60 }, now).stats;
  assert.equal(claimed.streakDays, 0);
});

test('S7. misi streak mingguan = hari berurutan dalam minggu ini (bukan seluruh streak)', () => {
  const wed = new Date(2026, 9, 14, 10); // Rabu 14 Okt 2026
  assert.equal(isoWeekday(wed), 3);
  const w = INITIAL_WEEKLY_MISSIONS;
  // streak 40 hari, tapi baru Rabu -> maksimal 3
  const a = syncStreakMission(w, { streakDays: 40, lastActiveDate: '2026-10-14' }, '2026-10-14', wed);
  assert.equal(prog(a, 'wm_02'), 3);
  assert.equal(a.find(m => m.id === 'wm_02')!.completed, false);
  // Minggu: 5 hari berturut dari Senin sudah cukup
  const sun = new Date(2026, 9, 18, 10);
  const b = syncStreakMission(w, { streakDays: 6, lastActiveDate: '2026-10-18' }, '2026-10-18', sun);
  assert.equal(b.find(m => m.id === 'wm_02')!.completed, true);
  // streak sudah putus (terakhir belajar 3 hari lalu) -> tidak menambah
  const c = syncStreakMission(w, { streakDays: 7, lastActiveDate: '2026-10-11' }, '2026-10-14', wed);
  assert.equal(c, w);
  // progres tidak turun
  const d = syncStreakMission(a, { streakDays: 1, lastActiveDate: '2026-10-14' }, '2026-10-14', wed);
  assert.equal(prog(d, 'wm_02'), 3);
});
