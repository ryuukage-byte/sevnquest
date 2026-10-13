import test from 'node:test';
import assert from 'node:assert/strict';
import { awardExp, previewAward, LEGACY_META } from './awardExp';
import { commitReward, decideReward, localDayKey, mergeRewardState, pruneClaims } from './ledger';
import { REWARD_LEDGER_MAX, REWARD_POLICY } from './policy';
import type { RewardRequest } from './types';
import { DEFAULT_STATS } from '../../state/defaultStats';
import { stripDerivedStats } from '../../state/derivedState';
import { STORAGE_KEY_STATS } from '../../state/storageKeys';
import { mergeStatsCollections } from '../../utils/cloudMerge';
import type { PlayerStats } from '../../types/rpg';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 9, 13, 10, 0, 0); // 13 Okt 2026 10:00 lokal
const at = (days: number, hours = 0) => new Date(T0.getTime() + days * DAY + hours * 3600_000);

const fresh = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  ...DEFAULT_STATS, userId: 'u', itemMastery: {}, recallQueue: [], ...over,
});
const req = (over: Partial<RewardRequest> = {}): RewardRequest => ({
  source: 'flashcard_complete', ref: 'kotoba:a', exp: 10, gold: 2, ...over,
});

// ------------------------------------------------------------ keputusan

test('R1. reward kosong / tidak valid ditolak sebagai "empty" dan tidak dicatat', () => {
  for (const bad of [{ exp: 0, gold: 0 }, { exp: -5, gold: 0 }, { exp: NaN, gold: NaN }]) {
    const { state, decision } = commitReward({}, req(bad), T0);
    assert.deepEqual(decision, { granted: false, reason: 'empty', exp: 0, gold: 0 });
    assert.equal(state.rewardLedger.length, 0);
  }
});

test('R2. kejadian yang sama (eventKey) tidak dibayar dua kali — klik ganda / StrictMode / re-render', () => {
  const r = req({ source: 'tower_floor', ref: '3', eventKey: undefined });
  const withEvt = req({ source: 'flashcard_complete', eventKey: 'run1:0:a' });
  const first = commitReward({}, withEvt, T0);
  assert.equal(first.decision.granted, true);
  const second = commitReward(first.state, withEvt, at(0, 0.01));
  assert.deepEqual(second.decision, { granted: false, reason: 'duplicate_event', exp: 0, gold: 0 });
  assert.equal(second.state.rewardLedger.length, 1);
  // eventKey berbeda tetap dibayar
  assert.equal(commitReward(first.state, req({ eventKey: 'run1:1:b', ref: 'kotoba:b' }), T0).decision.granted, true);
  void r;
});

test('R3. batas harian per (source, ref): flashcard_flip sekali per kartu per hari; hari berikutnya boleh lagi', () => {
  assert.equal(REWARD_POLICY.flashcard_flip.limit, 1);
  const r = req({ source: 'flashcard_flip', ref: 'kotoba:a', exp: 0.1, gold: 0 });
  let s = commitReward({}, r, T0);
  assert.equal(s.decision.granted, true);
  s = commitReward(s.state, r, at(0, 5));
  assert.deepEqual(s.decision.reason, 'limit_reached');
  // kartu lain di hari yang sama: boleh
  assert.equal(commitReward(s.state, { ...r, ref: 'kotoba:b' }, at(0, 5)).decision.granted, true);
  // hari berikutnya: boleh
  assert.equal(commitReward(s.state, r, at(1)).decision.granted, true);
});

test('R4. limit > 1: flashcard_complete maksimal 3 kali per kartu per hari', () => {
  assert.equal(REWARD_POLICY.flashcard_complete.limit, 3);
  let st = {} as Parameters<typeof commitReward>[0];
  const results: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    const c = commitReward(st, req(), at(0, i * 0.1));
    st = c.state;
    results.push(c.decision.granted);
  }
  assert.deepEqual(results, [true, true, true, false, false]);
});

test('R5. lifetime: lantai Tower sekali selamanya; tidak terpengaruh berlalunya waktu', () => {
  const r = req({ source: 'tower_floor', ref: '7', exp: 100, gold: 50 });
  const a = commitReward({}, r, T0);
  assert.equal(a.decision.granted, true);
  for (const d of [0, 1, 30, 400]) {
    assert.equal(commitReward(a.state, r, at(d)).decision.granted, false, `hari +${d}`);
  }
  assert.equal(commitReward(a.state, { ...r, ref: '8' }, T0).decision.granted, true);
});

