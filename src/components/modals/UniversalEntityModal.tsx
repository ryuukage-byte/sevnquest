// ==============================================================================
// NIHONGO QUEST: UNIVERSAL ENTITY MODAL (PLUGGABLE HEADLESS RENDERER)
// Inspect any entity (Kanji, Kotoba, Bunpou) with dynamic capability tabs
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  Bookmark,
  PenTool,
  BookOpen,
  Network,
  HelpCircle,
  ArrowLeft,
  GitBranch,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { EntityRegistry, UnifiedEntity } from '../../engine/registry/entityRegistry';
import {
  asWritable,
  asFlashcard,
  asGrammarFormula,
  asRelational,
  asQuiz,
  WritableTrait,
  GrammarFormulaTrait,
  RelationalTrait,
  QuizTrait,
} from '../../engine/traits/traits';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { FormulaDisplay } from '../learning/FormulaDisplay';
import { KanjiWritingCanvas, preloadStrokeData } from '../learning/KanjiWritingCanvas';
import { KotobaWritingPractice } from '../learning/KotobaWritingPractice';
import { parseReadingVariations } from '../../utils/readingHighlightUtils';

import { UserDeck, DeckItemCategory } from '../../types/rpg';
import { Question } from '../../types/content';

export interface UniversalEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: string | null;
  entity?: any | null; // Can pass raw item, ResolvedDeckItem, or UnifiedEntity
  category?: 'kanji' | 'kotoba' | 'bunpou';
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string) => void;
  onToggleDeckItem?: (deckId: string) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionType?: 'writing' | 'flashcard' | 'quiz'
  ) => void;
}

type ModalTab = 'overview' | 'writing' | 'grammar' | 'relations' | 'quiz';

