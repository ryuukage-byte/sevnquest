import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Swords,
  Layers,
  PenTool,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  ScrollText,
  Lightbulb,
  Send,
  Clock
} from 'lucide-react';
import { DungeonPayload, DungeonConfig } from '../../utils/dungeonGenerator';
import { playSound, speakJapanese } from '../../utils/audio';
import { UniversalFlashcard } from '../learning/UniversalFlashcard';
import { UniversalWritingCard } from '../learning/UniversalWritingCard';
import { SentenceTile, validateSentenceSubmission, validateSentenceTextSubmission, ValidationFeedback } from '../../engine';
import { JapaneseImeInput } from '../common/JapaneseImeInput';
import { RubyText } from '../learning/RubyText';
import { ENGINE_EXP_MULTIPLIER, getKanjiBaseExp, getKotobaBaseExp, getBunpouBaseExp } from '../../utils/rewards';
import { ResolvedDeckItem, toggleBookmarkItem } from '../../utils/decks';
import { getTargetFormDisplay, getConjugatedMeaningId } from '../../data/conjugationRules';
import { BunpouItem } from '../../types/content';
import { BlackboardPlaygroundModule } from './BlackboardPlaygroundModule';
import { UserDeck } from '../../types/rpg';

// Dynamic micro-multiplier for flashcard flips: Base EXP * 0.005
const FLASHCARD_FLIP_MULTIPLIER = ENGINE_EXP_MULTIPLIER.flashcard_flip;

function cleanPatternToken(s: string): string {
  return s
    .replace(/^[\s~〜・＋\+→\-\*]+/g, '')
    .replace(/[\s~〜・＋\+→\-\*]+$/g, '')
    .replace(/^[VNAいな\d\s\-]+/i, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/［[^］]*］/g, '')
    .trim();
}

function getBunpouPatternKeywords(item: BunpouItem): string[] {
  const keywords = new Set<string>();
  const title = item.title || '';
  const formula = item.formula || '';

  // 1. Clean title prefix
  const cleanTitle = title.split(/[（\(]/)[0].replace(/^[~〜]/, '').trim();
  if (cleanTitle.length >= 2) keywords.add(cleanTitle);

  // 2. Parentheses contents in title
  const parenMatches: string[] = title.match(/[\(（]([^\)）]+)[\)）]/g) || [];
  parenMatches.forEach(pm => {
    const inner = pm.slice(1, -1);
    inner.split(/[\/\+＋／、]+/).forEach(tok => {
      const c = cleanPatternToken(tok);
      if (c.length >= 2 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(c)) {
        keywords.add(c);
      }
    });
  });

  // 3. From formula
  if (formula) {
    const fParts = formula.split(/[\+＋／\/、\s]+/);
    fParts.forEach(p => {
      const c = cleanPatternToken(p);
      if (c.length >= 2 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(c)) {
        keywords.add(c);
      }
    });
  }

  // 4. Common phonetic / conjugation variations
  Array.from(keywords).forEach(kw => {
    if (kw.startsWith('て')) keywords.add('で' + kw.slice(1));
    if (kw.startsWith('た')) keywords.add('だ' + kw.slice(1));
    if (kw.endsWith('たい')) keywords.add(kw.slice(0, -2) + 'たく');
    if (kw.endsWith('ている')) {
      keywords.add(kw.slice(0, -2) + 'てる');
      keywords.add(kw.slice(0, -3) + 'でいる');
      keywords.add(kw.slice(0, -3) + 'でる');
    }
  });

  return Array.from(keywords).filter(k => k.length >= 2);
}

function getPrimaryPatternInsert(item: BunpouItem): string {
  const title = item.title || '';
  const main = title.split(/[（\(]/)[0].replace(/^[~〜]/, '').trim();
  return main || title;
}

function getResolvedItemBaseExp(it: ResolvedDeckItem): number {
  if (it.category === 'kanji' && it.kanji) return getKanjiBaseExp(it.kanji);
  if (it.category === 'kotoba' && it.kotoba) return getKotobaBaseExp(it.kotoba);
  if (it.category === 'bunpou' && it.bunpou) return getBunpouBaseExp(it.bunpou);
  return 20;
}

interface DungeonSessionRunnerProps {
  payload: DungeonPayload;
  onClose: () => void;
  onRestart: (config: DungeonConfig) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionTypeOverride?: 'writing' | 'flashcard' | 'quiz'
  ) => void;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onUpdateDecks?: (decks: UserDeck[]) => void;
}

