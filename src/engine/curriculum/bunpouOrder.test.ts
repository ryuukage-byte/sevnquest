import test from 'node:test';
import assert from 'node:assert/strict';
import { BUNPOU_LEARNING_STAGES, bunpouLearningRank, sortBunpouForLearning } from './bunpouOrder';
import { getCurriculum, getCurriculumSources } from './sources';

test('setiap pola N5/N4 terdaftar tepat sekali dalam urutan belajar', () => {
  const all = getCurriculumSources().bunpou;
  for (const level of ['N5', 'N4'] as const) {
    const ids = all.filter(b => b.level === level).map(b => b.id);
    const listed = BUNPOU_LEARNING_STAGES[level].flatMap(([, nums]) => nums);
    assert.equal(new Set(listed).size, listed.length, `${level}: ada nomor ganda`);
    assert.deepEqual(ids.filter(id => bunpouLearningRank(id) === undefined), [], `${level}: ada pola yang belum diurutkan`);
    assert.equal(listed.length, ids.length, `${level}: ada nomor yang tidak punya pola`);
    // sumber kurikulum sudah terurut menurut peringkat
    const ranks = ids.map(id => bunpouLearningRank(id)!);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  }
});

test('pola dasar mendahului pola yang bergantung padanya', () => {
  const before = (a: string, b: string) =>
    assert.ok(bunpouLearningRank(a)! < bunpouLearningRank(b)!, `${a} harus sebelum ${b}`);
  before('bp_n5_036', 'bp_n5_030'); // だ・です -> じゃない
  before('bp_n5_105', 'bp_n5_103'); // ます -> ましょう
  before('bp_n5_048', 'bp_n5_053'); // 〜て -> てください
  before('bp_n5_048', 'bp_n5_051'); // 〜て -> ている
  before('bp_n5_051', 'bp_n5_108'); // ている -> まだ〜ていません
  before('bp_n5_020', 'bp_n5_021'); // くない -> くなかった
  before('bp_n5_069', 'bp_n5_074'); // ないで -> なくてはいけない
  before('bp_n5_098', 'bp_n5_095'); // は〜より -> の中で〜が一番
  before('bp_n5_089', 'bp_n5_092'); // の (nominalizer) -> のが好き
  before('bp_n4_026', 'bp_n4_174'); // 意向形 -> ようと思う
  before('bp_n4_103', 'bp_n4_101'); // てくれる -> てくれてありがとう
  before('bp_n4_153', 'bp_n4_159'); // ば -> ばよかった
  before('bp_n4_187', 'bp_n4_061'); // pasif -> kausatif-pasif
  before('bp_n4_070', 'bp_n4_061'); // kausatif -> kausatif-pasif
  before('bp_n4_158', 'bp_n4_157'); // はずだ -> はずがない
});

test('kurikulum memakai urutan belajar: pemula mulai dari kopula, N3 tetap urutan buku ajar', () => {
  const n5 = getCurriculum({ mode: 'time', currentLevel: 'PEMULA', targetLevel: 'N5', durationDays: 90, minutesPerDay: 45, focus: 'balanced' });
  assert.deepEqual(n5.bunpou.slice(0, 3), ['bp_n5_036', 'bp_n5_096', 'bp_n5_030']);
  const n3 = getCurriculum({ mode: 'time', currentLevel: 'N4', targetLevel: 'N3', durationDays: 60, minutesPerDay: 45, focus: 'balanced' });
  assert.equal(n3.bunpou[0], 'w1d1g1');
});

test('pola tanpa peringkat tetap di urutan asalnya, setelah yang berperingkat', () => {
  const sorted = sortBunpouForLearning([{ id: 'x2' }, { id: 'bp_n5_096' }, { id: 'x1' }, { id: 'bp_n5_036' }]);
  assert.deepEqual(sorted.map(s => s.id), ['bp_n5_036', 'bp_n5_096', 'x2', 'x1']);
});
