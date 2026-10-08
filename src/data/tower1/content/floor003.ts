// ==============================================================================
// LANTAI 003 — KEBANGKITAN HIRAGANA (あ〜そ)
// Prinsip: aksara → bunyi → KATA (bukan menghafal tabel). Kolam kata tertutup pada
// 15 aksara pertama (lihat WORDS_F3 + tes).
// ==============================================================================

import { Room } from '../../../engine/tower1/types';
import { ROW_A, ROW_KA, ROW_SA } from '../kana';
import {
  kanaPairRoom, kanaToSoundRoom, lookalikeRoom, soundToKanaRoom, wordBuildRoom, wordMeaningRoom
} from '../builders';
import { WORDS_F3 } from '../words';

const ALL = [...ROW_A.cells, ...ROW_KA.cells, ...ROW_SA.cells];
const POOL_CHARS = ALL.map(c => c.k);

const rowStep = (row: typeof ROW_A, body: string, ex: { jp: string; meaning: string }) => ({
  title: row.label,
  body,
  grid: row.cells.map(c => ({ glyph: c.k, sub: c.r, say: c.k })),
  example: { ...ex, say: ex.jp }
});

export const FLOOR_003_ROOMS: Room[] = [
  {
    id: 'f003-learn',
    skill: 'tulisan',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Lima belas aksara pertama',
    steps: [
      {
        title: 'Aksara → bunyi → kata',
        glyph: 'あ',
        say: 'あ',
        reading: 'a',
        body: 'Hiragana adalah aksara bunyi: satu aksara = satu ketukan. Tujuanmu di lantai ini bukan menghafal tabel, melainkan membaca KATA sungguhan. Ketuk 🔊 untuk mendengar tiap aksara.'
      },
      rowStep(ROW_A, 'Lima vokal yang sudah kamu kenal, kini punya bentuk.', { jp: 'いえ', meaning: 'rumah' }),
      rowStep(ROW_KA, 'Konsonan K + vokal. Pola yang sama berlaku di semua baris.', { jp: 'かお', meaning: 'wajah' }),
      rowStep(ROW_SA, 'Perhatikan: し dibaca "shi", bukan "si". Ini pengecualian pertama.', { jp: 'すし', meaning: 'sushi' })
    ]
  },
  kanaPairRoom('f003-pair-a', 'Pasangkan: Baris A & K', [...ROW_A.cells, ...ROW_KA.cells]),
  soundToKanaRoom('f003-sound', 'Dengar → Aksara', ALL, ALL, { count: 10 }),
  kanaToSoundRoom('f003-kana', 'Aksara → Bunyi', ALL, ALL, { count: 10 }),
  lookalikeRoom('f003-look', 'Awas, Mirip!', [
    { glyph: 'い', sound: 'i', confusedWith: 'u', note: 'い = "i" (dua goresan tegak sejajar). う = "u" (goresan pendek di atas, lalu satu lengkungan besar).' },
    { glyph: 'さ', sound: 'sa', confusedWith: 'ki', note: 'さ = "sa", き = "ki" (き punya dua garis mendatar).' },
    { glyph: 'こ', sound: 'ko', confusedWith: 'ku', note: 'こ = "ko" (dua garis mendatar), く = "ku" (seperti tanda kurung sudut).' },
    { glyph: 'お', sound: 'o', confusedWith: 'a', note: 'お = "o", あ = "a". Bedanya: お punya goresan titik kecil di kanan atas, あ tidak.' }
  ]),
  {
    id: 'f003-words',
    skill: 'kata',
    kind: 'lesson',
    kicker: 'Pelajari',
    title: 'Aksara jadi kata',
    steps: [
      {
        title: 'Baca, jangan terjemahkan',
        body: 'Sekarang kamu bisa membaca kata-kata ini. Bunyikan aksara satu per satu, lalu lihat artinya.',
        grid: ['あさ', 'いえ', 'うえ', 'えき', 'おか', 'かお', 'すし', 'せかい'].map(w => ({
          glyph: w,
          sub: WORDS_F3.find(x => x.jp === w)?.id,
          say: w
        }))
      }
    ]
  },
  wordMeaningRoom('f003-read', 'Baca Kata → Arti', WORDS_F3, WORDS_F3, { count: 10, kicker: 'Latih' }),
  wordBuildRoom('f003-build', 'Susun Kata', WORDS_F3.filter(w => w.jp.length <= 3), POOL_CHARS, { count: 6, kicker: 'Latih' }),
  wordMeaningRoom('f003-trial', 'Ujian: Baca Tanpa Romaji', WORDS_F3, WORDS_F3, {
    count: 8, kicker: 'Ingat', passRatio: 0.8
  })
];
