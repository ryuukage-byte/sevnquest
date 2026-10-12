import test from 'node:test';
import assert from 'node:assert/strict';
import type { ItemMasteryRecord } from '../types/content';
import { KOTOBA_DATABASE } from '../data/kotoba';
import {
  buildSmartRecallQueue,
  calculateItemTrueMastery,
  calculateOverallMastery,
  getLearningStage,
  hasGradedEvidence,
  recordItemAttempt,
  recordItemInteraction,
  recordItemView,
} from './mastery';
import { mergeItemMastery } from './cloudMerge';

// Kosakata yang kalimat contohnya memuat kata persisnya, supaya engine Level 4 bisa dipakai.
const kotobaId = Object.values(KOTOBA_DATABASE).find(k => k.exampleSentence?.japanese.includes(k.word))!.id;
const dokkaiId = 'dokkai_recall_fixture';

const toMastery = (record: ItemMasteryRecord) => ({ [record.itemId]: record });

test('membuka detail hanya menandai VIEWED: tanpa skor dan tidak masuk Recall', () => {
  let rec = recordItemView(undefined, kotobaId, 'kotoba');
  rec = recordItemView(rec, kotobaId, 'kotoba');

  assert.equal(rec.viewCount, 2);
  assert.equal(getLearningStage(rec), 'VIEWED');
  assert.equal(hasGradedEvidence(rec), false);
  assert.equal(rec.masteryPercentage, 0);
  assert.equal(rec.bestScore.total, 0);
  assert.equal(buildSmartRecallQueue(toMastery(rec)).length, 0);
});

test('flashcard saja: STUDIED, tanpa skor, dan True Mastery tetap rendah (regresi 毎朝 90%)', () => {
  const rec = recordItemInteraction(undefined, kotobaId, 'kotoba', 'flashcard', true);

  assert.equal(getLearningStage(rec), 'STUDIED');
  assert.equal(rec.bestScore.total, 0);
  assert.equal(rec.consecutivePerfects, 0);
  assert.ok(calculateItemTrueMastery(rec).trueMastery < 70);

  const queue = buildSmartRecallQueue(toMastery(rec));
  assert.equal(queue.length, 1);
  assert.equal(queue[0].priorityTier, 'PRACTICE');
  assert.equal(queue[0].trueMasteryScore, undefined);
});

test('flashcard berulang tidak menembus batas interaksi ringan', () => {
  let rec: ItemMasteryRecord | undefined;
  for (let i = 0; i < 20; i++) rec = recordItemInteraction(rec, kotobaId, 'kotoba', 'flashcard', true);

  assert.ok(rec!.masteryPercentage <= 70);
  assert.equal(hasGradedEvidence(rec!), false);
});

test('jawaban yang dinilai: PRACTICED, masuk antrean, dan pengecoh adalah kosakata nyata', () => {
  const rec = recordItemAttempt(undefined, kotobaId, 'kotoba', 0, 1, undefined, false, 'quiz');

  assert.equal(getLearningStage(rec), 'PRACTICED');
  assert.equal(rec.gradedAttemptCount, 1);

  const queue = buildSmartRecallQueue(toMastery(rec));
  assert.equal(queue.length, 1);
  assert.notEqual(queue[0].priorityTier, 'PRACTICE');

  const question = queue[0].sampleQuestion!;
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options).size, 4);
  assert.equal(question.options.includes('別の言葉'), false);
  assert.equal(question.options.includes('関係ない名詞'), false);
});

test('hasil Recall dicatat apa adanya: 1 soal, 0/1 bila salah (bukan 7/7 atau 4/7 palsu)', () => {
  const rec = recordItemAttempt(undefined, kotobaId, 'kotoba', 0, 1, undefined, false, 'quiz');

  assert.equal(rec.firstAttemptScore?.total, 1);
  assert.equal(rec.firstAttemptScore?.score, 0);
  assert.equal(rec.bestScore.total, 1);
});

test('bestScore 1/1 palsu dari flashcard lama tidak menutupi jawaban nyata', () => {
  const legacy: ItemMasteryRecord = {
    ...recordItemInteraction(undefined, kotobaId, 'kotoba', 'flashcard', true),
    bestScore: { score: 1, total: 1 },
  };
  const rec = recordItemAttempt(legacy, kotobaId, 'kotoba', 0, 1, undefined, false, 'quiz');

  assert.deepEqual(rec.bestScore, { score: 0, total: 1 });
  assert.equal(getLearningStage(rec), 'PRACTICED');
});

