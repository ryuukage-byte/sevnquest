import test from 'node:test';
import assert from 'node:assert/strict';
import { BUNPOU_LEARNING_STAGES, bunpouLearningRank, sortBunpouForLearning } from './bunpouOrder';
import { getCurriculum, getCurriculumSources } from './sources';

test('setiap pola N5/N4/N2/N1 terdaftar tepat sekali dalam urutan belajar', () => {
  const all = getCurriculumSources().bunpou;
  for (const level of ['N5', 'N4', 'N2', 'N1'] as const) {
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

test('N2/N1: dikelompokkan per fungsi — pola mirip berdekatan, yang umum sebelum yang sastra', () => {
  const rank = (id: string) => bunpouLearningRank(id)!;
  const near = (a: string, b: string, max = 3) =>
    assert.ok(Math.abs(rank(a) - rank(b)) <= max, `${a} dan ${b} seharusnya berdekatan`);
  near('bp_n2_199', 'bp_n2_200'); // よりしかたがない / よりほかない
  near('bp_n2_145', 'bp_n2_146'); // にしても〜にしても / にしろ〜にしろ
  near('bp_n2_084', 'bp_n2_088'); // てたまらない / てならない
  near('bp_n2_203', 'bp_n2_204'); // をきっかけに / を契機に
  near('bp_n1_027', 'bp_n1_234'); // が早いか / や否や
  near('bp_n1_194', 'bp_n1_195'); // の至り / の極み
  near('bp_n1_263', 'bp_n1_264'); // を余儀なくさせる / を余儀なくされる
  near('bp_n1_021', 'bp_n1_024'); // かたがた / がてら
  // kata keterangan & penghubung yang umum di depan; bentuk klasik / ragam khusus di belakang
  assert.ok(rank('bp_n2_004') < rank('bp_n2_048')); // いきなり < 〜ざる
  assert.ok(rank('bp_n2_051') < rank('bp_n2_159')); // しかも < 〜ぬ
  assert.ok(rank('bp_n1_005') < rank('bp_n1_042')); // 案の定 < 〜如く
  const n1 = getCurriculum({ mode: 'time', currentLevel: 'N2', targetLevel: 'N1', durationDays: 90, minutesPerDay: 45, focus: 'balanced' });
  assert.equal(n1.bunpou[0], 'bp_n1_001');
  assert.equal(n1.bunpou.indexOf('bp_n1_003') > 50, true, '〜あっての tidak lagi di urutan ke-3 (abjad)');
});

test('pola tanpa peringkat tetap di urutan asalnya, setelah yang berperingkat', () => {
  const sorted = sortBunpouForLearning([{ id: 'x2' }, { id: 'bp_n5_096' }, { id: 'x1' }, { id: 'bp_n5_036' }]);
  assert.deepEqual(sorted.map(s => s.id), ['bp_n5_036', 'bp_n5_096', 'x2', 'x1']);
});
