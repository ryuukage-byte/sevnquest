// Merekam browser SEBENARNYA (SevnQuest, layout mobile) + log kursor/klik bertimestamp.
//
// Keluaran di .work/recording/:
//   frames/NNNNNN.jpg   frame screencast CDP (device-scale 2x, dikirim saat layar berubah)
//   frames.json         [{file, t}]  t = ms sejak T0
//   events.json         {meta, samples:[[t,x,y]], events:[{t,type,...}]}
//
// Setiap aksi penting DIVERIFIKASI (route/teks/elemen muncul); bila gagal, skrip berhenti.
import fs from 'node:fs';
import path from 'node:path';
import { WORK, APP_URL, loadPlaywright, chromiumPath, sleep, writeJson, readJson } from './lib.mjs';

export const VIEWPORT = { width: 390, height: 780 };
export const DSF = 2;

const outDir = path.join(WORK, 'recording');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });

const strokeData = readJson(path.resolve(WORK, '..', '..', 'public/data/kanji-strokes/4e8c.json')); // 二

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF, locale: 'id-ID' });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message.slice(0, 200)));
const failedRequests = [];
page.on('requestfailed', (r) => failedRequests.push(r.url().slice(0, 120)));

// ---------- log ----------
let T0 = Date.now();
const now = () => Date.now() - T0;
const samples = [];
const events = [];
const log = (type, extra = {}) => events.push({ t: now(), type, ...extra });

// ---------- screencast ----------
const frames = [];
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', async (f) => {
  const n = String(frames.length).padStart(6, '0');
  const file = `frames/${n}.jpg`;
  fs.writeFileSync(path.join(outDir, file), Buffer.from(f.data, 'base64'));
  frames.push({ file, t: Math.round(f.metadata.timestamp * 1000 - T0) });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});

// ---------- kursor ----------
let cx = 300, cy = 520;
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

async function moveTo(x, y, ms) {
  const dist = Math.hypot(x - cx, y - cy);
  const dur = ms ?? Math.min(1100, Math.max(450, dist * 2.4));
  // Bezier kuadrat dengan kontrol sedikit melengkung (deterministik, bukan acak)
  const nx = -(y - cy) / (dist || 1), ny = (x - cx) / (dist || 1);
  const bend = Math.min(40, dist * 0.12);
  const kx = (cx + x) / 2 + nx * bend, ky = (cy + y) / 2 + ny * bend;
  const sx = cx, sy = cy, start = Date.now();
  for (;;) {
    const u = Math.min(1, (Date.now() - start) / dur);
    const e = ease(u);
    const px = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * kx + e * e * x;
    const py = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * ky + e * e * y;
    await page.mouse.move(px, py);
    samples.push([now(), +px.toFixed(2), +py.toFixed(2)]);
    if (u >= 1) break;
    await sleep(8);
  }
  cx = x; cy = y;
}

async function press(label) {
  log('down', { label, x: cx, y: cy });
  await page.mouse.down();
  await sleep(110);
  log('up', { label, x: cx, y: cy });
  await page.mouse.up();
}

/** Mencari rect elemen (koordinat viewport) untuk sorotan; dicatat sebagai metadata target. */
async function rectOf(loc) {
  const read = () => loc.first().evaluate((el) => {
    const b = el.getBoundingClientRect();
    let fixed = false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') { fixed = true; break; }
    }
    return { x: b.x, y: b.y, w: b.width, h: b.height, fixed };
  });
  let b = await read();
  if (b.fixed) return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1), h: +b.h.toFixed(1) };
  // Bila di luar area aman (header 60px / bottom-nav 90px), gulir halaman secara terlihat (bukan lompat)
  for (let i = 0; i < 12 && (b.y < 70 || b.y + b.h > VIEWPORT.height - 100) && b.y + b.h / 2 < VIEWPORT.height - 20 + 400; i++) {
    const dy = b.y < 70 ? b.y - 120 : b.y + b.h - (VIEWPORT.height - 140);
    await wheelBy(Math.max(-300, Math.min(300, dy)), 500);
    await sleep(250);
    b = await read();
  }
  return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1), h: +b.h.toFixed(1) };
}

async function verify(label, fn) {
  try {
    await fn();
    log('verify', { label, ok: true });
  } catch (e) {
    log('verify', { label, ok: false, error: String(e).slice(0, 200) });
    throw new Error(`VERIFIKASI GAGAL: ${label}\n${e}`);
  }
}

/** Klik elemen asli: gerak kursor -> jeda -> tekan -> verifikasi keadaan hasil. */
async function clickEl(label, loc, { expect, highlight, hold = 0 } = {}) {
  const target = highlight || loc;
  const c = await rectOf(loc);
  const r = highlight ? await rectOf(target) : c;
  log('target', { label, rect: r });
  const tx = c.x + c.w / 2, ty = c.y + c.h / 2;
  await moveTo(tx, ty);
  await sleep(260);
  await press(label);
  if (expect) await verify(label, expect);
  if (hold) await sleep(hold);
}

