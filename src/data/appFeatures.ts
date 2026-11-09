/**
 * Daftar fitur SevnQuest: dipakai Pencarian Fitur di Castle dan oleh Naga Pemandu.
 * Dipindah apa adanya dari FeatureSearch.tsx; `explain` hanya dibaca oleh Naga.
 */

export type FeatureTarget =
  | { type: 'tab'; tab: 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'settings' }
  | { type: 'status' }
  | { type: 'recall' }
  | { type: 'guide' };

export interface FeatureEntry {
  id: string;
  title: string;
  hint: string;
  keywords: string;
  target: FeatureTarget;
  /** Penjelasan singkat untuk Naga Pemandu (1–2 kalimat). */
  explain: string;
}

export const FEATURES: FeatureEntry[] = [
  { id: 'flashcard', title: 'Flashcard', hint: 'Buku Saku → pilih deck → Mulai Flashcard', keywords: 'flashcard kartu hafalan kosakata kotoba kanji deck', target: { type: 'tab', tab: 'deck' },
    explain: 'Flashcard adalah kartu hafalan dari deck-mu. Buka Buku Saku, pilih deck, lalu tekan Mulai Flashcard. Hasilnya ikut tercatat ke mastery.' },
  { id: 'menulis', title: 'Latihan Menulis', hint: 'Buku Saku → pilih deck → Latihan Menulis', keywords: 'menulis tulis writing stroke goresan kanji kana hiragana katakana', target: { type: 'tab', tab: 'deck' },
    explain: 'Latihan Menulis melatih urutan goresan kanji dan kana langsung di layar. Mulai dari deck di Buku Saku.' },
  { id: 'buku-saku', title: 'Buku Saku & Deck', hint: 'Kumpulan deck kata, kanji, dan pola milikmu', keywords: 'buku saku deck bookmark simpan koleksi bikin buat', target: { type: 'tab', tab: 'deck' },
    explain: 'Buku Saku menyimpan deck milikmu dan buku resmi. Kamu bisa membuat deck sendiri, menyusun deck dari topik, atau menyalin bab buku resmi.' },
  { id: 'kotoba', title: 'Kamus Kotoba', hint: 'Library → Kotoba: cari kata, arti, dan contoh kalimat', keywords: 'kotoba kosakata kata vocab kamus arti', target: { type: 'tab', tab: 'library' },
    explain: 'Kamus Kotoba berisi kosakata lengkap dengan arti, cara baca, dan contoh kalimat. Ada di Library, tab Kotoba.' },
  { id: 'kanji', title: 'Kamus Kanji', hint: 'Library → Kanji: bacaan, arti, urutan goresan', keywords: 'kanji onyomi kunyomi goresan huruf', target: { type: 'tab', tab: 'library' },
    explain: 'Kamus Kanji menampilkan onyomi, kunyomi, arti, dan urutan goresan setiap kanji. Ada di Library, tab Kanji.' },
  { id: 'bunpou', title: 'Pola Kalimat (Bunpou)', hint: 'Library → Pola Kalimat: rumus, arti, contoh', keywords: 'bunpou pola kalimat tata bahasa grammar rumus konjugasi', target: { type: 'tab', tab: 'library' },
    explain: 'Pola Kalimat menjelaskan rumus tata bahasa, artinya, dan contoh pemakaiannya. Ada di Library, tab Pola Kalimat.' },
  { id: 'world', title: 'World', hint: 'Arena Arcade, Mode Dungeon, dan Menara Nihongo', keywords: 'world arcade dungeon tower menara game latihan speed rush', target: { type: 'tab', tab: 'maps' },
    explain: 'World berisi Arena Arcade untuk latihan cepat, Mode Dungeon, dan Menara Nihongo yang naik bertahap per lantai.' },
  { id: 'recall', title: 'Recall Memori', hint: 'Ulang item yang mulai terlupa (SRS)', keywords: 'recall ulang ulangan srs review memori lupa', target: { type: 'recall' },
    explain: 'Recall mengulang item yang mulai terlupa dengan jadwal SRS, supaya hafalanmu tidak hilang sebelum belajar materi baru.' },
  { id: 'misi-harian', title: 'Misi Harian', hint: 'Selesaikan misi, klaim EXP & Koin', keywords: 'misi harian daily hadiah klaim koin exp streak', target: { type: 'tab', tab: 'daily' },
    explain: 'Misi Harian memberi target kecil setiap hari. Selesaikan lalu klaim EXP dan Koin.' },
  { id: 'misi-mingguan', title: 'Misi Mingguan', hint: 'Target mingguan dengan hadiah lebih besar', keywords: 'misi mingguan weekly hadiah target', target: { type: 'tab', tab: 'weekly' },
    explain: 'Misi Mingguan adalah target sepanjang minggu dengan hadiah lebih besar.' },
  { id: 'rank', title: 'Peringkat', hint: 'Leaderboard pemain', keywords: 'rank peringkat leaderboard skor papan', target: { type: 'tab', tab: 'leaderboard' },
    explain: 'Peringkat menampilkan papan skor semua pemain, sepanjang masa dan mingguan.' },
  { id: 'status', title: 'Lembar Status & Profil', hint: 'Level, tier, mastery, dan titik lemah', keywords: 'status profil karakter mastery tutor kelemahan lemah level tier nama avatar', target: { type: 'status' },
    explain: 'Lembar Status menampilkan level, tier, mastery, dan titik lemahmu, sekaligus tempat mengganti nama dan avatar.' },
  { id: 'pengaturan', title: 'Pengaturan', hint: 'Menu → suara, furigana, akun, reset data', keywords: 'pengaturan setting menu suara sfx furigana akun login google reset hapus data tema', target: { type: 'tab', tab: 'settings' },
    explain: 'Pengaturan (Menu) mengatur suara, furigana, tema, akun Google, dan sinkron cloud.' },
  { id: 'panduan', title: 'Panduan SevnQuest', hint: 'Cara belajar & jalur untuk pemula', keywords: 'panduan bantuan tutorial cara mulai pemula help', target: { type: 'guide' },
    explain: 'Panduan memperkenalkan menu utama SevnQuest langkah demi langkah.' },
];
