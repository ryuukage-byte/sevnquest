import * as wanakana from 'wanakana';
import { explainVerbConjugation } from '../engine/morphology/inflectionEngine';
import type { ConjugationForm, VerbGroup as EngineVerbGroup } from '../engine/types';
import { CONJUGATION_FORMS_INFO } from './conjugationRules';

/* ==========================================================================
   GRAMMAR ANIMATION: resep pola = bentuk verba + akhiran pola.
   Perubahan bentuk verba SELALU dari engine morfologi (explainVerbConjugation);
   resep hanya menyatakan bentuk mana yang dipakai dan apa yang ditempel sesudahnya.
   ========================================================================== */

export interface GrammarAnimationRecipe {
  bunpouId: string;
  /** Bentuk verba yang dipakai pola ini. */
  form: ConjugationForm;
  /** Akhiran pola, ditempel langsung setelah bentuk verba; kosong = bentuk verba itu sendiri polanya. */
  suffix: string;
  /** Bacaan akhiran (kana), wajib bila akhiran memuat kanji. */
  suffixReading?: string;
  /** Arti kalimat jadi; {v} diganti arti verba (huruf kecil), {V} versi berhuruf besar. */
  meaningTemplate: string;
  /** Penjelasan saat bagian akhiran diketuk; default dibuat dari bentuk + akhiran. */
  suffixNote?: string;
  defaultVerbId: string;
  /** Verba yang tidak wajar untuk pola ini (kolokasi), dikeluarkan dari contoh. */
  excludeVerbIds?: string[];
  /** Pola juga punya cabang kata benda/sifat; animasi hanya menunjukkan cabang verba. */
  verbBranchOnly?: boolean;
}

export type GrammarVerbCategory = 'gol1' | 'gol2' | 'gol3' | 'khusus';

export interface GrammarAnimationVerb {
  id: string;
  kanji: string;
  reading: string;
  meaningId: string;
  category: GrammarVerbCategory;
  /** Kenapa verba ini khusus; tampil di tahap bentuk kamus. */
  specialNote?: string;
}

/** Contoh inti: satu Golongan 1, satu Golongan 2, dan kedua verba Golongan 3. */
const CORE_VERBS: GrammarAnimationVerb[] = [
  { id: 'v_kaku', kanji: '書く', reading: 'かく', meaningId: 'Menulis', category: 'gol1' },
  { id: 'v_taberu', kanji: '食べる', reading: 'たべる', meaningId: 'Makan', category: 'gol2' },
  { id: 'v_suru', kanji: 'する', reading: 'する', meaningId: 'Melakukan', category: 'gol3' },
  { id: 'v_kuru', kanji: '来る', reading: 'くる', meaningId: 'Datang', category: 'gol3' },
];

const SPECIAL_VERBS: Record<string, GrammarAnimationVerb> = {
  v_kaeru: {
    id: 'v_kaeru', kanji: '帰る', reading: 'かえる', meaningId: 'Pulang', category: 'khusus',
    specialNote: 'Meski berakhiran -eru seperti Golongan 2, る-nya tidak sekadar dibuang.',
  },
  v_hairu: {
    id: 'v_hairu', kanji: '入る', reading: 'はいる', meaningId: 'Masuk', category: 'khusus',
    specialNote: 'Meski berakhiran -iru seperti Golongan 2, る-nya tidak sekadar dibuang.',
  },
  v_iku: {
    id: 'v_iku', kanji: '行く', reading: 'いく', meaningId: 'Pergi', category: 'khusus',
    specialNote: 'Pengecualian bentuk て/た: 行って / 行った, bukan 行いて / 行いた.',
  },
  v_kau: {
    id: 'v_kau', kanji: '買う', reading: 'かう', meaningId: 'Membeli', category: 'khusus',
    specialNote: 'Akhiran う berubah menjadi わ, bukan あ: 買わない.',
  },
};

export const MAX_SPECIAL_VERBS = 3;

/** Verba khusus per bentuk: hanya yang perubahannya memang istimewa untuk bentuk itu. */
const SPECIALS_BY_FORM: Partial<Record<ConjugationForm, string[]>> = {
  te: ['v_iku', 'v_kaeru', 'v_hairu'],
  ta: ['v_iku', 'v_kaeru', 'v_hairu'],
  nai: ['v_kaeru', 'v_hairu', 'v_kau'],
  masu_stem: ['v_kaeru', 'v_hairu'],
};

