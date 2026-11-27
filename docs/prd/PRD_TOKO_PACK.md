# PRD: Toko Pack & Pack Pass

Versi: 0.3
Tanggal: 27 November 2026
Status: Draft untuk review
Terkait: `docs/prd/PRD_MONETISASI.md` (model donasi, QRIS, entitlement)

---

## 0. Keputusan Pemilik

| # | Keputusan |
|---|---|
| 1 | Ada **Toko** yang menjual **Pack**: kumpulan flashcard yang sudah dikurasi, misalnya "Kilat N3" berisi kotoba dari ujian JLPT resmi yang sudah ada di app. |
| 2 | Pack dibeli dengan **Pack Pass**. Harga pack bervariasi menurut kerumitan dan permintaan (contoh: Kilat N1 = 3 pass). |
| 3 | Pack yang sudah dibuka **permanen**. Pack hanya muncul di Buku Saku pengguna. |
| 4 | Donatur bulanan mendapat **3 pass** per bulan. Donatur tahunan mendapat **36 pass** setahun, dibagikan **bertahap (drip) 3 pass per 30 hari**. |
| 5 | Pass tambahan **Rp 7.000 per pass**, dan **hanya bisa dibeli oleh pengguna Full**. Pass tambahan adalah add-on untuk pelanggan, bukan jalur pembelian terpisah. |
| 6 | (v0.2) Pass **tidak pernah hangus**, tanpa batas tumpukan. |
| 7 | (v0.2) Sisa pass **boleh dipakai** setelah akses Full habis; membeli pass baru tetap wajib Full aktif. Pack tetap bisa dilatih setelah langganan habis. |
| 8 | (v0.2) Setoran Lifetime Rp 25.000 memberi 3 pass; status Lifetime memberi 3 pass per 30 hari selamanya. |
| 9 | (v0.2) Harga: Kilat N3 **2 pass**, Kilat N2 **2 pass**, Kilat N1 **3 pass**. Belum ada bundel diskon di v1. |
| 10 | (v0.2) Backfill: pembeli tahunan lama langsung mendapat tahap drip yang sudah lewat. |

---

## 1. Ringkasan

Toko menambah lapisan nilai di atas akses Full. Akses Full membuka seluruh materi mentah (18 ribu kotoba, 2.500 kanji, dan seterusnya). Pack menjual **kurasi**: "dari ribuan kata N3, ini yang benar-benar keluar di ujian, diurutkan dari yang paling sering". Pengguna membayar untuk menghemat waktu belajar.

Prinsip:
- Pass adalah benefit langganan. Pengguna Full otomatis mendapat jatah pass dan tidak perlu membeli apa pun untuk mencoba Toko.
- Pack tidak memberi EXP, gold, atau keuntungan di papan skor (aturan "donasi bukan pay-to-win" dari PRD Monetisasi tetap berlaku).
- Sekali dibuka, pack menjadi milik pengguna selamanya, termasuk pembaruan isi pack di kemudian hari.

---

## 2. Konsep

### 2.1 Pack

Pack adalah deck kurasi berbentuk buku, mengikuti struktur `OfficialBook` yang sudah ada (`src/types/books.ts`): satu pack punya beberapa bab, tiap bab berisi daftar `DeckItemRef` yang menunjuk ke data kotoba/kanji/bunpou yang sudah dibundel di klien.

Contoh pack **Kilat N3**:

| Bab | Isi |
|---|---|
| Bab 1: Wajib | Kata yang muncul di 3 ujian atau lebih |
| Bab 2: Sering | Kata yang muncul di 2 ujian |
| Bab 3: Pernah Muncul | Kata yang muncul di 1 ujian |

Setiap kartu membawa catatan sumber di `DeckItemRef.notes`, misalnya "Muncul 4× · 2022-07, 2023-12, 2024-07, 2025-12 · sebagai jawaban 2×, pengecoh 2×".

