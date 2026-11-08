import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdrAmount, handlePaymentNotify, isIncomingPayment } from './_paymentNotify';

test('parseIdrAmount: berbagai format notifikasi', () => {
  assert.equal(parseIdrAmount('Kamu menerima pembayaran QRIS Rp16.983 dari GoPay'), 16983);
  assert.equal(parseIdrAmount('Pembayaran Rp 24.999,00 berhasil'), 24999);
  assert.equal(parseIdrAmount('IDR 1,250,000 masuk'), 1250000);
  assert.equal(parseIdrAmount('Rp5000'), 5000);
  assert.equal(parseIdrAmount('Rp. 17.000'), 17000);
  assert.equal(parseIdrAmount('tidak ada nominal'), null);
  assert.equal(parseIdrAmount(''), null);
});

function fakeFetch(status: number, body: unknown, seen?: { body?: string }) {
  return (async (_url: string, init?: RequestInit) => {
    if (seen) seen.body = String(init?.body);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
}

test('handlePaymentNotify: tanpa kunci → 401, nominal diteruskan ke RPC', async () => {
  assert.equal((await handlePaymentNotify(null, { text: 'Rp1.000' }, {}, fakeFetch(200, {}))).status, 401);
  const seen: { body?: string } = {};
  const r = await handlePaymentNotify('k', { title: 'GoPay Merchant', text: 'Pembayaran Rp16.983 diterima' }, {}, fakeFetch(200, { result: 'approved', order_code: 'SQ-1' }, seen));
  assert.equal(r.status, 200);
  assert.equal(r.body.result, 'approved');
  const sent = JSON.parse(seen.body!);
  assert.equal(sent.p_amount, 16983);
  assert.equal(sent.p_key, 'k');
});

test('handlePaymentNotify: kunci salah → 401, field amount eksplisit dipakai', async () => {
  const bad = await handlePaymentNotify('x', { amount: 5000 }, {}, fakeFetch(400, { message: 'invalid_key' }));
  assert.equal(bad.status, 401);
  const seen: { body?: string } = {};
  await handlePaymentNotify('k', { amount: 4999, text: 'Pembayaran diterima Rp1' }, {}, fakeFetch(200, { result: 'unmatched' }, seen));
  assert.equal(JSON.parse(seen.body!).p_amount, 4999);
});

test('notifikasi asli GoPay: uang masuk terbaca, pembayaran keluar diabaikan', async () => {
  const title = 'Pembayaran QRIS statis diterima';
  const text = 'Rp 4.000 di Sevnsoul Store, Digital &amp; Kreatif.';
  assert.equal(isIncomingPayment(`${title} ${text}`), true);
  assert.equal(parseIdrAmount(`${title} ${text}`), 4000);
  const seen: { body?: string } = {};
  await handlePaymentNotify('k', { title, text }, {}, fakeFetch(200, { result: 'unmatched' }, seen));
  assert.equal(JSON.parse(seen.body!).p_amount, 4000);

  assert.equal(isIncomingPayment('Pembayaran berhasil Rp 16.983 ke Indomaret'), false);
  const out: { body?: string } = {};
  await handlePaymentNotify('k', { title: 'Pembayaran berhasil', text: 'Kamu membayar Rp 16.983 ke Toko X' }, {}, fakeFetch(200, { result: 'no_amount' }, out));
  assert.equal(JSON.parse(out.body!).p_amount, null);
});

test('notifikasi asli tanpa judul (Magic Text judul tidak terisi) tetap terbaca', async () => {
  const raw = '[notification_title] Rp 4.999 di Sevnsoul Store, Digital &amp; Kreatif.';
  assert.equal(isIncomingPayment(raw), true);
  const seen: { body?: string } = {};
  await handlePaymentNotify('k', { title: '[notification_title]', text: 'Rp 4.999 di Sevnsoul Store, Digital &amp; Kreatif.' }, {}, fakeFetch(200, { result: 'approved' }, seen));
  const sent = JSON.parse(seen.body!);
  assert.equal(sent.p_amount, 4999);
  assert.equal(sent.p_raw, 'Rp 4.999 di Sevnsoul Store, Digital & Kreatif.');
  // Pembayaran keluar ke merchant lain tetap diabaikan.
  assert.equal(isIncomingPayment('Rp 16.983 di Indomaret'), false);
});
