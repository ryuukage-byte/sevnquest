# Guild MVP -- DRAFT (belum diterapkan)

Status: **draf untuk ditinjau**. Tidak ada SQL di folder ini yang pernah dijalankan ke database Supabase.
Draf ada di `supabase/drafts/` (bukan `supabase/migrations/`) agar tidak ikut ter-push oleh Supabase CLI.
Tiga tahap terpisah: **draf -> review/uji -> penerapan**; menulis file ini bukan persetujuan menerapkannya.

## Isi
- `20261009120000_guild_mvp.sql` -- skema, RPC, hak akses.
- `20261009120000_guild_mvp_rollback.sql` -- membuang semua objek Guild; tidak menyentuh tabel yang sudah ada.
- Uji: `supabase/tests/guild/` (harness, uji SQL, uji konkurensi, `run_local.sh`).

## Ringkasan desain
- Sumber poin: `weekly_scores` (ditulis hanya oleh `submit_score_event_v2`, naik saja). Guild **tidak** punya jalur tulis
  dari klien dan tidak mengubah fungsi produksi mana pun.
- Kursor sinkron per (Guild, anggota, minggu) di `guild_weekly_contrib.synced_score`; `guild_members.settled_week`
  menandai minggu yang sudah final (dimajukan hanya ke minggu dari `sekarang - 5 menit`).
- Cap 2.000 poin/anggota/minggu/Guild; target 150 x `peak_members` (peak hanya naik; `achieved_at` tidak dicabut).
- `total_points` **tidak disimpan**: total = `SUM(guild_weekly_contrib.points)`; level diturunkan dari total.
- Klien tanpa akses tabel (RLS aktif tanpa policy; grant dicabut); semua lewat 8 RPC `SECURITY DEFINER`.
- Kegagalan wajar dikembalikan sebagai `{ok:false,error}`, bukan exception, supaya log throttle tidak di-rollback.
- Urutan kunci: `guilds` (FOR UPDATE) -> `guild_members` (urut `user_id`). `guild_get_my` memakai `SKIP LOCKED`.

## Batasan yang diketahui (sengaja diterima untuk MVP)
1. Poin bersifat dibatasi-laju, bukan terverifikasi (`p_is_correct` dikirim klien). Aman hanya selama reward kosmetik.
   **Peringkat antar-Guild ditunda sampai validasi jawaban di server diperkuat.**
2. Anggota yang akunnya dihapus sebelum sempat disinkron kehilangan poin yang belum tersinkron (poin yang sudah
   tersinkron tetap milik Guild).
3. Guild bubar (anggota terakhir keluar) menghapus seluruh kontribusi dan riwayat target-nya.
4. `week_points` di layar adalah nilai per sinkron terakhir (<= 30 detik jika ada yang membuka layar Guild).
5. Target minggu lama yang baru terisi lewat sinkron terlambat memakai jumlah anggota saat itu sebagai `peak_members`.
6. Pergantian minggu mengikuti UTC (Senin 00:00 UTC = 07:00 WIB).

## Prasyarat sebelum penerapan (belum dikerjakan)
- Baseline skema live ke `supabase/migrations/` (pekerjaan terpisah; jangan dibuat dari asumsi).
- Pastikan `VITE_SECURE_LEADERBOARD=true` di dashboard hosting, pada environment Production DAN Preview. Jika tidak,
  `weekly_scores` tidak bertambah (v1 `submit_score_event` sudah dicabut dari `authenticated`) dan Guild akan selalu 0.
  Status per 2026-10-09: nilai di dashboard **belum bisa dibaca** dari sesi ini (variabel hanya dibaca saat build
  di `src/lib/supabase.ts`, tidak ada di repo; `sevnquest.sevnsoul.site` diblokir kebijakan jaringan sesi).
  Bukti tidak langsung dari database menunjukkan build produksi yang aktif memakai jalur v2 (flag efektif `true`):
  sejak migrasi `sec03_2b` (2026-10-04 08:30 UTC) ada 231 baris `weekly_scores` diperbarui (terbaru 2026-10-09
  05:33 UTC), 486 baris `leaderboard` ber-`exp_credit_at` (hanya diisi RPC), dan `score_event_log` (hanya diisi
  v2) terisi hingga 05:37 UTC. Ini bukti perilaku build aktif, bukan nilai konfigurasi: build berikutnya masih
  bisa kehilangan variabel bila hanya diset di salah satu environment. Cara verifikasi langsung: dashboard hosting
  (Settings > Variables and Secrets), atau DevTools > Network di situs produksi, cari `rpc/submit_score_event_v2`.
- Review SQL/RLS/hak eksekusi oleh manusia, lalu coba di branch database Supabase sebelum produksi.

## Menjalankan uji (hanya database lokal sekali pakai)
```
createdb guild_test_1
GUILD_TEST_DSN="host=/path/soket dbname=guild_test_1" supabase/tests/guild/run_local.sh --concurrency
```
`run_local.sh` menolak DSN yang bukan lokal atau database yang namanya bukan `guild_test*`; `00_local_harness.sql`
menolak database yang terlihat seperti SevnQuest sungguhan. Tidak ada kredensial Supabase yang dibutuhkan.
