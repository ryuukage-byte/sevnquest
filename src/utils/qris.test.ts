import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MERCHANT_STATIC_QRIS, crc16Ccitt, isValidQris, parseTlv, toDynamicQris, qrisAmount } from './qris';

test('CRC QRIS statis merchant cocok dengan yang tercetak (E0E9)', () => {
  assert.equal(crc16Ccitt(MERCHANT_STATIC_QRIS.slice(0, -4)), 'E0E9');
  assert.equal(isValidQris(MERCHANT_STATIC_QRIS), true);
  assert.equal(isValidQris(MERCHANT_STATIC_QRIS.slice(0, -1) + 'A'), false);
});

test('QRIS bernominal: tag 01 = 12, tag 54 berisi nominal, CRC valid, merchant tidak berubah', () => {
  const dyn = toDynamicQris(MERCHANT_STATIC_QRIS, 16983);
  assert.equal(isValidQris(dyn), true);
  const f = parseTlv(dyn);
  assert.equal(f.find(x => x.tag === '01')?.value, '12');
  assert.equal(qrisAmount(dyn), 16983);
  const tags = f.map(x => x.tag);
  assert.deepEqual(tags, [...tags].sort((a, b) => Number(a) - Number(b)));
  const keep = (p: string) => parseTlv(p).filter(x => !['01', '54', '63'].includes(x.tag));
  assert.deepEqual(keep(dyn), keep(MERCHANT_STATIC_QRIS));
  assert.equal(qrisAmount(MERCHANT_STATIC_QRIS), null);
});

test('QRIS bernominal: ganti nominal pada QRIS yang sudah dinamis, tolak nominal aneh', () => {
  const once = toDynamicQris(MERCHANT_STATIC_QRIS, 5000);
  const twice = toDynamicQris(once, 24999);
  assert.equal(qrisAmount(twice), 24999);
  assert.equal(parseTlv(twice).filter(x => x.tag === '54').length, 1);
  assert.throws(() => toDynamicQris(MERCHANT_STATIC_QRIS, 0));
  assert.throws(() => toDynamicQris(MERCHANT_STATIC_QRIS, 12.5));
  assert.throws(() => toDynamicQris('000201', 1000));
});
