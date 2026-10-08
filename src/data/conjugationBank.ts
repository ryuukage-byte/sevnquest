import { findSubBranch } from './bunpouSubKnowledge';
import { SubFormulaBranch } from '../types/content';

export interface ConjugationPattern {
  id: string;
  nameJa: string;
  nameId: string;
  nameEn: string;
  symbol: string;
  formation: {
    groupI: string;
    groupII: string;
    groupIII: string;
  };
  shortDescription: string;
}

export interface AuxiliaryInflectionRow {
  formName: string;
  japanese: string;
  reading: string;
  example: string;
  nuance: string;
}

export interface AuxiliaryEnding {
  id: string;
  token: string;
  nameJa: string;
  nameId: string;
  nameEn: string;
  description: string;
  inflections: AuxiliaryInflectionRow[];
}

export interface VerbGroupInfo {
  groupName: string;
  japaneseName: string;
  romajiName: string;
  definition: string;
  rule: string;
  examples: string[];
  exceptions?: string[];
}

export interface GrammarConnector {
  id: string;
  token: string;
  nameId: string;
  nameEn: string;
  description: string;
  subBranch?: SubFormulaBranch;
}

// ─── Base Conjugation Patterns ──────────────────────────────────────

export const CONJUGATION_PATTERNS: Record<string, ConjugationPattern> = {
  // ── Verb Forms ──
  jisho: {
    id: 'jisho',
    nameJa: '辞書形',
    nameId: 'Bentuk Kamus',
    nameEn: 'Dictionary Form',
    symbol: 'Vる',
    formation: {
      groupI: 'Bentuk dasar: 書く、読む、話す',
      groupII: 'Bentuk dasar: 食べる、見る、起きる',
      groupIII: 'する、来る（くる）',
    },
    shortDescription: 'Bentuk dasar kata kerja yang ditemukan di kamus. Digunakan dalam kalimat informal.',
  },
  masu: {
    id: 'masu',
    nameJa: 'ます形',
    nameId: 'Bentuk Sopan',
    nameEn: 'Polite Form',
    symbol: 'Vます',
    formation: {
      groupI: 'Ubah akhiran う段 → い段 + ます\n書く → 書きます、読む → 読みます、話す → 話します',
      groupII: 'Hapus る + ます\n食べる → 食べます、見る → 見ます',
      groupIII: 'する → します、来る → 来（き）ます',
    },
    shortDescription: 'Bentuk sopan/formal kata kerja. Stem ます juga digunakan sebagai dasar banyak pola.',
  },
  te_kei: {
    id: 'te_kei',
    nameJa: 'て形',
    nameId: 'Bentuk Te',
    nameEn: 'Te-form',
    symbol: 'Vて',
    formation: {
      groupI: 'く→いて、ぐ→いで、す→して、む/ぶ/ぬ→んで、う/つ/る→って\n書く→書いて、泳ぐ→泳いで、話す→話して、読む→読んで、買う→買って',
      groupII: 'Hapus る + て\n食べる → 食べて、見る → 見て',
      groupIII: 'する → して、来る → 来（き）て',
    },
    shortDescription: 'Bentuk sambung serbaguna. Digunakan untuk menghubungkan kalimat, meminta tolong, menyatakan sedang berlangsung, dll.',
  },
  te_kei_voiced: {
    id: 'te_kei_voiced',
    nameJa: 'で形',
    nameId: 'Bentuk De (Te bersuara)',
    nameEn: 'Voiced Te-form',
    symbol: 'Vで',
    formation: {
      groupI: 'ぐ→いで、む/ぶ/ぬ→んで\n泳ぐ→泳いで、読む→読んで、遊ぶ→遊んで',
      groupII: '(Tidak berlaku — selalu て)',
      groupIII: '(Tidak berlaku)',
    },
    shortDescription: 'Varian bersuara dari bentuk て, muncul pada kata kerja Grup I tertentu.',
  },
  nai: {
    id: 'nai',
    nameJa: 'ない形',
    nameId: 'Bentuk Negatif',
    nameEn: 'Negative Form',
    symbol: 'Vない',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + ない\n書く → 書かない、読む → 読まない、買う → 買わない',
      groupII: 'Hapus る + ない\n食べる → 食べない、見る → 見ない',
      groupIII: 'する → しない、来る → 来（こ）ない',
    },
    shortDescription: 'Bentuk negatif informal. Basis untuk banyak pola negatif lainnya.',
  },
  ta: {
    id: 'ta',
    nameJa: 'た形',
    nameId: 'Bentuk Lampau',
    nameEn: 'Past Form',
    symbol: 'Vた',
    formation: {
      groupI: 'Sama dengan て形, ganti て→た、で→だ\n書く→書いた、泳ぐ→泳いだ、話す→話した、読む→読んだ',
      groupII: 'Hapus る + た\n食べる → 食べた、見る → 見た',
      groupIII: 'する → した、来る → 来（き）た',
    },
    shortDescription: 'Bentuk lampau informal. Pola pembentukannya sama dengan て形.',
  },
  ukemi: {
    id: 'ukemi',
    nameJa: '受身形',
    nameId: 'Bentuk Pasif',
    nameEn: 'Passive Form',
    symbol: 'Vれる',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + れる\n書く → 書かれる、読む → 読まれる、話す → 話される',
      groupII: 'Hapus る + られる\n食べる → 食べられる、見る → 見られる',
      groupIII: 'する → される、来る → 来（こ）られる',
    },
    shortDescription: 'Menyatakan tindakan yang diterima subjek. Juga digunakan untuk menyatakan fakta tanpa menyebut pelaku.',
  },
  shieki: {
    id: 'shieki',
    nameJa: '使役形',
    nameId: 'Bentuk Kausatif',
    nameEn: 'Causative Form',
    symbol: 'V(さ)せる',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + せる\n書く → 書かせる、読む → 読ませる',
      groupII: 'Hapus る + させる\n食べる → 食べさせる、見る → 見させる',
      groupIII: 'する → させる、来る → 来（こ）させる',
    },
    shortDescription: 'Menyatakan "menyuruh/membiarkan seseorang melakukan sesuatu".',
  },
  shieki_te: {
    id: 'shieki_te',
    nameJa: '使役て形',
    nameId: 'Bentuk Kausatif + Te',
    nameEn: 'Causative Te-form',
    symbol: 'V(さ)せて',
    formation: {
      groupI: 'V使役形 → させる → させて\n書く → 書かせて、読む → 読ませて',
      groupII: 'V使役形 → させる → させて\n食べる → 食べさせて',
      groupIII: 'する → させて、来る → 来させて',
    },
    shortDescription: 'Bentuk て dari kausatif. Sering dipakai untuk meminta izin: V(さ)せてください.',
  },
  ikou: {
    id: 'ikou',
    nameJa: '意向形',
    nameId: 'Bentuk Ajakan / Kemauan',
    nameEn: 'Volitional Form',
    symbol: 'Vよう',
    formation: {
      groupI: 'Ubah akhiran う段 → おう段\n書く → 書こう、読む → 読もう、話す → 話そう',
      groupII: 'Hapus る + よう\n食べる → 食べよう、見る → 見よう',
      groupIII: 'する → しよう、来る → 来（こ）よう',
    },
    shortDescription: 'Menyatakan ajakan ("Ayo...") atau niat/kemauan ("Saya akan...").',
  },
  ba: {
    id: 'ba',
    nameJa: 'ば形',
    nameId: 'Bentuk Kondisional -ba',
    nameEn: 'Conditional ba-form',
    symbol: 'Vば',
    formation: {
      groupI: 'Ubah akhiran う段 → え段 + ば\n書く → 書けば、読む → 読めば',
      groupII: 'Hapus る + れば\n食べる → 食べれば、見る → 見れば',
      groupIII: 'する → すれば、来る → 来（く）れば',
    },
    shortDescription: 'Menyatakan kondisi "kalau/jika..." dengan nuansa syarat.',
  },
  meirei: {
    id: 'meirei',
    nameJa: '命令形',
    nameId: 'Bentuk Perintah',
    nameEn: 'Imperative Form',
    symbol: 'V命令形',
    formation: {
      groupI: 'Ubah akhiran う段 → え段\n書く → 書け、読む → 読め',
      groupII: 'Hapus る + ろ (atau よ)\n食べる → 食べろ、見る → 見ろ',
      groupIII: 'する → しろ／せよ、来る → 来（こ）い',
    },
    shortDescription: 'Perintah langsung/kasar. Sering muncul di papan tanda, olahraga, atau situasi darurat.',
  },
  kano: {
    id: 'kano',
    nameJa: '可能形',
    nameId: 'Bentuk Potensi / Bisa',
    nameEn: 'Potential Form',
    symbol: 'Vれる',
    formation: {
      groupI: 'Ubah akhiran う段 → え段 + る\n書く → 書ける、読む → 読める',
      groupII: 'Hapus る + られる (sering disingkat → れる)\n食べる → 食べられる／食べれる',
      groupIII: 'する → できる、来る → 来（こ）られる',
    },
    shortDescription: 'Menyatakan kemampuan "bisa melakukan...". Grup II sering disingkat tanpa ら (ら抜き).',
  },
  zu: {
    id: 'zu',
    nameJa: 'ず形',
    nameId: 'Bentuk Negatif Formal (-zu)',
    nameEn: 'Zu-form (literary negative)',
    symbol: 'Vずに',
    formation: {
      groupI: 'Ubah akhiran う段 → あ段 + ずに\n書く → 書かずに、読む → 読まずに',
      groupII: 'Hapus る + ずに\n食べる → 食べずに',
      groupIII: 'する → せずに、来る → 来（こ）ずに',
    },
    shortDescription: 'Bentuk negatif literer yang berarti "tanpa melakukan V". Lebih formal dari Vないで.',
  },

  // ── Adjective / Noun forms ──
  adj_i: {
    id: 'adj_i',
    nameJa: 'い形容詞',
    nameId: 'Kata Sifat -i',
    nameEn: 'I-Adjective',
    symbol: 'A',
    formation: {
      groupI: 'Bentuk dasar: 大きい、高い、新しい',
      groupII: 'く形: い → く (大きい → 大きく)',
      groupIII: 'かった: い → かった (大きい → 大きかった)',
    },
    shortDescription: 'Kata sifat berakhiran い. Berkonjugasi langsung tanpa partikel.',
  },
  adj_na: {
    id: 'adj_na',
    nameJa: 'な形容詞',
    nameId: 'Kata Sifat -na',
    nameEn: 'Na-Adjective',
    symbol: 'na',
    formation: {
      groupI: 'Modifikasi N: na + な + N (きれいな花)',
      groupII: 'Predikat: na + だ (きれいだ) / na + です (きれいです)',
      groupIII: 'Lampau: na + だった (きれいだった)',
    },
    shortDescription: 'Kata sifat yang membutuhkan な saat memodifikasi kata benda.',
  },
  noun: {
    id: 'noun',
    nameJa: '名詞',
    nameId: 'Kata Benda',
    nameEn: 'Noun',
    symbol: 'N',
    formation: {
      groupI: 'Dasar: N + だ / です',
      groupII: 'Modifikasi: N + の + N (日本の文化)',
      groupIII: 'Lampau: N + だった / でした',
    },
    shortDescription: 'Kata benda. Digunakan dengan partikel dan kopula (だ/です) dalam kalimat.',
  },
};

