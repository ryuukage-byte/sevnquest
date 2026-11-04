import test from 'node:test';
import assert from 'node:assert/strict';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { BUNPOU_PATTERN_INSIGHTS } from '../../data/bunpouPatternInsights';
import {
  buildPartQuiz,
  buildPatternInsight,
  hasPatternInsight,
  quizzablePartIndexes,
  titleForms,
} from './bunpouInsight';

const build = (id: string) => {
  const item = BUNPOU_DATABASE[id];
  assert.ok(item, `pola ${id} ada di database`);
  const ins = buildPatternInsight(item, BUNPOU_DATABASE);
  assert.ok(ins, `pola ${id} punya Bedah Pola`);
  return ins!;
};

test('setiap catatan kurasi menunjuk pola yang ada dan lengkap', () => {
  for (const [id, note] of Object.entries(BUNPOU_PATTERN_INSIGHTS)) {
    assert.ok(BUNPOU_DATABASE[id], `${id} ada di database`);
    assert.ok(note.parts.length > 0, `${id}: punya komponen`);
    for (const p of note.parts) assert.ok(p.text && p.meaning, `${id}: komponen lengkap`);
    assert.ok(note.literal && note.natural && note.explanation, `${id}: makna lengkap`);
    for (const src of note.match ?? []) assert.doesNotThrow(() => new RegExp(src), `${id}: regex ${src}`);
    // Judul pola lama N3 memuat contoh + rumus dalam kurung, jadi wajib punya judul tampilan kurasi.
    if (!id.startsWith('bp_')) assert.ok(note.title, `${id}: pola lama wajib punya judul tampilan`);
  }
});

test('setiap pola terkurasi tersorot di minimal satu contoh kalimat', () => {
  for (const id of Object.keys(BUNPOU_PATTERN_INSIGHTS)) {
    const ins = build(id);
    const hits = ins.examples.filter(e => e.highlight);
    assert.ok(hits.length > 0, `${id} (${ins.title}) tidak tersorot di contoh: ${ins.examples.map(e => e.japanese).join(' / ')}`);
    for (const e of hits) assert.ok(e.highlight![1] > e.highlight![0]);
  }
});

test('てはいけない: komponen, sorotan bentuk sopan, keluarga いけない', () => {
  const ins = build('bp_n5_055');
  assert.deepEqual(ins.parts.map(p => p.text), ['て', 'は', 'いけない']);
  const ex = ins.examples[0];
  assert.equal(ex.japanese.slice(...ex.highlight!), 'てはいけません');

  const fam = Object.fromEntries(ins.family.map(g => [g.key, g.members.map(m => m.id)]));
  for (const id of ['bp_n5_074', 'bp_n5_071', 'bp_n5_045']) assert.ok(fam['いけない'].includes(id), `keluarga いけない: ${id}`);
  assert.ok(!Object.values(fam).flat().includes('bp_n5_055'), 'pola asal tidak masuk keluarganya sendiri');
  assert.equal(ins.family.find(g => g.key === 'は')?.members[0].standalone, true, 'pola 「は」 sendiri tampil pertama');
});

test('なくちゃ: komponen yang dihilangkan ikut keluarga tetapi tidak ditanyakan', () => {
  const ins = build('bp_n5_073');
  assert.equal(ins.parts.at(-1)?.omitted, true);
  assert.ok(ins.family.some(g => g.key === 'いけない'));
  assert.deepEqual(quizzablePartIndexes(ins), [0, 1]);
});

test('cek cepat: deterministik, satu jawaban benar, pengecoh dari komponen lain', () => {
  for (const id of Object.keys(BUNPOU_PATTERN_INSIGHTS)) {
    const ins = build(id);
    for (const i of quizzablePartIndexes(ins)) {
      const q = buildPartQuiz(id, i);
      assert.ok(q, `${id}#${i}`);
      assert.equal(q!.options.length, 4);
      assert.equal(new Set(q!.options).size, 4, 'tanpa opsi ganda');
      assert.equal(q!.options[q!.correctIndex], ins.parts[i].meaning);
      assert.deepEqual(buildPartQuiz(id, i), q, 'hasil sama setiap kali');
    }
  }
});

test('pola tanpa kurasi tidak mendapat Bedah Pola', () => {
  assert.equal(hasPatternInsight('bp_n5_096'), false);
  assert.equal(buildPatternInsight(BUNPOU_DATABASE['bp_n5_096'], BUNPOU_DATABASE), null);
});

test('titleForms memecah judul bervarian', () => {
  assert.deepEqual(titleForms('〜てもいい'), ['てもいい']);
  assert.deepEqual(titleForms('ちゃいけない・じゃいけない'), ['ちゃいけない', 'じゃいけない']);
  assert.deepEqual(titleForms('書かれている（受身形 / passive form）'), ['書かれている']);
});
