// ==============================================================================
// LANTAI 015 — PROTOKOL DEKODE (Bentuk → Fungsi → Makna)
// Teks ditulis tanpa spasi (seperti aslinya), dipotong menjadi bagian-bagian untuk
// diketuk, dan kosakata diberi gloss. Yang diukur adalah STRUKTUR, bukan hafalan kata.
// ==============================================================================

import { ChoiceQuestion, PickItem, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

type Family = 'noun' | 'adjI' | 'verb';
const FAMILY_LABEL: Record<Family, string> = {
  noun: 'Benda + です',
  adjI: 'Kata sifat-i',
  verb: 'Kata kerja'
};

interface Text {
  id: string;
  /** Potongan teks; gabungan semuanya = teks utuh (tanpa spasi). */
  chunks: string[];
  /** Indeks potongan predikat (raja). */
  king: number;
  family: Family;
  gloss: string;
  meaning: string;
  wrong: string[];
}

const TEXTS: Text[] = [
  { id: 'a', chunks: ['わたし', 'は', 'まいにち', 'がっこう', 'へ', 'いきます'], king: 5, family: 'verb', gloss: 'まいにち = setiap hari · がっこう = sekolah · いきます = pergi', meaning: 'Saya pergi ke sekolah setiap hari.', wrong: ['Sekolah pergi ke rumah saya setiap hari.', 'Saya tidak pergi ke sekolah hari ini.'] },
  { id: 'b', chunks: ['ともだち', 'は', 'えき', 'で', 'ほん', 'を', 'よみます'], king: 6, family: 'verb', gloss: 'ともだち = teman · えき = stasiun · ほん = buku · よみます = membaca', meaning: 'Teman membaca buku di stasiun.', wrong: ['Teman membeli buku di stasiun.', 'Saya membaca buku di rumah teman.'] },
  { id: 'c', chunks: ['この', 'ケーキ', 'は', 'おいしいです'], king: 3, family: 'adjI', gloss: 'この = ini · ケーキ = kue · おいしい = enak', meaning: 'Kue ini enak.', wrong: ['Saya membuat kue ini.', 'Kue ini mahal.'] },
  { id: 'd', chunks: ['たなかさん', 'は', 'せんせい', 'です'], king: 3, family: 'noun', gloss: 'たなかさん = Tanaka-san · せんせい = guru', meaning: 'Tanaka-san adalah guru.', wrong: ['Tanaka-san bertemu guru.', 'Guru menyukai Tanaka-san.'] },
  { id: 'e', chunks: ['ねこ', 'が', 'さかな', 'を', 'たべます'], king: 4, family: 'verb', gloss: 'ねこ = kucing · さかな = ikan · たべます = makan', meaning: 'Kucing makan ikan.', wrong: ['Ikan memakan kucing.', 'Kucing menyukai ikan.'] },
  { id: 'f', chunks: ['あした', 'ともだち', 'と', 'うみ', 'へ', 'いきます'], king: 5, family: 'verb', gloss: 'あした = besok · うみ = laut · いきます = pergi', meaning: 'Besok saya pergi ke laut bersama teman.', wrong: ['Kemarin saya pergi ke laut sendirian.', 'Teman pergi ke gunung besok.'] },
  { id: 'g', chunks: ['これ', 'は', 'わたし', 'の', 'かばん', 'です'], king: 5, family: 'noun', gloss: 'これ = ini · かばん = tas', meaning: 'Ini tas saya.', wrong: ['Tas saya ada di sini.', 'Tas ini milik teman.'] },
  { id: 'h', chunks: ['あの', 'みせ', 'は', 'あたらしいです'], king: 3, family: 'adjI', gloss: 'あの = itu (jauh) · みせ = toko · あたらしい = baru', meaning: 'Toko itu baru.', wrong: ['Toko itu besar.', 'Saya pergi ke toko itu.'] },
  { id: 'i', chunks: ['せんせい', 'は', 'みず', 'を', 'のみます'], king: 4, family: 'verb', gloss: 'せんせい = guru · みず = air · のみます = minum', meaning: 'Guru minum air.', wrong: ['Guru membeli air.', 'Air itu milik guru.'] },
  { id: 'j', chunks: ['ここ', 'は', 'おおきい', 'えき', 'です'], king: 4, family: 'noun', gloss: 'ここ = di sini · おおきい = besar · えき = stasiun', meaning: 'Di sini stasiun besar.', wrong: ['Stasiun ini kecil.', 'Saya pergi ke stasiun besar.'] }
];

const FIND_IDS = ['a', 'b', 'c', 'd', 'e'];
const TRIAL_IDS = ['f', 'g', 'h', 'i', 'j'];
const by = (ids: string[]) => ids.map(id => TEXTS.find(t => t.id === id)!);
const full = (t: Text) => t.chunks.join('');

const findItem = (t: Text): PickItem => ({
  prompt: `Teks asli tidak berspasi: 「${full(t)}」. Potongannya sudah diberikan. Ketuk sang raja (predikat) sebagai langkah pertama protokol. Gloss: ${t.gloss}`,
  tokens: t.chunks.map(text => ({ text })),
  correct: [t.king],
  meaning: t.meaning,
  explain: `Raja ada di ujung: ${t.chunks[t.king]}.`
});

const particleItem = (t: Text): PickItem | null => {
  const idx = t.chunks.map((c, i) => (['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も'].includes(c) ? i : -1)).filter(i => i >= 0);
  if (idx.length === 0) return null;
  return {
    prompt: `Langkah kedua: ketuk semua partikel pada 「${full(t)}」. Gloss: ${t.gloss}`,
    tokens: t.chunks.map(text => ({ text })),
    correct: idx,
    meaning: t.meaning,
    explain: `Partikel: ${idx.map(i => t.chunks[i]).join(' · ')}.`
  };
};

const familyQ = (t: Text): ChoiceQuestion => {
  const labels = Object.values(FAMILY_LABEL);
  const options = seededShuffle(labels, hashString(`f015:fam:${t.id}`));
  return {
    prompt: 'Langkah ketiga: apa keluarga predikat (sang raja) teks ini?',
    glyph: full(t),
    say: full(t),
    options,
    answer: options.indexOf(FAMILY_LABEL[t.family]),
    explain: `Raja: ${t.chunks[t.king]}. Keluarganya: ${FAMILY_LABEL[t.family]}.`
  };
};

const meaningQ = (t: Text): ChoiceQuestion => {
  const options = seededShuffle([t.meaning, ...t.wrong], hashString(`f015:mean:${t.id}`));
  return {
    prompt: `Langkah terakhir: tafsirkan. Gloss: ${t.gloss}`,
    glyph: t.chunks.join(' '),
    say: full(t),
    options,
    answer: options.indexOf(t.meaning),
    explain: `${t.meaning} Mulailah dari raja (${t.chunks[t.king]}), lalu baca partikel sebagai penanda peran.`
  };
};

export const FLOOR_015_ROOMS: Room[] = [
  {
    id: 'f015-learn',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Protokol Dekode',
    steps: [
      {
        title: 'Jangan menebak. Jalankan protokol.',
        body: 'Menghadapi teks Jepang yang belum dikenal, jangan menerjemahkan kata per kata dari kiri ke kanan. Jalankan urutan yang sama setiap kali.',
        grid: [
          { glyph: '①', sub: 'Lihat aksara' },
          { glyph: '②', sub: 'Baca bunyinya' },
          { glyph: '③', sub: 'Tandai partikel' },
          { glyph: '④', sub: 'Temukan raja' },
          { glyph: '⑤', sub: 'Keluarga predikat' },
          { glyph: '⑥', sub: 'Cek konteks' },
          { glyph: '⑦', sub: 'Tafsirkan' }
        ]
      },
      {
        title: 'Contoh dijalankan',
        body: 'Teks asli tanpa spasi: わたしはまいにちがっこうへいきます. Potong di partikel dan temukan raja di ujung.',
        chunks: [
          { text: 'わたし', role: 'siapa' },
          { text: 'は', role: 'partikel: topik' },
          { text: 'まいにち', role: 'kapan' },
          { text: 'がっこう', role: 'ke mana' },
          { text: 'へ', role: 'partikel: arah' },
          { text: 'いきます', role: 'raja: kata kerja', king: true }
        ],
        example: { jp: 'わたしは まいにち がっこうへ いきます', meaning: 'Saya pergi ke sekolah setiap hari.', say: 'わたしは まいにち がっこうへ いきます' }
      },
      {
        title: 'Bila ada kata asing',
        body: 'Kamu tidak perlu mengenal semua kata. Selama kamu bisa menemukan raja dan partikelnya, kamu sudah tahu strukturnya; sisanya tinggal dicari di kamus. Di lantai ini kosakata diberi gloss supaya yang diuji adalah struktur.'
      }
    ]
  },
  {
    id: 'f015-king',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Latih',
    title: 'Langkah ④: Temukan Raja',
    items: by(FIND_IDS).map(findItem)
  },
  {
    id: 'f015-particles',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Latih',
    title: 'Langkah ③: Tandai Partikel',
    items: by(FIND_IDS).map(particleItem).filter((x): x is PickItem => x !== null)
  },
  {
    id: 'f015-family',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Langkah ⑤: Keluarga Predikat',
    questions: by(FIND_IDS).map(familyQ)
  },
  {
    id: 'f015-meaning',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Langkah ⑦: Tafsirkan',
    questions: by(FIND_IDS).map(meaningQ)
  },
  {
    id: 'f015-trial-king',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Ingat',
    title: 'Ujian: Raja pada Teks Baru',
    passRatio: 0.8,
    items: by(TRIAL_IDS).map(findItem)
  },
  {
    id: 'f015-trial-full',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Ujian: Protokol Lengkap',
    passRatio: 0.75,
    questions: by(TRIAL_IDS).flatMap(t => [familyQ(t), meaningQ(t)])
  }
];
