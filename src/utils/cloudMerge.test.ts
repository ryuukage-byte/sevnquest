import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeItemMastery, mergeStageProgress, mergeUserDecks, mergeStatsCollections,
  ledgerDelta, reconcileRewardsFromLedger,
} from './cloudMerge';
import { awardExp } from '../engine/reward/awardExp';
import { REWARD_LEDGER_MAX } from '../engine/reward/policy';
import { recordItemAttempt } from './mastery';
import { DEFAULT_STATS } from '../state/defaultStats';
import type { PlayerStats, StageClearData, UserDeck } from '../types/rpg';

const fresh = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  ...DEFAULT_STATS, userId: 'u', itemMastery: {}, recallQueue: [], ...over,
});
const T = (min: number) => new Date(Date.UTC(2026, 9, 13, 10, min, 0));
const earn = (s: PlayerStats, ref: string, exp: number, gold: number, min: number) =>
  awardExp(s, { source: 'tower_floor', ref, exp, gold }, T(min)).stats;

// ------------------------------------------------------------ merge koleksi

test('mergeItemMastery: record terbaru (lastReviewedAt) menang; seri → attempt terbanyak; union item', () => {
  const old = recordItemAttempt(undefined, 'a', 'kotoba', 1, 1);
  const newer = { ...old, lastReviewedAt: new Date(Date.parse(old.lastReviewedAt) + 1000).toISOString(), attemptsCount: 9 };
  assert.equal(mergeItemMastery({ a: old }, { a: newer }).a.attemptsCount, 9);
  assert.equal(mergeItemMastery({ a: newer }, { a: old }).a.attemptsCount, 9);
  const tie = { ...old, attemptsCount: 3 };
  assert.equal(mergeItemMastery({ a: tie }, { a: old }).a.attemptsCount, 3);
  const onlyLocal = mergeItemMastery({ x: old }, { y: old });
  assert.deepEqual(Object.keys(onlyLocal).sort(), ['x', 'y']);
});

test('mergeStageProgress: cleared = OR, bintang = max, modul = union', () => {
  const a: StageClearData = { cleared: false, stars: 1, clearedModules: ['kanji'], lastPlayedAt: '2026-10-01T00:00:00Z' };
  const b: StageClearData = { cleared: true, stars: 3, clearedModules: ['bunpou'], lastPlayedAt: '2026-10-02T00:00:00Z' };
  const m = mergeStageProgress({ s1: a }, { s1: b }).s1;
  assert.equal(m.cleared, true);
  assert.equal(m.stars, 3);
  assert.deepEqual([...m.clearedModules].sort(), ['bunpou', 'kanji']);
});

test('mergeUserDecks: deck yang updatedAt-nya lebih baru menang; union per id', () => {
  const d = (id: string, updatedAt: string, title: string): UserDeck =>
    ({ id, title, type: 'mixed', createdAt: updatedAt, updatedAt, items: [] });
  const merged = mergeUserDecks([d('1', '2026-10-02', 'lokal'), d('2', '2026-10-01', 'hanya-lokal')], [d('1', '2026-10-01', 'cloud'), d('3', '2026-10-01', 'hanya-cloud')]);
  assert.deepEqual(merged.map(x => x.title).sort(), ['hanya-cloud', 'hanya-lokal', 'lokal']);
});

test('mergeStatsCollections tidak menyentuh skalar & inventory', () => {
  const base = fresh({ gold: 5, inventory: ['a', 'a'] });
  const out = mergeStatsCollections(base, fresh({ inventory: ['x'] }), fresh({ inventory: ['y'] }));
  assert.equal(out.gold, 5);
  assert.deepEqual(out.inventory, ['a', 'a']);
});

// ------------------------------------------------------------ rekonsiliasi ledger

