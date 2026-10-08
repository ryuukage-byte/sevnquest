import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  Zap, 
  RotateCcw, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Flame, 
  ChevronRight, 
  Layers, 
  Award,
  Volume2,
  Swords
} from 'lucide-react';
import { RubyText } from '../learning/RubyText';
import { 
  ConjugationDrillQuestion, 
  generateConjugationQuestion, 
  getTargetFormDisplay, 
  getConjugatedMeaningId 
} from '../../data/conjugationRules';
import { playSound, speakJapanese } from '../../utils/audio';
import { RPG_TIERS } from '../../data/rpg/tiers';
import { UserDeck } from '../../types/rpg';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { 
  getVerbsForBook, 
  getVerbsForLevel, 
  getConjugationFormsForLevel 
} from '../../utils/arcadeSourceUtils';
import { ArcadeSourceSelector, LevelOption } from './ArcadeSourceSelector';

interface ConjugationSpeedRushModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  playerLevel?: number;
  playerTierIndex?: number;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

type LevelFilter = 'ALL' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

interface ClearedConjugationRecord {
  verb: string;
  reading: string;
  suffix: string;
  badge: string;
  result: string;
  resultRuby?: string;
  meaning: string;
}

const LEVEL_OPTIONS: LevelOption<LevelFilter>[] = [
  { id: 'ALL', label: 'Semua Level', desc: 'Campuran N5 hingga N1' },
  { id: 'N5', label: 'JLPT N5', desc: 'Bentuk Te, Ta, Nai, Masu dasar' },
  { id: 'N4', label: 'JLPT N4', desc: 'Bentuk Potensial, Maksud, Tara' },
  { id: 'N3', label: 'JLPT N3', desc: 'Bentuk Pasif, Kausatif, Ba' },
  { id: 'N2', label: 'JLPT N2', desc: 'Kausatif-Pasif & Ragam Mahir' },
  { id: 'N1', label: 'JLPT N1', desc: 'Variasi Konjugasi Kompleks & Ahli' }
];

