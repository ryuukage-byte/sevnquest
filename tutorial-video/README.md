# Produksi video tutorial SevnQuest (hybrid rekaman browser + motion graphics)

Terisolasi dari aplikasi. Tanpa dependensi baru: memakai Playwright (global atau `npm i --no-save playwright`), Chromium, ffmpeg.

```bash
npm ci && npm run dev -- --host 127.0.0.1      # terminal 1: app di http://127.0.0.1:3000
cd tutorial-video
node scripts/record.mjs                        # rekam browser nyata + log kursor (diverifikasi tiap aksi)
node scripts/qa.mjs rec                        # QA rekaman
node scripts/build-timeline.mjs                # gabung rekaman + storyboard.json
node scripts/qa.mjs compose                    # QA kursor/layout/determinisme
node scripts/render.mjs --mode preview         # .work/preview/preview.mp4 (540x960 @15fps)
node scripts/render.mjs --stills 10,30 --out .work/stills   # frame PNG untuk inspeksi
node scripts/render.mjs --mode final           # .work/intermediate/final.mp4
cp .work/intermediate/final.mp4 output/sevnquest-tutorial-getting-started-9x16.mp4
node scripts/qa.mjs video output/sevnquest-tutorial-getting-started-9x16.mp4
```
Struktur: `scripts/` (rekam, timeline, render, QA), `compose/` (komponen motion graphic), `storyboard.json`,
`fonts/` (Plus Jakarta Sans), `output/` (satu MP4 final), `QA_REPORT.md`. `.work/` (frame mentah, intermediate) di-gitignore.
