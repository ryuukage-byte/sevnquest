import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECALL_LIMITS, planRecallSession, normalizeRecallDaily, recordRecallAnswer, recordRecallSession, mergeRecallDaily,
} from './session';
import type { RecallQueueItem } from '../../types/content';

const T = '2026-10-12';
const mk = (id: string, reason: RecallQueueItem['reason'] = 'SRS_DUE', tier: RecallQueueItem['priorityTier'] = 'REVIEW'): RecallQueueItem => ({
  id: `recall_${id}`, itemId: id, category: 'kotoba', title: id, subtitle: '', reason, reasonText: '', urgencyScore: 1, priorityTier: tier, difficultyLevel: 1,
});
const many = (n: number, reason: RecallQueueItem['reason'] = 'SRS_DUE') => Array.from({ length: n }, (_, i) => mk(`${reason}_${i}`, reason));

test('sesi dibatasi ukuran sesi dan urutan prioritas antrean dipertahankan', () => {
  const q = many(25);
  const plan = planRecallSession(q, undefined, T);
  assert.equal(plan.items.length, RECALL_LIMITS.sessionSize);
  assert.deepEqual(plan.items.map(i => i.itemId), q.slice(0, RECALL_LIMITS.sessionSize).map(i => i.itemId));
  assert.equal(plan.deferred, 15);
  assert.equal(plan.capReached, false);
});

test('jatah harian: ukuran sesi menyusut ke sisa jatah, lalu target tercapai', () => {
  const q = many(25);
  const near = planRecallSession(q, { date: T, answered: RECALL_LIMITS.dailyCap - 3, newTested: 0, sessions: 3 }, T);
  assert.equal(near.items.length, 3);
  assert.equal(near.remainingToday, 3);

  const full = planRecallSession(q, { date: T, answered: RECALL_LIMITS.dailyCap, newTested: 0, sessions: 4 }, T);
  assert.equal(full.items.length, 0);
  assert.equal(full.capReached, true);

  // latihan ekstra: sesi kecil, tetap berurut prioritas
  const extra = planRecallSession(q, { date: T, answered: RECALL_LIMITS.dailyCap, newTested: 0, sessions: 4 }, T, { extra: true });
  assert.equal(extra.items.length, RECALL_LIMITS.extraSessionSize);
  assert.equal(extra.capReached, false);
  assert.deepEqual(extra.items.map(i => i.itemId), q.slice(0, RECALL_LIMITS.extraSessionSize).map(i => i.itemId));
});

test('materi baru dibatasi per hari, tetapi item lemah/jatuh tempo tidak ikut dibatasi', () => {
  const q = [...many(15, 'NEW_UNTESTED'), ...many(8, 'SRS_DUE')];
  const plan = planRecallSession(q, { date: T, answered: 0, newTested: RECALL_LIMITS.newPerDay - 2, sessions: 0 }, T);
  assert.equal(plan.items.filter(i => i.reason === 'NEW_UNTESTED').length, 2);
  assert.equal(plan.items.length, RECALL_LIMITS.sessionSize, 'sisa slot diisi item non-baru');
  // kuota baru habis total
  const none = planRecallSession(many(5, 'NEW_UNTESTED'), { date: T, answered: 0, newTested: RECALL_LIMITS.newPerDay, sessions: 0 }, T);
  assert.equal(none.items.length, 0);
  assert.equal(none.capReached, false);
  assert.equal(none.deferred, 5);
});

test('penghitung harian: reset saat ganti hari, bertambah per jawaban, hanya materi baru menambah newTested', () => {
  assert.deepEqual(normalizeRecallDaily(undefined, T), { date: T, answered: 0, newTested: 0, sessions: 0 });
  const yesterday = { date: '2026-10-11', answered: 40, newTested: 10, sessions: 4 };
  assert.deepEqual(normalizeRecallDaily(yesterday, T), { date: T, answered: 0, newTested: 0, sessions: 0 });

  let d = recordRecallAnswer(yesterday, T, true);
  d = recordRecallAnswer(d, T, false);
  d = recordRecallSession(d, T);
  assert.deepEqual(d, { date: T, answered: 2, newTested: 1, sessions: 1 });
  // kemarin sudah penuh -> hari ini bersih: sesi baru tersedia
  assert.equal(planRecallSession(many(12), yesterday, T).items.length, RECALL_LIMITS.sessionSize);
});

test('gabungan lokal/cloud: hari terbaru menang; hari sama memakai angka terbesar', () => {
  const a = { date: T, answered: 12, newTested: 3, sessions: 1 };
  const b = { date: T, answered: 20, newTested: 2, sessions: 2 };
  assert.deepEqual(mergeRecallDaily(a, b), { date: T, answered: 20, newTested: 3, sessions: 2 });
  assert.deepEqual(mergeRecallDaily(a, { date: '2026-10-11', answered: 99, newTested: 9, sessions: 9 }), a);
  assert.equal(mergeRecallDaily(undefined, undefined), undefined);
  assert.deepEqual(mergeRecallDaily(undefined, a), a);
});
