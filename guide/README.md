# SevnQuest Guide

Aplikasi belajar bahasa Jepang interaktif (Morph Learning Engine + Learning Planner), terpisah dari aplikasi utama SevnQuest.
Status & keputusan: [`docs/prd/SEVNQUEST_GUIDE.md`](../docs/prd/SEVNQUEST_GUIDE.md).

```
cd guide && npm install
npm run dev     # http://localhost:3100
npm test        # planner, skema materi, aturan no-sparkle
npm run build
```

- `src/engine/` — `MorphLearningEngine` + skema materi (JSON di `src/data/lessons/`). Materi baru = file JSON baru.
- `src/planner/` — generator rencana deterministik (tanpa AI/random/waktu sistem); `planFingerprint` jadi kunci idempotensi import.
- `db-proposal/` — usulan migrasi Supabase, **belum diterapkan**.
- Mode tamu: progres dan rencana di `localStorage`. Login/impor ke SevnQuest menunggu Fase 5-6.
