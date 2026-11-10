import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TOURS, DEEP_GUIDES } from './tours';
import { replyForTopic } from './intent';

/** Semua nilai data-tour="..." yang ada di komponen (tur menyorot elemen lewat atribut ini). */
function collectTourAttrs(dir: string, out = new Set<string>()): Set<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collectTourAttrs(p, out);
    else if (/\.tsx$/.test(name)) {
      for (const m of readFileSync(p, 'utf8').matchAll(/data-tour="([^"]+)"/g)) out.add(m[1]);
    }
  }
  return out;
}

// Tombol navigasi dibangun dinamis: data-tour={`nav-${item.id}`}.
const NAV = ['home', 'maps', 'daily', 'leaderboard', 'library', 'deck', 'settings'].map(t => `nav-${t}`);
const KNOWN = collectTourAttrs(join(process.cwd(), 'src'));
for (const n of NAV) KNOWN.add(n);

test('setiap titik sorot yang dipakai tur ada di komponen', () => {
  const missing: string[] = [];
  for (const tour of Object.values(TOURS)) {
    for (const step of tour.steps) {
      const name = /data-tour="([^"]+)"/.exec(step.selector)?.[1];
      if (!name || !KNOWN.has(name)) missing.push(`${tour.id}: ${step.selector}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('id tur sama dengan kuncinya dan setiap tur punya langkah', () => {
  for (const [key, tour] of Object.entries(TOURS)) {
    assert.equal(tour.id, key);
    assert.ok(tour.steps.length > 0, key);
  }
});

test('menu panduan lengkap memuat semua panduan mendalam sebagai tombol', () => {
  for (const g of DEEP_GUIDES) assert.ok(TOURS[g.tour], `tur ${g.tour} tidak ada`);
  const r = replyForTopic('panduan-lengkap');
  assert.equal(r.choices.length, DEEP_GUIDES.length);
  for (const c of r.choices) assert.equal(c.command?.type, 'guide_tour');
});