Yang dijual adalah **pilihan, urutan, pengelompokan, dan catatan frekuensi**. Data kata itu sendiri sudah ada di app dan terbuka untuk pengguna Full.

### 2.2 Pack Pass

Pack Pass adalah saldo dalam akun (bilangan bulat). Pass bisa didapat dari langganan atau dibeli, lalu dipakai untuk membuka pack.

| Sumber | Jumlah | Kapan masuk |
|---|---|---|
| Donasi bulanan mencapai ambang (Rp 17.000 dalam satu bulan WIB) | 3 | Saat `monthly_grants` bulan itu tercatat (sekali per bulan kalender) |
| Paket Tahunan (Rp 102.000) | 36 total | 3 saat disetujui, lalu 3 setiap 30 hari, 12 tahap |
| Setoran Lifetime (kelipatan Rp 25.000, tiap setoran = Full 30 hari) | 3 per setoran | Saat setoran disetujui |
| Status Lifetime (total Rp 700.000) | 3 per 30 hari | Drip tanpa batas selama status Lifetime ada |
| Beli pass tambahan | n × Rp 7.000 | Saat pesanan disetujui |
| Admin (kompensasi, promo, refund) | bebas | Manual |

Aturan pass:
- **Pass tidak pernah hangus**, baik pass jatah maupun pass beli. Drip tahunan sudah mencegah pengguna menghabiskan 36 pass di bulan pertama, jadi batas rollover tidak diperlukan di v1.
- **Membeli pass** wajib akses Full aktif (bukan masa tenggang).
- **Memakai pass** untuk membuka pack tetap boleh walau langganan sudah habis. Pass yang sudah dimiliki tetap bernilai. Ini konsisten dengan "pack permanen".
- Pass tidak bisa ditransfer, dijual kembali, atau ditukar uang.
- Pembelian pass **bukan donasi**: tidak dihitung ke tingkat bulanan, total lifetime, badge, atau papan donatur.
- Hadiah key (gift) mengikuti jalurnya: key bulanan/tahunan/lifetime yang ditukar memberi pass ke **penukar**, bukan pembeli. Pass tambahan tidak bisa dihadiahkan di v1.

### 2.3 Harga pack

Harga pack ditulis dalam pass, bukan rupiah, supaya bisa diubah tanpa menyentuh alur pembayaran.

| Tier harga | Pass | Contoh |
|---|---|---|
| Ringan | 1 | Pack tematik kecil, N5/N4 |
| Sedang | 2 | Kilat N3, Kilat N2 |
| Berat | 3 | Kilat N1 (daftar kata terbesar, permintaan tertinggi) |

---

## 3. Katalog Awal

Sumber kata: tryout resmi di `src/data/tryouts/official/` (bagian `mojiGoi`).

| Pack | Sumber | Harga | Catatan |
|---|---|---|---|
| Kilat N1 | 7 ujian (2020-12 s.d. 2024-12) | 3 pass | |
| Kilat N2 | 8 ujian (2021-07 s.d. 2024-12) | 2 pass | |
| Kilat N3 | 10 ujian (2020-12 s.d. 2025-12) | 2 pass | |

N5 dan N4 belum punya tryout resmi di repo, jadi tidak ada Kilat N5/N4 di v1. Pack tematik (Kaigo, SSW, dan lain-lain) bisa menyusul memakai mesin yang sama.

Jumlah kartu per pack dihitung skrip pembuat pack (bagian 9) dan ditampilkan di Toko.

---

## 4. Pengalaman Pengguna

### 4.1 Pintu masuk Toko
- Tab/tombol **Toko** di Buku Saku (rak buku), dengan saldo pass di pojok: "Pass: 5".
- Seluruh Toko tersembunyi selama `monetization_public = false` (saklar yang sudah ada), kecuali untuk admin.

