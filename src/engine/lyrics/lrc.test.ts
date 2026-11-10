import test from 'node:test';
import assert from 'node:assert/strict';
import { isSynced, parseLrc, withEndTimes } from './lrc';

test('parseLrc: baris berwaktu terurut, metadata dan baris tanpa waktu dibuang', () => {
  const lrc = ['[ar:YOASOBI]', '[ti:アイドル]', '[00:12.50]アイドル', 'tanpa waktu', '[00:05.5]最初の行', ''].join('\n');
  assert.deepEqual(parseLrc(lrc), [
    { startMs: 5500, text: '最初の行' },
    { startMs: 12500, text: 'アイドル' },
  ]);
});

test('parseLrc: satu baris dengan beberapa penanda waktu (refrain) menjadi beberapa baris', () => {
  const lines = parseLrc('[00:10.00][01:30.00]やさしく\n[00:20.00]歌う');
  assert.deepEqual(lines, [
    { startMs: 10000, text: 'やさしく' },
    { startMs: 20000, text: '歌う' },
    { startMs: 90000, text: 'やさしく' },
  ]);
});

test('parseLrc: [offset] menggeser semua waktu; positif = lebih awal, tidak negatif', () => {
  const early = parseLrc('[offset:500]\n[00:03.00]a\n[00:00.20]b');
  assert.deepEqual(early, [
    { startMs: 0, text: 'b' },
    { startMs: 2500, text: 'a' },
  ]);
  const late = parseLrc('[offset:-1000]\n[00:01.00]c');
  assert.deepEqual(late, [{ startMs: 2000, text: 'c' }]);
});

test('parseLrc: pecahan satu, dua, dan tiga digit; pemisah ":" juga diterima', () => {
  assert.deepEqual(
    parseLrc('[00:01.5]a\n[00:01.05]b\n[00:01.123]c\n[00:02:00]d').map(l => l.startMs),
    [1050, 1123, 1500, 2000]
  );
});

test('parseLrc: CRLF dan masukan kosong aman', () => {
  assert.deepEqual(parseLrc('[00:01.00]a\r\n[00:02.00]b\r\n'), [
    { startMs: 1000, text: 'a' },
    { startMs: 2000, text: 'b' },
  ]);
  assert.deepEqual(parseLrc(''), []);
});

test('isSynced: butuh dua waktu berbeda; satu waktu atau semua kosong = tidak berwaktu', () => {
  assert.equal(isSynced(parseLrc('[00:00.00]probe')), false);
  assert.equal(isSynced(parseLrc('[00:01.00]a\n[00:01.00]b')), false);
  assert.equal(isSynced(parseLrc('[00:01.00]\n[00:02.00]  ')), false);
  assert.equal(isSynced(parseLrc('[00:01.00]a\n[00:02.00]b')), true);
});

test('withEndTimes: akhir baris = mulai baris berikutnya; baris terakhir pakai durasi lagu', () => {
  const lines = parseLrc('[00:01.00]a\n[00:04.00]b');
  assert.deepEqual(withEndTimes(lines, 200000), [
    { startMs: 1000, endMs: 4000, text: 'a' },
    { startMs: 4000, endMs: 200000, text: 'b' },
  ]);
  assert.equal(withEndTimes(lines)[1].endMs, 9000);
  // durasi yang lebih kecil dari mulai baris tidak membuat akhir mundur
  assert.equal(withEndTimes(lines, 2000)[1].endMs, 4000);
});
