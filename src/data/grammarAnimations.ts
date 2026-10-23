import * as wanakana from 'wanakana';
import { detectVerbGroup, explainVerbConjugation } from '../engine/morphology/inflectionEngine';
import type { ConjugationForm, VerbGroup as EngineVerbGroup } from '../engine/types';
import { CONJUGATION_FORMS_INFO } from './conjugationRules';

/* ==========================================================================
   GRAMMAR ANIMATION: resep pola = bentuk verba (+ perubahan) + akhiran (+ kontraksi).
   Perubahan bentuk verba SELALU dari engine morfologi (explainVerbConjugation);
   resep hanya menyatakan bentuk mana yang dipakai dan apa yang ditempel sesudahnya.
   Pola bercabang (Vる／Vない, formal／kontraksi) punya beberapa cabang.
   ========================================================================== */

/** Penggantian teks di ujung bentuk verba; pasangan pertama yang cocok dipakai (mis. て/で bersuara). */
export interface GrammarTransform {
  pairs: [from: string, to: string][];
  note: string;
}

/** Satu cara membentuk pola: bentuk verba (+ perubahan) + akhiran (+ kontraksi). */
export interface GrammarBranch {
  /** Nama cabang di pemilih bentuk, mis. "Vる" / "Vない" / "ちゃう". */
  label: string;
  /** Bentuk verba dari engine. */
  form: ConjugationForm;
  /** Perubahan pada bentuk verba sebelum akhiran ditempel (mis. ない → なくて). */
  change?: GrammarTransform;
  /** Akhiran pola, ditempel langsung setelah bentuk verba; kosong = bentuk verba itu sendiri polanya. */
  suffix: string;
  /** Bacaan akhiran (kana), wajib bila akhiran memuat kanji. */
  suffixReading?: string;
  /** Kontraksi lisan setelah akhiran ditempel (mis. てしまう → ちゃう). */
  contract?: GrammarTransform;
  /** Arti kalimat jadi; {v} arti verba, {p} arti pasifnya, {w} arti verba kedua (huruf kecil); {V}/{P} berhuruf besar. */
  meaningTemplate: string;
  /** Penjelasan saat bagian akhiran diketuk; default dibuat dari bentuk + akhiran. */
  suffixNote?: string;
  /** Verba yang tidak berlaku untuk cabang ini saja (mis. bentuk singkat hanya untuk Golongan 1). */
  excludeVerbIds?: string[];
  /** Verba kedua (pola dua verba): diulang (same) atau verba pasangan tetap. */
  partner?: GrammarPartner;
  /** Akhiran penutup setelah verba kedua (mis. する pada たり〜たりする). */
  tail?: string;
  tailReading?: string;
  /** Kata di depan verba (もし, まだ, お, …). */
  prefix?: string;
  prefixReading?: string;
}

export interface GrammarPartner {
  form: ConjugationForm;
  change?: GrammarTransform;
  suffix: string;
  suffixReading?: string;
  /** true = verba yang sama diulang; false = verba pasangan (飲む). */
  same: boolean;
}

export interface GrammarAnimationRecipe {
  bunpouId: string;
  /** Satu cabang untuk pola biasa; beberapa untuk pola bercabang (Vる／Vない, formal／kontraksi). */
  branches: GrammarBranch[];
  defaultVerbId: string;
  /** Verba yang tidak wajar untuk pola ini (kolokasi), dikeluarkan dari contoh. */
  excludeVerbIds?: string[];
  /** Pola juga punya cabang kata benda/sifat; animasi hanya menunjukkan cabang verba. */
  verbBranchOnly?: boolean;
  /** Daftar verba khusus untuk pola berkolokasi sempit (menggantikan verba inti + khusus). */
  verbs?: GrammarAnimationVerb[];
}

export type GrammarVerbCategory = 'gol1' | 'gol2' | 'gol3' | 'khusus';

export interface GrammarAnimationVerb {
  id: string;
  kanji: string;
  reading: string;
  meaningId: string;
  category: GrammarVerbCategory;
  /** Arti bentuk pasif ("ditulis"); dipakai lewat {p} di template arti. */
  passiveId?: string;
  /** Kenapa verba ini khusus; tampil di tahap bentuk kamus. */
  specialNote?: string;
}

/** Contoh inti: dua Golongan 1, dua Golongan 2, dan kedua verba Golongan 3. */
const CORE_VERBS: GrammarAnimationVerb[] = [
  { id: 'v_kaku', kanji: '書く', reading: 'かく', meaningId: 'Menulis', passiveId: 'Ditulis', category: 'gol1' },
  { id: 'v_yomu', kanji: '読む', reading: 'よむ', meaningId: 'Membaca', passiveId: 'Dibaca', category: 'gol1' },
  { id: 'v_taberu', kanji: '食べる', reading: 'たべる', meaningId: 'Makan', passiveId: 'Dimakan', category: 'gol2' },
  { id: 'v_miru', kanji: '見る', reading: 'みる', meaningId: 'Melihat', passiveId: 'Dilihat', category: 'gol2' },
  { id: 'v_suru', kanji: 'する', reading: 'する', meaningId: 'Melakukan', passiveId: 'Dilakukan', category: 'gol3' },
  { id: 'v_kuru', kanji: '来る', reading: 'くる', meaningId: 'Datang', passiveId: 'Didatangi', category: 'gol3' },
];

const SPECIAL_VERBS: Record<string, GrammarAnimationVerb> = {
  v_kaeru: {
    id: 'v_kaeru', kanji: '帰る', reading: 'かえる', meaningId: 'Pulang', passiveId: 'Ditinggal pulang', category: 'khusus',
    specialNote: 'Meski berakhiran -eru seperti Golongan 2, る-nya tidak sekadar dibuang.',
  },
  v_hairu: {
    id: 'v_hairu', kanji: '入る', reading: 'はいる', meaningId: 'Masuk', passiveId: 'Dimasuki', category: 'khusus',
    specialNote: 'Meski berakhiran -iru seperti Golongan 2, る-nya tidak sekadar dibuang.',
  },
  v_iku: {
    id: 'v_iku', kanji: '行く', reading: 'いく', meaningId: 'Pergi', passiveId: 'Ditinggal pergi', category: 'khusus',
    specialNote: 'Pengecualian bentuk て/た: 行って / 行った, bukan 行いて / 行いた.',
  },
  v_kau: {
    id: 'v_kau', kanji: '買う', reading: 'かう', meaningId: 'Membeli', passiveId: 'Dibeli', category: 'khusus',
    specialNote: 'Akhiran う berubah menjadi わ, bukan あ: 買わない, 買わせる, 買われる.',
  },
};

export const MAX_SPECIAL_VERBS = 3;

/** Verba khusus per bentuk: hanya yang perubahannya memang istimewa untuk bentuk itu. */
const SPECIALS_BY_FORM: Partial<Record<ConjugationForm, string[]>> = {
  te: ['v_iku', 'v_kaeru', 'v_hairu'],
  ta: ['v_iku', 'v_kaeru', 'v_hairu'],
  nai: ['v_kaeru', 'v_hairu', 'v_kau'],
  masu_stem: ['v_kaeru', 'v_hairu'],
  nakatta: ['v_kaeru', 'v_hairu', 'v_kau'],
  potential: ['v_kaeru', 'v_hairu'],
  ba: ['v_kaeru', 'v_hairu'],
  imperative: ['v_kaeru', 'v_hairu'],
  causative: ['v_kaeru', 'v_hairu', 'v_kau'],
  passive: ['v_kaeru', 'v_hairu', 'v_kau'],
  causative_passive: ['v_kaeru', 'v_hairu', 'v_kau'],
  volitional: ['v_kaeru', 'v_hairu'],
  masu: ['v_kaeru', 'v_hairu'],
};

type BranchOptions = Partial<Pick<GrammarBranch,
  'suffixReading' | 'suffixNote' | 'change' | 'contract' | 'excludeVerbIds' | 'partner' | 'tail' | 'tailReading' | 'prefix' | 'prefixReading'>>;
type RecipeOptions = Partial<Pick<GrammarAnimationRecipe, 'defaultVerbId' | 'excludeVerbIds' | 'verbBranchOnly' | 'verbs'>>;

/** Satu cabang pola. */
function b(label: string, form: ConjugationForm, suffix: string, meaningTemplate: string, opts: BranchOptions = {}): GrammarBranch {
  return { label, form, suffix, meaningTemplate, ...opts };
}

/** Pola satu cabang: bentuk + akhiran. */
function r(bunpouId: string, form: ConjugationForm, suffix: string, meaningTemplate: string, opts: BranchOptions & RecipeOptions = {}): GrammarAnimationRecipe {
  const { defaultVerbId, verbBranchOnly, verbs, excludeVerbIds, ...branchOpts } = opts;
  return {
    bunpouId,
    branches: [b(FORM_SHORT[form] ?? form, form, suffix, meaningTemplate, branchOpts)],
    defaultVerbId: defaultVerbId ?? verbs?.[0].id ?? 'v_kaku',
    verbBranchOnly, verbs, excludeVerbIds,
  };
}

/** Pola bercabang: beberapa cara membentuk, dipilih di pemilih bentuk. */
function rb(bunpouId: string, branches: GrammarBranch[], opts: RecipeOptions = {}): GrammarAnimationRecipe {
  const { defaultVerbId, ...rest } = opts;
  return { bunpouId, branches, defaultVerbId: defaultVerbId ?? opts.verbs?.[0].id ?? 'v_kaku', ...rest };
}

type PlainForm = 'jisho' | 'nai' | 'ta' | 'nakatta';
/** Frasa verba per bentuk biasa; {x}/{X} di template diganti frasa ini. */
const PLAIN_PHRASE: Record<PlainForm, [lower: string, upper: string]> = {
  jisho: ['{v}', '{V}'],
  nai: ['tidak {v}', 'Tidak {v}'],
  ta: ['sudah {v}', 'Sudah {v}'],
  nakatta: ['dulu tidak {v}', 'Dulu tidak {v}'],
};

/**
 * Pola "Kalimat [Bentuk Biasa] + X": cabang verba = 4 bentuk biasa (Vる／Vない／Vた／Vなかった)
 * dengan akhiran yang sama. Template memakai {x}/{X} untuk frasa verba tiap bentuk.
 */
function plain(bunpouId: string, suffix: string, template: string, opts: BranchOptions & RecipeOptions & { forms?: PlainForm[] } = {}): GrammarAnimationRecipe {
  const { forms = ['jisho', 'nai', 'ta', 'nakatta'], defaultVerbId, verbBranchOnly = true, verbs, excludeVerbIds, ...branchOpts } = opts;
  const branches = forms.map(f =>
    b(FORM_SHORT[f] ?? f, f, suffix, template.replace('{x}', PLAIN_PHRASE[f][0]).replace('{X}', PLAIN_PHRASE[f][1]), branchOpts),
  );
  return { bunpouId, branches, defaultVerbId: defaultVerbId ?? verbs?.[0].id ?? 'v_kaku', verbBranchOnly, verbs, excludeVerbIds };
}

/** Verba khusus untuk pola berkolokasi sempit; golongannya dideteksi engine. */
function cv(id: string, kanji: string, reading: string, meaningId: string, passiveId?: string): GrammarAnimationVerb {
  const g = detectVerbGroup(kanji, reading);
  const category: GrammarVerbCategory = g === 'godan' ? 'gol1' : g === 'ichidan' ? 'gol2' : 'gol3';
  return { id, kanji, reading, meaningId, passiveId, category };
}

/** Verba kedua untuk pola dua verba yang berbeda (たり〜たり, つ〜つ, …). */
export const PARTNER_VERB: GrammarAnimationVerb = {
  id: 'v_nomu', kanji: '飲む', reading: 'のむ', meaningId: 'Minum', passiveId: 'Diminum', category: 'gol1',
};

