// ==============================================================================
// LANTAI 012 — SENI KONTEKS (yang tidak diucapkan)
// Yang dilatih: MEMULIHKAN pelaku yang dihilangkan dari konteks. Bukan "Jepang tidak
// punya subjek": pelaku sering hilang karena konteks sudah cukup, bukan karena tidak ada.
// Konteks diberikan dalam bahasa Indonesia agar yang diuji adalah penalaran, bukan hafalan kata.
// ==============================================================================

import { ChoiceQuestion, Room } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';

const who = (context: string, sentence: string, right: string, wrong: string[], explain: string, ask = 'Siapa yang melakukannya?'): ChoiceQuestion => {
  const options = seededShuffle([right, ...wrong], hashString(`f012:${sentence}:${right}`));
  return {
    prompt: `${context} ${ask}`,
    glyph: sentence,
    say: sentence.replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1'),
    options,
    answer: options.indexOf(right),
    explain
  };
};

export const FLOOR_012_ROOMS: Room[] = [
  {
    id: 'f012-learn',
    skill: 'kalimat',
    kind: 'lesson',
    kicker: 'Temukan',
    title: 'Seni Konteks',
    steps: [
      {
        title: 'Kalimat yang utuh tanpa pelaku',
        body: 'Dalam percakapan Jepang, pelaku sering tidak disebut: わたし, あなた, かれ hilang begitu konteks sudah jelas. Kalimatnya tidak rusak; pendengarlah yang melengkapi.',
        compare: [
          { label: 'Indonesia', value: '"Sudah makan?" — "Belum."' },
          { label: 'Jepang', value: 'たべましたか。 — まだです。' }
        ],
        example: { jp: 'たべましたか', meaning: 'Sudah makan? (pelaku = kamu, tidak diucapkan)', say: 'たべましたか' }
      },
      {
        title: 'Bagaimana memulihkannya?',
        body: 'Tiga petunjuk yang selalu ada: (1) siapa yang sedang dibicarakan sebelumnya, (2) siapa yang berbicara dan kepada siapa, (3) arti kata kerjanya. Pertanyaan "ですか?" biasanya menanyakan lawan bicara; jawaban "たべます" biasanya tentang pembicara.',
        grid: [
          { glyph: '？', sub: 'pertanyaan → lawan bicara' },
          { glyph: '！', sub: 'pernyataan → pembicara' },
          { glyph: '…', sub: 'topik lama → tetap sama' }
        ]
      },
      {
        title: 'Contoh: topik yang terus berlanjut',
        body: 'Setelah は menyebut topik sekali, kalimat berikutnya boleh tidak mengulanginya.',
        chunks: [
          { text: 'たなかさんは', role: 'topik: Tanaka' },
          { text: 'ごはんを', role: 'apa' },
          { text: 'たべました', role: 'raja', king: true }
        ],
        example: { jp: 'たなかさんは ごはんを たべました。 それから ねました。', meaning: 'Tanaka makan. Lalu (Tanaka) tidur.', say: 'たなかさんは ごはんを たべました。 それから ねました。' }
      }
    ]
  },
  {
    id: 'f012-who',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Siapa Pelakunya?',
    questions: [
      who('Kamu bertanya kepada temanmu di kantin.', 'たべましたか', 'temanmu', ['kamu sendiri', 'orang lain yang tidak hadir'], 'Kalimat tanya biasanya menanyakan lawan bicara: "Sudah (kamu) makan?"'),
      who('Temanmu bertanya, "Sudah makan?" Kamu menjawab.', 'まだです', 'kamu (pembicara)', ['temanmu', 'guru'], 'Menjawab pertanyaan tentang dirimu: "(Saya) belum."', 'Siapa yang belum?'),
      who('Tanaka-san dan Sato-san sedang dibicarakan. Kalimat awal: たなかさんは ほんを よみます。 Lalu: それから かいます。', 'それから かいます', 'Tanaka-san', ['Sato-san', 'kamu'], 'Topik たなかさん masih berlanjut, jadi yang membeli juga Tanaka-san.'),
      who('Ibu berkata kepadamu di pagi hari.', 'おきなさい', 'kamu', ['ibu', 'ayah'], 'Perintah selalu ditujukan kepada lawan bicara: "(Kamu) bangun!"'),
      who('Kamu berada di toko dan berkata kepada penjual.', 'これを ください', 'kamu (yang meminta)', ['penjual', 'orang ketiga'], 'Permintaan datang dari pembicara: "(Tolong beri saya) ini."', 'Siapa yang meminta?'),
      who('Temanmu menunjuk jam lalu berkata dengan tergesa.', 'いきましょう', 'kamu dan temanmu', ['hanya temanmu', 'hanya kamu'], 'Ajakan melibatkan pembicara dan lawan bicara: "Ayo (kita) pergi."', 'Siapa yang diajak pergi?')
    ]
  },
  {
    id: 'f012-context',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Latih',
    title: 'Mana yang Tersirat?',
    questions: [
      {
        prompt: 'Kalimat ini tidak menyebut pelaku. Mengapa kalimatnya tetap utuh?',
        glyph: 'あした いきます',
        options: ['Karena konteks sudah menunjukkan pelakunya', 'Karena Jepang tidak punya subjek', 'Karena kalimatnya sengaja dirusak'],
        answer: 0,
        explain: 'Pelaku (biasanya pembicara) bisa dipulihkan dari konteks. Bukan berarti tidak ada pelaku.'
      },
      {
        prompt: 'Dalam kalimat ini siapa pelakunya jika tidak ada konteks lain? (Pembicara menjawab sebuah pertanyaan.)',
        glyph: 'ほんを よみます',
        options: ['kemungkinan besar pembicara', 'pasti orang lain', 'tidak ada pelaku'],
        answer: 0,
        explain: 'Pernyataan netral tentang tindakan biasanya tentang pembicara, kecuali konteks menyebut orang lain.'
      },
      {
        prompt: 'Percakapan: A: たなかさんは？ B: かいしゃに いきました。 Siapa yang pergi ke kantor?',
        options: ['Tanaka-san', 'A', 'B'],
        answer: 0,
        explain: 'A menanyakan Tanaka-san; B menjawab tentang topik yang sama.'
      },
      {
        prompt: 'Mana yang paling tepat? "Kalimat Jepang tanpa pelaku itu..."',
        options: ['utuh; pelakunya dipulihkan dari konteks', 'selalu salah', 'selalu berarti "kita"'],
        answer: 0,
        explain: 'Yang hilang hanya penyebutan pelaku, bukan maknanya.'
      }
    ]
  },
  {
    id: 'f012-trial',
    skill: 'kalimat',
    kind: 'choice',
    kicker: 'Ingat',
    title: 'Ujian: Konteks Baru',
    passRatio: 0.7,
    questions: [
      who('Kamu sedang makan bersama temanmu. Temanmu bertanya sambil menunjuk piringmu.', 'おいしいですか', 'kamu', ['temanmu', 'koki'], 'Pertanyaan tentang rasa makananmu: "(Apakah itu) enak (bagimu)?"', 'Siapa yang ditanya merasakannya?'),
      who('Tanaka-san berkata: たなかです。 [memperkenalkan diri] Lalu: がくせいです。', 'がくせいです', 'Tanaka-san', ['kamu', 'seorang guru'], 'Topik masih Tanaka-san: "(Saya, Tanaka,) pelajar."', 'Siapa yang pelajar?'),
      who('Temanmu masuk ke ruangan dan berkata kepadamu.', 'ただいま', 'temanmu (yang pulang)', ['kamu', 'orang lain'], 'Salam pulang diucapkan orang yang baru tiba: "(Saya) sudah pulang."', 'Siapa yang pulang?'),
      who('Gurumu memberi tugas di kelas.', 'よんでください', 'murid (kamu)', ['guru', 'orang di luar kelas'], 'Permintaan guru ditujukan kepada murid: "(Tolong kamu) baca."', 'Siapa yang diminta membaca?'),
      who('Kamu melihat Sato-san di jalan lalu bertanya kepada temanmu.', 'どこへ いきますか', 'Sato-san (yang kalian lihat)', ['kamu', 'temanmu'], 'Konteks menunjukkan Sato-san sebagai yang sedang dibicarakan.', 'Siapa yang pergi?'),
      who('Kamu berkata kepada temanmu di stasiun.', 'おさきに しつれいします', 'kamu', ['temanmu', 'petugas'], 'Pamit adalah tindakan pembicara: "(Saya) permisi duluan."', 'Siapa yang pamit?')
    ]
  }
];
