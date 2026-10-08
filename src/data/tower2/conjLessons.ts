// ==============================================================================
// MENARA 2 — PELAJARAN LANTAI PERUBAHAN BENTUK (teks tetap, ditulis tangan)
// Kunci: nomor urut arc 'konj' (1..9) dan 'lanjut' (1..6).
// ==============================================================================

import { LessonStep } from '../../engine/tower1/types';

export const KONJ_LESSONS: Record<number, LessonStep[]> = {
  1: [
    {
      title: 'Tiga golongan kata kerja',
      body: 'Semua perubahan bentuk kata kerja bergantung pada golongannya. Kenali golongan dulu, baru ubah bentuknya.',
      grid: [
        { glyph: 'Gol. 1', sub: 'godan (五段)' },
        { glyph: 'Gol. 2', sub: 'ichidan (一段)' },
        { glyph: 'Gol. 3', sub: 'tak beraturan' }
      ]
    },
    {
      title: 'Golongan 2: berakhir いる / える',
      body: 'Kata kerja berakhir る yang suku kata sebelumnya bunyi i atau e (い・き・し... / え・け・せ...) umumnya golongan 2. Ujung る cukup dibuang saat berubah bentuk.',
      grid: [
        { glyph: 'たべる', sub: 'makan (-eru)' },
        { glyph: 'みる', sub: 'melihat (-iru)' },
        { glyph: 'おきる', sub: 'bangun (-iru)' },
        { glyph: 'ねる', sub: 'tidur (-eru)' }
      ]
    },
    {
      title: 'Golongan 1: sisanya',
      body: 'Kata kerja yang berakhir bukan る (く, ぐ, す, つ, ぬ, ぶ, む, う) pasti golongan 1. Yang berakhir る tetapi bunyi sebelumnya bukan i/e (misalnya ある, のる, つくる) juga golongan 1.',
      grid: [
        { glyph: 'かく', sub: 'menulis' },
        { glyph: 'のむ', sub: 'minum' },
        { glyph: 'はなす', sub: 'berbicara' },
        { glyph: 'のる', sub: 'naik' }
      ]
    },
    {
      title: 'Jebakan: tampak golongan 2, sebenarnya golongan 1',
      body: 'Beberapa kata berakhir いる/える tetapi golongan 1. Yang paling sering: かえる (帰る, pulang), はいる (入る, masuk), はしる (走る, berlari), しる (知る, tahu), きる (切る, memotong). Hafalkan; kata-kata ini muncul terus di ujian.',
      compare: [
        { label: '帰る', value: 'かえる → かえります (golongan 1)' },
        { label: '食べる', value: 'たべる → たべます (golongan 2)' }
      ]
    },
    {
      title: 'Golongan 3: hanya dua',
      body: 'する (melakukan) dan くる (来る, datang). Turunannya (べんきょうする, もってくる) mengikuti keduanya.',
      grid: [
        { glyph: 'する', sub: 'melakukan' },
        { glyph: 'くる', sub: 'datang' }
      ]
    }
  ],
  2: [
    {
      title: 'Bentuk sopan: ます',
      body: 'ます dipakai pada ucapan sopan. Aturannya bergantung pada golongan.',
      compare: [
        { label: 'Golongan 1', value: 'ujung u → i + ます (かく → かきます)' },
        { label: 'Golongan 2', value: 'buang る + ます (たべる → たべます)' },
        { label: 'Golongan 3', value: 'する → します · くる → きます' }
      ]
    },
    {
      title: 'Golongan 1: geser ke baris い',
      body: 'Huruf terakhir bergeser dari baris う ke baris い: く→き, ぐ→ぎ, す→し, つ→ち, ぬ→に, ぶ→び, む→み, る→り, う→い.',
      grid: [
        { glyph: 'かく', sub: '→ かきます' },
        { glyph: 'のむ', sub: '→ のみます' },
        { glyph: 'まつ', sub: '→ まちます' },
        { glyph: 'かう', sub: '→ かいます' }
      ]
    },
    {
      title: 'Golongan 2 dan 3',
      grid: [
        { glyph: 'たべる', sub: '→ たべます' },
        { glyph: 'みる', sub: '→ みます' },
        { glyph: 'する', sub: '→ します' },
        { glyph: 'くる', sub: '→ きます' }
      ]
    }
  ],
  3: [
    {
      title: 'Bentuk て untuk golongan 1',
      body: 'Dipakai untuk menyambung kalimat dan meminta (〜てください). Ujung kata menentukan perubahannya.',
      compare: [
        { label: 'う・つ・る', value: '→ って (かう → かって, まつ → まって, のる → のって)' },
        { label: 'む・ぶ・ぬ', value: '→ んで (のむ → のんで, あそぶ → あそんで)' },
        { label: 'く', value: '→ いて (かく → かいて)' },
        { label: 'ぐ', value: '→ いで (およぐ → およいで)' },
        { label: 'す', value: '→ して (はなす → はなして)' }
      ]
    },
    {
      title: 'Satu pengecualian',
      body: 'いく (pergi) mengikuti く → いて tetapi hasilnya いって, bukan いいて.',
      compare: [
        { label: 'かく', value: 'かいて' },
        { label: 'いく', value: 'いって (pengecualian)' }
      ]
    }
  ],
  4: [
    {
      title: 'Bentuk て untuk golongan 2 dan 3',
      body: 'Golongan 2: buang る lalu tambah て. Golongan 3: して dan きて. Golongan 1 tetap memakai aturan ujung kata.',
      compare: [
        { label: 'Golongan 2', value: 'たべる → たべて · みる → みて' },
        { label: 'Golongan 3', value: 'する → して · くる → きて' },
        { label: 'Golongan 1', value: 'のむ → のんで · かく → かいて' }
      ]
    },
    {
      title: 'Awas golongan 1 yang menyerupai golongan 2',
      body: 'かえる → かえって (bukan かえて). はいる → はいって. しる → しって.',
      compare: [
        { label: 'おきる (gol. 2)', value: 'おきて' },
        { label: 'かえる (gol. 1)', value: 'かえって' }
      ]
    }
  ],
  5: [
    {
      title: 'Bentuk lampau: た',
      body: 'Aturannya persis bentuk て, tetapi akhiran て menjadi た dan で menjadi だ.',
      compare: [
        { label: 'かく', value: 'かいて → かいた' },
        { label: 'のむ', value: 'のんで → のんだ' },
        { label: 'たべる', value: 'たべて → たべた' },
        { label: 'する / くる', value: 'した / きた' }
      ]
    }
  ],
  6: [
    {
      title: 'Bentuk negatif: ない',
      body: 'Golongan 1: ujung u → a + ない (う → わ). Golongan 2: buang る + ない. Golongan 3: しない / こない.',
      compare: [
        { label: 'かく', value: 'かかない' },
        { label: 'かう', value: 'かわない (う → わ)' },
        { label: 'たべる', value: 'たべない' },
        { label: 'する / くる', value: 'しない / こない' }
      ]
    },
    {
      title: 'Kasus khusus: ある',
      body: 'ある (ada, untuk benda mati) menjadi ない, bukan あらない.'
    }
  ],
  7: [
    {
      title: 'Kata sifat-i berubah dengan mengganti い',
      body: 'Buang い, lalu tambahkan akhiran yang sesuai. です hanya menambah kesopanan di akhir.',
      compare: [
        { label: 'negatif', value: 'たかい → たかくない' },
        { label: 'lampau', value: 'たかい → たかかった' },
        { label: 'lampau negatif', value: 'たかい → たかくなかった' },
        { label: 'sambung (て)', value: 'たかい → たかくて' }
      ]
    },
    {
      title: 'Pengecualian: いい',
      body: 'いい (baik) berubah dari bentuk lama よい: よくない, よかった, よくて.',
      compare: [
        { label: 'いい', value: 'よくない · よかった · よくなかった · よくて' }
      ]
    }
  ],
  8: [
    {
      title: 'Kata sifat-na dan benda: tambahkan pembantu',
      body: 'Kata sifat-na dan benda tidak berubah; yang berubah adalah です/だ di belakangnya.',
      compare: [
        { label: 'negatif', value: 'しずか → しずかじゃない' },
        { label: 'lampau', value: 'しずか → しずかだった' },
        { label: 'lampau negatif', value: 'しずか → しずかじゃなかった' },
        { label: 'sambung', value: 'しずか → しずかで' }
      ]
    },
    {
      title: 'Menerangkan benda',
      body: 'Kata sifat-na memakai な sebelum benda (しずかな まち). Benda memakai の (がくせいの ともだち).'
    }
  ],
  9: [
    {
      title: 'Rangkaian ます lengkap',
      body: 'Dari bentuk ます: tukar akhiran untuk negatif dan lampau. Tambah ください pada bentuk て untuk meminta.',
      compare: [
        { label: 'sopan', value: 'たべます' },
        { label: 'negatif', value: 'たべません' },
        { label: 'lampau', value: 'たべました' },
        { label: 'lampau negatif', value: 'たべませんでした' },
        { label: 'permintaan', value: 'たべてください' }
      ]
    }
  ]
};

