# SevnQuest Guide

Aplikasi belajar bahasa Jepang interaktif (Morph Learning Engine + Learning Planner), terpisah dari aplikasi utama SevnQuest.
Status & keputusan: [`docs/prd/SEVNQUEST_GUIDE.md`](../docs/prd/SEVNQUEST_GUIDE.md).

```
cd guide && npm install
npm run dev     # http://localhost:3100 (produk bawaan: beginner)
VITE_PRODUCT=beginner npm run build   # satu produk = satu sub-situs
npm test        # planner, skema materi, aturan no-sparkle
npm run build
```

- `src/products/<id>/` — konfigurasi produk + materi JSON; satu folder per sub-situs (saat ini: `beginner`).
- `src/engine/` — `MorphLearningEngine` + skema materi (JSON di `src/products/<id>/lessons/`). Materi baru = file JSON baru.
- `src/planner/` — generator rencana deterministik (tanpa AI/random/waktu sistem); `planFingerprint` jadi kunci idempotensi import.
- `db-proposal/` — usulan migrasi Supabase, **belum diterapkan**.
- Mode tamu: progres dan rencana di `localStorage`. Login/impor ke SevnQuest menunggu Fase 5-6.

## Design system
Tampilan memakai design system SevnQuest apa adanya: `guide/src/sevnquest.css` adalah salinan utuh `src/index.css`
(token, font, kelas `panel`, `rpg-card-interactive`, `skeuo-*`, `notebook-filter-tab`, mode gelap/terang).
Setelah `src/index.css` berubah, jalankan `npm run sync-design`; tes `designSync.test.ts` gagal bila salinan tertinggal.
`guide.css` hanya berisi gaya khas scene engine, dan memakai token yang sama.
