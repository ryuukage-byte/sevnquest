import { getWordTypeLabel } from '../../utils/wordType';
// ==============================================================================
// NIHONGO QUEST: CAPABILITY TRAIT SYSTEM (ECS / TOOL-CONSUMER CONTRACTS)
// Declarative capability detection & typed adaptors for entities
// ==============================================================================

import { KanjiItem, KotobaItem, BunpouItem, Question, ExampleSentence, SubFormulaBranch, GrammarComparison } from '../../types/content';

export type TraitType =
  | 'writable'
  | 'audio'
  | 'flashcard'
  | 'grammar_formula'
  | 'relational'
  | 'quiz';

// ------------------------------------------------------------------------------
// 1. WRITABLE TRAIT (Canvas Writing & Stroke Practice)
// ------------------------------------------------------------------------------
export interface WritableTrait {
  readonly trait: 'writable';
  character: string;             // Primary character or full word string
  characters: string[];          // Sequence of characters to draw (e.g. ['勉', '強'] or ['関'])
  isSingleKanji: boolean;
  strokeCount: number;
  strokePaths?: string[];        // SVG stroke paths if available
  onyomi?: string;
  kunyomi?: string;
  meaning: string;
  level: string;
  sourceItem: any;
}

// ------------------------------------------------------------------------------
// 2. AUDIO TRAIT (Spoken Japanese & Audio Playback)
// ------------------------------------------------------------------------------
interface AudioTrait {
  readonly trait: 'audio';
  japaneseText: string;
  reading?: string;
  audioUrl?: string;
  speaker?: string;
  speed?: number;
}

// ------------------------------------------------------------------------------
// 3. FLASHCARD TRAIT (Dual-Sided Study Presentation)
// ------------------------------------------------------------------------------
export interface FlashcardTrait {
  readonly trait: 'flashcard';
  id: string;
  category: 'kanji' | 'kotoba' | 'bunpou';
  displayTitle: string;
  displayReading: string;
  displayMeaning: string;
  level: string;
  subInfo?: string;
  kanji?: KanjiItem;
  kotoba?: KotobaItem;
  bunpou?: BunpouItem;
}

// ------------------------------------------------------------------------------
// 4. GRAMMAR FORMULA TRAIT (Syntax, Rules & Nuance)
// ------------------------------------------------------------------------------
export interface GrammarFormulaTrait {
  readonly trait: 'grammar_formula';
  pattern: string;
  formula: string;
  title: string;
  explanation: string;
  subFormulas?: SubFormulaBranch[];
  nuance?: string;
  functions?: string[];
  comparisonNotes?: GrammarComparison[];
  examples: ExampleSentence[];
}

// ------------------------------------------------------------------------------
// 5. RELATIONAL TRAIT (Knowledge Graph & Composition)
// ------------------------------------------------------------------------------
export interface RelationalTrait {
  readonly trait: 'relational';
  kanjiComponents: string[];
  relatedWords: Array<{ word: string; reading: string; meaningId: string }>;
  collocations: string[];
  tags: string[];
}

// ------------------------------------------------------------------------------
// 6. QUIZ TRAIT (Assessment & Questions Bank)
// ------------------------------------------------------------------------------
export interface QuizTrait {
  readonly trait: 'quiz';
  questions: Question[];
}

// ------------------------------------------------------------------------------
// ADAPTOR FUNCTIONS & TYPE GUARDS
// ------------------------------------------------------------------------------

/**
 * Checks if the given item has writable traits (Kanji character or Kotoba with stroke capacity).
 */