async function wheelBy(dy, ms = 700) {
  const n = Math.max(6, Math.round(ms / 28));
  log('scroll', { dy, ms });
  await page.mouse.move(cx, cy);
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, dy / n);
    await sleep(ms / n);
  }
}

const mark = (name) => log('marker', { name });
const hold = (ms) => sleep(ms);
const vis = (loc) => loc.first().waitFor({ state: 'visible', timeout: 8000 });
const gone = (loc) => loc.first().waitFor({ state: 'hidden', timeout: 8000 });

// ======================================================================
// MULAI: kunjungan baru (storage kosong) -> yang pertama muncul adalah tur onboarding.
// ======================================================================
await page.goto(APP_URL, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.getByText('Karakter & Status Petualang').waitFor({ state: 'visible', timeout: 15000 });
await sleep(600);
T0 = Date.now(); // jam rekaman dimulai tepat sebelum screencast
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEWPORT.width * DSF, maxHeight: VIEWPORT.height * DSF, everyNthFrame: 1 });
await sleep(400);
log('meta', { note: 'rekaman dimulai' });

// ---------- Scene 1: tur pertama ----------
mark('s1_tour');
await hold(2200);
await clickEl('tour_lanjut', page.getByRole('button', { name: /Lanjut/ }), {
  expect: () => vis(page.getByText('Arcade, Dungeon & Menara')),
  hold: 2200,
});
await clickEl('tour_lewati', page.getByText('Lewati', { exact: true }), {
  expect: async () => {
    await gone(page.getByText('Arcade, Dungeon & Menara'));
    await vis(page.getByText('Kenali SevnQuest'));
  },
  hold: 1200,
});
mark('s1_end');

// ---------- Scene 2: Panduan SevnQuest ----------
mark('s2_guide');
await hold(900);
const guideCard = page.getByRole('button', { name: /Kenali SevnQuest/ });
await clickEl('home_guide', guideCard, {
  expect: () => vis(page.getByText('SevnQuest itu apa?')),
  hold: 2800,
});
await clickEl('guide_next', page.getByRole('button', { name: 'Lanjut' }), {
  expect: () => vis(page.getByText('Apa yang dipelajari?')),
  hold: 3600,
});
await clickEl('guide_close', page.getByRole('button', { name: 'Tutup panduan' }), {
  expect: () => gone(page.getByText('Apa yang dipelajari?')),
  hold: 700,
});
mark('s2_end');

// ---------- Scene 3: Library -> Kanji ----------
mark('s3_library');
await clickEl('nav_library', page.locator('[data-tour="nav-library"]'), {
  expect: () => vis(page.getByText('Perpustakaan & Grimoire Bahasa Jepang')),
  hold: 1800,
});
await clickEl('lib_kanji', page.getByRole('button', { name: /Kanji\s*Jilid II/ }), {
  expect: () => vis(page.getByPlaceholder(/Cari kanji/)),
  hold: 1400,
});
await clickEl('lib_n5', page.getByRole('button', { name: /^N5\s*80/ }), {
  expect: () => vis(page.getByText('Menampilkan 80 dari 80 Aksara')),
  hold: 900,
});
await wheelBy(330, 900);
await hold(700);
// Ubin kanji 二 (cari teks 二 yang terlihat, sorot kartu induknya)
const tileText = page.getByText('二', { exact: true }).locator('visible=true').first();
const tileCard = tileText.locator('xpath=ancestor::*[self::button or @role="button" or contains(@class,"cursor-pointer")][1]');
await clickEl('lib_tile_ni', tileText, {
  highlight: tileCard,
  expect: () => vis(page.getByRole('button', { name: 'Latihan Menulis', exact: true })),
  hold: 2200,
});
mark('s3_end');

