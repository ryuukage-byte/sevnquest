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
