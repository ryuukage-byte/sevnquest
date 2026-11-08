import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mission } from '../types/rpg';
import { INITIAL_DAILY_MISSIONS } from '../data/missions';
import {
  FriendStreak,
  bestFlame,
  canNudge,
  flameCaption,
  flameLook,
  flameProgress,
  friendBadgeCount,
  friendError,
  normalizeFriendCode,
  parseFriendState,
} from './friendStreakCore';

const complete = (missions: Mission[], ids: string[]): Mission[] =>
  missions.map(m => (ids.includes(m.id) ? { ...m, progress: m.target, completed: true } : m));

const friend = (over: Partial<FriendStreak> = {}): FriendStreak => ({
  id: 'f1', status: 'active', incoming: false, friendName: 'Dika', friendCode: 'SQ-AAAA-BBBB',
  streakDays: 0, longestStreak: 0, friendDone: false, nudgedMe: false, iNudged: false, atRisk: false, ...over,
});

test('flameProgress: api menyala setelah 3 misi harian selesai', () => {
  assert.deepEqual(flameProgress(INITIAL_DAILY_MISSIONS), { done: 0, required: 3, ready: false });
  assert.equal(flameProgress(complete(INITIAL_DAILY_MISSIONS, ['dm_01', 'dm_02'])).ready, false);
  const p = flameProgress(complete(INITIAL_DAILY_MISSIONS, ['dm_01', 'dm_02', 'dm_05']));
  assert.deepEqual(p, { done: 3, required: 3, ready: true });
});

test('flameProgress: syarat tidak melebihi misi yang bisa diselesaikan', () => {
  // Hanya dm_04 (tanpa pemicu hidup) + dm_01 -> syarat turun ke 1.
  const missions = INITIAL_DAILY_MISSIONS.filter(m => m.id === 'dm_01' || m.id === 'dm_04');
  assert.equal(flameProgress(missions).required, 1);
  assert.equal(flameProgress(complete(missions, ['dm_01'])).ready, true);
  assert.equal(flameProgress([]).ready, false);
});

test('normalizeFriendCode menerima variasi ketik', () => {
  assert.equal(normalizeFriendCode('SQ-K7MP-2Q4X'), 'SQ-K7MP-2Q4X');
  assert.equal(normalizeFriendCode(' sq k7mp 2q4x '), 'SQ-K7MP-2Q4X');
  assert.equal(normalizeFriendCode('sqk7mp2q4x'), 'SQ-K7MP-2Q4X');
  assert.equal(normalizeFriendCode('SQ-PUSAT'), null);
  assert.equal(normalizeFriendCode('AB-K7MP-2Q4X'), null);
  assert.equal(normalizeFriendCode(''), null);
});

test('parseFriendState membaca JSON server dan membuang baris rusak', () => {
  const s = parseFriendState({
    today: '2026-11-08',
    my_code: 'SQ-AAAA-AAAA',
    me_done: true,
    friends: [
      { id: 'x', status: 'active', incoming: false, friend_name: 'Rin', friend_code: 'SQ-BBBB-BBBB',
        streak_days: 4, longest_streak: 9, friend_done: false, nudged_me: true, i_nudged: false, at_risk: true },
      { id: 'y', status: 'weird' },
      null,
    ],
  });
  assert.equal(s.myCode, 'SQ-AAAA-AAAA');
  assert.equal(s.meDone, true);
  assert.equal(s.friends.length, 1);
  assert.equal(s.friends[0].streakDays, 4);
  assert.equal(s.friends[0].nudgedMe, true);
  assert.deepEqual(parseFriendState(null).friends, []);
});

test('flameLook & caption mengikuti siapa yang sudah belajar', () => {
  assert.equal(flameLook(friend({ friendDone: true, streakDays: 3 }), true), 'lit');
  assert.equal(flameLook(friend({ streakDays: 3 }), true), 'half');
  assert.equal(flameLook(friend({ streakDays: 3 }), false), 'risk');
  assert.equal(flameLook(friend(), false), 'out');
  assert.equal(flameLook(friend(), true), 'out');
  assert.match(flameCaption(friend({ friendDone: true }), false), /giliranmu/);
  assert.match(flameCaption(friend({ friendDone: true }), true), /menyala/);
});

test('canNudge: hanya teman aktif yang belum belajar dan belum diingatkan', () => {
  assert.equal(canNudge(friend()), true);
  assert.equal(canNudge(friend({ friendDone: true })), false);
  assert.equal(canNudge(friend({ iNudged: true })), false);
  assert.equal(canNudge(friend({ status: 'pending' })), false);
});

test('lencana & api terbesar', () => {
  const state = {
    today: '2026-11-08', myCode: null, meDone: false,
    friends: [
      friend({ id: 'a', status: 'pending', incoming: true }),
      friend({ id: 'b', status: 'pending', incoming: false }),
      friend({ id: 'c', nudgedMe: true, streakDays: 5 }),
      friend({ id: 'd', streakDays: 12, status: 'pending' }),
    ],
  };
  assert.equal(friendBadgeCount(state), 2);
  assert.equal(friendBadgeCount({ ...state, meDone: true }), 1);
  assert.equal(bestFlame(state), 5);
});

test('friendError menerjemahkan galat server', () => {
  assert.match(friendError({ code: 'PGRST202', message: 'Could not find the function' }), /migrasi/);
  assert.equal(friendError({ code: 'P0002', message: 'Kode teman tidak ditemukan.' }), 'Kode teman tidak ditemukan.');
  assert.match(friendError({ message: 'Failed to fetch' }), /terhubung/);
});
