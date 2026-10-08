// ==============================================================================
// LANTAI 008 — CAKRAWALA KATAKANA (kata serapan di sekitar kita)
// Katakana = sistem bunyi yang sama dengan hiragana, bentuk berbeda. Kata serapan
// adalah pemakaian yang paling sering (BUKAN satu-satunya).
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { BASIC_ROWS, KanaCell, KanaRow, ROW_A, ROW_KA, ROW_SA, ROW_TA, ROW_NA, ROW_HA, ROW_MA, ROW_YA, ROW_RA, ROW_WA, toKata } from '../kana';
import { kanaToSoundRoom, lookalikeRoom, soundToKanaRoom, wordBuildRoom, wordMeaningRoom } from '../builders';
import { Word } from '../words';

const kataCell = (c: KanaCell): KanaCell => ({ k: toKata(c.k), r: c.r });
const kataRow = (row: KanaRow): KanaCell[] => row.cells.map(kataCell);

// ヲ nyaris tidak dipakai di luar partikel (sebunyi dengan オ): dikenali di pelajaran, tidak dijadikan soal.
const ALL_KATA = BASIC_ROWS.flatMap(r => kataRow(r)).filter(c => c.k !== 'ヲ');

export const WORDS_F8: Word[] = [
  { jp: 'テレビ', id: 'televisi' },
  { jp: 'アニメ', id: 'anime' },
  { jp: 'コーヒー', id: 'kopi' },
  { jp: 'ホテル', id: 'hotel' },
  { jp: 'カメラ', id: 'kamera' },
  { jp: 'パン', id: 'roti' },
  { jp: 'ケーキ', id: 'kue tart' },
  { jp: 'ラーメン', id: 'ramen' },
  { jp: 'ジュース', id: 'jus' },
  { jp: 'ビール', id: 'bir' },
  { jp: 'ネット', id: 'internet' },
  { jp: 'ゲーム', id: 'permainan (gim)' },
  { jp: 'コンビニ', id: 'minimarket' },
  { jp: 'テーブル', id: 'meja' },
  { jp: 'バス', id: 'bus' },
  { jp: 'タクシー', id: 'taksi' },
  { jp: 'ドア', id: 'pintu' },
  { jp: 'ノート', id: 'buku catatan' },
  { jp: 'ペン', id: 'pena' },
  { jp: 'アイス', id: 'es krim' },
  { jp: 'サッカー', id: 'sepak bola' },
  { jp: 'テニス', id: 'tenis' },
  { jp: 'ピアノ', id: 'piano' },
  { jp: 'ギター', id: 'gitar' },
  { jp: 'メニュー', id: 'menu' },
  { jp: 'トイレ', id: 'toilet' },
  { jp: 'レストラン', id: 'restoran' },
  { jp: 'ポスト', id: 'kotak pos' },
  { jp: 'パソコン', id: 'komputer' },
  { jp: 'バナナ', id: 'pisang' },
  { jp: 'ミルク', id: 'susu' },
  { jp: 'ガソリン', id: 'bensin' }
];

/** Nama & kata bunyi: katakana bukan hanya untuk serapan bahasa Inggris. */
const USAGE_Q: ChoiceQuestion[] = [
  {
    prompt: 'Mengapa kata ini ditulis dengan katakana?',
    glyph: 'コーヒー',
    options: ['Kata serapan dari bahasa asing', 'Nama orang Jepang', 'Tiruan bunyi', 'Kata kerja'],
    answer: 0,
    explain: 'コーヒー berasal dari kata Belanda "koffie" dan diserap ke bahasa Jepang.'
  },
  {
    prompt: 'Mengapa kata ini ditulis dengan katakana?',
    glyph: 'インドネシア',
    options: ['Kata serapan umum', 'Nama negara asing', 'Tiruan bunyi', 'Kata sifat'],
    answer: 1,
    explain: 'Nama negara, kota, dan orang asing ditulis dengan katakana: インドネシア, ジャカルタ, バリ.'
  },
  {
    prompt: 'Mengapa kata ini ditulis dengan katakana?',
    glyph: 'ワンワン',
    options: ['Kata serapan', 'Nama asing', 'Tiruan bunyi (guk-guk)', 'Kata kerja'],
    answer: 2,
    explain: 'Bunyi tiruan dan tiruan keadaan sering memakai katakana, termasuk ドキドキ (deg-degan).'
  },
  {
    prompt: 'Kata ini bukan dari bahasa Inggris, tetapi tetap katakana. Apa maknanya?',
    glyph: 'ラーメン',
    options: ['Ramen (mi kuah)', 'Es krim', 'Roti', 'Kopi'],
    answer: 0,
    explain: 'ラーメン berasal dari bahasa Tionghoa. Katakana tidak sama dengan "huruf bahasa Inggris".'
  }
];

