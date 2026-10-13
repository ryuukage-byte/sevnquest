import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCurriculum, analyzePlan, reviewsPerItem, levelsForProfile, targetOptionsFor, arrangeKotoba, isCoreKotoba,
  createPlan, planDay, ensureToday, dayProgress, planOverview, itemState, isLearned, markClaimed, mergeGuidedPlan,
  dayIndexOf, normalizeProfile, countRecallDue, EVALUATION_QUESTIONS,
} from './curriculum';
import { getCurriculum, getFoundation } from './sources';
import type { CurriculumSources, GuidedProfile } from './types';
import type { ItemMasteryRecord } from '../../types/content';

const profile = (over: Partial<GuidedProfile> = {}): GuidedProfile => ({
  mode: 'time', currentLevel: 'N4', targetLevel: 'N3', durationDays: 60, minutesPerDay: 45, focus: 'balanced', ...over,
});

const rec = (id: string, over: Partial<ItemMasteryRecord> = {}): ItemMasteryRecord => ({
  itemId: id, category: 'kotoba', status: 'LEARNING', masteryPercentage: 0, masteryLevel: 1,
  bestScore: { score: 0, total: 0 }, attemptsCount: 0, consecutivePerfects: 0, mistakeCount: 0,
  lastReviewedAt: '2026-10-01T00:00:00.000Z', nextReviewDue: '2099-01-01T00:00:00.000Z', reviewIntervalDays: 1,
  decayFactor: 1, ...over,
} as ItemMasteryRecord);
const learned = (ids: string[], over: Partial<ItemMasteryRecord> = {}) =>
  Object.fromEntries(ids.map(id => [id, rec(id, { flashcardCount: 1, ...over })]));

/** Sumber sintetis: kanji A..J & 20 kata inti di N3, ditambah kata perluasan (level perkiraan) dan materi N4. */
function sources(): CurriculumSources {
  const chars = 'ABCDEFGHIJ'.split('');
  return {
    kanji: [
      ...chars.map((c, i) => ({ id: `kj3_${i}`, jlpt: 'N3', character: c })),
      { id: 'kj4_0', jlpt: 'N4', character: 'Z' },
    ],
    bunpou: [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `bp3_${i}`, level: 'N3' })),
      { id: 'bp4_0', level: 'N4' },
    ],
    kotoba: [
      ...chars.map((c, i) => ({ id: `kt3_k${i}`, jlpt: 'N3', kanjiComponents: [c], exampleSentence: {} })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `kt3_f${i}`, jlpt: 'N3', kanjiComponents: [], exampleSentence: {} })),
      ...Array.from({ length: 30 }, (_, i) => ({ id: `kt3_x${i}`, jlpt: 'N3', kanjiComponents: [], tags: ['jmdict', 'jlpt-estimasi'] })),
      { id: 'kt4_0', jlpt: 'N4', kanjiComponents: [], exampleSentence: {} },
    ],
  };
}
const curr = (p: GuidedProfile = profile()) => buildCurriculum(p, sources());

test('rentang level: di atas level saat ini sampai target; pemula mulai dari N5', () => {
  assert.deepEqual(levelsForProfile('N4', 'N3'), ['N3']);
  assert.deepEqual(levelsForProfile('PEMULA', 'N4'), ['N5', 'N4']);
  assert.deepEqual(levelsForProfile('N5', 'N2'), ['N4', 'N3', 'N2']);
  assert.deepEqual(levelsForProfile('N3', 'N4'), ['N4']);
  assert.deepEqual(targetOptionsFor('N4'), ['N3', 'N2', 'N1']);
  // program lama tanpa mode = berbasis waktu; masukan tidak wajar dijepit
  assert.equal(normalizeProfile({ ...profile(), mode: undefined as never }).mode, 'time');
  assert.equal(normalizeProfile(profile({ durationDays: 1, minutesPerDay: 9999 })).durationDays, 7);
  assert.equal(normalizeProfile(profile({ minutesPerDay: NaN })).minutesPerDay, 30);
});

