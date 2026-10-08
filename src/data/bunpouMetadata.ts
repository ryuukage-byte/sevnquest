import { BunpouItem, GrammarComparison } from '../types/content';
import bunpouCuratedDict from './bunpouCuratedDict.json';

export interface BunpouMetadata {
  functions: string[];
  nuance: string;
  relatedKeywords: string[];
  baseLevel: 'N5' | 'N4' | 'N3' | 'N2';
  comparisonNotes?: GrammarComparison[];
  keyTakeaway?: string;
  beforeState?: string;
  afterState?: string;
  naturalMeaning?: string;
}

/**
 * Curated metadata dictionary for JLPT N3 grammar items,
 * matching official textbook and exam functional categories.
 */
const CURATED_BUNPOU_METADATA: Record<string, BunpouMetadata> = {
  // ── Week 1 Day 3 Grammar 1: 女みたいだ ──
  w1d3g1: {
    functions: ['推測 (dugaan)', '比喩 (perumpamaan)', '類似 (kemiripan)'],
    nuance: 'Berdasarkan apa yang terlihat atau dirasakan langsung oleh panca indra pembicara. Bernuansa santai dan percakapan lisan (話し言葉).',
    relatedKeywords: ['推測', '似ている', 'まるで', 'どうやら', '様子'],
    baseLevel: 'N4',
    comparisonNotes: [
      {
        targetGrammar: '〜ようだ',
        difference: 'みたいだ lebih santai/lisan dan menyambung langsung ke kata benda tanpa の (女みたい). Sedangkan ようだ lebih formal/tertulis dan memerlukan partikel の (女のようだ).',
      },
      {
        targetGrammar: '〜そうだ',
        difference: 'そうだ (kelihatan akan / sepertinya) didasarkan pada tanda visual sekilas sesaat sebelum kejadian (雨が降りそうだ). Sedangkan みたいだ adalah kesimpulan atau dugaan menyeluruh (雨が降るみたいだ).',
      },
      {
        targetGrammar: '〜らしい',
        difference: 'らしい menekankan informasi dari luar/pihak ketiga atau karakteristik sejati (春らしい). Sedangkan みたいだ menyatakan kemiripan atau perumpamaan subjektif pembicara.',
      },
    ],
  },

  // ── Week 1 Day 1 Grammar 1: 書かれている ──
  w1d1g1: {
    functions: ['受身 (pasif)', '事実描写 (fakta objektif)'],
    nuance: 'Menyatakan fakta, tradisi, atau pengetahuan umum tanpa perlu menyebutkan siapa pelaku spesifiknya.',
    relatedKeywords: ['受身', '事実', '言われている', '作られた'],
    baseLevel: 'N4',
  },

  // ── Week 1 Day 1 Grammar 2: 赤ちゃんに泣かれた ──
  w1d1g2: {
    functions: ['迷惑受身 (pasif kerugian / kesulitan)'],
    nuance: 'Menyatakan bahwa pembicara merasa sangat terganggu, repot, atau dirugikan akibat tindakan orang/hal lain.',
    relatedKeywords: ['迷惑', '困る', '降られた', '泣かれた'],
    baseLevel: 'N4',
    comparisonNotes: [
      {
        targetGrammar: 'Kalimat Aktif (赤ちゃんが泣いた)',
        difference: 'Kalimat aktif hanya menyatakan peristiwa bayi menangis. Bentuk 泣かれた menegaskan bahwa pembicara merasa kerepotan/terganggu akibat tangisan tersebut.',
      },
    ],
  },

  // ── Week 1 Day 1 Grammar 3: 早く帰らせてください ──
  w1d1g3: {
    functions: ['許可 (meminta izin)', '使役 (kausatif)'],
    nuance: 'Meminta izin secara sopan kepada pihak lain agar pembicara sendiri yang diperbolehkan melakukan tindakan.',
    relatedKeywords: ['許可', '頼む', '休ませて', '言わせて'],
    baseLevel: 'N4',
    comparisonNotes: [
      {
        targetGrammar: '〜てください',
        difference: 'Vてください meminta lawan bicara melakukan aksi (contoh: 帰ってください = silakan Anda pulang). Sedangkan V(さ)せてください meminta izin agar pembicara yang pulang (izinkan saya pulang).',
      },
    ],
  },

  // ── Week 1 Day 2 Grammar 1: もう寝ないと ──
  w1d2g1: {
    functions: ['義務 (keharusan)', '日常会話 (percakapan lisan)'],
    nuance: 'Bentuk singkatan kasual dari 〜なければならない. Menyatakan keharusan yang mendesak atau berbicara pada diri sendiri.',
    relatedKeywords: ['なければならない', '急ぐ', '宿題', 'もう時間'],
    baseLevel: 'N4',
  },

  // ── Week 1 Day 2 Grammar 2: 食べちゃった ──
  w1d2g2: {
    functions: ['完了 (ketuntasan)', '後悔 (penyesalan)', '日常会話'],
    nuance: 'Bentuk percakapan dari Vてしまう. Menyatakan tindakan sudah selesai secara tuntas atau ada rasa bersalah/menyesal.',
    relatedKeywords: ['てしまう', 'うっかり', '忘れる', '飲む'],
    baseLevel: 'N4',
  },

  // ── Week 1 Day 3 Grammar 2: 春らしい ──
  w1d3g2: {
    functions: ['典型 (khas/otentik)', '様子 (kesan sejati)'],
    nuance: 'Menunjukkan bahwa sesuatu benar-benar memiliki karakteristik sejati yang mencerminkan esensi aslinya.',
    relatedKeywords: ['典型', 'ふさわしい', '男らしい', '学生らしく'],
    baseLevel: 'N3',
    comparisonNotes: [
      {
        targetGrammar: '〜みたいだ',
        difference: 'みたいだ bermakna "mirip padahal bukan" (laki-laki berpenampilan mirip wanita: 女みたい). Sedangkan らしい bermakna "khas sesuai status aslinya" (wanita yang benar-benar feminin: 女らしい).',
      },
    ],
  },

  // ── Week 1 Day 3 Grammar 3: 大人っぽい ──
  w1d3g3: {
    functions: ['傾向 (kecenderungan)', '様子 (kesan lahiriah)'],
    nuance: 'Menyatakan kesan fisik atau kecenderungan sifat yang terlihat dari luar. Kadang bernuansa sedikit negatif jika dipadukan dengan kata sifat.',
    relatedKeywords: ['っぽい', '子供っぽい', '安っぽい', '怒りっぽい'],
    baseLevel: 'N3',
    comparisonNotes: [
      {
        targetGrammar: '〜らしい',
        difference: 'らしい memuji sifat positif yang selayaknya (大人らしい = bersikap bijak layaknya orang dewasa). Sedangkan っぽい bernada pengamatan lahiriah sekilas (大人っぽい = berdandan/bergaya seperti orang dewasa).',
      },
    ],
  },

  // ── Week 1 Day 4 Grammar 1: 忘れ物をしないようにしましょう ──
  w1d4g1: {
    functions: ['努力 (usaha sadar)', '習慣 (pembiasaan)'],
    nuance: 'Menunjukkan usaha sadar yang dilakukan secara terus-menerus untuk menjaga suatu kebiasaan baik.',
    relatedKeywords: ['努力', '習慣', '心がける', '毎日'],
    baseLevel: 'N4',
  },

  // ── Week 1 Day 4 Grammar 2: 聞こえるように話す ──
  w1d4g2: {
    functions: ['目的 (tujuan)'],
    nuance: 'Melakukan tindakan dengan tujuan mencapai suatu kondisi yang berada di luar kontrol langsung pembicara (memakai kata kerja potensial/non-volitional).',
    relatedKeywords: ['目的', 'ために', '聞こえる', '忘れない'],
    baseLevel: 'N4',
    comparisonNotes: [
      {
        targetGrammar: '〜ために',
        difference: 'ために digunakan bila kedua klausa menggunakan kata kerja kehendak/sengaja (volitional). Sedangkan ように digunakan jika klausa tujuan menyatakan keadaan yang tidak bisa dikontrol langsung (potensial/non-volitional).',
      },
    ],
  },

  // ── Week 1 Day 4 Grammar 3: 使えるようになった ──
  w1d4g3: {
    functions: ['変化 (perubahan kemampuan / kondisi)'],
    nuance: 'Menyatakan transisi keadaan dari yang semula tidak bisa atau belum terjadi, kini menjadi bisa/terbiasa.',
    relatedKeywords: ['変化', '可能', '話せる', '直る'],
    baseLevel: 'N4',
  },

  // ── Week 2 Day 1 Grammar 1: 女性ばかり ──
  w2d1g1: {
    functions: ['限定 (pembatasan)', '強調 (penekanan)', '不満 (keluhan)'],
    nuance: 'Menyatakan jumlah yang berlebihan dan hanya hal itu melulu. Jika dipakai dengan Vてばかりいる, sering mengandung nada kritik atau teguran.',
    relatedKeywords: ['ばかり', 'だけ', ' melulu', '遊んでばかり'],
    baseLevel: 'N4',
    comparisonNotes: [
      {
        targetGrammar: '〜だけ',
        difference: 'だけ bersifat netral objektif ("hanya ini saja"). Sedangkan ばかり bernuansa subjektif bahwa jumlahnya terlalu banyak dan melulu hal itu saja.',
      },
    ],
  },

  // ── Week 2 Day 2 Grammar 1: その事件に関して ──
  w2d2g1: {
    functions: ['関連 (kaitan topik)', '硬い表現 (formal / tertulis)'],
    nuance: 'Ragam bahasa tertulis atau formal untuk mengangkat topik bahasan, investigasi, atau wacana yang luas.',
    relatedKeywords: ['関する', 'について', '問題', '調査'],
    baseLevel: 'N3',
    comparisonNotes: [
      {
        targetGrammar: '〜について',
        difference: 'について lebih umum dan dapat digunakan dalam percakapan lisan santai. Sedangkan に関して lebih formal, bernuansa akademis atau berita jurnalistik.',
      },
    ],
  },

  // ── Week 2 Day 2 Grammar 4: Nによって ──
  w2d2g4: {
    functions: ['手段 (sarana / cara)', '原因 (penyebab)', '個別性 (tergantung kasus)'],
    nuance: 'Pola multifungsi formal untuk menunjukkan penyebab peristiwa, metode/sarana yang digunakan, atau perbedaan menurut kategori ("tergantung pada...").',
    relatedKeywords: ['原因', '手段', '人によって', '違う'],
    baseLevel: 'N3',
  },

  // ── Week 3 Day 3 Grammar 2: はずだ ──
  w3d3g2: {
    functions: ['確信 (keyakinan logis)', '当然 (sewajarnya)'],
    nuance: 'Menyatakan keyakinan kuat pembicara bahwa sesuatu seharusnya terjadi berdasarkan alasan logis atau fakta yang ada.',
    relatedKeywords: ['確信', '当然', '予定', 'はずがない'],
    baseLevel: 'N4',
    comparisonNotes: [
      {
        targetGrammar: '〜わけだ',
        difference: 'わけだ menyatakan pemahaman/konfirmasi logis setelah mendengar alasannya ("pantas saja demikian"). Sedangkan はずだ adalah prediksi berdasarkan perhitungan/jadwal ("seharusnya begitu").',
      },
    ],
  },

  // ── Week 3 Day 3 Grammar 3: べきだ ──
  w3d3g3: {
    functions: ['義務 (kewajiban moral)', '助言 (anjuran keras)'],
    nuance: 'Menyatakan hal yang secara norma moral, etika, atau akal sehat umum sudah sepantasnya dilakukan.',
    relatedKeywords: ['当然', '義務', 'するべき', '約束'],
    baseLevel: 'N3',
    comparisonNotes: [
      {
        targetGrammar: '〜なければならない',
        difference: 'なければならない menyatakan aturan hukum atau keharusan objektif. Sedangkan べきだ adalah pertimbangan moral atau penilaian etika pembicara.',
      },
    ],
  },

  // ── Week 5 Day 2 Grammar 1: 上げる／上がる ──
  w5d2g1: {
    functions: ['完了 (penyelesaian tuntas)', '達成 (pencapaian)'],
    nuance: 'Menyatakan suatu karya atau pekerjaan besar yang akhirnya berhasil diselesaikan setelah mencurahkan tenaga penuh.',
    relatedKeywords: ['完成', '仕上げる', '論文', '焼き上がる'],
    baseLevel: 'N3',
  },

  // ── Week 5 Day 2 Grammar 2: 切る／切れる／切れない ──
  w5d2g2: {
    functions: ['極限 (ketuntasan total)', '限界 (batas kemampuan)'],
    nuance: 'Menghabiskan atau menyelesaikan suatu hal sampai batas akhir tanpa menyisakan apa pun. Dalam bentuk 切れない, menyatakan jumlahnya melampaui kemampuan.',
    relatedKeywords: ['最後まで', '限界', '使い切る', '数え切れない'],
    baseLevel: 'N3',
  },

  // ── Week 6 Day 4 Grammar 2: わけだ ──
  w6d4g2: {
    functions: ['納得 (pemahaman wajar)', '必然 (kesimpulan logis)'],
    nuance: 'Menyatakan pemahaman logis setelah mengetahui alasannya ("pantas saja...", "tentu saja wajar jika...").',
    relatedKeywords: ['納得', '理由', 'なるほど', '道理で'],
    baseLevel: 'N3',
  },

  // ── Week 6 Day 4 Grammar 3: わけではない ──
  w6d4g3: {
    functions: ['部分否定 (penolakan sebagian)', '弁解 (penjelasan)'],
    nuance: 'Menolak generalisasi atau asumsi lawan bicara bahwa situasinya 100% seperti itu ("bukan berarti selalu...", "tidak sepenuhnya...").',
    relatedKeywords: ['部分否定', '必ずしも', '嫌いなわけではない'],
    baseLevel: 'N3',
  },

  // ── Week 6 Day 4 Grammar 4: わけがない ──
  w6d4g4: {
    functions: ['強い否定 (penolakan tegas / kemustahilan)'],
    nuance: 'Menyatakan secara sangat tegas dan mutlak bahwa secara akal sehat atau logika hal tersebut tidak mungkin terjadi.',
    relatedKeywords: ['絶対にない', 'あり得ない', '信じられない'],
    baseLevel: 'N3',
  },

  // ── 一番 (Paling / Ter- / Superlatif N5) ──
  bp_n5_003: {
    functions: ['程度・比較 (Tingkat Derajat & Perbandingan)'],
    nuance: 'Menyatakan tingkat paling tinggi (superlatif / "paling ~") di antara anggota suatu kelompok atau kategori perbandingan.',
    relatedKeywords: ['一番', '最も', 'の中で', '最高', '比べ'],
    baseLevel: 'N5',
    comparisonNotes: [
      {
        targetGrammar: '〜より〜のほうが (Komparatif)',
        difference: '「A より B のほうが〜」 membandingkan 2 hal (B lebih ~ dibanding A). Sedangkan 「一番」 menyatakan satu yang paling unggul di antara seluruh anggota kelompok (3 hal atau lebih).',
      },
      {
        targetGrammar: '最も (Mottomo)',
        difference: 'Keduanya bermakna "paling/ter-", namun 「最も」 bernuansa formal/tertulis/akademis, sedangkan 「一番」 umum dan natural digunakan dalam percakapan lisan sehari-hari.',
      },
    ],
  },

  // ── 〜の中で〜が一番 (Paling ~ di Dalam Grup N5) ──
  bp_n5_095: {
    functions: ['程度・比較 (Tingkat Derajat & Perbandingan)'],
    nuance: 'Menyebutkan lingkup kelompok/kategori dengan 「〜の中で」 lalu menunjuk objek yang paling unggul dengan 「〜が一番」.',
    relatedKeywords: ['の中で', '一番', 'グループ', '比較'],
    baseLevel: 'N5',
    comparisonNotes: [
      {
        targetGrammar: '〜と〜と どちらが〜 (Pilihan 2 Objek)',
        difference: 'Jika memilih di antara 2 objek, gunakan 「A と B と どちらが〜」. Jika memilih yang nomor satu di antara 3 objek atau lebih, gunakan 「〜の中で〜が一番〜」.',
      },
    ],
  },
};