const FALSE_FRIEND_Q: ChoiceQuestion[] = [
  {
    prompt: 'Katakana bukan ejaan bahasa Inggris. Apa arti ビル?',
    glyph: 'ビル',
    options: ['Tagihan', 'Gedung bertingkat', 'Bir', 'Biola'],
    answer: 1,
    explain: 'ビル = gedung (dari "building"), bukan tagihan. Bir adalah ビール (dengan tanda panjang ー).'
  },
  {
    prompt: 'Apa arti マンション?',
    glyph: 'マンション',
    options: ['Rumah mewah', 'Apartemen', 'Hotel', 'Toko'],
    answer: 1,
    explain: 'マンション = apartemen, bukan "mansion".'
  },
  {
    prompt: 'Apa arti コンセント?',
    glyph: 'コンセント',
    options: ['Persetujuan', 'Stopkontak', 'Konser', 'Konsentrasi'],
    answer: 1,
    explain: 'コンセント = stopkontak listrik.'
  },
  {
    prompt: 'Apa arti ハンドル?',
    glyph: 'ハンドル',
    options: ['Gagang tangan', 'Setir mobil', 'Pegangan pintu', 'Rem'],
    answer: 1,
    explain: 'ハンドル = setir/kemudi kendaraan.'
  },
  {
    prompt: 'Apa arti ガソリンスタンド?',
    glyph: 'ガソリンスタンド',
    options: ['Pompa bensin', 'Toko kelontong', 'Stasiun', 'Bengkel'],
    answer: 0,
    explain: 'ガソリンスタンド = SPBU (dari "gasoline stand").'
  }
];

const ex = (jp: string, meaning: string) => ({ jp, meaning, say: jp });

const rowsStep = (title: string, body: string, rows: KanaRow[], example: { jp: string; meaning: string }) => ({
  title,
  body,
  grid: rows.flatMap(r => r.cells).map(c => ({ glyph: toKata(c.k), sub: `${c.k} · ${c.r}`, say: toKata(c.k) })),
  example: ex(example.jp, example.meaning)
});

