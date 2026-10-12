# Inventaris Fitur SevnQuest (hasil audit repo + browser nyata)

Aplikasi: React 19 + Vite SPA, **mobile-first**, tanpa router URL — navigasi lewat tab bawah
(`src/hooks/useAppNavigation.ts`, `src/components/layout/BottomNavigation.tsx`). Tidak ada Remotion/fframes;
yang tersedia: ffmpeg, Chromium + Playwright. Pipeline video baru ditulis tanpa dependensi tambahan.
Data pemain disimpan di localStorage (mode tamu); login Supabase opsional.

| Fitur | Entry point | Langkah | Hasil diverifikasi | Bisa didemokan? |
|---|---|---|---|---|
| Tur onboarding | Kunjungan pertama (localStorage kosong) | Otomatis tampil; "Lanjut" / "Lewati" | Tur 7 langkah; Lewati menutupnya | Ya |
| Panduan SevnQuest | Beranda → kartu "Kenali SevnQuest" | Klik kartu → "Lanjut" → ✕ | Modal 5 slide (slide 2: Kotoba, Kanji, Pola Kalimat) | Ya |
| Library | Tab Library | Pilih Kosakata / Kanji / Tata Bahasa / Bank Soal | Daftar + filter level | Ya |
| Library Kanji | Library → Kanji → chip N5 | Klik ubin kanji | Modal detail kanji | Ya |
| Latihan Menulis kanji | Modal kanji → "Latihan Menulis" | Gambar goresan di kanvas (pointer) | Goresan divalidasi; tampil "+N EXP"; EXP tercatat di Castle | Ya (data goresan lokal `public/data/kanji-strokes`) |
| Castle / EXP | Tab Castle | — | "TOTAL BELAJAR: N EXP" naik setelah menulis | Ya |
| Misi Harian | Tab Misi | — | Daftar misi + "0 / 5 Selesai" | Ya (hanya ditampilkan) |
| Buku Saku | Tab Buku Saku | — | "Buku Saku Petualang", buat deck | Ya (hanya ditampilkan) |
| Recall (SRS), Flashcard, Dungeon/Menara, Bunpou, Kotoba | Berbagai | — | Ada di kode | **Tidak dimasukkan** — tutorial lanjutan |

Prasyarat: tidak perlu akun. Pemanggilan Supabase (`register_visit`) diblokir proxy sandbox ini; tidak memengaruhi alur
(satu-satunya error console, dicatat di QA).
