# SevnQuest Guide — status implementasi

PRD lengkap ada di diskusi produk; dokumen ini mencatat **apa yang sudah dibangun**, **hasil audit**, dan **keputusan yang masih menunggu**.
Kode: [`guide/`](../../guide/README.md). Aplikasi utama SevnQuest **tidak diubah**.

## Model produk: satu produk = satu sub-situs

Setiap produk (Pemula, JFT-Basic, JLPT N5..N1, SSW 2) di-build sebagai situs terpisah dari basis kode yang sama:
`VITE_PRODUCT=<id> npm run build` memilih `guide/src/products/<id>/` (konfigurasi + materi JSON) lewat alias `@product`.
Bundle sebuah situs hanya berisi materi produknya, dan UI (beranda, peta belajar, planner) mengikuti konfigurasi itu.
**Produk pertama: Pemula** (8 materi: hiragana, sapaan, perkenalan, struktur kalimat, partikel, angka).
Menambah produk = folder baru di `products/` + proyek deploy sendiri. **Pembatasan akses setelah pembelian** (hanya pembeli
produk itu yang masuk) belum dibuat: butuh entitlement per produk di backend (lihat sistem monetisasi/`api/_entitlement.ts`).

## Status fase

| Fase | Cakupan | Status |
|---|---|---|
| 1 | UI Foundation (home, navigasi, katalog, responsif) | Selesai |
| 2 | Morph Learning Engine (`MorphLearningEngine`, 6 tipe scene, latihan menyusun kalimat, progres lokal) | Selesai (2 materi contoh) |
| 3 | Curriculum Database | Sebagian: tabel jumlah materi per level dari audit basis data; materi sumber sebenarnya masih di aplikasi utama |
| 4 | Learning Planner (deterministik, diuji) | Selesai (preview roadmap + simpan lokal) |
| 5 | Integrasi Supabase | Belum: usulan migrasi ada di `guide/db-proposal/`, **belum diterapkan** |
| 6 | SSO | Belum |
| 7 | Flashcard Bridge | Belum (menunggu audit flashcard) |
| 8 | Sinkron progres | Belum |

## Hasil audit repo SevnQuest (relevan untuk integrasi)

- **Auth**: Supabase Auth (email + Google ID token), klien di `src/lib/supabase.ts`, lewat proxy same-origin `/supabase-proxy` (ISP Indonesia memblokir `*.supabase.co`). Guide di domain lain **tidak otomatis ikut proxy**: perlu proxy sendiri atau fallback.
- **Progres/save**: `user_saves` (1 baris/user, payload JSON, RLS own-row), `user_mastery`, `leaderboard`, `user_activity`. Flashcard/Buku Saku dan mastery tersimpan di dalam payload save + `user_mastery`; **belum ada tabel flashcard relasional** untuk ditautkan `learning_plan_flashcards`. Struktur ini harus diaudit lebih dalam sebelum Fase 7.
- **Planner sudah ada di aplikasi utama**: `src/engine/curriculum/` (Guided Learning: gap analysis, SRS, evaluasi mingguan). Planner Guide memakai prinsip yang sama (menit dasar per kategori, kesulitan per level, interval SRS) agar hasilnya konsisten saat diimpor.
- **Jumlah materi** (basis data): kotoba N5 700 / N4 731 / N3 1.960 / N2 3.333 / N1 11.369; kanji 80 / 167 / 366 / 378 / 1.373; bunpou N5 119 / N4 189 / N2 208 / N1 267. **Bunpou N3 tidak terpisah di JSON** (angka 150 di planner = perkiraan, ditandai `ESTIMATED_COUNTS`).
- **Temuan penting**: contoh PRD "JLPT N3, 180 hari, 45 menit" hanya memuat ~33% materi N3 penuh (perlu ~108 menit/hari). Planner melaporkan ini terang-terangan (coverage + peringatan) alih-alih memalsukan jadwal.

## Keputusan yang dibutuhkan sebelum Fase 5+

1. **Menyetujui migrasi** `guide/db-proposal/20261201_guide_tables.sql` ke proyek produksi (±1.500 pengguna). Hanya `create table if not exists` + RLS; tidak menyentuh tabel lama.
2. **Mekanisme SSO**: handoff kode sekali pakai lewat Edge Function (tanpa token di URL), atau mulai dengan login terpisah di Guide.
3. **Model flashcard**: audit penyimpanan flashcard/mastery supaya import tidak menduplikasi atau menimpa data pengguna.
4. **Domain & proxy**: `guide.sevnsoul.site` + proxy Supabase same-origin.
