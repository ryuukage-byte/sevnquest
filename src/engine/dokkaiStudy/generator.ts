// ==============================================================================
// RAKIT DOKKAI — generator bacaan offline yang kosakatanya disesuaikan level.
//
// Setiap template ditulis untuk satu level JLPT (kerangka kalimat & pola sesuai level itu). Slot-slotnya
// (tempat, kegiatan, alasan, dll.) punya beberapa pilihan bertanda level; generator HANYA memakai pilihan
// yang levelnya ≤ level target dan lebih memilih yang tepat di level target. Hasilnya:
//   - teks Jepang + terjemahan Indonesia per kalimat (pasti, bukan tebakan),
//   - 3 soal + pembahasan yang jawabannya dijamin benar karena berasal dari isi slot,
//   - inti bacaan yang pasti.
// Deterministik untuk seed yang sama (bacaan bisa dibuka ulang dengan id yang sama).
// ==============================================================================

import type { DokkaiLevel, DokkaiPassage, DokkaiQuestionData } from './types';
import { levelRank } from './types';
import { normSentence } from './text';

// ------------------------------------------------------------------------------
// RNG & PEMILIH SLOT
// ------------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SlotOption {
  /** Teks Jepang utama slot. */
  jp: string;
  /** Padanan Indonesia. */
  id: string;
  lv: DokkaiLevel;
  [extra: string]: string;
}

export class Picker {
  constructor(private rng: () => number, readonly level: DokkaiLevel) {}

  allowed<T extends SlotOption>(pool: T[]): T[] {
    const ok = pool.filter(o => levelRank(o.lv) <= levelRank(this.level));
    return ok.length > 0 ? ok : pool.filter(o => levelRank(o.lv) === Math.min(...pool.map(p => levelRank(p.lv))));
  }

  /** Pilih satu opsi; yang levelnya sama dengan target berbobot 3×. */
  pick<T extends SlotOption>(pool: T[]): T {
    const ok = this.allowed(pool);
    const weights = ok.map(o => (o.lv === this.level ? 3 : 1));
    let r = this.rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ok.length; i++) { r -= weights[i]; if (r <= 0) return ok[i]; }
    return ok[ok.length - 1];
  }

  /** Opsi lain (untuk pengecoh), selain yang dipilih. */
  others<T extends SlotOption>(pool: T[], chosen: T, n: number): T[] {
    const rest = this.allowed(pool).filter(o => o.jp !== chosen.jp);
    const fallback = pool.filter(o => o.jp !== chosen.jp && !rest.includes(o));
    return this.shuffle([...this.shuffle(rest), ...fallback].slice(0, Math.max(n, 0))).slice(0, n);
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  int(n: number): number { return Math.floor(this.rng() * n); }
}

// ------------------------------------------------------------------------------
// TEMPLATE
// ------------------------------------------------------------------------------

/** Satu kalimat: [Jepang, Indonesia]. */
export type Sent = [string, string];

export interface BuiltQuestion {
  prompt: string;
  correct: string;
  distractors: string[];
  /** Kalimat bukti (harus persis salah satu kalimat Jepang di teks). */
  evidence: string;
  explanation: string;
}

export interface BuiltDokkai {
  title: string;
  category: string;
  paragraphs: Sent[][];
  questions: BuiltQuestion[];
  mainIdea: { text: string; translation: string };
}

export interface DokkaiTemplate {
  id: string;
  level: DokkaiLevel;
  topic: string;
  build(p: Picker): BuiltDokkai;
}

const o = (lv: DokkaiLevel, jp: string, id: string, extra: Record<string, string> = {}): SlotOption => ({ jp, id, lv, ...extra });

// ------------------------------------------------------------------------------
// N5
// ------------------------------------------------------------------------------

const N5_NAMES = [o('N5', 'リン', 'Lin'), o('N5', 'アンナ', 'Anna'), o('N5', 'トム', 'Tom'), o('N5', 'マリア', 'Maria'), o('N5', 'ケン', 'Ken')];

