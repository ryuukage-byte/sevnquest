# GLOBAL UI POSITIONING STANDARD — SevnQuest

> **"Every UI component must behave correctly within its intended viewport, regardless of document
> scroll position, parent layout, or device dimensions."**

Status: **standar permanen** (berlaku untuk semua fitur baru dan setiap perubahan UI lama).
Diringkas juga di `CLAUDE.md` agar selalu dibaca AI coding agent. Dijaga otomatis oleh
`src/utils/viewportPositioning.test.ts` dan `src/utils/scrollLock.test.ts` (ikut `npm test`).

---

## 1. Kenapa standar ini ada (root cause bug modal Library)

Di Library → Kotoba → Level N1, mengetuk kotoba yang terkunci memunculkan modal *"Kotoba N1
terkunci"* **di luar layar**: pengguna harus menggulir dulu untuk melihatnya.

Akar masalah (terverifikasi di browser, lihat §7):

1. `.animate-tab-enter` (kelas pembungkus **setiap tab**) memakai `will-change: opacity, transform`
   yang **menetap** setelah animasi selesai.
2. Menurut spesifikasi CSS, elemen dengan `transform`, `will-change: transform`, `filter`,
   `perspective`, `contain: paint/layout`, atau `backdrop-filter` menjadi **containing block**
   untuk turunan `position: fixed`.
3. `LockedOverlay` (`fixed inset-0`) dirender **di tempat** (tanpa portal) dari dalam tab Library.
   Akibatnya `inset-0` diukur terhadap pembungkus tab setinggi ±8.000px, bukan terhadap layar,
   dan `items-center` menaruh modal di tengah pembungkus itu.

Hasil ukur sebelum perbaikan (360×740, `scrollY` 1800): overlay `top:-1724, height:7957`,
modal di `y=2110` (layar hanya 740px). Sesudah: overlay `top:0, height:740`, modal `225–515`.

Bug yang sama mengenai **semua** overlay non-portal di dalam tab (Panduan di Beranda, pengumuman
dari banner Beranda, modal Isi Cepat Preset di Buku Saku, modal mulai ujian di Bank Soal, dst.),
jadi perbaikannya dilakukan di level arsitektur, bukan per modal.

---

## 2. Aturan (A–G)

| | Aturan | Implementasi wajib |
|---|---|---|
| **A** | **Viewport awareness** — overlay/floating tidak bergantung pada posisi gulir dokumen. | Overlay layar penuh dirender lewat `<ViewportPortal>` ke `document.body`. |
| **B** | **Positioning consistency** — strategi posisi sesuai fungsi. | `fixed` + portal untuk elemen milik layar; `absolute` hanya untuk elemen yang memang menempel ke pemicunya (dropdown, badge); `sticky` untuk bar yang mengikuti alur konten. |
| **C** | **Scroll independence** — tampil benar di posisi gulir mana pun. | Jangan pernah menghitung posisi overlay dari `scrollY`. Tanpa `transform`/`filter`/`will-change` menetap pada pembungkus tata letak. |
| **D** | **Responsive by default** — desktop & mobile, termasuk tinggi terbatas & keyboard virtual. | Latar overlay `overflow-y-auto overscroll-contain`; dialog `my-auto`; konten panjang memakai `max-h-[..dvh]` + gulir internal. |
| **E** | **No clipping** — tidak terpotong `overflow`, `transform`, atau stacking context. | Portal + skala z-index (§4). Dropdown tidak boleh di dalam induk `overflow-hidden`. |
| **F** | **Component reusability** — perilaku seragam. | `ViewportPortal`, `useBodyScrollLock`, pola markup §3. Jangan membuat portal/kunci gulir sendiri. |
| **G** | **Regression prevention** — setiap perbaikan disertai tes. | Tambah/ubah tes di `src/utils/viewportPositioning.test.ts` bila menambah pola baru. |

---

## 3. Pola implementasi