test('kurikulum = materi INTI level target, bukan seluruh Library', () => {
  const c = curr();
  assert.deepEqual(c.levels, ['N3']);
  // 20 kata inti masuk; 30 kata perluasan (level perkiraan) hanya dihitung sebagai isi Library
  assert.equal(c.kotoba.length, 20);
  assert.equal(c.library.kotoba, 50);
  assert.ok(c.kotoba.every(id => !id.startsWith('kt3_x') && id.startsWith('kt3_')));
  assert.equal(isCoreKotoba({ id: 'a', jlpt: 'N1', tags: ['jlpt-estimasi'] }), false);
  assert.equal(c.kanji.length, 10);
  assert.equal(c.bunpou.length, 6);
  assert.equal(new Set(c.kotoba).size, c.kotoba.length);
  // tidak bergantung pada waktu belajar: waktu hanya menentukan seberapa jauh kurikulum ditempuh
  assert.deepEqual(curr(profile({ durationDays: 7, minutesPerDay: 10 })), c);
  // materi level lebih tinggi diperkirakan lebih lama dipelajari
  const n5 = buildCurriculum(profile({ currentLevel: 'PEMULA', targetLevel: 'N5' }), {
    ...sources(), bunpou: [{ id: 'b5', level: 'N5' }],
  });
  assert.ok(c.learnMinutes.bunpou > n5.learnMinutes.bunpou);
});

test('urutan kosakata mengikuti kanji: kata tidak muncul lebih awal dari hari kanjinya dijadwalkan', () => {
  const s = sources();
  const quota = { kotoba: 4, kanji: 2 };
  const order = arrangeKotoba(s.kotoba.filter(k => k.jlpt === 'N3' && isCoreKotoba(k)), 'ABCDEFGHIJ'.split(''), quota);
  assert.equal(order.length, 20);
  order.forEach((id, pos) => {
    const m = /^kt3_k(\d+)$/.exec(id);
    if (!m) return;
    assert.ok(Math.floor(pos / quota.kotoba) >= Math.floor(Number(m[1]) / quota.kanji), `${id} mendahului kanjinya`);
  });
  assert.ok(order.slice(0, 4).some(id => id.startsWith('kt3_f')));
});

test('analisis gap: Library → inti → sudah dipelajari → perlu dipelajari', () => {
  const c = curr();
  const a = analyzePlan(profile(), c, learned(['kt3_f0', 'kt3_f1', 'kj3_0', 'kt3_x0']));
  assert.deepEqual(
    [a.categories.kotoba.library, a.categories.kotoba.core, a.categories.kotoba.learned, a.categories.kotoba.gap],
    [50, 20, 2, 18]
  );
  assert.deepEqual([a.categories.kanji.learned, a.categories.kanji.gap], [1, 9]);
  // sekadar dibuka tidak mengurangi gap
  assert.equal(analyzePlan(profile(), c, { kt3_f0: rec('kt3_f0', { viewCount: 9 }) }).categories.kotoba.gap, 20);
});

test('kelayakan: waktu cukup -> tuntas; waktu kurang -> cakupan sebagian + kebutuhan yang jujur', () => {
  const c = curr();
  const enough = analyzePlan(profile({ durationDays: 60, minutesPerDay: 45 }), c, {});
  assert.equal(enough.feasible, true);
  assert.equal(enough.coveragePercent, 100);
  assert.deepEqual([enough.categories.kotoba.planned, enough.categories.kanji.planned, enough.categories.bunpou.planned], [20, 10, 6]);

  const short = analyzePlan(profile({ durationDays: 7, minutesPerDay: 10 }), c, {});
  assert.equal(short.feasible, false);
  assert.ok(short.coveragePercent > 0 && short.coveragePercent < 100);
  assert.ok(short.requiredDays > 7, 'butuh lebih dari 7 hari dengan 10 menit/hari');
  assert.ok(short.requiredMinutesPerDay > 10, 'atau lebih dari 10 menit/hari dalam 7 hari');
  assert.ok(short.categories.kotoba.planned < short.categories.kotoba.gap);
  // beban = belajar + pengulangan: total menit rencana tidak melebihi waktu yang tersedia
  const cost = (cat: 'kotoba' | 'kanji' | 'bunpou') => c.learnMinutes[cat] + short.reviewsPerItem * 0.5;
  const used = (['kotoba', 'kanji', 'bunpou'] as const).reduce((n, cat) => n + short.categories[cat].planned * cost(cat), 0);
  assert.ok(used <= 7 * 10);
  // lebih banyak waktu -> cakupan tidak pernah turun
  assert.ok(analyzePlan(profile({ durationDays: 14, minutesPerDay: 10 }), c, {}).coveragePercent >= short.coveragePercent);
  // gap kosong -> langsung layak
  const done = analyzePlan(profile(), c, learned([...c.kotoba, ...c.kanji, ...c.bunpou]));
  assert.deepEqual([done.feasible, done.coveragePercent, done.workloadMinutes], [true, 100, 0]);
});

