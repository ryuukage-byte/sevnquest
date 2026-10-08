// Formula Breakdown Examples Utility
// Generates concise phrase-level examples for each branch of a grammar formula.
// e.g. "Vる／Vない／Vれる ＋ ように" →
//   - Vる ＋ ように = 食べるように (taberu you ni) = Agar / supaya makan
//   - Vない ＋ ように = 忘れないように (wasurenai you ni) = Agar / supaya tidak lupa
//   - Vれる ＋ ように = 聞こえるように (kikoeru you ni) = Agar / supaya bisa mendengar (terdengar)

import { BunpouItem } from '../types/content';

export interface FormulaBranchExample {
  formula: string;        // e.g. "Vる ＋ ように"
  exampleJp: string;      // e.g. "食べるように"
  exampleReading: string; // e.g. "taberu you ni"
  meaningId: string;      // e.g. "Agar / supaya makan"
}

/**
 * Curated high-precision breakdown dictionary for JLPT grammar formulas.
 */
const CURATED_FORMULA_MAP: Record<string, FormulaBranchExample[]> = {
  // ── ように ──
  'ように': [
    {
      formula: 'Vる ＋ ように',
      exampleJp: '食べるように',
      exampleReading: 'taberu you ni',
      meaningId: 'Agar / supaya makan',
    },
    {
      formula: 'Vない ＋ ように',
      exampleJp: '忘れないように',
      exampleReading: 'wasurenai you ni',
      meaningId: 'Agar / supaya tidak lupa',
    },
    {
      formula: 'Vれる ＋ ように',
      exampleJp: '聞こえるように',
      exampleReading: 'kikoeru you ni',
      meaningId: 'Agar / supaya bisa mendengar (terdengar)',
    },
  ],

  // ── ようにする ──
  'ようにする': [
    {
      formula: 'Vる ＋ ようにする',
      exampleJp: '毎日運動するようにする',
      exampleReading: 'mainichi undou suru you ni suru',
      meaningId: 'Berusaha membiasakan untuk berolahraga setiap hari',
    },
    {
      formula: 'Vない ＋ ようにする',
      exampleJp: '甘いものを食べないようにする',
      exampleReading: 'amai mono wo tabenai you ni suru',
      meaningId: 'Berusaha untuk tidak makan yang manis-manis',
    },
  ],

  // ── ようになる ──
  'ようになる': [
    {
      formula: 'Vる ＋ ようになる',
      exampleJp: '日本語が話せるようになる',
      exampleReading: 'nihongo ga hanaseru you ni naru',
      meaningId: 'Menjadi bisa berbicara bahasa Jepang',
    },
    {
      formula: 'Vない ＋ ようになる',
      exampleJp: 'タバコを吸わないようになる',
      exampleReading: 'tabako wo suwanai you ni naru',
      meaningId: 'Menjadi tidak merokok lagi',
    },
  ],

  // ── 書かれている (Vれる 受身形) ──
  '受身形': [
    {
      formula: 'Grup I (Godan)',
      exampleJp: '書かれる',
      exampleReading: 'kakareru',
      meaningId: 'Ditulis (dari 書く)',
    },
    {
      formula: 'Grup II (Ichidan)',
      exampleJp: '褒められる',
      exampleReading: 'homerareru',
      meaningId: 'Dipuji (dari 褒める)',
    },
    {
      formula: 'Grup III (Irregular)',
      exampleJp: '来られる / される',
      exampleReading: 'korareru / sareru',
      meaningId: 'Didatangi (来る) / Dilakukan (する)',
    },
  ],

  // ── （Nに）Vれる (迷惑の受身) ──
  '迷惑の受身': [
    {
      formula: 'Nに ＋ Vれる (Grup 1)',
      exampleJp: '雨に降られる',
      exampleReading: 'ame ni furareru',
      meaningId: 'Kehujanan (tertimpa hujan & merasa repot/sial)',
    },
    {
      formula: 'Nに ＋ Vれる (Grup 2)',
      exampleJp: '赤ちゃんに泣かれる',
      exampleReading: 'akachan ni nakareru',
      meaningId: 'Bayi menangis (dan pembicara merasa kerepotan)',
    },
  ],

  // ── V(さ)せてください ──
  '(さ)せてください': [
    {
      formula: 'Grup I (V(a)せる)',
      exampleJp: '帰らせてください',
      exampleReading: 'kaeraserete kudasai',
      meaningId: 'Tolong izinkan saya pulang',
    },
    {
      formula: 'Grup II (Vさせる)',
      exampleJp: '食べさせてください',
      exampleReading: 'tabesasete kudasai',
      meaningId: 'Tolong izinkan saya makan',
    },
    {
      formula: 'Grup III (させる)',
      exampleJp: '参加させてください',
      exampleReading: 'sanka sasete kudasai',
      meaningId: 'Tolong izinkan saya ikut serta',
    },
  ],

  // ── Vないと／Vなくちゃ ──
  'ないと': [
    {
      formula: 'Vない ＋ と',
      exampleJp: 'もう寝ないと',
      exampleReading: 'mou nenaito',
      meaningId: 'Harus tidur sekarang (singkatan dari 〜なければならない)',
    },
    {
      formula: 'Vない ＋ と',
      exampleJp: '早く行かないと',
      exampleReading: 'hayaku ikanaito',
      meaningId: 'Harus cepat pergi',
    },
  ],
  'なくちゃ': [
    {
      formula: 'Vなくちゃ',
      exampleJp: '宿題を出さなくちゃ',
      exampleReading: 'shukudai wo dasanakucha',
      meaningId: 'Harus mengumpulkan PR (singkatan dari 〜なくてはならない)',
    },
    {
      formula: 'Vなくちゃ',
      exampleJp: '早く食べなくちゃ',
      exampleReading: 'hayaku tabenakucha',
      meaningId: 'Harus cepat makan',
    },
  ],

  // ── Vちゃう／Vじゃう ──
  'ちゃう': [
    {
      formula: 'Vて ＋ しまう → Vちゃう',
      exampleJp: '食べちゃう',
      exampleReading: 'tabechau',
      meaningId: 'Kebablasan makan / habis dimakan (santai)',
    },
    {
      formula: 'Vで ＋ しまう → Vじゃう',
      exampleJp: '飲んじゃう',
      exampleReading: 'nonjau',
      meaningId: 'Kebablasan minum / habis diminum (santai)',
    },
  ],

  // ── Vとく／Vどく ──
  'とく': [
    {
      formula: 'Vて ＋ おく → Vとく',
      exampleJp: '買っとく',
      exampleReading: 'kattoku',
      meaningId: 'Membeli dulu untuk persiapan (santai)',
    },
    {
      formula: 'Vで ＋ おく → Vどく',
      exampleJp: '読んどく',
      exampleReading: 'yondoku',
      meaningId: 'Membaca dulu ya (santai)',
    },
  ],

  // ── みたいだ ──
  'みたいだ': [
    {
      formula: 'N ＋ みたいだ',
      exampleJp: '子供みたいだ',
      exampleReading: 'kodomo mitai da',
      meaningId: 'Seperti anak kecil (perumpamaan)',
    },
    {
      formula: 'na ＋ みたいだ',
      exampleJp: '静かみたいだ',
      exampleReading: 'shizuka mitai da',
      meaningId: 'Tampaknya tenang (dugaan pengamatan)',
    },
    {
      formula: 'V普 ＋ みたいだ',
      exampleJp: '雨が降るみたいだ',
      exampleReading: 'ame ga furu mitai da',
      meaningId: 'Sepertinya akan turun hujan',
    },
    {
      formula: 'A普 ＋ みたいだ',
      exampleJp: '高いみたいだ',
      exampleReading: 'takai mitai da',
      meaningId: 'Tampaknya harganya mahal',
    },
  ],
  'みたいに': [
    {
      formula: 'N ＋ みたいに ＋ V/A',
      exampleJp: '雪みたいに白い',
      exampleReading: 'yuki mitai ni shiroi',
      meaningId: 'Putih seperti salju (menerangkan kata sifat)',
    },
    {
      formula: 'V普 ＋ みたいに ＋ V',
      exampleJp: '酔ったみたいに歩く',
      exampleReading: 'yotta mitai ni aruku',
      meaningId: 'Berjalan sempoyongan seperti orang mabuk',
    },
  ],
  'みたいな': [
    {
      formula: 'N ＋ みたいな ＋ N',
      exampleJp: '女みたいな話し方',
      exampleReading: 'onna mitai na hanashikata',
      meaningId: 'Cara bicara yang seperti wanita (menerangkan kata benda)',
    },
  ],

  // ── らしい ──
  'らしい': [
    {
      formula: 'N ＋ らしい (Sifat sejati)',
      exampleJp: '男らしい',
      exampleReading: 'otokorashii',
      meaningId: 'Bersikap jantan / laki-laki sejati',
    },
    {
      formula: 'N ＋ らしい (Karakter khas)',
      exampleJp: '春らしい',
      exampleReading: 'harurashii',
      meaningId: 'Benar-benar bernuansa musim semi',
    },
  ],

  // ── っぽい ──
  'っぽい': [
    {
      formula: 'N ＋ っぽい',
      exampleJp: '子供っぽい',
      exampleReading: 'kodomoppoi',
      meaningId: 'Kekanak-kanakan (cenderung negatif)',
    },
    {
      formula: 'A-i ＋ っぽい',
      exampleJp: '安っぽい',
      exampleReading: 'yasuppoi',
      meaningId: 'Kelihatan murahan',
    },
    {
      formula: 'Vます ＋ っぽい',
      exampleJp: '忘れっぽい',
      exampleReading: 'wasureppoi',
      meaningId: 'Mudah lupa / pelupa',
    },
  ],

  // ── てごらん ──
  'てごらん': [
    {
      formula: 'Vて ＋ ごらん',
      exampleJp: '食べてごらん',
      exampleReading: 'tabete goran',
      meaningId: 'Coba makanlah (anjuran ramah kepada bawahan/anak)',
    },
    {
      formula: 'Vて ＋ ごらん',
      exampleJp: 'やってごらん',
      exampleReading: 'yatte goran',
      meaningId: 'Coba lakukanlah',
    },
  ],

  // ── ように言う／頼む ──
  'ように言う': [
    {
      formula: 'Vる ＋ ように言う',
      exampleJp: '早く来るように言う',
      exampleReading: 'hayaku kuru you ni iu',
      meaningId: 'Menyampaikan agar datang cepat',
    },
    {
      formula: 'Vない ＋ ように頼む',
      exampleJp: '触らないように頼む',
      exampleReading: 'sawaranai you ni tanomu',
      meaningId: 'Meminta tolong agar tidak disentuh',
    },
  ],

  // ── ている ──
  'ている': [
    {
      formula: 'Vて ＋ いる (Sedang)',
      exampleJp: 'ご飯を食べている',
      exampleReading: 'gohan wo tabete iru',
      meaningId: 'Sedang makan nasi',
    },
    {
      formula: 'Vて ＋ いる (Kondisi/Hasil)',
      exampleJp: '窓が開いている',
      exampleReading: 'mado ga aite iru',
      meaningId: 'Jendela dalam keadaan terbuka',
    },
    {
      formula: 'Vて ＋ いない (Negatif)',
      exampleJp: 'まだ来ていない',
      exampleReading: 'mada kite inai',
      meaningId: 'Masih belum datang',
    },
  ],

  // ── てある ──
  'てある': [
    {
      formula: 'Vて ＋ ある',
      exampleJp: '名前が書いてある',
      exampleReading: 'namae ga kaite aru',
      meaningId: 'Nama sudah sengaja ditulis di situ',
    },
    {
      formula: 'Vて ＋ ある',
      exampleJp: 'カレンダーに印がつけてある',
      exampleReading: 'karendaa ni shirushi ga tsukete aru',
      meaningId: 'Sudah ditandai di kalender',
    },
  ],

  // ── ておく ──
  'ておく': [
    {
      formula: 'Vて ＋ おく',
      exampleJp: '切符を買っておく',
      exampleReading: 'kippu wo katte oku',
      meaningId: 'Membeli tiket terlebih dahulu untuk persiapan',
    },
  ],

  // ── てしまう ──
  'てしまう': [
    {
      formula: 'Vて ＋ しまう (Tuntas)',
      exampleJp: '本を全部読んでしまった',
      exampleReading: 'hon wo zenbu yonde shimatta',
      meaningId: 'Sudah membaca habis semua bukunya',
    },
    {
      formula: 'Vて ＋ しまう (Menyesal)',
      exampleJp: '財布を落としてしまった',
      exampleReading: 'saifu wo otoshite shimatta',
      meaningId: 'Dompetnya terlanjur jatuh/hilang (disesalkan)',
    },
  ],

  // ── やすい／にくい ──
  'やすい': [
    {
      formula: 'Vます ＋ やすい',
      exampleJp: '分かりやすい',
      exampleReading: 'wakariyasui',
      meaningId: 'Mudah dipahami',
    },
    {
      formula: 'Vます ＋ やすい',
      exampleJp: '歩きやすい靴',
      exampleReading: 'arukiyasui kutsu',
      meaningId: 'Sepatu yang nyaman/mudah untuk jalan',
    },
  ],
  'にくい': [
    {
      formula: 'Vます ＋ にくい',
      exampleJp: '読みにくい',
      exampleReading: 'yominikui',
      meaningId: 'Sulit dibaca',
    },
    {
      formula: 'Vます ＋ にくい',
      exampleJp: '飲みにくい薬',
      exampleReading: 'nominikui kusuri',
      meaningId: 'Obat yang susah ditelan',
    },
  ],

  // ── 方 (かた) ──
  '方': [
    {
      formula: 'Vます ＋ 方',
      exampleJp: '使い方',
      exampleReading: 'tsukaikata',
      meaningId: 'Cara menggunakan / cara pakai',
    },
    {
      formula: 'Vます ＋ 方',
      exampleJp: '作り方',
      exampleReading: 'tsukurikata',
      meaningId: 'Cara membuat (resep/proses)',
    },
  ],

  // ── に関して ──
  'に関して': [
    {
      formula: 'N ＋ に関して',
      exampleJp: 'この問題に関して',
      exampleReading: 'kono mondai ni kanshite',
      meaningId: 'Mengenai / berkaitan dengan masalah ini',
    },
  ],

  // ── について ──
  'について': [
    {
      formula: 'N ＋ について',
      exampleJp: '日本の歴史について',
      exampleReading: 'nihon no rekishi ni tsuite',
      meaningId: 'Tentang sejarah Jepang',
    },
  ],

  // ── によれば／によると ──
  'によれば': [
    {
      formula: 'N ＋ によれば',
      exampleJp: '天気予報によれば',
      exampleReading: 'tenki yohou ni yoreba',
      meaningId: 'Berdasarkan ramalan cuaca',
    },
  ],

  // ── によって ──
  'によって': [
    {
      formula: 'N ＋ によって (Sebab)',
      exampleJp: '大雪によって',
      exampleReading: 'ooyuki ni yotte',
      meaningId: 'Disebabkan / akibat salju lebat',
    },
    {
      formula: 'N ＋ によって (Tergantung)',
      exampleJp: '人によって違う',
      exampleReading: 'hito ni yotte chigau',
      meaningId: 'Berbeda-beda bergantung pada masing-masing orang',
    },
  ],

  // ── ばかり ──
  'ばかり': [
    {
      formula: 'Vて ＋ ばかりいる',
      exampleJp: 'ゲームをしてばかりいる',
      exampleReading: 'geemu wo shite bakari iru',
      meaningId: 'Bermain game melulu setiap hari',
    },
    {
      formula: 'N ＋ ばかり',
      exampleJp: '文句ばかり',
      exampleReading: 'monku bakari',
      meaningId: 'Mengeluh melulu',
    },
  ],

  // ── だけしか ──
  'だけしか': [
    {
      formula: 'N ＋ だけしか ＋ Vない',
      exampleJp: '百円だけしか持っていない',
      exampleReading: 'hyaku-en dakeshika motte inai',
      meaningId: 'Hanya punya 100 yen saja (menekankan sedikit)',
    },
  ],

  // ── さえ ──
  'さえ': [
    {
      formula: 'N ＋ さえ',
      exampleJp: 'ひらがなさえ書けない',
      exampleReading: 'hiragana sae kakenai',
      meaningId: 'Bahkan huruf hiragana saja tidak bisa menulis',
    },
  ],

  // ── こそ ──
  'こそ': [
    {
      formula: 'N ＋ こそ',
      exampleJp: '今年こそ合格する',
      exampleReading: 'kotoshi koso goukaku suru',
      meaningId: 'Tahun ini barulah pasti akan lulus!',
    },
  ],

  // ── わけだ ──
  'わけだ': [
    {
      formula: 'V普 ＋ わけだ',
      exampleJp: '暑いわけだ',
      exampleReading: 'atsui wake da',
      meaningId: 'Pantas saja terasa begitu panas',
    },
  ],
  'わけではない': [
    {
      formula: 'V普 ＋ わけではない',
      exampleJp: '嫌いなわけではない',
      exampleReading: 'kirai na wake dewa nai',
      meaningId: 'Bukannya tidak suka (hanya kurang cocok)',
    },
  ],
  'わけにはいかない': [
    {
      formula: 'Vる ＋ わけにはいかない',
      exampleJp: '大事な会議だから休むわけにはいかない',
      exampleReading: 'daiji na kaigi dakara yasumu wake ni wa ikanai',
      meaningId: 'Karena rapat penting, tidak mungkin bisa seenaknya absen',
    },
  ],

  // ── ことにする／ことになる ──
  'ことにする': [
    {
      formula: 'Vる ＋ ことにする',
      exampleJp: '毎日走ることにする',
      exampleReading: 'mainichi hashiru koto ni suru',
      meaningId: 'Memutuskan sendiri untuk berlari setiap hari',
    },
    {
      formula: 'Vない ＋ ことにする',
      exampleJp: '夜食を食べないことにする',
      exampleReading: 'yashoku wo tabenai koto ni suru',
      meaningId: 'Memutuskan untuk tidak makan camilan malam',
    },
  ],
  'ことになる': [
    {
      formula: 'Vる ＋ ことになる',
      exampleJp: '来月転勤することになった',
      exampleReading: 'raigetsu tenkin suru koto ni natta',
      meaningId: 'Diputuskan bahwa bulan depan pindah tugas',
    },
  ],

  // ── ようとする ──
  'ようとする': [
    {
      formula: 'Vよう ＋ とする',
      exampleJp: 'ドアを開けようとする',
      exampleReading: 'doa wo akeyou to suru',
      meaningId: 'Mencoba / berniat hendak membuka pintu',
    },
    {
      formula: 'Vよう ＋ としない',
      exampleJp: '薬を飲もうとしない',
      exampleReading: 'kusuri wo nomou to shinai',
      meaningId: 'Sama sekali tidak mau meminum obat',
    },
  ],

  // ── とおり ──
  'とおり': [
    {
      formula: 'Vた ＋ とおり',
      exampleJp: '言ったとおり',
      exampleReading: 'itta toori',
      meaningId: 'Sesuai dengan apa yang dikatakan',
    },
    {
      formula: 'N ＋ のとおり',
      exampleJp: '説明書のとおり',
      exampleReading: 'setsumeisho no toori',
      meaningId: 'Sesuai dengan petunjuk buku manual',
    },
  ],

  // ── たびに ──
  'たびに': [
    {
      formula: 'Vる ＋ たびに',
      exampleJp: '会うたびに',
      exampleReading: 'au tabi ni',
      meaningId: 'Setiap kali bertemu',
    },
    {
      formula: 'N ＋ のたびに',
      exampleJp: '旅行のたびに',
      exampleReading: 'ryokou no tabi ni',
      meaningId: 'Setiap kali melakukan perjalanan liburan',
    },
  ],
};

