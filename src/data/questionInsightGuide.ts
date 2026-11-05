// Data kurasi "Bedah Soal": panduan per jenis soal (問題), istilah di kalimat perintah,
// fungsi partikel, dan arti bentuk konjugasi. Semua teks ditulis manual — engine hanya memilih
// entri yang cocok, tidak mengarang penjelasan.

export type QuestionKind =
  | 'reading' // 漢字読み
  | 'writing' // 表記
  | 'context' // 文脈規定
  | 'synonym' // 言い換え類義
  | 'usage' // 用法
  | 'grammar' // 文法形式の判断
  | 'star' // 文の組み立て
  | 'wordMeaning' // arti kata dalam kalimat (Bank Kanji)
  | 'onkun' // on'yomi / kun'yomi kanji (Bank Kanji)
  | 'kanjiMeaning' // arti kanji (Bank Kanji)
  | 'patternMeaning'; // arti pola (Bank Tata Bahasa)

export interface MondaiGuide {
  ja: string;
  reading: string;
  /** Nama jenis soal dalam bahasa Indonesia. */
  name: string;
  /** Apa yang diuji soal ini. */
  asks: string;
  /** Terjemahan perintah baku bila kalimat perintahnya berbahasa Jepang. */
  instructionId: string;
  strategy: string[];
  /** Apakah jenis ini muncul sebagai 問題 di JLPT (bukan latihan bank). */
  jlpt: boolean;
}