test('mode target: sistem menghitung durasi yang dibutuhkan, lalu seluruh gap tercakup', () => {
  const c = curr();
  const a = analyzePlan(profile({ mode: 'target', minutesPerDay: 10, durationDays: 7 }), c, {});
  assert.equal(a.feasible, true);
  assert.equal(a.days, Math.max(7, a.requiredDays));
  assert.ok(a.days > 7);
  // waktu harian lebih banyak -> durasi lebih pendek
  assert.ok(analyzePlan(profile({ mode: 'target', minutesPerDay: 60 }), c, {}).days < a.days);
  const plan = createPlan(profile({ mode: 'target', minutesPerDay: 10 }), '2026-10-13', c, {}, 't');
  assert.equal(plan.profile.durationDays, a.days);
  assert.deepEqual(plan.goal, { kotoba: 20, kanji: 10, bunpou: 6 });
  assert.deepEqual(plan.baseline, { kotoba: 0, kanji: 0, bunpou: 0 });
});

test('preferensi menentukan prioritas saat waktu tidak cukup; sisa jatah dialihkan ke kategori lain', () => {
  const c = curr();
  const p = (focus: GuidedProfile['focus']) => analyzePlan(profile({ durationDays: 7, minutesPerDay: 15, focus }), c, {});
  assert.ok(p('kanji').categories.kanji.planned >= p('balanced').categories.kanji.planned);
  assert.ok(p('bunpou').categories.bunpou.planned >= p('balanced').categories.bunpou.planned);
  // bunpou sudah tuntas -> waktunya dipakai kategori lain
  const noBunpou = analyzePlan(profile({ durationDays: 7, minutesPerDay: 15 }), c, learned(c.bunpou));
  assert.equal(noBunpou.categories.bunpou.planned, 0);
  assert.ok(noBunpou.categories.kotoba.planned >= p('balanced').categories.kotoba.planned);
  assert.ok(reviewsPerItem(180) > reviewsPerItem(14));
});

test('misi hari pertama: materi terdepan, Recall ringan memberi ruang sedikit lebih banyak materi baru', () => {
  const c = curr();
  const p = profile({ durationDays: 14, minutesPerDay: 20 });
  const plan = createPlan(p, '2026-10-13', c, {}, 't');
  const day = planDay(plan, c, {}, '2026-10-13', { dueCount: 0 });
  assert.deepEqual(day.kotoba, c.kotoba.slice(0, day.kotoba.length));
  assert.ok(day.kotoba.length >= 1 && day.kanji.length >= 1);
  assert.deepEqual(day.carried, []);
  assert.ok(day.notes!.includes('recall_light'));
  // belum ada yang jatuh tempo, tetapi materi hari ini langsung memenuhi syarat Recall
  assert.ok(day.recallTarget > 0 && day.recallTarget <= 10);
  assert.equal(day.evalTarget, undefined);
});

test('Recall adaptif: mengikuti jumlah jatuh tempo; menumpuk -> materi baru berkurang tetapi tidak nol', () => {
  const c = curr();
  const p = profile({ durationDays: 14, minutesPerDay: 20 });
  const plan = createPlan(p, '2026-10-13', c, {}, 't');
  const light = planDay(plan, c, {}, '2026-10-13', { dueCount: 0 });
  const some = planDay(plan, c, {}, '2026-10-13', { dueCount: 8 });
  const heavy = planDay(plan, c, {}, '2026-10-13', { dueCount: 40 });
  assert.ok(some.recallTarget > light.recallTarget);
  assert.ok(heavy.recallTarget >= some.recallTarget);
  assert.ok(heavy.recallMinutes! <= 20 * 0.6 + 1, 'Recall tidak memakan seluruh waktu harian');
  const total = (d: typeof light) => d.kotoba.length + d.kanji.length + d.bunpou.length;
  assert.ok(total(heavy) < total(light));
  assert.ok(heavy.kotoba.length >= 1);
  assert.ok(heavy.notes!.includes('recall_heavy'));
  // batas keras: materi baru + Recall tidak melebihi waktu harian, di kondisi apa pun
  for (const d of [light, some, heavy]) {
    const used = d.kotoba.length * c.learnMinutes.kotoba + d.kanji.length * c.learnMinutes.kanji
      + d.bunpou.length * c.learnMinutes.bunpou + d.recallTarget * 0.5;
    assert.ok(used <= 20 || total(d) <= 3, `beban ${used} menit melebihi 20 menit`);
  }
  // jatuh tempo dihitung dari jadwal SRS yang sebenarnya
  const m = {
    a: rec('a', { flashcardCount: 1, nextReviewDue: '2026-10-12T00:00:00.000Z' }),
    b: rec('b', { flashcardCount: 1, nextReviewDue: '2026-10-20T00:00:00.000Z' }),
    c: rec('c', { viewCount: 3, nextReviewDue: '2026-10-01T00:00:00.000Z' }),
  };
  assert.equal(countRecallDue(m, new Date('2026-10-13T08:00:00.000Z')), 1);
});