export const ConjugationSpeedRushModal: React.FC<ConjugationSpeedRushModalProps> = ({
  isOpen,
  onClose,
  soundEnabled = true,
  userDecks = [],
  playerLevel = 1,
  playerTierIndex = 0,
  onRewardPlayer,
  onCompleteStudyItem,
}) => {
  const [sourceType, setSourceType] = useState<'LEVEL' | 'TEMPLATE_BOOK'>('LEVEL');
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>('N5');
  const [selectedBookId, setSelectedBookId] = useState<string>('book_minna_n5');
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');

  // Timer: 60 seconds
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [clearedList, setClearedList] = useState<ClearedConjugationRecord[]>([]);

  // Current question & interaction state
  const [currentQuestion, setCurrentQuestion] = useState<ConjugationDrillQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [scoreFeedback, setScoreFeedback] = useState<{
    type: 'plus' | 'minus';
    amount: number;
    multiplier: number;
    id: number;
  } | null>(null);

  // Active level option
  const currentLevelOption = useMemo(() => {
    return LEVEL_OPTIONS.find(opt => opt.id === selectedLevel) || LEVEL_OPTIONS[0];
  }, [selectedLevel]);

  // Active Source Label (for cards, summaries, and retries)
  const activeSourceLabel = useMemo(() => {
    if (sourceType === 'TEMPLATE_BOOK') {
      const b = OFFICIAL_BOOKS.find(book => book.id === selectedBookId);
      return b ? b.title : 'Rak Buku Template';
    }
    return currentLevelOption.label;
  }, [sourceType, selectedBookId, currentLevelOption]);

  // Generate next fresh question based on active source
  const getNextQuestion = useCallback((): ConjugationDrillQuestion | null => {
    try {
      let verbs = [];
      let allowedForms = [];

      if (sourceType === 'TEMPLATE_BOOK') {
        verbs = getVerbsForBook(selectedBookId);
        const b = OFFICIAL_BOOKS.find(book => book.id === selectedBookId);
        const bookLevel = b?.level === 'TEMATIK' || b?.level === 'KANA' || b?.level === 'Kaigo' ? 'N5' : (b?.level || 'N5');
        allowedForms = getConjugationFormsForLevel(bookLevel);
      } else {
        verbs = getVerbsForLevel(selectedLevel);
        allowedForms = getConjugationFormsForLevel(selectedLevel);
      }

      if (!verbs || verbs.length === 0) return null;

      const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
      const randomForm = allowedForms[Math.floor(Math.random() * allowedForms.length)];
      return generateConjugationQuestion(randomForm, randomVerb, allowedForms);
    } catch (err) {
      console.error('Failed to generate arcade conjugation question:', err);
      return null;
    }
  }, [sourceType, selectedBookId, selectedLevel]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setGameState('ready');
      setTimeLeft(60);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setWrongCount(0);
      setClearedList([]);
      setCurrentQuestion(null);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setScoreFeedback(null);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    playSound('click', soundEnabled);
    setGameState('ready');
    setTimeLeft(60);
    setClearedList([]);
    setCurrentQuestion(null);
    onClose();
  }, [soundEnabled, onClose]);

  // Start new game
  const handleStartGame = () => {
    playSound('attack', soundEnabled);
    const firstQ = getNextQuestion();
    setCurrentQuestion(firstQ);
    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setClearedList([]);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScoreFeedback(null);
    setGameState('playing');
  };

  // Timer countdown: 60s
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('finished');
          playSound('fanfare', soundEnabled);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, soundEnabled]);

  // Handle game finish rewards
  useEffect(() => {
    if (gameState === 'finished' && correctCount > 0) {
      const expReward = Math.max(30, correctCount * 30 + maxCombo * 10);
      const goldReward = Math.max(20, correctCount * 25 + Math.floor(score / 50));
      if (onCompleteStudyItem) {
        onCompleteStudyItem(
          'bunpou',
          expReward,
          goldReward,
          undefined,
          correctCount,
          correctCount + wrongCount
        );
      } else {
        onRewardPlayer?.(expReward, goldReward);
      }
    }
  }, [gameState]);

  // Answer handler
  const handleAnswer = (optionIdx: number) => {
    if (!currentQuestion || selectedOption !== null || isAnswerChecked) return;

    setSelectedOption(optionIdx);
    setIsAnswerChecked(true);

    const isCorrect = optionIdx === currentQuestion.correctIndex;
    const formDisplay = getTargetFormDisplay(currentQuestion.targetForm.id);

    if (isCorrect) {
      playSound('correct', soundEnabled);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));

      const multiplier = 1 + Math.min(newCombo * 0.1, 1.5);
      const points = Math.round(100 * multiplier);

      setScore(prev => prev + points);
      setCorrectCount(prev => prev + 1);

      setScoreFeedback({
        type: 'plus',
        amount: points,
        multiplier,
        id: Date.now()
      });

      // Record cleared item
      setClearedList(prev => [
        ...prev,
        {
          verb: currentQuestion.targetVerb.kanji,
          reading: currentQuestion.targetVerb.reading,
          suffix: formDisplay.suffix,
          badge: formDisplay.badge,
          result: currentQuestion.options[currentQuestion.correctIndex],
          resultRuby: currentQuestion.optionsRuby?.[currentQuestion.correctIndex],
          meaning: currentQuestion.targetVerb.meaningId
        }
      ]);

      // Quick advance to next question
      setTimeout(() => {
        const nextQ = getNextQuestion();
        setCurrentQuestion(nextQ);
        setSelectedOption(null);
        setIsAnswerChecked(false);
      }, 250);
    } else {
      playSound('wrong', soundEnabled);
      setCombo(0);
      setWrongCount(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 50));

      setScoreFeedback({
        type: 'minus',
        amount: 50,
        multiplier: 1,
        id: Date.now()
      });

      // Show correct answer briefly then advance
      setTimeout(() => {
        const nextQ = getNextQuestion();
        setCurrentQuestion(nextQ);
        setSelectedOption(null);
        setIsAnswerChecked(false);
      }, 550);
    }
  };

  // Keyboard shortcut listener: ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Rank and Title calculations
  const totalAnswered = correctCount + wrongCount;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const rankInfo = useMemo(() => {
    if (correctCount >= 15) return { rank: 'SSS', title: 'Dewa Konjugasi', color: 'text-amber-300 border-border-subtle bg-amber-500/10' };
    if (correctCount >= 12) return { rank: 'SS', title: 'Master Infleksi', color: 'text-rose-400 border-rose-500 bg-rose-500/10' };
    if (correctCount >= 9) return { rank: 'S', title: 'Pendekar Bentuk Kata', color: 'text-purple-400 border-border-subtle bg-purple-500/10' };
    if (correctCount >= 6) return { rank: 'A', title: 'Murid Berbakat', color: 'text-teal border-border-subtle bg-teal/10' };
    if (correctCount >= 3) return { rank: 'B', title: 'Pelajar Rajin', color: 'text-blue-400 border-border-subtle bg-blue-500/10' };
    return { rank: 'C', title: 'Langkah Awal', color: 'text-stone-400 border-stone-500 bg-stone-500/10' };
  }, [correctCount]);

  if (!isOpen) return null;

  const activeFormDisplay = currentQuestion ? getTargetFormDisplay(currentQuestion.targetForm.id) : null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 animate-fade-in overflow-hidden">
      {/* Dark backdrop click dismiss on desktop */}
      <div 
        className="fixed inset-0" 
        onClick={handleClose}
        aria-hidden="true" 
      />

      <div className="relative z-10 w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-xl bg-surface-card border-0 sm:border border-border-subtle rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* TOP MODAL BAR */}
        <div className="flex items-center justify-between p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-5 border-b border-border-subtle bg-surface-inset/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary shadow-inner">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
                  Arena Arcade
                </span>
                <span className="text-[10px] text-text-muted font-mono">• 60 Detik Sprint</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading">
                Altar Konjugasi Kilat
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="btn-physical-secondary w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer p-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. STATE: READY (LOBBY / SOURCE SELECTOR) */}
        {gameState === 'ready' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto overscroll-contain custom-scrollbar">
              {/* Hero Banner */}
              <div className="text-center space-y-2 py-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  REFLEKS PERUBAHAN BENTUK KATA · 60 DETIK
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
                  Berapa Konjugasi Bisa Kamu Selesaikan Dalam 1 Menit?
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  Ubah kata kerja ke bentuk target (Bentuk -Te, -Ta, -Nai, Potensial, dsb) secepat kilat! Kumpulkan combo streak tertinggi dan raih gelar Master Konjugasi!
                </p>
              </div>

              {/* Unified Source & Bookshelf Selector */}
              <ArcadeSourceSelector<LevelFilter>
                sourceType={sourceType}
                onSourceTypeChange={setSourceType}
                selectedLevel={selectedLevel}
                onSelectLevel={setSelectedLevel}
                selectedBookId={selectedBookId}
                onSelectBookId={setSelectedBookId}
                levelOptions={LEVEL_OPTIONS}
                mode="conjugation"
                challengeDurationText="60.0s Bersih"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Sticky Bottom CTA */}
            <div className="p-4 sm:p-5 border-t border-border-subtle bg-surface-inset/80 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
              <button
                type="button"
                onClick={handleStartGame}
                className="w-full btn-physical-primary py-3.5 rounded-2xl text-sm font-bold font-heading flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                <span>Mulai Uji Konjugasi (60 Detik)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. STATE: PLAYING */}
        {gameState === 'playing' && currentQuestion && activeFormDisplay && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Top Status Bar (Timer, Streak & Score) */}
            <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-border-subtle bg-surface-card flex items-center justify-between gap-3 shrink-0">
              {/* Timer with color shift */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-bold text-xs sm:text-sm border transition-all ${
                  timeLeft <= 10 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse' 
                    : 'bg-surface-inset text-text-primary border-border-subtle'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${timeLeft <= 10 ? 'text-rose-400' : 'text-gold'}`} />
                  <span>{timeLeft}s</span>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-surface-inset border border-border-subtle text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{correctCount} Selesai</span>
                </div>
              </div>

              {/* Combo & Score */}
              <div className="flex items-center gap-2">
                {combo > 1 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-400 border border-border-subtle text-xs font-mono font-bold animate-bounce">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{combo}x Combo</span>
                  </span>
                )}
                <div className="text-right">
                  <span className="text-[10px] text-text-muted font-mono block">SKOR</span>
                  <span className="text-sm font-bold font-mono text-gold leading-none">{score}</span>
                </div>
              </div>
            </div>

            {/* Time progress bar */}
            <div className="w-full h-1 bg-surface-inset">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 10 ? 'bg-rose-500' : 'bg-gold'
                }`}
                style={{ width: `${(timeLeft / 60) * 100}%` }}
              />
            </div>

            {/* Interactive Question Card */}
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
              {/* Score Feedback popup — slot tetap supaya kartu soal tidak bergeser saat poin muncul */}
              <div className="relative h-7 -mb-2 sm:-mb-3 flex items-center justify-center shrink-0 pointer-events-none">
                <AnimatePresence>
                  {scoreFeedback && (
                    <motion.span
                      key={scoreFeedback.id}
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className={`absolute inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border shadow-sm whitespace-nowrap bg-surface-card ${
                        scoreFeedback.type === 'plus'
                          ? 'text-emerald-600 border-emerald-500/50'
                          : 'text-rose-600 border-rose-500/50'
                      }`}
                    >
                      {scoreFeedback.type === 'plus' ? `+${scoreFeedback.amount} PTS` : `-${scoreFeedback.amount} PTS`}
                      {scoreFeedback.multiplier > 1 && (
                        <span className="opacity-70 font-bold">{scoreFeedback.multiplier.toFixed(1)}x</span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Big Display: Kotoba Dasar + Tujuan Konjugasi (Persis Altar Konjugasi) */}
              <div className="p-5 sm:p-7 rounded-3xl bg-surface-inset border border-border-subtle text-center space-y-3 shadow-inner">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                    {/* Furigana on Verb */}
                    <h3 className="text-3xl sm:text-4xl font-black text-text-primary font-jp">
                      <RubyText
                        japanese={currentQuestion.targetVerb.kanji}
                        reading={currentQuestion.targetVerb.reading}
                        showFurigana={true}
                        className="text-3xl sm:text-4xl font-black text-text-primary font-jp"
                      />
                    </h3>
                    <span className="text-text-muted font-mono text-xl sm:text-2xl font-bold select-none">＋</span>
                    <span className="text-gold font-jp font-black text-3xl sm:text-4xl drop-shadow-sm">
                      {activeFormDisplay.suffix}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-gold/15 text-gold border border-border-subtle text-xs font-mono font-bold">
                      {activeFormDisplay.badge}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const textToSpeak = currentQuestion.targetVerb.reading || currentQuestion.targetVerb.kanji;
                      if (textToSpeak) speakJapanese(textToSpeak);
                    }}
                    className="btn-physical-secondary p-2 rounded-xl hover:text-gold transition-colors cursor-pointer shrink-0"
                    title="Dengarkan pelafalan kata dasar"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Indonesian Meaning of base verb */}
                {currentQuestion.targetVerb.meaningId && (
                  <p className="text-xs sm:text-sm text-text-muted font-medium pt-0.5">
                    {currentQuestion.targetVerb.meaningId}
                  </p>
                )}
              </div>

              {/* 4 Choices in 2x2 Grid (Persis Altar Konjugasi) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const isCorrect = idx === currentQuestion.correctIndex;
                  const isSelected = selectedOption === idx;

                  let btnStyle = 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-primary hover:border-border-primary/60';
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500/40';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-500/15 border-rose-500 text-rose-400 ring-1 ring-rose-500/40';
                    } else {
                      btnStyle = 'opacity-35 border-border-subtle';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedOption !== null}
                      onClick={() => handleAnswer(idx)}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer shadow-inner ${btnStyle}`}
                    >
                      <span className="font-jp font-bold text-sm sm:text-base">
                        <RubyText
                          japanese={opt}
                          reading={currentQuestion.optionsRuby?.[idx]}
                          showFurigana={true}
                          className="font-jp font-bold text-sm sm:text-base"
                        />
                      </span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                      {selectedOption !== null && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. STATE: FINISHED (ACHIEVEMENT SUMMARY SCREEN - PERSIS KANJI SPEED RUSH) */}
        {gameState === 'finished' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
              
              {/* Header Trophy Banner */}
              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-border-subtle text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block pt-1">
                  Waktu Habis! · Tantangan Selesai
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
                  Hasil Altar Konjugasi Kilat
                </h3>
              </div>

              {/* Achievement & Rank Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-surface-inset border border-border-subtle space-y-4 shadow-inner">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono text-text-muted block">Total Konjugasi Selesai</span>
                    <div className="text-3xl sm:text-4xl font-black font-heading text-text-primary">
                      {correctCount}
                      <span className="text-sm font-normal text-text-muted ml-1.5 font-body">soal berhasil</span>
                    </div>
                  </div>

                  {/* Rank Badge */}
                  <div className={`px-4 py-3 rounded-2xl border text-center ${rankInfo.color} shadow-sm shrink-0`}>
                    <div className="text-2xl font-black font-mono tracking-wider">
                      {rankInfo.rank}
                    </div>
                    <div className="text-[11px] font-bold font-heading whitespace-nowrap mt-0.5">
                      {rankInfo.title}
                    </div>
                  </div>
                </div>

                {/* Detailed Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border-subtle/60 text-center">
                  <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                    <span className="text-[10px] text-text-muted font-mono block">Akurasi</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-text-primary">{accuracy}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                    <span className="text-[10px] text-text-muted font-mono block">Max Combo</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-amber-400">{maxCombo}x</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                    <span className="text-[10px] text-text-muted font-mono block">Total Skor</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-gold">{score} PTS</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle">
                    <span className="text-[10px] text-text-muted font-mono block">Salah</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-rose-400">{wrongCount}</span>
                  </div>
                </div>
              </div>

              {/* Source/Difficulty Badge */}
              <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Sumber / Tingkat:</span>
                <span className="text-text-primary font-bold font-mono text-sm truncate max-w-[240px]">
                  {activeSourceLabel}
                </span>
              </div>

              {/* List of Verified Conjugations (Persis Koleksi Kanji Terverifikasi) */}
              {clearedList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-text-muted block">
                    Koleksi Konjugasi Terverifikasi ({clearedList.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                    {clearedList.map((item, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-xs font-mono font-bold text-text-primary flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="text-text-secondary font-jp">{item.verb}</span>
                        <span className="text-text-muted text-[10px]">➔</span>
                        <span className="text-gold font-jp">{item.result}</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-gold/15 text-gold text-[9px] font-mono">
                          {item.badge}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Footer Tag */}
              <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>Nihongo Quest · Altar Konjugasi</span>
                <span>Mode Arkade 60s</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-border-subtle bg-surface-inset/80 shrink-0 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="flex-1 btn-physical-primary py-3 rounded-2xl text-xs sm:text-sm font-bold font-heading flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="truncate">Main Lagi ({activeSourceLabel})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    setGameState('ready');
                  }}
                  className="flex-1 btn-physical-secondary py-3 rounded-2xl text-xs sm:text-sm font-bold font-heading flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>Pilih Level Lain</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full btn btn-secondary py-2.5 rounded-xl text-xs font-heading cursor-pointer text-text-secondary hover:text-text-primary"
              >
                Kembali ke Arena
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
