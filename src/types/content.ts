// Learning & Content Types (Normalized relational structure)
export * from './identity';
export * from './tower';

export type ErrorType =
  | 'PASSIVE_CONFUSION'
  | 'CAUSATIVE_CONFUSION'
  | 'PARTICLE_MISMATCH'
  | 'NUANCE_CONTEXT'
  | 'KANJI_SIMILAR_CONFUSION'
  | 'KANJI_READING_MISMATCH'
  | 'VOCAB_DISTRACTOR'
  | 'INFERENCE_OVERLOOK'
  | 'LISTENING_DISTRACTOR'
  | 'GENERAL_MISTAKE';

export interface ErrorPatternRecord {
  errorType: ErrorType;
  count: number;
  lastOccurred: string;
  itemId: string;
  contextNote?: string;
}

export interface SubSkillRating {
  name: string;
  japaneseName: string;
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';
  percentage: number; // 0 - 100%
  status: 'OPTIMAL' | 'STABLE' | 'NEEDS_PRACTICE' | 'CRITICAL_WEAKNESS';
  recentMistakeNotes?: string[];
}

export interface LanguageProfile {
  overallPercentage: number;
  pillars: {
    bunpou: { percentage: number; label: string; subSkills: SubSkillRating[] };
    kotoba: { percentage: number; label: string; subSkills: SubSkillRating[] };
    kanji: { percentage: number; label: string; subSkills: SubSkillRating[] };
    dokkai: { percentage: number; label: string; subSkills: SubSkillRating[] };
    choukai: { percentage: number; label: string; subSkills: SubSkillRating[] };
  };
  criticalWeaknesses: {
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';
    title: string;
    subSkill: string;
    severity: 'warning' | 'critical';
    advice: string;
    targetItemId?: string;
  }[];
  tutorSummary: string;
}

export type RecallPriorityTier = 'CRITICAL' | 'WEAK' | 'REVIEW' | 'MAINTAIN';

export interface TrueMasteryBreakdown {
  itemId: string;
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';
  title: string;
  knowledge: number;     // 0 - 100% (Teori & Recognition)
  recognition: number;   // 0 - 100% (Quiz multiple choice accuracy)
  application: number;   // 0 - 100% (Real evidence from Dokkai texts & Boss battles)
  retention: number;     // 0 - 100% (SRS stability over time)
  trueMastery: number;   // 0 - 100% (Weighted composite score)
  statusLabel: string;   // e.g. "Tahu Rumus, Belum Terbiasa di Dokkai"
  levelTier: MasteryDifficultyLevel; // Level 1 to 5
}

export interface AdaptiveRecommendation {
  id: string;
  title: string;
  reasonMessage: string;
  recommendationType: 'REVIEW_WEAKNESS' | 'CHOUKAI_TRAINING' | 'DOKKAI_APPLICATION' | 'KANJI_PRACTICE' | 'STAGE_PROGRESS';
  actionLabel: string;
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';
  targetStageId?: string;
  targetItemId?: string;
  prioritySeverity: 'critical' | 'weak' | 'routine';
  actionType: 'recall' | 'stage' | 'status_modal';
}

export interface Question {
  id: string;
  instruction?: string; // Formal Japanese command/instruction e.g. 「（　）に入れるのに最もよいものを一つ選びなさい。」
  instructionId?: string; // Indonesian sub-caption e.g. "Pilih jawaban yang paling tepat untuk melengkapi kalimat."
  prompt: string; // PURE Japanese question text/sentence/word
  ruby?: string; // Furigana or reading hint for prompt
  translation?: string; // Indonesian translation of the question sentence/word (kept separate from prompt)
  options: string[];
  optionsRuby?: string[]; // Optional readings for choices
  correctIndex: number;
  explanation: string;
  audioPrompt?: string;
  hint?: string;
  errorTypeMap?: Record<number, ErrorType>; // Maps choice index to error taxonomy
  contextTag?: string; // e.g. "passive_nuance", "kanji_onyomi"
  difficultyLevel?: MasteryDifficultyLevel;
  scrambleWords?: string[]; // For Level 5 Sentence Production mode
  orderedTarget?: string[]; // Correct ordered word sequence
  starIndex?: number; // 0-based index of slot that has the star (default 2, meaning 3rd slot)
  category?: string;
  difficulty?: string;
  level?: string;
}

export interface ExampleSentence {
  japanese: string;
  reading: string;
  meaningId: string;
  meaningEn?: string;
}

export interface ConnectionCondition {
  partOfSpeech: string;
  rule: string;
  example?: string;
}

export interface SubFormulaBranch {
  id: string;
  token: string;
  usageLocation: string;
  usageLocationType?: 'predicate' | 'adverbial' | 'noun_modifier' | 'topic' | 'conditional' | 'general';
  meaning: string;
  connectionConditions: ConnectionCondition[];
  examples: ExampleSentence[];
}

export interface GrammarComparison {
  targetGrammar: string;
  difference: string;
}

