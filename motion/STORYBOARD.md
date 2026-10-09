# SevnQuest — Storyboard Motion Graphics (Remotion)

Format: 9:16 (1080×1920), 30 fps, ±45 detik. Dibuat untuk Reels / TikTok / Shorts.
Durasi tiap scene diatur di satu tempat: `src/timeline.ts` (kolom `sec`).

> Timestamp di bawah adalah default. Kalau kamu punya pembagian waktu sendiri,
> ubah angka `sec` di `timeline.ts`; seluruh video ikut menyesuaikan.

## Gaya visual (dari `src/index.css`)

| Elemen | Nilai |
|---|---|
| Tema | Washi Scroll dark: "Malam Indigo di atas Kertas Washi" |
| Background | `#12151d`, kartu `#1f242f` → `#2a3040`, vignette gelap |
| Aksen utama | Aizome Indigo `#6f93cf`, Kinako Gold `#f0be52` (khusus reward/EXP/milestone) |
| Pilar | Kana `#4fae86`, Kanji `#e2555b`, Kotoba `#6f93cf`, Bunpou `#d9a54a`, Choukai `#9b65c9` |
| Font | Zen Old Mincho (judul), Plus Jakarta Sans (isi), Noto Sans JP (aksara) |
| Kartu | Neumorphic dual-shadow, garis jahit sashiko tipis |
| Motion | Spring (damping 12–16), masuk dari bawah/samping, glow saat aktif |

## Rangkaian scene

| # | Waktu | Scene | Visual | Motion | Teks / VO |
|---|---|---|---|---|---|
| 1 | 0:00–0:03.5 | **Hook** | 日本 merah hanko besar, glow merah | Kanji "ditulis" dengan reveal sapuan kuas kiri→kanan | "Kanji, kana, tata bahasa… Kok rasanya berat?" |
| 2 | 0:03.5–0:08 | **Logo** | ⛩️ + wordmark emas, label N5 → N1 | Spring pop, kilau emas menyapu huruf | "SevnQuest — belajar bahasa Jepang, rasa petualangan RPG." |
| 3 | 0:08–0:15 | **3 Pilar** | Kartu Kotoba / Kanji / Pola Kalimat, warna per pilar | Kartu masuk bergantian dari kiri & kanan | "Kotoba, Kanji, dan Pola Kalimat. Saling menopang." |
| 4 | 0:15–0:22 | **Sistem belajar** | 4 langkah: Belajar → Latihan → Mastery → EXP & Tier; bar EXP emas | Langkah menyala berurutan, bar EXP terisi | "EXP mengikuti seberapa dalam kamu menguasai sesuatu." |
| 5 | 0:22–0:29 | **World Map** | Peta Kuil Hiragana: 5 stage + boss (data `maps.json`), huruf あいうえお melayang | Jalur hijau matcha tergambar, node menyala, boss pop | "Mulai dari Kuil Hiragana, sampai boss terakhir." |
| 6 | 0:29–0:36 | **Dungeon** | Grid 8 gate (Menulis, Gerbang Ingatan, Kuil Tata Bahasa, Altar Konjugasi, Kuis Cepat, Kanji Extreme, Kreasi Kalimat, Imersi) | Gate pop berurutan, lalu glow + "+25 EXP" bergilir | "Latihan rasa game arcade." |
| 7 | 0:36–0:42 | **Tier** | Tangga avatar Villager (N5) → Mythic Deity (N1), avatar asli dari `public/avatars` | Naik dari bawah, tier teratas berdenyut emas | "Dari Villager sampai Mythic Deity." |
| 8 | 0:42–0:47 | **Fitur lain** | Buku Saku, Misi Harian, Rank, Imersi (lirik karaoke menyala emas) | Kartu masuk miring lalu lurus | "Dan teman setia belajarmu." |
| 9 | 0:47–0:51 | **CTA** | "Mulai hari ini", tombol emas SevnQuest | Tombol berdenyut + kilau | "Gratis di browser, pasang sebagai PWA." |

Total default: 51 detik (1530 frame).

## Cara pakai

```bash
cd motion
npm install
npm run dev      # Remotion Studio, preview + scrub timeline
npm run render   # out/sevnquest-promo.mp4
```

Font dan avatar sudah dibundel lokal, jadi render tidak butuh internet.

## Struktur

- `src/timeline.ts` — durasi scene + ukuran/fps
- `src/theme.ts` — token warna & font (disalin dari `src/index.css`)
- `src/ui.tsx` — background, kartu, judul, helper animasi
- `src/scenes/*.tsx` — satu file per scene di tabel di atas
