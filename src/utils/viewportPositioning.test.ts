/**
 * GLOBAL UI POSITIONING STANDARD (lihat docs/architecture/UI_POSITIONING_STANDARD.md & CLAUDE.md).
 *
 * Penjaga regresi untuk bug "modal Kotoba N1 terkunci baru terlihat setelah menggulir":
 * `position: fixed` menempel ke leluhur yang punya transform / will-change: transform / filter /
 * perspective / contain, bukan ke layar. Tes ini memindai sumber dan gagal bila:
 *  1. pembungkus tata letak (tab) kembali memakai properti pembentuk containing block;
 *  2. ada overlay layar penuh (`fixed inset-0 z-…`) yang tidak dirender lewat portal;
 *  3. ada kunci gulir ad-hoc (`document.body.style.overflow`) di luar utils/scrollLock.ts.
 * Jika tes ini gagal, perbaiki komponennya — JANGAN melonggarkan tesnya.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'src');

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(name)) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const SOURCES = walk(SRC, []).map(file => ({ file, rel: relative(ROOT, file), text: readFileSync(file, 'utf8') }));

/** Properti CSS yang menjadikan elemen containing block untuk turunan `position: fixed`. */
const CONTAINING_BLOCK_CSS = /(^|;|\s)(transform|filter|backdrop-filter|perspective|contain)\s*:\s*(?!none)|will-change\s*:[^;]*(transform|filter|perspective)/;

/** Kelas yang dipakai pembungkus tata letak di atas SEMUA konten halaman. */
const LAYOUT_WRAPPER_CLASSES = ['animate-tab-enter', 'tab-views-container'];

test('pembungkus tab tidak membentuk containing block untuk position: fixed (CSS)', () => {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const violations: string[] = [];
  // Hanya blok aturan terdalam (keyframes boleh memakai transform sementara).
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const body = m[2];
    if (/^(from|to|\d+%)/.test(selector)) continue;
    for (const cls of LAYOUT_WRAPPER_CLASSES) {
      if (!new RegExp(`\\.${cls}(?![\\w-])`).test(selector)) continue;
      if (CONTAINING_BLOCK_CSS.test(body)) violations.push(`${selector} { ${body.trim()} }`);
      if (/animation(-fill-mode)?\s*:[^;]*\b(forwards|both)\b/.test(body)) {
        violations.push(`${selector}: animation fill-mode forwards/both membuat transform menetap`);
      }
    }
  }
  assert.deepEqual(violations, [], `Pembungkus tata letak tidak boleh punya transform/filter/will-change menetap:\n${violations.join('\n')}`);
});

test('pembungkus tab tidak memakai utilitas Tailwind pembentuk containing block (JSX)', () => {
  const main = SOURCES.find(s => s.rel === join('src', 'app', 'MainContent.tsx'));
  assert.ok(main, 'MainContent.tsx tidak ditemukan');
  const bad = /\b(transform(-gpu)?|will-change-(transform|\[)|filter|blur(-\w+)?|backdrop-\w+|perspective-\w+|contain-\w+|translate-[xyz]-\S+|scale-\S+|rotate-\S+|skew-\S+)\b/;
  const hits = [...main.text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
    .map(m => m[1] ?? m[2])
    .filter(cls => bad.test(cls));
  assert.deepEqual(hits, [], `Pembungkus tab memakai utilitas pembentuk containing block: ${hits.join(' | ')}`);
});

test('setiap overlay layar penuh dirender lewat portal ke document.body', () => {
  const violations: string[] = [];
  const OVERLAY = /fixed inset-0 z-(\d|\[)/;
  const PORTAL = /<ViewportPortal[\s>]|<ModalPortal[\s>]|createPortal\(/g;
  for (const { rel, text } of SOURCES) {
    const lines = text.split('\n');
    let overlays = 0;
    lines.forEach((line, i) => {
      if (!OVERLAY.test(line)) return;
      // Lapisan penutup dropdown boleh inline (harus satu stacking context dengan menunya).
      const near = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
      if (near.includes('data-dismiss-layer')) return;
      overlays += 1;
    });
    const portals = (text.match(PORTAL) || []).length;
    if (overlays > portals) {
      violations.push(`${rel}: ${overlays} overlay "fixed inset-0 z-…" tetapi hanya ${portals} portal`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Bungkus overlay dengan <ViewportPortal> (src/components/ui/ViewportPortal.tsx):\n${violations.join('\n')}`
  );
});

test('tidak ada kunci gulir ad-hoc di luar utils/scrollLock.ts', () => {
  const allowed = join('src', 'utils', 'scrollLock.ts');
  const hits = SOURCES.filter(s => s.rel !== allowed && /document\.(body|documentElement)\.style\.overflow\s*=/.test(s.text)).map(s => s.rel);
  assert.deepEqual(hits, [], `Pakai useBodyScrollLock / <ViewportPortal> (ref-count) alih-alih mengubah overflow langsung:\n${hits.join('\n')}`);
});

test('ViewportPortal merender ke document.body', () => {
  const portal = SOURCES.find(s => s.rel === join('src', 'components', 'ui', 'ViewportPortal.tsx'));
  assert.ok(portal, 'ViewportPortal.tsx tidak ditemukan');
  assert.match(portal.text, /createPortal\(children, document\.body\)/);
  assert.match(portal.text, /useBodyScrollLock\(/);
});
