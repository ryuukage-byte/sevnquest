import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCurriculum, computeBaseQuota, levelsForProfile, targetOptionsFor, selectAcrossLevels, arrangeKotoba,
  createPlan, planDay, ensureToday, dayProgress, planOverview, itemState, isLearned, markClaimed, mergeGuidedPlan,
  dayIndexOf, normalizeProfile,
} from './curriculum';
import { getCurriculum } from './sources';
import type { CurriculumSources, GuidedProfile } from './types';
import type { ItemMasteryRecord } from '../../types/content';

const profile = (over: Partial<GuidedProfile> = {}): GuidedProfile => ({
  currentLevel: 'N4', targetLevel: 'N3', durationDays: 60, minutesPerDay: 45, focus: 'balanced', ...over,
});

const rec = (id: string, over: Partial<ItemMasteryRecord> = {}): ItemMasteryRecord => ({
  itemId: id, category: 'kotoba', status: 'LEARNING', masteryPercentage: 0, masteryLevel: 1,
  bestScore: { score: 0, total: 0 }, attemptsCount: 0, consecutivePerfects: 0, mistakeCount: 0,
  lastReviewedAt: '2026-10-01T00:00:00.000Z', nextReviewDue: '2026-10-02T00:00:00.000Z', reviewIntervalDays: 1,
  decayFactor: 1, ...over,
} as ItemMasteryRecord);
const learned = (ids: string[]) => Object.fromEntries(ids.map(id => [id, rec(id, { flashcardCount: 1 })]));

/** Sumber sintetis: 2 level, kanji A..J di N3, kata yang sebagian memakai kanji itu. */
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
      { id: 'kt4_0', jlpt: 'N4', kanjiComponents: [], exampleSentence: {} },
    ],
  };
}

test('rentang level: di atas level saat ini sampai target; pemula mulai dari N5', () => {
  assert.deepEqual(levelsForProfile('N4', 'N3'), ['N3']);
  assert.deepEqual(levelsForProfile('PEMULA', 'N4'), ['N5', 'N4']);
  assert.deepEqual(levelsForProfile('N5', 'N2'), ['N4', 'N3', 'N2']);
  // target tidak di atas level saat ini -> pemantapan level target
  assert.deepEqual(levelsForProfile('N3', 'N4'), ['N4']);
  assert.deepEqual(targetOptionsFor('N4'), ['N3', 'N2', 'N1']);
  assert.deepEqual(targetOptionsFor('PEMULA'), ['N5', 'N4', 'N3', 'N2', 'N1']);
});

test('jatah harian mengikuti waktu belajar & preferensi (45 menit seimbang = 9 kotoba / 3 kanji / 2 bunpou)', () => {
  assert.deepEqual(computeBaseQuota(profile()), { kotoba: 9, kanji: 3, bunpou: 2 });
  const short = computeBaseQuota(profile({ minutesPerDay: 15 }));
  const long = computeBaseQuota(profile({ minutesPerDay: 90 }));
  assert.ok(short.kotoba < long.kotoba && short.kanji <= long.kanji);
  assert.ok(short.kotoba >= 1 && short.kanji >= 1 && short.bunpou >= 1);
  assert.ok(computeBaseQuota(profile({ focus: 'kanji' })).kanji > computeBaseQuota(profile()).kanji);
  // masukan tidak wajar dijepit
  assert.equal(normalizeProfile(profile({ durationDays: 1, minutesPerDay: 9999 })).durationDays, 7);
  assert.equal(normalizeProfile(profile({ minutesPerDay: NaN })).minutesPerDay, 30);
});

test('pemilihan lintas level sebanding dengan ukuran level saat kapasitas tidak cukup', () => {
  const sel = selectAcrossLevels([[1, 2, 3, 4], [5, 6, 7, 8, 9, 10, 11, 12]], 6);
  assert.deepEqual(sel.map(l => l.length), [2, 4]);
  assert.deepEqual(sel[0], [1, 2]);
  assert.deepEqual(selectAcrossLevels([[1], [2, 3]], 10), [[1], [2, 3]]);
});

test('kurikulum: hanya level program, tanpa duplikat, deterministik, dibatasi kapasitas waktu', () => {
  const p = profile({ durationDays: 7, minutesPerDay: 10 });
  const c = buildCurriculum(p, sources());
  assert.deepEqual(c.levels, ['N3']);
  assert.ok(c.kotoba.every(id => id.startsWith('kt3_')) && c.kanji.every(id => id.startsWith('kj3_')));
  assert.equal(new Set(c.kotoba).size, c.kotoba.length);
  assert.deepEqual(buildCurriculum(p, sources()), c);
  // kapasitas: jatah dasar × hari; cakupan dilaporkan apa adanya
  const base = computeBaseQuota(p);
  assert.equal(c.coverage.kotoba.available, 20);
  assert.equal(c.coverage.kotoba.planned, Math.min(20, base.kotoba * 7));
  assert.equal(c.kotoba.length, c.coverage.kotoba.planned);
  // materi lebih sedikit dari kapasitas -> jatah harian turun, tidak pernah melebihi jatah dasar
  const roomy = buildCurriculum(profile({ durationDays: 60, minutesPerDay: 120 }), sources());
  assert.equal(roomy.kotoba.length, 20);
  assert.equal(roomy.quota.kotoba, 1);
});