### 4.2 Halaman Toko
- Kartu per pack: judul, level, jumlah kartu, jumlah ujian sumber, harga pass, status (`Dimiliki` / `Buka · 2 pass`).
- Saldo pass dan kapan pass berikutnya masuk ("3 pass berikutnya: 12 Des").
- Tombol **Tambah Pass** (hanya pengguna Full). Pengguna Basic melihat ajakan "Pass didapat dari donasi bulanan/tahunan" dengan tautan ke halaman Upgrade.

### 4.3 Detail pack
- Deskripsi, daftar bab dan jumlah kartu per bab, daftar ujian sumber.
- **Pratinjau gratis**: 15 kartu pertama dari Bab 1 bisa dicoba lewat runner flashcard tanpa membuka pack. Untuk pengguna Basic, kartu pratinjau level N3 ke atas tetap bisa dilihat di pratinjau (pratinjau adalah iklan).
- Tombol **Buka dengan 2 pass**, lalu dialog konfirmasi: "Buka Kilat N3? Saldo 5 → 3. Pack jadi milikmu selamanya." Dialog lewat `<ViewportPortal>`.
- Saldo kurang: tombol berubah menjadi "Kurang 1 pass · Tambah Pass" (pengguna Full) atau ajakan upgrade (Basic).

### 4.4 Setelah dibuka
- Pack muncul di Buku Saku pada rak **Pack Saya**, ditampilkan seperti buku resmi (`BookDetailView`): per bab, plus "Seluruh Bab".
- Bisa dilatih dengan runner flashcard dan menulis yang sudah ada, dan bisa disalin ke deck pribadi (`cloneChapterToUserDecks`).
- Pack tetap bisa dilatih walau langganan habis. Modal detail kata level terkunci tetap mengikuti gating lunak yang ada.
- Isi pack disimpan di cache lokal sehingga bisa dipakai offline.

### 4.5 Tambah Pass
- Pilih jumlah: 1, 3, 5, atau 10 pass (Rp 7.000 per pass, tanpa diskon bundel di v1).
- Alur pembayaran sama dengan donasi: QRIS statis, nominal unik, klaim, verifikasi manual atau otomatis lewat `/api/payment-notify`.
- Saat disetujui: pass masuk dan surat di Kotak Pos memberi tahu jumlah pass yang diterima.

### 4.6 Desain
Mengikuti `CLAUDE.md`: Washi & Sashiko tanpa gradient (`panel panel-stitched`, `skeuo-grain`, `rpg-badge-reward` untuk harga pass), tanpa ikon/efek sparkle (pakai `Ticket` atau `Package` untuk pass/pack, `Zap` untuk label "Kilat"), semua overlay lewat `ViewportPortal`.

---

## 5. Data (Supabase, semua dengan RLS)

| Tabel | Kolom utama | Akses klien |
|---|---|---|
| `packs` | `id` (slug, mis. `kilat-n3`), `title`, `level`, `description`, `cover_icon`, `price_passes` (int ≥ 1), `item_count`, `chapter_summary` (jsonb: judul + jumlah per bab), `sources` (jsonb: daftar id ujian), `preview` (jsonb: ≤ 15 `DeckItemRef`), `status` (`draft` / `published` / `retired`), `sort_order`, `content_version` (int), `updated_at` | Baca baris `published` saja |
| `pack_contents` | `pack_id` (pk, fk), `book` (jsonb berbentuk `OfficialBook`), `content_version` | **Tidak bisa dibaca langsung.** Hanya lewat RPC `get_pack_contents` |
| `user_packs` | `user_id`, `pack_id`, `unlocked_at`, `passes_spent`, `source` (`purchase` / `admin`), pk (`user_id`, `pack_id`) | Baca baris sendiri. Tulis hanya lewat RPC |
| `pass_wallets` | `user_id` (pk), `balance` (int, `check (balance >= 0)`), `updated_at` | Baca baris sendiri |
| `pass_ledger` | `id`, `user_id`, `delta` (int, ≠ 0), `reason` (`grant_monthly` / `grant_yearly` / `grant_lifetime_unit` / `grant_lifetime` / `purchase` / `spend` / `admin`), `order_id`, `pack_id`, `drip_id`, `note`, `created_at` | Baca baris sendiri |
| `pass_drips` | `id`, `user_id`, `kind` (`yearly` / `lifetime`), `source_order_id`, `starts_at`, `interval_days` (30), `passes_per_tranche` (3), `tranches_total` (12, atau null = tanpa batas), `tranches_granted` | Baca baris sendiri |