export function asWritable(item: any): WritableTrait | null {
  if (!item) return null;
  const raw = item.ref ? (item.kanji || item.kotoba || item) : item;

  // 1. Direct Kanji or item with single character + strokeCount
  if (
    raw.category === 'kanji' ||
    Boolean(raw.character && typeof raw.strokeCount === 'number') ||
    Boolean(raw.kanji)
  ) {
    const k: KanjiItem = raw.kanji || raw;
    const char = k.character || raw.displayTitle || '';
    if (!char) return null;

    const onyomiStr = Array.isArray(k.onyomi) ? k.onyomi.join('、') : (k.onyomi || '');
    const kunyomiStr = Array.isArray(k.kunyomi) ? k.kunyomi.join('、') : (k.kunyomi || '');
    const meaning = k.meaningId || k.meaningEn || raw.displayMeaning || '';

    return {
      trait: 'writable',
      character: char,
      characters: [char],
      isSingleKanji: true,
      strokeCount: k.strokeCount || 1,
      strokePaths: (k as any).strokePaths || [],
      onyomi: onyomiStr,
      kunyomi: kunyomiStr,
      meaning,
      level: k.jlpt || raw.level || 'N5',
      sourceItem: k,
    };
  }

  // 2. Kotoba word with Japanese characters
  if (raw.category === 'kotoba' || Boolean(raw.word) || Boolean(raw.kotoba)) {
    const kotoba: KotobaItem = raw.kotoba || raw;
    const wordStr = kotoba.word || raw.displayTitle || '';
    if (!wordStr) return null;

    const chars: string[] = Array.from(wordStr);
    const meaning = kotoba.meaningId || kotoba.meaningEn || raw.displayMeaning || '';

    return {
      trait: 'writable',
      character: wordStr,
      characters: chars,
      isSingleKanji: chars.length === 1,
      strokeCount: (kotoba as any).strokeCount || chars.length * 5,
      meaning,
      level: kotoba.jlpt || raw.level || 'N5',
      sourceItem: kotoba,
    };
  }

  return null;
}

/**
 * Checks if the given item can be spoken/pronounced.
 */
function asAudio(item: any): AudioTrait | null {
  if (!item) return null;
  const raw = item.ref ? (item.kotoba || item.kanji || item.bunpou || item) : item;

  const text = raw.word || raw.character || raw.title || raw.displayTitle;
  if (!text || typeof text !== 'string') return null;

  return {
    trait: 'audio',
    japaneseText: text,
    reading: raw.reading || raw.displayReading,
    audioUrl: raw.audioUrl || (raw.audio && raw.audio.audioUrl),
    speaker: raw.speaker,
    speed: raw.speed || 1.0,
  };
}

/**
 * Normalizes any entity into a Flashcard representation.
 */
export function asFlashcard(item: any): FlashcardTrait | null {
  if (!item) return null;
  const raw = item;

  // Determine category
  let category: 'kanji' | 'kotoba' | 'bunpou' = raw.category || 'kotoba';
  if (!raw.category) {
    if (raw.kanji || (raw.character && raw.strokeCount !== undefined)) {
      category = 'kanji';
    } else if (raw.bunpou || raw.formula) {
      category = 'bunpou';
    } else {
      category = 'kotoba';
    }
  }

  const kanji: KanjiItem | undefined = raw.kanji || (category === 'kanji' ? raw : undefined);
  const kotoba: KotobaItem | undefined = raw.kotoba || (category === 'kotoba' ? raw : undefined);
  const bunpou: BunpouItem | undefined = raw.bunpou || (category === 'bunpou' ? raw : undefined);

  let displayTitle = raw.displayTitle || '';
  let displayReading = raw.displayReading || '';
  let displayMeaning = raw.displayMeaning || '';
  let level = raw.level || 'N5';
  let subInfo = '';

  if (category === 'kanji' && kanji) {
    displayTitle = displayTitle || kanji.character || '';
    const kunStr = (kanji.kunyomi || []).join('、');
    const onStr = (kanji.onyomi || []).join('、');
    displayReading = displayReading || [kunStr, onStr].filter(Boolean).join(' | ');
    displayMeaning = displayMeaning || kanji.meaningId || kanji.meaningEn || '';
    level = level || kanji.jlpt || 'N5';
    subInfo = kanji.radical ? `Radikal: ${kanji.radical}` : '';
  } else if (category === 'bunpou' && bunpou) {
    displayTitle = displayTitle || bunpou.title || '';
    displayReading = displayReading || bunpou.formula || '';
    displayMeaning = displayMeaning || bunpou.meaningId || '';
    level = level || bunpou.level || 'N3';
    subInfo = bunpou.nuance || '';
  } else if (kotoba) {
    displayTitle = displayTitle || kotoba.word || '';
    displayReading = displayReading || kotoba.reading || '';
    displayMeaning = displayMeaning || kotoba.meaningId || kotoba.meaningEn || '';
    level = level || kotoba.jlpt || 'N5';
    subInfo = getWordTypeLabel(kotoba.wordType);
  }

  if (!displayTitle) return null;

  return {
    trait: 'flashcard',
    id: raw.id || `${category}_${displayTitle}`,
    category,
    displayTitle,
    displayReading,
    displayMeaning,
    level,
    subInfo,
    kanji,
    kotoba,
    bunpou,
  };
}

