// Render compositor -> MP4 (H.264, 1080x1920, 30 fps) atau stills untuk inspeksi.
//   node scripts/render.mjs --mode preview            -> .work/preview/preview.mp4 (540x960, 15 fps)
//   node scripts/render.mjs --mode final              -> .work/intermediate/final.mp4 (1080x1920, 30 fps)
//   node scripts/render.mjs --stills 1.5,10,20 --out DIR  -> PNG 1080x1920 pada detik tsb
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { ROOT, WORK, loadPlaywright, chromiumPath } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const mode = args.mode || (args.stills ? 'stills' : 'preview');
const workers = Number(args.workers || 4);

// ---- server statis ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: chromiumPath() });

async function openPage(scale) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.error('PAGEERROR', e.message); process.exitCode = 1; });
  await page.goto(`${base}/compose/index.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return page;
}

if (mode === 'stills') {
  const out = path.resolve(args.out || path.join(WORK, 'stills'));
  fs.mkdirSync(out, { recursive: true });
  const page = await openPage(1);
  console.log('QA layout:', JSON.stringify(await page.evaluate(() => window.__qa())));
  for (const t of args.stills.split(',').map(Number)) {
    await page.evaluate((t) => window.renderFrame(t), t);
    await page.screenshot({ path: path.join(out, `t${String(t.toFixed(2)).padStart(6, '0')}.png`) });
  }
  await browser.close(); server.close();
  process.exit(process.exitCode || 0);
}

// ---- render video ----
const preview = mode === 'preview';
const scale = preview ? 0.5 : 1;
const fps = preview ? 15 : 30;
const probe = await openPage(scale);
const total = await probe.evaluate(() => window.__total);
console.log('QA layout:', JSON.stringify(await probe.evaluate(() => window.__qa())));
await probe.context().close();
const nFrames = Math.round(total * fps);
const outDir = path.join(WORK, preview ? 'preview' : 'intermediate');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
console.log(`render ${mode}: ${nFrames} frame (${total.toFixed(2)}s) @${fps}fps, ${workers} worker`);

const per = Math.ceil(nFrames / workers);
const segs = [];
const t0 = Date.now();
let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const a = w * per, b = Math.min(nFrames, a + per);
  if (a >= b) return;
  const seg = path.join(outDir, `seg${w}.mp4`);
  segs[w] = seg;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', preview ? '24' : '16', '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', '-movflags', '+faststart', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const page = await openPage(scale);
  for (let i = a; i < b; i++) {
    await page.evaluate((t) => window.renderFrame(t), i / fps);
    const png = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 100 === 0) console.log(`  ${done}/${nFrames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await page.context().close();
}));
await browser.close(); server.close();

const list = path.join(outDir, 'list.txt');
fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
const outFile = path.join(outDir, preview ? 'preview.mp4' : 'final.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', outFile]);
console.log('selesai ->', outFile, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
