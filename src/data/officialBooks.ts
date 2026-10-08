import { OfficialBook, OfficialChapter } from '../types/books';
import { kanaDojoKotobaIds } from './entityIds';
import { UserDeck, DeckItemRef } from '../types/rpg';
import { THEMATIC_BOOKS } from './thematicBooks';
import bunpouDb from './db/bunpou.json';
import bunpouW1 from './db/bunpou_w1.json';
import bunpouW2 from './db/bunpou_w2.json';
import bunpouW3 from './db/bunpou_w3.json';
import bunpouW4 from './db/bunpou_w4.json';
import bunpouW5 from './db/bunpou_w5.json';
import bunpouW6 from './db/bunpou_w6.json';
import kanjiDb from './db/kanji.json';
import kotobaDb from './db/kotoba.json';

const now = new Date().toISOString();

// Helper to map ids to DeckItemRef
function toRefs(ids: string[], category: 'kanji' | 'kotoba' | 'bunpou'): DeckItemRef[] {
  return ids.map(id => ({
    id,
    category,
    addedAt: now,
  }));
}

const kanjiList = Object.values(kanjiDb as Record<string, { id?: string; character: string; jlpt?: string }>);
const kotobaList = Object.values(kotobaDb as Record<string, { id: string; jlpt?: string; level?: string; tags?: string[]; unitName?: string }>);
const allBunpou = bunpouDb as Array<{ id: string; title: string; level?: string }>;

// Helper to get Kanzen/Minna bunpou slices
const n5Bunpou = allBunpou.filter(b => b.id.includes('_n5_') || b.level === 'N5').map(b => b.id);
const n4Bunpou = allBunpou.filter(b => b.id.includes('_n4_') || b.level === 'N4').map(b => b.id);
const n2Bunpou = allBunpou.filter(b => b.id.includes('_n2_') || b.level === 'N2').map(b => b.id);
const n1Bunpou = allBunpou.filter(b => b.id.includes('_n1_') || b.level === 'N1').map(b => b.id);

const n5Kanji = kanjiList.filter(k => k.jlpt === 'N5').map(k => k.id || k.character);
const n4Kanji = kanjiList.filter(k => k.jlpt === 'N4').map(k => k.id || k.character);
const n3Kanji = kanjiList.filter(k => k.jlpt === 'N3').map(k => k.id || k.character);
const n2Kanji = kanjiList.filter(k => k.jlpt === 'N2').map(k => k.id || k.character);
const n1Kanji = kanjiList.filter(k => k.jlpt === 'N1').map(k => k.id || k.character);

const n5Kotoba = kotobaList.filter(k => (k.jlpt === 'N5' || k.level === 'N5') && !k.id.startsWith('kt_train_')).map(k => k.id);
const n4Kotoba = kotobaList.filter(k => k.jlpt === 'N4' || k.level === 'N4').map(k => k.id);
const n3Kotoba = kotobaList.filter(k => k.jlpt === 'N3' || k.level === 'N3').map(k => k.id);
const n2Kotoba = kotobaList.filter(k => k.jlpt === 'N2' || k.level === 'N2').map(k => k.id);
const n1Kotoba = kotobaList.filter(k => k.jlpt === 'N1' || k.level === 'N1').map(k => k.id);

// Kaigo units map
const kaigoByUnit: Record<string, string[]> = {};
for (const item of kotobaList) {
  if ((item.tags && item.tags.includes('Kaigo')) || item.jlpt === 'Kaigo') {
    const u = item.unitName || 'Umum';
    if (!kaigoByUnit[u]) kaigoByUnit[u] = [];
    kaigoByUnit[u].push(item.id);
  }
}
const sswIds = kotobaList.filter(k => (k.tags && k.tags.includes('SSW')) || k.jlpt === 'SSW').map(k => k.id);

// -------------------------------------------------------------
// 1. KANA DOJO
// -------------------------------------------------------------
const kanaKanji = kanjiList.filter(k => k.jlpt === 'KANA' || (k.id && k.id.startsWith('kana_'))).map(k => k.id || k.character);
const kanaKotoba = kanaDojoKotobaIds(kotobaList.map(k => k.id));

