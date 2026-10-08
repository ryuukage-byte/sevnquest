import { SubFormulaBranch, ConnectionCondition, ExampleSentence, BunpouItem } from '../types/content';

export type { SubFormulaBranch, ConnectionCondition };

/**
 * Curated knowledge base of sub-formulas, usage locations, and connection conditions
 * for JLPT N3 grammar patterns.
 */
const CURATED_SUB_BRANCHES: Record<string, SubFormulaBranch[]> = {
  // ── Week 1 Day 3 Grammar 1: 女みたいだ ──
  w1d3g1: [
    {
      id: 'mitai_da',
      token: '〜みたいだ',
      usageLocation: 'Di akhir kalimat (sebagai predikat kalimat)',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan perumpamaan atau kesimpulan dugaan berdasarkan pengamatan pembicara ("sepertinya...", "mirip..."). Lebih santai/percakapan dibanding 〜ようだ.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ みたいだ',
          example: '女みたいだ (seperti perempuan), 子供みたいだ (seperti anak kecil) [tanpa だ atau の]',
        },
        {
          partOfSpeech: 'Kata Sifat-na',
          rule: 'na ＋ みたいだ',
          example: '静かみたいだ (tampaknya tenang), きれいみたいだ (tampaknya cantik) [tanpa だ]',
        },
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V普 ＋ みたいだ',
          example: '春になったみたいだ (sepertinya sudah musim semi), 怒っているみたいだ (tampaknya sedang marah)',
        },
        {
          partOfSpeech: 'Kata Sifat-i (A)',
          rule: 'A普 ＋ みたいだ',
          example: '高いみたいだ (sepertinya mahal), おいしいみたいだ (tampaknya enak)',
        },
      ],
      examples: [
        {
          japanese: '彼の話し方は、女みたいだ。',
          reading: 'かれのはなしかたは、おんなみたいだ。',
          meaningId: 'Cara bicaranya seperti perempuan (di akhir kalimat sebagai predikat perumpamaan).',
        },
        {
          japanese: '今日はとても暖かくて、もう春になったみたいだ。',
          reading: 'きょうはとてもあたたかくて、もうはるになったみたいだ。',
          meaningId: 'Hari ini sangat hangat, sepertinya sudah menjadi musim semi (kesimpulan dugaan di akhir kalimat).',
        },
      ],
    },
    {
      id: 'mitai_ni',
      token: '〜みたいに',
      usageLocation: 'Sebelum Kata Kerja (V) atau Kata Sifat (A/na) sebagai adverbia (keterangan cara)',
      usageLocationType: 'adverbial',
      meaning: 'Menjelaskan cara tindakan atau keadaan dengan perumpamaan ("seperti...", "layaknya..."). Berfungsi menerangkan verba atau adjektiva berikutnya.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ みたいに ＋ V / A',
          example: '雪みたいに白い (putih seperti salju), おじいさんみたいに話す (bicara seperti kakek-kakek)',
        },
        {
          partOfSpeech: 'Kata Sifat-na',
          rule: 'na ＋ みたいに ＋ V / A',
          example: 'バカみたいに騒ぐ (ribut seperti orang bodoh)',
        },
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V普 ＋ みたいに ＋ V / A',
          example: '酔ったみたいにふらふら歩く (berjalan sempoyongan seperti orang mabuk)',
        },
        {
          partOfSpeech: 'Kata Sifat-i (A)',
          rule: 'A普 ＋ みたいに ＋ V / A',
          example: '痛いみたいに叫ぶ (berteriak seperti kesakitan)',
        },
      ],
      examples: [
        {
          japanese: '彼はまだ若いのに、まるでおじいさんみたいに話し方をする。',
          reading: 'かれはまだわかいのに、まるでおじいさんみたいにはなしかたをする。',
          meaningId: 'Meskipun dia masih muda, cara bicaranya persis seperti kakek-kakek (keterangan cara sebelum verba).',
        },
        {
          japanese: '彼女の肌は雪みたいに白くて美しい。',
          reading: 'かのじょのはだはゆきみたいにしろくてうつくしい。',
          meaningId: 'Kulitnya putih dan indah seperti salju (keterangan sebelum adjektiva 白い).',
        },
        {
          japanese: '彼はお酒に酔ったみたいにふらふら歩いている。',
          reading: 'かれはおさけによったみたいにふらふらあるいている。',
          meaningId: 'Dia berjalan sempoyongan seperti orang yang sudah mabuk (Vた ＋ みたいに ＋ V).',
        },
      ],
    },
    {
      id: 'mitai_na',
      token: '〜みたいなN',
      usageLocation: 'Sebelum Kata Benda (Nomina) untuk memodifikasi / menerangkan benda tersebut',
      usageLocationType: 'noun_modifier',
      meaning: 'Menerangkan kata benda yang memiliki kemiripan, kesan, atau sifat serupa ("N yang seperti..."). Berfungsi sebagai pewatas nomina.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N1 ＋ みたいな ＋ N2',
          example: '本物の果物みたいな味 (rasa yang seperti buah asli), 太陽みたいな笑顔 (senyum seperti matahari)',
        },
        {
          partOfSpeech: 'Kata Sifat-na',
          rule: 'na ＋ みたいな ＋ N',
          example: '夢みたいな話 (cerita yang seperti mimpi)',
        },
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V普 ＋ みたいな ＋ N',
          example: '怒っているみたいな顔 (wajah yang seperti sedang marah), 死んだみたいな静けさ (keheningan seperti mati)',
        },
        {
          partOfSpeech: 'Kata Sifat-i (A)',
          rule: 'A普 ＋ みたいな ＋ N',
          example: '嘘みたいなおいしさ (kelezatan yang terasa seperti mimpi/tidak nyata)',
        },
      ],
      examples: [
        {
          japanese: 'このお菓子は、まるで本物の果物みたいな味だ。',
          reading: 'このおかしは、まるでほんもののくだものみたいなあじだ。',
          meaningId: 'Kue ini rasanya persis seperti buah asli (memodifikasi nomina \'味\').',
        },
        {
          japanese: 'あの人は怒っているみたいな顔をしている。',
          reading: 'あのひとはおこっているみたいなかおをしている。',
          meaningId: 'Orang itu memasang wajah yang seolah-olah sedang marah (memodifikasi nomina \'顔\').',
        },
      ],
    },
  ],

  // ── Week 1 Day 1 Grammar 3: 早く帰らせてください ──
  w1d1g3: [
    {
      id: 'sasete_kudasai',
      token: '〜(さ)せてください',
      usageLocation: 'Di akhir kalimat (permintaan izin standar/sopan)',
      usageLocationType: 'predicate',
      meaning: 'Ungkapan meminta izin kepada lawan bicara agar pembicara diperbolehkan melakukan suatu tindakan ("Tolong izinkan saya...", "Bolehkah saya...").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V(さ)せて ＋ ください',
          example: '帰らせてください (izinkan saya pulang), コピーさせてください (izinkan saya memfotokopi)',
        },
      ],
      examples: [
        {
          japanese: 'ちょっと気分が悪いので、早く帰らせてください。',
          reading: 'ちょっときぶんがわるいので、はやくかえらせてください。',
          meaningId: 'Karena badan kurang enak, bolehkah/izinkan saya pulang lebih awal?',
        },
      ],
    },
    {
      id: 'sasete_moraemasu_ka',
      token: '〜(さ)せてもらえますか',
      usageLocation: 'Di akhir kalimat (permintaan izin lebih santun)',
      usageLocationType: 'predicate',
      meaning: 'Permintaan izin yang lebih halus dengan menanyakan kesediaan lawan bicara ("Bisakah Anda mengizinkan saya...?").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V(さ)せて ＋ もらえますか',
          example: '言わせてもらえますか (bisakah saya menyampaikan sepatah kata?)',
        },
      ],
      examples: [
        {
          japanese: 'この資料をコピーさせてもらえますか。',
          reading: 'このしりょうをコピーさせてもらえますか。',
          meaningId: 'Bolehkah saya memfotokopi dokumen ini?',
        },
      ],
    },
    {
      id: 'sasete_moraemasen_ka',
      token: '〜(さ)せてもらえませんか',
      usageLocation: 'Di akhir kalimat (permintaan izin sangat sopan & hormat)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk paling santun untuk meminta izin kepada atasan atau orang yang dihormati. Menggunakan negasi retoris untuk menambah rasa segan dan kesopanan.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V(さ)せて ＋ もらえませんか',
          example: '休ませてもらえませんか (apakah memungkinkan bagi saya untuk izin tidak masuk?)',
        },
      ],
      examples: [
        {
          japanese: 'その件について、私にも一言言わせてもらえませんか。',
          reading: 'そのけんについて、わたしにもひとこといわせてもらえませんか。',
          meaningId: 'Mengenai hal tersebut, apakah saya diperkenankan untuk menyampaikan sepatah kata?',
        },
      ],
    },
  ],

  // ── Week 1 Day 2 Grammar 1: もう寝ないと ──
  w1d2g1: [
    {
      id: 'naito',
      token: '〜ないと',
      usageLocation: 'Di akhir kalimat percakapan (keharusan informal)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk singkat kasual dari 〜なければならない (harus melakukan). Kalimat dipotong di partikel と.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vない ＋ と',
          example: '寝ないと (harus tidur), 行かないと (harus pergi), 勉強しないと (harus belajar)',
        },
      ],
      examples: [
        {
          japanese: '明日は早く出かけるから、もう寝ないと。',
          reading: 'あしたははやくでかけるから、もうねないと。',
          meaningId: 'Karena besok harus pergi pagi-pagi, aku harus tidur sekarang.',
        },
      ],
    },
    {
      id: 'nakucha',
      token: '〜なくちゃ',
      usageLocation: 'Di akhir kalimat percakapan (keharusan informal ramah)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk singkat kasual dari 〜なくてはならない (harus). Sering digunakan saat berbicara kepada diri sendiri atau teman akrab.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vない(い→くちゃ)',
          example: '出さなくちゃ (harus mengumpulkan), 食べなくちゃ (harus makan)',
        },
      ],
      examples: [
        {
          japanese: '宿題を明日までに先生に出さなくちゃ。',
          reading: 'しゅくだいをあしたまでにせんせいにださなくちゃ。',
          meaningId: 'Aku harus mengumpulkan PR ke guru sebelum besok.',
        },
      ],
    },
  ],

  // ── Week 1 Day 2 Grammar 2: 食べちゃった ──
  w1d2g2: [
    {
      id: 'chau',
      token: '〜ちゃう／〜ちゃった',
      usageLocation: 'Di akhir kalimat percakapan (tindakan tuntas / penyesalan)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk kontraksi percakapan dari Vてしまう. Menyatakan tindakan sudah tuntas atau rasa menyesal/terlanjur.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vて → Vちゃう',
          example: '食べる → 食べちゃう, 忘れる → 忘れちゃう, 書く → 書いちゃう',
        },
      ],
      examples: [
        {
          japanese: '大切な書類を電車の中に忘れちゃった！',
          reading: 'たいせつなしょるいをでんしゃのなかにわすれちゃった！',
          meaningId: 'Aduh gawat, dokumen pentingku tertinggal di dalam kereta!',
        },
      ],
    },
    {
      id: 'jau',
      token: '〜じゃう／〜じゃった',
      usageLocation: 'Di akhir kalimat percakapan (untuk kata kerja berakhiran で)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk kontraksi dari Vでしまう (untuk kata kerja yang bentuk te-nya berbunyi voiced / で).',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vで → Vじゃう',
          example: '飲む → 飲んじゃう, 遊ぶ → 遊んじゃう, 泳ぐ → 泳いじゃう',
        },
      ],
      examples: [
        {
          japanese: '喉が渇いていたから、ジュースを全部飲んじゃった。',
          reading: 'のどがかわいていたから、ジュースをぜんぶのんじゃった。',
          meaningId: 'Karena sangat haus, aku sudah menghabiskan semua jusnya.',
        },
      ],
    },
  ],

  // ── Week 1 Day 3 Grammar 2: 春らしい ──
  w1d3g2: [
    {
      id: 'rashii_pred',
      token: '〜らしい',
      usageLocation: 'Di akhir kalimat (Predikat) atau sebelum Kata Benda',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa sesuatu benar-benar terasa atau memiliki sifat khas yang mencerminkan esensi dari N tersebut ("benar-benar khas...").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ らしい',
          example: '春らしい (khas musim semi), 男らしい (macho/khas pria)',
        },
      ],
      examples: [
        {
          japanese: '今日は、春らしい暖かい日でした。',
          reading: 'きょうは、はるらしいあたたかいひでした。',
          meaningId: 'Hari ini adalah hari hangat yang benar-benar terasa seperti musim semi.',
        },
      ],
    },
    {
      id: 'rashiku',
      token: '〜らしく',
      usageLocation: 'Sebelum Kata Kerja / Kata Sifat sebagai adverbia',
      usageLocationType: 'adverbial',
      meaning: 'Melakukan sesuatu secara khas sesuai kodrat atau citra dari N tersebut ("dengan sikap khas...").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ らしく ＋ V',
          example: '自分らしく生きる (hidup apa adanya sesuai diri sendiri), 子供らしく遊ぶ (bermain selayaknya anak-anak)',
        },
      ],
      examples: [
        {
          japanese: '学生らしくもっと勉強しなさい。',
          reading: 'がくせいらしくもっとべんきょうしなさい。',
          meaningId: 'Belajarlah lebih giat layaknya seorang pelajar yang baik.',
        },
      ],
    },
  ],

  // ── Week 1 Day 3 Grammar 3: 大人っぽい ──
  w1d3g3: [
    {
      id: 'ppoi_pred',
      token: '〜っぽい',
      usageLocation: 'Di akhir kalimat (Predikat) atau sebelum Kata Benda',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan kesan kuat atau kecenderungan sifat tertentu yang tampak dari luar (sering bermakna agak negatif atau kebiasaan, "-ish / terkesan...").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ っぽい',
          example: '大人っぽい (seperti orang dewasa), 子供っぽい (kekanak-kanakan), 油っぽい (berminyak)',
        },
        {
          partOfSpeech: 'Kata Sifat-i (A)',
          rule: 'A(語幹) ＋ っぽい',
          example: '安っぽい (terkesan murahan), 白っぽい (keputih-putihan)',
        },
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ っぽい',
          example: '忘れっぽい (mudah lupa / pelupa), 怒りっぽい (mudah marah)',
        },
      ],
      examples: [
        {
          japanese: 'あの小学生は、大人っぽい。',
          reading: 'あのしょうがくせいは、おとなっぽい。',
          meaningId: 'Anak SD itu bersikap sangat dewasa (terkesan seperti orang dewasa).',
        },
      ],
    },
  ],

  // ── Week 2 Day 1 Grammar 1: 女性ばかり ──
  w2d1g1: [
    {
      id: 'bakari_da',
      token: '〜ばかり／〜ばかりだ',
      usageLocation: 'Di akhir kalimat atau setelah nomina',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan jumlah yang sangat banyak dan hanya hal itu melulu ("isinya hanya...", "melulu...").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ ばかり',
          example: '女性ばかり (isinya perempuan melulu), 失敗ばかり (kegagalan terus-menerus)',
        },
      ],
      examples: [
        {
          japanese: 'このクラスは、女性ばかりだ。',
          reading: 'このクラスは、じょせいばかりだ。',
          meaningId: 'Kelas ini isinya hanya perempuan melulu.',
        },
      ],
    },
    {
      id: 'te_bakari_iru',
      token: '〜てばかりいる',
      usageLocation: 'Sebagai predikat kata kerja (kebiasaan berulang)',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan seseorang terus-menerus melakukan tindakan yang sama secara berlebihan dan menimbulkan kesan mengkritik atau menyayangkan ("kerjanya cuma ... melulu").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vて ＋ ばかりいる',
          example: '遊んでばかりいる (main melulu), 文句を言ってばかりいる (mengeluh terus)',
        },
      ],
      examples: [
        {
          japanese: '弟は勉強もしないで、一日中ゲームをしてばかりいる。',
          reading: 'おとうとはべんきょうもしないで、いちにちじゅうゲームをしてばかりいる。',
          meaningId: 'Adikku sama sekali tidak belajar, kerjanya seharian cuma main game melulu.',
        },
      ],
    },
  ],

  // ── Week 2 Day 2 Grammar 1: Nに関して ──
  w2d2g1: [
    {
      id: 'ni_kanshite',
      token: '〜に関して',
      usageLocation: 'Di tengah kalimat menghubungkan ke klausa berikutnya (Adverbial)',
      usageLocationType: 'adverbial',
      meaning: 'Mengenai / tentang suatu topik atau permasalahan. Bentuk formal dan lebih tertulis daripada 〜について.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ に関して',
          example: '事件に関して (mengenai insiden tersebut), 環境問題に関して (tentang isu lingkungan)',
        },
      ],
      examples: [
        {
          japanese: 'その事件に関して、新聞で詳しく報道された。',
          reading: 'そのじけんにかんして、しんぶんでくわしくほうどうされた。',
          meaningId: 'Mengenai insiden tersebut, diberitakan secara mendalam di surat kabar.',
        },
      ],
    },
    {
      id: 'ni_kanshite_wa',
      token: '〜に関しては',
      usageLocation: 'Sebagai penanda topik utama kalimat',
      usageLocationType: 'topic',
      meaning: 'Khusus mengenai hal tersebut... (mengangkat topik untuk diperbandingkan atau dibahas khusus).',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ に関しては',
          example: '計画に関しては (mengenai perencanaannya...)',
        },
      ],
      examples: [
        {
          japanese: '姉はファッションに関しては敏感だが、食べ物には無関心だ。',
          reading: 'あねはファッションにかんしてはびんかんだが、たべものにはむかんしんだ。',
          meaningId: 'Kakak perempuan saya kalau mengenai mode sangat peka, tapi kalau soal makanan tidak peduli.',
        },
      ],
    },
    {
      id: 'ni_kansuru_n',
      token: '〜に関するN',
      usageLocation: 'Sebelum Kata Benda (Modifikasi Nomina)',
      usageLocationType: 'noun_modifier',
      meaning: 'Menerangkan kata benda yang ada hubungannya dengan topik tertentu ("N yang berkaitan dengan...").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N1 ＋ に関する ＋ N2',
          example: '経済に関する本 (buku mengenai ekonomi), 法律に関する質問 (pertanyaan mengenai hukum)',
        },
      ],
      examples: [
        {
          japanese: '日本の歴史に関する本を何冊か読んだ。',
          reading: 'にほんのれきしにかんするほんをなんさつかよんだ。',
          meaningId: 'Saya telah membaca beberapa buku yang berkaitan dengan sejarah Jepang.',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 1: 上げる／上がる ──
  w5d2g1: [
    {
      id: 'ageru',
      token: '〜上げる',
      usageLocation: 'Setelah Vます (Kata Kerja Transitif / Tindakan Pelaku)',
      usageLocationType: 'predicate',
      meaning: 'Menyelesaikan suatu pekerjaan atau karya secara tuntas dengan usaha penuh pembicara/pelaku.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ 上げる',
          example: '書き上げる (menulis hingga tuntas), 編み上げる (merajut hingga selesai)',
        },
      ],
      examples: [
        {
          japanese: '長い時間をかけて、ようやく論文を書き上げた。',
          reading: 'ながいじかんをかけて、ようやくろんぶんをかきあげた。',
          meaningId: 'Setelah menghabiskan waktu lama, akhirnya saya berhasil menyelesaikan penulisan tesis.',
        },
      ],
    },
    {
      id: 'agaru',
      token: '〜上がる',
      usageLocation: 'Setelah Vます (Kata Kerja Intransitif / Selesai Alami)',
      usageLocationType: 'predicate',
      meaning: 'Menunjukkan bahwa sesuatu sudah selesai terbentuk atau rampung dengan sendirinya.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ 上がる',
          example: '焼き上がる (selesai dipanggang / matang), 出来上がる (selesai dibuat)',
        },
      ],
      examples: [
        {
          japanese: '焼きたての美味しいパンが焼き上がりましたよ！',
          reading: 'やきたてのおいしいパンがやきあがりましたよ！',
          meaningId: 'Roti lezat yang baru saja dipanggang sudah selesai matang!',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 2: 切る／切れる／切れない ──
  w5d2g2: [
    {
      id: 'kiru',
      token: '〜切る',
      usageLocation: 'Setelah Vます (Penyelesaian Total / Penuh)',
      usageLocationType: 'predicate',
      meaning: 'Melakukan suatu tindakan sampai habis sama sekali tanpa ada yang tersisa.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ 切る',
          example: '使い切る (menghabiskan semua), 読み切る (membaca sampai habis)',
        },
      ],
      examples: [
        {
          japanese: 'もらったお小遣いを一日で全部使い切ってしまった。',
          reading: 'もらったおこづかいをいちにちでぜんぶつかいきってしまった。',
          meaningId: 'Uang saku yang kudapatkan sudah kuhabiskan semua dalam sehari.',
        },
      ],
    },
    {
      id: 'kireru',
      token: '〜切れる',
      usageLocation: 'Setelah Vます (Potensial: Mampu menuntaskan)',
      usageLocationType: 'predicate',
      meaning: 'Sanggup menyelesaikan atau menuntaskan sesuatu sampai batas akhir.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ 切れる',
          example: '走り切れる (sanggup lari sampai finis)',
        },
      ],
      examples: [
        {
          japanese: '42キロのマラソンを最後まで走り切れた。',
          reading: '42キロのマラソンをさいごまではしりきれた。',
          meaningId: 'Saya mampu berlari maraton sejauh 42 kilometer hingga garis finis.',
        },
      ],
    },
    {
      id: 'kirenai',
      token: '〜切れない',
      usageLocation: 'Setelah Vます (Negatif Potensial: Tak sanggup menuntaskan)',
      usageLocationType: 'predicate',
      meaning: 'Tidak sanggup menyelesaikan sampai habis karena terlalu banyak atau melampaui kemampuan.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ 切れない',
          example: '数え切れない (tidak terhitung banyaknya), 食べ切れない (tidak sanggup menghabiskan)',
        },
      ],
      examples: [
        {
          japanese: '料理が多すぎて、一人ではとても食べ切れません。',
          reading: 'りょうりがおおすぎて、ひとりではとてもたべきれません。',
          meaningId: 'Makanannya terlalu banyak, sendirian saya benar-benar tidak sanggup menghabiskannya.',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 3: かける／かけのN／かけだ ──
  w5d2g3: [
    {
      id: 'kakeru',
      token: '〜かける',
      usageLocation: 'Setelah Vます (Proses setengah jalan)',
      usageLocationType: 'predicate',
      meaning: 'Memulai suatu tindakan namun berhenti di tengah jalan sebelum selesai.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ かける',
          example: '言いかける (hendak mengatakan tapi terhenti), 読みかける (mulai membaca tapi belum selesai)',
        },
      ],
      examples: [
        {
          japanese: '何か言いかけて、やめてしまった。',
          reading: 'なにかいいかけて、やめてしまった。',
          meaningId: 'Dia tampak hendak mengatakan sesuatu, tetapi mendadak berhenti.',
        },
      ],
    },
    {
      id: 'kake_no_n',
      token: '〜かけのN',
      usageLocation: 'Sebelum Kata Benda (Modifikasi Nomina)',
      usageLocationType: 'noun_modifier',
      meaning: 'Kata benda yang kondisinya masih setengah jadi atau belum tuntas dikerjakan.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ かけの ＋ N',
          example: '食べかけのリンゴ (apel yang baru dimakan separuh), 読みかけの本 (buku yang sedang dibaca setengah)',
        },
      ],
      examples: [
        {
          japanese: '机の上に、飲みかけのコーヒーが置いてある。',
          reading: 'つくえのうえに、のみかけのコーヒーがおいてある。',
          meaningId: 'Di atas meja, tergeletak kopi yang belum selesai diminum.',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 4: たてのN／たてだ ──
  w5d2g4: [
    {
      id: 'tate_no_n',
      token: '〜たてのN',
      usageLocation: 'Sebelum Kata Benda (Modifikasi Nomina)',
      usageLocationType: 'noun_modifier',
      meaning: 'Menyatakan sesuatu yang baru saja selesai dilakukan dan masih dalam kondisi sangat segar/baru.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ たての ＋ N',
          example: '焼きたてのパン (roti yang baru keluar dari oven), 淹れたてのコーヒー (kopi yang baru diseduh)',
        },
      ],
      examples: [
        {
          japanese: '焼きたてのパンは、香りが良くて本当に美味しい。',
          reading: 'やきたてのパンは、かおりがよくてほんとうにおいしい。',
          meaningId: 'Roti yang baru saja matang dari oven memiliki aroma harum dan sangat lezat.',
        },
      ],
    },
    {
      id: 'tate_da',
      token: '〜たてだ',
      usageLocation: 'Di akhir kalimat sebagai predikat',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa kondisi tersebut baru saja terjadi/dibuat.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ たてだ',
          example: 'ペンキは塗りたてだ (catnya baru saja dioleskan)',
        },
      ],
      examples: [
        {
          japanese: 'このペンキは塗りたてだから、触らないでください。',
          reading: 'このペンキはぬりたてだから、さわらないでください。',
          meaningId: 'Cat ini baru saja dioleskan, tolong jangan disentuh.',
        },
      ],
    },
  ],
};

