// Util bersama untuk skrip produksi tutorial.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(ROOT, '..');
export const WORK = path.join(ROOT, '.work');
export const OUT = path.join(ROOT, 'output');

export const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000/';
export const FPS = 30;

/** Muat Playwright: dari node_modules proyek, atau lokasi global lingkungan ini. */
export async function loadPlaywright() {
  const candidates = [
    'playwright',
    '/opt/node-tools/node_modules/playwright/index.mjs',
  ];
  for (const c of candidates) {
    try { return await import(c); } catch { /* coba berikutnya */ }
  }
  try {
    return createRequire(import.meta.url)('playwright');
  } catch {
    throw new Error('Playwright tidak ditemukan. Jalankan: npm i --no-save playwright');
  }
}

export function chromiumPath() {
  const p = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  return fs.existsSync(p) ? p : undefined;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 1));
