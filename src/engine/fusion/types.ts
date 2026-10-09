// ==============================================================================
// BUNPOU DUNGEON: GRAMMAR FUSION — TIPE DATA
// Data stage, rule, dan state dipisah dari UI agar stage baru cukup ditambah lewat data.
// ==============================================================================

/** Bentuk grammar yang bisa dimiliki sebuah kata di tengah proses fusion ('jisho', 'nai', 'nai_de', ...). */
export type FusionFormId = string;

/** Id rule: 'dictionary_to_nai', 'add_de', ... (stage Latihan Bebas membuat rule-nya sendiri lewat stage.rules). */
export type FusionRuleId = string;

export interface FusionWord {
  japanese: string;
  reading: string;
}

/** Kata kerja dasar sebuah stage. */
export interface FusionBaseWord extends FusionWord {
  meaning: string;
}

/** Konteks yang dibutuhkan rule: kata dasar (untuk konjugasi) + kata saat ini + bentuknya. */
export interface FusionRuleContext {
  base: FusionWord;
  current: FusionWord;
  form: FusionFormId;
}

export interface FusionRuleResult {
  word: FusionWord;
  form: FusionFormId;
  /** Penjelasan perubahan (Indonesia) — dihitung dari hasil engine, bukan ditulis tangan. */
  explanation: string;
}

export interface FusionRule {
  id: FusionRuleId;
  /** Label komponen di panel. */
  label: string;
  /** Sub-label kecil di komponen (contoh bentuk). */
  hint: string;
  /** Bentuk yang harus dimiliki kata agar rule boleh diterapkan. */
  requires: FusionFormId;
  produces: FusionFormId;
  /** Penjelasan kenapa rule tidak bisa dipakai pada bentuk lain. */
  whyNot: string;
  apply: (ctx: FusionRuleContext) => FusionRuleResult;
}

export interface FusionStep {
  ruleId: FusionRuleId;
  /** Instruksi yang tampil sebelum langkah dikerjakan. */
  instruction: string;
  /** Arti hasil langkah ini. */
  resultMeaning: string;
}

export interface FusionStage {
  id: string;
  title: string;
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Kata dasar; stage mengambil satu secara acak. */
  words: FusionBaseWord[];
  target: {
    pattern: string;
    meaning: string;
    explanation: string;
  };
  steps: FusionStep[];
  /** Komponen yang ditampilkan: jawaban benar + pengecoh. */
  components: FusionRuleId[];
  /** Rule khusus stage (Latihan Bebas); menimpa rule bawaan dengan id yang sama. */
  rules?: Record<FusionRuleId, FusionRule>;
  /** Label bentuk khusus stage, mis. nama pola untuk bentuk akhir. */
  formLabels?: Record<FusionFormId, string>;
  reward: { exp: number; gold: number };
}

export interface FusionHistoryEntry {
  stepIndex: number;
  ruleId: FusionRuleId;
  componentLabel: string;
  from: FusionWord;
  to: FusionWord;
  fromForm: FusionFormId;
  toForm: FusionFormId;
  explanation: string;
}

export type FusionAnimationPhase = 'idle' | 'approach' | 'absorb' | 'morph' | 'reveal' | 'settle';

export interface FusionFeedback {
  kind: 'correct' | 'wrong' | 'hint';
  message: string;
}

export interface FusionState {
  stage: FusionStage;
  /** currentWord: kata yang sedang tampil di papan (hasil terakhir yang tervalidasi). */
  currentStageId: string;
  baseWord: FusionBaseWord;
  currentStep: number;
  currentWord: FusionWord;
  currentForm: FusionFormId;
  selectedComponent: FusionRuleId | null;
  transformationHistory: FusionHistoryEntry[];
  availableComponents: FusionRuleId[];
  animationState: FusionAnimationPhase;
  feedbackState: FusionFeedback | null;
  mistakes: number;
  hintsUsed: number;
  hintedComponent: FusionRuleId | null;
  completed: boolean;
  /** XP/gold hasil akhir; terisi saat completed. */
  score: { exp: number; gold: number };
}

export type FusionAction =
  | { type: 'SELECT'; ruleId: FusionRuleId }
  | { type: 'CHECK' }
  | { type: 'ANIMATION_PHASE'; phase: FusionAnimationPhase }
  | { type: 'ANIMATION_DONE' }
  | { type: 'HINT' }
  | { type: 'RESET'; baseWord?: FusionBaseWord };
