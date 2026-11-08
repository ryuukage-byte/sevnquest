// ==============================================================================
// CHOUKAI (聴解) — LIBRARY YOUTUBE (versi minimal)
// Daftar video & channel YouTube berbahasa Jepang untuk latihan mendengar.
// Diisi manual. Cukup tempel URL YouTube apa adanya (watch / youtu.be / shorts / @channel).
// Setiap entri divalidasi oleh src/data/choukaiYoutube.test.ts.
//
// Contoh entri video:
//   {
//     id: 'yt_contoh_001',
//     kind: 'video',
//     title: 'Judul video',
//     url: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
//     author: 'Nama channel',
//     level: 'N4',
//     category: 'percakapan',
//     note: 'Kenapa video ini bagus untuk latihan mendengar.',
//   },
// Contoh entri channel:
//   {
//     id: 'ch_contoh',
//     kind: 'channel',
//     title: 'Nama channel',
//     url: 'https://www.youtube.com/@namachannel',
//     level: 'Semua',
//     category: 'vlog',
//   },
// ==============================================================================

export type ChoukaiLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Semua';

export const CHOUKAI_LEVELS: readonly ChoukaiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'Semua'];

export type ChoukaiCategory = 'percakapan' | 'jlpt' | 'berita' | 'vlog' | 'podcast' | 'anime' | 'lainnya';

export const CHOUKAI_CATEGORY_LABELS: Readonly<Record<ChoukaiCategory, string>> = {
  percakapan: 'Percakapan',
  jlpt: 'Latihan JLPT',
  berita: 'Berita',
  vlog: 'Vlog & Keseharian',
  podcast: 'Podcast',
  anime: 'Anime & Drama',
  lainnya: 'Lainnya',
};

export interface ChoukaiYoutubeEntry {
  /** ID unik & stabil (jangan diubah setelah dipublikasikan). */
  id: string;
  kind: 'video' | 'channel';
  title: string;
  /** URL YouTube. Video: watch / youtu.be / shorts / live. Channel: /@handle, /channel/UC…, /c/…, /user/…. */
  url: string;
  /** Nama channel / pembicara (opsional). */
  author?: string;
  /** Perkiraan level pendengar. 'Semua' untuk channel yang isinya campuran. */
  level: ChoukaiLevel;
  category: ChoukaiCategory;
  /** Catatan singkat untuk pembelajar (opsional). */
  note?: string;
  /** Video menyediakan subtitle Jepang (opsional). */
  hasJapaneseSubtitle?: boolean;
}

