import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc } from './lrc';
import { hasJapanese, toSungLines } from './lyricLines';

test('hasJapanese: kana, kanji, dan katakana setengah lebar terdeteksi; huruf latin tidak', () => {
  assert.equal(hasJapanese('アイドル'), true);
  assert.equal(hasJapanese('ひらがな'), true);
  assert.equal(hasJapanese('夜'), true);
  assert.equal(hasJapanese('ｱｲﾄﾞﾙ'), true);
  assert.equal(hasJapanese('Idol (Hey!)'), false);
  assert.equal(hasJapanese(''), false);
});

test('toSungLines: pada waktu yang sama, baris Jepang dipilih dan romaji dibuang', () => {
  const lines = toSungLines(parseLrc('[00:01.00]Muteki no egao\n[00:01.00]無敵の笑顔\n[00:04.00]歌う'));
  assert.deepEqual(lines, [
    { startMs: 1000, endMs: 4000, text: '無敵の笑顔' },
    { startMs: 4000, endMs: 9000, text: '歌う' },
  ]);
});

test('toSungLines: baris kosong dibuang tetapi akhir baris sebelumnya mengikuti baris berikutnya yang berisi', () => {
  const lines = toSungLines(parseLrc('[00:01.00]一行目\n[00:03.00]\n[00:05.00]二行目'), 60000);
  assert.deepEqual(lines, [
    { startMs: 1000, endMs: 5000, text: '一行目' },
    { startMs: 5000, endMs: 60000, text: '二行目' },
  ]);
});

test('toSungLines: lirik tanpa Jepang tetap memakai baris pertama dari tiap waktu', () => {
  const lines = toSungLines(parseLrc('[00:01.00]first\n[00:01.00]second\n[00:02.00]third'));
  assert.deepEqual(lines.map(l => l.text), ['first', 'third']);
});

test('toSungLines: masukan kosong menghasilkan daftar kosong', () => {
  assert.deepEqual(toSungLines([]), []);
  assert.deepEqual(toSungLines(parseLrc('[00:01.00]   ')), []);
});
