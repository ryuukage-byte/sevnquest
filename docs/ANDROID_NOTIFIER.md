# SevnQuest Notifier (aplikasi Android)

SevnQuest Notifier adalah aplikasi Android kecil untuk HP admin. Tugasnya satu: membaca notifikasi
"uang masuk" dari aplikasi GoPay / GoPay Merchant di HP itu, lalu meneruskannya ke server SevnQuest
(`POST /api/payment-notify`) supaya pesanan donasi yang nominalnya cocok disetujui otomatis.

Aplikasi ini menggantikan makro MacroDroid yang sebelumnya dipakai untuk pekerjaan yang sama.

> Aplikasi ini hanya untuk HP milik pemilik akun merchant GoPay itu sendiri. Jangan dipasang di HP
> orang lain, dan jangan dipakai untuk membaca notifikasi milik orang lain.

Kode sumber ada di [`android/`](../android). APK dibangun otomatis oleh GitHub Actions
(`.github/workflows/android.yml`).

## Cara kerja singkat

1. GoPay / GoPay Merchant menampilkan notifikasi pembayaran masuk di HP admin.
2. SevnQuest Notifier menangkap notifikasi itu. Hanya notifikasi dari aplikasi yang ada di daftar
   pantau, dan hanya yang memuat nominal rupiah (`Rp` atau `IDR` diikuti angka), yang diproses.
   Notifikasi aplikasi lain (WhatsApp, bank, dan sebagainya) tidak dibaca dan tidak dikirim.
3. Judul dan isi notifikasi dikirim ke server SevnQuest bersama kunci webhook.
4. Server yang memutuskan: apakah itu uang masuk, berapa nominalnya, dan pesanan mana yang cocok.
   Hasilnya (disetujui, tidak cocok, dan seterusnya) tampil di log aplikasi.

Bila HP sedang tidak ada sinyal, kiriman disimpan di antrean di penyimpanan HP dan dikirim otomatis
begitu jaringan kembali. Kiriman yang sudah lebih dari 48 jam dibuang, karena server hanya
mencocokkan pesanan berumur paling lama 48 jam.

## Mengunduh APK

APK tidak ada di Play Store. Unduh dari GitHub Actions:

1. Buka repo SevnQuest di GitHub, masuk ke tab **Actions**.
2. Pilih workflow **Android** di daftar kiri.
3. Buka run terbaru yang berhasil (centang hijau) di branch `main`. Bila belum ada, tekan
   **Run workflow** untuk menjalankannya secara manual.
4. Di bagian **Artifacts** paling bawah, unduh `sevnquest-notifier-apk`.
5. Hasil unduhan berupa berkas zip. Ekstrak, di dalamnya ada `sevnquest-notifier.apk`.

Mengunduh artifact memerlukan login GitHub dengan akses ke repo. Artifact disimpan GitHub selama
masa retensi repo (bawaan 90 hari); bila sudah kedaluwarsa, jalankan lagi workflow-nya.

## Memasang

1. Pindahkan `sevnquest-notifier.apk` ke HP Android admin (Android 8.0 atau lebih baru).
2. Buka berkas APK dari aplikasi pengelola berkas. Android akan meminta izin "pasang aplikasi dari
   sumber ini" untuk aplikasi pengelola berkas tersebut; izinkan, lalu lanjutkan pemasangan.
3. Bila Play Protect menampilkan peringatan aplikasi tidak dikenal, pilih tetap pasang. Ini wajar
   untuk APK yang dipasang di luar Play Store.

### Tentang tanda tangan APK

APK ditandatangani dengan keystore debug tetap yang ikut di repo
(`android/keystore/debug.keystore`, sandi `android`, alias `androiddebugkey`). Karena kuncinya
selalu sama, APK dari build mana pun bisa dipasang menimpa versi sebelumnya tanpa uninstall, dan
pengaturan tidak hilang.

Ini adalah kunci debug untuk sideload pribadi, bukan kunci rilis. Sandinya terbuka di repo, jadi
tanda tangan ini tidak membuktikan siapa pembuat APK. Jangan dipakai untuk rilis Play Store, dan
selalu ambil APK dari artifact GitHub Actions repo sendiri, bukan dari kiriman orang lain.

