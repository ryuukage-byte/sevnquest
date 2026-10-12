// Menggabungkan rekaman + log kursor + storyboard menjadi .work/timeline.json
// (resampling frame screencast variabel -> daftar frame CFR 30 fps).
import path from 'node:path';
import { WORK, ROOT, FPS, readJson, writeJson } from './lib.mjs';

const rec = path.join(WORK, 'recording');
const frames = readJson(path.join(rec, 'frames.json'));
const ev = readJson(path.join(rec, 'events.json'));
const storyboard = readJson(path.join(ROOT, 'storyboard.json'));

const D = ev.meta.durationMs / 1000;
const n = Math.ceil(D * FPS);
const frameFiles = [];
let j = 0;
for (let k = 0; k < n; k++) {
  const tMs = (k / FPS) * 1000;
  while (j + 1 < frames.length && frames[j + 1].t <= tMs) j++;
  frameFiles.push(frames[j].file);
}

// Validasi: semua referensi storyboard harus ada di log.
const refs = new Set();
for (const e of ev.events) {
  if (e.type === 'marker') refs.add(`marker:${e.name}`);
  else if (e.label) refs.add(`${e.type}:${e.label}`);
}
const missing = [];
const check = (r) => { if (!refs.has(r)) missing.push(r); };
for (const s of storyboard.scenes) { check(s.start); check(s.end); }
for (const c of storyboard.cues) { check(c.at); if (c.hl) check(`target:${c.hl}`); }
for (const z of storyboard.zooms) { check(z.start); check(z.end); check(`target:${z.label}`); }
if (missing.length) { console.error('Referensi storyboard tidak ada di log rekaman:', missing); process.exit(1); }

writeJson(path.join(WORK, 'timeline.json'), {
  fps: FPS, duration: D, frameCount: n, viewport: ev.meta.viewport,
  frameFiles, events: ev.events, samples: ev.samples, storyboard,
});
console.log(`timeline: ${n} frame (${D.toFixed(1)}s) @${FPS}fps dari ${frames.length} frame sumber; semua referensi storyboard valid`);