/** Pasangan verba: diulang (same) atau verba kedua 飲む. */
function pair(form: ConjugationForm, suffix: string, same: boolean, opts: Partial<Pick<GrammarPartner, 'change' | 'suffixReading'>> = {}): GrammarPartner {
  return { form, suffix, same, ...opts };
}

const FORM_SHORT: Partial<Record<ConjugationForm, string>> = {
  jisho: 'Vる', te: 'Vて', ta: 'Vた', nai: 'Vない', nakatta: 'Vなかった', masu_stem: 'Vます',
  potential: 'Vれる', ba: 'Vば', imperative: 'V perintah',
  causative: 'V(さ)せる', passive: 'V(ら)れる', causative_passive: 'V(さ)せられる',
  volitional: 'Vよう', masu: 'Vます', tai: 'Vたい',
};

/* Perubahan & kontraksi. Pasangan て/で: verba berakhiran ぬ/ぶ/む/ぐ memakai で. */
const CONTRACT_SHIMAU: GrammarTransform = {
  pairs: [['てしまう', 'ちゃう'], ['でしまう', 'じゃう']],
  note: 'Dalam percakapan santai, てしまう menyusut menjadi ちゃう (でしまう → じゃう).',
};
const CONTRACT_OKU: GrammarTransform = {
  pairs: [['ておく', 'とく'], ['でおく', 'どく']],
  note: 'Dalam percakapan santai, ておく menyusut menjadi とく (でおく → どく).',
};
const CONTRACT_TEWA: GrammarTransform = {
  pairs: [['ては', 'ちゃ'], ['では', 'じゃ']],
  note: 'Dalam percakapan santai, ては menyusut menjadi ちゃ (では → じゃ).',
};
const NAI_TO_NAKUTEWA: GrammarTransform = { pairs: [['ない', 'なくては']], note: 'ない diubah menjadi なく, lalu ditambah ては ("kalau tidak ...").' };
const CONTRACT_NAKUTEWA: GrammarTransform = { pairs: [['なくては', 'なくちゃ']], note: 'Dalam percakapan santai, なくては menyusut menjadi なくちゃ.' };
const NAI_TO_NAKEREBA: GrammarTransform = { pairs: [['ない', 'なければ']], note: 'ない diubah menjadi なければ (bentuk ば dari ない: "kalau tidak ...").' };
const CONTRACT_NAKEREBA: GrammarTransform = { pairs: [['なければ', 'なきゃ']], note: 'Dalam percakapan santai, なければ menyusut menjadi なきゃ.' };
const NAI_TO_NAKUTE: GrammarTransform = { pairs: [['ない', 'なくて']], note: 'ない diubah menjadi なくて (bentuk て dari ない).' };
const NAI_TO_NAKU: GrammarTransform = { pairs: [['ない', 'なく']], note: 'ない diubah menjadi なく agar bisa disambung dengan なる.' };
const RU_TO_TE: GrammarTransform = {
  pairs: [['る', 'て']],
  note: 'Bentuk ini berperilaku seperti verba Golongan 2: る diganti て (bentuk て).',
};
const RU_TO_TA: GrammarTransform = {
  pairs: [['る', 'た']],
  note: 'Bentuk ini berperilaku seperti verba Golongan 2: る diganti た (bentuk lampau).',
};
/** Kausatif-pasif singkat: hanya Golongan 1 yang tidak berakhiran す (書かされる, bukan 話さされる). */
const CONTRACT_CAUS_PASSIVE: GrammarTransform = {
  pairs: [['せられる', 'される']],
  note: 'Untuk Golongan 1 (kecuali akhiran す), せられる sering disingkat menjadi される.',
};
const NOT_GODAN = ['v_taberu', 'v_miru', 'v_suru', 'v_kuru'];
/* Negatif klasik dari bentuk ない. Khusus する: しない → せ〜 (せず, せざる, せぬ, せねば, せん). */
const NAI_TO_ZU: GrammarTransform = { pairs: [['しない', 'せず'], ['ない', 'ず']], note: 'ない diganti ず (negatif bahasa tulis). Khusus する: しない → せず.' };
const NAI_TO_ZARU: GrammarTransform = { pairs: [['しない', 'せざる'], ['ない', 'ざる']], note: 'ない diganti ざる (negatif klasik). Khusus する: しない → せざる.' };
const NAI_TO_NU: GrammarTransform = { pairs: [['しない', 'せぬ'], ['ない', 'ぬ']], note: 'ない diganti ぬ (negatif klasik). Khusus する: しない → せぬ.' };
const NAI_TO_NEBA: GrammarTransform = { pairs: [['しない', 'せねば'], ['ない', 'ねば']], note: 'ない diganti ねば ("kalau tidak", klasik). Khusus する: しない → せねば.' };
const NAI_TO_N: GrammarTransform = { pairs: [['しない', 'せん'], ['ない', 'ん']], note: 'ない diganti ん (negatif klasik). Khusus する: しない → せん.' };
const TAI_TO_STEM: GrammarTransform = { pairs: [['たい', 'た']], note: 'Batang たい: い di akhir たい dibuang.' };
const POTENTIAL_TO_NAI: GrammarTransform = { pairs: [['る', 'ない']], note: 'Bentuk potensial berperilaku seperti verba Golongan 2: る diganti ない.' };
const POTENTIAL_TO_MASU: GrammarTransform = {
  pairs: [['る', 'ます']],
  note: 'Bentuk potensial berperilaku seperti verba Golongan 2: る diganti ます.',
};