const kanaChapters: OfficialChapter[] = [
  {
    id: 'ch_kana_1',
    bookId: 'book_kana_dojo',
    chapterNumber: 1,
    titleJp: 'ひらがな基礎：母音とカ行 (あ〜こ)',
    titleId: 'Hiragana Vokal Dasar & Baris K (A〜Ko)',
    subtitle: '10 Huruf Pertama & Latihan Kata Dasar',
    description: 'Menguasai 5 huruf vokal dasar (あ, い, う, え, お) dan baris Ka (か, き, く, け, こ) beserta kosakata ucapan permulaan.',
    coverIcon: 'あ',
    items: [
      ...toRefs(kanaKanji.slice(0, 10), 'kanji'),
      ...toRefs(kanaKotoba.slice(0, 10), 'kotoba'),
    ]
  },
  {
    id: 'ch_kana_2',
    bookId: 'book_kana_dojo',
    chapterNumber: 2,
    titleJp: 'ひらがな展開：サ・タ・ナ行 (さ〜の)',
    titleId: 'Hiragana Baris S, T, & N (Sa〜No)',
    subtitle: '15 Huruf Konsonan Inti',
    description: 'Menguasai baris Sa (さ〜そ), Ta (た〜と), dan Na (な〜の) serta latihan menulis kuas kaligrafi.',
    coverIcon: 'さ',
    items: [
      ...toRefs(kanaKanji.slice(10, 25), 'kanji'),
      ...toRefs(kanaKotoba.slice(10, 20), 'kotoba'),
    ]
  },
  {
    id: 'ch_kana_3',
    bookId: 'book_kana_dojo',
    chapterNumber: 3,
    titleJp: 'ひらがな拡張：ハ・マ・ヤ行 (は〜よ)',
    titleId: 'Hiragana Baris H, M, & Y (Ha〜Yo)',
    subtitle: '13 Huruf Tengah',
    description: 'Menguasai baris Ha (は〜ほ), Ma (ま〜も), dan Ya (や, ゆ, よ) beserta kosakata harian.',
    coverIcon: 'は',
    items: [
      ...toRefs(kanaKanji.slice(25, 38), 'kanji'),
      ...toRefs(kanaKotoba.slice(20, 30), 'kotoba'),
    ]
  },
  {
    id: 'ch_kana_4',
    bookId: 'book_kana_dojo',
    chapterNumber: 4,
    titleJp: 'ひらがな完成：ラ・ワ行・濁音・半濁音',
    titleId: 'Hiragana Baris R, W, N & Dakuon (Tengteng & Maru)',
    subtitle: 'Aksara Pelengkap & Bunyi Suara',
    description: 'Menyelesaikan aksara Ra (ら〜ろ), Wa, Wo, N serta variasi dakuon (Ga, Za, Da, Ba) dan handakuon (Pa).',
    coverIcon: 'ん',
    items: [
      ...toRefs(kanaKanji.slice(38, 65), 'kanji'),
      ...toRefs(kanaKotoba.slice(30, 40), 'kotoba'),
    ]
  },
  {
    id: 'ch_kana_5',
    bookId: 'book_kana_dojo',
    chapterNumber: 5,
    titleJp: 'カタカナ基礎：アイウエオ〜ノ (ア〜ノ)',
    titleId: 'Katakana Bagian 1: Vokal & Konsonan Awal',
    subtitle: '25 Huruf Katakana Inti',
    description: 'Mengenal goresan bersudut Katakana: Vokal (ア〜オ), Ka (カ〜コ), Sa (サ〜ソ), Ta (タ〜ト), Na (ナ〜ノ).',
    coverIcon: 'ア',
    items: [
      ...toRefs(kanaKanji.slice(65, 90), 'kanji'),
      ...toRefs(kanaKotoba.slice(40, 50), 'kotoba'),
    ]
  },
  {
    id: 'ch_kana_6',
    bookId: 'book_kana_dojo',
    chapterNumber: 6,
    titleJp: 'カタカナ完成：ハ〜ン・外来語単語',
    titleId: 'Katakana Bagian 2 & Kosakata Serapan',
    subtitle: 'Menyempurnakan 46 Katakana & Kata Asing',
    description: 'Menguasai baris Ha hingga N, bunyi dakuon Katakana, dan membaca kata serapan asing (gairaigo).',
    coverIcon: 'カ',
    items: [
      ...toRefs(kanaKanji.slice(90, 130), 'kanji'),
      ...toRefs(kanaKotoba.slice(50, 65), 'kotoba'),
    ]
  }
];