// ─── Automated Dynamic Sub-Branch Extractor ─────────────────────────

/**
 * Infer usage location type and description based on sub-formula token endings.
 */
function inferUsageLocation(token: string): { location: string; type: SubFormulaBranch['usageLocationType'] } {
  const clean = token.replace(/^[〜~]/, '').trim();

  if (/N$|N['’]$|のN$/.test(clean) || clean.endsWith('な') || clean.endsWith('の')) {
    return {
      location: 'Sebelum Kata Benda (Nomina) untuk memodifikasi benda tersebut',
      type: 'noun_modifier',
    };
  }

  if (clean.endsWith('に') || clean.endsWith('で') || clean.endsWith('く') || clean.endsWith('より')) {
    return {
      location: 'Sebelum Kata Kerja / Kata Sifat sebagai adverbia (keterangan cara / tujuan)',
      type: 'adverbial',
    };
  }

  if (clean.endsWith('は') || clean.endsWith('も')) {
    return {
      location: 'Sebagai penanda topik utama atau penekanan dalam kalimat',
      type: 'topic',
    };
  }

  if (clean.endsWith('ば') || clean.endsWith('たら') || clean.endsWith('と') || clean.endsWith('なら')) {
    return {
      location: 'Sebagai klausa syarat / pengandaian',
      type: 'conditional',
    };
  }

  return {
    location: 'Di akhir kalimat (sebagai predikat utama kalimat)',
    type: 'predicate',
  };
}

/**
 * Parse an isolated segment of condition string (e.g. 'Vる', 'Vない', 'Nの', 'A')
 */
function parseSingleConditionSegment(seg: string): ConnectionCondition[] {
  const conditions: ConnectionCondition[] = [];
  const normalized = seg.trim();

  // 1. Noun detection (only if it doesn't also contain V)
  if (/N|Noun|名詞/i.test(normalized) && !/V|Verb/i.test(normalized)) {
    let nRule = 'N (Kata Benda) ＋ pola';
    let nEx = 'Kata benda langsung menempel sesuai pola';
    if (/Nの|Noun.*の/i.test(normalized)) {
      nRule = 'N ＋ の ＋ pola';
      nEx = 'Hubungkan kata benda dengan partikel の (contoh: 先生の、子供の)';
    } else if (/Nな|Noun.*な/i.test(normalized)) {
      nRule = 'N ＋ な ＋ pola';
      nEx = 'Hubungkan kata benda dengan partikel な (contoh: 病気な)';
    } else if (/Nである|Noun.*である/i.test(normalized)) {
      nRule = 'N ＋ である ＋ pola';
      nEx = 'Gunakan bentuk formal である (contoh: 学生である)';
    } else if (/Nに|Noun.*に/i.test(normalized)) {
      nRule = 'N ＋ に ＋ pola';
      nEx = 'Tandai kata benda dengan partikel に (contoh: 友達に)';
    } else if (/Nで|Noun.*で/i.test(normalized)) {
      nRule = 'N ＋ で ＋ pola';
      nEx = 'Tandai kata benda dengan partikel で (contoh: バスで)';
    }
    conditions.push({ partOfSpeech: 'Kata Benda (N)', rule: nRule, example: nEx });
    return conditions;
  }

  // 2. Verb detection
  if (/V|Verb|動詞/i.test(normalized)) {
    if (/Vよう|よう|volitional|意向形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Bentuk Maksud (V-よう)',
        rule: 'Vよう (Bentuk Maksud / Ajakan) ＋ pola',
        example: 'Godan: u → ou (行こう), Ichidan: ru → you (食べよう), する → しよう, 来る → こよう',
      });
    } else if (/causative|使役|(さ)せて|させて|させる/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Kausatif (V-saseru)',
        rule: 'V(さ)せる (Bentuk Kausatif) ＋ pola',
        example: 'Godan: a + せる (書かせる), Ichidan: させる (食べさせる), する → させる, 来る → こさせる',
      });
    } else if (/Vれます/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Potensial Sopan (Vれます)',
        rule: 'Vれます (Bentuk Potensial Sopan) ＋ pola',
        example: 'Contoh: 合格できますように, 治りますように, 会えますように',
      });
    } else if (/Vません/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Negatif Sopan (Vません)',
        rule: 'Vません (Bentuk Negatif Sopan) ＋ pola',
        example: 'Contoh: 降りませんように, 失敗しませんように',
      });
    } else if (/Vます/i.test(normalized) || (/stem|［stem］/i.test(normalized) && !/Vる|Vない/i.test(normalized))) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Bentuk Masu (Vます)',
        rule: 'Vます (Bentuk Sopan / Stem) ＋ pola',
        example: 'Coret ます: 行き (dari 行きます), 食べ (dari 食べます), し (dari します)',
      });
    } else if (/Vれる|Vられる|passive|受身/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Pasif/Potensial (Vれる)',
        rule: 'Vれる / Vられる (Bentuk Pasif / Potensial) ＋ pola',
        example: 'Godan: a + れる (書かれる), Ichidan: られる (褒められる), する → される, 来る → こられる',
      });
    } else if (/Vば|ば-form|ba-conditional|条件形|え-stem/i.test(normalized) || /ば$/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Pengandaian (Vば)',
        rule: 'Vば形 (Bentuk Pengandaian -ba) ＋ pola',
        example: 'Godan: e + ば (行けば), Ichidan: reba (食べれば), する → すれば, 来る → くれば',
      });
    } else if (/命令形|imperative/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Perintah (V命令形)',
        rule: 'V命令形 (Bentuk Perintah) ＋ pola',
        example: 'Godan: e (行け), Ichidan: ro (食べろ), する → しろ, 来る → こい',
      });
    } else if (/禁止形|prohibitive|るな/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Larangan (Vるな)',
        rule: 'V禁止形 (Bentuk Larangan: Vるな) ＋ pola',
        example: 'Bentuk kamus + な: 行くな (Jangan pergi), 食べるな (Jangan makan)',
      });
    } else if (/potential|可能形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Potensial (V可能形)',
        rule: 'V可能形 (Bentuk Potensial / Bisa) ＋ pola',
        example: 'Godan: e + る (話せる), Ichidan: rareru (食べられる), する → できる, 来る → こられる',
      });
    } else if (/Vない|ない\s*form|［ない\s*form］|ない形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Negatif (Vない)',
        rule: 'Vない形 (Bentuk Negatif) ＋ pola',
        example: 'Bentuk negatif: 忘れない, 遅れない, 諦めない, 行かない',
      });
    } else if (/Vて|て\s*form|［て\s*form］|て形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Bentuk-Te (Vて)',
        rule: 'Vて形 (Bentuk Sambung -te) ＋ pola',
        example: 'Bentuk sambung: 食べて, 飲んで, 行って, して',
      });
    } else if (/Vた|た\s*form|［た\s*form］|た形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Bentuk-Ta (Vた)',
        rule: 'Vた形 (Bentuk Lampau) ＋ pola',
        example: 'Bentuk lampau: 食べた, 飲んだ, 行った, した',
      });
    } else if (/Vる|dictionary|辞書形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Kamus (Vる)',
        rule: 'Vる (Bentuk Kamus) ＋ pola',
        example: 'Bentuk kamus dasar: 早く来る, 気をつける, 食べる, 行く',
      });
    } else if (/V普|plain|普通形/i.test(normalized)) {
      conditions.push({
        partOfSpeech: 'Kata Kerja Biasa (V普)',
        rule: 'V普 (Bentuk Biasa / Plain Form) ＋ pola',
        example: 'Bentuk kasual biasa (kamus, negatif, lampau, lampau negatif)',
      });
    } else {
      conditions.push({
        partOfSpeech: 'Kata Kerja (V)',
        rule: 'Kata Kerja (V) ＋ pola',
        example: 'Sesuaikan konjugasi kata kerja yang disyaratkan pola',
      });
    }
    return conditions;
  }

  // 3. Adjectives detection
  if (/na|な-adjective|形容動詞/i.test(normalized)) {
    let naRule = 'na (Kata Sifat-na) ＋ pola';
    let naEx = 'Gunakan bentuk kata sifat-na sesuai kebutuhan';
    if (/naな|な-adjective.*な/i.test(normalized)) {
      naRule = 'na ＋ な ＋ pola';
      naEx = 'Sifat-na memerlukan partikel な (contoh: 静かな, きれいな)';
    } else if (/naである|な-adjective.*である/i.test(normalized)) {
      naRule = 'na ＋ である ＋ pola';
      naEx = 'Gunakan bentuk formal である (contoh: 静かである)';
    } else if (/stem|語幹/i.test(normalized)) {
      naRule = 'na (Stem / tanpa だ・な) ＋ pola';
      naEx = 'Hanya batang kata sifat-na (contoh: 静か, 元気)';
    }
    conditions.push({ partOfSpeech: 'Kata Sifat-na', rule: naRule, example: naEx });
    return conditions;
  }

  if (/A|い-adjective|い形|形容詞/i.test(normalized)) {
    let aRule = 'Aい (Kata Sifat-i) ＋ pola';
    let aEx = 'Kata sifat-i bentuk biasa langsung menyambung (contoh: 高い, 優しい)';
    if (/stem|語幹|（い→/i.test(normalized)) {
      aRule = 'Aい (Coret い / Stem) ＋ pola';
      aEx = 'Hilangkan huruf akhiran い (contoh: 高い → 高, 暑い → 暑)';
    } else if (/くて|［くて］/i.test(normalized)) {
      aRule = 'Aくて (Bentuk Sambung) ＋ pola';
      aEx = 'Ubah akhiran い menjadi くて (contoh: 安くて, 寒くて)';
    }
    conditions.push({ partOfSpeech: 'Kata Sifat-i (A)', rule: aRule, example: aEx });
    return conditions;
  }

  return conditions;
}

