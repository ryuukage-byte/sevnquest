import kanjiDb from './db/kanji.json';
import { KANJI_QUESTION_BANK as kanjiQuestionsDb } from './questionBank';
import { KanjiItem } from '../types/content';
import { defineLookupAlias } from './entityIds';

const STATIC_KANJI: Record<string, KanjiItem> = {
  kanji_001: {
    id: 'kanji_001',
    character: '週',
    meaningId: 'Minggu / Pekan',
    meaningEn: 'Week',
    onyomi: ['シュウ (SHUU)'],
    kunyomi: [],
    jlpt: 'N4',
    strokeCount: 11,
    radical: '⻌ (shinnyou - jalan/gerak)',
    radicalName: 'Shinnyou (しんにょう)',
    relatedWords: [
      { word: '週末', reading: 'しゅうまつ', meaningId: 'Akhir pekan' },
      { word: '今週', reading: 'こんしゅう', meaningId: 'Minggu ini' },
      { word: '毎週', reading: 'まいしゅう', meaningId: 'Setiap minggu' },
      { word: '先週', reading: 'せんしゅう', meaningId: 'Minggu lalu' }
    ],
    questions: [
      {
        id: 'kj_q_001_1',
        prompt: '「毎週」の正しい読み方はどれですか。',
        ruby: 'まいしゅう',
        options: ['まいすう', 'まいしゅう (maishuu)', 'まいじゅう', 'まいしゅ'],
        correctIndex: 1,
        explanation: '毎週 dibaca まいしゅう (maishuu) yang artinya setiap minggu.'
      },
      {
        id: 'kj_q_001_2',
        prompt: 'Kanji 「週」 memiliki jumlah goresan (stroke count) sebanyak...',
        options: ['10 goresan', '12 goresan', '11 goresan', '9 goresan'],
        correctIndex: 2,
        explanation: 'Kanji 週 memiliki 11 coretan stroke.'
      }
    ]
  },

  kanji_002: {
    id: 'kanji_002',
    character: '毎',
    meaningId: 'Setiap / Tiap',
    meaningEn: 'Every / Each',
    onyomi: ['マイ (MAI)'],
    kunyomi: ['ごと (goto)'],
    jlpt: 'N5',
    strokeCount: 6,
    radical: '毋 (haha / haha-kamburi)',
    radicalName: 'Haha (はは・なかれ)',
    relatedWords: [
      { word: '毎日', reading: 'まいにち', meaningId: 'Setiap hari' },
      { word: '毎月', reading: 'まいつき / まいげつ', meaningId: 'Setiap bulan' },
      { word: '毎年', reading: 'まいとし / まいねん', meaningId: 'Setiap tahun' },
      { word: '朝毎に', reading: 'あさごとに', meaningId: 'Setiap pagi' }
    ],
    questions: [
      {
        id: 'kj_q_002_1',
        prompt: '「毎日」の漢字の正しい組み合わせはどれですか。',
        options: ['母日', '毎月', '海日', '毎日'],
        correctIndex: 3,
        explanation: '毎日 = まいにち (setiap hari).'
      },
      {
        id: 'kj_q_002_2',
        prompt: 'Onyomi umum dari kanji 「毎」 adalah...',
        options: ['マイ (MAI)', 'モク (MOKU)', 'バイ (BAI)', 'シン (SHIN)'],
        correctIndex: 0,
        explanation: 'Onyomi dari 毎 adalah マイ (MAI).'
      }
    ]
  },

  kanji_003: {
    id: 'kanji_003',
    character: '台',
    meaningId: 'Meja / Alas / Panggung / Unit Mesin',
    meaningEn: 'Platform / Pedestal / Counter for machines',
    onyomi: ['ダイ (DAI)', 'タイ (TAI)'],
    kunyomi: [],
    jlpt: 'N4',
    strokeCount: 5,
    radical: '口 (kuchi - mulut)',
    radicalName: 'Kuchi (くち)',
    relatedWords: [
      { word: '台所', reading: 'だいどころ', meaningId: 'Dapur' },
      { word: '台風', reading: 'たいふう', meaningId: 'Angin topan / Taifun' },
      { word: '一台', reading: 'いちだい', meaningId: '1 unit (kendaraan/mesin)' },
      { word: '舞台', reading: 'ぶたい', meaningId: 'Panggung sandiwara' }
    ],
    questions: [
      {
        id: 'kj_q_003_1',
        prompt: '「台所」の読み方はどれですか。',
        options: ['たいしょ', 'だいどころ (daidokoro)', 'だいじょ', 'たいどころ'],
        correctIndex: 1,
        explanation: '台所 dibaca だいどころ yang berarti dapur.'
      },
      {
        id: 'kj_q_003_2',
        prompt: 'Kanji 「台」 digunakan sebagai kata bantu bilangan (counter) untuk...',
        options: ['Orang', 'Buku dan majalah', 'Mesin, mobil, dan alat elektronik', 'Hewan kecil'],
        correctIndex: 2,
        explanation: '〜台 (dai) adalah counter unit untuk kendaraan dan mesin elektronik.'
      }
    ]
  },

  kanji_004: {
    id: 'kanji_004',
    character: '計',
    meaningId: 'Mengukur / Menghitung / Rencana',
    meaningEn: 'Measure / Plan / Scheme / Meter',
    onyomi: ['ケイ (KEI)'],
    kunyomi: ['はか・る (haka.ru)', 'はか・らう (haka.rau)'],
    jlpt: 'N4',
    strokeCount: 9,
    radical: '言 (gon-ben - kata/ucapan)',
    radicalName: 'Gon-ben (ごんべん)',
    relatedWords: [
      { word: '計画', reading: 'けいかく', meaningId: 'Rencana' },
      { word: '時計', reading: 'とけい', meaningId: 'Jam tangan / arloji' },
      { word: '計算', reading: 'けいさん', meaningId: 'Perhitungan' },
      { word: '合計', reading: 'ごうけい', meaningId: 'Total keseluruhan' }
    ],
    questions: [
      {
        id: 'kj_q_004_1',
        prompt: '「時計」の正しい読み方はどれですか。',
        options: ['じけい', 'ときけい', 'じけ', 'とけい (tokei)'],
        correctIndex: 3,
        explanation: '時計 dibaca とけい (jam).'
      }
    ]
  },

  kanji_005: {
    id: 'kanji_005',
    character: '曜',
    meaningId: 'Hari dalam seminggu / Terang',
    meaningEn: 'Day of the week / Light',
    onyomi: ['ヨウ (YOU)'],
    kunyomi: [],
    jlpt: 'N5',
    strokeCount: 18,
    radical: '日 (hi-hen - matahari)',
    radicalName: 'Hi-hen (ひへん)',
    relatedWords: [
      { word: '日曜日', reading: 'にちようび', meaningId: 'Hari Minggu' },
      { word: '何曜日', reading: 'なんようび', meaningId: 'Hari apa?' },
      { word: '月曜日', reading: 'げつようび', meaningId: 'Hari Senin' },
      { word: '曜日', reading: 'ようび', meaningId: 'Hari dalam seminggu' }
    ],
    questions: [
      {
        id: 'kj_q_005_1',
        prompt: '「何曜日」の読み方はどれですか。',
        options: ['なにようび', 'なんようび (nan-youbi)', 'なんようひ', 'かようび'],
        correctIndex: 1,
        explanation: '何曜日 dibaca なんようび.'
      }
    ]
  }
};

