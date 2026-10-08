import test from 'node:test';
import assert from 'node:assert/strict';
import { getIsoWeekId } from './weekId';

test('minggu ISO: tanggal acuan dan batas tahun', () => {
  assert.equal(getIsoWeekId(new Date('2026-10-04T05:00:00Z')), '2026-W40'); // Minggu terakhir W40
  assert.equal(getIsoWeekId(new Date('2026-10-05T00:00:00Z')), '2026-W41'); // Senin = minggu baru
  assert.equal(getIsoWeekId(new Date('2026-01-01T12:00:00Z')), '2026-W01');
  assert.equal(getIsoWeekId(new Date('2025-12-29T00:00:00Z')), '2026-W01'); // Desember milik minggu 1 tahun depan
  assert.equal(getIsoWeekId(new Date('2027-01-03T00:00:00Z')), '2026-W53'); // Januari milik minggu 53 tahun lalu
  assert.equal(getIsoWeekId(new Date('2024-12-30T00:00:00Z')), '2025-W01');
  assert.equal(getIsoWeekId(new Date('2021-01-03T23:59:59Z')), '2020-W53');
});

test('berbasis UTC: tidak bergantung zona waktu perangkat', () => {
  // 23:30 UTC hari Minggu = Senin pagi di WIB (+7); server UTC masih minggu lama, klien harus sama.
  assert.equal(getIsoWeekId(new Date('2026-10-04T23:30:00Z')), '2026-W40');
  assert.equal(getIsoWeekId(new Date('2026-10-05T00:00:01Z')), '2026-W41');
});

test('format sama dengan server: IYYY-"W"IW', () => {
  assert.match(getIsoWeekId(), /^\d{4}-W\d{2}$/);
});