const n5Sunday: DokkaiTemplate = {
  id: 'n5_sunday',
  level: 'N5',
  topic: 'Hari Minggu',
  build(p) {
    const name = p.pick(N5_NAMES);
    const wake = p.pick([o('N5', '七時', 'jam tujuh'), o('N5', '八時', 'jam delapan'), o('N5', '九時', 'jam sembilan')]);
    const COMP = [o('N5', 'ともだち', 'teman'), o('N5', 'あね', 'kakak perempuan'), o('N5', 'あに', 'kakak laki-laki'), o('N5', 'いもうと', 'adik perempuan')];
    const PLACE = [
      o('N5', 'こうえん', 'taman', { act: 'さんぽを します', actId: 'berjalan-jalan' }),
      o('N5', 'としょかん', 'perpustakaan', { act: '本を 読みます', actId: 'membaca buku' }),
      o('N5', 'デパート', 'department store', { act: 'かいものを します', actId: 'berbelanja' }),
      o('N5', 'うみ', 'pantai', { act: 'およぎます', actId: 'berenang' }),
    ];
    const FOOD = [o('N5', 'すし', 'sushi'), o('N5', 'ラーメン', 'ramen'), o('N5', 'カレー', 'kari'), o('N5', 'サンドイッチ', 'sandwich'), o('N5', 'うどん', 'udon')];
    const NIGHT = [
      o('N5', 'テレビを 見ます', 'menonton TV'),
      o('N5', '日本語を べんきょうします', 'belajar bahasa Jepang'),
      o('N5', '手紙を 書きます', 'menulis surat'),
      o('N5', 'おんがくを 聞きます', 'mendengarkan musik'),
    ];
    const comp = p.pick(COMP), place = p.pick(PLACE), food = p.pick(FOOD), night = p.pick(NIGHT);
    const [c2] = p.others(COMP, comp, 1), [pl2] = p.others(PLACE, place, 1);

    const sGo: Sent = [`それから、${comp.jp}と ${place.jp}へ 行きます。`, `Setelah itu, saya pergi ke ${place.id} bersama ${comp.id}.`];
    const sLunch: Sent = [`昼ごはんは ${place.jp}の 近くの みせで ${food.jp}を 食べます。`, `Untuk makan siang, kami makan ${food.id} di warung dekat ${place.id}.`];
    const sNight: Sent = [`夜は うちで ${night.jp}。`, `Malam hari saya ${night.id} di rumah.`];
    return {
      title: `${name.jp}さんの 日曜日`,
      category: 'Kehidupan sehari-hari',
      paragraphs: [
        [[`わたしは ${name.jp}です。`, `Saya ${name.id}.`], ['日曜日は 学校が ありません。', 'Hari Minggu tidak ada sekolah.'], [`朝 ${wake.jp}に おきます。`, `Pagi hari saya bangun jam ${wake.id.replace('jam ', '')}.`]],
        [sGo, [`${place.jp}で ${place.act}。`, `Di ${place.id} kami ${place.actId}.`]],
        [sLunch, [`${food.jp}は とても おいしいです。`, `${food.id[0].toUpperCase()}${food.id.slice(1)}-nya sangat enak.`]],
        [sNight, ['日曜日は とても たのしいです。', 'Hari Minggu sangat menyenangkan.']],
      ],
      questions: [
        {
          prompt: `${name.jp}さんは 日曜日に だれと どこへ 行きますか。`,
          correct: `${comp.jp}と ${place.jp}へ 行きます。`,
          distractors: [`${c2.jp}と ${place.jp}へ 行きます。`, `${comp.jp}と ${pl2.jp}へ 行きます。`, `${c2.jp}と ${pl2.jp}へ 行きます。`],
          evidence: sGo[0],
          explanation: `Kalimat 「${sGo[0]}」 menyebut DUA hal sekaligus: pergi bersama ${comp.id} (${comp.jp}と) ke ${place.id} (${place.jp}へ). Pengecoh menukar salah satunya — cek "dengan siapa" (と) dan "ke mana" (へ).`,
        },
        {
          prompt: `${name.jp}さんは 昼ごはんに 何を 食べますか。`,
          correct: `${food.jp}を 食べます。`,
          distractors: p.others(FOOD, food, 3).map(f => `${f.jp}を 食べます。`),
          evidence: sLunch[0],
          explanation: `Cari kata 昼ごはん (makan siang): 「${sLunch[0]}」. Yang dimakan ditandai partikel を → ${food.jp} (${food.id}).`,
        },
        {
          prompt: `${name.jp}さんは 夜 何を しますか。`,
          correct: `${night.jp}。`,
          distractors: [...p.others(NIGHT, night, 2).map(n => `${n.jp}。`), `${place.act}。`],
          evidence: sNight[0],
          explanation: `Kata kunci 夜 (malam): 「${sNight[0]}」. Pilihan 「${place.act}」 adalah kegiatan siang hari di ${place.id}, bukan malam — jebakan waktu.`,
        },
      ],
      mainIdea: {
        text: `${name.jp}さんは 日曜日に ${comp.jp}と ${place.jp}へ 行って、たのしく すごします。`,
        translation: `${name.id} menghabiskan hari Minggu dengan pergi ke ${place.id} bersama ${comp.id}, dan merasa sangat senang.`,
      },
    };
  },
};

const n5Party: DokkaiTemplate = {
  id: 'n5_party',
  level: 'N5',
  topic: 'Pesan undangan pesta',
  build(p) {
    const host = p.pick(N5_NAMES);
    const DAY = [o('N5', '土曜日', 'hari Sabtu'), o('N5', '日曜日', 'hari Minggu'), o('N5', '金曜日', 'hari Jumat')];
    const TIME = [
      o('N5', '六時', 'jam enam', { meet: '五時半', meetId: 'jam setengah enam' }),
      o('N5', '七時', 'jam tujuh', { meet: '六時半', meetId: 'jam setengah tujuh' }),
      o('N5', '五時', 'jam lima', { meet: '四時半', meetId: 'jam setengah lima' }),
    ];
    const ITEM = [o('N5', 'のみもの', 'minuman'), o('N5', 'おかし', 'kue/camilan'), o('N5', 'くだもの', 'buah'), o('N5', 'さら', 'piring')];
    const STATION = [o('N5', 'みどり駅', 'Stasiun Midori'), o('N5', 'さくら駅', 'Stasiun Sakura'), o('N5', 'ひがし駅', 'Stasiun Higashi')];
    const day = p.pick(DAY), time = p.pick(TIME), item = p.pick(ITEM), st = p.pick(STATION);
    const [d2] = p.others(DAY, day, 1), [t2] = p.others(TIME, time, 1);
    const meet = time.meet;
    const sWhen: Sent = [`${day.jp}の ${time.jp}から、わたしの うちで パーティーを します。`, `${day.id[0].toUpperCase()}${day.id.slice(1)} mulai ${time.id}, saya mengadakan pesta di rumah saya.`];
    const sBring: Sent = [`${item.jp}を 持って きて ください。`, `Tolong bawa ${item.id}.`];
    const sMeet: Sent = [`${st.jp}の 前で ${meet}に 会いましょう。`, `Mari bertemu di depan ${st.id} ${time.meetId}.`];
    return {
      title: 'パーティーの おしらせ',
      category: 'Pesan · Pengumuman',
      paragraphs: [
        [['みなさんへ', 'Untuk semuanya']],
        [sWhen, ['日本の りょうりを たくさん 作ります。', 'Saya akan membuat banyak masakan Jepang.']],
        [sBring, ['わたしの うちは 駅から すこし 遠いです。', 'Rumah saya agak jauh dari stasiun.'], sMeet],
        [[`${host.jp}`, `${host.id}`]],
      ],
      questions: [
        {
          prompt: 'パーティーは いつですか。',
          correct: `${day.jp}の ${time.jp}からです。`,
          distractors: [`${d2.jp}の ${time.jp}からです。`, `${day.jp}の ${t2.jp}からです。`, `${d2.jp}の ${t2.jp}からです。`],
          evidence: sWhen[0],
          explanation: `「${sWhen[0]}」: hari = ${day.jp}, mulai ${time.jp}から. Hati-hati: jam bertemu di stasiun (${meet}) BUKAN jam mulai pesta.`,
        },
        {
          prompt: 'パーティーに 何を 持って 行きますか。',
          correct: `${item.jp}を 持って 行きます。`,
          distractors: [...p.others(ITEM, item, 2).map(i => `${i.jp}を 持って 行きます。`), '日本の りょうりを 持って 行きます。'],
          evidence: sBring[0],
          explanation: `〜を 持って きて ください = "tolong bawa …": 「${sBring[0]}」. Masakan Jepang dibuat oleh tuan rumah sendiri, bukan dibawa tamu.`,
        },
        {
          prompt: 'みなさんは どこで 会いますか。',
          correct: `${st.jp}の 前で 会います。`,
          distractors: [...p.others(STATION, st, 2).map(s => `${s.jp}の 前で 会います。`), `${host.jp}さんの うちの 前で 会います。`],
          evidence: sMeet[0],
          explanation: `会いましょう (mari bertemu) ada di 「${sMeet[0]}」. Tempat bertemu (${st.jp}) berbeda dengan tempat pesta (rumah ${host.id}) — karena rumahnya jauh dari stasiun.`,
        },
      ],
      mainIdea: {
        text: `${host.jp}さんが パーティーの 日と 時間、持って くる 物、会う 場所を 知らせて います。`,
        translation: `${host.id} memberi tahu hari & jam pesta, barang yang perlu dibawa, dan tempat bertemu.`,
      },
    };
  },
};