test('R6. klaim misi: sekali per misi per periode; penanda dibersihkan setelah ttl, periode baru dibayar', () => {
  const r = (period: string) => req({ source: 'mission_claim', ref: `dm_01:${period}`, exp: 80, gold: 60 });
  const a = commitReward({}, r('2026-10-13'), T0);
  assert.equal(commitReward(a.state, r('2026-10-13'), at(0, 3)).decision.granted, false, 'klaim ganda');
  assert.equal(commitReward(a.state, r('2026-10-14'), at(1)).decision.granted, true, 'periode baru');
  const pruned = pruneClaims(a.state.rewardClaims, at(9));
  assert.deepEqual(Object.keys(pruned), [], 'penanda kedaluwarsa dibersihkan');
});

test('R6b. tryout: sekali per ujian per hari (1.200+ EXP per ujian); text study: sekali per entitas per hari', () => {
  const t = req({ source: 'tryout_exam', ref: 'n3_001', exp: 1200, gold: 600 });
  const a = commitReward({}, t, T0);
  assert.equal(a.decision.granted, true);
  assert.equal(commitReward(a.state, t, at(0, 2)).decision.granted, false);
  assert.equal(commitReward(a.state, { ...t, ref: 'n3_002' }, at(0, 2)).decision.granted, true, 'ujian lain tetap dibayar');
  assert.equal(commitReward(a.state, t, at(1)).decision.granted, true, 'besok boleh lagi');
  const e = req({ source: 'text_study_entity', ref: 'kotoba:x', exp: 20, gold: 10 });
  const b = commitReward({}, e, T0);
  assert.equal(commitReward(b.state, e, at(0, 1)).decision.granted, false);
});

test('R7. scope none: tidak dibatasi per ref (perilaku lama), tapi tetap dicatat di ledger', () => {
  let st = {} as Parameters<typeof commitReward>[0];
  for (let i = 0; i < 10; i++) st = commitReward(st, req({ source: 'recall_session', ref: undefined }), at(0, i)).state;
  assert.equal(st.rewardLedger!.length, 10);
});

test('R8. decideReward murni: tidak mengubah state masukan', () => {
  const state = { rewardLedger: [], rewardClaims: {} };
  const snapshot = JSON.stringify(state);
  decideReward(state, req(), T0);
  assert.equal(JSON.stringify(state), snapshot);
});

// ------------------------------------------------------------ ledger

test('L1. entri ledger memuat sumber, ref, eventKey, jumlah, alasan, waktu', () => {
  const { state } = commitReward({}, req({ source: 'mission_claim', ref: 'dm_01:2026-10-13', eventKey: 'e1', note: 'Penguasaan Bunpou', exp: 80, gold: 60 }), T0);
  assert.equal(state.rewardLedger.length, 1);
  const e = state.rewardLedger[0];
  assert.deepEqual(
    { source: e.source, ref: e.ref, eventKey: e.eventKey, exp: e.exp, gold: e.gold, note: e.note, at: e.at },
    { source: 'mission_claim', ref: 'dm_01:2026-10-13', eventKey: 'e1', exp: 80, gold: 60, note: 'Penguasaan Bunpou', at: T0.toISOString() }
  );
});

test('L2. ledger dibatasi REWARD_LEDGER_MAX (entri terbaru dipertahankan), ID unik', () => {
  let st = {} as Parameters<typeof commitReward>[0];
  for (let i = 0; i < REWARD_LEDGER_MAX + 50; i++) {
    st = commitReward(st, req({ source: 'recall_session', ref: String(i) }), new Date(T0.getTime() + i * 1000)).state;
  }
  const ids = st.rewardLedger!.map(e => e.id);
  assert.equal(ids.length, REWARD_LEDGER_MAX);
  assert.equal(new Set(ids).size, REWARD_LEDGER_MAX);
  assert.equal(st.rewardLedger![REWARD_LEDGER_MAX - 1].ref, String(REWARD_LEDGER_MAX + 49));
});

// ------------------------------------------------------------ awardExp (state pemain)

test('A1. awardExp menerapkan EXP+gold+level dan mencatat ledger', () => {
  const { stats, decision } = awardExp(fresh({ totalExp: 99 }), req({ source: 'recall_session', exp: 1.5, gold: 7 }), T0);
  assert.equal(decision.granted, true);
  assert.equal(stats.totalExp, 100);
  assert.equal(stats.level, 2);
  assert.equal(stats.expFraction, 0.5);
  assert.equal(stats.gold, 7);
  assert.equal(stats.rewardLedger!.length, 1);
});

test('A2. reward ditolak = EXP, gold, level, dan ledger TIDAK berubah', () => {
  const r = req({ source: 'tower_floor', ref: '1', exp: 40, gold: 20 });
  const first = awardExp(fresh(), r, T0).stats;
  const again = awardExp(first, r, at(5));
  assert.equal(again.decision.granted, false);
  assert.equal(again.stats.totalExp, first.totalExp);
  assert.equal(again.stats.gold, first.gold);
  assert.equal(again.stats.rewardLedger, first.rewardLedger);
});

