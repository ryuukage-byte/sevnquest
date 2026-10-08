// ==============================================================================
// LANTAI 009 — KEBANGKITAN KANJI (jangkar makna & furigana)
// BUKAN: daftar kanji, radikal, On/Kun, urutan goresan, "kanji = gambar".
// Tujuan: melihat bagaimana kanji dan furigana hidup berdampingan dalam teks nyata,
// dan memakai perubahan jenis aksara (kanji → kana) sebagai petunjuk batas kata.
// Markup furigana: [漢字|かんじ]
// ==============================================================================

import { ChoiceQuestion, PickItem, Room } from '../../../engine/tower1/types';
import { hashString, readingOf, seededShuffle, stripRuby } from '../../../engine/tower1/jp';

interface KanjiWord {
  /** Markup furigana. */
  jp: string;
  id: string;
}

/** Kata yang sudah dikenal dari lantai hiragana: furigana menjadi jembatan ke kanjinya. */
const KNOWN: KanjiWord[] = [
  { jp: '[山|やま]', id: 'gunung' },
  { jp: '[川|かわ]', id: 'sungai' },
  { jp: '[人|ひと]', id: 'orang' },
  { jp: '[水|みず]', id: 'air' },
  { jp: '[日本|にほん]', id: 'Jepang' },
  { jp: '[学校|がっこう]', id: 'sekolah' },
  { jp: '[先生|せんせい]', id: 'guru' },
  { jp: '[犬|いぬ]', id: 'anjing' },
  { jp: '[猫|ねこ]', id: 'kucing' },
  { jp: '[魚|さかな]', id: 'ikan' },
  { jp: '[車|くるま]', id: 'mobil' },
  { jp: '[本|ほん]', id: 'buku' }
];

/** Kata yang belum pernah dipelajari: untuk menguji kemampuan memakai furigana, bukan hafalan. */
const UNFAMILIAR: KanjiWord[] = [
  { jp: '[動物|どうぶつ]', id: 'binatang' },
  { jp: '[図書館|としょかん]', id: 'perpustakaan' },
  { jp: '[天気|てんき]', id: 'cuaca' },
  { jp: '[電車|でんしゃ]', id: 'kereta listrik' },
  { jp: '[野菜|やさい]', id: 'sayuran' },
  { jp: '[牛乳|ぎゅうにゅう]', id: 'susu sapi' },
  { jp: '[友達|ともだち]', id: 'teman' },
  { jp: '[毎日|まいにち]', id: 'setiap hari' },
  { jp: '[時計|とけい]', id: 'jam' },
  { jp: '[病院|びょういん]', id: 'rumah sakit' }
];

const meaningQ = (w: KanjiWord): ChoiceQuestion => {
  const others = KNOWN.filter(x => x.id !== w.id);
  const options = seededShuffle([w, ...seededShuffle(others, hashString(w.jp)).slice(0, 3)], hashString(`m:${w.jp}`)).map(x => x.id);
  return {
    prompt: 'Furigana di atas kanji menunjukkan bacaannya. Apa arti kata ini?',
    glyph: w.jp,
    say: readingOf(w.jp),
    options,
    answer: options.indexOf(w.id),
    explain: `${stripRuby(w.jp)} dibaca "${readingOf(w.jp)}" → ${w.id}.`
  };
};

const readingQ = (w: KanjiWord): ChoiceQuestion => {
  const reading = readingOf(w.jp);
  const others = UNFAMILIAR.filter(x => readingOf(x.jp) !== reading).map(x => readingOf(x.jp));
  const options = seededShuffle([reading, ...seededShuffle(others, hashString(w.jp)).slice(0, 3)], hashString(`r:${w.jp}`));
  return {
    prompt: 'Kanji ini belum kamu pelajari, tetapi furigana membantumu. Bagaimana cara membacanya?',
    glyph: w.jp,
    options,
    answer: options.indexOf(reading),
    explain: `${stripRuby(w.jp)} dibaca "${reading}" (${w.id}). Kamu membacanya lewat furigana, tanpa perlu hafal kanjinya.`
  };
};

const sentenceTokens = (src: string): { text: string; ruby?: string }[] =>
  src.split(' ').map(t => {
    const m = /^\[([^|\]]+)\|([^\]]+)\]$/.exec(t);
    return m ? { text: m[1], ruby: m[2] } : { text: t };
  });

/** Token kalimat dipisah spasi; token kanji bermarkup, sisanya kana. */
const kanjiPick = (src: string, correct: number[], prompt: string, meaning: string, explain: string): PickItem => ({
  prompt,
  tokens: sentenceTokens(src),
  correct,
  meaning,
  explain
});

