# SevnQuest English — Design

Status: **draft**. Pasangan dari [PRD.md](PRD.md).
Prinsip: sistem visual **persis** SevnQuest (Fantasy Leather-Bound Skeuomorphic UI v1.0, `src/index.css`). Yang berubah hanya nama semantik yang masih bernuansa Jepang.

Tanda: ✅ dari kode · 🔶 usulan · ❓ perlu keputusan.

## 1. Prinsip desain

Dipertahankan dari SevnQuest:
1. **Kulit dan kertas.** Permukaan bertekstur seperti buku kulit (single-surface sculpting), bukan kartu datar.
2. **Emas hanya untuk reward.** Emas dipakai untuk EXP, gold, dan milestone. Jangan dipakai untuk elemen interaktif biasa.
3. **Merah hanya untuk bahaya.** Merah dipakai untuk HP kritis, salah, dan aksi tidak bisa dibatalkan.
4. **Indigo untuk aksi utama.** Tombol utama, tautan, dan fokus.
5. **Satu sistem warna per tema.** Tema gelap (default) dan terang.

## 2. Token warna

Nilai tidak berubah dari `src/index.css` ✅. Hanya nama semantik yang diubah.

### 2.1 Surface, teks, dan aksen (sama dengan SevnQuest)

| Token | Dark | Light | Catatan |
|---|---|---|---|
| `--color-surface-base` | `#12151d` | `#eae7de` | latar halaman |
| `--color-surface-card` | `#1f242f` | `#f1efe8` | kartu |
| `--color-surface-elevated` | `#2a3040` | `#f6f4ee` | elemen terangkat |
| `--color-surface-inset` | `#191d26` | `#e3e0d6` | area cekung |
| `--indigo` | `#6f93cf` | — | aksi utama |
| `--indigo-deep` | `#26314a` | — | latar tombol utama |
| `--gold` | `#f0be52` | `#8c580f` | reward |
| `--text-primary` | `#edf0f6` | — | teks utama |
| `--text-secondary` | `#b1bace` | — | teks sekunder |
| `--text-muted` | `#96a1b8` | — | teks redup |
| `--wine` / `--wine-accent` | `#8a3438` / `#e2555b` | `#7c2d28` (leather) | bahaya |
| `--color-state-success` | `#4fae86` | — | sukses (Matcha) |
| `--color-state-danger` | `#e2555b` | — | bahaya (Hanko Coral) |
| `--color-state-locked` | `rgba(139,147,166,0.2)` | — | terkunci |
| `--color-border-subtle` | `rgba(111,147,207,0.18)` | — | garis tipis |
| `--color-border-primary` | `rgba(111,147,207,0.4)` | — | garis fokus |

### 2.2 Warna per kategori materi (ganti nama, nilai tetap)

Kategori Jepang diganti. Nilai warnanya dipertahankan agar pemain yang sudah terbiasa tetap mengenali sistemnya.

| Token lama | Token baru | Nilai | Dipakai untuk |
|---|---|---|---|
| `--color-kana` (Matcha) | `--color-phonics` | `#4fae86` | ejaan, fonetik, dikte |
| `--color-kanji` (Hanko) | `--color-spelling` | `#e2555b` | latihan ejaan |
| `--color-kotoba` (Aizome) | `--color-word` | `#6f93cf` | kosakata |
| `--color-bunpou` (Kinako Gold) | `--color-grammar` | `#d9a54a` | pola grammar |
| `--color-choukai` (Fuji Purple) | `--color-listening` | `#9b65c9` | listening |
| `--color-dokkai` (Teal) | `--color-reading` | `#26a69a` | reading |
| — | `--color-verb` | `#b07fd6` 🔶 | verba (baru) |

❓ Tambahkan `--color-verb` jika kategori verba dipisah dari grammar. Nilai di atas usulan.

### 2.3 Furigana → transkripsi

| Token lama | Token baru | Catatan |
|---|---|---|
| `--color-furigana: #f0be52` | `--color-phonetic: #f0be52` | dipakai untuk IPA di bawah kata |

## 3. Tipografi

| Peran | Font | Sumber |
|---|---|---|
| Body dan UI | Plus Jakarta Sans | `--font-body`, `--font-sans` ✅ |
| Heading dan teks "medieval" | Zen Old Mincho | `--font-heading`, `--font-medieval` ✅ |
| Display | Plus Jakarta Sans | `--font-display` ✅ |
| Mono (angka, kode) | JetBrains Mono | `--font-mono` ✅ |
| `--font-jp` (Noto Sans JP) | **dihapus** di English | ✅ tidak lagi dipakai |

Catatan: Zen Old Mincho adalah serif Jepang. Untuk English, serif ini tetap bisa dipakai karena sudah menjadi identitas visual 🔶. ❓ Keputusan: pertahankan atau ganti ke serif Latin (mis. Cormorant) agar heading terasa lebih "English".

Untuk IPA (ə, ʃ, ŋ, θ), pastikan Plus Jakarta Sans atau fallback menampilkan glyph tersebut. Jika tidak, tambahkan font fallback IPA 🔶.

Aturan yang dipertahankan:
- Ukuran dan ritme heading sama dengan SevnQuest.
- Tidak menggunakan huruf kapital penuh untuk teks panjang.

## 4. Ikon dan ilustrasi

