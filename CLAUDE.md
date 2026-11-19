# SevnQuest

## ATURAN UTAMA — DILARANG SPARKLE

Aturan ini berlaku untuk **setiap** perubahan, fitur baru, dan update, tanpa pengecualian:

- **Jangan pernah** memakai ikon, emoji, simbol, atau efek "sparkle"/berkilau di mana pun:
  - ikon lucide `Sparkle`, `Sparkles`, `WandSparkles`, atau varian `*Sparkle*` lainnya
  - emoji/simbol ✨ 🌟 💫 ✦ ✧ ❇ ❈ ⁂ dan sejenisnya
  - nama ikon string seperti `'sparkle'` / `'sparkles'`
  - animasi berkilau / twinkle / glitter
- Ini termasuk teks UI, data konten, pesan, pengumuman, dan dokumen yang tampil ke pengguna.
- Untuk menandai "baru", "AI", "update", atau "spesial", pakai ikon lain yang sesuai makna,
  misalnya `Rocket`, `Bot`, `Lightbulb`, `Atom`, `Zap`, `Star`, `Megaphone`, `Wand`.
- Pengecualian satu-satunya: teks arti kata di data kamus (`src/data/db/`, mis. "Sparkle" sebagai
  terjemahan kanji 輝), karena itu isi kamus, bukan elemen visual.

Aturan ini dijaga otomatis oleh `src/utils/noSparkle.test.ts` (ikut `npm test` dan CI).
Jika tes itu gagal, hapus sparkle-nya — **jangan** melonggarkan atau menonaktifkan tesnya.

## ATURAN UTAMA — VIEWPORT & POSITIONING INTEGRITY

> "Every UI component must behave correctly within its intended viewport, regardless of document
> scroll position, parent layout, or device dimensions."

Standar permanen untuk **setiap** UI baru dan setiap perubahan UI lama. Dokumen lengkap (pola, skala
z-index, hasil audit): `docs/architecture/UI_POSITIONING_STANDARD.md`. Ringkasnya:

- **Overlay layar penuh** (modal, dialog, popup, konfirmasi, bottom sheet, drawer, loading/onboarding
  overlay) **wajib** dirender lewat `<ViewportPortal>` (`src/components/ui/ViewportPortal.tsx`) ke
  `document.body`. Jangan mengandalkan `position: fixed` di tempat: leluhur ber-`transform`,
  `will-change: transform`, `filter`, `perspective`, `contain`, atau `backdrop-filter` membuatnya
  menempel ke leluhur itu dan muncul di luar layar setelah halaman digulir.
- Latar overlay: `fixed inset-0 … overflow-y-auto overscroll-contain`; dialog: `my-auto` (+ `max-h-[..dvh]`
  bila panjang). Konten yang lebih tinggi dari layar digulir di dalam overlay, bukan halaman.
- **Kunci gulir** hanya lewat `ViewportPortal` / `useBodyScrollLock` (ref-count). Dilarang menulis
  `document.body.style.overflow` langsung.
- **Pembungkus tata letak** (`main`, `.tab-views-container`, `.animate-tab-enter`, dst.) tidak boleh
  mendapat `transform`/`will-change: transform`/`filter`/`perspective`/`contain` yang menetap.
- Ikuti **skala z-index** di dokumen standar; overlay yang dibuka dari dalam overlay lain harus di
  lapisan yang lebih tinggi. Dropdown: menu `absolute` + lapisan penutup inline `data-dismiss-layer`.
- Elemen yang mengambang di atas navigasi bawah memperhitungkan tingginya + `env(safe-area-inset-bottom)`.
- Sebelum menyatakan selesai: uji di mobile & desktop, layar pendek (landscape), posisi gulir
  atas/tengah/bawah, dan buka-tutup berulang. Jangan anggap selesai hanya karena benar di atas halaman.

Dijaga otomatis oleh `src/utils/viewportPositioning.test.ts` dan `src/utils/scrollLock.test.ts`
(ikut `npm test`). Jika gagal, perbaiki komponennya — **jangan** melonggarkan tesnya.