export const MONDAI_GUIDE: Record<QuestionKind, MondaiGuide> = {
  reading: {
    ja: '漢字読み',
    reading: 'かんじよみ',
    name: 'Cara Baca Kanji',
    asks: 'Memilih cara baca hiragana yang benar untuk kata berkanji yang ditandai (bergaris bawah).',
    instructionId: 'Pilih cara baca kata yang ditandai yang paling tepat dari pilihan 1–4.',
    strategy: [
      'Baca seluruh kalimat dulu. Konteks memastikan kata apa yang dimaksud.',
      'Bandingkan pilihan huruf demi huruf. Pilihan di soal ini sering hanya berbeda satu bunyi.',
      'Waspadai tenten (゛) dan maru (゜), vokal panjang (こう vs こ), つ kecil (っ), serta ゃ・ゅ・ょ kecil.',
      'Kanji yang sama bisa punya bacaan on dan kun yang berbeda. Pastikan bacaan mana yang dipakai di kata ini.',
    ],
    jlpt: true,
  },
  writing: {
    ja: '表記',
    reading: 'ひょうき',
    name: 'Penulisan Kanji',
    asks: 'Memilih penulisan kanji yang benar untuk kata hiragana yang ditandai.',
    instructionId: 'Pilih penulisan kanji yang paling tepat untuk kata yang ditandai.',
    strategy: [
      'Tentukan dulu arti kata itu dari konteks kalimat.',
      'Pengecoh biasanya memakai kanji yang bunyinya sama atau bentuknya mirip.',
      'Cek arti tiap kanji. Kanji yang benar maknanya cocok dengan arti kata.',
    ],
    jlpt: true,
  },
  context: {
    ja: '文脈規定',
    reading: 'ぶんみゃくきてい',
    name: 'Konteks Kosakata',
    asks: 'Memilih kata yang paling cocok untuk mengisi bagian kosong sesuai konteks kalimat.',
    instructionId: 'Pilih kata yang paling tepat untuk mengisi （　）.',
    strategy: [
      'Pahami arti kalimat secara utuh, terutama kata tepat sebelum dan sesudah bagian kosong.',
      'Perhatikan pasangan kata yang lazim dipakai bersama (kolokasi), misalnya 電話を「かける」.',
      'Semua pilihan biasanya benar secara tata bahasa. Yang membedakan adalah artinya.',
    ],
    jlpt: true,
  },
  synonym: {
    ja: '言い換え類義',
    reading: 'いいかえるいぎ',
    name: 'Sinonim / Semakna',
    asks: 'Memilih kata atau ungkapan yang artinya paling dekat dengan kata yang ditandai.',
    instructionId: 'Pilih kata yang artinya paling dekat dengan kata yang ditandai.',
    strategy: [
      'Cari arti kata yang ditandai, lalu bandingkan dengan arti tiap pilihan.',
      'Ganti kata yang ditandai dengan pilihan jawaban. Kalimatnya harus tetap bermakna sama.',
      'Pengecoh sering berasal dari tema yang sama tetapi artinya berbeda.',
    ],
    jlpt: true,
  },
  usage: {
    ja: '用法',
    reading: 'ようほう',
    name: 'Penggunaan Kata',
    asks: 'Memilih kalimat yang memakai kata yang diuji dengan benar.',
    instructionId: 'Pilih kalimat yang memakai kata berikut dengan paling tepat.',
    strategy: [
      'Ingat arti inti kata itu dan kata-kata yang biasa menyertainya.',
      'Coba ganti kata itu dengan padanan Indonesianya di setiap kalimat. Kalimat yang terasa janggal bisa dicoret.',
      'Pengecoh sering memakai kata itu dengan arti yang mirip tetapi tidak tepat.',
    ],
    jlpt: true,
  },
  grammar: {
    ja: '文法形式の判断',
    reading: 'ぶんぽうけいしきのはんだん',
    name: 'Pola & Konjugasi',
    asks: 'Memilih pola tata bahasa, partikel, atau bentuk kata yang paling tepat untuk bagian kosong.',
    instructionId: 'Pilih bentuk yang paling tepat untuk mengisi （　） dalam kalimat berikut.',
    strategy: [
      'Lihat apa yang ada tepat sebelum bagian kosong (bentuk kata kerja, kata benda, partikel) dan apa yang mengikutinya.',
      'Tentukan hubungan makna antarbagian kalimat: sebab-akibat, pertentangan, syarat, perubahan, dan seterusnya.',
      'Cocokkan bentuk sambungan pola dengan kata sebelum bagian kosong.',
    ],
    jlpt: true,
  },
  star: {
    ja: '文の組み立て',
    reading: 'ぶんのくみたて',
    name: 'Susun Kalimat (★)',
    asks: 'Menyusun empat potongan menjadi kalimat yang benar, lalu memilih potongan yang jatuh di posisi ★.',
    instructionId: 'Susun potongan kalimat, lalu pilih potongan yang masuk ke posisi ★.',
    strategy: [
      'Pasangkan dulu potongan yang pasti tersambung, misalnya kata benda + partikel, atau bentuk kata kerja + pola.',
      'Perhatikan kata tepat sebelum dan sesudah keempat kotak. Potongan pertama dan terakhir harus tersambung dengannya.',
      'Setelah urutan lengkap, baca ulang kalimatnya, baru hitung posisi ★.',
    ],
    jlpt: true,
  },
  wordMeaning: {
    ja: '語の意味',
    reading: 'ごのいみ',
    name: 'Arti Kata',
    asks: 'Menentukan arti kata yang ditandai sesuai konteks kalimat.',
    instructionId: 'Pilih arti kata yang ditandai sesuai konteks kalimat.',
    strategy: [
      'Arti kata bisa bergantung pada konteks. Baca seluruh kalimat dulu.',
      'Pecah kata menjadi kanji penyusunnya. Arti tiap kanji membantu menebak arti kata.',
    ],
    jlpt: false,
  },
  onkun: {
    ja: '音読み・訓読み',
    reading: 'おんよみ・くんよみ',
    name: 'Bacaan Kanji',
    asks: 'Menentukan bacaan on’yomi atau kun’yomi sebuah kanji.',
    instructionId: 'Pilih bacaan kanji yang diminta.',
    strategy: [
      'On’yomi berasal dari bacaan Tiongkok dan biasanya dipakai di kata gabungan kanji (熟語).',
      'Kun’yomi adalah bacaan asli Jepang dan sering diikuti okurigana (kana pengiring), misalnya 食べる.',
      'Pengecoh biasanya bacaan kanji lain, atau jenis bacaan lain dari kanji yang sama.',
    ],
    jlpt: false,
  },
  kanjiMeaning: {
    ja: '漢字の意味',
    reading: 'かんじのいみ',
    name: 'Arti Kanji',
    asks: 'Menentukan arti utama sebuah kanji.',
    instructionId: 'Pilih arti utama kanji berikut.',
    strategy: [
      'Ingat kata-kata umum yang memakai kanji ini. Artinya membantu menebak makna kanji.',
      'Pengecoh adalah arti kanji lain, sering kanji yang bentuknya mirip.',
    ],
    jlpt: false,
  },
  patternMeaning: {
    ja: '文型の意味',
    reading: 'ぶんけいのいみ',
    name: 'Arti Pola',
    asks: 'Menentukan arti dan fungsi sebuah pola tata bahasa.',
    instructionId: 'Pilih arti dan fungsi yang tepat untuk pola berikut.',
    strategy: [
      'Ingat satu contoh kalimat pola ini. Arti lebih mudah diingat lewat contoh.',
      'Pengecoh adalah arti pola lain yang sering tertukar.',
    ],
    jlpt: false,
  },
};

