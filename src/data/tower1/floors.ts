// ==============================================================================
// TOWER 1 — 16 LANTAI (DAG TERKOREKSI · ARSITEKTUR BEKU)
// Sumber kebenaran untuk graf, prasyarat, dan spesifikasi kemampuan tiap lantai.
// Koreksi terhadap blueprint awal dijelaskan di docs/TOWER1_ARCHITECTURE.md §3.
// ==============================================================================

import { FloorSpec, RoomSkill } from '../../engine/tower1/types';

export const TOWER1_FLOORS: FloorSpec[] = [
  {
    id: 1, code: '001', name: 'Ambang Pintu', subtitle: 'Selamat datang di dunia aksara',
    status: 'ready', domain: 'orientation', col: 1.5,
    hard: [], soft: [], bigIdeas: ['BI1'],
    capability: {
      see: 'Tiga lapisan bahasa Jepang (bunyi, aksara, struktur) dan satu kalimat nyata yang dibongkar.',
      do: 'Mengenali jenis aksara dari contoh kata, lalu mencoba siklus Temukan → Pelajari → Latih → Ingat.',
      change: 'Bahasa Jepang berhenti terlihat seperti simbol acak; kamu tahu apa yang akan dipelajari.',
      signal: 'Dapat menyebut jenis aksara (hiragana/katakana/kanji) pada contoh baru.',
      misconception: 'Mengira Jepang hanya "gambar" atau hanya satu jenis huruf.'
    },
    reward: { exp: 40, gold: 20 }
  },
  {
    id: 2, code: '002', name: 'Denyut Bunyi', subtitle: 'Kalibrasi pendengaran',
    status: 'ready', domain: 'A', col: 0.5,
    hard: [1], soft: [], bigIdeas: ['BI2'],
    capability: {
      see: 'Lima bunyi vokal A-I-U-E-O dan kata yang dipecah menjadi ketukan.',
      do: 'Mendengar bunyi, memilih vokalnya, lalu menghitung ketukan (mora) sebuah kata.',
      change: 'Mendengar bahasa Jepang sebagai satuan bunyi berirama, bukan arus yang menyatu.',
      signal: 'Menghitung ketukan kata sederhana dengan benar (≥ 80%).',
      misconception: 'Menyamakan ketukan (mora) dengan suku kata, atau menganggap semua huruf Latin = satu ketukan.'
    },
    reward: { exp: 40, gold: 20 }
  },
  {
    id: 3, code: '003', name: 'Kebangkitan Hiragana', subtitle: 'Kata-kata pertama (あ〜そ)',
    status: 'ready', domain: 'A', col: 1.5,
    hard: [1], soft: [], bigIdeas: ['BI1'],
    capability: {
      see: '15 hiragana pertama: baris A, K, S.',
      do: 'Mencocokkan aksara dengan bunyi, lalu membaca dan menyusun kata nyata dari aksara yang baru dikenal.',
      change: 'Mampu membaca kata sederhana tanpa Romaji.',
      signal: 'Membaca kata (aksara → arti) tanpa Romaji dengan akurasi ≥ 80%.',
      misconception: 'Menghafal tabel, bukan membaca kata; mengira "ひ" dan "し" sama karena mirip.'
    },
    reward: { exp: 80, gold: 40 }
  },
  {
    id: 4, code: '004', name: 'Aliran Konsonan', subtitle: 'Hiragana baris T, N, H (た〜ほ)',
    status: 'ready', domain: 'A', col: 1.5,
    hard: [3], soft: [], bigIdeas: ['BI1'],
    capability: {
      see: '15 hiragana berikutnya, termasuk bunyi tak terduga し・ち・つ・ふ.',
      do: 'Membaca kata dua sampai empat aksara dan membedakan bunyi yang menyimpang dari pola.',
      change: 'Membaca kata sederhana secara mandiri.',
      signal: 'Membaca kata dari 30 aksara yang dikenal dengan akurasi ≥ 80%.',
      misconception: 'Membaca ち sebagai "ti" dan つ sebagai "tu" (mengikuti pola Latin).'
    },
    reward: { exp: 80, gold: 40 }
  },
  {
    id: 5, code: '005', name: 'Cakrawala Hiragana', subtitle: 'Gerbang 46 aksara dasar',
    status: 'ready', domain: 'A', col: 1.5,
    hard: [4], soft: [], bigIdeas: ['BI1'],
    capability: {
      see: 'Sisa hiragana (M, Y, R, W, ん) dan pasangan yang mirip (ぬ/め, ね/れ/わ, る/ろ).',
      do: 'Membedakan aksara yang mirip dan membaca kata dari seluruh 46 aksara dasar tanpa Romaji.',
      change: 'Kemandirian aksara tahap 1: tidak lagi bergantung pada Romaji untuk hiragana dasar.',
      signal: 'Ujian gerbang: membaca kata campuran (tanpa Romaji) dengan akurasi ≥ 85%.',
      misconception: 'Menganggap を dibaca "wo" dan ん sebagai huruf biasa (ia satu ketukan penuh).'
    },
    reward: { exp: 140, gold: 70 }
  },
  {
    id: 6, code: '006', name: 'Tanda Resonansi', subtitle: 'Dakuten & handakuten',
    status: 'ready', domain: 'A', col: 1.5,
    hard: [5], soft: [], bigIdeas: ['BI1', 'BI2'],
    capability: {
      see: 'Tanda ゛ dan ゜ yang mengubah か→が, さ→ざ, た→だ, は→ば→ぱ.',
      do: 'Menurunkan bunyi dari aksara yang sudah dikenal, membedakan bunyi bersuara dan tak bersuara.',
      change: 'Memahami tanda ini sebagai modifikasi aksara lama, bukan 25 aksara baru.',
      signal: 'Membaca kata ber-dakuten dan menurunkan aksara dari aturan (≥ 80%).',
      misconception: 'Menghafal が, ざ, だ... sebagai aksara terpisah.'
    },
    reward: { exp: 100, gold: 50 }
  },
  {
    id: 7, code: '007', name: 'Ketukan Khusus', subtitle: 'Durasi, jeda & perpaduan bunyi',
    status: 'ready', domain: 'A', col: 0.5,
    hard: [2, 5], soft: [6], bigIdeas: ['BI2'],
    capability: {
      see: 'っ kecil, ゃ・ゅ・ょ kecil, dan vokal panjang (おう, えい, ああ...).',
      do: 'Menghitung ketukan kata, serta membedakan kata yang hanya beda durasi.',
      change: 'Menyadari bahwa panjang bunyi dapat membedakan arti kata.',
      signal: 'Menghitung ketukan dan memilih kata yang tepat dari pasangan durasi (≥ 80%).',
      misconception: 'Menganggap きょ = dua ketukan, atau mengira vokal panjang sama dengan vokal pendek.'
    },
    reward: { exp: 100, gold: 50 }
  },
  {
    id: 8, code: '008', name: 'Cakrawala Katakana', subtitle: 'Kata serapan di sekitar kita',
    status: 'ready', domain: 'A', col: 0.5,
    hard: [6], soft: [7], bigIdeas: ['BI1', 'BI2'],
    capability: {
      see: 'Katakana sebagai pasangan hiragana, tanda panjang ー, dan kata serapan umum.',
      do: 'Membaca kata katakana, membedakan pasangan mirip (シ/ツ, ソ/ン), dan mengenali pemakaian selain serapan.',
      change: 'Katakana dikenali sebagai bagian dari ekosistem tulisan, bukan "huruf Inggris".',
      signal: 'Membaca kata katakana → arti dengan akurasi ≥ 80%.',
      misconception: 'Menganggap katakana = ejaan bahasa Inggris (ビル bukan "bill").'
    },
    reward: { exp: 120, gold: 60 }
  },
  {
    id: 9, code: '009', name: 'Kebangkitan Kanji', subtitle: 'Jangkar makna & furigana',
    status: 'ready', domain: 'A', col: 1.5,
    hard: [6], soft: [8], bigIdeas: ['BI1'],
    capability: {
      see: 'Kanji berdampingan dengan kana dalam teks nyata, lengkap dengan furigana.',
      do: 'Membaca kanji asing lewat furigana, serta memisahkan "inti" (kanji) dari "ekor" (kana).',
      change: 'Perubahan jenis aksara dipakai sebagai petunjuk batas kata; kanji tidak lagi menakutkan.',
      signal: 'Membaca kata berkanji lewat furigana dan menunjuk inti/ekor dengan benar (≥ 80%).',
      misconception: 'Mengira harus menghafal ribuan kanji dulu, atau menganggap furigana "curang".'
    },
    reward: { exp: 120, gold: 60 }
  },
  {
    id: 10, code: '010', name: 'Raja di Ujung', subtitle: 'Predikat menutup kalimat',
    status: 'ready', domain: 'B', col: 2.5,
    hard: [6], soft: [], bigIdeas: ['BI3'],
    capability: {
      see: 'Kalimat sederhana berspasi, dengan pelengkap di depan dan predikat di ujung.',
      do: 'Mengetuk "raja kalimat" (predikat) pada kalimat yang belum pernah dilihat.',
      change: 'Mata terlatih mencari predikat di ujung kalimat sebagai strategi membaca.',
      signal: 'Menemukan predikat dengan benar pada kalimat baru (≥ 80%).',
      misconception: '"Jepang selalu SOV": yang diajarkan hanyalah predikat biasanya menutup kalimat.'
    },
    reward: { exp: 100, gold: 50 }
  },
  {
    id: 11, code: '011', name: 'Penghubung Relasi', subtitle: 'Partikel sebagai penanda',
    status: 'ready', domain: 'B', col: 2.5,
    hard: [10], soft: [], bigIdeas: ['BI4'],
    capability: {
      see: 'Partikel kecil yang menempel pada kata (は, が, を, に, で, と).',
      do: 'Mengenali partikel dan perannya sebagai penanda relasi, termasuk bacaan khusus は/へ/を.',
      change: 'Partikel dikenali sebagai penanda fungsi, bukan "kata acak".',
      signal: 'Menunjuk partikel dan peran umumnya pada kalimat baru.',
      misconception: 'Menerjemahkan partikel kata per kata; mengira は selalu dibaca "ha".'
    },
    reward: { exp: 120, gold: 60 }
  },
  {
    id: 12, code: '012', name: 'Seni Konteks', subtitle: 'Yang tidak diucapkan',
    status: 'ready', domain: 'B', col: 2.5,
    hard: [11], soft: [], bigIdeas: ['BI5'],
    capability: {
      see: 'Kalimat tanpa 私/あなた/彼 yang tetap utuh karena konteks.',
      do: 'Menebak pelaku yang dihilangkan dari konteks.',
      change: 'Tidak lagi menganggap kalimat "rusak" hanya karena pelakunya tidak disebut.',
      signal: 'Menyimpulkan pelaku yang tersirat dari konteks.',
      misconception: '"Jepang tidak punya subjek": subjek sering dapat dipulihkan dari konteks.'
    },
    reward: { exp: 120, gold: 60 }
  },
  {
    id: 13, code: '013', name: 'Tiga Mesin', subtitle: 'Keluarga predikat',
    status: 'ready', domain: 'C', col: 3.5,
    hard: [10], soft: [], bigIdeas: ['BI6'],
    capability: {
      see: 'Tiga keluarga predikat: benda+です/だ (termasuk kata sifat-na), kata sifat-i, kata kerja.',
      do: 'Menentukan keluarga predikat sebuah kalimat.',
      change: 'Tahu jenis "mesin" yang sedang dihadapi tanpa belajar konjugasi.',
      signal: 'Mengklasifikasi predikat pada kalimat baru.',
      misconception: 'Mengira おいしいです adalah benda+copula (です di situ hanya kesopanan).'
    },
    reward: { exp: 120, gold: 60 }
  },
  {
    id: 14, code: '014', name: 'Bentuk Dasar & Pakaian Sosial', subtitle: 'Acuan vs penyajian',
    status: 'ready', domain: 'C', col: 3.5,
    hard: [13], soft: [9], bigIdeas: ['BI7'],
    capability: {
      see: 'Kata yang sama dalam bentuk kamus dan bentuk sopan (たべる / たべます).',
      do: 'Mengenali dua bentuk sebagai kata yang sama.',
      change: 'Tidak bingung ketika kata di kalimat berbeda dari kata di kamus.',
      signal: 'Memasangkan bentuk kamus dengan bentuk sopan dari kata yang sama.',
      misconception: 'Mengira semua kata punya bentuk sopan dengan cara yang sama.'
    },
    reward: { exp: 120, gold: 60 }
  },
  {
    id: 15, code: '015', name: 'Protokol Dekode', subtitle: 'Bentuk → Fungsi → Makna',
    status: 'ready', domain: 'D', col: 1.5,
    hard: [7, 8, 9, 12, 14], soft: [], bigIdeas: ['BI8'],
    capability: {
      see: 'Teks Jepang nyata tingkat pemula.',
      do: 'Menjalankan LIHAT → aksara → BACA → partikel → predikat → keluarga predikat → konteks → TAFSIR.',
      change: 'Tahu cara mendekati teks Jepang, bukan menebak acak.',
      signal: 'Menyelesaikan protokol pada teks baru.',
      misconception: 'Menerjemahkan kata per kata dari kiri ke kanan.'
    },
    reward: { exp: 200, gold: 100 }
  },
  {
    id: 16, code: '016', name: 'Ujian Kompas', subtitle: 'Gerbang menuju Menara Genesis',
    status: 'ready', domain: 'D', col: 1.5,
    hard: [15], soft: [], bigIdeas: ['BI8'],
    capability: {
      see: 'Teks, audio, dan kalimat yang belum pernah ditemui.',
      do: 'Menavigasi Jepang asing tanpa panik dan tanpa Romaji.',
      change: 'Memiliki kompas, bukan kefasihan.',
      signal: 'Orientasi dan transfer pada materi baru.',
      misconception: 'Mengira ujian ini mengukur penguasaan total bahasa Jepang.'
    },
    reward: { exp: 300, gold: 150 }
  }
];