// ─── Grammar Connectors / Function Words ────────────────────────────

const GRAMMAR_CONNECTORS: Record<string, GrammarConnector> = {
  to_omou: {
    id: 'to_omou',
    token: 'と思う',
    nameId: '"berpikir / berniat"',
    nameEn: '"to think / to intend"',
    description: 'Menyatakan pikiran atau niat. Dengan Vよう＋と思う menunjukkan niat kuat untuk melakukan sesuatu.',
  },
  to_suru: {
    id: 'to_suru',
    token: 'とする',
    nameId: '"mencoba / akan (melakukan)"',
    nameEn: '"to try to / to be about to"',
    description: 'Dengan Vよう＋とする menunjukkan saat seseorang mencoba atau akan mulai melakukan tindakan.',
  },
  to_shinai: {
    id: 'to_shinai',
    token: 'としない',
    nameId: '"tidak mau (melakukan)"',
    nameEn: '"to show no intention of"',
    description: 'Dengan Vよう＋としない menyatakan ketiadaan niat/kemauan. Subjek sama sekali tidak menunjukkan tanda-tanda akan melakukan.',
  },
  you_ni_suru: {
    id: 'you_ni_suru',
    token: 'ようにする',
    nameId: '"berusaha agar / membiasakan"',
    nameEn: '"to make an effort to / to make sure that"',
    description: 'Menunjukkan kebiasaan atau usaha sadar untuk melakukan/tidak melakukan sesuatu.',
  },
  you_ni_naru: {
    id: 'you_ni_naru',
    token: 'ようになる',
    nameId: '"menjadi bisa / berubah jadi"',
    nameEn: '"to come to / to become able to"',
    description: 'Menunjukkan perubahan keadaan — sesuatu yang tadinya tidak bisa, kini menjadi bisa.',
  },
  you_ni: {
    id: 'you_ni',
    token: 'ように',
    nameId: '"agar / supaya / seperti"',
    nameEn: '"so that / in order to / as"',
    description: 'Menyatakan tujuan atau cara. Juga dipakai sebagai pembuka "seperti yang...".',
  },
  you_ni_period: {
    id: 'you_ni_period',
    token: 'ように。',
    nameId: '"perintah halus / harapan"',
    nameEn: '"soft command / wish"',
    description: 'Di akhir kalimat: perintah halus ("...ya.") atau harapan/doa ("semoga...").',
  },
  koto_ni_naru: {
    id: 'koto_ni_naru',
    token: 'ことになる',
    nameId: '"diputuskan bahwa / jadinya"',
    nameEn: '"it has been decided that"',
    description: 'Menyatakan keputusan yang dibuat oleh pihak lain atau keadaan yang terjadi di luar kendali pembicara.',
  },
  koto_ni_suru: {
    id: 'koto_ni_suru',
    token: 'ことにする',
    nameId: '"memutuskan untuk"',
    nameEn: '"to decide to"',
    description: 'Menyatakan keputusan pribadi pembicara. Berbeda dengan ことになる yang keputusannya datang dari luar.',
  },
  koto_ni_natteiru: {
    id: 'koto_ni_natteiru',
    token: 'ことになっている',
    nameId: '"sudah menjadi aturan / ditentukan bahwa"',
    nameEn: '"it is a rule/arrangement that"',
    description: 'Menyatakan aturan, kebijakan, atau keadaan yang sudah ditetapkan dan berlaku.',
  },
  wake_ni_wa_ikanai: {
    id: 'wake_ni_wa_ikanai',
    token: 'わけにはいかない',
    nameId: '"tidak bisa begitu saja / tidak mungkin"',
    nameEn: '"cannot possibly / it won\'t do to"',
    description: 'Menyatakan bahwa secara moral, sosial, atau situasional, seseorang tidak bisa melakukan tindakan tersebut.',
  },
  kudasai: {
    id: 'kudasai',
    token: 'ください',
    nameId: '"tolong / mohon"',
    nameEn: '"please (do)"',
    description: 'Permintaan sopan. Dengan V(さ)せて＋ください berarti meminta izin.',
  },
  moraemasu_ka: {
    id: 'moraemasu_ka',
    token: 'もらえますか',
    nameId: '"bolehkah saya..."',
    nameEn: '"may I / could you let me"',
    description: 'Permintaan izin yang lebih sopan dari ください. Sering dipakai dengan V(さ)せて.',
  },
  moraemasen_ka: {
    id: 'moraemasen_ka',
    token: 'もらえませんか',
    nameId: '"bisakah saya... (sangat sopan)"',
    nameEn: '"would it be possible for me to"',
    description: 'Bentuk paling sopan untuk meminta izin. Negasi retoris menambah kesantunan.',
  },
  mitai_da: {
    id: 'mitai_da',
    token: 'みたいだ',
    nameId: '"sepertinya / mirip (predikat)"',
    nameEn: '"it seems like / similar to"',
    description: 'Di akhir kalimat sebagai predikat: menyatakan kesan perbandingan atau kesimpulan dugaan. Lebih santai dari 〜ようだ.',
  },
  mitai_ni: {
    id: 'mitai_ni',
    token: 'みたいに',
    nameId: '"seperti (adverbia cara)"',
    nameEn: '"like / as (adverbial)"',
    description: 'Sebelum kata kerja atau kata sifat sebagai keterangan cara: melakukan tindakan dengan perumpamaan serupa (contoh: おじいさんみたいに話す).',
  },
  mitai_na: {
    id: 'mitai_na',
    token: 'みたいなN',
    nameId: '"seperti (modifikasi nomina)"',
    nameEn: '"like / similar to (noun modifier)"',
    description: 'Sebelum kata benda untuk menerangkan sifat atau kemiripan dengan benda tersebut (contoh: 本物の果物みたいな味).',
  },
  rashii: {
    id: 'rashii',
    token: 'らしい',
    nameId: '"khas / benar-benar seperti"',
    nameEn: '"typical of / -like"',
    description: 'Dengan N: menyatakan sesuatu benar-benar sesuai citra khas N tersebut.',
  },
  ppoi: {
    id: 'ppoi',
    token: 'っぽい',
    nameId: '"agak / kesan -an"',
    nameEn: '"-ish / -like (tendency)"',
    description: 'Menyatakan kesan kuat atau kecenderungan memiliki sifat tertentu (kadang sedikit negatif).',
  },
  ageru_agaru: {
    id: 'ageru_agaru',
    token: '上げる／上がる',
    nameId: '"menyelesaikan / naik-selesai"',
    nameEn: '"to finish (up) / to rise/complete"',
    description: 'Vます＋上げる: menyelesaikan dari bawah ke atas. Vます＋上がる: selesai dengan sendirinya.',
  },
  kiru_kireru: {
    id: 'kiru_kireru',
    token: '切る／切れる／切れない',
    nameId: '"sepenuhnya / habis / tidak habis"',
    nameEn: '"completely / able to finish / unable to finish"',
    description: 'Vます＋切る: melakukan sepenuhnya. 切れる: mampu menyelesaikan. 切れない: tidak mampu menyelesaikan.',
  },
  kakeru: {
    id: 'kakeru',
    token: 'かける',
    nameId: '"setengah / mulai tapi belum selesai"',
    nameEn: '"half-done / in the middle of"',
    description: 'Vます＋かける: melakukan setengah jalan, belum selesai. かけのN: N yang setengah jadi.',
  },
  tate: {
    id: 'tate',
    token: 'たて',
    nameId: '"baru saja (segar)"',
    nameEn: '"freshly / just (done)"',
    description: 'Vます＋たて: baru saja selesai dilakukan, masih segar/baru. たてのN: N yang baru saja.',
  },
};

