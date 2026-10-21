import {
  BunpouItem,
  GrammarSkillNodes,
  GrammarSkillConcept,
  GrammarSkillFunction,
  GrammarSkillFormulaStep,
  GrammarSkillWordIdentity,
  GrammarSkillNuance,
  TieredExampleSentence,
  Question,
} from '../types/content';
import bunpouCuratedDict from '../data/bunpouCuratedDict.json';
import { getCuratedSubFormulas } from '../data/bunpouSubKnowledge';

/**
 * Handcrafted 7-node skill profiles for signature grammar points
 * (Written in simple, clear, human language for real learners)
 */
const BESPOKE_SKILL_NODES: Record<string, Partial<GrammarSkillNodes>> = {
  // Signature N4: 〜ようになる
  'bp_n4_youni_naru': {
    concept: {
      summary: 'Dulu tidak → sekarang menjadi',
      beforeState: 'Dulu: ❌ Tidak bisa / Belum biasa',
      afterState: 'Sekarang: ✅ Menjadi bisa / Mulai terbiasa',
      starterExample: {
        japanese: '日本語が話せるようになった。',
        reading: 'にほんごがはなせるようになった。',
        meaningId: 'Sekarang saya sudah bisa berbicara bahasa Jepang.',
        contrastNote: 'Dulu tidak bisa bahasa Jepang, sekarang bisa.',
      },
      keyTakeaway: 'Dipakai saat ada perubahan kemampuan diri atau kebiasaan baru yang mulai terbentuk.',
    },
    functions: [
      {
        number: 1,
        label: 'Menjadi Bisa (Kemampuan)',
        description: 'Tadinya tidak mampu melakukan sesuatu, sekarang sudah bisa.',
        miniExample: {
          japanese: '読めるようになった。',
          reading: 'よめるようになった。',
          meaningId: 'Sekarang sudah bisa membaca.',
        },
      },
      {
        number: 2,
        label: 'Mulai Kebiasaan (Rutinitas Baru)',
        description: 'Tadinya tidak biasa dilakukan, sekarang mulai rutin dikerjakan.',
        miniExample: {
          japanese: '毎日勉強するようになった。',
          reading: 'まいにちべんきょうするようになった。',
          meaningId: 'Mulai belajar setiap hari.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Kemampuan (Bentuk Potensial)',
        breakdown: ['Kata Kerja Potensial (V-bisa)', 'ようになる'],
        progression: ['話す (Bicara)', '話せる (Bisa bicara)', '話せるようになる (Menjadi bisa bicara)'],
        note: 'Ubah kata kerja ke bentuk potensial (bisa) dulu, lalu gabung dengan ようになる.',
      },
      {
        title: 'B. Kebiasaan (Bentuk Kamus)',
        breakdown: ['Kata Kerja Kamus (V-dasar)', 'ようになる'],
        progression: ['勉強する (Belajar)', '勉強するようになる (Mulai terbiasa belajar)'],
        note: 'Gunakan bentuk kamus biasa untuk aksi yang sengaja dirutinkan.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Tindakan Manusia (意志動詞)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['勉強する', '読む', '話す', '走る'],
        functionEffect: '→ Menunjukkan perubahan kebiasaan atau rutinitas baru.',
      },
      {
        typeCategory: 'B. Kemampuan & Keadaan (無意志動詞 / Potensial)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['分かる', '見える', '聞こえる', '話せる'],
        functionEffect: '→ Menunjukkan perubahan kemampuan atau kondisi yang terjadi.',
      },
    ],
    nuances: [
      {
        contrastA: '話すようになった',
        meaningA: 'Mulai berbicara (fokus pada aksi/kebiasaan yang mulai dilakukan)',
        contrastB: '話せるようになった',
        meaningB: 'Menjadi bisa berbicara (fokus pada kemampuan/kapasitas yang baru dikuasai)',
        explanation: 'Jangan tertukar: untuk menyatakan kemampuan yang baru dikuasai, gunakan bentuk potensial (話せる).',
      },
      {
        contrastA: '〜ようになる',
        meaningA: 'Perubahan yang terjadi bertahap seiring waktu',
        contrastB: '〜ことにする',
        meaningB: 'Keputusan yang diambil sendiri oleh pembicara',
        explanation: '〜ようになる menekankan hasil perubahan yang nyata, sedangkan 〜ことにする menekankan keputusan.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '泳げるようになった。',
        reading: 'およげるようになった。',
        meaningId: 'Sekarang saya sudah bisa berenang. (dulu tidak bisa → sekarang bisa)',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '毎日運動するようになった。',
        reading: 'まいにちうんどうするようになった。',
        meaningId: 'Saya mulai berolahraga setiap hari.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '最近、早く寝るようになった。',
        reading: 'さいきん、はやくねるようになった。',
        meaningId: 'Akhir-akhir ini saya mulai terbiasa tidur lebih awal.',
      },
    ],
  },

  // Signature N3: 〜みたいだ (w1d3g1)
  'w1d3g1': {
    concept: {
      summary: 'Kelihatannya seperti... / Mirip dengan...',
      beforeState: 'Fakta Aslinya: Bukan hal itu 👤',
      afterState: 'Kesan Tampang: Terlihat mirip sekali',
      starterExample: {
        japanese: '彼の話し方は、女みたいだ。',
        reading: 'かれのはなしかたは、おんなみたいだ。',
        meaningId: 'Cara bicaranya seperti perempuan.',
        contrastNote: 'Padahal aslinya laki-laki, tapi gayanya mirip.',
      },
      keyTakeaway: 'Gunakan saat ingin mengibaratkan sesuatu atau menduga hal yang kamu lihat/rasakan seketika.',
    },
    functions: [
      {
        number: 1,
        label: 'Perumpamaan (Mengibaratkan)',
        description: 'Menyebut sesuatu mirip dengan hal lain karena sifat atau gayanya serupa.',
        miniExample: {
          japanese: '子供みたいだ。',
          reading: 'こどもみたいだ。',
          meaningId: 'Tingkahnya seperti anak kecil.',
        },
      },
      {
        number: 2,
        label: 'Dugaan',
        description: 'Menduga keadaan berdasarkan apa yang dilihat, didengar, atau dirasakan pembicara.',
        miniExample: {
          japanese: '雨が降るみたいだ。',
          reading: 'あめがふるみたいだ。',
          meaningId: 'Sepertinya akan turun hujan.',
        },
      },
    ],
    formulas: [
      {
        title: 'Kata Benda Langsung Menempel',
        breakdown: ['Kata Benda (N)', 'みたいだ'],
        progression: ['子供 (Anak)', '子供みたいだ (Seperti anak kecil)'],
        note: 'Tidak perlu partikel の atau だ di tengahnya.',
      },
      {
        title: 'Kata Kerja / Sifat Bentuk Biasa (Kasual)',
        breakdown: ['Kata Kerja/Sifat (Bentuk Biasa)', 'みたいだ'],
        progression: ['降る (Turun)', '降るみたいだ (Sepertinya turun)'],
        note: 'Gunakan bentuk biasa (普通形), bukan bentuk sopan (ます).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Benda (名詞)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['女', '子供', '夢', 'アニメ'],
        functionEffect: '→ Langsung disambung tanpa の (contoh: 子供みたいだ).',
      },
      {
        typeCategory: 'B. Kata Sifat & Kerja',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['静か', '降る', '高い', '食べた'],
        functionEffect: '→ Kata kerja dan kata sifat-i memakai bentuk biasa; kata sifat-na langsung tanpa な/だ.',
      },
    ],
    nuances: [
      {
        contrastA: '〜みたいだ',
        meaningA: 'Santai & Lisan (bahasa percakapan sehari-hari)',
        contrastB: '〜ようだ',
        meaningB: 'Formal & Tertulis (memerlukan の untuk kata benda: 女のようだ)',
        explanation: 'Dalam percakapan santai, みたい jauh lebih umum daripada ようだ.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '彼の話し方は、女みたいだ。',
        reading: 'かれのはなしかたは、おんなみたいだ。',
        meaningId: 'Cara bicaranya seperti perempuan.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '今日は春になったみたいに暖かい。',
        reading: 'きょうははるになったみたいにあたたかい。',
        meaningId: 'Hari ini hangat, rasanya seperti sudah musim semi.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '隣の部屋、だれもいないみたいだね。',
        reading: 'となりのへや、だれもいないみたいだね。',
        meaningId: 'Kamar sebelah sepertinya tidak ada orang ya.',
      },
    ],
  },

  // Signature N4: 赤ちゃんに泣かれた（迷惑の受身 / adversative passive）
  'w1d1g2': {
    concept: {
      summary: 'Menyatakan rasa terganggu, repot, atau dirugikan akibat tindakan pihak lain (Pasif Kerugian / 迷惑の受身).',
      beforeState: 'Kalimat Netral: 赤ちゃんが泣いた (Sekadar menyatakan fakta bayi menangis)',
      afterState: 'Pasif Kerugian: 赤ちゃんに泣かれた (Bayi menangis dan pembicara jadi sangat repot)',
      starterExample: {
        japanese: '友達の赤ちゃんを抱っこしたら、泣かれてしまった。',
        reading: 'ともだちのあかちゃんをだっこしたら、なかれてしまった。',
        meaningId: 'Saat menggendong bayi temanku, dia menangis dan aku jadi repot.',
        contrastNote: 'Bentuk pasif 泣かれた menegaskan bahwa tangisan tersebut membuat pembicara repot atau serba salah.',
      },
      keyTakeaway: 'Pelaku penyebab repot ditandai partikel に. Pembicara sebagai pihak yang dirugikan biasanya tidak perlu disebut sebagai subjek.',
    },
    functions: [
      {
        number: 1,
        label: 'Pasif Kerugian Pribadi (迷惑受身)',
        description: 'Menyatakan bahwa pembicara terimbas kerepotan atau ketidaknyamanan karena tindakan orang lain.',
        miniExample: {
          japanese: '雨に降られて、服がびしょ濡れになった。',
          reading: 'あめにふられて、ふくがびしょぬれになった。',
          meaningId: 'Kehujanan di jalan, bajuku jadi basah kuyup.',
        },
      },
      {
        number: 2,
        label: 'Kejadian di Luar Kuasa (不可抗力)',
        description: 'Dipakai saat tindakan orang lain, yang di luar kendali kita, membuat kita repot. Kata kerja intransitif seperti 来る juga bisa dipakai.',
        miniExample: {
          japanese: '夜遅くに友達に来られて、困った。',
          reading: 'よるおそくにともだちにこられて、こまった。',
          meaningId: 'Temanku datang larut malam, jadi aku kerepotan.',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Pasif Kerugian',
        breakdown: ['Pelaku Pembuat Repot (N)', 'に', 'Kata Kerja Pasif (〜れる / 〜られる)'],
        progression: ['泣く (Menangis)', '泣かれる (Repot karena tangisannya)', '泣かれてしまった (Telanjur dibuat repot)'],
        note: 'Pelaku ditandai partikel に. Kalimat berfokus pada kerugian yang dialami pembicara.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Golongan 1 (五段)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['泣く → 泣かれる', '降る → 降られる', '死ぬ → 死なれる'],
        functionEffect: '→ Ubah vokal akhir u menjadi a, lalu tambahkan れる.',
      },
      {
        typeCategory: 'B. Kata Kerja Golongan 2 & 3',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['逃げる → 逃げられる', '来る → 来られる', 'する → される'],
        functionEffect: '→ Golongan 2 +られる, 来る jadi こられる, する jadi される.',
      },
    ],
    nuances: [
      {
        contrastA: '赤ちゃんが泣いた',
        meaningA: 'Fakta netral: Bayi menangis.',
        contrastB: '赤ちゃんに泣かれた',
        meaningB: 'Pasif kerugian: Bayi menangis dan saya menanggung kerepotannya.',
        explanation: '迷惑の受身 dipakai ketika pihak yang terkena imbas merasa susah atau dirugikan.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '傘がなくて、雨に降られてしまった。',
        reading: 'かさがなくて、あめにふられてしまった。',
        meaningId: 'Karena tidak bawa payung, aku kehujanan (dan jadi basah kuyup).',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '友達の赤ちゃんを抱っこしたら、泣かれてしまった。',
        reading: 'ともだちのあかちゃんをだっこしたら、なかれてしまった。',
        meaningId: 'Saat menggendong bayi temanku, dia menangis dan aku jadi repot.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '昨日は夜中に隣の人に騒がれて、全然眠れなかった。',
        reading: 'きのうはよなかにとなりのひとにさわがれて、ぜんぜんねむれなかった。',
        meaningId: 'Kemarin malam tetangga berisik sekali, sampai-sampai aku tidak bisa tidur sama sekali.',
      },
    ],
  },

  // Signature N4: 早く帰らせてください（V(さ)せてください / もらえますか / もらえませんか）
  'w1d1g3': {
    concept: {
      summary: 'Meminta izin secara santun agar pembicara sendiri yang diperkenankan melakukan sesuatu.',
      beforeState: 'Vてください: Meminta lawan bicara yang berbuat (Silakan Anda pulang)',
      afterState: 'V(さ)せてください: Meminta izin agar pembicara yang berbuat (Izinkan saya pulang)',
      starterExample: {
        japanese: '今日は気分が悪いので、早く帰らせてください。',
        reading: 'きょうはきぶんがわるいので、はやくかえらせてください。',
        meaningId: 'Karena hari ini merasa kurang enak badan, izinkan saya pulang lebih awal.',
        contrastNote: 'Gabungan bentuk kausatif (membiarkan) + てください. Secara harfiah: tolong biarkan saya pulang.',
      },
      keyTakeaway: 'Sangat sering dipakai di tempat kerja atau sekolah untuk meminta izin tidak masuk, bertanya, atau pulang duluan.',
    },
    functions: [
      {
        number: 1,
        label: 'Meminta Izin Melakukan Aksi (許可)',
        description: 'Meminta persetujuan atasan atau lawan bicara agar pembicara diizinkan melakukan sesuatu.',
        miniExample: {
          japanese: 'この件について、私に説明させてください。',
          reading: 'このけんについて、わたしにせつめいさせてください。',
          meaningId: 'Mengenai hal ini, izinkan saya untuk menjelaskannya.',
        },
      },
      {
        number: 2,
        label: 'Bentuk Lebih Halus / Sopan (〜てもらえますか)',
        description: 'Bertanya apakah lawan bicara bersedia mengizinkan, sehingga terdengar lebih halus daripada 〜させてください.',
        miniExample: {
          japanese: '明日、病院へ行くので休ませてもらえますか。',
          reading: 'あした、びょういんへいくのでやすませてもらえますか。',
          meaningId: 'Besok saya mau ke rumah sakit, bolehkah saya izin tidak masuk?',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Kausatif Permintaan Izin',
        breakdown: ['Kata Kerja Kausatif (使役形)', 'てください / もらえますか / もらえませんか'],
        progression: ['帰る (Pulang)', '帰らせる (Membuat/membiarkan pulang)', '帰らせてください (Izinkan saya pulang)'],
        note: 'Jika pembicara perlu disebut, tandai dengan partikel に (私に言わせてください = izinkan saya yang bicara).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Golongan 1 (五段)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['休む → 休ませてください', '書く → 書かせてください', '聞く → 聞かせてください'],
        functionEffect: '→ Vokal u menjadi a, lalu tambahkan せてください.',
      },
      {
        typeCategory: 'B. Kata Kerja Golongan 2 & 3',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['食べる → 食べさせてください', 'する → させてください', '来る → 来させてください'],
        functionEffect: '→ Golongan 2: buang る + させて; する → させて; 来る → 来させて (こさせて).',
      },
    ],
    nuances: [
      {
        contrastA: '早く帰ってください',
        meaningA: 'Menyuruh lawan bicara: Silakan Anda yang cepat pulang.',
        contrastB: '早く帰らせてください',
        meaningB: 'Meminta izin diri sendiri: Izinkan/perkenankan saya pulang cepat.',
        explanation: 'Kesalahan umum pemula: mengatakan 帰ってください saat ingin pamit pulang sendiri. Yang benar adalah 帰らせてください.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: 'トイレに行かせてください。',
        reading: 'トイレにいかせてください。',
        meaningId: 'Izinkan saya pergi ke toilet sebentar.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '頭が痛いので、少し休ませてもらえませんか。',
        reading: 'あたまがいたいので、すこしやすませてもらえませんか。',
        meaningId: 'Karena kepala saya pusing, bolehkah saya izin istirahat sebentar?',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '新しい企画について、私に一度やらせてください！',
        reading: 'あたらしいきかくについて、わたしにいちどやらせてください！',
        meaningId: 'Mengenai rencana proyek baru ini, tolong beri saya kesempatan untuk mencobanya!',
      },
    ],
  },

  // Signature N4: 食べちゃった（Vちゃう／Vじゃう）
  'w1d2g2': {
    concept: {
      summary: "Bentuk percakapan santai dari 'Vてしまう' (selesai tuntas / telanjur)",
      beforeState: 'Bentuk Standar: 〜てしまう / 〜でしまう (Terkesan baku & panjang) 📜',
      afterState: 'Ragam Lisan: 〜ちゃう / 〜じゃう (Santai, akrab, & ekspresif) 💬',
      starterExample: {
        japanese: '試験が終わった！今日は朝まで飲んじゃおう！',
        reading: 'しけんがおわった！きょうはあさまでのんじゃおう！',
        meaningId: 'Ujian sudah selesai! Hari ini kita minum sampai pagi, ah!',
        contrastNote: "Bentuk santai dari '飲んでしまおう'. Bentuk ajakan 〜ちゃおう bernuansa 'sekalian saja, tidak usah ditahan'.",
      },
      keyTakeaway: 'Sangat sering muncul dalam obrolan sehari-hari, anime, dan drama. Ada dua nuansa utama: (1) selesai tuntas, atau (2) telanjur terjadi dan disesali.',
    },
    functions: [
      {
        number: 1,
        label: 'Tindakan Selesai Tuntas (完了)',
        description: 'Menyatakan perbuatan yang diselesaikan sepenuhnya sampai habis atau tuntas tanpa sisa.',
        miniExample: {
          japanese: '喉が渇いていたから、ジュースを全部飲んじゃった。',
          reading: 'のどがかわいていたから、ジュースをぜんぶのんじゃった。',
          meaningId: 'Karena haus, aku minum sampai habis semua jusnya.',
        },
      },
      {
        number: 2,
        label: 'Terlanjur & Penyesalan (後悔・失敗)',
        description: 'Menyatakan kejadian di luar kendali atau tindakan ceroboh yang disesali pembicara ("aduh, telanjur ~").',
        miniExample: {
          japanese: '大切な書類を電車の中に忘れちゃった！',
          reading: 'たいせつなしょるいをでんしゃのなかにわすれちゃった！',
          meaningId: 'Gawat, dokumen pentingku ketinggalan di kereta!',
        },
      },
      {
        number: 3,
        label: 'Ragam Singkatan Percakapan (日常会話・短縮)',
        description: 'Dalam obrolan santai sehari-hari: V-てしまう disingkat jadi V-ちゃう, dan V-でしまう disingkat jadi V-じゃう.',
        miniExample: {
          japanese: 'うっかり秘密を喋っちゃった。',
          reading: 'うっかりひみつをしゃべっちゃった。',
          meaningId: 'Tanpa sengaja aku keceplosan rahasianya.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Bunyi ~te menjadi ~chau (〜て → 〜ちゃう)',
        breakdown: ['Kata Kerja Bentuk-Te (tanpa て)', 'ちゃう / ちゃった'],
        progression: ['食べる (Makan)', '食べて (Bentuk Te)', '食べちゃう (Habiskan / Terlanjur makan)', '食べちゃった (Sudah tuntas / Terlanjur)'],
        note: 'Untuk kata kerja yang bentuk -te-nya berakhiran て (contoh: 行く → 行って → 行っちゃう).',
      },
      {
        title: 'B. Bunyi ~de menjadi ~jau (〜で → 〜じゃう)',
        breakdown: ['Kata Kerja Bentuk-De (tanpa で)', 'じゃう / じゃった'],
        progression: ['飲む (Minum)', '飲んで (Bentuk De)', '飲んじゃう (Habiskan)', '飲んじゃった (Sudah tuntas diminum)'],
        note: 'Untuk kata kerja yang bentuk -te-nya berakhiran で (contoh: 読む → 読んで → 読んじゃう).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Berakhiran て (Te-form)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['食べる → 食べちゃう', '書く → 書いちゃう', '忘れる → 忘れちゃう', '落とす → 落としちゃう'],
        functionEffect: '→ Berubah menjadi 〜ちゃう (lampau: 〜ちゃった).',
      },
      {
        typeCategory: 'B. Kata Kerja Berakhiran で (De-form)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['飲む → 飲んじゃう', '読む → 読んじゃう', '遊ぶ → 遊んじゃう', '死ぬ → 死んじゃう'],
        functionEffect: '→ Berubah menjadi 〜じゃう (lampau: 〜じゃった).',
      },
    ],
    nuances: [
      {
        contrastA: '〜てしまう (Standar/Formal)',
        meaningA: 'Bentuk buku/tulisan resmi: 忘れてしまいました (sopan) / 忘れてしまった (netral)',
        contrastB: '〜ちゃう (Lisan/Santai)',
        meaningB: 'Bentuk obrolan akrab sehari-hari: 忘れちゃった (sangat natural)',
        explanation: 'Jangan gunakan 〜ちゃう kepada guru, atasan, atau dalam situasi wawancara kerja.',
      },
      {
        contrastA: 'Nuansa: Selesai Tuntas (完了)',
        meaningA: 'Konteks positif / kelegaan: 本を全部読んじゃった (Buku ini sudah kubaca habis).',
        contrastB: 'Nuansa: Penyesalan (後悔)',
        meaningB: 'Konteks negatif / kelalaian: 財布を落としちゃった (dompetku jatuh/hilang).',
        explanation: 'Arti ditentukan konteks kalimat: apakah perbuatan sengaja dituntaskan, atau keteledoran yang disesali.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '宿題はもう全部やっちゃった。',
        reading: 'しゅくだいはもうぜんぶやっちゃった。',
        meaningId: 'PR-nya sudah selesai kukerjakan semuanya sampai beres.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '大切な書類を電車の中に忘れちゃった！',
        reading: 'たいせつなしょるいをでんしゃのなかにわすれちゃった！',
        meaningId: 'Gawat, dokumen pentingku ketinggalan di kereta!',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '試験が終わった！今日は飲んじゃおう！',
        reading: 'しけんがおわった！きょうはのんじゃおう！',
        meaningId: 'Ujian sudah selesai! Hari ini kita minum-minum, ah!',
      },
    ],
  },

  // Signature N4: 行かなくちゃ（Vなくちゃ／Vなきゃ）
  'w1d2g1': {
    concept: {
      summary: "Bentuk percakapan santai dari 'Vなければならない' (Harus melakukan)",
      beforeState: 'Bentuk Standar: 〜なければならない (Panjang & kaku diucapkan) 📜',
      afterState: 'Ragam Lisan: 〜なくちゃ / 〜なきゃ (Cepat, lincah, & natural) 💬',
      starterExample: {
        japanese: 'もう時間だ。早く行かなくちゃ！',
        reading: 'もうじかんだ。はやくいかなくちゃ！',
        meaningId: 'Sudah waktunya. Aku harus segera pergi!',
        contrastNote: "Bentuk percakapan dari '行かなければならない'.",
      },
      keyTakeaway: 'Sering dipakai saat berbicara pada diri sendiri atau mengingatkan teman akrab tentang hal mendesak.',
    },
    functions: [
      {
        number: 1,
        label: 'Kewajiban Mendesak (義務)',
        description: 'Menyatakan hal penting yang harus atau wajib segera diselesaikan tanpa ditunda.',
        miniExample: {
          japanese: 'メールの返事を今日中に書かなくちゃ。',
          reading: 'メールのへんじをきょうちゅうにかかなくちゃ。',
          meaningId: 'Aku harus menulis balasan email ini hari ini juga.',
        },
      },
      {
        number: 2,
        label: 'Pengingat Diri Sendiri (独り言・自発)',
        description: 'Bergumam pada diri sendiri saat menyadari ada hal yang harus segera dilakukan.',
        miniExample: {
          japanese: 'もうこんな時間！早く起きなきゃ！',
          reading: 'もうこんなじかん！はやくおきなきゃ！',
          meaningId: 'Sudah jam segini! Aku harus segera bangun!',
        },
      },
      {
        number: 3,
        label: 'Ragam Percakapan Santai (日常会話・短縮)',
        description: 'Singkatan lisan: 〜なければ → 〜なきゃ, 〜なくては → 〜なくちゃ.',
        miniExample: {
          japanese: '薬をちゃんと飲まないと、風邪が治らないよ。',
          reading: 'くすりをちゃんとのまないと、かぜがなおらないよ。',
          meaningId: 'Kalau tidak minum obat dengan teratur, flumu tidak akan sembuh lho.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Ragam Lisan Santai: 〜なきゃ',
        breakdown: ['Kata Kerja Bentuk-Nai (tanpa い)', 'なきゃ'],
        progression: ['行く (Pergi)', '行かない (Bentuk Nai)', '行かなきゃ (Harus pergi!)'],
        note: 'Singkatan percakapan dari 行かなければならない.',
      },
      {
        title: 'B. Ragam Lisan Santai: 〜なくちゃ',
        breakdown: ['Kata Kerja Bentuk-Nai (tanpa い)', 'なくちゃ'],
        progression: ['食べる (Makan)', '食べない (Bentuk Nai)', '食べなくちゃ (Harus makan!)'],
        note: 'Singkatan percakapan dari 食べなくてはならない.',
      },
    ],
  },

  // Signature N4: 書いとく（Vとく／Vどく）
  'w1d2g3': {
    concept: {
      summary: "Bentuk percakapan dari 'Vておく' (Persiapan / Membiarkan)",
      beforeState: 'Bentuk Standar: 〜ておく / 〜でおく (Bentuk baku textbook) 📜',
      afterState: 'Ragam Lisan: 〜とく / 〜どく (Praktis & lincah dalam obrolan) 💬',
      starterExample: {
        japanese: 'テストで間違ったところを、ノートに書いとこう。',
        reading: 'テストでまちがったところを、ノートにかいとこう。',
        meaningId: 'Aku akan mencatat bagian yang salah di ujian ke buku catatan sebagai persiapan.',
        contrastNote: "Singkatan dari '書いておこう'.",
      },
      keyTakeaway: 'Dipakai untuk aksi yang sengaja dikerjakan demi kemudahan di masa depan, atau membiarkan kondisi seperti semula.',
    },
    functions: [
      {
        number: 1,
        label: 'Persiapan Masa Depan (準備)',
        description: 'Melakukan tindakan sekarang sebagai bekal persiapan sebelum peristiwa penting terjadi.',
        miniExample: {
          japanese: '旅行の前に切符を買っといた。',
          reading: 'りょこうのまえにきっぷをかっといた。',
          meaningId: 'Sebelum liburan, aku sudah membeli tiket terlebih dahulu.',
        },
      },
      {
        number: 2,
        label: 'Tindakan Pasca-Aktivitas / Beres-beres (後始末)',
        description: 'Mengembalikan benda ke tempatnya atau menyelesaikan sesuatu setelah dipakai.',
        miniExample: {
          japanese: '使ったハサミは引き出しに戻しといてね。',
          reading: 'つかったハサミはひきだしにもどしといてね。',
          meaningId: 'Gunting yang sudah dipakai tolong taruh kembali ke laci ya.',
        },
      },
      {
        number: 3,
        label: 'Membiarkan Keadaan (状態維持)',
        description: 'Sengaja membiarkan suatu keadaan tetap seperti apa adanya tanpa diubah.',
        miniExample: {
          japanese: 'まだ使っているから、そのままにしといて。',
          reading: 'まだつかっているから、そのままにしといて。',
          meaningId: 'Karena masih kupakai, biarkan saja seperti itu ya.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Bunyi ~te oku menjadi ~toku (〜ておく → 〜とく)',
        breakdown: ['Kata Kerja Bentuk-Te (tanpa て)', 'とく / といた / とこう'],
        progression: ['書く (Menulis)', '書いて (Bentuk Te)', '書いておく (Persiapan)', '書いとく (Singkatan lisan)'],
        note: 'Dipakai saat bentuk -te berakhiran て.',
      },
      {
        title: 'B. Bunyi ~de oku menjadi ~doku (〜でおく → 〜どく)',
        breakdown: ['Kata Kerja Bentuk-De (tanpa で)', 'どく / どいた / どこう'],
        progression: ['飲む (Minum)', '飲んで (Bentuk De)', '飲んでおく (Persiapan)', '飲んどく (Singkatan lisan)'],
        note: 'Dipakai saat bentuk -te berakhiran で.',
      },
    ],
  },

  // Signature N4: やめようと思う（Vようと思う）
  'w1d6g1': {
    concept: {
      summary: 'Menyatakan niat atau rencana dalam hati untuk melakukan sesuatu di masa depan.',
      beforeState: 'Bentuk Kamus: やめる (Fakta umum: berhenti) 📖',
      afterState: 'Bentuk Maksud: やめようと思う (Niat kuat pribadi yang sudah dipikirkan) 💭',
      starterExample: {
        japanese: '会社をやめようと思っている。',
        reading: 'かいしゃをやめようとおもっている。',
        meaningId: 'Aku berniat untuk berhenti dari pekerjaanku.',
        contrastNote: 'Bentuk 〜と思っている menunjukkan niat yang sudah dipikirkan beberapa waktu dan masih berlanjut.',
      },
      keyTakeaway: 'Gunakan 〜ようと思っている jika niat tersebut sudah lama dipikirkan dan masih bertahan sampai sekarang.',
    },
    functions: [
      {
        number: 1,
        label: 'Rencana Pribadi (個人的な意志・計画)',
        description: 'Menyampaikan tekad atau rencana yang hendak dikerjakan sendiri.',
        miniExample: {
          japanese: '来年、日本へ留学しようと思います。',
          reading: 'らいねん、にほんへりゅうがくしようとおもいます。',
          meaningId: 'Tahun depan, saya berencana untuk kuliah ke Jepang.',
        },
      },
      {
        number: 2,
        label: 'Niat Berkelanjutan (思っている)',
        description: 'Menunjukkan keputusan batin yang sudah dipertimbangkan sejak beberapa waktu lalu.',
        miniExample: {
          japanese: '週末は家でゆっくり休もうと思っている。',
          reading: 'しゅうまつはいえでゆっくりやすもうとおもっている。',
          meaningId: 'Akhir pekan ini aku berniat istirahat santai di rumah saja.',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Niat Batin: 〜ようと思う',
        breakdown: ['Kata Kerja Bentuk Maksud (V-よう)', 'と思う / と思っている'],
        progression: ['やめる (Berhenti)', 'やめよう (Bentuk Maksud)', 'やめようと思っている (Sudah diniatkan)'],
        note: 'Ubah kata kerja ke bentuk maksud (volitional / 意向形) terlebih dahulu.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Golongan 1 (Godan)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['行く → 行こう', '話す → 話そう', '買う → 買おう', '飲む → 飲もう'],
        functionEffect: '→ Vokal akhir u berubah menjadi baris o panjang (ou).',
      },
      {
        typeCategory: 'B. Golongan 2 & 3 (Ichidan & Irregular)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['食べる → 食べよう', '見る → 見よう', 'する → しよう', '来る → こよう'],
        functionEffect: '→ Golongan 2: hapus る + よう; する jadi しよう; くる jadi こよう.',
      },
    ],
    nuances: [
      {
        contrastA: '〜ようと思う (Spontan)',
        meaningA: 'Baru terlintas atau baru diputuskan saat berbicara.',
        contrastB: '〜ようと思っている (Berkelanjutan)',
        meaningB: 'Sudah diniatkan sejak beberapa waktu lalu dan masih berlanjut hingga sekarang.',
        explanation: 'Untuk menyatakan niat orang lain, gunakan 〜ようと思っている (彼は留学しようと思っている), bukan 〜ようと思う.',
      },
    ],
  },

  // Signature N4: 電車に乗ろうとしたときに（Vようとする）
  'w1d6g2': {
    concept: {
      summary: 'Menyatakan momentum detik-detik tepat sesaat sebelum suatu tindakan dimulai.',
      beforeState: 'Bentuk Niat: 乗ろうと思う (Niat santai di dalam pikiran) 💭',
      afterState: 'Bentuk Momentum Sesaat: 乗ろうとしたときに (Tepat pas hendak melangkah naik!) ⚡',
      starterExample: {
        japanese: '電車に乗ろうとしたときに、ドアが閉まって乗れなかった。',
        reading: 'でんしゃにのろうとしたときに、ドアがしまってのれなかった。',
        meaningId: 'Tepat saat aku hendak naik kereta, pintunya tertutup sehingga aku tidak bisa naik.',
        contrastNote: 'Menunjukkan momen tepat sebelum tindakan dilakukan; tindakannya sendiri tidak terlaksana.',
      },
      keyTakeaway: 'Sering dipakai dalam bentuk lampau (〜としたときに / 〜としたら) untuk menceritakan kejadian yang menyela tepat sebelum tindakan dimulai, atau usaha yang tidak berhasil.',
    },
    functions: [
      {
        number: 1,
        label: 'Detik-Detik Sebelum Aksi Tersela (邪魔・不可抗力)',
        description: 'Tepat ketika bersiap melangkah melakukan sesuatu, terjadi hal lain yang mengganggu.',
        miniExample: {
          japanese: '出かけようとしたら、急に雨が降ってきた。',
          reading: 'でかけようとしたら、きゅうにあめがふってきた。',
          meaningId: 'Tepat saat aku mau berangkat, tiba-tiba hujan turun.',
        },
      },
      {
        number: 2,
        label: 'Berusaha Melakukan (試み)',
        description: 'Menggambarkan usaha seseorang untuk melakukan sesuatu, yang sering kali tidak berhasil.',
        miniExample: {
          japanese: '思い出そうとしたが、思い出せなかった。',
          reading: 'おもいだそうとしたが、おもいだせなかった。',
          meaningId: 'Aku mencoba mengingat, tetapi tidak bisa.',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Momentum Tepat Hendak Beraksi: 〜ようとする',
        breakdown: ['Kata Kerja Bentuk Maksud (V-よう)', 'とする / としたときに / としたら'],
        progression: ['乗る (Naik)', '乗ろう (Bentuk Maksud / Volitional)', '乗ろうとしたときに (Tepat pas mau naik)'],
        note: 'Gunakan bentuk ajakan V-よう (意向形), bukan bentuk kamus.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Golongan 1 (Godan)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['乗る → 乗ろうとする', '出かける → 出かけようとする', '渡る → 渡ろうとする'],
        functionEffect: '→ Vokal akhir u berubah menjadi ou + とする.',
      },
      {
        typeCategory: 'B. Golongan 2 & 3 (Ichidan & Irregular)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['寝る → 寝ようとする', '始める → 始めようとする', 'する → しようとする', '来る → こようとする'],
        functionEffect: '→ Coret る + ようとする; する jadi しようとする; くる jadi こようとする.',
      },
    ],
    nuances: [
      {
        contrastA: '〜ようとする (Momentum Tepat Hendak Beraksi)',
        meaningA: 'Momen tepat sebelum tindakan dimulai, atau usaha untuk melakukannya.',
        contrastB: '〜ところだ (Fase Waktu Umum)',
        meaningB: 'Menunjukkan tahap waktu suatu tindakan (hendak mulai, sedang berlangsung, atau baru selesai).',
        explanation: '〜ようとする menekankan niat atau usaha pelaku, sedangkan 〜るところだ hanya menunjukkan tahap waktunya.',
      },
    ],
  },

  // Signature N4: 食べようとしない（Vようとしない）
  'w1d6g3': {
    concept: {
      summary: 'Menyatakan bahwa seseorang sama sekali tidak menunjukkan kemauan untuk melakukan sesuatu.',
      beforeState: 'Bentuk Negatif Biasa: 食べない (Hanya fakta tidak makan) 🍽️',
      afterState: 'Bentuk Penolakan Keras: 食べようとしない (Sama sekali ogah & tak mau mencoba makan) 🙅',
      starterExample: {
        japanese: 'ご飯を食べようとしないんだよ。',
        reading: 'ごはんをたべようとしないんだよ。',
        meaningId: 'Dia sama sekali tidak mau makan, lho.',
        contrastNote: 'Menyoroti keengganan keras atau sikap penolakan orang lain.',
      },
      keyTakeaway: 'Biasanya dipakai untuk menggambarkan sikap orang lain atau hewan, bukan diri sendiri.',
    },
    functions: [
      {
        number: 1,
        label: 'Keengganan Pihak Ketiga (他人の拒絶・頑固さ)',
        description: 'Mengamati orang lain yang bersikap keras kepala dan menolak melakukan hal yang seharusnya.',
        miniExample: {
          japanese: '弟は自分の非を認めようとしない。',
          reading: 'おとうとはじぶんのひをみとめようとしない。',
          meaningId: 'Adik laki-lakiku sama sekali tidak mau mengakui kesalahannya.',
        },
      },
      {
        number: 2,
        label: 'Bahkan Tidak Mencoba (〜ともしない)',
        description: 'Bentuk 〜ようともしない menekankan bahwa seseorang bahkan tidak mencoba sama sekali.',
        miniExample: {
          japanese: '彼は人の話を聞こうともしない。',
          reading: 'かれはひとのはなしをきこうともしない。',
          meaningId: 'Dia bahkan sama sekali tidak mau mendengarkan omongan orang lain.',
        },
      },
    ],
    formulas: [
      {
        title: 'Rumus Penolakan Keras: 〜ようとしない',
        breakdown: ['Kata Kerja Bentuk Maksud (V-よう)', 'としない / ともしない'],
        progression: ['食べる (Makan)', '食べよう (Bentuk Maksud)', '食べようとしない (Tidak mau makan sama sekali)'],
        note: 'Kombinasi bentuk maksud (V-よう) + としない.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Golongan 1 (Godan)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['聞く → 聞こうとしない', '話す → 話そうとしない', '手伝う → 手伝おうとしない'],
        functionEffect: '→ Vokal u berubah menjadi ou + としない.',
      },
      {
        typeCategory: 'B. Golongan 2 & 3 (Ichidan & Irregular)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['食べる → 食べようとしない', '起きる → 起きようとしない', '勉強する → 勉強しようとしない'],
        functionEffect: '→ Coret る + ようとしない; する jadi しようとしない.',
      },
    ],
    nuances: [
      {
        contrastA: '〜ない (Negatif Netral)',
        meaningA: 'Hanya menyatakan bahwa seseorang tidak melakukan tindakan.',
        contrastB: '〜ようとしない (Penolakan Aktif)',
        meaningB: 'Menunjukkan rasa jengkel atau heran karena orang tersebut sama sekali tidak punya iktikad baik untuk mencoba.',
        explanation: 'Biasanya tidak dipakai untuk diri sendiri; kalimat seperti 私は勉強しようとしない terdengar tidak wajar.',
      },
    ],
  },

  // Signature N4: 〜ようにする / 〜ようにしている (w1d4g1)
  'w1d4g1': {
    concept: {
      summary: 'Berusaha untuk selalu... / Membiasakan diri agar...',
      beforeState: 'Tanpa Ikhtiar Sadar: Bergantung pada situasi / sering lupa 🍃',
      afterState: 'Upaya Sadar Berkelanjutan: Sengaja mendisiplinkan diri demi tujuan baik 🎯',
      starterExample: {
        japanese: '忘れ物をしないようにしましょう。',
        reading: 'わすれものをしないようにしましょう。',
        meaningId: 'Mari kita berusaha agar tidak meninggalkan barang bawaan.',
        contrastNote: 'Menunjukkan komitmen dan upaya sadar secara terus-menerus.',
      },
      keyTakeaway: '〜ようにする menyatakan niat untuk mulai berusaha, sedangkan 〜ようにしている menyatakan kebiasaan yang saat ini sedang dijaga.',
    },
    functions: [
      {
        number: 1,
        label: 'Upaya Menjaga Kebiasaan Baik (良い習慣の継続)',
        description: 'Mendisiplinkan diri sendiri untuk melakukan hal positif secara konsisten.',
        miniExample: {
          japanese: '毎日野菜を食べるようにしている。',
          reading: 'まいにちやさいをたべるようにしている。',
          meaningId: 'Saya selalu membiasakan diri makan sayur setiap hari.',
        },
      },
      {
        number: 2,
        label: 'Upaya Menghindari Hal Buruk (悪い事態の予防)',
        description: 'Berusaha agar tidak melakukan hal buruk atau mengulangi kesalahan.',
        miniExample: {
          japanese: '夜更かしをしないようにしている。',
          reading: 'よふかしをしないようにしている。',
          meaningId: 'Saya berusaha agar tidak tidur larut malam.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Membiasakan Hal Positif (Bentuk Kamus)',
        breakdown: ['Kata Kerja Kamus (Vる)', 'ようにする / ようにしている'],
        progression: ['早く起きる (Bangun pagi)', '早く起きるようにする (Berusaha bangun pagi)'],
        note: 'Gunakan bentuk kamus (辞書形) untuk tindakan baik yang ingin dirutinkan.',
      },
      {
        title: 'B. Menghindari Kebiasaan Buruk (Bentuk Negatif)',
        breakdown: ['Kata Kerja Negatif (Vない)', 'ようにする / ようにしている'],
        progression: ['忘れる (Lupa)', '忘れない (Tidak lupa)', '忘れないようにする (Berusaha agar tidak lupa)'],
        note: 'Gunakan bentuk negatif (ない形) untuk hal yang ingin dicegah.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Kamus (Vる)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['早く寝る', '運動する', '本を読む', '野菜を食べる'],
        functionEffect: '→ Berusaha merutinkan aksi: 早く寝るようにする (Berusaha tidur cepat).',
      },
      {
        typeCategory: 'B. Kata Kerja Negatif (Vない)',
        tagColor: 'amber',
        icon: '🟡',
        examples: ['忘れない', '遅れない', '食べすぎない', '夜更かししない'],
        functionEffect: '→ Berusaha mencegah kebiasaan buruk: 忘れないようにする (Berusaha agar tidak lupa).',
      },
    ],
    nuances: [
      {
        contrastA: '〜ようにする',
        meaningA: 'Berusaha untuk melakukan / membiasakan diri (ada proses upaya sadar berulang)',
        contrastB: '〜ことにする',
        meaningB: 'Mengambil keputusan untuk melakukan (keputusan satu kali saat itu juga)',
        explanation: '毎日走ることにした berarti kamu memutuskan mulai hari ini berlari, sedangkan 毎日走るようにしている berarti kamu saat ini terus berusaha konsisten menjalankannya.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '忘れ物をしないようにしましょう。',
        reading: 'わすれものをしないようにしましょう。',
        meaningId: 'Mari kita berusaha agar tidak meninggalkan barang bawaan.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '健康のために、毎朝散歩するようにしています。',
        reading: 'けんこうのために、まいあささんぽするようにしています。',
        meaningId: 'Demi kesehatan, saya membiasakan diri jalan kaki setiap pagi.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '甘いものはなるべく食べないように気をつけています。',
        reading: 'あまいものはなるべくたべないようにきをつけています。',
        meaningId: 'Saya berhati-hati dan sebisa mungkin berusaha agar tidak makan makanan manis.',
      },
    ],
  },

  // Signature N4: 〜ように (Tujuan / Supaya - w1d4g2)
  'w1d4g2': {
    concept: {
      summary: 'Agar / Supaya (Mencapai kondisi atau keadaan yang ditargetkan)',
      beforeState: 'Kondisi Belum Terwujud: Tak terdengar / Belum sampai / Tidak terlihat 🌫️',
      afterState: 'Tindakan Demi Tujuan: Bicara lantang agar terdengar jelas 📢',
      starterExample: {
        japanese: '後ろの人にも聞こえるように、大きな声で話してください。',
        reading: 'うしろのひとにもきこえるように、おおきなこえではなしてください。',
        meaningId: 'Tolong berbicara dengan suara keras agar orang di belakang juga bisa mendengar.',
        contrastNote: 'Target sebelum ように berupa kemampuan/kondisi yang diharapkan terwujud.',
      },
      keyTakeaway: 'Sebelum ように biasanya dipakai kata kerja keadaan/potensial (聞こえる, 見える, 治る, できる) atau bentuk negatif (ない形). Untuk tujuan berupa tindakan yang disengaja, gunakan ために.',
    },
    functions: [
      {
        number: 1,
        label: 'Tujuan Kondisi / Kemampuan (可能・状態の実現)',
        description: 'Melakukan tindakan agar mencapai kapasitas atau situasi tertentu.',
        miniExample: {
          japanese: '日本語が上手に話せるように練習する。',
          reading: 'にほんごがじょうずにはなせるようにれんしゅうする。',
          meaningId: 'Berlatih agar bisa mahir berbahasa Jepang.',
        },
      },
      {
        number: 2,
        label: 'Pencegahan Situasi Buruk (予防・否定の目的)',
        description: 'Melakukan persiapan pencegahan agar hal buruk tidak terjadi.',
        miniExample: {
          japanese: '風邪をひかないようにマスクをする。',
          reading: 'かぜをひかないようにますくをする。',
          meaningId: 'Memakai masker agar tidak masuk angin/flu.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Target Kemampuan & Kondisi (Bentuk Potensial / Kondisi)',
        breakdown: ['Kata Kerja Potensial / Keadaan (Vれる・無意志)', 'ように'],
        progression: ['聞こえる (Terdengar)', '聞こえるように (Supaya terdengar)'],
        note: 'Bentuk potensial (話せる, 読める) atau kata kerja keadaan (聞こえる, 見える).',
      },
      {
        title: 'B. Target Pencegahan (Bentuk Negatif)',
        breakdown: ['Kata Kerja Negatif (Vない)', 'ように'],
        progression: ['遅れない (Tidak terlambat)', '遅れないように (Supaya tidak terlambat)'],
        note: 'Bentuk negatif (ない形) untuk menghindari konsekuensi yang tidak diinginkan.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Verba Potensial & Kondisi (V可能形・状態動詞)',
        tagColor: 'purple',
        icon: '🟣',
        examples: ['聞こえる', '見える', '話せる', '治る', '受かる'],
        functionEffect: '→ Menunjukkan keadaan/kemampuan yang ingin diwujudkan: 聞こえるように (Agar terdengar).',
      },
      {
        typeCategory: 'B. Verba Negatif (Vない)',
        tagColor: 'amber',
        icon: '🟡',
        examples: ['遅れない', '忘れない', '風邪をひかない', '間違えない'],
        functionEffect: '→ Menunjukkan kondisi buruk yang ingin dicegah: 忘れないように (Supaya tidak lupa).',
      },
    ],
    nuances: [
      {
        contrastA: '〜ように (Tujuan Kondisi)',
        meaningA: 'Tujuannya berupa keadaan atau kemampuan yang tidak bisa dikendalikan langsung',
        contrastB: '〜ために (Tujuan Aksi)',
        meaningB: 'Tujuannya berupa tindakan yang sengaja dilakukan oleh pelaku yang sama',
        explanation: 'Contoh: 家を買うために貯金する (membeli rumah adalah tindakan sengaja → ために); 家が買えるように貯金する (bisa membeli adalah kemampuan → ように).',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: 'みんなに聞こえるように、大きな声で話した。',
        reading: 'みんなにきこえるように、おおきなこえではなした。',
        meaningId: 'Saya berbicara dengan suara keras supaya terdengar oleh semuanya.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '忘れないように、メモを取っておきましょう。',
        reading: 'わすれないように、めもをとっておきましょう。',
        meaningId: 'Mari kita catat di memo agar tidak lupa.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '早く風邪が治るように、薬を飲んで暖かくして寝てください。',
        reading: 'はやくかぜがなおるように、くすりをのんであたたかくしてねてください。',
        meaningId: 'Minumlah obat dan tidurlah dengan hangat agar flu Anda lekas sembuh.',
      },
    ],
  },

  // Signature N4: 〜ように (Sebagaimana / Seperti yang... - w1d5g1)
  'w1d5g1': {
    concept: {
      summary: 'Sebagaimana / Seperti yang... (Merujuk pada fakta yang diketahui bersama)',
      beforeState: 'Pernyataan Mandiri: Langsung menyampaikan topik 📜',
      afterState: 'Pengantar Halus: Mengawali kalimat dengan acuan bersama (Sebagaimana hadirin ketahui...) 🤝',
      starterExample: {
        japanese: '皆様ご存じのように、来週から工事が始まります。',
        reading: 'みなさまごぞんじのように、らいしゅうからこうじがはじまります。',
        meaningId: 'Sebagaimana hadirin sekalian ketahui, mulai pekan depan renovasi akan dimulai.',
        contrastNote: 'Dipakai sebagai kata pengantar sopan sebelum menyampaikan pengumuman atau fakta.',
      },
      keyTakeaway: 'Sering dipakai dalam ungkapan seperti ご存じのように, ご覧のように, atau dengan bentuk lampau (前にも言ったように).',
    },
    functions: [
      {
        number: 1,
        label: 'Merujuk Pengetahuan Lawan Bicara (相手の既知事実)',
        description: 'Mengingatkan lawan bicara pada hal yang sudah sama-sama diketahui.',
        miniExample: {
          japanese: 'ご存じのように、彼は来月帰国します。',
          reading: 'ごぞんじのように、かれはらいげつきこくします。',
          meaningId: 'Seperti yang Anda ketahui, bulan depan dia akan pulang ke negaranya.',
        },
      },
      {
        number: 2,
        label: 'Merujuk Visual / Dokumen (図・表・写真の指示)',
        description: 'Mengarahkan pandangan audiens ke gambar, tabel, atau dokumen acuan.',
        miniExample: {
          japanese: 'この図のように、矢印に従ってください。',
          reading: 'このずのように、やじるしにしたがってください。',
          meaningId: 'Sebagaimana terlihat pada gambar ini, ikutilah petunjuk tanda panah.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Kata Benda (N) Memerlukan の',
        breakdown: ['Kata Benda (N)', 'の ＋ ように'],
        progression: ['ご存じ (Mengetahui)', 'ご存じのように (Sebagaimana Anda ketahui)'],
        note: 'Untuk kata benda, wajib menyisipkan partikel の di tengahnya.',
      },
      {
        title: 'B. Kata Kerja Bentuk Biasa (V普)',
        breakdown: ['Kata Kerja Biasa (V普)', 'ように'],
        progression: ['話す (Bicara)', '話した (Telah bicara)', 'さっき話したように (Seperti yang tadi dibicarakan)'],
        note: 'Dapat memakai bentuk lampau (Vた) atau bentuk kamus (Vる).',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Benda + の (Nの)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['ご存じの', 'ご覧の', '図の', '写真の', '前回の'],
        functionEffect: '→ Memerlukan の sebelum ように: ご覧のように (Sebagaimana Anda lihat).',
      },
      {
        typeCategory: 'B. Kata Kerja Bentuk Biasa (V普)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['言った', '説明した', '書いた', '知られている'],
        functionEffect: '→ Mengacu pada keterangan/ucapan: 前にも言ったように (Seperti yang saya katakan sebelumnya).',
      },
    ],
    nuances: [
      {
        contrastA: 'ご存じのように',
        meaningA: 'Sebagaimana yang sudah Anda ketahui (bahasa sopan & formal)',
        contrastB: '知っているとおり',
        meaningB: 'Persis seperti yang kamu tahu (lebih kasual & langsung)',
        explanation: 'ご存じのように adalah ungkapan standar dalam presentasi, pidato resmi, maupun surat bisnis.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: 'この図のように、机の上に本を並べてください。',
        reading: 'このずのように、つくえのうえにほんをならべてください。',
        meaningId: 'Tolong susun buku di atas meja seperti pada gambar ini.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '前にも言ったように、来週はテストがありますよ。',
        reading: 'まえにもいったように、らいしゅうはてすとがありますよ。',
        meaningId: 'Seperti yang sudah saya katakan sebelumnya, pekan depan ada ujian lho.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '皆様もご存じのように、今年の新入社員は過去最多となりました。',
        reading: 'みなさまもごぞんじのように、ことしのしんにゅうしゃいんはかこさいたとなりました。',
        meaningId: 'Sebagaimana hadirin sekalian ketahui, jumlah karyawan baru tahun ini adalah yang terbanyak dalam sejarah.',
      },
    ],
  },

  // Signature N4: 〜ように。 (Instruksi Halus / Arahan Atasan - w1d5g2)
  'w1d5g2': {
    concept: {
      summary: 'Harap selalu... / Dimohon supaya... (Instruksi halus dari guru/atasan)',
      beforeState: '早く来なさい。— Perintah langsung.',
      afterState: '早く来るように。— Instruksi yang lebih halus, khas guru atau atasan.',
      starterExample: {
        japanese: '明日はもっと早く来るように。',
        reading: 'あしたはもっとはやくくるように。',
        meaningId: 'Besok harap datang lebih awal ya.',
        contrastNote: 'Bagian akhir seperti 〜ように言います/〜ようにしてください dihilangkan, sehingga terdengar sebagai instruksi.',
      },
      keyTakeaway: 'Gunakan bentuk kamus (Vる) untuk hal yang harus dilakukan, dan bentuk negatif (Vない) untuk hal yang harus dihindari.',
    },
    functions: [
      {
        number: 1,
        label: 'Instruksi Disiplin / Bimbingan Guru (指導・指示)',
        description: 'Guru atau atasan menyampaikan tata tertib sekolah/kantor secara mendidik.',
        miniExample: {
          japanese: '宿題は必ず明日出すように。',
          reading: 'しゅくだいはかならずあしただすように。',
          meaningId: 'PR harus dikumpulkan besok, ya.',
        },
      },
      {
        number: 2,
        label: 'Peringatan Menghindari Kesalahan (注意・予防)',
        description: 'Mengingatkan agar tidak mengulangi kesalahan atau kelalaian yang merugikan.',
        miniExample: {
          japanese: '忘れ物をしないように。',
          reading: 'わすれものをしないように。',
          meaningId: 'Harap jangan sampai ada barang yang tertinggal.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Hal yang Dimohon untuk Dilakukan (Positif: Vる)',
        breakdown: ['Kata Kerja Kamus (Vる)', 'ように。'],
        progression: ['早く来る (Datang cepat)', '早く来るように。 (Harap datang lebih awal ya)'],
        note: 'Gunakan bentuk kamus (辞書形) untuk arahan tindakan positif.',
      },
      {
        title: 'B. Hal yang Dimohon untuk Dihindari (Negatif: Vない)',
        breakdown: ['Kata Kerja Negatif (Vない)', 'ように。'],
        progression: ['忘れる (Lupa)', '忘れない (Tidak lupa)', '忘れないように。 (Harap jangan lupa ya)'],
        note: 'Gunakan bentuk negatif (ない形) untuk peringatan larangan/pencegahan.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Kata Kerja Kamus (Vる)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['早く来る', '気をつける', '提出する', '守る'],
        functionEffect: '→ Arahan untuk melakukan tindakan: 早く来るように (Harap datang lebih awal).',
      },
      {
        typeCategory: 'B. Kata Kerja Negatif (Vない)',
        tagColor: 'amber',
        icon: '🟡',
        examples: ['忘れない', '遅れない', '騒がない', '諦めない'],
        functionEffect: '→ Peringatan untuk menghindari tindakan: 遅れないように (Harap tidak terlambat).',
      },
    ],
    nuances: [
      {
        contrastA: '〜ように。',
        meaningA: 'Instruksi bernada bimbingan resmi (sering tertulis di papan pengumuman atau arahan guru)',
        contrastB: '〜てください',
        meaningB: 'Permintaan langsung dari pembicara kepada lawan bicara',
        explanation: '〜ように。 terkesan sebagai penyampaian peraturan umum, bukan permintaan pribadi.',
      },
      {
        contrastA: '〜ように。',
        meaningA: 'Arahan santun dan mendidik tanpa menekan',
        contrastB: '〜なさい',
        meaningB: 'Perintah langsung yang tegas, misalnya orang tua kepada anak',
        explanation: 'Keduanya dipakai dari atas ke bawah, tetapi 〜ように。 terdengar lebih tidak langsung dan sering dipakai untuk instruksi di sekolah atau tempat kerja.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi - Vる Kamus)',
        japanese: '明日はもっと早く来るように。',
        reading: 'あしたはもっとはやくくるように。',
        meaningId: 'Besok harap datang lebih awal ya. (Arahan tindakan positif: Vる)',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan - Vない Negatif)',
        japanese: '明日の会議には絶対に遅れないように。',
        reading: 'あしたのかいぎにはぜったいにおくれないように。',
        meaningId: 'Pastikan besok tidak terlambat hadir pada rapat ya. (Peringatan pencegahan: Vない)',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Instruksi Resmi / Sekolah)',
        japanese: '宿題は明日までに必ず提出するように。',
        reading: 'しゅくだいはあしたまでにかならずていしゅつするように。',
        meaningId: 'Pekerjaan rumah harap diserahkan paling lambat besok ya. (Instruksi bimbingan guru/atasan)',
      },
    ],
  },

  // Signature N4: 〜ますように。 (Doa & Harapan - w1d5g3)
  'w1d5g3': {
    concept: {
      summary: 'Semoga... / Mudah-mudahan... (Doa tulus atau harapan hati)',
      beforeState: 'Harapan / Doa Dalam Hati: Sangat ingin lulus ujian 🙏',
      afterState: 'Doa Yang Terucap: 合格しますように。 (Semoga berhasil lulus!) ✨',
      starterExample: {
        japanese: '試験に合格しますように。',
        reading: 'しけんにごうかくしますように。',
        meaningId: 'Semoga saya lulus ujian.',
        contrastNote: 'Sering ditulis di papan doa (絵馬) di kuil atau pada kertas harapan saat Tanabata.',
      },
      keyTakeaway: 'Dipakai untuk doa atau harapan tulus. Kata kerjanya biasanya bentuk sopan (〜ます, 〜ません, atau potensial 〜れます).',
    },
    functions: [
      {
        number: 1,
        label: 'Doa Keberhasilan / Keselamatan (祈願・祝福)',
        description: 'Memohon agar harapan baik, kesembuhan, atau kesuksesan terwujud.',
        miniExample: {
          japanese: '早く元気になりますように。',
          reading: 'はやくげんきになりますように。',
          meaningId: 'Semoga Anda lekas sehat kembali.',
        },
      },
      {
        number: 2,
        label: 'Doa Pencegahan Hal Buruk (無事・平穏の祈り)',
        description: 'Memohon agar bencana, musibah, atau kegagalan tidak menimpa.',
        miniExample: {
          japanese: '明日は雨が降りませんように。',
          reading: 'あしたはあめがふりませんように。',
          meaningId: 'Semoga besok tidak turun hujan.',
        },
      },
    ],
    formulas: [
      {
        title: 'A. Harapan Terwujud (Bentuk Sopan Positif / Potensial)',
        breakdown: ['Kata Kerja Sopan (Vます / Vれます)', 'ように。'],
        progression: ['合格する (Lulus)', '合格します (Bentuk sopan)', '合格しますように。 (Semoga lulus!)'],
        note: 'Bentuk sopan (ます形) atau potensial sopan (れます形).',
      },
      {
        title: 'B. Doa Perlindungan (Bentuk Sopan Negatif)',
        breakdown: ['Kata Kerja Negatif Sopan (Vません)', 'ように。'],
        progression: ['降る (Turun)', '降りません (Tidak turun)', '雨が降りませんように。 (Semoga tidak hujan!)'],
        note: 'Gunakan bentuk negatif sopan (ません形) untuk memohon perlindungan dari hal buruk.',
      },
    ],
    wordIdentities: [
      {
        typeCategory: 'A. Harapan Positif & Potensial (Vます / Vれます)',
        tagColor: 'emerald',
        icon: '🟢',
        examples: ['合格します', '治ります', '受かります', '幸せになります'],
        functionEffect: '→ Doa untuk kebaikan: 早く治りますように (Semoga lekas sembuh).',
      },
      {
        typeCategory: 'B. Doa Perlindungan dari Hal Buruk (Vません)',
        tagColor: 'sky',
        icon: '🔵',
        examples: ['降りません', '失敗しません', '事故が起きません'],
        functionEffect: '→ Doa agar tidak tertimpa musibah: 雨が降りませんように (Semoga tidak hujan).',
      },
    ],
    nuances: [
      {
        contrastA: '〜ますように。',
        meaningA: 'Doa langsung yang dipanjatkan kepada Tuhan/alam semesta (ekspresi spiritual/tulus)',
        contrastB: '〜てほしい / 〜たい',
        meaningB: 'Keinginan pribadi pembicara (〜たい) atau keinginan agar orang lain melakukan sesuatu (〜てほしい)',
        explanation: '〜ますように tertulis di papan doa kuil (絵馬 - ema) atau saat Tanabata untuk meminta berkat.',
      },
    ],
    examples: [
      {
        tier: 'basic',
        tierLabel: 'Level 1: Sederhana (Pondasi)',
        japanese: '試験に合格しますように。',
        reading: 'しけんにごうかくしますように。',
        meaningId: 'Semoga saya lulus ujian.',
      },
      {
        tier: 'daily',
        tierLabel: 'Level 2: Sehari-hari (Percakapan)',
        japanese: '今年一年、家族みんなが健康で過ごせますように。',
        reading: 'ことしいちねん、かぞくみんながけんこうですごせますように。',
        meaningId: 'Semoga sepanjang tahun ini seluruh keluarga selalu sehat.',
      },
      {
        tier: 'natural',
        tierLabel: 'Level 3: Alami (Ekspresi Wajar)',
        japanese: '明日の遠足の日は、どうか雨が降りませんように。',
        reading: 'あしたのえんそくのひは、どうかあめがふりませんように。',
        meaningId: 'Semoga besok, hari darmawisata, tidak turun hujan.',
      },
    ],
  },
};

/**
 * Intelligent Adapter that builds full 7-node grammar skill data for any BunpouItem
 */
export function getGrammarSkillNodes(item: BunpouItem): GrammarSkillNodes {
  // If explicitly defined on item, return directly
  if (item.skillNodes) {
    return item.skillNodes;
  }

  // Check bespoke lookup (by exact ID or normalized title)
  const bespoke = BESPOKE_SKILL_NODES[item.id] ||
    (item.title.includes('ようになる') ? BESPOKE_SKILL_NODES['bp_n4_youni_naru'] : undefined) ||
    (item.title.includes('ようにする') ? BESPOKE_SKILL_NODES['w1d4g1'] : undefined) ||
    (item.title.includes('聞こえるように') ? BESPOKE_SKILL_NODES['w1d4g2'] : undefined) ||
    (item.title.includes('ご存じのように') ? BESPOKE_SKILL_NODES['w1d5g1'] : undefined) ||
    (item.title.includes('早く来るように') || item.title.includes('ように。') ? BESPOKE_SKILL_NODES['w1d5g2'] : undefined) ||
    (item.title.includes('合格しますように') || item.title.includes('ますように') ? BESPOKE_SKILL_NODES['w1d5g3'] : undefined) ||
    (item.title.includes('みたい') && !item.title.includes('まるで') ? BESPOKE_SKILL_NODES['w1d3g1'] : undefined) ||
    (item.title.includes('ちゃう') || item.title.includes('じゃう') ? BESPOKE_SKILL_NODES['w1d2g2'] : undefined) ||
    (item.title.includes('なくちゃ') || item.title.includes('なきゃ') ? BESPOKE_SKILL_NODES['w1d2g1'] : undefined) ||
    // Hanya bentuk singkat Vとく／Vどく (〜ておく); bukan kata seperti ことごとく.
    (/[〜~V][とど]く/.test(item.title) ? BESPOKE_SKILL_NODES['w1d2g3'] : undefined) ||
    (item.title.includes('ようとする') ? BESPOKE_SKILL_NODES['w1d6g2'] : undefined) ||
    (item.title.includes('ようと思う') ? BESPOKE_SKILL_NODES['w1d6g1'] : undefined) ||
    (item.title.includes('ようとしない') ? BESPOKE_SKILL_NODES['w1d6g3'] : undefined);

  // 1. Concept Node
  const concept: GrammarSkillConcept = bespoke?.concept
    ? withCuratedConcept(item, bespoke.concept)
    : generateFallbackConcept(item);

  // 2. Function Node
  const functions: GrammarSkillFunction[] = bespoke?.functions || generateFallbackFunctions(item);

  // 3. Formula Steps Node
  const formulas: GrammarSkillFormulaStep[] = bespoke?.formulas || generateFallbackFormulas(item);

  // 4. Word Identity Node
  const wordIdentities: GrammarSkillWordIdentity[] = bespoke?.wordIdentities || generateFallbackWordIdentities(item);

  // 5. Nuance Node
  const nuances: GrammarSkillNuance[] = bespoke?.nuances || generateFallbackNuances(item);

  // 6. Tiered Examples Node
  const examples: TieredExampleSentence[] = bespoke?.examples || generateFallbackExamples(item);

  // 7. Training Questions Node
  const trainingQuestions: Question[] = item.questions && item.questions.length > 0
    ? item.questions
    : generateFallbackQuestions(item);

  return {
    concept,
    functions,
    formulas,
    wordIdentities,
    nuances,
    examples,
    trainingQuestions,
  };
}

/**
 * Halaman bespoke juga dipakai (lewat pencocokan judul) oleh pola lain. Ringkasan, catatan kunci, dan
 * perbandingan "tanpa/dengan pola" diambil dari bunpouCuratedDict milik pola itu sendiri bila ada,
 * agar isinya tetap sesuai dengan pola yang sedang dibuka; contoh pembuka dari halaman bespoke tetap dipakai.
 */
function withCuratedConcept(item: BunpouItem, base: GrammarSkillConcept): GrammarSkillConcept {
  const curated = (bunpouCuratedDict as Record<string, any>)[item.id];
  if (!curated) return base;
  const hasStates = Boolean(curated.beforeState && curated.afterState);
  return {
    ...base,
    summary: cleanSummaryStr(curated.meaning_id) || base.summary,
    beforeState: hasStates ? curated.beforeState : base.beforeState,
    afterState: hasStates ? curated.afterState : base.afterState,
    keyTakeaway: curated.keyTakeaway || base.keyTakeaway,
  };
}

const cleanSummaryStr = (text?: string): string => {
  if (!text) return '';
  // Hanya buang keterangan berbahasa Inggris di akhir (sisa data lama). Keterangan berbahasa Indonesia
  // seperti "(benda mati)" atau "(dan aku jadi repot)" adalah bagian dari makna dan harus tetap tampil.
  return text
    .replace(/\s*\(([A-Za-z0-9\s/,'’._\-—]{4,})\)\.?\s*$/g, (match, inner: string) =>
      /\b(the|of|to|with|is|are|was|for)\b/i.test(inner) &&
      !/\b(dan|yang|di|ke|tidak|untuk|dengan|aku|saya|itu|ini)\b/i.test(inner)
        ? ''
        : match
    )
    .trim();
};

function deriveSmartKeyTakeaway(item: BunpouItem): string {
  if (item.keyTakeaway) return item.keyTakeaway;
  const curated = (bunpouCuratedDict as Record<string, any>)[item.id];
  if (curated?.keyTakeaway) return curated.keyTakeaway;

  // Catatan penjelasan milik pola itu sendiri. Dulu di sini ada template generik yang dipilih lewat regex
  // atas arti/judul, dan hasilnya sering tidak cocok (mis. semua pola yang artinya memuat "saat" diberi
  // catatan tentang "peristiwa tak terduga yang menyela").
  if (item.nuance) return item.nuance;

  const cleanM = cleanSummaryStr(item.meaningId || (item as any).meaning || '');
  return cleanM ? `Inti penggunaan: ${cleanM}.` : '';
}

function deriveSmartBeforeAfter(item: BunpouItem): { beforeState: string; afterState: string } {
  if (item.beforeState && item.afterState) {
    return { beforeState: item.beforeState, afterState: item.afterState };
  }
  const curated = (bunpouCuratedDict as Record<string, any>)[item.id];
  if (curated?.beforeState && curated?.afterState) {
    return { beforeState: curated.beforeState, afterState: curated.afterState };
  }
  // Tanpa data kurasi, perbandingan "tanpa pola vs. dengan pola" tidak ditampilkan: template generiknya
  // tidak menjelaskan apa pun yang spesifik dan sering salah konteks.
  return { beforeState: '', afterState: '' };
}

/**
 * Fallback generator for Node 1: Concept
 */
function generateFallbackConcept(item: BunpouItem): GrammarSkillConcept {
  const curated = (bunpouCuratedDict as Record<string, any>)[item.id];
  const rawExplanation = curated?.meaning_id || item.meaningId || item.nuance || item.explanation || '';
  const explanation = cleanSummaryStr(rawExplanation);

  const firstEx = item.examples && item.examples[0];
  const starterExample = firstEx ? {
    japanese: firstEx.japanese,
    reading: firstEx.reading,
    meaningId: firstEx.meaningId,
  } : undefined;

  const keyTakeaway = item.keyTakeaway || curated?.keyTakeaway || deriveSmartKeyTakeaway(item);
  const { beforeState, afterState } = deriveSmartBeforeAfter(item);

  return {
    summary: explanation,
    beforeState,
    afterState,
    starterExample,
    keyTakeaway,
  };
}

/**
 * Deskripsi untuk kategori fungsi di filter Library (ALL_GRAMMAR_FUNCTION_CATEGORIES). Kategori ini
 * mengelompokkan banyak pola sekaligus, jadi deskripsinya sengaja umum tetapi tetap benar untuk tiap anggota.
 */
const CATEGORY_FUNCTION_INFO: Record<string, { label: string; description: string }> = {
  '程度・比較': {
    label: 'Derajat & Perbandingan (程度・比較)',
    description: 'Membandingkan dua hal atau lebih, atau menyatakan seberapa tinggi tingkat suatu keadaan (lebih, paling, sampai sejauh, dsb.).',
  },
  '推測・比喩': {
    label: 'Dugaan & Perumpamaan (推測・比喩)',
    description: 'Menyatakan perkiraan pembicara berdasarkan apa yang dilihat, didengar, atau disimpulkan, atau mengibaratkan sesuatu dengan hal lain.',
  },
  '限定・強調': {
    label: 'Pembatasan & Penekanan (限定・強調)',
    description: 'Membatasi cakupan pada hal tertentu saja (hanya, cuma, bahkan) atau menekankan suatu hal secara khusus.',
  },
  '関連・情報源・手段': {
    label: 'Topik, Sumber & Sarana (関連・情報源・手段)',
    description: 'Menunjukkan topik yang dibicarakan, sumber informasi atau dasar penilaian, atau sarana yang dipakai untuk melakukan sesuatu.',
  },
  '受身・許可': {
    label: 'Pasif, Kausatif & Izin (受身・許可)',
    description: 'Mengubah sudut pandang tindakan (bentuk pasif atau kausatif), atau menyatakan izin dan larangan.',
  },
  '原因・理由・代替': {
    label: 'Sebab, Alasan & Pengganti (原因・理由・代替)',
    description: 'Menjelaskan sebab atau alasan terjadinya sesuatu, atau menyatakan sesuatu sebagai pengganti hal lain.',
  },
  '逆接・譲歩': {
    label: 'Pertentangan & Pengakuan (逆接・譲歩)',
    description: 'Menghubungkan dua hal yang hasilnya berlawanan dengan dugaan (tetapi, walaupun, meskipun).',
  },
  '時間・契機': {
    label: 'Waktu & Pemicu (時間・契機)',
    description: 'Menunjukkan kapan sesuatu terjadi, urutan peristiwa, atau peristiwa yang menjadi pemicu hal lain.',
  },
  '仮定・条件': {
    label: 'Pengandaian & Syarat (仮定・条件)',
    description: 'Menyatakan syarat atau situasi pengandaian beserta akibat yang mengikutinya (jika, kalau, seandainya).',
  },
  '完了・進展': {
    label: 'Tahap & Perkembangan Tindakan (完了・進展)',
    description: 'Menunjukkan tahap suatu tindakan: hendak dimulai, sedang berlangsung, sudah selesai, atau terus berkembang.',
  },
  '論理・必然・否定': {
    label: 'Logika, Kepastian & Penyangkalan (論理・必然・否定)',
    description: 'Menyatakan kesimpulan logis, sesuatu yang wajar atau pasti terjadi, atau menyangkal suatu anggapan.',
  },
  '義務・助言': {
    label: 'Kewajiban & Saran (義務・助言)',
    description: 'Menyatakan hal yang harus atau sebaiknya dilakukan, larangan, atau saran kepada lawan bicara.',
  },
  '努力・変化・目的': {
    label: 'Usaha, Perubahan & Tujuan (努力・変化・目的)',
    description: 'Menyatakan usaha untuk mencapai sesuatu, perubahan keadaan, atau tujuan dari suatu tindakan.',
  },
  '日常会話・短縮': {
    label: 'Ragam Lisan & Bentuk Singkat (日常会話・短縮)',
    description: 'Bentuk singkat atau ungkapan khas percakapan santai sehari-hari.',
  },
  '敬語': {
    label: 'Bahasa Hormat & Sopan (敬語)',
    description: 'Ungkapan untuk menghormati lawan bicara (sonkeigo), merendahkan diri sendiri (kenjougo), atau berbicara dengan santun (teineigo).',
  },
  '意志・希望': {
    label: 'Keinginan & Niat (意志・希望)',
    description: 'Menyatakan keinginan, harapan, rencana, atau niat untuk melakukan sesuatu.',
  },
  '授受': {
    label: 'Memberi & Menerima (授受)',
    description: 'Menyatakan siapa memberi dan siapa menerima, baik berupa barang maupun bantuan (tindakan yang dilakukan untuk orang lain).',
  },
  '列挙・接続': {
    label: 'Penghubung & Penyebutan (列挙・接続)',
    description: 'Menghubungkan kata atau kalimat, atau menyebutkan beberapa hal/tindakan secara berurutan maupun sebagai contoh.',
  },
  '助詞・基本文型': {
    label: 'Partikel & Pola Dasar (助詞・基本文型)',
    description: 'Partikel, kata bantu, atau bentuk dasar yang menjadi kerangka kalimat bahasa Jepang.',
  },
};

/**
 * Knowledge map of pedagogically rich descriptions and human-friendly labels for grammar functions
 */
const FUNCTION_KNOWLEDGE_MAP: Record<string, { label: string; description: string; keywords?: string[] }> = {
  '完了': {
    label: 'Tindakan Selesai Tuntas (完了)',
    description: 'Menyatakan bahwa suatu aktivitas telah terselesaikan sepenuhnya sampai beres atau habis tanpa sisa.',
    keywords: ['全部', '終わ', '宿題', '飲ん', '食べ', 'すっかり', '切る'],
  },
  '後悔': {
    label: 'Terlanjur & Penyesalan (後悔)',
    description: 'Menyatakan rasa menyesal atau kecewa karena sesuatu telanjur terjadi, sering tanpa disengaja.',
    keywords: ['忘れ', '落と', 'なく', '困', '失敗', '壊', 'うっかり', '電車', 'ケーキ'],
  },
  '日常会話': {
    label: 'Percakapan Santai Sehari-hari (日常会話)',
    description: 'Bentuk singkat yang dipakai dalam obrolan santai sehari-hari dengan orang yang akrab.',
    keywords: ['今日', 'じゃお', 'ちゃお', 'ね', 'よ', '友達', '飲んじゃおう'],
  },
  '義務': {
    label: 'Kewajiban & Keharusan (義務)',
    description: 'Menyatakan hal yang harus dilakukan, karena aturan, keadaan, atau kebutuhan.',
    keywords: ['行か', '書か', '急ぐ', '宿題', '時間', '返事', '起き'],
  },
  '助言': {
    label: 'Nasihat & Anjuran (助言)',
    description: 'Memberikan saran atau usulan positif yang dianggap baik dan bermanfaat bagi lawan bicara.',
    keywords: ['いい', '方', '薬', '病院', '相談'],
  },
  '推測': {
    label: 'Dugaan (推測)',
    description: 'Menyatakan perkiraan pembicara berdasarkan apa yang dilihat, didengar, atau dirasakan.',
    keywords: ['雨', '人', '来', 'だれも', 'どうやら'],
  },
  '比喩': {
    label: 'Perumpamaan / Mengibaratkan (比喩)',
    description: 'Mengibaratkan sesuatu menyerupai hal lain karena sifat, tingkah laku, atau tampilannya serupa.',
    keywords: ['子供', '女', '夢', 'まるで', '花'],
  },
  '類似': {
    label: 'Kemiripan Karakteristik (類似)',
    description: 'Menunjukkan keserupaan ciri khas atau karakteristik antar dua objek.',
    keywords: ['似', '同じ', 'よう'],
  },
  '典型': {
    label: 'Khas / Otentik (典型)',
    description: 'Menunjukkan ciri khas sejati yang benar-benar mencerminkan status atau esensi aslinya.',
    keywords: ['男', '女', '春', '学生', 'プロ'],
  },
  '様子': {
    label: 'Kesan Lahiriah (様子)',
    description: 'Menggambarkan kondisi atau suasana yang tampak secara kasat mata.',
    keywords: ['静か', '元気', '様子', '顔'],
  },
  '傾向': {
    label: 'Kecenderungan Sifat (傾向)',
    description: 'Menyatakan kecenderungan atau sifat pembawaan yang sering terlihat dari luar.',
    keywords: ['子供', '安', '怒り', '黒'],
  },
  '努力': {
    label: 'Usaha Sadar (努力)',
    description: 'Menunjukkan komitmen dan usaha sadar yang terus-menerus dilakukan untuk membiasakan hal baik.',
    keywords: ['忘れ物', '毎日', '心掛', '早起き'],
  },
  '習慣': {
    label: 'Pembiasaan Rutin (習慣)',
    description: 'Membentuk rutinitas atau kebiasaan baru yang dilakukan secara berkala.',
    keywords: ['運動', '勉強', '毎日', '朝'],
  },
  '目的': {
    label: 'Tujuan Tindakan (目的)',
    description: 'Melakukan tindakan demi mencapai suatu kondisi atau tujuan yang diinginkan.',
    keywords: ['聞こえる', '見える', '合格', 'ため'],
  },
  '変化': {
    label: 'Perubahan Kondisi / Kemampuan (変化)',
    description: 'Menyatakan transisi dari keadaan semula (tidak bisa/belum biasa) menjadi keadaan baru.',
    keywords: ['話せる', '泳げる', '読める', '直る'],
  },
  '限定': {
    label: 'Pembatasan Khusus (限定)',
    description: 'Membatasi lingkup hanya pada hal tersebut (melulu / semata-mata hal itu).',
    keywords: ['ばかり', 'だけ', '遊んで', 'テレビ'],
  },
  '強調': {
    label: 'Penekanan Derajat (強調)',
    description: 'Memberi penekanan khusus untuk menegaskan tingkat keparahan, jumlah, atau frekuensi.',
    keywords: ['女性', '雨', '文句', '寝て'],
  },
  '不満': {
    label: 'Keluhan / Nada Kritis (不満)',
    description: 'Mengandung nada kejengkelan atau kritik karena suatu perbuatan dirasa berlebihan.',
    keywords: ['遊んでばかり', 'ゲーム', '文句', 'サボ'],
  },
  '関連': {
    label: 'Kaitan Topik Bahasan (関連)',
    description: 'Menunjukkan topik atau hal yang sedang dibicarakan.',
    keywords: ['事件', '問題', '調査', '記事'],
  },
  '手段': {
    label: 'Sarana & Cara (手段)',
    description: 'Menunjukkan sarana, metode, atau instrumen yang digunakan untuk melaksanakan aksi.',
    keywords: ['車', 'インターネット', '電話', '方法'],
  },
  '原因': {
    label: 'Penyebab / Alasan (原因)',
    description: 'Menjelaskan faktor pemicu logis di balik terjadinya suatu kondisi atau peristiwa.',
    keywords: ['事故', '台風', '熱', '遅れ'],
  },
  '確信': {
    label: 'Keyakinan Logis (確信)',
    description: 'Menyatakan keyakinan bahwa sesuatu seharusnya demikian berdasarkan jadwal, informasi, atau logika.',
    keywords: ['来る', '合格', '届く', '予定'],
  },
  '当然': {
    label: 'Kewajaran Akal Sehat (当然)',
    description: 'Menyatakan hal yang wajar dan sudah sewajarnya terjadi demikian.',
    keywords: ['約束', '勉強した', '知っている'],
  },
  '納得': {
    label: 'Pemahaman Wajar (納得)',
    description: 'Menyatakan pemahaman logis setelah mengetahui alasan di baliknya ("pantas saja...").',
    keywords: ['暑い', '上手', '日本にいた', '道理で'],
  },
  '部分否定': {
    label: 'Penolakan Sebagian (部分否定)',
    description: 'Menyangkal sebagian: hal tersebut tidak selalu atau tidak sepenuhnya demikian.',
    keywords: ['嫌い', '高い', '全部', '必ずしも'],
  },
  '事実描写': {
    label: 'Menyatakan Fakta (事実描写)',
    description: 'Menyampaikan fakta, informasi, atau pengetahuan umum secara objektif tanpa menonjolkan pelakunya.',
  },
  '硬い表現': {
    label: 'Ungkapan Formal (硬い表現)',
    description: 'Gaya bahasa resmi yang lazim dalam tulisan, berita, rapat, atau presentasi.',
  },
  '個別性': {
    label: 'Berbeda Menurut Kasus (個別性)',
    description: 'Menyatakan bahwa sesuatu berbeda-beda tergantung orang, tempat, atau keadaannya.',
  },
  '達成': {
    label: 'Pencapaian (達成)',
    description: 'Menyatakan bahwa suatu pekerjaan atau target berhasil diselesaikan setelah berusaha.',
  },
  '必然': {
    label: 'Kesimpulan Wajar (必然)',
    description: 'Menyatakan bahwa suatu hasil memang wajar atau pasti terjadi mengingat alasannya.',
  },
  '弁解': {
    label: 'Meluruskan / Membela Diri (弁解)',
    description: 'Dipakai untuk meluruskan salah paham atau menjelaskan bahwa maksud pembicara tidak seperti yang dikira.',
  },
  '強い否定': {
    label: 'Penyangkalan Tegas (強い否定)',
    description: 'Menyatakan dengan tegas bahwa sesuatu sama sekali tidak mungkin terjadi.',
  },
  '受身': {
    label: 'Bentuk Pasif Objektif (受身)',
    description: 'Menyatakan peristiwa atau fakta dari sudut pandang penerima aksi tanpa menonjolkan pelaku.',
    keywords: ['書かれて', '作られた', '建てられ', '言われて'],
  },
  '迷惑受身': {
    label: 'Pasif Kerugian / Kerepotan (迷惑受身)',
    description: 'Menyatakan bahwa pembicara merasa terganggu, repot, atau dirugikan oleh perbuatan pihak lain.',
    keywords: ['泣かれた', '降られた', '踏まれた', '逃げられた'],
  },
  '許可': {
    label: 'Izin & Persetujuan (許可)',
    description: 'Meminta izin dengan sopan agar diperbolehkan melakukan sesuatu, atau menyatakan bahwa sesuatu boleh dilakukan.',
    keywords: ['帰らせて', '休ませて', '使わせて', 'させて'],
  },
  '使役': {
    label: 'Bentuk Kausatif (使役)',
    description: 'Menyuruh, menugaskan, atau memberi kesempatan kepada orang lain untuk melakukan aksi.',
    keywords: ['行かせる', '食べさせる', '読ませる', '勉強させる'],
  },
  '使役受身': {
    label: 'Kausatif Pasif / Terpaksa (使役受身)',
    description: 'Menyatakan bahwa subjek terpaksa melakukan suatu perbuatan di luar kehendaknya sendiri.',
    keywords: ['待たされた', '飲まされた', '行かされた', '歌わされた'],
  },
  '仮定': {
    label: 'Pengandaian & Syarat (仮定・条件)',
    description: 'Menyatakan prasyarat yang harus dipenuhi agar kejadian atau hasil berikutnya dapat terwujud.',
    keywords: ['雨が降れば', '安かったら', '行けば', '春になれば'],
  },
  '逆接': {
    label: 'Pertentangan / Walaupun (逆接・譲歩)',
    description: 'Menghubungkan dua fakta yang bertentangan atau hasil yang meleset dari ekspektasi normal.',
    keywords: ['のに', 'けれども', '薬を飲んだが', '雨なのに'],
  },
  '極限': {
    label: 'Ketuntasan Maksimal (極限)',
    description: 'Menghabiskan atau mengerahkan sesuatu sampai ke batas akhir tanpa tersisa.',
    keywords: ['使い切る', '食べ切る', '走り切った', '疲れ切った'],
  },
  '限界': {
    label: 'Batas Kapasitas (限界)',
    description: 'Menunjukkan batas kemampuan fisik, mental, atau kapasitas yang sanggup ditampung.',
    keywords: ['数え切れない', '我慢', '持ちきれない'],
  },
  '敬語': {
    label: 'Bahasa Sopan & Formal (敬語)',
    description: 'Ragam bahasa hormat untuk menghargai lawan bicara atau merendahkan diri secara santun.',
    keywords: ['いらっしゃる', 'おっしゃる', 'いただく', '申す'],
  },
  '祈願・指示': {
    label: 'Instruksi Halus & Doa (祈願・指示)',
    description: 'Digunakan dalam situasi resmi atau mendidik (seperti guru mengarahkan murid, atau atasan mengingatkan staf) agar arahan dipatuhi secara santun tanpa terkesan menekan lawan bicara.',
    keywords: ['ように', '来る', '遅れない', '提出', '合格', '元気', '雨'],
  },
  '指示': {
    label: 'Instruksi & Arahan Disiplin (指示)',
    description: 'Dipakai oleh figur otoritas atau dalam peraturan tertulis untuk mengarahkan apa yang semestinya dikerjakan atau dihindari demi ketertiban bersama.',
    keywords: ['ように', '来る', '遅れない', '提出', '切る', '守る'],
  },
  '祈願': {
    label: 'Doa & Harapan Tulus (祈願)',
    description: 'Dipakai saat berdoa atau mengungkapkan harapan tulus, misalnya agar lulus, sembuh, atau selamat.',
    keywords: ['合格', '治る', '健康', '降らない', '雨', 'ますように'],
  },
  '希望': {
    label: 'Harapan & Keinginan Baik (希望)',
    description: 'Menyatakan keinginan atau ekspektasi positif terhadap suatu keadaan yang diharapkan dapat terwujud.',
    keywords: ['たい', 'ほしい', '願う', '祈る'],
  },
  '努力・変化・目的': {
    label: 'Usaha, Perubahan & Tujuan (努力・変化・目的)',
    description: 'Menjelaskan ikhtiar sadar dalam mendisiplinkan diri membentuk rutinitas baru, mengamati perkembangan kemampuan, atau melakukan tindakan demi mencapai target tertentu.',
    keywords: ['ようにする', 'ようになる', '聞こえるように', '毎日', '練習'],
  },
  '意志・試み': {
    label: 'Niat & Upaya Aksi (意志・試み)',
    description: 'Mengungkapkan tekad kuat yang sudah direncanakan dalam pikiran, atau menggambarkan momen krusial saat seseorang baru saja hendak memulai suatu tindakan.',
    keywords: ['と思う', 'とする', 'やめよう', '乗ろう', 'しよう'],
  },
  '意志': {
    label: 'Niat & Tekad Bulat (意志)',
    description: 'Menyatakan ketetapan hati pembicara yang sudah dipikirkan matang-matang sebelum diwujudkan ke dalam aksi nyata.',
    keywords: ['と思う', 'つもり', 'やめよう', '決める'],
  },
  '試み': {
    label: 'Momen Hendak Melakukan (試み)',
    description: 'Menggambarkan momen tepat sesaat sebelum suatu tindakan dimulai, atau perjuangan seseorang saat sedang berusaha keras melaksanakannya.',
    keywords: ['とする', '乗ろうとした', '開けよう', '出かけよう'],
  },
  '限定・強調': {
    label: 'Pembatasan & Penekanan (限定・強調)',
    description: 'Dipakai saat pembicara ingin menyoroti hal tertentu secara khusus (melulu itu saja) atau memberikan penekanan kuat pada frekuensi dan derajat suatu perbuatan.',
    keywords: ['ばかり', 'だけ', '遊んで', 'テレビ', '文句'],
  },
  '関連・情報源・手段': {
    label: 'Kaitan Topik & Sarana (関連・情報源・手段)',
    description: 'Mengangkat suatu topik wacana ke ruang diskusi, merujuk sumber informasi acuan, atau menjelaskan metode yang dipakai dalam bertindak.',
    keywords: ['について', 'によって', 'よると', 'ニュース', '調査', '問題'],
  },
  '名詞化': {
    label: 'Pembentukan Konsep Nomina (名詞化)',
    description: 'Mengubah kata sifat atau klausa peristiwa menjadi kata benda abstrak agar dapat dinilai bobotnya, diukur derajatnya, atau dianalisis lebih lanjut.',
    keywords: ['さ', 'み', 'こと', 'もの', '重さ', '深み'],
  },
  '定義・説明': {
    label: 'Definisi & Penjelasan Konsep (定義・説明)',
    description: 'Digunakan saat memperkenalkan nama istilah baru, mendefinisikan konsep abstrak, atau menjelaskan makna suatu kata kepada lawan bicara.',
    keywords: ['という', 'というのは', 'ことだ', '意味'],
  },
  '評価・引用': {
    label: 'Penilaian & Sudut Pandang (評価・引用)',
    description: 'Dipakai untuk meralat sebutan yang kurang pas ke deskripsi yang lebih akurat, atau menyampaikan sudut pandang kritis pembicara terhadap suatu hal.',
    keywords: ['というより', 'というか', 'と言っても', '評価'],
  },
  '間接引用': {
    label: 'Penyampaian Pesan / Kutipan (間接引用)',
    description: 'Menyampaikan kembali arahan, teguran, atau instruksi dari pihak ketiga (seperti dokter, guru, atau atasan) kepada orang yang bersangkutan.',
    keywords: ['ように言われた', 'と言っていた', '注意された'],
  },
  '立場・基準・仮定': {
    label: 'Sudut Pandang Peran & Standar (立場・基準)',
    description: 'Menilai suatu tindakan berdasarkan kapasitas peran tertentu (misal sebagai orang tua, dokter, pelajar) atau menimbangnya dari standar kelaziman umum.',
    keywords: ['として', 'にしては', 'わりに', '立場', '基準'],
  },
  '確信・義務・追憶': {
    label: 'Keyakinan, Kewajiban & Kenangan (確信・義務)',
    description: 'Menyatakan kepastian logis berdasarkan fakta, keharusan moral yang patut dijalankan, atau mengenang kebiasaan berkesan di masa lalu.',
    keywords: ['はずだ', 'べきだ', 'ものだ', '約束', '子供のころ'],
  },
  '時間・契機': {
    label: 'Waktu & Momentum Aksi (時間・契機)',
    description: 'Menunjukkan momen waktu yang tepat, momentum kebetulan saat dua peristiwa bertemu, atau pemicu dimulainya suatu aksi baru.',
    keywords: ['うちに', 'あいだに', 'たびに', 'とたんに', '最中に'],
  },
  '状態・継続': {
    label: 'Kondisi Berlanjut & Acuan (状態・継続)',
    description: 'Membiarkan suatu keadaan tetap berlangsung sebagaimana adanya tanpa diubah, atau bertindak persis sesuai panduan dan rencana acuan.',
    keywords: ['まま', 'っぱなし', 'とおりに', '指示'],
  },
  '感情・様子': {
    label: 'Ekspresi Sikap & Emosi Pihak Ketiga (感情・様子)',
    description: 'Menggambarkan perasaan, keinginan, atau sikap tampak dari orang lain (pihak ketiga) berdasarkan apa yang terlihat dari gelagat luarnya.',
    keywords: ['がる', 'たがる', 'ふりをする', '寂しそう'],
  },
  '評価・不満': {
    label: 'Evaluasi Kritis & Keluhan (評価・不満)',
    description: 'Mengutarakan kritik, ketidakpuasan, atau rasa heran karena suatu hal berjalan tidak sesuai dengan harapan atau standar yang semestinya.',
    keywords: ['くせに', 'わりに', '文句', '不満'],
  },
  '原因・理由・代替': {
    label: 'Sebab-Akibat & Pengganti (原因・理由・代替)',
    description: 'Menjelaskan faktor pemicu logis di balik terjadinya peristiwa, atau memilih opsi pengganti yang sepadan sebagai kompensasi.',
    keywords: ['わけだ', 'せいで', 'おかげで', 'かわりに', 'ため'],
  },
  '受身・許可': {
    label: 'Bentuk Pasif & Izin (受身・許可)',
    description: 'Menyatakan peristiwa dari sudut pandang korban/penerima aksi yang terkena dampak, atau memohon izin secara santun agar diperbolehkan melakukan sesuatu.',
    keywords: ['られる', 'させて', '泣かれた', '許可'],
  },
  '伝聞': {
    label: 'Penyampaian Kabar Pihak Ketiga (伝聞)',
    description: 'Menyampaikan kembali berita, kabar burung, atau informasi yang didengar dari media massa atau sumber lain tanpa menjamin kebenaran mutlaknya.',
    keywords: ['そうだ', 'ということだ', 'ニュース', '聞いた'],
  },
  '伝達': {
    label: 'Acuan Informasi Bersama (伝達)',
    description: 'Mengawali percakapan atau presentasi dengan merujuk pada informasi, bagan, atau fakta yang sudah sama-sama diketahui oleh audiens.',
    keywords: ['ご存じのように', '言ったように', '図のように'],
  },
};

interface CandidateSentence {
  japanese: string;
  reading?: string;
  meaningId: string;
}

function extractCandidateSentences(item: BunpouItem): CandidateSentence[] {
  const list: CandidateSentence[] = [];

  // 1. From examples
  if (item.examples && item.examples.length > 0) {
    for (const ex of item.examples) {
      if (ex.japanese && ex.meaningId) {
        list.push({
          japanese: ex.japanese,
          reading: ex.reading || ex.japanese,
          meaningId: ex.meaningId,
        });
      }
    }
  }

  // 2. From questions
  if (item.questions && item.questions.length > 0) {
    for (const q of item.questions) {
      if (!q.prompt) continue;
      const correctOption = q.options && q.correctIndex !== undefined ? q.options[q.correctIndex] : '';
      const filled = q.prompt.replace(/（\s*）|\(\s*\)/g, correctOption || '').trim();
      if (!filled) continue;

      let meaning = '';
      const artiMatch = q.explanation?.match(/Arti kalimat:\s*["“]([^"”]+)["”]/i);
      if (artiMatch) {
        meaning = artiMatch[1];
      } else if (q.explanation) {
        meaning = q.explanation.split('\n')[0].replace(/^Jawaban benar:[^\n]*/, '').trim();
      }

      if (!meaning || meaning.length < 5) {
        meaning = item.meaningId;
      }

      list.push({
        japanese: filled,
        reading: q.ruby ? q.ruby.replace(/（\s*）|\(\s*\)/g, correctOption || '') : filled,
        meaningId: meaning,
      });
    }
  }

  return list;
}

/**
 * Fallback generator for Node 2: Functions
 */
function generateFallbackFunctions(item: BunpouItem): GrammarSkillFunction[] {
  const candidates = extractCandidateSentences(item);
  const usedSentences = new Set<string>();

  if (item.functions && item.functions.length > 0) {
    return item.functions.map((fn, idx) => {
      const parts = fn.split(/[()（）]/).filter(p => p.trim());
      const kanjiKey = parts[0]?.trim() || '';
      const indoTag = parts[1]?.trim() || '';

      let descriptor: { label: string; description: string; keywords?: string[] } | undefined =
        CATEGORY_FUNCTION_INFO[kanjiKey] || FUNCTION_KNOWLEDGE_MAP[kanjiKey];
      if (!descriptor) {
        const subKeys = kanjiKey.split(/[・、/]/).map(k => k.trim()).filter(Boolean);
        for (const sk of subKeys) {
          if (FUNCTION_KNOWLEDGE_MAP[sk]) {
            descriptor = FUNCTION_KNOWLEDGE_MAP[sk];
            break;
          }
        }
      }
      if (!descriptor) {
        descriptor = Object.entries(FUNCTION_KNOWLEDGE_MAP).find(([k]) => kanjiKey.includes(k) || k.includes(kanjiKey))?.[1];
      }

      let label = descriptor?.label;
      if (!label) {
        if (indoTag) {
          const capitalizedIndo = indoTag.charAt(0).toUpperCase() + indoTag.slice(1);
          label = `${capitalizedIndo} (${kanjiKey})`;
        } else {
          label = kanjiKey || fn;
        }
      }

      let description = descriptor?.description;
      if (!description) {
        const cleanTitle = item.title.split(/[(（]/)[0].trim().replace(/^[〜~]/, '');
        const cleanMeaning = cleanSummaryStr(item.meaningId || (item as any).meaning || '');
        if (indoTag) {
          description = `Fungsi ${indoTag.toLowerCase()}: ${cleanMeaning || cleanTitle}.`;
        } else {
          description = cleanMeaning || cleanTitle;
        }
      }

      // Find best matching unused candidate sentence
      const keywords = descriptor?.keywords || [kanjiKey, indoTag].filter(Boolean);
      let bestCandidate: CandidateSentence | undefined;
      let highestScore = -1;

      for (const cand of candidates) {
        if (usedSentences.has(cand.japanese)) continue;
        let score = 0;
        for (const kw of keywords) {
          if (cand.japanese.includes(kw) || cand.meaningId.toLowerCase().includes(kw.toLowerCase())) {
            score += 2;
          }
        }
        if (score > highestScore) {
          highestScore = score;
          bestCandidate = cand;
        }
      }

      // If no candidate scored with keywords, pick the first unused candidate
      if (!bestCandidate) {
        bestCandidate = candidates.find(c => !usedSentences.has(c.japanese));
      }

      // Mark as used so functions NEVER share the exact same sentence
      if (bestCandidate) {
        usedSentences.add(bestCandidate.japanese);
      }

      return {
        number: idx + 1,
        label,
        description,
        miniExample: bestCandidate ? {
          japanese: bestCandidate.japanese,
          reading: bestCandidate.reading,
          meaningId: bestCandidate.meaningId,
        } : undefined,
      };
    });
  }

  // Parse from curated subFormulas if available
  const curatedSubs = getCuratedSubFormulas(item);
  if (curatedSubs.length > 0) {
    return curatedSubs.map((sub, idx) => {
      const ex = sub.examples && sub.examples[0];
      return {
        number: idx + 1,
        label: sub.token || `Fungsi ${idx + 1}`,
        description: sub.meaning || sub.usageLocation || item.meaningId,
        miniExample: ex ? {
          japanese: ex.japanese,
          reading: ex.reading,
          meaningId: ex.meaningId,
        } : undefined,
      };
    });
  }

  return [
    {
      number: 1,
      label: 'Fungsi Utama',
      description: item.meaningId,
      miniExample: item.examples && item.examples[0] ? {
        japanese: item.examples[0].japanese,
        reading: item.examples[0].reading,
        meaningId: item.examples[0].meaningId,
      } : undefined,
    }
  ];
}

/**
 * Localizes English formula tokens to authentic Indonesian grammar terminology
 */
export function localizeFormulaString(str: string): string {
  if (!str) return '';
  return str
    .replace(/［/g, '[').replace(/］/g, ']')
    .replace(/Noun\s*\[\s*thing\s*\]/gi, 'Kata Benda [hal]')
    .replace(/Noun\s*\[\s*person\s*[\/／]\s*faculty\s*\]/gi, 'Kata Benda [orang/pihak]')
    .replace(/Noun\s*\[\s*person\s*\]/gi, 'Kata Benda [orang]')
    .replace(/Noun\s*\[\s*place\s*\]/gi, 'Kata Benda [tempat]')
    .replace(/Noun\s*\[\s*time\s*\]/gi, 'Kata Benda [waktu]')
    .replace(/Noun\s*\[\s*reason\s*\]/gi, 'Kata Benda [alasan]')
    .replace(/Noun\s*\[\s*situation\s*\]/gi, 'Kata Benda [situasi]')
    .replace(/Noun-A/g, 'Kata Benda A')
    .replace(/Noun-B/g, 'Kata Benda B')
    .replace(/\bNoun\b/g, 'Kata Benda')
    .replace(/\bVerb\s*\[\s*た\s*form\s*\]/gi, 'Kata Kerja [Bentuk-ta]')
    .replace(/\bVerb\s*\[\s*dictionary\s*form\s*\]/gi, 'Kata Kerja [Bentuk Kamus]')
    .replace(/\bVerb\s*\[\s*plain\s*form\s*\]/gi, 'Kata Kerja [Bentuk Biasa]')
    .replace(/\bVerb\s*\[\s*stem\s*\]/gi, 'Kata Kerja [Bentuk Masu]')
    .replace(/\bVerb\s*\[\s*te\s*form\s*\]/gi, 'Kata Kerja [Bentuk-te]')
    .replace(/\bVerb\s*\[\s*nai\s*form\s*\]/gi, 'Kata Kerja [Bentuk-nai]')
    .replace(/\bVerb\s*\[\s*volitional\s*form\s*\]/gi, 'Kata Kerja [Bentuk Maksud]')
    .replace(/\bVerb\s*\[\s*potential\s*form\s*\]/gi, 'Kata Kerja [Bentuk Potensial]')
    .replace(/\bVerb\s*\[\s*passive\s*form\s*\]/gi, 'Kata Kerja [Bentuk Pasif]')
    .replace(/\bVerb\s*\[\s*causative\s*form\s*\]/gi, 'Kata Kerja [Bentuk Kausatif]')
    .replace(/\bVerb\b/g, 'Kata Kerja')
    .replace(/na-adjective|na adjective|な-adjective/gi, 'Kata Sifat-na')
    .replace(/i-adjective|i adjective|い-adjective/gi, 'Kata Sifat-i')
    .replace(/\bAdjective\b|\badjective\b/g, 'Kata Sifat')
    .replace(/\bSentence\b|\bsentence\b/g, 'Kalimat')
    .replace(/\bplain form\b/gi, 'Bentuk Biasa')
    .replace(/\bdictionary form\b/gi, 'Bentuk Kamus')
    .replace(/\bpolite form\b/gi, 'Bentuk Sopan')
    .replace(/\bvolitional form\b|\bvolitional\b/gi, 'Bentuk Maksud')
    .replace(/\bpotential form\b|\bpotential\b/gi, 'Bentuk Potensial')
    .replace(/\bpassive form\b|\bpassive\b/gi, 'Bentuk Pasif')
    .replace(/\bcausative form\b|\bcausative\b/gi, 'Bentuk Kausatif')
    .replace(/\bClause\b|\bclause\b/gi, 'Klausa')
    .replace(/\bPhrase\b|\bphrase\b/gi, 'Frasa')
    .replace(/\bNumber\b|\bnumber\b/gi, 'Angka')
    .replace(/\bCounter\b|\bcounter\b/gi, 'Kata Bantu Hitung')
    .replace(/\bQuantity\b|\bquantity\b/gi, 'Jumlah')
    .replace(/\bQuestion word\b/gi, 'Kata Tanya')
    .replace(/\[thing\]/gi, '[hal]')
    .replace(/\[person[\s\/／]*faculty\]/gi, '[orang/pihak]')
    .replace(/\[person\]/gi, '[orang]')
    .replace(/\[place\]/gi, '[tempat]')
    .replace(/\[time\]/gi, '[waktu]')
    .replace(/\[reason\]/gi, '[alasan]')
    .replace(/\[situation\]/gi, '[situasi]');
}

/**
 * Fallback generator for Node 3: Formulas
 */
function generateFallbackFormulas(item: BunpouItem): GrammarSkillFormulaStep[] {
  const curatedSubs = getCuratedSubFormulas(item);
  if (curatedSubs.length > 0) {
    return curatedSubs.map((sub) => {
      const conditions = sub.connectionConditions.map(c => `${localizeFormulaString(c.partOfSpeech)}: ${localizeFormulaString(c.rule)}`);
      return {
        title: sub.token || localizeFormulaString(item.formula || item.title),
        breakdown: conditions.length > 0 ? conditions : [localizeFormulaString(item.formula || item.title)],
        note: sub.usageLocation ? `Letak dalam kalimat: ${sub.usageLocation}` : undefined,
      };
    });
  }

  // Tanpa cabang kurasi, tampilkan rumus apa adanya, satu kartu per varian. Varian dipisah " / " (data bp_*)
  // atau "；" (data mingguan). Dulu rumus diurai otomatis menjadi "kelas kata ＋ pola", dan hasilnya sering salah
  // (mis. "Kata Kerja [Bentuk Masu]" terbaca sebagai kata benda karena regex /N/i mengenai huruf n di "Bentuk").
  const rawFormula = localizeFormulaString((item.formula || item.title).trim());
  const variants = rawFormula.split(/\s+\/\s+|；/).map(v => v.trim()).filter(Boolean);

  return variants.map((variant, idx) => {
    const parts = variant
      .split(/[＋+]/)
      .map(p => p.replace(/^[＋+\s]+|[＋+\s]+$/g, '').trim())
      .filter(p => p.length > 0);
    const posLabel = describeVariantWordClass(variant);
    return {
      title: variants.length > 1
        ? `Variasi ${idx + 1}${posLabel ? ` — dengan ${posLabel}` : ''}`
        : `Rumus Pembentukan: ${item.title}`,
      breakdown: parts.length > 1 ? parts : [variant],
      note: idx === variants.length - 1 ? 'Perhatikan bentuk kata sebelum menyambungkannya dengan pola ini.' : undefined,
    };
  });
}

/** Kelas kata di awal varian rumus, untuk judul kartu ("Variasi 2 — dengan Kata Sifat-na"). */
function describeVariantWordClass(variant: string): string {
  if (/^Kata Kerja/.test(variant)) return 'Kata Kerja';
  if (/^Kata Sifat-i/.test(variant)) return 'Kata Sifat-i';
  if (/^Kata Sifat-na/.test(variant)) return 'Kata Sifat-na';
  if (/^Kata Benda/.test(variant)) return 'Kata Benda';
  if (/^(Kalimat|Klausa)/.test(variant)) return 'Kalimat';
  if (/^(Angka|Jumlah)/.test(variant)) return 'Angka/Jumlah';
  return '';
}

/**
 * Fallback generator for Node 4: Word Identity
 */
function generateFallbackWordIdentities(item: BunpouItem): GrammarSkillWordIdentity[] {
  const result: GrammarSkillWordIdentity[] = [];

  // Extract from curated connection conditions if present
  const curatedSubs = getCuratedSubFormulas(item);
  if (curatedSubs.length > 0) {
    const seen = new Set<string>();
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const sub of curatedSubs) {
      for (const cond of sub.connectionConditions) {
        if (!seen.has(cond.partOfSpeech)) {
          seen.add(cond.partOfSpeech);
          const isVerb = cond.partOfSpeech.toLowerCase().includes('kerja') || cond.partOfSpeech.includes('V') || cond.partOfSpeech.includes('動詞');
          const isNoun = cond.partOfSpeech.toLowerCase().includes('benda') || cond.partOfSpeech.includes('N') || cond.partOfSpeech.includes('名詞');
          const isAdj = cond.partOfSpeech.toLowerCase().includes('sifat') || cond.partOfSpeech.includes('A') || cond.partOfSpeech.includes('形容詞');

          let exampleList: string[] = [];
          if (cond.example) {
            const cleaned = cond.example.replace(/^[^:]+:\s*/, '').trim();
            const rawParts = cleaned.split(/[,、]/).map(s => s.trim()).filter(Boolean);
            if (rawParts.length > 0) {
              exampleList = rawParts;
            }
          }
          if (exampleList.length === 0) {
            exampleList = [cond.rule];
          }

          const letter = alphabet[result.length] || '•';
          result.push({
            typeCategory: `${letter}. ${cond.partOfSpeech}`,
            tagColor: isVerb ? 'emerald' : isNoun ? 'sky' : isAdj ? 'amber' : 'purple',
            icon: isVerb ? '🟢' : isNoun ? '🔵' : isAdj ? '🟡' : '🟣',
            examples: exampleList,
            functionEffect: `→ Aturan gabung: ${cond.rule}`,
          });
        }
      }
    }
  }

  if (result.length > 0) return result;

  // Tanpa aturan sambung yang ditulis khusus, bagian ini tidak ditampilkan. Daftar generik
  // "kata kerja / kata benda & sifat" sebelumnya muncul juga pada pola yang tidak bisa disambung ke kelas kata itu.
  return result;
}

/**
 * Fallback generator for Node 5: Nuance
 */
function generateFallbackNuances(item: BunpouItem): GrammarSkillNuance[] {
  if (item.comparisonNotes && item.comparisonNotes.length > 0) {
    return item.comparisonNotes.map((comp, idx) => ({
      contrastA: item.title,
      meaningA: item.meaningId,
      contrastB: comp.targetGrammar,
      meaningB: comp.difference,
      // Nuansa umum cukup ditampilkan sekali; perbedaan spesifik sudah ada di meaningB.
      explanation: idx === 0 ? item.nuance : undefined,
    }));
  }

  // Tanpa catatan perbandingan yang ditulis khusus, bagian "Jangan Sampai Tertukar" tidak ditampilkan.
  // Dulu diisi pembanding palsu ("Bentuk Biasa Tanpa Pola") yang tidak membedakan apa pun.
  return [];
}

/**
 * Fallback generator for Node 6: Tiered Examples
 * Guarantees at least 3 distinct tiered examples by supplementing from authored questions if needed.
 */
function generateFallbackExamples(item: BunpouItem): TieredExampleSentence[] {
  const existingList: Array<{ japanese: string; reading: string; meaningId: string }> =
    item.examples && item.examples.length > 0
      ? item.examples.map(ex => {
          let m = ex.meaningId || (ex as any).id;
          if (!m || m.startsWith('Contoh penggunaan pola')) {
            m = `Contoh penerapan pola ${item.title}.`;
          }
          return {
            japanese: ex.japanese,
            reading: ex.reading || ex.japanese,
            meaningId: m,
          };
        })
      : [];

  // If fewer than 3 examples, supplement from item.questions only if it is a genuine fill-in sentence
  if (existingList.length < 3 && item.questions && item.questions.length > 0) {
    const seenJp = new Set(existingList.map(e => e.japanese.replace(/\s+/g, '')));
    for (const q of item.questions) {
      if (existingList.length >= 3) break;
      const prompt = q.prompt || '';
      
      // Must have a blank to fill
      const hasBlank = /[（(]\s*[)）]/.test(prompt);
      if (!hasBlank) continue;

      // Must NOT be a meta prompt or question in Indonesian or Japanese question instruction
      if (/^(Apa|Pilihlah|Manakah|Bagaimana|Pernyataan|Kaidah|文の適切な形)/i.test(prompt)) continue;

      // Must contain Japanese characters
      if (!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(prompt)) continue;

      const qAny = q as any;
      const correctIdx = q.correctIndex ?? qAny.correct_answer ?? 0;
      const chosenOpt = (q.options && q.options[correctIdx]) ? q.options[correctIdx] : '';
      const fullJp = prompt.replace(/[（(]\s*[)）]/, chosenOpt).trim();

      if (fullJp && !seenJp.has(fullJp.replace(/\s+/g, '')) && !fullJp.includes('（')) {
        seenJp.add(fullJp.replace(/\s+/g, ''));
        const fullRuby = (q.ruby || '').replace(/[（(]\s*[)）]/, chosenOpt).trim();
        let meaning = '';
        const mMatch = (q.explanation || '').match(/Arti kalimat:\s*[\"“](.*?)[\"”]/i);
        if (mMatch && mMatch[1]) {
          meaning = mMatch[1];
        } else {
          const lines = (q.explanation || '').split('\n').map(l => l.trim()).filter(Boolean);
          const found = lines.find(l => !l.startsWith('Jawaban') && !l.startsWith('Kaidah') && !l.startsWith('Pola') && !l.includes('Rumus:'));
          meaning = found || `Contoh penerapan pola ${item.title}.`;
        }

        existingList.push({
          japanese: fullJp,
          reading: fullRuby || fullJp,
          meaningId: meaning,
        });
      }
    }
  }

  // Only return genuine, authentic examples. Never generate artificial dummy placeholders.
  const tiers: ('basic' | 'daily' | 'natural')[] = ['basic', 'daily', 'natural'];
  const tierLabels = [
    'Level 1: Sederhana (Pondasi)',
    'Level 2: Sehari-hari (Percakapan)',
    'Level 3: Alami (Ekspresi Wajar)',
  ];

  return existingList.slice(0, 3).map((ex, idx) => ({
    tier: tiers[idx] || 'daily',
    tierLabel: tierLabels[idx] || `Level ${idx + 1}`,
    japanese: ex.japanese,
    reading: ex.reading || ex.japanese,
    meaningId: ex.meaningId,
  }));
}

/**
 * Fallback generator for Node 7: Training Questions
 */
function generateFallbackQuestions(item: BunpouItem): Question[] {
  const patternTitle = item.title.split(/[(（＋／]/)[0].trim();
  const cleanedPattern = patternTitle.replace(/^[〜~]/, '');
  const examples = item.examples && item.examples.length > 0 ? item.examples : [];
  const ex = examples[0];

  const prompt = ex && ex.japanese.includes(cleanedPattern)
    ? ex.japanese.replace(cleanedPattern, '（　）')
    : `文の（　）に「${cleanedPattern}」を入れる場合、最も適切な意味を選びなさい。`;

  return [
    {
      id: `quest_${item.id}_1`,
      instruction: '文の（　）に入れるのに最もよいものを、一つえらびなさい。',
      instructionId: 'Pilihlah bentuk pola atau kata yang paling tepat untuk melengkapi kalimat berikut:',
      prompt,
      ruby: ex?.reading,
      options: [
        cleanedPattern,
        `〜${cleanedPattern}ない`,
        `〜${cleanedPattern}すぎる`,
        `〜${cleanedPattern}そう`,
      ],
      correctIndex: 0,
      explanation: `Jawaban tepat adalah 「${cleanedPattern}」. Makna pola ini adalah: ${item.meaningId}.`,
    }
  ];
}

/**
 * Helper to derive category tags for the Bunpou list card
 */
export function getBunpouCategoryTags(item: BunpouItem): string[] {
  if (item.tags && item.tags.length > 0) {
    return item.tags;
  }

  const tags: string[] = [];

  if (item.functions && item.functions.length > 0) {
    for (const fn of item.functions) {
      const match = fn.match(/\((.*?)\)/);
      if (match && match[1]) {
        tags.push(match[1].trim());
      } else {
        const clean = fn.split(/[ （]/)[0].trim();
        if (clean) tags.push(clean);
      }
    }
  }

  return Array.from(new Set(tags)).slice(0, 3);
}