Catatan: `versionCode` APK dari GitHub Actions mengikuti nomor run workflow. APK hasil build lokal
memakai `versionCode` 1, sehingga tidak bisa dipasang menimpa APK dari Actions (Android menolak
penurunan versi).

## Menghubungkan ke SevnQuest

Cara termudah (lewat tautan):

1. Di HP yang sama, buka SevnQuest di browser dan masuk sebagai admin.
2. Buka halaman admin **Verifikasi Pembayaran**.
3. Buat kunci webhook baru.
4. Ketuk tombol hubungkan ke SevnQuest Notifier. Browser akan membuka aplikasi lewat tautan
   `sevnquest-notifier://setup?url=...&key=...`.
5. Aplikasi menampilkan layar konfirmasi berisi alamat server tujuan. Periksa bahwa itu memang
   domain SevnQuest, lalu ketuk **Hubungkan**.

Cara manual:

1. Buka SevnQuest Notifier, bagian **Koneksi server**, ketuk **Ubah URL dan kunci**.
2. Isi URL endpoint, misalnya `https://domain-anda/api/payment-notify`. Hanya `https://` yang
   diterima.
3. Tempel kunci webhook dari halaman admin, lalu **Simpan**.

Setelah terhubung:

1. Di bagian **Akses notifikasi**, ketuk **Buka pengaturan akses notifikasi** dan nyalakan
   SevnQuest Notifier (lihat catatan Android 13 di bawah bila pilihannya abu-abu).
2. Di bagian **Optimasi baterai**, ketuk **Minta pengecualian** dan izinkan.
3. Ketuk **Kirim uji**. Aplikasi mengirim teks "Tes koneksi SevnQuest Notifier" (tanpa nominal).
   Bila berhasil, tertulis bahwa server menerima kiriman dan kunci valid (`no_amount`). Uji ini
   tidak menyetujui pesanan apa pun.
4. Matikan makro MacroDroid yang lama supaya notifikasi tidak dikirim dua kali.

### Android 13 ke atas: "setelan terbatas"

Untuk aplikasi yang dipasang dari berkas APK, Android 13 ke atas mengunci izin akses notifikasi.
Pilihan SevnQuest Notifier tampil abu-abu dan muncul pesan setelan terbatas. Cara membukanya:

1. Coba nyalakan dulu akses notifikasi sampai pesan "setelan terbatas" muncul.
2. Buka **Setelan > Aplikasi > SevnQuest Notifier** (atau ketuk **Buka Info aplikasi** di aplikasi).
3. Ketuk menu titik tiga di kanan atas, pilih **Izinkan setelan terbatas**, lalu konfirmasi dengan
   PIN atau sidik jari.
4. Kembali ke pengaturan akses notifikasi dan nyalakan SevnQuest Notifier.

Letak menu bisa sedikit berbeda antar merek HP.

## Aplikasi yang dipantau

Daftar bawaan:

| Aplikasi | Nama paket |
| --- | --- |
| GoPay Merchant | `com.gojek.gopaymerchant` |
| GoPay | `com.gojek.gopay` |
| Gojek | `com.gojek.app` |
| GoBiz (kini GoFood Merchant) | `com.gojek.resto` |

Daftar ini bisa diubah di bagian **Aplikasi yang dipantau** (satu nama paket per baris). Bila
notifikasi pembayaran ternyata datang dari aplikasi dengan nama paket lain, tambahkan di sana.
Nama paket terlihat di alamat halaman Play Store aplikasi tersebut, setelah `id=`. Aplikasi bawaan
yang terdeteksi terpasang diberi keterangan "(terpasang)".

## Izin yang diminta dan alasannya

| Izin | Alasan |
| --- | --- |
| Akses notifikasi (diberikan manual di Setelan) | Membaca notifikasi pembayaran dari aplikasi yang dipantau. Tanpa ini aplikasi tidak berfungsi. |
| `INTERNET` | Mengirim notifikasi pembayaran ke server SevnQuest. |
| `ACCESS_NETWORK_STATE` | Wajib sejak Android 14 supaya pengiriman ulang bisa dijadwalkan "saat ada jaringan". |
| `RECEIVE_BOOT_COMPLETED` | Melanjutkan antrean yang tertunda setelah HP dinyalakan ulang. |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Menampilkan dialog pengecualian optimasi baterai supaya layanan tidak dimatikan sistem. |

