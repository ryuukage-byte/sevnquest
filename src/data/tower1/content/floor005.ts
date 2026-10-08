// ==============================================================================
// LANTAI 005 — CAKRAWALA HIRAGANA (Gerbang Utama · 46 aksara dasar)
// Kemandirian aksara tahap 1: membaca tanpa Romaji. Ujian gerbang memakai kata saja.
// ==============================================================================

import { Room } from '../../../engine/tower1/types';
import { BASIC_ROWS, ROW_MA, ROW_YA, ROW_RA, ROW_WA } from '../kana';
import {
  kanaPairRoom, kanaToSoundRoom, lookalikeRoom, soundToKanaRoom, wordBuildRoom, wordListenRoom, wordMeaningRoom
} from '../builders';
import { WORDS_F3, WORDS_F4, WORDS_F5 } from '../words';

const NEW = [...ROW_MA.cells, ...ROW_YA.cells, ...ROW_RA.cells, ...ROW_WA.cells];
const ALL = BASIC_ROWS.flatMap(r => r.cells);
const WORDS = [...WORDS_F5, ...WORDS_F4, ...WORDS_F3];
const POOL_CHARS = ALL.map(c => c.k);

const rowStep = (row: (typeof BASIC_ROWS)[number], body: string, ex: { jp: string; meaning: string }) => ({
  title: row.label,
  body,
  grid: row.cells.map(c => ({ glyph: c.k, sub: c.r, say: c.k })),
  example: { ...ex, say: ex.jp }
});

export const FLOOR_005_ROOMS: Room[] = [
  {
    id: 'f005-learn',
    skill: 'tulisan',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Aksara terakhir',
    steps: [
      rowStep(ROW_MA, 'Baris M mengikuti pola biasa.', { jp: 'みせ', meaning: 'toko' }),
      rowStep(ROW_YA, 'Baris Y hanya punya tiga aksara (tidak ada "yi" dan "ye").', { jp: 'やま', meaning: 'gunung' }),
      rowStep(ROW_RA, 'Bunyi R Jepang berada di antara "r" dan "l": satu ketukan lidah ringan.', { jp: 'さくら', meaning: 'bunga sakura' }),
      {
        ...rowStep(ROW_WA, 'わ = "wa". を dibaca "o" (bukan "wo") dan hampir hanya dipakai sebagai penanda kalimat. ん adalah satu ketukan penuh.', { jp: 'ほん', meaning: 'buku' }),
        beats: ['ほ', 'ん']
      }
    ]
  },
  kanaPairRoom('f005-pair-m', 'Pasangkan: Baris M, Y & R', [...ROW_MA.cells, ...ROW_YA.cells, ...ROW_RA.cells.slice(0, 2)]),
  soundToKanaRoom('f005-sound', 'Dengar → Aksara', NEW, ALL, { count: 10 }),
  kanaToSoundRoom('f005-kana', 'Aksara → Bunyi', NEW, ALL, { count: 10 }),
  lookalikeRoom('f005-look', 'Kembar Berbahaya', [
    { glyph: 'ぬ', sound: 'nu', confusedWith: 'me', note: 'ぬ = "nu" punya simpul tertutup di ekornya; め = "me" tidak.' },
    { glyph: 'る', sound: 'ru', confusedWith: 'ro', note: 'る = "ru" punya simpul kecil di ujung; ろ = "ro" terbuka.' },
    { glyph: 'れ', sound: 're', confusedWith: 'ne', note: 'れ = "re" berakhir dengan kait keluar; ね = "ne" berakhir dengan simpul.' },
    { glyph: 'わ', sound: 'wa', confusedWith: 're', note: 'わ = "wa" berakhir melengkung ke dalam; れ = "re" berakhir dengan kait keluar.' },
    { glyph: 'り', sound: 'ri', confusedWith: 'i', note: 'り = "ri": goresan kanan lebih panjang. い = "i": goresan kiri lebih panjang.' },
    { glyph: 'ま', sound: 'ma', confusedWith: 'ho', note: 'ま = "ma" (garis dasar melengkung), ほ = "ho" (kaki lurus).' }
  ]),
  wordMeaningRoom('f005-read', 'Baca Kata → Arti', WORDS_F5, WORDS, { count: 12 }),
  wordBuildRoom('f005-build', 'Susun Kata', WORDS_F5.filter(w => w.jp.length <= 4), POOL_CHARS, { count: 6 }),
  {
    id: 'f005-gate-intro',
    skill: 'tulisan',
    kind: 'lesson',
    kicker: 'Gerbang',
    title: 'Gerbang Utama',
    steps: [
      {
        title: 'Tanpa Romaji',
        body: 'Gerbang ini menguji apakah kamu sudah membaca hiragana dasar secara mandiri. Tidak ada Romaji, tidak ada tabel. Hanya kata dan telingamu. Butuh akurasi 85% pada percobaan pertama.',
        glyph: 'さあ いこう',
        say: 'さあ いこう'
      }
    ]
  },
  wordMeaningRoom('f005-gate-read', 'Gerbang: Baca Kata', WORDS, WORDS, { count: 14, kicker: 'Gerbang', passRatio: 0.85 }),
  wordListenRoom('f005-gate-listen', 'Gerbang: Dengar Kata', WORDS, WORDS, { count: 6, kicker: 'Gerbang', passRatio: 0.8 })
];
