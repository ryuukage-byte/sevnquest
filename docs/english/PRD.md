# SevnQuest English — PRD

Status: **draft** · Target: fork dari SevnQuest (Nihongo Quest) untuk pembelajar Inggris berbahasa Indonesia.
Pasangan dokumen: [DESIGN.md](DESIGN.md). Dasar analisis: `docs/audit/*` (snapshot 2026-10-13).

Tanda yang dipakai: ✅ terverifikasi dari kode/audit · 🔶 inferensi · ❓ keputusan produk yang belum diambil.

## 1. Ringkasan

SevnQuest English adalah RPG belajar bahasa Inggris untuk penutur Indonesia. Mesin progres (EXP, tier, SRS/Recall, misi, Buku Saku, Arcade, Tower, cloud sync, leaderboard) dipertahankan. Konten, engine bahasa, dan identitas target diganti dari Jepang (JLPT N5–N1) ke Inggris (CEFR A1–C2 dan tes populer).

Bahasa antarmuka dan penjelasan tetap **Bahasa Indonesia** ❓ (lihat §9). Yang berubah adalah bahasa yang dipelajari.

## 2. Latar & tujuan

- Pengguna: pelajar dan pekerja Indonesia yang ingin meningkatkan Inggris untuk sekolah, kuliah, kerja, atau tes (IELTS, TOEFL, TOEIC).
- Masalah: materi Inggris gratis sering monoton. SevnQuest sudah membuktikan model RPG + SRS bisa membuat latihan rutin.
- Tujuan produk:
  1. Pemain bisa mencapai target CEFR tertentu lewat latihan harian yang terukur.
  2. Retensi kosakata dan pola grammar dijaga oleh SRS (Recall).
  3. Pemain mengulang kosakata dan grammar dari konten nyata (video, teks) lewat Imersi dan Text Study.

Non-tujuan (v1): UI berbahasa Inggris, pembelajar non-Indonesia, pengucapan dengan penilaian suara (speech scoring), dan tes resmi yang bisa dibuktikan sertifikatnya.

## 3. Yang dipertahankan dari SevnQuest (✅ kode ada)

| Area | Yang dipakai ulang | Lokasi |
|---|---|---|
| EXP & reward | `awardExp`, ledger, idempotency, batas harian keluarga | `src/engine/reward/*`, `src/utils/expAward.ts` |
| Level & tier | rumus level, tier, gerbang Ascend | `src/data/rpg/tiers.ts`, `src/utils/ascension.ts` |
| Mastery & SRS | interval `[1,2,4,7,14,30]`, status LEARNING → MASTERED → PERFECTED | `src/utils/mastery.ts` |
| Recall | sesi 10 soal, batas 40 jawaban/hari, 10 materi baru/hari | `src/engine/recall/session.ts` |
| Misi & streak | misi harian/mingguan murni, streak berbasis belajar | `src/state/missions.ts`, `src/state/streak.ts` |
| Perencana belajar | analisis gap, mode Kejar Tenggat / Waktu Tetap / Atur Keduanya | `src/engine/curriculum/*` |
| Buku Saku | deck kustom, bookmark, flashcard, runner menulis | `src/components/deck/*` |
| Arcade | kerangka 5 mode (rush, streak, guess) | `src/components/arcade/*` |
| Dungeon | survival, timer per lantai, reward per lantai dibayar sekali | `src/components/dungeon/*` |
| Tower | lantai dengan room dan graf prasyarat | `src/engine/tower1/*`, `src/components/tower1/*` |
| Imersi & Text Study | caption YouTube, karaoke per kata, analisis teks | `src/components/dungeon/Immersion*`, `src/engine/textStudy/*` |
| Cloud | sinkron, merge, tabel `user_saves`, RPC leaderboard | `src/hooks/useCloudSync.ts`, `src/utils/cloudMerge.ts`, `supabase/migrations` |
| Leaderboard | all-time & mingguan | `src/components/leaderboard/*` |
| Kerangka app | auth, PWA, boot splash, error boundary, navigasi 7 tab, toast, onboarding | `src/App.tsx`, `src/components/layout/*` |
| Pencarian | pencarian universal dan registry entitas | `src/engine/search/*`, `src/engine/registry/*` |

## 4. Yang dibuang