export const FLOOR_009_ROOMS: Room[] = [
  {
    id: 'f009-meaning',
    skill: 'tulisan',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Kanji: Jangkar Makna',
    steps: [
      {
        title: 'Kanji membawa makna',
        glyph: '[山|やま]',
        say: 'やま',
        body: 'Kanji adalah aksara yang membawa makna kata: 山 berarti "gunung". Kamu tidak harus menghafal ribuan kanji sebelum bisa membaca. Di tahap ini cukup tahu apa PERANNYA di dalam teks.',
        grid: KNOWN.slice(0, 6).map(w => ({ glyph: stripRuby(w.jp), sub: `${readingOf(w.jp)} · ${w.id}`, say: readingOf(w.jp) }))
      },
      {
        title: 'Furigana: pegangan membaca',
        glyph: '[日本|にほん]',
        say: 'にほん',
        body: 'Furigana adalah hiragana kecil di atas kanji yang memberi tahu cara membacanya. Furigana lazim di buku belajar, buku anak, dan manga. Memakainya bukan curang, tetapi cara yang normal untuk membaca kanji yang belum dikenal.',
        example: { jp: '[日本|にほん]の[学校|がっこう]', meaning: 'sekolah di Jepang', say: 'にほんのがっこう' }
      },
      {
        title: 'Inti dan ekor',
        body: 'Pada kata kerja dan kata sifat, kanji memegang INTI makna, sedangkan kana di belakangnya adalah EKOR yang bisa berubah bentuk. 食べます: 食 (inti: makan) + べます (ekor).',
        chunks: [
          { text: '食', role: 'inti' },
          { text: 'べます', role: 'ekor' }
        ],
        example: { jp: '[食|た]べます', meaning: 'makan (sopan)', say: 'たべます' }
      },
      {
        title: 'Perubahan aksara = petunjuk batas kata',
        body: 'Teks Jepang tidak berspasi. Tetapi perhatikan: ketika aksara berganti dari kanji ke kana (atau sebaliknya), sering di situlah satu kata berakhir dan kata berikutnya dimulai. Ini petunjuk yang akan sangat berguna untuk membongkar kalimat.',
        chunks: [
          { text: '私', role: 'kanji' },
          { text: 'は', role: 'kana' },
          { text: '水', role: 'kanji' },
          { text: 'を', role: 'kana' },
          { text: '飲みます', role: 'kanji+kana' }
        ],
        example: { jp: '[私|わたし]は[水|みず]を[飲|の]みます', meaning: 'Saya minum air.', say: 'わたしはみずをのみます' }
      }
    ]
  },
  {
    id: 'f009-furigana',
    skill: 'tulisan',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Furigana → Kata → Arti',
    questions: KNOWN.slice(0, 8).map(meaningQ)
  },
  {
    id: 'f009-pick',
    skill: 'pola',
    kind: 'pick',
    kicker: 'Latih',
    title: 'Inti dan Ekor',
    items: [
      kanjiPick('[私|わたし] は [水|みず] を [飲|の] みます', [0, 2, 4], 'Ketuk semua bagian yang berupa kanji (inti makna).', 'Saya minum air.', 'Kanji: 私, 水, 飲. Sisanya (は, を, みます) kana.'),
      kanjiPick('[先生|せんせい] は [本|ほん] を [読|よ] みます', [0, 2, 4], 'Ketuk semua bagian yang berupa kanji (inti makna).', 'Guru membaca buku.', 'Kanji: 先生, 本, 読.'),
      kanjiPick('[犬|いぬ] が [水|みず] を [飲|の] みます', [0, 2, 4], 'Ketuk semua bagian yang berupa kanji (inti makna).', 'Anjing minum air.', 'Kanji: 犬, 水, 飲.'),
      kanjiPick('[私|わたし] は [毎日|まいにち] [魚|さかな] を [食|た] べます', [6], 'Ketuk "ekor" kana dari kata kerja (bagian yang menempel pada kanji kata kerja).', 'Saya makan ikan setiap hari.', 'べます adalah ekor kata kerja 食べます.'),
      kanjiPick('[学校|がっこう] は [大|おお] きい です', [3], 'Ketuk "ekor" kana dari kata sifat (menempel pada kanji 大).', 'Sekolahnya besar.', 'きい adalah ekor kata sifat 大きい.')
    ]
  },
  {
    id: 'f009-trial',
    skill: 'tulisan',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Ujian: Baca Lewat Furigana',
    passRatio: 0.8,
    questions: UNFAMILIAR.slice(0, 8).map(readingQ)
  }
];