// -------------------------------------------------------------
// 2. MINNA NO NIHONGO I (N5)
// -------------------------------------------------------------
const minnaN5Chapters: OfficialChapter[] = [
  {
    id: 'ch_minna1_1',
    bookId: 'book_minna_n5',
    chapterNumber: 1,
    titleJp: '第1課〜第5課：自己紹介・指示代名詞・助詞基礎',
    titleId: 'Bab 1〜5: Perkenalan & Partikel Dasar (Wa, Ka, No, Mo)',
    subtitle: 'Dasar Predikat Nominal & Tanya Jawab',
    description: 'Pola kalimat dasar ~wa ~desu, kalimat sanggah dewa arimasen, kepemilikan no, penunjuk kore/sore/are, dan salam awal.',
    coverIcon: '初',
    items: [
      ...toRefs(n5Bunpou.slice(0, 12), 'bunpou'),
      ...toRefs(n5Kanji.slice(0, 10), 'kanji'),
      ...toRefs(n5Kotoba.slice(0, 15), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna1_2',
    bookId: 'book_minna_n5',
    chapterNumber: 2,
    titleJp: '第6課〜第10課：日常動詞・場所・存在表現',
    titleId: 'Bab 6〜10: Kata Kerja Harian, Lokasi, & Keberadaan (Imasu/Arimasu)',
    subtitle: 'Aktivitas Harian & Tata Ruang',
    description: 'Kata kerja bentuk -masu, partikel o (objek), de (tempat aksi), he/ni (tujuan), serta keberadaan orang/benda (imasu/arimasu).',
    coverIcon: '日',
    items: [
      ...toRefs(n5Bunpou.slice(12, 24), 'bunpou'),
      ...toRefs(n5Kanji.slice(10, 20), 'kanji'),
      ...toRefs(n5Kotoba.slice(15, 30), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna1_3',
    bookId: 'book_minna_n5',
    chapterNumber: 3,
    titleJp: '第11課〜第15課：数・形容詞・て形基礎',
    titleId: 'Bab 11〜15: Bilangan, Waktu, Kata Sifat, & Bentuk -Te',
    subtitle: 'Deskripsi Sifat & Rangkaian Tindakan',
    description: 'Kata bilangan, kata sifat -i dan -na, perbandingan yori/hou ga, konjugasi bentuk -te, serta permintaan sopan ~te kudasai.',
    coverIcon: '形',
    items: [
      ...toRefs(n5Bunpou.slice(24, 38), 'bunpou'),
      ...toRefs(n5Kanji.slice(20, 32), 'kanji'),
      ...toRefs(n5Kotoba.slice(30, 45), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna1_4',
    bookId: 'book_minna_n5',
    chapterNumber: 4,
    titleJp: '第16課〜第20課：継続・許可・ない形・辞書形',
    titleId: 'Bab 16〜20: Izin, Larangan, Bentuk -Nai, & Bentuk Kamus',
    subtitle: 'Aturan Sosial & Ragam Biasa (Futsukei)',
    description: 'Pola izin ~te mo ii desu, larangan ~te wa ikemasen, bentuk negatif ~nakereba narimasen, dan bentuk kamus (jishokei).',
    coverIcon: '辞',
    items: [
      ...toRefs(n5Bunpou.slice(38, 52), 'bunpou'),
      ...toRefs(n5Kanji.slice(32, 45), 'kanji'),
      ...toRefs(n5Kotoba.slice(45, 60), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna1_5',
    bookId: 'book_minna_n5',
    chapterNumber: 5,
    titleJp: '第21課〜第25課：意見・経験・た形・条件 (たら)',
    titleId: 'Bab 21〜25: Opini, Pengalaman, Bentuk -Ta, & Pengandaian -Tara',
    subtitle: 'Puncak Minna no Nihongo Shokyū I',
    description: 'Opini ~to omoimasu, kutipan ~to iimashita, bentuk lampau futsukei (ta-kei), pengalaman ~ta koto ga aru, dan pengandaian ~tara.',
    coverIcon: '達',
    items: [
      ...toRefs(n5Bunpou.slice(52, 68), 'bunpou'),
      ...toRefs(n5Kanji.slice(45, 60), 'kanji'),
      ...toRefs(n5Kotoba.slice(60, 80), 'kotoba'),
    ]
  }
];

// -------------------------------------------------------------
// 3. MINNA NO NIHONGO II (N4)
// -------------------------------------------------------------
const minnaN4Chapters: OfficialChapter[] = [
  {
    id: 'ch_minna2_1',
    bookId: 'book_minna_n4',
    chapterNumber: 1,
    titleJp: '第26課〜第30課：〜んです・可能形・結果の状態',
    titleId: 'Bab 26〜30: Alasan ~Ndesu, Bentuk Potensial, & Keadaan Selesai',
    subtitle: 'Penjelasan Alasan & Kemampuan',
    description: 'Penekanan alasan ~ndesu, konjugasi bentuk bisa/potensial (kanoukei), kondisi aksi selesai ~te shimaimashita, dan benda sengaja ditata ~te arimasu.',
    coverIcon: '能',
    items: [
      ...toRefs(n4Bunpou.slice(0, 15), 'bunpou'),
      ...toRefs(n4Kanji.slice(0, 12), 'kanji'),
      ...toRefs(n4Kotoba.slice(0, 15), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna2_2',
    bookId: 'book_minna_n4',
    chapterNumber: 2,
    titleJp: '第31課〜第35課：意向形・助言・条件形 (〜ば)',
    titleId: 'Bab 31〜35: Maksud (Ikoukei), Saran, Prediksi, & Pengandaian -Ba',
    subtitle: 'Rencana Masa Depan & Pengandaian Formal',
    description: 'Bentuk niat ~ou to omou, saran ~hou ga ii, dugaan ~kamoshiremasen, ramalan cuaca ~deshou, dan konjugasi pengandaian ba-kei.',
    coverIcon: '意',
    items: [
      ...toRefs(n4Bunpou.slice(15, 30), 'bunpou'),
      ...toRefs(n4Kanji.slice(12, 24), 'kanji'),
      ...toRefs(n4Kotoba.slice(15, 30), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna2_3',
    bookId: 'book_minna_n4',
    chapterNumber: 3,
    titleJp: '第36課〜第40課：〜ように・受身形・使役形',
    titleId: 'Bab 36〜40: Tujuan (You ni), Bentuk Pasif (Ukemi), & Kausatif',
    subtitle: 'Target Kebiasaan & Kalimat Pasif/Suruh',
    description: 'Tujuan ~you ni suru, bentuk pasif (terkena aksi orang lain), konjugasi kausatif (membuat/menyuruh orang lain melakukan).',
    coverIcon: '受',
    items: [
      ...toRefs(n4Bunpou.slice(30, 46), 'bunpou'),
      ...toRefs(n4Kanji.slice(24, 36), 'kanji'),
      ...toRefs(n4Kotoba.slice(30, 45), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna2_4',
    bookId: 'book_minna_n4',
    chapterNumber: 4,
    titleJp: '第41課〜第45課：受身使役・授受表現・〜のに',
    titleId: 'Bab 41〜45: Kausatif-Pasif, Memberi-Menerima, & Kontras ~Noni',
    subtitle: 'Terpaksa Melakukan & Dinamika Sosial',
    description: 'Bentuk terpaksa melakukan (shieki ukemi), sopan santun memberi-menerima (itadaku, kudasaru, yaru), dan kekecewaan ~noni.',
    coverIcon: '授',
    items: [
      ...toRefs(n4Bunpou.slice(46, 62), 'bunpou'),
      ...toRefs(n4Kanji.slice(36, 48), 'kanji'),
      ...toRefs(n4Kotoba.slice(45, 60), 'kotoba'),
    ]
  },
  {
    id: 'ch_minna2_5',
    bookId: 'book_minna_n4',
    chapterNumber: 5,
    titleJp: '第46課〜第50課：ところ・ばかり・敬語 (尊敬・謙譲)',
    titleId: 'Bab 46〜50: Nuansa Waktu (Tokoro/Bakari) & Keigo Lengkap',
    subtitle: 'Puncak Minna no Nihongo Shokyū II & Etika Bahasa',
    description: 'Tahapan waktu ~tokoro da, baru saja ~bakari da, perkiraan ~hazuda, serta bahasa hormat Sonkeigo dan bahasa rendah diri Kenjougo.',
    coverIcon: '敬',
    items: [
      ...toRefs(n4Bunpou.slice(62, 80), 'bunpou'),
      ...toRefs(n4Kanji.slice(48, 60), 'kanji'),
      ...toRefs(n4Kotoba.slice(60, 80), 'kotoba'),
    ]
  }
];

// -------------------------------------------------------------
// 4. NIHONGO SOUMATOME N3
// -------------------------------------------------------------
const soumatomeN3Chapters: OfficialChapter[] = [
  {
    id: 'ch_soumatome_w1',
    bookId: 'book_soumatome_n3',
    chapterNumber: 1,
    titleJp: '第1週：受身・使役・日常短縮表現 (18項目)',
    titleId: 'Minggu 1: Bentuk Pasif, Kausatif, & Singkatan Santai',
    subtitle: 'Tata Bahasa & Pola Kalimat Hari 1〜7',
    description: '18 Pola kalimat resmi Soumatome Minggu 1: Ukemikei, Shiekikei, V-te shimau -> chau, toku, dll.',
    coverIcon: '受',
    items: [
      ...toRefs((bunpouW1 as any[]).map(b => b.id), 'bunpou'),
      ...toRefs(n3Kanji.slice(0, 10), 'kanji'),
      ...toRefs(n3Kotoba.slice(0, 15), 'kotoba'),
    ]
  },
  {
    id: 'ch_soumatome_w2',
    bookId: 'book_soumatome_n3',
    chapterNumber: 2,
    titleJp: '第2週：限定・強調・話題提示助詞 (22項目)',
    titleId: 'Minggu 2: Partikel Penegas (Bakari, Sae, Kurai, Nado)',
    subtitle: 'Nuansa Pembatasan & Topik Percakapan',
    description: '22 Pola kalimat resmi Soumatome Minggu 2: ~bakari, ~dakeshika, ~sae, ~koso, ~ni kanshite, ~ni tsuite.',
    coverIcon: '限',
    items: [
      ...toRefs((bunpouW2 as any[]).map(b => b.id), 'bunpou'),
      ...toRefs(n3Kanji.slice(10, 20), 'kanji'),
      ...toRefs(n3Kotoba.slice(15, 30), 'kotoba'),
    ]
  },
  {
    id: 'ch_soumatome_w3',
    bookId: 'book_soumatome_n3',
    chapterNumber: 3,
    titleJp: '第3週：仮定・逆接・立場表現 (22項目)',
    titleId: 'Minggu 3: Pengandaian (Temo, Zuni) & Peran (To shite)',
    subtitle: 'Relasi Kondisi, Pertentangan, & Sudut Pandang',
    description: '22 Pola kalimat resmi Soumatome Minggu 3: ~temo, ~zuni, ~to shite, ~ni shite wa, ~wari ni wa.',
    coverIcon: '逆',
    items: [
      ...toRefs((bunpouW3 as any[]).map(b => b.id), 'bunpou'),
      ...toRefs(n3Kanji.slice(20, 30), 'kanji'),
      ...toRefs(n3Kotoba.slice(30, 45), 'kotoba'),
    ]
  },
  {
    id: 'ch_soumatome_w4',
    bookId: 'book_soumatome_n3',
    chapterNumber: 4,
    titleJp: '第4週：義務・推量・追憶表現 (24項目)',
    titleId: 'Minggu 4: Keharusan, Kepastian (Hazu), & Kenangan (Koto)',
    subtitle: 'Ekspektasi, Logika, & Penyesalan',
    description: '24 Pola kalimat resmi Soumatome Minggu 4: ~tsumori, ~hazu da, ~wake ga nai, ~mono da, ~koto da.',
    coverIcon: '推',
    items: [
      ...toRefs((bunpouW4 as any[]).map(b => b.id), 'bunpou'),
      ...toRefs(n3Kanji.slice(30, 40), 'kanji'),
      ...toRefs(n3Kotoba.slice(45, 60), 'kotoba'),
    ]
  },
  {
    id: 'ch_soumatome_w5',
    bookId: 'book_soumatome_n3',
    chapterNumber: 5,
    titleJp: '第5週：推移・程度・進行状況 (24項目)',
    titleId: 'Minggu 5: Perubahan (Uchi ni, Aida ni) & Tingkat Derajat',
    subtitle: 'Waktu Bersamaan & Perkembangan Situasi',
    description: '24 Pola kalimat resmi Soumatome Minggu 5: ~uchi ni, ~aida ni, ~tabi ni, ~tsuide ni, ~bakari da.',
    coverIcon: '移',
    items: [
      ...toRefs((bunpouW5 as any[]).map(b => b.id), 'bunpou'),
      ...toRefs(n3Kanji.slice(40, 50), 'kanji'),
      ...toRefs(n3Kotoba.slice(60, 75), 'kotoba'),
    ]
  },
  {
    id: 'ch_soumatome_w6',
    bookId: 'book_soumatome_n3',
    chapterNumber: 6,
    titleJp: '第6週：わけ・ところ・発展敬語 (22項目)',
    titleId: 'Minggu 6: Nuansa Wake/Tokoro & Keigo Tingkat Menengah',
    subtitle: 'Alasan Wajar, Momentum Waktu, & Bahasa Hormat',
    description: '22 Pola kalimat resmi Soumatome Minggu 6: ~wake dewa nai, ~tokoro datta, ragam Sonkeigo/Kenjougo N3.',
    coverIcon: '志',
    items: [
      ...toRefs((bunpouW6 as any[]).map(b => b.id), 'bunpou'),
      ...toRefs(n3Kanji.slice(50, 60), 'kanji'),
      ...toRefs(n3Kotoba.slice(75, 90), 'kotoba'),
    ]
  }
];

// -------------------------------------------------------------
// 5. SHIN KANZEN MASTER N2
// -------------------------------------------------------------
const kanzenN2Chapters: OfficialChapter[] = [
  {
    id: 'ch_kanzen2_1',
    bookId: 'book_kanzen_n2',
    chapterNumber: 1,
    titleJp: '第1章：公式・形式的表現 (に際して・にあたって)',
    titleId: 'Bab 1: Wacana Formal & Momentum Penting',
    subtitle: 'Bahasa Berita, Acara, & Pengumuman Resmi',
    description: 'Pola kalimat formal tingkat tinggi: ~ni saishite, ~ni atatte, ~o keiki ni, ~o kikkake ni, ~ni sakadachi.',
    coverIcon: '式',
    items: [
      ...toRefs(n2Bunpou.slice(0, 15), 'bunpou'),
      ...toRefs(n2Kanji.slice(0, 10), 'kanji'),
      ...toRefs(n2Kotoba.slice(0, 15), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen2_2',
    bookId: 'book_kanzen_n2',
    chapterNumber: 2,
    titleJp: '第2章：対比・二面性・比較 (一方で・反面)',
    titleId: 'Bab 2: Dua Sisi Realitas & Kontras Logis',
    subtitle: 'Membandingkan Paradoks & Sudut Pandang',
    description: 'Pola ekspresi kontras: ~ippou de, ~hanmen, ~ni hanshite, ~ni hikikae, ~dokoroka, ~to iu yori.',
    coverIcon: '対',
    items: [
      ...toRefs(n2Bunpou.slice(15, 30), 'bunpou'),
      ...toRefs(n2Kanji.slice(10, 20), 'kanji'),
      ...toRefs(n2Kotoba.slice(15, 30), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen2_3',
    bookId: 'book_kanzen_n2',
    chapterNumber: 3,
    titleJp: '第3章：感情の高揚・不可避性 (てたまらない・ざるを得ない)',
    titleId: 'Bab 3: Intensitas Emosi & Keniscayaan',
    subtitle: 'Perasaan Tak Tertahankan & Keharusan Mutlak',
    description: 'Ekspresi emosional mendalam: ~te tamaranai, ~te naranai, ~te shikanai, ~zaru wo enai, ~wake ni wa ikanai.',
    coverIcon: '情',
    items: [
      ...toRefs(n2Bunpou.slice(30, 45), 'bunpou'),
      ...toRefs(n2Kanji.slice(20, 30), 'kanji'),
      ...toRefs(n2Kotoba.slice(30, 45), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen2_4',
    bookId: 'book_kanzen_n2',
    chapterNumber: 4,
    titleJp: '第4章：論理・推論・限定 (のみならず・にほかならない)',
    titleId: 'Bab 4: Penalaran Logika & Pembatasan Wacana',
    subtitle: 'Bahasa Esai, Artikel Ilmiah, & Opini Kritis',
    description: 'Pola penalaran akademis: ~nomi narazu, ~bakari ka, ~ni hoka naranai, ~o moto ni, ~ni motozuite.',
    coverIcon: '論',
    items: [
      ...toRefs(n2Bunpou.slice(45, 60), 'bunpou'),
      ...toRefs(n2Kanji.slice(30, 40), 'kanji'),
      ...toRefs(n2Kotoba.slice(45, 60), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen2_5',
    bookId: 'book_kanzen_n2',
    chapterNumber: 5,
    titleJp: '第5章：因果関係・極限・結末 (ことから・末に・を経て)',
    titleId: 'Bab 5: Kausalitas Khusus & Hasil Akhir',
    subtitle: 'Puncak Penguasaan Mahir JLPT N2',
    description: 'Pola sebab-akibat rumit: ~koto kara, ~sue ni, ~ageku, ~o hete, ~shidaida, ~ippouda.',
    coverIcon: '達',
    items: [
      ...toRefs(n2Bunpou.slice(60, 75), 'bunpou'),
      ...toRefs(n2Kanji.slice(40, 50), 'kanji'),
      ...toRefs(n2Kotoba.slice(60, 75), 'kotoba'),
    ]
  }
];

// -------------------------------------------------------------
// 6. SHIN KANZEN MASTER N1
// -------------------------------------------------------------
const kanzenN1Chapters: OfficialChapter[] = [
  {
    id: 'ch_kanzen1_1',
    bookId: 'book_kanzen_n1',
    chapterNumber: 1,
    titleJp: '第1章：即時性・極限状況 (や否や・そばから)',
    titleId: 'Bab 1: Kondisi Ekstrem & Kausalitas Instan',
    subtitle: 'Waktu Seketika & Reaksi Spontan',
    description: 'Ekspresi instan tingkat ahli: ~ya ina ya, ~soba kara, ~nari, ~ta tokoro de, ~gotoku.',
    coverIcon: '極',
    items: [
      ...toRefs(n1Bunpou.slice(0, 15), 'bunpou'),
      ...toRefs(n1Kanji.slice(0, 10), 'kanji'),
      ...toRefs(n1Kotoba.slice(0, 15), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen1_2',
    bookId: 'book_kanzen_n1',
    chapterNumber: 2,
    titleJp: '第2章：思想・社会情勢・視座 (にあって・をおいて)',
    titleId: 'Bab 2: Wacana Filosofis & Kondisi Sosial',
    subtitle: 'Teks Kritis, Opini Editorial, & Perspektif Luas',
    description: 'Pola wacana intelektual: ~ni atte, ~o oite, ~ni sakakete wa, ~o fumaete, ~ni terashite.',
    coverIcon: '思',
    items: [
      ...toRefs(n1Bunpou.slice(15, 30), 'bunpou'),
      ...toRefs(n1Kanji.slice(10, 20), 'kanji'),
      ...toRefs(n1Kotoba.slice(15, 30), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen1_3',
    bookId: 'book_kanzen_n1',
    chapterNumber: 3,
    titleJp: '第3章：美意識・心情の極限 (極まりない・に堪えない)',
    titleId: 'Bab 3: Estetika Bahasa & Emosi Mendalam',
    subtitle: 'Ekspresi Puitis & Sastra Penutur Asli',
    description: 'Ekspresi nuansa halus sastra: ~kagiri da, ~kiwamari nai, ~ni taenai, ~o kinji enai.',
    coverIcon: '美',
    items: [
      ...toRefs(n1Bunpou.slice(30, 45), 'bunpou'),
      ...toRefs(n1Kanji.slice(20, 30), 'kanji'),
      ...toRefs(n1Kotoba.slice(30, 45), 'kotoba'),
    ]
  },
  {
    id: 'ch_kanzen1_4',
    bookId: 'book_kanzen_n1',
    chapterNumber: 4,
    titleJp: '第4章：古典的語法・統語構造 (ながらも・だに・たる)',
    titleId: 'Bab 4: Klasik Formal & Struktur Sastra Kuno',
    subtitle: 'Singgasana Tertinggi Penguasaan Bahasa Jepang',
    description: 'Struktur tata bahasa arhaik/klasik: ~nagara mo, ~dani, ~taru mono, ~o yogi naku sareru.',
    coverIcon: '頂',
    items: [
      ...toRefs(n1Bunpou.slice(45, 60), 'bunpou'),
      ...toRefs(n1Kanji.slice(30, 40), 'kanji'),
      ...toRefs(n1Kotoba.slice(45, 60), 'kotoba'),
    ]
  }
];

// -------------------------------------------------------------
// 7. KEPERAWATAN KAIGO & SSW
// -------------------------------------------------------------
const kaigoChapters: OfficialChapter[] = [
  {
    id: 'ch_kaigo_1',
    bookId: 'book_kaigo_ssw',
    chapterNumber: 1,
    titleJp: '第1章：食事介助と口腔ケア (31語)',
    titleId: 'Bab 1: Bantuan Makan & Kebersihan Mulut',
    subtitle: 'Kosa Kata & Etika Meja Makan Lansia',
    description: 'Istilah nutrisi, tekstur makanan halus (kizami-shoku), alat bantu sendok bengkok, dan menyikat gigi palsu (giba).',
    coverIcon: '食',
    items: [
      ...toRefs(['食', '飲', '歯', '口', '舌'], 'kanji'),
      ...toRefs([
        ...(kaigoByUnit['Aktivitas Makan'] || []),
        ...(kaigoByUnit['Rongga Mulut'] || [])
      ], 'kotoba')
    ]
  },
  {
    id: 'ch_kaigo_2',
    bookId: 'book_kaigo_ssw',
    chapterNumber: 2,
    titleJp: '第2章：入浴・排泄・清潔ケア (35語)',
    titleId: 'Bab 2: Mandi, Ekskresi, & Kebersihan Diri',
    subtitle: 'Perawatan Higienitas & Privasi Pengguna',
    description: 'Bantuan mandi (yokusou), menyeka badan (seishiki), toilet portabel, penggantian popok (omutsu), dan kenyamanan kulit.',
    coverIcon: '洗',
    items: [
      ...toRefs(['洗', '便', '室', '湯', '浴'], 'kanji'),
      ...toRefs([
        ...(kaigoByUnit['Mandi & Obat'] || []).slice(0, 15),
        ...(kaigoByUnit['Ekskresi'] || []).slice(0, 20)
      ], 'kotoba')
    ]
  },
  {
    id: 'ch_kaigo_3',
    bookId: 'book_kaigo_ssw',
    chapterNumber: 3,
    titleJp: '第3章：移動・体位変換・バイタル (32語)',
    titleId: 'Bab 3: Mobilitas, Posisi Tubuh, & Tanda Vital',
    subtitle: 'Ambulasi Kursi Roda & Pengukuran Fisik',
    description: 'Pemindahan ke kursi roda (ijou), reposisi baring (taii henkan), pengukuran tensi (ketsuatsu), suhu (taion), dan denyut nadi.',
    coverIcon: '移',
    items: [
      ...toRefs(['歩', '移', '動', '熱', '血', '圧'], 'kanji'),
      ...toRefs([
        ...(kaigoByUnit['Berjalan & Mobilitas'] || []),
        ...(kaigoByUnit['Ruangan & Posisi'] || []),
        ...(kaigoByUnit['Tanda Vital & Alat'] || []).slice(0, 10)
      ], 'kotoba')
    ]
  },
  {
    id: 'ch_kaigo_4',
    bookId: 'book_kaigo_ssw',
    chapterNumber: 4,
    titleJp: '第4章：解剖生理・疼痛・観察記録 (30語)',
    titleId: 'Bab 4: Istilah Medis, Bagian Nyeri, & Observasi',
    subtitle: 'Mengenali Keluhan Sakit & Gejala Pasien',
    description: 'Bagian tubuh yang sakit, pembengkakan (fushu), luka tekan (tokozure), organ dalam, dan istilah keluhan fisik.',
    coverIcon: '痛',
    items: [
      ...toRefs(['痛', '患', '背', '肩', '腕', '医', '院'], 'kanji'),
      ...toRefs([
        ...(kaigoByUnit['Nyeri & Posisi Tubuh'] || []).slice(0, 15),
        ...(kaigoByUnit['Medis & Organ'] || []).slice(0, 15)
      ], 'kotoba')
    ]
  },
  {
    id: 'ch_kaigo_5',
    bookId: 'book_kaigo_ssw',
    chapterNumber: 5,
    titleJp: '第5章：多職種連携・ご家族・特定技能 (35語)',
    titleId: 'Bab 5: Komunikasi Tim, Rekam Medis, & SSW',
    subtitle: 'Operan Tugas (Moushiokuri) & Etika Kerja',
    description: 'Menulis buku catatan perawatan, operan pergantian shift kerja, penyambutan keluarga pasien, dan kosakata kerja SSW.',
    coverIcon: '介',
    items: [
      ...toRefs(['記', '録', '報', '告', '師', '働', '場'], 'kanji'),
      ...toRefs([
        ...(kaigoByUnit['Dokumen & Tenaga Medis'] || []).slice(0, 15),
        ...(kaigoByUnit['Keluarga & Kunjungan'] || []).slice(0, 10),
        ...sswIds.slice(0, 10)
      ], 'kotoba')
    ]
  }
];

// -------------------------------------------------------------
// MASTER OFFICIAL & THEMATIC BOOKS LIST
// -------------------------------------------------------------
export const CURRICULUM_BOOKS: OfficialBook[] = [
  {
    id: 'book_kana_dojo',
    title: 'Kuil Aksara Kana Dojo',
    japaneseTitle: '修練の庭：仮名道場',
    subtitle: 'Fondasi 46 Hiragana & 46 Katakana',
    description: 'Panduan menulis kuas kaligrafi, pengenalan bentuk aksara, pelafalan dakuon, dan kosakata bacaan dasar untuk pemula.',
    level: 'KANA',
    category: 'curriculum',
    coverIcon: '仮',
    colorTheme: {
      accentColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      borderAccent: 'border-emerald-500/40 hover:border-emerald-500',
      cardBg: 'from-emerald-950/20 via-surface-card to-surface-card'
    },
    chapters: kanaChapters
  },
  {
    id: 'book_minna_n5',
    title: 'Minna no Nihongo I (N5)',
    japaneseTitle: 'みんなの日本語 初級 I',
    subtitle: 'Kurikulum Standar Bab 1〜25',
    description: 'Fondasi partikel bahasa Jepang, kata kerja harian, bentuk sopan -masu, bentuk santai futsukei, dan kanji dasar N5.',
    level: 'N5',
    category: 'curriculum',
    coverIcon: '初',
    colorTheme: {
      accentColor: 'text-teal',
      badgeBg: 'bg-teal/15 text-teal border-teal/30',
      borderAccent: 'border-teal/40 hover:border-teal',
      cardBg: 'from-teal/10 via-surface-card to-surface-card'
    },
    chapters: minnaN5Chapters
  },
  {
    id: 'book_minna_n4',
    title: 'Minna no Nihongo II (N4)',
    japaneseTitle: 'みんなの日本語 初級 II',
    subtitle: 'Kurikulum Pra-Menengah Bab 26〜50',
    description: 'Konjugasi bentuk potensial (bisa), kalimat pasif, kausatif (menyuruh), memberi-menerima, pengandaian, dan sopan santun Keigo.',
    level: 'N4',
    category: 'curriculum',
    coverIcon: '進',
    colorTheme: {
      accentColor: 'text-sky-500',
      badgeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      borderAccent: 'border-sky-500/40 hover:border-sky-500',
      cardBg: 'from-sky-950/20 via-surface-card to-surface-card'
    },
    chapters: minnaN4Chapters
  },
  {
    id: 'book_soumatome_n3',
    title: 'Nihongo Soumatome N3',
    japaneseTitle: '日本語総まとめ N3 文法・漢字・語彙',
    subtitle: 'Peta Terstruktur 6 Minggu Menengah',
    description: 'Buku teks terpopuler untuk persiapan JLPT N3: 132 pola kalimat esensial dibagi rapi ke dalam 6 minggu pembelajaran mandiri.',
    level: 'N3',
    category: 'curriculum',
    coverIcon: '志',
    colorTheme: {
      accentColor: 'text-gold',
      badgeBg: 'bg-gold/15 text-gold border-gold/30',
      borderAccent: 'border-gold/40 hover:border-gold',
      cardBg: 'from-gold/10 via-surface-card to-surface-card'
    },
    chapters: soumatomeN3Chapters
  },
  {
    id: 'book_kanzen_n2',
    title: 'Shin Kanzen Master N2',
    japaneseTitle: '新完全マスター N2 文法・語彙',
    subtitle: 'Kurikulum Mahir Wacana & Presisi Nuansa',
    description: 'Buku rujukan utama pembelajar tingkat mahir untuk menguasai perbedaan tipis pola kalimat formal, berita, dan logika bisnis.',
    level: 'N2',
    category: 'curriculum',
    coverIcon: '達',
    colorTheme: {
      accentColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      borderAccent: 'border-purple-500/40 hover:border-purple-500',
      cardBg: 'from-purple-950/20 via-surface-card to-surface-card'
    },
    chapters: kanzenN2Chapters
  },
  {
    id: 'book_kanzen_n1',
    title: 'Shin Kanzen Master N1',
    japaneseTitle: '新完全マスター N1 頂点の領域',
    subtitle: 'Puncak Tertinggi Tata Bahasa Sastra & Filosofis',
    description: 'Penguasaan kalimat ekspresif, idiom sastra kuno, dan wacana akademis tingkat penutur asli untuk target skor maksimal N1.',
    level: 'N1',
    category: 'curriculum',
    coverIcon: '頂',
    colorTheme: {
      accentColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      borderAccent: 'border-rose-500/40 hover:border-rose-500',
      cardBg: 'from-rose-950/20 via-surface-card to-surface-card'
    },
    chapters: kanzenN1Chapters
  },
  {
    id: 'book_kaigo_ssw',
    title: 'Keperawatan Kaigo & Tokutei Ginou',
    japaneseTitle: '介護の日本語と特定技能実務',
    subtitle: 'Panduan Bahasa Kerja Praktis Caregiver Jepang',
    description: '397 Kosakata & ekspresi komunikasi lapangan: bantuan makan, mandi, mobilitas, tanda vital, rekam medis, dan etika kerja panti lansia.',
    level: 'Kaigo',
    category: 'curriculum',
    coverIcon: '介',
    colorTheme: {
      accentColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      borderAccent: 'border-amber-500/40 hover:border-amber-500',
      cardBg: 'from-amber-950/20 via-surface-card to-surface-card'
    },
    chapters: kaigoChapters
  }
];

export { THEMATIC_BOOKS };

export const OFFICIAL_BOOKS: OfficialBook[] = [
  ...CURRICULUM_BOOKS,
  ...THEMATIC_BOOKS
];

/**
 * Get an official book by its ID
 */
export function getOfficialBookById(id: string): OfficialBook | undefined {
  return OFFICIAL_BOOKS.find(b => b.id === id);
}

/**
 * Convert an OfficialChapter to a playable UserDeck virtual object
 */
export function chapterToUserDeck(chapter: OfficialChapter, book: OfficialBook): UserDeck {
  return {
    id: chapter.id,
    title: `${book.title}: ${chapter.titleId}`,
    description: chapter.description || `${book.title} - Bab ${chapter.chapterNumber}`,
    level: book.level,
    type: 'mixed',
    isDefault: false,
    coverIcon: chapter.coverIcon || book.coverIcon,
    createdAt: now,
    updatedAt: now,
    items: chapter.items
  };
}

/**
 * Convert an entire OfficialBook into a comprehensive Master UserDeck (for "Ujian Akbar")
 */
export function bookToFullUserDeck(book: OfficialBook): UserDeck {
  const allItems: DeckItemRef[] = [];
  const seen = new Set<string>();

  for (const ch of book.chapters) {
    for (const it of ch.items) {
      const key = `${it.category}_${it.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        allItems.push(it);
      }
    }
  }

  return {
    id: `full_${book.id}`,
    title: `${book.title} (Seluruh Bab)`,
    description: `Ujian Komprehensif Seluruh Bab ${book.title} (${book.chapters.length} Bab · ${allItems.length} Materi)`,
    level: book.level,
    type: 'mixed',
    isDefault: false,
    coverIcon: book.coverIcon,
    createdAt: now,
    updatedAt: now,
    items: allItems
  };
}

/**
 * Clone an OfficialChapter into user's personal decks in Buku Saku
 */
export function cloneChapterToUserDecks(
  chapter: OfficialChapter,
  book: OfficialBook,
  currentDecks: UserDeck[] = []
): { updatedDecks: UserDeck[]; clonedDeck: UserDeck } {
  const newId = `deck_cloned_ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const clonedDeck: UserDeck = {
    id: newId,
    title: `${book.title}: ${chapter.titleId} (Salinan)`,
    description: chapter.description || `Salinan materi dari ${book.title}`,
    level: book.level,
    type: 'mixed',
    isDefault: false,
    coverIcon: chapter.coverIcon || book.coverIcon,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: chapter.items.map(item => ({ ...item, addedAt: new Date().toISOString() }))
  };

  return {
    updatedDecks: [clonedDeck, ...currentDecks],
    clonedDeck
  };
}