const NO_KURU = ['v_kuru'];
/** Verba gerak/intransitif yang tidak wajar untuk verba majemuk tertentu. */
const NO_MOTION = ['v_kuru', 'v_kaeru', 'v_hairu', 'v_iku'];
/* Daftar verba untuk pola berkolokasi sempit: hanya verba yang memang lazim dipakai dengan pola itu. */
const V_SONKEI = [cv('h_kaku', '書く', 'かく', 'Menulis'), cv('h_kaeru', '帰る', 'かえる', 'Pulang'), cv('h_matsu', '待つ', 'まつ', 'Menunggu'), cv('h_yomu', '読む', 'よむ', 'Membaca')];
const V_KENJOU = [cv('k_matsu', '待つ', 'まつ', 'Menunggu'), cv('k_motsu', '持つ', 'もつ', 'Membawakan'), cv('k_okuru', '送る', 'おくる', 'Mengirimkan'), cv('k_shiraberu', '調べる', 'しらべる', 'Memeriksakan')];
const V_HOPE = [cv('c_negau', '願う', 'ねがう', 'Mengharapkan'), cv('c_inoru', '祈る', 'いのる', 'Mendoakan'), cv('c_aisuru', '愛する', 'あいする', 'Mencintai')];
const V_GUESS = [cv('c_sassuru', '察する', 'さっする', 'Menduga'), cv('c_souzou', '想像する', 'そうぞうする', 'Membayangkan')];
const V_SHINOBI = [cv('c_miru', '見る', 'みる', 'Melihat'), cv('c_kiku', '聞く', 'きく', 'Mendengar'), cv('c_suteru', '捨てる', 'すてる', 'Membuang')];
const V_SENSE = [cv('c_miru', '見る', 'みる', 'Melihat'), cv('c_kiku', '聞く', 'きく', 'Mendengar')];
const V_SENSE_READ = [cv('c_miru', '見る', 'みる', 'Melihat'), cv('c_kiku', '聞く', 'きく', 'Mendengar'), cv('c_yomu', '読む', 'よむ', 'Membaca')];
const V_SENSE_THINK = [cv('c_miru', '見る', 'みる', 'Melihat'), cv('c_kiku', '聞く', 'きく', 'Mendengar'), cv('c_omou', '思う', 'おもう', 'Memikirkan')];
const V_TARINAI = [cv('c_toru', '取る', 'とる', 'Mengambil', 'Diperhitungkan'), cv('c_osoreru', '恐れる', 'おそれる', 'Takut', 'Ditakuti'), cv('c_shinjiru', '信じる', 'しんじる', 'Memercayai', 'Dipercaya')];
const V_TARU = [cv('c_shinrai', '信頼する', 'しんらいする', 'Memercayai', 'Dipercaya'), cv('c_sonkei', '尊敬する', 'そんけいする', 'Menghormati', 'Dihormati')];
const V_ATARANAI = [cv('c_odoroku', '驚く', 'おどろく', 'Heran'), cv('c_hinan', '非難する', 'ひなんする', 'Mengecam'), cv('c_kanashimu', '悲しむ', 'かなしむ', 'Bersedih')];
const V_BEKUMONAI = [cv('c_shiru', '知る', 'しる', 'Mengetahui'), cv('c_nozomu', '望む', 'のぞむ', 'Mengharapkan')];
const V_ATAI = [cv('c_yomu', '読む', 'よむ', 'Membaca', 'Dibaca'), cv('c_chuumoku', '注目する', 'ちゅうもくする', 'Memperhatikan', 'Diperhatikan'), cv('c_sonkei', '尊敬する', 'そんけいする', 'Menghormati', 'Dihormati')];
const V_DANI = [cv('c_kangaeru', '考える', 'かんがえる', 'Memikirkan'), cv('c_souzou', '想像する', 'そうぞうする', 'Membayangkan'), cv('c_kiku', '聞く', 'きく', 'Mendengar')];
const V_MAJIKI = [cv('c_yurusu', '許す', 'ゆるす', 'Memaafkan', 'Dimaafkan'), cv('c_iu', '言う', 'いう', 'Mengucapkan', 'Diucapkan')];
const V_GAMASHII = [cv('c_oshitsukeru', '押し付ける', 'おしつける', 'Memaksakan kehendak'), cv('c_sashideru', '差し出る', 'さしでる', 'Ikut campur')];
const V_BURI = [cv('c_hanasu', '話す', 'はなす', 'Berbicara'), cv('c_kurasu', '暮らす', 'くらす', 'Hidup sehari-hari'), cv('c_kaku', '書く', 'かく', 'Menulis')];
const V_KOSOSURE = [cv('c_yorokobu', '喜ぶ', 'よろこぶ', 'Senang'), cv('c_odoroku', '驚く', 'おどろく', 'Heran')];
const V_NAGARANI = [cv('c_umareru', '生まれる', 'うまれる', 'Lahir'), cv('c_iru', '居る', 'いる', 'Berada (di tempat)')];
const V_YOUNI = [cv('c_kangaeru', '考える', 'かんがえる', 'Berpikir'), cv('c_miru', '見る', 'みる', 'Memandang'), cv('c_iu', '言う', 'いう', 'Mengatakan')];
const V_TAGE = [cv('c_iu', '言う', 'いう', 'Berkata'), cv('c_kiku', '聞く', 'きく', 'Bertanya')];
const V_GAKE = [cv('c_kaeru', '帰る', 'かえる', 'Pulang'), cv('c_iku', '行く', 'いく', 'Pergi'), cv('c_deru', '出る', 'でる', 'Keluar rumah')];
const V_TENARANAI = [cv('c_omoeru', '思える', 'おもえる', 'Terpikirkan'), cv('c_nakeru', '泣ける', 'なける', 'Ingin menangis')];
const V_AGERU = [cv('c_kaku', '書く', 'かく', 'Menulis'), cv('c_tsukuru', '作る', 'つくる', 'Membuat'), cv('c_sodateru', '育てる', 'そだてる', 'Membesarkan')];
const V_KIRU = [cv('c_taberu', '食べる', 'たべる', 'Makan'), cv('c_tsukau', '使う', 'つかう', 'Memakai'), cv('c_yomu', '読む', 'よむ', 'Membaca')];
const V_TATE = [cv('c_yaku', '焼く', 'やく', 'Memanggang', 'Dipanggang'), cv('c_tsukuru', '作る', 'つくる', 'Membuat', 'Dibuat'), cv('c_taku', '炊く', 'たく', 'Menanak', 'Ditanak')];
const V_BEKUSHITE = [cv('c_okoru', '起こる', 'おこる', 'Terjadi'), cv('c_makeru', '負ける', 'まける', 'Kalah'), cv('c_katsu', '勝つ', 'かつ', 'Menang')];
const V_ZU_OKANAI = [cv('c_shiraberu', '調べる', 'しらべる', 'Menyelidiki'), cv('c_tsuikyuu', '追及する', 'ついきゅうする', 'Mengusut')];
const V_ZU_SUMANAI = [cv('c_ayamaru', '謝る', 'あやまる', 'Meminta maaf'), cv('c_kaesu', '返す', 'かえす', 'Mengembalikan'), cv('c_benshou', '弁償する', 'べんしょうする', 'Mengganti rugi')];
const V_SAZO = [cv('c_tsukareru', '疲れる', 'つかれる', 'Lelah'), cv('c_yorokobu', '喜ぶ', 'よろこぶ', 'Senang'), cv('c_odoroku', '驚く', 'おどろく', 'Heran')];
const V_SAMO = [cv('c_nakidasu', '泣き出す', 'なきだす', 'Mau menangis'), cv('c_taoreru', '倒れる', 'たおれる', 'Mau pingsan')];
const V_MAMANI = [cv('c_omou', '思う', 'おもう', 'Memikirkan', 'Diinginkan'), cv('c_kanjiru', '感じる', 'かんじる', 'Merasakan', 'Dirasakan'), cv('c_meijiru', '命じる', 'めいじる', 'Memerintahkan', 'Diperintahkan')];
const V_NBAKARI = [cv('c_naku', '泣く', 'なく', 'Menangis'), cv('c_iu', '言う', 'いう', 'Berkata'), cv('c_afureru', '溢れる', 'あふれる', 'Meluap')];

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
  r('bp_n4_100', 'te', 'くる', '{V} dulu, lalu kembali.', { excludeVerbIds: NO_KURU }),
  r('bp_n4_101', 'te', 'くれてありがとう', 'Terima kasih sudah {v}.'),
  r('bp_n4_102', 'te', 'くれない', 'Bisa tolong {v}?'),
  r('bp_n4_103', 'te', 'くれる', '(Seseorang) {v} untukku.'),
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
  r('w6d2g4', 'nai', 'こともない', 'Bukannya tidak mungkin {v}.', VB),
  r('bp_n2_115', 'nai', 'ことには', 'Kalau tidak {v}, (tidak akan) …', VB),
  r('bp_n2_116', 'nai', 'ではいられない', 'Mau tak mau pasti {v}.'),
  r('bp_n2_117', 'nai', 'わけにはいかない', 'Tidak bisa tidak {v}.'),
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
  r('bp_n4_003', 'masu_stem', '出す', 'Tiba-tiba mulai {v}.', { suffixReading: 'だす', excludeVerbIds: [...NO_MOTION, 'v_miru'] }),
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
  r('w3d5g3', 'masu_stem', 'っぱなし', 'Dibiarkan begitu saja setelah {v}.', { excludeVerbIds: NO_KURU }),
  r('w5d2g3', 'masu_stem', 'かける', 'Baru setengah jalan {v}.', { excludeVerbIds: ['v_kuru', 'v_miru'] }),
  r('bp_n2_015', 'masu_stem', '得ない', 'Tidak mungkin {v}.', { suffixReading: 'えない', excludeVerbIds: NO_KURU }),
  r('bp_n2_016', 'masu_stem', '得る', 'Bisa saja {v}.', { suffixReading: 'える', excludeVerbIds: NO_KURU }),
  r('bp_n2_030', 'masu_stem', 'かねない', 'Bisa-bisa (malah) {v}.'),
  r('bp_n2_031', 'masu_stem', 'かねます', 'Mohon maaf, sulit untuk {v}.'),
  r('bp_n2_074', 'masu_stem', 'たまえ', '{V}lah. (perintah atasan)'),
  r('bp_n2_077', 'masu_stem', 'っこない', 'Mana mungkin {v}.'),
  r('bp_n2_078', 'masu_stem', 'つつ', 'Sambil {v}, …'),
  r('bp_n2_079', 'masu_stem', 'つつある', 'Sedang dalam proses {v}.'),
  r('bp_n2_084', 'masu_stem', 'たくてたまらない', 'Ingin sekali {v}.', VB),
  r('bp_n2_161', 'masu_stem', '抜く', '{V} sampai tuntas.', { suffixReading: 'ぬく', excludeVerbIds: [...NO_MOTION, 'v_miru', 'v_yomu'] }),
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

  // ── Kontraksi lisan ───────────────────────────────────────
  r('w1d2g2', 'te', 'しまう', 'Terlanjur {v}. (santai)', { contract: CONTRACT_SHIMAU }),
  r('w1d2g3', 'te', 'おく', '{V} dulu sebagai persiapan. (santai)', { contract: CONTRACT_OKU }),
  r('bp_n5_045', 'te', 'はいけない', 'Tidak boleh {v}. (santai)', { contract: CONTRACT_TEWA }),
  rb('bp_n4_105', [
    b('しまう', 'te', 'しまう', 'Terlanjur / sudah tuntas {v}.'),
    b('ちゃう', 'te', 'しまう', 'Terlanjur {v}. (santai)', { contract: CONTRACT_SHIMAU }),
  ]),
  rb('bp_n4_099', [
    b('おく', 'te', 'おく', '{V} terlebih dahulu.'),
    b('とく', 'te', 'おく', '{V} dulu. (santai)', { contract: CONTRACT_OKU }),
  ]),
  rb('bp_n5_073', [
    b('なくちゃ', 'nai', '', 'Harus {v}. (santai)', { change: NAI_TO_NAKUTEWA, contract: CONTRACT_NAKUTEWA }),
    b('なきゃ', 'nai', '', 'Harus {v}. (santai)', { change: NAI_TO_NAKEREBA, contract: CONTRACT_NAKEREBA }),
  ]),
  rb('w1d2g1', [
    b('ないと', 'nai', 'と', 'Harus {v} nih.'),
    b('なくちゃ', 'nai', '', 'Harus {v} nih. (santai)', { change: NAI_TO_NAKUTEWA, contract: CONTRACT_NAKUTEWA }),
  ]),

  // ── Bercabang: Vる ／ Vない ───────────────────────────────
  rb('bp_n5_047', [b('Vる', 'jisho', 'つもりだ', 'Berniat {v}.'), b('Vない', 'nai', 'つもりだ', 'Berniat tidak {v}.')]),
  rb('bp_n4_055', [b('Vる', 'jisho', 'ことにする', 'Memutuskan untuk {v}.'), b('Vない', 'nai', 'ことにする', 'Memutuskan untuk tidak {v}.')]),
  rb('bp_n4_056', [b('Vる', 'jisho', 'ことになる', 'Diputuskan akan {v}.'), b('Vない', 'nai', 'ことになる', 'Diputuskan tidak {v}.')]),
  rb('w6d2g1', [b('Vる', 'jisho', 'ことになる', 'Diputuskan akan {v}.'), b('Vない', 'nai', 'ことになる', 'Diputuskan tidak {v}.')]),
  rb('w6d2g2', [b('Vる', 'jisho', 'ことにしている', 'Membiasakan diri {v}.'), b('Vない', 'nai', 'ことにしている', 'Membiasakan diri tidak {v}.')]),
  rb('w3d3g1', [b('Vる', 'jisho', 'つもりだった', 'Tadinya berniat {v}.'), b('Vない', 'nai', 'つもりだった', 'Tadinya berniat tidak {v}.')]),
  rb('w4d4g3', [b('Vる', 'jisho', 'ことだ', 'Sebaiknya {v}.'), b('Vない', 'nai', 'ことだ', 'Sebaiknya tidak {v}.')]),
  rb('w5d3g4', [b('Vる', 'jisho', 'かなあ', 'Kira-kira akan {v}, ya?'), b('Vない', 'nai', 'かなあ', 'Semoga cepat {v}, deh.')]),
  rb('w6d4g1', [b('Vない', 'nai', 'わけにはいかない', 'Tidak bisa tidak {v}.'), b('Vる', 'jisho', 'わけにはいかない', 'Tidak bisa {v} begitu saja.')]),
  rb('bp_n4_180', [b('Vる', 'jisho', 'ようにする', 'Berusaha untuk {v}.'), b('Vない', 'nai', 'ようにする', 'Berusaha untuk tidak {v}.')]),
  rb('w1d4g1', [b('Vる', 'jisho', 'ようにする', 'Berusaha untuk {v}.'), b('Vない', 'nai', 'ようにする', 'Berusaha untuk tidak {v}.')]),
  rb('w1d5g2', [b('Vる', 'jisho', 'ように', 'Pastikan untuk {v}.'), b('Vない', 'nai', 'ように', 'Pastikan untuk tidak {v}.')]),
  rb('bp_n4_178', [
    b('Vる', 'jisho', 'ように言う', 'Menyuruh untuk {v}.', { suffixReading: 'ようにいう' }),
    b('Vない', 'nai', 'ように言う', 'Menyuruh agar tidak {v}.', { suffixReading: 'ようにいう' }),
  ]),
  rb('w2d6g2', [
    b('Vる', 'jisho', 'ように言う', 'Menyuruh untuk {v}.', { suffixReading: 'ようにいう' }),
    b('Vない', 'nai', 'ように言う', 'Menyuruh agar tidak {v}.', { suffixReading: 'ようにいう' }),
  ]),
  rb('bp_n2_027', [
    b('Vる', 'jisho', '限り', 'Selama {v}, …', { suffixReading: 'かぎり' }),
    b('Vない', 'nai', '限り', 'Selama tidak {v}, …', { suffixReading: 'かぎり' }),
  ], VB),
  rb('bp_n2_043', [
    b('Vる', 'jisho', '傾向がある', 'Cenderung {v}.', { suffixReading: 'けいこうがある' }),
    b('Vない', 'nai', '傾向がある', 'Cenderung tidak {v}.', { suffixReading: 'けいこうがある' }),
  ], VB),
  rb('bp_n1_033', [
    b('Vる', 'jisho', '嫌いがある', 'Punya kecenderungan (buruk) {v}.', { suffixReading: 'きらいがある' }),
    b('Vない', 'nai', '嫌いがある', 'Punya kecenderungan (buruk) tidak {v}.', { suffixReading: 'きらいがある' }),
  ], VB),
  rb('bp_n1_231', [b('Vる', 'jisho', 'ものとする', 'Ditetapkan untuk {v}.'), b('Vない', 'nai', 'ものとする', 'Ditetapkan untuk tidak {v}.')]),

  // ── Bercabang: + bentuk potensial ─────────────────────────
  rb('bp_n4_175', [
    b('Vる', 'jisho', 'ように', 'Supaya {v}, …'),
    b('Vない', 'nai', 'ように', 'Supaya tidak {v}, …'),
    b('Vれる', 'potential', 'ように', 'Supaya bisa {v}, …'),
  ]),
  rb('w1d4g2', [
    b('Vる', 'jisho', 'ように', 'Supaya {v}, …'),
    b('Vない', 'nai', 'ように', 'Supaya tidak {v}, …'),
    b('Vれる', 'potential', 'ように', 'Supaya bisa {v}, …'),
  ]),
  rb('bp_n4_179', [
    b('Vる', 'jisho', 'ように祈る', 'Berdoa agar {v}.', { suffixReading: 'ようにいのる' }),
    b('Vない', 'nai', 'ように祈る', 'Berdoa agar tidak {v}.', { suffixReading: 'ようにいのる' }),
    b('Vれる', 'potential', 'ように祈る', 'Berdoa agar bisa {v}.', { suffixReading: 'ようにいのる' }),
  ]),
  rb('bp_n4_181', [
    b('Vる', 'jisho', 'ようになる', 'Mulai (terbiasa) {v}.'),
    b('Vれる', 'potential', 'ようになる', 'Jadi bisa {v}.'),
    b('Vなくなる', 'nai', 'なる', 'Jadi tidak {v} lagi.', { change: NAI_TO_NAKU }),
  ]),
  rb('w1d5g3', [
    b('Vます', 'masu_stem', 'ますように', 'Semoga (bisa) {v}!'),
    b('Vません', 'masu_stem', 'ませんように', 'Semoga tidak {v}!'),
    b('Vれます', 'potential', 'ように', 'Semoga bisa {v}!', { change: POTENTIAL_TO_MASU }),
  ]),

  // ── Bercabang: て ／ ないで, た ／ なかった, dll. ─────────
  rb('bp_n4_109', [b('Vて', 'te', 'ほしい', 'Ingin (kamu) {v}.'), b('Vないで', 'nai', 'でほしい', 'Ingin (kamu) tidak {v}.')]),
  rb('w3d6g2', [b('Vて', 'te', 'ほしい', 'Ingin (kamu) {v}.'), b('Vないで', 'nai', 'でほしい', 'Ingin (kamu) tidak {v}.')]),
  rb('w2d6g4', [
    b('Vて', 'te', 'くれと頼まれる', 'Diminta untuk {v}.', { suffixReading: 'くれとたのまれる' }),
    b('Vないで', 'nai', 'でくれと頼まれる', 'Diminta agar tidak {v}.', { suffixReading: 'でくれとたのまれる' }),
  ]),
  rb('bp_n4_115', [
    b('Vて', 'te', 'よかった', 'Untung / syukurlah sudah {v}.'),
    b('Vなくて', 'nai', 'よかった', 'Untung / syukurlah tidak {v}.', { change: NAI_TO_NAKUTE }),
  ]),
  rb('bp_n2_120', [
    b('Vなくて', 'nai', '済む', 'Akhirnya tidak perlu {v}.', { suffixReading: 'すむ', change: NAI_TO_NAKUTE }),
    b('Vないで', 'nai', 'で済む', 'Akhirnya tidak perlu {v}.', { suffixReading: 'ですむ' }),
  ]),
  rb('w3d3g4', [b('Vた', 'ta', 'ものだ', 'Dulu sering {v}.'), b('Vなかった', 'nakatta', 'ものだ', 'Dulu sering tidak {v}.')]),
  rb('bp_n4_167', [b('Vた', 'ta', 'まま', 'Dalam keadaan sudah {v}, …'), b('Vない', 'nai', 'まま', 'Dalam keadaan tidak {v}, …')], VB),
  rb('w3d5g2', [b('Vた', 'ta', 'まま', 'Dalam keadaan sudah {v}, …'), b('Vない', 'nai', 'まま', 'Dalam keadaan tidak {v}, …')], VB),
  rb('w6d3g3', [
    b('Vている', 'te', 'いるところ', 'Sedang {v}.'),
    b('Vた', 'ta', 'ところ', 'Baru saja {v}.'),
    b('Vる', 'jisho', 'ところ', 'Baru akan {v}.'),
  ]),
  rb('w3d4g1', [b('Vる', 'jisho', 'ついでに', 'Sekalian {v}, …'), b('Vた', 'ta', 'ついでに', 'Sekalian setelah {v}, …')], VB),
  rb('w3d5g1', [b('Vる', 'jisho', 'とおり', 'Persis seperti saat {v}.'), b('Vた', 'ta', 'とおり', 'Persis seperti yang sudah {v} tadi.')], VB),
  rb('bp_n1_154', [b('Vる', 'jisho', 'なり', 'Begitu {v}, langsung …'), b('Vた', 'ta', 'なり', 'Sejak {v}, dibiarkan begitu saja.')]),
  rb('bp_n1_218', [b('Vる', 'jisho', 'までだ', 'Tinggal {v} saja.'), b('Vた', 'ta', 'までだ', 'Hanya {v}, tidak lebih.')]),
  rb('w2d6g3', [
    b('V perintah', 'imperative', 'と言われる', 'Disuruh {v}.', { suffixReading: 'といわれる' }),
    b('Vるな', 'jisho', 'なと言われる', 'Dilarang {v}.', { suffixReading: 'なといわれる' }),
  ]),
  rb('w5d3g2', [
    b('Vば', 'ba', 'よかった', 'Seharusnya {v} (menyesal).'),
    b('Vなければ', 'nai', 'よかった', 'Seharusnya tidak {v}.', { change: NAI_TO_NAKEREBA }),
    b('Vたら', 'ta', 'らよかった', 'Seharusnya {v} (menyesal).'),
    b('Vなかったら', 'nakatta', 'らよかった', 'Seharusnya tidak {v}.'),
  ]),

  // ── Kausatif ／ pasif ／ potensial ────────────────────────
  r('bp_n4_070', 'causative', '', 'Menyuruh / membiarkan (orang) {v}.'),
  r('bp_n4_060', 'causative', 'ください', 'Izinkan saya {v}.', { change: RU_TO_TE }),
  rb('w1d1g3', [
    b('ください', 'causative', 'ください', 'Izinkan saya {v}.', { change: RU_TO_TE }),
    b('もらえますか', 'causative', 'もらえますか', 'Bolehkah saya {v}?', { change: RU_TO_TE }),
    b('もらえませんか', 'causative', 'もらえませんか', 'Bolehkah kiranya saya {v}?', { change: RU_TO_TE }),
  ]),
  rb('bp_n4_061', [
    b('Panjang', 'causative_passive', '', 'Terpaksa {v} (disuruh orang).'),
    b('Singkat', 'causative_passive', '', 'Terpaksa {v} (disuruh orang).', { contract: CONTRACT_CAUS_PASSIVE, excludeVerbIds: NOT_GODAN }),
  ]),
  r('bp_n4_187', 'passive', '', '{P}. (pasif)'),
  rb('w1d1g1', [
    b('Vれる', 'passive', '', '{P}. (pasif)'),
    b('Vれている', 'passive', 'いる', 'Sudah / sedang {p}. (pasif)', { change: RU_TO_TE }),
  ]),
  r('w1d1g2', 'passive', '', '(Merasa dirugikan karena) {p}.', { change: RU_TO_TA }),
  r('bp_n4_188', 'potential', '', 'Bisa {v}.'),

  // ── Bentuk dasar sebagai materi (tabel konjugasi) ─────────
  r('bp_n4_026', 'volitional', '', 'Ayo / mari {v}!'),
  r('bp_n4_171', 'imperative', '', '{V}! (perintah kasar)'),
  r('bp_n4_153', 'ba', '', 'Kalau {v}, …', VB),
  rb('bp_n5_061', [b('Vる', 'jisho', '', '{V}. (bentuk biasa)'), b('Vます', 'masu_stem', 'ます', '{V}. (sopan)')]),

  // ── Bentuk maksud (意向形) ─────────────────────────────────
  r('w1d6g1', 'volitional', 'と思う', 'Saya berniat {v}.', { suffixReading: 'とおもう' }),
  r('bp_n4_174', 'volitional', 'と思う', 'Saya berniat {v}.', { suffixReading: 'とおもう' }),
  r('w1d6g2', 'volitional', 'とする', 'Hendak / berusaha {v}.'),
  r('w1d6g3', 'volitional', 'としない', 'Tidak mau {v}.'),
  r('bp_n2_114', 'volitional', 'とも', 'Biarpun {v}, …', VB),
  r('bp_n2_197', 'volitional', 'ではないか', 'Mari kita {v}!'),
  rb('bp_n2_189', [
    b('Vれる', 'potential', 'ものなら', 'Kalau saja bisa {v}, …'),
    b('Vよう', 'volitional', 'ものなら', 'Kalau sampai berani {v}, (gawat) …'),
  ]),
  r('bp_n1_243', 'volitional', 'ものなら', 'Kalau sampai berani {v}, (gawat) …'),
  rb('bp_n1_240', [b('ようが', 'volitional', 'が', 'Biarpun {v}, …'), b('ようと', 'volitional', 'と', 'Biarpun {v}, …')], VB),

  // ── ば ／ たら: pengandaian & penyesalan ───────────────────
  rb('bp_n4_159', [
    b('Vば', 'ba', 'よかった', 'Seharusnya {v} (menyesal).'),
    b('Vなければ', 'nai', 'よかった', 'Seharusnya tidak {v}.', { change: NAI_TO_NAKEREBA }),
  ]),
  rb('w5d3g3', [b('Vば', 'ba', 'よかったのに', 'Padahal seharusnya {v}.'), b('Vたら', 'ta', 'らよかったのに', 'Padahal seharusnya {v}.')]),
  rb('w5d3g1', [
    b('Vると', 'jisho', 'といいなあ', 'Semoga {v}, ya.'),
    b('Vたら', 'ta', 'らいいなあ', 'Semoga {v}, ya.'),
    b('Vば', 'ba', 'いいなあ', 'Semoga {v}, ya.'),
  ], VB),
  rb('bp_n4_119', [b('Vといい', 'jisho', 'といい', 'Semoga / sebaiknya {v}.'), b('Vたらいい', 'ta', 'らいい', 'Sebaiknya {v}.')]),
  rb('bp_n2_173', [
    b('Vばと思います', 'ba', 'と思います', 'Saya harap bisa {v}.', { suffixReading: 'とおもいます' }),
    b('Vばいいと思います', 'ba', 'いいと思います', 'Sebaiknya {v}, menurut saya.', { suffixReading: 'いいとおもいます' }),
  ]),
  r('bp_n1_200', 'ba', 'こそ', 'Justru karena {v}, …', VB),
  rb('bp_n1_203', [b('Vば', 'ba', 'それまでだ', 'Kalau sampai {v}, tamatlah.'), b('Vたら', 'ta', 'らそれまでだ', 'Kalau sampai {v}, tamatlah.')]),
  r('bp_n1_034', 'ba', 'きりがない', 'Kalau {v}, tidak ada habisnya.'),

  // ── ない → なくて ／ なければ ／ なく ──────────────────────
  r('bp_n5_074', 'nai', 'はいけない', 'Harus {v}.', { change: NAI_TO_NAKUTE }),
  r('bp_n5_075', 'nai', 'はならない', 'Harus {v}.', { change: NAI_TO_NAKUTE }),
  r('bp_n5_076', 'nai', 'もいい', 'Tidak perlu {v}.', { change: NAI_TO_NAKUTE }),
  r('bp_n4_134', 'nai', '', 'Karena tidak {v}, …', { change: NAI_TO_NAKUTE, ...VB }),
  r('bp_n4_135', 'nai', 'いけない', 'Harus {v}.', { change: NAI_TO_NAKEREBA, ...VB }),
  r('bp_n4_136', 'nai', 'ならない', 'Harus {v}.', { change: NAI_TO_NAKEREBA, ...VB }),
  rb('bp_n2_121', [
    b('なくはない', 'nai', 'はない', 'Bukannya tidak {v}.', { change: NAI_TO_NAKU }),
    b('なくもない', 'nai', 'もない', 'Bukannya tidak {v}.', { change: NAI_TO_NAKU }),
  ], VB),
  r('bp_n4_014', 'nai', '人はいない', 'Tidak ada orang yang tidak {v}.', { suffixReading: 'ひとはいない' }),
  rb('bp_n1_143', [
    b('Vない', 'nai', 'ものか', 'Tidakkah (entah bagaimana) dia {v}?'),
    b('Vれない', 'potential', 'ものか', 'Tidakkah bisa {v}?', { change: POTENTIAL_TO_NAI }),
  ]),
  rb('bp_n1_144', [
    b('Vない', 'nai', 'ものだろうか', 'Tidakkah (entah bagaimana) dia {v}?'),
    b('Vれない', 'potential', 'ものだろうか', 'Tidakkah (entah bagaimana) bisa {v}?', { change: POTENTIAL_TO_NAI }),
  ]),
  rb('bp_n1_145', [
    b('Vない', 'nai', 'ものでもない', 'Bukannya tidak mungkin {v}.'),
    b('Vれない', 'potential', 'ものでもない', 'Bukannya tidak mungkin bisa {v}.', { change: POTENTIAL_TO_NAI }),
  ]),

  // ── ず ／ ざる ／ ぬ ／ ねば ／ ん (する → せ〜) ────────────
  r('w3d1g3', 'nai', 'に', 'Tanpa {v}, …', { change: NAI_TO_ZU }),
  r('bp_n2_058', 'nai', 'に済む', 'Akhirnya tidak perlu {v}.', { change: NAI_TO_ZU, suffixReading: 'にすむ' }),
  r('bp_n2_048', 'nai', '', '(Yang) tidak {v} … (klasik)', { change: NAI_TO_ZARU }),
  r('bp_n2_049', 'nai', 'を得ない', 'Mau tidak mau harus {v}.', { change: NAI_TO_ZARU, suffixReading: 'をえない' }),
  r('bp_n2_159', 'nai', '', 'Tidak {v}. (klasik)', { change: NAI_TO_NU }),
  r('bp_n2_162', 'nai', 'ならない', 'Harus {v}. (formal)', { change: NAI_TO_NEBA }),
  r('bp_n1_057', 'nai', 'じまいだった', 'Akhirnya tidak jadi {v} sama sekali.', { change: NAI_TO_ZU }),
  r('bp_n1_058', 'nai', 'とも', 'Meski tidak {v} pun, …', { change: NAI_TO_ZU }),
  r('bp_n1_266', 'nai', 'がために', 'Demi bisa {v}, …', { change: NAI_TO_N }),
  rb('bp_n1_046', [b('Vる', 'jisho', 'こととて', 'Karena {v}, (mohon maaf) …'), b('Vぬ', 'nai', 'こととて', 'Karena tidak {v}, (mohon maaf) …', { change: NAI_TO_NU })], VB),
  rb('bp_n1_059', [
    b('ずにはおかない', 'nai', 'にはおかない', 'Pasti akan {v}.', { change: NAI_TO_ZU }),
    b('ないではおかない', 'nai', 'ではおかない', 'Pasti akan {v}.'),
  ], { verbs: V_ZU_OKANAI }),
  rb('bp_n1_060', [
    b('ずには済まない', 'nai', 'には済まない', 'Mau tak mau harus {v}.', { change: NAI_TO_ZU, suffixReading: 'にはすまない' }),
    b('ないでは済まない', 'nai', 'では済まない', 'Mau tak mau harus {v}.', { suffixReading: 'ではすまない' }),
  ], { verbs: V_ZU_SUMANAI }),
  r('bp_n1_267', 'nai', 'ばかりに', 'Seolah-olah hampir {v}.', { change: NAI_TO_N, verbs: V_NBAKARI }),

  // ── Awalan (もし, まだ, なかなか, …) ─────────────────────────
  r('bp_n4_172', 'ta', 'ら', 'Seandainya {v}, …', { prefix: 'もし' }),
  r('w6d1g1', 'ta', 'ら', 'Seandainya {v}, …', { prefix: 'もし', ...VB }),
  r('w6d1g3', 'ta', 'ら', 'Seandainya (sampai) {v}, …', { prefix: 'もしも', ...VB }),
  r('bp_n2_181', 'ta', 'ら', 'Seandainya (amit-amit) {v}, …', { prefix: '万が一', prefixReading: 'まんがいち' }),
  rb('w3d1g2', [
    b('どんなに', 'te', 'も', 'Sekeras apa pun {v}, …', { prefix: 'どんなに' }),
    b('いくら', 'te', 'も', 'Sebanyak apa pun {v}, …', { prefix: 'いくら' }),
  ], VB),
  r('w5d5g1', 'te', 'も', 'Sekalipun {v}, …', { prefix: 'たとえ', ...VB }),
  r('bp_n1_007', 'te', 'も', 'Betapa pun {v}, …', { prefix: 'いかに', ...VB }),
  rb('bp_n2_009', [
    b('Vたら', 'ta', 'ら', 'Sekali {v}, …', { prefix: '一旦', prefixReading: 'いったん' }),
    b('Vば', 'ba', '', 'Sekali {v}, …', { prefix: '一旦', prefixReading: 'いったん' }),
  ]),
  r('bp_n5_108', 'te', 'いません', 'Belum {v}.', { prefix: 'まだ' }),
  rb('bp_n2_011', [
    b('Vない', 'nai', '', 'Sampai sekarang masih belum {v}.', { prefix: '未だに', prefixReading: 'いまだに' }),
    b('Vている', 'te', 'いる', 'Sampai sekarang masih {v}.', { prefix: '未だに', prefixReading: 'いまだに' }),
  ]),
  r('bp_n4_132', 'nai', '', 'Tak kunjung {v}.', { prefix: 'なかなか' }),
  r('bp_n2_201', 'nai', '', 'Hampir tidak {v} dengan benar.', { prefix: 'ろくに' }),
  r('bp_n4_069', 'nai', '', 'Sama sekali tidak {v}.', { prefix: '少しも', prefixReading: 'すこしも', ...VB }),
  r('bp_n4_071', 'nai', '', 'Sama sekali tidak {v}.', { prefix: '全然', prefixReading: 'ぜんぜん', ...VB }),
  r('bp_n4_023', 'nai', '', 'Tidak terlalu {v}.', { prefix: 'あまり', ...VB }),
  rb('bp_n4_162', [
    b('Vる', 'jisho', '', 'Hampir selalu {v}.', { prefix: 'ほとんど' }),
    b('Vない', 'nai', '', 'Hampir tidak {v}.', { prefix: 'ほとんど' }),
  ], VB),
  r('bp_n5_043', 'nai', '', 'Tidak ada seorang pun yang {v}.', { prefix: '誰も', prefixReading: 'だれも' }),
  r('bp_n5_080', 'nai', '', 'Tidak {v} apa pun.', { prefix: '何も', prefixReading: 'なにも' }),
  r('bp_n4_065', 'nai', '', 'Tidak {v} sekali pun.', { prefix: '一回も', prefixReading: 'いっかいも', ...VB }),
  r('bp_n4_066', 'nai', '', 'Hanya {v} sedikit.', { prefix: '少ししか', prefixReading: 'すこししか' }),
  r('bp_n4_063', 'nai', '', 'Hanya {v} ini saja.', { prefix: 'これしか' }),
  r('w2d1g2', 'nai', '', 'Hanya {v} sebanyak ini saja.', { prefix: 'これだけしか' }),
  r('bp_n4_089', 'ta', 'らいいですか', 'Bagaimana sebaiknya {v}?', { prefix: 'どう' }),
  r('bp_n2_182', 'jisho', 'ところだった', 'Nyaris saja {v}.', { prefix: 'もう少しで', prefixReading: 'もうすこしで' }),
  r('bp_n2_022', 'potential', '', 'Tidak bisa {v} sesuai keinginan.', { prefix: '思うように', prefixReading: 'おもうように', change: POTENTIAL_TO_NAI }),
  r('bp_n1_116', 'potential', '', 'Bagaimanapun tidak bisa {v}.', { prefix: 'どうにも', change: POTENTIAL_TO_NAI }),
  r('bp_n2_124', 'jisho', 'ことはない', 'Tidak perlu sampai {v}.', { prefix: '何も', prefixReading: 'なにも' }),
  r('bp_n1_023', 'ta', '', 'Dulu pernah {v}.', { prefix: 'かつて' }),
  r('bp_n1_068', 'jisho', 'のみだ', 'Tinggal {v} saja.', { prefix: 'ただ', ...VB }),
  r('bp_n1_050', 'ta', 'だろう', 'Pasti sangat {v}, ya.', { prefix: 'さぞ', verbs: V_SAZO, ...VB }),
  r('bp_n1_051', 'masu_stem', 'そうに', 'Seolah-olah benar-benar {v}.', { prefix: 'さも', verbs: V_SAMO }),
  r('w5d5g4', 'jisho', 'ようだ', 'Seolah-olah {v}.', { prefix: 'まるで', ...VB }),
  rb('w4d4g4', [
    b('Vる', 'jisho', 'ことか', 'Betapa (sering) {v}!', { prefix: 'どんなに' }),
    b('Vた', 'ta', 'ことか', 'Betapa (lama) sudah {v}!', { prefix: 'どんなに' }),
  ], VB),
  plain('w5d5g2', 'かもしれない', 'Jangan-jangan {x}.', { prefix: 'もしかすると' }),
  plain('w5d5g3', 'とは限らない', 'Belum tentu {x}.', { prefix: '必ずしも', prefixReading: 'かならずしも', suffixReading: 'とはかぎらない' }),
  plain('w6d1g2', 'としても', 'Seandainya pun {x}, …', { prefix: 'もし' }),

  // ── Bahasa hormat & merendah (お〜) ───────────────────────
  r('bp_n4_030', 'masu_stem', 'ください', 'Silakan {v}.', { prefix: 'お', verbs: V_SONKEI }),
  r('w6d5g1', 'masu_stem', 'ください', 'Silakan {v}.', { prefix: 'お', verbs: V_SONKEI }),
  r('w6d6g2', 'masu_stem', 'くださいますよう', 'Mohon kiranya {v}.', { prefix: 'お', verbs: V_SONKEI }),
  r('bp_n4_032', 'masu_stem', 'になる', 'Beliau {v}.', { prefix: 'お', verbs: V_SONKEI }),
  r('w6d5g4', 'masu_stem', 'いただく', 'Berkenan {v} (untuk kami).', { prefix: 'お', verbs: V_SONKEI }),
  r('bp_n4_031', 'masu_stem', 'する', 'Saya {v} (untuk Anda).', { prefix: 'お', verbs: V_KENJOU }),
  r('bp_n4_028', 'masu_stem', 'いたす', 'Saya {v} (untuk Anda, sangat rendah hati).', { prefix: 'お', verbs: V_KENJOU }),
  r('w6d5g3', 'masu_stem', '申し上げる', 'Dengan hormat saya {v}.', { prefix: 'お', suffixReading: 'もうしあげる', verbs: V_KENJOU }),
  r('bp_n2_017', 'masu_stem', '願う', 'Mohon {v}.', { prefix: 'お', suffixReading: 'ねがう', verbs: V_KENJOU }),
  r('bp_n4_029', 'te', 'いらっしゃる', 'Beliau sedang {v}.'),

  // ── Dua verba: verba pasangan (飲む) atau verba yang diulang ─
  r('bp_n5_042', 'ta', 'り', '{V}, {w}, dan sebagainya.', { partner: pair('ta', 'り', false), tail: 'する' }),
  r('bp_n4_125', 'jisho', 'とか', '{V}, {w}, dan semacamnya.', { partner: pair('jisho', 'とか', false), tail: 'する', ...VB }),
  r('bp_n2_193', 'jisho', 'やら', '{V}, {w}, dan lain-lain (repot).', { partner: pair('jisho', 'やら', false), ...VB }),
  r('bp_n2_090', 'te', 'は', '{V}, lalu {w}, berulang-ulang …', { partner: pair('te', 'は', false) }),
  r('bp_n1_082', 'masu_stem', 'つ', 'Sebentar {v}, sebentar {w} …', { partner: pair('masu_stem', 'つ', false) }),
  r('bp_n1_155', 'jisho', 'なり', 'Entah {v} atau {w}, (lakukan sesuatu).', { partner: pair('jisho', 'なり', false), ...VB }),
  r('bp_n2_145', 'jisho', 'にしても', '{V} ataupun {w}, sama saja …', { partner: pair('jisho', 'にしても', false), ...VB }),
  r('bp_n2_146', 'jisho', 'にしろ', '{V} ataupun {w}, sama saja …', { partner: pair('jisho', 'にしろ', false), ...VB }),
  r('bp_n1_245', 'jisho', 'わ', '{V}, {w} pula (keterlaluan) …', { partner: pair('jisho', 'わで', false), ...VB }),
  rb('bp_n1_239', [
    b('ようが', 'volitional', 'が', 'Mau {v} atau {w}, terserah …', { partner: pair('volitional', 'が', false) }),
    b('ようと', 'volitional', 'と', 'Mau {v} atau {w}, terserah …', { partner: pair('volitional', 'と', false) }),
  ], VB),
  r('bp_n2_024', 'jisho', 'か', 'Baru saja {v}, langsung …', { partner: pair('nai', 'かのうちに', true) }),
  r('bp_n1_197', 'jisho', 'のやら', 'Entah {v} entah tidak …', { partner: pair('nai', 'のやら', true) }),
  r('bp_n2_132', 'jisho', '', 'Entah {v} atau tidak, …', { partner: pair('nai', 'にかかわらず', true), ...VB }),
  r('w6d2g3', 'jisho', 'ことは', '{V} sih memang {v}, tapi …', { partner: pair('jisho', 'が', true), ...VB }),
  r('bp_n2_069', 'jisho', 'だけは', 'Setidaknya sudah {v} semampunya.', { partner: pair('ta', '', true), ...VB }),
  r('bp_n1_076', 'ta', 'ら', 'Kalau sudah {v} pun, ada masalahnya sendiri.', { partner: pair('ta', 'で', true), ...VB }),
  r('w4d3g3', 'ba', '', 'Semakin {v}, semakin …', { partner: pair('jisho', 'ほど', true), ...VB }),
  r('bp_n2_194', 'volitional', 'か', 'Apakah akan {v} atau tidak …', { partner: pair('jisho', 'まいか', true) }),
  rb('bp_n1_238', [
    b('ようが〜まいが', 'volitional', 'が', 'Entah {v} atau tidak, …', { partner: pair('jisho', 'まいが', true) }),
    b('ようと〜まいと', 'volitional', 'と', 'Entah {v} atau tidak, …', { partner: pair('jisho', 'まいと', true) }),
  ]),
  r('bp_n1_241', 'volitional', 'にも', 'Mau {v} pun tidak bisa.', { partner: pair('potential', '', true, { change: POTENTIAL_TO_NAI }) }),
  r('bp_n1_159', 'jisho', 'に', 'Mau {v} pun tidak bisa.', { partner: pair('potential', '', true, { change: POTENTIAL_TO_NAI }), excludeVerbIds: ['v_suru'] }),
  r('bp_n1_211', 'jisho', 'べくして', '{V} sebagaimana mestinya.', { partner: pair('ta', '', true), verbs: V_BEKUSHITE }),
  r('bp_n1_137', 'jisho', 'ともなく', 'Tanpa sengaja {v}.', { partner: pair('jisho', '', true), verbs: V_SENSE }),

  // ── Kolokasi sempit: daftar verba sendiri ──────────────────
  r('bp_n1_101', 'te', 'やまない', 'Selalu {v} dari lubuk hati.', { verbs: V_HOPE }),
  r('bp_n1_171', 'jisho', 'に難くない', 'Tidak sulit untuk {v}.', { suffixReading: 'にかたくない', verbs: V_GUESS }),
  r('bp_n1_177', 'jisho', 'に忍びない', 'Tidak tega {v}.', { suffixReading: 'にしのびない', verbs: V_SHINOBI }),
  r('bp_n1_179', 'jisho', 'に耐えない', 'Tidak tahan untuk {v}.', { suffixReading: 'にたえない', verbs: V_SENSE_READ, ...VB }),
  r('bp_n1_180', 'jisho', 'に足りない', 'Tidak layak {p}.', { suffixReading: 'にたりない', verbs: V_TARINAI }),
  r('bp_n1_181', 'jisho', 'に足る', 'Layak {p}.', { suffixReading: 'にたる', verbs: V_TARU, ...VB }),
  r('bp_n1_185', 'jisho', 'には当たらない', 'Tidak perlu {v}.', { suffixReading: 'にはあたらない', verbs: V_ATARANAI }),
  r('bp_n1_212', 'jisho', 'べくもない', 'Mustahil untuk {v}.', { verbs: V_BEKUMONAI }),
  r('bp_n2_129', 'jisho', 'に値する', 'Layak {p}.', { suffixReading: 'にあたいする', verbs: V_ATAI, ...VB }),
  r('bp_n2_152', 'jisho', 'につけ', 'Setiap kali {v}, (teringat) …', { verbs: V_SENSE_THINK, ...VB }),
  r('bp_n1_071', 'jisho', 'だに', 'Baru {v} saja sudah …', { verbs: V_DANI, ...VB }),
  r('bp_n1_217', 'jisho', 'まじき行為', 'Tindakan yang tak pantas {p}.', { suffixReading: 'まじきこうい', verbs: V_MAJIKI }),
  r('bp_n1_028', 'masu_stem', 'がましい', 'Terkesan {v}.', { verbs: V_GAMASHII, ...VB }),
  r('bp_n1_207', 'masu_stem', 'ぶり', 'Cara / gaya {v}.', { verbs: V_BURI, ...VB }),
  r('bp_n1_041', 'masu_stem', 'こそすれ', '{V} sih iya, tapi tidak …', { verbs: V_KOSOSURE, ...VB }),
  r('bp_n1_146', 'masu_stem', 'ながらに', 'Sejak / selagi {v}, (sudah) …', { verbs: V_NAGARANI, ...VB }),
  r('bp_n1_242', 'masu_stem', 'ようによっては', 'Tergantung cara {v}, …', { verbs: V_YOUNI }),
  r('bp_n2_042', 'tai', 'げ', 'Kelihatan ingin {v}.', { change: TAI_TO_STEM, verbs: V_TAGE, ...VB }),
  r('bp_n2_028', 'masu_stem', 'がけに', 'Di tengah jalan saat {v}, …', { verbs: V_GAKE }),
  r('bp_n2_088', 'te', 'ならない', 'Tak bisa tidak {v}.', { verbs: V_TENARANAI, ...VB }),
  r('w5d2g1', 'masu_stem', '上げる', 'Selesai {v} sampai tuntas.', { suffixReading: 'あげる', verbs: V_AGERU }),
  r('w5d2g2', 'masu_stem', '切る', 'Habis {v} sampai tuntas.', { suffixReading: 'きる', verbs: V_KIRU }),
  r('w5d2g4', 'masu_stem', 'たて', 'Baru saja {p}.', { verbs: V_TATE }),

  // ── Lain-lain satu bentuk ─────────────────────────────────
  r('bp_n2_071', 'ta', '末に', 'Setelah lama {v}, akhirnya …', { suffixReading: 'すえに', ...VB }),
  r('bp_n2_154', 'jisho', 'のに伴って', 'Seiring dengan {v}, …', { suffixReading: 'のにともなって', ...VB }),
  r('bp_n1_147', 'jisho', 'ことなくしては', 'Tanpa {v}, (tidak akan bisa) …', VB),
  r('bp_n1_148', 'jisho', 'ことなしに', 'Tanpa {v}, …', VB),
  r('bp_n1_019', 'ta', '甲斐もなく', 'Meski sudah {v}, sia-sia saja.', { suffixReading: 'かいもなく', ...VB }),
  r('bp_n4_075', 'masu_stem', 'そうな', 'Kelihatan akan {v} …', VB),
  rb('bp_n2_108', [
    b('Vる', 'jisho', 'ところに', 'Tepat saat akan {v}, …'),
    b('Vている', 'te', 'いるところに', 'Tepat saat sedang {v}, …'),
    b('Vた', 'ta', 'ところに', 'Tepat setelah {v}, …'),
  ], VB),
  rb('bp_n2_180', [b('Vる', 'jisho', 'ままに', 'Sesuai yang {p}, …'), b('Vた', 'ta', 'ままに', 'Persis seperti yang {p}, …')], { verbs: V_MAMANI, ...VB }),
  rb('bp_n1_230', [b('Vた', 'ta', 'ものとして', 'Dengan anggapan sudah {v}, …'), b('Vない', 'nai', 'ものとして', 'Dengan anggapan tidak {v}, …')], VB),

  // ── Bentuk biasa + akhiran (Vる／Vない／Vた／Vなかった) ─────
  plain('w1d3g1', 'みたいだ', 'Sepertinya (dia) {x}.'),
  plain('w1d5g1', 'ように', 'Seperti yang {x}, …', { forms: ['jisho', 'ta'] }),
  plain('w2d3g3', 'こと', 'Hal (bahwa) {x}.'),
  plain('w2d3g4', 'の', '(Hal) {x} …'),
  plain('w2d5g1', 'というより', 'Daripada dibilang {x}, …'),
  plain('w2d5g2', 'というと', 'Kalau bicara soal {x}, …'),
  plain('w2d5g3', 'といっても', 'Meskipun dibilang {x}, …'),
  plain('w3d2g2', 'にしては', 'Untuk ukuran {x}, …'),
  plain('w3d2g3', 'にしても', 'Kalaupun {x}, …'),
  plain('w3d2g4', 'としたら', 'Seandainya {x}, …'),
  plain('w3d3g2', 'はずだ', 'Seharusnya (dia) {x}.'),
  plain('w3d6g3', 'ふりをする', 'Berpura-pura {x}.'),
  plain('w4d1g2', 'わりに', 'Untuk ukuran {x}, (ternyata) …'),
  plain('w4d1g3', 'くせに', 'Padahal {x}, (kok) …'),
  plain('w4d2g1', 'おかげで', 'Berkat {x}, …'),
  plain('w4d2g2', 'せいで', 'Gara-gara {x}, …'),
  plain('w4d2g3', 'かわりに', 'Sebagai ganti {x}, …', { forms: ['jisho', 'nai', 'ta'] }),
  plain('w4d4g2', 'ということだ', 'Artinya / katanya {x}.'),
  plain('w4d5g3', 'んだって', 'Katanya {x}, lho.'),
  plain('w4d5g4', 'んだもん', 'Habisnya {x}, sih.'),
  plain('w5d1g2', 'ばかりか', 'Bukan hanya {x}, (bahkan) …'),
  plain('w6d4g2', 'わけだ', 'Pantas saja {x}.'),
  plain('w6d4g3', 'わけではない', 'Bukan berarti {x}.'),
  plain('w6d4g4', 'わけがない', 'Mana mungkin (dia) {x}.'),
  plain('bp_n5_018', 'から', 'Karena {x}, …'),
  plain('bp_n5_027', 'けど', '{X}, tapi …'),
  plain('bp_n5_028', 'けれども', '{X}, namun …'),
  plain('bp_n5_054', 'でしょう', 'Mungkin (dia) {x}.'),
  plain('bp_n5_064', 'とき', 'Saat {x}, …'),
  plain('bp_n5_068', 'なあ', '{X}, ya… (bergumam)'),
  plain('bp_n5_088', 'の', '{X}? (santai)'),
  plain('bp_n5_089', 'の', '(Kegiatan) {x} …', { forms: ['jisho'] }),
  plain('bp_n5_094', 'ので', 'Karena {x}, …'),
  plain('bp_n5_119', 'んです', '(Sebenarnya) {x}.'),
  plain('bp_n4_016', 'のだろうか', 'Apakah (benar) {x}?'),
  plain('bp_n4_034', 'かい', '{X}? (santai, pria)'),
  plain('bp_n4_037', 'かしら', 'Kira-kira {x}, ya? (wanita)'),
  plain('bp_n4_039', 'かどうか', 'Apakah {x} atau tidak …'),
  plain('bp_n4_040', 'かな', 'Kira-kira {x}, ya?'),
  plain('bp_n4_043', 'かもしれない', 'Mungkin (dia) {x}.'),
  plain('bp_n4_051', 'こと', 'Hal {x}.'),
  plain('bp_n4_057', 'ころ', 'Waktu {x}, …', { forms: ['jisho', 'ta'] }),
  plain('bp_n4_062', 'し', '{X}, lagi pula …'),
  plain('bp_n4_064', 'じゃないか', 'Bukankah {x}?'),
  plain('bp_n4_074', 'そうだ', 'Katanya (dia) {x}.'),
  plain('bp_n4_083', 'だけでなく', 'Bukan hanya {x}, …'),
  plain('bp_n4_092', 'って感じ', 'Rasanya seperti {x}.', { suffixReading: 'ってかんじ' }),
  plain('bp_n4_108', 'ではないか', 'Bukankah {x}?'),
  plain('bp_n4_116', 'と言う', '(Dia) bilang bahwa (dia) {x}.', { suffixReading: 'という' }),
  plain('bp_n4_117', 'と', 'Kalau {x}, (pasti) …', { forms: ['jisho', 'nai'] }),
  plain('bp_n4_120', 'という話', 'Cerita bahwa {x}.', { suffixReading: 'というはなし' }),
  plain('bp_n4_121', 'ということ', 'Hal bahwa {x}.'),
  plain('bp_n4_122', 'と言ってもいい', 'Bisa dibilang {x}.', { suffixReading: 'といってもいい' }),
  plain('bp_n4_123', 'と言われている', 'Konon katanya {x}.', { suffixReading: 'といわれている' }),
  plain('bp_n4_124', 'と思う', 'Saya pikir (dia) {x}.', { suffixReading: 'とおもう' }),
  plain('bp_n4_126', 'と考えられている', 'Dianggap bahwa {x}.', { suffixReading: 'とかんがえられている' }),
  plain('bp_n4_127', 'と聞いた', 'Saya dengar (dia) {x}.', { suffixReading: 'ときいた' }),
  plain('bp_n4_128', 'とされている', 'Dinyatakan bahwa {x}.'),
  plain('bp_n4_129', 'とみえる', 'Tampaknya {x}.'),
  plain('bp_n4_140', 'なら', 'Kalau (memang) {x}, …'),
  plain('bp_n4_144', 'ことに気がつく', 'Menyadari bahwa {x}.', { suffixReading: 'ことにきがつく' }),
  plain('bp_n4_149', 'のに', 'Padahal {x}, …'),
  plain('bp_n4_151', 'のは', '(Yang) {x} itu adalah …'),
  plain('bp_n4_155', '場合は', 'Dalam hal {x}, …', { suffixReading: 'ばあいは' }),
  plain('bp_n4_157', 'はずがない', 'Tidak mungkin (dia) {x}.'),
  plain('bp_n4_158', 'はずだ', 'Seharusnya (dia) {x}.'),
  plain('bp_n4_169', 'みたいだ', 'Sepertinya (dia) {x}.'),
  plain('bp_n4_173', 'ようだ', 'Tampaknya (dia) {x}.'),
  plain('bp_n4_176', 'ような', '(Hal) yang seperti {x} …'),
  plain('bp_n4_184', 'らしい', 'Kabarnya (dia) {x}.'),
  plain('bp_n4_189', 'んですが', '(Begini,) {x}, …'),
  plain('bp_n2_005', '以上に', 'Lebih dari yang {x}, …', { suffixReading: 'いじょうに', forms: ['jisho', 'ta'] }),
  plain('bp_n2_006', '以上は', 'Karena {x}, (maka harus) …', { suffixReading: 'いじょうは' }),
  plain('bp_n2_014', '上は', 'Karena {x}, (maka) …', { suffixReading: 'うえは' }),
  plain('bp_n2_029', 'かと思ったら', 'Baru dikira {x}, ternyata …', { suffixReading: 'かとおもったら' }),
  plain('bp_n2_032', 'かのように', 'Seolah-olah {x}.'),
  plain('bp_n2_035', 'からといって', 'Hanya karena {x}, belum tentu …'),
  plain('bp_n2_036', 'からには', 'Karena {x}, (sudah semestinya) …'),
  plain('bp_n2_041', 'くせして', 'Padahal {x}, (kok) …'),
  plain('bp_n2_046', 'ことにはならない', 'Tidak berarti {x}.'),
  plain('bp_n2_059', 'せいか', 'Mungkin karena {x}, …'),
  plain('bp_n2_066', 'だけあって', 'Pantas saja, karena {x}, …'),
  plain('bp_n2_067', 'だけに', 'Justru karena {x}, …'),
  plain('bp_n2_068', 'だけのことはある', 'Tidak sia-sia {x}.'),
  plain('bp_n2_070', 'だけましだ', 'Masih untung {x}.'),
  plain('bp_n2_094', '手前', 'Demi gengsi, karena {x}, …', { suffixReading: 'てまえ' }),
  plain('bp_n2_096', 'ということは', 'Kalau {x}, berarti …'),
  plain('bp_n2_097', 'という点から考えると', 'Dilihat dari segi {x}, …', { suffixReading: 'というてんからかんがえると' }),
  plain('bp_n2_099', 'というものだ', 'Itulah yang disebut {x}.'),
  plain('bp_n2_100', 'というものではない', 'Bukan berarti (cukup) {x}.'),
  plain('bp_n2_101', 'というわけではない', 'Bukan berarti {x}.'),
  plain('bp_n2_105', 'とか', 'Katanya {x}, gitu.'),
  plain('bp_n2_106', 'と考えられる', 'Dapat dianggap {x}.', { suffixReading: 'とかんがえられる' }),
  plain('bp_n2_109', 'ところを見ると', 'Melihat {x}, (sepertinya) …', { suffixReading: 'ところをみると' }),
  plain('bp_n2_112', 'としても', 'Kalaupun {x}, …'),
  plain('bp_n2_119', '中を', 'Di tengah {x}, …', { suffixReading: 'なかを', forms: ['jisho'] }),
  plain('bp_n2_127', 'ならともかく', 'Kalau {x} sih masih mending, tapi …'),
  plain('bp_n2_137', 'に決まっている', 'Pasti {x}.', { suffixReading: 'にきまっている' }),
  plain('bp_n2_139', 'のに加えて', 'Selain {x}, …', { suffixReading: 'のにくわえて' }),
  plain('bp_n2_147', 'に過ぎない', 'Hanya sekadar {x}.', { suffixReading: 'にすぎない' }),
  plain('bp_n2_148', 'にせよ', 'Sekalipun {x}, …'),
  plain('bp_n2_149', 'に相違ない', 'Pasti {x}.', { suffixReading: 'にそういない' }),
  plain('bp_n2_157', 'にもかかわらず', 'Meskipun {x}, …'),
  plain('bp_n2_165', 'のではないだろうか', 'Bukankah (mungkin) {x}?'),
  plain('bp_n2_166', 'のみ', 'Hanya {x}.'),
  plain('bp_n2_167', 'のみならず', 'Bukan hanya {x}, …'),
  plain('bp_n2_168', 'のも当然だ', 'Wajar saja {x}.', { suffixReading: 'のもとうぜんだ' }),
  plain('bp_n2_170', 'のももっともだ', 'Masuk akal kalau {x}.'),
  plain('bp_n2_171', 'ばかりか', 'Bukan hanya {x}, bahkan …'),
  plain('bp_n2_176', '反面', 'Di satu sisi {x}, di sisi lain …', { suffixReading: 'はんめん' }),
  plain('bp_n2_184', 'ものか', 'Mana mungkin aku {x}!', { forms: ['jisho'] }),
  plain('bp_n2_185', 'ものがある', 'Ada sesuatu yang membuat {x}.', { forms: ['jisho'] }),
  plain('bp_n2_186', 'ものだから', 'Habisnya {x}, …'),
  plain('bp_n2_187', 'もので', 'Karena {x}, (maaf) …'),
  plain('bp_n2_190', 'ものの', 'Meskipun {x}, …'),
  plain('bp_n2_196', 'ようでは', 'Kalau sampai {x}, (gawat) …'),
  plain('bp_n1_013', 'うちに入らない', 'Tidak terhitung {x}.', { suffixReading: 'うちにはいらない' }),
  plain('bp_n1_016', '折に', 'Saat {x}, …', { suffixReading: 'おりに', forms: ['jisho', 'ta'] }),
  plain('bp_n1_018', 'か否か', 'Apakah {x} atau tidak …', { suffixReading: 'かいなか' }),
  plain('bp_n1_025', 'かと思いきや', 'Dikira {x}, ternyata …', { suffixReading: 'かとおもいきや' }),
  plain('bp_n1_026', '可能性がある', 'Ada kemungkinan {x}.', { suffixReading: 'かのうせいがある' }),
  plain('bp_n1_042', 'かのごとく', 'Seolah-olah {x}.'),
  plain('bp_n1_045', 'ことだし', 'Karena {x}, (jadi) …'),
  plain('bp_n1_049', 'こともあって', 'Antara lain karena {x}, …'),
  plain('bp_n1_053', '次第です', 'Demikianlah, {x}.', { suffixReading: 'しだいです' }),
  plain('bp_n1_063', 'ぞ', '{X}, lho! (tegas)'),
  plain('bp_n1_081', 'だろうに', 'Pasti {x}, padahal …'),
  plain('bp_n1_084', 'ってば', 'Sudah dibilang {x}!'),
  plain('bp_n1_092', 'のではあるまいか', 'Bukankah {x}?'),
  plain('bp_n1_093', 'のではあるまいし', 'Toh bukannya {x}, …'),
  plain('bp_n1_094', 'だけでは済まない', 'Tidak cukup hanya dengan {x}.', { suffixReading: 'だけではすまない' }),
  plain('bp_n1_103', 'とあって', 'Karena {x}, (wajar) …'),
  plain('bp_n1_104', 'とあれば', 'Kalau memang {x}, …'),
  plain('bp_n1_107', 'といったところだ', 'Kira-kira {x}, begitulah.'),
  plain('bp_n1_109', 'というわけだ', 'Jadi begitulah, {x}.'),
  plain('bp_n1_110', 'といえども', 'Sekalipun {x}, …'),
  plain('bp_n1_118', 'ときている', 'Ditambah lagi {x}, …'),
  plain('bp_n1_119', 'ところを', 'Di saat {x}, (maaf) …'),
  plain('bp_n1_120', 'とされる', 'Dinyatakan bahwa {x}.'),
  plain('bp_n1_123', 'とて', 'Sekalipun {x}, …'),
  plain('bp_n1_124', 'となると', 'Kalau sampai {x}, …'),
  plain('bp_n1_126', 'とは', 'Tak disangka {x}!'),
  plain('bp_n1_132', 'とみると', 'Begitu tahu {x}, …'),
  plain('bp_n1_133', 'と見るや', 'Begitu melihat {x}, langsung …', { suffixReading: 'とみるや' }),
  plain('bp_n1_174', 'としたところで', 'Kalaupun {x}, (percuma) …'),
  plain('bp_n1_183', 'にとどまらず', 'Tidak berhenti pada {x}, …'),
  plain('bp_n1_188', 'のには無理がある', 'Agak dipaksakan bahwa {x}.', { suffixReading: 'のにはむりがある' }),
  plain('bp_n1_191', 'にもほどがある', '{X} pun ada batasnya!'),
  plain('bp_n1_196', 'のなんのって', 'Sungguh {x}, bukan main!'),
  plain('bp_n1_198', 'のやら', 'Entah {x} …'),
  plain('bp_n1_227', 'ものと思う', 'Saya kira {x}.', { suffixReading: 'ものとおもう' }),
  plain('bp_n1_228', 'ものと思っていた', 'Tadinya saya kira {x}.', { suffixReading: 'ものとおもっていた' }),
  plain('bp_n1_229', 'ものと思われる', 'Diperkirakan {x}.', { suffixReading: 'ものとおもわれる' }),
  plain('bp_n1_232', 'ものを', 'Padahal {x}, (sayang sekali) …'),
  plain('bp_n1_244', 'わ', '{X}, lho. (wanita)'),
  plain('bp_n1_247', 'のをいいことに', 'Memanfaatkan {x}, …'),
  plain('bp_n1_257', 'ことを前提に', 'Dengan asumsi {x}, …', { suffixReading: 'ことをぜんていに' }),
  plain('bp_n2_038', 'ような気がする', 'Rasanya {x}.', { suffixReading: 'ようなきがする' }),
  r('w4d3g1', 'jisho', 'くらい', 'Sampai-sampai (rasanya ingin) {v} …', VB),
];