export const TOWER1_FLOOR_MAP: Record<number, FloorSpec> = Object.fromEntries(
  TOWER1_FLOORS.map(f => [f.id, f])
);

export const TOWER1_DOMAIN_LABEL: Record<FloorSpec['domain'], string> = {
  orientation: 'Orientasi',
  A: 'Bagaimana Jepang Terlihat & Terdengar',
  B: 'Bagaimana Kalimat Bekerja',
  C: 'Bagaimana Kata Berperilaku',
  D: 'Cara Mendekode',
  kotoba: 'Kosakata',
  konjugasi: 'Perubahan Bentuk',
  kanji: 'Kanji',
  pola: 'Pola Kalimat',
  ujian: 'Ujian Penjaga'
};

export const TOWER1_SKILL_LABEL: Record<RoomSkill, string> = {
  pola: 'Pemahaman Pola',
  bunyi: 'Pemahaman Bunyi',
  tulisan: 'Pemahaman Tulisan',
  kata: 'Pemahaman Kata',
  kalimat: 'Pemahaman Kalimat',
  menulis: 'Latihan Menulis'
};

export const TOWER1_SKILL_HINT: Record<RoomSkill, string> = {
  pola: 'Mengenali aturan dan pola',
  bunyi: 'Mendengar bunyi dan ketukan',
  tulisan: 'Membaca aksara',
  kata: 'Memahami arti kata',
  kalimat: 'Membaca susunan kalimat',
  menulis: 'Menyusun kata sendiri'
};

/** Urutan tampil jenis Room (legenda & chip lantai). */
export const TOWER1_SKILL_ORDER: RoomSkill[] = ['pola', 'bunyi', 'tulisan', 'kata', 'kalimat', 'menulis'];
