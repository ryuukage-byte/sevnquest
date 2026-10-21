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
      usageLocation: 'Di akhir kalimat, sebagai predikat',
      usageLocationType: 'predicate',
      meaning: 'Di akhir kalimat, みたいだ menyatakan perumpamaan ("seperti ~") atau dugaan berdasarkan pengamatan pembicara ("sepertinya ~"). Lebih santai daripada 〜ようだ.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ みたいだ',
          example: '女みたいだ (seperti perempuan), 子供みたいだ (seperti anak kecil) [langsung, tanpa の]',
        },
        {
          partOfSpeech: 'Kata Sifat-na',
          rule: 'na ＋ みたいだ',
          example: '静かみたいだ (tampaknya sepi), 元気みたいだ (tampaknya sehat) [langsung, tanpa な]',
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
          meaningId: 'Cara bicaranya seperti perempuan. (perumpamaan di akhir kalimat)',
        },
        {
          japanese: '今日はとても暖かくて、もう春になったみたいだ。',
          reading: 'きょうはとてもあたたかくて、もうはるになったみたいだ。',
          meaningId: 'Hari ini hangat sekali, sepertinya musim semi sudah tiba. (dugaan di akhir kalimat)',
        },
      ],
    },
    {
      id: 'mitai_ni',
      token: '〜みたいに',
      usageLocation: 'Sebelum kata kerja atau kata sifat, sebagai keterangan cara',
      usageLocationType: 'adverbial',
      meaning: 'Menerangkan cara suatu tindakan atau tingkat suatu keadaan dengan perumpamaan ("seperti ~", "bagaikan ~"). Diletakkan sebelum kata kerja atau kata sifat yang diterangkannya.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ みたいに ＋ V / A',
          example: '雪みたいに白い (putih seperti salju), おじいさんみたいに話す (bicara seperti kakek-kakek)',
        },
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V普 ＋ みたいに ＋ V / A',
          example: '酔ったみたいにふらふら歩く (berjalan sempoyongan seperti orang mabuk)',
        },
      ],
      examples: [
        {
          japanese: '彼はまだ若いのに、まるでおじいさんみたいに話す。',
          reading: 'かれはまだわかいのに、まるでおじいさんみたいにはなす。',
          meaningId: 'Padahal dia masih muda, dia berbicara persis seperti kakek-kakek. (menerangkan kata kerja 話す)',
        },
        {
          japanese: '彼女の肌は雪みたいに白くて美しい。',
          reading: 'かのじょのはだはゆきみたいにしろくてうつくしい。',
          meaningId: 'Kulitnya putih seperti salju dan indah. (menerangkan kata sifat 白い)',
        },
        {
          japanese: '彼はお酒に酔ったみたいにふらふら歩いている。',
          reading: 'かれはおさけによったみたいにふらふらあるいている。',
          meaningId: 'Dia berjalan sempoyongan seperti orang mabuk. (Vた ＋ みたいに ＋ kata kerja)',
        },
      ],
    },
    {
      id: 'mitai_na',
      token: '〜みたいなN',
      usageLocation: 'Sebelum kata benda, untuk menerangkan kata benda itu',
      usageLocationType: 'noun_modifier',
      meaning: 'Menerangkan kata benda dengan perumpamaan atau contoh ("N yang seperti ~"). Juga dipakai untuk memberi contoh: 東京みたいな大きい町 = kota besar seperti Tokyo.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N1 ＋ みたいな ＋ N2',
          example: '本物の果物みたいな味 (rasa yang seperti buah asli), 太陽みたいな笑顔 (senyum secerah matahari), 夢みたいな話 (cerita bagaikan mimpi)',
        },
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V普 ＋ みたいな ＋ N',
          example: '怒っているみたいな顔 (wajah yang seperti sedang marah), 死んだみたいな静けさ (keheningan seperti mati)',
        },
      ],
      examples: [
        {
          japanese: 'このお菓子は、まるで本物の果物みたいな味だ。',
          reading: 'このおかしは、まるでほんもののくだものみたいなあじだ。',
          meaningId: 'Kue ini rasanya persis seperti buah asli. (menerangkan kata benda 味)',
        },
        {
          japanese: 'あの人は怒っているみたいな顔をしている。',
          reading: 'あのひとはおこっているみたいなかおをしている。',
          meaningId: 'Orang itu berwajah seperti sedang marah. (menerangkan kata benda 顔)',
        },
      ],
    },
  ],

  // ── Week 1 Day 1 Grammar 3: 早く帰らせてください ──
  w1d1g3: [
    {
      id: 'sasete_kudasai',
      token: '〜(さ)せてください',
      usageLocation: 'Di akhir kalimat (meminta izin dengan sopan)',
      usageLocationType: 'predicate',
      meaning: 'Meminta izin kepada lawan bicara agar pembicara diperbolehkan melakukan sesuatu ("izinkan saya ~").',
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
          meaningId: 'Karena badan saya kurang enak, izinkan saya pulang lebih awal.',
        },
      ],
    },
    {
      id: 'sasete_moraemasu_ka',
      token: '〜(さ)せてもらえますか',
      usageLocation: 'Di akhir kalimat (meminta izin dengan lebih halus)',
      usageLocationType: 'predicate',
      meaning: 'Meminta izin dengan bertanya apakah lawan bicara bersedia mengizinkan ("bolehkah saya ~?"). Lebih halus daripada 〜させてください.',
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
      usageLocation: 'Di akhir kalimat (meminta izin dengan sangat halus)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk tanya negatif membuat permintaan izin terdengar lebih halus dan memberi ruang bagi lawan bicara untuk menolak. Untuk atasan atau situasi resmi, bentuk yang lebih sopan lagi adalah 〜させていただけませんか.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'V(さ)せて ＋ もらえませんか',
          example: '休ませてもらえませんか (bolehkah saya izin tidak masuk?)',
        },
      ],
      examples: [
        {
          japanese: 'その件について、私にも一言言わせてもらえませんか。',
          reading: 'そのけんについて、わたしにもひとこといわせてもらえませんか。',
          meaningId: 'Mengenai hal itu, bolehkah saya juga menyampaikan sepatah kata?',
        },
      ],
    },
  ],

  // ── Week 1 Day 2 Grammar 1: もう寝ないと ──
  w1d2g1: [
    {
      id: 'naito',
      token: '〜ないと',
      usageLocation: 'Di akhir kalimat dalam percakapan santai',
      usageLocationType: 'predicate',
      meaning: 'Bentuk singkat lisan dari 〜ないといけない (harus ~). Bagian いけない dihilangkan sehingga kalimat berhenti di と.',
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
          meaningId: 'Besok aku berangkat pagi-pagi, jadi aku harus tidur sekarang.',
        },
      ],
    },
    {
      id: 'nakucha',
      token: '〜なくちゃ',
      usageLocation: 'Di akhir kalimat dalam percakapan santai',
      usageLocationType: 'predicate',
      meaning: 'Bentuk singkat lisan dari 〜なくては(いけない) (harus ~). Sering dipakai saat berbicara pada diri sendiri atau dengan teman akrab.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vない (ない → なくちゃ)',
          example: '出さなくちゃ (harus mengumpulkan), 食べなくちゃ (harus makan)',
        },
      ],
      examples: [
        {
          japanese: '宿題を明日までに先生に出さなくちゃ。',
          reading: 'しゅくだいをあしたまでにせんせいにださなくちゃ。',
          meaningId: 'Aku harus menyerahkan PR ke guru paling lambat besok.',
        },
      ],
    },
  ],

  // ── Week 1 Day 2 Grammar 2: 食べちゃった ──
  w1d2g2: [
    {
      id: 'chau',
      token: '〜ちゃう／〜ちゃった',
      usageLocation: 'Sebagai predikat dalam percakapan santai',
      usageLocationType: 'predicate',
      meaning: 'Bentuk singkat lisan dari Vてしまう: tindakan selesai tuntas, atau terjadi tanpa disengaja dan disesali.',
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
          meaningId: 'Aduh, dokumen pentingku ketinggalan di kereta!',
        },
      ],
    },
    {
      id: 'jau',
      token: '〜じゃう／〜じゃった',
      usageLocation: 'Sebagai predikat dalam percakapan santai (kata kerja dengan bentuk -te berakhiran で)',
      usageLocationType: 'predicate',
      meaning: 'Bentuk singkat lisan dari Vでしまう, dipakai untuk kata kerja yang bentuk -te-nya berakhiran で (飲んで, 遊んで, 泳いで).',
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
          meaningId: 'Karena haus, aku menghabiskan semua jusnya.',
        },
      ],
    },
  ],

  // ── Week 1 Day 3 Grammar 2: 春らしい ──
  w1d3g2: [
    {
      id: 'rashii_pred',
      token: '〜らしい',
      usageLocation: 'Sebagai predikat atau sebelum kata benda',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa sesuatu memiliki ciri khas atau sifat ideal dari N ("benar-benar khas ~", "layaknya ~").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ らしい',
          example: '春らしい (khas musim semi), 男らしい (jantan, bersifat laki-laki sejati)',
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
      usageLocation: 'Sebelum kata kerja atau kata sifat, sebagai keterangan cara',
      usageLocationType: 'adverbial',
      meaning: 'Melakukan sesuatu dengan cara yang sesuai dengan sifat ideal dari N ("selayaknya ~").',
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
          meaningId: 'Belajarlah lebih giat selayaknya seorang pelajar.',
        },
      ],
    },
  ],

  // ── Week 1 Day 3 Grammar 3: 大人っぽい ──
  w1d3g3: [
    {
      id: 'ppoi_pred',
      token: '〜っぽい',
      usageLocation: 'Sebagai predikat atau sebelum kata benda',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan kesan yang tampak dari luar ("terkesan ~", "agak ~") atau kecenderungan ("mudah ~"). Nadanya santai dan kadang sedikit negatif.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ っぽい',
          example: '大人っぽい (terlihat dewasa), 子供っぽい (kekanak-kanakan), 油っぽい (berminyak)',
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
          meaningId: 'Anak SD itu terkesan seperti orang dewasa.',
        },
      ],
    },
  ],

  // ── Week 2 Day 1 Grammar 1: 女性ばかり ──
  w2d1g1: [
    {
      id: 'bakari_da',
      token: '〜ばかり／〜ばかりだ',
      usageLocation: 'Setelah kata benda, sebagai predikat atau keterangan',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa isinya hanya hal itu saja, dengan kesan jumlahnya banyak ("~ melulu", "hampir semuanya ~").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Benda (N)',
          rule: 'N ＋ ばかり',
          example: '女性ばかり (perempuan semua), 失敗ばかり (gagal melulu)',
        },
      ],
      examples: [
        {
          japanese: 'このクラスは、女性ばかりだ。',
          reading: 'このクラスは、じょせいばかりだ。',
          meaningId: 'Kelas ini isinya perempuan semua.',
        },
      ],
    },
    {
      id: 'te_bakari_iru',
      token: '〜てばかりいる',
      usageLocation: 'Sebagai predikat (tindakan yang terus diulang)',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa seseorang terus-menerus melakukan hal yang sama, biasanya dengan nada mengkritik ("kerjanya ~ terus").',
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
          meaningId: 'Adikku tidak belajar sama sekali, kerjanya seharian main game terus.',
        },
      ],
    },
  ],

  // ── Week 2 Day 2 Grammar 1: Nに関して ──
  w2d2g1: [
    {
      id: 'ni_kanshite',
      token: '〜に関して',
      usageLocation: 'Di tengah kalimat, sebagai keterangan topik',
      usageLocationType: 'adverbial',
      meaning: 'Menyatakan topik atau permasalahan yang dibicarakan ("mengenai ~"). Lebih formal daripada 〜について.',
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
          meaningId: 'Insiden itu diberitakan secara rinci di surat kabar.',
        },
      ],
    },
    {
      id: 'ni_kanshite_wa',
      token: '〜に関しては',
      usageLocation: 'Sebagai penanda topik (sering untuk membandingkan)',
      usageLocationType: 'topic',
      meaning: 'Menonjolkan satu topik secara khusus, sering untuk dibandingkan dengan hal lain ("kalau soal ~").',
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
          meaningId: 'Kakak perempuan saya peka sekali kalau soal mode, tetapi tidak peduli soal makanan.',
        },
      ],
    },
    {
      id: 'ni_kansuru_n',
      token: '〜に関するN',
      usageLocation: 'Sebelum kata benda, untuk menerangkan kata benda itu',
      usageLocationType: 'noun_modifier',
      meaning: 'Menerangkan kata benda yang berkaitan dengan suatu topik ("N mengenai ~").',
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
          meaningId: 'Saya sudah membaca beberapa buku mengenai sejarah Jepang.',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 1: 上げる／上がる ──
  w5d2g1: [
    {
      id: 'ageru',
      token: '〜上げる',
      usageLocation: 'Setelah bentuk masu (tanpa ます), dengan kata kerja transitif',
      usageLocationType: 'predicate',
      meaning: 'Pelaku menyelesaikan suatu pekerjaan atau karya sampai rampung, biasanya setelah usaha yang cukup besar.',
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
          meaningId: 'Setelah menghabiskan waktu lama, akhirnya saya selesai menulis tesis.',
        },
      ],
    },
    {
      id: 'agaru',
      token: '〜上がる',
      usageLocation: 'Setelah bentuk masu (tanpa ます), sebagai kata kerja intransitif',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa sesuatu sudah jadi atau rampung, dengan fokus pada hasilnya, bukan pada pelakunya.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ 上がる',
          example: '焼き上がる (selesai dipanggang / matang), 出来上がる (selesai dibuat)',
        },
      ],
      examples: [
        {
          japanese: 'おいしいパンが焼き上がりましたよ！',
          reading: 'おいしいパンがやきあがりましたよ！',
          meaningId: 'Roti yang lezat sudah matang!',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 2: 切る／切れる／切れない ──
  w5d2g2: [
    {
      id: 'kiru',
      token: '〜切る',
      usageLocation: 'Setelah bentuk masu (tanpa ます)',
      usageLocationType: 'predicate',
      meaning: 'Melakukan suatu tindakan sampai habis atau tuntas, tanpa sisa.',
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
      usageLocation: 'Setelah bentuk masu (tanpa ます), bentuk potensial',
      usageLocationType: 'predicate',
      meaning: 'Sanggup melakukan sesuatu sampai habis atau sampai akhir.',
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
      usageLocation: 'Setelah bentuk masu (tanpa ます), bentuk potensial negatif',
      usageLocationType: 'predicate',
      meaning: 'Tidak sanggup melakukan sesuatu sampai habis karena jumlahnya terlalu banyak atau melebihi kemampuan.',
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
          meaningId: 'Makanannya terlalu banyak, saya tidak mungkin sanggup menghabiskannya sendirian.',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 3: かける／かけのN／かけだ ──
  w5d2g3: [
    {
      id: 'kakeru',
      token: '〜かける',
      usageLocation: 'Setelah bentuk masu (tanpa ます)',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa suatu tindakan sudah dimulai tetapi berhenti sebelum selesai, atau sesuatu hampir terjadi (死にかける = hampir mati).',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ かける',
          example: '言いかける (mulai bicara lalu berhenti), 忘れかける (hampir lupa)',
        },
      ],
      examples: [
        {
          japanese: '何か言いかけて、やめてしまった。',
          reading: 'なにかいいかけて、やめてしまった。',
          meaningId: 'Dia mulai mengatakan sesuatu, tetapi lalu berhenti.',
        },
      ],
    },
    {
      id: 'kake_no_n',
      token: '〜かけのN',
      usageLocation: 'Sebelum kata benda, untuk menerangkan kata benda itu',
      usageLocationType: 'noun_modifier',
      meaning: 'Menerangkan benda yang tindakannya sudah dimulai tetapi belum selesai ("~ yang baru separuh").',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ かけの ＋ N',
          example: '食べかけのリンゴ (apel yang baru dimakan separuh), 読みかけの本 (buku yang belum selesai dibaca)',
        },
      ],
      examples: [
        {
          japanese: '机の上に、飲みかけのコーヒーが置いてある。',
          reading: 'つくえのうえに、のみかけのコーヒーがおいてある。',
          meaningId: 'Di atas meja ada kopi yang belum habis diminum.',
        },
      ],
    },
  ],

  // ── Week 5 Day 2 Grammar 4: たてのN／たてだ ──
  w5d2g4: [
    {
      id: 'tate_no_n',
      token: '〜たてのN',
      usageLocation: 'Sebelum kata benda, untuk menerangkan kata benda itu',
      usageLocationType: 'noun_modifier',
      meaning: 'Menerangkan sesuatu yang baru saja selesai dibuat atau dilakukan, sehingga masih segar.',
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
          meaningId: 'Roti yang baru dipanggang itu harum dan sungguh enak.',
        },
      ],
    },
    {
      id: 'tate_da',
      token: '〜たてだ',
      usageLocation: 'Di akhir kalimat, sebagai predikat',
      usageLocationType: 'predicate',
      meaning: 'Menyatakan bahwa sesuatu baru saja dibuat atau dilakukan.',
      connectionConditions: [
        {
          partOfSpeech: 'Kata Kerja (V)',
          rule: 'Vます ＋ たてだ',
          example: 'ペンキは塗りたてだ (catnya masih baru/basah)',
        },
      ],
      examples: [
        {
          japanese: 'このペンキは塗りたてだから、触らないでください。',
          reading: 'このペンキはぬりたてだから、さわらないでください。',
          meaningId: 'Catnya masih basah, tolong jangan disentuh.',
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
        autoGenerated: true,
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
      autoGenerated: true,
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
      autoGenerated: true,
    },
  ];
}

/** Cabang yang ditulis/dikurasi manual (bukan hasil urai otomatis) dan layak ditampilkan sebagai penjelasan. */
export function getCuratedSubFormulas(item: Pick<BunpouItem, 'subFormulas'>): SubFormulaBranch[] {
  return (item.subFormulas || []).filter(sub => !sub.autoGenerated);
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

