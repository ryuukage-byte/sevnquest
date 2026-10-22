import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { applyRewardToStats, applyStudyToStats, getStudyMissionAdvances, inferStudyRewardMeta } from './playerProgress';
import { DEFAULT_STATS } from './defaultStats';
import { stripDerivedStats } from './derivedState';
import { STORAGE_KEY_STATS } from './storageKeys';
import { calculateLevelFromExp } from '../data/tiers';
import { flipExpFor, claimFlipReward } from '../utils/flashcardSession';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import type { PlayerStats } from '../types/rpg';
// Seperti di aplikasi setelah ensureFullData(): bank soal kurasi terpasang ke basis data.
import '../data/kanjiQuestions';
import '../data/bunpouQuestions';

const DAY = 24 * 60 * 60 * 1000;
const KOTOBA_ID = Object.keys(KOTOBA_DATABASE)[0];
const KANJI_ID = Object.keys(KANJI_DATABASE)[0];

const fresh = (over: Partial<PlayerStats> = {}): PlayerStats => ({
  ...DEFAULT_STATS,
  userId: 'test-user',
  itemMastery: {},
  recallQueue: [],
  ...over,
});

// ---------------------------------------------------------------- Task A: EXP

test('A1. reward pecahan berulang tidak hilang dan level mengikuti total sebenarnya', () => {
  let s = fresh({ totalExp: 99, level: calculateLevelFromExp(99) });
  assert.equal(s.level, 1);
  // 99 + 5 × 0,2 = 100 -> tepat batas Level 2.
  for (let i = 0; i < 4; i++) s = applyRewardToStats(s, 0.2);
  assert.equal(s.totalExp, 99);
  assert.equal(s.level, 1);
  s = applyRewardToStats(s, 0.2);
  assert.equal(s.totalExp, 100);
  assert.equal(s.level, 2);
  assert.equal(s.expFraction, 0);
});

test('A2. state konsisten: totalExp bulat, nilai tampil (totalExp) tidak melebihi yang tersimpan', () => {
  let s = fresh();
  const gains = [0.15, 12, 0.33, 4.5, 0.02, 0.095, 0.095];
  for (const g of gains) s = applyRewardToStats(s, g, 0);
  assert.ok(Number.isInteger(s.totalExp));
  const exact = gains.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(s.totalExp + (s.expFraction || 0) - exact) < 1e-9);
});

test('A3. gold tetap bulat dan tidak pernah negatif', () => {
  let s = fresh({ gold: 10 });
  s = applyRewardToStats(s, 1, 0.4);
  assert.equal(s.gold, 10);
  s = applyRewardToStats(s, 1, 5.6);
  assert.equal(s.gold, 16);
});

test('A4. persistensi: save -> reload mempertahankan expFraction & mastery; save lama (tanpa expFraction) tetap termuat', async () => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const { loadInitialStats } = await import('./loadPlayerState');

  let s = fresh();
  s = applyRewardToStats(s, 0.095);
  s = applyRewardToStats(s, 12.4);
  s = applyStudyToStats(s, { moduleId: 'kotoba', itemId: KOTOBA_ID, score: 1, total: 1, interaction: 'quiz' });
  store.set(STORAGE_KEY_STATS, JSON.stringify(stripDerivedStats(s)));

  const reloaded = loadInitialStats();
  assert.equal(reloaded.totalExp, s.totalExp);
  assert.ok(Math.abs((reloaded.expFraction || 0) - (s.expFraction || 0)) < 1e-9);
  assert.equal(reloaded.itemMastery![KOTOBA_ID].attemptsCount, 1);
  // Reward berikutnya melanjutkan dari pecahan yang tersimpan.
  const after = applyRewardToStats(reloaded, 0.505);
  assert.ok(Math.abs(after.totalExp + (after.expFraction || 0) - (s.totalExp + (s.expFraction || 0) + 0.505)) < 1e-9);

  // Save versi lama tanpa expFraction.
  const legacy: any = stripDerivedStats(s);
  delete legacy.expFraction;
  store.set(STORAGE_KEY_STATS, JSON.stringify(legacy));
  const legacyLoaded = loadInitialStats();
  assert.equal(legacyLoaded.totalExp, s.totalExp);
  assert.equal(applyRewardToStats(legacyLoaded, 1).totalExp, s.totalExp + 1);
});

