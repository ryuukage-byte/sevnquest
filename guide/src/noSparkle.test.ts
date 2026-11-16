import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Aturan proyek: dilarang memakai ikon/emoji/simbol sparkle di mana pun.
const FORBIDDEN = new RegExp(['sparkl', 'glitter', 'twinkle', '✨', '\u{1F31F}', '\u{1F4AB}', '✦', '✧', '❇', '❈', '⁂'].join('|'), 'i');

function walk(d: string): string[] {
  return readdirSync(d).flatMap(n => {
    const p = join(d, n);
    if (n === 'node_modules' || n === 'dist') return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('tidak ada sparkle di kode/konten Guide', () => {
  const root = import.meta.dirname;
  const hits = walk(root)
    .filter(f => /\.(tsx?|json|css|html)$/.test(f) && !f.endsWith('noSparkle.test.ts') && !f.endsWith('package-lock.json'))
    .filter(f => FORBIDDEN.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});