const rawKanjiList: KanjiItem[] = Array.isArray(kanjiDb)
  ? (kanjiDb as any[])
  : (kanjiDb && typeof kanjiDb === 'object')
    ? Object.values(kanjiDb as Record<string, any>)
    : Object.values(STATIC_KANJI);

// Map centralized questions by kanji ID
const kanjiQuestionsMap = new Map<string, any[]>();
if (Array.isArray(kanjiQuestionsDb)) {
  for (const q of kanjiQuestionsDb) {
    const kanjiId = q.knowledge_refs?.[0] || q.kanji_refs?.[0];
    if (kanjiId) {
      if (!kanjiQuestionsMap.has(kanjiId)) kanjiQuestionsMap.set(kanjiId, []);
      kanjiQuestionsMap.get(kanjiId)!.push({
        id: q.id,
        prompt: q.prompt,
        ruby: (q as any).ruby,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation
      });
    }
  }
}

// Index by both k.id and k.character for seamless lookup resilience
const indexedDb: Record<string, KanjiItem> = {};
for (const k of rawKanjiList) {
  if (k && k.id) {
    const itemCopy = {
      ...k,
      questions: kanjiQuestionsMap.get(k.id) || k.questions || []
    };
    indexedDb[k.id] = itemCopy;
    // Alias pencarian per karakter (non-enumerable) agar Object.values() tidak menggandakan kanji.
    if (k.character) {
      defineLookupAlias(indexedDb, k.character, itemCopy);
    }
  }
}