- **Lucide** untuk ikon fungsional (sudah dipakai: `lucide-react`).
- **Engraving SVG** (`src/assets/engravings/*`): 15 ilustrasi (`book`, `quill`, `scroll`, `key`, `tower`, dst.) dipertahankan. Tidak ada elemen khas Jepang di dalamnya.
- **Avatar tier** (`src/assets/avatars/*`, 10 tier × 2 gender): ilustrasi petualang. Dipertahankan. Perlu diganti hanya bila ada elemen pakaian khas Jepang (❓ periksa aset).
- **Ikon kategori**: gunakan engraving sebagai pengganti kanvas kanji.

## 5. Penamaan tier dan level

Nama tier mengikuti struktur SevnQuest tetapi memakai CEFR. Dipetakan ke 10 tier yang ada (❓ §9 PRD).

| Tier | Nama usulan | Level CEFR | Gerbang Ascend |
|---|---|---|---|
| 1 | Villager (A1) | A1 | — |
| 2 | Novice (A1) | A1 | ✓ (75%) |
| 3 | Apprentice (A2) | A2 | — |
| 4 | Squire (A2) | A2 | ✓ |
| 5 | Knight (B1) | B1 | — |
| 6 | Elite Knight (B1) | B1 | ✓ |
| 7 | Paladin (B2) | B2 | — |
| 8 | Hero (B2) | B2 | ✓ |
| 9 | Champion (C1) | C1 | — |
| 10 | Mythic Deity (C2) | C2 | — |

Gaya penamaan (Villager, Novice, dst.) dipertahankan. Hanya tanda dalam kurung yang berubah.

## 6. Komponen yang dipertahankan

Tidak ada perubahan visual. Komponen ini langsung dipakai ulang:
- Kartu leather (`surface-card`, `surface-elevated`)
- Tombol utama (indigo) dan sekunder
- Badge tier dan avatar (`TierAvatar`)
- Bottom navigation 7 tab
- Modal status karakter (`CharacterStatusModal`)
- Toast, boot splash, error boundary
- Bar progres EXP dan HP/MP

## 7. Komponen dengan perubahan kecil

| Komponen | Perubahan |
|---|---|
| `KanjiWritingCanvas` → `SpellingCanvas` | Area input mengeja, bukan menulis. Kanvas dan stroke dihapus. Tetap dengan watermark dan stopwatch dari SevnQuest. |
| `RubyText` → `PhoneticText` | Transkripsi IPA di bawah kata. Warna `--color-phonetic`. |
| `JapaneseImeInput` → `TextInput` | Input biasa dengan toleransi huruf besar/kecil. Tanpa IME. |
| `ConjugationDojoView` → `VerbDojoView` | Tampilan tabel V1/V2/V3/ing. Layout sama. |
| Pemilih level JLPT → pemilih CEFR | Enam tombol A1–C2 dengan warna tier yang sesuai. |

## 8. Kondisi dan interaksi

Sama dengan SevnQuest kecuali yang tercantum:

| Kondisi | Warna | Catatan |
|---|---|---|
| Benar | `--color-state-success` | sama |
| Salah | `--color-state-danger` | sama |
| Terkunci (gerbang Ascend) | `--color-state-locked` | sama |
| Reward baru | `--gold` dengan animasi | sama, konfeti tetap |
| Fokus keyboard | `--color-border-primary` | sama |

Aturan:
- Warna saja tidak boleh jadi satu-satunya penanda benar/salah. Tambahkan ikon atau teks. 🔶 (kontras untuk pelajar dengan buta warna)
- Animasi bisa dimatikan lewat `nq_fusion_reduce_motion` (sudah ada) dan diperluas ke seluruh app. 🔶

## 9. Tema

- Default **gelap** (`html.dark`), terang lewat `theme-light`. Mekanismenya dipertahankan dari `useTheme.ts` ✅.
- Dua blok token (dark dan light) tetap dipisah di `index.css`.
- Semua warna pakai variabel, tidak ada nilai hardcoded di komponen.

## 10. Responsif dan mobile

- Desain utama adalah PWA di ponsel. Bottom navigation dipertahankan.
- Target sentuh minimum 44×44 px. 🔶
- Layar sempit: kartu satu kolom, tabel verba bisa digulir horizontal.

## 11. Aksesibilitas

- Kontras teks utama terhadap `--color-surface-card` harus memenuhi WCAG AA. Pemeriksaan belum dilakukan. ❓ Jalankan skill `design:accessibility-review` sebelum rilis.
- Setiap ikon fungsional punya label untuk pembaca layar. 🔶
- Listening memakai teks sebagai alternatif (transkrip) agar tetap bisa dipakai tanpa suara. 🔶

## 12. Checklist sebelum rilis

- [ ] Semua token kategori Jepang (`--color-kana`, `--color-kanji`, `--color-kotoba`, `--color-bunpou`, `--color-choukai`, `--color-dokkai`, `--color-furigana`) sudah diganti nama dan tidak tersisa di komponen.
- [ ] Nama tier dan level sudah CEFR.
- [ ] Glyph IPA tampil benar di dark dan light.
- [ ] Dark dan light diuji di ponsel dan desktop.
- [ ] Aksesibilitas (§11) diperiksa.
- [ ] Tidak ada nilai warna hardcoded di komponen baru.
