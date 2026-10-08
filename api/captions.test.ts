import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJson3 } from './captions';

// Bentuk nyata caption otomatis YouTube (json3): segmen kata dengan tOffsetMs, dDurationMs tumpang tindih.
const asr = {
  events: [
    { tStartMs: 0, dDurationMs: 100, segs: [{ utf8: '\n' }] }, // penanda jendela: dibuang
    {
      tStartMs: 640,
      dDurationMs: 8760,
      segs: [{ utf8: '無敵' }, { utf8: 'の', tOffsetMs: 600 }, { utf8: '笑顔', tOffsetMs: 760 }, { utf8: '秘密', tOffsetMs: 3840 }],
    },
    { tStartMs: 5000, dDurationMs: 4000, segs: [{ utf8: '見せて' }] },
  ],
};

test('parseJson3: caption otomatis -> kata berwaktu dan akhir baris dari kata terakhir', () => {
  const [a, b] = parseJson3(asr);
  assert.equal(a.text, '無敵の笑顔秘密');
  assert.deepEqual(a.words?.map(w => [w.text, w.startMs]), [['無敵', 640], ['の', 1240], ['笑顔', 1400], ['秘密', 4480]]);
  // tiap kata berakhir saat kata berikutnya mulai
  assert.equal(a.words?.[0].endMs, 1240);
  // kata terakhir: perkiraan 2 huruf x 220ms, bukan sampai dDurationMs (8760) yang menimpa baris berikut
  assert.equal(a.endMs, 4480 + 440);
  assert.ok(a.endMs < b.startMs);
  assert.equal(b.words, undefined); // satu segmen tanpa offset: tidak ada waktu kata
  assert.equal(b.endMs, 9000);
});

test('parseJson3: caption manual tetap per baris, baris baru jadi spasi', () => {
  const [l] = parseJson3({ events: [{ tStartMs: 27040, dDurationMs: 4000, segs: [{ utf8: '君に全部\n捧げても構わない' }] }] });
  assert.equal(l.text, '君に全部 捧げても構わない');
  assert.equal(l.endMs, 31040);
  assert.equal(l.words, undefined);
});

test('parseJson3: masukan rusak aman', () => {
  assert.deepEqual(parseJson3(null), []);
  assert.deepEqual(parseJson3({}), []);
});
