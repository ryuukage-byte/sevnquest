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

export type TourId = 'menulis-kanji';

export interface DragonTour {
  id: string;
  steps: TourStep[];
}

export const TOURS: Record<TourId, DragonTour> = {
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