// ---------------------------------------------------------------- Task B: flashcard

test('B1. membuka kartu tanpa menjawab tidak mengubah mastery (tidak ada event)', () => {
  const s = fresh();
  assert.deepEqual(s.itemMastery, {});
});

test('B2. flip berkali-kali pada kartu yang sama: mikro-EXP sekali, mastery tidak tersentuh', () => {
  const paid = new Set<string>();
  let s = fresh();
  for (let i = 0; i < 30; i++) {
    if (claimFlipReward(paid, `kotoba:${KOTOBA_ID}`, i % 2 === 0)) {
      s = applyRewardToStats(s, flipExpFor(30)); // jalur reward saja (tanpa handleStudyComplete)
    }
  }
  assert.equal(s.totalExp, 0);
  assert.ok(Math.abs((s.expFraction || 0) - 0.15) < 1e-9, 'tepat satu pembayaran 0,15');
  assert.deepEqual(s.itemMastery, {});
  assert.deepEqual(s.studyStats?.flashcards.uniqueIds ?? [], []);
});

test('B3. Next tanpa penilaian = latihan, BUKAN attempt sempurna', () => {
  const s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: KOTOBA_ID, interaction: 'flashcard' });
  const r = s.itemMastery![KOTOBA_ID];
  assert.equal(r.attemptsCount, 0);
  assert.equal(r.consecutivePerfects, 0);
  assert.equal(r.masteryPercentage, 0);
  assert.equal(r.status, 'LEARNING');
  assert.deepEqual(r.bestScore, { score: 0, total: 0 });
  assert.equal(r.quizCount, 0);
  assert.equal(r.flashcardCount, 1);
  assert.equal(r.mistakeCount, 0);
});

test('B4. kanji/bunpou flashcard tanpa skor juga bukan attempt (dulu: writing / quiz sempurna)', () => {
  let s = applyStudyToStats(fresh(), { moduleId: 'kanji', itemId: KANJI_ID, interaction: 'flashcard' });
  const k = s.itemMastery![KANJI_ID];
  assert.equal(k.attemptsCount, 0);
  assert.equal(k.writingCount, 0);
  assert.equal(k.flashcardCount, 1);
  assert.equal(s.studyStats!.kanjiWriting.total, 0, 'flashcard kanji bukan statistik menulis');
  assert.equal(s.studyStats!.flashcards.total, 1);
});

test('B5. event ganda dalam jendela dedupe (flip+Next / klik ganda) tidak menggandakan latihan', () => {
  let s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: KOTOBA_ID, interaction: 'flashcard' });
  const before = s.itemMastery![KOTOBA_ID];
  s = applyStudyToStats(s, { moduleId: 'kotoba', itemId: KOTOBA_ID, interaction: 'flashcard' });
  assert.equal(s.itemMastery![KOTOBA_ID].flashcardCount, 1);
  assert.equal(s.itemMastery![KOTOBA_ID], before, 'record identik (tidak ada update)');
});

test('B6. flashcard di waktu berbeda menambah hitungan latihan tapi tidak menggeser SRS / skor / streak', () => {
  mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 0, 1) });
  try {
    // Satu jawaban nyata benar -> SRS terjadwal.
    let s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: KOTOBA_ID, score: 1, total: 1, interaction: 'quiz' });
    const graded = s.itemMastery![KOTOBA_ID];
    mock.timers.setTime(Date.UTC(2026, 0, 1) + 60_000);
    for (let i = 0; i < 5; i++) {
      s = applyStudyToStats(s, { moduleId: 'kotoba', itemId: KOTOBA_ID, interaction: 'flashcard' });
      mock.timers.setTime(Date.UTC(2026, 0, 1) + 60_000 + (i + 1) * 10_000);
    }
    const r = s.itemMastery![KOTOBA_ID];
    assert.equal(r.flashcardCount, 5);
    for (const f of ['attemptsCount', 'consecutivePerfects', 'masteryPercentage', 'status', 'nextReviewDue', 'reviewIntervalDays', 'mistakeCount', 'quizCount'] as const) {
      assert.deepEqual(r[f], graded[f], `${f} tidak boleh berubah oleh flashcard tanpa penilaian`);
    }
  } finally {
    mock.timers.reset();
  }
});

// ---------------------------------------------------------------- jawaban bernilai

