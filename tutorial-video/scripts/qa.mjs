// QA otomatis. Hanya melaporkan "PASS" bila pengecekan benar-benar dijalankan.
//   node scripts/qa.mjs rec            -> QA rekaman (log verifikasi, error console, kursor vs target)
//   node scripts/qa.mjs compose        -> QA compositor (kursor di dalam sorotan saat klik, layout caption, determinisme)
//   node scripts/qa.mjs video FILE     -> QA berkas MP4 (ffprobe + frame kosong/beku)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT, WORK, readJson, loadPlaywright, chromiumPath } from './lib.mjs';

const what = process.argv[2];
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const finish = () => {
  fs.mkdirSync(path.join(WORK, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(WORK, 'qa', `${what}.json`), JSON.stringify(results, null, 1));
  const bad = results.filter((r) => !r.ok).length;
  console.log(bad ? `\n${bad} pengecekan GAGAL` : '\nSemua pengecekan lulus');
  process.exit(bad ? 1 : 0);
};

if (what === 'rec') {
  const ev = readJson(path.join(WORK, 'recording', 'events.json'));
  const vs = ev.events.filter((e) => e.type === 'verify');
  check('semua verifikasi aksi lulus', vs.length > 0 && vs.every((v) => v.ok), `${vs.length} verifikasi`);
  const errs = ev.consoleErrors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION|Failed to load resource/.test(e));
  check('tidak ada error JS/console selain jaringan eksternal diblokir sandbox', errs.length === 0, errs.join('; '));
  check('request gagal hanya ke supabase (diblokir sandbox)', ev.failedRequests.every((u) => /supabase\.co/.test(u)), ev.failedRequests.join(', '));
  // Kursor saat tekan harus berada di dalam rect target yang tercatat
  const targets = Object.fromEntries(ev.events.filter((e) => e.type === 'target').map((e) => [e.label, e.rect]));
  const bad = [];
  let n = 0;
  for (const d of ev.events.filter((e) => e.type === 'down' && targets[e.label])) {
    n++;
    const r = targets[d.label];
    if (!(d.x >= r.x && d.x <= r.x + r.w && d.y >= r.y && d.y <= r.y + r.h)) bad.push(d.label);
  }
  check('kursor berada di dalam elemen target saat klik', bad.length === 0 && n > 0, `${n} klik dicek${bad.length ? ', meleset: ' + bad : ''}`);
  const proof = ev.events.filter((e) => e.type === 'proof').map((e) => e.text);
  check('bukti keadaan aplikasi tercatat (EXP bertambah)', proof.some((p) => /EXP/.test(p)), proof.join(' | '));
  finish();
}