const RECIPE_BY_ID = new Map(GRAMMAR_ANIMATION_RECIPES.map(rec => [rec.bunpouId, rec]));

export function getGrammarAnimationRecipe(bunpouId: string): GrammarAnimationRecipe | undefined {
  return RECIPE_BY_ID.get(bunpouId);
}

/** Verba contoh untuk satu cabang pola: verba inti + verba khusus bentuk itu, tanpa yang dikecualikan pola. */
export function getRecipeVerbs(recipe: GrammarAnimationRecipe, branchIdx = 0): GrammarAnimationVerb[] {
  const branch = recipe.branches[branchIdx] ?? recipe.branches[0];
  const excluded = new Set([...(recipe.excludeVerbIds ?? []), ...(branch.excludeVerbIds ?? [])]);
  if (recipe.verbs) return recipe.verbs.filter(v => !excluded.has(v.id));
  const specials = (SPECIALS_BY_FORM[branch.form] ?? []).map(id => SPECIAL_VERBS[id]).slice(0, MAX_SPECIAL_VERBS);
  return [...CORE_VERBS, ...specials].filter(v => !excluded.has(v.id));
}

export type GrammarSegmentRole = 'stem' | 'ending' | 'removed' | 'added' | 'changed' | 'suffix' | 'partner' | 'prefix';