type RecipeOptions = Partial<Pick<GrammarAnimationRecipe, 'suffixReading' | 'suffixNote' | 'defaultVerbId' | 'excludeVerbIds' | 'verbBranchOnly'>>;

function r(bunpouId: string, form: ConjugationForm, suffix: string, meaningTemplate: string, opts: RecipeOptions = {}): GrammarAnimationRecipe {
  return { bunpouId, form, suffix, meaningTemplate, defaultVerbId: 'v_kaku', ...opts };
}

const NO_KURU = ['v_kuru'];
/** Verba gerak/intransitif yang tidak wajar untuk verba majemuk tertentu. */
const NO_MOTION = ['v_kuru', 'v_kaeru', 'v_hairu', 'v_iku'];
/** Cabang verba saja; pola juga punya cabang kata benda/sifat. */
const VB = { verbBranchOnly: true } as const;

/*
 * Hanya pola yang cabang verbanya = satu bentuk + akhiran tetap, dan produktif untuk verba umum.
 * Sengaja dilewati: kontraksi (ちゃう/とく), pola yang membuang ない (ず/ざる/なければ), pola bercabang
 * (たり〜たり, Vる／Vない), kausatif/pasif, pola berawalan wajib (お〜ください, もし〜たら), dan pola
 * berkolokasi sempit (に忍びない, てやまない, 〜たて, …) yang akan janggal dengan verba contoh.
 */