Catatan:
- `pass_wallets.balance` adalah saldo yang dikunci (`select … for update`) saat transaksi. `pass_ledger` adalah jejak audit; invarian `balance = sum(delta)` diuji di tes SQL/skrip audit.
- Unik: `pass_ledger (order_id) where reason = 'purchase'` dan `(drip_id, tranche)` supaya pemberian tidak terjadi dua kali.
- `payment_orders.tier_code` mendapat nilai baru `pass`, `period_months = 0`, dan kolom baru `quantity int` (jumlah pass).

---

## 6. RPC (`SECURITY DEFINER`, pola yang sama dengan migrasi monetisasi)

| RPC | Siapa | Isi |
|---|---|---|
| `grant_passes_internal(user, delta, reason, order, drip, note)` | internal | Upsert `pass_wallets`, tambah saldo, tulis ledger |
| `sync_pass_drips_internal(user)` | internal | Untuk tiap drip milik user: tahap jatuh tempo = `min(tranches_total, floor((now - starts_at) / interval) + 1)`; berikan selisih dengan `tranches_granted`. Idempoten |
| `get_my_pass_state()` | authenticated | Panggil `sync_pass_drips_internal`, kembalikan `balance`, `next_grant_at`, `next_grant_amount`, `can_buy` (akses Full aktif) |
| `get_store_catalog()` | authenticated | Pack `published` + `owned` per pack + `get_my_pass_state()` dalam satu panggilan |
| `unlock_pack(pack_id)` | authenticated | Lock dompet, tolak bila `already_owned` / `pack_not_available` / `insufficient_passes`, kurangi saldo, insert `user_packs` + ledger `spend`, kembalikan isi pack. Satu transaksi |
| `get_pack_contents(pack_id)` | authenticated | Kembalikan `pack_contents.book` + `content_version` hanya bila pemanggil memiliki pack (atau admin). Selain itu `not_owned` |
| `list_my_packs()` | authenticated | `pack_id` + `content_version` milik user, untuk sinkron cache |
| `admin_upsert_pack(meta, book)` | admin | Buat/ubah pack, naikkan `content_version` bila isi berubah |
| `admin_grant_passes(user, delta, note)` | admin | Kompensasi/refund; delta negatif tidak boleh membuat saldo < 0 |

Perubahan pada fungsi yang sudah ada (diubah dari definisi **terbaru**, bukan dari migrasi lama):
- `donation_config()`: tambah `pass_price_idr` (7000), `pass_monthly` (3), `pass_yearly_tranche` (3), `pass_yearly_tranches` (12), `pass_lifetime_unit` (3), `pass_lifetime_drip` (3), `pass_max_per_order` (20).
- `apply_donation_internal`: setelah `monthly_grants` tercatat → `grant_passes_internal(…, 3, 'grant_monthly')`; setelah yearly → insert `pass_drips` (12 tahap) lalu `sync_pass_drips_internal`; setelah setoran lifetime → 3 pass; saat baris `lifetime` dibuat → insert `pass_drips` tanpa batas. Karena penukaran key juga lewat fungsi ini, gift otomatis ikut.
- `create_payment_order`: terima `p_kind = 'pass'` dengan `p_amount = quantity × 7000`, `quantity` 1–20, wajib akses Full aktif (`not_full`), `as_gift` ditolak.
- `approve_order_internal` (versi dari `20261119c_donation_gift_letters.sql`): untuk `tier_code = 'pass'` jangan buat access key dan jangan panggil `apply_donation_internal`; panggil `grant_passes_internal(…, quantity, 'purchase', order)`, lalu kirim surat Kotak Pos jenis pass.
- `entitlement_for`: tambah `pass_balance` agar klien bisa menampilkan saldo tanpa panggilan tambahan.
- `get_donor_board` dan `lifetime_total_for` **tidak** berubah (pembelian pass bukan donasi).

