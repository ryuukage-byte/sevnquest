// ==============================================================================
// LANTAI 002 — DENYUT BUNYI (Kalibrasi sensorik)
// A-I-U-E-O dan konsep ketukan (mora). Ini kalibrasi telinga, bukan fonetik lengkap.
// Lima vokal diperkenalkan bersama hiragananya (あいうえお) supaya telinga langsung terhubung ke aksara.
// Hitung ketukan tetap memakai romaji karena aksara lain belum diajarkan.
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

const VOWELS: { r: string; say: string; note: string }[] = [
  { r: 'a', say: 'あ', note: 'seperti "a" pada "apa"' },
  { r: 'i', say: 'い', note: 'seperti "i" pada "ibu"' },
  { r: 'u', say: 'う', note: 'seperti "u" pada "ular", bibir tidak terlalu bulat' },
  { r: 'e', say: 'え', note: 'seperti "e" pada "enak" (bukan e-pepet)' },
  { r: 'o', say: 'お', note: 'seperti "o" pada "orang"' }
];

const vowelQuestions: ChoiceQuestion[] = seededShuffle(VOWELS, hashString('f002-vowel')).flatMap(v => {
  const others = VOWELS.filter(x => x.r !== v.r).map(x => x.say);
  const options = seededShuffle([v.say, ...seededShuffle(others, hashString(v.r)).slice(0, 3)], hashString(`o:${v.r}`));
  return [{
    prompt: 'Dengarkan. Aksara vokal mana yang kamu dengar?',
    say: v.say,
    listenOnly: true,
    fallback: v.r,
    options,
    answer: options.indexOf(v.say),
    explain: `Itu 「${v.say}」, vokal "${v.r}": ${v.note}.`
  } satisfies ChoiceQuestion];
});

const beatQ = (word: string, beats: string[], say: string): ChoiceQuestion => {
  const n = beats.length;
  const pool = [n - 1, n, n + 1, n + 2].filter(x => x >= 1);
  const options = Array.from(new Set(pool)).sort((a, b) => a - b).slice(0, 4).map(String);
  return {
    prompt: 'Berapa ketukan (mora) kata ini?',
    glyph: word,
    say,
    fallback: word,
    options,
    answer: options.indexOf(String(n)),
    explain: `${word} = ${beats.join(' · ')} → ${n} ketukan.`,
    reveal: beats
  };
};

export const FLOOR_002_ROOMS: Room[] = [
  {
    id: 'f002-vowels',
    skill: 'bunyi',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Lima Vokal',
    steps: [
      {
        title: 'Hanya lima vokal',
        body: 'Bahasa Jepang hanya punya lima vokal, dan kabar baiknya: bunyinya hampir sama dengan vokal bahasa Indonesia. Tiap vokal punya aksara hiragana sendiri. Dengarkan masing-masing dengan menekan tombol suara.',
        grid: VOWELS.map(v => ({ glyph: v.say, sub: `${v.r} · ${v.note}`, say: v.say }))
      },
      {
        title: 'Selalu murni',
        body: 'Vokal Jepang tidak berubah bunyi. "a" selalu "a", tidak pernah menjadi "ei" seperti pada bahasa Inggris. Ini membuat membaca jauh lebih mudah nanti.'
      }
    ]
  },
  {
    id: 'f002-listen',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Dengar & Pilih Vokal',
    questions: vowelQuestions
  },
  {
    id: 'f002-beats',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Pelajari',
    title: 'Ketukan (Mora)',
    steps: [
      {
        title: 'Satu ketukan, satu kotak',
        body: 'Bahasa Jepang diucapkan dengan ritme yang rata. Satuan ritmenya disebut mora ("ketukan"). Kata さくら (sakura) punya tiga ketukan: sa · ku · ra.',
        beats: ['sa', 'ku', 'ra'],
        example: { jp: 'さくら', meaning: 'bunga sakura (3 ketukan)', say: 'さくら' }
      },
      {
        title: 'Bandingkan',
        body: 'Dua ketukan terdengar lebih pendek dari tiga ketukan. Dengarkan perbedaannya.',
        compare: [
          { label: 'はな (ha · na)', value: '2 ketukan' },
          { label: 'さくら (sa · ku · ra)', value: '3 ketukan' },
          { label: 'たまご (ta · ma · go)', value: '3 ketukan' }
        ]
      },
      {
        title: 'Ketukan itu pola waktu',
        body: 'Mora adalah model waktu untuk membantumu merasakan ritme, bukan klaim bahwa setiap ketukan persis sama panjang. Di Lantai 007 kamu akan bertemu ketukan khusus (jeda, vokal panjang, dan ん).'
      }
    ]
  },
  {
    id: 'f002-count',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Hitung Ketukan',
    passRatio: 0.8,
    questions: [
      beatQ('hana', ['ha', 'na'], 'はな'),
      beatQ('sakura', ['sa', 'ku', 'ra'], 'さくら'),
      beatQ('tamago', ['ta', 'ma', 'go'], 'たまご'),
      beatQ('kuruma', ['ku', 'ru', 'ma'], 'くるま'),
      beatQ('umi', ['u', 'mi'], 'うみ'),
      beatQ('usagi', ['u', 'sa', 'gi'], 'うさぎ')
    ]
  }
];
