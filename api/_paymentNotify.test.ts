import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdrAmount, handlePaymentNotify, isIncomingPayment, sanitizePackage, sanitizePostedAt, sourceMarker } from './_paymentNotify';

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

test('isIncomingPayment: app GoPay biasa, uang masuk diterima dan notifikasi keluar ditolak', () => {
  // Uang masuk.
  assert.equal(isIncomingPayment('Kamu menerima Rp10.000 dari Budi'), true);
  assert.equal(isIncomingPayment('Uang masuk Rp10.000 dari BUDI SANTOSO'), true);
  assert.equal(isIncomingPayment('Pembayaran QRIS statis diterima Rp 4.000 di Sevnsoul Store, Digital & Kreatif.'), true);
  // Keluar / bukan donasi: harus ditolak walau memuat kata "diterima" atau nama merchant.
  for (const out of [
    'Kamu membayar Rp10.000 ke Toko X',
    'Kamu berhasil mengirim Rp10.000 ke Budi',
    'Kamu transfer Rp10.000 ke Budi',
    'Transfer berhasil Rp10.000 ke BCA 1234',
    'Rp10.000 berhasil dikirim ke Budi',
    'Uang Rp10.000 sudah diterima oleh Budi',
    'Rp10.000 ke Budi sudah diterima',
    'Pembayaranmu ke Sevnsoul Store diterima',
    'Pembayaran ke Sevnsoul Store Rp 4.000 berhasil',
    'Top up Rp50.000 diterima',
    'Refund Rp10.000 diterima',
    'Cashback Rp1.000 diterima',
    'Tarik tunai Rp100.000 diterima',
    'Promo hari ini, diskon Rp10.000',
  ]) {
    assert.equal(isIncomingPayment(out), false, out);
  }
});

test('sanitizePackage / sanitizePostedAt / sourceMarker', () => {
  assert.equal(sanitizePackage('com.gojek.gopay'), 'com.gojek.gopay');
  assert.equal(sanitizePackage(' com.gojek.app '), 'com.gojek.app');
  assert.equal(sanitizePackage('gopay'), null);
  assert.equal(sanitizePackage('com.gojek.gopay diterima Rp99.999'), null);
  assert.equal(sanitizePackage('com.' + 'a'.repeat(80)), null);
  assert.equal(sanitizePackage(123), null);
  assert.equal(sanitizePackage(undefined), null);

  assert.equal(sanitizePostedAt(1_800_000_000_000), 1_800_000_000_000);
  assert.equal(sanitizePostedAt('1800000000000'), 1_800_000_000_000);
  assert.equal(sanitizePostedAt(1_800_000_000), null); // detik, bukan ms
  assert.equal(sanitizePostedAt('abc'), null);
  assert.equal(sanitizePostedAt(null), null);
  assert.equal(sanitizePostedAt(''), null);

  const now = 1_800_000_000_000;
  assert.equal(sourceMarker(null, null, now), '');
  assert.equal(sourceMarker('com.gojek.gopay', now - 5_000, now), '[com.gojek.gopay]');
  assert.equal(sourceMarker('com.gojek.gopay', now - 14 * 60_000, now), '[com.gojek.gopay, tertunda 14 mnt]');
  assert.equal(sourceMarker('com.gojek.gopay', now - 5 * 3_600_000, now), '[com.gojek.gopay, tertunda 5 jam]');
  assert.equal(sourceMarker(null, now - 14 * 60_000, now), '[tertunda 14 mnt]');
  assert.equal(sourceMarker('com.gojek.gopay', now + 60 * 60_000, now), '[com.gojek.gopay]'); // jam HP maju
});

test('handlePaymentNotify: package dan posted_at hanya menjadi penanda di p_raw', async () => {
  const now = 1_800_000_000_000;
  const title = 'Pembayaran QRIS statis diterima';
  const text = 'Rp 4.000 di Sevnsoul Store, Digital &amp; Kreatif.';

  // Pengirim lama (tanpa field baru): p_raw persis seperti sebelumnya.
  const legacy: { body?: string } = {};
  await handlePaymentNotify('k', { title, text }, {}, fakeFetch(200, { result: 'unmatched' }, legacy), now);
  assert.equal(JSON.parse(legacy.body!).p_raw, 'Pembayaran QRIS statis diterima Rp 4.000 di Sevnsoul Store, Digital & Kreatif.');

  // SevnQuest Notifier: nominal sama, penanda di depan.
  const seen: { body?: string } = {};
  const r = await handlePaymentNotify('k', { title, text, package: 'com.gojek.gopay', posted_at: now - 1000 }, {}, fakeFetch(200, { result: 'approved', order_code: 'SQ-1' }, seen), now);
  assert.deepEqual(r, { status: 200, body: { amount: 4000, result: 'approved', order_code: 'SQ-1' } });
  const sent = JSON.parse(seen.body!);
  assert.equal(sent.p_amount, 4000);
  assert.equal(sent.p_raw, '[com.gojek.gopay] Pembayaran QRIS statis diterima Rp 4.000 di Sevnsoul Store, Digital & Kreatif.');
  assert.deepEqual(Object.keys(sent).sort(), ['p_amount', 'p_key', 'p_raw']);

  // package tidak sah dibuang: tidak bisa menyelundupkan kata kunci atau nominal.
  const evil: { body?: string } = {};
  await handlePaymentNotify('k', { title: 'Pembayaran berhasil', text: 'Kamu membayar Rp 16.983 ke Toko X', package: 'uang masuk diterima Rp99.999', posted_at: 'x' }, {}, fakeFetch(200, { result: 'no_amount' }, evil), now);
  assert.equal(JSON.parse(evil.body!).p_amount, null);
  assert.equal(JSON.parse(evil.body!).p_raw, 'Pembayaran berhasil Kamu membayar Rp 16.983 ke Toko X');

  // Notifikasi tanpa nominal dari app sah: nominal tidak diambil dari penanda.
  const none: { body?: string } = {};
  await handlePaymentNotify('k', { title: 'Uang masuk', text: 'Cek saldomu', package: 'com.gojek.gopay', posted_at: now - 14 * 60_000 }, {}, fakeFetch(200, { result: 'no_amount' }, none), now);
  assert.equal(JSON.parse(none.body!).p_amount, null);
  assert.equal(JSON.parse(none.body!).p_raw, '[com.gojek.gopay, tertunda 14 mnt] Uang masuk Cek saldomu');

  // Tetap dipotong 500 karakter, penanda tidak hilang.
  const long: { body?: string } = {};
  await handlePaymentNotify('k', { title, text: 'Rp 4.000 ' + 'x'.repeat(900), package: 'com.gojek.gopay' }, {}, fakeFetch(200, { result: 'unmatched' }, long), now);
  const longRaw = JSON.parse(long.body!).p_raw as string;
  assert.equal(longRaw.length, 500);
  assert.ok(longRaw.startsWith('[com.gojek.gopay] '));
});