// ------------------------------------------------------------------------------
// N4
// ------------------------------------------------------------------------------

const N4_NAMES = [o('N4', 'リー', 'Lee'), o('N4', 'サラ', 'Sarah'), o('N4', 'アリ', 'Ali'), o('N4', 'ミン', 'Min')];

const n4Job: DokkaiTemplate = {
  id: 'n4_job',
  level: 'N4',
  topic: 'Kerja paruh waktu',
  build(p) {
    const SHOP = [
      o('N4', 'コンビニ', 'minimarket', { task: 'レジで お金を もらったり、たなに 品物を ならべたり する', taskId: 'menerima uang di kasir dan menata barang di rak' }),
      o('N4', 'レストラン', 'restoran', { task: '料理を 運んだり、お皿を 洗ったり する', taskId: 'mengantar makanan dan mencuci piring' }),
      o('N4', '本屋', 'toko buku', { task: '本を ならべたり、お客さんに 本の 場所を 教えたり する', taskId: 'menata buku dan memberi tahu pelanggan letak buku' }),
    ];
    const DAYS = [o('N4', '週に 二回', 'dua kali seminggu'), o('N4', '週に 三回', 'tiga kali seminggu'), o('N4', '土曜日と 日曜日だけ', 'hanya hari Sabtu dan Minggu')];
    const REASON = [
      o('N4', '日本語を 使う 機会が ほしかった', 'saya ingin kesempatan memakai bahasa Jepang'),
      o('N4', '学校の お金を 自分で 払いたかった', 'saya ingin membayar biaya sekolah sendiri'),
      o('N4', '日本の 会社の 仕事の しかたを 知りたかった', 'saya ingin tahu cara kerja di perusahaan Jepang'),
    ];
    const HARD = [
      o('N4', 'お客さんと 話す ときの ていねいな ことばが 難しかったです', 'bahasa sopan saat bicara dengan pelanggan sulit', { short: 'ていねいな ことばで 話すこと' }),
      o('N4', '品物の 名前が なかなか おぼえられませんでした', 'saya tidak bisa menghafal nama-nama barang', { short: '品物の 名前を おぼえること' }),
      o('N4', '朝 早く 起きるのが 大変でした', 'bangun pagi-pagi itu berat', { short: '朝 早く 起きること' }),
    ];
    const HELPER = [o('N4', '店長', 'manajer toko'), o('N4', '先輩', 'senior (rekan kerja yang lebih lama)')];
    const name = p.pick(N4_NAMES), shop = p.pick(SHOP), days = p.pick(DAYS), reason = p.pick(REASON), hard = p.pick(HARD), helper = p.pick(HELPER);

    const sReason: Sent = [`アルバイトを 始めたのは、${reason.jp}からです。`, `Saya mulai kerja paruh waktu karena ${reason.id}.`];
    const sHard: Sent = [`はじめは、${hard.jp}。`, `Awalnya, ${hard.id}.`];
    const sNow: Sent = ['今は 仕事にも なれて、お客さんと 話すのが 楽しく なりました。', 'Sekarang saya sudah terbiasa dengan pekerjaannya, dan berbicara dengan pelanggan jadi menyenangkan.'];
    return {
      title: `${name.jp}さんの アルバイト`,
      category: 'Kehidupan · Pekerjaan',
      paragraphs: [
        [[`わたしは 三か月前から ${shop.jp}で アルバイトを して います。`, `Sejak tiga bulan lalu saya kerja paruh waktu di ${shop.id}.`], [`${days.jp} 働いて います。`, `Saya bekerja ${days.id}.`], sReason],
        [[`仕事は ${shop.task}ことです。`, `Pekerjaannya adalah ${shop.taskId}.`], sHard],
        [[`でも、${helper.jp}が いつも ていねいに 教えて くれました。`, `Tetapi, ${helper.id} selalu mengajari saya dengan sabar.`], sNow],
        [['アルバイトの おかげで、日本語も 前より 上手に なったと 思います。', 'Berkat kerja paruh waktu, saya rasa bahasa Jepang saya juga lebih baik dari sebelumnya.'], ['これからも がんばりたいです。', 'Saya ingin terus berusaha.']],
      ],
      questions: [
        {
          prompt: `${name.jp}さんは どうして アルバイトを 始めましたか。`,
          correct: `${reason.jp}から`,
          distractors: [...p.others(REASON, reason, 2).map(r => `${r.jp}から`), `${helper.jp}に たのまれたから`],
          evidence: sReason[0],
          explanation: `Pola 〜のは、…からです menjelaskan ALASAN: 「${sReason[0]}」. ${helper.jp} baru muncul setelah ia mulai bekerja, jadi bukan alasannya.`,
        },
        {
          prompt: `${name.jp}さんが はじめ 大変だったことは 何ですか。`,
          correct: hard.short,
          distractors: [...p.others(HARD, hard, 2).map(h => h.short), `${helper.jp}と 話すこと`],
          evidence: sHard[0],
          explanation: `Kata はじめは (awalnya) menunjuk kesulitan di awal: 「${sHard[0]}」. Pilihan lain tidak disebut di teks.`,
        },
        {
          prompt: `${name.jp}さんは 今、アルバイトに ついて どう 思って いますか。`,
          correct: '仕事に なれて、お客さんと 話すのが 楽しい。',
          distractors: ['仕事が 大変なので、早く やめたい。', `${helper.jp}が 教えて くれないので、こまって いる。`, '日本語が 上手に ならないので、つまらない。'],
          evidence: sNow[0],
          explanation: `Kata 今は (sekarang) adalah kunci perubahan perasaan: 「${sNow[0]}」. Setelah でも (tetapi) cerita berubah positif, jadi pilihan negatif bertentangan dengan teks.`,
        },
      ],
      mainIdea: {
        text: `はじめは 大変だったが、${helper.jp}に 教えて もらって、今は アルバイトが 楽しく なった。`,
        translation: `Awalnya berat, tetapi berkat diajari ${helper.id}, sekarang kerja paruh waktunya jadi menyenangkan dan bahasa Jepangnya membaik.`,
      },
    };
  },
};

