import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EVALUATION_EVERY, generatePlan, isPlanError, planFingerprint } from './planner';
import type { LearningPlan, PlanInput } from './types';

const base: PlanInput = {
  goal: 'N3', startLevel: 'N4', durationDays: 180, dailyMinutes: 45, daysPerWeek: 6, startDate: '2027-01-04', focus: 'balanced',
};
const plan = (over: Partial<PlanInput> = {}): LearningPlan => {
  const p = generatePlan({ ...base, ...over });
  assert.ok(!isPlanError(p), 'plan harus valid');
  return p as LearningPlan;
};

test('deterministik: input sama menghasilkan rencana identik', () => {
  assert.deepEqual(plan(), plan());
  assert.equal(planFingerprint(base), planFingerprint({ ...base }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, dailyMinutes: 46 }));
});

test('tidak ada hari melebihi waktu harian dan tanggal sesuai hari belajar', () => {
  const p = plan();
  for (const d of p.days) assert.ok(d.estimatedMinutes <= base.dailyMinutes + 0.01, `hari ${d.dayNumber}: ${d.estimatedMinutes}`);
  // 6 hari/minggu = Senin-Sabtu, tidak ada Minggu
  for (const d of p.days) assert.notEqual(new Date(`${d.date}T00:00:00Z`).getUTCDay(), 0);
  assert.equal(p.summary.studyDays + p.summary.restDays, base.durationDays);
});

test('evaluasi tiap hari belajar ke-7 dan konsolidasi di akhir tanpa materi baru', () => {
  const p = plan();
  for (const d of p.days) {
    if (d.dayNumber % EVALUATION_EVERY === 0 && d.kind !== 'consolidation') assert.equal(d.kind, 'evaluation');
    if (d.kind !== 'learn') assert.equal(d.newItems.length, 0);
  }
  assert.ok(p.summary.consolidationDays > 0);
  assert.equal(p.days.at(-1)!.kind, 'consolidation');
});

test('rentang materi berurutan, tanpa tumpang tindih, dan tidak melebihi total', () => {
  const p = plan();
  const last = { kotoba: 0, kanji: 0, bunpou: 0 };
  for (const d of p.days) for (const it of d.newItems) {
    assert.equal(it.from, last[it.category] + 1);
    assert.equal(it.to - it.from + 1, it.count);
    last[it.category] = it.to;
  }
  for (const c of ['kotoba', 'kanji', 'bunpou'] as const) {
    assert.equal(last[c], p.summary.plannedItems[c]);
    assert.ok(last[c] <= p.summary.totalItems[c]);
  }
});

test('beban realistis menuntaskan seluruh materi (coverage 100%)', () => {
  const p = plan({ goal: 'N5', startLevel: 'none', durationDays: 180, dailyMinutes: 60 });
  assert.ok(p.summary.coverage >= 0.99);
  assert.equal(p.summary.feasible, true);
});

test('beban tidak realistis: coverage < 1, ada peringatan, kebutuhan menit dilaporkan', () => {
  const p = plan({ goal: 'N1', startLevel: 'none', durationDays: 30, dailyMinutes: 20 });
  assert.ok(p.summary.coverage < 1);
  assert.equal(p.summary.feasible, false);
  assert.ok(p.warnings.length > 0);
  assert.ok(p.summary.requiredMinutesPerDay > 20);
});

test('review mengacu hari yang sudah lewat sesuai interval SRS', () => {
  const p = plan();
  for (const d of p.days) for (const r of d.reviewOf) assert.ok(r < d.dayNumber);
  const d8 = p.days.find(d => d.dayNumber === 9)!;
  assert.ok(d8.reviewOf.includes(8)); // offset 1
});

test('level awal >= target menghasilkan error, input tidak valid ditolak', () => {
  const e = generatePlan({ ...base, goal: 'N4', startLevel: 'N3' });
  assert.ok(isPlanError(e) && e.code === 'already_at_level');
  for (const bad of [{ durationDays: 3 }, { dailyMinutes: 5 }, { daysPerWeek: 0 }, { startDate: 'besok' }]) {
    const r = generatePlan({ ...base, ...bad });
    assert.ok(isPlanError(r) && r.code === 'invalid_input');
  }
});

test('fokus mengubah komposisi materi', () => {
  const k = plan({ focus: 'kanji' }).summary;
  const v = plan({ focus: 'kotoba' }).summary;
  // total target sama; komposisi hari awal berbeda
  assert.deepEqual(k.totalItems, v.totalItems);
  const first = (p: LearningPlan, c: string) => p.days[0].newItems.find(i => i.category === c)?.count ?? 0;
  assert.ok(first(plan({ focus: 'kanji' }), 'kanji') >= first(plan({ focus: 'kotoba' }), 'kanji'));
});

test('JFT dan SSW2 menghasilkan rencana valid', () => {
  assert.ok(!isPlanError(generatePlan({ ...base, goal: 'JFT', startLevel: 'none' })));
  assert.ok(!isPlanError(generatePlan({ ...base, goal: 'SSW2', startLevel: 'N5' })));
});
