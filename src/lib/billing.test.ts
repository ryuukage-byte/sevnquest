import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingErrorMessage, buildNotifierSetupLink } from './billing';

test('billingErrorMessage: halaman error HTML tidak ditampilkan mentah', () => {
  const html = '<!DOCTYPE html><html><head><title>iokhdhqnpslpwsxspvaj.supabase.co | 520: Web server is returning an unknown error</title></head><body>…</body></html>';
  assert.match(billingErrorMessage({ message: html }), /Server sedang bermasalah/);
  assert.match(billingErrorMessage({ message: 'x'.repeat(400) }), /Server sedang bermasalah/);
});

test('billingErrorMessage: kode RPC diterjemahkan', () => {
  assert.match(billingErrorMessage({ message: 'too_many_pending' }), /3 pesanan/);
  assert.match(billingErrorMessage({ message: 'invalid_amount' }), /minimal Rp 5\.000/);
  assert.match(billingErrorMessage(new Error('Failed to fetch')), /koneksi/);
});

test('buildNotifierSetupLink: deep link SevnQuest Notifier dengan url dan kunci ter-encode', () => {
  assert.equal(
    buildNotifierSetupLink('https://sevnquest.pages.dev/api/payment-notify', 'abc123'),
    'sevnquest-notifier://setup?url=https%3A%2F%2Fsevnquest.pages.dev%2Fapi%2Fpayment-notify&key=abc123'
  );
  // Karakter khusus di kunci tidak boleh merusak query; hasilnya bisa dibaca balik persis.
  const key = 'a+b/c=d&e f#g%';
  const link = buildNotifierSetupLink(' http://localhost:3000/api/payment-notify ', ` ${key} `);
  assert.ok(link.startsWith('sevnquest-notifier://setup?url=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fpayment-notify&key='));
  assert.ok(!/[ +#]/.test(link.slice('sevnquest-notifier://setup?'.length)));
  const q = new URL(link).searchParams;
  assert.equal(q.get('url'), 'http://localhost:3000/api/payment-notify');
  assert.equal(q.get('key'), key);
});