test('urutan kosakata mengikuti kanji: kata tidak muncul lebih awal dari hari kanjinya dijadwalkan', () => {
  const s = sources();
  const quota = { kotoba: 4, kanji: 2, bunpou: 1 };
  const order = arrangeKotoba(s.kotoba.filter(k => k.jlpt === 'N3'), 'ABCDEFGHIJ'.split(''), quota);
  assert.equal(order.length, 20);
  order.forEach((id, pos) => {
    const m = /^kt3_k(\d+)$/.exec(id);
    if (!m) return;
    const kanjiDay = Math.floor(Number(m[1]) / quota.kanji);
    assert.ok(Math.floor(pos / quota.kotoba) >= kanjiDay, `${id} di posisi ${pos} mendahului kanjinya`);
  });
  // kata tanpa kanji baru ikut tersebar, bukan menumpuk di akhir
  assert.ok(order.slice(0, 4).some(id => id.startsWith('kt3_f')));
});

test('misi hari pertama mengambil materi terdepan sesuai jatah, dan Recall punya target', () => {
  const p = profile({ durationDays: 10, minutesPerDay: 20 });
  const c = buildCurriculum(p, sources());
  const plan = createPlan(p, '2026-10-13', '2026-10-13T00:00:00.000Z');
  const day = planDay(plan, c, {}, '2026-10-13', 0);
  assert.deepEqual(day.kotoba, c.kotoba.slice(0, day.kotoba.length));
  assert.equal(day.kotoba.length, c.quota.kotoba);
  assert.equal(day.kanji.length, c.quota.kanji);
  assert.deepEqual(day.carried, []);
  assert.ok(day.recallTarget > 0 && day.recallTarget <= 10);
});

test('tertinggal: yang selesai tetap selesai, sisanya tertunda dan didahulukan esok hari', () => {
  const p = profile({ durationDays: 10, minutesPerDay: 20 });
  const c = buildCurriculum(p, sources());
  const start = createPlan(p, '2026-10-13', '2026-10-13T00:00:00.000Z');
  const day1 = ensureToday(start, c, {}, '2026-10-13')!;
  const assigned = day1.today!.kotoba;
  assert.ok(assigned.length >= 2);

  // hanya kata pertama yang dipelajari
  const mastery = learned([assigned[0]]);
  const prog = dayProgress(day1.today!, mastery, undefined);
  const kotoba = prog.missions.find(m => m.key === 'kotoba')!;
  assert.deepEqual([kotoba.done, kotoba.total, kotoba.complete], [1, assigned.length, false]);
  assert.equal(isLearned(mastery, assigned[1]), false);

  // hari yang sama: penugasan dibekukan (objek yang sama)
  assert.equal(ensureToday(day1, c, mastery, '2026-10-13'), day1);

  const day2 = ensureToday(day1, c, mastery, '2026-10-14')!;
  assert.equal(day2.today!.date, '2026-10-14');
  assert.ok(!day2.today!.kotoba.includes(assigned[0]), 'yang sudah dipelajari tidak ditugaskan lagi');
  assert.deepEqual(day2.today!.kotoba.slice(0, assigned.length - 1), assigned.slice(1), 'yang tertunda berada di depan');
  assert.deepEqual(day2.today!.carried.filter(id => id.startsWith('kt3_')), assigned.slice(1));
  assert.deepEqual(day2.today!.claimed, {});
});

test('penyesuaian jadwal: jatah naik saat tertinggal tetapi paling banyak ×1,5; turun saat Recall menumpuk', () => {
  const p = profile({ durationDays: 10, minutesPerDay: 20 });
  const c = buildCurriculum(p, sources());
  const plan = createPlan(p, '2026-10-13', '2026-10-13T00:00:00.000Z');
  const onTrack = planDay(plan, c, {}, '2026-10-13', 0);
  // hari terakhir, belum belajar apa pun
  const late = planDay(plan, c, {}, '2026-10-22', 0);
  assert.ok(late.kotoba.length > onTrack.kotoba.length);
  assert.ok(late.kotoba.length <= Math.ceil(c.quota.kotoba * 1.5));
  // antrean Recall penuh -> materi baru dikurangi, tetapi tidak sampai nol
  const pressured = planDay(plan, c, {}, '2026-10-13', 40);
  assert.ok(pressured.kotoba.length < onTrack.kotoba.length || onTrack.kotoba.length === 1);
  assert.ok(pressured.kotoba.length >= 1);
  assert.equal(pressured.recallTarget, 10);
  // melewati akhir program: materi tersisa tetap dijadwalkan
  assert.ok(planDay(plan, c, {}, '2026-12-01', 0).kotoba.length >= 1);
});