test('retensi rendah: materi baru dikurangi sampai fondasi kuat lagi', () => {
  const c = curr();
  const p = profile({ durationDays: 14, minutesPerDay: 20 });
  const plan = createPlan(p, '2026-10-13', c, {}, 't');
  const outside = Array.from({ length: 12 }, (_, i) => c.kotoba[19 - i] ?? `z${i}`);
  const weak = learned(outside.slice(0, 12), { quizCount: 2, attemptsCount: 2, masteryPercentage: 30 });
  const strong = learned(outside.slice(0, 12), { quizCount: 2, attemptsCount: 2, masteryPercentage: 80 });
  const dWeak = planDay(plan, c, weak, '2026-10-13', { dueCount: 6 });
  const dStrong = planDay(plan, c, strong, '2026-10-13', { dueCount: 6 });
  assert.ok(dWeak.notes!.includes('retention_low'));
  assert.ok(!dStrong.notes!.includes('retention_low'));
  const total = (d: typeof dWeak) => d.kotoba.length + d.kanji.length + d.bunpou.length;
  assert.ok(total(dWeak) <= total(dStrong));
});

test('tertinggal: yang selesai tetap selesai, sisanya tertunda dan didahulukan esok hari', () => {
  const c = curr();
  const p = profile({ durationDays: 14, minutesPerDay: 20 });
  const day1 = ensureToday(createPlan(p, '2026-10-13', c, {}, 't0'), c, {}, '2026-10-13', { dueCount: 0 }, 't1')!;
  const assigned = day1.today!.kotoba;
  assert.ok(assigned.length >= 2);

  const mastery = learned([assigned[0]]);
  const kotoba = dayProgress(day1.today!, mastery, undefined).missions.find(m => m.key === 'kotoba')!;
  assert.deepEqual([kotoba.done, kotoba.total, kotoba.complete], [1, assigned.length, false]);
  // hari yang sama: penugasan dibekukan (objek yang sama)
  assert.equal(ensureToday(day1, c, mastery, '2026-10-13'), day1);

  const day2 = ensureToday(day1, c, mastery, '2026-10-14', { dueCount: 1 }, 't2')!;
  assert.equal(day2.today!.date, '2026-10-14');
  assert.ok(!day2.today!.kotoba.includes(assigned[0]), 'yang sudah dipelajari tidak ditugaskan lagi');
  const pending = assigned.slice(1);
  assert.deepEqual(day2.today!.kotoba.slice(0, pending.length), pending.slice(0, day2.today!.kotoba.length));
  assert.ok(day2.today!.carried.includes(assigned[1]));
  assert.equal(dayProgress(day2.today!, mastery, undefined).carriedCount, day2.today!.carried.length);
  assert.deepEqual(day2.today!.claimed, {});
});