export const DungeonSessionRunner: React.FC<DungeonSessionRunnerProps> = ({
  payload,
  onClose,
  onRestart,
  onRewardPlayer,
  onCompleteStudyItem,
  soundEnabled = true,
  userDecks,
  onUpdateDecks,
}) => {
  const { config } = payload;
  const availableCount = React.useMemo(() => {
    if (config.type === 'writing') return payload.writingItems?.length ?? config.floorCount;
    if (config.type === 'flashcard') return payload.flashcardItems?.length ?? config.floorCount;
    if (config.type === 'sakubun') return payload.sakubunExercises?.length ?? config.floorCount;
    if (config.type === 'conjugation') return payload.conjugationQuestions?.length ?? config.floorCount;
    if (config.type === 'quiz' || config.type === 'extreme') return payload.quizQuestions?.length ?? config.floorCount;
    if (config.type === 'sentence_creation') return payload.sentenceCreationItems?.length ?? config.floorCount;
    if (config.type === 'blackboard') return 1;
    return config.floorCount;
  }, [config.type, config.floorCount, payload]);

  const totalFloors = Math.max(1, Math.min(config.floorCount, availableCount));

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [isVictory, setIsVictory] = useState(false);

  // Survival Mode Timer State
  const isSurvivalMode = config.mode === 'survival';
  const survivalTimeLimit = config.survivalTimeLimit || 30;
  const [timeLeft, setTimeLeft] = useState<number>(survivalTimeLimit);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  // Sub-exercise state for Flashcard
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [flashcardExpPopup, setFlashcardExpPopup] = useState<number | null>(null);

  const handleFlashcardFlip = (it: ResolvedDeckItem) => {
    playSound('click', soundEnabled);
    setIsFlashcardFlipped(prev => !prev);

    const baseExp = getResolvedItemBaseExp(it);
    const flipExp = Math.max(0.01, Number((baseExp * FLASHCARD_FLIP_MULTIPLIER).toFixed(2)));

    setAccumulatedExp(prev => Number((prev + flipExp).toFixed(2)));
    setFlashcardExpPopup(flipExp);

    if (onCompleteStudyItem) {
      const mod = it.category === 'kanji' ? 'kanji' : (it.category === 'bunpou' ? 'bunpou' : 'kotoba');
      onCompleteStudyItem(mod, flipExp, 0, it.ref.id, 1, 1, 'flashcard');
    }

    setTimeout(() => {
      setFlashcardExpPopup(null);
    }, 800);
  };

  // Sub-exercise state for Quiz / Conjugation
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Sub-exercise state for Sakubun (Sentence Builder)
  const [sakubunMode, setSakubunMode] = useState<'tiles' | 'typing'>('tiles');
  const [sakubunTypedText, setSakubunTypedText] = useState<string>('');
  const [sakubunPlacedTiles, setSakubunPlacedTiles] = useState<SentenceTile[]>([]);
  const [sakubunFeedback, setSakubunFeedback] = useState<ValidationFeedback | null>(null);

  // Sub-exercise state for Sentence Creation (Kreasi Kalimat)
  const [creationTypedText, setCreationTypedText] = useState<string>('');
  const [showCreationExamples, setShowCreationExamples] = useState<boolean>(false);
  const [creationFeedback, setCreationFeedback] = useState<{
    isValid: boolean;
    message: string;
    matchedKeyword?: string;
  } | null>(null);

  const handleCheckCreation = (item: BunpouItem) => {
    const trimmed = creationTypedText.trim();
    if (!trimmed) return;

    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed);
    if (!hasJapanese || trimmed.length < 3) {
      playSound('wrong', soundEnabled);
      setCreationFeedback({
        isValid: false,
        message: 'Mohon tulis kalimat dalam aksara Jepang (Hiragana/Katakana/Kanji) minimal 3 karakter.',
      });
      return;
    }

    const keywords = getBunpouPatternKeywords(item);
    const primary = getPrimaryPatternInsert(item);
    if (!keywords.includes(primary) && primary.length >= 2) {
      keywords.push(primary);
    }

    const matched = keywords.find(kw => trimmed.includes(kw));

    if (matched) {
      playSound('correct', soundEnabled);
      setCreationFeedback({
        isValid: true,
        message: `Luar biasa! Pola 「${matched}」 berhasil diterapkan dalam kalimatmu.`,
        matchedKeyword: matched,
      });
    } else {
      playSound('wrong', soundEnabled);
      setCreationFeedback({
        isValid: false,
        message: `Pola 「${primary}」 belum terdeteksi pada kalimatmu. Pastikan kalimat mengandung bentuk tersebut.`,
        matchedKeyword: primary,
      });
    }
  };

  // Initialize Sakubun tiles when floor changes
  useEffect(() => {
    if (config.type === 'sakubun' && payload.sakubunExercises && payload.sakubunExercises[currentFloorIndex]) {
      const ex = payload.sakubunExercises[currentFloorIndex];
      setSakubunPlacedTiles([]);
      setSakubunFeedback(null);
      setSakubunTypedText('');
    }
    // Reset floor sub-states
    setIsFlashcardFlipped(false);
    setFlashcardExpPopup(null);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
    setCreationTypedText('');
    setShowCreationExamples(false);
    setCreationFeedback(null);
    setTimeLeft(survivalTimeLimit);
    setIsTimeUp(false);
  }, [currentFloorIndex, config.type, payload.sakubunExercises, survivalTimeLimit]);

  const handleTimeUp = () => {
    setIsTimeUp(true);
    playSound('wrong', soundEnabled);

    if (config.type === 'quiz' || config.type === 'extreme' || config.type === 'conjugation') {
      setIsAnswerChecked(true);
      setSelectedAnswerIndex(-1);
    } else if (config.type === 'flashcard') {
      setIsFlashcardFlipped(true);
    } else if (config.type === 'sakubun') {
      setSakubunFeedback({
        isCorrect: false,
        score: 0,
        submittedSentence: '',
        targetSentence: '',
        detailedFeedback: 'Waktu Habis! ⏱️ Kamu kehabisan waktu untuk menyusun kalimat di lantai ini.',
        pedagogicalAdvice: 'Tingkatkan kecepatan refleks pada latihan berikutnya.',
      });
    } else if (config.type === 'sentence_creation') {
      setCreationFeedback({
        isValid: false,
        message: 'Waktu Habis! ⏱️ Kamu kehabisan waktu untuk menulis kalimat pola di lantai ini.',
      });
    }
  };

  // Countdown timer effect for Survival Mode
  useEffect(() => {
    if (!isSurvivalMode || isVictory || isTimeUp) return;

    const isFloorResolved =
      isAnswerChecked ||
      (config.type === 'flashcard' && isFlashcardFlipped) ||
      (config.type === 'sakubun' && (sakubunFeedback?.isCorrect ?? false)) ||
      (config.type === 'sentence_creation' && (creationFeedback?.isValid ?? false));

    if (isFloorResolved) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isSurvivalMode,
    isVictory,
    isTimeUp,
    isAnswerChecked,
    isFlashcardFlipped,
    sakubunFeedback,
    creationFeedback,
    currentFloorIndex,
    config.type
  ]);

  // Next Floor or Finish Dungeon
  const advanceToNextFloor = (isCorrectAnswer: boolean, expAward = 20, goldAward = 10) => {
    const nextExp = Number((accumulatedExp + expAward).toFixed(2));
    const nextGold = accumulatedGold + goldAward;
    const nextCorrect = isCorrectAnswer ? correctCount + 1 : correctCount;

    setAccumulatedExp(nextExp);
    setAccumulatedGold(nextGold);
    if (isCorrectAnswer) setCorrectCount(nextCorrect);

    if (currentFloorIndex + 1 >= totalFloors) {
      // Dungeon Completed!
      playSound('victory', soundEnabled);
      try {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      } catch {}

      if (onCompleteStudyItem) {
        const modId = config.type === 'writing' || config.type === 'extreme' ? 'kanji' : (config.type === 'sakubun' || config.type === 'sentence_creation' ? 'bunpou' : 'kotoba');
        onCompleteStudyItem(modId, nextExp, nextGold, `dungeon_${config.type}_${Date.now()}`, nextCorrect, totalFloors);
      } else if (onRewardPlayer) {
        onRewardPlayer(nextExp, nextGold);
      }

      setIsVictory(true);
    } else {
      setCurrentFloorIndex(prev => prev + 1);
    }
  };

  if (typeof document === 'undefined') return null;

  // Compute percentage accuracy & Rank
  const accuracyPct = Math.round((correctCount / Math.max(1, totalFloors)) * 100);
  let rankGrade = 'A';
  let rankColor = 'text-gold border-border-subtle bg-gold/15';
  if (accuracyPct === 100) {
    rankGrade = 'S';
    rankColor = 'text-amber-400 border-border-subtle bg-amber-400/20';
  } else if (accuracyPct >= 75) {
    rankGrade = 'A';
    rankColor = 'text-gold border-border-subtle bg-gold/15';
  } else if (accuracyPct >= 50) {
    rankGrade = 'B';
    rankColor = 'text-indigo border-border-subtle bg-indigo/15';
  } else {
    rankGrade = 'C';
    rankColor = 'text-text-muted border-border-subtle bg-surface-inset';
  }

  const renderFallbackMissingItem = () => (
    <div className="p-8 text-center space-y-4 my-auto bg-surface-inset/60 rounded-3xl border border-border-subtle">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center text-emerald-500 shadow-xs">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-bold text-text-primary">Materi Selesai untuk Lantai Ini</h4>
        <p className="text-xs text-text-secondary">Lanjutkan ekspedisi ke lantai berikutnya.</p>
      </div>
      <button
        type="button"
        onClick={() => advanceToNextFloor(true, 15, 8)}
        className="btn-skeuo-indigo px-6 py-2.5 text-xs transition-all cursor-pointer"
      >
        Lantai Berikutnya →
      </button>
    </div>
  );

  return createPortal(
    <motion.div
      key="dungeon-runner-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={`panel panel-stitched relative w-full ${config.type === 'blackboard' ? 'max-w-5xl' : 'max-w-2xl'} max-h-[94vh] flex flex-col border border-border-subtle rounded-3xl shadow-2xl overflow-hidden bg-surface-card animate-scale-up`}>
        {/* Subtle Washi Texture Overlay */}
        <div className="skeuo-grain" />
        
        {/* TOP HUD: Dungeon Floor Header */}
        <div className="p-3.5 sm:p-4 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-inset shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold shadow-sm">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary font-heading">
                  {config.type === 'writing' && '✍️ Dungeon Menulis'}
                  {config.type === 'flashcard' && '🎴 Dungeon Flashcard'}
                  {config.type === 'sakubun' && '🧩 Kuil Tata Bahasa'}
                  {config.type === 'conjugation' && '⚡ Altar Konjugasi'}
                  {config.type === 'quiz' && '🎯 Arena Kuis Cepat'}
                  {config.type === 'extreme' && (config.stageNumber ? `🔥 Kanji Extreme (Stage ${config.stageNumber})` : '🔥 Gerbang Kanji Extreme')}
                  {config.type === 'sentence_creation' && '📜 Kreasi Pola Kalimat'}
                  {config.type === 'blackboard' && '🏫 Papan Tulis Pola'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card text-indigo border border-border-subtle font-bold max-w-[150px] truncate">
                  {config.deckTitle ? `📖 ${config.deckTitle}` : config.levelCategory}
                </span>
              </div>
              <span className="text-[10px] text-text-secondary font-mono">
                {config.type === 'blackboard'
                  ? 'Playground Bebas'
                  : `Lantai ${Math.min(currentFloorIndex + 1, totalFloors)} / ${totalFloors}`}
              </span>
            </div>
          </div>

          {/* Progress Bar & Rewards Counter + Survival Countdown Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSurvivalMode && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono font-black text-xs border transition-all select-none ${
                  timeLeft <= 5
                    ? 'bg-rose-500/25 text-rose-400 border-rose-500/60 animate-pulse scale-105'
                    : timeLeft <= 10
                    ? 'bg-amber-500/15 text-amber-400 border-border-subtle'
                    : 'bg-surface-card text-rose-400 border-rose-500/30 shadow-2xs'
                }`}
                title={`Sisa waktu: ${timeLeft} detik`}
              >
                <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 && !isTimeUp ? 'animate-spin' : ''}`} />
                <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                {isTimeUp && (
                  <span className="text-[10px] text-rose-400 uppercase font-black tracking-wider hidden sm:inline ml-0.5">
                    HABIS
                  </span>
                )}
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold">
              <span className="text-indigo">+{Number(accumulatedExp.toFixed(2))} EXP</span>
              <span className="text-gold">+{accumulatedGold} G</span>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="btn-physical-secondary p-1.5 rounded-xl transition-colors cursor-pointer"
              title="Kabur dari Dungeon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floor Progress Bar Line */}
        {config.type !== 'blackboard' && (
          <div className="w-full bg-surface-inset h-1 overflow-hidden shrink-0">
            <motion.div
              className="bg-indigo h-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentFloorIndex + 1) / totalFloors) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Survival Countdown Linear Bar */}
        {isSurvivalMode && (
          <div className="w-full bg-surface-inset/70 h-1 overflow-hidden shrink-0">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 5
                  ? 'bg-rose-500 animate-pulse'
                  : timeLeft <= 10
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (timeLeft / survivalTimeLimit) * 100))}%` }}
            />
          </div>
        )}

        {/* MAIN BODY: ACTIVE FLOOR CONTENT OR VICTORY SCREEN */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin flex-1 flex flex-col justify-between">
          
          {isVictory ? (
            /* ================= VICTORY SCREEN ================= */
            <div className="text-center space-y-6 my-auto py-6 animate-fade-in">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gold/15 border border-border-subtle flex items-center justify-center text-gold shadow-xl">
                  <Trophy className="w-10 h-10" />
                </div>
                <div className={`absolute -bottom-2 -right-2 px-3 py-0.5 rounded-xl border font-mono font-black text-sm shadow-md ${rankColor}`}>
                  Rank {rankGrade}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
                  Dungeon Berhasil Ditaklukkan!
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary font-medium max-w-md mx-auto">
                  Kamu telah menyelesaikan seluruh {totalFloors} lantai dungeon dengan gemilang.
                </p>
              </div>

              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted uppercase font-mono">Akurasi</span>
                  <p className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                    {accuracyPct}%
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted uppercase font-mono">Total EXP</span>
                  <p className="text-base sm:text-lg font-bold font-mono text-indigo">
                    +{Number(accumulatedExp.toFixed(2))}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-text-muted uppercase font-mono">Total Gold</span>
                  <p className="text-base sm:text-lg font-bold font-mono text-gold">
                    +{accumulatedGold}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    onRestart(config);
                  }}
                  className="btn-physical-secondary w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 font-heading"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Jelajahi Lagi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    onClose();
                  }}
                  className="btn-skeuo-indigo w-full sm:w-auto px-8 py-2.5 text-xs transition-all"
                >
                  <span className="whitespace-nowrap">Kembali ke Gerbang</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            /* ================= ACTIVE FLOOR EXERCISE ================= */
            <div className="space-y-5 my-auto">
              {/* TYPE 1: WRITING DUNGEON */}
              {config.type === 'writing' && payload.writingItems && (
                (() => {
                  const it = payload.writingItems[currentFloorIndex];
                  if (!it) return renderFallbackMissingItem();

                  return (
                    <div className="space-y-3">
                      {isSurvivalMode && isTimeUp && (
                        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-3 animate-fade-in">
                          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>Waktu Habis! Kamu kehabisan waktu di lantai ini.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => advanceToNextFloor(false, 10, 5)}
                            className="btn-skeuo-indigo px-4 py-1.5 text-xs cursor-pointer"
                          >
                            Lantai Berikutnya →
                          </button>
                        </div>
                      )}
                      <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-lg">
                        <UniversalWritingCard
                          item={it}
                          soundEnabled={soundEnabled}
                          totalSheets={1}
                          nextButtonLabel={
                            currentFloorIndex === (payload.writingItems?.length ?? 1) - 1
                              ? 'Selesaikan Dungeon'
                              : 'Lantai Berikutnya →'
                          }
                          onFinish={(score, reward) => {
                            advanceToNextFloor(score >= 60, reward?.expGained ?? 25, reward?.goldGained ?? 12);
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              )}

              {/* TYPE 2: FLASHCARD DUNGEON */}
              {config.type === 'flashcard' && payload.flashcardItems && (
                (() => {
                  const it = payload.flashcardItems[currentFloorIndex];
                  if (!it) return renderFallbackMissingItem();

                  const jp = it.kotoba?.word || it.kanji?.character || it.bunpou?.title || it.displayTitle || '';

                  return (
                    <div className="space-y-4">
                      {/* Interactive 3D Flip Card with Floating EXP Popup */}
                      <div className="relative">
                        <AnimatePresence>
                          {flashcardExpPopup !== null && (
                            <motion.div
                              key={`exp-popup-${Date.now()}`}
                              initial={{ opacity: 0, y: 0, scale: 0.7 }}
                              animate={{ opacity: 1, y: -36, scale: 1.1 }}
                              exit={{ opacity: 0, y: -50 }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className="absolute top-3 right-3 sm:top-6 sm:right-6 z-50 text-emerald-400 font-mono font-black text-sm sm:text-base drop-shadow-md pointer-events-none flex items-center gap-1 bg-surface-card/90 px-2.5 py-1 rounded-full border border-emerald-500/40"
                            >
                              +{flashcardExpPopup} EXP
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <UniversalFlashcard
                          item={it}
                          isFlipped={isFlashcardFlipped}
                          onFlip={() => handleFlashcardFlip(it)}
                          soundEnabled={soundEnabled}
                          furiganaEnabled={true}
                        />
                      </div>

                      {/* Flashcard Action Bar */}
                      <div className="flex items-center justify-between gap-2.5 max-w-md mx-auto w-full pt-1">
                        {jp && (
                          <button
                            type="button"
                            onClick={() => speakJapanese(jp)}
                            className="btn-physical-secondary p-3 rounded-2xl text-gold transition-colors cursor-pointer shrink-0"
                            title="Dengarkan Pelafalan"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleFlashcardFlip(it)}
                          className="btn-physical-secondary flex-1 py-3 px-4 rounded-2xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4 text-gold" />
                          <span>{isFlashcardFlipped ? 'Tutup Arti' : 'Balik Kartu'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playSound('click', soundEnabled);
                            advanceToNextFloor(true, 0, 1);
                          }}
                          className="flex-1 btn-skeuo-indigo py-3 px-4 text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>{currentFloorIndex + 1 >= totalFloors ? 'Selesaikan' : 'Lantai Berikutnya'}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                      </div>

                      {/* Survival Timeout Notice for Flashcard */}
                      {isSurvivalMode && isTimeUp && (
                        <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center gap-1.5 text-rose-400 font-bold text-xs animate-fade-in max-w-md mx-auto w-full">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Waktu Habis! Kartu dibalik otomatis. Periksa arti lalu lanjutkan.</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 3: SAKUBUN (SENTENCE BUILDER) DUNGEON */}
              {config.type === 'sakubun' && payload.sakubunExercises && (
                (() => {
                  const ex = payload.sakubunExercises[currentFloorIndex];
                  if (!ex) return renderFallbackMissingItem();

                  // Bank balok selalu mengikuti urutan acak awal soal; balok yang terpakai hanya
                  // ditandai, sehingga saat dilepas ia kembali ke slot semula (tidak pindah ke belakang).
                  const handleSelectTile = (tile: SentenceTile) => {
                    if (sakubunPlacedTiles.some(t => t.id === tile.id)) return;
                    playSound('click', soundEnabled);
                    setSakubunPlacedTiles(prev => [...prev, tile]);
                    setSakubunFeedback(null);
                  };

                  const handleRemoveTile = (tile: SentenceTile) => {
                    playSound('click', soundEnabled);
                    setSakubunPlacedTiles(prev => prev.filter(t => t.id !== tile.id));
                    setSakubunFeedback(null);
                  };

                  const handleCheckSakubun = () => {
                    const fb = sakubunMode === 'typing'
                      ? validateSentenceTextSubmission(ex, sakubunTypedText)
                      : validateSentenceSubmission(ex, sakubunPlacedTiles.map(t => t.id));

                    setSakubunFeedback(fb);
                    if (fb.isCorrect) {
                      playSound('correct', soundEnabled);
                    } else {
                      playSound('wrong', soundEnabled);
                    }
                  };

                  const isCheckDisabled = sakubunMode === 'typing'
                    ? sakubunTypedText.trim().length === 0
                    : sakubunPlacedTiles.length === 0;

                  return (
                    <div className="space-y-4">
                      {/* Meaning / Target */}
                      <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1 text-center sm:text-left">
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          Susun potongan kata menjadi kalimat berikut:
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-text-primary">
                          "{ex.promptMeaningId || ex.promptMeaningEn}"
                        </h4>
                      </div>

                      {/* Mode Switcher: Balok Kata vs Ketik Manual (IME) */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5">
                        <div className="inline-flex p-1 bg-surface-inset rounded-2xl border border-border-subtle shadow-inner gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click', soundEnabled);
                              setSakubunMode('tiles');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              sakubunMode === 'tiles'
                                ? 'bg-indigo-deep text-gold border border-border-subtle shadow-xs'
                                : 'text-text-muted hover:text-text-primary hover:bg-surface-card/40'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Pilih Balok Kata</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playSound('click', soundEnabled);
                              setSakubunMode('typing');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              sakubunMode === 'typing'
                                ? 'bg-indigo-deep text-gold border border-border-subtle shadow-xs'
                                : 'text-text-muted hover:text-text-primary hover:bg-surface-card/40'
                            }`}
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Ketik Manual</span>
                          </button>
                        </div>

                        <span className="text-[11px] font-mono text-text-muted hidden sm:inline-block">
                          {sakubunMode === 'typing' ? 'Ketik Romaji otomatis jadi Kana & Kanji' : 'Klik balok kata untuk menyusun kalimat'}
                        </span>
                      </div>

                      {/* MODE 1: PILIH BALOK KATA */}
                      {sakubunMode === 'tiles' && (
                        <div className="space-y-3 animate-fade-in">
                          {/* Drop / Placement Area */}
                          <div className="p-4 rounded-2xl bg-surface-inset border-2 border-dashed border-border-subtle min-h-[70px] flex flex-wrap items-center gap-2">
                            {sakubunPlacedTiles.length === 0 ? (
                              <span className="text-xs text-text-muted italic mx-auto">
                                Klik potongan kata di bawah untuk menyusun kalimat...
                              </span>
                            ) : (
                              sakubunPlacedTiles.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleRemoveTile(t)}
                                  className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold font-jp cursor-pointer transition-transform"
                                >
                                  {t.text}
                                </button>
                              ))
                            )}
                          </div>

                          {/* Available Tiles Bank */}
                          <div className="flex flex-wrap gap-2 justify-center">
                            {ex.availableTiles.map((t) => {
                              const used = sakubunPlacedTiles.some(p => p.id === t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  disabled={used}
                                  onClick={() => handleSelectTile(t)}
                                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold font-jp transition-transform ${
                                    used
                                      ? 'border border-dashed border-border-subtle text-transparent'
                                      : 'btn-physical-secondary cursor-pointer'
                                  }`}
                                >
                                  {t.text}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* MODE 2: KETIK MANUAL (IME) */}
                      {sakubunMode === 'typing' && (
                        <div className="space-y-3 animate-fade-in">
                          {/* Japanese IME Input with Live Romaji-Kana & Henkan */}
                          <JapaneseImeInput
                            value={sakubunTypedText}
                            onChange={(val) => {
                              setSakubunTypedText(val);
                              if (sakubunFeedback) setSakubunFeedback(null);
                            }}
                            onSubmit={handleCheckSakubun}
                            placeholder="Ketik kalimat di sini (contoh: terebi o miru -> テレビを見る)..."
                            contextWords={ex.availableTiles.map(t => t.text)}
                            soundEnabled={soundEnabled}
                            autoFocus
                          />

                          {/* Vocabulary Assistance Palette */}
                          <div className="p-3 rounded-2xl bg-surface-inset/60 border border-border-subtle/70 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted px-0.5">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-gold" />
                                <span>Potongan Kosakata Bantuan (klik untuk sisipkan):</span>
                              </span>
                              {sakubunTypedText && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playSound('click', soundEnabled);
                                    setSakubunTypedText('');
                                    if (sakubunFeedback) setSakubunFeedback(null);
                                  }}
                                  className="text-text-muted hover:text-rose-400 font-bold transition-colors cursor-pointer"
                                >
                                  Hapus Teks
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {ex.availableTiles.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    playSound('click', soundEnabled);
                                    setSakubunTypedText(prev => prev + t.text);
                                    if (sakubunFeedback) setSakubunFeedback(null);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-surface-card hover:bg-surface-elevated text-text-primary border border-border-subtle text-xs font-bold font-jp shadow-2xs hover:border-border-primary transition-all active:scale-95 cursor-pointer"
                                  title={`Sisipkan 「${t.text}」`}
                                >
                                  {t.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Feedback or Check Button */}
                      {sakubunFeedback ? (
                        <div className={`p-4 rounded-2xl border space-y-2 ${sakubunFeedback.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-heading">
                              {sakubunFeedback.isCorrect ? 'Jawaban Benar!' : 'Belum Tepat'}
                            </span>
                            {sakubunFeedback.isCorrect ? (
                              <button
                                type="button"
                                onClick={() => advanceToNextFloor(true, 30, 15)}
                                className="btn-physical-primary px-5 py-1.5 rounded-xl text-xs font-bold font-heading cursor-pointer"
                              >
                                Lantai Berikutnya →
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => advanceToNextFloor(false, 10, 5)}
                                className="btn-physical-secondary px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Lewati →
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary font-body">
                            {sakubunFeedback.detailedFeedback} {sakubunFeedback.pedagogicalAdvice}
                          </p>
                        </div>
                      ) : (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            disabled={isCheckDisabled}
                            onClick={handleCheckSakubun}
                            className="btn-skeuo-indigo px-8 py-2.5 disabled:opacity-40 text-xs transition-all cursor-pointer"
                          >
                            <span className="whitespace-nowrap">Periksa Kalimat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 4: CONJUGATION DUNGEON */}
              {config.type === 'conjugation' && payload.conjugationQuestions && (
                (() => {
                  const q = payload.conjugationQuestions[currentFloorIndex];
                  if (!q) return renderFallbackMissingItem();

                  const formId = q.targetForm?.id || '';
                  const formDisplay = getTargetFormDisplay(formId);
                  const baseMeaning = q.targetVerb?.meaningId || (q as any).meaning || '';
                  const conjugatedResultMeaning = getConjugatedMeaningId(baseMeaning, formId);

                  return (
                    <div className="space-y-4">
                      {/* Big Display: Kotoba + Tujuan Konjugasi */}
                      <div className="p-5 sm:p-6 rounded-3xl bg-surface-inset border border-border-subtle text-center space-y-2 shadow-inner">
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                            <h3 className="text-3xl sm:text-4xl font-black text-text-primary font-jp">
                              <RubyText
                                japanese={q.targetVerb?.kanji || (q as any).dictionaryWord || q.prompt}
                                reading={q.targetVerb?.reading || (q as any).reading || q.ruby}
                                showFurigana={true}
                                className="text-3xl sm:text-4xl font-black text-text-primary font-jp"
                              />
                            </h3>
                            <span className="text-text-muted font-mono text-xl sm:text-2xl font-bold select-none">＋</span>
                            <span className="text-gold font-jp font-black text-3xl sm:text-4xl drop-shadow-sm">
                              {formDisplay.suffix}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-gold/15 text-gold border border-border-subtle text-xs font-mono font-bold">
                              {formDisplay.badge}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const textToSpeak = q.targetVerb?.reading || q.targetVerb?.kanji || (q as any).dictionaryWord || '';
                              if (textToSpeak) speakJapanese(textToSpeak);
                            }}
                            className="btn-physical-secondary p-2 rounded-xl hover:text-gold transition-colors cursor-pointer shrink-0"
                            title="Dengarkan pelafalan kata dasar"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Terjemah kotoba dasar */}
                        {baseMeaning && (
                          <p className="text-xs sm:text-sm text-text-muted font-medium pt-1">
                            {baseMeaning}
                          </p>
                        )}
                      </div>

                      {/* 4 Choices */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctIndex;
                          const isSelected = selectedAnswerIndex === idx;

                          let style = 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-primary';
                          if (isAnswerChecked) {
                            if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold';
                            else if (isSelected) style = 'bg-rose-500/15 border-rose-500 text-rose-400';
                            else style = 'opacity-40 border-border-subtle';
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswerChecked}
                              onClick={() => {
                                setSelectedAnswerIndex(idx);
                                setIsAnswerChecked(true);
                                if (isCorrect) playSound('correct', soundEnabled);
                                else playSound('wrong', soundEnabled);
                              }}
                              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${style}`}
                            >
                              <span className="font-jp font-bold text-sm">
                                <RubyText
                                  japanese={opt}
                                  reading={q.optionsRuby?.[idx]}
                                  showFurigana={true}
                                  className="font-jp font-bold text-sm"
                                />
                              </span>
                              {isAnswerChecked && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                              {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation & Next Floor with Post-Answer Result Translation */}
                      {isAnswerChecked && (
                        <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 animate-fade-in">
                          {isSurvivalMode && isTimeUp && selectedAnswerIndex === -1 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 border-b border-rose-500/20 pb-2">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>Waktu Habis! Kamu tidak sempat memilih bentuk konjugasi di lantai ini.</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-jp font-bold text-sm sm:text-base text-emerald-400">
                                <RubyText
                                  japanese={q.options[q.correctIndex]}
                                  reading={q.optionsRuby?.[q.correctIndex]}
                                  showFurigana={true}
                                  className="font-jp font-bold text-sm sm:text-base text-emerald-400"
                                />
                              </span>
                              {conjugatedResultMeaning && (
                                <>
                                  <span className="text-xs text-text-muted select-none">➔</span>
                                  <span className="text-xs sm:text-sm font-bold text-emerald-300">
                                    "{conjugatedResultMeaning}"
                                  </span>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const textToSpeak = q.optionsRuby?.[q.correctIndex] || q.options[q.correctIndex] || '';
                                  if (textToSpeak) speakJapanese(textToSpeak);
                                }}
                                className="btn-physical-secondary p-1 rounded-lg hover:text-emerald-400 transition-colors shrink-0"
                                title="Dengarkan pelafalan hasil konjugasi"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => advanceToNextFloor(selectedAnswerIndex === q.correctIndex, 20, 10)}
                              className="btn-skeuo-indigo px-5 py-2 text-xs transition-all shrink-0 ml-auto"
                            >
                              <span className="whitespace-nowrap">Lantai Berikutnya →</span>
                            </button>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed border-t border-border-subtle/50 pt-2">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 5: QUIZ & KANJI EXTREME DUNGEON */}
              {(config.type === 'quiz' || config.type === 'extreme') && payload.quizQuestions && (
                (() => {
                  const q = payload.quizQuestions[currentFloorIndex];
                  if (!q) return renderFallbackMissingItem();

                  return (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                        <span className="text-[10px] text-text-muted font-mono uppercase">
                          {q.instruction || 'Pilihlah jawaban yang paling tepat:'}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-text-primary font-jp leading-relaxed">
                          <RubyText
                            japanese={q.prompt}
                            reading={q.ruby}
                            showFurigana={true}
                          />
                        </h3>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctIndex;
                          const isSelected = selectedAnswerIndex === idx;

                          let style = 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-primary';
                          if (isAnswerChecked) {
                            if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold';
                            else if (isSelected) style = 'bg-rose-500/15 border-rose-500 text-rose-400';
                            else style = 'opacity-40 border-border-subtle';
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswerChecked}
                              onClick={() => {
                                setSelectedAnswerIndex(idx);
                                setIsAnswerChecked(true);
                                if (isCorrect) playSound('correct', soundEnabled);
                                else playSound('wrong', soundEnabled);
                              }}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${style}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded bg-surface-card text-[10px] font-mono font-bold flex items-center justify-center border border-border-subtle shrink-0">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-xs sm:text-sm font-jp font-bold">
                                  <RubyText
                                    japanese={opt}
                                    reading={q.optionsRuby?.[idx]}
                                    showFurigana={true}
                                  />
                                </span>
                              </div>
                              {isAnswerChecked && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                              {isAnswerChecked && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation & Next Floor */}
                      {isAnswerChecked && (
                        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex flex-col gap-2 animate-fade-in">
                          {isSurvivalMode && isTimeUp && selectedAnswerIndex === -1 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 border-b border-rose-500/20 pb-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>Waktu Habis! Kamu tidak sempat memilih jawaban sebelum waktu habis.</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-text-secondary line-clamp-2">
                              {q.explanation}
                            </p>
                            <button
                              type="button"
                              onClick={() => advanceToNextFloor(selectedAnswerIndex === q.correctIndex, 15, 8)}
                              className="btn-skeuo-indigo px-5 py-2 text-xs transition-all shrink-0"
                            >
                              <span className="whitespace-nowrap">Lantai Berikutnya →</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 6: SENTENCE CREATION (KREASI KALIMAT) DUNGEON */}
              {config.type === 'sentence_creation' && payload.sentenceCreationItems && (
                (() => {
                  const item = payload.sentenceCreationItems[currentFloorIndex];
                  if (!item) return renderFallbackMissingItem();

                  const primaryInsert = getPrimaryPatternInsert(item);

                  // Build context words for IME candidates
                  const contextWords: string[] = [primaryInsert];
                  if (item.examples) {
                    item.examples.forEach(ex => {
                      const parts = ex.japanese.split(/[、。！？\s]+/);
                      parts.forEach(p => {
                        if (p.trim().length >= 2) contextWords.push(p.trim());
                      });
                    });
                  }

                  const handleInsertText = (textToInsert: string) => {
                    playSound('click', soundEnabled);
                    setCreationTypedText(prev => prev + textToInsert);
                    if (creationFeedback) setCreationFeedback(null);
                  };

                  return (
                    <div className="space-y-4">
                      {/* Top Header Card: Pattern Display, Formula, Meaning, Explanation */}
                      <div className="p-4 sm:p-5 rounded-3xl bg-surface-inset border border-border-subtle space-y-3 shadow-inner">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/15 text-violet-400 border border-border-subtle">
                                {item.level || config.levelCategory || 'Tata Bahasa'}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted uppercase">
                                Pola Target
                              </span>
                            </div>

                            {/* Large Pattern Name with Ruby Furigana */}
                            <div className="flex items-center gap-2 pt-0.5">
                              <h3 className="text-2xl sm:text-3xl font-black text-text-primary font-jp leading-tight">
                                <RubyText
                                  japanese={item.title}
                                  reading={item.reading}
                                  showFurigana={true}
                                  className="text-2xl sm:text-3xl font-black text-text-primary font-jp"
                                />
                              </h3>
                              <button
                                type="button"
                                onClick={() => speakJapanese(primaryInsert || item.title)}
                                className="btn-physical-secondary p-1.5 rounded-xl hover:text-gold transition-colors cursor-pointer shrink-0"
                                title="Dengarkan pelafalan pola"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Insert Pattern Chip in Header */}
                          <button
                            type="button"
                            onClick={() => handleInsertText(primaryInsert)}
                            className="btn-physical-secondary px-3 py-1.5 rounded-xl text-violet-800 dark:text-violet-300 text-xs font-bold font-jp transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            title="Sisipkan pola ini ke kolom tulis"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Sisipkan 「{primaryInsert}」</span>
                          </button>
                        </div>

                        {/* Formula Badge / Rumus */}
                        {item.formula && (
                          <div className="p-2.5 rounded-2xl bg-surface-card border border-border-subtle flex items-center gap-2 text-xs font-mono text-text-primary overflow-x-auto">
                            <span className="px-1.5 py-0.5 rounded bg-surface-inset text-amber-800 dark:text-gold font-bold text-[10px] shrink-0">
                              Rumus
                            </span>
                            <span className="text-text-secondary font-medium whitespace-nowrap sm:whitespace-normal font-jp">
                              {item.formula}
                            </span>
                          </div>
                        )}

                        {/* Meaning (Arti Indonesia) */}
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono text-text-secondary uppercase font-semibold">
                            Arti Pola:
                          </div>
                          <div className="text-sm sm:text-base font-bold text-text-primary">
                            "{item.meaningId || item.meaningEn}"
                          </div>
                        </div>

                        {/* Explanation (Penjelasan Kaidah & Nuansa) */}
                        {item.explanation && (
                          <div className="text-xs text-text-secondary leading-relaxed border-t border-border-subtle/60 pt-2 font-body">
                            <span className="font-bold text-text-primary">Penjelasan: </span>
                            {item.explanation}
                          </div>
                        )}

                        {/* Collapsible Authentic Examples Accordion */}
                        {item.examples && item.examples.length > 0 && (
                          <div className="border-t border-border-subtle/60 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                playSound('click', soundEnabled);
                                setShowCreationExamples(prev => !prev);
                              }}
                              className="flex items-center justify-between w-full text-xs font-heading font-bold text-text-secondary hover:text-gold transition-colors py-1 cursor-pointer"
                            >
                              <span className="flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-700 dark:text-gold" />
                                <span>{showCreationExamples ? 'Sembunyikan Contoh Kalimat' : 'Lihat Contoh Kalimat Bantuan'}</span>
                                <span className="text-[10px] font-mono text-text-muted">({item.examples.length})</span>
                              </span>
                              {showCreationExamples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <AnimatePresence>
                              {showCreationExamples && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-2 pt-2 overflow-hidden"
                                >
                                  {item.examples.slice(0, 2).map((ex, exIdx) => (
                                    <div
                                      key={exIdx}
                                      className="p-3 rounded-2xl bg-surface-card border border-border-subtle space-y-1 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold font-jp text-text-primary text-sm">
                                          <RubyText
                                            japanese={ex.japanese}
                                            reading={ex.reading}
                                            showFurigana={true}
                                            className="font-bold font-jp text-text-primary text-sm"
                                          />
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => speakJapanese(ex.reading || ex.japanese)}
                                          className="btn-physical-secondary p-1 rounded-lg hover:text-gold transition-colors shrink-0"
                                          title="Dengarkan pelafalan contoh"
                                        >
                                          <Volume2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      {ex.meaningId && (
                                        <div className="text-text-secondary font-medium italic text-[11px]">
                                          {ex.meaningId}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Writing Area: Japanese IME Input & Quick Chips */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="font-heading font-bold text-text-primary flex items-center gap-1.5">
                            <ScrollText className="w-4 h-4 text-violet-400" />
                            <span>Tulis Kalimat Bahasa Jepangmu:</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-text-muted">
                              {creationTypedText.length} karakter
                            </span>
                            {creationTypedText && (
                              <button
                                type="button"
                                onClick={() => {
                                  playSound('click', soundEnabled);
                                  setCreationTypedText('');
                                  if (creationFeedback) setCreationFeedback(null);
                                }}
                                className="text-[11px] font-bold text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Japanese IME Input Field */}
                        <JapaneseImeInput
                          value={creationTypedText}
                          onChange={(val) => {
                            setCreationTypedText(val);
                            if (creationFeedback) setCreationFeedback(null);
                          }}
                          onSubmit={() => handleCheckCreation(item)}
                          placeholder={`Ketik kalimat lengkap yang memuat 「${primaryInsert}」...`}
                          contextWords={contextWords}
                          soundEnabled={soundEnabled}
                          autoFocus
                        />

                        {/* Vocabulary Assist Palette */}
                        {item.examples && item.examples.length > 0 && (
                          <div className="p-2.5 rounded-2xl bg-surface-inset/70 border border-border-subtle/80 space-y-1.5">
                            <div className="text-[10px] font-mono text-text-muted px-0.5 flex items-center justify-between">
                              <span>Kata Bantuan (klik untuk menyisipkan):</span>
                              <span className="text-[9px] text-text-muted hidden sm:inline">Romaji otomatis terkonversi ke Kana/Kanji</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleInsertText(primaryInsert)}
                                className="px-2.5 py-1 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-border-subtle text-xs font-bold font-jp shadow-2xs transition-all active:scale-95 cursor-pointer"
                              >
                                ＋ {primaryInsert}
                              </button>
                              {item.examples[0]?.japanese.split(/[、。！？\s]+/).filter(w => w.length >= 2).slice(0, 5).map((w, wIdx) => (
                                <button
                                  key={wIdx}
                                  type="button"
                                  onClick={() => handleInsertText(w)}
                                  className="px-2 py-1 rounded-xl bg-surface-card hover:bg-surface-elevated text-text-primary border border-border-subtle text-xs font-jp font-medium shadow-2xs hover:border-border-primary transition-all active:scale-95 cursor-pointer"
                                >
                                  {w}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Validation Feedback & Floor Progression */}
                      {creationFeedback ? (
                        <div
                          className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${
                            creationFeedback.isValid
                              ? 'bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-rose-500/10 border-rose-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {creationFeedback.isValid ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                              )}
                              <span className={`text-xs sm:text-sm font-bold font-heading ${creationFeedback.isValid ? 'text-emerald-300' : 'text-rose-300'}`}>
                                {creationFeedback.message}
                              </span>
                            </div>

                            {/* Floor Progression Buttons */}
                            <div className="flex items-center gap-2 ml-auto">
                              {creationFeedback.isValid ? (
                                <button
                                  type="button"
                                  onClick={() => advanceToNextFloor(true, 35, 18)}
                                  className="btn-skeuo-indigo px-5 py-2 text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>{currentFloorIndex + 1 >= totalFloors ? 'Selesaikan Dungeon 🏆' : 'Lantai Berikutnya →'}</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setCreationFeedback(null)}
                                    className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                                  >
                                    Coba Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => advanceToNextFloor(false, 10, 5)}
                                    className="btn-physical-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                                    title="Lewati lantai ini dengan skor percobaan"
                                  >
                                    Lewati →
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Read User's sentence back to them via TTS */}
                          {creationFeedback.isValid && (
                            <div className="p-3 rounded-2xl bg-surface-card/80 border border-border-subtle flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-mono text-emerald-400/80 font-bold uppercase">
                                  Kalimat Kreasimu:
                                </div>
                                <div className="text-base font-black font-jp text-text-primary">
                                  {creationTypedText}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => speakJapanese(creationTypedText)}
                                className="btn-physical-secondary p-2.5 rounded-xl text-emerald-300 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                                title="Dengarkan pelafalan kalimat kreasimu"
                              >
                                <Volume2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Dengarkan</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Check Button */
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            disabled={creationTypedText.trim().length === 0}
                            onClick={() => handleCheckCreation(item)}
                            className="btn-skeuo-indigo px-8 py-2.5 disabled:opacity-40 text-xs transition-all cursor-pointer flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            <span className="whitespace-nowrap font-heading font-bold">Periksa Kalimat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* TYPE 7: BLACKBOARD PATTERN PLAYGROUND */}
              {config.type === 'blackboard' && payload.blackboardVerbs && (
                <BlackboardPlaygroundModule
                  verbs={payload.blackboardVerbs}
                  patterns={payload.blackboardPatterns}
                  levelCategory={config.levelCategory}
                  soundEnabled={soundEnabled}
                  userDecks={userDecks}
                  onSaveToDeck={(verb) => {
                    if (onUpdateDecks) {
                      const res = toggleBookmarkItem(userDecks, verb.id || verb.kanji, 'kotoba');
                      onUpdateDecks(res.userDecks);
                    }
                  }}
                  onFinishSession={(exploredCount) => {
                    advanceToNextFloor(true, Math.max(20, exploredCount * 15), Math.max(10, exploredCount * 8));
                  }}
                />
              )}

            </div>
          )}

        </div>
      </div>
    </motion.div>,
    document.body
  );
};
