// ==============================================================================
// LANTAI 014 — BENTUK DASAR & PAKAIAN SOSIAL (acuan vs penyajian)
// Yang dilatih: MENGENALI dua penampilan sebuah kata sebagai kata yang sama.
// Tanpa aturan perubahan (itu Menara 2). Contoh berupa kana, sehingga lantai ini
// tidak bergantung pada kanji; kanji hanya muncul dengan furigana.
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

const same = (base: string, right: string, wrong: string[], explain: string): ChoiceQuestion => {
  const options = seededShuffle([right, ...wrong], hashString(`f014:s:${base}`));
  return {
    prompt: 'Kata ini adalah kata yang sama dengan bentuk sopan yang mana?',
    glyph: base,
    say: base.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1'),
    options,
    answer: options.indexOf(right),
    explain
  };
};

const dict = (polite: string, right: string, wrong: string[], explain: string): ChoiceQuestion => {
  const options = seededShuffle([right, ...wrong], hashString(`f014:d:${polite}`));
  return {
    prompt: 'Bentuk sopan ini berasal dari kata dasar (bentuk kamus) yang mana?',
    glyph: polite,
    say: polite.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1'),
    options,
    answer: options.indexOf(right),
    explain
  };
};

export const FLOOR_014_ROOMS: Room[] = [
  {
    id: 'f014-learn',
    skill: 'pola',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Dua Wajah Satu Kata',
    steps: [
      {
        title: 'Kamus vs percakapan',
        body: 'Sebuah kata punya bentuk dasar (yang kamu temukan di kamus) dan bentuk sopan (yang kamu dengar saat berbicara dengan hormat). Bentuk dasar adalah acuan; bentuk sopan adalah "pakaian sosial". Orangnya sama, bajunya berbeda.',
        compare: [
          { label: 'Bentuk dasar (kamus)', value: 'たべる' },
          { label: 'Bentuk sopan', value: 'たべます' }
        ],
        example: { jp: 'たべる → たべます', meaning: 'makan (kamus) → makan (sopan)', say: 'たべます' }
      },
      {
        title: 'Cara mengenalinya: ikuti "batang kata"',
        body: 'Bagian depan kata biasanya tidak berubah. Bagian ujungnya yang berganti pakaian. Fokus pada bagian depan yang sama.',
        grid: [
          { glyph: 'たべる', sub: 'たべ + る' },
          { glyph: 'たべます', sub: 'たべ + ます' },
          { glyph: 'のむ', sub: 'の + む' },
          { glyph: 'のみます', sub: 'の + み + ます' }
        ]
      },
      {
        title: 'Tidak semua kata berganti baju dengan cara yang sama',
        body: 'Kata kerja memakai ます. Kata sifat-i dan benda cukup menambahkan です. Jangan menyamaratakan: setiap keluarga punya "baju" sendiri. Aturannya baru dibahas di Menara 2; di sini cukup mengenali bahwa dua bentuk itu satu kata.',
        compare: [
          { label: 'Kata kerja', value: 'のむ → のみます' },
          { label: 'Kata sifat-i', value: 'おいしい → おいしいです' },
          { label: 'Benda', value: 'がくせい → がくせいです' }
        ]
      },
      {
        title: 'Pasangan yang perlu kamu kenali',
        body: 'Beberapa pasangan terlihat berbeda di tengah kata, bukan hanya di ujung. Tetap satu kata.',
        grid: [
          { glyph: 'かう', sub: '→ かいます' },
          { glyph: 'いく', sub: '→ いきます' },
          { glyph: 'はなす', sub: '→ はなします' },
          { glyph: '[読|よ]む', sub: '→ [読|よ]みます' }
        ]
      }
    ]
  },
  {
    id: 'f014-pair',
    skill: 'kata',
    kind: 'pair',
    kicker: 'Latih',
    title: 'Pasangkan Dua Wajah',
    prompt: 'Pasangkan bentuk kamus dengan bentuk sopan dari kata yang sama.',
    pairs: [
      ['たべる', 'たべます'],
      ['のむ', 'のみます'],
      ['みる', 'みます'],
      ['いく', 'いきます'],
      ['かう', 'かいます'],
      ['はなす', 'はなします']
    ]
  },
  {
    id: 'f014-same',
    skill: 'kata',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Kata yang Sama',
    questions: [
      same('たべる', 'たべます', ['のみます', 'いきます', 'みます'], 'たべる dan たべます adalah kata yang sama: makan.'),
      same('のむ', 'のみます', ['たべます', 'よみます', 'かいます'], 'のむ → のみます (minum).'),
      same('いく', 'いきます', ['みます', 'かいます', 'おきます'], 'いく → いきます (pergi).'),
      same('かう', 'かいます', ['かえります', 'あいます', 'みます'], 'かう → かいます (membeli); bunyi akhir う bergeser menjadi い.'),
      same('はなす', 'はなします', ['はいります', 'はしります', 'のみます'], 'はなす → はなします (berbicara).'),
      same('おいしい', 'おいしいです', ['おいしくです', 'おいしいます', 'おいしですます'], 'Kata sifat-i cukup diberi です untuk sopan. Tidak memakai ます.'),
      same('がくせい', 'がくせいです', ['がくせいます', 'がくせいいます', 'がくせいなす'], 'Benda menjadi sopan dengan です, bukan ます.')
    ]
  },
  {
    id: 'f014-base',
    skill: 'kata',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Mundur ke Bentuk Dasar',
    questions: [
      dict('のみます', 'のむ', ['のぬ', 'のくる', 'のます'], 'のみます → のむ (bentuk kamus).'),
      dict('みます', 'みる', ['みむ', 'みす', 'みく'], 'みます → みる.'),
      dict('いきます', 'いく', ['いきる', 'いす', 'いむ'], 'いきます → いく.'),
      dict('かいます', 'かう', ['かいる', 'かむ', 'かす'], 'かいます → かう.'),
      dict('[読|よ]みます', '[読|よ]む', ['[読|よ]る', '[読|よ]く', '[読|よ]す'], '[読|よ]みます → [読|よ]む (membaca).')
    ]
  },
  {
    id: 'f014-trial',
    skill: 'kata',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Ujian: Kata Baru',
    passRatio: 0.8,
    questions: [
      same('おきる', 'おきます', ['おわります', 'のります', 'あそびます'], 'おきる → おきます (bangun).'),
      same('ねる', 'ねます', ['のります', 'みます', 'ふります'], 'ねる → ねます (tidur).'),
      same('あう', 'あいます', ['あります', 'あそびます', 'あけます'], 'あう → あいます (bertemu).'),
      same('かく', 'かきます', ['かります', 'きます', 'かえります'], 'かく → かきます (menulis).'),
      dict('はなします', 'はなす', ['はなる', 'はなく', 'はなむ'], 'はなします → はなす.'),
      dict('あそびます', 'あそぶ', ['あそむ', 'あそす', 'あそる'], 'あそびます → あそぶ (bermain).'),
      dict('たべます', 'たべる', ['たむ', 'たぶ', 'たす'], 'たべます → たべる.'),
      same('おおきい', 'おおきいです', ['おおきます', 'おおきなです', 'おおいます'], 'Kata sifat-i + です.')
    ]
  }
];