test('evaluasi berkala tiap 7 hari: selesai lewat soal latihan atau satu simulasi ujian', () => {
  const c = curr();
  const p = profile({ durationDays: 30, minutesPerDay: 20 });
  const plan = createPlan(p, '2026-10-13', c, {}, 't');
  const stats = { questions: { total: 40 }, tryOuts: { total: 2 } };
  assert.equal(planDay(plan, c, {}, '2026-10-18', { dueCount: 0, studyStats: stats }).evalTarget, undefined);
  const day7 = planDay(plan, c, {}, '2026-10-19', { dueCount: 0, studyStats: stats });
  assert.equal(day7.evalTarget, EVALUATION_QUESTIONS);
  assert.deepEqual(day7.evalBaseline, { questions: 40, tryOuts: 2 });
  const evalOf = (s: typeof stats) => dayProgress(day7, {}, undefined, s).missions.find(m => m.key === 'evaluasi')!;
  assert.deepEqual([evalOf(stats).done, evalOf(stats).complete], [0, false]);
  assert.equal(evalOf({ questions: { total: 46 }, tryOuts: { total: 2 } }).done, 6);
  assert.equal(evalOf({ questions: { total: 55 }, tryOuts: { total: 2 } }).complete, true);
  assert.equal(evalOf({ questions: { total: 40 }, tryOuts: { total: 3 } }).complete, true);
});

test('tiga keadaan materi dibedakan: dibuka ≠ dipelajari ≠ dikuasai', () => {
  assert.equal(itemState(undefined), 'baru');
  assert.equal(itemState(rec('a', { viewCount: 3 })), 'dibuka');
  assert.equal(itemState(rec('a', { writingCount: 1 })), 'dipelajari');
  assert.equal(itemState(rec('a', { quizCount: 2, attemptsCount: 2, status: 'MASTERED' })), 'dikuasai');
  assert.equal(isLearned({ a: rec('a', { viewCount: 5 }) }, 'a'), false);
});

test('misi Recall selesai dari jawaban Recall HARI ITU; klaim hanya sekali', () => {
  const c = curr();
  let plan = ensureToday(createPlan(profile({ durationDays: 14, minutesPerDay: 20 }), '2026-10-13', c, {}, 'a'), c, {}, '2026-10-13', { dueCount: 4 }, 'b')!;
  const target = plan.today!.recallTarget;
  const recall = (answered: number, date = '2026-10-13') =>
    dayProgress(plan.today!, {}, { date, answered, newTested: 0, sessions: 0 }).missions.find(m => m.key === 'recall')!;
  assert.equal(recall(target - 1).complete, false);
  assert.equal(recall(target + 5).done, target);
  assert.equal(recall(target, '2026-10-12').done, 0, 'jawaban kemarin tidak dihitung');

  plan = markClaimed(plan, 'recall', '2026-10-13', 'c');
  assert.equal(plan.today!.claimed.recall, true);
  assert.equal(markClaimed(plan, 'recall', '2026-10-13', 'd'), plan);
  assert.equal(markClaimed(plan, 'kotoba', '2026-10-14', 'd'), plan, 'tanggal lain diabaikan');
});

test('ringkasan program: cakupan, retensi, penguasaan, dan laju terhadap sasaran', () => {
  const c = curr();
  const plan = createPlan(profile({ durationDays: 10, minutesPerDay: 45 }), '2026-10-13', c, {}, 'a');
  assert.equal(dayIndexOf(plan, '2026-10-13'), 1);
  assert.equal(dayIndexOf(plan, '2026-11-01'), 20);
  const first = planOverview(plan, c, {}, '2026-10-13');
  assert.deepEqual([first.pace, first.percent, first.retentionPercent, first.planned], ['on_track', 0, null, 36]);
  assert.ok(first.daysToComplete > 0);
  assert.equal(planOverview(plan, c, {}, '2026-10-20').pace, 'behind');
  assert.equal(planOverview(plan, c, learned(c.kotoba), '2026-10-13').pace, 'ahead');

  // dipelajari ≠ teruji ≠ dikuasai
  const mixed = {
    ...learned(c.kotoba.slice(0, 4)),
    ...learned(c.kotoba.slice(4, 8), { quizCount: 1, attemptsCount: 1, masteryPercentage: 70 }),
    ...learned(c.kotoba.slice(8, 10), { quizCount: 1, attemptsCount: 1, masteryPercentage: 20 }),
    ...learned(c.kotoba.slice(10, 12), { quizCount: 3, attemptsCount: 3, masteryPercentage: 95, status: 'MASTERED' }),
  };
  const o = planOverview(plan, c, mixed, '2026-10-14');
  assert.deepEqual([o.learned, o.tested, o.retentionPercent, o.mastered], [12, 8, 75, 2]);
  assert.equal(o.percent, Math.round((12 / 36) * 100));

  const all = planOverview(plan, c, learned([...c.kotoba, ...c.kanji, ...c.bunpou]), '2026-10-20');
  assert.deepEqual([all.pace, all.percent, all.daysToComplete], ['finished', 100, 0]);
  // laju diukur dari titik awal: yang dipelajari sebelum program tidak dihitung sebagai capaian program
  const pre = learned(c.kotoba.slice(0, 10));
  const later = createPlan(profile({ durationDays: 10, minutesPerDay: 45 }), '2026-10-13', c, pre, 'a');
  assert.equal(later.baseline!.kotoba, 10);
  assert.equal(planOverview(later, c, pre, '2026-10-13').progressed, 0);
});

