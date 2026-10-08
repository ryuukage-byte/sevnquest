// ==============================================================================
// LANTAI 006 — TANDA RESONANSI (dakuten ゛ & handakuten ゜)
// Konsep: ini MODIFIKASI aksara yang sudah dikenal, bukan 25 aksara baru.
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';
import { BASIC_ROWS, VOICED_ROWS, ROW_GA, ROW_ZA, ROW_DA, ROW_BA, ROW_PA } from '../kana';
import {
  kanaPairRoom, kanaToSoundRoom, soundToKanaRoom, wordBuildRoom, wordMeaningRoom
} from '../builders';
import { WORDS_F5, WORDS_F6 } from '../words';

// ぢ/づ sebunyi dengan じ/ず dan sangat jarang dipakai: dikenali di pelajaran, tidak dijadikan soal bunyi.
const VOICED = VOICED_ROWS.flatMap(r => r.cells).filter(c => c.k !== 'ぢ' && c.k !== 'づ');
const ALL = [...BASIC_ROWS.flatMap(r => r.cells), ...VOICED];
const WORDS = [...WORDS_F6, ...WORDS_F5];
const POOL_CHARS = ALL.map(c => c.k);

/** "さ + ゛ = ?" */
const deriveQ = (base: string, mark: '゛' | '゜', result: string, wrong: string[], note: string): ChoiceQuestion => {
  const options = seededShuffle([result, ...wrong], hashString(`derive:${base}${mark}`));
  return {
    prompt: `${base} + ${mark} = ?`,
    glyph: `${base} ${mark}`,
    options,
    answer: options.indexOf(result),
    explain: note
  };
};

const pairHear = (voiced: string, plain: string, meaningVoiced: string, meaningPlain: string): ChoiceQuestion => {
  const options = seededShuffle([voiced, plain], hashString(`hear:${voiced}`));
  return {
    prompt: 'Dengarkan. Kata mana yang diucapkan?',
    say: voiced,
    listenOnly: true,
    fallback: voiced,
    options,
    answer: options.indexOf(voiced),
    explain: `${voiced} = "${meaningVoiced}" (bersuara), ${plain} = "${meaningPlain}" (tak bersuara). Satu tanda kecil mengubah artinya.`
  };
};

export const FLOOR_006_ROOMS: Room[] = [
  {
    id: 'f006-learn',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Dua tanda kecil',
    steps: [
      {
        title: 'Tanda dua titik ゛ (dakuten)',
        body: 'Tambahkan ゛ pada aksara yang kamu kenal, dan bunyinya menjadi "bersuara" (tenggorokan bergetar): か→が, さ→ざ, た→だ, は→ば. Tidak ada aksara baru untuk dihafal, hanya satu aturan.',
        grid: [
          { glyph: 'か → が', sub: 'ka → ga', say: 'が' },
          { glyph: 'さ → ざ', sub: 'sa → za', say: 'ざ' },
          { glyph: 'た → だ', sub: 'ta → da', say: 'だ' },
          { glyph: 'は → ば', sub: 'ha → ba', say: 'ば' }
        ]
      },
      {
        title: 'Tanda lingkaran ゜ (handakuten)',
        body: 'Hanya baris H yang mendapat ゜: は→ぱ, ひ→ぴ, ふ→ぷ, へ→ぺ, ほ→ぽ. Bunyinya "p".',
        grid: ROW_PA.cells.map(c => ({ glyph: c.k, sub: c.r, say: c.k })),
        example: { jp: 'ぱん', meaning: 'roti', say: 'ぱん' }
      },
      {
        title: 'Perhatikan perubahan khusus',
        body: 'し→じ dibaca "ji", ち→ぢ juga "ji", つ→づ juga "zu" seperti ず. ぢ dan づ sangat jarang dipakai; cukup kenali bentuknya.',
        grid: [
          { glyph: 'し → じ', sub: 'shi → ji', say: 'じ' },
          { glyph: 'す → ず', sub: 'su → zu', say: 'ず' },
          { glyph: 'ち → ぢ', sub: 'chi → ji (jarang)', say: 'ぢ' },
          { glyph: 'つ → づ', sub: 'tsu → zu (jarang)', say: 'づ' }
        ]
      },
      {
        title: 'Seluruh keluarga',
        body: 'Lima baris baru, semuanya turunan dari aksara lama.',
        grid: [...ROW_GA.cells, ...ROW_ZA.cells, ...ROW_DA.cells, ...ROW_BA.cells].map(c => ({ glyph: c.k, sub: c.r, say: c.k }))
      }
    ]
  },
  {
    id: 'f006-derive',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Turunkan dari Aturan',
    questions: [
      deriveQ('か', '゛', 'が', ['ぱ', 'だ', 'ざ'], 'か + ゛ = が (ga).'),
      deriveQ('さ', '゛', 'ざ', ['が', 'ぱ', 'ば'], 'さ + ゛ = ざ (za).'),
      deriveQ('た', '゛', 'だ', ['ざ', 'ぱ', 'が'], 'た + ゛ = だ (da).'),
      deriveQ('は', '゛', 'ば', ['ぱ', 'が', 'ざ'], 'は + ゛ = ば (ba).'),
      deriveQ('は', '゜', 'ぱ', ['ば', 'が', 'だ'], 'は + ゜ = ぱ (pa). ゜ hanya dipakai pada baris H.'),
      deriveQ('ほ', '゜', 'ぽ', ['ぼ', 'ご', 'ぞ'], 'ほ + ゜ = ぽ (po).'),
      deriveQ('し', '゛', 'じ', ['ぜ', 'ず', 'ぎ'], 'し + ゛ = じ (ji).'),
      deriveQ('け', '゛', 'げ', ['ぜ', 'で', 'べ'], 'け + ゛ = げ (ge).')
    ]
  },
  kanaPairRoom('f006-pair-g', 'Pasangkan: G & Z', [...ROW_GA.cells, ...ROW_ZA.cells.filter(c => c.k !== 'ぜ')]),
  soundToKanaRoom('f006-sound', 'Dengar → Aksara', VOICED, ALL, { count: 10 }),
  kanaToSoundRoom('f006-kana', 'Aksara → Bunyi', VOICED, ALL, { count: 10 }),
  {
    id: 'f006-hear',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Bersuara atau Tidak?',
    questions: [
      pairHear('かぎ', 'かき', 'kunci', 'kesemek'),
      pairHear('ぶた', 'ふた', 'babi', 'tutup'),
      pairHear('かん', 'がん', 'kaleng', 'kanker'),
      pairHear('ぺん', 'へん', 'pena', 'aneh'),
      pairHear('ぱん', 'はん', 'roti', 'cap/stempel')
    ]
  },
  wordMeaningRoom('f006-read', 'Baca Kata → Arti', WORDS_F6, WORDS, { count: 12 }),
  wordBuildRoom('f006-build', 'Susun Kata', WORDS_F6.filter(w => w.jp.length <= 4), POOL_CHARS, { count: 6 }),
  wordMeaningRoom('f006-trial', 'Ujian: Baca Kata Bersuara', WORDS, WORDS, {
    count: 10, kicker: 'Ingat', passRatio: 0.8
  })
];