/**
 * Functional category classification for fallback automatic enrichment
 */
interface WeekDayFunctionMapping {
  functions: string[];
  nuance: string;
  relatedKeywords: string[];
  baseLevel: 'N5' | 'N4' | 'N3' | 'N2';
}

const CATEGORY_MAP: Record<string, WeekDayFunctionMapping> = {
  // Week 1
  w1d1: {
    functions: ['受身・許可 (Bentuk Pasif & Izin)'],
    nuance: 'Menyatakan tindakan pasif dari sudut pandang pembicara atau permohonan izin.',
    relatedKeywords: ['受身', '許可', '迷惑'],
    baseLevel: 'N4',
  },
  w1d2: {
    functions: ['日常会話・短縮 (Percakapan Sehari-hari)'],
    nuance: 'Bentuk singkatan kasual yang sangat umum dalam percakapan lisan akrab.',
    relatedKeywords: ['話し言葉', '短縮', '会話'],
    baseLevel: 'N4',
  },
  w1d3: {
    functions: ['推測・比喩 (Dugaan & Perumpamaan)'],
    nuance: 'Menyatakan kesan perbandingan, kemiripan sifat, atau dugaan pembicara.',
    relatedKeywords: ['推測', '比喩', '様子'],
    baseLevel: 'N3',
  },
  w1d4: {
    functions: ['努力・変化・目的 (Usaha & Perubahan)'],
    nuance: 'Menyatakan tujuan tindakan, usaha sadar, atau transisi perubahan kemampuan.',
    relatedKeywords: ['目的', '変化', '努力'],
    baseLevel: 'N4',
  },
  w1d5: {
    functions: ['祈願・指示 (Harapan & Arahan Halus)'],
    nuance: 'Menyatakan permohonan doa/harapan atau instruksi yang disampaikan secara santun.',
    relatedKeywords: ['希望', '祈願', '指示'],
    baseLevel: 'N4',
  },
  w1d6: {
    functions: ['意志・試み (Niat & Upaya Tindakan)'],
    nuance: 'Menunjukkan niat kuat pembicara atau momen hendak memulai suatu tindakan.',
    relatedKeywords: ['意志', '決意', '試み'],
    baseLevel: 'N4',
  },

  // Week 2
  w2d1: {
    functions: ['限定・強調 (Pembatasan & Penekanan)'],
    nuance: 'Menegaskan fokus atau membatasi cakupan hanya pada hal tersebut secara mencolok.',
    relatedKeywords: ['限定', '強調', '特別'],
    baseLevel: 'N3',
  },
  w2d2: {
    functions: ['関連・情報源・手段 (Kaitan Topik & Sarana)'],
    nuance: 'Menghubungkan tema bahasan, menyebutkan sumber informasi, atau sarana tindakan.',
    relatedKeywords: ['関連', '情報源', '手段'],
    baseLevel: 'N3',
  },
  w2d3: {
    functions: ['名詞化 (Pembentukan Nomina / Sifat)'],
    nuance: 'Mengubah kata sifat atau klausa menjadi kata benda untuk dianalisis atau dinilai.',
    relatedKeywords: ['名詞化', '程度', '性質'],
    baseLevel: 'N3',
  },
  w2d4: {
    functions: ['定義・説明 (Definisi & Penjelasan)'],
    nuance: 'Menyebutkan nama, mendefinisikan makna kata, atau mengutip konsep abstrak.',
    relatedKeywords: ['定義', '説明', '名前'],
    baseLevel: 'N3',
  },
  w2d5: {
    functions: ['評価・引用 (Penilaian & Sudut Pandang)'],
    nuance: 'Mengoreksi ungkapan kata atau mengomentari topik yang sedang dibicarakan.',
    relatedKeywords: ['言い換え', '評価', '条件'],
    baseLevel: 'N3',
  },
  w2d6: {
    functions: ['間接引用 (Penyampaian Instruksi)'],
    nuance: 'Menyampaikan kembali nasihat, perintah, atau teguran yang diterima dari orang lain.',
    relatedKeywords: ['引用', '注意', '頼む'],
    baseLevel: 'N3',
  },

  // Week 3
  w3d1: {
    functions: ['逆接・譲歩 (Pertentangan & Walaupun)'],
    nuance: 'Menyatakan bahwa hasil tetap sama meskipun kondisi atau upaya yang dilakukan berat.',
    relatedKeywords: ['逆接', '譲歩', 'たとえ'],
    baseLevel: 'N3',
  },
  w3d2: {
    functions: ['立場・基準・仮定 (Sudut Pandang & Standar)'],
    nuance: 'Menilai sesuatu dari posisi peran tertentu atau dibandingkan dengan standar umum.',
    relatedKeywords: ['立場', '基準', '仮定'],
    baseLevel: 'N3',
  },
  w3d3: {
    functions: ['確信・義務・追憶 (Keyakinan & Kewajiban)'],
    nuance: 'Menyatakan kepantasan moral, keyakinan logis, atau kenangan masa lalu.',
    relatedKeywords: ['義務', '確信', '当然', '思い出'],
    baseLevel: 'N3',
  },
  w3d4: {
    functions: ['時間・契機 (Waktu & Momen Terjadinya Aksi)'],
    nuance: 'Menunjukkan waktu yang tepat, momentum kebetulan, atau momen spontan.',
    relatedKeywords: ['時間', '契機', '瞬間'],
    baseLevel: 'N3',
  },
  w3d5: {
    functions: ['状態・継続 (Kondisi Berlanjut & Tanpa Perubahan)'],
    nuance: 'Membiarkan kondisi tetap seperti semula atau melakukan sesuatu persis seperti petunjuk.',
    relatedKeywords: ['状態', '継続', '通り'],
    baseLevel: 'N3',
  },
  w3d6: {
    functions: ['感情・様子 (Emosi Orang Lain & Penampilan)'],
    nuance: 'Menggambarkan perasaan pihak ketiga atau sikap yang berpura-pura.',
    relatedKeywords: ['感情', '様子', 'ふり'],
    baseLevel: 'N3',
  },

  // Week 4
  w4d1: {
    functions: ['評価・不満 (Evaluasi Sudut Pandang & Keluhan)'],
    nuance: 'Menyatakan penilaian dari sudut pandang seseorang atau mengkritik ketidaksesuaian.',
    relatedKeywords: ['評価', '不満', '批判'],
    baseLevel: 'N3',
  },
  w4d2: {
    functions: ['原因・理由・代替 (Sebab-Akibat & Pengganti)'],
    nuance: 'Menyebutkan faktor penyebab (positif/negatif) atau kompensasi pengganti.',
    relatedKeywords: ['原因', '理由', 'おかげ', 'せい'],
    baseLevel: 'N3',
  },
  w4d3: {
    functions: ['程度・比較 (Tingkat Derajat & Perbandingan)'],
    nuance: 'Menggambarkan perbandingan sebanding atau perkiraan derajat yang ekstrem.',
    relatedKeywords: ['程度', '比較', '比例'],
    baseLevel: 'N3',
  },
  w4d4: {
    functions: ['伝聞・助言・感嘆 (Kabar, Nasihat & Kekaguman)'],
    nuance: 'Menyampaikan informasi kabar burung, memberi nasihat penting, atau takjub.',
    relatedKeywords: ['伝聞', '忠告', '感嘆'],
    baseLevel: 'N3',
  },
  w4d5: {
    functions: ['日常会話・確認 (Percakapan Akrab & Konfirmasi)'],
    nuance: 'Mengingat kembali fakta lama atau beralasan secara manja/santai.',
    relatedKeywords: ['確認', '理由', '口語'],
    baseLevel: 'N3',
  },
  w4d6: {
    functions: ['接続詞 (Kata Penghubung Antar Kalimat)'],
    nuance: 'Menghubungkan dua kalimat untuk menunjukkan hasil logis atau penjelasan sebab.',
    relatedKeywords: ['接続', '論理', '展開'],
    baseLevel: 'N3',
  },

  // Week 5
  w5d1: {
    functions: ['添加・対比 (Penambahan & Kontras Komparasi)'],
    nuance: 'Bukan hanya A tetapi juga B, atau membandingkan dua subjek secara jelas.',
    relatedKeywords: ['添加', '対比', 'もちろん'],
    baseLevel: 'N3',
  },
  w5d2: {
    functions: ['完了・進展 (Tingkat Ketuntasan & Kondisi Aksi)'],
    nuance: 'Menunjukkan seberapa tuntas suatu tindakan diselesaikan atau baru saja terjadi.',
    relatedKeywords: ['完了', '極限', '新鮮'],
    baseLevel: 'N3',
  },
  w5d3: {
    functions: ['仮定・願望・後悔 (Pengandaian, Harapan & Penyesalan)'],
    nuance: 'Menyatakan harapan yang belum tentu terwujud atau penyesalan atas hal lampau.',
    relatedKeywords: ['願望', '後悔', '仮定'],
    baseLevel: 'N3',
  },
  w5d5: {
    functions: ['推測・極限仮定 (Dugaan Kuat & Pengandaian Ekstrem)'],
    nuance: 'Menyatakan dugaan dengan kemungkinan atau pengandaian kondisi mustahil.',
    relatedKeywords: ['推測', '仮定', '制限'],
    baseLevel: 'N3',
  },
  w5d6: {
    functions: ['接続詞 (Peralihan Alur Cerita)'],
    nuance: 'Menunjukkan pertentangan tak terduga dalam wacana teks.',
    relatedKeywords: ['接続詞', '展開', '意外'],
    baseLevel: 'N3',
  },

  // Week 6
  w6d1: {
    functions: ['仮定・条件 (Pengandaian Situasional)'],
    nuance: 'Membahas kemungkinan skenario masa depan atau situasi hipotetis.',
    relatedKeywords: ['条件', 'もし', '仮定'],
    baseLevel: 'N3',
  },
  w6d2: {
    functions: ['決定・習慣・部分肯定 (Ketetapan & Kebiasaan)'],
    nuance: 'Menyatakan aturan lembaga, komitmen pribadi, atau mengakui kebenaran sebagian.',
    relatedKeywords: ['決定', '習慣', 'ルール'],
    baseLevel: 'N3',
  },
  w6d3: {
    functions: ['局面・時間 (Momen Tepat Terjadinya Aksi)'],
    nuance: 'Menunjukkan fase sebelum, sedang, atau baru saja selesai melakukan tindakan.',
    relatedKeywords: ['局面', '直前', '最中'],
    baseLevel: 'N3',
  },
  w6d4: {
    functions: ['論理・必然・否定 (Logika Alasan & Penolakan Mutlak)'],
    nuance: 'Menjelaskan keniscayaan secara akal sehat atau menyangkal asumsi berlebihan.',
    relatedKeywords: ['論理', '必然', '否定'],
    baseLevel: 'N3',
  },
  w6d5: {
    functions: ['敬語 (Keigo Hormat & Rendah Diri)'],
    nuance: 'Ragam bahasa sopan formal untuk menghormati lawan bicara atau merendahkan diri.',
    relatedKeywords: ['尊敬語', '謙譲語', '敬意'],
    baseLevel: 'N3',
  },
  w6d6: {
    functions: ['ビジネス敬語 (Keigo Bisnis & Permintaan Formal)'],
    nuance: 'Ungkapan sangat halus untuk meminta persetujuan dalam situasi bisnis atau kerja.',
    relatedKeywords: ['ビジネス', '丁寧', '配慮'],
    baseLevel: 'N3',
  },
};