test('gabungan lokal ↔ cloud: yang terakhir diubah menang, klaim di-union, penghentian tidak dihidupkan lagi', () => {
  const c = curr();
  const base = ensureToday(createPlan(profile({ durationDays: 14, minutesPerDay: 20 }), '2026-10-13', c, {}, 't0'), c, {}, '2026-10-13', {}, 't1')!;
  const a = markClaimed(base, 'kotoba', '2026-10-13', 't2');
  const b = markClaimed(base, 'kanji', '2026-10-13', 't3');
  assert.deepEqual(mergeGuidedPlan(a, b)!.today!.claimed, { kotoba: true, kanji: true });
  assert.deepEqual(mergeGuidedPlan(b, a)!.today!.claimed, { kotoba: true, kanji: true });
  assert.equal(mergeGuidedPlan(undefined, a), a);
  const stopped = { ...base, status: 'stopped' as const, updatedAt: 't9' };
  assert.equal(mergeGuidedPlan(a, stopped)!.status, 'stopped');
  assert.equal(ensureToday(stopped, c, {}, '2026-10-14'), stopped);
});

test('basis data asli: N2 → N1 memisahkan materi inti dari Library dan menilai kelayakan dengan jujur', () => {
  const c = getCurriculum(profile({ currentLevel: 'N2', targetLevel: 'N1' }));
  assert.deepEqual(c.levels, ['N1']);
  assert.equal(c.library.kotoba, 11369);
  assert.equal(c.kotoba.length, 3483, 'hanya kosakata N1 yang levelnya dikurasi');
  assert.equal(c.kanji.length, 1373);
  assert.equal(c.bunpou.length, 267);
  assert.equal(new Set([...c.kotoba, ...c.kanji, ...c.bunpou]).size, c.kotoba.length + c.kanji.length + c.bunpou.length);

  // 30 hari × 45 menit jelas tidak cukup untuk N1
  const short = analyzePlan(profile({ currentLevel: 'N2', targetLevel: 'N1', durationDays: 30 }), c, {});
  assert.equal(short.feasible, false);
  assert.ok(short.coveragePercent < 10);
  assert.ok(short.requiredDays > 365);
  // mode target menyatakan durasi yang dibutuhkan (dibatasi 730 hari)
  const target = analyzePlan(profile({ mode: 'target', currentLevel: 'N2', targetLevel: 'N1', minutesPerDay: 90 }), c, {});
  assert.ok(target.days > 180 && target.days <= 730);

  // pemula → N5 dengan 45 menit/hari: durasi yang dibutuhkan masuk akal (beberapa bulan)
  const n5 = profile({ mode: 'target', currentLevel: 'PEMULA', targetLevel: 'N5' });
  const a5 = analyzePlan(n5, getCurriculum(n5), {});
  assert.ok(a5.feasible && a5.days >= 60 && a5.days <= 240, `durasi N5 = ${a5.days}`);
  assert.ok(a5.newMinutesPerDay + a5.recallMinutesPerDay <= 46);
});

test('diagnosis fondasi: level yang dipilih dibandingkan dengan riwayat belajar yang tercatat', () => {
  assert.deepEqual(getFoundation('PEMULA', {}), []);
  const f = getFoundation('N4', {});
  assert.deepEqual(f.map(x => x.level), ['N5', 'N4']);
  assert.ok(f.every(x => x.core > 0 && x.learned === 0));
  const n5 = getCurriculum(profile({ currentLevel: 'PEMULA', targetLevel: 'N5' }));
  assert.equal(getFoundation('N5', learned(n5.kanji))[0].learned, n5.kanji.length);
});
