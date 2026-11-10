/**
 * Basis pengetahuan Naga Pemandu: satu topik per fitur SevnQuest.
 *
 * Setiap fakta di sini diambil dari kode yang berjalan (komponen & aturan di src/), bukan karangan:
 * mis. aturan nilai menulis (KanjiWritingCanvas), Istirahat di Dojo (utils/recovery), Ascend 75%
 * (utils/ascension), peringkat mingguan (LeaderboardView), kuota Kotak Pos (letter_tiers.sql).
 * Bila aturan di kode berubah, perbarui juga teks di sini.
 *
 * `keywords`: kata/frasa huruf kecil (termasuk bahasa sehari-hari & Inggris). Frasa berspasi dicocokkan utuh.
 */
import type { DragonChoice, DragonSection } from '../../engine/dragon/intent';

export type TopicGroup = 'mulai' | 'belajar' | 'latihan' | 'progres' | 'akun';

export interface KnowledgeTopic {
  id: string;
  title: string;
  group: TopicGroup;
  keywords: string[];
  /** Jawaban utama (1–2 kalimat). */
  text: string;
  sections?: DragonSection[];
  /** Tindakan; yang pertama dengan `command` menjadi tombol utama. */
  actions: DragonChoice[];
  /** Topik terkait (id) yang ditawarkan sebagai pertanyaan lanjutan. */
  related?: string[];
}

export const GROUP_LABEL: Record<TopicGroup, string> = {
  mulai: 'Mulai & panduan',
  belajar: 'Materi belajar',
  latihan: 'Latihan & game',
  progres: 'Progres & hadiah',
  akun: 'Akun & aplikasi',
};

