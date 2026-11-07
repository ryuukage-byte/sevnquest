import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscriptPaste } from './transcriptPaste.ts';

test('parseTranscriptPaste: stempel di baris sendiri dan sebaris', () => {
  const lines = parseTranscriptPaste(['Bab 1', '0:03', 'どれくらい、', '理解できるか', '0:07 チャレンジです。', '', '1:00:02 最後'].join('\n'));
  assert.deepEqual(lines.map(l => [l.startMs, l.endMs, l.text]), [
    [3000, 7000, 'どれくらい、 理解できるか'],
    [7000, 3602000, 'チャレンジです。'],
    [3602000, 3602000 + 1500, '最後'],
  ]);
});

test('parseTranscriptPaste: stempel tanpa teks dibuang, urutan dirapikan', () => {
  const lines = parseTranscriptPaste('0:10 B\n0:05\n0:02 A');
  assert.deepEqual(lines.map(l => [l.startMs, l.endMs, l.text]), [[2000, 10000, 'A'], [10000, 11500, 'B']]);
});

test('parseTranscriptPaste: teks kosong -> tanpa baris', () => {
  assert.deepEqual(parseTranscriptPaste('tidak ada stempel waktu'), []);
});