export interface GrammarSkillConcept {
  summary: string;
  beforeState?: string; // e.g. "Dulu: Belum bisa / Tidak dilakukan ❌"
  afterState?: string;  // e.g. "Sekarang: Menjadi bisa / Mulai terbiasa ✅"
  starterExample?: {
    japanese: string;
    reading?: string;
    meaningId: string;
    contrastNote?: string; // e.g. "Dulu tidak bisa bahasa Jepang, sekarang bisa."
  };
  keyTakeaway?: string;
}

export interface GrammarSkillFunction {
  number: number;
  label: string;
  description: string;
  miniExample?: {
    japanese: string;
    reading?: string;
    meaningId: string;
  };
}

export interface GrammarSkillFormulaStep {
  title: string;
  breakdown: string[]; // e.g. ["Kata Kerja Potensial", "ようになる"] (separators are rendered automatically by UI, do not include standalone '+' or '＋')
  progression?: string[]; // e.g. ["話す", "話せる", "話せるようになる"]
  note?: string;
}

export interface GrammarSkillWordIdentity {
  typeCategory: string; // e.g. "意志動詞 (Kehendak)", "無意志動詞", "Potential Form"
  tagColor?: 'emerald' | 'sky' | 'purple' | 'amber' | 'indigo' | 'rose';
  icon?: string;
  examples: string[];
  functionEffect: string;
}

export interface GrammarSkillNuance {
  contrastA: string;
  meaningA: string;
  contrastB: string;
  meaningB: string;
  explanation?: string;
}

export interface TieredExampleSentence {
  tier: 'basic' | 'daily' | 'natural';
  tierLabel: string;
  japanese: string;
  reading: string;
  meaningId: string;
}

export interface GrammarSkillNodes {
  concept: GrammarSkillConcept;
  functions: GrammarSkillFunction[];
  formulas: GrammarSkillFormulaStep[];
  wordIdentities: GrammarSkillWordIdentity[];
  nuances: GrammarSkillNuance[];
  examples: TieredExampleSentence[];
  trainingQuestions: Question[];
}

export interface BunpouItem {
  id: string;
  title: string;
  reading: string; // Romaji/Hiragana
  meaningId: string; // Indonesian meaning
  meaningEn: string; // English meaning
  level: string; // N5, N4, N3, N2
  explanation: string;
  formula: string;
  examples: ExampleSentence[];
  questions: Question[]; // 7 questions per grammar item
  subFormulas?: SubFormulaBranch[];
  functions?: string[]; // e.g. ["推測 (dugaan)", "比喩 (perumpamaan)", "類似 (kemiripan)"]
  nuance?: string; // e.g. "Berdasarkan apa yang terlihat/dirasakan langsung"
  relatedKeywords?: string[]; // e.g. ["推測", "似ている", "まるで"]
  baseLevel?: 'N5' | 'N4' | 'N3' | 'N2';
  comparisonNotes?: GrammarComparison[];
  tags?: string[];
  categoryType?: string; // e.g. "Change Pattern", "Desire Pattern", "Passive Pattern"
  skillNodes?: GrammarSkillNodes;
  keyTakeaway?: string;
  beforeState?: string;
  afterState?: string;
}

export interface BunpouMixedSet {
  id: string;
  title: string;
  description: string;
  questions: Question[]; // 7 mixed questions
  baseLevel?: 'N5' | 'N4' | 'N3' | 'N2';
  level?: string;
}

export interface KotobaItem {
  id: string;
  word: string;
  reading: string; // Hiragana / Katakana
  meaningId: string; // Indonesian meaning
  definitionId?: string; // Indonesian definition/explanation (penjelasan makna bahasa Indonesia)
  meaningEn: string;
  meaningJa: string;
  meaningJaId?: string;
  jlpt: string;
  wordType:
    | 'noun' | 'verb' | 'adjective-i' | 'adjective-na' | 'adjective-pn' | 'adverb'
    | 'conjunction' | 'particle' | 'pronoun' | 'counter' | 'numeral' | 'interjection'
    | 'expression' | 'prefix' | 'suffix' | 'auxiliary';
  kanjiComponents: string[];
  exampleSentence?: {
    japanese: string;
    reading: string;
    meaningId: string;
  };
  relatedWords?: string[];
  collocations?: string[];
  tags?: string[];
  unitName?: string;
}

export interface RelatedWord {
  word: string;
  reading: string;
  meaningId: string;
}

export interface KanjiItem {
  id: string;
  character: string;
  meaningId: string;
  meaningEn: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt: string;
  strokeCount: number;
  radical: string;
  radicalName: string;
  relatedWords: RelatedWord[];
  strokeGuideSvg?: string; // Path or hint for canvas drawing
  questions: Question[];
}

export interface ContentRelationship {
  bunpouRefs?: string[];
  kotobaRefs?: string[];
  kanjiRefs?: string[];
  prerequisiteIds?: string[];
  stageRelevance?: {
    currentStagePct: number;
    previousStagePct: number;
    previewNextStagePct: number;
  };
}

export type MasteryStatus = 'LOCKED' | 'AVAILABLE' | 'LEARNING' | 'COMPLETED' | 'MASTERED' | 'PERFECTED';

