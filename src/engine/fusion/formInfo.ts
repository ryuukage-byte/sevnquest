// Penjelasan singkat tiap bentuk kata untuk lencana di papan Grammar Fusion.
export interface FusionFormInfo {
  title: string;
  /** Cara membentuknya, satu kalimat. */
  rule: string;
  examples: string[];
  /** Dipakai untuk apa. */
  use: string;
}

export const FORM_INFO: Record<string, FusionFormInfo> = {
  jisho: {
    title: 'Bentuk kamus (辞書形)',
    rule: 'Bentuk dasar kata kerja, seperti yang tertulis di kamus.',
    examples: ['食べる (makan)', '飲む (minum)'],
    use: 'Titik awal: hampir semua bentuk lain dibuat dari sini.',
  },
  nai: {
    title: 'Bentuk nai (ない形)',
    rule: 'Kata kerja + ない, artinya "tidak".',
    examples: ['食べる → 食べない', '飲む → 飲まない'],
    use: 'Menyangkal, dan bahan untuk pola seperti ないで／ないように.',
  },
  nai_de: {
    title: 'Bentuk nai + で',
    rule: 'Bentuk ない ditambah で, artinya "tanpa ...", "dengan tidak ...".',
    examples: ['食べない → 食べないで'],
    use: 'Menyambung kalimat, atau dasar larangan sopan ないでください.',
  },
  nai_de_kudasai: {
    title: 'Larangan sopan ないでください',
    rule: 'Bentuk ない + で + ください.',
    examples: ['食べないでください (tolong jangan makan)'],
    use: 'Meminta orang lain dengan sopan agar tidak melakukan sesuatu.',
  },
  te: {
    title: 'Bentuk te (て形)',
    rule: 'Kata kerja berakhiran て／で; bentuknya berubah menurut golongan kata kerja.',
    examples: ['食べる → 食べて', '飲む → 飲んで'],
    use: 'Menyambung kalimat, meminta (〜てください), dan banyak pola lain.',
  },
  ta: {
    title: 'Bentuk ta (た形)',
    rule: 'Seperti bentuk te, tetapi berakhiran た／だ.',
    examples: ['食べる → 食べた', '飲む → 飲んだ'],
    use: 'Menyatakan masa lampau (sudah melakukan).',
  },
  masu: {
    title: 'Bentuk masu (ます形)',
    rule: 'Kata kerja + ます, bentuk sopan.',
    examples: ['食べる → 食べます', '飲む → 飲みます'],
    use: 'Bicara sopan sehari-hari.',
  },
  masu_stem: {
    title: 'Akar masu (連用形)',
    rule: 'Bentuk ます dengan ます-nya dibuang.',
    examples: ['食べます → 食べ', '飲みます → 飲み'],
    use: 'Bahan untuk pola seperti 〜たい, 〜ながら, 〜に行く, dan 〜かける.',
  },
  volitional: {
    title: 'Bentuk volisional (意向形)',
    rule: 'Bentuk "ayo ...", "berniat ...": 食べる → 食べよう, 飲む → 飲もう.',
    examples: ['食べる → 食べよう', '飲む → 飲もう'],
    use: 'Mengajak, menyatakan niat, dan dasar pola 〜ようと思う／〜とする.',
  },
  noun: {
    title: 'Kata benda (名詞)',
    rule: 'Kata yang menyebut benda, orang, tempat, atau hal. Tidak berubah bentuk.',
    examples: ['学生 (siswa)', '天気 (cuaca)'],
    use: 'Menempel ke pola langsung, atau lewat partikel seperti に／の／と／で.',
  },
  adj_i: {
    title: 'Kata sifat-i, bentuk kamus (い形容詞)',
    rule: 'Kata sifat yang berakhiran い, dipakai apa adanya.',
    examples: ['高い (tinggi / mahal)', '暑い (panas)'],
    use: 'Bentuk dasar yang langsung disambung ke banyak pola, mis. 〜ほど, 〜わけだ.',
  },
  adj_na: {
    title: 'Kata sifat-na, tanpa な (な形容詞)',
    rule: 'Kata sifat-na dalam bentuk dasarnya, tanpa な di belakang.',
    examples: ['静か (tenang)', '便利 (praktis)'],
    use: 'Ada pola yang menempel langsung (〜で, 〜というより), ada yang butuh な dulu.',
  },
  adj_na_attr: {
    title: 'Kata sifat-na + な (連体形)',
    rule: 'Kata sifat-na ditambah な, bentuk untuk menerangkan kata benda.',
    examples: ['静か → 静かな', '便利 → 便利な'],
    use: 'Bentuk yang dipakai sebelum kata benda dan sebelum pola seperti 〜ほど, 〜くらい.',
  },
};