test('tiga keadaan materi dibedakan: dibuka ≠ dipelajari ≠ dikuasai', () => {
  assert.equal(itemState(undefined), 'baru');
  assert.equal(itemState(rec('a', { viewCount: 3 })), 'dibuka');
  assert.equal(itemState(rec('a', { writingCount: 1 })), 'dipelajari');
  assert.equal(itemState(rec('a', { quizCount: 2, attemptsCount: 2, status: 'MASTERED' })), 'dikuasai');
  // sekadar membuka materi tidak menyelesaikan misi
  assert.equal(isLearned({ a: rec('a', { viewCount: 5 }) }, 'a'), false);
});

test('misi Recall selesai dari jawaban Recall HARI ITU; klaim hanya sekali', () => {
  const p = profile({ durationDays: 10, minutesPerDay: 20 });
  const c = buildCurriculum(p, sources());
  let plan = ensureToday(createPlan(p, '2026-10-13', 'a'), c, {}, '2026-10-13', 4, 'b')!;
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

test('ringkasan program: persentase, tertinggal / sesuai jadwal / selesai', () => {
  const p = profile({ durationDays: 10, minutesPerDay: 20 });
  const c = buildCurriculum(p, sources());
  const plan = createPlan(p, '2026-10-13', 'a');
  assert.equal(dayIndexOf(plan, '2026-10-13'), 1);
  assert.equal(dayIndexOf(plan, '2026-11-01'), 20);
  const first = planOverview(plan, c, {}, '2026-10-13');
  assert.deepEqual([first.pace, first.percent, first.dayIndex, first.daysLeft], ['on_track', 0, 1, 10]);
  assert.equal(planOverview(plan, c, {}, '2026-10-20').pace, 'behind');
  const all = learned([...c.kotoba, ...c.kanji, ...c.bunpou]);
  const done = planOverview(plan, c, all, '2026-10-20');
  assert.deepEqual([done.pace, done.percent], ['finished', 100]);
  assert.equal(planOverview(plan, c, learned(c.kotoba), '2026-10-13').pace, 'ahead');
});

test('gabungan lokal ↔ cloud: yang terakhir diubah menang, klaim di-union, penghentian tidak dihidupkan lagi', () => {
  const p = profile({ durationDays: 10, minutesPerDay: 20 });
  const c = buildCurriculum(p, sources());
  const base = ensureToday(createPlan(p, '2026-10-13', 't0'), c, {}, '2026-10-13', 0, 't1')!;
  const a = markClaimed(base, 'kotoba', '2026-10-13', 't2');
  const b = markClaimed(base, 'kanji', '2026-10-13', 't3');
  assert.deepEqual(mergeGuidedPlan(a, b)!.today!.claimed, { kotoba: true, kanji: true });
  assert.deepEqual(mergeGuidedPlan(b, a)!.today!.claimed, { kotoba: true, kanji: true });
  assert.equal(mergeGuidedPlan(undefined, a), a);
  const stopped = { ...base, status: 'stopped' as const, updatedAt: 't9' };
  assert.equal(mergeGuidedPlan(a, stopped)!.status, 'stopped');
  assert.equal(ensureToday(stopped, c, {}, '2026-10-14'), stopped);
});

test('basis data asli: N4 → N3, 60 hari, 45 menit menghasilkan kurikulum yang masuk akal', () => {
  const c = getCurriculum(profile());
  assert.deepEqual(c.levels, ['N3']);
  assert.deepEqual(c.quota, { kotoba: 9, kanji: 3, bunpou: 2 });
  assert.equal(c.kotoba.length, 540);
  assert.equal(c.kanji.length, 180);
  assert.ok(c.bunpou.length > 0 && c.bunpou.length <= 120);
  assert.ok(c.coverage.kotoba.available > c.coverage.kotoba.planned, 'cakupan dilaporkan jujur: tidak semua kotoba N3 muat');
  assert.equal(new Set([...c.kotoba, ...c.kanji, ...c.bunpou]).size, c.kotoba.length + c.kanji.length + c.bunpou.length);
  // pemula -> N5 muat seluruhnya dalam 90 hari × 45 menit
  const n5 = getCurriculum(profile({ currentLevel: 'PEMULA', targetLevel: 'N5', durationDays: 90 }));
  assert.equal(n5.coverage.kanji.planned, n5.coverage.kanji.available);
  assert.equal(n5.coverage.kotoba.planned, n5.coverage.kotoba.available);
});
