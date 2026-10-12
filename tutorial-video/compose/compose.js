// Compositor deterministik: seluruh tampilan adalah fungsi murni dari waktu T (detik).
// window.renderFrame(T) menyusun DOM untuk waktu T lalu menunggu frame rekaman ter-decode.
// Komponen: Cursor, ClickRipple, TargetHighlight, Spotlight, Camera (zoom + pan), Caption,
// Heading + StepIndicator, Intro, Outro, transisi.

const TL = await (await fetch('/.work/timeline.json')).json();
const SB = TL.storyboard;
const { viewport: VP, fps: FPS } = TL;
const D = TL.duration;
const INTRO = SB.introSec, OUTRO = SB.outroSec;
const TOTAL = INTRO + D + OUTRO;
window.__total = TOTAL;
window.__fps = FPS;

// ---------- util ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const ramp = (f, a, b) => smooth((f - a) / (b - a));

// ---------- resolusi referensi event ----------
const resolve = (ref) => {
  const [type, key] = ref.split(':');
  const e = TL.events.find((x) => (type === 'marker' ? x.type === 'marker' && x.name === key : x.type === type && x.label === key));
  if (!e) throw new Error('ref tidak ditemukan: ' + ref);
  return e.t / 1000;
};
const targetRect = (label) => TL.events.find((x) => x.type === 'target' && x.label === label).rect;

const scenes = SB.scenes.map((s) => ({ ...s, t0: resolve(s.start), t1: resolve(s.end) }));
const cues = SB.cues.map((c) => {
  const a = resolve(c.at);
  const down = c.hl ? TL.events.find((x) => x.type === 'down' && x.label === c.hl)?.t / 1000 : undefined;
  const tgt = c.hl ? TL.events.find((x) => x.type === 'target' && x.label === c.hl).t / 1000 : undefined;
  const s = a + c.from, e = a + c.to;
  return {
    ...c, s, e,
    hlS: c.hl ? Math.max(s, tgt) : undefined,
    hlE: c.hl ? (down !== undefined ? Math.min(e, down + 0.32) : e) : undefined,
    rect: c.hl ? targetRect(c.hl) : undefined,
  };
});
const zooms = SB.zooms.map((z) => ({ ...z, s: resolve(z.start) + z.startOffset, e: resolve(z.end) + z.endOffset, rect: targetRect(z.label) }));
const downs = TL.events.filter((e) => e.type === 'down').map((e) => ({ t: e.t / 1000, x: e.x, y: e.y }));
const ups = TL.events.filter((e) => e.type === 'up').map((e) => e.t / 1000);
const samples = TL.samples; // [tMs, x, y]

// ---------- DOM ----------
const root = document.getElementById('root');
root.innerHTML = `
<div class="bg"></div>
<div class="header">
  <div class="step-row"><span class="step-label" id="stepLabel"></span><div class="step-bars" id="stepBars"></div></div>
  <div class="title-wrap" id="titles"></div>
</div>
<div class="stage" id="stage"><div class="world" id="world">
  <img id="frame" alt="">
  <div class="dim" id="dim"></div>
  <div class="hl" id="hl"></div>
  <div id="ripples"></div>
  <div class="cursor" id="cursor"><svg width="30" height="36" viewBox="0 0 30 36"><path d="M3 2 L3 27 L9.6 21.2 L14.2 31.6 L18.6 29.6 L14 19.4 L22.6 19.2 Z" fill="#fff" stroke="#0b1124" stroke-width="2" stroke-linejoin="round"/></svg></div>
</div></div>
<div class="caption" id="captions"></div>
<div class="card" id="intro">
  <div class="brand-mark"><svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#F0BE52" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/></svg></div>
  <div class="brand-name" id="iName"></div>
  <div class="sub" id="iSub"></div>
  <div class="pill" id="iPill"></div>
</div>
<div class="card" id="outro">
  <div class="brand-name" style="font-size:78px" id="oTitle"></div>
  <ul class="recap" id="recap"></ul>
  <div class="sub" style="margin-top:56px;color:var(--ink);font-weight:800;font-size:56px" id="oClose"></div>
  <div class="sub" style="margin-top:18px;font-size:36px"><span style="color:var(--amber);font-weight:800">SevnQuest</span> · The Learning World</div>
</div>`;
const $ = (id) => document.getElementById(id);
const nameEl = $('iName');
nameEl.innerHTML = 'Sevn<span>Quest</span>';
$('iSub').textContent = SB.intro.sub;
$('iPill').textContent = SB.intro.pill;
$('oTitle').textContent = SB.outro.title;
$('oClose').textContent = SB.outro.closing;
$('recap').innerHTML = SB.outro.items.map((t, i) => `<li><span class="n">${i + 1}</span><span>${t}</span></li>`).join('');
$('stepBars').innerHTML = scenes.map(() => '<i><b></b></i>').join('');
$('titles').innerHTML = scenes.map((s) => `<div class="title">${s.title}</div>`).join('');
$('captions').innerHTML = cues.map((c) => `<div class="cap">${c.text}</div>`).join('');
const titleEls = [...$('titles').children];
const barFills = [...$('stepBars').querySelectorAll('b')];
const capEls = [...$('captions').children];
const recapEls = [...$('recap').children];