const n4Trip: DokkaiTemplate = {
  id: 'n4_trip',
  level: 'N4',
  topic: 'Perjalanan liburan',
  build(p) {
    const CITY = [
      o('N4', '京都', 'Kyoto', { see: '古い お寺を 見ました', seeId: 'melihat kuil-kuil tua' }),
      o('N4', '北海道', 'Hokkaido', { see: '雪の まつりを 見ました', seeId: 'melihat festival salju' }),
      o('N4', '大阪', 'Osaka', { see: 'いろいろな 店で 食べ物を 食べました', seeId: 'makan berbagai makanan di banyak toko' }),
    ];
    const WAY = [o('N4', '新幹線', 'shinkansen'), o('N4', 'バス', 'bus'), o('N4', '飛行機', 'pesawat')];
    const TROUBLE = [
      o('N4', '道に まよって しまいました', 'saya tersesat', { short: '道に まよった', help: '近くに いた おばあさんが 駅まで 連れて 行って くれました', helpId: 'seorang nenek di dekat situ mengantar saya sampai stasiun' }),
      o('N4', 'さいふを 電車に 忘れて しまいました', 'dompet saya tertinggal di kereta', { short: 'さいふを 忘れた', help: '駅の 人が すぐに さがして くれました', helpId: 'petugas stasiun langsung mencarikannya' }),
      o('N4', '急に 雨が ふって きました', 'tiba-tiba turun hujan', { short: '急に 雨が ふった', help: 'ホテルの 人が かさを 貸して くれました', helpId: 'staf hotel meminjamkan payung' }),
    ];
    const NEXT = [o('N4', '家族と いっしょに 来たい', 'ingin datang bersama keluarga'), o('N4', 'もっと 長く とまりたい', 'ingin menginap lebih lama'), o('N4', 'ほかの 季節にも 来たい', 'ingin datang lagi di musim lain')];
    const city = p.pick(CITY), way = p.pick(WAY), tr = p.pick(TROUBLE), next = p.pick(NEXT);
    const [w2] = p.others(WAY, way, 1);

    const sGo: Sent = [`先月、友だちと ${way.jp}で ${city.jp}へ 行きました。`, `Bulan lalu saya pergi ke ${city.id} bersama teman naik ${way.id}.`];
    const sTrouble: Sent = [`二日目に、${tr.jp}。`, `Pada hari kedua, ${tr.id}.`];
    const sHelp: Sent = [`でも、${tr.help}。`, `Tetapi, ${tr.helpId}.`];
    const sNext: Sent = [`今度は ${next.jp}と 思って います。`, `Lain kali saya ${next.id}.`];
    return {
      title: `${city.jp}旅行`,
      category: 'Cerita · Perjalanan',
      paragraphs: [
        [sGo, [`${city.jp}では ${city.see}。`, `Di ${city.id} kami ${city.seeId}.`]],
        [sTrouble, ['とても こまりました。', 'Saya sangat kebingungan.'], sHelp, ['日本の 人は とても 親切だと 思いました。', 'Saya merasa orang Jepang sangat baik hati.']],
        [[`この 旅行で、${city.jp}が もっと 好きに なりました。`, `Lewat perjalanan ini, saya jadi makin suka ${city.id}.`], sNext],
      ],
      questions: [
        {
          prompt: 'この 人は 何で 旅行に 行きましたか。',
          correct: `${way.jp}で 行きました。`,
          distractors: [...p.others(WAY, way, 2).map(w => `${w.jp}で 行きました。`), '車で 行きました。'],
          evidence: sGo[0],
          explanation: `Partikel で setelah kendaraan = "naik …": 「${sGo[0]}」 → ${way.jp} (${way.id}).`,
        },
        {
          prompt: '二日目に 何が ありましたか。',
          correct: `${tr.short}。`,
          distractors: [...p.others(TROUBLE, tr, 2).map(t => `${t.short}。`), '友だちが びょうきに なった。'],
          evidence: sTrouble[0],
          explanation: `Cari 二日目 (hari kedua): 「${sTrouble[0]}」. 〜て しまいました menunjukkan kejadian yang tidak diharapkan.`,
        },
        {
          prompt: 'この 人は、旅行の あとで どう 思いましたか。',
          correct: `日本の 人は 親切だ。今度は ${next.jp}。`,
          distractors: [
            `${city.jp}は 大変だったので、もう 行きたくない。`,
            `日本の 人は 親切だが、今度は ${p.others(NEXT, next, 1)[0].jp}。`,
            `道が わかりにくいので、${w2.jp}で 行けば よかった。`,
          ],
          evidence: sNext[0],
          explanation: `Ada dua bukti: 「日本の 人は とても 親切だと 思いました。」 dan 「${sNext[0]}」. Pilihan yang separuh benar (rencana berikutnya salah) tetap salah.`,
        },
      ],
      mainIdea: {
        text: `${city.jp}旅行で こまった ことが あったが、親切な 人に 助けて もらって、${city.jp}が もっと 好きに なった。`,
        translation: `Dalam perjalanan ke ${city.id} ada masalah, tetapi ia dibantu orang yang baik hati sehingga makin menyukai ${city.id}.`,
      },
    };
  },
};

// ------------------------------------------------------------------------------
// N3
// ------------------------------------------------------------------------------

