import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAscensionProgress, getEffectiveTier, getJlptLevelForTierIndex } from './ascension';
import { KANJI_DATABASE } from '../data/kanji';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { DEFAULT_STATS } from '../state/defaultStats';
import type { PlayerStats } from '../types/rpg';
import type { ItemMasteryRecord } from '../types/content';

const rec = (itemId: string, category: ItemMasteryRecord['category'], pct: number): ItemMasteryRecord => ({
  itemId, category, status: 'LEARNING', masteryPercentage: pct, masteryLevel: 1, bestScore: { score: 0, total: 0 },
  bestScoreAchievedAt: '2026-01-01T00:00:00Z', attemptsCount: 1, consecutivePerfects: 0, mistakeCount: 0,
  lastReviewedAt: '2026-01-01T00:00:00Z', nextReviewDue: '2026-01-02T00:00:00Z', reviewIntervalDays: 1, decayFactor: 1,
});

const n5Kanji = Object.values(KANJI_DATABASE).filter(k => k.jlpt === 'N5');
const n5Kotoba = Object.values(KOTOBA_DATABASE).filter(k => k.jlpt === 'N5');
const n5Bunpou = Object.values(BUNPOU_DATABASE).filter(b => b.level === 'N5');

function masteryFor(kanjiCount: number, pct = 70) {
  const m: Record<string, ItemMasteryRecord> = {};
  n5Kanji.slice(0, kanjiCount).forEach(k => { m[k.id] = rec(k.id, 'kanji', pct); });
  n5Kotoba.forEach(k => { m[k.id] = rec(k.id, 'kotoba', pct); });
  n5Bunpou.forEach(b => { m[b.id] = rec(b.id, 'bunpou', pct); });
  return m;
}
const stats = (over: Partial<PlayerStats>): PlayerStats => ({ ...DEFAULT_STATS, userId: 'u', recallQueue: [], ...over });

test('A1. pemetaan tier → level JLPT', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(getJlptLevelForTierIndex), ['N5', 'N5', 'N4', 'N4', 'N3', 'N3', 'N2', 'N2', 'N1', 'N1']);
});

test('A2. gerbang N5→N4: butuh 75% di KETIGA pilar + EXP ≥ 4.000; 74% kanji menahan', () => {
  const need = Math.ceil(n5Kanji.length * 0.75);
  const base = { tierIndex: 1, totalExp: 5000 };
  const ok = calculateAscensionProgress(stats({ ...base, itemMastery: masteryFor(need) }));
  assert.equal(ok.kanji.passed, true);
  assert.equal(ok.canAscend, true);

  const short = calculateAscensionProgress(stats({ ...base, itemMastery: masteryFor(need - 1) }));
  assert.equal(short.kanji.passed, false, `${need - 1}/${n5Kanji.length} < 75%`);
  assert.equal(short.canAscend, false);
  assert.equal(short.isGated, true, 'EXP cukup tetapi penguasaan kurang → tertahan');
});

test('A3. mastery < 70% tidak dihitung dikuasai; MASTERED/PERFECTED dihitung walau % rendah', () => {
  const low = calculateAscensionProgress(stats({ tierIndex: 1, totalExp: 5000, itemMastery: masteryFor(n5Kanji.length, 69) }));
  assert.equal(low.overallAccumulationPct, 0);
  const m = masteryFor(n5Kanji.length, 10);
  Object.values(m).forEach(r => { r.status = 'MASTERED'; });
  const mastered = calculateAscensionProgress(stats({ tierIndex: 1, totalExp: 5000, itemMastery: m }));
  assert.equal(mastered.canAscend, true);
});

test('A4. EXP kurang → tidak bisa Ascend walau penguasaan penuh', () => {
  const p = calculateAscensionProgress(stats({ tierIndex: 1, totalExp: 3999, itemMastery: masteryFor(n5Kanji.length) }));
  assert.equal(p.hasRequiredExp, false);
  assert.equal(p.canAscend, false);
  assert.equal(p.isGated, false);
});

test('A5. getEffectiveTier menahan tier di batas gerbang sampai Ascend; ascendedLevels membuka', () => {
  const noMastery = getEffectiveTier(stats({ totalExp: 5000 })); // EXP setara T3 (indeks 2)
  assert.equal(noMastery.potentialTierIndex, 2);
  assert.equal(noMastery.effectiveTierIndex, 1);
  assert.equal(noMastery.isGated, true);
  const ascended = getEffectiveTier(stats({ totalExp: 5000, ascendedLevels: ['N5'] }));
  assert.equal(ascended.effectiveTierIndex, 2);
  const withMastery = getEffectiveTier(stats({ totalExp: 5000, itemMastery: masteryFor(n5Kanji.length) }));
  assert.equal(withMastery.effectiveTierIndex, 2);
});

test('A6. tanpa record: ID di studyStats.uniqueIds dihitung dikuasai (perilaku fallback saat ini)', () => {
  const ids = n5Kanji.map(k => k.id);
  const s = stats({ tierIndex: 1, totalExp: 5000, studyStats: {
    questions: { total: 0, uniqueIds: [] }, flashcards: { total: 0, uniqueIds: n5Kotoba.map(k => k.id) },
    kanjiWriting: { total: 0, uniqueIds: ids }, tryOuts: { total: 0, uniqueIds: [] }, dokkai: { total: 0, uniqueIds: [] },
    choukai: { total: 0, uniqueIds: [] }, bunpou: { total: 0, uniqueIds: n5Bunpou.map(b => b.id) },
    stages: { total: 0, uniqueIds: [] }, bossBattles: { total: 0, uniqueIds: [] },
  } });
  assert.equal(calculateAscensionProgress(s).canAscend, true, 'membuka/menulis sekali cukup bila belum ada record — lihat TECHNICAL_DEBT E-15');
});
