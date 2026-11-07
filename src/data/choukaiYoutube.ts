// ==============================================================================
// CHOUKAI (聴解) — LIBRARY YOUTUBE (versi minimal)
// Daftar video & channel YouTube berbahasa Jepang untuk latihan mendengar.
// Diisi manual. Cukup tempel URL YouTube apa adanya (watch / youtu.be / shorts / @channel).
// Setiap entri divalidasi oleh src/data/choukaiYoutube.test.ts.
//
// Contoh entri video:
//   {
//     id: 'yt_contoh_001',
//     kind: 'video',
//     title: 'Judul video',
//     url: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
//     author: 'Nama channel',
//     level: 'N4',
//     category: 'percakapan',
//     note: 'Kenapa video ini bagus untuk latihan mendengar.',
//   },
// Contoh entri channel:
//   {
//     id: 'ch_contoh',
//     kind: 'channel',
//     title: 'Nama channel',
//     url: 'https://www.youtube.com/@namachannel',
//     level: 'Semua',
//     category: 'vlog',
//   },
// ==============================================================================

export type ChoukaiLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Semua';

export const CHOUKAI_LEVELS: readonly ChoukaiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'Semua'];

export type ChoukaiCategory = 'percakapan' | 'jlpt' | 'berita' | 'vlog' | 'podcast' | 'anime' | 'lainnya';

export const CHOUKAI_CATEGORY_LABELS: Readonly<Record<ChoukaiCategory, string>> = {
  percakapan: 'Percakapan',
  jlpt: 'Latihan JLPT',
  berita: 'Berita',
  vlog: 'Vlog & Keseharian',
  podcast: 'Podcast',
  anime: 'Anime & Drama',
  lainnya: 'Lainnya',
};

export interface ChoukaiYoutubeEntry {
  /** ID unik & stabil (jangan diubah setelah dipublikasikan). */
  id: string;
  kind: 'video' | 'channel';
  title: string;
  /** URL YouTube. Video: watch / youtu.be / shorts / live. Channel: /@handle, /channel/UC…, /c/…, /user/…. */
  url: string;
  /** Nama channel / pembicara (opsional). */
  author?: string;
  /** Perkiraan level pendengar. 'Semua' untuk channel yang isinya campuran. */
  level: ChoukaiLevel;
  category: ChoukaiCategory;
  /** Catatan singkat untuk pembelajar (opsional). */
  note?: string;
  /** Video menyediakan subtitle Jepang (opsional). */
  hasJapaneseSubtitle?: boolean;
}

export const CHOUKAI_YOUTUBE: readonly ChoukaiYoutubeEntry[] = [];
