// ==============================================================================
// LANTAI 011 — PENGHUBUNG RELASI (partikel sebagai penanda)
// Yang dilatih: MENGENALI partikel dan perannya. Bukan memilih partikel yang tepat
// untuk menyusun kalimat (itu pekerjaan Menara 2). Setiap kata dipisah spasi hanya
// sebagai alat belajar; partikel dipisah dari kata supaya bisa diketuk.
// ==============================================================================

import { ChoiceQuestion, PickItem, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

const PARTICLES = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'も', 'の', 'へ']);

/** Kalimat dipisah spasi; token yang berupa partikel otomatis menjadi jawaban (atau hanya `only`). */
const particles = (src: string, meaning: string, only?: string, prompt?: string, explain?: string): PickItem => {
  const tokens = src.split(' ').map(text => ({ text }));
  const correct = tokens
    .map((t, i) => (PARTICLES.has(t.text) && (!only || t.text === only) ? i : -1))
    .filter(i => i >= 0);
  return {
    prompt: prompt ?? 'Ketuk semua partikel: kata kecil yang menempel pada kata sebelumnya dan menandai perannya.',
    tokens,
    correct,
    meaning,
    explain: explain ?? `Partikel pada kalimat ini: ${correct.map(i => tokens[i].text).join(' · ')}.`
  };
};

const q = (prompt: string, right: string, wrong: string[], explain: string, glyph?: string): ChoiceQuestion => {
  const options = seededShuffle([right, ...wrong], hashString(`f011:${prompt}:${right}`));
  return { prompt, glyph, options, answer: options.indexOf(right), explain };
};

const ROLE = {
  wa: 'topik: "tentang ..."',
  ga: 'pelaku / hal yang diumumkan',
  wo: 'objek: yang dikenai tindakan',
  ni: 'tujuan, waktu, atau tempat keberadaan',
  de: 'tempat berlangsungnya tindakan',
  to: 'bersama / dan',
  mo: '"juga"',
  no: 'kepunyaan / "milik"'
};

