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
  /** Poin tambahan (mis. aturan nilai) di bawah teks. */
  points?: string[];
  action: TourAction;
}

export type TourId = 'welcome' | 'menulis-kanji' | 'login' | 'kotak-pos' | 'donasi' | 'panduan' | 'arcade' | 'dungeon';

export interface DragonTour {
  id: string;
  steps: TourStep[];
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
    steps: [
      {
        selector: '[data-tour="hero-card"]',
        label: 'Karakter',
        text: 'Halo, aku Tatsu! Kuantar kamu keliling SevnQuest. Mulai dari Castle, rumah belajarmu. Kartu ini menunjukkan level, EXP, dan HP.',
        points: [
          'Ketuk kartu ini untuk membagi stat atau melihat Lembar Status.',
        ],
        action: { kind: 'info', button: 'Mulai tur' },
      },
      {
        selector: '[data-tour="castle-recall"]',
        label: 'Recall Memori',
        text: 'Recall Memori mengulang kata yang mulai terlupa.',
        points: [
          'Ketuk kartu Recall Memori, lalu jawab kartunya satu per satu.',
          'Kalau tertulis "Kosong", belum ada yang perlu diulang.',
        ],
        action: { kind: 'info' },
      },
      {
        selector: '[data-tour="nav-library"]',
        label: 'Library',
        text: 'Sekarang Library, kamus lengkapmu. Ketuk Library di sini.',
        action: { kind: 'command', command: { type: 'library', tab: 'kotoba' } },
      },
      {
        selector: '[data-tour="library-tabs"]',
        label: 'Library',
        text: 'Pilih jilid yang kamu mau:',
        points: [
          'Kosakata: 18.000+ kata. Ketik di kolom cari (kanji, kana, romaji, atau Indonesia), lalu ketuk kata untuk melihat arti dan contoh kalimat.',
          'Kanji: 2.500+ kanji. Ketuk satu kanji untuk bacaan, arti, dan goresan, lalu buka tab Latihan Menulis.',
          'Tata Bahasa: 900+ pola dengan rumus dan contoh.',
          'Dokkai (baca) dan Choukai (dengar) untuk latihan JLPT.',
          'Bank Soal: 10.000+ soal N5 sampai N1.',
        ],
        action: { kind: 'info' },
      },
      {
        selector: '[data-tour="nav-deck"]',
        label: 'Buku Saku',
        text: 'Berikutnya Buku Saku, tempat hafalanmu. Ketuk Buku Saku di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'deck' } },
      },
      {
        selector: '[data-tour="deck-subtabs"]',
        label: 'Buku Saku',
        text: 'Ada dua rak di sini:',
        points: [
          'Buku Saku Saya: deck milikmu sendiri.',
          'Buku Kurikulum Resmi: Soumatome, Minna no Nihongo, dan lainnya. Ketuk sebuah buku, pilih bab, lalu salin isinya ke deck-mu.',
        ],
        action: { kind: 'info' },
      },
      {
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
        selector: '[data-tour="nav-maps"]',
        label: 'World',
        text: 'Waktunya bermain. Ketuk World di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'maps' } },
      },
      {
        selector: '[data-tour="world-modes"]',
        label: 'World',
        text: 'Pilih mode lewat tombol-tombol ini:',
        points: [
          'Arena Arcade: pilih satu game kilat (Kanji Speed Rush, Sudden Death, dll), atur sumber soal, lalu main.',
          'Mode Dungeon: pilih dungeon, atur level dan jumlah lantai, lalu Mulai.',
          'Menara Nihongo (Tower): pilih lantai dan naik satu per satu.',
        ],
        action: { kind: 'info' },
      },
      {
        selector: '[data-tour="nav-daily"]',
        label: 'Misi',
        text: 'Satu lagi: Misi. Ketuk Misi di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'daily' } },
      },
      {
        selector: '[data-tour="missions-tabs"]',
        label: 'Misi',
        text: 'Dua jenis misi:',
        points: [
          'Misi Harian: kerjakan targetnya, lalu ketuk Klaim untuk EXP dan Koin.',
          'Mandat Mingguan: tab di sebelahnya, hadiahnya lebih besar.',
          'Belajar tiap hari menjaga streak-mu.',
        ],
        action: { kind: 'info' },
      },
      {
        selector: '[data-tour="nav-leaderboard"]',
        label: 'Rank',
        text: 'Rank adalah papan peringkat semua pemain. Ketuk Rank kapan saja untuk melihat posisimu, sepanjang masa atau mingguan.',
        action: { kind: 'info' },
      },
      {
        selector: '[data-tour="nav-settings"]',
        label: 'Menu',
        text: 'Terakhir, Menu. Ketuk Menu di sini.',
        action: { kind: 'command', command: { type: 'tab', tab: 'settings' } },
      },
      {
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