export interface GrammarSegment {
  text: string;
  role: GrammarSegmentRole;
}

export interface GrammarAnimationStage {
  kind: 'base' | 'remove' | 'shift' | 'add' | 'change' | 'suffix' | 'partner' | 'tail' | 'contract' | 'prefix' | 'result';
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
  nakatta: 'Bentuk なかった',
  potential: 'Bentuk potensial',
  ba: 'Bentuk ば',
  imperative: 'Bentuk perintah',
  causative: 'Bentuk kausatif',
  passive: 'Bentuk pasif',
  causative_passive: 'Bentuk kausatif-pasif',
  volitional: 'Bentuk maksud (意向形)',
  masu: 'Bentuk ます',
  tai: 'Bentuk たい',
};

/**
 * Baris aturan yang relevan dari ruleExplanation (CONJUGATION_FORMS_INFO) untuk verba ini.
 * Batang ます memakai aturan ます; た memakai aturan て (perubahannya identik, て→た / で→だ).
 */
function ruleNoteFor(form: ConjugationForm, group: EngineVerbGroup, word: string): string {
  const sourceId = form === 'masu_stem' ? 'masu' : form === 'ta' ? 'te' : form === 'nakatta' ? 'nai' : form;
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
  if (form === 'nakatta') note += ' Lalu ない → なかった.';
  return note;
}

