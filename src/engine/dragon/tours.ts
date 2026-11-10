/**
 * Tur bertahap Naga Pemandu: naga menyorot elemen demi elemen sampai pemain tiba di tujuan,
 * tidak berhenti setelah berpindah halaman. Data murni; DragonMascot yang menjalankannya.
 *
 * Jenis langkah:
 *  - command : sorot elemen; mengetuknya menjalankan perintah naga (mis. buka Library tab Kanji).
 *  - click   : sorot elemen asli; ketukan pemain diteruskan ke elemen itu, lalu tur lanjut.
 *  - info    : sorot area (tetap bisa dipakai, mis. kanvas) + penjelasan; tombol untuk lanjut/selesai.
 */
import type { AppCommand } from './intent';
import { guideTargetFor } from './guideTarget';

export type TourAction =
  | { kind: 'command'; command: AppCommand }
  | { kind: 'click' }
  | { kind: 'info'; button?: string };

export interface TourStep {
  /** Selektor elemen yang disorot (elemen pertama yang cocok & terlihat). */
  selector: string;
  /** Nama elemen untuk balon teks. */
  label: string;
  text: string;
  /** Nama bagian tur (mis. "Library"), ditampilkan di label langkah. */
  chapter?: string;
  /** Poin tambahan (mis. aturan nilai) di bawah teks. */
  points?: string[];
  action: TourAction;
}

export type TourId = 'welcome' | 'menulis-kanji' | 'login' | 'kotak-pos' | 'donasi' | 'panduan' | 'arcade' | 'dungeon';

export interface DragonTour {
  id: string;
  steps: TourStep[];
  /** Elemen langkah tidak muncul (mis. fitur tidak tersedia): lewati langkahnya, jangan hentikan tur. */
  skipMissing?: boolean;
}

/** Langkah pembuka: pindah ke sebuah tab (dilewati otomatis bila pemain sudah di tab itu). */
const goTab = (tab: 'home' | 'maps' | 'settings', label: string, text: string): TourStep => ({
  selector: `[data-tour="nav-${tab}"]`,
  label,
  text,
  action: { kind: 'command', command: { type: 'tab', tab } },
});

