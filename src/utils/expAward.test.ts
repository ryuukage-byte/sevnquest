import test from 'node:test';
import assert from 'node:assert/strict';
import { applyExpGain, formatExp } from './expAward';
import { claimFlipReward, flipExpFor } from './flashcardSession';

test('EXP pecahan dibawa (carry), bukan dibulatkan lalu hilang', () => {
  // Perilaku lama: Math.round(1000 + 0.095) === 1000 -> 0,095 EXP hilang setiap kali.
  assert.equal(Math.round(1000 + 0.095), 1000);

  let s = { totalExp: 1000, expFraction: 0 as number | undefined };
  for (let i = 0; i < 20; i++) s = applyExpGain(s.totalExp, s.expFraction, 0.095);
  // 20 × 0,095 = 1,9 -> +1 EXP penuh, 0,9 dibawa.
  assert.equal(s.totalExp, 1001);
  assert.ok(Math.abs((s.expFraction as number) - 0.9) < 1e-9);
});

test('totalExp selalu bilangan bulat dan expFraction selalu dalam [0,1)', () => {
  let s = { totalExp: 0, expFraction: undefined as number | undefined };
  for (const g of [0.1, 0.2, 0.7, 0.005, 12.34, 0.995, 3]) {
    s = applyExpGain(s.totalExp, s.expFraction, g);
    assert.ok(Number.isInteger(s.totalExp));
    assert.ok((s.expFraction as number) >= 0 && (s.expFraction as number) < 1);
  }
});

test('tanpa drift floating point: 0,1 + 0,2 + 0,7 = tepat 1 EXP', () => {
  let s = applyExpGain(0, undefined, 0.1);
  s = applyExpGain(s.totalExp, s.expFraction, 0.2);
  s = applyExpGain(s.totalExp, s.expFraction, 0.7);
  assert.deepEqual(s, { totalExp: 1, expFraction: 0 });
});

test('total keseluruhan = totalExp + expFraction (nilai tampil == nilai tersimpan)', () => {
  const gains = [0.15, 12, 0.33, 4.5, 0.02];
  let s = { totalExp: 50, expFraction: undefined as number | undefined };
  for (const g of gains) s = applyExpGain(s.totalExp, s.expFraction, g);
  const expected = 50 + gains.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(s.totalExp + (s.expFraction as number) - expected) < 1e-9);
});

test('reward negatif / NaN / Infinity diabaikan: EXP tidak berkurang dan tidak rusak', () => {
  for (const bad of [-5, NaN, Infinity, -Infinity]) {
    assert.deepEqual(applyExpGain(100, 0.5, bad), { totalExp: 100, expFraction: 0.5 });
  }
});

test('save lama: expFraction hilang / rusak diperlakukan 0; totalExp pecahan lama dinormalkan', () => {
  assert.deepEqual(applyExpGain(10, undefined, 1), { totalExp: 11, expFraction: 0 });
  assert.deepEqual(applyExpGain(10, NaN, 1), { totalExp: 11, expFraction: 0 });
  assert.deepEqual(applyExpGain(10.5, undefined, 0.5), { totalExp: 11, expFraction: 0 });
});

test('formatExp: maksimal 2 desimal tanpa nol di belakang', () => {
  assert.equal(formatExp(12), '12');
  assert.equal(formatExp(12.5), '12.5');
  assert.equal(formatExp(0.095), '0.1');
  assert.equal(formatExp(0.1 + 0.2), '0.3');
  assert.equal(formatExp(NaN), '0');
});

test('flip kartu: mikro-EXP = base × 0,005 (min 0,01) dan dibayar sekali per kartu', () => {
  assert.equal(flipExpFor(30), 0.15);
  assert.equal(flipExpFor(1), 0.01);

  const paid = new Set<string>();
  assert.equal(claimFlipReward(paid, 'kotoba:a', true), true, 'flip pertama ke belakang dibayar');
  assert.equal(claimFlipReward(paid, 'kotoba:a', false), false, 'balik ke depan tidak dibayar');
  assert.equal(claimFlipReward(paid, 'kotoba:a', true), false, 'flip ulang kartu yang sama tidak dibayar');
  for (let i = 0; i < 50; i++) assert.equal(claimFlipReward(paid, 'kotoba:a', true), false);
  assert.equal(claimFlipReward(paid, 'kotoba:b', true), true, 'kartu lain tetap dibayar');
});
