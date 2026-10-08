// ==============================================================================
// LANTAI 007 — KETUKAN KHUSUS (っ · ゃゅょ · vokal panjang)
// Fokus: durasi & jeda membedakan kata. Kolam kata sengaja tanpa dakuten
// (prasyarat keras lantai ini: 002 + 005; 006 hanya prasyarat lunak).
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle, splitBeats } from '../../../engine/tower1/jp';
import { WORDS_F7 } from '../words';
import { wordMeaningRoom } from '../builders';

const countQ = (w: { jp: string; id: string }): ChoiceQuestion => {
  const beats = splitBeats(w.jp);
  const n = beats.length;
  const options = Array.from(new Set([n - 1, n, n + 1, n + 2].filter(x => x >= 1)))
    .sort((a, b) => a - b)
    .slice(0, 4)
    .map(String);
  return {
    prompt: 'Berapa ketukan (mora) kata ini?',
    glyph: w.jp,
    say: w.jp,
    options,
    answer: options.indexOf(String(n)),
    explain: `${w.jp} = ${beats.join(' · ')} → ${n} ketukan.`,
    reveal: beats
  };
};

const pairHear = (a: { jp: string; id: string }, b: { jp: string; id: string }, hint: string): ChoiceQuestion => {
  const options = seededShuffle([a.jp, b.jp], hashString(`hear7:${a.jp}`));
  return {
    prompt: 'Dengarkan. Kata mana yang diucapkan?',
    say: a.jp,
    listenOnly: true,
    fallback: a.jp,
    options,
    answer: options.indexOf(a.jp),
    explain: `${a.jp} = "${a.id}" (${splitBeats(a.jp).length} ketukan), ${b.jp} = "${b.id}" (${splitBeats(b.jp).length} ketukan). ${hint}`
  };
};

const COUNT_WORDS = ['きって', 'ちょっと', 'きょう', 'りょこう', 'しゃしん', 'いっしょ', 'おかあさん', 'さようなら', 'ほうれんそう', 'とうきょう']
  .map(jp => WORDS_F7.find(w => w.jp === jp)!);

const TRIAL_WORDS = ['おちゃ', 'こっち', 'けっこん', 'ひゃく', 'りょうり', 'きょうしつ', 'おおかみ']
  .map(jp => WORDS_F7.find(w => w.jp === jp)!);