export const GRAMMAR_ANIMATION_RECIPES: GrammarAnimationRecipe[] = [
  // ── Bentuk て ─────────────────────────────────────────────
  r('bp_n5_053', 'te', 'ください', 'Tolong {v}.', {
    suffixNote: 'ください ditempel setelah bentuk て untuk meminta seseorang melakukan sesuatu dengan sopan.',
  }),
  r('bp_n5_057', 'te', 'もいいです', 'Boleh {v}.', {
    suffixNote: 'もいいです ditempel setelah bentuk て untuk memberi atau meminta izin ("boleh ...").',
  }),
  r('bp_n5_048', 'te', '', '{V}, lalu …'),
  r('bp_n4_093', 'te', '', '{V}, lalu / karena itu …'),
  r('bp_n4_012', 'te', '', 'Tolong {v} ya. (santai)'),
  r('bp_n5_050', 'te', 'ある', 'Sudah {v} (hasilnya masih ada).', { excludeVerbIds: NO_MOTION }),
  r('bp_n5_051', 'te', 'いる', 'Sedang {v}.'),
  r('bp_n5_052', 'te', 'から', 'Setelah {v}, …'),
  r('bp_n5_055', 'te', 'はいけない', 'Tidak boleh {v}.'),
  r('bp_n4_020', 'te', 'いる間', 'Selama {v}, …', { suffixReading: 'いるあいだ', ...VB }),
  r('bp_n4_021', 'te', 'いる間に', 'Selagi {v}, …', { suffixReading: 'いるあいだに', ...VB }),
  r('bp_n4_094', 'te', 'あげる', '{V} untuk orang lain.'),
  r('bp_n4_095', 'te', 'いく', 'Terus {v} (ke depannya).', { excludeVerbIds: ['v_kuru', 'v_iku'] }),
  r('bp_n4_096', 'te', 'いました', 'Tadi sedang {v}.'),
  r('bp_n4_097', 'te', 'いただけませんか', 'Bisakah Anda {v}?'),
  r('bp_n4_098', 'te', 'いるところです', 'Sedang {v} saat ini.'),
  r('bp_n4_099', 'te', 'おく', '{V} terlebih dahulu.'),
  r('bp_n4_100', 'te', 'くる', '{V} dulu, lalu kembali.', { excludeVerbIds: NO_KURU }),
  r('bp_n4_101', 'te', 'くれてありがとう', 'Terima kasih sudah {v}.'),
  r('bp_n4_102', 'te', 'くれない', 'Bisa tolong {v}?'),
  r('bp_n4_103', 'te', 'くれる', '(Seseorang) {v} untukku.'),
  r('bp_n4_105', 'te', 'しまう', 'Terlanjur / sudah tuntas {v}.'),
  r('bp_n4_106', 'te', 'すみません', 'Maaf sudah {v}.'),
  r('bp_n4_110', 'te', 'みる', 'Mencoba {v}.'),
  r('bp_n4_111', 'te', 'も', 'Meskipun {v}, …', VB),
  r('bp_n4_113', 'te', 'もらう', 'Minta orang lain {v} (untukku).'),
  r('bp_n4_114', 'te', 'やる', '{V} untuk orang (yang lebih rendah).'),
  r('bp_n4_156', 'te', 'ばかりいる', 'Kerjanya {v} melulu.', VB),
  r('w2d1g1', 'te', 'ばかりいる', 'Kerjanya {v} melulu.', VB),
  r('w2d6g1', 'te', 'ごらん', 'Coba {v} deh.'),
  r('w3d1g1', 'te', 'も', 'Meskipun {v}, …', VB),
  r('w3d4g4', 'te', 'いる最中に', 'Di tengah-tengah {v}, …', { suffixReading: 'いるさいちゅうに', ...VB }),
  r('bp_n2_080', 'te', 'いては', 'Kalau terus {v}, (akibatnya buruk).'),
  r('bp_n2_081', 'te', '以来', 'Sejak {v}, …', { suffixReading: 'いらい', ...VB }),
  r('bp_n2_082', 'te', 'こそ', 'Justru dengan {v}, …'),
  r('bp_n2_085', 'te', 'ちょうだい', 'Tolong {v} ya.'),
  r('bp_n2_086', 'te', 'でも', 'Bahkan sampai harus {v}, …'),
  r('bp_n2_087', 'te', '当然だ', 'Wajar saja {v}.', { suffixReading: 'とうぜんだ', ...VB }),
  r('bp_n2_089', 'te', 'は', 'Kalau {v} (begitu), …'),
  r('bp_n2_091', 'te', 'はいられない', 'Tidak bisa terus {v}.'),
  r('bp_n2_092', 'te', 'ばかりはいられない', 'Tidak bisa terus-terusan {v}.'),
  r('bp_n2_093', 'te', 'はならない', 'Tidak boleh {v}.'),
  r('bp_n2_095', 'te', 'まで', 'Sampai-sampai harus {v}, …'),
  r('bp_n1_088', 'te', 'からというもの', 'Sejak {v}, (terus) …'),
  r('bp_n1_089', 'te', 'しかるべきだ', 'Sudah sepantasnya {v}.'),
  r('bp_n1_090', 'te', '済むことではない', 'Tidak cukup selesai hanya dengan {v}.', { suffixReading: 'すむことではない' }),
  r('bp_n1_095', 'te', 'みせる', 'Akan kubuktikan aku bisa {v}!'),
  r('bp_n1_097', 'te', 'も差し支えない', 'Tidak masalah kalau {v}.', { suffixReading: 'もさしつかえない', ...VB }),
  r('bp_n1_098', 'te', 'も知らない', 'Kalau sampai {v}, aku tak mau tahu.', { suffixReading: 'もしらない' }),
  r('bp_n1_099', 'te', 'もどうにもならない', 'Percuma meski {v}.'),

  // ── Bentuk た ─────────────────────────────────────────────
  r('bp_n5_040', 'ta', 'ことがある', 'Pernah {v}.', {
    suffixNote: 'ことがある ditempel setelah bentuk た untuk menyatakan pengalaman yang pernah dialami.',
  }),
  r('bp_n5_101', 'ta', 'ほうがいい', 'Sebaiknya {v}.'),
  r('bp_n4_022', 'ta', '後で', 'Setelah {v}, …', { suffixReading: 'あとで', ...VB }),
  r('bp_n4_086', 'ta', 'ところです', 'Baru saja selesai {v}.'),
  r('bp_n4_087', 'ta', 'ばかりです', 'Baru saja {v}.'),
  r('bp_n4_088', 'ta', 'ら', 'Kalau / setelah {v}, …', VB),
  r('bp_n4_090', 'ta', 'らどうですか', 'Bagaimana kalau {v}?'),
  r('w3d3g4', 'ta', 'ものだ', 'Dulu sering {v}.'),
  r('w3d4g3', 'ta', 'とたん', 'Begitu {v}, tiba-tiba …'),
  r('w4d5g1', 'ta', 'っけ', 'Sudah {v}, ya? (mengingat-ingat)', VB),
  r('w6d3g1', 'ta', 'ところ', 'Setelah {v}, ternyata …'),
  r('w6d3g4', 'ta', 'ところで', 'Biarpun {v}, percuma.'),
  r('bp_n2_002', 'ta', 'あげく', 'Setelah lama {v}, akhirnya …', VB),
  r('bp_n2_025', 'ta', '甲斐がある', 'Tidak sia-sia {v}.', { suffixReading: 'かいがある', ...VB }),
  r('bp_n1_067', 'ta', 'ことにする', 'Anggap saja sudah {v}.'),
  r('bp_n1_069', 'ta', 'つもりはない', 'Tidak merasa / berniat sudah {v}.'),
  r('bp_n1_070', 'ta', 'ところで', 'Biarpun {v}, percuma.'),
  r('bp_n1_073', 'ta', 'はいいが', '{V} sih boleh saja, tapi …'),
  r('bp_n1_074', 'ta', '拍子に', 'Saat tak sengaja {v}, …', { suffixReading: 'ひょうしに', ...VB }),
  r('bp_n1_075', 'ta', 'ためしがない', 'Belum pernah sekali pun {v}.'),
  r('bp_n1_078', 'ta', 'ら最後', 'Sekali {v}, tamatlah.', { suffixReading: 'らさいご' }),
  r('bp_n1_226', 'ta', 'も同然だ', 'Sama saja dengan sudah {v}.', { suffixReading: 'もどうぜんだ', ...VB }),

  // ── Bentuk ない ───────────────────────────────────────────
  r('bp_n5_070', 'nai', 'でください', 'Tolong jangan {v}.', {
    suffixNote: 'でください ditempel setelah bentuk ない untuk meminta seseorang TIDAK melakukan sesuatu dengan sopan.',
    defaultVerbId: 'v_taberu',
  }),
  r('bp_n5_069', 'nai', 'で', 'Tanpa {v}, …'),
  r('bp_n5_071', 'nai', 'といけない', 'Harus {v}.'),
  r('bp_n5_072', 'nai', 'ほうがいい', 'Sebaiknya jangan {v}.'),
  r('bp_n4_015', 'nai', 'で', 'Jangan {v} ya. (santai)'),
  r('bp_n4_131', 'nai', 'と', 'Harus {v} nih.'),
  r('w1d2g1', 'nai', 'と', 'Harus {v} nih.'),
  r('w6d2g4', 'nai', 'こともない', 'Bukannya tidak mungkin {v}.', VB),
  r('bp_n2_115', 'nai', 'ことには', 'Kalau tidak {v}, (tidak akan) …', VB),
  r('bp_n2_116', 'nai', 'ではいられない', 'Mau tak mau pasti {v}.'),
  r('bp_n2_117', 'nai', 'わけにはいかない', 'Tidak bisa tidak {v}.'),
  r('bp_n2_120', 'nai', 'で済む', 'Akhirnya tidak perlu {v}.', { suffixReading: 'ですむ' }),
  r('bp_n1_140', 'nai', 'でもない', 'Bukannya tidak {v}.'),
  r('bp_n1_141', 'nai', 'とも限らない', 'Bisa saja {v}.', { suffixReading: 'ともかぎらない', ...VB }),
  r('bp_n1_142', 'nai', 'までも', 'Meskipun tidak sampai {v}, …', VB),

  // ── Batang ます ───────────────────────────────────────────
  r('bp_n5_037', 'masu_stem', 'たいです', 'Saya ingin {v}.', {
    suffixNote: 'たい ditempel pada batang ます (bentuk ます tanpa ます) untuk menyatakan keinginan pembicara; です membuatnya sopan.',
    defaultVerbId: 'v_taberu',
  }),
  r('bp_n5_014', 'masu_stem', '方', 'Cara {v}.', { suffixReading: 'かた', excludeVerbIds: NO_KURU }),
  r('bp_n5_032', 'masu_stem', 'すぎる', 'Terlalu (banyak) {v}.', VB),
  r('bp_n5_083', 'masu_stem', 'に行く', 'Pergi untuk {v}.', { suffixReading: 'にいく', excludeVerbIds: ['v_kuru', 'v_kaeru'], ...VB }),
  r('bp_n5_103', 'masu_stem', 'ましょう', 'Ayo {v}.'),
  r('bp_n5_104', 'masu_stem', 'ましょうか', 'Bagaimana kalau saya / kita {v}?'),
  r('bp_n5_105', 'masu_stem', 'ます', '{V}. (sopan)'),
  r('bp_n5_106', 'masu_stem', 'ませんか', 'Maukah {v} bersama?'),
  r('bp_n4_001', 'masu_stem', '終わる', 'Selesai {v}.', { suffixReading: 'おわる', excludeVerbIds: NO_MOTION }),
  r('bp_n4_003', 'masu_stem', '出す', 'Tiba-tiba mulai {v}.', { suffixReading: 'だす', excludeVerbIds: NO_MOTION }),
  r('bp_n4_004', 'masu_stem', '続ける', 'Terus {v}.', { suffixReading: 'つづける' }),
  r('bp_n4_005', 'masu_stem', 'づらい', 'Sulit {v} (tidak nyaman).'),
  r('bp_n4_006', 'masu_stem', '直す', '{V} ulang.', { suffixReading: 'なおす', excludeVerbIds: NO_MOTION }),
  r('bp_n4_007', 'masu_stem', 'にくい', 'Sulit {v}.'),
  r('bp_n4_008', 'masu_stem', '始める', 'Mulai {v}.', { suffixReading: 'はじめる' }),
  r('bp_n4_009', 'masu_stem', 'やすい', 'Mudah {v}.'),
  r('bp_n4_073', 'masu_stem', 'そうだ', 'Kelihatannya akan {v}.', VB),
  r('bp_n4_081', 'masu_stem', 'たがる', '(Dia) ingin {v}.'),
  r('bp_n4_133', 'masu_stem', 'ながら', 'Sambil {v}, …'),
  r('bp_n4_137', 'masu_stem', 'なさい', '{V}lah! (perintah)'),
  r('w1d5g3', 'masu_stem', 'ますように', 'Semoga (bisa) {v}!'),
  r('w3d5g3', 'masu_stem', 'っぱなし', 'Dibiarkan begitu saja setelah {v}.', { excludeVerbIds: NO_KURU }),
  r('w5d2g3', 'masu_stem', 'かける', 'Baru setengah jalan {v}.', { excludeVerbIds: NO_KURU }),
  r('bp_n2_015', 'masu_stem', '得ない', 'Tidak mungkin {v}.', { suffixReading: 'えない', excludeVerbIds: NO_KURU }),
  r('bp_n2_016', 'masu_stem', '得る', 'Bisa saja {v}.', { suffixReading: 'える', excludeVerbIds: NO_KURU }),
  r('bp_n2_030', 'masu_stem', 'かねない', 'Bisa-bisa (malah) {v}.'),
  r('bp_n2_031', 'masu_stem', 'かねます', 'Mohon maaf, sulit untuk {v}.'),
  r('bp_n2_074', 'masu_stem', 'たまえ', '{V}lah. (perintah atasan)'),
  r('bp_n2_077', 'masu_stem', 'っこない', 'Mana mungkin {v}.'),
  r('bp_n2_078', 'masu_stem', 'つつ', 'Sambil {v}, …'),
  r('bp_n2_079', 'masu_stem', 'つつある', 'Sedang dalam proses {v}.'),
  r('bp_n2_084', 'masu_stem', 'たくてたまらない', 'Ingin sekali {v}.', VB),
  r('bp_n2_161', 'masu_stem', '抜く', '{V} sampai tuntas.', { suffixReading: 'ぬく', excludeVerbIds: NO_MOTION }),
  r('bp_n1_024', 'masu_stem', 'がてら', 'Sekalian {v}, …', { excludeVerbIds: NO_KURU, ...VB }),
  r('bp_n1_064', 'masu_stem', '損なう', 'Gagal / terlewat {v}.', { suffixReading: 'そこなう', excludeVerbIds: NO_KURU }),
  r('bp_n1_066', 'masu_stem', 'そびれる', 'Terlewat kesempatan untuk {v}.', { excludeVerbIds: NO_KURU }),
  r('bp_n1_083', 'masu_stem', '尽くす', '{V} sampai habis-habisan.', { suffixReading: 'つくす', excludeVerbIds: NO_MOTION }),
  r('bp_n1_214', 'masu_stem', '放題', 'Bebas {v} sepuasnya.', { suffixReading: 'ほうだい', excludeVerbIds: NO_MOTION }),
  r('bp_n1_216', 'masu_stem', 'まくる', 'Terus-terusan {v} tanpa henti.', { excludeVerbIds: NO_KURU }),
  r('bp_n1_225', 'masu_stem', 'もしないで', 'Tanpa {v} sedikit pun, …', VB),
  r('bp_n1_235', 'masu_stem', 'やしない', 'Sama sekali tidak {v}.'),

  // ── Bentuk kamus ──────────────────────────────────────────
  r('bp_n5_039', 'jisho', 'だけ', 'Hanya {v} saja.', VB),
  r('bp_n5_044', 'jisho', 'だろう', 'Mungkin akan {v}.', VB),
  r('bp_n5_067', 'jisho', 'な', 'Jangan {v}!'),
  r('bp_n5_091', 'jisho', 'のが上手です', 'Pandai {v}.', { suffixReading: 'のがじょうずです', excludeVerbIds: NO_KURU }),
  r('bp_n5_092', 'jisho', 'のが好きです', 'Suka {v}.', { suffixReading: 'のがすきです' }),
  r('bp_n5_093', 'jisho', 'のが下手です', 'Tidak pandai {v}.', { suffixReading: 'のがへたです', excludeVerbIds: NO_KURU }),
  r('bp_n5_102', 'jisho', '前に', 'Sebelum {v}, …', { suffixReading: 'まえに', ...VB }),
  r('bp_n5_109', 'jisho', 'まで', 'Sampai {v}, …', VB),
  r('bp_n4_052', 'jisho', 'ことがある', 'Kadang-kadang {v}.'),
  r('bp_n4_053', 'jisho', 'ことができる', 'Bisa {v}.'),
  r('bp_n4_054', 'jisho', 'ごとに', 'Setiap kali {v}, …', VB),
  r('bp_n4_082', 'jisho', 'だけで', 'Hanya dengan {v} saja, …', VB),
  r('bp_n4_150', 'jisho', 'のに', 'Untuk {v}, (dibutuhkan) …'),
  r('bp_n4_160', 'jisho', '必要がある', 'Perlu {v}.', { suffixReading: 'ひつようがある', ...VB }),
  r('bp_n4_166', 'jisho', 'までに', 'Sebelum (batas) {v}, …', VB),
  r('bp_n4_182', 'jisho', '予定だ', 'Berencana {v}.', { suffixReading: 'よていだ', ...VB }),
  r('bp_n4_186', 'jisho', 'ところだ', 'Baru akan {v}.'),
  r('w1d4g3', 'jisho', 'ようになる', 'Jadi (mulai terbiasa) {v}.'),
  r('w3d3g3', 'jisho', 'べきだ', 'Seharusnya {v}.', VB),
  r('w3d4g2', 'jisho', 'たびに', 'Setiap kali {v}, …', VB),
  r('w4d4g1', 'jisho', 'ことはない', 'Tidak perlu sampai {v}.'),
  r('w4d5g2', 'jisho', 'しかない', 'Tidak ada pilihan selain {v}.'),
  r('w5d4g1', 'jisho', 'まで', 'Sampai {v}, …'),
  r('w6d3g2', 'jisho', 'ところだった', 'Hampir saja {v}.'),
  r('bp_n2_020', 'jisho', '恐れがある', 'Dikhawatirkan akan {v}.', { suffixReading: 'おそれがある', ...VB }),
  r('bp_n2_045', 'jisho', 'ことなく', 'Tanpa {v} sekali pun, …'),
  r('bp_n2_107', 'jisho', 'どころではない', 'Bukan saatnya untuk {v}.', VB),
  r('bp_n2_130', 'jisho', 'にあたって', 'Dalam rangka {v}, …', VB),
  r('bp_n2_140', 'jisho', 'に越したことはない', 'Paling baik kalau {v}.', { suffixReading: 'にこしたことはない', ...VB }),
  r('bp_n2_142', 'jisho', 'に際して', 'Pada saat {v}, …', { suffixReading: 'にさいして', ...VB }),
  r('bp_n2_143', 'jisho', 'に先立って', 'Sebelum {v}, (terlebih dahulu) …', { suffixReading: 'にさきだって', ...VB }),
  r('bp_n2_178', 'jisho', 'まい', 'Pasti tidak akan {v}.'),
  r('bp_n2_188', 'jisho', 'ものではない', 'Tidak seharusnya {v}.'),
  r('bp_n2_199', 'jisho', 'よりしかたがない', 'Tidak ada cara lain selain {v}.'),
  r('bp_n2_200', 'jisho', 'よりほかない', 'Tidak ada pilihan selain {v}.'),
  r('bp_n1_022', 'jisho', 'かたわら', 'Di samping {v}, (juga) …', VB),
  r('bp_n1_027', 'jisho', 'が早いか', 'Begitu {v}, langsung …', { suffixReading: 'がはやいか' }),
  r('bp_n1_036', 'jisho', 'くらいなら', 'Daripada {v}, lebih baik …'),
  r('bp_n1_047', 'jisho', 'ことなしに', 'Tanpa {v}, …'),
  r('bp_n1_048', 'jisho', 'ことのないように', 'Agar jangan sampai {v}.'),
  r('bp_n1_054', 'jisho', '始末だ', 'Akhirnya malah sampai {v}.', { suffixReading: 'しまつだ' }),
  r('bp_n1_061', 'jisho', '術がない', 'Tidak ada cara untuk {v}.', { suffixReading: 'すべがない' }),
  r('bp_n1_065', 'jisho', 'そばから', 'Baru saja {v}, langsung …'),
  r('bp_n1_138', 'jisho', 'ともなると', 'Kalau sudah sampai {v}, …', VB),
  r('bp_n1_163', 'jisho', 'に至っても', 'Bahkan sampai {v} pun, …', { suffixReading: 'にいたっても', ...VB }),
  r('bp_n1_164', 'jisho', 'に至る', 'Sampai akhirnya {v}.', { suffixReading: 'にいたる', ...VB }),
  r('bp_n1_186', 'jisho', 'には及ばない', 'Tidak perlu sampai {v}.', { suffixReading: 'にはおよばない', ...VB }),
  r('bp_n1_205', 'jisho', '羽目になる', 'Akhirnya terpaksa {v}.', { suffixReading: 'はめになる' }),
  r('bp_n1_209', 'jisho', 'べからず', 'Dilarang {v}.'),
  r('bp_n1_210', 'jisho', 'べく', 'Demi {v}, …'),
  r('bp_n1_213', 'jisho', 'ほうがましだ', 'Lebih baik {v} (daripada …).', VB),
  r('bp_n1_215', 'jisho', 'ほどのことではない', 'Tidak sampai perlu {v}.', VB),
  r('bp_n1_219', 'jisho', 'までもない', 'Tidak perlu sampai {v}.'),
  r('bp_n1_234', 'jisho', 'や否や', 'Begitu {v}, langsung …', { suffixReading: 'やいなや' }),
];