export const TOURS: Record<TourId, DragonTour> = {
  welcome: {
    id: 'welcome',
    skipMissing: true,
    steps: [
      {
        chapter: 'Castle',
        selector: '[data-tour="hero-card"]',
        label: 'Karakter',
        text: 'Halo, aku Tatsu! Kuantar kamu keliling SevnQuest. Ini Castle, rumah belajarmu, dan kartu karaktermu.',
        points: [
          'Level, EXP, dan HP naik setiap kamu belajar.',
          'Ketuk kartu ini untuk membuka Lembar Status: bagi stat, ganti nama dan avatar, lihat titik lemahmu.',
        ],
        action: { kind: 'info', button: 'Mulai tur' },
      },
      {
        chapter: 'Castle',
        selector: '[data-tour="castle-next"]',
        label: 'Langkah Berikutnya',
        text: 'Tombol besar ini adalah Langkah Berikutnya.',
        points: [
          'Aplikasi memilihkan apa yang sebaiknya kamu kerjakan sekarang.',
          'Ketuk untuk langsung mengerjakannya. Pemain baru diarahkan ke Panduan dulu.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Castle',
        selector: '[data-tour="castle-quick"]',
        label: 'Jalan pintas',
        text: 'Tiga jalan pintas belajar:',
        points: [
          'Recall Memori: ulang kata yang mulai terlupa. Ketuk, lalu jawab kartunya satu per satu. Tulisan "Kosong" berarti belum ada yang perlu diulang.',
          'Misi Harian: lihat target hari ini dan klaim hadiahnya.',
          'Panduan: penjelasan SevnQuest dan jalur belajar yang disarankan.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Castle',
        selector: '[data-tour="castle-search"]',
        label: 'Pencarian fitur',
        text: 'Lupa fitur ada di mana?',
        points: [
          'Ketik namanya di kolom ini, misalnya "flashcard" atau "kanji".',
          'Ketuk hasilnya, dan aplikasi langsung membukakan fiturnya.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Castle',
        selector: '[data-tour="castle-tiles"]',
        label: 'Kotak Pos, Donasi, Komunitas',
        text: 'Tiga ubin ini:',
        points: [
          'Kotak Pos: tulis surat ke admin dan baca balasannya (perlu login).',
          'Donasi: ketuk untuk membuka QRIS dan mendukung SevnQuest. Dukungan juga membuka tier naga.',
          'Komunitas: grup belajar bersama, segera hadir.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Castle',
        selector: '[data-tour="pwa-install"]',
        label: 'Pasang App',
        text: 'Tombol Pasang App memasang SevnQuest ke layar utama supaya terbuka seperti aplikasi.',
        points: [
          'Ketuk, lalu ikuti petunjuk yang muncul.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="nav-library"]',
        label: 'Library',
        text: 'Sekarang Library, kamus lengkapmu. Ketuk Library di sini.',
        action: { kind: 'command', command: { type: 'library', tab: 'kotoba' } },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="library-tabs"]',
        label: 'Library',
        text: 'Library punya enam jilid. Ketuk jilidnya untuk berpindah:',
        points: [
          'Kosakata, Kanji, dan Tata Bahasa: kamus lengkap.',
          'Dokkai untuk latihan membaca, Choukai untuk latihan mendengar.',
          'Bank Soal: latihan soal JLPT N5 sampai N1.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="kotoba-search"]',
        label: 'Kosakata',
        text: 'Kosakata: 18.000+ kata.',
        points: [
          'Ketik kata di kolom cari (kanji, kana, romaji, atau arti Indonesia).',
          'Ketuk tombol filter untuk memilih level: N5 sampai N1, Kaigo (caregiver), atau SSW dan istilah kerja.',
          'Ketuk sebuah kata untuk melihat arti, bacaan, dan contoh kalimat. Ikon bookmark menyimpannya untuk deck.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="nav-library"]',
        label: 'Kanji',
        text: 'Membuka tab Kanji.',
        action: { kind: 'command', command: { type: 'library', tab: 'kanji' } },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="kanji-item"]',
        label: 'Kanji',
        text: 'Kanji: 2.500+ kanji N5 sampai N1. Hiragana dan katakana ada lewat filter kategori. Ketuk satu kanji untuk melihat:',
        points: [
          'Onyomi, kunyomi, arti, dan komponen penyusunnya.',
          'Tab Latihan Menulis di dalamnya, untuk berlatih urutan goresan.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="nav-library"]',
        label: 'Tata Bahasa',
        text: 'Membuka tab Tata Bahasa.',
        action: { kind: 'command', command: { type: 'library', tab: 'bunpou' } },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="bunpou-search"]',
        label: 'Tata Bahasa',
        text: 'Tata Bahasa: 900+ pola kalimat.',
        points: [
          'Cari rumus atau arti di kolom ini, atau saring berdasarkan level.',
          'Ketuk sebuah pola untuk melihat rumus, arti, dan contoh kalimat.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="nav-library"]',
        label: 'Bank Soal',
        text: 'Membuka tab Bank Soal.',
        action: { kind: 'command', command: { type: 'library', tab: 'soal' } },
      },
      {
        chapter: 'Library',
        selector: '[data-tour="soal-modes"]',
        label: 'Bank Soal',
        text: 'Bank Soal: 10.000+ soal JLPT.',
        points: [
          'Latihan Harian: 10 soal acak, lengkap dengan pembahasan setelah selesai.',
          'Simulasi Ujian Nyata: soal bergaya ujian sungguhan.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Buku Saku',
        selector: '[data-tour="nav-deck"]',
        label: 'Buku Saku',
        text: 'Sekarang Buku Saku, tempat hafalanmu. Ketuk Buku Saku di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'deck' } },
      },
      {
        chapter: 'Buku Saku',
        selector: '[data-tour="deck-subtabs"]',
        label: 'Buku Saku',
        text: 'Ada dua rak di sini:',
        points: [
          'Buku Saku Saya: deck milikmu sendiri.',
          'Buku Kurikulum Resmi: buku seperti Soumatome dan Minna no Nihongo.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Buku Saku',
        selector: '[data-tour="deck-actions"]',
        label: 'Buat Deck',
        text: 'Cara membuat dan memakai deck:',
        points: [
          'Ketuk Buat Deck Baru untuk memilih isinya sendiri, atau Buat Deck AI untuk diisi otomatis dari topik.',
          'Ketuk sebuah deck, lalu tekan Mulai Flashcard untuk menghafal.',
          'Tekan Latihan Menulis untuk berlatih goresan kanji dan kana.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Buku Saku',
        selector: '[data-tour="nav-deck"]',
        label: 'Buku Resmi',
        text: 'Membuka Buku Kurikulum Resmi.',
        action: { kind: 'command', command: { type: 'official_books' } },
      },
      {
        chapter: 'Buku Saku',
        selector: '[data-tour="book-list"]',
        label: 'Buku Resmi',
        text: 'Buku Kurikulum Resmi:',
        points: [
          'Ketuk sebuah buku untuk melihat bab-babnya.',
          'Salin isi bab ke Buku Saku Saya, lalu hafalkan lewat flashcard.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'World',
        selector: '[data-tour="nav-maps"]',
        label: 'World',
        text: 'Waktunya bermain. Ketuk World di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'maps' } },
      },
      {
        chapter: 'World',
        selector: '[data-tour="world-arcade"]',
        label: 'Arena Arcade',
        text: 'Pertama, Arena Arcade. Ketuk tombol ini.',
        action: { kind: 'click' },
      },
      {
        chapter: 'World',
        selector: '[data-tour="arcade-games"]',
        label: 'Arena Arcade',
        text: 'Lima game kilat. Ketuk satu kartu untuk bermain, rekormu tercatat:',
        points: [
          'Kanji Speed Rush: tulis kanji sebanyak mungkin dalam 60 detik.',
          'Sudden Death 3 Nyawa: salah tiga kali, permainan selesai.',
          'Kotoba Guess Relay: tebak arti kata dari suaranya.',
          'Altar Konjugasi Kilat: ubah bentuk kata kerja dalam 60 detik.',
          'Susun Bintang Kilat: susun kalimat dan temukan kata di posisi bintang.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'World',
        selector: '[data-tour="world-modes"]',
        label: 'Mode Dungeon',
        text: 'Tombol Dungeon: sebelas gerbang latihan bebas. Ketuk Dungeon, pilih satu gerbang, atur level dan jumlah lantai, lalu Mulai.',
        points: [
          'Menulis Aksara dan Gerbang Ingatan (flashcard).',
          'Kuil Tata Bahasa, Altar Konjugasi, dan Kuis Cepat.',
          'Gerbang Kanji Extreme: tebak bacaan, stage makin sulit.',
          'Perpustakaan Teks: tempel teksmu sendiri, lalu dibedah dan dilatih.',
          'Dungeon Imersi: belajar dari lagu dan video YouTube.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'World',
        selector: '[data-tour="world-modes"]',
        label: 'Menara Nihongo',
        text: 'Tombol Tower: Menara Nihongo, didaki lantai demi lantai sampai Lantai 100. Ketuk Tower, pilih menara, lalu ketuk sebuah lantai.',
        points: [
          'Menara 1 (001-016): belajar MELIHAT bahasa Jepang lewat aksara, bunyi, dan susunan kalimat.',
          'Menara 2 (017-100): belajar MEMAKAINYA, dari N5 menuju N4, dengan ujian campuran tiap kelipatan sepuluh.',
          'Bintang dan progresmu tersimpan.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Misi',
        selector: '[data-tour="nav-daily"]',
        label: 'Misi',
        text: 'Satu lagi: Misi. Ketuk Misi di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'daily' } },
      },
      {
        chapter: 'Misi',
        selector: '[data-tour="missions-tabs"]',
        label: 'Misi',
        text: 'Dua jenis misi:',
        points: [
          'Misi Harian: kerjakan targetnya, lalu ketuk KLAIM untuk EXP dan Koin.',
          'Mandat Mingguan: target seminggu dengan hadiah lebih besar.',
          'Belajar setiap hari menjaga streak-mu.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Rank',
        selector: '[data-tour="nav-leaderboard"]',
        label: 'Rank',
        text: 'Ketuk Rank untuk melihat papan peringkat.',
        action: { kind: 'command', command: { type: 'tab', tab: 'leaderboard' } },
      },
      {
        chapter: 'Rank',
        selector: '[data-tour="rank-tabs"]',
        label: 'Rank',
        text: 'Dua papan peringkat:',
        points: [
          'Hall of Fame: total EXP seumur hidup.',
          'Weekly Arena: skor Quiz dan Kanji minggu ini, direset tiap hari Senin.',
          'Ketuk nama pemain untuk melihat profilnya.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Menu',
        selector: '[data-tour="nav-settings"]',
        label: 'Menu',
        text: 'Terakhir, Menu. Ketuk Menu di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'settings' } },
      },
      {
        chapter: 'Menu',
        selector: '[data-tour="settings-account"]',
        label: 'kartu akun',
        text: 'Login di kartu ini supaya progresmu tersimpan di Cloud:',
        points: [
          'Ketuk Masuk dengan Google, atau pakai email dan password.',
          'Setelah login, progresmu aman dan bisa dibuka di HP atau laptop lain.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Menu',
        selector: '[data-tour="settings-profile"]',
        label: 'Profil Pemain',
        text: 'Profil Pemain: ganti nama petualang, tipe karakter, dan avatarmu di sini.',
        action: { kind: 'info' },
      },
      {
        chapter: 'Menu',
        selector: '[data-tour="settings-study"]',
        label: 'Pengaturan Belajar',
        text: 'Pengaturan belajar:',
        points: [
          'Tema Visual: pilih gelap atau terang.',
          'Bantuan Furigana dan Kanji: atur bantuan cara baca.',
          'Ulangi Tur: putar lagi tur ini kapan saja.',
        ],
        action: { kind: 'info' },
      },
      {
        chapter: 'Menu',
        selector: '[data-tour="nav-home"]',
        label: 'Castle',
        text: 'Selesai! Ketuk Castle untuk kembali. Kalau butuh bantuan, ketuk aku dan ketik saja apa yang mau kamu lakukan.',
        action: { kind: 'command', command: { type: 'tab', tab: 'home' } },
      },
    ],
  },
  login: {
    id: 'login',
    steps: [
      goTab('settings', 'Menu', 'Pengaturan akun ada di Menu. Ketuk di sini.'),
      {
        selector: '[data-tour="settings-account"]',
        label: 'kartu akun',
        text: 'Di kartu ini kamu bisa login atau melihat status Cloud Save.',
        points: [
          'Masuk dengan Google, atau dengan email & password.',
          'Daftar baru memakai alamat @gmail.com, lalu verifikasi lewat email.',
          'Setelah login, progresmu tersimpan ke cloud otomatis.',
        ],
        action: { kind: 'info', button: 'Mengerti' },
      },
    ],
  },
  'kotak-pos': {
    id: 'kotak-pos',
    steps: [
      goTab('home', 'Castle', 'Kotak Pos ada di Castle. Ketuk di sini.'),
      {
        selector: '[data-tour="castle-mailbox"]',
        label: 'Kotak Pos',
        text: 'Ketuk Kotak Pos untuk menulis surat ke admin atau membaca balasannya. Perlu login dulu.',
        action: { kind: 'click' },
      },
    ],
  },
  donasi: {
    id: 'donasi',
    steps: [
      goTab('home', 'Castle', 'Ubin Donasi ada di Castle. Ketuk di sini.'),
      {
        selector: '[data-tour="castle-donasi"]',
        label: 'Donasi',
        text: 'Ketuk Donasi untuk membuka QRIS. Terima kasih sudah mau mendukung SevnQuest!',
        action: { kind: 'click' },
      },
    ],
  },
  panduan: {
    id: 'panduan',
    steps: [
      goTab('home', 'Castle', 'Panduan ada di Castle. Ketuk di sini.'),
      {
        selector: '[data-tour="castle-guide"]',
        label: 'Panduan',
        text: 'Ketuk Panduan untuk membaca apa itu SevnQuest dan jalur belajar yang disarankan.',
        action: { kind: 'click' },
      },
    ],
  },
  arcade: {
    id: 'arcade',
    steps: [
      goTab('maps', 'World', 'Arena Arcade ada di World. Ketuk di sini.'),
      {
        selector: '[data-tour="world-arcade"]',
        label: 'Arena Arcade',
        text: 'Ketuk Arena Arcade untuk melihat semua game kilat: Kanji Speed Rush, Sudden Death, Kotoba Guess, dan lainnya.',
        action: { kind: 'click' },
      },
    ],
  },
  dungeon: {
    id: 'dungeon',
    steps: [
      goTab('maps', 'World', 'Mode Dungeon ada di World. Ketuk di sini.'),
      {
        selector: '[data-tour="world-dungeon"]',
        label: 'Mode Dungeon',
        text: 'Ketuk Mode Dungeon, pilih dungeon-nya, atur level dan jumlah lantai, lalu mulai.',
        action: { kind: 'click' },
      },
    ],
  },
  'menulis-kanji': {
    id: 'menulis-kanji',
    steps: [
      {
        selector: '[data-tour="nav-library"]',
        label: 'Library',
        text: 'Kita mulai dari Library. Ketuk di sini, aku langsung bukakan tab Kanji.',
        action: { kind: 'command', command: { type: 'library', tab: 'kanji' } },
      },
      {
        selector: '[data-tour="kanji-item"]',
        label: 'kartu kanji',
        text: 'Ini daftar kanji. Ketuk salah satu kanji untuk membuka detailnya. Hiragana dan katakana juga ada di sini lewat filter kategori.',
        action: { kind: 'click' },
      },
      {
        selector: '[data-tour="kanji-write-tab"]',
        label: 'Latihan Menulis',
        text: 'Sekarang ketuk tab Latihan Menulis.',
        action: { kind: 'click' },
      },
      {
        selector: '[data-tour="writing-canvas"]',
        label: 'kanvas',
        text: 'Tulis goresannya di kanvas ini sesuai urutan. Begini cara penilaiannya:',
        points: [
          'Nilai mulai 100, berkurang 15 setiap goresan salah.',
          'Nilai 60 ke atas dihitung lulus dan masuk ke mastery.',
          'Salah 2 kali di goresan yang sama, petunjuknya muncul.',
          'Bonus EXP: tanpa watermark, tanpa animasi, dan tanpa salah.',
        ],
        action: { kind: 'info', button: 'Siap, aku coba!' },
      },
    ],
  },
};

/** Tur satu langkah untuk sebuah perintah (menyorot tombol tujuan), atau null bila tidak ada yang perlu disorot. */
export function singleStepTour(cmd: AppCommand, activeTab?: string): DragonTour | null {
  const t = guideTargetFor(cmd, activeTab);
  if (!t) return null;
  return {
    id: `single-${cmd.type}`,
    steps: [{
      selector: t.selector,
      label: t.label,
      text: `Ketuk ${t.label} di sini.${t.detail ? ` ${t.detail}` : ''}`,
      action: { kind: 'command', command: cmd },
    }],
  };
}

/**
 * Langkah "command" yang tujuannya sudah terbuka (mis. pemain sudah di Library) tidak perlu disorot:
 * perintahnya dijalankan langsung, lalu tur lanjut ke langkah berikutnya.
 */
export function stepNeedsSpotlight(step: TourStep, activeTab?: string): boolean {
  if (step.action.kind !== 'command') return true;
  return guideTargetFor(step.action.command, activeTab) !== null;
}
