import test from 'node:test';
import assert from 'node:assert/strict';
import { recordKanjiWriting } from './kanjiWritingRecord';

const item = { id: 'kj_n5_4e00', character: '一' };

test('recordKanjiWriting: satu jalur handleStudyComplete dengan interaksi writing', () => {
  const calls: any[][] = [];
  let rewarded = 0;
  recordKanjiWriting(item, 100, { expGained: 28, goldGained: 7 } as any, {
    onCompleteStudyItem: (...a: any[]) => calls.push(a),
    onRewardPlayer: () => { rewarded++; },
  });
  assert.deepEqual(calls, [['kanji', 28, 7, 'kj_n5_4e00', 1, 1, 'writing']]);
  assert.equal(rewarded, 0, 'tidak boleh memberi reward dua kali');
});

test('recordKanjiWriting: skor < 60 dicatat sebagai gagal; tanpa reward memakai default', () => {
  const calls: any[][] = [];
  recordKanjiWriting({ character: '二' }, 40, undefined, { onCompleteStudyItem: (...a: any[]) => calls.push(a) });
  assert.deepEqual(calls, [['kanji', 15, 5, '二', 0, 1, 'writing']]);
});

test('recordKanjiWriting: tanpa onCompleteStudyItem jatuh ke onRewardPlayer; item kosong diabaikan', () => {
  let got: number[] = [];
  recordKanjiWriting(item, 100, { expGained: 10, goldGained: 2 } as any, { onRewardPlayer: (e, g) => { got = [e, g]; } });
  assert.deepEqual(got, [10, 2]);
  recordKanjiWriting(null, 100, undefined, { onRewardPlayer: () => assert.fail('tidak boleh dipanggil') });
});
