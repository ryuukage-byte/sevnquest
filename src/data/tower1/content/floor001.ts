// ==============================================================================
// LANTAI 001 — AMBANG PINTU (Orientasi)
// Ringan: bukan buku teks mini. Tujuan: pemain tahu apa itu bahasa Jepang secara garis
// besar (bunyi + aksara + struktur), melihat satu kalimat nyata dibongkar, dan mencoba
// siklus belajar SevnQuest.
// ==============================================================================

import { Room } from '../../../engine/tower1/types';

export const FLOOR_001_ROOMS: Room[] = [
  {
    id: 'f001-welcome',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Tiga Lapisan Bahasa Jepang',
    steps: [
      {
        title: 'Selamat datang di Menara',
        glyph: 'ようこそ',
        say: 'ようこそ',
        body: 'Di Menara 1 kamu belajar MELIHAT bahasa Jepang: apa yang sedang kamu lihat, bagaimana ia tersusun, dan bagaimana mendekati teks yang belum kamu kenal. Kamu tidak perlu bisa berbicara dulu. Menara 2 yang akan mengajarkan cara menyusun kalimat sendiri.'
      },
      {
        title: 'Lapisan 1 · Bunyi',
        glyph: 'さくら',
        say: 'さくら',
        body: 'Bahasa Jepang terdengar sebagai rangkaian ketukan yang rapi: sa · ku · ra. Bunyinya dekat dengan vokal bahasa Indonesia, jadi telingamu sudah separuh siap.'
      },
      {
        title: 'Lapisan 2 · Aksara',
        body: 'Satu teks Jepang memakai tiga jenis aksara sekaligus. Ketiganya bukan saingan, melainkan satu sistem yang saling melengkapi.',
        grid: [
          { glyph: 'さくら', sub: 'Hiragana' },
          { glyph: 'コーヒー', sub: 'Katakana' },
          { glyph: '日本', sub: 'Kanji' }
        ]
      },
      {
        title: 'Lapisan 3 · Struktur',
        body: 'Kalimat Jepang punya pola yang bisa dikenali. Lihat satu kalimat nyata ini, lalu perhatikan bagian paling ujungnya.',
        chunks: [
          { text: 'わたし', role: 'pelaku' },
          { text: 'は', role: 'penanda' },
          { text: 'りんご', role: 'benda' },
          { text: 'を', role: 'penanda' },
          { text: 'たべます', role: 'predikat', king: true }
        ],
        example: { jp: 'わたしは りんごを たべます', meaning: 'Saya makan apel.', say: 'わたしは りんごを たべます' }
      },
      {
        title: 'Siklus belajar',
        body: 'Setiap lantai memakai siklus yang sama: TEMUKAN hal baru, PELAJARI polanya, LATIH dengan soal pendek, lalu INGAT lewat ujian kecil di akhir. Salah itu aman: soal yang salah akan kembali sampai kamu menguasainya.',
        compare: [
          { label: 'Temukan', value: 'Lihat dan dengarkan hal baru' },
          { label: 'Pelajari', value: 'Pahami polanya' },
          { label: 'Latih', value: 'Soal pendek bertahap' },
          { label: 'Ingat', value: 'Ujian kecil sebagai bukti' }
        ]
      }
    ]
  },
  {
    id: 'f001-scripts',
    skill: 'tulisan',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Aksara Apa Ini?',
    passRatio: 0.6,
    questions: [
      {
        prompt: 'Jenis aksara apa yang dipakai kata ini?',
        glyph: 'さくら',
        options: ['Hiragana', 'Katakana', 'Kanji'],
        answer: 0,
        explain: 'Bentuknya membulat dan lembut: itu hiragana. Dipakai untuk kata asli Jepang dan bagian tata bahasa.'
      },
      {
        prompt: 'Jenis aksara apa yang dipakai kata ini?',
        glyph: 'コーヒー',
        options: ['Hiragana', 'Katakana', 'Kanji'],
        answer: 1,
        explain: 'Bentuknya bersudut dan tegas: itu katakana. Sering dipakai untuk kata serapan seperti コーヒー (kopi).'
      },
      {
        prompt: 'Jenis aksara apa yang dipakai kata ini?',
        glyph: '日本',
        options: ['Hiragana', 'Katakana', 'Kanji'],
        answer: 2,
        explain: 'Aksara yang membawa makna kata: itu kanji. 日本 berarti "Jepang".'
      },
      {
        prompt: 'Jenis aksara apa yang dipakai kata ini?',
        glyph: 'テレビ',
        options: ['Hiragana', 'Katakana', 'Kanji'],
        answer: 1,
        explain: 'テレビ (televisi) memakai katakana.'
      },
      {
        prompt: 'Jenis aksara apa yang dipakai kata ini?',
        glyph: 'ありがとう',
        options: ['Hiragana', 'Katakana', 'Kanji'],
        answer: 0,
        explain: 'ありがとう seluruhnya hiragana.'
      }
    ]
  },
  {
    id: 'f001-king',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Mengintip Struktur',
    questions: [
      {
        prompt: 'わたしは りんごを たべます. Menurutmu, bagian mana yang menutup kalimat?',
        glyph: 'わたしは りんごを たべます',
        options: ['わたし', 'りんご', 'たべます'],
        answer: 2,
        explain: 'Di bahasa Jepang, bagian yang menyatakan "apa yang terjadi" (たべます = makan) biasanya berada di ujung. Kamu akan melatih ini di Lantai 010.'
      },
      {
        prompt: 'Bahasa Jepang memakai berapa jenis aksara sekaligus dalam teks biasa?',
        options: ['Satu', 'Dua', 'Tiga'],
        answer: 2,
        explain: 'Hiragana, katakana, dan kanji dipakai bersama dalam satu teks.'
      }
    ]
  }
];
