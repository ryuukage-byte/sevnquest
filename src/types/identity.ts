// ==============================================================================
// NIHONGO QUEST: IDENTITY ARCHITECTURE TYPES
// Standardized models for permanent identity, relational linking & knowledge graph
// ==============================================================================

export type EntityType = 
  | 'kanji'
  | 'vocabulary'
  | 'grammar'
  | 'sentence'
  | 'reading'
  | 'listening'
  | 'question'
  | 'stage'
  | 'map'
  | 'curriculum';

export interface BaseIdentity {
  id: string;                                // Permanent, curriculum-independent ID
  version?: number;
  status?: 'draft' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

// ------------------------------------------------------------------------------
// 1. 🧱 KANJI (CORE KNOWLEDGE)
// ------------------------------------------------------------------------------
export interface KanjiEntity extends BaseIdentity {
  character: string;                         // e.g. '学'
  unicode?: string;                          // e.g. 'U+5B66'
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  grade?: number;
  joyo?: boolean;
  jinmeiyo?: boolean;
  kankenLevel?: string;
  strokeCount: number;
  onyomi: string[];
  kunyomi: string[];
  nanori?: string[];
  meanings: string[];
  meaningId: string;
  meaningEn?: string;
  radical: string;
  radicalName: string;
  frequency?: number;
  commonness?: number;
  components?: string[];
}

// ------------------------------------------------------------------------------
// 2. ✍️ KANJI WRITING (FEATURE IDENTITY)
// ------------------------------------------------------------------------------
export interface KanjiWritingEntity extends BaseIdentity {
  kanjiId: string;                           // Foreign key to KanjiEntity
  strokeCount: number;
  strokeOrder: number[];
  strokePaths: string[];                     // SVG path strings
  strokeDirection?: string[];
  strokeStartPoints?: [number, number][];
  strokeEndPoints?: [number, number][];
  boundingBox?: [number, number, number, number];
  recognitionModel?: string;
  tolerance?: number;
  source?: string;
}

// ------------------------------------------------------------------------------
// 3. 📖 VOCABULARY (CORE KNOWLEDGE)
// ------------------------------------------------------------------------------
export interface VocabularyEntity extends BaseIdentity {
  word: string;                              // e.g. '勉強'
  normalizedWord?: string;
  reading: string;                           // e.g. 'べんきょう'
  pitchAccent?: string;
  meanings: string[];
  meaningId: string;
  meaningEn?: string;
  meaningJa?: string;
  partOfSpeech: string[];                    // e.g. ['noun', 'suru_verb']
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  frequency?: number;
  commonness?: number;
  kanjiIds: string[];                        // References to KanjiEntity(id)
  kanaOnly?: boolean;
  transitivity?: 'intransitive' | 'transitive' | 'both';
  conjugationType?: string;
  register?: 'polite' | 'casual' | 'formal' | 'keigo';
  domain?: 'daily' | 'kaigo' | 'business' | 'it';
  collocations?: string[];
  tags?: string[];
}

// ------------------------------------------------------------------------------
// 4. 🔊 VOCABULARY AUDIO (FEATURE IDENTITY)
// ------------------------------------------------------------------------------
export interface VocabularyAudioEntity extends BaseIdentity {
  vocabularyId: string;                      // Foreign key to VocabularyEntity
  audioUrl: string;
  speaker?: string;
  gender?: 'male' | 'female' | 'neutral';
  accentRegion?: string;
  speed?: number;
  duration?: number;
  source?: 'native' | 'ai_generated';
  quality?: 'standard' | 'high';
}

// ------------------------------------------------------------------------------
// 5. ✍️ VOCABULARY WRITING (FEATURE IDENTITY)
// ------------------------------------------------------------------------------
export interface VocabularyWritingEntity extends BaseIdentity {
  vocabularyId: string;
  writingSystem: 'hiragana' | 'katakana' | 'kanji_mixed';
  kanaSequence?: string[];
  kanjiSequence?: string[];
  strokeData?: string[];
  recognitionRules?: Record<string, any>;
}

// ------------------------------------------------------------------------------
// 6. 🧩 VOCABULARY RELATION
// ------------------------------------------------------------------------------
export type VocabRelationType =
  | 'synonym'
  | 'antonym'
  | 'similar'
  | 'opposite'
  | 'derived'
  | 'compound'
  | 'related'
  | 'confusable'
  | 'formal_version'
  | 'casual_version';

export interface VocabularyRelationEntity {
  id: string;
  sourceVocabId: string;
  targetVocabId: string;
  relationType: VocabRelationType;
  strength?: number;
  note?: string;
}

// ------------------------------------------------------------------------------
// 7. 📐 GRAMMAR (CORE KNOWLEDGE)
// ------------------------------------------------------------------------------
export interface GrammarEntity extends BaseIdentity {
  pattern: string;                           // e.g. '〜ている'
  name: string;                              // e.g. '書かれている (受身形)'
  formula: string;                           // e.g. 'Vれる（受身形）'
  meaningId: string;
  meaningEn: string;
  explanationNote?: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  category?: string;
  functions?: string[];
  nuance?: string;
  register?: string;
  restrictions?: string[];
  subFormulas?: any[];
  comparisonNotes?: any[];
  relatedKeywords?: string[];
}

// ------------------------------------------------------------------------------
// 8. 📝 EXAMPLE SENTENCE (STANDALONE CITIZEN)
// ------------------------------------------------------------------------------
export interface SentenceEntity extends BaseIdentity {
  japanese: string;
  furigana?: string;
  reading?: string;
  translationId: string;                     // Indonesian
  translationEn?: string;                    // English
  difficulty?: 'easy' | 'medium' | 'hard';
  audioId?: string;
  source?: string;
}

export interface SentenceVocabularyLink {
  sentenceId: string;
  vocabularyId: string;
  role?: 'target_word' | 'collocation' | 'context';
}

export interface SentenceGrammarLink {
  sentenceId: string;
  grammarId: string;
  usage?: 'core_pattern' | 'modifier';
}

// ------------------------------------------------------------------------------
// 11 & 12. ❓ QUESTION & QUESTION TYPE (CENTRALIZED QUESTION BANK)
// ------------------------------------------------------------------------------
export type StandardQuestionType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'listening'
  | 'reading'
  | 'translation'
  | 'word_order'
  | 'kanji_recognition'
  | 'kanji_writing'
  | 'vocabulary_writing'
  | 'sentence_completion'
  | 'matching'
  | 'free_answer';

export interface QuestionEntity extends BaseIdentity {
  questionType: StandardQuestionType;
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  skill?: string;
  prompt: string;
  ruby?: string;
  options: string[];
  correctIndex: number;
  acceptedAnswers?: string[];
  explanation: string;
  hint?: string;
  errorTypeMap?: Record<number, string>;
  contextTag?: string;
  