### 3.1 Modal / dialog tengah
```tsx
import { ViewportPortal } from '../ui/ViewportPortal';

return (
  <ViewportPortal>                                   {/* portal ke body + kunci gulir halaman */}
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80
                 overflow-y-auto overscroll-contain"  {/* gulir di latar, bukan di halaman */}
      role="dialog" aria-modal="true" aria-label="…"
      onClick={onClose}
    >
      <div className="my-auto w-full max-w-sm …" onClick={e => e.stopPropagation()}>
        …                                            {/* my-auto: tengah bila muat, mulai dari */}
      </div>                                         {/* atas (bisa digulir) bila lebih tinggi */}
    </div>
  </ViewportPortal>
);
```
- Jangan pakai `items-center` + konten lebih tinggi dari layar tanpa `my-auto`/`max-h`: bagian atas
  dialog akan terpotong dan tidak bisa dijangkau.
- Modal panjang boleh memakai `max-h-[92dvh] overflow-y-auto` pada dialognya (gulir internal).
- `motion.div` / `AnimatePresence` boleh di dalam portal; letakkan `ViewportPortal` sebagai anak
  langsung `AnimatePresence` agar animasi keluar tetap berjalan.

### 3.2 Bottom sheet
Sama seperti 3.1 tetapi `items-end`, dialog `max-h-[88vh] flex flex-col` dengan area konten
`overflow-y-auto overscroll-contain`. Tambahkan `pb-[max(1rem,env(safe-area-inset-bottom))]`.

### 3.3 Toast / elemen non-blocking
`<ViewportPortal lockScroll={false}>` + `fixed` + `pointer-events-none` pada pembungkus.

### 3.4 Dropdown / menu konteks
- Menu: `absolute top-full right-0 …` di dalam pemicu `relative`. Induknya tidak boleh `overflow-hidden`.
- Lapisan penutup (klik di luar): `fixed inset-0 z-40` **inline, tidak di-portal**, bertanda
  `data-dismiss-layer`, menu `z-50` di sebelahnya. Keduanya harus satu stacking context; bila
  lapisan di-portal ia bisa menutupi menunya sendiri.
- Daftar panjang: beri `max-h-[60dvh] overflow-y-auto`.

### 3.5 Kunci gulir
- Otomatis lewat `ViewportPortal`. Untuk komponen yang sudah memakai `createPortal` sendiri:
  `useBodyScrollLock(isOpen)` (`src/hooks/useBodyScrollLock.ts`).
- **Dilarang** `document.body.style.overflow = …` langsung. Pola lama "simpan → hidden → kembalikan"
  mengunci halaman selamanya bila dua overlay ditutup tidak berurutan. `utils/scrollLock.ts`
  memakai ref-count dan mengompensasi lebar scrollbar desktop (latar tidak bergeser).

### 3.6 Sticky / fixed navigation
- Header: `sticky top-0 z-30`. Navigasi bawah: `fixed z-40` (±66px + `env(safe-area-inset-bottom)`;
  di `md+` pindah ke samping kiri, lebar `w-24`).
- Elemen yang mengambang di atas navigasi bawah memakai offset
  `bottom-[calc(4.5rem+env(safe-area-inset-bottom))]` (atau lebih), `md:` disesuaikan untuk sidebar.

### 3.7 Pembungkus tata letak
`main`, `.tab-views-container`, `.animate-tab-enter`, `FreezeWhenHidden`, `ModuleBoundary` **tidak boleh**
mendapat `transform`, `will-change: transform`, `filter`, `backdrop-filter`, `perspective`, `contain`
yang menetap, termasuk animasi dengan `fill-mode: forwards/both`. Animasi singkat tanpa fill-mode
(kembali ke `none`) diperbolehkan.

---

## 4. Skala z-index