function fillMeaning(template: string, verb: GrammarAnimationVerb, partner?: GrammarAnimationVerb): string {
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const lower = (x: GrammarAnimationVerb) => x.meaningId.split('/')[0].trim().toLowerCase();
  const v = lower(verb);
  const p = (verb.passiveId ?? `di-${v}`).toLowerCase();
  const w = partner ? lower(partner) : v;
  return template
    .replace(/\{V\}/g, cap(v)).replace(/\{v\}/g, v)
    .replace(/\{P\}/g, cap(p)).replace(/\{p\}/g, p)
    .replace(/\{w\}/g, w);
}

/** Bentuk verba (+ perubahan) + akhiran untuk verba kedua. */
function partnerText(pt: GrammarPartner, verb: GrammarAnimationVerb) {
  const exp = explainVerbConjugation(verb.kanji, verb.reading, pt.form);
  if (!exp) return null;
  let text = exp.result.japanese;
  let reading = exp.result.reading;
  if (pt.change) {
    const c = applyTransform(text, reading, pt.change);
    if (!c) return null;
    ({ text, reading } = c);
  }
  return { text: text + pt.suffix, reading: reading + (pt.suffixReading ?? pt.suffix) };
}

/** Baris tabel kana (gyou). う-baris memakai わ untuk bentuk ない (買う → 買わない). */
const KANA_ROWS = [
  'あいうえおわ', 'かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど',
  'なにぬねの', 'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'らりるれろ',
];
function sameKanaRow(a: string, b: string): boolean {
  return a !== b && KANA_ROWS.some(row => row.includes(a) && row.includes(b));
}

