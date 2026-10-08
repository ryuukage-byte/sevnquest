// ==============================================================================
// LANTAI 013 — TIGA MESIN (keluarga predikat)
// Yang dilatih: menentukan keluarga predikat. Tanpa konjugasi (itu Menara 2).
// Kata sifat-na dilipat ke keluarga 1 ("benda-mirip + です"). Jebakan utama:
// おいしいです = kata sifat-i + です (kesopanan), BUKAN benda + です.
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

const FAM = {
  noun: 'Benda + です (adalah / bersifat ...)',
  adjI: 'Kata sifat-i (berakhir い)',
  verb: 'Kata kerja'
} as const;
const ALL: string[] = [FAM.noun, FAM.adjI, FAM.verb];

const fam = (sentence: string, meaning: string, right: string, explain: string, kicker = 'Apa keluarga predikat pada kalimat ini?'): ChoiceQuestion => {
  const options = seededShuffle(ALL, hashString(`f013:${sentence}`));
  return {
    prompt: kicker,
    glyph: sentence,
    say: sentence,
    options,
    answer: options.indexOf(right),
    explain: `${explain} (${meaning})`
  };
};

export const FLOOR_013_ROOMS: Room[] = [
  {
    id: 'f013-learn',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Tiga Mesin',
    steps: [
      {
        title: 'Hanya ada tiga keluarga predikat',
        body: 'Sang raja kalimat selalu salah satu dari tiga "mesin". Mengenali mesinnya memberi tahu apa yang dilakukan kalimat itu, tanpa perlu menghafal perubahan bentuknya.',
        grid: [
          { glyph: '①', sub: 'Benda + です' },
          { glyph: '②', sub: 'Kata sifat-i' },
          { glyph: '③', sub: 'Kata kerja' }
        ]
      },
      {
        title: '① Benda + です',
        body: 'Menyatakan "adalah" atau "bersifat". Termasuk kata sifat-na (きれい, しずか, げんき): perilakunya seperti benda yang diikuti です.',
        chunks: [
          { text: 'これは', role: 'topik' },
          { text: 'ほんです', role: 'raja', king: true }
        ],
        compare: [
          { label: 'benda', value: 'がくせいです (adalah pelajar)' },
          { label: 'sifat-na', value: 'きれいです (cantik/bersih)' }
        ],
        example: { jp: 'これは ほんです', meaning: 'Ini buku.', say: 'これは ほんです' }
      },
      {
        title: '② Kata sifat-i',
        body: 'Kata sifat yang berakhir い (おいしい, おおきい, あつい). です hanya menambah kesopanan; kata sifatnya sendiri sudah menjadi predikat.',
        compare: [
          { label: 'おいしい', value: 'enak (kata sifat-i)' },
          { label: 'おいしいです', value: 'enak (sopan)' }
        ],
        example: { jp: 'この りんごは おいしいです', meaning: 'Apel ini enak.', say: 'この りんごは おいしいです' }
      },
      {
        title: '③ Kata kerja',
        body: 'Kata yang menyatakan tindakan atau keberadaan. Dalam bentuk sopan berakhir ます (たべます, のみます, いきます).',
        example: { jp: 'わたしは みずを のみます', meaning: 'Saya minum air.', say: 'わたしは みずを のみます' }
      },
      {
        title: 'Waspada jebakan',
        body: 'おいしいです TIDAK sama dengan "benda + です". Cek kata sebelum です: bila ia kata sifat berakhir い, mesinnya kata sifat-i. きれいです dan ゆうめいです adalah pengecualian terkenal: berakhir い tetapi berperilaku sebagai kata sifat-na (kelompok ①).',
        compare: [
          { label: 'がくせいです', value: '① benda' },
          { label: 'おいしいです', value: '② sifat-i' },
          { label: 'きれいです', value: '① sifat-na (jebakan)' }
        ]
      }
    ]
  },
  {
    id: 'f013-classify',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Mesin Apa Ini?',
    questions: [
      fam('これは ほんです', 'Ini buku.', FAM.noun, 'ほん adalah benda, diikuti です.'),
      fam('わたしは がくせいです', 'Saya pelajar.', FAM.noun, 'がくせい adalah benda.'),
      fam('この りんごは おいしいです', 'Apel ini enak.', FAM.adjI, 'おいしい adalah kata sifat-i; です hanya sopan.'),
      fam('この ほんは たかいです', 'Buku ini mahal.', FAM.adjI, 'たかい berakhir い dan menjadi predikat.'),
      fam('わたしは みずを のみます', 'Saya minum air.', FAM.verb, 'のみます adalah kata kerja bentuk sopan.'),
      fam('ともだちは がっこうへ いきます', 'Teman pergi ke sekolah.', FAM.verb, 'いきます adalah kata kerja bentuk sopan.'),
      fam('このへやは しずかです', 'Ruangan ini tenang.', FAM.noun, 'しずか adalah kata sifat-na: berperilaku seperti benda + です.'),
      fam('ねこは かわいいです', 'Kucing itu lucu.', FAM.adjI, 'かわいい berakhir い dan menjadi predikat.'),
      fam('せんせいは ほんを よみます', 'Guru membaca buku.', FAM.verb, 'よみます adalah kata kerja.'),
      fam('ここは えきです', 'Di sini stasiun.', FAM.noun, 'えき adalah benda.')
    ]
  },
  {
    id: 'f013-trap',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Jebakan です',
    questions: [
      {
        prompt: 'Pada おいしいです, apa yang dilakukan です?',
        options: ['Menambah kesopanan; おいしい sendiri sudah predikat', 'Mengubah おいしい menjadi benda', 'Berarti "banyak"'],
        answer: 0,
        explain: 'Kata sifat-i bisa berdiri sendiri sebagai predikat. です hanya membuatnya sopan.'
      },
      {
        prompt: 'Mana yang termasuk keluarga ① (benda + です, termasuk sifat-na)?',
        options: ['きれいです', 'おいしいです', 'たべます'],
        answer: 0,
        explain: 'きれい adalah kata sifat-na meski berakhir い, jadi masuk keluarga ①.'
      },
      {
        prompt: 'Kata mana yang BUKAN kata kerja?',
        options: ['おおきいです', 'たべます', 'のみます'],
        answer: 0,
        explain: 'おおきい adalah kata sifat-i; dua lainnya berakhir ます.'
      },
      {
        prompt: 'Predikat berakhir ます hampir selalu berasal dari keluarga...',
        options: [FAM.verb, FAM.adjI, FAM.noun],
        answer: 0,
        explain: 'ます adalah penanda kesopanan kata kerja.'
      }
    ]
  },
  {
    id: 'f013-trial',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Ujian: Kalimat Baru',
    passRatio: 0.8,
    questions: [
      fam('この ケーキは おいしいです', 'Kue ini enak.', FAM.adjI, 'おいしい adalah kata sifat-i.'),
      fam('これは わたしの かばんです', 'Ini tas saya.', FAM.noun, 'かばん adalah benda.'),
      fam('わたしは まいあさ コーヒーを のみます', 'Saya minum kopi tiap pagi.', FAM.verb, 'のみます adalah kata kerja.'),
      fam('あの えきは ゆうめいです', 'Stasiun itu terkenal.', FAM.noun, 'ゆうめい adalah kata sifat-na → keluarga benda + です.'),
      fam('きょうは あついです', 'Hari ini panas.', FAM.adjI, 'あつい adalah kata sifat-i.'),
      fam('ともだちと えいがを みます', 'Saya menonton film dengan teman.', FAM.verb, 'みます adalah kata kerja.'),
      fam('この まちは きれいです', 'Kota ini bersih.', FAM.noun, 'きれい adalah kata sifat-na (jebakan: berakhir い).'),
      fam('その かばんは おもいです', 'Tas itu berat.', FAM.adjI, 'おもい adalah kata sifat-i.')
    ]
  }
];