const n3Notice: DokkaiTemplate = {
  id: 'n3_notice',
  level: 'N3',
  topic: 'Pengumuman kegiatan (cari informasi)',
  build(p) {
    const FAC = [o('N3', '市民センター', 'Pusat Warga'), o('N3', '中央図書館', 'Perpustakaan Pusat'), o('N3', '南町公民館', 'Balai Warga Minamimachi')];
    const EVENT = [
      o('N3', '親子料理教室', 'kelas memasak orang tua & anak', { bring: 'エプロンとタオル', bringId: 'celemek dan handuk', target: '小学生とその保護者', targetId: 'murid SD beserta orang tuanya' }),
      o('N3', 'スマートフォン写真教室', 'kelas fotografi ponsel', { bring: '自分のスマートフォン', bringId: 'ponsel sendiri', target: '高校生以上の方', targetId: 'siswa SMA ke atas' }),
      o('N3', '初心者ヨガ教室', 'kelas yoga pemula', { bring: '飲み物と動きやすい服', bringId: 'minuman dan pakaian yang nyaman untuk bergerak', target: '18歳以上の方', targetId: 'usia 18 tahun ke atas' }),
    ];
    const DATE = [o('N3', '10月18日(土)', '18 Oktober (Sabtu)', { deadline: '10月10日(金)', deadlineId: '10 Oktober (Jumat)' }), o('N3', '11月9日(日)', '9 November (Minggu)', { deadline: '11月1日(土)', deadlineId: '1 November (Sabtu)' })];
    const FEE = [o('N3', '無料', 'gratis'), o('N3', '500円', '500 yen'), o('N3', '1,000円', '1.000 yen')];
    const METHOD = [o('N3', '電話', 'telepon'), o('N3', 'メール', 'email'), o('N3', '受付の窓口', 'loket resepsionis')];
    const fac = p.pick(FAC), ev = p.pick(EVENT), date = p.pick(DATE), fee = p.pick(FEE), method = p.pick(METHOD);
    const [m2] = p.others(METHOD, method, 1);
    const limit = ['20', '15', '30'][p.int(3)];

    const sDate: Sent = [`日時：${date.jp} 10時～12時`, `Waktu: ${date.id}, jam 10.00–12.00`];
    const sTarget: Sent = [`対象：${ev.target}(先着${limit}名)`, `Peserta: ${ev.targetId} (${limit} pendaftar pertama)`];
    const sFee: Sent = fee.jp === '無料'
      ? ['参加費：無料', 'Biaya: gratis']
      : [`参加費：${fee.jp}(当日、会場でお支払いください)`, `Biaya: ${fee.id} (dibayar di tempat pada hari H)`];
    const sBring: Sent = [`持ち物：${ev.bring}`, `Yang dibawa: ${ev.bringId}`];
    const sApply: Sent = [`申し込み：${date.deadline}までに、${method.jp}でお申し込みください。`, `Pendaftaran: daftarlah lewat ${method.id} paling lambat ${date.deadlineId}.`];
    const sNote: Sent = ['※当日の申し込みはできませんので、ご注意ください。', '※ Pendaftaran pada hari H tidak bisa dilakukan, mohon perhatikan.'];
    return {
      title: `${fac.jp}「${ev.jp}」参加者募集`,
      category: 'Pengumuman · Informasi',
      paragraphs: [
        [[`${fac.jp}「${ev.jp}」参加者募集のお知らせ`, `Pengumuman pencarian peserta "${ev.id}" di ${fac.id}`]],
        [[`${fac.jp}では、${ev.jp}を開きます。`, `${fac.id} akan mengadakan ${ev.id}.`], ['初めての方も、ぜひご参加ください。', 'Yang baru pertama kali pun silakan ikut.']],
        [sDate, [`場所：${fac.jp} 2階`, `Tempat: ${fac.id} lantai 2`], sTarget, sFee, sBring],
        [sApply, sNote],
      ],
      questions: [
        {
          prompt: `この教室に参加したい人は、いつまでに、どうしなければならないか。`,
          correct: `${date.deadline}までに、${method.jp}で申し込む。`,
          distractors: [`${date.jp}に、会場で申し込む。`, `${date.deadline}までに、${m2.jp}で申し込む。`, `${date.jp}までに、${method.jp}で申し込む。`],
          evidence: sApply[0],
          explanation: `Lihat bagian 申し込み: 「${sApply[0]}」. Jebakan klasik: tanggal ACARA (${date.jp}) ≠ BATAS DAFTAR (${date.deadline}), dan catatan ※ menyatakan pendaftaran hari H tidak bisa.`,
        },
        {
          prompt: '当日、参加者が持っていかなければならないものはどれか。',
          correct: ev.bring,
          distractors: p.others(EVENT, ev, 2).map(e => e.bring).concat(['申し込みの用紙']).slice(0, 3),
          evidence: sBring[0],
          explanation: `Bagian 持ち物 (barang bawaan): 「${sBring[0]}」. Pilihan lain adalah barang bawaan kelas lain atau tidak disebut sama sekali.`,
        },
        {
          prompt: 'このお知らせの内容と合っているものはどれか。',
          correct: fee.jp === '無料' ? 'お金を払わなくても参加できる。' : `参加費の${fee.jp}は、当日会場で払う。`,
          distractors: [
            fee.jp === '無料' ? '参加費は当日、会場で払う。' : '参加費は申し込みのときに払う。',
            '申し込みをしていなくても、当日参加できる。',
            `${ev.target.replace('の方', '')}でなくても、だれでも参加できる。`,
          ],
          evidence: sFee[0],
          explanation: `「${sFee[0]}」 → ${fee.jp === '無料' ? 'biayanya gratis' : `biaya ${fee.jp} dibayar di tempat pada hari H`}. Pilihan "boleh daftar di hari H" bertentangan dengan ※, dan peserta dibatasi: ${ev.targetId}.`,
        },
      ],
      mainIdea: {
        text: `${fac.jp}が「${ev.jp}」の参加者を募集している。申し込みは${date.deadline}までに${method.jp}で行う。`,
        translation: `${fac.id} mencari peserta untuk ${ev.id}; pendaftaran lewat ${method.id} paling lambat ${date.deadlineId}. Teks informasi: fokus pada syarat, tanggal, biaya, dan barang bawaan.`,
      },
    };
  },
};

