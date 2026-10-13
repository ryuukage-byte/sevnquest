# SevnQuest — Audit Sistem (indeks)

Snapshot: **2026-10-13**, branch `ccr-45fec575-9x86pe` (PR #14). Audit ini menggantikan `docs/SYSTEM_AUDIT.md` (snapshot awal di commit `8ae7fc1`).

| Dokumen | Isi |
|---|---|
| [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) | Tech stack, arsitektur, struktur folder, alur boot & data, deployment, env, PWA |
| [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) | Semua fitur/sub-fitur, lokasi, status (complete/partial/UI-only/dead), bukti |
| [EXP_ECONOMY.md](EXP_ECONOMY.md) | Rumus EXP/level/tier, angka konten, tabel sumber reward, aturan ledger, perhitungan ekonomi |
| [DATA_MODEL.md](DATA_MODEL.md) | `PlayerStats`, localStorage, tabel & RPC Supabase (terverifikasi), sinkron & konflik |
| [FEATURE_DEPENDENCIES.md](FEATURE_DEPENDENCIES.md) | Peta ketergantungan modul + diagram |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Bug, risiko, utang teknis: ID, bukti, status (FIXED / OPEN) |
| [ROADMAP.md](ROADMAP.md) | Rekomendasi berurutan dengan kriteria sukses |
| [TESTING.md](TESTING.md) | Tes yang ada, hasil aktual, celah |

## Metode & tingkat bukti
- **✅ terverifikasi**: dibaca dari kode atau dieksekusi (tes, `tsc`, build, kueri katalog Supabase read-only).
- **🔶 inferensi**: kesimpulan dari kode yang dibaca, belum dijalankan di browser.
- **❓ belum dapat dipastikan**: butuh akses/ekseksusi yang tidak dilakukan (env produksi, perilaku UI nyata).
- Tidak ada data pengguna yang dibaca dari Supabase; hanya metadata skema, policy, definisi fungsi, indeks, dan jumlah baris.

## Cakupan
Dibaca penuh/mendalam: state & persistensi, EXP/reward/ledger, mastery/SRS, Recall, misi/streak, cloud sync, `lib/supabase.ts`, Tower 1/2 (progres & reward), Fusion, Arcade/Dungeon (jalur reward), `api/*`, `functions/*`, `sw.js`, headers, skema & RPC Supabase.
Dibaca sebagian (struktur, props, jalur reward; bukan seluruh JSX): Library (Kanji/Kotoba/Bunpou/Soal), Buku Saku & AI deck, Leaderboard UI, Settings, Auth, Onboarding, Text Study/Immersion UI, isi konten Tower 2.
Tidak diaudit: isi baris dataset JSON (hanya jumlah & distribusi), aset gambar/stroke, CSS (`index.css`, 2.687 baris).

## Perubahan sejak audit awal (PR #14)
| Tahap | Hasil |
|---|---|
| 1–2 | EXP pecahan (`expFraction`); flashcard tanpa skor = latihan, bukan attempt; tes karakterisasi |
| 3 | `awardExp` + ledger + idempotency + aturan terpusat (`engine/reward/*`), sinkron cloud |
| 4 | Streak berbasis belajar; misi murni & teruji; Recall bayar sesi ditinggalkan + sessionKey; hapus ±6.700 baris UI mati; usulan migrasi `user_saves` (belum diterapkan); tryout & text-study dibatasi; jalur leaderboard aman jadi default |