// Ensure static fallback kanji are present
for (const [id, k] of Object.entries(STATIC_KANJI)) {
  if (!indexedDb[id]) indexedDb[id] = k;
}

export const KANJI_DATABASE: Record<string, KanjiItem> = indexedDb;

export const STAGE_1_KANJI_QUIZ = [
  {
    id: 'stg1_kj_1',
    prompt: '今度の______、みんなでバーベキューをしませんか。',
    ruby: 'こんどの しゅうまつ、みんなで ばーべきゅーを しませんか。',
    options: ['毎日', '週末', '時計', '台所'],
    correctIndex: 1,
    explanation: '週末 (しゅうまつ) = akhir pekan.'
  },
  {
    id: 'stg1_kj_2',
    prompt: '田中さんは______朝６時にジョギングをしています。',
    ruby: 'たなかさんは まいにち あさ６じに じょぎんぐを しています。',
    options: ['毎週', '毎月', '毎日', '毎曜'],
    correctIndex: 2,
    explanation: '毎日 (まいにち) = setiap hari.'
  },
  {
    id: 'stg1_kj_3',
    prompt: '母は______で夕食の支度をしています。',
    ruby: 'ははは だいどころで ゆうしょくの したくを しています。',
    options: ['時計', '計画', '週末', '台所'],
    correctIndex: 3,
    explanation: '台所 (だいどころ) = dapur.'
  },
  {
    id: 'stg1_kj_4',
    prompt: '将来の______をしっかり立てることが大切です。',
    ruby: 'しょうらいの けいかくを しっかり たてることが たいせつです。',
    options: ['計画', '計算', '合計画', '時計'],
    correctIndex: 0,
    explanation: '計画 (けいかく) = rencana.'
  },
  {
    id: 'stg1_kj_5',
    prompt: '明日は______ですか。――水曜日です。',
    ruby: 'あしたは なんようびですか。――すいようびです。',
    options: ['毎日', '何曜日', '何台', '何週'],
    correctIndex: 1,
    explanation: '何曜日 (なんようび) = hari apa.'
  },
  {
    id: 'stg1_kj_6',
    prompt: '「週」の部首（Radical）はどれですか。',
    options: ['口 (くち)', '日 (ひ)', '⻌ (しんにょう - jalan/bergerak)', '言 (ごんべん)'],
    correctIndex: 2,
    explanation: 'Kanji 週 berakar dari radikal ⻌ (しんにょう).'
  },
  {
    id: 'stg1_kj_7',
    prompt: '「車が３______止まっています。」 Titik-titik diisi dengan kanji counter yang tepat...',
    ruby: 'くるまが さん______ とまっています。',
    options: ['週 (しゅう)', '毎 (まい)', '計 (けい)', '台 (だい)'],
    correctIndex: 3,
    explanation: 'Mobil dan kendaraan dihitung menggunakan satuan 台 (だい).'
  }
];