// ─── Lookup Helpers ─────────────────────────────────────────────────

/**
 * Find a conjugation pattern by its symbol or partial match.
 * Returns the pattern ID or undefined.
 */
export function findPatternBySymbol(symbol: string): string | undefined {
  // Direct symbol match
  for (const [id, p] of Object.entries(CONJUGATION_PATTERNS)) {
    if (p.symbol === symbol) return id;
  }
  // Partial matching for complex symbols
  const normalized = symbol.replace(/\s+/g, '');
  for (const [id, p] of Object.entries(CONJUGATION_PATTERNS)) {
    if (normalized === p.symbol.replace(/\s+/g, '')) return id;
  }
  return undefined;
}

/**
 * Find a grammar connector by its token text.
 * Returns the connector ID or undefined.
 */
export function findConnectorByToken(token: string): string | undefined {
  const normalized = token.replace(/^[〜~]/, '').replace(/\s+/g, '');
  
  // 1. Direct match in GRAMMAR_CONNECTORS
  for (const [id, c] of Object.entries(GRAMMAR_CONNECTORS)) {
    const cNorm = c.token.replace(/^[〜~]/, '').replace(/\s+/g, '');
    if (normalized === cNorm) return id;
  }

  // 2. Lookup in Sub-Branch knowledge bank
  const sub = findSubBranch(normalized);
  if (sub) return sub.id;

  // 3. Try partial / suffix matching in GRAMMAR_CONNECTORS
  for (const [id, c] of Object.entries(GRAMMAR_CONNECTORS)) {
    const cNorm = c.token.replace(/^[〜~]/, '').replace(/\s+/g, '');
    if (normalized.endsWith(cNorm) || cNorm.endsWith(normalized)) {
      return id;
    }
  }

  // 4. Handle trailing 'N' or variations like みたいなN -> みたいな / mitai_na
  if (normalized.endsWith('N')) {
    const withoutN = normalized.slice(0, -1);
    const subNoN = findSubBranch(withoutN);
    if (subNoN) return subNoN.id;
    for (const [id, c] of Object.entries(GRAMMAR_CONNECTORS)) {
      const cNorm = c.token.replace(/^[〜~]/, '').replace(/\s+/g, '');
      if (withoutN === cNorm || cNorm.startsWith(withoutN)) return id;
    }
  }

  return undefined;
}

