// Catatan kurasi "Bedah Pola": dari komponen apa sebuah pola kalimat terbentuk, dan
// bagaimana gabungan komponen itu menghasilkan maknanya.
//
// Sama seperti Pemahaman Kotoba, penjelasan hanya ditulis untuk pola yang sudah dikurasi.
// Pola yang belum dikurasi tidak mendapat tab Bedah Pola (tidak ada pemecahan karangan).
// Pola atomik (は, も, ね …) sengaja tidak dibedah: tidak ada komponen yang bisa diurai.

export type PatternTransparency = 'langsung' | 'kiasan' | 'khusus';

export type PatternPartRole =
  | 'bentuk'
  | 'partikel'
  | 'kata kerja'
  | 'kata sifat'
  | 'kata benda'
  | 'kata keterangan'
  | 'kopula'
  | 'kontraksi';

export interface PatternPart {
  /** Komponen seperti tertulis di pola, mis. 「は」 atau 「いけない」. */
  text: string;
  /** Bacaan bila komponen memakai kanji, mis. 前 → まえ. */
  reading?: string;
  role: PatternPartRole;
  /** Arti komponen DI DALAM pola ini (bisa lebih sempit dari arti umumnya). */
  meaning: string;
  /** Kunci keluarga bila berbeda dari `text`, mis. いけません → いけない. */
  base?: string;
  /** Komponen yang lazim dihilangkan saat diucapkan, mis. (いけない) pada なくちゃ. */
  omitted?: boolean;
}

export interface PatternInsightNote {
  parts: PatternPart[];
  /** Arti harfiah gabungan komponen. */
  literal: string;
  /** Makna alami pola (menggantikan arti database yang kadang hasil terjemahan mesin). */
  natural: string;
  /** Mengapa gabungan komponen akhirnya bermakna begitu. */
  explanation: string;
  transparency: PatternTransparency;
  /**
   * Pola pencarian (sumber RegExp) untuk menyorot pola di contoh kalimat, karena pola
   * berubah bentuk di kalimat (いけない → いけません, て → で). Tanpa ini, judul pola dipakai.
   */
  match?: string[];
}

export const PATTERN_TRANSPARENCY_LABEL: Record<PatternTransparency, { label: string; hint: string }> = {
  langsung: { label: 'Makna langsung', hint: 'Arti pola bisa ditebak dari gabungan komponennya.' },
  kiasan: { label: 'Makna kiasan', hint: 'Komponen memberi petunjuk, tetapi maknanya bergeser.' },
  khusus: { label: 'Makna khusus', hint: 'Pahami sebagai satu kesatuan; komponen hanya petunjuk sejarahnya.' },
};

// Komponen yang sering berulang, ditulis sekali agar artinya konsisten di semua pola.
const TE: PatternPart = { text: 'て', role: 'bentuk', meaning: 'bentuk て: "melakukan …" (menyambung ke kata berikutnya)' };
const WA_TOPIC: PatternPart = { text: 'は', role: 'partikel', meaning: 'penanda topik: "kalau soal …"' };
const MO_EVEN: PatternPart = { text: 'も', role: 'partikel', meaning: '"pun, walaupun"' };
const II: PatternPart = { text: 'いい', role: 'kata sifat', meaning: 'baik, tidak apa-apa' };
const IKENAI: PatternPart = {
  text: 'いけない',
  role: 'kata kerja',
  meaning: 'dari 行ける + ない: "tidak bisa jalan" → tidak baik',
};
const NAKUTE: PatternPart = { text: 'なくて', role: 'bentuk', meaning: 'bentuk て dari ない: "tidak melakukan …"' };
const NAI: PatternPart = { text: 'ない', role: 'bentuk', meaning: 'bentuk negatif: "tidak …"' };
const GA_SUBJ: PatternPart = { text: 'が', role: 'partikel', meaning: 'penanda subjek dari predikat berikutnya' };
const GA_OBJ: PatternPart = { text: 'が', role: 'partikel', meaning: 'penanda sasaran rasa / kemampuan' };
const KUDASAI: PatternPart = {
  text: 'ください',
  role: 'kata kerja',
  meaning: 'bentuk perintah くださる: "berilah (saya)"',
};
const HOU: PatternPart = { text: 'ほう', reading: 'ほう', role: 'kata benda', meaning: '方: arah, sisi (pilihan)' };
const NO_NOMINAL: PatternPart = {
  text: 'の',
  role: 'partikel',
  meaning: 'pembenda: mengubah kegiatan menjadi "hal …"',
};
const KA_Q: PatternPart = { text: 'か', role: 'partikel', meaning: 'penanda tanya' };
const DE_COPULA: PatternPart = { text: 'で', role: 'kopula', meaning: 'bentuk sambung だ: "adalah …"', base: 'だ' };
const KU_ADJ: PatternPart = { text: 'く', role: 'bentuk', meaning: 'bentuk sambung kata sifat-i (高い → 高く)' };
const SHITE: PatternPart = { text: 'して', role: 'bentuk', meaning: 'bentuk て dari する: "berbuat …, lalu"' };
const ICHIBAN: PatternPart = { text: '一番', reading: 'いちばん', role: 'kata benda', meaning: '"nomor satu" → paling' };