export const UniversalEntityModal: React.FC<UniversalEntityModalProps> = ({
  isOpen,
  onClose,
  entityId,
  entity: initialEntity,
  category: _initialCategory,
  soundEnabled = true,
  userDecks,
  onToggleBookmark,
  onToggleDeckItem: _onToggleDeckItem,
  onRewardPlayer,
  onCompleteStudyItem,
}) => {
  // Navigation stack for deep-linking (e.g. Kotoba -> constituent Kanji -> back)
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');

  // Quick Quiz State
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [quizScoreRecorded, setQuizScoreRecorded] = useState(false);

  // Reset when opening modal with new initial prop
  useEffect(() => {
    if (isOpen) {
      const startItem = initialEntity || (entityId ? EntityRegistry.getEntity(entityId) : null);
      if (startItem) {
        setHistoryStack([startItem]);
      }
      setActiveTab('overview');
      setQuizAnswered(null);
      setQuizScoreRecorded(false);
    } else {
      setHistoryStack([]);
    }
  }, [isOpen, entityId, initialEntity]);

  // Current entity being inspected
  const currentRaw = historyStack.length > 0 ? historyStack[historyStack.length - 1] : null;

  // Resolve into unified representation
  const unified: UnifiedEntity | null = useMemo(() => {
    if (!currentRaw) return null;

    // If it's already a UnifiedEntity
    if (currentRaw.traits && currentRaw.rawItem) {
      return currentRaw as UnifiedEntity;
    }

    // If it has an ID, resolve from registry
    const id = currentRaw.id || (currentRaw.ref && currentRaw.ref.id) || currentRaw.character;
    if (id) {
      const fromRegistry = EntityRegistry.getEntity(id);
      if (fromRegistry) return fromRegistry;
    }

    // Fallback manual resolution
    const flashcard = asFlashcard(currentRaw);
    if (flashcard) {
      return {
        id: flashcard.id,
        category: flashcard.category,
        title: flashcard.displayTitle,
        reading: flashcard.displayReading,
        meaning: flashcard.displayMeaning,
        level: flashcard.level,
        traits: ['flashcard'],
        rawItem: currentRaw,
        kotoba: currentRaw.kotoba || (flashcard.category === 'kotoba' ? currentRaw : undefined),
        kanji: currentRaw.kanji || (flashcard.category === 'kanji' ? currentRaw : undefined),
        bunpou: currentRaw.bunpou || (flashcard.category === 'bunpou' ? currentRaw : undefined),
      };
    }

    return null;
  }, [currentRaw]);

  // Extract Traits
  const targetItem = unified?.rawItem || currentRaw;
  const writableTrait: WritableTrait | null = useMemo(() => asWritable(targetItem), [targetItem]);
  const grammarTrait: GrammarFormulaTrait | null = useMemo(() => asGrammarFormula(targetItem), [targetItem]);
  const relationalTrait: RelationalTrait | null = useMemo(() => asRelational(targetItem), [targetItem]);
  const quizTrait: QuizTrait | null = useMemo(() => asQuiz(targetItem), [targetItem]);

  // Proactively preload stroke data in the background as soon as modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (writableTrait?.character) {
      preloadStrokeData(writableTrait.character);
    } else if (unified?.category === 'kanji' && unified.title) {
      preloadStrokeData(unified.title);
    } else if (unified?.category === 'kotoba' && (unified.title || unified.kotoba?.word)) {
      preloadStrokeData(unified.title || unified.kotoba?.word || '');
    }
  }, [isOpen, writableTrait?.character, unified]);

  // Knowledge Graph nodes
  const relatedNodes = useMemo(() => {
    if (!unified?.id) return { kanji: [], kotoba: [], bunpou: [] };
    return EntityRegistry.getRelated(unified.id);
  }, [unified?.id]);

  // Navigate deeper into an entity
  const handlePushEntity = (nextItem: any) => {
    playSound('click', soundEnabled);
    setHistoryStack(prev => [...prev, nextItem]);
    setActiveTab('overview');
    setQuizAnswered(null);
    setQuizScoreRecorded(false);
  };

  // Pop back
  const handlePopEntity = () => {
    if (historyStack.length > 1) {
      playSound('click', soundEnabled);
      setHistoryStack(prev => prev.slice(0, -1));
      setActiveTab('overview');
      setQuizAnswered(null);
      setQuizScoreRecorded(false);
    }
  };

  // Audio speech
  const handlePlayAudio = () => {
    if (!unified) return;
    speakJapanese(unified.reading || unified.title);
    playSound('click', soundEnabled);
  };

  // Bookmark check
  const isBookmarked = useMemo(() => {
    if (!userDecks || !unified?.id) return false;
    const defaultDeck = userDecks.find(d => d.id === 'default_bookmark' || d.isDefault);
    if (!defaultDeck) return false;
    return defaultDeck.items.some(
      it => it.id === unified.id || (unified.category === 'kanji' && it.id === unified.title)
    );
  }, [userDecks, unified?.id, unified?.title, unified?.category]);

  if (!isOpen || !unified) return null;
  if (typeof document === 'undefined') return null;

  // Render question for quick quiz
  const sampleQuestion: Question | null =
    (quizTrait && quizTrait.questions.length > 0 ? quizTrait.questions[0] : null) ||
    (unified.kanji?.questions && unified.kanji.questions.length > 0 ? unified.kanji.questions[0] : null) ||
    (unified.bunpou?.questions && unified.bunpou.questions.length > 0 ? unified.bunpou.questions[0] : null);

  const categoryColor =
    unified.category === 'kanji'
      ? 'text-wine-accent bg-wine-accent/10 border-border-subtle'
      : unified.category === 'bunpou'
      ? 'text-indigo bg-indigo/10 border-border-subtle'
      : 'text-gold bg-gold/10 border-border-subtle';

  const categoryLabel =
    unified.category === 'kanji'
      ? 'Aksara & Kanji (字)'
      : unified.category === 'bunpou'
      ? 'Pola Kalimat (文)'
      : 'Kosakata (語)';

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="universal-modal-overlay"
        className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            onClose();
            playSound('click', soundEnabled);
          }}
        />

        {/* Modal Dialog */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto panel p-5 sm:p-7 rounded-3xl border border-border-subtle shadow-2xl z-10 space-y-5"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top Bar: Navigation Stack + Close */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              {historyStack.length > 1 && (
                <button
                  onClick={handlePopEntity}
                  className="btn-physical-secondary p-1.5 rounded-xl flex items-center gap-1 text-xs font-bold transition-all"
                  title="Kembali ke materi sebelumnya"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              )}
              <span className={`text-[10px] font-bold font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${categoryColor}`}>
                {categoryLabel}
              </span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-secondary">
                {unified.level}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Bookmark Button */}
              {onToggleBookmark && (
                <button
                  onClick={() => {
                    onToggleBookmark(unified.id, unified.category as DeckItemCategory);
                    playSound('click', soundEnabled);
                  }}
                  className={`p-2 rounded-xl border transition-all ${
                    isBookmarked
                      ? 'bg-gold/20 border-border-subtle text-gold shadow-sm'
                      : 'border-border-subtle hover:border-border-primary text-text-muted hover:text-text-primary'
                  }`}
                  title={isBookmarked ? 'Ditandai di Buku Saku' : 'Simpan ke Buku Saku'}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-gold' : ''}`} />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  onClose();
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Identity Banner */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-surface-inset border border-border-subtle">
            <div className="space-y-1">
              {unified.reading && (() => {
                const readingVars = parseReadingVariations(unified.reading);
                if (readingVars.length > 1) {
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-red-700 dark:text-amber-400 bg-surface-inset border border-border-subtle px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3 text-red-700 dark:text-amber-400 fill-red-700/20 dark:fill-amber-400/25 shrink-0" />
                          <span>{readingVars.length} Cara Baca Alternatif</span>
                        </span>
                        {readingVars.map((v, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => speakJapanese(v)}
                            className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-text-primary text-xs font-jp font-bold flex items-center gap-1 hover:border-border-primary transition-colors"
                            title={`Dengar cara baca #${i + 1}: ${v}`}
                          >
                            <span className="text-[10px] text-red-700 dark:text-amber-400 font-mono font-bold">#{i + 1}</span>
                            <span>{v}</span>
                            <Volume2 className="w-3 h-3 text-red-700 dark:text-amber-400" />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm font-jp text-text-muted block">
                        ({readingVars.join(' / ')})
                      </span>
                    </div>
                  );
                }
                return (
                  <span className="text-xs sm:text-sm font-jp text-text-secondary block">
                    {unified.reading}
                  </span>
                );
              })()}
              <h2 className="text-2xl sm:text-3xl font-jp font-bold text-text-primary tracking-wide flex items-center gap-2">
                <span>{unified.title}</span>
                <button
                  onClick={handlePlayAudio}
                  className="btn-physical-secondary p-1.5 rounded-xl text-gold transition-all"
                  title="Dengar Pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </h2>
              <p className="text-sm sm:text-base font-bold text-gold font-heading pt-1">
                {unified.meaning}
              </p>
            </div>

            {/* Kanji Stroke Count Pill (if Kanji) */}
            {unified.kanji?.strokeCount && (
              <div className="shrink-0 p-2.5 rounded-xl bg-surface-card border border-border-subtle text-center">
                <span className="block text-[10px] font-mono text-text-muted uppercase">Goresan</span>
                <span className="text-sm font-bold font-mono text-text-primary">
                  {unified.kanji.strokeCount}
                </span>
              </div>
            )}
          </div>

          {/* Capability Tabs Navigation */}
          <div className="flex items-center gap-1.5 border-b border-border-subtle pb-2 overflow-x-auto scrollbar-thin">
            {/* Overview Tab */}
            <button
              onClick={() => {
                setActiveTab('overview');
                playSound('click', soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-surface-elevated text-text-primary border border-border-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ringkasan</span>
            </button>

            {/* Writing Studio Tab (Only if Writable) */}
            {writableTrait && (
              <button
                onClick={() => {
                  setActiveTab('writing');
                  playSound('click', soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === 'writing'
                    ? 'bg-surface-elevated text-indigo border border-border-subtle shadow-sm'
                    : 'text-text-muted hover:text-indigo'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Studio Menulis</span>
              </button>
            )}

            {/* Grammar Mechanics Tab (Only if Grammar Formula) */}
            {grammarTrait && (
              <button
                onClick={() => {
                  setActiveTab('grammar');
                  playSound('click', soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === 'grammar'
                    ? 'bg-surface-elevated text-gold border border-border-subtle shadow-sm'
                    : 'text-text-muted hover:text-gold'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Rumus & Kaidah</span>
              </button>
            )}

            {/* Relational Knowledge Graph Tab */}
            {(relationalTrait || relatedNodes.kanji.length > 0 || relatedNodes.kotoba.length > 0) && (
              <button
                onClick={() => {
                  setActiveTab('relations');
                  playSound('click', soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === 'relations'
                    ? 'bg-surface-elevated text-text-primary border border-border-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Relasi & Komponen</span>
              </button>
            )}

            {/* Quick Quiz Tab */}
            {sampleQuestion && (
              <button
                onClick={() => {
                  setActiveTab('quiz');
                  playSound('click', soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === 'quiz'
                    ? 'bg-surface-elevated text-wine-accent border border-border-subtle shadow-sm'
                    : 'text-text-muted hover:text-wine-accent'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Kuis Kilat</span>
              </button>
            )}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              {/* Kanji Specific Readings */}
              {unified.kanji && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-surface-card border border-border-subtle">
                    <span className="text-[10px] font-mono uppercase text-text-muted">Onyomi (音読み)</span>
                    <p className="text-sm font-jp font-bold text-text-primary pt-0.5">
                      {unified.kanji.onyomi?.join('、') || '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-card border border-border-subtle">
                    <span className="text-[10px] font-mono uppercase text-text-muted">Kunyomi (訓読み)</span>
                    <p className="text-sm font-jp font-bold text-text-primary pt-0.5">
                      {unified.kanji.kunyomi?.join('、') || '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Kotoba Extra Meanings */}
              {unified.kotoba?.meaningJa && (
                <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Definisi Bahasa Jepang (国語)</span>
                  <p className="text-xs sm:text-sm font-jp text-text-secondary leading-relaxed">
                    {unified.kotoba.meaningJa}
                  </p>
                </div>
              )}

              {/* Example Sentences */}
              {(unified.kotoba?.exampleSentence || (grammarTrait && grammarTrait.examples.length > 0)) && (
                <div className="space-y-2">
                  <span className="text-xs font-bold font-heading text-text-primary uppercase tracking-wider block">
                    Contoh Kalimat
                  </span>
                  {unified.kotoba?.exampleSentence && (
                    <div className="p-3.5 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <RubyText
                          japanese={unified.kotoba.exampleSentence.japanese}
                          reading={unified.kotoba.exampleSentence.reading}
                          className="text-sm sm:text-base font-jp text-text-primary font-medium"
                        />
                        <button
                          onClick={() => speakJapanese(unified.kotoba?.exampleSentence?.japanese || '')}
                          className="p-1 text-gold hover:text-gold/80 transition-colors shrink-0"
                          title="Dengar Audio Kalimat"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {unified.kotoba.exampleSentence.meaningId}
                      </p>
                    </div>
                  )}

                  {grammarTrait?.examples.slice(0, 2).map((ex, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <RubyText
                          japanese={ex.japanese}
                          reading={ex.reading}
                          className="text-sm sm:text-base font-jp text-text-primary font-medium"
                        />
                        <button
                          onClick={() => speakJapanese(ex.japanese)}
                          className="p-1 text-gold hover:text-gold/80 transition-colors shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-text-secondary">{ex.meaningId}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WRITING STUDIO */}
          {activeTab === 'writing' && writableTrait && (
            <div className="space-y-2 sm:space-y-3 animate-fade-in">
              <div className="hidden sm:flex p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-secondary items-center justify-between">
                <span>Latihan menulis interaktif dengan panduan arah goresan.</span>
                <span className="font-mono font-bold text-gold">
                  {writableTrait.strokeCount} Goresan
                </span>
              </div>

              {writableTrait.isSingleKanji ? (
                <div className="flex justify-center">
                  <KanjiWritingCanvas
                    kanjiChar={writableTrait.character}
                    level={writableTrait.level}
                    meaning={writableTrait.meaning}
                    strokeCount={writableTrait.strokeCount}
                    onyomi={writableTrait.onyomi || ''}
                    kunyomi={writableTrait.kunyomi || ''}
                    relatedWords={writableTrait.sourceItem?.relatedWords}
                    soundEnabled={soundEnabled}
                    totalSheets={1}
                    showStopwatch={true}
                    nextButtonLabel="Kembali ke Detail Materi"
                    onCancel={() => setActiveTab('overview')}
                    onFinish={reward => {
                      if (onRewardPlayer) onRewardPlayer(reward?.expGained || 25, reward?.goldGained || 10);
                      setActiveTab('overview');
                    }}
                  />
                </div>
              ) : (
                <KotobaWritingPractice
                  kotoba={
                    unified.kotoba || {
                      id: unified.id,
                      word: writableTrait.character,
                      reading: unified.reading,
                      meaningId: writableTrait.meaning,
                      meaningEn: '',
                      meaningJa: '',
                      jlpt: writableTrait.level,
                      wordType: 'noun',
                      kanjiComponents: writableTrait.characters,
                    }
                  }
                  soundEnabled={soundEnabled}
                  nextButtonLabel="Kembali ke Detail Materi"
                  onCancel={() => setActiveTab('overview')}
                  onCompleteWord={(score, reward) => {
                    const exp = reward?.expGained || 20;
                    const gold = reward?.goldGained || 10;
                    if (onCompleteStudyItem) {
                      onCompleteStudyItem('kotoba', exp, gold, unified.id, score >= 60 ? 1 : 0, 1, 'writing');
                    } else if (onRewardPlayer) {
                      onRewardPlayer(exp, gold);
                    }
                  }}
                  onFinishWord={(score, reward) => {
                    const exp = reward?.expGained || 20;
                    const gold = reward?.goldGained || 10;
                    if (onCompleteStudyItem) {
                      onCompleteStudyItem('kotoba', exp, gold, unified.id, score >= 60 ? 1 : 0, 1, 'writing');
                    } else if (onRewardPlayer) {
                      onRewardPlayer(exp, gold);
                    }
                    setActiveTab('overview');
                  }}
                />
              )}
            </div>
          )}

          {/* TAB 3: GRAMMAR MECHANICS */}
          {activeTab === 'grammar' && grammarTrait && (
            <div className="space-y-4 animate-fade-in">
              {/* Formula Component */}
              <div className="space-y-2">
                <span className="text-xs font-bold font-heading text-text-primary uppercase tracking-wider block">
                  Rumus Utama
                </span>
                <FormulaDisplay
                  formula={grammarTrait.formula}
                  item={unified.bunpou}
                />
              </div>


              {/* Nuance Note */}
              {grammarTrait.nuance && (
                <div className="p-3.5 rounded-2xl bg-surface-card border border-border-subtle space-y-1">
                  <span className="text-[10px] font-mono uppercase text-gold">Nuansa & Rasa Bahasa</span>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {grammarTrait.nuance}
                  </p>
                </div>
              )}

              {/* Sub-Formulas */}
              {grammarTrait.subFormulas && grammarTrait.subFormulas.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold font-heading text-text-primary uppercase tracking-wider block">
                    Variasi Sub-Rumus ({grammarTrait.subFormulas.length})
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {grammarTrait.subFormulas.map((sub, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-jp text-indigo">{sub.token}</span>
                          <span className="text-[10px] font-mono text-text-muted">{sub.usageLocation}</span>
                        </div>
                        <p className="text-xs text-text-secondary">{sub.meaning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RELATIONS & KNOWLEDGE GRAPH */}
          {activeTab === 'relations' && (
            <div className="space-y-4 animate-fade-in">
              {/* Constituent Kanji */}
              {relatedNodes.kanji.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold font-heading text-text-primary uppercase tracking-wider block">
                    Kanji Penyusun Kata Ini ({relatedNodes.kanji.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {relatedNodes.kanji.map(kj => (
                      <button
                        key={kj.id || kj.character}
                        onClick={() => handlePushEntity(kj)}
                        className="p-3 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border-subtle hover:border-border-primary flex items-center gap-2.5 text-left transition-all group"
                      >
                        <span className="text-2xl font-jp font-bold text-text-primary group-hover:text-gold transition-colors">
                          {kj.character}
                        </span>
                        <div className="overflow-hidden">
                          <span className="block text-xs font-bold text-text-primary truncate">
                            {kj.meaningId}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            {kj.strokeCount} Goresan
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Kotoba */}
              {relatedNodes.kotoba.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold font-heading text-text-primary uppercase tracking-wider block">
                    Kosakata yang Menggunakan Karakter Ini ({relatedNodes.kotoba.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relatedNodes.kotoba.map(kb => (
                      <button
                        key={kb.id}
                        onClick={() => handlePushEntity(kb)}
                        className="p-2.5 rounded-xl bg-surface-card hover:bg-surface-elevated border border-border-subtle hover:border-border-primary flex items-center justify-between text-left transition-all group"
                      >
                        <div>
                          <span className="block text-sm font-jp font-bold text-text-primary group-hover:text-gold transition-colors">
                            {kb.word}
                          </span>
                          <span className="text-xs text-text-secondary truncate block max-w-[200px]">
                            {kb.meaningId}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: QUICK QUIZ */}
          {activeTab === 'quiz' && sampleQuestion && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3">
                <span className="text-[10px] font-mono text-text-muted uppercase">
                  Soal Penguasaan Mandiri
                </span>
                <p className="text-sm sm:text-base font-jp font-bold text-text-primary">
                  {sampleQuestion.prompt}
                </p>

                {/* Options */}
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {sampleQuestion.options.map((opt, oIdx) => {
                    const isSelected = quizAnswered === oIdx;
                    const isCorrect = oIdx === sampleQuestion.correctIndex;
                    let optStyle = 'bg-surface-card border-border-subtle hover:border-border-primary text-text-primary';

                    if (quizAnswered !== null) {
                      if (isCorrect) {
                        optStyle = 'bg-emerald-500/20 border-border-subtle text-emerald-300';
                      } else if (isSelected) {
                        optStyle = 'bg-rose-500/20 border-border-subtle text-rose-300';
                      } else {
                        optStyle = 'opacity-40 bg-surface-card border-border-subtle text-text-muted';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={quizAnswered !== null}
                        onClick={() => {
                          setQuizAnswered(oIdx);
                          if (isCorrect) {
                            playSound('correct', soundEnabled);
                            if (!quizScoreRecorded && onRewardPlayer) {
                              onRewardPlayer(15, 5);
                              setQuizScoreRecorded(true);
                            }
                          } else {
                            playSound('wrong', soundEnabled);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-jp flex items-center justify-between transition-all ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {quizAnswered !== null && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {quizAnswered !== null && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {quizAnswered !== null && sampleQuestion.explanation && (
                  <div className="p-3 rounded-xl bg-surface-card border border-border-subtle text-xs text-text-secondary space-y-1 mt-3">
                    <span className="font-bold text-text-primary block">Pembahasan:</span>
                    <p>{sampleQuestion.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