/**
 * Retrieve either a GrammarConnector or rich SubFormulaBranch by patternId.
 */
export function getConnectorOrSubBranch(id: string): {
  id: string;
  token: string;
  nameId: string;
  nameEn: string;
  description: string;
  subBranch?: SubFormulaBranch;
} | undefined {
  const sub = findSubBranch(id);
  if (sub) {
    return {
      id: sub.id,
      token: sub.token,
      nameId: sub.token,
      nameEn: sub.usageLocation,
      description: sub.meaning,
      subBranch: sub,
    };
  }
  const c = GRAMMAR_CONNECTORS[id];
  if (c) {
    return c;
  }
  return undefined;
}

// ─── Auxiliary Verb Inflections (Kata Kerja Bantu / Akhiran Kalimat) ────────

export const AUXILIARY_ENDINGS: Record<string, AuxiliaryEnding> = {
  aux_iru: {
    id: 'aux_iru',
    token: 'いる',
    nameJa: '補助動詞「いる」',
    nameId: 'Kata Kerja Bantu "Iru" (Sedang Berlangsung / Kondisi Tetap)',
    nameEn: 'Auxiliary Verb "Iru" (Progressive / State)',
    description: 'Mengikuti bentuk Vて untuk menyatakan tindakan yang sedang berlangsung (〜ている) atau keadaan yang masih bertahan dari suatu tindakan.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜ている',
        reading: '〜te iru',
        example: '待っている (matte iru)',
        nuance: 'Sedang menunggu (santai / informal)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜ています',
        reading: '〜te imasu',
        example: '待っています (matte imasu)',
        nuance: 'Sedang menunggu (sopan / formal)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜ていた',
        reading: '〜te ita',
        example: '待っていた (matte ita)',
        nuance: 'Tadi sedang menunggu (lampau santai)',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜ていました',
        reading: '〜te imashita',
        example: '待っていました (matte imashita)',
        nuance: 'Tadi sedang menunggu (lampau sopan)',
      },
      {
        formName: 'Negatif (Nai)',
        japanese: '〜ていない',
        reading: '〜te inai',
        example: '待っていない (matte inai)',
        nuance: 'Sedang tidak menunggu (santai)',
      },
      {
        formName: 'Sopan Negatif (Masen)',
        japanese: '〜ていません',
        reading: '〜te imasen',
        example: '待っていません (matte imasen)',
        nuance: 'Sedang tidak menunggu (sopan)',
      },
      {
        formName: 'Negatif Lampau (Nakatta)',
        japanese: '〜ていなかった',
        reading: '〜te inakatta',
        example: '待っていなかった (matte inakatta)',
        nuance: 'Tadi tidak sedang menunggu (lampau santai)',
      },
      {
        formName: 'Bentuk Sambung (Te)',
        japanese: '〜ていて',
        reading: '〜te ite',
        example: '待っていてください (matte ite kudasai)',
        nuance: 'Tolong tetap tunggu (sambung / permohonan)',
      },
    ],
  },
  aux_aru: {
    id: 'aux_aru',
    token: 'ある',
    nameJa: '補助動詞「ある」',
    nameId: 'Kata Kerja Bantu "Aru" (Kondisi Sengaja Dibuat / Disiapkan)',
    nameEn: 'Auxiliary Verb "Aru" (Resultant State)',
    description: 'Mengikuti bentuk Vて dari kata kerja transitif untuk menyatakan hasil tindakan yang sengaja dilakukan seseorang demi tujuan tertentu.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜てある',
        reading: '〜te aru',
        example: '書いてある (kaite aru)',
        nuance: 'Sudah tertulis / disiapkan (santai)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜てあります',
        reading: '〜te arimasu',
        example: '書いてあります (kaite arimasu)',
        nuance: 'Sudah tertulis / disiapkan (sopan)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜てあった',
        reading: '〜te atta',
        example: '書いてあった (kaite atta)',
        nuance: 'Tadi sudah tertulis (lampau santai)',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜てありました',
        reading: '〜te arimashita',
        example: '書いてありました (kaite arimashita)',
        nuance: 'Tadi sudah tertulis (lampau sopan)',
      },
    ],
  },
  aux_oku: {
    id: 'aux_oku',
    token: 'おく',
    nameJa: '補助動詞「おく」',
    nameId: 'Kata Kerja Bantu "Oku" / "Toku" (Persiapan Terlebih Dahulu)',
    nameEn: 'Auxiliary Verb "Oku" (Preparation in Advance)',
    description: 'Mengikuti Vて untuk melakukan sesuatu sebagai persiapan sebelum hal lain terjadi. Dalam percakapan santai sering disingkat menjadi 〜とく／〜どく.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜ておく / 〜とく',
        reading: '〜te oku / 〜toku',
        example: '買っておく / 買っとく (katte oku / kattoku)',
        nuance: 'Membeli dulu untuk persiapan (santai)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜ておきます',
        reading: '〜te okimasu',
        example: '買っておきます (katte okimasu)',
        nuance: 'Akan beli dulu untuk persiapan (sopan)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜ておいた / 〜といた',
        reading: '〜te oita / 〜toita',
        example: '買っておいた / 買っといた',
        nuance: 'Sudah beli dulu untuk persiapan (santai)',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜ておきました',
        reading: '〜te okimashita',
        example: '買っておきました (katte okimashita)',
        nuance: 'Sudah beli dulu untuk persiapan (sopan)',
      },
      {
        formName: 'Maksud / Ajakan (You)',
        japanese: '〜ておこう / 〜とこう',
        reading: '〜te okou / 〜tokou',
        example: '買っておこう / 買っとこう',
        nuance: 'Ayo beli dulu yuk! / Akan kubeli dulu',
      },
      {
        formName: 'Permohonan (Te)',
        japanese: '〜ておいて(ください)',
        reading: '〜te oite (kudasai)',
        example: '買っておいてください',
        nuance: 'Tolong beli dulu untuk persiapan',
      },
    ],
  },
  aux_shimau: {
    id: 'aux_shimau',
    token: 'しまう',
    nameJa: '補助動詞「しまう」',
    nameId: 'Kata Kerja Bantu "Shimau" / "Chau" (Selesai Tuntas / Penyesalan)',
    nameEn: 'Auxiliary Verb "Shimau" (Completion / Regret)',
    description: 'Menyatakan bahwa suatu tindakan telah selesai secara tuntas, atau terjadi secara tidak sengaja dengan nuansa penyesalan. Ragam lisan disingkat menjadi 〜ちゃう／〜じゃう.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜てしまう / 〜ちゃう',
        reading: '〜te shimau / 〜chau',
        example: '食べてしまう / 食べちゃう',
        nuance: 'Menghabiskan / telanjur makan (santai)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜てしまいます',
        reading: '〜te shimaimasu',
        example: '食べてしまいます',
        nuance: 'Akan habis termakan (sopan)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜てしまった / 〜ちゃった',
        reading: '〜te shimatta / 〜chatta',
        example: '食べてしまった / 食べちゃった',
        nuance: 'Sudah telanjur dimakan (penyesalan santai)',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜てしまいました',
        reading: '〜te shimaimashita',
        example: '食べてしまいました',
        nuance: 'Sudah telanjur dimakan (penyesalan sopan)',
      },
      {
        formName: 'Maksud / Ajakan (You)',
        japanese: '〜てしまおう / 〜ちゃおう',
        reading: '〜te shimaou / 〜chaou',
        example: '飲んじゃおう！ (nonjaou!)',
        nuance: 'Ayo kita habiskan minumannya!',
      },
    ],
  },
  aux_miru: {
    id: 'aux_miru',
    token: 'みる',
    nameJa: '補助動詞「みる」',
    nameId: 'Kata Kerja Bantu "Miru" (Mencoba Melakukan)',
    nameEn: 'Auxiliary Verb "Miru" (Try doing)',
    description: 'Mengikuti Vて untuk menyatakan tindakan mencoba melakukan sesuatu untuk melihat hasilnya.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜てみる',
        reading: '〜te miru',
        example: '食べてみる (tabete miru)',
        nuance: 'Mencoba makan (santai)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜てみます',
        reading: '〜te mimasu',
        example: '食べてみます (tabete mimasu)',
        nuance: 'Akan coba makan (sopan)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜てみた',
        reading: '〜te mita',
        example: '食べてみた (tabete mita)',
        nuance: 'Sudah pernah mencoba makan (santai)',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜てみました',
        reading: '〜te mimashita',
        example: '食べてみました (tabete mimashita)',
        nuance: 'Sudah pernah mencoba makan (sopan)',
      },
      {
        formName: 'Permintaan (Te)',
        japanese: '〜てみて(ください)',
        reading: '〜te mite (kudasai)',
        example: '食べてみてください',
        nuance: 'Silakan dicoba makan ya',
      },
    ],
  },
  aux_iku: {
    id: 'aux_iku',
    token: 'いく',
    nameJa: '補助動詞「いく」',
    nameId: 'Kata Kerja Bantu "Iku" (Menjauh / Masa Depan)',
    nameEn: 'Auxiliary Verb "Iku" (Moving away / Future continuation)',
    description: 'Menyatakan tindakan/perubahan yang bergerak menjauh dari pembicara atau akan terus berlanjut ke masa depan.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜ていく',
        reading: '〜te iku',
        example: '増えていく (fuete iku)',
        nuance: 'Akan terus bertambah ke depan',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜ていきます',
        reading: '〜te ikimasu',
        example: '増えていきます (fuete ikimasu)',
        nuance: 'Akan terus bertambah ke depan (sopan)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜ていった',
        reading: '〜te itta',
        example: '消えていった (kiete itta)',
        nuance: 'Berangsur menghilang menjauh (lampau)',
      },
    ],
  },
  aux_kuru: {
    id: 'aux_kuru',
    token: 'くる',
    nameJa: '補助動詞「くる」',
    nameId: 'Kata Kerja Bantu "Kuru" (Mendekat / Dari Dulu Hingga Kini)',
    nameEn: 'Auxiliary Verb "Kuru" (Moving closer / Process up to now)',
    description: 'Menyatakan tindakan yang bergerak mendekat ke arah pembicara, atau proses perubahan yang terjadi dari masa lampau hingga saat ini.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜てくる',
        reading: '〜te kuru',
        example: '暖かくなってきた (atatakaku natte kita)',
        nuance: 'Mulai terasa hangat (perubahan berlangsung)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜てきます',
        reading: '〜te kimasu',
        example: '買ってきます (katte kimasu)',
        nuance: 'Akan pergi membeli lalu kembali lagi',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜てきた',
        reading: '〜te kita',
        example: '増えてきた (fuete kita)',
        nuance: 'Sudah mulai meningkat hingga sekarang',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜てきました',
        reading: '〜te kimashita',
        example: '暖かくなってきました',
        nuance: 'Sudah mulai terasa hangat (sopan)',
      },
    ],
  },
  aux_reru: {
    id: 'aux_reru',
    token: 'れる／られる',
    nameJa: '受身・可能の助動詞',
    nameId: 'Kata Akhiran Pasif / Potensial (Vれる / Vられる)',
    nameEn: 'Passive / Potential Auxiliary (-(r)eru / -(r)areru)',
    description: 'Kata kerja yang diubah ke bentuk pasif atau potensial berkonjugasi seperti kata kerja Golongan II (Ichidan), sehingga dapat berubah ke bentuk sopan, lampau, maupun sambung.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜れる / 〜られる',
        reading: '〜reru / 〜rareru',
        example: '言われる / 食べられる',
        nuance: 'Dikatakan / bisa dimakan (santai)',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜れます / 〜られます',
        reading: '〜remasu / 〜raremasu',
        example: '言われます / 食べられます',
        nuance: 'Dikatakan / bisa dimakan (sopan)',
      },
      {
        formName: 'Lampau (Ta)',
        japanese: '〜れた / 〜られた',
        reading: '〜reta / 〜rareta',
        example: '泣かれた / 壊された',
        nuance: 'Telah ditangisi / dirusak (lampau)',
      },
      {
        formName: 'Sopan Lampau (Mashita)',
        japanese: '〜れました / 〜られました',
        reading: '〜remashita / 〜raremashita',
        example: '言われました / 褒められました',
        nuance: 'Telah dikatakan / dipuji (sopan lampau)',
      },
      {
        formName: 'Negatif (Nai)',
        japanese: '〜れない / 〜られない',
        reading: '〜renai / 〜rarenai',
        example: '信じられない (shinjirarenai)',
        nuance: 'Tidak bisa dipercaya / tidak dilakukan',
      },
      {
        formName: 'Bentuk Sambung (Te)',
        japanese: '〜れて / 〜られて',
        reading: '〜rete / 〜rarete',
        example: '言われて / 泣かれてしまった',
        nuance: 'Dikatakan lalu... / telanjur ditangisi',
      },
    ],
  },
  aux_seru: {
    id: 'aux_seru',
    token: 'せる／させる',
    nameJa: '使役の助動詞',
    nameId: 'Kata Akhiran Kausatif (Vせる / Vさせる)',
    nameEn: 'Causative Auxiliary (-(s)eru / -(s)aseru)',
    description: 'Bentuk menyuruh atau membiarkan seseorang melakukan sesuatu. Bentuk kausatif berkonjugasi seperti Golongan II, sering digabung dengan てください untuk meminta izin.',
    inflections: [
      {
        formName: 'Kamus (Biasa)',
        japanese: '〜せる / 〜させる',
        reading: '〜seru / 〜saseru',
        example: '帰らせる / 食べさせる',
        nuance: 'Menyuruh pulang / membiarkan makan',
      },
      {
        formName: 'Sopan (Masu)',
        japanese: '〜せます / 〜させます',
        reading: '〜semasu / 〜sasemasu',
        example: '帰らせます (kairasemasu)',
        nuance: 'Akan menyuruh pulang (sopan)',
      },
      {
        formName: 'Bentuk Sambung (Te)',
        japanese: '〜せて / 〜させて',
        reading: '〜sete / 〜sasete',
        example: '帰らせて / 食べさせて',
        nuance: 'Biarkan pulang lalu...',
      },
      {
        formName: 'Minta Izin (Te Kudasai)',
        japanese: '〜(さ)せてください',
        reading: '〜(sa)sete kudasai',
        example: '早く帰らせてください',
        nuance: 'Tolong izinkan saya pulang lebih awal',
      },
      {
        formName: 'Izin Sangat Sopan',
        japanese: '〜(さ)せていただけますか',
        reading: '〜(sa)sete itadakemasu ka',
        example: '休ませていただけますか',
        nuance: 'Apakah saya diperkenankan mengambil libur?',
      },
    ],
  },
};