// Kurasi 2026-11-07: semua video lolos filter "Subtitle/CC" pencarian YouTube (caption unggahan, bukan auto).
// Bahasa caption-nya belum bisa diverifikasi otomatis (YouTube memblokir IP server saat pengecekan); kalau ada yang
// ternyata tidak punya subtitle Jepang, Immersion menampilkan pesan dan entrinya sebaiknya dihapus.
export const CHOUKAI_YOUTUBE: readonly ChoukaiYoutubeEntry[] = [
  {
    id: 'yt_4K10HB3-bdk',
    kind: 'video',
    title: '[N5 - N4] 25-minute simple Japanese listening | My week as a Japanese student |',
    url: 'https://www.youtube.com/watch?v=4K10HB3-bdk',
    author: 'Learn Easy Japanese with Kaneko',
    level: 'N5',
    category: 'percakapan',
    note: 'Monolog pelan tentang kegiatan seminggu; cocok untuk pemula.',
  },
  {
    id: 'yt_IJEn-9nAFQE',
    kind: 'video',
    title: '０から始める日本語 日常会話！【Video for very beginners】Basic conversation in JAPANESE. Japanese Listening Practice',
    url: 'https://www.youtube.com/watch?v=IJEn-9nAFQE',
    author: 'Japanese super immersion',
    level: 'N5',
    category: 'percakapan',
    note: 'Percakapan sehari-hari dasar dari nol.',
  },
  {
    id: 'yt_JYEutL_zQQc',
    kind: 'video',
    title: '５min-Easy Japanese talking. 昨日、なにをしましたか？【comprehensible input】',
    url: 'https://www.youtube.com/watch?v=JYEutL_zQQc',
    author: 'Daily Japanese with Naoko',
    level: 'N5',
    category: 'vlog',
    note: 'Cerita 5 menit dengan bahasa Jepang sederhana.',
  },
  {
    id: 'yt_Jh2C7JlWGKU',
    kind: 'video',
    title: 'Comprehensible Japanese Beginner - My Morning Routine',
    url: 'https://www.youtube.com/watch?v=Jh2C7JlWGKU',
    author: 'Nihongo-Learning',
    level: 'N5',
    category: 'vlog',
    note: 'Comprehensible input: rutinitas pagi.',
  },
  {
    id: 'yt_lXcXkOa5LAU',
    kind: 'video',
    title: '【N5】Easy Japanese Conversation Podcast with @OkkeiJapanese',
    url: 'https://www.youtube.com/watch?v=lXcXkOa5LAU',
    author: 'Japanese with Shun',
    level: 'N5',
    category: 'podcast',
    note: 'Podcast percakapan level N5.',
  },
  {
    id: 'yt_3k75rkB61Bk',
    kind: 'video',
    title: '桃太郎 -ももたろう（日本語版）アニメ日本の昔ばなし／日本語学習／PEACH BOY - MOMOTARO (JAPANESE)',
    url: 'https://www.youtube.com/watch?v=3k75rkB61Bk',
    author: 'ボンボンアカデミー',
    level: 'N5',
    category: 'anime',
    note: 'Dongeng Momotaro, animasi dengan narasi jelas.',
  },
  {
    id: 'yt_TLcyStZMQ-o',
    kind: 'video',
    title: 'おむすびころりん（日本語版）アニメ日本の昔ばなし／日本語学習／OMUSUBI KORORIN - THE ROLLING RICE BALL (JAPANESE)',
    url: 'https://www.youtube.com/watch?v=TLcyStZMQ-o',
    author: 'ボンボンアカデミー',
    level: 'N5',
    category: 'anime',
    note: 'Dongeng Omusubi Kororin, animasi dengan narasi jelas.',
  },
  {
    id: 'yt_UI8cD8XC6Ts',
    kind: 'video',
    title: '25分 N4 日本語リスニング練習：日本へ帰ろう！ #134',
    url: 'https://www.youtube.com/watch?v=UI8cD8XC6Ts',
    author: 'けんさんおかえり Japanese',
    level: 'N4',
    category: 'percakapan',
    note: 'Latihan mendengar 25 menit level N4.',
  },
  {
    id: 'yt_kvyBx9mg8Gw',
    kind: 'video',
    title: 'N4 Listening Practice | Learn Japanese Naturally (Full Lesson + Course)',
    url: 'https://www.youtube.com/watch?v=kvyBx9mg8Gw',
    author: 'けんさんおかえり Japanese',
    level: 'N4',
    category: 'jlpt',
    note: 'Latihan mendengar N4.',
  },
  {
    id: 'yt_PweksFQGzmI',
    kind: 'video',
    title: '【字幕付き＆日本語リスニング】私の日本での朝の過ごし方 (vlog)',
    url: 'https://www.youtube.com/watch?v=PweksFQGzmI',
    author: 'Japanese in Japan',
    level: 'N4',
    category: 'vlog',
    note: 'Vlog rutinitas pagi di Jepang dengan subtitle.',
  },
  {
    id: 'yt_6KMmF3QTy2Q',
    kind: 'video',
    title: '【字幕付き＆日本語聴解】私の日本での夜の過ごし方 (vlog)#2',
    url: 'https://www.youtube.com/watch?v=6KMmF3QTy2Q',
    author: 'Japanese in Japan',
    level: 'N4',
    category: 'vlog',
    note: 'Vlog rutinitas malam di Jepang dengan subtitle.',
  },
  {
    id: 'yt_VhggkmveiTA',
    kind: 'video',
    title: '【にほんご】かんたん♪にほんごLesson #6　病院の会話【Japanese】Conversation in a hospital',
    url: 'https://www.youtube.com/watch?v=VhggkmveiTA',
    author: 'UJS Japanese Language School / 六本木の総合日本語学校',
    level: 'N4',
    category: 'percakapan',
    note: 'Percakapan di rumah sakit dari sekolah bahasa Jepang.',
  },
  {
    id: 'yt_xfGR6kbv4Es',
    kind: 'video',
    title: '【まんが日本昔ばなし】手話つき『おむすびころりん』',
    url: 'https://www.youtube.com/watch?v=xfGR6kbv4Es',
    author: '【公式】まんが日本昔ばなし',
    level: 'N4',
    category: 'anime',
    note: 'Manga Nihon Mukashi Banashi resmi: Omusubi Kororin.',
  },
  {
    id: 'yt_iWg70cSpX9I',
    kind: 'video',
    title: 'やさしい日本語ニュースわん 9/6　「分身ロボットで接客、生きる希望に」「政府、客に渡す12の品物にプラスチックを使わないで」「新しい1万円のお札　工場で印刷が始まる」',
    url: 'https://www.youtube.com/watch?v=iWg70cSpX9I',
    author: '阿部先生の日本語教室',
    level: 'N4',
    category: 'berita',
    note: 'Berita dengan bahasa Jepang mudah (yasashii nihongo).',
  },
  {
    id: 'yt_ZWsQB3gfBUo',
    kind: 'video',
    title: 'やさしい日本語ニュースわん　9/13「レジ袋が有料になって、代わりに使う風呂敷が人気」「オンラインゲーム、子供がする時は親が一緒にいて」「ニュース犬が好きな歌：布団の中から出たくない」',
    url: 'https://www.youtube.com/watch?v=ZWsQB3gfBUo',
    author: '阿部先生の日本語教室',
    level: 'N4',
    category: 'berita',
    note: 'Berita dengan bahasa Jepang mudah (yasashii nihongo).',
  },
  {
    id: 'yt_SmxSCZzV7j0',
    kind: 'video',
    title: '自然な日本語ってなに？ Japanese Listening Practice N3・N2向け Ep.622',
    url: 'https://www.youtube.com/watch?v=SmxSCZzV7j0',
    author: 'Bite Size Japanese',
    level: 'N3',
    category: 'podcast',
    note: 'Membahas apa itu bahasa Jepang yang alami; N3–N2.',
  },
  {
    id: 'yt_4NCO7TES0lA',
    kind: 'video',
    title: '雑談！1hour Immersion Japanese Listening Practice N3・N2レベル【中級】Ep.663',
    url: 'https://www.youtube.com/watch?v=4NCO7TES0lA',
    author: 'Bite Size Japanese',
    level: 'N3',
    category: 'podcast',
    note: 'Obrolan santai 1 jam; N3–N2.',
  },
  {
    id: 'yt_U1gOU4n8ZwY',
    kind: 'video',
    title: '1 Hour N3 Japanese immersion! | Japanese Listening Practice in a fun way!',
    url: 'https://www.youtube.com/watch?v=U1gOU4n8ZwY',
    author: 'けんさんおかえり Japanese',
    level: 'N3',
    category: 'percakapan',
    note: 'Immersion 1 jam level N3.',
  },
  {
    id: 'yt_VnTVz39FAVQ',
    kind: 'video',
    title: '【新横浜Vlog】電車やお店で使う日本語＜生活で使う日本語＞',
    url: 'https://www.youtube.com/watch?v=VnTVz39FAVQ',
    author: 'あかね的日本語教室',
    level: 'N3',
    category: 'vlog',
    note: 'Bahasa Jepang di kereta & toko (Shin-Yokohama).',
  },
  {
    id: 'yt_5ZeHtRKHl7Y',
    kind: 'video',
    title: '東京Vlog／Tokyo Vlog 【飲食店やホテルの会話】',
    url: 'https://www.youtube.com/watch?v=5ZeHtRKHl7Y',
    author: 'あかね的日本語教室',
    level: 'N3',
    category: 'vlog',
    note: 'Percakapan di restoran dan hotel (Tokyo).',
  },
  {
    id: 'yt_rgl7VbmYjiU',
    kind: 'video',
    title: '１時間リアル日本語会話｜Train your ears with real Japanese conversation!',
    url: 'https://www.youtube.com/watch?v=rgl7VbmYjiU',
    author: 'Japanese super immersion',
    level: 'N3',
    category: 'percakapan',
    note: 'Percakapan nyata 1 jam; latih telinga kecepatan asli.',
  },
  {
    id: 'yt_KRs7nFLf-_M',
    kind: 'video',
    title: '【JLPT N2/N3】日本語の聴解チャレンジ／ディクテーション',
    url: 'https://www.youtube.com/watch?v=KRs7nFLf-_M',
    author: 'あかね的日本語教室',
    level: 'N3',
    category: 'jlpt',
    note: 'Tantangan choukai & dikte N3–N2.',
  },
  {
    id: 'yt_SjSpIBe5Ktw',
    kind: 'video',
    title: '日本語がうまく話せない理由と勉強方法 Japanese Listening Practice N3・N2レベル【中級】Ep.688',
    url: 'https://www.youtube.com/watch?v=SjSpIBe5Ktw',
    author: 'Bite Size Japanese',
    level: 'N2',
    category: 'podcast',
    note: 'Kenapa sulit bicara & cara belajarnya; N3–N2.',
  },
  {
    id: 'yt_3auz1PtBQ1g',
    kind: 'video',
    title: '会話が上手な人の特徴５つ Japanese Listening Practice N3・N2レベル【中級】Ep.740',
    url: 'https://www.youtube.com/watch?v=3auz1PtBQ1g',
    author: 'Bite Size Japanese',
    level: 'N2',
    category: 'podcast',
    note: 'Ciri orang yang pandai bercakap; N3–N2.',
  },
  {
    id: 'yt_tvpeIYCcNSo',
    kind: 'video',
    title: '結婚について　Shunさんにインタビュー　#36 | 日本語ポッドキャスト',
    url: 'https://www.youtube.com/watch?v=tvpeIYCcNSo',
    author: 'Speak Japanese Naturally PODCAST',
    level: 'N2',
    category: 'podcast',
    note: 'Wawancara tentang pernikahan; kecepatan alami.',
  },
  {
    id: 'yt_PMNHOIfAAjQ',
    kind: 'video',
    title: 'Japanese Podcast - Conversation with Haru san (日本語の会話）|Japanese and English subtitles',
    url: 'https://www.youtube.com/watch?v=PMNHOIfAAjQ',
    author: 'Learn Japanese with Hoshiko',
    level: 'N2',
    category: 'podcast',
    note: 'Percakapan podcast dua penutur asli.',
  },
];