export const FLOOR_011_ROOMS: Room[] = [
  {
    id: 'f011-learn',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Penghubung Relasi',
    steps: [
      {
        title: 'Kata kecil yang menandai peran',
        body: 'Partikel adalah kata kecil yang menempel di belakang sebuah kata dan memberi tahu perannya dalam kalimat. Bahasa Indonesia memakai urutan kata untuk itu; bahasa Jepang memakai penanda. Partikel tidak diterjemahkan satu per satu.',
        chunks: [
          { text: 'わたし', role: 'siapa' },
          { text: 'は', role: 'penanda topik' },
          { text: 'りんご', role: 'apa' },
          { text: 'を', role: 'penanda objek' },
          { text: 'たべます', role: 'raja', king: true }
        ],
        example: { jp: 'わたしは りんごを たべます', meaning: 'Saya makan apel.', say: 'わたしは りんごを たべます' }
      },
      {
        title: 'Enam penanda yang paling sering',
        body: 'Cukup kenali perannya dulu. Memilih yang tepat saat menyusun kalimat adalah pekerjaan Menara berikutnya.',
        grid: [
          { glyph: 'は', sub: 'topik' },
          { glyph: 'が', sub: 'pelaku' },
          { glyph: 'を', sub: 'objek' },
          { glyph: 'に', sub: 'tujuan / waktu' },
          { glyph: 'で', sub: 'tempat aksi' },
          { glyph: 'と', sub: 'bersama' },
          { glyph: 'も', sub: '"juga"' },
          { glyph: 'の', sub: 'milik' }
        ]
      },
      {
        title: 'Jebakan bacaan: は, へ, を',
        body: 'Sebagai partikel, tiga aksara ini dibaca berbeda dari bunyi biasanya. Di dalam kata lain (misalnya はな "bunga") は tetap dibaca "ha".',
        compare: [
          { label: 'は (partikel)', value: 'dibaca "wa"' },
          { label: 'へ (partikel)', value: 'dibaca "e"' },
          { label: 'を (partikel)', value: 'dibaca "o"' }
        ],
        example: { jp: 'わたしは がっこうへ いきます', meaning: 'Saya pergi ke sekolah. (watashi wa gakkou e ikimasu)', say: 'わたしは がっこうへ いきます' }
      },
      {
        title: 'Contoh: lima peran sekaligus',
        body: 'Perhatikan bagaimana partikel memecah kalimat menjadi bagian-bagian bermakna.',
        chunks: [
          { text: 'ともだち', role: 'siapa' },
          { text: 'と', role: 'bersama' },
          { text: 'うみ', role: 'tempat' },
          { text: 'で', role: 'tempat aksi' },
          { text: 'およぎます', role: 'raja', king: true }
        ],
        example: { jp: 'ともだちと うみで およぎます', meaning: 'Saya berenang di laut bersama teman.', say: 'ともだちと うみで およぎます' }
      }
    ]
  },
  {
    id: 'f011-find',
    skill: 'pola',
    kind: 'pick',
    kicker: 'Latih',
    title: 'Temukan Partikel',
    items: [
      particles('わたし は りんご を たべます', 'Saya makan apel.'),
      particles('ねこ が さかな を たべます', 'Kucing makan ikan.'),
      particles('これ は わたし の ほん です', 'Ini buku saya.'),
      particles('ともだち と みせ で ほん を かいます', 'Saya membeli buku di toko bersama teman.'),
      particles('わたし も がくせい です', 'Saya juga pelajar.'),
      particles('わたし は えき へ いきます', 'Saya pergi ke stasiun.'),
      particles('わたし は ごご に ともだち に あいます', 'Sore hari saya bertemu teman.')
    ]
  },
  {
    id: 'f011-role',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Peran Partikel',
    questions: [
      q('Apa peran を pada kalimat ini?', ROLE.wo, [ROLE.wa, ROLE.to, ROLE.no], 'を menandai hal yang dikenai tindakan: りんご (apel) dimakan.', 'わたしは りんごを たべます'),
      q('Apa peran で pada kalimat ini?', ROLE.de, [ROLE.wo, ROLE.to, ROLE.mo], 'で menandai tempat berlangsungnya tindakan: みせ (toko) tempat membeli.', 'みせで ほんを かいます'),
      q('Apa peran と pada kalimat ini?', ROLE.to, [ROLE.de, ROLE.no, ROLE.wa], 'と di sini berarti "bersama": ともだち (teman) ikut pergi.', 'ともだちと いきます'),
      q('Apa peran の pada kalimat ini?', ROLE.no, [ROLE.wo, ROLE.de, ROLE.mo], 'の menghubungkan pemilik dengan miliknya: わたしの ほん = buku saya.', 'わたしの ほんです'),
      q('Apa peran も pada kalimat ini?', ROLE.mo, [ROLE.wo, ROLE.no, ROLE.to], 'も menggantikan は/が/を dan menambahkan arti "juga".', 'わたしも がくせいです'),
      q('Apa peran に pada kalimat ini?', ROLE.ni, [ROLE.wo, ROLE.de, ROLE.mo], 'に menandai tujuan atau waktu: ろくじ (jam enam) adalah waktu bangun.', 'ろくじに おきます')
    ]
  },
  {
    id: 'f011-read',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Bacaan Khusus は・へ・を',
    questions: [
      q('Partikel は pada kalimat ini dibaca...', 'wa', ['ha', 'a'], 'Sebagai partikel, は dibaca "wa".', 'わたしは がくせいです'),
      q('Partikel へ pada kalimat ini dibaca...', 'e', ['he', 'be'], 'Sebagai partikel, へ dibaca "e".', 'がっこうへ いきます'),
      q('Partikel を pada kalimat ini dibaca...', 'o', ['wo', 'u'], 'Sebagai partikel, を dibaca "o".', 'みずを のみます'),
      q('Aksara は pada kata ini dibaca...', 'ha', ['wa', 'a'], 'Di dalam kata, は tetap "ha": はな = hana (bunga).', 'はな'),
      q('Aksara は pada kata ini dibaca...', 'wa', ['ha', 'a'], 'Ini partikel penanda topik, jadi dibaca "wa": これは = kore wa.', 'これは ほんです')
    ]
  },
  {
    id: 'f011-pair',
    skill: 'pola',
    kind: 'pair',
    kicker: 'Latih',
    title: 'Partikel ↔ Peran',
    prompt: 'Pasangkan partikel dengan perannya.',
    pairs: [
      ['は', 'topik'],
      ['を', 'objek'],
      ['で', 'tempat aksi'],
      ['と', 'bersama'],
      ['の', 'milik'],
      ['も', '"juga"']
    ]
  },
  {
    id: 'f011-trial',
    skill: 'pola',
    kind: 'pick',
    kicker: 'Ingat',
    title: 'Ujian: Kalimat Baru',
    passRatio: 0.8,
    items: [
      particles('わたし は ともだち と ごはん を たべます', 'Saya makan nasi bersama teman.'),
      particles('せんせい は えき で ほん を よみます', 'Guru membaca buku di stasiun.'),
      particles('これ も わたし の ほん です', 'Ini juga buku saya.'),
      particles('あした わたし は うみ へ いきます', 'Besok saya pergi ke laut.'),
      particles('ねこ は さかな を たべます', 'Kucing makan ikan.', 'を', 'Ketuk hanya partikel penanda objek (yang dikenai tindakan).', 'を menandai さかな (ikan) sebagai yang dimakan.'),
      particles('わたし は ともだち と あいます', 'Saya bertemu teman.', 'と', 'Ketuk hanya partikel yang berarti "bersama / dengan".', 'と menandai ともだち sebagai yang ditemui.')
    ]
  }
];
