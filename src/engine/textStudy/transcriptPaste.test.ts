import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscriptPaste, parseSubtitleFile, looksLikeSubtitleFile } from './transcriptPaste.ts';

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

test('parseSubtitleFile: SRT (Whisper) dan WebVTT', () => {
  const srt = '1\n00:00:00,000 --> 00:00:02,500\nこんにちは。\n\n2\n00:00:02,500 --> 00:00:06,120\nどれくらい、\n理解できるか\n';
  assert.equal(looksLikeSubtitleFile(srt), true);
  assert.deepEqual(parseSubtitleFile(srt).map(l => [l.startMs, l.endMs, l.text]), [
    [0, 2500, 'こんにちは。'],
    [2500, 6120, 'どれくらい、 理解できるか'],
  ]);
  const vtt = 'WEBVTT\n\n00:01.000 --> 00:03.5\n<c>チャレンジ</c>です。\n';
  assert.deepEqual(parseSubtitleFile(vtt).map(l => [l.startMs, l.endMs, l.text]), [[1000, 3500, 'チャレンジです。']]);
  assert.equal(looksLikeSubtitleFile('0:03 こんにちは'), false);
});