/**
 * Returns full metadata for any BunpouItem, combining curated data
 * and intelligent curriculum mapping.
 */
function getMetadataForBunpou(item: BunpouItem): BunpouMetadata {
  const curated = (bunpouCuratedDict as Record<string, any>)[item.id];
  if (CURATED_BUNPOU_METADATA[item.id]) {
    const base = CURATED_BUNPOU_METADATA[item.id];
    return {
      ...base,
      keyTakeaway: curated?.keyTakeaway || base.keyTakeaway,
      beforeState: curated?.beforeState || base.beforeState,
      afterState: curated?.afterState || base.afterState,
      naturalMeaning: curated?.meaning_id || base.naturalMeaning,
      nuance: curated?.nuance || base.nuance,
    };
  }

  // If item ID matches Week-Day convention (e.g. w1d3g1 -> w1d3)
  const match = item.id.match(/^(w\dd\d)/);
  if (match && CATEGORY_MAP[match[1]]) {
    const fallbackCategory = CATEGORY_MAP[match[1]];
    return {
      functions: fallbackCategory.functions,
      nuance: curated?.nuance || fallbackCategory.nuance,
      relatedKeywords: fallbackCategory.relatedKeywords,
      baseLevel: fallbackCategory.baseLevel,
      keyTakeaway: curated?.keyTakeaway,
      beforeState: curated?.beforeState,
      afterState: curated?.afterState,
      naturalMeaning: curated?.meaning_id,
    };
  }

  // Semantic metadata derivation for non-weekday items (bp_n5_..., bp_n4_..., etc.)
  // Never default to w1d1 (受身・許可)
  const title = item.title || '';
  const meaning = `${item.meaningId || ''} ${item.meaningEn || ''} ${item.explanation || ''}`.toLowerCase();
  const level = (item.level as 'N5' | 'N4' | 'N3' | 'N2') || 'N5';

  let derivedFunctions = [`文法パターン (Tata Bahasa ${level})`];
  let derivedNuance = item.meaningId
    ? `Pola kalimat untuk menyatakan: ${item.meaningId}.`
    : 'Penggunaan sesuai rumus dan konteks kalimat.';
  let derivedKeywords: string[] = [title.replace(/[〜~［］[\]]/g, '').trim()].filter(Boolean);

  if (/一番|最も|より|ほど|くらべ|superlative|compar|paling|ter-|banding/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['程度・比較 (Tingkat Derajat & Perbandingan)'];
    derivedNuance = 'Digunakan untuk menyatakan perbandingan atau tingkat derajat (komparatif / superlatif) di antara objek atau dalam kelompok.';
    derivedKeywords = ['一番', '最も', '比較', '程度'];
  } else if (/受身|られる|れる|passive|terkena|di-/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['受身・許可 (Bentuk Pasif & Izin)'];
    derivedNuance = 'Menyatakan tindakan pasif dari sudut pandang pembicara atau subjek.';
    derivedKeywords = ['受身', '迷惑', 'られる'];
  } else if (/使役|させる|causative|menyuruh/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['使役・使役受身 (Bentuk Kausatif & Paksaan)'];
    derivedNuance = 'Menunjukkan instruksi, membiarkan, atau menyuruh pihak lain melakukan aksi.';
    derivedKeywords = ['使役', '指示', 'させる'];
  } else if (/方|kata|cara|metode|how to|way of|prosedur|手段/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['方法・手段 (Cara & Metode)'];
    derivedNuance = 'Menunjukkan tata cara, metode, atau prosedur dalam melakukan suatu aktivitas (contoh: 使い方 = cara menggunakan, 作り方 = cara membuat).';
    derivedKeywords = ['方法', 'やり方', '手順'];
  } else if (/から|ので|ため|\b(reason|cause)\b|sebab|karena|alasan/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['原因・理由 (Sebab-Akibat & Alasan)'];
    derivedNuance = 'Menjelaskan faktor penyebab, alasan logis, atau motif di balik suatu peristiwa.';
    derivedKeywords = ['理由', '原因', 'わけ'];
  } else if (/たら|ば|なら|と|condition|if|kalau|jika|pengandaian/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['仮定・条件 (Pengandaian & Syarat)'];
    derivedNuance = 'Menyatakan hubungan syarat dan akibat dalam situasi tertentu atau skenario pengandaian.';
    derivedKeywords = ['条件', '仮定', 'もし'];
  } else if (/そう|よう|らしい|みたい|dugaan|tampak|sepertinya|kelihatannya|perumpamaan/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['推測・比喩 (Dugaan & Perumpamaan)'];
    derivedNuance = 'Menyatakan kesan visual, perkiraan berdasarkan pengamatan, atau perumpamaan sifat.';
    derivedKeywords = ['推測', '比喩', '様子'];
  } else if (/べき|なければ|ほうがいい|kewajiban|harus|sebaiknya|anjuran/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['義務・助言 (Kewajiban & Nasihat)'];
    derivedNuance = 'Menyatakan anjuran yang bermanfaat atau keharusan moral yang patut dilaksanakan.';
    derivedKeywords = ['義務', '助言', '提案'];
  } else if (/とき|あとで|まえに|ながら|waktu|ketika|sebelum|setelah|saat/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['時間・契機 (Waktu & Momen Aksi)'];
    derivedNuance = 'Menunjukkan titik waktu, urutan kejadian, atau aksi yang berlangsung simultan.';
    derivedKeywords = ['時間', '契機', '順序'];
  } else if (/てはいけない|てもいい|boleh|izin|dilarang/i.test(title + ' ' + meaning)) {
    derivedFunctions = ['受身・許可 (Bentuk Pasif & Izin)'];
    derivedNuance = 'Memberikan persetujuan izin melakukan aksi atau menyatakan batasan aturan.';
    derivedKeywords = ['許可', '禁止', 'ルール'];
  }

  return {
    functions: derivedFunctions,
    nuance: curated?.nuance || derivedNuance,
    relatedKeywords: derivedKeywords,
    baseLevel: level,
    keyTakeaway: curated?.keyTakeaway,
    beforeState: curated?.beforeState,
    afterState: curated?.afterState,
    naturalMeaning: curated?.meaning_id,
  };
}