const n3Habit: DokkaiTemplate = {
  id: 'n3_habit',
  level: 'N3',
  topic: 'Esai kebiasaan baru (pendapat penulis)',
  build(p) {
    const HABIT = [
      o('N3', '朝の散歩', 'jalan pagi', { trigger: '医者に運動不足だと言われた', triggerId: 'dokter bilang saya kurang olahraga', hard: '眠くて、なかなか起きられなかった', hardId: 'saya mengantuk dan sulit bangun', merit: '一日中、気分よく過ごせる', meritId: 'saya bisa merasa segar sepanjang hari' }),
      o('N3', '日記を書くこと', 'menulis buku harian', { trigger: '友人に日記を勧められた', triggerId: 'seorang teman menyarankan saya menulis buku harian', hard: '何を書けばいいのか分からなかった', hardId: 'saya tidak tahu harus menulis apa', merit: '自分の気持ちが整理できる', meritId: 'perasaan saya jadi tertata' }),
      o('N3', '毎日の料理', 'memasak setiap hari', { trigger: '外食が続いて、お金がなくなった', triggerId: 'saya terus makan di luar sampai uang habis', hard: '時間がかかって、疲れてしまった', hardId: 'butuh waktu lama dan saya kelelahan', merit: '体の調子がよくなる', meritId: 'kondisi tubuh saya membaik' }),
    ];
    const PERIOD = [o('N3', '半年', 'setengah tahun'), o('N3', '一年', 'satu tahun'), o('N3', '三か月', 'tiga bulan')];
    const h = p.pick(HABIT), per = p.pick(PERIOD);
    const [h2, h3] = p.others(HABIT, h, 2);

    const sTrigger: Sent = [`きっかけは、${h.trigger}ことだ。`, `Pemicunya adalah ${h.triggerId}.`];
    const sMerit: Sent = [`しかし、続けているうちに、${h.merit}ことに気づいた。`, `Namun, selama terus melakukannya, saya sadar bahwa ${h.meritId}.`];
    const sMain: Sent = ['大切なのは、完璧にやることではなく、少しずつでも続けることだと思う。', 'Menurut saya, yang penting bukan melakukannya dengan sempurna, tetapi terus melakukannya meskipun sedikit demi sedikit.'];
    return {
      title: `${h.jp}を始めて`,
      category: 'Esai · Pendapat',
      paragraphs: [
        [[`${per.jp}前から、${h.jp}を続けている。`, `Sejak ${per.id} lalu, saya terus melakukan ${h.id}.`], sTrigger],
        [[`始めたころは、${h.hard}。`, `Waktu baru mulai, ${h.hardId}.`], ['何度もやめようと思った。', 'Berkali-kali saya berpikir untuk berhenti.'], sMerit],
        [['もちろん、毎日続けるのは簡単ではない。', 'Tentu saja, melakukannya setiap hari tidaklah mudah.'], ['できない日もある。', 'Ada juga hari ketika saya tidak bisa melakukannya.'], sMain],
      ],
      questions: [
        {
          prompt: `筆者が${h.jp}を始めたのはなぜか。`,
          correct: `${h.trigger}から`,
          distractors: [`${h2.trigger}から`, `${h3.trigger}から`, `${h.merit}と知っていたから`],
          evidence: sTrigger[0],
          explanation: `きっかけは〜ことだ = "pemicunya adalah …": 「${sTrigger[0]}」. Manfaat (${h.merit}) baru disadari SETELAH lama melakukannya, jadi bukan alasan memulai.`,
        },
        {
          prompt: `続けているうちに、筆者はどんなことに気づいたか。`,
          correct: `${h.merit}こと`,
          distractors: [`${h2.merit}こと`, `${h.hard}こと`, '毎日続けるのは簡単だということ'],
          evidence: sMerit[0],
          explanation: `〜うちに = "selama/seiring …". Setelah しかし ada temuan penulis: 「${sMerit[0]}」. 「${h.hard}」 adalah kesulitan di awal, bukan hal yang disadari kemudian.`,
        },
        {
          prompt: 'この文章で筆者が最も言いたいことは何か。',
          correct: '完璧でなくても、少しずつ続けることが大切だ。',
          distractors: ['毎日必ず完璧にやらなければ、意味がない。', `${h.jp}は簡単なので、だれでもすぐに続けられる。`, '新しい習慣は、医者や友人に勧められてから始めたほうがいい。'],
          evidence: sMain[0],
          explanation: `Pendapat penulis ada di kalimat penutup dengan 大切なのは〜だと思う: 「${sMain[0]}」. Pola AではなくB menegaskan B (terus melakukan sedikit-sedikit) sebagai inti.`,
        },
      ],
      mainIdea: { text: sMain[0], translation: sMain[1] },
    };
  },
};

// ------------------------------------------------------------------------------
// N2 (dipakai juga untuk N1 dengan kosakata pilihan tersulit)
// ------------------------------------------------------------------------------