/** Ganti kemunculan TERAKHIR pasangan pertama yang cocok; null bila tak ada yang cocok. */
function applyTransform(text: string, reading: string, t: GrammarTransform) {
  for (const [from, to] of t.pairs) {
    const i = text.lastIndexOf(from);
    const j = reading.lastIndexOf(from);
    if (i < 0 || j < 0) continue;
    return {
      from,
      to,
      before: text.slice(0, i),
      after: text.slice(i + from.length),
      text: text.slice(0, i) + to + text.slice(i + from.length),
      reading: reading.slice(0, j) + to + reading.slice(j + from.length),
    };
  }
  return null;
}

export function buildGrammarAnimation(recipe: GrammarAnimationRecipe, verb: GrammarAnimationVerb, branchIdx = 0): GrammarAnimation | null {
  const branch = recipe.branches[branchIdx];
  if (!branch) return null;
  const exp = explainVerbConjugation(verb.kanji, verb.reading, branch.form);
  if (!exp) return null;

  const base = exp.base.japanese;
  const removeStep = exp.steps.find(s => s.kind === 'remove');
  const addStep = exp.steps.find(s => s.kind === 'add');
  const stem = removeStep ? removeStep.text : base;
  const removed = removeStep?.part ?? '';
  const added = addStep?.part ?? '';
  const formLabel = FORM_LABEL[branch.form] ?? branch.form;
  const rule = ruleNoteFor(branch.form, exp.group, base) || `${formLabel}: ${exp.result.japanese} (${exp.result.reading}).`;
  const keepNote = branch.form === 'jisho' ? ' Pola ini memakai bentuk kamus apa adanya.' : '';

  const stages: GrammarAnimationStage[] = [
    {
      kind: 'base',
      label: 'Bentuk kamus',
      note: `${base} (${exp.base.reading}) termasuk ${GROUP_NAME[exp.group]}.${verb.specialNote ? ` ${verb.specialNote}` : ''}${keepNote}`,
      segments: [{ text: stem, role: 'stem' }, { text: removed, role: 'ending' }],
    },
  ];
  // Golongan 1: suku kata terakhir DIGANTI dalam baris yang sama (く→か／き／け／こ), bukan dibuang.
  const shifted = exp.group === 'godan' && removed.length === 1 && added && sameKanaRow(removed, added[0]) ? added[0] : '';
  const rest = shifted ? added.slice(1) : added;
  if (shifted) {
    stages.push({
      kind: 'shift',
      label: `Ganti 「${removed}」→「${shifted}」`,
      note: `${rule} (${removed} dan ${shifted} sebaris dalam tabel kana: hanya vokalnya yang berubah.)`,
      segments: [{ text: stem, role: 'stem' }, { text: shifted, role: 'changed' }],
    });
  } else if (removed) {
    stages.push({
      kind: 'remove',
      label: `Buang 「${removed}」`,
      note: rule,
      segments: [{ text: stem, role: 'stem' }, { text: removed, role: 'removed' }],
    });
  }
  if (rest) {
    stages.push({
      kind: 'add',
      label: `Tambah 「${rest}」`,
      note: `${formLabel}: ${exp.result.japanese} (${exp.result.reading}).`,
      segments: [{ text: stem, role: 'stem' }, { text: shifted, role: 'changed' }, { text: rest, role: 'added' }],
    });
  }

  // Bentuk verba yang sedang dibangun, sebagai segmen berwarna.
  let word: GrammarSegment[] = [{ text: stem, role: 'stem' }, { text: added, role: 'added' }];
  let text = exp.result.japanese;
  let reading = exp.result.reading;

  if (branch.change) {
    const c = applyTransform(text, reading, branch.change);
    if (!c) return null;
    word = [{ text: c.before, role: 'stem' }, { text: c.to, role: 'changed' }, { text: c.after, role: 'stem' }];
    ({ text, reading } = c);
    stages.push({ kind: 'change', label: `「${c.from}」→「${c.to}」`, note: branch.change.note, segments: word });
  }

  if (branch.suffix) {
    word = [...word, { text: branch.suffix, role: 'suffix' }];
    text += branch.suffix;
    reading += branch.suffixReading ?? branch.suffix;
    const attachedTo = branch.change ? 'bentuk tadi' : formLabel.toLowerCase();
    stages.push({
      kind: 'suffix',
      label: `＋ ${branch.suffix}`,
      note: branch.suffixNote ?? `「${branch.suffix}」 ditempel langsung setelah ${attachedTo}.`,
      segments: word,
    });
  }

  let partnerVerb: GrammarAnimationVerb | undefined;
  if (branch.partner) {
    const pt = branch.partner;
    partnerVerb = pt.same ? verb : PARTNER_VERB;
    const pr = partnerText(pt, partnerVerb);
    if (!pr) return null;
    word = [...word, { text: pr.text, role: 'partner' }];
    text += pr.text;
    reading += pr.reading;
    const ptLabel = FORM_LABEL[pt.form]?.toLowerCase() ?? pt.form;
    stages.push({
      kind: 'partner',
      label: `＋ ${pr.text}`,
      note: pt.same
        ? `Verba yang sama (${verb.kanji}) diulang dalam ${ptLabel}${pt.suffix ? ` + 「${pt.suffix}」` : ''}.`
        : `Verba kedua (${partnerVerb.kanji}, "${partnerVerb.meaningId.toLowerCase()}") juga diubah ke ${ptLabel}${pt.suffix ? ` + 「${pt.suffix}」` : ''}.`,
      segments: word,
    });
  }

  if (branch.tail) {
    word = [...word, { text: branch.tail, role: 'suffix' }];
    text += branch.tail;
    reading += branch.tailReading ?? branch.tail;
    stages.push({ kind: 'tail', label: `＋ ${branch.tail}`, note: `「${branch.tail}」 menutup pola.`, segments: word });
  }

  if (branch.contract) {
    const c = applyTransform(text, reading, branch.contract);
    if (!c) return null;
    ({ text, reading } = c);
    stages.push({
      kind: 'contract',
      label: `Singkat 「${c.from}」→「${c.to}」`,
      note: branch.contract.note,
      segments: [{ text: c.before, role: 'stem' }, { text: c.to, role: 'changed' }, { text: c.after, role: 'stem' }],
    });
  }

  if (branch.prefix) {
    const segs: GrammarSegment[] = [{ text: branch.prefix, role: 'prefix' }, { text, role: 'stem' }];
    text = branch.prefix + text;
    reading = (branch.prefixReading ?? branch.prefix) + reading;
    stages.push({ kind: 'prefix', label: `Awalan 「${branch.prefix}」`, note: `「${branch.prefix}」 diletakkan di depan verba.`, segments: segs });
  }

  const meaning = fillMeaning(branch.meaningTemplate, verb, partnerVerb);
  stages.push({
    kind: 'result',
    label: 'Kalimat jadi',
    note: meaning,
    segments: [{ text, role: 'stem' }],
  });

  return { stages, result: { japanese: text, reading, romaji: wanakana.toRomaji(reading), meaning } };
}