export const LANJUT_LESSONS: Record<number, LessonStep[]> = {
  1: [
    {
      title: 'Bentuk potensial: "bisa melakukan"',
      body: 'Golongan 1: ujung u → e + る. Golongan 2: る → られる. する → できる, くる → こられる.',
      compare: [
        { label: 'かく', value: 'かける (bisa menulis)' },
        { label: 'のむ', value: 'のめる (bisa minum)' },
        { label: 'たべる', value: 'たべられる (bisa makan)' },
        { label: 'する / くる', value: 'できる / こられる' }
      ]
    },
    {
      title: 'Hasilnya golongan 2',
      body: 'Bentuk potensial selalu berakhir る dan berperilaku seperti golongan 2: かける → かけます, かけない.'
    }
  ],
  2: [
    {
      title: 'Ajakan / niat: よう',
      body: 'Golongan 1: ujung u → o + う. Golongan 2: る → よう. する → しよう, くる → こよう.',
      compare: [
        { label: 'かく', value: 'かこう (mari menulis)' },
        { label: 'たべる', value: 'たべよう (mari makan)' }
      ]
    },
    {
      title: 'Keinginan: たい',
      body: 'Ambil akar ます (bentuk sebelum ます) lalu tambah たい. Hasilnya berperilaku seperti kata sifat-i.',
      compare: [
        { label: 'のむ', value: 'のみたい (ingin minum)' },
        { label: 'たべる', value: 'たべたい (ingin makan)' }
      ]
    }
  ],
  3: [
    {
      title: 'Pengandaian ば',
      body: 'Golongan 1: ujung u → e + ば. Golongan 2: る → れば. する → すれば, くる → くれば.',
      compare: [
        { label: 'かく', value: 'かけば' },
        { label: 'たべる', value: 'たべれば' }
      ]
    },
    {
      title: 'Pengandaian たら',
      body: 'Bentuk た + ら: かいたら, のんだら, たべたら. Lebih luwes daripada ば.'
    }
  ],
  4: [
    {
      title: 'Bentuk pasif',
      body: 'Golongan 1: ujung u → a + れる. Golongan 2: る → られる. する → される, くる → こられる.',
      compare: [
        { label: 'かく', value: 'かかれる (ditulis)' },
        { label: 'たべる', value: 'たべられる (dimakan)' }
      ]
    },
    {
      title: 'Hati-hati: potensial vs pasif',
      body: 'Pada golongan 2 bentuk potensial dan pasif sama (たべられる). Konteks yang membedakan. Pada golongan 1 bentuknya berbeda: かける (bisa) vs かかれる (ditulis).'
    }
  ],
  5: [
    {
      title: 'Bentuk kausatif',
      body: 'Golongan 1: ujung u → a + せる. Golongan 2: る → させる. する → させる, くる → こさせる. Berarti menyuruh atau mengizinkan.',
      compare: [
        { label: 'かく', value: 'かかせる (menyuruh menulis)' },
        { label: 'たべる', value: 'たべさせる (menyuruh makan)' }
      ]
    }
  ],
  6: [
    {
      title: 'Bentuk perintah',
      body: 'Golongan 1: ujung u → e. Golongan 2: る → ろ. する → しろ, くる → こい.',
      compare: [
        { label: 'かく', value: 'かけ' },
        { label: 'たべる', value: 'たべろ' }
      ]
    },
    {
      title: 'Kausatif-pasif: terpaksa melakukan',
      body: 'Kausatif + pasif: ujung u → a + せられる pada golongan 1; golongan 2 させられる. Berarti "dipaksa melakukan".',
      compare: [
        { label: 'のむ', value: 'のませられる (terpaksa minum)' },
        { label: 'たべる', value: 'たべさせられる (terpaksa makan)' }
      ]
    }
  ]
};