const n2Essay: DokkaiTemplate = {
  id: 'n2_essay',
  level: 'N2',
  topic: 'Esai pro-kontra teknologi',
  build(p) {
    const TOPIC = [
      o('N2', 'テレワーク', 'kerja jarak jauh', { merit: '通勤の時間がなくなり、自分のペースで働ける', meritId: 'waktu perjalanan ke kantor hilang dan orang bisa bekerja sesuai ritmenya', demerit: '同僚と顔を合わせる機会が減り、気軽に相談しにくくなる', demeritId: 'kesempatan bertatap muka dengan rekan berkurang sehingga sulit berkonsultasi santai', exp: '在宅勤務を始めた当初は、一日中だれとも話さない日が続き、孤独を感じた', expId: 'saat mulai kerja dari rumah, berhari-hari saya tak bicara dengan siapa pun dan merasa kesepian' }),
      o('N2', 'キャッシュレス決済', 'pembayaran nontunai', { merit: '小銭を持ち歩く必要がなく、支払いが素早く済む', meritId: 'tidak perlu membawa uang receh dan pembayaran selesai dengan cepat', demerit: 'お金を使っている実感が薄れ、つい使いすぎてしまう', demeritId: 'rasa sedang mengeluarkan uang memudar sehingga mudah boros', exp: 'カードで支払うようになってから、月末に明細を見て驚いたことが何度もある', expId: 'sejak membayar dengan kartu, berkali-kali saya terkejut melihat rincian di akhir bulan' }),
      o('N1', 'オンライン学習', 'pembelajaran daring', { merit: '場所や時間に縛られずに、最先端の講義を受講できる', meritId: 'orang bisa mengikuti kuliah mutakhir tanpa terikat tempat dan waktu', demerit: '意欲を保つのが難しく、途中で挫折する人が後を絶たない', demeritId: 'sulit menjaga motivasi sehingga orang yang menyerah di tengah jalan tak ada habisnya', exp: '意気込んで申し込んだ講座を、三週目で放り出してしまった苦い経験がある', expId: 'saya punya pengalaman pahit meninggalkan kursus yang saya daftari dengan semangat pada minggu ketiga' }),
    ];
    const SPREAD = [o('N2', '急速に広まっている', 'menyebar dengan cepat'), o('N1', '急速に普及しつつある', 'sedang meluas dengan pesat')];
    const CONCL = [
      o('N2', '結局のところ、便利な道具は使い方次第である。', 'Pada akhirnya, alat yang praktis itu tergantung cara penggunaannya.'),
      o('N1', '要するに、利便性の高い道具ほど、使う側の姿勢が問われるのである。', 'Singkatnya, makin praktis suatu alat, makin dipertanyakan sikap penggunanya.'),
    ];
    const t = p.pick(TOPIC), sp = p.pick(SPREAD), cc = p.pick(CONCL);
    const [t2] = p.others(TOPIC, t, 1);

    const sMerit: Sent = [`${t.merit}という利点があるからだろう。`, `Mungkin karena ada keuntungan bahwa ${t.meritId}.`];
    const sDemerit: Sent = [`一方で、${t.demerit}という問題も指摘されている。`, `Di sisi lain, masalah bahwa ${t.demeritId} juga ditunjukkan.`];
    const sMain: Sent = [`${t.jp}の良さを生かしつつ、その問題点にも目を向けて使うことが求められているのではないだろうか。`, `Bukankah yang dituntut adalah memanfaatkan kelebihan ${t.id} sambil tetap memperhatikan masalahnya?`];
    return {
      title: `${t.jp}をどう使うか`,
      category: 'Esai · Opini',
      paragraphs: [
        [[`近年、${t.jp}が${sp.jp}。`, `Beberapa tahun terakhir, ${t.id} ${sp.id}.`], sMerit],
        [sDemerit, [`私自身も、${t.exp}。`, `Saya sendiri pun, ${t.expId}.`]],
        [[cc.jp, cc.id], ['問題があるからといって、すぐに手放すのはもったいない。', 'Hanya karena ada masalah, langsung meninggalkannya itu sayang sekali.'], sMain],
      ],
      questions: [
        {
          prompt: `筆者は、${t.jp}が広まった理由をどのように考えているか。`,
          correct: `${t.merit}から`,
          distractors: [`${t2.merit}から`, `${t.demerit}から`, '国が使うように強く勧めているから'],
          evidence: sMerit[0],
          explanation: `〜からだろう menandai dugaan ALASAN penulis: 「${sMerit[0]}」. Pilihan 「${t.demerit}」 adalah kekurangan yang muncul setelah 一方で, bukan alasan penyebaran.`,
        },
        {
          prompt: `筆者は${t.jp}の問題点として何を挙げているか。`,
          correct: `${t.demerit}こと`,
          distractors: [`${t.merit}こと`, `${t2.demerit}こと`, '使い方が難しく、高齢者には利用できないこと'],
          evidence: sDemerit[0],
          explanation: `Masalah diperkenalkan dengan 一方で、〜という問題も指摘されている: 「${sDemerit[0]}」. Pengalaman pribadi penulis di kalimat berikutnya adalah contoh masalah itu.`,
        },
        {
          prompt: 'この文章で筆者が最も言いたいことは何か。',
          correct: `${t.jp}の良い点を生かしながら、問題点にも気を配って使うべきだ。`,
          distractors: [`${t.jp}は問題が多いので、使わないほうがいい。`, `${t.jp}の利点は大きいので、問題点は気にしなくてよい。`, `${t.jp}を使うかどうかは、一人一人が決めることではない。`],
          evidence: sMain[0],
          explanation: `Kalimat terakhir 〜のではないだろうか adalah cara halus menyatakan PENDAPAT: 「${sMain[0]}」. Penulis tidak menolak (もったいない) dan tidak mengabaikan masalah — ia mengambil jalan tengah.`,
        },
      ],
      mainIdea: { text: sMain[0], translation: sMain[1] },
    };
  },
};

