// ==============================================================================
// LANTAI 010 — RAJA DI UJUNG (predikat menutup kalimat)
// Mental model yang dilatih: "cari ujung kalimat dulu". BUKAN "Jepang selalu SOV"
// dan bukan soal keluwesan urutan kata. Spasi antar-bagian hanya alat belajar.
// ==============================================================================

import { ChoiceQuestion, PickItem, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

/** Bagian dipisah spasi; raja = bagian terakhir (indeks dihitung otomatis). */
const king = (src: string, meaning: string, explain?: string): PickItem => {
  const tokens = src.split(' ').map(text => ({ text }));
  return {
    prompt: 'Ketuk "raja" kalimat: bagian yang menutup kalimat dan menyatakan apa yang terjadi/apa itu.',
    tokens,
    correct: [tokens.length - 1],
    meaning,
    explain: explain ?? `Raja kalimat ada di ujung: ${tokens[tokens.length - 1].text}.`
  };
};

const orderQ = (prompt: string, right: string, wrong: string[], explain: string): ChoiceQuestion => {
  const options = seededShuffle([right, ...wrong], hashString(`order:${right}`));
  return { prompt, options, answer: options.indexOf(right), explain };
};

export const FLOOR_010_ROOMS: Room[] = [
  {
    id: 'f010-learn',
    skill: 'kalimat',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Raja di Ujung',
    steps: [
      {
        title: 'Ujung adalah kuncinya',
        body: 'Dalam kalimat Jepang, bagian yang menyatakan "apa yang terjadi" atau "apa itu" biasanya berada di UJUNG. Kita menyebutnya raja kalimat (predikat). Bagian lain hanya memberi keterangan tentang sang raja.',
        compare: [
          { label: 'Indonesia', value: 'Saya | makan | apel' },
          { label: 'Jepang (urutan makna)', value: 'Saya | apel | makan' }
        ],
        chunks: [
          { text: 'わたしは', role: 'siapa' },
          { text: 'りんごを', role: 'apa' },
          { text: 'たべます', role: 'raja', king: true }
        ],
        example: { jp: 'わたしは りんごを たべます', meaning: 'Saya makan apel.', say: 'わたしは りんごを たべます' }
      },
      {
        title: 'Raja punya banyak wajah',
        body: 'Raja bisa berupa kata kerja, kata sifat, atau benda + です. Apa pun wajahnya, ia menutup kalimat. Jenis-jenisnya baru dibahas di Lantai 013; sekarang cukup menemukannya.',
        chunks: [
          { text: 'ねこが', role: 'siapa' },
          { text: 'さかなを', role: 'apa' },
          { text: 'たべます', role: 'raja', king: true }
        ],
        compare: [
          { label: 'kata kerja', value: 'たべます (makan)' },
          { label: 'kata sifat', value: 'おいしいです (enak)' },
          { label: 'benda + です', value: 'がくせいです (adalah pelajar)' }
        ]
      },
      {
        title: 'Strategi membaca',
        body: 'Mulai dari ujung. Temukan sang raja dulu, lalu bacalah bagian-bagian lain sebagai keterangannya. Dalam teks asli tidak ada spasi antar-bagian; spasi di sini hanya alat bantu belajar.'
      }
    ]
  },
  {
    id: 'f010-find',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Latih',
    title: 'Temukan Sang Raja',
    items: [
      king('わたしは りんごを たべます', 'Saya makan apel.'),
      king('ねこが さかなを たべます', 'Kucing makan ikan.'),
      king('わたしは みずを のみます', 'Saya minum air.'),
      king('これは ほんです', 'Ini buku.'),
      king('わたしは がくせいです', 'Saya pelajar.'),
      king('ここは えきです', 'Di sini stasiun.'),
      king('この りんごは おいしいです', 'Apel ini enak.'),
      king('わたしは ともだちと ごはんを たべます', 'Saya makan bersama teman.'),
      king('せんせいは みせで ほんを かいます', 'Guru membeli buku di toko.'),
      king('あした ともだちと うみで およぎます', 'Besok saya berenang di laut bersama teman.')
    ]
  },
  {
    id: 'f010-furigana',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Latih',
    title: 'Raja dalam Teks Berkanji',
    items: [
      {
        prompt: 'Ketuk sang raja. Furigana membantumu membaca kanjinya.',
        tokens: [{ text: '[私|わたし]は' }, { text: '[水|みず]を' }, { text: '[飲|の]みます' }],
        correct: [2],
        meaning: 'Saya minum air.',
        explain: '飲みます (のみます) menutup kalimat.'
      },
      {
        prompt: 'Ketuk sang raja. Furigana membantumu membaca kanjinya.',
        tokens: [{ text: '[先生|せんせい]は' }, { text: '[本|ほん]を' }, { text: '[読|よ]みます' }],
        correct: [2],
        meaning: 'Guru membaca buku.',
        explain: '読みます (よみます) menutup kalimat.'
      },
      {
        prompt: 'Ketuk sang raja. Furigana membantumu membaca kanjinya.',
        tokens: [{ text: '[学校|がっこう]は' }, { text: '[大|おお]きいです' }],
        correct: [1],
        meaning: 'Sekolahnya besar.',
        explain: '大きいです menutup kalimat.'
      }
    ]
  },
  {
    id: 'f010-order',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Mana yang Menutup?',
    questions: [
      orderQ(
        'Kalimat mana yang menempatkan raja di ujung dengan benar? (Artinya: Saya makan apel.)',
        'わたしは りんごを たべます',
        ['わたしは たべます りんごを', 'たべます わたしは りんごを'],
        'Raja たべます (makan) harus menutup kalimat.'
      ),
      orderQ(
        'Kalimat mana yang menempatkan raja di ujung dengan benar? (Artinya: Kucing minum air.)',
        'ねこが みずを のみます',
        ['ねこが のみます みずを', 'のみます ねこが みずを'],
        'Raja のみます (minum) harus menutup kalimat.'
      ),
      orderQ(
        'Pada "ここは おおきい えきです", kata sifat おおきい ada sebelum えき. Apa sang raja?',
        'えきです',
        ['おおきい', 'ここは'],
        'おおきい hanya menerangkan えき. Raja kalimat adalah えきです (adalah stasiun).'
      )
    ]
  },
  {
    id: 'f010-trial',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Ingat',
    title: 'Ujian: Kalimat Baru',
    passRatio: 0.8,
    items: [
      king('まいにち ともだちと あいます', 'Setiap hari saya bertemu teman.'),
      king('ねこは さかなが すきです', 'Kucing suka ikan.'),
      king('この みせは あたらしいです', 'Toko ini baru.'),
      king('わたしは まいにち ほんを よみます', 'Saya membaca buku setiap hari.'),
      king('わたしの ははは ごはんを つくります', 'Ibu saya memasak nasi.'),
      king('ここは おおきい えきです', 'Di sini stasiun besar.', 'おおきい menerangkan えき; sang raja adalah えきです.'),
      king('たなかさんは ほんを よみます', 'Tanaka membaca buku.')
    ]
  }
];
