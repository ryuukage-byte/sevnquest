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
      { text: 'ん', role: 'partikel', meaning: 'の yang diucapkan ringkas: "hal bahwa …"' },
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
      { text: 'で', role: 'kopula', meaning: 'bentuk sambung だ: "adalah …, (maka)"' },
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
};