/**
 * Heuristic generator that synthesizes natural concise examples for any grammar formula.
 */
function generateHeuristicExamples(rawVariant: string): FormulaBranchExample[] {
  const v = rawVariant.trim();
  if (!v) return [];

  // If there's a + or ＋ separator, split conditions and base
  let leftSide = '';
  let rightSide = v;

  if (v.includes('＋') || v.includes('+')) {
    const parts = v.split(/[＋+]/);
    leftSide = parts[0].trim();
    rightSide = parts.slice(1).join('＋').trim();
  }

  // If left side has alternatives like "Vる／Vない／Vれる"
  const leftOptions = leftSide
    ? leftSide.split(/[／/]/).map(s => s.trim()).filter(Boolean)
    : [rightSide];

  const results: FormulaBranchExample[] = [];

  for (const opt of leftOptions) {
    const combinedFormula = leftSide ? `${opt} ＋ ${rightSide}` : opt;

    // Pattern matching on token type
    if (opt.includes('Vる')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `食べる${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `taberu ${toRomajiSimple(rightSide)}`,
        meaningId: `Bentuk kamus (kata kerja positif): makan`,
      });
    } else if (opt.includes('Vない')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `忘れない${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `wasurenai ${toRomajiSimple(rightSide)}`,
        meaningId: `Bentuk negatif: tidak lupa`,
      });
    } else if (opt.includes('Vれる')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `聞こえる${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `kikoeru ${toRomajiSimple(rightSide)}`,
        meaningId: `Bentuk potensial / pasif: bisa mendengar (terdengar)`,
      });
    } else if (opt.includes('Vて')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `食べて${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `tabete ${toRomajiSimple(rightSide)}`,
        meaningId: `Bentuk te: makan`,
      });
    } else if (opt.includes('Vた')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `言った${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `itta ${toRomajiSimple(rightSide)}`,
        meaningId: `Bentuk lampau: telah berkata`,
      });
    } else if (opt.includes('Vます')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `話し${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `hanashi ${toRomajiSimple(rightSide)}`,
        meaningId: `Batang masu (masu-stem): berbicara`,
      });
    } else if (opt.includes('Vよう') || opt.includes('V(意向形)')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `行こう${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `ikou ${toRomajiSimple(rightSide)}`,
        meaningId: `Bentuk ajakan/kehendak: mari pergi`,
      });
    } else if (opt === 'N' || opt.includes('Kata Benda') || opt.startsWith('N')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `子供${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `kodomo ${toRomajiSimple(rightSide)}`,
        meaningId: `Kata benda: anak kecil`,
      });
    } else if (opt.includes('na') || opt.includes('Kata Sifat-na')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `静か${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `shizuka ${toRomajiSimple(rightSide)}`,
        meaningId: `Kata sifat-na: tenang`,
      });
    } else if (opt.includes('A') || opt.includes('Kata Sifat-i')) {
      results.push({
        formula: combinedFormula,
        exampleJp: `高い${rightSide.replace(/^[＋+]/, '').trim()}`,
        exampleReading: `takai ${toRomajiSimple(rightSide)}`,
        meaningId: `Kata sifat-i: mahal`,
      });
    } else {
      results.push({
        formula: combinedFormula,
        exampleJp: combinedFormula.replace(/[VvNAna（）()＋+]/g, '').trim() || combinedFormula,
        exampleReading: toRomajiSimple(combinedFormula),
        meaningId: `Contoh penerapan pola ${opt}`,
      });
    }
  }

  return results;
}

/**
 * Basic Japanese kana to romaji converter for simple formula affixes.
 */
function toRomajiSimple(str: string): string {
  if (!str) return '';
  const clean = str.replace(/[＋+()（）]/g, '').trim();
  const map: Record<string, string> = {
    'ように': 'you ni',
    'ようにする': 'you ni suru',
    'ようになる': 'you ni naru',
    'みたいだ': 'mitai da',
    'みたいに': 'mitai ni',
    'みたいな': 'mitai na',
    'らしい': 'rashii',
    'っぽい': 'ppoi',
    'てごらん': 'te goran',
    'ておく': 'te oku',
    'とく': 'toku',
    'どく': 'doku',
    'てしまう': 'te shimau',
    'ちゃう': 'chau',
    'じゃう': 'jau',
    'ている': 'te iru',
    'てある': 'te aru',
    'ていく': 'te iku',
    'てくる': 'te kuru',
    'やすい': 'yasui',
    'にくい': 'nikui',
    'すぎる': 'sugiru',
    '方': 'kata',
    'に関して': 'ni kanshite',
    'について': 'ni tsuite',
    'によれば': 'ni yoreba',
    'によると': 'ni yoruto',
    'によって': 'ni yotte',
    'ばかり': 'bakari',
    'だけしか': 'dakeshika',
    'さえ': 'sae',
    'こそ': 'koso',
    'はずだ': 'hazu da',
    'わけだ': 'wake da',
    'ことにする': 'koto ni suru',
    'ことになる': 'koto ni naru',
    'ようとする': 'you to suru',
    'とおり': 'toori',
    'たびに': 'tabi ni',
  };

  for (const [jp, romaji] of Object.entries(map)) {
    if (clean.includes(jp)) {
      return romaji;
    }
  }
  return clean;
}

/**
 * Returns a list of concise breakdown examples for the given formula variant.
 */
export function getFormulaBreakdownExamples(
  variant: string,
  fullFormula?: string,
  item?: BunpouItem
): FormulaBranchExample[] {
  const target = (variant || fullFormula || '').trim();
  if (!target) return [];

  // 1. Direct match or keyword match in CURATED_FORMULA_MAP
  for (const [key, list] of Object.entries(CURATED_FORMULA_MAP)) {
    if (target.includes(key)) {
      return list;
    }
  }

  // 2. Check item's subFormulas / connectionConditions if available
  if (item && item.subFormulas && item.subFormulas.length > 0) {
    const subExamples: FormulaBranchExample[] = [];
    for (const sub of item.subFormulas) {
      if (sub.connectionConditions && sub.connectionConditions.length > 0) {
        for (const cond of sub.connectionConditions) {
          if (cond.example) {
            // Parse "寝ないと (harus tidur)" or "女みたいだ (seperti perempuan)"
            const m = cond.example.match(/^([^(（]+)[(（]([^)）]+)[)）]/);
            if (m) {
              const jp = m[1].trim();
              const meaning = m[2].trim();
              subExamples.push({
                formula: cond.rule,
                exampleJp: jp,
                exampleReading: toRomajiSimple(jp),
                meaningId: meaning,
              });
            } else {
              subExamples.push({
                formula: cond.rule,
                exampleJp: cond.example,
                exampleReading: toRomajiSimple(cond.example),
                meaningId: `Pola sambungan ${cond.partOfSpeech}`,
              });
            }
          }
        }
      }
    }
    if (subExamples.length > 0) {
      return subExamples.slice(0, 5);
    }
  }

  // 3. Heuristic fallback decomposition
  return generateHeuristicExamples(target);
}
