import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { recordItemAttempt, recordItemInteraction } from './mastery';

// Tes karakterisasi mastery/SRS (EXP_ECONOMY & DATA_MODEL §2). Waktu dimock agar interval dapat dihitung.
const D = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1);
const at = (days: number) => mock.timers.setTime(T0 + days * D);
const attempt = (r: ReturnType<typeof recordItemAttempt> | undefined, ok: number, n: number) =>
  recordItemAttempt(r, 'k1', 'kotoba', ok, n);

test.beforeEach(() => mock.timers.enable({ apis: ['Date'], now: T0 }));
test.afterEach(() => mock.timers.reset());

test('percobaan pertama: mastery dibatasi 70% (round(rasio·70)); sempurna → interval 2 hari', () => {
  const perfect = attempt(undefined, 5, 5);
  assert.deepEqual(
    [perfect.status, perfect.masteryPercentage, perfect.masteryLevel, perfect.attemptsCount, perfect.consecutivePerfects, perfect.reviewIntervalDays],
    ['COMPLETED', 70, 2, 1, 1, 2]
  );
  assert.equal(Date.parse(perfect.nextReviewDue) - T0, 2 * D);
});

test('percobaan pertama: 90% → COMPLETED/63/interval 1; 50% → LEARNING/35; skor NaN → 0 (tidak meracuni record)', () => {
  const ninety = attempt(undefined, 9, 10);
  assert.deepEqual([ninety.status, ninety.masteryPercentage, ninety.reviewIntervalDays, ninety.mistakeCount], ['COMPLETED', 63, 1, 1]);
  const half = attempt(undefined, 5, 10);
  assert.deepEqual([half.status, half.masteryPercentage, half.masteryLevel], ['LEARNING', 35, 1]);
  const nan = recordItemAttempt(undefined, 'n', 'kotoba', NaN, 5);
  assert.equal(nan.masteryPercentage, 0);
  assert.ok(Number.isFinite(nan.mistakeCount));
  const over = recordItemAttempt(undefined, 'o', 'kotoba', 99, 5);
  assert.equal(over.bestScore.score, 5, 'skor dijepit ke total');
});

test('rantai sempurna mengikuti tangga SRS [1,2,4,7,14,30] dan status naik hingga PERFECTED', () => {
  const steps: Array<[number, string, number, number]> = [];
  let r = attempt(undefined, 5, 5);
  const days = [2, 6, 13, 27];
  for (const d of days) { at(d); r = attempt(r, 5, 5); steps.push([r.reviewIntervalDays, r.status, r.masteryPercentage, r.consecutivePerfects]); }
  assert.deepEqual(steps, [
    [4, 'MASTERED', 85, 2],
    [7, 'MASTERED', 90, 3],
    [14, 'MASTERED', 95, 4],
    [30, 'PERFECTED', 100, 5],
  ]);
});

test('jawaban sebagian setelah interval panjang: turun satu anak tangga SRS, streak reset', () => {
  let r = attempt(undefined, 5, 5);
  for (const d of [2, 6, 13, 27]) { at(d); r = attempt(r, 5, 5); } // interval 30, PERFECTED
  at(58);
  const partial = attempt(r, 4, 5); // 80%
  assert.deepEqual(
    [partial.status, partial.masteryPercentage, partial.consecutivePerfects, partial.reviewIntervalDays, partial.mistakeCount],
    ['COMPLETED', 63, 0, 14, 1]
  );
  const bad = attempt(r, 1, 5); // 20%
  assert.deepEqual([bad.status, bad.reviewIntervalDays, bad.mistakeCount], ['LEARNING', 1, 4]);
});

test('latihan tanpa skor (flashcard/menulis) tidak menyentuh SRS, skor, maupun streak', () => {
  let r = attempt(undefined, 5, 5);
  at(1);
  const flash = recordItemInteraction(r, 'k1', 'kotoba', 'flashcard', true, 'deck');
  const write = recordItemInteraction(flash, 'k1', 'kotoba', 'writing', true, 'library');
  for (const f of ['attemptsCount', 'consecutivePerfects', 'masteryPercentage', 'reviewIntervalDays', 'nextReviewDue', 'status', 'bestScore'] as const) {
    assert.deepEqual(write[f], r[f], f);
  }
  assert.equal(write.flashcardCount, 1);
  assert.equal(write.writingCount, 1);
});

test('latihan gagal (success=false) menambah mistake & mereset streak tanpa mengubah jadwal', () => {
  const r = attempt(undefined, 5, 5);
  at(1);
  const miss = recordItemInteraction(r, 'k1', 'kotoba', 'flashcard', false, 'deck');
  assert.equal(miss.mistakeCount, r.mistakeCount + 1);
  assert.equal(miss.consecutivePerfects, 0);
  assert.equal(miss.nextReviewDue, r.nextReviewDue);
});

test('interaksi kuis dinilai penuh (1/1 atau 0/1); view tidak pernah memajukan apa pun', () => {
  const q = recordItemInteraction(undefined, 'q', 'kotoba', 'quiz', true, 'x');
  assert.equal(q.attemptsCount, 1);
  const v = recordItemInteraction(q, 'q', 'kotoba', 'view', true, 'x');
  assert.equal(v.viewCount, 1);
  assert.equal(v.attemptsCount, 1);
  assert.equal(v.nextReviewDue, q.nextReviewDue);
});

test('kesalahan terdeteksi dicatat per jenis dan bertambah pada kejadian berulang', () => {
  const r1 = recordItemAttempt(undefined, 'g', 'bunpou', 0, 1, ['PARTICLE_MISMATCH']);
  at(1);
  const r2 = recordItemAttempt(r1, 'g', 'bunpou', 0, 1, ['PARTICLE_MISMATCH', 'NUANCE_CONTEXT']);
  const byType = Object.fromEntries((r2.errorPatterns || []).map(e => [e.errorType, e.count]));
  assert.deepEqual(byType, { PARTICLE_MISMATCH: 2, NUANCE_CONTEXT: 1 });
  assert.ok(r2.weaknessFlags?.includes('conjugation'), 'bunpou yang salah ditandai lemah di konjugasi');
});