// ─── Japanese Verb Groups Guide (Panduan Golongan 1, 2, 3) ───────────────────

export const VERB_GROUPS_GUIDE: VerbGroupInfo[] = [
  {
    groupName: 'Golongan 1 (Grup I)',
    japaneseName: '五段動詞',
    romajiName: 'Godan Doushi',
    definition: 'Kata kerja yang berakhiran suku kata vokal "u" selain bunyi "-iru" atau "-eru". Kata kerja golongan ini mengalami perubahan bunyi vokal pada 5 baris (a, i, u, e, o).',
    rule: 'Perubahan dasar mengikuti 5 baris hiragana:\n• Nai (Negatif): u → a + nai (書く → 書かない)\n• Masu (Sopan): u → i + masu (書く → 書きます)\n• Jisho (Kamus): berakhiran u (書く)\n• Ba (Syarat): u → e + ba (書く → 書けば)\n• You (Ajakan): u → ou (書く → 書こう)',
    examples: [
      '書く (かく / menulis)',
      '読む (よむ / membaca)',
      '話す (はなす / berbicara)',
      '待つ (まつ / menunggu)',
      '買う (かう / membeli)',
      '泳ぐ (およぐ / berenang)',
      '遊ぶ (あそぶ / bermain)',
    ],
    exceptions: [
      '⚠️ Pengecualian Penting (Berakhiran -iru/-eru tetapi MASUK Golongan 1):',
      '帰る (かえる / pulang) → 帰ります、帰って',
      '知る (しる / tahu) → 知ります、知って',
      '入る (はいる / masuk) → 入ります、入って',
      '走る (はしる / berlari) → 走ります、走って',
      '切る (きる / memotong) → 切ります、切って',
      '喋る (しゃべる / mengobrol) → 喋ります、喋って',
    ],
  },
  {
    groupName: 'Golongan 2 (Grup II)',
    japaneseName: '一段動詞',
    romajiName: 'Ichidan Doushi',
    definition: 'Kata kerja yang berakhiran suku kata bunyi "-iru" (い段 + る) atau bunyi "-eru" (え段 + る). Pola konjugasinya paling sederhana karena huruf "る" tinggal dihapus.',
    rule: 'Cukup hilangkan akhiran "る" lalu tambahkan bentuk yang diinginkan:\n• Nai (Negatif): Hapus る + ない (食べる → 食べない)\n• Masu (Sopan): Hapus る + ます (食べる → 食べます)\n• Te (Sambung): Hapus る + て (食べる → 食べて)\n• Ta (Lampau): Hapus る + た (食べる → 食べた)\n• Ba (Syarat): Hapus る + れば (食べる → 食べれば)\n• You (Ajakan): Hapus る + よう (食べる → 食べよう)',
    examples: [
      '食べる (たべる / makan) [akhiran -eru]',
      '見る (みる / melihat) [akhiran -iru]',
      '起きる (おきる / bangun) [akhiran -iru]',
      '寝る (ねる / tidur) [akhiran -eru]',
      '教える (おしえる / mengajar) [akhiran -eru]',
      '忘れる (わすれる / lupa) [akhiran -eru]',
    ],
  },
  {
    groupName: 'Golongan 3 (Grup III)',
    japaneseName: '不規則動詞',
    romajiName: 'Fukisoku Doushi (Irregular)',
    definition: 'Kata kerja tidak beraturan. Dalam seluruh bahasa Jepang HANYA ADA 2 KATA KERJA ini. Konjugasinya harus dihafal secara khusus karena bunyi dasarnya berubah.',
    rule: '1. する (suru / melakukan):\n   • Negatif: しない (shinai)\n   • Sopan: します (shimasu)\n   • Bentuk Te: して (shite)\n   • Lampau: した (shita)\n   • Potensial: できる (dekiru)\n   • Pasif: される (sareru)\n   • Kausatif: させる (saseru)\n\n2. 来る (くる / datang):\n   • Negatif: 来ない (こない / konai)\n   • Sopan: 来ます (きます / kimasu)\n   • Bentuk Te: 来て (きて / kite)\n   • Lampau: 来た (きた / kita)\n   • Potensial/Pasif: 来られる (こられる / korareru)\n   • Kausatif: 来させる (こさせる / kosaseru)',
    examples: [
      'する (melakukan)',
      '勉強する (belajar)',
      '電話する (menelepon)',
      '来る (くる / datang)',
    ],
  },
];