| Lapisan | z | Contoh |
|---|---|---|
| Header sticky | `z-30` | header aplikasi |
| Navigasi bawah, lapisan penutup dropdown | `z-40` | `BottomNavigation`, `data-dismiss-layer` |
| Naga pemandu | `z-[44]`/`z-[45]` | `DragonMascot` |
| Modal halaman | `z-50` | Auth, PWA, Panduan Lantai, mulai ujian |
| Admin pembayaran | `z-[60]` | `AdminPaymentsModal` |
| Modal materi / runner | `z-[80]` | Kotoba/Kanji/Bunpou detail, Dungeon, Buku Saku preset |
| Gerbang materi terkunci | `z-[85]` | `LockedOverlay` (menggantikan modal materi, bisa bersarang di modal materi) |
| Modal bersarang | `z-[90]` | `UniversalEntityModal`, pemilih di Blackboard, tetas telur naga |
| Sheet di atas modal bersarang | `z-[95]` | `ConjugationSheet` |
| Arcade / editor deck layar penuh | `z-[100]` | Arcade, Create/Add Deck, profil pemain |
| Overlay sistem global | `z-[9950]`–`z-[9999]` | Donasi/Upgrade 9950, Kotak Pos/QRIS 9960, Pengumuman 9970, Panduan 9980, Tur 9985, Bookmark/Runner deck 9999 |

Overlay yang dibuka **dari dalam** overlay lain harus berada di lapisan yang lebih tinggi daripada
induknya, karena setelah di-portal keduanya bersaing di stacking context root.

---

## 5. Checklist wajib setiap perubahan UI

- [ ] Apakah komponen terpengaruh oleh gulir dokumen? (overlay → portal)
- [ ] Apakah ada leluhur dengan transform/filter/will-change/contain/overflow yang memotong?
- [ ] Apakah komponen tetap di dalam viewport (desktop 1280×800, ponsel 360×740, landscape 740×300)?
- [ ] Konten lebih tinggi dari layar → bisa digulir di dalam overlay, halaman di belakang terkunci?
- [ ] Keyboard virtual Android terbuka → input tetap terlihat? (`interactive-widget=resizes-content`
      sudah diset di `index.html`, jadi `fixed inset-0` & `dvh` mengecil mengikuti keyboard.)
- [ ] Diuji di posisi gulir atas, tengah, bawah, dan dibuka-tutup berulang tanpa reload?
- [ ] z-index sesuai §4, tidak tertutup elemen lain, tidak menutupi yang seharusnya di atasnya?
- [ ] `npm test` lulus (termasuk `viewportPositioning.test.ts`).

Jangan menganggap komponen selesai hanya karena tampil benar di posisi halaman paling atas.

---

## 6. Penegakan otomatis

`src/utils/viewportPositioning.test.ts` gagal bila:
1. aturan CSS pembungkus tab (`.animate-tab-enter`, `.tab-views-container`) memakai properti
   pembentuk containing block atau animasi `forwards/both`;
2. `src/app/MainContent.tsx` memakai utilitas Tailwind pembentuk containing block;
3. sebuah file punya overlay `fixed inset-0 z-…` lebih banyak daripada portal
   (`<ViewportPortal>`, `<ModalPortal>`, `createPortal(`), kecuali lapisan `data-dismiss-layer`;
4. ada `document.body.style.overflow = …` di luar `utils/scrollLock.ts`.

`src/utils/scrollLock.test.ts` menguji ref-count (overlay bertumpuk, urutan tutup acak, buka-tutup berulang).

Jika tes gagal: perbaiki komponennya, **jangan** melonggarkan tesnya.

---

## 7. Audit 2026-11-19 — temuan & tindakan

