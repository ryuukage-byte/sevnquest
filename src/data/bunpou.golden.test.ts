// Penjaga regresi C1: bunpou.ts tidak lagi memuat korpus sentences.json.
// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BUNPOU_DATABASE } from './bunpou';
import rawBunpou from './db/bunpou.json';

// Hash BUNPOU_DATABASE diukur SEBELUM sentences.json dilepas dari bunpou.ts (915 item, 1.704 contoh).
const GOLDEN_SHA256 = 'e65ff12f794658c1d2e13c0a7ee420e677bb154206936cd0a35ecf2f240155ad';

test('BUNPOU_DATABASE identik dengan sebelum C1 (id, judul, level, contoh+reading, arti, rumus)', () => {
  const items = Object.values(BUNPOU_DATABASE);
  const normalized = JSON.stringify(items.map(b => [b.id, b.title, b.level, b.examples, b.meaningId, b.formula]));
  assert.equal(items.length, 915);
  assert.equal(items.reduce((a, b) => a + (b.examples?.length || 0), 0), 1704);
  assert.equal(createHash('sha256').update(normalized).digest('hex'), GOLDEN_SHA256);
});

test('gerbang data: setiap contoh Bunpou mentah WAJIB punya reading (pengganti korpus sentences.json di runtime)', () => {
  const missing: string[] = [];
  for (const item of rawBunpou as { id: string; examples?: { jp: string; reading?: string }[] }[]) {
    for (const ex of item.examples || []) {
      if (!ex.reading || !ex.reading.trim()) missing.push(`${item.id}: ${ex.jp}`);
    }
  }
  assert.deepEqual(missing, [], `Contoh tanpa reading (isi di bunpou.json): ${missing.slice(0, 5).join(' | ')}`);
});