export const FLOOR_008_ROOMS: Room[] = [
  {
    id: 'f008-learn',
    skill: 'tulisan',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Saudara Hiragana',
    steps: [
      {
        title: 'Bunyi sama, bentuk lain',
        body: 'Katakana memiliki 46 aksara dengan bunyi yang sama persis seperti hiragana. Kamu tidak belajar bunyi baru, hanya mengenali bentuk baru. Di bawah tiap aksara tertulis pasangan hiragananya.',
        glyph: 'ア',
        reading: 'あ · a',
        say: 'あ'
      },
      rowsStep('Baris A & K', 'Bentuknya bersudut dan tegas.', [ROW_A, ROW_KA], { jp: 'アイス', meaning: 'es krim' }),
      rowsStep('Baris S & T', 'Perhatikan シ (shi) dan ツ (tsu): mudah tertukar.', [ROW_SA, ROW_TA], { jp: 'タクシー', meaning: 'taksi' }),
      rowsStep('Baris N & H', 'Baris N dan H.', [ROW_NA, ROW_HA], { jp: 'ホテル', meaning: 'hotel' }),
      rowsStep('Baris M, Y & R', 'Tidak ada yang baru selain bentuknya.', [ROW_MA, ROW_YA, ROW_RA], { jp: 'カメラ', meaning: 'kamera' }),
      rowsStep('Baris W & ン', 'ン (n) dan ソ (so) mirip: lihat bagian berikutnya.', [ROW_WA], { jp: 'ラーメン', meaning: 'ramen' })
    ]
  },
  {
    id: 'f008-rules',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Pelajari',
    title: 'Aturan yang Sudah Kamu Kenal',
    steps: [
      {
        title: 'Tanda ゛ ゜ dan kana kecil berlaku sama',
        body: 'ガ ザ ダ バ パ, ッ ャ ュ ョ: semua aturan dari Lantai 006 dan 007 berlaku juga untuk katakana. Tidak ada yang perlu dihafal ulang.',
        grid: [
          { glyph: 'ガ', sub: 'ka → ga', say: 'ガ' },
          { glyph: 'ビ', sub: 'hi → bi', say: 'ビ' },
          { glyph: 'パ', sub: 'ha → pa', say: 'パ' },
          { glyph: 'ッ', sub: 'jeda', say: 'ッ' },
          { glyph: 'シャ', sub: 'sha', say: 'シャ' },
          { glyph: 'ジュ', sub: 'ju', say: 'ジュ' }
        ]
      },
      {
        title: 'ー: tanda panjang (khusus katakana)',
        body: 'Katakana memanjangkan vokal dengan garis ー, bukan dengan vokal tambahan. ー dihitung satu ketukan. コーヒー = コ·ー·ヒ·ー = 4 ketukan, sedangkan ビル (2 ketukan) berbeda dari ビール (3 ketukan).',
        beats: ['コ', 'ー', 'ヒ', 'ー'],
        example: ex('コーヒー', 'kopi (4 ketukan)')
      },
      {
        title: 'Kombinasi tambahan untuk bunyi asing',
        body: 'Katakana punya gabungan ekstra untuk bunyi dari bahasa asing. Kamu cukup mengenalinya saat bertemu.',
        grid: [
          { glyph: 'ティ', sub: 'ti', say: 'ティ' },
          { glyph: 'ファ', sub: 'fa', say: 'ファ' },
          { glyph: 'ウィ', sub: 'wi', say: 'ウィ' },
          { glyph: 'ジェ', sub: 'je', say: 'ジェ' },
          { glyph: 'シェ', sub: 'she', say: 'シェ' },
          { glyph: 'チェ', sub: 'che', say: 'チェ' }
        ]
      }
    ]
  },
  {
    id: 'f008-pair',
    skill: 'tulisan',
    kind: 'pair',
    kicker: 'Latih',
    title: 'Pasangkan: Katakana ↔ Hiragana',
    prompt: 'Pasangkan katakana dengan hiragana yang sebunyi.',
    pairs: [['ア', 'あ'], ['カ', 'か'], ['サ', 'さ'], ['タ', 'た'], ['ナ', 'な'], ['ハ', 'は'], ['マ', 'ま'], ['ラ', 'ら']]
  },
  soundToKanaRoom('f008-sound', 'Dengar → Katakana', ALL_KATA, ALL_KATA, { count: 10 }),
  kanaToSoundRoom('f008-kana', 'Katakana → Bunyi', ALL_KATA, ALL_KATA, { count: 10 }),
  lookalikeRoom('f008-look', 'Kembar Katakana', [
    { glyph: 'シ', sound: 'shi', confusedWith: 'tsu', note: 'シ (shi): goresan pendeknya hampir mendatar. ツ (tsu): goresan pendeknya hampir tegak.' },
    { glyph: 'ツ', sound: 'tsu', confusedWith: 'shi', note: 'ツ (tsu): goresan pendeknya hampir tegak. シ (shi): hampir mendatar.' },
    { glyph: 'ソ', sound: 'so', confusedWith: 'n', note: 'ソ (so): goresan pendek hampir tegak. ン (n): goresan pendek bersandar mendatar.' },
    { glyph: 'ン', sound: 'n', confusedWith: 'so', note: 'ン (n): goresan pendek bersandar. ソ (so): goresan pendek tegak.' },
    { glyph: 'ウ', sound: 'u', confusedWith: 'wa', note: 'ウ (u) punya goresan kecil di atas; ワ (wa) tidak.' },
    { glyph: 'コ', sound: 'ko', confusedWith: 'yu', note: 'コ (ko) hanya dua garis; ユ (yu) punya satu garis tambahan.' }
  ]),
  {
    id: 'f008-usage',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Pelajari',
    title: 'Bukan Hanya Kata Serapan',
    steps: [
      {
        title: 'Kata serapan = pemakaian terbanyak',
        body: 'Banyak kata serapan ditulis katakana (テレビ, ホテル), tetapi itu bukan satu-satunya pemakaian. Katakana juga dipakai untuk nama asing, bunyi tiruan, dan kadang penekanan.',
        grid: [
          { glyph: 'ホテル', sub: 'serapan' },
          { glyph: 'インドネシア', sub: 'nama negara' },
          { glyph: 'ワンワン', sub: 'tiruan bunyi' },
          { glyph: 'ラーメン', sub: 'dari bahasa Tionghoa' }
        ]
      },
      {
        title: 'Waspada kata pinjaman palsu',
        body: 'Banyak kata katakana tidak sama dengan arti aslinya dalam bahasa Inggris. Jangan menebak dari ejaan Inggris saja: ビル = gedung, マンション = apartemen.'
      }
    ]
  },
  { id: 'f008-usage-q', skill: 'pola', kind: 'choice', kicker: 'Latih', title: 'Mengapa Katakana?', questions: USAGE_Q },
  { id: 'f008-ff-q', skill: 'kata', kind: 'choice', kicker: 'Latih', title: 'Kata Pinjaman Menjebak', questions: FALSE_FRIEND_Q },
  wordMeaningRoom('f008-read', 'Baca Katakana → Arti', WORDS_F8, WORDS_F8, { count: 12 }),
  wordBuildRoom('f008-build', 'Susun Kata', WORDS_F8.filter(w => w.jp.length <= 4), ALL_KATA.map(c => c.k).concat(['ー', 'ッ']), { count: 6 }),
  wordMeaningRoom('f008-trial', 'Ujian: Baca Katakana', WORDS_F8, WORDS_F8, { count: 10, kicker: 'Ingat', passRatio: 0.8 })
];