test('materi tanpa engine kompatibel (dokkai) dilewati, tidak dipaksa menjadi soal', () => {
  const rec = recordItemAttempt(undefined, dokkaiId, 'dokkai', 0, 1, undefined, false, 'quiz');
  assert.equal(buildSmartRecallQueue(toMastery(rec)).length, 0);
});

test('mergeItemMastery mempertahankan jumlah buka terbesar dari kedua sisi', () => {
  const local = { [kotobaId]: { ...recordItemView(undefined, kotobaId, 'kotoba'), viewCount: 5 } };
  const cloud = {
    [kotobaId]: {
      ...recordItemView(undefined, kotobaId, 'kotoba'),
      viewCount: 2,
      lastReviewedAt: new Date().toISOString(),
    },
  };
  const merged = mergeItemMastery(local, cloud);

  assert.equal(merged[kotobaId].viewCount, 5);
});

test('ringkasan penguasaan tidak menghitung materi yang hanya dibuka sebagai "dipelajari"', () => {
  const viewed = recordItemView(undefined, kotobaId, 'kotoba');
  assert.equal(calculateOverallMastery(toMastery(viewed)).totalStudied, 0);

  const studied = recordItemInteraction(undefined, kotobaId, 'kotoba', 'flashcard', true);
  assert.equal(calculateOverallMastery(toMastery(studied)).totalStudied, 1);
});

test('jawaban kuis yang dilabeli flashcard (modul Kotoba) tetap dihitung sebagai dinilai', () => {
  const studied = recordItemInteraction(undefined, kotobaId, 'kotoba', 'flashcard', true);
  assert.equal(getLearningStage(studied), 'STUDIED');

  const graded = recordItemAttempt(studied, kotobaId, 'kotoba', 1, 1, undefined, false, 'flashcard');
  assert.equal(getLearningStage(graded), 'PRACTICED');
  assert.equal(graded.gradedAttemptCount, 1);
});

test('menulis tanpa penilaian (interaksi ringan) tidak menjadi True Mastery 90% (regresi latihan menulis)', () => {
  const rec = recordItemInteraction(undefined, kotobaId, 'kotoba', 'writing', true);

  assert.equal(getLearningStage(rec), 'STUDIED');
  assert.equal(rec.bestScore.total, 0);
  const queue = buildSmartRecallQueue(toMastery(rec));
  assert.equal(queue[0].priorityTier, 'PRACTICE');
  assert.equal(queue[0].trueMasteryScore, undefined);
});

test('record lama dari menulis (bestScore 1/1 palsu, status LEARNING) tidak lagi tampil WEAK 90%', () => {
  const legacy: ItemMasteryRecord = {
    ...recordItemInteraction(undefined, kotobaId, 'kotoba', 'writing', true),
    bestScore: { score: 1, total: 1 },
    masteryPercentage: 45,
    status: 'LEARNING',
  };
  const queue = buildSmartRecallQueue(toMastery(legacy));

  assert.equal(hasGradedEvidence(legacy), false);
  assert.equal(queue[0].priorityTier, 'PRACTICE');
  assert.equal(queue[0].trueMasteryScore, undefined);
});

test('satu jawaban kuis benar lewat interaksi konsisten: COMPLETED, tidak masuk Recall sebagai WEAK 90%', () => {
  const rec = recordItemInteraction(undefined, kotobaId, 'kotoba', 'quiz', true);

  assert.equal(getLearningStage(rec), 'PRACTICED');
  assert.equal(rec.status, 'COMPLETED');
  assert.equal(rec.gradedAttemptCount, 1);
  assert.equal(buildSmartRecallQueue(toMastery(rec)).length, 0);
});

test('satu jawaban kuis salah lewat interaksi tetap WEAK dengan True Mastery di bawah 70', () => {
  const rec = recordItemInteraction(undefined, kotobaId, 'kotoba', 'quiz', false);

  assert.equal(rec.status, 'LEARNING');
  assert.equal(rec.mistakeCount, 1);
  const queue = buildSmartRecallQueue(toMastery(rec));
  assert.equal(queue[0].priorityTier, 'WEAK');
  assert.ok((queue[0].trueMasteryScore ?? 100) < 70);
});