export const BUNPOU_PATTERN_INSIGHTS: Record<string, PatternInsightNote> = {
  // ── Keluarga いけない / ならない: larangan & keharusan ──
  bp_n5_055: {
    parts: [TE, WA_TOPIC, IKENAI],
    literal: 'Kalau soal melakukan X, itu tidak baik',
    natural: 'Tidak boleh melakukan X',
    explanation:
      'Tindakan X dijadikan topik (て + は), lalu dinilai いけない, "tidak bisa jalan / tidak baik". Menilai suatu tindakan tidak baik sama dengan melarangnya.',
    transparency: 'langsung',
    match: ['[てで]はいけ(?:ない|ません)'],
  },
  bp_n5_045: {
    parts: [
      { text: 'ちゃ', role: 'kontraksi', meaning: 'ucapan cepat dari ては (じゃ dari では)' },
      IKENAI,
    ],
    literal: 'Kalau soal melakukan X, itu tidak baik',
    natural: 'Tidak boleh melakukan X (santai)',
    explanation:
      'Isinya sama dengan てはいけない. Dalam percakapan, ては melebur menjadi ちゃ, dan では (setelah verba seperti 遊んで) menjadi じゃ.',
    transparency: 'langsung',
    match: ['[ちじ]ゃいけ(?:ない|ません)'],
  },
  bp_n5_074: {
    parts: [NAKUTE, WA_TOPIC, IKENAI],
    literal: 'Kalau soal tidak melakukan X, itu tidak baik',
    natural: 'Harus melakukan X',
    explanation:
      'Kebalikan dari てはいけない: yang dinilai "tidak baik" justru keadaan TIDAK melakukan X. Kalau tidak melakukannya itu salah, berarti X wajib dilakukan.',
    transparency: 'kiasan',
    match: ['なくてはいけ(?:ない|ません)'],
  },
  bp_n5_075: {
    parts: [
      NAKUTE,
      WA_TOPIC,
      { text: 'ならない', role: 'kata kerja', meaning: 'なる + ない: "tidak jadi, tidak beres"' },
    ],
    literal: 'Kalau tidak melakukan X, (urusannya) tidak akan jadi',
    natural: 'Harus melakukan X',
    explanation:
      'Polanya sama dengan なくてはいけない, tetapi penilaiannya memakai ならない, "tidak akan jadi / tidak bisa diterima". Kesannya lebih umum dan formal: kewajiban karena aturan atau keadaan.',
    transparency: 'kiasan',
    match: ['なくてはなり?(?:ない|ません)', 'なくてはならない'],
  },
  bp_n5_071: {
    parts: [NAI, { text: 'と', role: 'partikel', meaning: 'syarat: "kalau …, (pasti)"' }, IKENAI],
    literal: 'Kalau tidak melakukan X, (pasti) tidak baik',
    natural: 'Harus melakukan X',
    explanation:
      'と menyatakan akibat yang pasti terjadi bila syaratnya terpenuhi. Kalau tidak melakukan X pasti berakibat buruk, maka X harus dilakukan. Lebih sering dipakai dalam percakapan daripada なくてはいけない.',
    transparency: 'kiasan',
    match: ['ないといけ(?:ない|ません)'],
  },
  bp_n5_073: {
    parts: [
      { text: 'なく', role: 'bentuk', meaning: 'ない yang disambung: "tidak melakukan …"' },
      { text: 'ちゃ', role: 'kontraksi', meaning: 'ucapan cepat dari ては' },
      { ...IKENAI, omitted: true },
    ],
    literal: 'Kalau tidak melakukan X, (itu tidak baik)',
    natural: 'Harus melakukan X (santai)',
    explanation:
      'Ini なくてはいけない yang dipersingkat: ては menjadi ちゃ, lalu いけない dibuang karena sudah jelas dari konteks. なきゃ berasal dari なければ(いけない) yang dipersingkat dengan cara yang sama.',
    transparency: 'kiasan',
    match: ['なくちゃ', 'なきゃ'],
  },

  // ── Keluarga いい: izin & anjuran ──
  bp_n5_057: {
    parts: [TE, MO_EVEN, II],
    literal: 'Walaupun melakukan X pun, itu baik',
    natural: 'Boleh melakukan X',
    explanation:
      'ても berarti "walaupun melakukan X". Kalau walaupun dilakukan tetap いい (tidak apa-apa), artinya tindakan itu diizinkan. Ditambah か menjadi permintaan izin: 〜てもいいですか.',
    transparency: 'langsung',
    match: ['[てで]もいい'],
  },
  bp_n5_076: {
    parts: [NAKUTE, MO_EVEN, II],
    literal: 'Walaupun tidak melakukan X pun, itu baik',
    natural: 'Tidak perlu melakukan X',
    explanation:
      'Kebalikan dari てもいい: yang dinilai "tidak apa-apa" adalah keadaan TIDAK melakukan X. Kalau tidak dilakukan pun tidak masalah, berarti X tidak wajib.',
    transparency: 'langsung',
    match: ['なくてもいい'],
  },
  bp_n5_101: {
    parts: [HOU, GA_SUBJ, II],
    literal: 'Sisi (pilihan) X-lah yang baik',
    natural: 'Sebaiknya melakukan X',
    explanation:
      'ほう (方) adalah "sisi" di antara beberapa pilihan. Mengatakan sisi X yang いい berarti menyarankan pilihan itu. Biasanya didahului bentuk た (寝たほうがいい), dan nadanya cukup tegas.',
    transparency: 'kiasan',
    match: ['ほうがいい'],
  },
  bp_n5_072: {
    parts: [NAI, HOU, GA_SUBJ, II],
    literal: 'Sisi tidak melakukan X-lah yang baik',
    natural: 'Sebaiknya tidak melakukan X',
    explanation:
      'Sama dengan ほうがいい, tetapi pilihan yang disarankan adalah tidak melakukan X. Untuk saran negatif dipakai bentuk ない (bukan なかった).',
    transparency: 'kiasan',
    match: ['ないほうがいい'],
  },

  // ── Keluarga ください: permintaan ──
  bp_n5_053: {
    parts: [TE, KUDASAI],
    literal: 'Berilah (saya) tindakan "melakukan X"',
    natural: 'Tolong lakukan X',
    explanation:
      'くださる adalah "memberi (kepada saya)" dalam bahasa hormat. Meminta orang "memberikan" tindakannya kepada kita menjadi permintaan yang sopan.',
    transparency: 'kiasan',
    match: ['[てで]ください'],
  },
  bp_n5_070: {
    parts: [{ text: 'ないで', role: 'bentuk', meaning: 'ない + で: "dengan tidak melakukan …"' }, KUDASAI],
    literal: 'Berilah (saya) keadaan "tidak melakukan X"',
    natural: 'Tolong jangan melakukan X',
    explanation:
      'Yang diminta bukan tindakan, melainkan tidak adanya tindakan. Karena itu ないでください menjadi larangan yang halus, lebih lembut daripada てはいけない.',
    transparency: 'kiasan',
    match: ['ないでください'],
  },

  // ── Keluarga いる / ある: keadaan ──
  bp_n5_051: {
    parts: [TE, { text: 'いる', role: 'kata kerja', meaning: 'ada, berada (makhluk hidup)' }],
    literal: 'Berada dalam keadaan melakukan X',
    natural: 'Sedang melakukan X / dalam keadaan X',
    explanation:
      'いる menyatakan keberadaan. Subjek "berada" di dalam tindakan X, jadi tindakannya sedang berlangsung (聞いている). Untuk verba perubahan sekali jadi (結婚する), yang "berada" adalah hasilnya: sudah menikah.',
    transparency: 'kiasan',
    match: ['[てで]い(?:る|ます|ません|た|ない)'],
  },
  bp_n5_050: {
    parts: [TE, { text: 'ある', role: 'kata kerja', meaning: 'ada (benda)' }],
    literal: 'Ada dalam keadaan sudah di-X',
    natural: 'Sudah di-X (sengaja, hasilnya masih ada)',
    explanation:
      'ある dipakai untuk keberadaan benda. Benda itu "ada" sebagai hasil tindakan X yang dilakukan seseorang dengan sengaja. Karena itu bendanya biasanya ditandai が, bukan を: 名前が書いてある.',
    transparency: 'kiasan',
    match: ['[てで]あ(?:る|ります|りません|った)'],
  },
  bp_n5_040: {
    parts: [
      { text: 'た', role: 'bentuk', meaning: 'bentuk lampau: "sudah melakukan …"' },
      { text: 'こと', role: 'kata benda', meaning: 'hal, peristiwa' },
      GA_SUBJ,
      { text: 'ある', role: 'kata kerja', meaning: 'ada' },
    ],
    literal: 'Ada peristiwa (bahwa saya) sudah melakukan X',
    natural: 'Pernah melakukan X',
    explanation:
      'Pengalaman diperlakukan sebagai "peristiwa" (こと) yang tersimpan. Kalau peristiwa itu ada (ある), berarti pernah. Kalau tidak ada (ない), berarti belum pernah.',
    transparency: 'langsung',
    match: ['[たで]ことがあ(?:る|ります|りません)', 'たことがない'],
  },

  // ── Urutan waktu ──
  bp_n5_052: {
    parts: [TE, { text: 'から', role: 'partikel', meaning: 'titik awal: "dari, sejak"' }],
    literal: 'Mulai dari (selesai) melakukan X',
    natural: 'Setelah melakukan X, (baru) …',
    explanation:
      'から menandai titik awal. Tindakan X menjadi titik mulai bagi tindakan berikutnya, sehingga urutannya ditegaskan: X dulu, baru yang lain.',
    transparency: 'langsung',
    match: ['[てで]から'],
  },
  bp_n5_102: {
    parts: [
      { text: '前', reading: 'まえ', role: 'kata benda', meaning: 'depan, sebelum' },
      { text: 'に', role: 'partikel', meaning: 'titik waktu: "pada …"' },
    ],
    literal: 'Pada (waktu) di depan X',
    natural: 'Sebelum X',
    explanation:
      'Dalam waktu, 前 adalah bagian yang ada "di depan" suatu peristiwa. Tindakan yang dilakukan "pada" bagian itu terjadi sebelum X. Verba sebelum 前に selalu bentuk kamus, walaupun ceritanya lampau.',
    transparency: 'langsung',
    match: ['前に'],
  },

  // ── Ajakan & tawaran ──
  bp_n5_106: {
    parts: [{ text: 'ません', role: 'bentuk', meaning: 'negatif sopan: "tidak …"' }, KA_Q],
    literal: 'Tidakkah (Anda) melakukan X?',
    natural: 'Maukah (bersama) melakukan X?',
    explanation:
      'Bertanya dengan bentuk negatif memberi ruang bagi lawan bicara untuk menolak. Karena tidak memaksa, ませんか menjadi cara mengajak yang paling sopan.',
    transparency: 'kiasan',
    match: ['ませんか'],
  },
  bp_n5_104: {
    parts: [{ text: 'ましょう', role: 'bentuk', meaning: 'ajakan / kehendak sopan: "mari …"' }, KA_Q],
    literal: '"Mari melakukan X", ya?',
    natural: 'Bagaimana kalau saya/kita melakukan X?',
    explanation:
      'ましょう menyatakan kehendak atau ajakan. Ditambah か, kehendak itu ditanyakan dulu kepada lawan bicara. Hasilnya tawaran bantuan (持ちましょうか) atau ajakan yang lembut.',
    transparency: 'kiasan',
    match: ['ましょうか'],
  },
  bp_n5_097: {
    parts: [
      WA_TOPIC,
      { text: 'どう', role: 'kata benda', meaning: 'bagaimana' },
      { text: 'です', role: 'kopula', meaning: 'adalah (sopan)' },
      KA_Q,
    ],
    literal: 'Kalau soal X, bagaimana?',
    natural: 'Bagaimana dengan X? / Mau X?',
    explanation:
      'X dijadikan topik, lalu ditanyakan "bagaimana". Untuk hal yang dialami lawan bicara, ini menanyakan kesan (新しい仕事はどうですか). Untuk benda yang ditawarkan, ini menjadi tawaran (コーヒーはどうですか).',
    transparency: 'langsung',
    match: ['はどうですか'],
  },

  // ── Kegiatan sebagai "hal" ──
  bp_n5_092: {
    parts: [NO_NOMINAL, GA_OBJ, { text: '好き', reading: 'すき', role: 'kata sifat', meaning: 'suka' }],
    literal: 'Hal melakukan X, (itu yang) disukai',
    natural: 'Suka melakukan X',
    explanation:
      '好き hanya bisa menerima kata benda sebagai sasarannya. の mengubah kegiatan X menjadi "hal melakukan X" sehingga bisa ditandai が.',
    transparency: 'langsung',
    match: ['のが好き'],
  },
  bp_n5_091: {
    parts: [NO_NOMINAL, GA_OBJ, { text: '上手', reading: 'じょうず', role: 'kata sifat', meaning: 'pandai, mahir' }],
    literal: 'Hal melakukan X, (itu yang) mahir',
    natural: 'Pandai melakukan X',
    explanation:
      'Sama seperti のが好き: の membendakan kegiatan X, lalu が menandainya sebagai bidang kemahiran. Untuk diri sendiri, orang Jepang lebih sering memakai 得意 karena 上手 terdengar memuji diri.',
    transparency: 'langsung',
    match: ['のが上手'],
  },
  bp_n5_119: {
    parts: [
      { text: 'ん', role: 'partikel', meaning: 'の yang diucapkan ringkas: "hal bahwa …"', base: 'の' },
      { text: 'です', role: 'kopula', meaning: 'adalah (sopan)' },
    ],
    literal: '(Ini) adalah hal bahwa X',
    natural: 'Begini, X (menjelaskan / meminta penjelasan)',
    explanation:
      'Kalimat X dibungkus menjadi "hal" (の), lalu disajikan dengan です. Pembicara tidak sekadar memberi fakta, tetapi menyodorkannya sebagai latar atau alasan. Dalam pertanyaan, んですか meminta penjelasan.',
    transparency: 'kiasan',
    match: ['んで(?:す|した)', 'のです'],
  },
  bp_n5_094: {
    parts: [
      { text: 'の', role: 'partikel', meaning: 'pembenda: "hal bahwa …"' },
      { text: 'で', role: 'kopula', meaning: 'bentuk sambung だ: "adalah …, (maka)"', base: 'だ' },
    ],
    literal: 'Karena (keadaannya) adalah X, maka …',
    natural: 'Karena X, …',
    explanation:
      'Alasan X dibendakan dengan の lalu disambung dengan で (bentuk sambung だ). Alasan disajikan sebagai keadaan yang objektif, sehingga ので terdengar lebih halus dan sopan daripada から.',
    transparency: 'kiasan',
    match: ['ので'],
  },

  // ── Maksud & niat ──
  bp_n5_083: {
    parts: [
      { text: 'に', role: 'partikel', meaning: 'tujuan: "untuk …"' },
      { text: '行く', reading: 'いく', role: 'kata kerja', meaning: 'pergi' },
    ],
    literal: 'Pergi untuk (tujuan) X',
    natural: 'Pergi untuk melakukan X',
    explanation:
      'に menandai tujuan. Di sini tujuannya adalah kegiatan (verba bentuk masu tanpa ます: 会い, atau kata benda kegiatan: 買い物), bukan tempat. Bisa juga dengan 来る dan 帰る.',
    transparency: 'langsung',
    match: ['に(?:行|来|帰)'],
  },
  bp_n5_047: {
    parts: [
      { text: 'つもり', role: 'kata benda', meaning: 'dari 積もる: perkiraan, perhitungan (dalam hati)' },
      { text: 'だ', role: 'kopula', meaning: 'adalah' },
    ],
    literal: 'Perhitungan (saya) adalah melakukan X',
    natural: 'Berniat melakukan X',
    explanation:
      'つもり berasal dari 積もる, "menghitung, memperkirakan" (seperti 見積もり, perkiraan biaya). Sesuatu yang sudah diperhitungkan dalam hati adalah rencana atau niat.',
    transparency: 'kiasan',
    match: ['つもり'],
  },
  bp_n5_032: {
    parts: [
      { text: 'すぎる', role: 'kata kerja', meaning: '過ぎる: melewati, lewat' },
    ],
    literal: 'X sampai melewati (batas)',
    natural: 'Terlalu X',
    explanation:
      '過ぎる berarti melewati sesuatu (時間が過ぎる, waktu berlalu). Kalau ditempelkan pada verba atau sifat, yang dilewati adalah batas yang wajar, sehingga maknanya "terlalu".',
    transparency: 'kiasan',
    match: ['すぎ'],
  },
  // ── N5 (lanjutan): ada / punya, keinginan ──
  bp_n5_010: {
    parts: [GA_SUBJ, { text: 'ある', role: 'kata kerja', meaning: 'ada (benda mati, acara)' }],
    literal: 'X ada',
    natural: 'Ada X / punya X (benda, acara)',
    explanation:
      'ある menyatakan keberadaan benda mati, tumbuhan, dan acara. Yang "ada" ditandai が, tempatnya ditandai に. Karena "ada pada saya" sama dengan memiliki, がある juga berarti punya: 明日は試験がある.',
    transparency: 'langsung',
    match: ['があ(?:る|ります|りません|った)'],
  },
  bp_n5_012: {
    parts: [GA_SUBJ, { text: 'いる', role: 'kata kerja', meaning: 'ada (orang, hewan)' }],
    literal: 'X ada',
    natural: 'Ada X / punya X (orang, hewan)',
    explanation:
      'いる dipakai untuk makhluk yang bisa bergerak sendiri: orang dan hewan. Sama seperti がある, "ada pada saya" berarti punya: 兄が二人いる (punya dua kakak laki-laki).',
    transparency: 'langsung',
    match: ['がい(?:る|ます|ません|た)', 'が[一二三四五六七八九十何]人い(?:る|ます)'],
  },
  bp_n5_017: {
    parts: [GA_OBJ, { text: 'ほしい', role: 'kata sifat', meaning: 'ingin memiliki' }],
    literal: 'X (itu yang) ingin dimiliki',
    natural: 'Ingin (punya) X',
    explanation:
      'ほしい adalah kata sifat, jadi benda yang diinginkan ditandai が, bukan を. Untuk keinginan melakukan sesuatu dipakai 〜たい, bukan ほしい.',
    transparency: 'langsung',
    match: ['がほし(?:い|かった|くない)'],
  },

  // ── Kata sifat & kopula: bentuk sambung, negatif, lampau ──
  bp_n5_019: {
    parts: [KU_ADJ, { text: 'て', role: 'bentuk', meaning: 'penyambung: "…, dan …"' }],
    literal: 'X, dan …',
    natural: 'X dan … (menyambung sifat / kata benda)',
    explanation:
      'Kata sifat-i diubah ke bentuk sambung く lalu diberi て: 広い → 広くて. Kata benda dan sifat-na memakai で, bentuk sambung dari だ: 先生で. Keduanya menggabungkan dua keterangan dalam satu kalimat.',
    transparency: 'langsung',
    match: ['くて', 'で、'],
  },
  bp_n5_020: {
    parts: [KU_ADJ, { text: 'ない', role: 'bentuk', meaning: 'negatif: "tidak …"' }],
    literal: 'Tidak dalam keadaan X',
    natural: 'Tidak X (kata sifat-i)',
    explanation:
      'Kata sifat-i diubah ke bentuk く lalu diberi ない: 高い → 高くない. Hasilnya berperilaku seperti kata sifat-i lagi, sehingga bisa dibuat lampau: 高くなかった. Khusus いい menjadi よくない.',
    transparency: 'langsung',
    match: ['くない'],
  },
  bp_n5_021: {
    parts: [KU_ADJ, { text: 'なかった', role: 'bentuk', meaning: 'lampau dari ない: "dulu tidak …"', base: 'ない' }],
    literal: 'Dulu tidak dalam keadaan X',
    natural: 'Dulu / tadi tidak X (kata sifat-i)',
    explanation:
      'Bentuk くない berperilaku seperti kata sifat-i, jadi lampaunya dibuat dengan mengganti い menjadi かった: 高くない → 高くなかった.',
    transparency: 'langsung',
    match: ['くなかった'],
  },
  bp_n5_015: {
    parts: [KU_ADJ, { text: 'あった', role: 'kata kerja', meaning: 'lampau dari ある: "sudah ada"' }],
    literal: '(Keadaan) X sudah ada',
    natural: 'Dulu / tadi X (lampau kata sifat-i)',
    explanation:
      'Asalnya 〜くあった: bentuk く dari kata sifat ditambah あった. Bunyi くあ melebur menjadi か, sehingga 楽しくあった → 楽しかった. Karena itu kata sifat-i punya bentuk lampau sendiri dan tidak memakai でした (楽しいでした salah).',
    transparency: 'kiasan',
    match: ['かった'],
  },
  bp_n5_030: {
    parts: [DE_COPULA, { text: 'は', role: 'partikel', meaning: 'penekanan (topik)' }, NAI],
    literal: '(Sebagai) X, tidak',
    natural: 'Bukan X / tidak X (kata benda, sifat-na)',
    explanation:
      'では terdiri dari で (bentuk sambung だ, "adalah") dan は. Ditambah ない menjadi penyangkalan dari だ: 学生だ → 学生ではない. Dalam percakapan では melebur menjadi じゃ: 学生じゃない.',
    transparency: 'kiasan',
    match: ['じゃない', 'ではない'],
  },
  bp_n5_031: {
    parts: [
      DE_COPULA,
      { text: 'は', role: 'partikel', meaning: 'penekanan (topik)' },
      { text: 'なかった', role: 'bentuk', meaning: 'lampau dari ない: "dulu tidak …"', base: 'ない' },
    ],
    literal: '(Sebagai) X, dulu tidak',
    natural: 'Dulu bukan X / tadi tidak X',
    explanation:
      'Lampau dari ではない: ない diganti なかった. Dalam percakapan では menjadi じゃ: 休みじゃなかった.',
    transparency: 'kiasan',
    match: ['じゃなかった', 'ではなかった'],
  },
  bp_n5_041: {
    parts: [DE_COPULA, { text: 'あった', role: 'kata kerja', meaning: 'lampau dari ある: "sudah ada"' }],
    literal: '(Dulu) adalah X',
    natural: 'Dulu / tadi adalah X',
    explanation:
      'だった berasal dari であった: で (bentuk sambung だ) + あった (lampau ある), lalu bunyinya melebur. Bentuk sopannya でした, yaitu です + た.',
    transparency: 'kiasan',
    match: ['だった', 'でした'],
  },
  bp_n5_044: {
    parts: [DE_COPULA, { text: 'あろう', role: 'kata kerja', meaning: 'ある bentuk dugaan: "mungkin ada"' }],
    literal: 'Mungkin adalah X',
    natural: 'Mungkin X / barangkali X',
    explanation:
      'だろう berasal dari であろう: で (bentuk sambung だ) + あろう (bentuk dugaan dari ある). Menyatakan dugaan pembicara dengan nada santai atau tulisan. Bentuk sopannya でしょう.',
    transparency: 'kiasan',
    match: ['だろう'],
  },
  bp_n5_054: {
    parts: [
      { text: 'でしょ', role: 'kopula', meaning: 'です (sopan) yang berubah bunyi', base: 'です' },
      { text: 'う', role: 'bentuk', meaning: 'dugaan / kehendak' },
    ],
    literal: 'Mungkin adalah X',
    natural: 'Mungkin X / X, bukan? (dugaan sopan)',
    explanation:
      'でしょう adalah です dalam bentuk dugaan (う). Dengan intonasi turun berarti "mungkin". Dengan intonasi naik (でしょう？) meminta persetujuan lawan bicara: "bukan?".',
    transparency: 'kiasan',
    match: ['でしょう'],
  },

  // ── Kata sambung ──
  bp_n5_027: {
    parts: [{ text: 'けど', role: 'kontraksi', meaning: 'ringkasan dari けれども: "tetapi"' }],
    literal: 'X, tetapi …',
    natural: 'Tetapi / walaupun X (santai)',
    explanation:
      'けど adalah bentuk ringkas dari けれども (けれども → けれど → けど). Maknanya sama; makin pendek makin santai. Setelah kata benda dan sifat-na dipakai だけど. Di akhir kalimat, けど juga dipakai untuk memperhalus ucapan.',
    transparency: 'langsung',
    match: ['けど'],
  },
  bp_n5_034: {
    parts: [{ text: 'そう', role: 'kata keterangan', meaning: 'begitu' }, SHITE],
    literal: 'Dengan berbuat begitu, …',
    natural: 'Dan / lalu',
    explanation:
      'そして adalah ringkasan dari そうして, "setelah berbuat begitu". Kalimat sebelumnya dirangkum dengan そう, lalu disambung ke kalimat berikutnya, sehingga menjadi kata sambung "dan, lalu".',
    transparency: 'kiasan',
    match: ['そして'],
  },
  bp_n5_035: {
    parts: [
      { text: 'それ', role: 'kata benda', meaning: 'itu (hal yang baru disebut)' },
      { text: 'から', role: 'partikel', meaning: 'titik awal: "dari, sejak"' },
    ],
    literal: 'Mulai dari itu',
    natural: 'Setelah itu / lalu / selain itu',
    explanation:
      'それ merujuk ke hal yang baru disebut dan から menandai titik awal. "Mulai dari itu" berarti urutan berikutnya: setelah itu. Juga dipakai untuk menambah daftar: それから、パンも.',
    transparency: 'langsung',
    match: ['それから'],
  },
  bp_n5_056: {
    parts: [DE_COPULA, MO_EVEN],
    literal: 'Walaupun (keadaannya) begitu',
    natural: 'Tetapi / namun (di awal kalimat)',
    explanation:
      'でも di awal kalimat adalah ringkasan dari それでも: で + も, "walaupun begitu". Isi kalimat sebelumnya diterima, lalu dipertentangkan. Lebih santai daripada しかし.',
    transparency: 'kiasan',
    match: ['でも'],
  },

  // ── Kata tanya ──
  bp_n5_005: {
    parts: [{ text: 'いつ', role: 'kata benda', meaning: 'kapan' }, MO_EVEN],
    literal: 'Kapan pun',
    natural: 'Selalu / biasanya',
    explanation:
      'Kata tanya + も menyatakan "semua": いつ (kapan) + も = kapan pun juga. Sesuatu yang terjadi kapan pun berarti selalu.',
    transparency: 'langsung',
    match: ['いつも'],
  },
  bp_n5_043: {
    parts: [
      { text: '誰・どこ', role: 'kata benda', meaning: 'kata tanya: siapa, di mana' },
      { text: 'か／も', role: 'partikel', meaning: 'か: "entah …"; も + negatif: "tidak satu pun"' },
    ],
    literal: 'Entah siapa / siapa pun (tidak)',
    natural: 'Seseorang, suatu tempat / tidak ada siapa pun, tidak ke mana pun',
    explanation:
      'Kata tanya + か membuatnya tidak tentu: 誰か (entah siapa → seseorang), どこか (suatu tempat). Kata tanya + も dengan predikat negatif menyangkal semuanya: 誰もいない (tidak ada siapa pun).',
    transparency: 'langsung',
    match: ['誰か', '誰も', 'どこか', 'どこも'],
  },
  bp_n5_080: {
    parts: [
      { text: '何', reading: 'なに', role: 'kata benda', meaning: 'apa' },
      { text: 'か／も', role: 'partikel', meaning: 'か: "entah …"; も + negatif: "tidak satu pun"' },
    ],
    literal: 'Entah apa / apa pun (tidak)',
    natural: 'Sesuatu / tidak … apa pun',
    explanation:
      '何か (entah apa → sesuatu) dan 何も + negatif (tidak apa pun) mengikuti aturan yang sama dengan 誰か・誰も. 何も selalu dipakai dengan predikat negatif: 何もしなかった.',
    transparency: 'langsung',
    match: ['何か', '何も'],
  },
  bp_n5_060: {
    parts: [{ text: 'どう', role: 'kata keterangan', meaning: 'bagaimana' }, SHITE],
    literal: 'Dengan berbuat bagaimana (sampai jadi begini)?',
    natural: 'Mengapa / kenapa',
    explanation:
      'どうして asalnya "berbuat bagaimana". Bertanya bagaimana sesuatu bisa terjadi lama-lama menjadi bertanya alasannya. Lebih lembut daripada なぜ.',
    transparency: 'kiasan',
    match: ['どうして'],
  },
  bp_n5_063: {
    parts: [
      { text: 'どう', role: 'kata keterangan', meaning: 'bagaimana' },
      { text: 'やって', role: 'bentuk', meaning: 'bentuk て dari やる: "melakukan, lalu"' },
    ],
    literal: 'Dengan melakukan bagaimana',
    natural: 'Bagaimana caranya',
    explanation:
      'やって adalah bentuk て dari やる (melakukan). どうやって menanyakan cara: dengan melakukan apa tindakan berikutnya terlaksana. Beda dengan どうして yang kini menanyakan alasan.',
    transparency: 'langsung',
    match: ['どうやって'],
  },
  bp_n5_081: {
    parts: [
      { text: '何', reading: 'なん', role: 'kata benda', meaning: 'apa' },
      { text: 'で', role: 'partikel', meaning: 'sarana / sebab: "dengan, karena"' },
    ],
    literal: 'Karena apa',
    natural: 'Kenapa (santai)',
    explanation:
      'で menandai sarana atau sebab, jadi 何で berarti "dengan/karena apa". Bisa menanyakan alasan (kenapa) atau sarana (naik apa). Sebagai "kenapa", nadanya santai.',
    transparency: 'langsung',
    match: ['なんで'],
  },
  bp_n5_066: {
    parts: [
      { text: 'ど', role: 'kata benda', meaning: 'kata tanya: "yang mana"' },
      { text: 'んな', role: 'kontraksi', meaning: 'dari のような: "seperti"' },
    ],
    literal: 'Yang seperti apa',
    natural: 'X yang bagaimana / jenis apa',
    explanation:
      'どんな berasal dari どのような yang dipersingkat. Satu keluarga dengan こんな (seperti ini), そんな (seperti itu), dan あんな (seperti itu, yang jauh). Selalu diikuti kata benda: どんな人.',
    transparency: 'kiasan',
    match: ['どんな'],
  },

  // ── Kata kerja: pilihan, perubahan, cara ──
  bp_n5_084: {
    parts: [
      { text: 'に', role: 'partikel', meaning: 'hasil: "menjadi …"' },
      { text: 'する', role: 'kata kerja', meaning: 'membuat, melakukan' },
    ],
    literal: 'Membuat (pilihan) menjadi X',
    natural: 'Memilih X / memutuskan X',
    explanation:
      'に menandai hasil dan する berarti membuat. Membuat pilihan "jatuh menjadi" X berarti memutuskan X. Sering dipakai saat memesan: コーヒーにします.',
    transparency: 'kiasan',
    match: ['にし(?:ます|ましょう|た|よう)'],
  },
  bp_n5_085: {
    parts: [
      { text: 'に／く', role: 'bentuk', meaning: 'に setelah kata benda / sifat-na; く dari sifat-i' },
      { text: 'なる', role: 'kata kerja', meaning: 'menjadi, berubah' },
    ],
    literal: 'Berubah menjadi X',
    natural: 'Menjadi X',
    explanation:
      'なる berarti berubah menjadi. Hasil perubahan ditandai に (大学生になる, 静かになる). Kata sifat-i memakai bentuk く: 寒い → 寒くなる.',
    transparency: 'langsung',
    match: ['[にく]な(?:る|ります|りました|った)'],
  },
  bp_n5_069: {
    parts: [NAI, { text: 'で', role: 'partikel', meaning: 'penyambung: "dengan (keadaan) …, lalu"' }],
    literal: 'Dengan tidak melakukan X, (lalu) …',
    natural: 'Tanpa melakukan X',
    explanation:
      'で menyambungkan keadaan "tidak melakukan X" ke tindakan berikutnya, sehingga tindakan itu dilakukan tanpa X. Bedakan dengan なくて, yang menyatakan sebab: 来なくて困った (dia tidak datang, jadi repot).',
    transparency: 'langsung',
    match: ['ないで'],
  },
  bp_n5_042: {
    parts: [
      { text: 'たり', role: 'bentuk', meaning: 'dari bentuk た: "melakukan … (antara lain)"' },
      { text: 'する', role: 'kata kerja', meaning: 'melakukan' },
    ],
    literal: 'Melakukan X, melakukan Y, (begitulah) yang dilakukan',
    natural: 'Melakukan X, Y, dan lain-lain',
    explanation:
      'たり dibentuk dari bentuk た (読んだ → 読んだり). Beberapa kegiatan dideretkan sebagai contoh, lalu ditutup dengan する. Kegiatannya antara lain itu dan tidak harus berurutan.',
    transparency: 'langsung',
    match: ['[ただ]り'],
  },
  bp_n5_014: {
    parts: [{ text: '方', reading: 'かた', role: 'kata benda', meaning: 'arah, sisi → cara' }],
    literal: 'Arah (jalan) melakukan X',
    natural: 'Cara melakukan X',
    explanation:
      '方 berarti arah atau sisi, dan dari situ "cara". Ditempelkan pada verba bentuk masu tanpa ます: 使い方 (cara memakai), 書き方 (cara menulis). Hasilnya kata benda, jadi objeknya disambung dengan の: 漢字の書き方.',
    transparency: 'kiasan',
    match: ['方'],
  },
  bp_n5_103: {
    parts: [
      { text: 'ます', role: 'bentuk', meaning: 'bentuk sopan' },
      { text: 'う', role: 'bentuk', meaning: 'kehendak / ajakan: "mari …"' },
    ],
    literal: 'Mari (kita) melakukan X (sopan)',
    natural: 'Mari / ayo melakukan X',
    explanation:
      'ましょう adalah bentuk kehendak (う) dari ます: ます + う → ましょう. Menyatakan ajakan yang yakin akan diterima, atau kehendak pembicara. Kalau ingin bertanya dulu, pakai ませんか atau ましょうか.',
    transparency: 'kiasan',
    match: ['ましょう'],
  },
  bp_n5_108: {
    parts: [
      { text: 'まだ', role: 'kata keterangan', meaning: 'masih' },
      { text: 'ている', role: 'bentuk', meaning: 'keadaan (hasil) tindakan' },
      { text: 'ません', role: 'bentuk', meaning: 'negatif sopan' },
    ],
    literal: 'Masih belum dalam keadaan sudah X',
    natural: 'Belum melakukan X',
    explanation:
      'Untuk "belum", bahasa Jepang memakai bentuk ている negatif: keadaan "sudah X" masih belum ada. まだ食べていません, bukan まだ食べません (yang berarti "belum mau makan").',
    transparency: 'kiasan',
    match: ['[てで]いません', '[てで]いない'],
  },

  // ── Perbandingan ──
  bp_n5_003: {
    parts: [
      { text: '一', reading: 'いち', role: 'kata benda', meaning: 'satu' },
      { text: '番', reading: 'ばん', role: 'kata benda', meaning: 'nomor urut, giliran' },
    ],
    literal: 'Nomor satu',
    natural: 'Paling X',
    explanation:
      '番 adalah nomor urut. Yang menempati nomor satu dalam suatu kelompok adalah yang paling …. Karena itu 一番 diletakkan di depan kata sifat: 一番高い = paling tinggi.',
    transparency: 'langsung',
    match: ['一番'],
  },
  bp_n5_095: {
    parts: [
      { text: 'の中で', reading: 'のなかで', role: 'kata benda', meaning: '"di dalam (kelompok) …"' },
      GA_SUBJ,
      ICHIBAN,
    ],
    literal: 'Di dalam kelompok X, Y-lah nomor satu',
    natural: 'Di antara X, Y yang paling …',
    explanation:
      '中 (dalam) + で (lingkup) membatasi kelompok yang dibandingkan. Pemenangnya ditandai が, lalu 一番 + sifat menyatakan "paling". Untuk bertanya: 果物の中で何が一番好きですか.',
    transparency: 'langsung',
    match: ['の中で'],
  },
  bp_n5_098: {
    parts: [WA_TOPIC, { text: 'より', role: 'partikel', meaning: 'titik pembanding: "daripada …"' }],
    literal: 'Kalau soal A, dibanding B, (itu) …',
    natural: 'A lebih … daripada B',
    explanation:
      'より menandai titik pembanding. Kata "lebih" tidak diucapkan: A は B より速い = A, dibanding B, cepat → A lebih cepat. Yang dibicarakan (A) menjadi topik dengan は.',
    transparency: 'langsung',
    match: ['より'],
  },
  bp_n5_115: {
    parts: [{ text: 'より', role: 'partikel', meaning: 'titik pembanding: "daripada …"' }, { text: 'の', role: 'partikel', meaning: 'milik: "…-nya"' }, HOU, GA_SUBJ],
    literal: 'Dibanding A, sisi B-lah (yang) …',
    natural: 'Dibanding A, B lebih …',
    explanation:
      'より menandai yang dibandingkan, dan ほう (sisi) menandai pilihan yang "menang". Urutannya kebalikan dari は〜より: yang lebih diletakkan di belakang dan ditandai のほうが.',
    transparency: 'langsung',
    match: ['のほうが'],
  },

  // ── Lain-lain ──
  bp_n5_004: {
    parts: [
      { text: '一緒', reading: 'いっしょ', role: 'kata benda', meaning: 'satu kesatuan, bersama' },
      { text: 'に', role: 'partikel', meaning: 'cara: "dengan (keadaan) …"' },
    ],
    literal: 'Dalam keadaan menjadi satu',
    natural: 'Bersama-sama',
    explanation:
      '一緒 berarti keadaan menjadi satu. に mengubahnya menjadi keterangan cara: melakukan sesuatu dalam keadaan bersatu = bersama-sama. Teman bersama ditandai と: 友だちと一緒に.',
    transparency: 'langsung',
    match: ['一緒に'],
  },
  bp_n5_022: {
    parts: [{ text: 'くらい', role: 'kata benda', meaning: 'dari 位: tingkat, kedudukan' }],
    literal: 'Pada tingkat X',
    natural: 'Kira-kira X / sekitar X',
    explanation:
      'くらい berasal dari 位 (tingkat, kedudukan). Menyebut jumlah "pada tingkat sekitar X" membuat angkanya menjadi perkiraan. くらい dan ぐらい dipakai bergantian.',
    transparency: 'kiasan',
    match: ['[くぐ]らい'],
  },
  bp_n5_039: {
    parts: [{ text: 'だけ', role: 'partikel', meaning: 'dari 丈 (たけ): ukuran, batas' }],
    literal: 'Sebatas ukuran X',
    natural: 'Hanya X / X saja',
    explanation:
      'だけ berasal dari 丈 (たけ), "ukuran, panjang". Sesuatu yang sebatas ukuran X tidak lebih dari X, sehingga maknanya menjadi "hanya". Nadanya netral.',
    transparency: 'kiasan',
    match: ['だけ'],
  },
  bp_n5_093: {
    parts: [NO_NOMINAL, GA_OBJ, { text: '下手', reading: 'へた', role: 'kata sifat', meaning: 'kurang pandai, payah' }],
    literal: 'Hal melakukan X, (itu yang) payah',
    natural: 'Tidak pandai melakukan X',
    explanation:
      'Sama seperti のが上手: の membendakan kegiatan X, lalu が menandainya sebagai bidang yang dinilai. Untuk kekurangan diri sendiri lebih halus memakai 苦手.',
    transparency: 'langsung',
    match: ['のが下手'],
  },
  bp_n5_100: {
    parts: [
      { text: 'へ', role: 'partikel', meaning: 'arah: "menuju …"' },
      { text: '行く', reading: 'いく', role: 'kata kerja', meaning: 'pergi' },
    ],
    literal: 'Pergi menuju X',
    natural: 'Pergi ke X',
    explanation:
      'へ (dibaca "e") menandai arah gerakan. Hampir sama dengan に: へ menekankan arah perjalanan, に menekankan titik tujuan.',
    transparency: 'langsung',
    match: ['へ行(?:く|き|っ)'],
  },
  bp_n5_118: {
    parts: [{ text: 'を', role: 'partikel', meaning: 'penanda objek' }, KUDASAI],
    literal: 'Berilah (saya) X',
    natural: 'Tolong beri saya X / minta X',
    explanation:
      'を menandai benda yang diminta, dan ください (berilah) adalah bentuk perintah sopan dari くださる. Dipakai untuk memesan atau meminta barang.',
    transparency: 'langsung',
    match: ['をください'],
  },
};