/**
 * Checks if the given item contains Grammar formula details.
 */
export function asGrammarFormula(item: any): GrammarFormulaTrait | null {
  if (!item) return null;
  const raw: BunpouItem = item.bunpou || (item.category === 'bunpou' ? item : item.formula ? item : null);
  if (!raw || !raw.formula) return null;

  return {
    trait: 'grammar_formula',
    pattern: (raw as any).pattern || raw.title || '',
    formula: raw.formula,
    title: raw.title,
    explanation: raw.explanation || '',

    subFormulas: raw.subFormulas,
    nuance: raw.nuance,
    functions: raw.functions,
    comparisonNotes: raw.comparisonNotes,
    examples: raw.examples || [],
  };
}

/**
 * Checks if the given item has relational connections (kanji components, related words, collocations).
 */
export function asRelational(item: any): RelationalTrait | null {
  if (!item) return null;
  const raw = item.ref ? (item.kotoba || item.kanji || item) : item;

  const kanjiComponents: string[] = raw.kanjiComponents || (raw.character ? [raw.character] : []);
  const relatedWords = raw.relatedWords || [];
  const collocations = raw.collocations || [];
  const tags = raw.tags || [];

  if (kanjiComponents.length === 0 && relatedWords.length === 0 && collocations.length === 0 && tags.length === 0) {
    return null;
  }

  return {
    trait: 'relational',
    kanjiComponents,
    relatedWords,
    collocations,
    tags,
  };
}

/**
 * Checks if the given item has interactive quiz questions attached.
 */
export function asQuiz(item: any): QuizTrait | null {
  if (!item) return null;
  const raw = item.ref ? (item.kotoba || item.kanji || item.bunpou || item) : item;
  const questions: Question[] = raw.questions || [];

  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  return {
    trait: 'quiz',
    questions,
  };
}

/**
 * Universal capability check for any item.
 */
export function hasTrait(item: any, trait: TraitType): boolean {
  switch (trait) {
    case 'writable':
      return asWritable(item) !== null;
    case 'audio':
      return asAudio(item) !== null;
    case 'flashcard':
      return asFlashcard(item) !== null;
    case 'grammar_formula':
      return asGrammarFormula(item) !== null;
    case 'relational':
      return asRelational(item) !== null;
    case 'quiz':
      return asQuiz(item) !== null;
    default:
      return false;
  }
}

/**
 * Returns all traits available on an entity.
 */
export function getTraits(item: any): TraitType[] {
  const result: TraitType[] = [];
  const candidates: TraitType[] = ['writable', 'audio', 'flashcard', 'grammar_formula', 'relational', 'quiz'];
  for (const t of candidates) {
    if (hasTrait(item, t)) {
      result.push(t);
    }
  }
  return result;
}