const RECIPE_BY_ID = new Map(GRAMMAR_ANIMATION_RECIPES.map(rec => [rec.bunpouId, rec]));

export function getGrammarAnimationRecipe(bunpouId: string): GrammarAnimationRecipe | undefined {
  return RECIPE_BY_ID.get(bunpouId);
}

/** Verba contoh untuk satu pola: verba inti + verba khusus bentuk itu, tanpa yang dikecualikan pola. */
export function getRecipeVerbs(recipe: GrammarAnimationRecipe): GrammarAnimationVerb[] {
  const specials = (SPECIALS_BY_FORM[recipe.form] ?? []).map(id => SPECIAL_VERBS[id]).slice(0, MAX_SPECIAL_VERBS);
  const excluded = new Set(recipe.excludeVerbIds ?? []);
  return [...CORE_VERBS, ...specials].filter(v => !excluded.has(v.id));
}

export type GrammarSegmentRole = 'stem' | 'ending' | 'removed' | 'added' | 'suffix';

export interface GrammarSegment {
  text: string;
  role: GrammarSegmentRole;
}

export interface GrammarAnimationStage {
  kind: 'base' | 'remove' | 'add' | 'suffix' | 'result';
  label: string;
  note: string;
  segments: GrammarSegment[];
}

export interface GrammarAnimation {
  stages: GrammarAnimationStage[];
  result: { japanese: string; reading: string; romaji: string; meaning: string };
}