Aplikasi tidak meminta izin lokasi, kontak, penyimpanan, SMS, atau kamera, dan tidak menampilkan
notifikasinya sendiri.

## Privasi dan keamanan

- Notifikasi dari aplikasi di luar daftar pantau tidak dibaca isinya dan tidak pernah dikirim.
- Dari aplikasi yang dipantau, hanya notifikasi yang memuat nominal rupiah yang dikirim. Promo dan
  pengumuman tanpa nominal diabaikan.
- Kunci webhook disimpan di penyimpanan privat aplikasi, ditampilkan tersamar, tidak ditulis ke
  logcat, dan tidak ikut cadangan (`allowBackup="false"`).
- Log di aplikasi hanya menyimpan waktu, nama paket sumber, nominal, dan hasil dari server, bukan
  isi notifikasi.
- Koneksi hanya lewat HTTPS.
- Tautan pemasangan selalu meminta konfirmasi dan menampilkan alamat server tujuan sebelum
  menyimpan apa pun. Bila tautan seperti itu terbuka tanpa Anda minta, tekan **Batal**.
- Siapa pun yang memegang kunci webhook bisa mengirim notifikasi palsu ke server. Bila HP hilang
  atau kunci bocor, buat kunci baru di halaman admin (kunci lama otomatis tidak berlaku), lalu
  hubungkan ulang.

## Agar tidak dimatikan sistem

Banyak HP mematikan aplikasi latar belakang secara agresif. Lakukan ini sekali setelah memasang:

- **Semua HP**: izinkan pengecualian optimasi baterai dari tombol di aplikasi. Jangan menutup
  paksa (Force stop) aplikasi; setelah ditutup paksa, Android tidak menjalankannya lagi sampai
  dibuka manual.
- **Xiaomi / Redmi / POCO (MIUI, HyperOS)**: Setelan > Aplikasi > Kelola aplikasi > SevnQuest
  Notifier. Nyalakan **Mulai otomatis (Autostart)**, lalu di **Penghemat baterai** pilih **Tanpa
  batasan**. Di layar aplikasi terbaru, tahan kartu aplikasi dan ketuk ikon gembok.
- **Oppo / Realme (ColorOS, realme UI)**: Setelan > Aplikasi > Kelola aplikasi > SevnQuest
  Notifier > Penggunaan baterai. Nyalakan **Izinkan aktivitas latar belakang** dan **Izinkan mulai
  otomatis**. Kunci aplikasi di layar aplikasi terbaru.
- **Vivo / iQOO (Funtouch OS, OriginOS)**: Setelan > Baterai > Pengelolaan konsumsi daya latar
  belakang > SevnQuest Notifier, pilih **Jangan batasi**. Lalu Setelan > Aplikasi > Mulai otomatis,
  nyalakan untuk SevnQuest Notifier.
- **Samsung (One UI)**: Setelan > Aplikasi > SevnQuest Notifier > Baterai, pilih **Tidak
  dibatasi**. Lalu Setelan > Baterai > Batas penggunaan latar belakang, pastikan aplikasi tidak
  masuk daftar **Aplikasi tidur** atau **Aplikasi tidur nyenyak** (tambahkan ke **Aplikasi yang
  tidak pernah tidur**).

Nama menu bisa berbeda tergantung versi sistem. Setelah itu, sesekali buka aplikasi dan pastikan
bagian **Akses notifikasi** bertuliskan "Diizinkan, layanan aktif".

## Arti hasil di log