Migrasi pengguna lama: satu kali saat rilis, beri pass untuk bulan berjalan ke semua yang punya `monthly_grants` bulan ini, dan buat `pass_drips` untuk pembeli tahunan aktif (starts_at = tanggal persetujuan aslinya, sehingga tahap yang sudah lewat langsung diberikan) dan pemegang Lifetime.

---

## 7. Klien

| Bagian | Lokasi |
|---|---|
| Tipe `StorePack`, `PassState`, parser respons RPC (murni, teruji) | `src/lib/store.ts`, `src/lib/storeCore.ts`, `src/lib/storeCore.test.ts` |
| Konteks/hook Toko: katalog, saldo, `unlockPack`, cache isi pack | `src/state/store.tsx` |
| Cache isi pack | `localStorage` key baru di `src/state/storageKeys.ts`, dibungkus `try/catch`; diperbarui bila `content_version` di `list_my_packs` lebih baru |
| Halaman Toko + detail pack + dialog buka | `src/components/store/StoreView.tsx`, `PackDetailView.tsx`, `UnlockPackDialog.tsx` |
| Tambah Pass | Mode baru di `src/components/billing/UpgradeModal.tsx` (pakai alur QRIS yang ada) |
| Rak "Pack Saya" | `src/components/deck/BukuSakuView.tsx` + `BookshelfView.tsx` (pack dirender sebagai `OfficialBook`) |
| Admin: kelola pack, beri pass | Tab baru di `src/components/billing/AdminPaymentsModal.tsx` |
| Gating | `src/utils/access.ts`: `canBuyPasses(ent)`; runner Buku Saku mengizinkan item dari pack milik user |

Offline: tanpa koneksi, Toko menampilkan "Butuh koneksi", tetapi pack yang sudah dimiliki tetap bisa dilatih dari cache.

---

## 8. Keamanan & Gating

- Isi pack (`pack_contents`) hanya keluar lewat `get_pack_contents` yang memeriksa `user_packs`. Isi pack **tidak** dibundel di JS dan tidak ada di `src/data/`. Ini gating keras untuk kurasinya.
- Data kata di balik `DeckItemRef` tetap dibundel (gating lunak, sesuai PRD Monetisasi 6.4). Pengguna teknis bisa melihat kata level tinggi, tetapi tidak mendapatkan daftar kurasi tanpa membuka pack.
- Saldo hanya berubah lewat RPC `SECURITY DEFINER`. Klien tidak punya izin tulis ke `pass_wallets`, `pass_ledger`, `user_packs`.
- `unlock_pack` dan pemberian pass dikunci per dompet untuk mencegah klik ganda/race (pola dari `20261108_payment_concurrency.sql`).
- `pass_max_per_order` membatasi kerugian bila pesanan salah disetujui.

---

## 9. Pembuatan Isi Pack

Skrip `scripts/build_pack.ts` (dijalankan pemilik, bukan bagian build app):

1. Baca semua file tryout resmi untuk satu level dari `src/data/tryouts/official/`.
2. Ambil kandidat kata dari bagian `mojiGoi`: setiap opsi jawaban (jawaban benar dan pengecoh), plus kata di dalam `「」` pada `explanation`. Catat ujian sumber dan peran (jawaban / pengecoh).
3. Normalisasi (bentuk kamus untuk opsi berkonjugasi seperti `くばった` → `配る`, memakai `src/engine/morphology`) lalu cocokkan ke data kotoba di `src/data/db/` lewat kanji + bacaan.
4. Hitung frekuensi lintas ujian, kelompokkan ke bab (Wajib ≥ 3, Sering = 2, Pernah = 1), isi `notes`.
5. Tulis laporan kata yang tidak cocok ke kamus (untuk ditinjau manual) dan file JSON berbentuk `OfficialBook` di folder yang di-ignore git (`scripts/out/`).
6. Pemilik meninjau, lalu mengunggah lewat halaman admin (`admin_upsert_pack`).

