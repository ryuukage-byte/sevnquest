import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateWordTimings, wordsForLine, activeWordIndex } from './wordTiming';

test('estimateWordTimings: potongan menyambung dan menutup seluruh rentang', () => {
  const text = '完璧で嘘つきな君は天才的なアイドル';
  const w = estimateWordTimings(text, 1000, 5000);
  assert.equal(w.map(x => x.text).join(''), text);
  assert.equal(w[0].startMs, 1000);
  assert.equal(w[w.length - 1].endMs, 5000);
  for (let i = 1; i < w.length; i++) assert.equal(w[i].startMs, w[i - 1].endMs);
  assert.ok(w.length > 3);
});

test('estimateWordTimings: tanda baca menempel ke kata dan tidak hilang', () => {
  const text = '「誰かを好きになる」、そう。';
  const w = estimateWordTimings(text, 0, 3000);
  assert.equal(w.map(x => x.text).join(''), text);
  assert.ok(w.every(x => x.endMs > x.startMs));
});

test('estimateWordTimings: durasi nol tetap menghasilkan rentang positif; teks kosong aman', () => {
  const w = estimateWordTimings('ありがとう', 2000, 2000);
  assert.ok(w[w.length - 1].endMs > 2000);
  assert.deepEqual(estimateWordTimings('', 0, 1000), []);
  assert.deepEqual(estimateWordTimings('、。', 0, 1000).map(x => x.text), ['、。']);
});

test('wordsForLine: pakai waktu sumber bila ada, kalau tidak diperkirakan', () => {
  const given = [{ text: 'こんにちは', startMs: 100, endMs: 900 }];
  assert.deepEqual(wordsForLine({ text: 'こんにちは', startMs: 100, endMs: 900, words: given }), { words: given, estimated: false });
  const est = wordsForLine({ text: 'こんにちは', startMs: 100, endMs: 900 });
  assert.equal(est.estimated, true);
  assert.equal(est.words.length > 0, true);
});

test('activeWordIndex: sebelum, selama, dan sesudah baris', () => {
  const w = [
    { text: 'a', startMs: 1000, endMs: 1500 },
    { text: 'b', startMs: 1500, endMs: 2500 },
  ];
  assert.equal(activeWordIndex(w, 500), -1);
  assert.equal(activeWordIndex(w, 1000), 0);
  assert.equal(activeWordIndex(w, 1499), 0);
  assert.equal(activeWordIndex(w, 1500), 1);
  assert.equal(activeWordIndex(w, 2499), 1);
  assert.equal(activeWordIndex(w, 2500), 2); // kata terakhir selesai
  assert.equal(activeWordIndex([], 100), -1);
});