// ---------- Cursor ----------
function cursorAt(f) {
  const ms = f * 1000;
  if (!samples.length) return { x: VP.width * 0.7, y: VP.height * 0.7 };
  if (ms <= samples[0][0]) return { x: samples[0][1], y: samples[0][2] };
  let lo = 0, hi = samples.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (samples[m][0] <= ms) lo = m; else hi = m; }
  const a = samples[lo], b = samples[hi];
  if (ms >= b[0]) return { x: b[1], y: b[2] };
  const gap = b[0] - a[0];
  if (gap > 120) return { x: a[1], y: a[2] }; // jeda: kursor diam
  const u = (ms - a[0]) / gap;
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u) };
}
const isPressed = (f) => downs.some((d, i) => f >= d.t && f <= (ups.find((u) => u >= d.t) ?? d.t + 0.12) + 0.1);

// ---------- Camera: zoom (analitik) + pan vertikal mengikuti kursor (follower, dihitung berurutan) ----------
const KBASE = 940 / VP.width;
const WIN_H_CSS = 1530 / KBASE;          // tinggi jendela dalam px css viewport
const N = Math.ceil(D * FPS);
const cam = [];
{
  let y = 0;
  for (let k = 0; k < N; k++) {
    const f = k / FPS;
    const lead = cursorAt(f + 0.7);
    let tgt = y;
    if (lead.y < y + 150) tgt = lead.y - 230;
    else if (lead.y > y + WIN_H_CSS - 190) tgt = lead.y - WIN_H_CSS + 260;
    tgt = clamp(tgt, 0, VP.height - WIN_H_CSS);
    y += (tgt - y) * 0.2;
    // zoom
    let z = 1, w = 0, zr = null;
    for (const zm of zooms) {
      const wz = ramp(f, zm.s, zm.s + 0.9) * (1 - ramp(f, zm.e, zm.e + 0.9));
      if (wz > w) { w = wz; zr = zm; }
    }
    let camX = 0, camY = y;
    if (zr) {
      z = lerp(1, zr.z, w);
      const winW = VP.width / z, winH = WIN_H_CSS / z;
      const cx = zr.rect.x + zr.rect.w / 2, cy = zr.rect.y + zr.rect.h / 2;
      camX = lerp(0, clamp(cx - winW / 2, 0, VP.width - winW), w);
      camY = lerp(y, clamp(cy - winH / 2, 0, VP.height - winH), w);
    }
    cam.push({ z, x: camX, y: camY });
  }
}
const camAt = (f) => cam[clamp(Math.floor(f * FPS), 0, N - 1)];

// ---------- render ----------
const frameEl = $('frame'), worldEl = $('world'), hlEl = $('hl'), dimEl = $('dim'), curEl = $('cursor'), ripEl = $('ripples');
const stageEl = $('stage');

function setBox(el, r, pad) {
  el.style.left = r.x - pad + 'px'; el.style.top = r.y - pad + 'px';
  el.style.width = r.w + pad * 2 + 'px'; el.style.height = r.h + pad * 2 + 'px';
}