| Hasil | Arti |
| --- | --- |
| Disetujui (SQ-XXXXXX) | Nominal cocok dengan satu pesanan; pesanan itu disetujui. |
| Tidak ada pesanan yang cocok | Server membaca nominalnya, tetapi tidak ada pesanan tertunda dengan nominal itu. |
| Lebih dari satu pesanan cocok | Ada beberapa pesanan dengan nominal sama; periksa manual di halaman admin. |
| Bukan uang masuk atau tanpa nominal | Server menilai notifikasi itu bukan uang masuk (misalnya pembayaran keluar). |
| Tertunda, akan dicoba lagi | Jaringan atau server bermasalah. Dicoba ulang otomatis dengan jeda yang makin panjang (15 detik sampai 30 menit). |
| Kunci ditolak server | Kunci salah atau sudah diganti. Pengiriman berhenti dan kiriman ditahan di antrean sampai kunci diperbaiki. |
| Lebih dari 48 jam tidak terkirim, dibuang | Kiriman terlalu lama tertunda sehingga tidak berguna lagi. |

## Keterbatasan

- **Bergantung pada format notifikasi GoPay.** Aplikasi hanya meneruskan teks notifikasi; server
  yang mengenali kalimat uang masuk dan nominalnya. Bila GoPay mengubah kalimat notifikasi atau
  berhenti menampilkan nominal, pencocokan otomatis bisa gagal sampai aturan di server
  diperbarui. Verifikasi manual di halaman admin tetap tersedia.
- **Notifikasi GoPay harus muncul.** Bila notifikasi aplikasi GoPay dimatikan di Setelan, atau
  mode Jangan Ganggu menyembunyikannya, tidak ada yang bisa diteruskan.
- **HP harus menyala dan online.** Saat HP mati, tidak ada notifikasi yang masuk. Saat offline,
  kiriman menunggu di antrean (paling banyak 200 kiriman, paling lama 48 jam).
- **Android saja.** iOS tidak mengizinkan aplikasi membaca notifikasi aplikasi lain.
- **Satu notifikasi untuk beberapa pembayaran.** Bila GoPay menggabungkan beberapa pembayaran
  dalam satu notifikasi ringkasan, hanya notifikasi per pembayaran yang diteruskan.
- **Bukan aplikasi resmi GoPay atau GoTo.** Tidak ada akses ke saldo atau akun; aplikasi hanya
  membaca teks notifikasi yang tampil di HP.

## Untuk pengembang

Struktur:

- `android/core` : modul Kotlin/JVM murni (tanpa Android). Berisi filter paket, deteksi nominal
  rupiah, dedup, pembentukan body JSON, parsing respons, kebijakan retry, parsing tautan
  pemasangan, antrean persisten, log, dan pengirim HTTP. Seluruhnya punya unit test JUnit.
- `android/app` : aplikasi Android (layanan pendengar notifikasi, JobScheduler untuk kirim ulang,
  layar utama, layar konfirmasi tautan). Tanpa AndroidX, tanpa Compose, tanpa pustaka pihak ketiga.

Versi alat: Android Gradle Plugin 9.5.1, Gradle 9.6.1 (wrapper), Kotlin 2.4.10, JDK 17,
compileSdk dan targetSdk 37, minSdk 26.

Perintah (dijalankan dari `android/`):

```bash
# Unit test logika. Berjalan tanpa Android SDK.
./gradlew :core:test

# APK debug. Memerlukan Android SDK (ANDROID_HOME atau sdk.dir di local.properties).
./gradlew :app:assembleDebug
```

Bila Android SDK tidak ditemukan, `settings.gradle.kts` otomatis masuk mode "core saja": modul
`:app` dan plugin Android tidak dimuat. Mode ini bisa dipaksa dengan `-PcoreOnly=true` atau
`-PcoreOnly=false`.

Kontrak dengan server:

- Request: `POST <endpoint>` dengan header `Content-Type: application/json` dan
  `X-Webhook-Key: <kunci>`, body
  `{"title": "...", "text": "...", "package": "...", "posted_at": <epoch ms>}`.
- `200` dengan `{"amount", "result", "order_code"?}` : selesai, dicatat di log.
- `401` : kunci salah. Tidak dicoba ulang; pengiriman berhenti sampai kunci diganti.
- `429`, `5xx`, galat jaringan : dicoba ulang dengan backoff.
- Jawaban `2xx` tanpa `result` yang dikenal (misalnya halaman HTML karena URL salah) tidak dianggap
  terkirim, supaya notifikasi pembayaran tidak hilang diam-diam.
