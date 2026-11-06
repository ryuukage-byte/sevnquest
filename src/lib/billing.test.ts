import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingErrorMessage } from './billing';

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