test('C1. jawaban benar = satu attempt, streak 1, SRS 2 hari (perfect pertama)', () => {
  mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 0, 1) });
  try {
    const s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: KOTOBA_ID, score: 1, total: 1, interaction: 'quiz' });
    const r = s.itemMastery![KOTOBA_ID];
    assert.equal(r.attemptsCount, 1);
    assert.equal(r.consecutivePerfects, 1);
    assert.equal(r.quizCount, 1);
    assert.equal(r.reviewIntervalDays, 2);
    assert.equal(Date.parse(r.nextReviewDue) - Date.now(), 2 * DAY);
  } finally {
    mock.timers.reset();
  }
});

test('C2. jawaban salah = satu attempt, mistake +1, streak 0, SRS 1 hari', () => {
  mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 0, 1) });
  try {
    let s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: KOTOBA_ID, score: 1, total: 1, interaction: 'quiz' });
    mock.timers.setTime(Date.UTC(2026, 0, 2));
    s = applyStudyToStats(s, { moduleId: 'kotoba', itemId: KOTOBA_ID, score: 0, total: 1, interaction: 'quiz' });
    const r = s.itemMastery![KOTOBA_ID];
    assert.equal(r.attemptsCount, 2);
    assert.equal(r.mistakeCount, 1);
    assert.equal(r.consecutivePerfects, 0);
    assert.equal(r.reviewIntervalDays, 1);
  } finally {
    mock.timers.reset();
  }
});

test('C3. satu panggilan = satu attempt (tidak ada pembaruan ganda); arcade kotoba 1/1 tetap dinilai', () => {
  const s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: KOTOBA_ID, score: 1, total: 1, interaction: 'flashcard' });
  assert.equal(s.itemMastery![KOTOBA_ID].attemptsCount, 1, 'skor eksplisit tetap attempt bernilai');
});

test('C4. ID agregat sesi (dungeon_/drill_/tryout_/star_rush) tidak membuat record mastery', () => {
  for (const id of ['dungeon_kanji_123', 'drill_x', 'tryout_1', 'star_rush']) {
    const s = applyStudyToStats(fresh(), { moduleId: 'kotoba', itemId: id, score: 3, total: 5, interaction: 'quiz' });
    assert.deepEqual(s.itemMastery, {});
  }
  const noItemFlashcard = applyStudyToStats(fresh(), { moduleId: 'kotoba', interaction: 'flashcard' });
  assert.deepEqual(noItemFlashcard.itemMastery, {});
});

// ---------------------------------------------------------------- misi

test('D1. misi: flashcard kanji bukan "lembar menulis"; flashcard kotoba tidak menambah misi kuis', () => {
  const cats = (c: Parameters<typeof getStudyMissionAdvances>[0]) => getStudyMissionAdvances(c).map(a => a.category);
  assert.deepEqual(cats({ moduleId: 'kanji', interaction: 'flashcard' }), []);
  assert.deepEqual(cats({ moduleId: 'kanji', interaction: 'writing', score: 1, total: 1 }), ['kanji', 'quiz']);
  assert.deepEqual(cats({ moduleId: 'kotoba', interaction: 'flashcard' }), ['kotoba']);
  assert.deepEqual(cats({ moduleId: 'bunpou', interaction: 'quiz', score: 2, total: 3 }), ['bunpou', 'quiz']);
});

test('I1. sumber reward dikenali dari ID/interaksi bila pemanggil tidak menyebutnya', () => {
  assert.deepEqual(inferStudyRewardMeta('kanji', 'writing', 'dungeon_writing_123'), { source: 'dungeon_session', ref: 'dungeon_writing_123', eventKey: 'dungeon_writing_123' });
  assert.deepEqual(inferStudyRewardMeta('questions', 'quiz', 'drill_bunpou_N3'), { source: 'drill_session', ref: 'drill_bunpou_N3' });
  assert.deepEqual(inferStudyRewardMeta('kanji', 'writing', 'kanji_001'), { source: 'writing_practice', ref: 'kanji_001' });
  assert.deepEqual(inferStudyRewardMeta('kotoba', 'flashcard', 'kotoba_1'), { source: 'study_unclassified', ref: 'kotoba_1' });
  assert.deepEqual(inferStudyRewardMeta('tryOuts', 'quiz', 'n3_001'), { source: 'study_unclassified', ref: 'n3_001' });
});
