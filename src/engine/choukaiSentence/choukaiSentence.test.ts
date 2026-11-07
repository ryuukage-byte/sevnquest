import test from 'node:test';
import assert from 'node:assert/strict';
import { BLANK, buildSentenceCloze, choukaiSentenceId, clozeCandidates, isChoukaiSentenceId, parseChoukaiSentenceId } from './choukaiSentence.ts';

test('id kalimat: bolak-balik dan menolak bentuk lain', () => {
  const id = choukaiSentenceId('JYEutL_zQQc', 3000.4);
  assert.equal(id, 'cs:JYEutL_zQQc:3000');
  assert.deepEqual(parseChoukaiSentenceId(id), { videoId: 'JYEutL_zQQc', startMs: 3000 });
  assert.equal(isChoukaiSentenceId('kotoba_123'), false);
  assert.equal(isChoukaiSentenceId('cs:pendek:10'), false);
  assert.equal(isChoukaiSentenceId('cs:JYEutL_zQQc:-5'), false);
});

const text = '昨日、図書館で本を読みました。';
const words = [
  { surface: '昨日', item: { id: 'k1', word: '昨日', jlpt: 'N5' } },
  { surface: '図書館', item: { id: 'k2', word: '図書館', jlpt: 'N5' } },
  { surface: '読み', item: { id: 'k3', word: '読む', jlpt: 'N5' } },
  { surface: 'で', item: { id: 'k4', word: 'で', jlpt: 'N5' } },
];
const pool = [
  { id: 'p1', word: '映画館', jlpt: 'N5' },
  { id: 'p2', word: '美術館', jlpt: 'N4' },
  { id: 'p3', word: '体育館', jlpt: 'N4' },
  { id: 'p4', word: '大使館', jlpt: 'N3' },
  { id: 'p5', word: 'りんご', jlpt: 'N5' },
  { id: 'p6', word: '図書館', jlpt: 'N5' },
];

test('clozeCandidates: buang kana 1 huruf', () => {
  assert.deepEqual(clozeCandidates(text, words).map(w => w.item.id), ['k1', 'k2', 'k3']);
});

test('buildSentenceCloze: soal valid dan bisa diulang', () => {
  const q = buildSentenceCloze(text, words, pool, 0)!;
  assert.ok(q);
  assert.equal(q.target.surface, '図書館'); // berkanji & terpanjang lebih dulu
  assert.equal(q.masked, `昨日、${BLANK}で本を読みました。`);
  assert.equal(q.options.length, 4);
  assert.equal(q.options[q.correctIndex], '図書館');
  assert.equal(new Set(q.options).size, 4);
  assert.ok(!q.options.includes('りんご'), 'pengecoh mengikuti jenis tulisan target');
  assert.deepEqual(buildSentenceCloze(text, words, pool, 0), q);
  assert.notEqual(buildSentenceCloze(text, words, pool, 1)!.target.surface, '図書館');
});

test('buildSentenceCloze: null bila tidak ada target atau pengecoh kurang', () => {
  assert.equal(buildSentenceCloze('はい。', [], pool, 0), null);
  assert.equal(buildSentenceCloze(text, words, pool.slice(0, 2), 0), null);
});