/**
 * Infer connection conditions from the left-hand side of a formula.
 * Automatically splits multi-variant expressions like 'Vる／Vない' or 'Nの／V'.
 */
function inferConditionsFromLeft(leftSide: string): ConnectionCondition[] {
  const normalized = leftSide.trim();
  const segments = normalized.split(/[／/；;]/).map(s => s.trim()).filter(Boolean);

  if (segments.length <= 1) {
    const single = parseSingleConditionSegment(normalized);
    if (single.length > 0) return single;
  } else {
    const results: ConnectionCondition[] = [];
    const seenPos = new Set<string>();
    for (const seg of segments) {
      const conds = parseSingleConditionSegment(seg);
      for (const c of conds) {
        if (!seenPos.has(c.partOfSpeech)) {
          seenPos.add(c.partOfSpeech);
          results.push(c);
        }
      }
    }
    if (results.length > 0) return results;
  }

  return [{
    partOfSpeech: 'Aturan Sambungan',
    rule: leftSide || 'Mengikuti rumus pembentukan dasar',
    example: 'Ikuti rumus sambungan dasar pola ini',
  }];
}

/**
 * Fallback automatic generator that derives sub-branches for any bunpou formula.
 */
function extractSubBranchesFromFormula(item: BunpouItem): SubFormulaBranch[] {
  const formula = item.formula || '';
  if (!formula.trim()) {
    return [
      {
        id: `${item.id}_sub1`,
        token: item.title.split(/[(（]/)[0].trim(),
        usageLocation: 'Penggunaan umum dalam kalimat',
        usageLocationType: 'general',
        meaning: item.meaningId,
        connectionConditions: [
          {
            partOfSpeech: 'Pola Dasar',
            rule: item.formula || item.title,
          },
        ],
        examples: item.examples.slice(0, 2),
      },
    ];
  }

  // Split on formula core: left side (connection conditions) + right side (variations)
  let leftSide = '';
  let rightSide = formula;

  if (formula.includes('＋') || formula.includes('+')) {
    const parts = formula.split(/[＋+]/);
    leftSide = parts[0].trim();
    rightSide = parts.slice(1).join('＋').trim();
  } else {
    // If no explicit plus sign, use the formula/title to infer base conditions
    leftSide = formula || item.title;
  }

  const baseConditions = inferConditionsFromLeft(leftSide);

  // Extract branches from right side by splitting on ／ or ； or commas
  // Also handle patterns like ばかり(だ／のN／で)
  let branchTokens: string[] = [];

  if (rightSide.includes('／') || rightSide.includes('/') || rightSide.includes('；')) {
    const rawTokens = rightSide.split(/[／/；;]/).map(t => t.trim()).filter(Boolean);
    branchTokens = rawTokens;
  } else {
    branchTokens = [rightSide];
  }

  // Generate branches
  const branches: SubFormulaBranch[] = branchTokens.map((rawToken, idx) => {
    const cleanToken = rawToken.replace(/[()（）]/g, '').trim();
    const tokenDisplay = cleanToken.startsWith('〜') ? cleanToken : `〜${cleanToken}`;
    const { location, type } = inferUsageLocation(cleanToken);

    // Pick matching example from authored examples if possible
    const matchingExample = item.examples.find(ex => ex.japanese.includes(cleanToken.replace(/N$|N['’]$/, '')))
      || item.examples[idx % item.examples.length]
      || item.examples[0];

    const examples: ExampleSentence[] = matchingExample ? [matchingExample] : [];

    return {
      id: `${item.id}_sub_${idx + 1}`,
      token: tokenDisplay,
      usageLocation: location,
      usageLocationType: type,
      meaning: `${item.meaningId} (${tokenDisplay})`,
      connectionConditions: baseConditions.map(c => ({
        ...c,
        rule: `${c.rule.split('＋')[0].trim()} ＋ ${cleanToken}`,
      })),
      examples,
    };
  });

  return branches.length > 0 ? branches : [
    {
      id: `${item.id}_sub1`,
      token: item.title.split(/[(（]/)[0].trim(),
      usageLocation: 'Di akhir kalimat sebagai predikat',
      usageLocationType: 'predicate',
      meaning: item.meaningId,
      connectionConditions: baseConditions,
      examples: item.examples.slice(0, 2),
    },
  ];
}

/**
 * Returns structured sub-branches for a given BunpouItem.
 * Uses curated data first, falling back to dynamic extraction.
 */
export function getSubBranchesForBunpou(item: BunpouItem): SubFormulaBranch[] {
  if (CURATED_SUB_BRANCHES[item.id]) {
    return CURATED_SUB_BRANCHES[item.id];
  }
  return extractSubBranchesFromFormula(item);
}

// ─── Global Lookup Registry for Connectors and Modal ─────────────────

const ALL_SUB_BRANCHES: Record<string, SubFormulaBranch> = {};

// Populate from curated
Object.values(CURATED_SUB_BRANCHES).forEach(branches => {
  branches.forEach(b => {
    ALL_SUB_BRANCHES[b.id] = b;
    // Also index by normalized token
    const norm = b.token.replace(/^[〜~]/, '').trim();
    ALL_SUB_BRANCHES[norm] = b;
  });
});

/**
 * Find a sub-branch by its identifier or exact/normalized token text.
 */
export function findSubBranch(key: string): SubFormulaBranch | undefined {
  if (ALL_SUB_BRANCHES[key]) return ALL_SUB_BRANCHES[key];
  const normalized = key.replace(/^[〜~]/, '').replace(/\s+/g, '');
  return ALL_SUB_BRANCHES[normalized];
}

/**
 * Find sibling sub-branches that belong to the same grammar set as the given sub-branch ID or token.
 */
export function getSiblingSubBranches(key: string): SubFormulaBranch[] {
  const target = findSubBranch(key);
  if (!target) return [];

  for (const branches of Object.values(CURATED_SUB_BRANCHES)) {
    if (branches.some(b => b.id === target.id || b.token === target.token)) {
      return branches;
    }
  }

  return [target];
}