| ID | Komponen | Gejala | Root cause | Tindakan | Status |
|---|---|---|---|---|---|
| P-01 | `LockedOverlay` (`billing/AccessGate.tsx`) — Kotoba/Kanji/Bunpou terkunci | Modal muncul di luar layar setelah menggulir | P-02 + overlay tidak di-portal | Portal, `z-[85]`, latar bisa digulir + `my-auto`, kunci gulir, `role="dialog"` | FIXED |
| P-02 | `.animate-tab-enter` (`index.css`) | Semua `fixed` di dalam tab menempel ke pembungkus tab | `will-change: opacity, transform` menetap | Hapus `will-change`; animasi 0.12s tetap ada | FIXED |
| P-03 | `StartGuideModal`, `AnnouncementReader` (dari banner Beranda), Buku Saku "Isi Cepat Preset", `DungeonBattleModule` (mulai ujian, Bank Soal) | Sama dengan P-01 bila dibuka setelah menggulir | P-02 + tanpa portal | Portal + latar bisa digulir | FIXED |
| P-04 | `ConjugationSheet` (di dalam `UniversalEntityModal`), pemilih kata kerja/pola `BlackboardPlaygroundModule` (di dalam runner Dungeon) | Berisiko terpotong/bergeser saat leluhur `motion.div` sedang beranimasi (transform) | Overlay di dalam subtree modal lain | Portal; `ConjugationSheet` dinaikkan ke `z-[95]` agar tetap di atas modal induk `z-[90]` | FIXED |
| P-05 | `UpgradeModal` | Tertutup bila dibuka dari modal `z-[80]`/`z-[100]` (setup Dungeon, pemilih sumber Arcade, gerbang terkunci di dalam modal Kanji) | `z-[60]` lebih rendah dari modal pemanggil | Portal + `z-[9950]`; `sm:my-auto` agar bagian atas tidak terpotong | FIXED |
| P-06 | Kunci gulir ad-hoc di 8 komponen (`CharacterStatusModal`, `PlayerProfileModal`, `PostOffice`, `WritingCompanionStudy`, 4 modal Arcade) | Halaman bisa terkunci permanen bila overlay ditutup tidak berurutan | Pola "simpan → hidden → kembalikan" | `useBodyScrollLock` (ref-count) | FIXED |
| P-07 | `LockedOverlay`, `AuthModal`, `PwaInstallModal`, Buku Saku preset, mulai ujian Bank Soal | Pada layar pendek (landscape/keyboard) bagian atas dialog terpotong dan tidak bisa dijangkau | `items-center` tanpa gulir & tanpa `max-h` | Latar `overflow-y-auto overscroll-contain` + dialog `my-auto` | FIXED |
| P-08 | Bar peringkat sticky Leaderboard | Tertutup navigasi bawah (2.5px; ±31px di iPhone) | `bottom-16` (64px) < tinggi nav 66.5px + safe-area | `bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`, `md:bottom-20` tetap | FIXED |
| P-09 | Header Library (≥1024px) | Teks kolom kiri pecah 1–2 huruf per baris | Navigasi jilid `shrink-0` tidak pernah membungkus | `min-w-0` pada navigasi, `lg:min-w-[16rem]` pada kolom teks | FIXED |
| P-10 | `tower1/parts.tsx` `ModalPortal` | Duplikasi logika portal | — | Jadi alias `ViewportPortal` | FIXED |
| P-11 | Lapisan penutup dropdown level (Kotoba, Bunpou) | Hanya menutupi area tab (klik header tidak menutup dropdown) | P-02 | Teratasi oleh P-02; ditandai `data-dismiss-layer` | FIXED |
| O-1 | Dropdown level Kanji | Tidak tertutup saat klik di luar | Tidak ada lapisan penutup | Bukan masalah posisi; dicatat | OPEN |
| O-2 | Beberapa modal memakai `max-h-[85vh]` | Di ponsel `vh` > area terlihat saat bilah URL tampil | `vh` vs `dvh` | Dimitigasi oleh latar yang bisa digulir; tidak diubah agar visual tetap | OPEN (rendah) |

Overlay yang sudah benar sejak awal (sudah `createPortal`): modal detail Kotoba/Kanji/Bunpou/Insight,
Dokkai, Writing Companion, Kotak Pos, Arcade, Dungeon, Buku Saku runner, pemilih Bookmark, tur naga.

### Verifikasi (Playwright, dev server, sesi & entitlement tiruan)
- 360×740: modal terkunci `225–515` pada `scrollY` 650 / 3000 / 7381 (paling bawah), dibuka-tutup
  berulang; posisi gulir & `body.style.overflow` kembali seperti semula setiap kali.
- 1280×800: modal `248–552`. 740×300 (landscape): modal `16–287`, muat.
- 640×220: dialog lebih tinggi dari layar → mulai di `top:16`, latar overlay bisa digulir, halaman terkunci.
- Tombol "Buka dengan Donasi" → `UpgradeModal` (`z-9950`) berada paling atas.
- Baseline (kode lama) pada skenario yang sama: overlay `top:-1724, height:7957`, modal `y=2110` → bug terkonfirmasi.
