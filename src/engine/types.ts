// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — CORE TYPE DEFINITIONS
// ==============================================================================

export type VerbGroup = 'godan' | 'ichidan' | 'kuru' | 'suru';

export type AdjectiveType = 'i' | 'na';

export type ConjugationForm =
  | 'jisho'             // 辞書形 (Bentuk Kamus) e.g. 食べる, 書く
  | 'masu'              // ます形 (Bentuk Sopan) e.g. 食べます, 書きます
  | 'masu_stem'         // ますステム e.g. 食べ, 書き
  | 'te'                // て形 (Bentuk Te) e.g. 食べて, 書いて
  | 'ta'                // た形 (Bentuk Lampau) e.g. 食べた, 書いた
  | 'nai'               // ない形 (Bentuk Negatif) e.g. 食べない, 書かない
  | 'nakatta'           // なかった形 (Bentuk Lampau Negatif) e.g. 食べなかった, 書かなかった
  | 'ba'                // ば形 (Bentuk Pengandaian) e.g. 食べれば, 書けば
  | 'tara'              // たら形 (Bentuk Kondisional) e.g. 食べたら, 書いたら
  | 'volitional'        // 意向形 (Bentuk Maksud / Ajakan) e.g. 食べよう, 書こう
  | 'imperative'        // 命令形 (Bentuk Perintah) e.g. 食べろ, 書け
  | 'potential'         // 可能形 (Bentuk Potensial/Dapat) e.g. 食べられる, 書ける
  | 'passive'           // 受身形 (Bentuk Pasif) e.g. 食べられる, 書かれる
  | 'causative'         // 使役形 (Bentuk Kausatif/Menyuruh) e.g. 食べさせる, 書かせる
  | 'causative_passive' // 使役受身 (Bentuk Terpaksa Melakukan) e.g. 食べさせられる, 書かされる
  | 'tai'               // たい形 (Keinginan) e.g. 食べたい, 書きたい
  | 'sou_appearance'    // そう（様態 - Tampak/Kelihatannya） e.g. 食べそう, 書きそう
  | 'sou_hearsay'       // そう（伝聞 - Katanya） e.g. 食べるそう, 書くそう
  | 'yasui'             // やすい (Mudah dilakukan) e.g. 食べやすい, 書きやすい
  | 'nikui';            // にくい (Sulit dilakukan) e.g. 食べにくい, 書きにくい

export type AdjectiveForm =
  | 'base'              // Bentuk Dasar e.g. 高い, 静か
  | 'negative'          // Negatif e.g. 高くない, 静かじゃない
  | 'past'              // Lampau e.g. 高かった, 静かだった
  | 'past_negative'     // Lampau Negatif e.g. 高くなかった, 静かじゃなかった
  | 'te'                // Sambung / Keterangan e.g. 高くて, 静かで
  | 'adverbial'         // Bentuk Kata Keterangan e.g. 高く, 静かに
  | 'sou_appearance'    // Tampaknya / Terlihat e.g. 高そう, 静かそう
  | 'attributive';      // Penjelas Kata Benda e.g. 高い, 静かな

export interface VerbConjugationResult {
  word: string;
  reading: string;
  group: VerbGroup;
  forms: Record<ConjugationForm, { japanese: string; reading: string }>;
}

export interface AdjectiveConjugationResult {
  word: string;
  reading: string;
  type: AdjectiveType;
  forms: Record<AdjectiveForm, { japanese: string; reading: string }>;
}

// ------------------------------------------------------------------------------
// SYNTAX & SLOT-FILLER DEFINITIONS
// ------------------------------------------------------------------------------

export type ParticleType = 'は' | 'が' | 'を' | 'に' | 'で' | 'へ' | 'と' | 'から' | 'まで' | 'より' | 'も';

export interface SentenceSlot {
  role: 'subject' | 'time' | 'location' | 'target' | 'object' | 'predicate';
  particle?: ParticleType;
  required: boolean;
  allowedWordTypes: ('noun' | 'verb' | 'adjective-i' | 'adjective-na')[];
  conjugationRequirement?: ConjugationForm | AdjectiveForm;
}

export interface GrammarPatternSchema {
  id: string;
  pattern: string;             // e.g. "〜てはいけない"
  title: string;               // e.g. "Larangan Formal: 〜てはいけない"
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  predicateType: 'noun' | 'verb' | 'adjective-i' | 'adjective-na';
  requiredConjugation: ConjugationForm | AdjectiveForm;
  fixedSuffix: string;         // e.g. "はいけない", "もいい", "ほうがいい"
  /** Pola kata benda: partikel yang menempel di antara kata benda dan fixedSuffix (Nに＋関して → に). */
  leftParticle?: string;
  slots: SentenceSlot[];
  meaningTemplateId: string;   // e.g. "{subject} tidak boleh {predicate} {object} di {location}"
  meaningTemplateEn: string;
  nuanceExplanation: string;
  /** Contoh kalimat bawaan (untuk pola dari library yang tidak punya sintesis kalimat). */
  example?: { japanese: string; reading: string; meaningId: string };
}

// ------------------------------------------------------------------------------
// SENTENCE SYNTHESIS & PRACTICE EXERCISE DEFINITIONS
// ------------------------------------------------------------------------------

export interface SynthesizedSentence {
  id: string;
  patternId: string;
  japanese: string;
  reading: string;
  meaningId: string;
  meaningEn: string;
  breakdown: {
    text: string;
    reading?: string;
    role: string;
    isParticle?: boolean;
  }[];
}

export interface SentenceTile {
  id: string;
  text: string;
  reading?: string;
  role: 'subject' | 'object' | 'location' | 'target' | 'predicate' | 'particle' | 'grammar_suffix' | 'distractor';
  isDistractor?: boolean;
}

export interface SentencePracticeExercise {
  id: string;
  patternId: string;
  patternTitle: string;
  promptMeaningId: string;
  promptMeaningEn: string;
  targetSentenceJp: string;
  targetSentenceReading: string;
  availableTiles: SentenceTile[];
  validSequences: string[][]; // Array of acceptable token IDs or texts in correct order (allowing flexible Japanese SOV/OSV orders)
  hint: string;
  grammarExplanation: string;
}

export interface ValidationFeedback {
  isCorrect: boolean;
  score: number; // 0 to 100
  submittedSentence: string;
  targetSentence: string;
  errorType?: 'wrong_order' | 'wrong_particle' | 'wrong_conjugation' | 'missing_element' | 'used_distractor';
  detailedFeedback: string;
  pedagogicalAdvice: string;
}