const n2Mail: DokkaiTemplate = {
  id: 'n2_mail',
  level: 'N2',
  topic: 'Email kantor (cari informasi)',
  build(p) {
    const SYS = [
      o('N2', '社内の勤怠管理システム', 'sistem absensi kantor', { cannot: '出勤・退勤の記録', cannotId: 'pencatatan jam masuk/pulang', instead: '紙の記録用紙に記入し、翌日総務課に提出してください', insteadId: 'isi formulir kertas dan serahkan ke bagian umum keesokan harinya', ans: '紙の用紙に記入して、翌日総務課に出す', need: '出勤や退勤の記録' }),
      o('N2', '社内の会議室予約システム', 'sistem pemesanan ruang rapat', { cannot: '会議室の予約と変更', cannotId: 'pemesanan dan perubahan ruang rapat', instead: '内線で総務課に直接ご連絡ください', insteadId: 'hubungi bagian umum langsung lewat telepon internal', ans: '内線で総務課に直接連絡する', need: '会議室の予約' }),
      o('N1', '経費精算システム', 'sistem klaim biaya', { cannot: '経費の申請および承認', cannotId: 'pengajuan dan persetujuan biaya', instead: '点検終了後に改めて申請していただくようお願いいたします', insteadId: 'mohon ajukan kembali setelah pemeriksaan selesai', ans: '点検が終わってから改めて申請する', need: '経費の申請' }),
    ];
    const WHEN = [o('N2', '6月14日(土)9時から18時まで', '14 Juni (Sabtu) jam 9.00–18.00'), o('N2', '9月6日(土)13時から翌日の8時まで', '6 September (Sabtu) jam 13.00 sampai jam 8.00 keesokan harinya')];
    const BEFORE = [
      o('N2', '作業中のデータは前日までに保存しておいてください', 'simpan data yang sedang dikerjakan paling lambat sehari sebelumnya', { ans: '作業中のデータを前日までに保存しておくこと' }),
      o('N2', '点検中はシステムに接続しないでください', 'jangan menyambung ke sistem selama pemeriksaan', { ans: '点検中にシステムに接続しないこと' }),
    ];
    const sys = p.pick(SYS), when = p.pick(WHEN), before = p.pick(BEFORE);
    const [s2] = p.others(SYS, sys, 1);

    const sWhen: Sent = [`下記の日程で、${sys.jp}の定期点検を行います。`, `Pemeriksaan rutin ${sys.id} akan dilakukan pada jadwal berikut.`];
    const sCannot: Sent = [`点検中は、${sys.cannot}ができません。`, `Selama pemeriksaan, ${sys.cannotId} tidak bisa dilakukan.`];
    const sInstead: Sent = [`その間に必要な場合は、${sys.instead}。`, `Jika diperlukan selama waktu itu, ${sys.insteadId}.`];
    const sBefore: Sent = [`また、${before.jp}。`, `Selain itu, ${before.id}.`];
    return {
      title: `${sys.jp}の点検について`,
      category: 'Email · Informasi',
      paragraphs: [
        [['社員各位', 'Kepada seluruh karyawan'], ['お疲れさまです。', 'Terima kasih atas kerja kerasnya.'], ['総務課の山田です。', 'Saya Yamada dari bagian umum.']],
        [sWhen, [`日時：${when.jp}`, `Waktu: ${when.id}`]],
        [sCannot, sInstead, sBefore],
        [['ご不便をおかけしますが、ご協力をお願いいたします。', 'Mohon maaf atas ketidaknyamanannya, dan mohon kerja samanya.']],
      ],
      questions: [
        {
          prompt: '点検中に、社員ができなくなることは何か。',
          correct: sys.cannot,
          distractors: [s2.cannot, '社内メールの送受信', '総務課への電話連絡'],
          evidence: sCannot[0],
          explanation: `「${sCannot[0]}」. Pilihan "menelepon bagian umum" justru cara pengganti yang disarankan, bukan hal yang tidak bisa dilakukan.`,
        },
        {
          prompt: `点検中に${sys.need}が必要になった社員は、どうしなければならないか。`,
          correct: sys.ans,
          distractors: ['点検が終わるまで何もしないで待つ', s2.ans, '山田さんにメールで点検の延期を頼む'],
          evidence: sInstead[0],
          explanation: `その間に必要な場合は (jika diperlukan selama waktu itu) → 「${sInstead[0]}」. Itu satu-satunya instruksi pengganti di email.`,
        },
        {
          prompt: 'このメールで社員に求められていることは何か。',
          correct: before.ans,
          distractors: [p.others(BEFORE, before, 1)[0].ans, '点検の日に出勤しないこと', '点検について総務課に意見を送ること'],
          evidence: sBefore[0],
          explanation: `Permintaan tambahan diawali また (selain itu): 「${sBefore[0]}」. Hanya instruksi itu yang tertulis; pilihan lain tidak disebut.`,
        },
      ],
      mainIdea: {
        text: `${sys.jp}の点検のお知らせ。点検中は${sys.cannot}ができないので、その間の対応と事前の準備を伝えている。`,
        translation: `Pemberitahuan pemeriksaan ${sys.id}: selama pemeriksaan ${sys.cannotId} tidak bisa dilakukan, jadi email menjelaskan cara pengganti dan persiapan sebelumnya.`,
      },
    };
  },
};

export const DOKKAI_TEMPLATES: DokkaiTemplate[] = [n5Sunday, n5Party, n4Job, n4Trip, n3Notice, n3Habit, n2Essay, n2Mail];

/** Template yang cocok untuk level target (N1 memakai template N2 dengan kosakata N1). */
export function templatesForLevel(level: DokkaiLevel): DokkaiTemplate[] {
  const lv = level === 'N1' ? 'N2' : level;
  return DOKKAI_TEMPLATES.filter(t => t.level === lv);
}

// ------------------------------------------------------------------------------
// GENERATE
// ------------------------------------------------------------------------------

export interface GenerateOptions {
  level: DokkaiLevel;
  templateId?: string;
  seed?: number;
}

export function generateDokkai({ level, templateId, seed }: GenerateOptions): DokkaiPassage {
  const pool = templatesForLevel(level);
  const s = (seed ?? Math.floor(Math.random() * 1e9)) >>> 0;
  const rng = mulberry32(s);
  // Angka pertama selalu dipakai untuk memilih template, agar id (template+seed) menghasilkan teks yang sama.
  const roll = rng();
  const tpl = (templateId && DOKKAI_TEMPLATES.find(t => t.id === templateId)) || pool[Math.floor(roll * pool.length)] || DOKKAI_TEMPLATES[0];
  const picker = new Picker(rng, level);
  const built = tpl.build(picker);

  // Kalimat biasa disambung; baris tanpa titik (judul, 日時：…) diletakkan di baris sendiri.
  const text = built.paragraphs
    .map(par => par.map(([jp], i) => (i > 0 && (!/[。！？]$/.test(par[i - 1][0]) || !/[。！？]$/.test(jp)) ? '\n' : '') + jp).join(''))
    .join('\n\n');
  const sentenceTranslations: Record<string, string> = {};
  for (const par of built.paragraphs) for (const [jp, id] of par) sentenceTranslations[normSentence(jp)] = id;

  const questions: DokkaiQuestionData[] = built.questions.map((q, i) => {
    const distractors = [...new Set(q.distractors.filter(d => d && d !== q.correct))].slice(0, 3);
    const options = picker.shuffle([q.correct, ...distractors]);
    return {
      id: `gen_${tpl.id}_${s}_q${i + 1}`,
      prompt: q.prompt,
      options,
      correctIndex: options.indexOf(q.correct),
      explanation: q.explanation,
      evidence: q.evidence,
    };
  });

  return {
    id: `gen_${tpl.id}_${level}_${s}`,
    title: built.title,
    level,
    levelLabel: level,
    source: 'generated',
    sourceLabel: `Rakit Dokkai · ${tpl.topic}`,
    category: built.category,
    text,
    questions,
    sentenceTranslations,
    mainIdea: built.mainIdea,
  };
}

/** Bangun ulang bacaan hasil generator dari id-nya (gen_<template>_<level>_<seed>). */
export function regenerateFromId(id: string): DokkaiPassage | undefined {
  const m = id.match(/^gen_(.+)_(N[1-5])_(\d+)$/);
  if (!m) return undefined;
  if (!DOKKAI_TEMPLATES.some(t => t.id === m[1])) return undefined;
  return generateDokkai({ templateId: m[1], level: m[2] as DokkaiLevel, seed: Number(m[3]) });
}
