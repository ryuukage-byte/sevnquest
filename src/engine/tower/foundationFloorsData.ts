// ==============================================================================
// NIHONGO TOWER — FOUNDATION FLOORS CURATED CURRICULUM (FLOORS 1 - 10)
// ==============================================================================

import {
  VocabularyTarget,
  KanjiTarget,
  IdentificationQuestion
} from '../../types/tower';

export interface FoundationFloorData {
  floor: number;
  theme: string;
  loreQuote: string;
  loreContext: string;
  gameplayObjective: string;
  isCheckpoint: boolean;
  isBossFloor: boolean;
  targetCharacters: string[];
  inscriptionTarget: KanjiTarget;
  inscriptionTargets?: KanjiTarget[];
  identificationQuestions: IdentificationQuestion[];
  vocabularyTargets: VocabularyTarget[];
  vocabularyQuestions: IdentificationQuestion[];
  wordAssemblyQuestions: Array<{
    prompt: string;
    englishMeaning: string;
    tokens: string[];
    correctOrder: string[];
  }>;
}

export const FOUNDATION_FLOORS_DATA: Record<number, FoundationFloorData> = {
  // ----------------------------------------------------------------------------
  // LANTAI 1: VOKAL HIRAGANA DASAR (A・I・U・E・O)
  // ----------------------------------------------------------------------------
  1: {
    floor: 1,
    theme: 'Gerbang Vokal Hiragana Dasar (あ・い・う・え・お)',
    loreQuote: '「初めの一歩が、千里の道を開く。」',
    loreContext: 'Selamat datang di Menara Nihongo. Perjalanan agung Anda diawali dari lima bunyi vokal murni (AIUEO) yang menjadi pondasi seluruh bahasa Jepang.',
    gameplayObjective: 'Kuasai bentuk goresan vokal dasar あ・い・う・え・お dan pelajari kata-kata awal yang dibentuk darinya.',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['あ', 'い', 'う', 'え', 'お'],
    inscriptionTarget: {
      id: 'kana_a',
      kanji: 'あ',
      onyomi: ['vokal [a]'],
      kunyomi: ['a'],
      meaning: 'Huruf Hiragana: A',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_a', kanji: 'あ', onyomi: ['vokal [a]'], kunyomi: ['a'], meaning: 'Huruf Hiragana: A', writingRequired: true },
      { id: 'kana_i', kanji: 'い', onyomi: ['vokal [i]'], kunyomi: ['i'], meaning: 'Huruf Hiragana: I', writingRequired: true },
      { id: 'kana_u', kanji: 'う', onyomi: ['vokal [u]'], kunyomi: ['u'], meaning: 'Huruf Hiragana: U', writingRequired: true },
      { id: 'kana_e', kanji: 'え', onyomi: ['vokal [e]'], kunyomi: ['e'], meaning: 'Huruf Hiragana: E', writingRequired: true },
      { id: 'kana_o', kanji: 'お', onyomi: ['vokal [o]'], kunyomi: ['o'], meaning: 'Huruf Hiragana: O', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f1_ai', word: 'あい', reading: 'あい', meaning: 'Cinta / Kasih', source: 'new', masteryRequired: 70 },
      { id: 'v_f1_ue', word: 'うえ', reading: 'うえ', meaning: 'Atas', source: 'new', masteryRequired: 70 },
      { id: 'v_f1_ao', word: 'あお', reading: 'あお', meaning: 'Biru', source: 'new', masteryRequired: 70 },
      { id: 'v_f1_ii', word: 'いい', reading: 'いい', meaning: 'Bagus / Baik', source: 'new', masteryRequired: 70 },
      { id: 'v_f1_ie', word: 'いえ', reading: 'いえ', meaning: 'Rumah', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kana_a',
        questionType: 'reading',
        prompt: 'Huruf Hiragana manakah yang berbunyi "a"?',
        options: ['あ', 'い', 'う', 'お'],
        correctAnswer: 'あ'
      },
      {
        targetId: 'kana_i',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「い」?',
        options: ['i', 'e', 'u', 'a'],
        correctAnswer: 'i'
      },
      {
        targetId: 'kana_u',
        questionType: 'reading',
        prompt: 'Aksara Hiragana manakah yang berbunyi "u"?',
        options: ['う', 'え', 'お', 'あ'],
        correctAnswer: 'う'
      },
      {
        targetId: 'kana_e',
        questionType: 'reading',
        prompt: 'Aksara manakah ini: 「え」?',
        options: ['e', 'a', 'o', 'i'],
        correctAnswer: 'e'
      },
      {
        targetId: 'kana_o',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「お」?',
        options: ['o', 'u', 'a', 'e'],
        correctAnswer: 'o'
      },
      {
        targetId: 'kana_ai',
        questionType: 'reading',
        prompt: 'Manakah urutan aksara vokal bahasa Jepang yang benar?',
        options: ['a - i - u - e - o', 'a - e - i - o - u', 'a - u - i - e - o', 'a - o - u - e - i'],
        correctAnswer: 'a - i - u - e - o'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f1_ai',
        questionType: 'meaning',
        prompt: 'Apa arti dari kosakata 「あい」 (ai)?',
        options: ['Cinta / Kasih', 'Atas', 'Rumah', 'Biru'],
        correctAnswer: 'Cinta / Kasih'
      },
      {
        targetId: 'v_f1_ue',
        questionType: 'meaning',
        prompt: 'Apa arti dari kosakata 「うえ」 (ue)?',
        options: ['Atas', 'Bawah', 'Dalam', 'Luar'],
        correctAnswer: 'Atas'
      },
      {
        targetId: 'v_f1_ao',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「あお」 (ao)?',
        options: ['Biru', 'Merah', 'Putih', 'Kuning'],
        correctAnswer: 'Biru'
      },
      {
        targetId: 'v_f1_ii',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「いい」 (ii)?',
        options: ['Bagus / Baik', 'Buruk', 'Selesai', 'Tidak'],
        correctAnswer: 'Bagus / Baik'
      },
      {
        targetId: 'v_f1_ie',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「いえ」 (ie)?',
        options: ['Rumah', 'Mobil', 'Pohon', 'Sekolah'],
        correctAnswer: 'Rumah'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Bentuk kata untuk: "Cinta (ai)"',
        englishMeaning: 'Love (ai)',
        tokens: ['い', 'あ'],
        correctOrder: ['あ', 'い']
      },
      {
        prompt: 'Bentuk kata untuk: "Atas (ue)"',
        englishMeaning: 'Up / Above (ue)',
        tokens: ['え', 'う'],
        correctOrder: ['う', 'え']
      },
      {
        prompt: 'Bentuk kata untuk: "Biru (ao)"',
        englishMeaning: 'Blue (ao)',
        tokens: ['お', 'あ'],
        correctOrder: ['あ', 'お']
      },
      {
        prompt: 'Bentuk kata untuk: "Rumah (ie)"',
        englishMeaning: 'House / Home (ie)',
        tokens: ['え', 'い'],
        correctOrder: ['い', 'え']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 2: BARIS K (か・き・く・け・こ)
  // ----------------------------------------------------------------------------
  2: {
    floor: 2,
    theme: 'Baris K Konsonan (か・き・く・け・こ)',
    loreQuote: '「声を出し、手を動かせば、文字は心に刻まれる。」',
    loreContext: 'Melangkah ke baris kedua Hiragana: konsonan K dipadukan dengan vokal A-I-U-E-O.',
    gameplayObjective: 'Kuasai aksara か・き・く・け・こ dan kombinasikan dengan vokal dasar untuk membaca stasiun, warna, dan kata kerja.',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['か', 'き', 'く', 'け', 'こ'],
    inscriptionTarget: {
      id: 'kana_ka',
      kanji: 'か',
      onyomi: ['suku kata [ka]'],
      kunyomi: ['ka'],
      meaning: 'Huruf Hiragana: KA',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_ka', kanji: 'か', onyomi: ['suku kata [ka]'], kunyomi: ['ka'], meaning: 'Huruf Hiragana: KA', writingRequired: true },
      { id: 'kana_ki', kanji: 'き', onyomi: ['suku kata [ki]'], kunyomi: ['ki'], meaning: 'Huruf Hiragana: KI', writingRequired: true },
      { id: 'kana_ku', kanji: 'く', onyomi: ['suku kata [ku]'], kunyomi: ['ku'], meaning: 'Huruf Hiragana: KU', writingRequired: true },
      { id: 'kana_ke', kanji: 'け', onyomi: ['suku kata [ke]'], kunyomi: ['ke'], meaning: 'Huruf Hiragana: KE', writingRequired: true },
      { id: 'kana_ko', kanji: 'こ', onyomi: ['suku kata [ko]'], kunyomi: ['ko'], meaning: 'Huruf Hiragana: KO', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f2_aka', word: 'あか', reading: 'あか', meaning: 'Merah', source: 'new', masteryRequired: 70 },
      { id: 'v_f2_eki', word: 'えき', reading: 'えき', meaning: 'Stasiun', source: 'new', masteryRequired: 70 },
      { id: 'v_f2_aki', word: 'あき', reading: 'あき', meaning: 'Musim gugur', source: 'new', masteryRequired: 70 },
      { id: 'v_f2_koe', word: 'こえ', reading: 'こえ', meaning: 'Suara', source: 'new', masteryRequired: 70 },
      { id: 'v_f2_kaku', word: 'かく', reading: 'かく', meaning: 'Menulis', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kana_ka',
        questionType: 'reading',
        prompt: 'Aksara Hiragana manakah yang berbunyi "ka"?',
        options: ['か', 'き', 'く', 'け'],
        correctAnswer: 'か'
      },
      {
        targetId: 'kana_ki',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「き」?',
        options: ['ki', 'ke', 'ko', 'ku'],
        correctAnswer: 'ki'
      },
      {
        targetId: 'kana_ku',
        questionType: 'reading',
        prompt: 'Aksara manakah ini: 「く」?',
        options: ['ku', 'ka', 'ko', 'ke'],
        correctAnswer: 'ku'
      },
      {
        targetId: 'kana_ke',
        questionType: 'reading',
        prompt: 'Bagaimana romaji dari aksara 「け」?',
        options: ['ke', 'ki', 'ku', 'ko'],
        correctAnswer: 'ke'
      },
      {
        targetId: 'kana_ko',
        questionType: 'reading',
        prompt: 'Aksara manakah yang berbunyi "ko"?',
        options: ['こ', 'け', 'く', 'か'],
        correctAnswer: 'こ'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f2_aka',
        questionType: 'meaning',
        prompt: 'Apa arti dari kosakata 「あか」 (aka)?',
        options: ['Merah', 'Biru', 'Stasiun', 'Suara'],
        correctAnswer: 'Merah'
      },
      {
        targetId: 'v_f2_eki',
        questionType: 'meaning',
        prompt: 'Apa arti dari kosakata 「えき」 (eki)?',
        options: ['Stasiun', 'Musim gugur', 'Menulis', 'Merah'],
        correctAnswer: 'Stasiun'
      },
      {
        targetId: 'v_f2_koe',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「こえ」 (koe)?',
        options: ['Suara', 'Pagi', 'Malam', 'Hati'],
        correctAnswer: 'Suara'
      },
      {
        targetId: 'v_f2_kaku',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata kerja 「かく」 (kaku)?',
        options: ['Menulis', 'Mendengar', 'Membaca', 'Berjalan'],
        correctAnswer: 'Menulis'
      },
      {
        targetId: 'v_f2_aki',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「あき」 (aki)?',
        options: ['Musim gugur', 'Musim panas', 'Musim semi', 'Musim dingin'],
        correctAnswer: 'Musim gugur'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun aksara untuk kata: "Merah (aka)"',
        englishMeaning: 'Red (aka)',
        tokens: ['か', 'あ'],
        correctOrder: ['あ', 'か']
      },
      {
        prompt: 'Susun aksara untuk kata: "Stasiun (eki)"',
        englishMeaning: 'Station (eki)',
        tokens: ['き', 'え'],
        correctOrder: ['え', 'き']
      },
      {
        prompt: 'Susun aksara untuk kata: "Suara (koe)"',
        englishMeaning: 'Voice (koe)',
        tokens: ['え', 'こ'],
        correctOrder: ['こ', 'え']
      },
      {
        prompt: 'Susun aksara untuk kata: "Menulis (kaku)"',
        englishMeaning: 'To write (kaku)',
        tokens: ['く', 'か'],
        correctOrder: ['か', 'く']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 3: BARIS S (さ・し・す・せ・そ)
  // ----------------------------------------------------------------------------
  3: {
    floor: 3,
    theme: 'Baris S Desis (さ・し・す・せ・そ)',
    loreQuote: '「風の音を聴き、さ・し・す・せ・そを紡ぐ。」',
    loreContext: 'Baris S membawa bunyi desis yang khas, termasuk bunyi istimewa 「し」 (shi) yang berbeda pelafalannya.',
    gameplayObjective: 'Kuasai pelafalan istimewa SHI dan aksara さ・し・す・せ・そ, lalu baca kosakata sehari-hari seperti pagi dan sushi.',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['さ', 'し', 'す', 'せ', 'そ'],
    inscriptionTarget: {
      id: 'kana_sa',
      kanji: 'さ',
      onyomi: ['suku kata [sa]'],
      kunyomi: ['sa'],
      meaning: 'Huruf Hiragana: SA',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_sa', kanji: 'さ', onyomi: ['suku kata [sa]'], kunyomi: ['sa'], meaning: 'Huruf Hiragana: SA', writingRequired: true },
      { id: 'kana_shi', kanji: 'し', onyomi: ['suku kata [shi]'], kunyomi: ['shi'], meaning: 'Huruf Hiragana: SHI', writingRequired: true },
      { id: 'kana_su', kanji: 'す', onyomi: ['suku kata [su]'], kunyomi: ['su'], meaning: 'Huruf Hiragana: SU', writingRequired: true },
      { id: 'kana_se', kanji: 'せ', onyomi: ['suku kata [se]'], kunyomi: ['se'], meaning: 'Huruf Hiragana: SE', writingRequired: true },
      { id: 'kana_so', kanji: 'そ', onyomi: ['suku kata [so]'], kunyomi: ['so'], meaning: 'Huruf Hiragana: SO', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f3_asa', word: 'あさ', reading: 'あさ', meaning: 'Pagi', source: 'new', masteryRequired: 70 },
      { id: 'v_f3_sushi', word: 'すし', reading: 'すし', meaning: 'Sushi', source: 'new', masteryRequired: 70 },
      { id: 'v_f3_ushi', word: 'うし', reading: 'うし', meaning: 'Sapi', source: 'new', masteryRequired: 70 },
      { id: 'v_f3_sake', word: 'さけ', reading: 'さけ', meaning: 'Ikan salmon / Minuman', source: 'new', masteryRequired: 70 },
      { id: 'v_f3_soko', word: 'そこ', reading: 'そこ', meaning: 'Di sana', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kana_sa',
        questionType: 'reading',
        prompt: 'Aksara Hiragana manakah yang berbunyi "sa"?',
        options: ['さ', 'し', 'す', 'せ'],
        correctAnswer: 'さ'
      },
      {
        targetId: 'kana_shi',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「し」?',
        options: ['shi', 'si', 'chi', 'tsu'],
        correctAnswer: 'shi'
      },
      {
        targetId: 'kana_su',
        questionType: 'reading',
        prompt: 'Aksara manakah ini: 「す」?',
        options: ['su', 'sa', 'so', 'se'],
        correctAnswer: 'su'
      },
      {
        targetId: 'kana_se',
        questionType: 'reading',
        prompt: 'Bagaimana romaji dari aksara 「せ」?',
        options: ['se', 'su', 'sa', 'so'],
        correctAnswer: 'se'
      },
      {
        targetId: 'kana_so',
        questionType: 'reading',
        prompt: 'Aksara manakah yang berbunyi "so"?',
        options: ['そ', 'せ', 'す', 'さ'],
        correctAnswer: 'そ'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f3_asa',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「あさ」 (asa)?',
        options: ['Pagi', 'Malam', 'Siang', 'Sore'],
        correctAnswer: 'Pagi'
      },
      {
        targetId: 'v_f3_sushi',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「すし」 (sushi)?',
        options: ['Makanan sushi', 'Minuman teh', 'Sup miso', 'Daging bakar'],
        correctAnswer: 'Makanan sushi'
      },
      {
        targetId: 'v_f3_ushi',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「うし」 (ushi)?',
        options: ['Sapi', 'Kuda', 'Burung', 'Ikan'],
        correctAnswer: 'Sapi'
      },
      {
        targetId: 'v_f3_soko',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata penunjuk 「そこ」 (soko)?',
        options: ['Di sana (dekat lawan bicara)', 'Di sini', 'Di mana', 'Di atas'],
        correctAnswer: 'Di sana (dekat lawan bicara)'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kata: "Pagi (asa)"',
        englishMeaning: 'Morning (asa)',
        tokens: ['さ', 'あ'],
        correctOrder: ['あ', 'さ']
      },
      {
        prompt: 'Susun kata: "Sushi"',
        englishMeaning: 'Sushi (sushi)',
        tokens: ['し', 'す'],
        correctOrder: ['す', 'し']
      },
      {
        prompt: 'Susun kata: "Sapi (ushi)"',
        englishMeaning: 'Cow / Cattle (ushi)',
        tokens: ['し', 'う'],
        correctOrder: ['う', 'し']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 4: BARIS T (た・ち・つ・て・と)
  // ----------------------------------------------------------------------------
  4: {
    floor: 4,
    theme: 'Baris T Ketukan (た・ち・つ・て・と)',
    loreQuote: '「手を取り、歌をうたい、歩みを進める。」',
    loreContext: 'Baris T memiliki dua pelafalan istimewa: 「ち」 (chi) dan 「つ」 (tsu).',
    gameplayObjective: 'Kuasai pelafalan istimewa CHI & TSU serta aksara た・ち・つ・て・と.',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['た', 'ち', 'つ', 'て', 'と'],
    inscriptionTarget: {
      id: 'kana_ta',
      kanji: 'た',
      onyomi: ['suku kata [ta]'],
      kunyomi: ['ta'],
      meaning: 'Huruf Hiragana: TA',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_ta', kanji: 'た', onyomi: ['suku kata [ta]'], kunyomi: ['ta'], meaning: 'Huruf Hiragana: TA', writingRequired: true },
      { id: 'kana_chi', kanji: 'ち', onyomi: ['suku kata [chi]'], kunyomi: ['chi'], meaning: 'Huruf Hiragana: CHI', writingRequired: true },
      { id: 'kana_tsu', kanji: 'つ', onyomi: ['suku kata [tsu]'], kunyomi: ['tsu'], meaning: 'Huruf Hiragana: TSU', writingRequired: true },
      { id: 'kana_te', kanji: 'て', onyomi: ['suku kata [te]'], kunyomi: ['te'], meaning: 'Huruf Hiragana: TE', writingRequired: true },
      { id: 'kana_to', kanji: 'と', onyomi: ['suku kata [to]'], kunyomi: ['to'], meaning: 'Huruf Hiragana: TO', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f4_uta', word: 'うた', reading: 'うた', meaning: 'Lagu', source: 'new', masteryRequired: 70 },
      { id: 'v_f4_te', word: 'て', reading: 'て', meaning: 'Tangan', source: 'new', masteryRequired: 70 },
      { id: 'v_f4_tori', word: 'とり', reading: 'とり', meaning: 'Burung', source: 'new', masteryRequired: 70 },
      { id: 'v_f4_tsukue', word: 'つくえ', reading: 'つくえ', meaning: 'Meja', source: 'new', masteryRequired: 70 },
      { id: 'v_f4_chichi', word: 'ちち', reading: 'ちち', meaning: 'Ayah kandung', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kana_ta',
        questionType: 'reading',
        prompt: 'Aksara Hiragana manakah yang berbunyi "ta"?',
        options: ['た', 'ち', 'つ', 'て'],
        correctAnswer: 'た'
      },
      {
        targetId: 'kana_chi',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「ち」?',
        options: ['chi', 'ti', 'tsu', 'shi'],
        correctAnswer: 'chi'
      },
      {
        targetId: 'kana_tsu',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「つ」?',
        options: ['tsu', 'tu', 'su', 'chi'],
        correctAnswer: 'tsu'
      },
      {
        targetId: 'kana_te',
        questionType: 'reading',
        prompt: 'Aksara manakah ini: 「て」?',
        options: ['te', 'ta', 'to', 'tsu'],
        correctAnswer: 'te'
      },
      {
        targetId: 'kana_to',
        questionType: 'reading',
        prompt: 'Aksara manakah yang berbunyi "to"?',
        options: ['と', 'て', 'た', 'つ'],
        correctAnswer: 'と'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f4_uta',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「うた」 (uta)?',
        options: ['Lagu', 'Tangan', 'Meja', 'Burung'],
        correctAnswer: 'Lagu'
      },
      {
        targetId: 'v_f4_te',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「て」 (te)?',
        options: ['Tangan', 'Kaki', 'Kepala', 'Mata'],
        correctAnswer: 'Tangan'
      },
      {
        targetId: 'v_f4_tsukue',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「つくえ」 (tsukue)?',
        options: ['Meja', 'Kursi', 'Pintu', 'Jendela'],
        correctAnswer: 'Meja'
      },
      {
        targetId: 'v_f4_chichi',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ちち」 (chichi)?',
        options: ['Ayah (kandung)', 'Ibu', 'Kakak', 'Adik'],
        correctAnswer: 'Ayah (kandung)'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kata: "Lagu (uta)"',
        englishMeaning: 'Song (uta)',
        tokens: ['た', 'う'],
        correctOrder: ['う', 'た']
      },
      {
        prompt: 'Susun kata: "Ayah (chichi)"',
        englishMeaning: 'Father (chichi)',
        tokens: ['ち', 'ち'],
        correctOrder: ['ち', 'ち']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 5: POS PEMERIKSAAN — SINTESIS A-T & PARTIKEL DASAR (は・の・を)
  // ----------------------------------------------------------------------------
  5: {
    floor: 5,
    theme: 'Pos Pemeriksaan: Sintesis Baris A-T & Partikel Dasar',
    loreQuote: '「足元を固めよ。ここまでの歩みが汝の力となる。」',
    loreContext: 'Pos peristirahatan pertama. Uji seluruh pemahaman dari baris vokal A, K, S, hingga T, serta pengenalan partikel dasar kalimat.',
    gameplayObjective: 'Tuntaskan tantangan komprehensif baris A-T dan pahami fungsi partikel topik は (wa) dan kepemilikan の (no).',
    isCheckpoint: true,
    isBossFloor: false,
    targetCharacters: ['あ', 'か', 'さ', 'た', 'は', 'の'],
    inscriptionTarget: {
      id: 'kana_te_write',
      kanji: 'て',
      onyomi: ['suku kata [te]'],
      kunyomi: ['te'],
      meaning: 'Huruf Hiragana: TE',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_te', kanji: 'て', onyomi: ['suku kata [te]'], kunyomi: ['te'], meaning: 'Huruf Hiragana: TE', writingRequired: true },
      { id: 'kana_ha', kanji: 'は', onyomi: ['suku kata [ha/wa]'], kunyomi: ['ha'], meaning: 'Huruf Hiragana: HA / WA', writingRequired: true },
      { id: 'kana_no', kanji: 'の', onyomi: ['suku kata [no]'], kunyomi: ['no'], meaning: 'Huruf Hiragana: NO', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f5_watashi', word: 'わたし', reading: 'わたし', meaning: 'Saya / Aku', source: 'new', masteryRequired: 75 },
      { id: 'v_f5_anata', word: 'あなた', reading: 'あなた', meaning: 'Anda / Kamu', source: 'new', masteryRequired: 75 },
      { id: 'v_f5_neko', word: 'ねこ', reading: 'ねこ', meaning: 'Kucing', source: 'new', masteryRequired: 75 },
      { id: 'v_f5_inu', word: 'いぬ', reading: 'いぬ', meaning: 'Anjing', source: 'new', masteryRequired: 75 }
    ],
    identificationQuestions: [
      {
        targetId: 'part_wa',
        questionType: 'meaning',
        prompt: 'Ketika aksara 「は」 berfungsi sebagai partikel penanda topik kalimat, dibaca sebagai...',
        options: ['wa', 'ha', 'ba', 'pa'],
        correctAnswer: 'wa'
      },
      {
        targetId: 'part_no',
        questionType: 'meaning',
        prompt: 'Partikel manakah yang digunakan untuk menyatakan kepemilikan (misal: "buku saya")?',
        options: ['の (no)', 'は (wa)', 'を (o)', 'に (ni)'],
        correctAnswer: 'の (no)'
      },
      {
        targetId: 'kana_rev_1',
        questionType: 'reading',
        prompt: 'Manakah pasangan romaji yang benar untuk 「し」 dan 「ち」?',
        options: ['shi & chi', 'si & ti', 'chi & tsu', 'sa & ta'],
        correctAnswer: 'shi & chi'
      },
      {
        targetId: 'kana_rev_2',
        questionType: 'reading',
        prompt: 'Manakah aksara yang memiliki arti "Tangan"?',
        options: ['て (te)', 'うた (uta)', 'あさ (asa)', 'えき (eki)'],
        correctAnswer: 'て (te)'
      },
      {
        targetId: 'part_usage',
        questionType: 'meaning',
        prompt: 'Dalam frasa 「わたし の て」 (watashi no te), apa artinya?',
        options: ['Tangan saya', 'Saya dan tangan', 'Tangan ini', 'Di tangan'],
        correctAnswer: 'Tangan saya'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f5_watashi',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「わたし」 (watashi)?',
        options: ['Saya / Aku', 'Kamu', 'Dia', 'Mereka'],
        correctAnswer: 'Saya / Aku'
      },
      {
        targetId: 'v_f5_anata',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「あなた」 (anata)?',
        options: ['Anda / Kamu', 'Saya', 'Guru', 'Teman'],
        correctAnswer: 'Anda / Kamu'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun frasa: "Saya (watashi)"',
        englishMeaning: 'I / Me (watashi)',
        tokens: ['し', 'た', 'わ'],
        correctOrder: ['わ', 'た', 'し']
      },
      {
        prompt: 'Susun kata: "Anda / Kamu (anata)"',
        englishMeaning: 'You (anata)',
        tokens: ['た', 'な', 'あ'],
        correctOrder: ['あ', 'な', 'た']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 6: BARIS N & H (な・に・ぬ・ね・の & は・ひ・ふ・へ・ほ)
  // ----------------------------------------------------------------------------
  6: {
    floor: 6,
    theme: 'Baris N & H (な-の ・ は-ほ)',
    loreQuote: '「花が咲き、星が瞬く。自然の言葉を学べ。」',
    loreContext: 'Mempelajari baris N dan baris H yang mencakup nama-nama hewan lucu dan alam semesta.',
    gameplayObjective: 'Kuasai aksara Na-No dan Ha-Ho, termasuk bunyi khusus 「ふ」 (fu).',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ'],
    inscriptionTarget: {
      id: 'kana_ha',
      kanji: 'は',
      onyomi: ['suku kata [ha]'],
      kunyomi: ['ha'],
      meaning: 'Huruf Hiragana: HA',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_na', kanji: 'な', onyomi: ['suku kata [na]'], kunyomi: ['na'], meaning: 'Huruf Hiragana: NA', writingRequired: true },
      { id: 'kana_ni', kanji: 'に', onyomi: ['suku kata [ni]'], kunyomi: ['ni'], meaning: 'Huruf Hiragana: NI', writingRequired: true },
      { id: 'kana_ha', kanji: 'は', onyomi: ['suku kata [ha]'], kunyomi: ['ha'], meaning: 'Huruf Hiragana: HA', writingRequired: true },
      { id: 'kana_hi', kanji: 'ひ', onyomi: ['suku kata [hi]'], kunyomi: ['hi'], meaning: 'Huruf Hiragana: HI', writingRequired: true },
      { id: 'kana_fu', kanji: 'ふ', onyomi: ['suku kata [fu]'], kunyomi: ['fu'], meaning: 'Huruf Hiragana: FU', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f6_inu', word: 'いぬ', reading: 'いぬ', meaning: 'Anjing', source: 'new', masteryRequired: 70 },
      { id: 'v_f6_neko', word: 'ねこ', reading: 'ねこ', meaning: 'Kucing', source: 'new', masteryRequired: 70 },
      { id: 'v_f6_hana', word: 'はな', reading: 'はな', meaning: 'Bunga / Hidung', source: 'new', masteryRequired: 70 },
      { id: 'v_f6_hito', word: 'ひと', reading: 'ひと', meaning: 'Orang', source: 'new', masteryRequired: 70 },
      { id: 'v_f6_hoshi', word: 'ほし', reading: 'ほし', meaning: 'Bintang', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kana_na',
        questionType: 'reading',
        prompt: 'Aksara Hiragana manakah yang berbunyi "na"?',
        options: ['な', 'に', 'ぬ', 'ね'],
        correctAnswer: 'な'
      },
      {
        targetId: 'kana_fu',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「ふ」?',
        options: ['fu / hu', 'pu', 'bu', 'mu'],
        correctAnswer: 'fu / hu'
      },
      {
        targetId: 'kana_ne',
        questionType: 'reading',
        prompt: 'Aksara manakah ini: 「ね」?',
        options: ['ne', 're', 'wa', 'nu'],
        correctAnswer: 'ne'
      },
      {
        targetId: 'kana_ho',
        questionType: 'reading',
        prompt: 'Aksara manakah yang berbunyi "ho"?',
        options: ['ほ', 'は', 'ま', 'よ'],
        correctAnswer: 'ほ'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f6_neko',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ねこ」 (neko)?',
        options: ['Kucing', 'Anjing', 'Burung', 'Ikan'],
        correctAnswer: 'Kucing'
      },
      {
        targetId: 'v_f6_inu',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「いぬ」 (inu)?',
        options: ['Anjing', 'Kucing', 'Sapi', 'Kuda'],
        correctAnswer: 'Anjing'
      },
      {
        targetId: 'v_f6_hana',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「はな」 (hana)?',
        options: ['Bunga / Hidung', 'Bintang', 'Malam', 'Hujan'],
        correctAnswer: 'Bunga / Hidung'
      },
      {
        targetId: 'v_f6_hoshi',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ほし」 (hoshi)?',
        options: ['Bintang', 'Matahari', 'Bulan', 'Bumi'],
        correctAnswer: 'Bintang'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kata: "Kucing (neko)"',
        englishMeaning: 'Cat (neko)',
        tokens: ['こ', 'ね'],
        correctOrder: ['ね', 'こ']
      },
      {
        prompt: 'Susun kata: "Anjing (inu)"',
        englishMeaning: 'Dog (inu)',
        tokens: ['ぬ', 'い'],
        correctOrder: ['い', 'ぬ']
      },
      {
        prompt: 'Susun kata: "Bintang (hoshi)"',
        englishMeaning: 'Star (hoshi)',
        tokens: ['し', 'ほ'],
        correctOrder: ['ほ', 'し']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 7: BARIS M, Y, R (ま-も・や-よ・ら-ろ)
  // ----------------------------------------------------------------------------
  7: {
    floor: 7,
    theme: 'Baris M, Y, R (ま・や・ら)',
    loreQuote: '「水は流れ、山はそびえ、桜は舞う。」',
    loreContext: 'Mendaki lebih tinggi dengan mempelajari aksara Ma-Mo, Ya-Yu-Yo, dan Ra-Ro.',
    gameplayObjective: 'Kuasai kosakata alam Jepang: mizu (air), yama (gunung), yuki (salju), dan sakura.',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ'],
    inscriptionTarget: {
      id: 'kana_ma',
      kanji: 'ま',
      onyomi: ['suku kata [ma]'],
      kunyomi: ['ma'],
      meaning: 'Huruf Hiragana: MA',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_ma', kanji: 'ま', onyomi: ['suku kata [ma]'], kunyomi: ['ma'], meaning: 'Huruf Hiragana: MA', writingRequired: true },
      { id: 'kana_ya', kanji: 'や', onyomi: ['suku kata [ya]'], kunyomi: ['ya'], meaning: 'Huruf Hiragana: YA', writingRequired: true },
      { id: 'kana_ra', kanji: 'ら', onyomi: ['suku kata [ra]'], kunyomi: ['ra'], meaning: 'Huruf Hiragana: RA', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f7_mizu', word: 'みず', reading: 'みず', meaning: 'Air', source: 'new', masteryRequired: 70 },
      { id: 'v_f7_yama', word: 'やま', reading: 'やま', meaning: 'Gunung', source: 'new', masteryRequired: 70 },
      { id: 'v_f7_yuki', word: 'ゆき', reading: 'ゆき', meaning: 'Salju', source: 'new', masteryRequired: 70 },
      { id: 'v_f7_sakura', word: 'さくら', reading: 'さくら', meaning: 'Bunga Sakura', source: 'new', masteryRequired: 70 },
      { id: 'v_f7_yoru', word: 'よる', reading: 'よる', meaning: 'Malam', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kana_ya',
        questionType: 'reading',
        prompt: 'Aksara Hiragana manakah yang berbunyi "ya"?',
        options: ['や', 'ゆ', 'よ', 'ま'],
        correctAnswer: 'や'
      },
      {
        targetId: 'kana_ru',
        questionType: 'reading',
        prompt: 'Bagaimana bunyi romaji dari aksara 「る」?',
        options: ['ru', 'ro', 're', 'ra'],
        correctAnswer: 'ru'
      },
      {
        targetId: 'kana_mi',
        questionType: 'reading',
        prompt: 'Aksara manakah ini: 「み」?',
        options: ['mi', 'mu', 'me', 'ma'],
        correctAnswer: 'mi'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f7_mizu',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「みず」 (mizu)?',
        options: ['Air', 'Api', 'Angin', 'Tanah'],
        correctAnswer: 'Air'
      },
      {
        targetId: 'v_f7_yama',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「やま」 (yama)?',
        options: ['Gunung', 'Sungai', 'Laut', 'Hutan'],
        correctAnswer: 'Gunung'
      },
      {
        targetId: 'v_f7_sakura',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「さくら」 (sakura)?',
        options: ['Bunga Sakura', 'Pohon Bambu', 'Rumput', 'Batu'],
        correctAnswer: 'Bunga Sakura'
      },
      {
        targetId: 'v_f7_yuki',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ゆき」 (yuki)?',
        options: ['Salju', 'Hujan', 'Awan', 'Petir'],
        correctAnswer: 'Salju'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kata: "Air (mizu)"',
        englishMeaning: 'Water (mizu)',
        tokens: ['ず', 'み'],
        correctOrder: ['み', 'ず']
      },
      {
        prompt: 'Susun kata: "Gunung (yama)"',
        englishMeaning: 'Mountain (yama)',
        tokens: ['ま', 'や'],
        correctOrder: ['や', 'ま']
      },
      {
        prompt: 'Susun kata: "Bunga Sakura"',
        englishMeaning: 'Cherry Blossom (sakura)',
        tokens: ['ら', 'く', 'さ'],
        correctOrder: ['さ', 'く', 'ら']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 8: DAKUTEN, HANDAKUTEN & WA-WO-N (が・ざ・だ・ば・ぱ・ん)
  // ----------------------------------------------------------------------------
  8: {
    floor: 8,
    theme: 'Bunyi Khusus Dakuten & Huruf Penutup (わ・を・ん)',
    loreQuote: '「点と丸が濁りを生み、言葉に豊かな響きを与える。」',
    loreContext: 'Mengenal tanda petik (Tenten ゛) dan lingkaran kecil (Maru ゜) yang mengubah bunyi konsonan menjadi tebal dan bervariasi.',
    gameplayObjective: 'Kuasai perubahan bunyi Ga, Za, Da, Ba, Pa serta huruf konsonan tunggal 「ん」 (n).',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['わ', 'を', 'ん', 'が', 'ざ', 'だ', 'ば', 'ぱ'],
    inscriptionTarget: {
      id: 'kana_wa',
      kanji: 'わ',
      onyomi: ['suku kata [wa]'],
      kunyomi: ['wa'],
      meaning: 'Huruf Hiragana: WA',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kana_wa', kanji: 'わ', onyomi: ['suku kata [wa]'], kunyomi: ['wa'], meaning: 'Huruf Hiragana: WA', writingRequired: true },
      { id: 'kana_n', kanji: 'ん', onyomi: ['konsonan [n]'], kunyomi: ['n'], meaning: 'Huruf Hiragana: N', writingRequired: true },
      { id: 'kana_ga', kanji: 'が', onyomi: ['dakuten [ga]'], kunyomi: ['ga'], meaning: 'Huruf Hiragana: GA', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f8_hon', word: 'ほん', reading: 'ほん', meaning: 'Buku', source: 'new', masteryRequired: 70 },
      { id: 'v_f8_gohan', word: 'ごはん', reading: 'ごはん', meaning: 'Nasi / Makanan', source: 'new', masteryRequired: 70 },
      { id: 'v_f8_kaban', word: 'かばん', reading: 'かばん', meaning: 'Tas', source: 'new', masteryRequired: 70 },
      { id: 'v_f8_ringo', word: 'りんご', reading: 'りんご', meaning: 'Apel', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'dakuten_ga',
        questionType: 'reading',
        prompt: 'Ketika huruf 「か」 (ka) diberi tanda tenten (゛) menjadi 「が」, dibaca...',
        options: ['ga', 'za', 'da', 'ba'],
        correctAnswer: 'ga'
      },
      {
        targetId: 'dakuten_ba_pa',
        questionType: 'reading',
        prompt: 'Aksara 「は」 jika diberi tanda lingkaran maru (゜) menjadi 「ぱ」, dibaca...',
        options: ['pa', 'ba', 'ha', 'fa'],
        correctAnswer: 'pa'
      },
      {
        targetId: 'kana_n',
        questionType: 'reading',
        prompt: 'Aksara Hiragana satu-satunya yang merupakan konsonan tunggal "n" adalah...',
        options: ['ん', 'わ', 'を', 'む'],
        correctAnswer: 'ん'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f8_hon',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ほん」 (hon)?',
        options: ['Buku', 'Koran', 'Tas', 'Pensil'],
        correctAnswer: 'Buku'
      },
      {
        targetId: 'v_f8_gohan',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ごはん」 (gohan)?',
        options: ['Nasi / Makanan', 'Minuman', 'Kue', 'Buah'],
        correctAnswer: 'Nasi / Makanan'
      },
      {
        targetId: 'v_f8_kaban',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「かばん」 (kaban)?',
        options: ['Tas', 'Sepatu', 'Baju', 'Topi'],
        correctAnswer: 'Tas'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kata: "Buku (hon)"',
        englishMeaning: 'Book (hon)',
        tokens: ['ん', 'ほ'],
        correctOrder: ['ほ', 'ん']
      },
      {
        prompt: 'Susun kata: "Nasi (gohan)"',
        englishMeaning: 'Rice / Meal (gohan)',
        tokens: ['ん', 'は', 'ご'],
        correctOrder: ['ご', 'は', 'ん']
      },
      {
        prompt: 'Susun kata: "Tas (kaban)"',
        englishMeaning: 'Bag (kaban)',
        tokens: ['ん', 'ば', 'か'],
        correctOrder: ['か', 'ば', 'ん']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 9: KATAKANA ESSENTIALS (LOANWORDS POPULER)
  // ----------------------------------------------------------------------------
  9: {
    floor: 9,
    theme: 'Gerbang Katakana Dasar: Kata Serapan Populer',
    loreQuote: '「海の向こうから届いた言葉が、角張った衣をまとう。」',
    loreContext: 'Mengenal aksara Katakana yang digunakan untuk menulis kata-kata serapan dari bahasa asing, nama negara, dan istilah modern.',
    gameplayObjective: 'Kuasai bentuk aksara Katakana dasar dan kenali kata-kata serapan umum seperti roti, kopi, dan es krim.',
    isCheckpoint: false,
    isBossFloor: false,
    targetCharacters: ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ'],
    inscriptionTarget: {
      id: 'katakana_a',
      kanji: 'ア',
      onyomi: ['katakana [a]'],
      kunyomi: ['a'],
      meaning: 'Huruf Katakana: A',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'katakana_a', kanji: 'ア', onyomi: ['katakana [a]'], kunyomi: ['a'], meaning: 'Huruf Katakana: A', writingRequired: true },
      { id: 'katakana_i', kanji: 'イ', onyomi: ['katakana [i]'], kunyomi: ['i'], meaning: 'Huruf Katakana: I', writingRequired: true },
      { id: 'katakana_u', kanji: 'ウ', onyomi: ['katakana [u]'], kunyomi: ['u'], meaning: 'Huruf Katakana: U', writingRequired: true },
      { id: 'katakana_e', kanji: 'エ', onyomi: ['katakana [e]'], kunyomi: ['e'], meaning: 'Huruf Katakana: E', writingRequired: true },
      { id: 'katakana_o', kanji: 'オ', onyomi: ['katakana [o]'], kunyomi: ['o'], meaning: 'Huruf Katakana: O', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f9_pan', word: 'パン', reading: 'パン', meaning: 'Roti (dari Portugis)', source: 'new', masteryRequired: 70 },
      { id: 'v_f9_aisu', word: 'アイス', reading: 'アイス', meaning: 'Es krim', source: 'new', masteryRequired: 70 },
      { id: 'v_f9_doa', word: 'ドア', reading: 'ドア', meaning: 'Pintu', source: 'new', masteryRequired: 70 },
      { id: 'v_f9_keeki', word: 'ケーキ', reading: 'ケーキ', meaning: 'Kue / Tart', source: 'new', masteryRequired: 70 }
    ],
    identificationQuestions: [
      {
        targetId: 'kata_a',
        questionType: 'reading',
        prompt: 'Bentuk Katakana dari vokal "A" adalah...',
        options: ['ア', 'イ', 'ウ', 'エ'],
        correctAnswer: 'ア'
      },
      {
        targetId: 'kata_i',
        questionType: 'reading',
        prompt: 'Aksara Katakana manakah yang berbunyi "I"?',
        options: ['イ', 'ア', 'ウ', 'オ'],
        correctAnswer: 'イ'
      },
      {
        targetId: 'kata_ko',
        questionType: 'reading',
        prompt: 'Aksara Katakana manakah yang berbunyi "KO"?',
        options: ['コ', 'ロ', 'ユ', 'エ'],
        correctAnswer: 'コ'
      },
      {
        targetId: 'kata_chouon',
        questionType: 'meaning',
        prompt: 'Tanda garis horizontal 「ー」 pada Katakana (misal: ケーキ) berfungsi untuk...',
        options: ['Memperpanjang bunyi vokal', 'Tanda jeda napas', 'Menandakan huruf kapital', 'Tanda tanya'],
        correctAnswer: 'Memperpanjang bunyi vokal'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f9_pan',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata Katakana 「パン」 (pan)?',
        options: ['Roti', 'Wajan', 'Piring', 'Kue'],
        correctAnswer: 'Roti'
      },
      {
        targetId: 'v_f9_keeki',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ケーキ」 (keeki)?',
        options: ['Kue / Tart', 'Roti', 'Es krim', 'Kopi'],
        correctAnswer: 'Kue / Tart'
      },
      {
        targetId: 'v_f9_aisu',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「アイス」 (aisu)?',
        options: ['Es krim / Es', 'Kopi', 'Susu', 'Jus'],
        correctAnswer: 'Es krim / Es'
      },
      {
        targetId: 'v_f9_doa',
        questionType: 'meaning',
        prompt: 'Apa arti dari kata 「ドア」 (doa)?',
        options: ['Pintu (Door)', 'Jendela', 'Dinding', 'Lantai'],
        correctAnswer: 'Pintu (Door)'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kata Katakana: "Pintu (Door)"',
        englishMeaning: 'Door (doa)',
        tokens: ['ア', 'ド'],
        correctOrder: ['ド', 'ア']
      },
      {
        prompt: 'Susun kata Katakana: "Kue (keeki)"',
        englishMeaning: 'Cake (keeki)',
        tokens: ['キ', 'ー', 'ケ'],
        correctOrder: ['ケ', 'ー', 'キ']
      },
      {
        prompt: 'Susun kata Katakana: "Es krim (aisu)"',
        englishMeaning: 'Ice (aisu)',
        tokens: ['ス', 'イ', 'ア'],
        correctOrder: ['ア', 'イ', 'ス']
      }
    ]
  },

  // ----------------------------------------------------------------------------
  // LANTAI 10: UJIAN BOS GERBANG AWAL (KELULUSAN KANA & KANJI ANGKA 1-2-3)
  // ----------------------------------------------------------------------------
  10: {
    floor: 10,
    theme: 'Ujian Bos Gerbang Awal: Kelulusan Kana & Tiga Kanji Angka (一・二・三)',
    loreQuote: '「門番が立ち塞がる。己が学びの全てを捧げ、真の門を開け。」',
    loreContext: 'Puncak dari Gerbang Awal (Beginning Gate). Tunjukkan penguasaan menyeluruh membaca dan menulis Hiragana & Katakana, serta taklukkan tiga Kanji angka pertama dalam sejarah Jepang.',
    gameplayObjective: 'Taklukkan Ujian Bos Gerbang Awal untuk meraih gelar prestisius "Penakluk Gerbang Awal" dan sertifikasi lulus Kana.',
    isCheckpoint: true,
    isBossFloor: true,
    targetCharacters: ['一', '二', '三'],
    inscriptionTarget: {
      id: 'kanji_ichi',
      kanji: '一',
      onyomi: ['イチ (ICHI)', 'イツ (ITSU)'],
      kunyomi: ['ひと (hito)'],
      meaning: 'Kanji Angka: Satu (1 Goresan)',
      writingRequired: true
    },
    inscriptionTargets: [
      { id: 'kanji_ichi', kanji: '一', onyomi: ['イチ (ICHI)', 'イツ (ITSU)'], kunyomi: ['ひと (hito)'], meaning: 'Kanji Angka: Satu (1 Goresan)', writingRequired: true },
      { id: 'kanji_ni', kanji: '二', onyomi: ['ニ (NI)'], kunyomi: ['ふた (futa)'], meaning: 'Kanji Angka: Dua (2 Goresan)', writingRequired: true },
      { id: 'kanji_san', kanji: '三', onyomi: ['サン (SAN)'], kunyomi: ['み (mi)'], meaning: 'Kanji Angka: Tiga (3 Goresan)', writingRequired: true }
    ],
    vocabularyTargets: [
      { id: 'v_f10_ichi', word: '一', reading: 'いち', meaning: 'Satu (1)', source: 'new', masteryRequired: 80 },
      { id: 'v_f10_ni', word: '二', reading: 'に', meaning: 'Dua (2)', source: 'new', masteryRequired: 80 },
      { id: 'v_f10_san', word: '三', reading: 'さん', meaning: 'Tiga (3)', source: 'new', masteryRequired: 80 },
      { id: 'v_f10_nihon', word: 'にほん', reading: 'にほん', meaning: 'Jepang', source: 'new', masteryRequired: 80 }
    ],
    identificationQuestions: [
      {
        targetId: 'boss_q1',
        questionType: 'meaning',
        prompt: 'Kanji 「一」 memiliki arti angka...',
        options: ['Satu (1)', 'Dua (2)', 'Tiga (3)', 'Sepuluh (10)'],
        correctAnswer: 'Satu (1)'
      },
      {
        targetId: 'boss_q2',
        questionType: 'meaning',
        prompt: 'Kanji 「二」 memiliki arti angka...',
        options: ['Dua (2)', 'Satu (1)', 'Tiga (3)', 'Empat (4)'],
        correctAnswer: 'Dua (2)'
      },
      {
        targetId: 'boss_q3',
        questionType: 'meaning',
        prompt: 'Kanji 「三」 memiliki arti angka...',
        options: ['Tiga (3)', 'Dua (2)', 'Satu (1)', 'Lima (5)'],
        correctAnswer: 'Tiga (3)'
      },
      {
        targetId: 'boss_q4',
        questionType: 'reading',
        prompt: 'Bagaimana cara membaca angka 「1, 2, 3」 dalam bahasa Jepang?',
        options: ['ichi, ni, san', 'hito, futa, mi', 'ichi, san, ni', 'ni, ichi, san'],
        correctAnswer: 'ichi, ni, san'
      },
      {
        targetId: 'boss_q5',
        questionType: 'meaning',
        prompt: 'Susunan kalimat bahasa Jepang 「これは ほんです。」 (Kore wa hon desu) berarti...',
        options: ['Ini adalah buku.', 'Itu adalah buku.', 'Buku itu milik saya.', 'Di sana ada buku.'],
        correctAnswer: 'Ini adalah buku.'
      },
      {
        targetId: 'boss_q6',
        questionType: 'reading',
        prompt: 'Apa bacaan dari kata 「にほん」?',
        options: ['nihon (Jepang)', 'nippon', 'honkoku', 'nihonjin'],
        correctAnswer: 'nihon (Jepang)'
      }
    ],
    vocabularyQuestions: [
      {
        targetId: 'v_f10_ichi',
        questionType: 'reading',
        prompt: 'Cara baca Kanji 「一」 adalah...',
        options: ['いち (ichi)', 'に (ni)', 'さん (san)', 'よん (yon)'],
        correctAnswer: 'いち (ichi)'
      },
      {
        targetId: 'v_f10_ni',
        questionType: 'reading',
        prompt: 'Cara baca Kanji 「二」 adalah...',
        options: ['に (ni)', 'いち (ichi)', 'さん (san)', 'ろく (roku)'],
        correctAnswer: 'に (ni)'
      },
      {
        targetId: 'v_f10_san',
        questionType: 'reading',
        prompt: 'Cara baca Kanji 「三」 adalah...',
        options: ['さん (san)', 'に (ni)', 'いち (ichi)', 'ご (go)'],
        correctAnswer: 'さん (san)'
      }
    ],
    wordAssemblyQuestions: [
      {
        prompt: 'Susun kalimat bahasa Jepang: "Ini adalah buku."',
        englishMeaning: 'This is a book (Kore wa hon desu)',
        tokens: ['ほんです。', 'は', 'これ'],
        correctOrder: ['これ', 'は', 'ほんです。']
      },
      {
        prompt: 'Susun nama negara: "Jepang (Nihon)"',
        englishMeaning: 'Japan (Nihon)',
        tokens: ['ん', 'ほ', 'に'],
        correctOrder: ['に', 'ほ', 'ん']
      },
      {
        prompt: 'Susun urutan angka: 1, 2, 3 (ichi - ni - san)',
        englishMeaning: 'Numbers 1, 2, 3',
        tokens: ['三 (3)', '二 (2)', '一 (1)'],
        correctOrder: ['一 (1)', '二 (2)', '三 (3)']
      }
    ]
  }
};
