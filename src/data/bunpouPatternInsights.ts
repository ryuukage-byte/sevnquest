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
  // ══ N4 ══
  // ── Verba majemuk: bentuk masu + verba/sifat kedua ──
  bp_n4_001: {
    parts: [{ text: '終わる', reading: 'おわる', role: 'kata kerja', meaning: 'selesai, berakhir' }],
    literal: 'Melakukan X sampai selesai',
    natural: 'Selesai melakukan X',
    explanation:
      'Verba bentuk masu tanpa ます disambung langsung dengan 終わる: 読み終わる (selesai membaca). Menekankan bahwa tindakannya tuntas sampai akhir.',
    transparency: 'langsung',
    match: ['終わ(?:る|った|って)'],
  },
  bp_n4_003: {
    parts: [{ text: '出す', reading: 'だす', role: 'kata kerja', meaning: 'mengeluarkan' }],
    literal: 'Mengeluarkan (tindakan) X',
    natural: 'Tiba-tiba mulai X',
    explanation:
      '出す berarti mengeluarkan. Tindakan yang "dikeluarkan" muncul tiba-tiba, sehingga 泣き出す berarti tiba-tiba mulai menangis. Lebih mendadak daripada 〜始める.',
    transparency: 'kiasan',
    match: ['出し(?:た|ました)', '出す'],
  },
  bp_n4_004: {
    parts: [{ text: '続ける', reading: 'つづける', role: 'kata kerja', meaning: 'melanjutkan' }],
    literal: 'Melanjutkan X',
    natural: 'Terus-menerus melakukan X',
    explanation: 'Verba bentuk masu + 続ける: tindakan X dilanjutkan tanpa berhenti. 歌い続ける (terus bernyanyi), 持ち続ける (terus memiliki).',
    transparency: 'langsung',
    match: ['続け(?:る|た|ました|て)'],
  },
  bp_n4_008: {
    parts: [{ text: '始める', reading: 'はじめる', role: 'kata kerja', meaning: 'memulai' }],
    literal: 'Memulai X',
    natural: 'Mulai melakukan X',
    explanation: 'Verba bentuk masu + 始める menandai titik awal tindakan atau perubahan: 話し始める (mulai berbicara), 咲き始める (mulai mekar).',
    transparency: 'langsung',
    match: ['始め(?:る|た|ました)'],
  },
  bp_n4_006: {
    parts: [{ text: '直す', reading: 'なおす', role: 'kata kerja', meaning: 'memperbaiki' }],
    literal: 'Memperbaiki dengan melakukan X',
    natural: 'Melakukan X sekali lagi (untuk memperbaiki)',
    explanation: '直す berarti memperbaiki. Melakukan ulang suatu tindakan supaya hasilnya lebih baik: 書き直す (menulis ulang), 考え直す (memikirkan ulang).',
    transparency: 'langsung',
    match: ['直し(?:た|ました)', '直す'],
  },
  bp_n4_009: {
    parts: [{ text: 'やすい', role: 'kata sifat', meaning: '易い: mudah' }],
    literal: 'Mudah di-X',
    natural: 'Mudah X / gampang X',
    explanation:
      'やすい (易い) berarti mudah. 使いやすい = mudah dipakai. Untuk hal yang tidak disengaja, artinya "gampang terjadi": 汚れやすい (gampang kotor). Hasilnya kata sifat-i.',
    transparency: 'langsung',
    match: ['やす(?:い|かった|く)'],
  },
  bp_n4_007: {
    parts: [{ text: 'にくい', role: 'kata sifat', meaning: 'seasal dengan 憎い: menjengkelkan → sulit' }],
    literal: 'Menjengkelkan untuk di-X',
    natural: 'Sulit X',
    explanation:
      'にくい seasal dengan 憎い (menjengkelkan). Sesuatu yang "menjengkelkan" untuk dilakukan berarti sulit dilakukan. Lawan kata 〜やすい. Kesulitannya cenderung objektif, misalnya karena bentuk atau sifat benda.',
    transparency: 'kiasan',
    match: ['にく(?:い|かった|く)'],
  },
  bp_n4_005: {
    parts: [{ text: 'づらい', role: 'kata sifat', meaning: 'dari 辛い (つらい): berat, menyiksa' }],
    literal: 'Berat (terasa menyiksa) untuk di-X',
    natural: 'Sulit / tidak enak untuk X',
    explanation:
      'づらい berasal dari 辛い (つらい, berat, menyiksa). Kesulitannya terasa secara fisik atau perasaan: 言いづらい (tidak enak untuk mengatakannya). Bandingkan にくい yang lebih objektif.',
    transparency: 'kiasan',
    match: ['づら(?:い|かった|く)'],
  },
  bp_n4_002: {
    parts: [{ text: 'がり', role: 'kontraksi', meaning: 'dari がる: "menunjukkan tanda-tanda (perasaan)"', base: 'がる' }],
    literal: 'Orang yang (selalu) menunjukkan tanda X',
    natural: 'Orang yang gampang merasa X',
    explanation:
      'がり adalah bentuk benda dari がる (menunjukkan tanda-tanda perasaan). 寒がり = orang yang selalu tampak kedinginan, 寂しがり = orang yang gampang kesepian. Menyatakan watak, bukan perasaan sesaat.',
    transparency: 'kiasan',
    match: ['がり'],
  },
  bp_n4_045: {
    parts: [{ text: 'がる', role: 'kata kerja', meaning: 'menunjukkan tanda-tanda (perasaan)' }],
    literal: 'Menunjukkan tanda merasa X',
    natural: '(Orang lain) tampak merasa X',
    explanation:
      'Perasaan orang lain tidak bisa diketahui langsung, hanya terlihat dari tanda-tandanya. がる ditempelkan pada akar kata sifat perasaan: 怖い → 怖がる (tampak takut), 欲しい → 欲しがる. Untuk diri sendiri cukup 怖い.',
    transparency: 'kiasan',
    match: ['が(?:って|り|る)'],
  },
  bp_n4_081: {
    parts: [
      { text: 'た(い)', role: 'bentuk', meaning: 'たい: "ingin …"', base: 'たい' },
      { text: 'がる', role: 'kata kerja', meaning: 'menunjukkan tanda-tanda (perasaan)' },
    ],
    literal: 'Menunjukkan tanda ingin X',
    natural: '(Orang lain) ingin X',
    explanation:
      'たい hanya dipakai untuk keinginan sendiri. Untuk orang ketiga, い pada たい dibuang lalu diberi がる: 遊びたい → 遊びたがる. Keinginannya terlihat dari sikap orang itu. Objeknya biasanya ditandai を.',
    transparency: 'langsung',
    match: ['たが(?:る|って|ります|った)'],
  },
  bp_n4_010: {
    parts: [
      { text: '化', reading: 'か', role: 'kata benda', meaning: 'berubah, menjadi' },
      { text: 'する', role: 'kata kerja', meaning: 'melakukan / menjadi' },
    ],
    literal: 'Berubah menjadi X',
    natural: 'Menjadi X / me-X-kan (-isasi)',
    explanation:
      '化 berarti berubah wujud. Ditempelkan pada kata benda, maknanya mirip akhiran "-isasi": 都市化 (urbanisasi), 自動化 (otomatisasi). Dengan する bisa berarti berubah sendiri atau mengubah sesuatu.',
    transparency: 'langsung',
    match: ['化し(?:た|ました|て)', '化す'],
  },
  bp_n4_011: {
    parts: [{ text: '代', reading: 'だい', role: 'kata benda', meaning: 'masa, generasi' }],
    literal: 'Masa (angka) X',
    natural: 'Usia X-an / tahun X-an',
    explanation: '代 berarti masa atau generasi. Setelah angka puluhan menyatakan rentang sepuluh tahun: 20代 = usia dua puluhan, 1990年代 = tahun 1990-an.',
    transparency: 'langsung',
    match: ['代'],
  },
  bp_n4_018: {
    parts: [{ text: '風', reading: 'ふう', role: 'kata benda', meaning: 'corak, gaya (seperti pada 風景, 風習)' }],
    literal: 'Bercorak X',
    natural: 'Bergaya X / ala X',
    explanation:
      'Selain "angin", 風 juga berarti corak atau gaya, seperti pada 風景 (pemandangan) dan 風習 (adat). Dibaca ふう: 中華風 (ala Tiongkok), 昔風 (gaya zaman dulu).',
    transparency: 'kiasan',
    match: ['風'],
  },

  // ── Permintaan santai (ください dibuang) ──
  bp_n4_012: {
    parts: [TE, { ...KUDASAI, omitted: true }],
    literal: 'Lakukan X, (tolong)',
    natural: 'Tolong X (santai)',
    explanation: 'Ini てください yang dibuang ください-nya. Dipakai kepada teman atau keluarga: 待って (tunggu), 見て (lihat).',
    transparency: 'langsung',
    match: ['[てで](?=[。！!])'],
  },
  bp_n4_015: {
    parts: [{ text: 'ないで', role: 'bentuk', meaning: 'ない + で: "dengan tidak melakukan …"' }, { ...KUDASAI, omitted: true }],
    literal: 'Dengan tidak X, (tolong)',
    natural: 'Jangan X (santai)',
    explanation: 'Ini ないでください yang dibuang ください-nya. Larangan atau permintaan halus kepada orang dekat: 心配しないで (jangan khawatir).',
    transparency: 'langsung',
    match: ['ないで'],
  },

  // ── Kopula & partikel ──
  bp_n4_013: {
    parts: [DE_COPULA, MO_EVEN],
    literal: 'Walaupun A, walaupun B',
    natural: 'Baik A maupun B (sama saja)',
    explanation:
      'でも = で (bentuk sambung だ) + も (walaupun). Diulang pada dua hal: "walaupun A, walaupun B", artinya pilihan mana pun tidak masalah.',
    transparency: 'kiasan',
    match: ['でも'],
  },
  bp_n4_014: {
    parts: [NAI, { text: 'は', role: 'partikel', meaning: 'topik / penekanan' }, NAI],
    literal: 'X yang tidak …, tidak ada',
    natural: 'Semua X (tanpa kecuali)',
    explanation:
      'Dua negatif saling meniadakan: 買えないものはない = barang yang tidak bisa dibeli, tidak ada → semua bisa dibeli. Untuk orang dipakai いない: 知らない人はいない.',
    transparency: 'kiasan',
    match: ['はい?ない'],
  },
  bp_n4_016: {
    parts: [
      { text: 'の', role: 'partikel', meaning: 'penjelasan: "hal bahwa …"' },
      { text: 'だろう', role: 'kopula', meaning: 'dugaan: "mungkin"', base: 'だ' },
      KA_Q,
    ],
    literal: 'Apakah (memang) hal X itu mungkin?',
    natural: 'Apakah benar X, ya? (bertanya dalam hati)',
    explanation:
      'の menjadikan X sebagai hal yang perlu dijelaskan, だろう menduga, dan か bertanya. Pertanyaannya ditujukan pada diri sendiri, sehingga bernada merenung atau ragu. Bentuk sopannya のでしょうか.',
    transparency: 'kiasan',
    match: ['のだろうか'],
  },
  bp_n4_017: {
    parts: [
      { text: 'の', role: 'partikel', meaning: 'dari (kelompok)' },
      { text: '一つ', reading: 'ひとつ', role: 'kata benda', meaning: 'satu (buah)' },
      { text: 'だ', role: 'kopula', meaning: 'adalah' },
    ],
    literal: 'Adalah satu dari kelompok Y',
    natural: 'X adalah salah satu Y',
    explanation: 'Y adalah kelompoknya, の一つ = satu di antaranya. Untuk orang dipakai ひとり: 学生のひとりです.',
    transparency: 'langsung',
    match: ['の(?:一つ|ひとつ|ひとり|一人)'],
  },

  // ── Waktu ──
  bp_n4_020: {
    parts: [{ text: '間', reading: 'あいだ', role: 'kata benda', meaning: 'jarak, sela (waktu)' }],
    literal: 'Sepanjang sela waktu X',
    natural: 'Selama X',
    explanation:
      '間 adalah jarak atau sela. Dalam waktu, 間 mencakup seluruh rentang X, jadi tindakan berikutnya juga berlangsung sepanjang rentang itu: 寝ているあいだ、ずっと本を読んでいた.',
    transparency: 'langsung',
    match: ['あいだ', '間'],
  },
  bp_n4_021: {
    parts: [
      { text: '間', reading: 'あいだ', role: 'kata benda', meaning: 'jarak, sela (waktu)' },
      { text: 'に', role: 'partikel', meaning: 'titik waktu: "pada …"' },
    ],
    literal: 'Pada (suatu titik) di dalam sela waktu X',
    natural: 'Sementara X (sebelum X selesai)',
    explanation:
      'に menunjuk satu titik. 間に berarti tindakan berikutnya terjadi pada suatu saat di dalam rentang X dan selesai sebelum X berakhir. Bandingkan 間 tanpa に, yang berlangsung sepanjang rentang.',
    transparency: 'langsung',
    match: ['あいだに', '間に'],
  },
  bp_n4_022: {
    parts: [
      { text: '後', reading: 'あと', role: 'kata benda', meaning: 'belakang, sesudah' },
      { text: 'で', role: 'partikel', meaning: 'titik/lingkup waktu' },
    ],
    literal: 'Di bagian sesudah X',
    natural: 'Sesudah X',
    explanation: 'Verba sebelum 後で selalu bentuk た (したあとで), karena X sudah selesai. Kata benda memakai の: 昼ご飯のあとで.',
    transparency: 'langsung',
    match: ['(?:後|あと)で'],
  },
  bp_n4_086: {
    parts: [
      { text: 'た', role: 'bentuk', meaning: 'bentuk lampau: "sudah …"' },
      { text: 'ところ', role: 'kata benda', meaning: 'tempat → titik (waktu)' },
    ],
    literal: 'Tepat di titik sudah X',
    natural: 'Baru saja X (tepat sekarang)',
    explanation:
      'ところ (tempat) dipakai untuk titik waktu. た + ところ = tepat di titik setelah X selesai. Menekankan waktunya yang baru sekali, bukan perasaan "masih baru".',
    transparency: 'kiasan',
    match: ['[ただ]ところ'],
  },
  bp_n4_087: {
    parts: [
      { text: 'た', role: 'bentuk', meaning: 'bentuk lampau: "sudah …"' },
      { text: 'ばかり', role: 'partikel', meaning: '"hanya, sekitar"' },
    ],
    literal: 'Hanya (sedikit) setelah X',
    natural: 'Baru saja X (terasa masih baru)',
    explanation:
      'ばかり berarti "hanya". た + ばかり = baru sebentar setelah X, menurut perasaan pembicara. Bisa saja sudah berbulan-bulan (入ったばかり), berbeda dengan たところ yang benar-benar baru saja.',
    transparency: 'kiasan',
    match: ['[ただ]ばかり'],
  },
  bp_n4_098: {
    parts: [
      { text: 'ている', role: 'bentuk', meaning: 'sedang (berlangsung)' },
      { text: 'ところ', role: 'kata benda', meaning: 'tempat → titik (waktu)' },
    ],
    literal: 'Di titik sedang X',
    natural: 'Sedang di tengah-tengah X',
    explanation: 'ところ menunjuk titik waktu. ている + ところ menegaskan bahwa pembicara sedang berada di tengah tindakan X, tepat saat itu.',
    transparency: 'kiasan',
    match: ['[てで]いるところ'],
  },

  // ── Batas & jumlah ──
  bp_n4_024: {
    parts: [
      { text: '以', reading: 'い', role: 'kata benda', meaning: 'mulai dari, dengan patokan' },
      { text: '下', reading: 'か', role: 'kata benda', meaning: 'bawah' },
    ],
    literal: 'Dari X ke bawah',
    natural: 'X atau kurang (X termasuk)',
    explanation: '以 menjadikan X sebagai patokan, 下 menunjuk ke bawah. Patokannya ikut terhitung: 12歳以下 = 12 tahun atau kurang.',
    transparency: 'langsung',
    match: ['以下'],
  },
  bp_n4_027: {
    parts: [
      { text: '以', reading: 'い', role: 'kata benda', meaning: 'mulai dari, dengan patokan' },
      { text: '上', reading: 'じょう', role: 'kata benda', meaning: 'atas' },
    ],
    literal: 'Dari X ke atas',
    natural: 'X atau lebih (X termasuk)',
    explanation: '以 menjadikan X sebagai patokan, 上 menunjuk ke atas. Patokannya ikut terhitung: 18歳以上 = 18 tahun ke atas.',
    transparency: 'langsung',
    match: ['以上'],
  },
  bp_n4_025: {
    parts: [
      { text: '以', reading: 'い', role: 'kata benda', meaning: 'mulai dari, dengan patokan' },
      { text: '外', reading: 'がい', role: 'kata benda', meaning: 'luar' },
    ],
    literal: 'Di luar X',
    natural: 'Selain X / kecuali X',
    explanation: 'Semua yang berada di luar patokan X. 水曜日以外 = selain hari Rabu. Dengan predikat negatif: 私以外だれも分からない (selain saya tidak ada yang tahu).',
    transparency: 'langsung',
    match: ['以外'],
  },
  bp_n4_033: {
    parts: [
      { text: 'おき', role: 'kata benda', meaning: 'dari 置く: menaruh, menyisihkan (jeda)' },
      { text: 'に', role: 'partikel', meaning: 'frekuensi' },
    ],
    literal: 'Dengan menyisihkan X',
    natural: 'Setiap selang X',
    explanation:
      'おき dari 置く (menaruh, menyisihkan). 1日おきに = menyisihkan satu hari di antaranya → selang sehari (hari ini ya, besok tidak, lusa ya). Untuk satuan waktu kecil (10分おき) artinya sama dengan "setiap 10 menit".',
    transparency: 'kiasan',
    match: ['おきに'],
  },
  bp_n4_054: {
    parts: [
      { text: 'ごと', role: 'kata benda', meaning: '毎: setiap' },
      { text: 'に', role: 'partikel', meaning: 'frekuensi' },
    ],
    literal: 'Pada setiap X',
    natural: 'Setiap X / tiap kali X',
    explanation: 'ごと (毎) berarti setiap. 四年ごとに = setiap empat tahun. Setelah verba: 会うごとに = setiap kali bertemu.',
    transparency: 'langsung',
    match: ['ごとに'],
  },

  // ── Keigo ──
  bp_n4_030: {
    parts: [{ text: 'お', role: 'bentuk', meaning: 'awalan hormat (ご untuk kata kanji)' }, KUDASAI],
    literal: 'Berilah (saya) tindakan Anda yang terhormat X',
    natural: 'Silakan X (sangat sopan)',
    explanation:
      'Verba bentuk masu tanpa ます diapit お〜ください: お待ちください. Kata benda kanji (verba する) memakai ご: ご利用ください. Lebih hormat daripada てください; sering dipakai petugas dan pengumuman.',
    transparency: 'kiasan',
    match: ['[おご][^をがは、。]{1,4}ください'],
  },
  bp_n4_031: {
    parts: [{ text: 'お', role: 'bentuk', meaning: 'awalan hormat (ご untuk kata kanji)' }, { text: 'する', role: 'kata kerja', meaning: 'melakukan' }],
    literal: '(Saya) melakukan X yang terhormat',
    natural: 'Saya X-kan untuk Anda (merendah)',
    explanation:
      'Bahasa merendah (謙譲語): pembicara melakukan sesuatu untuk orang yang dihormati. お持ちします = saya bawakan. Tindakan orang yang dihormati tidak boleh memakai pola ini; untuk itu dipakai お〜になる.',
    transparency: 'kiasan',
    match: ['[おご][^をがは、。]{1,4}し(?:ます|ました)'],
  },
  bp_n4_032: {
    parts: [
      { text: 'お', role: 'bentuk', meaning: 'awalan hormat (ご untuk kata kanji)' },
      { text: 'に', role: 'partikel', meaning: 'hasil: "menjadi …"' },
      { text: 'なる', role: 'kata kerja', meaning: 'menjadi' },
    ],
    literal: '(Beliau) menjadi X yang terhormat',
    natural: 'Beliau X (meninggikan)',
    explanation:
      'Bahasa hormat (尊敬語): tindakan orang yang dihormati disajikan sebagai sesuatu yang "menjadi", bukan dikerjakan langsung. Cara tidak langsung ini terasa hormat: お帰りになる = beliau pulang.',
    transparency: 'kiasan',
    match: ['[おご][^をがは、。]{1,4}にな(?:りました|ります|る|った)'],
  },

  // ── か: ragu & tanya tidak langsung ──
  bp_n4_043: {
    parts: [
      KA_Q,
      MO_EVEN,
      { text: 'しれない', role: 'kata kerja', meaning: '知れない: "tidak bisa diketahui"' },
    ],
    literal: 'Apakah X? Itu pun tidak bisa diketahui',
    natural: 'Mungkin X',
    explanation:
      'しれない adalah 知れない, "tidak bisa diketahui". "Apakah X atau tidak, tidak bisa dipastikan" → mungkin X. Kemungkinannya sekitar 50%, lebih rendah daripada だろう. Sopan: かもしれません.',
    transparency: 'kiasan',
    match: ['かもしれ(?:ない|ません|なかった)'],
  },
  bp_n4_039: {
    parts: [KA_Q, { text: 'どう', role: 'kata keterangan', meaning: 'bagaimana' }, KA_Q],
    literal: 'Apakah X, atau bagaimana',
    natural: 'Apakah X atau tidak',
    explanation:
      'Pertanyaan ya/tidak dimasukkan ke dalam kalimat lain: 本当かどうか分からない = tidak tahu benar atau tidak. どうか mewakili kemungkinan sebaliknya.',
    transparency: 'langsung',
    match: ['かどうか'],
  },
  bp_n4_040: {
    parts: [KA_Q, { text: 'な', role: 'partikel', meaning: 'perasaan / renungan' }],
    literal: 'X, ya? (kepada diri sendiri)',
    natural: 'Apa X, ya? (bertanya-tanya, santai)',
    explanation: 'か bertanya dan な menambahkan nada renungan. Pertanyaan diucapkan kepada diri sendiri: 明日は晴れるかな. Bentuk femininnya かしら.',
    transparency: 'langsung',
    match: ['かな'],
  },
  bp_n4_037: {
    parts: [KA_Q, { text: 'しら', role: 'kontraksi', meaning: 'dari 知らん: "tidak tahu"' }],
    literal: 'X? Saya tidak tahu',
    natural: 'Apa X, ya? (bertanya-tanya, feminin)',
    explanation: 'かしら berasal dari か知らん, "apakah X? saya tidak tahu". Maknanya sama dengan かな, tetapi bernada feminin.',
    transparency: 'kiasan',
    match: ['かしら'],
  },
  bp_n4_064: {
    parts: [
      { text: 'じゃ', role: 'kontraksi', meaning: 'では: "(sebagai) …"', base: 'だ' },
      NAI,
      KA_Q,
    ],
    literal: 'Bukankah (ini) X?',
    natural: 'Lho, ini kan X! / Hebat juga, X!',
    explanation:
      'Bentuknya pertanyaan negatif, tetapi pembicara sebenarnya yakin. Dipakai untuk menunjukkan sesuatu yang ditemukan (君の傘じゃないか) atau memuji dengan sedikit terkejut (よくできたじゃないか).',
    transparency: 'kiasan',
    match: ['じゃないか'],
  },

  // ── が + verba/sifat ──
  bp_n4_038: {
    parts: [GA_SUBJ, { text: 'する', role: 'kata kerja', meaning: 'melakukan → terjadi, terasa' }],
    literal: 'X (bau, suara, rasa) terjadi',
    natural: 'Tercium / terdengar / terasa X',
    explanation:
      'Untuk rangsang yang sampai ke indra, する berarti "terjadi, terasa". Rangsangnya ditandai が: いいにおいがする (tercium bau harum), 音がする (terdengar suara).',
    transparency: 'kiasan',
    match: ['がし(?:ます|ました|た|ない)'],
  },
  bp_n4_041: {
    parts: [GA_SUBJ, { text: '必要', reading: 'ひつよう', role: 'kata sifat', meaning: 'perlu' }],
    literal: 'X (itu) perlu',
    natural: 'Perlu X / membutuhkan X',
    explanation: '必要 adalah kata sifat-na, jadi hal yang dibutuhkan ditandai が. Untuk kegiatan, tambahkan こと: 練習することが必要だ.',
    transparency: 'langsung',
    match: ['が必要'],
  },
  bp_n4_042: {
    parts: [GA_SUBJ, { text: '見られる', reading: 'みられる', role: 'kata kerja', meaning: 'bentuk potensial 見る: "bisa dilihat"' }],
    literal: 'X bisa dilihat',
    natural: 'Bisa melihat X / X bisa dilihat',
    explanation: 'Dengan bentuk potensial, benda yang bisa dilihat ditandai が. Dipakai untuk pemandangan atau hal yang tersedia di suatu tempat. Bentuk ringkas 見れる terdengar santai.',
    transparency: 'langsung',
    match: ['が見られ(?:る|ます)'],
  },
  bp_n4_049: {
    parts: [KU_ADJ, { text: 'は', role: 'partikel', meaning: 'kontras: "kalau soal …"' }, NAI],
    literal: 'Kalau soal X, tidak (tetapi …)',
    natural: 'Tidak X (sih), tetapi …',
    explanation:
      'は di tengah bentuk くない memberi kontras: hanya sifat itu yang disangkal, dan biasanya ada lanjutan "tetapi": 安くはないが、おいしい.',
    transparency: 'langsung',
    match: ['くは'],
  },

  // ── こと ──
  bp_n4_052: {
    parts: [
      { text: 'こと', role: 'kata benda', meaning: 'hal, peristiwa' },
      GA_SUBJ,
      { text: 'ある', role: 'kata kerja', meaning: 'ada' },
    ],
    literal: 'Ada peristiwa (di mana) X',
    natural: 'Kadang-kadang X / ada kalanya X',
    explanation:
      'Dengan verba bentuk kamus, peristiwa X "ada" sesekali, jadi maknanya kadang-kadang. Bedakan dengan たことがある (bentuk た) yang berarti pernah.',
    transparency: 'kiasan',
    match: ['ことがあ(?:る|ります)'],
  },
  bp_n4_053: {
    parts: [
      { text: 'こと', role: 'kata benda', meaning: 'hal, perbuatan' },
      GA_SUBJ,
      { text: 'できる', role: 'kata kerja', meaning: 'bisa, terlaksana' },
    ],
    literal: 'Hal melakukan X bisa (terlaksana)',
    natural: 'Bisa melakukan X',
    explanation: 'こと membendakan kegiatan X, lalu できる menyatakan bahwa kegiatan itu bisa. Maknanya sama dengan bentuk potensial (弾ける), tetapi lebih formal.',
    transparency: 'langsung',
    match: ['ことができ(?:る|ます)'],
  },
  bp_n4_055: {
    parts: [
      { text: 'こと', role: 'kata benda', meaning: 'hal, perbuatan' },
      { text: 'に', role: 'partikel', meaning: 'hasil: "menjadi …"' },
      { text: 'する', role: 'kata kerja', meaning: 'membuat' },
    ],
    literal: 'Membuat (pilihan) menjadi hal X',
    natural: 'Memutuskan untuk X (keputusan sendiri)',
    explanation:
      'Seperti コーヒーにする (memilih kopi), tetapi yang dipilih adalah perbuatan: 走ることにする = memutuskan untuk berlari. ことにしている berarti sudah menjadi kebiasaan yang diputuskan.',
    transparency: 'kiasan',
    match: ['ことにし(?:ます|た|ている)'],
  },
  bp_n4_056: {
    parts: [
      { text: 'こと', role: 'kata benda', meaning: 'hal, perbuatan' },
      { text: 'に', role: 'partikel', meaning: 'hasil: "menjadi …"' },
      { text: 'なる', role: 'kata kerja', meaning: 'menjadi' },
    ],
    literal: '(Keadaan) menjadi hal X',
    natural: 'Diputuskan bahwa X / akhirnya X',
    explanation:
      'Pasangan ことにする. Dengan なる, keputusannya terjadi karena pihak lain atau keadaan, bukan pembicara: 転勤することになった (saya dipindahtugaskan). Juga dipakai untuk merendah meskipun keputusan sendiri.',
    transparency: 'kiasan',
    match: ['ことにな(?:る|った|りました)'],
  },

  // ── Kausatif ──
  bp_n4_060: {
    parts: [
      { text: 'させる', role: 'bentuk', meaning: 'kausatif: "membiarkan / menyuruh"' },
      { text: 'て', role: 'bentuk', meaning: 'bentuk て' },
      KUDASAI,
    ],
    literal: 'Berilah (saya) izin untuk dibiarkan X',
    natural: 'Izinkan saya X',
    explanation:
      'Kausatif させる berarti membiarkan. "Tolong biarkan saya X" menjadi permintaan izin yang sopan. Bedakan: 帰ってください (silakan Anda pulang) dan 帰らせてください (izinkan saya pulang).',
    transparency: 'kiasan',
    match: ['せてください'],
  },
  bp_n4_061: {
    parts: [
      { text: 'させる', role: 'bentuk', meaning: 'kausatif: "menyuruh"' },
      { text: 'られる', role: 'bentuk', meaning: 'pasif: "di-…"' },
    ],
    literal: 'Disuruh X',
    natural: 'Terpaksa X (karena disuruh)',
    explanation:
      'Kausatif (menyuruh) digabung pasif (di-): subjek "disuruh melakukan" X oleh orang lain, biasanya dengan rasa terpaksa. Untuk Godan sering dipendekkan: 待たせられる → 待たされる.',
    transparency: 'kiasan',
    match: ['させられ', 'され'],
  },

  // ── Negatif yang ditekankan ──
  bp_n4_023: {
    parts: [{ text: 'あまり', role: 'kata keterangan', meaning: '余り: sisa, berlebih' }, NAI],
    literal: 'Tidak sampai berlebih',
    natural: 'Tidak terlalu X',
    explanation:
      'あまり berasal dari 余り (sisa, berlebih). Dengan negatif, "tidak sampai berlebihan" menjadi "tidak terlalu": あまり面白くない. Melunakkan penyangkalan.',
    transparency: 'kiasan',
    match: ['あまり'],
  },
  bp_n4_063: {
    parts: [{ text: 'しか', role: 'partikel', meaning: '"selain …" (selalu dengan negatif)' }, NAI],
    literal: 'Selain X, tidak ada',
    natural: 'Hanya X (dan itu terasa kurang)',
    explanation:
      'しか selalu berpasangan dengan predikat negatif: 卵しかない = selain telur, tidak ada apa-apa. Berbeda dengan だけ yang netral, しか〜ない menyiratkan "terlalu sedikit".',
    transparency: 'kiasan',
    match: ['しか'],
  },
  bp_n4_069: {
    parts: [
      { text: '少し', reading: 'すこし', role: 'kata keterangan', meaning: 'sedikit' },
      MO_EVEN,
      NAI,
    ],
    literal: 'Sedikit pun tidak',
    natural: 'Sama sekali tidak X',
    explanation: 'も pada 少しも berarti "pun": sedikit pun tidak. Penyangkalan penuh yang sedikit lebih kaku daripada 全然.',
    transparency: 'langsung',
    match: ['少しも'],
  },
  bp_n4_071: {
    parts: [{ text: '全然', reading: 'ぜんぜん', role: 'kata keterangan', meaning: '全 (seluruh) + 然 (keadaan): sepenuhnya' }, NAI],
    literal: 'Sepenuhnya tidak',
    natural: 'Sama sekali tidak X',
    explanation:
      '全然 berarti "sepenuhnya". Dengan negatif: sama sekali tidak. Dalam percakapan santai juga dipakai dengan bentuk positif (全然大丈夫 = sama sekali tidak masalah).',
    transparency: 'langsung',
    match: ['全然'],
  },

  // ── それ + partikel: kata sambung ──
  bp_n4_076: {
    parts: [{ text: 'それ', role: 'kata benda', meaning: 'itu (hal sebelumnya)' }, { text: 'で', role: 'partikel', meaning: 'sebab: "karena"' }],
    literal: 'Karena itu',
    natural: 'Karena itu / lalu?',
    explanation: 'で menandai sebab, jadi それで = karena itu. Dalam percakapan juga dipakai untuk meminta lanjutan cerita: それで、どうなりましたか.',
    transparency: 'langsung',
    match: ['それで'],
  },
  bp_n4_077: {
    parts: [{ text: 'それ', role: 'kata benda', meaning: 'itu (hal sebelumnya)' }, DE_COPULA, MO_EVEN],
    literal: 'Walaupun (keadaannya) itu',
    natural: 'Meskipun begitu',
    explanation: 'それ + で + も = walaupun keadaannya begitu. Lebih tegas daripada でも di awal kalimat, yang merupakan ringkasannya.',
    transparency: 'langsung',
    match: ['それでも'],
  },
  bp_n4_078: {
    parts: [{ text: 'それ', role: 'kata benda', meaning: 'itu (hal sebelumnya)' }, { text: 'に', role: 'partikel', meaning: 'tambahan: "di atas …"' }],
    literal: 'Di atas itu',
    natural: 'Lagi pula / selain itu',
    explanation: 'に menandai tempat sesuatu ditambahkan. それに = ditambah di atas itu: menambah alasan atau hal sejenis.',
    transparency: 'kiasan',
    match: ['それに'],
  },
  bp_n4_080: {
    parts: [{ text: 'だ', role: 'kopula', meaning: 'adalah (begitu)' }, { text: 'が', role: 'partikel', meaning: 'pertentangan: "tetapi"' }],
    literal: '(Memang) begitu, tetapi',
    natural: 'Namun / tetapi (di awal kalimat)',
    explanation: 'が di sini adalah partikel "tetapi". Diberi だ (atau です yang sopan) supaya bisa berdiri di awal kalimat. Lebih kaku daripada でも.',
    transparency: 'langsung',
    match: ['だが', 'ですが'],
  },
  bp_n4_072: {
    parts: [{ text: 'そう', role: 'kata keterangan', meaning: 'begitu' }, { text: 'いう', role: 'kata kerja', meaning: 'disebut, dikatakan' }],
    literal: 'Yang disebut begitu',
    natural: 'Yang seperti itu / semacam itu',
    explanation: 'そう + いう = "yang (bisa) disebut begitu". Selalu diikuti kata benda. Satu keluarga dengan こういう (seperti ini) dan ああいう.',
    transparency: 'kiasan',
    match: ['そういう'],
  },
  bp_n4_079: {
    parts: [{ text: 'そんな', role: 'kata benda', meaning: 'seperti itu' }, { text: 'に', role: 'partikel', meaning: 'cara / tingkat' }],
    literal: 'Sampai seperti itu',
    natural: 'Segitu / sebegitu',
    explanation: 'に mengubah そんな menjadi keterangan tingkat. Dengan negatif: そんなに難しくない = tidak sesulit itu.',
    transparency: 'langsung',
    match: ['そんなに'],
  },

  // ── だけ ──
  bp_n4_082: {
    parts: [{ text: 'だけ', role: 'partikel', meaning: 'hanya' }, { text: 'で', role: 'partikel', meaning: 'sarana: "dengan"' }],
    literal: 'Hanya dengan X',
    natural: 'Hanya dengan X (sudah cukup)',
    explanation: 'だけ (hanya) + で (sarana): hal kecil X saja sudah cukup untuk menimbulkan akibatnya. 声を聞くだけで元気になる.',
    transparency: 'langsung',
    match: ['だけで'],
  },
  bp_n4_083: {
    parts: [
      { text: 'だけ', role: 'partikel', meaning: 'hanya' },
      DE_COPULA,
      { text: 'なく', role: 'bentuk', meaning: 'ない yang disambung: "tidak …"', base: 'ない' },
    ],
    literal: 'Bukan hanya X, (tetapi) …',
    natural: 'Tidak hanya X, tetapi juga Y',
    explanation: 'だけでない (bukan hanya) dalam bentuk sambung なく. Hal kedua biasanya ditandai も: 英語だけでなく、中国語も.',
    transparency: 'langsung',
    match: ['だけでなく'],
  },

  // ── たら ──
  bp_n4_088: {
    parts: [
      { text: 'た', role: 'bentuk', meaning: 'bentuk lampau: "sudah …"' },
      { text: 'ら', role: 'partikel', meaning: 'pengandaian (dari たらば)' },
    ],
    literal: 'Kalau sudah X',
    natural: 'Kalau X / setelah X',
    explanation:
      'たら dibentuk dari bentuk た, jadi syaratnya dibayangkan sudah terjadi. Karena itu たら bisa berarti "kalau" (安かったら) atau "setelah" (着いたら電話します).',
    transparency: 'kiasan',
    match: ['[ただ]ら'],
  },
  bp_n4_089: {
    parts: [{ text: 'たら', role: 'bentuk', meaning: '"kalau (sudah) …"' }, II, { text: 'ですか', role: 'kopula', meaning: 'apakah (sopan)' }],
    literal: 'Kalau X, apakah baik?',
    natural: 'Sebaiknya X bagaimana? (minta saran)',
    explanation: 'Menanyakan pilihan yang tepat dengan kata tanya: どこに出したらいいですか = sebaiknya diserahkan ke mana?',
    transparency: 'kiasan',
    match: ['[ただ]らいいですか'],
  },
  bp_n4_090: {
    parts: [{ text: 'たら', role: 'bentuk', meaning: '"kalau (sudah) …"' }, { text: 'どう', role: 'kata keterangan', meaning: 'bagaimana' }],
    literal: 'Kalau X, bagaimana?',
    natural: 'Bagaimana kalau X? (menyarankan)',
    explanation: 'Menyarankan tindakan kepada lawan bicara. Bisa terdengar agak mendesak; kepada atasan lebih aman memakai 〜てはいかがですか.',
    transparency: 'kiasan',
    match: ['[ただ]らどう'],
  },
  bp_n4_085: {
    parts: [
      { text: '例え', reading: 'たとえ', role: 'kata kerja', meaning: '例える: mencontohkan, mengumpamakan' },
      { text: 'ば', role: 'bentuk', meaning: 'pengandaian: "kalau …"' },
    ],
    literal: 'Kalau dicontohkan',
    natural: 'Misalnya',
    explanation: '例える berarti mengumpamakan. Bentuk ば (kalau) membuatnya "kalau dicontohkan", lalu menjadi kata pembuka contoh.',
    transparency: 'langsung',
    match: ['例えば'],
  },

  // ── って, から ──
  bp_n4_092: {
    parts: [
      { text: 'って', role: 'kontraksi', meaning: 'kutipan santai (= と)' },
      { text: '感じ', reading: 'かんじ', role: 'kata benda', meaning: 'kesan, rasa' },
    ],
    literal: 'Kesannya "X"',
    natural: 'Rasanya seperti X / kayak X (santai)',
    explanation: 'って mengutip, 感じ berarti kesan. Ucapan dibungkus sebagai kesan sehingga tidak terdengar tegas. Sangat santai.',
    transparency: 'kiasan',
    match: ['って感じ'],
  },
  bp_n4_044: {
    parts: [{ text: 'から', role: 'partikel', meaning: 'asal / bahan mentah' }, { text: '作る', reading: 'つくる', role: 'kata kerja', meaning: 'membuat' }],
    literal: 'Dibuat bermula dari X',
    natural: 'Dibuat dari X (bahan berubah wujud)',
    explanation:
      'から dipakai untuk bahan yang berubah wujud sehingga tidak terlihat lagi: ワインはぶどうから作られる. Kalau bahannya masih terlihat, dipakai で: 木で作った机.',
    transparency: 'langsung',
    match: ['から作'],
  },

  // ── て + verba bantu ──
  bp_n4_094: {
    parts: [TE, { text: 'あげる', role: 'kata kerja', meaning: 'memberi (kepada orang lain)' }],
    literal: 'Memberikan tindakan X (kepada orang lain)',
    natural: 'Melakukan X untuk orang lain',
    explanation:
      'あげる berarti memberi. Tindakan X "diberikan" sebagai bantuan. Kepada atasan bisa terdengar menggurui, jadi biasanya dihindari atau diganti お〜する.',
    transparency: 'kiasan',
    match: ['[てで]あげ'],
  },
  bp_n4_095: {
    parts: [TE, { text: 'いく', role: 'kata kerja', meaning: 'pergi (menjauh dari sekarang)' }],
    literal: 'Melakukan X lalu pergi',
    natural: 'X lalu pergi / terus X ke depannya',
    explanation:
      'いく bergerak menjauh dari pembicara. Arti harfiah: melakukan X sebelum pergi (食べていく). Secara waktu: perubahan atau kegiatan yang berlanjut mulai sekarang ke masa depan (勉強していく).',
    transparency: 'kiasan',
    match: ['[てで]い(?:き|く|った)'],
  },
  bp_n4_100: {
    parts: [TE, { text: 'くる', role: 'kata kerja', meaning: 'datang (mendekat ke sekarang)' }],
    literal: 'Melakukan X lalu datang (kembali)',
    natural: 'X lalu kembali / mulai X (sampai sekarang)',
    explanation:
      'くる bergerak mendekat ke pembicara. Arti harfiah: pergi melakukan X lalu kembali (買ってきます). Secara waktu: perubahan yang berlangsung sampai sekarang (暖かくなってきた).',
    transparency: 'kiasan',
    match: ['[てで]き(?:ます|ました|た)'],
  },
  bp_n4_096: {
    parts: [TE, { text: 'いた', role: 'kata kerja', meaning: 'lampau いる: "dulu berada"' }],
    literal: 'Dulu berada dalam keadaan X',
    natural: 'Sedang X (waktu itu) / dulu X',
    explanation: 'Bentuk lampau dari ている: tindakan yang sedang berlangsung pada saat itu (見ていました), atau keadaan yang berlangsung di masa lalu (住んでいました).',
    transparency: 'langsung',
    match: ['[てで]いました', '[てで]いた'],
  },
  bp_n4_097: {
    parts: [
      TE,
      { text: 'いただけ', role: 'kata kerja', meaning: 'potensial いただく: "bisa menerima (hormat)"' },
      { text: 'ません', role: 'bentuk', meaning: 'negatif sopan' },
      KA_Q,
    ],
    literal: 'Tidakkah saya bisa menerima tindakan X dari Anda?',
    natural: 'Bisakah Anda X? (sangat sopan)',
    explanation:
      'いただく = menerima dari orang yang dihormati. Pembicara bertanya apakah ia "bisa menerima" tindakan itu, dalam bentuk negatif yang memberi ruang menolak. Salah satu cara meminta yang paling sopan.',
    transparency: 'kiasan',
    match: ['[てで]いただけませんか'],
  },
  bp_n4_099: {
    parts: [TE, { text: 'おく', role: 'kata kerja', meaning: '置く: menaruh, membiarkan' }],
    literal: 'Melakukan X lalu menaruhnya (untuk nanti)',
    natural: 'X dulu (sebagai persiapan) / biarkan X',
    explanation:
      'おく (置く) berarti menaruh. Hasil tindakan X "ditaruh" untuk dipakai nanti, jadi maknanya mempersiapkan. Juga berarti membiarkan keadaan apa adanya. Dalam percakapan menjadi とく: 勉強しとく.',
    transparency: 'kiasan',
    match: ['[てで]お(?:き|い|く)'],
  },
  // ── N4: て + verba memberi / menerima ──
  bp_n4_103: {
    parts: [TE, { text: 'くれる', role: 'kata kerja', meaning: 'memberi (kepada saya / pihak saya)' }],
    literal: '(Orang lain) memberikan tindakan X kepada saya',
    natural: '(Orang lain) melakukan X untuk saya',
    explanation:
      'くれる berarti memberi kepada pembicara atau kelompoknya. Tindakan X "diberikan" sebagai kebaikan, sehingga kalimatnya bernada berterima kasih: 母が弁当を作ってくれた.',
    transparency: 'kiasan',
    match: ['[てで]くれ(?:る|た|ました|ます)'],
  },
  bp_n4_113: {
    parts: [TE, { text: 'もらう', role: 'kata kerja', meaning: 'menerima' }],
    literal: 'Menerima tindakan X (dari orang lain)',
    natural: 'Dibantu X oleh orang lain / minta orang lain X',
    explanation:
      'もらう berarti menerima. Sudut pandangnya dari penerima: 友だちに手伝ってもらった = saya menerima bantuan dari teman. Orang yang melakukan ditandai に. Bisa juga berarti sengaja meminta orang lain melakukannya.',
    transparency: 'kiasan',
    match: ['[てで]もら(?:う|った|いました|います)'],
  },
  bp_n4_114: {
    parts: [TE, { text: 'やる', role: 'kata kerja', meaning: 'memberi (kepada yang lebih rendah)' }],
    literal: 'Memberikan tindakan X (ke bawah)',
    natural: 'Melakukan X untuk (adik, anak, hewan)',
    explanation:
      'やる adalah "memberi" kepada pihak yang lebih rendah: adik, anak, hewan, tanaman. Lebih kasar daripada てあげる, jadi tidak dipakai untuk orang yang setara atau lebih tinggi.',
    transparency: 'kiasan',
    match: ['[てで]や(?:る|った|ります)'],
  },
  bp_n4_101: {
    parts: [
      TE,
      { text: 'くれて', role: 'kata kerja', meaning: 'bentuk て くれる: "karena memberi (kepada saya)"', base: 'くれる' },
      { text: 'ありがとう', role: 'kata sifat', meaning: 'terima kasih' },
    ],
    literal: 'Terima kasih karena (Anda) memberikan tindakan X kepada saya',
    natural: 'Terima kasih sudah X',
    explanation: 'て pada くれて menyatakan sebab: berterima kasih karena orang itu sudah melakukan X untuk kita. Kepada atasan: 〜てくださってありがとうございます.',
    transparency: 'langsung',
    match: ['[てで]くれてありがとう'],
  },
  bp_n4_102: {
    parts: [TE, { text: 'くれない／もらえない', role: 'kata kerja', meaning: '"tidak (mau) memberi?" / "tidak bisa menerima?"' }],
    literal: 'Tidakkah (kamu) memberikan tindakan X?',
    natural: 'Bisa tolong X? (santai)',
    explanation:
      'Meminta dalam bentuk pertanyaan negatif terdengar lebih lembut karena memberi ruang menolak. くれない dari sudut pemberi, もらえない dari sudut penerima. Versi sopannya くれませんか / もらえませんか.',
    transparency: 'kiasan',
    match: ['[てで](?:くれない|もらえない)'],
  },
  bp_n4_109: {
    parts: [TE, { text: 'ほしい', role: 'kata sifat', meaning: 'ingin (memiliki)' }],
    literal: 'Ingin (memiliki) tindakan X dari orang lain',
    natural: 'Ingin orang lain X',
    explanation:
      'たい untuk keinginan melakukan sendiri; てほしい untuk keinginan agar orang lain melakukan X. Orang itu ditandai に: 彼に来てほしい. Negatifnya ないでほしい.',
    transparency: 'langsung',
    match: ['[てで]ほしい'],
  },
  bp_n4_110: {
    parts: [TE, { text: 'みる', role: 'kata kerja', meaning: 'melihat' }],
    literal: 'Melakukan X lalu melihat (hasilnya)',
    natural: 'Mencoba X',
    explanation: 'みる (melihat) ditulis hiragana. Melakukan sesuatu untuk "melihat" bagaimana hasilnya berarti mencoba: 食べてみる (coba makan).',
    transparency: 'kiasan',
    match: ['[てで]み(?:る|ます|た)'],
  },
  bp_n4_105: {
    parts: [TE, { text: 'しまう', role: 'kata kerja', meaning: 'menyimpan, menuntaskan' }],
    literal: 'Melakukan X sampai tuntas (tersimpan)',
    natural: 'Terlanjur X / X sampai habis',
    explanation:
      'しまう berarti menyimpan atau menuntaskan. Tindakan yang "sudah tuntas" tidak bisa diulang, sehingga sering bernada menyesal (なくしてしまった). Bisa juga sekadar "sampai selesai" (全部やってしまった). Percakapan: ちゃう／じゃう.',
    transparency: 'kiasan',
    match: ['[てで]しま(?:う|った|いました|います)', '[ちじ]ゃ(?:う|った)'],
  },
  bp_n4_115: {
    parts: [TE, { text: 'よかった', role: 'kata sifat', meaning: 'lampau いい: "(ternyata) baik"' }],
    literal: '(Karena) X, (ternyata) baik',
    natural: 'Syukurlah sudah X',
    explanation: 'て menyatakan sebab, よかった menilai hasilnya baik. Lega atau senang karena sudah melakukan X. Negatif: 行かなくてよかった (syukurlah tidak pergi).',
    transparency: 'langsung',
    match: ['[てで]よかった'],
  },
  bp_n4_106: {
    parts: [TE, { text: 'すみません', role: 'kata kerja', meaning: 'maaf' }],
    literal: '(Karena) X, maaf',
    natural: 'Maaf sudah X',
    explanation: 'て menyatakan sebab dari permintaan maaf: 遅くなってすみません = maaf terlambat. Untuk kejadian yang sudah lewat bisa memakai すみませんでした.',
    transparency: 'langsung',
    match: ['[てで]すみません'],
  },

  // ── Kopula sangat sopan, bahan ──
  bp_n4_104: {
    parts: [DE_COPULA, { text: 'ございます', role: 'kata kerja', meaning: 'ある yang sangat sopan' }],
    literal: 'Adalah X (sangat sopan)',
    natural: 'Adalah X (bahasa layanan)',
    explanation: 'です berasal dari である. Dengan ある diganti ございます, jadilah でございます, bentuk sangat sopan dari です. Dipakai staf toko, hotel, dan pengumuman.',
    transparency: 'kiasan',
    match: ['でございます'],
  },
  bp_n4_107: {
    parts: [
      { text: 'で／から', role: 'partikel', meaning: 'bahan: で (terlihat), から (berubah wujud)' },
      { text: 'できる', role: 'kata kerja', meaning: 'jadi, terbentuk' },
    ],
    literal: 'Terbentuk dari X',
    natural: 'Terbuat dari X',
    explanation:
      'できる di sini berarti "terbentuk". Bahan yang masih terlihat ditandai で (木でできている); bahan yang sudah berubah wujud ditandai から (ぶどうからできる). Keadaannya biasanya memakai できている.',
    transparency: 'langsung',
    match: ['(?:で|から)でき'],
  },
  bp_n4_108: {
    parts: [DE_COPULA, { text: 'は', role: 'partikel', meaning: 'penekanan' }, NAI, KA_Q],
    literal: 'Bukankah (ini) X?',
    natural: 'Bukankah X? (menegaskan, formal)',
    explanation: 'Versi formal atau tulisan dari じゃないか. Pertanyaan negatif dipakai untuk menegaskan pendapat atau mengungkapkan temuan.',
    transparency: 'kiasan',
    match: ['ではないか'],
  },
  bp_n4_111: {
    parts: [TE, MO_EVEN],
    literal: 'Walaupun X pun',
    natural: 'Walaupun X, …',
    explanation: 'て + も (pun): hasilnya tetap sama walaupun X terjadi. Kata sifat-i: 高くても; kata benda: 雨でも. Dengan kata tanya: 何をしても (apa pun yang dilakukan).',
    transparency: 'langsung',
    match: ['[てで]も'],
  },
  bp_n4_112: {
    parts: [DE_COPULA, MO_EVEN],
    literal: 'Walaupun X pun',
    natural: 'Bahkan X / X atau semacamnya',
    explanation:
      'で + も setelah kata benda: "walaupun X pun". 子どもでもできる = bahkan anak-anak bisa. Saat menawarkan, でも melunakkan pilihan: 映画でも見ませんか (nonton film atau apa, yuk).',
    transparency: 'kiasan',
    match: ['でも'],
  },

  // ── と: kutipan & pikiran ──
  bp_n4_124: {
    parts: [{ text: 'と', role: 'partikel', meaning: 'kutipan: "bahwa …"' }, { text: '思う', reading: 'おもう', role: 'kata kerja', meaning: 'berpikir' }],
    literal: 'Berpikir "X"',
    natural: 'Menurut saya X / saya kira X',
    explanation: 'と mengutip isi pikiran. Menyampaikan pendapat dengan と思います terdengar lebih lunak daripada menyatakannya langsung. Untuk orang ketiga: と思っている.',
    transparency: 'langsung',
    match: ['と思(?:う|います|った|って)'],
  },
  bp_n4_127: {
    parts: [{ text: 'と', role: 'partikel', meaning: 'kutipan: "bahwa …"' }, { text: '聞いた', reading: 'きいた', role: 'kata kerja', meaning: 'sudah mendengar' }],
    literal: 'Mendengar "X"',
    natural: 'Saya dengar X',
    explanation: 'と mengutip isi kabar yang didengar. Menunjukkan bahwa informasinya dari orang lain, bukan pengamatan sendiri.',
    transparency: 'langsung',
    match: ['と聞(?:いた|きました|いて)'],
  },
  bp_n4_120: {
    parts: [{ text: 'と', role: 'partikel', meaning: 'kutipan' }, { text: 'いう', role: 'kata kerja', meaning: 'menyebut, mengatakan' }],
    literal: 'Yang disebut "X"',
    natural: 'Yang bernama X',
    explanation: 'と + いう = "yang disebut X". Dipakai untuk memperkenalkan nama yang mungkin belum dikenal pendengar: 田中さんという人.',
    transparency: 'langsung',
    match: ['という'],
  },
  bp_n4_121: {
    parts: [{ text: 'と', role: 'partikel', meaning: 'kutipan' }, { text: 'いう', role: 'kata kerja', meaning: 'menyebut' }, { text: 'こと', role: 'kata benda', meaning: 'hal' }],
    literal: 'Hal yang disebut "X"',
    natural: 'Hal bahwa X / (yang namanya) X',
    explanation: 'Kalimat X dibungkus menjadi satu "hal" sehingga bisa dijadikan topik atau objek: 約束を守るということは大切だ.',
    transparency: 'langsung',
    match: ['ということ'],
  },
  bp_n4_122: {
    parts: [
      { text: 'と', role: 'partikel', meaning: 'kutipan' },
      { text: '言って', reading: 'いって', role: 'kata kerja', meaning: 'bentuk て 言う: "mengatakan"' },
      MO_EVEN,
      II,
    ],
    literal: 'Walaupun dikatakan "X" pun, tidak apa',
    natural: 'Bisa dibilang X',
    explanation: 'Mirip てもいい (boleh): mengatakan X pun boleh, artinya penilaian X itu cukup tepat. Menyatakan pendapat dengan sedikit hati-hati.',
    transparency: 'kiasan',
    match: ['と言ってもいい'],
  },
  bp_n4_123: {
    parts: [
      { text: 'と', role: 'partikel', meaning: 'kutipan' },
      { text: '言われる', reading: 'いわれる', role: 'kata kerja', meaning: 'pasif 言う: "dikatakan"' },
      { text: 'ている', role: 'bentuk', meaning: 'keadaan yang berlangsung' },
    ],
    literal: '(Terus) dikatakan "X"',
    natural: 'Konon X / dikatakan bahwa X',
    explanation: 'Pasif tanpa pelaku: yang mengatakan adalah orang banyak. ている menunjukkan anggapan itu masih beredar. Dipakai untuk pengetahuan umum atau legenda.',
    transparency: 'langsung',
    match: ['と言われてい(?:る|ます)'],
  },
  bp_n4_126: {
    parts: [
      { text: 'と', role: 'partikel', meaning: 'kutipan' },
      { text: '考えられる', reading: 'かんがえられる', role: 'kata kerja', meaning: 'pasif 考える: "dianggap, diperkirakan"' },
      { text: 'ている', role: 'bentuk', meaning: 'keadaan yang berlangsung' },
    ],
    literal: '(Terus) dipikirkan "X"',
    natural: 'Diperkirakan / dianggap bahwa X',
    explanation: 'Seperti と言われている, tetapi isinya hasil pemikiran atau penelitian, bukan sekadar kabar. Lazim di tulisan ilmiah dan berita.',
    transparency: 'langsung',
    match: ['と考えられてい(?:る|ます)'],
  },
  bp_n4_128: {
    parts: [
      { text: 'と', role: 'partikel', meaning: 'kutipan' },
      { text: 'される', role: 'kata kerja', meaning: 'pasif する: "dijadikan, dianggap"' },
      { text: 'ている', role: 'bentuk', meaning: 'keadaan yang berlangsung' },
    ],
    literal: '(Terus) dijadikan "X"',
    natural: 'Dianggap / ditetapkan sebagai X',
    explanation: 'する di sini berarti "menganggap, menetapkan". Pasifnya menyatakan anggapan atau aturan yang diakui umum, sering bernada resmi: マナー違反だとされている.',
    transparency: 'kiasan',
    match: ['とされてい(?:る|ます)'],
  },
  bp_n4_129: {
    parts: [{ text: 'と', role: 'partikel', meaning: 'kutipan' }, { text: 'みえる', role: 'kata kerja', meaning: '見える: "terlihat"' }],
    literal: 'Terlihat (bahwa) "X"',
    natural: 'Rupanya X (disimpulkan dari tanda)',
    explanation: 'Dari tanda yang terlihat, pembicara menyimpulkan X: 道が濡れている → 雨が降ったとみえる. Bernada tulisan.',
    transparency: 'kiasan',
    match: ['とみえ(?:る|て)'],
  },
  bp_n4_125: {
    parts: [{ text: 'とか', role: 'partikel', meaning: 'と + か: "X, atau semacamnya"' }],
    literal: 'X, atau semacamnya, Y, atau semacamnya',
    natural: 'Misalnya X, Y (santai)',
    explanation: 'とか (と + か) menyebut beberapa contoh tanpa daftar lengkap, mirip や〜など tetapi lebih santai. Bisa juga dipakai untuk kegiatan: 掃除するとか.',
    transparency: 'langsung',
    match: ['とか'],
  },
  bp_n4_118: {
    parts: [
      { text: 'と', role: 'partikel', meaning: 'menyebut pilihan: "A dan B"' },
      { text: 'どちら', role: 'kata benda', meaning: 'yang mana (dari dua)' },
      GA_SUBJ,
    ],
    literal: 'A dan B, yang mana (yang) …?',
    natural: 'Antara A dan B, mana yang lebih …?',
    explanation: 'Dua pilihan disebut dengan と, lalu ditanyakan dengan どちら (yang mana dari dua). Jawabannya memakai のほうが: 猫のほうが好きです.',
    transparency: 'langsung',
    match: ['と、どちらが'],
  },
  bp_n4_119: {
    parts: [{ text: 'と／たら', role: 'partikel', meaning: 'syarat: "kalau …"' }, II],
    literal: 'Kalau X, (itu) baik',
    natural: 'Semoga X / alangkah baiknya kalau X',
    explanation: '"Kalau X, bagus" menyatakan harapan. Sering ditutup ね untuk mendoakan lawan bicara: 早く元気になるといいですね.',
    transparency: 'kiasan',
    match: ['(?:と|たら)いい'],
  },

  // ── ない: keharusan & sebab ──
  bp_n4_131: {
    parts: [NAI, { text: 'と', role: 'partikel', meaning: 'syarat: "kalau …, (pasti)"' }, { ...IKENAI, omitted: true }],
    literal: 'Kalau tidak X, (tidak baik)',
    natural: 'Harus X (santai)',
    explanation: 'Ini ないといけない yang sering dibuang bagian akhirnya dalam percakapan: もう帰らないと (sudah harus pulang).',
    transparency: 'kiasan',
    match: ['ないと'],
  },
  bp_n4_135: {
    parts: [{ text: 'なければ', role: 'bentuk', meaning: 'ない + ば: "kalau tidak …"' }, IKENAI],
    literal: 'Kalau tidak X, tidak baik',
    natural: 'Harus X',
    explanation: 'なければ adalah bentuk ば (kalau) dari ない. "Kalau tidak X, tidak baik" berarti X wajib. Versi santai: なきゃ.',
    transparency: 'kiasan',
    match: ['なければいけ(?:ません|ない)'],
  },
  bp_n4_136: {
    parts: [
      { text: 'なければ', role: 'bentuk', meaning: 'ない + ば: "kalau tidak …"' },
      { text: 'ならない', role: 'kata kerja', meaning: 'なる + ない: "tidak jadi, tidak beres"' },
    ],
    literal: 'Kalau tidak X, tidak akan jadi',
    natural: 'Harus X (kewajiban umum / aturan)',
    explanation: 'Sama dengan なければいけない, tetapi ならない membuatnya terdengar sebagai kewajiban umum atau aturan. Lazim di tulisan.',
    transparency: 'kiasan',
    match: ['なければな(?:りません|らない|らなかった)'],
  },
  bp_n4_134: {
    parts: [{ text: 'なく', role: 'bentuk', meaning: 'ない yang disambung', base: 'ない' }, { text: 'て', role: 'bentuk', meaning: 'sebab / sambungan' }],
    literal: 'Tidak X, (dan karena itu) …',
    natural: 'Karena tidak X, … / tidak X, dan …',
    explanation: 'なくて menyambung keadaan "tidak X" dan biasanya menyatakan sebab perasaan: 返事が来なくて心配だ. Bedakan dengan ないで (tanpa melakukan X).',
    transparency: 'langsung',
    match: ['なくて'],
  },
  bp_n4_137: {
    parts: [{ text: 'なさい', role: 'kata kerja', meaning: 'perintah dari なさる (する yang hormat)' }],
    literal: 'Lakukanlah X',
    natural: 'X-lah! (perintah orang tua / guru)',
    explanation:
      'なさい adalah bentuk perintah dari なさる. Walaupun asalnya kata hormat, kini dipakai orang tua atau guru kepada anak: 早く寝なさい. Tidak dipakai kepada atasan.',
    transparency: 'kiasan',
    match: ['なさい'],
  },

  // ── Keterangan ──
  bp_n4_141: {
    parts: [{ text: 'なる', role: 'kata kerja', meaning: 'terjadi, bisa terlaksana' }, { text: 'べく', role: 'bentuk', meaning: 'dari べし: "sebisa, sepatutnya"' }],
    literal: 'Sejauh bisa terlaksana',
    natural: 'Sebisa mungkin',
    explanation: 'なるべく = "sejauh hal itu bisa terjadi". Lebih santai daripada できるだけ yang artinya sama.',
    transparency: 'kiasan',
    match: ['なるべく'],
  },
  bp_n4_142: {
    parts: [
      { text: '何', reading: 'なん', role: 'kata benda', meaning: 'berapa' },
      { text: '(satuan)', role: 'kata benda', meaning: 'kata bantu hitung: 回, 人, 本 …' },
      { text: 'か', role: 'partikel', meaning: 'tak tentu: "entah …"' },
    ],
    literal: 'Entah berapa (kali / orang)',
    natural: 'Beberapa (kali / orang)',
    explanation: 'Seperti 誰か (seseorang), か membuat kata tanya menjadi tidak tentu: 何回か = entah berapa kali → beberapa kali.',
    transparency: 'langsung',
    match: ['何[回人個本枚度日冊つ]か'],
  },

  // ── に ──
  bp_n4_144: {
    parts: [
      { text: 'に', role: 'partikel', meaning: 'sasaran' },
      { text: '気', reading: 'き', role: 'kata benda', meaning: 'perhatian, pikiran' },
      GA_SUBJ,
      { text: 'つく', role: 'kata kerja', meaning: 'menempel' },
    ],
    literal: 'Perhatian menempel pada X',
    natural: 'Menyadari X',
    explanation: 'Perhatian (気) yang tiba-tiba "menempel" pada sesuatu berarti menyadarinya. Untuk kalimat dipakai ことに気がつく.',
    transparency: 'kiasan',
    match: ['に気がつ(?:く|き|い)'],
  },
  bp_n4_145: {
    parts: [
      { text: 'に／く', role: 'bentuk', meaning: 'に setelah kata benda / sifat-na; く dari sifat-i' },
      { text: 'する', role: 'kata kerja', meaning: 'membuat' },
    ],
    literal: 'Membuat (sesuatu) menjadi X',
    natural: 'Membuat jadi X (sengaja mengubah)',
    explanation: 'Pasangan になる・くなる: なる untuk perubahan yang terjadi sendiri, する untuk perubahan yang disengaja: 部屋をきれいにする, 音を小さくする.',
    transparency: 'langsung',
    match: ['[にく]し(?:ました|て|ます)'],
  },
  bp_n4_146: {
    parts: [{ text: 'に', role: 'partikel', meaning: 'hasil: "sebagai …"' }, { text: '見える', reading: 'みえる', role: 'kata kerja', meaning: 'terlihat' }],
    literal: 'Terlihat sebagai X',
    natural: 'Kelihatan (seperti) X',
    explanation: 'Penilaian dari penampilan. Kata benda dan sifat-na memakai に (お寺に見える, 元気に見える); kata sifat-i memakai く (若く見える).',
    transparency: 'langsung',
    match: ['に見え(?:る|ます)'],
  },
  bp_n4_147: {
    parts: [{ text: 'の', role: 'partikel', meaning: 'milik' }, { text: '次', reading: 'つぎ', role: 'kata benda', meaning: 'berikutnya' }, { text: 'に', role: 'partikel', meaning: 'posisi' }],
    literal: 'Pada urutan sesudah X',
    natural: 'Setelah X (urutan kedua sesudah X)',
    explanation: 'Menyatakan urutan dalam peringkat: 富士山の次に高い山 = gunung tertinggi kedua setelah Fuji.',
    transparency: 'langsung',
    match: ['の次に'],
  },
  bp_n4_148: {
    parts: [{ text: 'の', role: 'partikel', meaning: 'milik' }, { text: '中', reading: 'なか', role: 'kata benda', meaning: 'dalam' }, { text: 'で', role: 'partikel', meaning: 'lingkup' }],
    literal: 'Di dalam (kelompok) X',
    natural: 'Di antara X',
    explanation: 'Membatasi kelompok yang dibandingkan. Biasanya diikuti 一番: 四季の中で秋が一番好き.',
    transparency: 'langsung',
    match: ['の中で'],
  },

  // ── の ──
  bp_n4_149: {
    parts: [{ text: 'の', role: 'partikel', meaning: 'pembenda: "hal bahwa …"' }, { text: 'に', role: 'partikel', meaning: '"pada (kenyataan) …"' }],
    literal: 'Pada kenyataan bahwa X, (malah) …',
    natural: 'Padahal X',
    explanation:
      'Hasilnya berlawanan dengan yang diharapkan dari X, dan pembicara merasa kecewa atau heran: たくさん勉強したのに点が悪かった. Lebih emosional daripada けど.',
    transparency: 'kiasan',
    match: ['のに'],
  },
  bp_n4_150: {
    parts: [{ text: 'の', role: 'partikel', meaning: 'pembenda: "hal melakukan …"' }, { text: 'に', role: 'partikel', meaning: 'tujuan: "untuk …"' }],
    literal: 'Untuk (hal) melakukan X',
    natural: 'Untuk X (keperluan, waktu, biaya)',
    explanation: 'Kegiatan X dibendakan lalu ditandai に sebagai tujuan. Biasanya diikuti kebutuhan: 使う, かかる, 便利だ: 作るのに二時間かかった.',
    transparency: 'langsung',
    match: ['のに'],
  },
  bp_n4_151: {
    parts: [{ text: 'の', role: 'partikel', meaning: 'pembenda: "yang …"' }, WA_TOPIC, { text: 'だ', role: 'kopula', meaning: 'adalah' }],
    literal: 'Yang X, adalah Y',
    natural: 'Yang X itu (justru) Y',
    explanation: 'Bagian yang ingin ditekankan dipindah ke akhir. 私が生まれたのは北海道です = tempat saya lahir adalah Hokkaido, dengan penekanan pada Hokkaido.',
    transparency: 'langsung',
    match: ['のは'],
  },
  bp_n4_152: {
    parts: [
      { text: 'の', role: 'partikel', meaning: 'milik' },
      { text: 'よう', role: 'kata benda', meaning: '様: rupa, keadaan' },
      { text: 'に／な', role: 'bentuk', meaning: 'に sebelum verba / sifat; な sebelum kata benda' },
    ],
    literal: 'Dengan rupa X',
    natural: 'Seperti X',
    explanation: 'よう (様) berarti rupa. のように menerangkan verba atau sifat (歌手のように歌う), のような menerangkan kata benda (雪のような花). Versi santainya みたいに・みたいな.',
    transparency: 'langsung',
    match: ['のよう[にな]'],
  },
  bp_n4_176: {
    parts: [
      { text: 'の', role: 'partikel', meaning: 'milik' },
      { text: 'よう', role: 'kata benda', meaning: '様: rupa, keadaan' },
      { text: 'に／な', role: 'bentuk', meaning: 'に sebelum verba / sifat; な sebelum kata benda' },
    ],
    literal: 'Dengan rupa X',
    natural: 'Seperti X / bagaikan X',
    explanation: 'Perumpamaan: 氷のように冷たい (dingin bagaikan es). よう (様) berarti rupa; に menerangkan verba atau sifat, な menerangkan kata benda.',
    transparency: 'langsung',
    match: ['のよう[にな]'],
  },
  bp_n4_170: {
    parts: [
      { text: 'みたい', role: 'kata benda', meaning: 'versi santai よう: "seperti"' },
      { text: 'に／な', role: 'bentuk', meaning: 'に sebelum verba / sifat; な sebelum kata benda' },
    ],
    literal: 'Seperti X',
    natural: 'Seperti X (santai)',
    explanation: 'Versi lisan dari のように・のような. Tanpa の: 歌手みたいに, 夢みたいな話.',
    transparency: 'langsung',
    match: ['みたい[にな]'],
  },
  bp_n4_173: {
    parts: [{ text: 'よう', role: 'kata benda', meaning: '様: rupa, keadaan' }, { text: 'だ', role: 'kopula', meaning: 'adalah' }],
    literal: 'Keadaannya (tampak) X',
    natural: 'Sepertinya X (dari pengamatan)',
    explanation: 'よう (様) berarti rupa atau keadaan. "Keadaannya X" = pembicara menyimpulkan dari tanda yang ia amati. Lebih formal daripada みたいだ.',
    transparency: 'kiasan',
    match: ['よう(?:だ|です)'],
  },
  bp_n4_163: {
    parts: [
      { text: '毎', reading: 'まい', role: 'kata benda', meaning: 'setiap' },
      { text: 'の', role: 'partikel', meaning: 'milik' },
      { text: 'よう', role: 'kata benda', meaning: '様: rupa, keadaan' },
      { text: 'に', role: 'partikel', meaning: 'cara' },
    ],
    literal: 'Seperti setiap X',
    natural: 'Hampir setiap X',
    explanation: 'Tidak benar-benar setiap hari, tetapi seperti setiap hari: 毎日のように外食する = hampir tiap hari makan di luar.',
    transparency: 'kiasan',
    match: ['毎.のように'],
  },

  // ── ように: supaya ──
  bp_n4_175: {
    parts: [{ text: 'よう', role: 'kata benda', meaning: '様: keadaan' }, { text: 'に', role: 'partikel', meaning: 'tujuan / hasil' }],
    literal: 'Menuju keadaan X',
    natural: 'Supaya X',
    explanation:
      'Tujuan berupa keadaan, bukan kehendak: 聞こえるように (supaya terdengar), 忘れないように (supaya tidak lupa). Verbanya biasanya potensial, negatif, atau verba yang tidak bisa dikehendaki. Untuk tujuan yang dikehendaki dipakai ために.',
    transparency: 'kiasan',
    match: ['ように'],
  },
  bp_n4_180: {
    parts: [{ text: 'よう', role: 'kata benda', meaning: '様: keadaan' }, { text: 'に', role: 'partikel', meaning: 'hasil' }, { text: 'する', role: 'kata kerja', meaning: 'membuat' }],
    literal: 'Membuat (diri) berada dalam keadaan X',
    natural: 'Berusaha untuk X / membiasakan X',
    explanation: 'Seperti にする (membuat jadi), tetapi yang diatur adalah kebiasaan sendiri: 遅れないようにする = berusaha tidak terlambat. ようにしている = sudah dibiasakan.',
    transparency: 'kiasan',
    match: ['ようにし(?:て|ます|た)'],
  },
  bp_n4_181: {
    parts: [{ text: 'よう', role: 'kata benda', meaning: '様: keadaan' }, { text: 'に', role: 'partikel', meaning: 'hasil' }, { text: 'なる', role: 'kata kerja', meaning: 'menjadi' }],
    literal: 'Menjadi (berada dalam) keadaan X',
    natural: 'Jadi bisa X / mulai X (perubahan bertahap)',
    explanation: 'Perubahan kemampuan atau kebiasaan yang terjadi lambat laun: 乗れるようになった = (akhirnya) jadi bisa naik sepeda. Sering dengan bentuk potensial.',
    transparency: 'kiasan',
    match: ['ようにな(?:る|った|りました)'],
  },
  bp_n4_178: {
    parts: [{ text: 'ように', role: 'bentuk', meaning: '"supaya …" (isi permintaan)' }, { text: '言う', reading: 'いう', role: 'kata kerja', meaning: 'mengatakan' }],
    literal: 'Mengatakan "supaya X"',
    natural: 'Menyuruh / meminta (seseorang) X',
    explanation: 'Mengutip perintah atau permintaan secara tidak langsung: 先生は練習するように言った = guru menyuruh berlatih. Juga dengan 頼む, 伝える.',
    transparency: 'langsung',
    match: ['ように言(?:う|い|わ)'],
  },
  bp_n4_177: {
    parts: [{ text: 'ように', role: 'bentuk', meaning: '"supaya …"' }, TE, { text: 'ほしい', role: 'kata sifat', meaning: 'ingin' }],
    literal: 'Supaya X, ingin (orang lain) melakukan Y',
    natural: 'Ingin orang lain Y supaya X',
    explanation: 'Gabungan ように (tujuan berupa keadaan) dan てほしい (keinginan terhadap orang lain).',
    transparency: 'langsung',
    match: ['ように'],
  },
  bp_n4_179: {
    parts: [{ text: 'ように', role: 'bentuk', meaning: '"supaya …"' }, { text: '祈る', reading: 'いのる', role: 'kata kerja', meaning: 'berdoa, memohon' }],
    literal: 'Berdoa supaya X',
    natural: 'Semoga X / berdoa agar X',
    explanation: 'ように menyatakan keadaan yang diharapkan, 祈る atau 願う berarti berdoa atau berharap. Di akhir kalimat ように saja juga berarti "semoga": 合格しますように.',
    transparency: 'langsung',
    match: ['ように(?:祈|願)(?:る|って|います)'],
  },
  bp_n4_174: {
    parts: [
      { text: 'う／よう', role: 'bentuk', meaning: 'bentuk kehendak: "mari, akan …"' },
      { text: 'と', role: 'partikel', meaning: 'kutipan' },
      { text: '思う', reading: 'おもう', role: 'kata kerja', meaning: 'berpikir' },
    ],
    literal: 'Berpikir "mari X"',
    natural: 'Berniat X / berpikir untuk X',
    explanation: 'Bentuk kehendak (行こう, 受けよう) dikutip dengan と思う: niat yang muncul di pikiran pembicara. と思っている = niat yang sudah lama dipegang.',
    transparency: 'langsung',
    match: ['[おこごそぞとどのぼぽもろよ]うと思(?:う|います|って|った)'],
  },

  // ── はず, ば, 場合 ──
  bp_n4_158: {
    parts: [{ text: 'はず', role: 'kata benda', meaning: '筈: yang semestinya' }, { text: 'だ', role: 'kopula', meaning: 'adalah' }],
    literal: 'Semestinya X',
    natural: 'Seharusnya X (yakin berdasarkan alasan)',
    explanation:
      'はず (筈) adalah takik pada ujung anak panah yang semestinya pas dengan tali busur; dari situ maknanya "yang semestinya". Pembicara yakin X berdasarkan alasan atau fakta.',
    transparency: 'kiasan',
    match: ['はず'],
  },
  bp_n4_157: {
    parts: [{ text: 'はず', role: 'kata benda', meaning: '筈: yang semestinya' }, GA_SUBJ, NAI],
    literal: 'Tidak ada kemestian X',
    natural: 'Tidak mungkin X',
    explanation: 'Menyangkal kemungkinan dengan yakin: tidak ada alasan sama sekali X terjadi. Lebih kuat daripada ないはずだ (seharusnya tidak).',
    transparency: 'kiasan',
    match: ['はずがない'],
  },
  bp_n4_159: {
    parts: [{ text: 'ば', role: 'bentuk', meaning: 'pengandaian: "kalau …"' }, { text: 'よかった', role: 'kata sifat', meaning: 'lampau いい: "(akan) baik"' }],
    literal: 'Kalau (dulu) X, (pasti) baik',
    natural: 'Seharusnya (dulu) X (menyesal)',
    explanation: 'Membayangkan masa lalu yang berbeda: kalau dulu X, hasilnya baik. Menyatakan penyesalan: 早く出ればよかった. Negatif: 言わなければよかった.',
    transparency: 'kiasan',
    match: ['ばよかった'],
  },
  bp_n4_155: {
    parts: [{ text: '場合', reading: 'ばあい', role: 'kata benda', meaning: 'keadaan, kasus' }, { text: 'は', role: 'partikel', meaning: 'topik' }],
    literal: 'Untuk kasus X',
    natural: 'Kalau terjadi X / dalam hal X',
    explanation: 'Kasus yang mungkin terjadi dijadikan topik, lalu diberi instruksi. Lazim di aturan dan pengumuman: 雨の場合は中止です.',
    transparency: 'langsung',
    match: ['場合は'],
  },
  bp_n4_160: {
    parts: [{ text: '必要', reading: 'ひつよう', role: 'kata benda', meaning: 'keperluan' }, GA_SUBJ, { text: 'ある', role: 'kata kerja', meaning: 'ada' }],
    literal: 'Ada keperluan untuk X',
    natural: 'Perlu X',
    explanation: 'Verba bentuk kamus + 必要がある: ada keperluan melakukan X. Negatif 必要はない = tidak perlu.',
    transparency: 'langsung',
    match: ['必要があ(?:る|ります)'],
  },
  bp_n4_154: {
    parts: [
      { text: 'は', role: 'partikel', meaning: 'kontras' },
      { text: 'が', role: 'partikel', meaning: 'pertentangan: "tetapi"' },
      { text: 'は', role: 'partikel', meaning: 'kontras' },
    ],
    literal: 'Kalau soal A …, tetapi kalau soal B …',
    natural: 'A begini, tetapi B begitu (kontras)',
    explanation: 'Dua hal dibandingkan dengan は masing-masing, lalu disambung が (tetapi): 肉は食べますが、魚は食べません.',
    transparency: 'langsung',
    match: ['が、'],
  },

  // ── Waktu & batas ──
  bp_n4_166: {
    parts: [{ text: 'まで', role: 'partikel', meaning: 'sampai' }, { text: 'に', role: 'partikel', meaning: 'titik waktu' }],
    literal: 'Pada suatu titik sampai X',
    natural: 'Paling lambat X / sebelum X',
    explanation: 'まで saja = terus berlangsung sampai X. までに = selesai pada suatu titik sebelum batas X: 金曜日までに出す (kumpulkan paling lambat Jumat).',
    transparency: 'langsung',
    match: ['までに'],
  },
  bp_n4_186: {
    parts: [
      { text: 'る', role: 'bentuk', meaning: 'bentuk kamus: belum terjadi' },
      { text: 'ところ', role: 'kata benda', meaning: 'tempat → titik (waktu)' },
      { text: 'だ', role: 'kopula', meaning: 'adalah' },
    ],
    literal: 'Di titik akan X',
    natural: 'Baru akan X / hendak X',
    explanation: 'Bentuk kamus menunjukkan tindakan belum dimulai. Satu keluarga dengan ているところ (sedang) dan たところ (baru saja).',
    transparency: 'kiasan',
    match: ['るところ'],
  },
  bp_n4_182: {
    parts: [
      { text: '予', reading: 'よ', role: 'kata benda', meaning: 'lebih dulu' },
      { text: '定', reading: 'てい', role: 'kata benda', meaning: 'menetapkan' },
      { text: 'だ', role: 'kopula', meaning: 'adalah' },
    ],
    literal: 'Sudah ditetapkan lebih dulu: X',
    natural: 'Dijadwalkan X / rencananya X',
    explanation: 'Rencana yang sudah pasti atau terjadwal, lebih objektif daripada つもり (niat pribadi).',
    transparency: 'langsung',
    match: ['予定'],
  },

  // ── Kata sambung ──
  bp_n4_164: {
    parts: [{ text: 'また', role: 'kata keterangan', meaning: 'juga, lagi' }, { text: 'は', role: 'partikel', meaning: 'penekanan' }],
    literal: '(Atau) lagi',
    natural: 'Atau (formal)',
    explanation: 'Menyatakan pilihan secara formal, lazim di formulir dan petunjuk: ペンまたは鉛筆で書いてください. Dalam percakapan cukup か.',
    transparency: 'kiasan',
    match: ['または'],
  },
  bp_n4_161: {
    parts: [{ text: 'ほか', role: 'kata benda', meaning: '他: yang lain' }, { text: 'に', role: 'partikel', meaning: 'tambahan' }],
    literal: 'Di (yang) lain',
    natural: 'Selain itu / selain X',
    explanation: 'ほかに berdiri sendiri = "selain itu, masih ada?". X のほかに = selain X, juga ….',
    transparency: 'langsung',
    match: ['ほかに'],
  },
  bp_n4_189: {
    parts: [
      { text: 'ん', role: 'partikel', meaning: 'の yang diucapkan ringkas: penjelasan latar', base: 'の' },
      { text: 'です', role: 'kopula', meaning: 'adalah (sopan)' },
      { text: 'が', role: 'partikel', meaning: 'pembuka: "…, (lalu)"' },
    ],
    literal: 'Begini, X, (lalu) …',
    natural: 'Begini, X … (membuka permintaan / pertanyaan)',
    explanation:
      'んです menyajikan keadaan sebagai latar, dan が membiarkan kalimat menggantung sebagai pembuka. Lawan bicara diajak memahami situasinya dulu sebelum permintaan disampaikan. Santai: んだけど.',
    transparency: 'kiasan',
    match: ['んですが', 'んだけど'],
  },
};
