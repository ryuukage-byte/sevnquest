// ==============================================================================
// LANTAI 004 — ALIRAN KONSONAN (た〜ほ: baris T, N, H)
// Fokus: membaca kata mandiri + bunyi yang menyimpang dari pola (し・ち・つ・ふ).
// ==============================================================================

import { Room } from '../../../engine/tower1/types';
import { ROW_A, ROW_KA, ROW_SA, ROW_TA, ROW_NA, ROW_HA } from '../kana';
import {
  kanaPairRoom, kanaToSoundRoom, lookalikeRoom, soundToKanaRoom, wordBuildRoom, wordMeaningRoom
} from '../builders';
import { WORDS_F3, WORDS_F4 } from '../words';

const NEW = [...ROW_TA.cells, ...ROW_NA.cells, ...ROW_HA.cells];
const ALL = [...ROW_A.cells, ...ROW_KA.cells, ...ROW_SA.cells, ...NEW];
const WORDS = [...WORDS_F4, ...WORDS_F3];
const POOL_CHARS = ALL.map(c => c.k);

const rowStep = (row: typeof ROW_TA, body: string, ex: { jp: string; meaning: string }) => ({
  title: row.label,
  body,
  grid: row.cells.map(c => ({ glyph: c.k, sub: c.r, say: c.k })),
  example: { ...ex, say: ex.jp }
});

export const FLOOR_004_ROOMS: Room[] = [
  {
    id: 'f004-learn',
    skill: 'tulisan',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Lima belas aksara berikutnya',
    steps: [
      rowStep(ROW_TA, 'Hati-hati: ち dibaca "chi" dan つ dibaca "tsu", bukan "ti" dan "tu".', { jp: 'つき', meaning: 'bulan' }),
      rowStep(ROW_NA, 'Baris N mengikuti pola yang lazim.', { jp: 'ねこ', meaning: 'kucing' }),
      rowStep(ROW_HA, 'ふ dibaca "fu" (bibir hampir tidak menyentuh gigi). Pola H lainnya biasa saja.', { jp: 'ふね', meaning: 'kapal' }),
      {
        title: 'Empat bunyi tak terduga',
        body: 'Empat aksara ini tidak mengikuti pola Latin yang kamu kira. Hafalkan sebagai kelompok.',
        grid: [
          { glyph: 'し', sub: 'shi (bukan si)', say: 'し' },
          { glyph: 'ち', sub: 'chi (bukan ti)', say: 'ち' },
          { glyph: 'つ', sub: 'tsu (bukan tu)', say: 'つ' },
          { glyph: 'ふ', sub: 'fu (bukan hu)', say: 'ふ' }
        ]
      }
    ]
  },
  kanaPairRoom('f004-pair-t', 'Pasangkan: Baris T & N', [...ROW_TA.cells, ...ROW_NA.cells]),
  kanaPairRoom('f004-pair-h', 'Pasangkan: Baris H & Empat Tak Terduga', [
    ...ROW_HA.cells,
    { k: 'し', r: 'shi' }, { k: 'ち', r: 'chi' }, { k: 'つ', r: 'tsu' }
  ]),
  soundToKanaRoom('f004-sound', 'Dengar → Aksara', NEW, ALL, { count: 10 }),
  kanaToSoundRoom('f004-kana', 'Aksara → Bunyi', NEW, ALL, { count: 10 }),
  lookalikeRoom('f004-look', 'Awas, Mirip!', [
    { glyph: 'ち', sound: 'chi', confusedWith: 'sa', note: 'ち = "chi"; さ = "sa". Keduanya hampir bayangan cermin satu sama lain.' },
    { glyph: 'は', sound: 'ha', confusedWith: 'ho', note: 'は = "ha", ほ = "ho". ほ punya satu garis mendatar tambahan di kanan.' },
    { glyph: 'つ', sound: 'tsu', confusedWith: 'shi', note: 'つ = "tsu" melengkung mendatar; し = "shi" melengkung tegak seperti kail.' },
    { glyph: 'な', sound: 'na', confusedWith: 'ta', note: 'な = "na" punya simpul kecil di kanan bawah; た = "ta" tidak.' }
  ]),
  wordMeaningRoom('f004-read', 'Baca Kata → Arti', WORDS_F4, WORDS, { count: 10 }),
  wordBuildRoom('f004-build', 'Susun Kata', WORDS_F4.filter(w => w.jp.length <= 3), POOL_CHARS, { count: 6 }),
  wordMeaningRoom('f004-trial', 'Ujian: Kata dari 30 Aksara', WORDS, WORDS, {
    count: 10, kicker: 'Ingat', passRatio: 0.8
  })
];