test('R1. dua perangkat belajar offline setelah titik awal bersama: EXP & gold kedua sisi dijumlahkan', () => {
  const origin = earn(fresh(), 'f0', 100, 50, 0); // riwayat bersama
  const deviceA = earn(origin, 'f1', 300, 100, 10); // cloud (EXP lebih besar → menang)
  const deviceB = earn(origin, 'f2', 80, 40, 20); // lokal (kalah)
  assert.ok(deviceA.totalExp > deviceB.totalExp);

  // cloudWins: skalar dari A; B menyumbang entri uniknya
  const mergedBase = mergeStatsCollections({ ...deviceA }, deviceB, deviceA);
  const merged = reconcileRewardsFromLedger(mergedBase, deviceA, deviceB);
  assert.equal(merged.totalExp, 100 + 300 + 80);
  assert.equal(merged.gold, 50 + 100 + 40);
  assert.equal(merged.rewardLedger!.length, 3);

  // idempoten: sinkron berikutnya (kedua sisi sudah sama) tidak menambah lagi
  const again = reconcileRewardsFromLedger(merged, merged, merged);
  assert.equal(again.totalExp, merged.totalExp);
  assert.equal(again, merged);
});

test('R2. sisi lokal yang menang juga menerima reward unik dari cloud', () => {
  const origin = earn(fresh(), 'f0', 100, 0, 0);
  const cloud = earn(origin, 'f2', 50, 0, 10);
  const local = earn(origin, 'f1', 400, 0, 20);
  const merged = reconcileRewardsFromLedger(mergeStatsCollections({ ...local }, local, cloud), local, cloud);
  assert.equal(merged.totalExp, 100 + 400 + 50);
});

test('R3. klaim yang sama di dua perangkat (lantai yang sama) tidak dihitung dua kali', () => {
  const origin = fresh();
  const a = earn(origin, 'f9', 200, 0, 10);
  const b = earn(origin, 'f9', 200, 0, 11); // klaim lantai yang sama di perangkat lain
  // entri berbeda id (waktu berbeda) → dihitung sebagai reward terpisah yang SAH di masing-masing riwayat;
  // yang dicegah adalah klaim ULANG setelah sinkron, bukan klaim paralel saat offline.
  const merged = reconcileRewardsFromLedger(mergeStatsCollections({ ...a }, b, a), a, b);
  assert.ok(merged.totalExp >= a.totalExp);
  const reclaim = awardExp(merged, { source: 'tower_floor', ref: 'f9', exp: 200, gold: 0 }, T(30));
  assert.equal(reclaim.decision.granted, false, 'setelah sinkron, lantai itu tak bisa diklaim lagi');
});

test('R4. tanpa entri bersama: dipercaya hanya bila riwayat belum terpangkas; bila ragu → tidak menambah', () => {
  const a = earn(fresh(), 'a1', 100, 0, 0);
  const b = earn(fresh(), 'b1', 70, 0, 5);
  assert.deepEqual(ledgerDelta(a, b), { exp: 70, gold: 0, entries: 1 });

  const full = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `x${i}`, at: T(i % 50).toISOString(), source: 'recall_session' as const, exp: 1, gold: 0 }));
  const trimmedBase = { rewardLedger: full(REWARD_LEDGER_MAX) };
  assert.equal(ledgerDelta(trimmedBase, b), null);
  assert.equal(ledgerDelta(a, { rewardLedger: full(REWARD_LEDGER_MAX) }), null);
});

test('R5. entri lama yang sudah terpangkas di sisi pemenang tidak dihitung ulang (anchor)', () => {
  const entry = (id: string, min: number, exp: number) => ({ id, at: T(min).toISOString(), source: 'recall_session' as const, exp, gold: 0 });
  const base = { rewardLedger: [entry('shared', 10, 5), entry('baseOnly', 20, 7)] };
  const other = { rewardLedger: [entry('old', 1, 999), entry('shared', 10, 5), entry('otherOnly', 30, 11)] };
  assert.deepEqual(ledgerDelta(base, other), { exp: 11, gold: 0, entries: 1 }, "'old' lebih lama dari anchor → diabaikan");
});

test('R6. tidak ada riwayat di sisi lain → tidak berubah', () => {
  const a = earn(fresh(), 'a', 10, 0, 0);
  assert.equal(reconcileRewardsFromLedger(a, a, fresh()), a);
});