export const KNOWLEDGE: KnowledgeTopic[] = [
  // ----------------------------------------------------------------------------- Akun & aplikasi
  {
    id: 'pasang-app',
    title: 'Pasang / download aplikasi',
    group: 'akun',
    keywords: ['download', 'unduh', 'donlot', 'install', 'instal', 'pasang', 'aplikasi', 'app', 'apk', 'playstore', 'play store', 'appstore', 'app store', 'pwa', 'layar utama', 'homescreen', 'home screen', 'shortcut', 'ikon'],
    text: 'SevnQuest tidak perlu diunduh dari Play Store atau file APK. Kamu bisa memasangnya langsung dari browser, lalu ikonnya muncul di layar utama seperti aplikasi biasa dan selalu otomatis versi terbaru.',
    sections: [
      { title: 'Cara tercepat', items: ['Di Castle, ketuk tombol "Pasang App" di kanan atas (muncul selama SevnQuest belum terpasang).'] },
      { title: 'Android (Chrome)', items: ['Ketuk menu titik tiga (⋮) di kanan atas.', 'Pilih "Instal Aplikasi" atau "Tambahkan ke layar utama".', 'Ketuk "Instal".'] },
      { title: 'iPhone / iPad (Safari)', items: ['Ketuk tombol Bagikan (kotak dengan panah ke atas).', 'Pilih "Tambah ke Layar Utama".', 'Ketuk "Tambah" di kanan atas.'] },
      { title: 'Laptop (Chrome / Edge)', items: ['Klik ikon pasang di sisi kanan kolom alamat, lalu "Pasang SevnQuest".'] },
    ],
    actions: [{ label: 'Pasang sekarang', command: { type: 'install' } }],
    related: ['akun'],
  },
  {
    id: 'akun',
    title: 'Akun, login & simpan progres',
    group: 'akun',
    keywords: ['login', 'log in', 'masuk', 'akun', 'account', 'google', 'email', 'daftar', 'register', 'sign in', 'cloud', 'sinkron', 'sync', 'simpan', 'save', 'backup', 'progres hilang', 'data hilang', 'hilang', 'ganti hp', 'pindah hp', 'hp baru', 'perangkat lain', 'logout', 'log out', 'keluar akun', 'tamu', 'guest'],
    text: 'Tanpa login kamu memakai Mode Tamu: progres hanya tersimpan di perangkat ini. Setelah login, Cloud Save aktif otomatis sehingga level, misi, dan progresmu ikut ke HP atau perangkat lain.',
    sections: [
      { title: 'Cara login', items: ['Buka Menu (tab paling kanan), lalu tombol login di kartu akun paling atas.', 'Masuk dengan Google, atau dengan email & password.', 'Daftar baru memakai alamat @gmail.com, lalu buka tautan verifikasi yang dikirim ke email sebelum login.'] },
      { title: 'Penting diketahui', items: [
        'Pindah HP: login dengan akun yang sama, progres dari cloud dimuat otomatis.',
        'Keluar akun menyetel ulang progres lokal di perangkat itu, tetapi progres di cloud tetap aman.',
        'Kotak Pos dan peringkat mingguan hanya untuk pemain yang sudah login.',
      ] },
    ],
    actions: [{ label: 'Tunjukkan tempat login', command: { type: 'guide_tour', tour: 'login' } }],
    related: ['pengaturan', 'pasang-app'],
  },
  {
    id: 'pengaturan',
    title: 'Pengaturan (Menu)',
    group: 'akun',
    keywords: ['pengaturan', 'setting', 'settings', 'menu', 'suara', 'sound', 'sfx', 'audio', 'mute', 'bisu', 'senyap', 'volume', 'tema', 'theme', 'gelap', 'terang', 'dark', 'light', 'mode malam', 'furigana', 'cara baca', 'tts', 'pelafalan', 'reset', 'hapus data', 'ulang dari awal', 'mulai ulang'],
    text: 'Semua pengaturan ada di tab Menu (paling kanan pada navigasi).',
    sections: [
      { title: 'Yang bisa diatur', items: [
        'Akun & Cloud Save.',
        'Nama, tipe karakter, dan avatar yang tampil di peringkat.',
        'Efek suara (SFX) dan uji suara Jepang (TTS).',
        'Tema: gelap (Indigo Malam) atau terang (Washi Hangat).',
        'Furigana: cara baca hiragana di atas kanji.',
        'Ulangi tur panduan awal.',
        'Reset progres: mengembalikan EXP, level, dan stage ke awal. Tidak bisa dibatalkan.',
      ] },
    ],
    actions: [
      { label: 'Buka Menu', command: { type: 'tab', tab: 'settings' } },
      { label: 'Tunjukkan di layar', command: { type: 'guide_tour', tour: 'pengaturan' } },
    ],
    related: ['akun', 'profil'],
  },
  {
    id: 'profil',
    title: 'Nama, karakter & avatar',
    group: 'akun',
    keywords: ['nama', 'ganti nama', 'ubah nama', 'username', 'nickname', 'avatar', 'karakter', 'gender', 'cewek', 'cowok', 'perempuan', 'laki', 'foto profil', 'profil'],
    text: 'Nama petualang, tipe karakter (ksatria atau pendekar wanita), dan avatar untuk papan peringkat diatur di Menu. Nama juga bisa diganti dari Lembar Status (ketuk kartu karaktermu di Castle).',
    actions: [
      { label: 'Buka Menu', command: { type: 'tab', tab: 'settings' } },
      { label: 'Buka Lembar Status', command: { type: 'status' } },
    ],
    related: ['pengaturan', 'status'],
  },
  {
    id: 'kotak-pos',
    title: 'Kotak Pos (hubungi admin)',
    group: 'akun',
    keywords: ['kotak pos', 'surat', 'pesan', 'kirim pesan', 'hubungi', 'kontak', 'contact', 'admin', 'developer', 'dev', 'lapor', 'laporan', 'bug', 'error', 'eror', 'masalah', 'kendala', 'saran', 'kritik', 'feedback', 'pertanyaan', 'tanya admin', 'cs', 'support', 'bantuan admin'],
    text: 'Untuk bertanya, melapor bug, atau memberi saran, kirim surat ke admin lewat Kotak Pos di Castle. Balasan admin akan masuk ke kotak posmu.',
    sections: [
      { title: 'Cara pakai', items: [
        'Perlu login dulu.',
        'Pilih jenis surat: Umum, Lapor Bug, Akun & Progres, Saran, atau Terima Kasih.',
        'Bisa dikirim sebagai anonim: admin tidak tahu pengirimnya, tetapi balasan tetap sampai.',
        'Untuk laporan bug, tulis apa yang kamu lakukan, apa yang terjadi, dan di perangkat apa.',
      ] },
      { title: 'Kuota surat', items: [
        'Ada batas surat per hari (pemain gratis 3 surat), direset pukul 00.00 WIB.',
        'Pendukung mendapat kuota lebih besar dan kertas surat eksklusif.',
      ] },
    ],
    actions: [{ label: 'Tunjukkan Kotak Pos', command: { type: 'guide_tour', tour: 'kotak-pos' } }],
    related: ['akun', 'donasi'],
  },
  {
    id: 'donasi',
    title: 'Donasi & dukungan',
    group: 'akun',
    keywords: ['donasi', 'donate', 'dukung', 'support developer', 'qris', 'bayar', 'premium', 'super premium', 'langganan', 'traktir', 'kopi', 'sawer', 'berlangganan'],
    text: 'Kamu bisa mendukung SevnQuest lewat ubin Donasi di Castle. Ketuk ubinnya untuk membuka QRIS, yang bisa diperbesar dan disimpan.',
    sections: [
      { title: 'Yang terbuka untuk pendukung', items: [
        'Tier dukungan Premium dan Super Premium Lv.1 sampai Lv.7.',
        'Kuota Kotak Pos lebih besar dan kertas surat eksklusif.',
        'Tier naga yang lebih tinggi (hanya penampilan).',
      ] },
    ],
    actions: [
      { label: 'Tunjukkan Donasi', command: { type: 'guide_tour', tour: 'donasi' } },
      { label: 'Lihat tier naga', command: { type: 'dragon_tiers' } },
    ],
    related: ['naga'],
  },
  {
    id: 'komunitas',
    title: 'Komunitas',
    group: 'akun',
    keywords: ['komunitas', 'community', 'grup', 'group', 'discord', 'telegram', 'whatsapp', 'wa', 'forum', 'teman belajar'],
    text: 'Grup komunitas SevnQuest segera hadir; ubinnya sudah ada di Castle. Sementara itu, kamu bisa menghubungi admin lewat Kotak Pos.',
    actions: [{ label: 'Tunjukkan Kotak Pos', command: { type: 'guide_tour', tour: 'kotak-pos' } }],
    related: ['kotak-pos'],
  },
  {
    id: 'naga',
    title: 'Tentang naga & tiernya',
    group: 'akun',
    keywords: ['naga', 'dragon', 'tatsu', 'tier naga', 'evolusi', 'berevolusi', 'evolve', 'telur', 'menetas', 'maskot', 'kamu siapa'],
    text: 'Aku Tatsu, naga pemandumu. Aku punya 7 tier dari Hatchling sampai Celestial. Tier yang lebih tinggi terbuka otomatis dari dukungan lewat Donasi, dan hanya mengubah penampilanku, bukan progres belajarmu.',
    actions: [{ label: 'Lihat tier naga', command: { type: 'dragon_tiers' } }],
    related: ['donasi'],
  },

  // ----------------------------------------------------------------------------- Mulai & panduan
  {
    id: 'pemula',
    title: 'Mulai dari mana',
    group: 'mulai',
    keywords: ['pemula', 'mulai', 'mulai dari mana', 'baru mulai', 'dari nol', 'newbie', 'pertama kali', 'belajar dari awal', 'gak bisa apa apa', 'belum bisa', 'jalur belajar', 'roadmap'],
    text: 'Kalau belum bisa membaca kana, mulai dari Buku Resmi "Kuil Aksara Kana Dojo": hiragana, lalu katakana, baru masuk N5. Kalau sudah bisa kana, pakai Library untuk Kotoba, Kanji, dan Pola Kalimat sesuai levelmu.',
    sections: [
      { title: 'Tips', items: [
        'Castle selalu menampilkan satu "Langkah Berikutnya" yang menyesuaikan kondisimu.',
        'Susun Kurikulum di Misi Harian kalau ingin jadwal harian otomatis.',
        'Ulang yang mulai terlupa lewat Recall.',
      ] },
    ],
    actions: [
      { label: 'Buka Buku Resmi', command: { type: 'official_books' } },
      { label: 'Tur singkat aplikasi', command: { type: 'tour' } },
    ],
    related: ['misi-harian', 'recall'],
  },
  {
    id: 'panduan-lengkap',
    title: 'Panduan lengkap per fitur',
    group: 'mulai',
    keywords: ['panduan lengkap', 'tutorial lengkap', 'panduan per fitur', 'ajari aku', 'ajarin aku', 'cara pakai fitur', 'pelajari fitur', 'tunjukkan caranya', 'jelaskan lengkap'],
    text: 'Pilih fitur yang mau kujelaskan. Aku menyorot langsung di layar: apa yang diketuk, apa yang muncul, dan apa gunanya. Kamu tinggal mengikuti.',
    actions: [],
    related: ['panduan'],
  },
  {
    id: 'panduan',
    title: 'Panduan & tur aplikasi',
    group: 'mulai',
    keywords: ['panduan', 'tutorial', 'tur', 'tour', 'cara pakai aplikasi', 'cara main', 'cara menggunakan', 'pengenalan', 'onboarding', 'bingung'],
    text: 'Ada dua panduan: ubin "Panduan" di Castle menjelaskan apa itu SevnQuest dan jalur belajarnya, sedangkan tur spotlight memperkenalkan menu-menu utama. Tur bisa diulang kapan saja dari Menu.',
    actions: [
      { label: 'Mulai tur aplikasi', command: { type: 'tour' } },
      { label: 'Tunjukkan ubin Panduan', command: { type: 'guide_tour', tour: 'panduan' } },
      { label: 'Panduan per fitur', topic: 'panduan-lengkap' },
    ],
    related: ['pemula'],
  },
  {
    id: 'pencarian',
    title: 'Pencarian fitur',
    group: 'mulai',
    keywords: ['cari fitur', 'pencarian', 'search', 'cari menu', 'dimana', 'di mana', 'letak'],
    text: 'Di Castle ada kolom pencarian fitur: ketik kata kunci seperti "flashcard" atau "misi", lalu ketuk hasilnya untuk langsung ke sana. Kamu juga bisa langsung bertanya padaku.',
    actions: [{ label: 'Ke Castle', command: { type: 'tab', tab: 'home' } }],
  },

  // ----------------------------------------------------------------------------- Materi belajar
  {
    id: 'kotoba',
    title: 'Kamus Kotoba (kosakata)',
    group: 'belajar',
    keywords: ['kotoba', 'kosakata', 'kosa kata', 'vocab', 'vocabulary', 'kata', 'kamus', 'arti kata', 'terjemah', 'translate', 'artinya'],
    text: 'Kamus Kotoba di Library (Jilid I) berisi kosakata dengan arti, cara baca, dan contoh kalimat.',
    sections: [
      { title: 'Di halaman kata', items: [
        'Simpan kata ke Buku Saku dengan ikon bookmark.',
        '"Latih dengan Menulis" untuk menulis kata itu dari ingatan.',
        '"Pemahaman Kotoba" (bila tersedia) membedah struktur dan bacaan khusus kata itu.',
      ] },
    ],
    actions: [
      { label: 'Buka Kamus Kotoba', command: { type: 'library', tab: 'kotoba' } },
      { label: 'Tunjukkan caranya', command: { type: 'guide_tour', tour: 'kotoba' } },
    ],
    related: ['bookmark', 'menulis'],
  },
  {
    id: 'kanji',
    title: 'Kamus Kanji & kana',
    group: 'belajar',
    keywords: ['kanji', 'onyomi', 'kunyomi', 'huruf', 'aksara', 'hiragana', 'katakana', 'kana', 'radikal', 'bushu'],
    text: 'Kamus Kanji di Library (Jilid II) menampilkan onyomi, kunyomi, arti, jumlah goresan, dan urutan goresan. Hiragana dan katakana juga ada di sini lewat filter kategori.',
    sections: [
      { title: 'Di halaman kanji', items: [
        'Tab "Detail & Arti" untuk bacaan dan contoh kata.',
        'Tab "Latihan Menulis" untuk berlatih menulis di kanvas.',
      ] },
    ],
    actions: [
      { label: 'Buka Kamus Kanji', command: { type: 'library', tab: 'kanji' } },
      { label: 'Tunjukkan Kanji & Menulis', command: { type: 'guide_tour', tour: 'menulis-kanji' } },
    ],
    related: ['menulis'],
  },
  {
    id: 'bunpou',
    title: 'Tata Bahasa (Bunpou) & konjugasi',
    group: 'belajar',
    keywords: ['bunpou', 'bunpo', 'tata bahasa', 'grammar', 'pola kalimat', 'pola', 'rumus', 'konjugasi', 'perubahan bentuk', 'bentuk kata', 'te form', 'bentuk te', 'masu', 'kata kerja', 'doushi', 'partikel'],
    text: 'Tata Bahasa di Library (Jilid III) menjelaskan rumus tiap pola kalimat, artinya, dan contoh pemakaiannya.',
    sections: [
      { title: 'Latihan konjugasi', items: [
        'Bagian "Dojo & Latihan" di Tata Bahasa melatih perubahan bentuk kata.',
        'Di World ada "Altar Konjugasi Kilat" (60 detik) dan Dungeon Altar Konjugasi.',
      ] },
    ],
    actions: [
      { label: 'Buka Tata Bahasa', command: { type: 'library', tab: 'bunpou' } },
      { label: 'Tunjukkan Tata Bahasa', command: { type: 'guide_tour', tour: 'bunpou' } },
      { label: 'Tunjukkan Konjugasi', command: { type: 'guide_tour', tour: 'konjugasi' } },
    ],
    related: ['arcade', 'dungeon'],
  },
  {
    id: 'dokkai',
    title: 'Dokkai (membaca)',
    group: 'belajar',
    keywords: ['dokkai', 'membaca', 'bacaan', 'reading', 'baca teks', 'teks', 'pemahaman bacaan', 'tryout dokkai'],
    text: 'Dokkai di Library (Jilid IV) berisi database bacaan untuk latihan memahami teks.',
    sections: [
      { title: 'Yang tersedia', items: [
        'Cari bacaan berdasarkan judul atau isinya (Jepang / Indonesia).',
        'Simulasi Tryout.',
        '"Rakit Dokkai Baru": bacaan baru sesuai level, lengkap dengan terjemahan per kalimat dan 3 soal berpembahasan.',
        'Ingin membedah teks sendiri? Pakai Dungeon Perpustakaan Teks di World.',
      ] },
    ],
    actions: [
      { label: 'Buka Library', command: { type: 'tab', tab: 'library' } },
      { label: 'Tunjukkan caranya', command: { type: 'guide_tour', tour: 'dokkai' } },
    ],
    related: ['dungeon', 'soal'],
  },
  {
    id: 'choukai',
    title: 'Choukai (mendengar)',
    group: 'belajar',
    keywords: ['choukai', 'mendengar', 'listening', 'dengar', 'audio', 'percakapan'],
    text: 'Choukai (Jilid V) sedang ditutup sementara sampai masalah audionya selesai; data soalnya tetap aman. Sementara itu, latihan mendengar bisa lewat Kotoba Guess Relay di Arena Arcade (tebak arti dari suaranya).',
    actions: [{ label: 'Tunjukkan Arena Arcade', command: { type: 'guide_tour', tour: 'arcade' } }],
    related: ['arcade'],
  },
  {
    id: 'soal',
    title: 'Bank Soal & latihan JLPT',
    group: 'belajar',
    keywords: ['soal', 'bank soal', 'latihan soal', 'kuis', 'quiz', 'ujian', 'tryout', 'try out', 'jlpt', 'tes', 'test', 'simulasi', 'n5', 'n4', 'n3', 'n2', 'n1'],
    text: 'Bank Soal di Library (Jilid VI) berisi latihan soal bergaya JLPT. Setiap sesi berisi 10 soal acak, lalu ada tinjauan dan pembahasan untuk tiap soal.',
    sections: [
      { title: 'Penilaian', items: [
        'Jawaban benar dan salah tercatat ke mastery, jadi titik lemahmu ketahuan dan diulang di Recall.',
        '"Bedah soal" menguraikan perintah, kalimat, tiap pilihan, dan soal serupa.',
        'Jawaban kuis ikut menambah skor peringkat mingguan (perlu login).',
      ] },
    ],
    actions: [{ label: 'Buka Bank Soal', command: { type: 'library', tab: 'soal' } }],
    related: ['recall', 'peringkat'],
  },
  {
    id: 'buku-resmi',
    title: 'Buku Resmi (kurikulum)',
    group: 'belajar',
    keywords: ['buku resmi', 'buku kurikulum', 'kurikulum resmi', 'official', 'bab', 'kana dojo', 'kuil aksara', 'buku', 'materi per bab', 'minna no nihongo'],
    text: 'Buku Kurikulum Resmi ada di Buku Saku. Materinya tersusun per bab, termasuk Kuil Aksara Kana Dojo untuk pemula. Bab yang kamu suka bisa disalin ke Buku Saku-mu sendiri.',
    actions: [{ label: 'Buka Buku Resmi', command: { type: 'official_books' } }],
    related: ['buku-saku', 'pemula'],
  },

  // ----------------------------------------------------------------------------- Latihan & game
  {
    id: 'buku-saku',
    title: 'Buku Saku & deck',
    group: 'latihan',
    keywords: ['buku saku', 'deck', 'dek', 'koleksi', 'buat deck', 'deck baru', 'catatan', 'impor', 'import', 'json', 'gemini', 'studio deck', 'preset'],
    text: 'Buku Saku menyimpan deck milikmu: kumpulan kosakata, kanji, dan pola untuk dilatih lewat Flashcard atau Latihan Menulis.',
    sections: [
      { title: 'Cara membuat deck', items: [
        '"Buat Deck Baru": isi judul, pilih tipe, lalu isi cepat dengan preset level JLPT atau dari Bookmark.',
        'Studio Deck Otomatis: ketik topik (mis. makanan), materinya dipilih dari database SevnQuest.',
        'Impor dari AI: salin prompt, minta ke Gemini, lalu tempel JSON hasilnya.',
        'Atau minta aku: "bikin flashcard kanji N5 makanan".',
      ] },
    ],
    actions: [
      { label: 'Buka Buku Saku', command: { type: 'tab', tab: 'deck' } },
      { label: 'Bikin deck sekarang', say: 'Aku mau bikin flashcard' },
      { label: 'Tunjukkan cara buat deck', command: { type: 'guide_tour', tour: 'deck-baru' } },
      { label: 'Tunjukkan isi deck', command: { type: 'guide_tour', tour: 'deck-isi' } },
    ],
    related: ['flashcard', 'bookmark', 'buku-resmi'],
  },
  {
    id: 'flashcard',
    title: 'Flashcard',
    group: 'latihan',
    keywords: ['flashcard', 'flash card', 'kartu', 'kartu hafalan', 'hafalan', 'hafal', 'menghafal', 'ngafal', 'drill'],
    text: 'Flashcard dimainkan dari deck di Buku Saku: buka deck, lalu tekan "Mulai Flashcard". Ketuk kartu untuk membalik antara soal dan jawabannya.',
    sections: [
      { title: 'Cara kerja', items: [
        'Pakai Sebelumnya / berikutnya untuk berpindah kartu, dan Shuffle untuk mengacak urutan.',
        'Flashcard dicatat sebagai latihan, tetapi tidak mengubah nilai mastery.',
        'Mastery naik dari jawaban yang dinilai: Recall, Bank Soal, kuis, dan menulis di kanvas.',
      ] },
    ],
    actions: [
      { label: 'Buka Buku Saku', command: { type: 'tab', tab: 'deck' } },
      { label: 'Bikin deck flashcard', say: 'Aku mau bikin flashcard' },
      { label: 'Tunjukkan isi & latih deck', command: { type: 'guide_tour', tour: 'deck-isi' } },
    ],
    related: ['buku-saku', 'recall'],
  },
  {
    id: 'menulis',
    title: 'Latihan menulis (kanji & kana)',
    group: 'latihan',
    keywords: ['menulis', 'nulis', 'tulis', 'writing', 'goresan', 'stroke', 'urutan goresan', 'kanvas', 'watermark'],
    // Jawaban lengkapnya dibangun oleh writingGuide() di engine/dragon/intent.ts (tempat, nilai, bonus EXP, tur).
    text: 'Latihan menulis kanji dan kana di kanvas, dengan nilai per goresan.',
    actions: [{ label: 'Pandu aku sampai kanvas', command: { type: 'guide_tour', tour: 'menulis-kanji' } }],
    related: ['kanji', 'arcade'],
  },
  {
    id: 'bookmark',
    title: 'Bookmark / simpan kata',
    group: 'latihan',
    keywords: ['bookmark', 'simpan kata', 'tandai', 'favorit', 'favourite', 'save kata', 'disimpan'],
    text: 'Ketuk ikon bookmark pada kartu kata atau kanji untuk menyimpannya. Semua yang disimpan masuk ke "Bookmark Utama" di Buku Saku, dan isinya bisa diimpor ke deck lain.',
    actions: [{ label: 'Buka Buku Saku', command: { type: 'tab', tab: 'deck' } }],
    related: ['buku-saku'],
  },
  {
    id: 'arcade',
    title: 'Arena Arcade (game kilat)',
    group: 'latihan',
    keywords: ['arcade', 'arena', 'game', 'main', 'mainan', 'permainan', 'speed rush', 'sudden death', 'kotoba guess', 'altar konjugasi', 'susun bintang', 'rekor', 'skor tertinggi', 'cepat'],
    text: 'Arena Arcade di World berisi game kilat untuk melatih kecepatan dan akurasi.',
    sections: [
      { title: 'Daftar game', items: [
        'Kanji Speed Rush: tulis sebanyak mungkin kanji dalam 60 detik.',
        'Sudden Death 3 Nyawa: jawab tanpa salah; tiga kesalahan, permainan selesai.',
        'Kotoba Guess Relay: tebak arti kata dari suaranya.',
        'Altar Konjugasi Kilat: ubah kata kerja ke bentuk yang diminta dalam 60 detik.',
        'Susun Bintang Kilat: susun kalimat dan temukan kata di posisi ★ dalam 60 detik.',
      ] },
    ],
    actions: [{ label: 'Tunjukkan Arena Arcade', command: { type: 'guide_tour', tour: 'arcade' } }],
    related: ['dungeon', 'menara'],
  },
  {
    id: 'dungeon',
    title: 'Mode Dungeon (latihan bebas)',
    group: 'latihan',
    keywords: ['dungeon', 'latihan bebas', 'grinding', 'drill acak', 'kaigo', 'medis', 'perawat', 'tokutei', 'ssw', 'youtube', 'lagu', 'video', 'immersion', 'perpustakaan teks', 'tempel teks', 'grammar fusion'],
    text: 'Mode Dungeon di World adalah latihan bebas dengan soal acak. Pilih dungeon, tentukan level atau profesi (Kaigo, Medis), atur jumlah lantai (5 sampai 20), lalu mulai.',
    sections: [
      { title: 'Pilihan dungeon', items: [
        'Menulis Aksara, Gerbang Ingatan (kartu bolak-balik), Kuil Tata Bahasa (susun kalimat).',
        'Altar Konjugasi, Arena Kuis Cepat (ala JLPT), Gerbang Kanji Extreme.',
        'Kreasi Kalimat Pola, Papan Tulis Pola, dan Grammar Fusion.',
        'Perpustakaan Teks: tempel teksmu sendiri, lalu teks itu dibedah menjadi kotoba, pola, dan kanji untuk dilatih.',
        'Belajar dari lagu dan video YouTube masih dalam pengembangan.',
      ] },
    ],
    actions: [{ label: 'Tunjukkan Mode Dungeon', command: { type: 'guide_tour', tour: 'dungeon' } }],
    related: ['arcade', 'menara'],
  },
  {
    id: 'menara',
    title: 'Menara Nihongo',
    group: 'latihan',
    keywords: ['menara', 'tower', 'lantai', 'floor', 'naik lantai', 'menara 1', 'menara 2', 'puncak', 'ruangan'],
    text: 'Menara Nihongo di World adalah jalur belajar bertahap per lantai. Setiap lantai punya beberapa ruangan, dan tiap ruangan melatih satu jenis kemampuan.',
    sections: [
      { title: 'Dua menara', items: [
        'Menara 1 (Lantai 001–016): belajar MELIHAT bahasa Jepang lewat aksara, bunyi, dan susunan kalimat.',
        'Menara 2 (Lantai 017–100): belajar MEMAKAI kosakata, kanji, perubahan bentuk, dan pola dari N5 menuju N4.',
      ] },
      { title: 'Aturan', items: [
        'Lantai terbuka berurutan; lantai terkunci menampilkan prasyaratnya.',
        'Setiap kelipatan sepuluh di Menara 2 dijaga satu ujian campuran.',
      ] },
    ],
    actions: [
      { label: 'Buka Menara', command: { type: 'tower' } },
      { label: 'Tunjukkan Menara', command: { type: 'guide_tour', tour: 'menara' } },
    ],
    related: ['dungeon', 'arcade'],
  },
  {
    id: 'recall',
    title: 'Recall (mengulang hafalan)',
    group: 'latihan',
    keywords: ['recall', 'ulang', 'mengulang', 'ulangan', 'review', 'srs', 'lupa', 'terlupa', 'memori', 'ingatan', 'jatuh tempo', 'spaced repetition', 'mantra', '50 50'],
    text: 'Recall mengulang materi yang sudah kamu pelajari tepat saat mulai terlupa (spaced repetition). Mulai dari ubin "Recall Memori" di Castle.',
    sections: [
      { title: 'Cara kerja', items: [
        'Target harian mengikuti jumlah materi yang jatuh tempo, bukan jatah tetap.',
        'Jawaban dinilai dan menentukan kapan materi itu muncul lagi; yang lemah lebih sering diulang.',
        'Mantra 50/50 menghapus dua pilihan salah dengan biaya 10 MP.',
        'Hadiah dihitung di akhir sesi. Setelah target tercapai, tersedia Latihan Ekstra.',
        'Recall masih kosong? Pelajari materi dulu (Menara, Bank Soal, Library), nanti materinya masuk ke sini.',
      ] },
    ],
    actions: [{ label: 'Mulai Recall', command: { type: 'recall' } }],
    related: ['hp-mp', 'misi-harian'],
  },
  {
    id: 'misi-harian',
    title: 'Misi Harian & kurikulum',
    group: 'progres',
    keywords: ['misi', 'misi harian', 'daily', 'quest', 'tugas', 'kurikulum', 'jadwal', 'target belajar', 'rencana', 'program', 'susun kurikulum', 'klaim', 'hadiah harian'],
    text: 'Misi Harian adalah jalur belajar personal: materi baru hari ini ditambah Recall. Misinya berganti setiap pukul 00:00.',
    sections: [
      { title: 'Susun Kurikulum', items: [
        'Pilih level target, lalu tentukan tenggat atau waktu belajar per hari.',
        'Sistem menghitung jumlah materi dan menit per hari, lalu membaginya menjadi misi harian + Recall.',
        'Materi yang sudah pernah kamu pelajari otomatis dilewati.',
        'Kalau Recall menumpuk, materi baru dikurangi dulu supaya ingatanmu menguat.',
      ] },
      { title: 'Aturan', items: [
        'Misi selesai saat materinya dilatih, bukan sekadar dibuka.',
        'Klaim hadiah EXP & Koin setelah misi selesai.',
      ] },
    ],
    actions: [
      { label: 'Buka Misi Harian', command: { type: 'tab', tab: 'daily' } },
      { label: 'Tunjukkan Susun Kurikulum', command: { type: 'guide_tour', tour: 'misi' } },
    ],
    related: ['misi-mingguan', 'recall'],
  },
  {
    id: 'misi-mingguan',
    title: 'Misi Mingguan',
    group: 'progres',
    keywords: ['misi mingguan', 'mingguan', 'weekly', 'mandat', 'tantangan mingguan', 'evaluasi mingguan'],
    text: 'Misi Mingguan (Mandat Mingguan) adalah tantangan sepanjang minggu dengan hadiah EXP & Gold berlipat. Ada juga Evaluasi Mingguan: soal di level targetmu untuk menguji apakah materi sudah bisa dipakai, bukan hanya dihafal.',
    actions: [{ label: 'Buka Misi', command: { type: 'tab', tab: 'weekly' } }],
    related: ['misi-harian'],
  },

  // ----------------------------------------------------------------------------- Progres & hadiah
  {
    id: 'status',
    title: 'Level, EXP, tier & Ascend',
    group: 'progres',
    keywords: ['level', 'lv', 'exp', 'xp', 'naik level', 'tier', 'naik tier', 'ascend', 'ascension', 'rank karakter', 'status', 'lembar status', 'mastery', 'penguasaan', 'coverage', 'progres belajar', 'statistik', 'titik lemah', 'kelemahan'],
    text: 'EXP dari latihan menaikkan level dan tier belajarmu. Lembar Status (ketuk kartu karaktermu di Castle) menampilkan level, tier, mastery, coverage, dan titik lemahmu.',
    sections: [
      { title: 'Ascend Tier', items: [
        'Perlu EXP yang cukup DAN penguasaan minimal 75% di setiap pilar: Kanji, Kotoba, dan Bunpou.',
        'Kalau EXP sudah cukup tetapi penguasaan belum 75%, kenaikan tier tertahan dulu.',
      ] },
      { title: 'Mastery vs coverage', items: [
        'Mastery = seberapa dalam kamu menguasai materi (dari jawaban yang dinilai).',
        'Coverage = seberapa luas materi yang sudah kamu sentuh.',
      ] },
    ],
    actions: [
      { label: 'Buka Lembar Status', command: { type: 'status' } },
      { label: 'Tunjukkan Lembar Status', command: { type: 'guide_tour', tour: 'status' } },
    ],
    related: ['hp-mp', 'koin'],
  },
  {
    id: 'hp-mp',
    title: 'HP, MP, Potion & Istirahat',
    group: 'progres',
    keywords: ['hp', 'mp', 'nyawa', 'darah', 'mana', 'potion', 'ramuan', 'obat', 'istirahat', 'dojo', 'pulihkan', 'heal', 'habis mp', 'mp habis', 'hp habis'],
    text: 'HP dan MP terlihat di Lembar Status bagian Kondisi Petualang. MP dipakai untuk Mantra 50/50 di Recall (10 MP).',
    sections: [
      { title: 'Cara memulihkan', items: [
        'Istirahat di Dojo: HP & MP pulih penuh dengan membayar koin (1 koin per 2 HP + 1 koin per 4 MP yang hilang, minimal 10 koin).',
        'Potion: memulihkan 30% HP maksimal. Pemain baru mendapat satu.',
      ] },
    ],
    actions: [
      { label: 'Buka Lembar Status', command: { type: 'status' } },
      { label: 'Tunjukkan Lembar Status', command: { type: 'guide_tour', tour: 'status' } },
    ],
    related: ['koin', 'recall'],
  },
  {
    id: 'koin',
    title: 'Koin (Gold) & hadiah',
    group: 'progres',
    keywords: ['koin', 'gold', 'emas', 'uang', 'duit', 'hadiah', 'reward', 'bonus', 'dapat exp', 'cara dapat exp', 'farming', 'grinding exp'],
    text: 'EXP dan Koin didapat dari latihan (Recall, Bank Soal, menulis, Menara, Dungeon) dan dari klaim Misi Harian & Mingguan. Koin dipakai untuk Istirahat di Dojo.',
    sections: [
      { title: 'Tips EXP lebih banyak', items: [
        'Selesaikan dan klaim misi; hadiah Misi Mingguan berlipat.',
        'Saat menulis: Watermark OFF, tanpa Animasi, dan tanpa salah memberi bonus EXP.',
      ] },
    ],
    actions: [{ label: 'Buka Misi Harian', command: { type: 'tab', tab: 'daily' } }],
    related: ['misi-harian', 'status'],
  },
  {
    id: 'peringkat',
    title: 'Peringkat (leaderboard)',
    group: 'progres',
    keywords: ['peringkat', 'rank', 'ranking', 'leaderboard', 'papan skor', 'juara', 'top 100', 'skor', 'klasemen', 'rank mingguan', 'peringkat mingguan', 'ranking mingguan', 'leaderboard mingguan', 'senin'],
    text: 'Tab Rank punya dua papan peringkat: sepanjang masa (berdasarkan total EXP) dan mingguan (dari skor Quiz dan menulis Kanji).',
    sections: [
      { title: 'Aturan', items: [
        'Peringkat mingguan direset setiap hari Senin.',
        'Skor mingguan dihitung dari jawaban kuis dan menulis kanji (nilai 60 ke atas).',
        'Perlu login supaya skormu tercatat.',
        'Ketuk nama pemain untuk melihat profilnya.',
      ] },
    ],
    actions: [{ label: 'Buka Peringkat', command: { type: 'tab', tab: 'leaderboard' } }],
    related: ['akun', 'profil'],
  },
  {
    id: 'streak',
    title: 'Streak & waktu belajar',
    group: 'progres',
    keywords: ['streak', 'beruntun', 'hari berturut', 'konsisten', 'waktu belajar', 'timer', 'jam belajar', 'durasi', 'menit belajar', 'putus streak'],
    text: 'Streak bertambah setiap hari kamu belajar berturut-turut, dan kembali ke awal kalau ada hari yang terlewat. Lencana jam di kanan atas menghitung waktu belajarmu hari ini (saat Recall, di Library, dan di Buku Saku).',
    actions: [{ label: 'Buka Lembar Status', command: { type: 'status' } }],
    related: ['status', 'misi-harian'],
  },
  {
    id: 'pengumuman',
    title: 'Pengumuman',
    group: 'mulai',
    keywords: ['pengumuman', 'announcement', 'info terbaru', 'update', 'berita', 'news', 'kabar'],
    text: 'Pengumuman dari admin muncul sebagai banner di bagian atas Castle selama masih aktif.',
    actions: [{ label: 'Ke Castle', command: { type: 'tab', tab: 'home' } }],
  },
];

export const topicById = (id: string) => KNOWLEDGE.find(t => t.id === id);