export interface InstructionTerm {
  pattern: RegExp;
  ja: string;
  reading: string;
  id: string;
}

/** Kosakata kalimat perintah JLPT. Diurutkan seperti kemunculan lazimnya di perintah. */
export const INSTRUCTION_TERMS: InstructionTerm[] = [
  { pattern: /次の|つぎの/, ja: '次の', reading: 'つぎの', id: 'berikut' },
  { pattern: /文章/, ja: '文章', reading: 'ぶんしょう', id: 'wacana / teks' },
  { pattern: /文(?!章)/, ja: '文', reading: 'ぶん', id: 'kalimat' },
  { pattern: /言葉|ことば/, ja: '言葉', reading: 'ことば', id: 'kata' },
  { pattern: /読み方|よみかた/, ja: '読み方', reading: 'よみかた', id: 'cara baca' },
  { pattern: /漢字で\s*書く|かんじで\s*かく/, ja: '漢字で書く', reading: 'かんじでかく', id: 'ditulis dengan kanji' },
  { pattern: /ひらがなで/, ja: 'ひらがなで', reading: 'ひらがなで', id: 'dengan hiragana' },
  { pattern: /意味が\s*(最も|もっとも)\s*近い/, ja: '意味が最も近い', reading: 'いみがもっともちかい', id: 'artinya paling dekat' },
  { pattern: /使い方|つかいかた/, ja: '使い方', reading: 'つかいかた', id: 'cara pemakaian' },
  { pattern: /★/, ja: '★', reading: 'ほし', id: 'tanda bintang: posisi yang ditanyakan' },
  { pattern: /入れる|いれる/, ja: '入れる', reading: 'いれる', id: 'memasukkan / mengisi' },
  { pattern: /入る(?!れ)/, ja: '入る', reading: 'はいる', id: 'masuk (ke posisi itu)' },
  { pattern: /問い|質問/, ja: '問い', reading: 'とい', id: 'pertanyaan' },
  { pattern: /答え/, ja: '答え', reading: 'こたえ', id: 'jawaban' },
  { pattern: /最も\s*よい|もっとも\s*よい/, ja: '最もよいもの', reading: 'もっともよいもの', id: 'yang paling tepat' },
  { pattern: /一つ|ひとつ/, ja: '一つ', reading: 'ひとつ', id: 'satu' },
  { pattern: /選びなさい|えらびなさい/, ja: '選びなさい', reading: 'えらびなさい', id: 'pilihlah' },
];

export interface ParticleGloss {
  fn: string;
  /** Contoh pendek (opsional). */
  example?: string;
}