window.renderFrame = async function renderFrame(T) {
  const f = T - INTRO;                         // waktu rekaman
  const inMain = f > -0.8 && f < D + 0.8;
  const fc = clamp(f, 0, D - 1 / FPS);

  // --- stage / header visibility & transisi ---
  const introOut = ramp(T, INTRO - 0.55, INTRO - 0.1);
  const stageIn = ramp(T, INTRO - 0.1, INTRO + 0.45);
  const outroIn = ramp(f, D - 0.1, D + 0.7);
  const mainA = clamp(stageIn * (1 - outroIn), 0, 1);
  const intro = $('intro'), outro = $('outro');
  intro.style.opacity = String(1 - introOut);
  intro.style.display = introOut >= 1 ? 'none' : 'flex';
  const iA = (a, b) => easeOut((T - a) / (b - a));
  $('iName').style.cssText = `opacity:${iA(0.25, 0.9)};transform:translateY(${(1 - iA(0.25, 0.9)) * 28}px)`;
  $('iSub').style.cssText = `opacity:${iA(0.6, 1.2)};transform:translateY(${(1 - iA(0.6, 1.2)) * 22}px)`;
  $('iPill').style.cssText = `opacity:${iA(0.9, 1.5)};transform:translateY(${(1 - iA(0.9, 1.5)) * 18}px)`;
  intro.querySelector('.brand-mark').style.cssText = `opacity:${iA(0, 0.6)};transform:scale(${0.8 + 0.2 * iA(0, 0.6)})`;

  outro.style.opacity = String(outroIn);
  outro.style.display = outroIn <= 0 ? 'none' : 'flex';
  outro.style.background = '#090E1E';
  recapEls.forEach((li, i) => {
    const a = easeOut((f - D - 0.25 - i * 0.22) / 0.55);
    li.style.opacity = String(a);
    li.style.transform = `translateX(${(1 - a) * 40}px)`;
  });
  $('oClose').style.opacity = String(easeOut((f - D - 1.5) / 0.6));

  for (const id of ['stage', 'captions']) $(id).style.opacity = String(mainA);
  document.querySelector('.header').style.opacity = String(mainA);
  stageEl.style.transform = stageIn >= 1 ? 'none' : `scale(${lerp(0.96, 1, easeOut(stageIn))})`;

  // --- frame rekaman ---
  const idx = clamp(Math.floor(fc * FPS), 0, TL.frameFiles.length - 1);
  const url = '/.work/recording/' + TL.frameFiles[idx];
  if (frameEl.getAttribute('src') !== url) {
    frameEl.src = url;
  }

  // --- camera ---
  const c = camAt(fc);
  const k = KBASE * c.z;
  worldEl.style.transform = `translate(${-c.x * k}px, ${-c.y * k}px) scale(${k})`;

  // --- spotlight + highlight ---
  let hlCue = null, hlAlpha = 0;
  for (const q of cues) {
    if (!q.hl) continue;
    const a = ramp(fc, q.hlS, q.hlS + 0.25) * (1 - ramp(fc, q.hlE - 0.05, q.hlE + 0.2));
    if (a > hlAlpha) { hlAlpha = a; hlCue = q; }
  }
  if (hlCue && hlAlpha > 0.01) {
    const pulse = 0.5 + 0.5 * Math.sin(fc * Math.PI * 2 * 1.5);
    const pad = 4 + pulse * 2.5;
    setBox(hlEl, hlCue.rect, pad);
    hlEl.style.opacity = String(hlAlpha);
    hlEl.style.borderRadius = Math.min(18, Math.min(hlCue.rect.w, hlCue.rect.h) / 2 + pad) + 'px';
    hlEl.style.borderWidth = 2.2 / c.z + 'px';
    if (hlCue.spot) {
      setBox(dimEl, hlCue.rect, pad);
      dimEl.style.borderRadius = hlEl.style.borderRadius;
      dimEl.style.opacity = String(hlAlpha);
      dimEl.style.display = 'block';
    } else dimEl.style.display = 'none';
  } else { hlEl.style.opacity = '0'; dimEl.style.display = 'none'; }

  // --- cursor + ripple ---
  const cp = cursorAt(fc);
  const pressed = isPressed(fc);
  const csz = (46 / 30) / k; // ukuran kursor di layar konstan ~46px
  curEl.style.transform = `translate(${cp.x}px, ${cp.y}px) scale(${csz * (pressed ? 0.84 : 1)})`;
  ripEl.innerHTML = '';
  for (const d of downs) {
    for (const [delay, maxR, bw] of [[0, 78, 4], [0.12, 112, 2.5]]) {
      const age = (fc - d.t - delay) / 0.6;
      if (age < 0 || age > 1) continue;
      const e = easeOut(age), r = (14 + maxR * e) / k;
      const el = document.createElement('div');
      el.className = 'ripple';
      el.style.cssText = `left:${d.x}px;top:${d.y}px;width:${r * 2}px;height:${r * 2}px;opacity:${(1 - age) * 0.9};border-width:${bw / k}px`;
      ripEl.appendChild(el);
    }
  }

  // --- heading + step indicator ---
  let activeIdx = -1;
  scenes.forEach((s, i) => { if (fc >= s.t0 - 0.05 && fc < s.t1 + 0.05) activeIdx = i; });
  titleEls.forEach((el, i) => {
    const s = scenes[i];
    const a = ramp(fc, s.t0 - 0.05, s.t0 + 0.35) * (1 - ramp(fc, s.t1 - 0.3, s.t1 + 0.05));
    el.style.opacity = String(a);
    el.style.transform = `translateY(${(1 - a) * 22}px)`;
  });
  $('stepLabel').textContent = activeIdx >= 0 ? `LANGKAH ${activeIdx + 1} / ${scenes.length}` : (f < 0 ? 'SEVNQUEST' : 'SELESAI');
  barFills.forEach((b, i) => {
    const s = scenes[i];
    const p = clamp((fc - s.t0) / (s.t1 - s.t0), 0, 1);
    b.style.width = `${(p * 100).toFixed(2)}%`;
  });

  // --- caption (crossfade antar cue) ---
  capEls.forEach((el, i) => {
    const q = cues[i];
    const a = ramp(fc, q.s, q.s + 0.28) * (1 - ramp(fc, q.e - 0.28, q.e));
    el.style.opacity = String(a);
    el.style.transform = `translateY(calc(-50% + ${(1 - a) * 14}px))`;
  });

  await frameEl.decode().catch(() => {});
  await document.fonts.ready;
  return true;
};

window.__qa = () => {
  const over = capEls.map((el, i) => ({ i, h: el.offsetHeight, w: el.scrollWidth })).filter((x) => x.h > 112 || x.w > 940);
  const titleOver = titleEls.map((el, i) => ({ i, w: el.scrollWidth })).filter((x) => x.w > 940);
  return { captionOverflow: over, titleOverflow: titleOver, cues: cues.length, scenes: scenes.length };
};
window.__ready = true;
