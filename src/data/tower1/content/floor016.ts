// ==============================================================================
// LANTAI 016 — UJIAN KOMPAS (gerbang menuju Menara 2)
// Bukan ujian penguasaan total, dan bukan jebakan pass/fail. Lima kompetensi
// observable (rubrik) dengan ambang rendah-sedang; materi SEMUANYA baru supaya
// yang diukur adalah transfer: orientasi dan tidak panik, bukan hafalan.
// ==============================================================================

import { ChoiceQuestion, PickItem, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

const mc = (prompt: string, right: string, wrong: string[], explain: string, extra: Partial<ChoiceQuestion> = {}): ChoiceQuestion => {
  const options = seededShuffle([right, ...wrong], hashString(`f016:${prompt}:${extra.glyph ?? extra.say ?? right}`));
  return { prompt, options, answer: options.indexOf(right), explain, ...extra };
};

const read = (glyph: string, right: string, wrong: string[], explain: string) =>
  mc('Baca kata ini. Apa artinya?', right, wrong, explain, { glyph, say: glyph.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1') });

const hear = (say: string, right: string, wrong: string[], explain: string) =>
  mc('Dengarkan, lalu pilih artinya.', right, wrong, explain, { say, listenOnly: true, fallback: say });

const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'へ', 'も'];
const sentence = (chunks: string[], target: 'king' | 'particles', meaning: string): PickItem => {
  const king = chunks.length - 1;
  const parts = chunks.map((c, i) => (PARTICLES.includes(c) ? i : -1)).filter(i => i >= 0);
  return {
    prompt: target === 'king' ? 'Ketuk sang raja kalimat.' : 'Ketuk semua partikel.',
    tokens: chunks.map(text => ({ text })),
    correct: target === 'king' ? [king] : parts,
    meaning,
    explain: target === 'king' ? `Raja ada di ujung: ${chunks[king]}.` : `Partikel: ${parts.map(i => chunks[i]).join(' · ')}.`
  };
};

const FAM = ['Benda + です', 'Kata sifat-i', 'Kata kerja'];
const family = (s: string, right: string, explain: string) =>
  mc('Apa keluarga predikat kalimat ini?', right, FAM.filter(f => f !== right), explain, { glyph: s, say: s });

export const FLOOR_016_ROOMS: Room[] = [
  {
    id: 'f016-learn',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Ujian Kompas',
    steps: [
      {
        title: 'Ini bukan ujian kefasihan',
        body: 'Kamu tidak diminta menerjemahkan semuanya. Lima kompetensi di bawah ini diuji dengan materi yang belum pernah kamu lihat. Jika sebuah ruangan belum lulus, kamu mengulang dengan urutan baru; tidak ada hukuman, dan tidak ada satu jawaban yang menentukan segalanya.',
        grid: [
          { glyph: '字', sub: 'Aksara' },
          { glyph: '音', sub: 'Bunyi' },
          { glyph: 'は', sub: 'Partikel' },
          { glyph: '王', sub: 'Predikat' },
          { glyph: '文', sub: 'Konteks' }
        ]
      },
      {
        title: 'Apa yang kami lihat',
        body: 'Tanda orientasi yang baik: kamu mengenali jenis aksara, mendengar kata sebagai ketukan, menemukan partikel dan raja kalimat, dan tidak panik saat ada kata asing. Itulah kompas.',
        compare: [
          { label: 'Aksara', value: 'Membaca kata tanpa Romaji' },
          { label: 'Struktur', value: 'Menemukan partikel & predikat' },
          { label: 'Orientasi', value: 'Tetap tenang menghadapi kata asing' }
        ]
      }
    ]
  },
  {
    id: 'f016-script',
    skill: 'tulisan',
    kind: 'choice',
    kicker: 'Ujian',
    title: 'Kompetensi 1 · Aksara',
    passRatio: 0.6,
    questions: [
      read('テレビ', 'televisi', ['telepon', 'radio', 'komputer'], 'テレビ = terebi (televisi), kata serapan.'),
      read('ともだち', 'teman', ['guru', 'keluarga', 'tetangga'], 'ともだち = teman.'),
      read('サッカー', 'sepak bola', ['bola basket', 'renang', 'tenis'], 'サッカー = sakkā (sepak bola); ッ menandai jeda, ー memanjangkan.'),
      read('[電車|でんしゃ]', 'kereta listrik', ['mobil', 'pesawat', 'kapal'], '電車 (でんしゃ) = kereta listrik; furigana membantumu membaca kanjinya.'),
      read('だいがく', 'universitas', ['sekolah dasar', 'perpustakaan', 'rumah sakit'], 'だいがく = universitas.'),
      read('[学生|がくせい]', 'pelajar', ['guru', 'dokter', 'koki'], '学生 (がくせい) = pelajar.')
    ]
  },
  {
    id: 'f016-sound',
    skill: 'bunyi',
    kind: 'choice',
    kicker: 'Ujian',
    title: 'Kompetensi 2 · Bunyi',
    passRatio: 0.6,
    questions: [
      hear('ありがとう', 'terima kasih', ['selamat pagi', 'maaf', 'sampai jumpa'], 'ありがとう = terima kasih.'),
      hear('おはよう', 'selamat pagi', ['terima kasih', 'selamat malam', 'maaf'], 'おはよう = selamat pagi.'),
      hear('さようなら', 'sampai jumpa', ['selamat pagi', 'permisi', 'terima kasih'], 'さようなら = sampai jumpa.'),
      hear('すみません', 'maaf / permisi', ['selamat makan', 'sampai jumpa', 'terima kasih'], 'すみません = maaf / permisi.'),
      mc('Berapa ketukan (mora) pada kata ini?', '4', ['3', '5', '2'], 'が・っ・こ・う = 4 ketukan (っ dan う masing-masing satu ketukan).', { glyph: 'がっこう', say: 'がっこう' })
    ]
  },
  {
    id: 'f016-particles',
    skill: 'pola',
    kind: 'pick',
    kicker: 'Ujian',
    title: 'Kompetensi 3 · Partikel',
    passRatio: 0.6,
    items: [
      sentence(['はは', 'は', 'ケーキ', 'を', 'つくります'], 'particles', 'Ibu membuat kue.'),
      sentence(['ともだち', 'と', 'ひるごはん', 'を', 'たべます'], 'particles', 'Saya makan siang bersama teman.'),
      sentence(['これ', 'は', 'わたし', 'の', 'とけい', 'です'], 'particles', 'Ini jam tangan saya.'),
      sentence(['あした', 'ともだち', 'も', 'きます'], 'particles', 'Besok teman juga datang.'),
      sentence(['わたし', 'は', 'こうえん', 'で', 'はしります'], 'particles', 'Saya berlari di taman.')
    ]
  },
  {
    id: 'f016-king',
    skill: 'kalimat',
    kind: 'pick',
    kicker: 'Ujian',
    title: 'Kompetensi 4 · Predikat',
    passRatio: 0.6,
    items: [
      sentence(['はは', 'は', 'ケーキ', 'を', 'つくります'], 'king', 'Ibu membuat kue.'),
      sentence(['わたし', 'は', 'こうえん', 'で', 'はしります'], 'king', 'Saya berlari di taman.'),
      sentence(['この', 'とけい', 'は', 'たかいです'], 'king', 'Jam tangan ini mahal.'),
      sentence(['たなかさん', 'は', 'ぎんこういんです'], 'king', 'Tanaka-san pegawai bank.'),
      sentence(['あした', 'ともだち', 'と', 'えいが', 'を', 'みます'], 'king', 'Besok saya menonton film dengan teman.')
    ]
  },
  {
    id: 'f016-family',
    skill: 'pola',
    kind: 'choice',
    kicker: 'Ujian',
    title: 'Kompetensi 4 · Keluarga Predikat',
    passRatio: 0.6,
    questions: [
      family('この とけいは たかいです', 'Kata sifat-i', 'たかい berakhir い dan menjadi predikat.'),
      family('たなかさんは ぎんこういんです', 'Benda + です', 'ぎんこういん adalah benda.'),
      family('わたしは こうえんで はしります', 'Kata kerja', 'はしります adalah kata kerja.'),
      family('この へやは ひろいです', 'Kata sifat-i', 'ひろい adalah kata sifat-i.'),
      family('これは あたらしい ほんです', 'Benda + です', 'ほん adalah benda; あたらしい hanya menerangkannya.')
    ]
  },
  {
    id: 'f016-context',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Ujian',
    title: 'Kompetensi 5 · Konteks',
    passRatio: 0.6,
    questions: [
      mc('Kamu bertanya kepada temanmu: 「のみますか。」 Siapa yang ditanya?', 'temanmu', ['kamu', 'orang ketiga'], 'Kalimat tanya biasanya menanyakan lawan bicara.'),
      mc('Tanaka-san sedang dibicarakan. Kalimat berikut tanpa pelaku: 「えいがを みました。」 Siapa yang menonton?', 'Tanaka-san', ['kamu', 'tidak ada'], 'Topik yang sedang berlanjut menjadi pelaku yang tersirat.'),
      mc('Gloss: あした = besok · いきます = pergi. Apa arti 「あした いきます」?', 'Besok (saya) pergi.', ['Kemarin (saya) pergi.', 'Besok (dia) tidak pergi.'], 'Pelaku tidak disebut karena konteks sudah cukup.'),
      mc('Pada kalimat yang tidak punya spasi, langkah pertama yang aman adalah...', 'mencari partikel dan raja di ujung', ['menerjemahkan dari kiri ke kanan', 'menebak arti dari kata pertama'], 'Protokol: cari struktur dulu, baru tafsirkan.'),
      mc('Kamu menemukan kata yang tidak kamu kenal di tengah kalimat. Sikap terbaik?', 'tetap temukan partikel & raja, lalu cari kata itu di kamus', ['berhenti membaca', 'menebak lalu melupakannya'], 'Struktur sudah kamu kenal; kata asing tinggal dicari.')
    ]
  },
  {
    id: 'f016-end',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Rangkuman',
    title: 'Kompasmu Siap',
    steps: [
      {
        title: 'Kamu sudah bisa melihat',
        body: 'Kamu tahu cara membaca aksara, mendengar ketukan, menandai partikel, menemukan raja kalimat, dan memulihkan pelaku dari konteks. Menara berikutnya mengubahmu dari pembaca menjadi penyusun: kamu mulai membentuk kalimat sendiri.',
        compare: [
          { label: 'Menara 1', value: 'MELIHAT: mengenali, mengurai, menafsirkan' },
          { label: 'Menara 2', value: 'MEMAKAI: menyusun, mengubah bentuk, mengingat' }
        ]
      }
    ]
  }
];