| Komponen | Alasan |
|---|---|
| Wanakana & `JapaneseImeInput` | Input Inggris tidak butuh IME. Gantinya toleransi huruf besar/kecil dan aksen. |
| `hanzi-writer`, `KanjiWritingCanvas`, data stroke (`public/data/kanji-strokes`, `kana-strokes`, `kanaStrokeDict`) | Tidak relevan. Gantinya latihan mengeja dan dikte. Menghemat aset besar. |
| Furigana (`RubyText`, `furiganaDictionary.json`, `furiganaUtils`) | Tidak relevan. Gantinya transkripsi IPA bila diperlukan. |
| Pipeline JMdict (`scripts/jmdict`) | Gantinya pipeline baru dari sumber Inggris berlisensi bebas (§7). |
| Kanji sebagai entitas dan Kanji Extreme | Tidak ada padanannya dalam bahasa Inggris. |
| Morfologi Jepang (`inflectionEngine`, `conjugationRules`, `conjugationBank`, Dojo Konjugasi) | Diganti morfologi Inggris (§6). |
| `syntax/particleRules`, `patternSchemas` (partikel) | Diganti aturan word order dan grammar Inggris. |
| Choukai (listening Jepang, nonaktif) | Diganti listening Inggris. |
| Tryout JLPT (27 resmi) | Diganti tryout CEFR/IELTS/TOEFL/TOEIC. |
| `tower` lama (HP, boss gate, skill tree) dan `stageProgress`/`data/world` | Sudah mati di SevnQuest. Jangan ikut difork (lihat §8). |
| Tabel `kanji`, `vocabulary`, `grammar` di Supabase | Skema konten lama, tidak dibaca aplikasi. |

## 5. Model konten

Kategori konten diganti dari `kanji | kotoba | bunpou` menjadi kategori bahasa umum:

| Kategori baru | Isi | Padanan lama |
|---|---|---|
| `word` | kosakata dengan lema, POS, terjemahan Indonesia, contoh, IPA opsional, level CEFR | kotoba |
| `pattern` | pola grammar dengan rumus, contoh, dan catatan penggunaan | bunpou |
| `verb` | lema dengan bentuk V1/V2/V3, ing-form, dan kategori regular/irregular | konjugasi |
| `question` | soal pilihan ganda, isian, dikte, reading, listening | bank soal |
| `sentence` | kalimat contoh terpisah dari materi | sentences.json |

Level: `A1 A2 B1 B2 C1 C2`. Setiap entitas punya `level` dan `frequencyRank` opsional.

Sumber konten (❓ cek lisensi sebelum dipakai):
- **Wiktionary** (CC BY-SA): lema, POS, dan terjemahan Indonesia.
- **Tatoeba** (CC BY 2.0 FR): kalimat contoh dengan pasangan Inggris–Indonesia.
- **WordNet**: relasi sinonim dan hiponim.
- **Daftar frekuensi** (mis. Oxford 3000/5000): cek lisensi. Jangan dipakai tanpa izin bila berlisensi tertutup.

Target awal: sekitar 5.000 kosakata berlevel dan 150–200 pola grammar. Angka ini 🔶 perlu dikonfirmasi.

## 6. Engine bahasa baru

| Engine | Fungsi | Dasar |
|---|---|---|
| Morfologi Inggris | bentuk verba (V1/V2/V3/ing), plural, komparatif | tabel irregular verbs + aturan regular. Lebih kecil dari `inflectionEngine` |
| Ejaan & dikte | cek ejaan dengan toleransi kapitalisasi, aksen, dan jarak edit | Levenshtein sederhana |
| Word order | sentence builder dengan potongan kata yang diacak | data kalimat `sentence` |
| Listening | TTS `en-US` / `en-GB`, kecepatan dari `speechRate` | Web Speech API (sudah ada di `utils/audio`) |
| Reading | soal bacaan dengan pertanyaan | bank soal `question` |

## 7. Fitur per modul (v1)