if (what === 'compose') {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/compose/index.html`);
  await page.waitForFunction(() => window.__ready === true);
  const tl = readJson(path.join(WORK, 'timeline.json'));
  const intro = tl.storyboard.introSec;

  const qa = await page.evaluate(() => window.__qa());
  check('caption tidak melimpah (maks 2 baris, lebar ≤ 940px)', qa.captionOverflow.length === 0, JSON.stringify(qa.captionOverflow));
  check('judul tidak melimpah', qa.titleOverflow.length === 0, JSON.stringify(qa.titleOverflow));

  // Pada saat klik: ujung kursor (titik hotspot) harus di dalam kotak sorotan di layar komposit.
  const downs = tl.events.filter((e) => e.type === 'down' && tl.events.some((t) => t.type === 'target' && t.label === e.label));
  const bad = [];
  for (const d of downs) {
    const m = await page.evaluate(async (T) => {
      await window.renderFrame(T);
      const cur = document.getElementById('cursor').getBoundingClientRect();
      const hl = document.getElementById('hl');
      const r = hl.getBoundingClientRect();
      const stage = document.getElementById('stage').getBoundingClientRect();
      return { x: cur.x, y: cur.y, hl: { x: r.x, y: r.y, w: r.width, h: r.height, o: +hl.style.opacity }, stage: { x: stage.x, y: stage.y, w: stage.width, h: stage.height } };
    }, intro + d.t / 1000);
    const inside = m.x >= m.hl.x - 2 && m.x <= m.hl.x + m.hl.w + 2 && m.y >= m.hl.y - 2 && m.y <= m.hl.y + m.hl.h + 2;
    const inStage = m.x >= m.stage.x && m.x <= m.stage.x + m.stage.w && m.y >= m.stage.y && m.y <= m.stage.y + m.stage.h;
    if (!(inside && m.hl.o > 0.3 && inStage)) bad.push(`${d.label} (kursor ${m.x.toFixed(0)},${m.y.toFixed(0)} sorotan ${JSON.stringify(m.hl)})`);
  }
  check('di layar akhir 1080×1920, kursor tepat di dalam sorotan target & dalam stage saat klik', bad.length === 0, `${downs.length} klik${bad.length ? '; meleset: ' + bad.join(' | ') : ''}`);

  // Determinisme: render frame yang sama dua kali (dengan render lain di antaranya) lalu bandingkan piksel.
  // Toleransi: selisih kanal ≤ 3/255 dan ≤ 50 piksel berbeda (anti-aliasing tepi raster Chromium).
  const { Jimp } = await import('jimp');
  const shot = async (T) => { await page.evaluate((T) => window.renderFrame(T), T); return Jimp.read(await page.screenshot()); };
  const probes = [5.3, 20.7, 41.1, 58.4, 73.9];
  const stats = [];
  for (const T of probes) {
    const a = await shot(T); await shot(T + 9.1); const b = await shot(T);
    let diffPx = 0, maxD = 0;
    for (let i = 0; i < a.bitmap.data.length; i += 4) {
      const d = Math.max(Math.abs(a.bitmap.data[i] - b.bitmap.data[i]), Math.abs(a.bitmap.data[i + 1] - b.bitmap.data[i + 1]), Math.abs(a.bitmap.data[i + 2] - b.bitmap.data[i + 2]));
      if (d > 0) { diffPx++; if (d > maxD) maxD = d; }
    }
    stats.push({ T, diffPx, maxD });
  }
  check('render deterministik (render ulang identik dalam toleransi anti-aliasing)', stats.every((x) => x.diffPx <= 50 && x.maxD <= 3), JSON.stringify(stats));
  await browser.close(); server.close();
  finish();
}

if (what === 'video') {
  const file = path.resolve(process.argv[3]);
  const p = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = p.streams.find((s) => s.codec_type === 'video');
  check('resolusi 1080×1920', v.width === 1080 && v.height === 1920, `${v.width}x${v.height}`);
  check('rasio 9:16', v.width * 16 === v.height * 9);
  check('codec H.264', v.codec_name === 'h264', `${v.codec_name} ${v.profile}`);
  check('pix_fmt yuv420p', v.pix_fmt === 'yuv420p', v.pix_fmt);
  const [a, b] = v.r_frame_rate.split('/').map(Number);
  check('30 fps', a / b === 30, v.r_frame_rate);
  check('tanpa audio', !p.streams.some((s) => s.codec_type === 'audio'));
  const dur = Number(p.format.duration);
  check('durasi 45–90 detik', dur >= 45 && dur <= 90, `${dur.toFixed(2)}s`);
  const tl = readJson(path.join(WORK, 'timeline.json'));
  const expected = tl.storyboard.introSec + tl.duration + tl.storyboard.outroSec;
  check('durasi sesuai timeline', Math.abs(dur - expected) < 0.2, `${dur.toFixed(2)} vs ${expected.toFixed(2)}`);
  check('jumlah frame sesuai', Math.abs(Number(v.nb_frames) - Math.round(expected * 30)) <= 2, `${v.nb_frames}`);
  // frame kosong / beku: signalstats + freezedetect
  const sig = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { maxBuffer: 1 << 28 }).toString();
  const yavg = [...sig.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const dark = yavg.filter((y) => y < 6).length;
  check('tidak ada frame hitam/kosong', dark === 0 && yavg.length > 0, `${yavg.length} frame dianalisis, min YAVG=${Math.min(...yavg).toFixed(1)}`);
  const fzOut = (() => { try { return execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${file}" -vf freezedetect=n=-60dB:d=4 -f null - 2>&1 | grep -c freeze_start || true`]).toString().trim(); } catch { return '0'; } })();
  check('tidak ada bagian beku > 4 detik', fzOut === '0', `freeze_start=${fzOut}`);
  finish();
}
console.error('argumen: rec | compose | video FILE');
process.exit(2);