/**
 * Enriches a BunpouItem with full pedagogical metadata (functions, nuance, keywords, base level, key takeaways).
 */
export function enrichBunpouItem(item: BunpouItem): BunpouItem {
  const meta = getMetadataForBunpou(item);
  return {
    ...item,
    meaningId: meta.naturalMeaning || item.meaningId,
    functions: meta.functions,
    nuance: meta.nuance,
    relatedKeywords: meta.relatedKeywords,
    baseLevel: meta.baseLevel,
    comparisonNotes: meta.comparisonNotes || item.comparisonNotes,
    keyTakeaway: meta.keyTakeaway || item.keyTakeaway,
    beforeState: meta.beforeState || item.beforeState,
    afterState: meta.afterState || item.afterState,
  };
}

/**
 * Unique list of all available function categories across all grammar items.
 */
export const ALL_GRAMMAR_FUNCTION_CATEGORIES = [
  'Semua Fungsi',
  '程度・比較 (Tingkat Derajat & Perbandingan)',
  '推測・比喩 (Dugaan & Perumpamaan)',
  '限定・強調 (Pembatasan & Penekanan)',
  '関連・情報源・手段 (Kaitan Topik & Sarana)',
  '受身・許可 (Bentuk Pasif & Izin)',
  '原因・理由・代替 (Sebab-Akibat & Pengganti)',
  '逆接・譲歩 (Pertentangan & Walaupun)',
  '時間・契機 (Waktu & Momen Aksi)',
  '仮定・条件 (Pengandaian & Syarat)',
  '完了・進展 (Tingkat Ketuntasan Aksi)',
  '論理・必然・否定 (Logika Alasan & Penolakan)',
  '義務・助言 (Kewajiban & Nasihat)',
  '努力・変化・目的 (Usaha & Perubahan)',
  '日常会話・短縮 (Percakapan Sehari-hari)',
  '敬語 (Bahasa Sopan & Bisnis)',
];
