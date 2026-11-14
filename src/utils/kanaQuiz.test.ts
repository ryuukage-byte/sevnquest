import test from 'node:test';
import assert from 'node:assert/strict';
import { KANJI_DATABASE } from '../data/kanji';
import { isKanaItem, kanaRomaji, kanaScript } from './kanaQuiz';
import { isValidChoiceSet, pickUniqueDistractors } from './quizOptions';

const kana = Object.values(KANJI_DATABASE).filter(isKanaItem);

test('setiap huruf kana punya soal', () => {
  assert.ok(kana.length > 100);
  for (const k of kana) assert.ok((k.questions || []).length > 0, `${k.character} tanpa soal`);
});

test('soal kana: opsi unik, kunci jawaban sesuai bunyi/aksara, tanpa teks arti acak', () => {
  for (const k of kana) {
    const romaji = kanaRomaji(k);
    for (const q of k.questions || []) {
      assert.ok(isValidChoiceSet(q.options, q.correctIndex), `${q.id}: opsi kembar / indeks salah ${JSON.stringify(q.options)}`);
      const answer = q.options[q.correctIndex];
      if (/membaca huruf/.test(q.prompt)) {
        assert.equal(answer, romaji, `${q.id}: kunci jawaban salah`);
        // Tidak boleh ada opsi lain yang juga merupakan bunyi sah huruf ini.
        assert.equal(q.options.filter(o => o === romaji).length, 1);
      }
      if (/manakah yang dibaca/.test(q.prompt)) {
        assert.equal(answer, k.character, `${q.id}: kunci jawaban salah`);
        for (const o of q.options) {
          if (o === k.character) continue;
          const other = kana.find(x => x.character === o);
          assert.ok(other, `${q.id}: opsi ${o} bukan kana`);
          assert.equal(kanaScript(other!), kanaScript(k), `${q.id}: aksara campur`);
          assert.notEqual(kanaRomaji(other!), romaji, `${q.id}: ${o} sebunyi dengan jawaban`);
        }
      }
    }
  }
});

test('pickUniqueDistractors membuang duplikat dan jawaban', () => {
  assert.deepEqual(pickUniqueDistractors('u', ['u', 'a', 'A ', 'i', 'i', 'e', 'o'], 3), ['a', 'i', 'e']);
  assert.deepEqual(pickUniqueDistractors('x', [null, undefined, '', 'y'], 3), ['y']);
});
