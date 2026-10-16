# SevnQuest — Storyboard "Bentuk Nai" (Remotion)

Sumber: `SevnQuest_bentuk-nai.srt` (32 cue, 0:00–1:55). Format 9:16 (1080×1920), 30 fps.
Durasi scene mengikuti timestamp SRT, jadi visual selalu pas dengan narasi.
Total ±1:58 (termasuk end card). Versi Reels/Shorts 60–90 detik: lihat catatan di bawah.

## Gaya visual (sama dengan promo utama, dari `src/index.css`)

| Elemen | Nilai |
|---|---|
| Tema | Washi Scroll dark, background `#12151d`, kartu `#1f242f` → `#2a3040` |
| Warna kata kerja | Kelompok 1 = Aizome `#6f93cf`, Kelompok 2 = Matcha `#4fae86`, Kelompok 3 = Hanko `#e2555b` |
| Aksen negatif | Hanko merah untuk hasil ~nai (tidak / larangan), emas hanya untuk CTA |
| Font | Zen Old Mincho (judul, kanji), Plus Jakarta Sans (teks), Noto Sans JP (kana) |
| Motion | Spring masuk, kata berubah lewat morph (akhiran lama luruh, akhiran baru muncul) |

## Rangkaian scene

| # | Waktu (SRT) | Cue | Visual | Motion | Teks / VO |
|---|---|---|---|---|---|
| 1 | 0:00.00–0:04.71 | 1–2 | Tiga kartu kata: **tabenai**, **ikanai**, **nomanai** | Kartu masuk bergantian, lalu sorot | "Pernah melihat kata tabenai, ikanai, atau nomanai?" / "Ketiganya adalah contoh bentuk nai." |
| 2 | 0:04.71–0:14.31 | 3–6 | Judul "Apa itu bentuk nai?", lalu kanji 無 (tidak) besar | Judul ketik-muncul, kanji ditulis dengan sapuan kuas | "Apa itu bentuk nai? Bentuk nai adalah bentuk negatif." |
| 3 | 0:14.31–0:21.21 | 6–7 | Tiga chip makna: *tidak* · *larangan* · *tergantung pola* | Chip pop satu per satu | "Berkaitan dengan makna seperti tidak atau larangan, tergantung pola kalimat." |
| 4 | 0:21.21–0:28.29 | 7–8 | **taberu** (makan) → panah → **tabenai** (tidak makan) | Kata lama luruh, kata baru morph dari kiri | "Taberu berarti makan. Ketika berubah menjadi tabenai, artinya tidak makan." |
| 5 | 0:28.29–0:38.42 | 9–11 | Tiga kotak kelompok: 1 (Aizome), 2 (Matcha), 3 (Hanko) | Kotak masuk berurutan, kelompok 1 menyala | "Bagaimana cara mengubah kata kerja? Ada tiga kelompok. Pertama, kelompok satu." |
| 6 | 0:38.42–0:44.75 | 12 | Aturan: **u → a + nai**, dengan animasi huruf akhir "u" berubah jadi "a" | Huruf akhir berputar/morph | "Bunyi akhir diubah dari baris u menjadi baris a, lalu ditambah nai." |
| 7 | 0:44.75–0:53.42 | 13–15 | Tiga contoh: **kaku → kakanai**, **nomu → nomanai**, **hanasu → hanasanai** | Kata kerja diketik, akhiran "a+nai" muncul berwarna biru | "Kaku menjadi kakanai. Nomu menjadi nomanai. Hanasu menjadi hanasanai." |
| 8 | 0:53.42–0:61.34 | 16–18 | Pengecualian: **kau → kawanai** (u → wa, bukan a) dengan label "PENGECUALIAN" | Label emas kecil muncul, huruf "wa" disorot | "Namun, ada pengecualian. Kata kerja berakhiran u berubah menjadi wa, bukan a." |
| 9 | 0:61.34–0:77.43 | 19–24 | Kelompok 2: aturan **buang "ru" + nai**. Contoh: **taberu → tabenai**, **miru → minai**, **okiru → okinai** | "ru" dicoret lalu hilang, nai muncul (Matcha) | "Hilangkan ru, lalu tambahkan nai. Taberu menjadi tabenai. Miru menjadi minai. Okiru menjadi okinai." |
| 10 | 0:77.43–0:88.97 | 25–28 | Kelompok 3 (tidak beraturan), dua kartu: **suru → shinai**, **kuru → konai** | Kartu Hanko masuk dengan sedikit shake (tanda "tidak beraturan") | "Kelompok tiga, yaitu kata kerja tidak beraturan. Suru menjadi shinai. Sedangkan kuru menjadi konai." |
| 11 | 0:88.97–0:92.93 | 29 | Recap: 3 baris ringkas (1: u→a+nai, 2: buang ru+nai, 3: hafal) | Baris masuk dari bawah, kartu terakhir berkedip | "Nah, itu tadi gambaran singkat tentang bentuk nai." |
| 12 | 0:92.93–1:43.83 | 30–31 | Layar fitur SevnQuest: kartu **Pola & Konjugasi** → "Bentuk Negatif [~nai]" → **Dojo Konjugasi** (latihan ubah kata kerja) | Mockup kartu geser dari kanan, bagian "nai" menyala saat disebut | "Di SevnQuest kamu bisa melihat perubahan bentuk kata kerja, mempelajari polanya, lalu berlatih langsung." / "Kamu bukan cuma menghafal hasilnya." |
| 13 | 1:51.49–1:55.07 | 32 | CTA: "Coba konjugasi sekarang" + tombol emas ⛩️ SevnQuest | Tombol berdenyut, kilau emas lewat | "Coba eksplorasi fitur konjugasi di SevnQuest dan latih kemampuanmu!" |
| 14 | 1:55.07–1:58 | — | End card: logo + "N5 → N1" | Fade in/out | — |

## Catatan

- **Durasi:** 1:58 cocok untuk YouTube Shorts yang lebih panjang atau untuk dipotong jadi 2 bagian. Untuk satu Reels 60 detik, pilihan paling aman: buang scene 3 dan 8, lalu pangkas scene 12 jadi satu kartu fitur.
- **Akurasi materi:** semua contoh di SRT sudah sesuai aturan kelompok 1–3 (kaku→kakanai, kau→kawanai, taberu→tabenai, miru→minai, okiru→okinai, suru→shinai, kuru→konai).
- **Fitur di scene 12:** nama "Bentuk Negatif [~nai]" dan "Pola & Konjugasi" diambil dari data app; "Dojo Konjugasi" dari `ConjugationDojoView`. Sebelum render, cek nama tampilannya di app.
- **Belum dikerjakan:** file ini hanya storyboard. Scene Remotion-nya belum dibuat dan belum dirender. Aku juga belum commit atau push.