export const FLOOR_007_ROOMS: Room[] = [
  {
    id: 'f007-small-tsu',
    skill: 'bunyi',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'っ — Jeda Sesaat',
    steps: [
      {
        title: 'っ kecil = satu ketukan jeda',
        body: 'っ (tsu kecil) tidak dibaca "tsu". Ia adalah jeda satu ketukan sebelum konsonan berikutnya. きて (ki·te) hanya dua ketukan; きって (ki·t·te) tiga ketukan, dengan jeda di tengah.',
        glyph: 'きって',
        say: 'きって',
        beats: ['き', 'っ', 'て'],
        example: { jp: 'きって', meaning: 'perangko', say: 'きって' }
      },
      {
        title: 'Jeda yang mengubah arti',
        body: 'Satu っ saja dapat mengubah kata. Dengarkan perbedaannya.',
        compare: [
          { label: 'おと (o·to)', value: 'bunyi · 2 ketukan' },
          { label: 'おっと (o·t·to)', value: 'suami · 3 ketukan' },
          { label: 'さか (sa·ka)', value: 'lereng · 2 ketukan' },
          { label: 'さっか (sa·k·ka)', value: 'penulis · 3 ketukan' }
        ]
      }
    ]
  },
  {
    id: 'f007-yoon',
    skill: 'bunyi',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'ゃ ゅ ょ — Perpaduan',
    steps: [
      {
        title: 'Aksara kecil = melebur, bukan menambah',
        body: 'ゃ・ゅ・ょ yang kecil menempel pada aksara sebelumnya dan MELEBUR menjadi satu ketukan. き + ゃ = きゃ (kya), hanya satu ketukan. Bandingkan: きや (ki·ya) dua ketukan.',
        grid: [
          { glyph: 'きゃ', sub: 'kya', say: 'きゃ' },
          { glyph: 'しゅ', sub: 'shu', say: 'しゅ' },
          { glyph: 'ちょ', sub: 'cho', say: 'ちょ' },
          { glyph: 'ひゃ', sub: 'hya', say: 'ひゃ' },
          { glyph: 'りょ', sub: 'ryo', say: 'りょ' },
          { glyph: 'にゅ', sub: 'nyu', say: 'にゅ' }
        ],
        beats: ['きょ', 'う'],
        example: { jp: 'きょう', meaning: 'hari ini (2 ketukan)', say: 'きょう' }
      },
      {
        title: 'Aturan yang sama berlaku untuk lainnya',
        body: 'Pola ini berlaku untuk hampir semua baris, termasuk yang bersuara (ぎゃ, じゃ, びゃ, ぴゃ). Kamu tinggal menggabungkan yang sudah kamu tahu.'
      }
    ]
  },
  {
    id: 'f007-long',
    skill: 'bunyi',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Vokal Panjang',
    steps: [
      {
        title: 'Vokal panjang = satu ketukan tambahan',
        body: 'Vokal yang dipanjangkan memakan satu ketukan penuh dan ditulis dengan vokal tambahan: ああ, いい, うう, えい (kadang ええ), おう (kadang おお). Tulisannya memakai dua aksara, dan keduanya dihitung sebagai ketukan.',
        grid: [
          { glyph: 'おかあさん', sub: 'ああ', say: 'おかあさん' },
          { glyph: 'おにいさん', sub: 'いい', say: 'おにいさん' },
          { glyph: 'くうき', sub: 'うう', say: 'くうき' },
          { glyph: 'せんせい', sub: 'えい', say: 'せんせい' },
          { glyph: 'とうきょう', sub: 'おう', say: 'とうきょう' },
          { glyph: 'おおきい', sub: 'おお', say: 'おおきい' }
        ]
      },
      {
        title: 'Panjang atau pendek, artinya berbeda',
        body: 'Perhatikan: ゆき (2 ketukan) dan ゆうき (3 ketukan) adalah dua kata yang berbeda. Begitu juga とる dan とおる.',
        compare: [
          { label: 'ゆき (yu·ki)', value: 'salju' },
          { label: 'ゆうき (yu·u·ki)', value: 'keberanian' },
          { label: 'とる (to·ru)', value: 'mengambil' },
          { label: 'とおる (to·o·ru)', value: 'melewati' }
        ]
      }
    ]
  },
  {
    id: 'f007-count',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Hitung Ketukan',
    questions: COUNT_WORDS.map(countQ)
  },
  {
    id: 'f007-hear',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Pendek atau Panjang?',
    questions: [
      pairHear({ jp: 'おっと', id: 'suami' }, { jp: 'おと', id: 'bunyi' }, 'Jeda っ menambah satu ketukan.'),
      pairHear({ jp: 'さか', id: 'lereng' }, { jp: 'さっか', id: 'penulis' }, 'Dengarkan jedanya.'),
      pairHear({ jp: 'ゆうき', id: 'keberanian' }, { jp: 'ゆき', id: 'salju' }, 'Vokal う memanjangkan "yu".'),
      pairHear({ jp: 'とおる', id: 'melewati' }, { jp: 'とる', id: 'mengambil' }, 'おお memanjangkan "to".'),
      pairHear({ jp: 'きょう', id: 'hari ini' }, { jp: 'きよう', id: 'terampil' }, 'きょ = 1 ketukan, きよ = 2 ketukan.')
    ]
  },
  wordMeaningRoom('f007-read', 'Baca Kata → Arti', WORDS_F7, WORDS_F7, { count: 10 }),
  {
    id: 'f007-trial',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Ujian: Ketukan',
    passRatio: 0.8,
    // Kata yang belum pernah dihitung di Room latihan: ukuran transfer, bukan hafalan.
    questions: seededShuffle(TRIAL_WORDS, hashString('f007-trial')).map(countQ)
  }
];
