import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquireScrollLock, scrollLockCount, type ScrollLockTarget } from './scrollLock';

const target = (overflow = '', paddingRight = ''): ScrollLockTarget => ({ style: { overflow, paddingRight } });

test('scrollLock: satu overlay mengunci lalu memulihkan gaya asli', () => {
  const body = target('auto', '4px');
  const release = acquireScrollLock(body, 15);
  assert.equal(body.style.overflow, 'hidden');
  assert.equal(body.style.paddingRight, '15px');
  release();
  assert.equal(body.style.overflow, 'auto');
  assert.equal(body.style.paddingRight, '4px');
  assert.equal(scrollLockCount(body), 0);
});

test('scrollLock: overlay bertumpuk yang ditutup TIDAK berurutan tidak mengunci halaman selamanya', () => {
  // Regresi pola lama "simpan overflow → set hidden → kembalikan": A buka, B buka, A tutup, B tutup
  // dulu meninggalkan body.style.overflow = 'hidden' (halaman tidak bisa digulir lagi).
  const body = target();
  const releaseA = acquireScrollLock(body);
  const releaseB = acquireScrollLock(body);
  releaseA();
  assert.equal(body.style.overflow, 'hidden', 'B masih terbuka, halaman tetap terkunci');
  releaseB();
  assert.equal(body.style.overflow, '', 'semua tertutup, halaman bisa digulir lagi');
});

test('scrollLock: pelepas idempoten (cleanup efek yang terpanggil dua kali aman)', () => {
  const body = target();
  const releaseA = acquireScrollLock(body);
  const releaseB = acquireScrollLock(body);
  releaseA();
  releaseA();
  assert.equal(scrollLockCount(body), 1);
  assert.equal(body.style.overflow, 'hidden');
  releaseB();
  assert.equal(body.style.overflow, '');
});

test('scrollLock: buka-tutup berulang tanpa reload selalu kembali ke keadaan awal', () => {
  const body = target();
  for (let i = 0; i < 25; i++) acquireScrollLock(body)();
  assert.equal(body.style.overflow, '');
  assert.equal(scrollLockCount(body), 0);
});