  // Knowledge Foreign Keys
  knowledgeRefs: string[];                   // Links to any entity ID
  grammarRefs?: string[];
  vocabularyRefs?: string[];
  kanjiRefs?: string[];
  
  audioRef?: string;
  readingRef?: string;
  scrambleWords?: string[];
  orderedTarget?: string[];
  starIndex?: number;
}

// ------------------------------------------------------------------------------
// 13. 🏷️ TAG SYSTEM
// ------------------------------------------------------------------------------
export interface TagEntity {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

export interface EntityTagLink {
  entityId: string;
  entityType: EntityType;
  tagId: string;
}

// ------------------------------------------------------------------------------
// 14, 15, 16. 🗂️ CURRICULUM, MAP, STAGE & STAGE CONTENT
// ------------------------------------------------------------------------------
export interface CurriculumEntity extends BaseIdentity {
  name: string;
  description?: string;
  targetJlpt?: string;
  language?: string;
}

export interface MapEntity extends BaseIdentity {
  curriculumId?: string;
  worldId?: string;
  mapNumber: number;
  name: string;
  japaneseName: string;
  description?: string;
  theme?: string;
  bannerBg?: string;
  accentColor?: string;
  minLevel?: number;
  unlockRule?: Record<string, any>;
  icon?: string;
}

export interface StageEntity extends BaseIdentity {
  mapId: string;
  stageNumber: number;
  title: string;
  description?: string;
  isBoss: boolean;
  bossName?: string;
  bossTitle?: string;
  bossHp?: number;
  bossAvatar?: string;
  rewardExp: number;
  rewardGold: number;
  rewardItem?: string;
}

export interface StageContentEntity {
  id?: string;
  stageId: string;
  entityType: 'kanji' | 'kotoba' | 'bunpou' | 'dokkai' | 'choukai';
  entityId: string;
  order: number;
  role?: 'core' | 'preview' | 'review' | 'challenge';
  weight?: number;
}

// ------------------------------------------------------------------------------
// 18. 📈 USER MASTERY (4D COMPONENT SYSTEM)
// ------------------------------------------------------------------------------
export interface UserMasteryEntity {
  id?: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  masteryState: 'LOCKED' | 'AVAILABLE' | 'LEARNING' | 'COMPLETED' | 'MASTERED' | 'PERFECTED';
  knowledgeScore: number;                    // 0 - 100%
  recognitionScore: number;                  // 0 - 100%
  applicationScore: number;                  // 0 - 100%
  retentionScore: number;                    // 0 - 100%
  trueMasteryPercentage: number;             // Composite 4D score
  masteryLevel: 1 | 2 | 3 | 4 | 5;
  attemptsCount: number;
  writingCount?: number;
  flashcardCount?: number;
  quizCount?: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  consecutivePerfects: number;
  firstSeen?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  weaknessFlags?: string[];
  errorPatterns?: any[];
  updatedAt?: string;
}

// ------------------------------------------------------------------------------
// 19. 🧠 SRS (SPACED REPETITION)
// ------------------------------------------------------------------------------
export interface UserSrsEntity {
  id?: string;
  userId: string;
  entityId: string;
  entityType: EntityType;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  decayFactor: number;
  dueAt: string;
  lastReviewedAt: string;
  algorithmVersion?: string;
}

// ------------------------------------------------------------------------------
// 20. 🏆 USER ACTIVITY (EVENT STREAM)
// ------------------------------------------------------------------------------
export interface UserActivityEntity {
  id?: string;
  userId: string;
  activityType: 'quiz_answer' | 'kanji_write' | 'stage_clear' | 'boss_defeat' | 'srs_review';
  entityType?: EntityType;
  entityId?: string;
  result: 'correct' | 'wrong' | 'partial' | 'cleared';
  score?: number;
  xpGained?: number;
  durationSeconds?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// 22. 🔗 KNOWLEDGE GRAPH: RELATION ENGINE
// ------------------------------------------------------------------------------
export interface RelationEntity {
  id?: string;
  sourceType: EntityType;
  sourceId: string;
  relationType: string;                      // e.g. 'composed_of', 'appears_in', 'prerequisite_of'
  targetType: EntityType;
  targetId: string;
  weight?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
}