const GROUP_NAME: Record<EngineVerbGroup, string> = {
  godan: 'Golongan 1 (Godan)',
  ichidan: 'Golongan 2 (Ichidan)',
  suru: 'Golongan 3 (Irregular)',
  kuru: 'Golongan 3 (Irregular)',
};

const FORM_LABEL: Partial<Record<ConjugationForm, string>> = {
  jisho: 'Bentuk kamus',
  te: 'Bentuk て',
  nai: 'Bentuk ない',
  ta: 'Bentuk た',
  masu_stem: 'Batang ます',
};

/**
 * Baris aturan yang relevan dari ruleExplanation (CONJUGATION_FORMS_INFO) untuk verba ini.
 * Batang ます memakai aturan ます; た memakai aturan て (perubahannya identik, て→た / で→だ).
 */
function ruleNoteFor(form: ConjugationForm, group: EngineVerbGroup, word: string): string {
  const sourceId = form === 'masu_stem' ? 'masu' : form === 'ta' ? 'te' : form;
  const info = CONJUGATION_FORMS_INFO.find(f => f.id === sourceId);
  if (!info) return '';
  const ruleKey = group === 'godan' ? 'godan' : group === 'ichidan' ? 'ichidan' : 'irregular';
  const text = info.ruleExplanation[ruleKey];
  const ending = word.slice(-1);
  const bullets = text.split('\n').filter(l => l.startsWith('•'));
  const match = bullets.find(l => {
    const left = l.split('→')[0];
    return ruleKey === 'irregular' ? left.includes(word) : left.includes(ending);
  });
  let note = match ? match.replace(/^•\s*/, '') : text.replace(/\n/g, ' ');
  if (form === 'masu_stem') note += ' Untuk batang ます, ます-nya dibuang.';
  if (form === 'ta') note += ' Lalu て→た / で→だ.';
  return note;
}

