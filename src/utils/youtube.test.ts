import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId, activeLineIndex, formatMs, pauseBoundaryMs, nextPause } from './youtube.ts';

const ID = 'dQw4w9WgXcQ';

test('parseYouTubeId: berbagai bentuk URL', () => {
  assert.equal(parseYouTubeId(`https://www.youtube.com/watch?v=${ID}&t=30s`), ID);
  assert.equal(parseYouTubeId(`https://youtu.be/${ID}?si=abc`), ID);
  assert.equal(parseYouTubeId(`https://music.youtube.com/watch?v=${ID}`), ID);
  assert.equal(parseYouTubeId(`youtube.com/shorts/${ID}`), ID);
  assert.equal(parseYouTubeId(`https://www.youtube.com/live/${ID}`), ID);
  assert.equal(parseYouTubeId(`https://www.youtube.com/embed/${ID}`), ID);
  assert.equal(parseYouTubeId(`  ${ID}  `), ID);
});

test('parseYouTubeId: input tidak valid', () => {
  assert.equal(parseYouTubeId(''), null);
  assert.equal(parseYouTubeId('halo dunia'), null);
  assert.equal(parseYouTubeId('https://example.com/watch?v=' + ID), null);
  assert.equal(parseYouTubeId('https://www.youtube.com/watch?v=pendek'), null);
  assert.equal(parseYouTubeId('https://www.youtube.com/'), null);
});

test('activeLineIndex: baris aktif menurut waktu', () => {
  const lines = [{ startMs: 1000 }, { startMs: 5000 }, { startMs: 9000 }];
  assert.equal(activeLineIndex([], 100), -1);
  assert.equal(activeLineIndex(lines, 0), -1);
  assert.equal(activeLineIndex(lines, 1000), 0);
  assert.equal(activeLineIndex(lines, 4999), 0);
  assert.equal(activeLineIndex(lines, 5000), 1);
  assert.equal(activeLineIndex(lines, 99999), 2);
});

test('formatMs', () => {
  assert.equal(formatMs(0), '0:00');
  assert.equal(formatMs(65_900), '1:05');
  assert.equal(formatMs(-5), '0:00');
});

test('pauseBoundaryMs / nextPauseMs: jeda tiap baris', () => {
  const lines = [
    { startMs: 0, endMs: 3000 },
    { startMs: 3000, endMs: 9000 }, // endMs tumpang tindih dengan baris berikut (caption otomatis)
    { startMs: 5000, endMs: 5100 }, // baris sangat pendek
  ];
  assert.equal(pauseBoundaryMs(lines, 0), 2950); // berhenti 50ms sebelum baris berikut
  assert.equal(pauseBoundaryMs(lines, 1), 4950);
  assert.equal(pauseBoundaryMs(lines, 2), 5300); // minimal 300ms diputar
  assert.deepEqual(nextPause(lines, 1000), { ms: 2950, index: 0 });
  assert.deepEqual(nextPause(lines, 2960), { ms: 4950, index: 1 }); // sudah lewat batas baris 0 -> baris berikut
  assert.equal(pauseBoundaryMs([{ startMs: 0, endMs: 2000 }, { startMs: 5000, endMs: 6000 }], 0), 2150); // celah panjang: berhenti tepat setelah kata terakhir
  assert.equal(nextPause(lines, 6000), null);
  assert.equal(nextPause([], 0), null);
});
