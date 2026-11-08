/**
 * ATURAN UTAMA (lihat CLAUDE.md): dilarang memakai ikon/emoji/simbol sparkle di mana pun.
 * Tes ini memindai seluruh sumber & aset teks; gagal bila ada sparkle yang masuk lagi.
 * Pengecualian: kamus di src/data/db/ (arti kata "sparkle" adalah isi data, bukan visual) —
 * tetapi emoji sparkle tetap dilarang di sana.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SCAN_DIRS = ['src', 'public', 'functions', 'api'];
const SCAN_FILES = ['index.html'];
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.html', '.json', '.webmanifest', '.svg', '.md']);
const DICTIONARY_DIR = join('src', 'data', 'db');
const SELF = join('src', 'utils', 'noSparkle.test.ts');

/** Emoji & simbol sparkle — dilarang di semua file, termasuk kamus. */
const SPARKLE_SYMBOLS = /[✨🌟💫✦✧❇❈⁂🎇]/u;
/** Ikon lucide / nama ikon sparkle — dilarang di luar kamus. */
const SPARKLE_NAMES = /\b\w*Sparkles?\w*\b|['"`]sparkles?['"`]/;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (TEXT_EXT.has(extname(name))) out.push(p);
  }
}

test('tidak ada sparkle di mana pun (ATURAN UTAMA, lihat CLAUDE.md)', () => {
  const files: string[] = [];
  for (const d of SCAN_DIRS) if (existsSync(join(ROOT, d))) walk(join(ROOT, d), files);
  for (const f of SCAN_FILES) if (existsSync(join(ROOT, f))) files.push(join(ROOT, f));

  const violations: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (rel === SELF) continue;
    const inDictionary = rel.startsWith(DICTIONARY_DIR);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (SPARKLE_SYMBOLS.test(line) || (!inDictionary && SPARKLE_NAMES.test(line))) {
        violations.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }

  assert.equal(
    violations.length,
    0,
    `Sparkle dilarang (CLAUDE.md). Ganti dengan ikon lain (Rocket, Bot, Lightbulb, Atom, Zap, ...):\n${violations.join('\n')}`,
  );
});