function fillMeaning(template: string, verb: GrammarAnimationVerb): string {
  const v = verb.meaningId.split('/')[0].trim().toLowerCase();
  return template.replace('{V}', v.charAt(0).toUpperCase() + v.slice(1)).replace('{v}', v);
}

export function buildGrammarAnimation(recipe: GrammarAnimationRecipe, verb: GrammarAnimationVerb): GrammarAnimation | null {
  const exp = explainVerbConjugation(verb.kanji, verb.reading, recipe.form);
  if (!exp) return null;

  const base = exp.base.japanese;
  const removeStep = exp.steps.find(s => s.kind === 'remove');
  const addStep = exp.steps.find(s => s.kind === 'add');
  const stem = removeStep ? removeStep.text : base;
  const removed = removeStep?.part ?? '';
  const added = addStep?.part ?? '';
  const formLabel = FORM_LABEL[recipe.form] ?? recipe.form;
  const rule = ruleNoteFor(recipe.form, exp.group, base);
  const keepNote = recipe.form === 'jisho' ? ' Pola ini memakai bentuk kamus apa adanya.' : '';

  const stages: GrammarAnimationStage[] = [
    {
      kind: 'base',
      label: 'Bentuk kamus',
      note: `${base} (${exp.base.reading}) termasuk ${GROUP_NAME[exp.group]}.${verb.specialNote ? ` ${verb.specialNote}` : ''}${keepNote}`,
      segments: [{ text: stem, role: 'stem' }, { text: removed, role: 'ending' }],
    },
  ];
  if (removed) {
    stages.push({
      kind: 'remove',
      label: `Buang 「${removed}」`,
      note: rule,
      segments: [{ text: stem, role: 'stem' }, { text: removed, role: 'removed' }],
    });
  }
  if (added) {
    stages.push({
      kind: 'add',
      label: `Tambah 「${added}」`,
      note: `${formLabel}: ${exp.result.japanese} (${exp.result.reading}).`,
      segments: [{ text: stem, role: 'stem' }, { text: added, role: 'added' }],
    });
  }
  if (recipe.suffix) {
    stages.push({
      kind: 'suffix',
      label: `＋ ${recipe.suffix}`,
      note: recipe.suffixNote ?? `「${recipe.suffix}」 ditempel langsung setelah ${formLabel.toLowerCase()}.`,
      segments: [{ text: stem, role: 'stem' }, { text: added, role: 'added' }, { text: recipe.suffix, role: 'suffix' }],
    });
  }

  const japanese = exp.result.japanese + recipe.suffix;
  const reading = exp.result.reading + (recipe.suffixReading ?? recipe.suffix);
  const meaning = fillMeaning(recipe.meaningTemplate, verb);
  stages.push({
    kind: 'result',
    label: 'Kalimat jadi',
    note: meaning,
    segments: [{ text: japanese, role: 'stem' }],
  });

  return { stages, result: { japanese, reading, romaji: wanakana.toRomaji(reading), meaning } };
}