File hasil skrip **tidak boleh di-commit** ke repo agar isi kurasi tidak bocor lewat repo atau bundle.

Pembaruan: saat ujian baru ditambahkan (mis. N3 2026-07), jalankan ulang skrip, unggah, `content_version` naik, dan pemilik pack mendapat isi terbaru tanpa bayar lagi.

Hak cipta: pack hanya berisi referensi ke kata di kamus app (JMdict) beserta catatan frekuensi. Pack tidak memuat kalimat soal ujian.

---

## 10. Kasus Tepi

| Kasus | Perilaku |
|---|---|
| Klik "Buka" dua kali | Panggilan kedua mendapat `already_owned`, saldo tidak berkurang dua kali |
| Pack ditarik (`retired`) | Tidak tampil di Toko; pemilik tetap bisa membuka dan melatihnya |
| Harga pack berubah | Pemilik lama tidak terpengaruh; `passes_spent` mencatat harga saat dibuka |
| Langganan habis dengan sisa pass | Saldo tetap; boleh membuka pack; tidak bisa membeli pass baru |
| Tahunan lalu upgrade ke Lifetime | Drip tahunan tetap berjalan sampai 12 tahap; drip Lifetime mulai saat status Lifetime tercatat |
| Pesanan pass disetujui padahal user sudah tidak Full | Tetap diberikan (pembayaran sudah terjadi) |
| Refund | Pack yang sudah dibuka tidak bisa dikembalikan. Admin bisa mengembalikan pass lewat `admin_grant_passes` |
| Pengguna menghapus akun | Mengikuti aturan hapus akun yang ada; dompet dan pack ikut terhapus (`on delete cascade`) |

---

## 11. Metrik

- Persentase pengguna Full yang membuka minimal satu pack dalam 30 hari.
- Rasio pass jatah yang dipakai vs menumpuk (bila banyak menumpuk, katalog kurang menarik).
- Pembelian pass tambahan per 100 pengguna Full per bulan.
- Konversi pratinjau → buka pack, per pack.
- Pengaruh ke perpanjangan donasi bulanan (target: naik dibanding sebelum Toko).

---

## 12. Risiko

| Risiko | Mitigasi |
|---|---|
| Katalog terlalu kecil, pass menumpuk tanpa guna | Rilis dengan 3 pack Kilat, tambah pack tematik tiap bulan; pantau metrik rasio pass |
| Kualitas pencocokan kata otomatis buruk | Laporan kata tak cocok + tinjauan manual sebelum unggah |
| Daftar kurasi bocor (dibagikan di grup) | Diterima; nilai utama ada di pengalaman latihan dalam app dan pembaruan isi |
| Pengguna merasa "sudah bayar Full, kok masih bayar lagi" | Jatah pass bulanan cukup untuk membuka pack baru tiap bulan; komunikasi "pass sudah termasuk di donasimu" |
| Penjualan pass mengubah sifat "donasi" secara hukum/pajak dan ketentuan GoPay Merchant | Cek ketentuan merchant untuk penjualan produk digital sebelum rilis (lanjutan butir Risiko PRD Monetisasi) |

---

## 13. Tahapan Implementasi

1. **Migrasi** `supabase/migrations/2026xxxx_store_packs.sql`: tabel, RLS, RPC, perubahan fungsi pembayaran, backfill pengguna lama. Idempoten.
2. **Lapisan murni + tes**: `storeCore.ts` (parser, `canBuyPasses`, perhitungan tahap drip versi klien untuk tampilan) dan tesnya, masuk `npm test`.
3. **Skrip pembuat pack** + uji dengan Kilat N3, tinjau hasil, unggah ke proyek Supabase.
4. **UI Toko, detail, dialog buka, rak Pack Saya**, di balik saklar `monetization_public`.
5. **Tambah Pass** di `UpgradeModal` + surat Kotak Pos + tab admin.
6. Uji end-to-end: donasi bulanan → 3 pass; tahunan → 3 pass lalu simulasi 30 hari; beli pass dengan transaksi nyata nominal kecil; buka pack; offline; langganan habis.
7. Uji UI sesuai standar viewport (mobile/desktop, layar pendek, posisi gulir atas/tengah/bawah, buka-tutup berulang).