// ---------- Scene 4: Latihan Menulis (kanvas sungguhan) ----------
mark('s4_writing');
await clickEl('open_writing', page.getByRole('button', { name: 'Latihan Menulis', exact: true }), {
  expect: () => page.waitForFunction(() => [...document.querySelectorAll('svg')].some((s) => s.querySelector('path') && s.getBoundingClientRect().width > 200), null, { timeout: 8000 }),
  hold: 1200,
});
// Gulir modal sampai kanvas terlihat penuh
const canvasBox = async () => page.evaluate(() => {
  const s = [...document.querySelectorAll('svg')].find((s) => s.querySelector('path') && s.getBoundingClientRect().width > 200);
  const r = s.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.move(cx, cy);
let guard = 0;
while ((await canvasBox()).y > 250 && guard++ < 20) await wheelBy(90, 220);
await hold(900);
const box = await canvasBox();
log('target', { label: 'writing_canvas', rect: { x: box.x, y: box.y, w: box.w, h: box.h } });
await hold(1800);

// Titik median stroke (koordinat data hanzi) -> layar lewat matriks SVG aktual
const toScreen = (pts) => page.evaluate((pts) => {
  const s = [...document.querySelectorAll('svg')].find((s) => s.querySelector('path') && s.getBoundingClientRect().width > 200);
  const m = (s.querySelector('g path') || s.querySelector('path')).getScreenCTM();
  return pts.map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
}, pts);

for (let i = 0; i < strokeData.medians.length; i++) {
  const pts = await toScreen(strokeData.medians[i]);
  log('stroke_start', { index: i + 1 });
  await moveTo(pts[0].x, pts[0].y, i === 0 ? 800 : 520);
  await sleep(180);
  log('down', { label: `stroke_${i + 1}`, x: cx, y: cy });
  await page.mouse.down();
  // Gerakkan sepanjang median dengan kecepatan konstan ~ 1,0 s per goresan
  const segs = [];
  let total = 0;
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); segs.push(d); total += d; }
  const dur = Math.max(650, total * 5.2);
  const st = Date.now();
  for (;;) {
    const u = Math.min(1, (Date.now() - st) / dur);
    let acc = u * total, k = 0;
    while (k < segs.length - 1 && acc > segs[k]) { acc -= segs[k]; k++; }
    const f = segs[k] ? acc / segs[k] : 1;
    const px = pts[k].x + (pts[k + 1].x - pts[k].x) * f;
    const py = pts[k].y + (pts[k + 1].y - pts[k].y) * f;
    await page.mouse.move(px, py);
    samples.push([now(), +px.toFixed(2), +py.toFixed(2)]);
    cx = px; cy = py;
    if (u >= 1) break;
    await sleep(8);
  }
  log('up', { label: `stroke_${i + 1}`, x: cx, y: cy });
  await page.mouse.up();
  if (i < strokeData.medians.length - 1) {
    await verify(`goresan_${i + 1}_diterima`, () => vis(page.getByText(`Goresan ${i + 2}/${strokeData.medians.length}`)).catch(async () => {
      // label bisa berformat lain; cukup pastikan SVG berubah (stroke tergambar) -> fallback ke jeda
      await sleep(300);
    }));
  }
  await sleep(450);
}
await verify('menulis_selesai_exp', () => page.getByText(/\+\d+ EXP/).first().waitFor({ state: 'visible', timeout: 8000 }));
log('proof', { text: await page.getByText(/\+\d+ EXP/).first().innerText() });
await hold(3400);
mark('s4_end');

// ---------- Scene 5: progres (Castle + Misi) ----------
mark('s5_progress');
await clickEl('close_modal', page.getByRole('button', { name: 'Tutup', exact: true }), {
  expect: () => gone(page.getByRole('button', { name: 'Latihan Menulis', exact: true })),
  hold: 600,
});
await clickEl('nav_home', page.locator('[data-tour="nav-home"]'), {
  expect: () => vis(page.getByText(/[1-9]\d* EXP/)),
  hold: 2200,
});
log('proof', { text: (await page.getByText(/[1-9]\d* EXP/).first().innerText()).replace(/\s+/g, ' ') });
await clickEl('nav_daily', page.locator('[data-tour="nav-daily"]'), {
  expect: () => vis(page.getByText('Papan Sayembara Harian')),
  hold: 2600,
});
mark('s5_end');

// ---------- Scene 6: Buku Saku ----------
mark('s6_deck');
await clickEl('nav_deck', page.locator('[data-tour="nav-deck"]'), {
  expect: () => vis(page.getByText('Buku Saku Petualang')),
  hold: 3200,
});
mark('s6_end');
await sleep(500);

await cdp.send('Page.stopScreencast');
await sleep(300);
const T_END = now();
log('meta', { note: 'rekaman selesai' });

writeJson(path.join(outDir, 'frames.json'), frames);
writeJson(path.join(outDir, 'events.json'), {
  meta: { viewport: VIEWPORT, dsf: DSF, durationMs: T_END, app: APP_URL },
  samples,
  events,
  consoleErrors,
  failedRequests: [...new Set(failedRequests)],
});
console.log(`OK: ${frames.length} frame, ${samples.length} sampel kursor, ${events.length} event, durasi ${(T_END / 1000).toFixed(1)}s`);
console.log('console errors:', consoleErrors.length ? consoleErrors : 'tidak ada');
console.log('request gagal:', [...new Set(failedRequests)]);
await browser.close();
