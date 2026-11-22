import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkProofText, extractAmounts } from './proofCheck';

// Teks OCR asli dari screenshot GoPay (tesseract.js, eng).
const GOPAY = `Ah
SS
Rp8.001
Berhasil bayar ke Sevnsoul Store, Digital & Kreatif
JAKARTA TIMUR, 13250

© Hore, kamu dapet 8 GoPay Coins!
Detail pembayaran
Status Sukses`;

test('bukti GoPay asli: nominal, toko, dan status cocok -> verified', () => {
  const r = checkProofText(GOPAY, 8001);
  assert.deepEqual([r.amountOk, r.merchantOk, r.successOk, r.verdict], [true, true, true, 'verified']);
});

test('nominal berbeda (mis. bayar 8.000 tanpa kode unik) -> tidak verified', () => {
  const r = checkProofText(GOPAY.replace('Rp8.001', 'Rp8.000'), 8001);
  assert.equal(r.amountOk, false);
  assert.equal(r.verdict, 'partial');
  assert.ok(r.amounts.includes(8000));
});

test('bayar ke toko lain -> tidak verified', () => {
  const r = checkProofText(GOPAY.replace('Sevnsoul Store', 'Toko Lain'), 8001);
  assert.equal(r.merchantOk, false);
  assert.notEqual(r.verdict, 'verified');
});

test('angka kecil seperti "8 GoPay Coins" atau kode pos tidak dianggap nominal pesanan', () => {
  assert.equal(checkProofText('Hore, kamu dapet 8 coins. Sevnsoul Sukses Rp17.000', 17001).amountOk, false);
  assert.ok(!extractAmounts(GOPAY).includes(8));
});

test('format nominal lain: Rp 17.001,00 / IDR 17,001 / 102001 / salah baca OCR 0->o', () => {
  assert.ok(extractAmounts('Total Rp 17.001,00').includes(17001));
  assert.ok(extractAmounts('IDR 17,001').includes(17001));
  assert.ok(extractAmounts('Nominal Rp102001').includes(102001));
  assert.ok(!extractAmounts('JAKARTA TIMUR, 13250').includes(13250), 'kode pos bukan nominal');
  assert.equal(checkProofText('Pembayaran berhasil ke SEVNS0UL STORE Rp25.003', 25003).verdict, 'verified');
});
