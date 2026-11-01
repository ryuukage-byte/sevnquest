// Catatan kurasi "Pemahaman Kotoba": bagaimana makna sebuah kata majemuk terbentuk.
//
// Makna gabungan tidak selalu bisa ditebak dari arti kanjinya. Karena itu penjelasan
// pembentukan makna hanya ditulis untuk kata yang sudah dikurasi di sini. Kata lain tetap
// mendapat bedah kanji + definisi dari database, tanpa "rumus" makna yang dikarang-karang.

export type FormationTransparency = 'langsung' | 'kiasan' | 'khusus';

export interface KotobaFormationNote {
  /** Arti kanji DI DALAM kata ini (bisa lebih sempit dari arti utama kanji di database). */
  parts: Record<string, string>;
  /** Rumusan gabungan makna, mis. "Hati yang merasa aman". */
  literal: string;
  /** Mengapa makna akhirnya begitu (etimologi / logika pemakaian). */
  explanation: string;
  /**
   * langsung = maknanya bisa ditebak dari kanjinya,
   * kiasan   = perlu satu loncatan makna,
   * khusus   = harus dipahami sebagai satu kesatuan.
   */
  transparency: FormationTransparency;
  /** Kapan kata ini biasa dipakai. */
  usageNote?: string;
}

export const TRANSPARENCY_LABEL: Record<FormationTransparency, { label: string; hint: string }> = {
  langsung: { label: 'Makna langsung', hint: 'Arti kata bisa ditebak dari gabungan arti kanjinya.' },
  kiasan: { label: 'Makna kiasan', hint: 'Gabungan kanji memberi petunjuk, tetapi maknanya bergeser.' },
  khusus: { label: 'Makna khusus', hint: 'Pahami sebagai satu kesatuan; arti kanji hanya petunjuk sejarahnya.' },
};