/**
 * Find an auxiliary ending definition by token.
 */
export function findAuxiliaryByToken(token: string): string | undefined {
  const normalized = token.replace(/^[〜~]/, '').replace(/\s+/g, '');
  for (const [id, aux] of Object.entries(AUXILIARY_ENDINGS)) {
    if (aux.token === normalized || aux.token.split('／').includes(normalized)) {
      return id;
    }
  }
  // Substring match for compound tokens like 〜ている -> aux_iru
  if (normalized.endsWith('いる') || normalized === 'ている') return 'aux_iru';
  if (normalized.endsWith('ある') || normalized === 'てある') return 'aux_aru';
  if (normalized.endsWith('おく') || normalized === 'ておく' || normalized === 'とく') return 'aux_oku';
  if (normalized.endsWith('しまう') || normalized === 'てしまう' || normalized === 'ちゃう' || normalized === 'じゃう') return 'aux_shimau';
  if (normalized.endsWith('みる') || normalized === 'てみる') return 'aux_miru';
  if (normalized.endsWith('いく') || normalized === 'ていく') return 'aux_iku';
  if (normalized.endsWith('くる') || normalized === 'てくる') return 'aux_kuru';
  if (normalized.includes('ください')) return 'aux_kudasai';
  if (normalized.includes('れる') || normalized.includes('られる')) return 'aux_reru';
  if (normalized.includes('せる') || normalized.includes('させる')) return 'aux_seru';
  return undefined;
}

/**
 * Retrieve auxiliary ending info by id.
 */
export function getAuxiliaryInfo(id: string): AuxiliaryEnding | undefined {
  return AUXILIARY_ENDINGS[id];
}