---

## 14. Pertanyaan Terbuka

Semua pertanyaan v0.1 sudah diputuskan (bagian 0, butir 6–10). Pertanyaan v0.2:
1. (Diputuskan v0.3) Kata ujian yang belum ada di kamus ditambahkan: 114 entri baru dari JMdict dengan arti Indonesia (tag `ujian-jlpt`, `scripts/jmdict/exam_words.py`). Sisa yang tidak cocok sebagian besar kanji karangan (pengecoh soal 表記), homonim kana yang seri (うつった), atau tebakan 言い換え.
2. (Diputuskan v0.3) Kilat N1 tetap 3 pass walau katanya lebih sedikit (±360) dibanding N3 (±600).

---

## 15. Status Implementasi

| Bagian | Lokasi | Status |
|---|---|---|
| Skema, RLS, RPC, perubahan alur pembayaran, backfill | `supabase/migrations/20261127_store_packs.sql`, `20261127b_pack_preview_all_chapters.sql` | **Diterapkan** ke produksi 27 Nov 2026 (backfill: 24 dompet, 78 pass) |
| Tes SQL (43 cek alur + backfill) di Postgres lokal | `supabase/tests/`, jalankan `bash supabase/tests/run_local.sh` | Lulus |
| Pembuat isi pack + tes | `scripts/packs/packBuilder.ts`, `scripts/packs/build_pack.ts`, `scripts/packs/packBuilder.test.ts` | Selesai |
| Lapisan murni klien + tes | `src/lib/storeCore.ts`, `src/lib/storeCore.test.ts`; `passBalance` dan `canBuyPasses` di `src/utils/access.ts` | Selesai |
| Kilat N3/N2/N1 diunggah sebagai **draft** (hanya admin) | `packs`, `pack_contents` | Selesai, menunggu diterbitkan |
| UI Toko (tab ketiga Buku Saku), detail pack + pratinjau gratis, dialog buka, Pack Saya | `src/components/store/`, `src/state/store.tsx`, `src/lib/store.ts`, `BukuSakuView.tsx` | Selesai |
| Tambah Pass (tab Pass di Upgrade), kotak hadiah surat `pass` | `UpgradeModal.tsx`, `GiftBox.tsx`, `mailCore.ts` | Selesai |
| Tab admin kelola pack & beri pass | `AdminPaymentsModal.tsx` | Belum (sementara lewat `upload.sql` dan `admin_grant_passes` di SQL) |

Membuat isi pack:

```bash
npx tsx scripts/packs/build_pack.ts N3
```

Hasil di `scripts/packs/out/kilat-n3/` (di-ignore git): `book.json`, `meta.json`, `report.md`, dan `upload.sql`. Jalankan `upload.sql` di Supabase SQL Editor untuk mengunggah pack sebagai draft (hanya terlihat admin); terbitkan dengan baris yang tertulis di kepala file itu.

Hasil build (setelah 114 kata ujian ditambahkan ke kamus):

| Pack | Ujian | Kata | Bab | Tidak cocok ke kamus | Tebakan 言い換え (tidak dimasukkan) |
|---|---|---|---|---|---|
| Kilat N3 | 10 | 598 | Wajib 30, Sering 102, Pernah 466 | 10 | 30 |
| Kilat N2 | 8 | 479 | Wajib 2, Sering 30, Pernah 447 | 8 | 35 |
| Kilat N1 | 7 | 360 | Sering 22, Pernah 338 | 12 | 34 |