/** Fungsi partikel dasar. Partikel gabungan (では, には …) diurai menjadi partikel-partikel ini. */
export const PARTICLE_GLOSSARY: Record<string, ParticleGloss> = {
  は: { fn: 'Penanda topik: menandai hal yang sedang dibicarakan.' },
  が: { fn: 'Penanda subjek. Juga menandai objek perasaan atau kemampuan (好き・分かる・できる).' },
  を: { fn: 'Penanda objek langsung. Juga menandai tempat yang dilalui atau ditinggalkan (道を歩く, 家を出る).' },
  に: { fn: 'Menunjuk waktu, tujuan/arah, penerima, atau tempat keberadaan.' },
  で: { fn: 'Tempat berlangsungnya kegiatan, alat/cara, bahan, atau penyebab.' },
  へ: { fn: 'Arah tujuan gerakan.' },
  と: { fn: '"Dan" untuk daftar lengkap, "bersama", atau penanda kutipan.' },
  も: { fn: '"Juga" / "pun": menambahkan hal yang sejenis.' },
  の: { fn: 'Penghubung kata benda (milik/penjelas), atau mengubah kalimat menjadi kata benda.' },
  から: { fn: '"Dari" (titik awal waktu/tempat) atau "karena" (alasan).' },
  まで: { fn: '"Sampai" (batas waktu/tempat).' },
  までに: { fn: '"Paling lambat": batas waktu sebuah tindakan harus selesai.' },
  より: { fn: '"Daripada" (pembanding), atau "dari" (titik awal, ragam formal).' },
  や: { fn: '"Dan" untuk daftar yang tidak lengkap (A, B, dan lain-lain).' },
  か: { fn: 'Penanda pertanyaan, atau "atau" di antara pilihan.' },
  しか: { fn: '"Hanya", selalu diikuti bentuk negatif (〜しか〜ない).' },
  だけ: { fn: '"Hanya" / "saja" (pembatasan), dipakai dengan bentuk positif maupun negatif.' },
  ばかり: { fn: '"Melulu" / "hanya … saja": terlalu sering atau terlalu banyak.' },
  ほど: { fn: '"Sampai sejauh" / "sekitar". Dalam 〜ほど〜ない berarti "tidak se-… ".' },
  くらい: { fn: '"Kira-kira" (perkiraan jumlah) atau "setidaknya".' },
  ぐらい: { fn: '"Kira-kira" (perkiraan jumlah) atau "setidaknya".' },
  など: { fn: '"Dan sebagainya" / "seperti": memberi contoh.' },
  さえ: { fn: '"Bahkan": menonjolkan hal yang paling tidak terduga.' },
  でも: { fn: '"Bahkan … pun", atau "… atau semacamnya" (saran yang tidak mengikat).' },
  こそ: { fn: '"Justru" / "-lah": menegaskan sesuatu.' },
  とか: { fn: 'Memberi contoh tidak lengkap ("misalnya … atau …").' },
  って: { fn: 'Ragam santai dari と / という (kutipan) atau は (topik).' },
  ね: { fn: 'Akhir kalimat: meminta persetujuan ("ya?").' },
  よ: { fn: 'Akhir kalimat: menegaskan atau memberi tahu.' },
};

/** Arti singkat bentuk konjugasi (kunci = nama bentuk di inflectionEngine). */
export const FORM_MEANING: Record<string, string> = {
  jisho: 'bentuk netral / kamus',
  masu: 'bentuk sopan',
  masu_stem: 'pangkal ます, dipakai sebelum pola seperti 〜ながら・〜やすい',
  te: 'bentuk sambung: "lalu", juga dasar 〜ている・〜てください',
  ta: 'lampau / sudah selesai',
  nai: 'tidak (negatif)',
  nakatta: 'tidak … (lampau)',
  nakute: 'tidak … dan / karena tidak …',
  naide: 'tanpa … / jangan …',
  nakereba: 'kalau tidak …',
  ba: 'jika (pengandaian)',
  tara: 'kalau / setelah',
  volitional: 'ayo … / bermaksud …',
  imperative: 'perintah (kasar)',
  potential: 'bisa / dapat …',
  passive: 'di- (subjek dikenai tindakan)',
  causative: 'menyuruh / membiarkan orang lain …',
  causative_passive: 'terpaksa … (disuruh orang lain)',
  tai: 'ingin …',
  teiru: 'sedang … / dalam keadaan …',
  teita: 'tadinya sedang … / dulu dalam keadaan …',
  teinai: 'tidak sedang … / belum …',
  temo: 'meskipun …',
  naku: 'tidak … (bentuk keterangan, mis. 〜なくなる)',
  zu: 'tanpa … / tidak … (ragam tulis)',
  zuni: 'tanpa …',
  sugiru: 'terlalu …',
  sou_appearance: 'kelihatannya …',
  sou_hearsay: 'katanya …',
  yasui: 'mudah di-…',
  nikui: 'sulit di-…',
  negative: 'tidak (negatif)',
  past: 'lampau',
  past_negative: 'tidak … (lampau)',
  adverbial: 'bentuk keterangan',
  attributive: 'menerangkan kata benda',
  base: 'bentuk dasar',
};

/** Label nama bentuk yang tidak ada di FORM_LABEL milik textAnalyzer. */
export const EXTRA_FORM_LABEL: Record<string, string> = {
  jisho: 'bentuk kamus (辞書形)',
  base: 'bentuk dasar',
  nakute: 'bentuk なくて',
  naide: 'bentuk ないで',
  nakereba: 'bentuk なければ',
  teiru: 'bentuk ている',
  teita: 'bentuk ていた',
  teinai: 'bentuk ていない',
  temo: 'bentuk ても',
  naku: 'bentuk なく',
  zu: 'bentuk ず',
  zuni: 'bentuk ずに',
  sugiru: 'bentuk すぎる (terlalu)',
};