test('A3. panggilan beruntun pada state yang sama (updater React berantai) hanya membayar sekali', () => {
  const r = req({ source: 'flashcard_complete', eventKey: 'run:0:a', exp: 10, gold: 0 });
  let s = fresh();
  for (let i = 0; i < 5; i++) s = awardExp(s, r, at(0, i * 0.001)).stats;
  assert.equal(s.totalExp, 10);
  assert.equal(s.rewardLedger!.length, 1);
});

test('A4. updater murni: dijalankan dua kali pada prev yang sama (StrictMode) menghasilkan hasil sama', () => {
  const prev = fresh();
  const r = req({ source: 'tower_floor', ref: '2', exp: 40, gold: 20 });
  const a = awardExp(prev, r, T0).stats;
  const b = awardExp(prev, r, T0).stats;
  assert.deepEqual(a, b);
  assert.equal(prev.totalExp, 0, 'masukan tidak dimutasi');
});

test('A5. pemanggil lama tanpa sumber tetap dibayar dan tercatat sebagai legacy_unclassified', () => {
  const { stats } = awardExp(fresh(), { ...LEGACY_META, exp: 25, gold: 10 }, T0);
  assert.equal(stats.totalExp, 25);
  assert.equal(stats.rewardLedger![0].source, 'legacy_unclassified');
});

test('A6. previewAward sama dengan keputusan awardExp dan tidak mengubah apa pun', () => {
  const s = fresh();
  const r = req({ source: 'tower_floor', ref: '9', exp: 5, gold: 5 });
  const p = previewAward(s, r, T0);
  assert.equal(p.granted, true);
  assert.equal(s.rewardLedger, undefined);
});

test('A7. EXP pecahan + ledger: 20 klaim flip pada kartu berbeda = 1,9 EXP tercatat & diterapkan', () => {
  let s = fresh({ totalExp: 1000 });
  for (let i = 0; i < 20; i++) s = awardExp(s, req({ source: 'flashcard_flip', ref: `k:${i}`, exp: 0.095, gold: 0 }), T0).stats;
  assert.equal(s.totalExp, 1001);
  assert.ok(Math.abs((s.expFraction || 0) - 0.9) < 1e-9);
  assert.equal(s.rewardLedger!.length, 20);
});

// ------------------------------------------------------------ sinkron lokal ↔ cloud

test('M1. mergeRewardState: union penanda, n terbesar, riwayat tanpa duplikat', () => {
  const r = req({ source: 'tower_floor', ref: '4', exp: 40, gold: 20 });
  const deviceA = awardExp(fresh(), r, T0).stats;
  const deviceB = awardExp(fresh(), req({ source: 'tower_floor', ref: '5', exp: 40, gold: 20 }), at(0, 1)).stats;
  const merged = mergeRewardState(deviceA, deviceB, at(0, 2));
  assert.equal(merged.rewardLedger.length, 2);
  assert.equal(commitReward(merged, r, at(0, 3)).decision.granted, false, 'lantai 4 sudah diklaim di perangkat A');
  assert.equal(commitReward(merged, { ...r, ref: '5' }, at(0, 3)).decision.granted, false, 'lantai 5 sudah diklaim di perangkat B');
  // idempoten: merge ulang tidak menggandakan
  assert.equal(mergeRewardState(merged, merged, at(0, 4)).rewardLedger.length, 2);
});

test('M2. mergeStatsCollections membawa penanda reward — klaim di cloud tidak bisa diulang di lokal', () => {
  const r = req({ source: 'tower_floor', ref: '6', exp: 40, gold: 20 });
  const cloud = awardExp(fresh(), r, T0).stats;
  const local = fresh();
  const merged = mergeStatsCollections(local, local, cloud);
  assert.equal(awardExp(merged, r, at(1)).decision.granted, false);
});

test('P1. persistensi: setelah reload, klaim & riwayat tetap ada (refresh tidak membuka reward ulang)', async () => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const { loadInitialStats } = await import('../../state/loadPlayerState');
  const now = new Date();
  const r = req({ source: 'tower_floor', ref: '11', exp: 40, gold: 20 });
  const s = awardExp(fresh(), r, now).stats;
  store.set(STORAGE_KEY_STATS, JSON.stringify(stripDerivedStats(s)));
  const reloaded = loadInitialStats();
  assert.equal(reloaded.rewardLedger!.length, 1);
  assert.equal(awardExp(reloaded, r, now).decision.granted, false);
});

test('D1. localDayKey memakai kalender lokal (YYYY-MM-DD)', () => {
  assert.equal(localDayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(localDayKey(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});