export const KOTOBA_FORMATION_NOTES: Record<string, KotobaFormationNote> = {
  安心: {
    parts: { 安: 'aman, tenang', 心: 'hati, pikiran' },
    literal: 'Hati yang merasa aman',
    explanation:
      'Kalau kedua makna digabungkan, 安心 adalah keadaan ketika hati atau pikiran merasa aman. Itulah sebabnya kata ini dipakai untuk perasaan lega atau tenang.',
    transparency: 'langsung',
    usageNote: 'Saat kecemasan atau kekhawatiran berkurang. Sering dipakai sebagai 安心する (merasa lega).',
  },
  安全: {
    parts: { 安: 'aman', 全: 'utuh, lengkap' },
    literal: 'Aman dan tetap utuh',
    explanation: 'Sesuatu yang aman dan tetap utuh, tidak ada yang rusak atau terluka. Dari situ muncul makna keselamatan.',
    transparency: 'langsung',
    usageNote: 'Untuk keadaan bebas dari bahaya fisik: tempat, jalan, alat, prosedur.',
  },
  安定: {
    parts: { 安: 'tenang', 定: 'tetap, menetap' },
    literal: 'Tenang dan tetap di tempatnya',
    explanation: 'Sesuatu yang tenang dan tidak berpindah-pindah, sehingga tidak goyah. Maknanya menjadi stabil.',
    transparency: 'langsung',
    usageNote: 'Untuk kondisi yang tidak naik-turun: harga, ekonomi, emosi, kesehatan.',
  },
  安易: {
    parts: { 安: 'gampang, ringan', 易: 'mudah' },
    literal: 'Terlalu gampang',
    explanation:
      'Dua kanji yang sama-sama bermakna "mudah" bertumpuk. Penekanan ganda itu memberi nuansa negatif: mengambil jalan yang terlalu gampang, menganggap enteng.',
    transparency: 'kiasan',
    usageNote: 'Biasanya bernada kritik: 安易な考え (pikiran gampangan).',
  },
  不安: {
    parts: { 不: 'tidak', 安: 'tenang' },
    literal: 'Tidak tenang',
    explanation: 'Awalan 不 membalik makna 安. Hati yang tidak tenang berarti cemas atau gelisah. Lawan kata dari 安心.',
    transparency: 'langsung',
    usageNote: 'Untuk rasa cemas tentang sesuatu yang belum pasti: 将来が不安だ.',
  },
  心配: {
    parts: { 心: 'hati, perhatian', 配: 'membagikan, menyebar' },
    literal: 'Menyebarkan perhatian hati',
    explanation:
      'Asalnya dari 心を配る: memberi perhatian ke banyak hal. Perhatian yang terus tertuju pada hal yang mungkin buruk lama-lama bermakna khawatir.',
    transparency: 'kiasan',
    usageNote: 'Untuk rasa khawatir terhadap seseorang atau sesuatu: 心配する, 心配をかける.',
  },
  中心: {
    parts: { 中: 'tengah', 心: 'inti' },
    literal: 'Inti di bagian tengah',
    explanation: 'Di sini 心 bukan "perasaan", melainkan "inti", seperti jantung yang berada di tengah tubuh. Bagian tengah yang menjadi inti adalah pusat.',
    transparency: 'kiasan',
    usageNote: 'Untuk titik pusat tempat, kegiatan, atau perhatian: 町の中心, 〜を中心に.',
  },
  本心: {
    parts: { 本: 'asli, sebenarnya', 心: 'hati' },
    literal: 'Hati yang asli',
    explanation: 'Hati yang sebenarnya, bukan yang ditunjukkan di luar. Maknanya isi hati yang sesungguhnya.',
    transparency: 'langsung',
    usageNote: 'Saat membedakan perasaan asli dengan yang diucapkan: 本心を言う.',
  },
  熱心: {
    parts: { 熱: 'panas, semangat', 心: 'hati' },
    literal: 'Hati yang panas membara',
    explanation: 'Hati yang "panas" oleh semangat terhadap sesuatu. Maknanya tekun dan bersungguh-sungguh.',
    transparency: 'kiasan',
    usageNote: 'Untuk orang yang bersungguh-sungguh: 熱心に勉強する.',
  },
  用心: {
    parts: { 用: 'memakai, menggunakan', 心: 'hati, perhatian' },
    literal: 'Menggunakan perhatian',
    explanation: 'Mengerahkan perhatian supaya tidak terjadi hal buruk. Maknanya waspada, berhati-hati.',
    transparency: 'kiasan',
    usageNote: 'Untuk berjaga-jaga dari bahaya: 火の用心 (awas kebakaran).',
  },
  関心: {
    parts: { 関: 'berhubungan', 心: 'hati, perhatian' },
    literal: 'Hati yang terhubung ke sesuatu',
    explanation: 'Hati yang terkait dengan suatu hal sehingga terus memperhatikannya. Maknanya minat atau perhatian.',
    transparency: 'langsung',
    usageNote: 'Biasanya dengan に: 政治に関心がある (tertarik pada politik).',
  },
  感心: {
    parts: { 感: 'merasakan, tersentuh', 心: 'hati' },
    literal: 'Hati yang tersentuh',
    explanation: 'Hati yang tersentuh oleh perbuatan atau kemampuan orang lain. Maknanya kagum, terkesan.',
    transparency: 'langsung',
    usageNote: 'Bacaannya sama dengan 関心 (かんしん); bedakan dari kanjinya.',
  },
  決心: {
    parts: { 決: 'memutuskan', 心: 'hati' },
    literal: 'Hati yang sudah memutuskan',
    explanation: 'Hati yang sudah mengambil keputusan dan tidak ragu lagi. Maknanya tekad.',
    transparency: 'langsung',
    usageNote: 'Sering sebagai 決心する (bertekad).',
  },
  勉強: {
    parts: { 勉: 'berusaha keras', 強: 'memaksa' },
    literal: 'Memaksa diri berusaha keras',
    explanation:
      'Aslinya berarti memaksakan diri melakukan sesuatu yang sulit. Dalam bahasa Jepang maknanya menyempit menjadi belajar. Di toko, 勉強します juga berarti "saya beri diskon", karena penjual "memaksakan diri" menurunkan harga.',
    transparency: 'kiasan',
    usageNote: 'Kegiatan belajar secara umum: 日本語を勉強する.',
  },
  大丈夫: {
    parts: { 大: 'besar, hebat', 丈: 'ukuran tinggi orang dewasa', 夫: 'pria' },
    literal: 'Pria dewasa yang hebat',
    explanation:
      'Aslinya 大丈夫 berarti pria yang gagah dan bisa diandalkan. Dari "kuat, bisa diandalkan" maknanya bergeser menjadi "aman, tidak apa-apa".',
    transparency: 'khusus',
    usageNote: 'Untuk menanyakan atau meyakinkan bahwa keadaan baik-baik saja.',
  },
  手紙: {
    parts: { 手: 'tangan', 紙: 'kertas' },
    literal: 'Kertas yang ditulis tangan',
    explanation: 'Kertas yang ditulisi dengan tangan dan dikirim ke orang lain, yaitu surat. Dalam bahasa Mandarin, 手纸 justru berarti tisu toilet.',
    transparency: 'kiasan',
    usageNote: 'Surat pribadi di atas kertas. Untuk surel dipakai メール.',
  },
  電車: {
    parts: { 電: 'listrik', 車: 'kendaraan' },
    literal: 'Kendaraan listrik',
    explanation: 'Kendaraan yang digerakkan listrik. Dalam keseharian maknanya kereta listrik.',
    transparency: 'langsung',
  },
  電話: {
    parts: { 電: 'listrik', 話: 'bicara' },
    literal: 'Berbicara lewat listrik',
    explanation: 'Alat untuk berbicara jarak jauh dengan bantuan listrik, yaitu telepon.',
    transparency: 'langsung',
    usageNote: 'Juga sebagai kegiatan: 電話する (menelepon).',
  },
  学校: {
    parts: { 学: 'belajar', 校: 'sekolah' },
    literal: 'Tempat belajar',
    explanation: 'Bangunan tempat orang belajar, yaitu sekolah. Bacaan 学 (がく) berubah menjadi がっ di depan こう.',
    transparency: 'langsung',
  },
  学生: {
    parts: { 学: 'belajar', 生: 'orang (yang hidup)' },
    literal: 'Orang yang belajar',
    explanation: 'Orang yang sedang belajar. Di Jepang 学生 terutama dipakai untuk mahasiswa; murid SD disebut 児童 dan murid SMP/SMA 生徒.',
    transparency: 'langsung',
  },
  先生: {
    parts: { 先: 'lebih dulu', 生: 'lahir, hidup' },
    literal: 'Orang yang lahir lebih dulu',
    explanation: 'Orang yang lahir lebih dulu sehingga lebih berpengalaman dan pantas mengajar. Maknanya guru, juga sapaan hormat untuk dokter atau pengacara.',
    transparency: 'kiasan',
    usageNote: 'Tidak dipakai untuk menyebut profesi sendiri.',
  },
  会社: {
    parts: { 会: 'berkumpul', 社: 'perkumpulan' },
    literal: 'Perkumpulan orang',
    explanation: 'Sekelompok orang yang berkumpul untuk menjalankan usaha bersama, yaitu perusahaan.',
    transparency: 'langsung',
  },
  天気: {
    parts: { 天: 'langit', 気: 'udara, suasana' },
    literal: 'Suasana langit',
    explanation: 'Keadaan langit dan udara pada suatu waktu, yaitu cuaca. Juga bisa berarti cuaca cerah: 天気がいい.',
    transparency: 'langsung',
  },
  元気: {
    parts: { 元: 'asal, sumber', 気: 'energi' },
    literal: 'Energi dasar',
    explanation: 'Energi yang menjadi sumber kehidupan. Kalau energi itu penuh, orangnya sehat dan bersemangat.',
    transparency: 'kiasan',
    usageNote: 'お元気ですか (apa kabar?) menanyakan keadaan energi itu.',
  },
  大切: {
    parts: { 大: 'sangat', 切: 'mendesak, sungguh-sungguh' },
    literal: 'Sangat mendesak',
    explanation: 'Sesuatu yang sangat mendesak untuk dijaga atau diperhatikan. Maknanya penting dan berharga.',
    transparency: 'kiasan',
    usageNote: 'Sering untuk hal yang dihargai secara pribadi: 大切な人.',
  },
  親切: {
    parts: { 親: 'dekat, akrab', 切: 'sungguh-sungguh' },
    literal: 'Perhatian dekat yang tulus',
    explanation: 'Memperhatikan orang lain dari dekat dengan sungguh-sungguh. Maknanya baik hati.',
    transparency: 'kiasan',
    usageNote: 'Untuk sikap baik kepada orang lain: 親切な人, ご親切に.',
  },
  便利: {
    parts: { 便: 'kemudahan', 利: 'keuntungan, berguna' },
    literal: 'Mudah dan berguna',
    explanation: 'Sesuatu yang memberi kemudahan dan manfaat, yaitu praktis atau nyaman dipakai.',
    transparency: 'langsung',
    usageNote: 'Lawan katanya 不便 (tidak praktis).',
  },
  料理: {
    parts: { 料: 'bahan', 理: 'mengatur, mengolah' },
    literal: 'Mengolah bahan',
    explanation: 'Mengatur dan mengolah bahan menjadi makanan. Maknanya masakan atau memasak.',
    transparency: 'kiasan',
    usageNote: 'Sebagai kegiatan: 料理する. Sebagai jenis masakan: 日本料理.',
  },
  旅行: {
    parts: { 旅: 'perjalanan', 行: 'pergi' },
    literal: 'Pergi dalam perjalanan',
    explanation: 'Pergi meninggalkan rumah untuk melakukan perjalanan, yaitu bepergian atau berwisata.',
    transparency: 'langsung',
  },
  時間: {
    parts: { 時: 'waktu', 間: 'jarak, selang' },
    literal: 'Selang waktu',
    explanation: 'Rentang di antara dua titik waktu. Maknanya waktu, juga satuan jam (二時間 = dua jam).',
    transparency: 'langsung',
  },
  毎日: {
    parts: { 毎: 'setiap', 日: 'hari' },
    literal: 'Setiap hari',
    explanation: 'Gabungan langsung: setiap + hari.',
    transparency: 'langsung',
  },
  外国: {
    parts: { 外: 'luar', 国: 'negara' },
    literal: 'Negara di luar',
    explanation: 'Negara di luar negeri sendiri, yaitu negara asing. 外国人 berarti orang asing.',
    transparency: 'langsung',
  },
  映画: {
    parts: { 映: 'memantulkan, menayangkan', 画: 'gambar' },
    literal: 'Gambar yang ditayangkan',
    explanation: 'Gambar yang dipantulkan ke layar, yaitu film.',
    transparency: 'langsung',
  },
  写真: {
    parts: { 写: 'menyalin', 真: 'kenyataan' },
    literal: 'Salinan kenyataan',
    explanation: 'Menyalin keadaan nyata apa adanya. Maknanya foto.',
    transparency: 'kiasan',
  },
  新聞: {
    parts: { 新: 'baru', 聞: 'mendengar, kabar' },
    literal: 'Kabar baru',
    explanation: 'Kabar baru yang didengar orang. Maknanya bergeser menjadi media pembawa kabar itu, yaitu koran.',
    transparency: 'kiasan',
  },
  家族: {
    parts: { 家: 'rumah', 族: 'kelompok sekerabat' },
    literal: 'Kerabat satu rumah',
    explanation: 'Kelompok kerabat yang tinggal di satu rumah, yaitu keluarga.',
    transparency: 'langsung',
  },
  病院: {
    parts: { 病: 'sakit', 院: 'lembaga, gedung' },
    literal: 'Gedung untuk orang sakit',
    explanation: 'Lembaga tempat orang sakit dirawat, yaitu rumah sakit.',
    transparency: 'langsung',
  },
  自転車: {
    parts: { 自: 'sendiri', 転: 'berputar', 車: 'kendaraan' },
    literal: 'Kendaraan yang diputar sendiri',
    explanation: 'Kendaraan yang rodanya diputar dengan tenaga sendiri, yaitu sepeda.',
    transparency: 'langsung',
  },
  今日: {
    parts: { 今: 'sekarang', 日: 'hari' },
    literal: 'Hari sekarang',
    explanation:
      'Maknanya bisa ditebak (hari ini), tetapi bacaan きょう tidak berasal dari bacaan masing-masing kanji. Bacaan seperti ini disebut 熟字訓: dibaca sebagai satu kesatuan. Bacaan こんにち juga ada, artinya "dewasa ini".',
    transparency: 'khusus',
  },
  大人: {
    parts: { 大: 'besar', 人: 'orang' },
    literal: 'Orang besar',
    explanation: 'Orang yang sudah besar, yaitu orang dewasa. Bacaan おとな adalah 熟字訓: dibaca sebagai satu kesatuan, bukan dari bacaan per kanji.',
    transparency: 'khusus',
  },
  運動: {
    parts: { 運: 'menggerakkan, membawa', 動: 'bergerak' },
    literal: 'Menggerakkan dan bergerak',
    explanation: 'Menggerakkan tubuh. Maknanya olahraga, juga gerakan sosial (mis. 社会運動).',
    transparency: 'langsung',
  },
  世界: {
    parts: { 世: 'dunia manusia', 界: 'batas, wilayah' },
    literal: 'Wilayah dunia manusia',
    explanation: 'Seluruh wilayah tempat manusia hidup, yaitu dunia. Bisa juga berarti "dunia" suatu bidang: 音楽の世界.',
    transparency: 'langsung',
  },
  番組: {
    parts: { 番: 'giliran, urutan', 組: 'susunan' },
    literal: 'Susunan urutan',
    explanation: 'Awalnya susunan urutan pertunjukan. Sekarang maknanya acara atau program TV dan radio.',
    transparency: 'kiasan',
  },
  留守: {
    parts: { 留: 'tinggal, menetap', 守: 'menjaga' },
    literal: 'Tinggal untuk menjaga',
    explanation:
      'Aslinya orang yang tinggal di rumah untuk menjaganya selama pemilik pergi. Lama-lama maknanya menjadi "pemilik tidak ada di rumah". Bacaan る untuk 留 tergolong jarang.',
    transparency: 'kiasan',
    usageNote: '留守番 = menjaga rumah; 留守電 = pesan suara.',
  },
  野菜: {
    parts: { 野: 'ladang', 菜: 'sayur' },
    literal: 'Sayur dari ladang',
    explanation: 'Tanaman sayur yang ditanam di ladang, yaitu sayuran.',
    transparency: 'langsung',
  },
  結婚: {
    parts: { 結: 'mengikat', 婚: 'pernikahan' },
    literal: 'Ikatan pernikahan',
    explanation: 'Mengikat diri dalam pernikahan, yaitu menikah.',
    transparency: 'langsung',
    usageNote: 'Dengan と: 田中さんと結婚する.',
  },
  日本: {
    parts: { 日: 'matahari', 本: 'asal, pangkal' },
    literal: 'Asal matahari',
    explanation:
      'Negeri tempat matahari berasal, yaitu tempat matahari terbit bila dilihat dari daratan Tiongkok. Bacaan 日 di sini (に) tidak biasa; bacaan にっぽん juga dipakai.',
    transparency: 'kiasan',
  },
  日本語: {
    parts: { 日: 'matahari', 本: 'asal, pangkal', 語: 'bahasa' },
    literal: 'Bahasa negeri asal matahari',
    explanation: 'Gabungan 日本 (Jepang) dan 語 (bahasa). Pola 〜語 dipakai untuk semua bahasa: 英語, 中国語, インドネシア語.',
    transparency: 'langsung',
  },
};

export function getFormationNote(word: string): KotobaFormationNote | undefined {
  return Object.prototype.hasOwnProperty.call(KOTOBA_FORMATION_NOTES, word) ? KOTOBA_FORMATION_NOTES[word] : undefined;
}