| Modul | Versi English | Prioritas |
|---|---|---|
| Recall | sama, dengan soal dari kategori baru dan engine ejaan/word order | P0 |
| Library → Kosakata | daftar, filter level, detail, latihan ejaan | P0 |
| Library → Pola | daftar pola, detail, contoh | P0 |
| Library → Verba | dojo bentuk verba (menggantikan Dojo Konjugasi) | P1 |
| Buku Saku | deck kustom dan bawaan, flashcard | P0 |
| Imersi (YouTube) | caption Inggris, karaoke per kata, simpan kata | P0 (nilai tinggi) |
| Text Study | analisis teks Inggris → kosakata/pola → kuis | P1 |
| Arcade | Spelling Speed Rush, Word Guess, Tense Speed Rush, Sudden Death, Sentence Rush | P1 |
| Dungeon | Gerbang Ingatan (flashcard), Arena Kuis, Kuil Grammar, Altar Verba, Dikte | P1 |
| Tower | 100 lantai berurutan dari fonetik/ejaan ke grammar lanjut. Struktur sama | P2 |
| Tryout | simulasi tes CEFR/IELTS/TOEFL | P2 |
| Misi & Perencana | target CEFR atau tenggat tes, analisis gap, misi harian | P0 |
| Leaderboard | sama | P1 |
| Pengaturan | tema, suara, speechRate, target level (menggantikan `targetJlpt`) | P0 |

Fitur yang dihapus dari v1: Fusion Jepang (kecuali konsepnya dipakai untuk "gabung pola"), Furigana, Kanji Writing.

## 8. Kesiapan fork (utang teknis dari audit)

Sebelum fork, bereskan item yang sudah dicatat di `docs/audit/ROADMAP.md`:
1. Hapus kode mati (±758 baris) dan `engine/tower/*` lama agar tidak ikut terfork.
2. Pecah `usePlayerActions` (±400 baris) per domain.
3. Rekonsiliasi EXP multi-perangkat (Gelombang 1 #3). Ini wajib sebelum ekonomi baru dipasang.

Kalau item 3 belum selesai, fork tetap bisa jalan, tetapi sinkron perangkat ganda akan mewarisi bug yang sama.

## 9. Keputusan produk yang masih terbuka ❓

1. **Bahasa antarmuka.** Usulan: tetap Bahasa Indonesia. Alternatif: UI Inggris untuk pembelajar Indonesia yang sudah mahir. Keputusan ini menentukan apakah i18n perlu dibangun (teks UI saat ini ditulis langsung di JSX).
2. **Backend.** Usulan: Supabase project baru. Jangan memakai project SevnQuest Jepang karena leaderboard dan save akan tercampur.
3. **Lisensi konten.** Verifikasi Wiktionary, Tatoeba, dan daftar frekuensi sebelum dipakai di produk publik.
4. **Nama produk dan branding.** Usulan: "SevnQuest English". Nama tier dan avatar perlu diubah dari N5–N1 ke CEFR.
5. **Ekonomi reward.** Angka `REWARD_POLICY` dan rumus EXP per materi perlu dikalibrasi ulang untuk kosakata dan pola Inggris.
6. **Rentang tier.** Apakah tier mengikuti 10 tier yang ada atau 6 level CEFR dipetakan ke 10 tier.
7. **Proxy Supabase dan caption.** Masih dibutuhkan karena ISP Indonesia memblokir `*.supabase.co`. Keputusannya bergantung pada hosting.

## 10. Milestone

| Fase | Isi | Kriteria selesai |
|---|---|---|
| M0 | Fork, Supabase baru, bersihkan kode mati, putuskan §9 | `npm run build` dan `npm test` lulus di fork |
| M1 | Model konten, pipeline kosakata dan pola, data A1–B1 | Recall berjalan dengan kosakata Inggris dari pipeline |
| M2 | Engine ejaan, dikte, word order, morfologi | Arcade Spelling dan Sentence Rush berjalan |
| M3 | Imersi Inggris dan Text Study | Caption YouTube Inggris bisa dipelajari dan kosakata tersimpan |
| M4 | Tower, Tryout, kalibrasi ekonomi | Tower 1–20 selesai dari awal, reward sesuai `REWARD_POLICY` baru |
| M5 | Data C1–C2, leaderboard, rilis | Sinkron dua perangkat lulus uji, PWA terpasang |

## 11. Kriteria sukses (v1)

- Pemain yang menyelesaikan misi harian selama 30 hari memperoleh retensi Recall ≥ 70% pada materi yang sudah MASTERED. Target awal 🔶.
- Latihan Imersi menghasilkan kosakata tersimpan rata-rata ≥ 10 kata per sesi. Target awal 🔶.
- Tidak ada kategori konten Jepang yang tersisa di UI atau data (`kanji`, `kotoba`, `bunpou`, `JLPT`, `furigana`).
- Ukuran bundel awal tidak melebihi bundel SevnQuest Jepang (`data-kotoba` 8,5 MB adalah beban terbesar sekarang).