export type MasteryDifficultyLevel = 1 | 2 | 3 | 4 | 5; 
// 1: Recognition, 2: Fill Blank, 3: Conjugation, 4: Context/Nuance, 5: Production

export interface ItemMasteryRecord {
  itemId: string;
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';
  status: MasteryStatus;
  masteryPercentage: number; // 0 to 100%
  masteryLevel: MasteryDifficultyLevel;
  firstAttemptScore?: { score: number; total: number; date: string };
  bestScore: { score: number; total: number };
  bestScoreAchievedAt: string; // ISO date when best score was achieved
  attemptsCount: number;
  writingCount?: number; // Total berapa kali latihan menulis aksara ini (Canvas)
  flashcardCount?: number; // Total berapa kali dibolak-balik / dipelajari via flashcard
  quizCount?: number; // Total berapa kali dilatih via kuis / susun kalimat / dsb
  consecutivePerfects: number;
  mistakeCount: number;
  lastReviewedAt: string; // ISO String
  nextReviewDue: string; // ISO String for SRS
  reviewIntervalDays: number; // SRS interval
  decayFactor: number; // e.g. 1.0 (fresh) down to 0.5 (decayed)
  weaknessFlags?: string[]; // E.g. ["conjugation", "ukemi_passive", "dokkai_context_fail"]
  errorPatterns?: ErrorPatternRecord[];
  contextualSuccessCount?: number; // Count of successful uses in Dokkai / Boss
}

export interface RecallQueueItem {
  id: string;
  itemId: string;
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';
  title: string;
  subtitle: string;
  reason: 'HIGH_MISTAKES' | 'SRS_DUE' | 'DOKKAI_WEAKNESS' | 'LOW_MASTERY' | 'DECAYED';
  reasonText: string;
  urgencyScore: number; // Higher = more urgent to review
  priorityTier: RecallPriorityTier; // 'CRITICAL' | 'WEAK' | 'REVIEW' | 'MAINTAIN'
  difficultyLevel: MasteryDifficultyLevel; // 1 to 5
  trueMasteryScore?: number;
  tutorInsight?: string; // e.g. "Kamu sering salah ketika pola ini digunakan dalam konteks passive voice."
  masteryRecord?: ItemMasteryRecord;
  sampleQuestion?: Question;
}

export interface DokkaiItem {
  id: string;
  title: string;
  level: string;
  category: string;
  text: string;
  vocabularyList?: { word: string; reading: string; meaning: string }[];
  questions: Question[]; // 3 or 4 questions
  relationships?: ContentRelationship;
}

export interface ChoukaiItem {
  id: string;
  title: string;
  level: string;
  dialogueSpeaker: string;
  audioText: string; // Japanese text to be spoken via Web Speech Synthesis
  transcript: string;
  speechRate?: number;
  questions: Question[]; // 3 questions
}

export interface Stage {
  id: string;
  mapId: string;
  stageNumber: number;
  title: string;
  title_jp?: string;
  title_en?: string;
  title_id?: string;
  description: string;
  isBoss: boolean;
  bossName?: string;
  bossTitle?: string;
  bossHp?: number;
  bossAvatar?: string;
  
  // Relational IDs linking to content database
  bunpouIds: string[];
  bunpouMixedSetId?: string;
  kotobaIds: string[];
  kanjiIds: string[];
  dokkaiIds: string[];
  choukaiIds: string[];

  // Rewards
  rewardExp: number;
  rewardGold: number;
  rewardItem?: string;
}

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'KANA';

export interface WorldInfo {
  id: string; // e.g. 'world_n5', 'world_n4', 'world_n3', 'world_n2', 'world_n1'
  jlptLevel: JlptLevel;
  name: string;
  japaneseName: string;
  subtitle: string;
  description: string;
  theme: string;
  bannerBg: string;
  accentColor: string;
  glowColor: string;
  iconName: string;
  minTier: number;
  maxTier: number;
  minLevel: number;
  badge: string;
}

export interface MapRegion {
  id: string;
  worldId?: string;
  mapNumber: number;
  name: string;
  japaneseName: string;
  description: string;
  theme: string;
  bannerBg: string;
  accentColor: string;
  minLevel: number;
  totalStages: number; // Regular + Boss
}

// ---------------------------------------------------------
// TRY OUT BOSS BATTLE TYPES
// ---------------------------------------------------------

export interface TryOutQuestion {
  id: string;
  instruction?: string;
  prompt: string;
  options: string[];
  correctIndex: number; // 0-based
  ruby?: string;
  passage?: string; // For Dokkai
  audio?: string; // For Choukai voice/TTS
  explanation?: string;
}

export interface TryOutSection {
  title: string;
  timeLimitMinutes: number;
  audioUrl?: string; // Single audio for the entire section
  questions: TryOutQuestion[];
}

export interface TryOutData {
  id: string;
  title: string;
  level?: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'JFT';
  code?: string;
  year?: number;
  month?: number;
  passingScore?: number;
  maxScore?: number;
  sections: {
    mojiGoi: TryOutSection;
    bunpouDokkai: TryOutSection;
    choukai: TryOutSection;
  };
}
