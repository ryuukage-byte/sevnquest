import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  RotateCcw, 
  Trophy, 
  CheckCircle2, 
  XCircle,
  Volume2,
  ChevronRight,
  Layers,
  Zap,
  Flame,
  Award,
  ShieldAlert
} from 'lucide-react';
import { KOTOBA_DATABASE as kotobaDb } from '../../data/kotoba';
import { playSound, speakJapanese } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { getKotobaPoolForBook } from '../../utils/arcadeSourceUtils';
import { ArcadeSourceSelector } from './ArcadeSourceSelector';
import { calcEngineExp, getKotobaBaseExp } from '../../utils/rewards';

interface KotobaGuessModalProps {
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

interface GuessWord {
  id: string;
  word: string;
  reading: string;
  correctMeaning: string;
  options: string[];
  correctIndex: number;
}

const LEVEL_OPTIONS: { id: LevelFilter; label: string; desc: string }[] = [
  { id: 'ALL', label: 'Semua Level', desc: 'Campuran N5 hingga N1' },
  { id: 'N5', label: 'JLPT N5', desc: 'Kosakata dasar' },
  { id: 'N4', label: 'JLPT N4', desc: 'Kosakata pra-menengah' },
  { id: 'N3', label: 'JLPT N3', desc: 'Kosakata menengah' },
  { id: 'N2', label: 'JLPT N2', desc: 'Kosakata mahir' },
  { id: 'N1', label: 'JLPT N1', desc: 'Kosakata ahli' }
];

const rawKotobaList = Object.values(kotobaDb as Record<string, any>);

export const KotobaGuessModal: React.FC<KotobaGuessModalProps> = ({
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
  const [selectedBookId, setSelectedBookId] = useState<string>('book_theme_body');
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  
  // Timer: 45 seconds sprint
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [wrongStreak, setWrongStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [scoreFeedback, setScoreFeedback] = useState<{
    type: 'plus' | 'minus';
    amount: number;
    multiplier: number;
    streak: number;
    id: number;
  } | null>(null);

  // Current Word
  const [currentWord, setCurrentWord] = useState<GuessWord | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);

  // Active Level Option
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

  // Filter pool
  const filteredPool = useMemo(() => {
    if (sourceType === 'TEMPLATE_BOOK') {
      const pool = getKotobaPoolForBook(selectedBookId);
      return pool.length > 0 ? pool : rawKotobaList.filter(k => k.jlpt === 'N5');
    }
    if (selectedLevel === 'ALL') {
      return rawKotobaList;
    }
    return rawKotobaList.filter(k => k.jlpt === selectedLevel || k.level === selectedLevel);
  }, [sourceType, selectedBookId, selectedLevel]);

  // Generate word question
  const generateWord = useCallback((): GuessWord | null => {
    if (!filteredPool || filteredPool.length < 4) return null;

    const randomIndex = Math.floor(Math.random() * filteredPool.length);
    const target = filteredPool[randomIndex];
    const correctMeaning = target.meaningId || target.meaningEn || 'Arti';

    const distractors: string[] = [];
    const used = new Set<number>([randomIndex]);
    while (distractors.length < 3 && distractors.length < filteredPool.length - 1) {
      const idx = Math.floor(Math.random() * filteredPool.length);
      if (!used.has(idx)) {
        used.add(idx);
        distractors.push(filteredPool[idx].meaningId || filteredPool[idx].meaningEn || 'Lainnya');
      }
    }

    const options = [correctMeaning, ...distractors].sort(() => Math.random() - 0.5);

    return {
      id: target.id || `kt_${Date.now()}`,
      word: target.word,
      reading: target.reading || target.word,
      correctMeaning,
      options,
      correctIndex: options.indexOf(correctMeaning)
    };
  }, [filteredPool]);

  // Reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setGameState('ready');
      setTimeLeft(45);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setWrongStreak(0);
      setCorrectCount(0);
      setWrongCount(0);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setScoreFeedback(null);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    playSound('click', soundEnabled);
    setGameState('ready');
    setTimeLeft(45);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWrongStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setScoreFeedback(null);
    onClose();
  }, [soundEnabled, onClose]);

  // Start game
  const handleStartGame = () => {
    playSound('attack', soundEnabled);
    setTimeLeft(45);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWrongStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setScoreFeedback(null);

    const w = generateWord();
    setCurrentWord(w);
    setGameState('playing');
  };

  // Timer Effect
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

  // Handle choice with dynamic combo bonus & negative streak penalty
  const handleSelectOption = (idx: number) => {
    if (isAnswerRevealed || !currentWord) return;

    setSelectedOption(idx);
    setIsAnswerRevealed(true);

    const isCorrect = idx === currentWord.correctIndex;

    if (isCorrect) {
      playSound('correct', soundEnabled);
      setWrongStreak(0);
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);
      setCorrectCount(prev => prev + 1);

      // Multiplier plus bertambah jika benar beruntun (hingga 3.5x)
      const comboMultiplier = Math.min(3.5, 1 + (newCombo - 1) * 0.25);
      const pts = Math.round(100 * comboMultiplier);
      setScore(prev => prev + pts);

      setScoreFeedback({
        type: 'plus',
        amount: pts,
        multiplier: Number(comboMultiplier.toFixed(2)),
        streak: newCombo,
        id: Date.now(),
      });

      // Rewards
      const expGain = Math.max(1, calcEngineExp(getKotobaBaseExp(currentWord), 'arcade'));
      const goldGain = 5;
      // Satu jalur reward saja (lihat catatan di SuddenDeathStreakModal).
      if (onCompleteStudyItem) {
        onCompleteStudyItem('kotoba', expGain, goldGain, currentWord.id, 1, 1);
      } else {
        onRewardPlayer?.(expGain, goldGain);
      }

      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswerRevealed(false);
        const next = generateWord();
        setCurrentWord(next);
      }, 450);
    } else {
      playSound('wrong', soundEnabled);
      setCombo(0);
      const newWrongStreak = wrongStreak + 1;
      setWrongStreak(newWrongStreak);
      setWrongCount(prev => prev + 1);

      // Poin pengurangan: multiplier minus bertambah jika salah beruntun (hingga -3.0x)
      const penaltyMultiplier = Math.min(3.0, 1 + (newWrongStreak - 1) * 0.5);
      const penaltyPts = Math.round(50 * penaltyMultiplier);
      setScore(prev => Math.max(0, prev - penaltyPts));

      setScoreFeedback({
        type: 'minus',
        amount: penaltyPts,
        multiplier: Number(penaltyMultiplier.toFixed(1)),
        streak: newWrongStreak,
        id: Date.now(),
      });

      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswerRevealed(false);
        const next = generateWord();
        setCurrentWord(next);
      }, 650);
    }
  };

  // Body scroll lock & Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const totalAnswered = correctCount + wrongCount;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  // Rank Info (Tuned for penalized scoring)
  const rankInfo = useMemo(() => {
    if (score >= 2500) return { rank: 'SSS', title: 'Radar Vocab Dewa', color: 'text-amber-800 dark:text-amber-300 border-border-subtle bg-amber-500/10' };
    if (score >= 1800) return { rank: 'SS', title: 'Sprint Master', color: 'text-red-700 dark:text-rose-400 border-red-700/40 dark:border-rose-500 bg-red-700/10 dark:bg-rose-500/10' };
    if (score >= 1200) return { rank: 'S', title: 'Jawara Kosakata', color: 'text-purple-700 dark:text-purple-400 border-border-subtle bg-purple-500/10' };
    if (score >= 700) return { rank: 'A', title: 'Kilat Tanggap', color: 'text-emerald-800 dark:text-emerald-400 border-emerald-800/40 dark:border-emerald-500 bg-emerald-500/10' };
    if (score >= 350) return { rank: 'B', title: 'Pelari Rajin', color: 'text-blue-700 dark:text-blue-400 border-border-subtle bg-blue-500/10' };
    return { rank: 'C', title: 'Pemanasan', color: 'text-text-muted border-border-subtle bg-surface-inset' };
  }, [score]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 animate-fade-in overflow-hidden">
      {/* Dark backdrop click dismiss on desktop */}
      <div 
        className="fixed inset-0" 
        onClick={handleClose}
        aria-hidden="true" 
      />

      <div className="relative z-10 w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-surface-card border-0 sm:border border-border-subtle rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-5 border-b border-border-subtle bg-surface-inset/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary shadow-inner">
              <Zap className="w-5 h-5 text-teal" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
                  Sprint Relay
                </span>
                <span className="text-[10px] text-text-muted font-mono">• 45 Detik</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading">
                Kotoba Guess Relay
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="btn-physical-secondary w-8 h-8 rounded-full flex items-center justify-center transition-all p-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. LOBBY */}
        {gameState === 'ready' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Scrollable instructions & level selector */}
            <div className="flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto overscroll-contain custom-scrollbar">
              <div className="text-center space-y-2 py-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold block">
                  Sprint Refleks · Combo & Pinalti Multiplier
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
                  Tebak Arti Sebanyak Mungkin Dalam 45 Detik!
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  Tebak arti kata bahasa Jepang secepat mungkin. Benar beruntun melipatgandakan poin combo (hingga 3.5x), tetapi hati-hati: salah beruntun melipatgandakan pinalti pengurangan poin (hingga -3.0x)!
                </p>

                {/* Combo & Penalty Multiplier Rules Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2 max-w-md mx-auto">
                  <div className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-start gap-2 shadow-xs">
                    <Flame className="w-4 h-4 text-emerald-800 dark:text-emerald-400 fill-current shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold font-heading text-emerald-800 dark:text-emerald-400 block">
                        Benar Beruntun (+Combo)
                      </span>
                      <span className="text-[10px] text-text-secondary leading-tight block">
                        Multiplier plus bertambah (+100 s.d. +350 PTS/kata)
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-start gap-2 shadow-xs">
                    <ShieldAlert className="w-4 h-4 text-red-700 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold font-heading text-red-700 dark:text-rose-400 block">
                        Salah Beruntun (-Pinalti)
                      </span>
                      <span className="text-[10px] text-text-secondary leading-tight block">
                        Multiplier minus bertambah (-50 s.d. -150 PTS/salah)
                      </span>
                    </div>
                  </div>
                </div>
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
                mode="kotoba"
                challengeDurationText="45s Sprint"
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
                <Zap className="w-4 h-4 fill-current" />
                <span>Mulai Sprint (45 Detik)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. PLAYING */}
        {gameState === 'playing' && currentWord && (
          <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain custom-scrollbar min-h-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5">
            
            {/* STATUS BAR: TIME, SCORE, COMBO */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                  {correctCount}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-text-muted uppercase block">Skor Poin</span>
                  <span className="text-xs font-bold text-gold font-mono">{score}</span>
                </div>
              </div>

              {combo > 1 ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-elevated border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-mono font-bold text-xs shadow-xs animate-bounce">
                  <Flame className="w-3.5 h-3.5 text-gold fill-gold" />
                  <span>{combo}x Combo (+{Math.min(3.5, 1 + (combo - 1) * 0.25).toFixed(2)}x)</span>
                </div>
              ) : wrongStreak > 1 ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-700/10 border border-red-700/30 text-red-700 dark:text-rose-400 font-mono font-bold text-xs shadow-xs animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Pinalti {wrongStreak}x (-{Math.min(3.0, 1 + (wrongStreak - 1) * 0.5).toFixed(1)}x)</span>
                </div>
              ) : null}

              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-bold text-xs border ${
                timeLeft <= 10 ? 'bg-red-700/20 text-red-700 dark:text-rose-400 border-red-700/50 animate-pulse' : 'bg-surface-card text-text-primary border-border-subtle'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* PROGRESS RULER */}
            <div className="w-full h-1.5 bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
              <div 
                className="h-full bg-teal transition-all duration-1000"
                style={{ width: `${(timeLeft / 45) * 100}%` }}
              />
            </div>

            {/* SCORE FEEDBACK TOAST */}
            <div className="h-6 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {scoreFeedback && (
                  <motion.div
                    key={scoreFeedback.id}
                    initial={{ opacity: 0, y: -4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -2, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`px-3 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm border ${
                      scoreFeedback.type === 'plus'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-400'
                        : 'bg-red-700/15 border-red-700/40 text-red-700 dark:text-rose-400 animate-shake'
                    }`}
                  >
                    {scoreFeedback.type === 'plus' ? (
                      <>
                        <Flame className="w-3 h-3 fill-current text-gold" />
                        <span>+{scoreFeedback.amount} PTS</span>
                        {scoreFeedback.streak > 1 && (
                          <span className="opacity-90 font-medium">({scoreFeedback.streak}x Combo • +{scoreFeedback.multiplier}x)</span>
                        )}
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3 h-3" />
                        <span>-{scoreFeedback.amount} PTS</span>
                        {scoreFeedback.streak > 1 ? (
                          <span className="opacity-90 font-medium">(Salah {scoreFeedback.streak}x • Multiplier -{scoreFeedback.multiplier}x)</span>
                        ) : (
                          <span className="opacity-90 font-medium">(Salah)</span>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* WORD PROMPT */}
            <div className="p-5 rounded-3xl bg-surface-inset border border-border-subtle text-center space-y-2 shadow-inner">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                Tebak Arti Kata:
              </span>

              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl font-bold font-japanese text-text-primary tracking-wide">
                  {currentWord.word}
                </span>
                <button
                  type="button"
                  onClick={() => speakJapanese(currentWord.word)}
                  className="btn-physical-secondary p-2 rounded-xl hover:text-teal transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {currentWord.reading && (
                <span className="text-xs font-mono text-text-muted block">
                  ({currentWord.reading})
                </span>
              )}
            </div>

            {/* 4 CHOICES */}
            <div className="grid grid-cols-1 gap-2">
              {currentWord.options.map((opt, idx) => {
                let btnStyle = 'bg-surface-card border-border-subtle text-text-secondary hover:border-border-primary hover:text-text-primary';
                
                if (isAnswerRevealed) {
                  if (idx === currentWord.correctIndex) {
                    btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500/40';
                  } else if (idx === selectedOption) {
                    btnStyle = 'bg-crimson/20 border-border-subtle text-crimson font-bold';
                  } else {
                    btnStyle = 'opacity-40 bg-surface-inset border-border-subtle text-text-muted';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerRevealed}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3 rounded-2xl border text-left text-xs sm:text-sm font-heading transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswerRevealed && idx === currentWord.correctIndex && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswerRevealed && idx === selectedOption && idx !== currentWord.correctIndex && (
                      <XCircle className="w-4 h-4 text-crimson shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* 3. FINISHED */}
        {gameState === 'finished' && (
          <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain custom-scrollbar min-h-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            {/* Scorecard Component */}
            <div className="p-5 rounded-3xl bg-surface-card panel-stitched border border-border-subtle shadow-md space-y-5 relative overflow-hidden">

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-border-subtle/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-border-subtle text-text-primary flex items-center justify-center font-bold text-xs shadow-xs">
                    NQ
                  </div>
                  <span className="text-xs font-bold font-heading text-text-primary tracking-wide">
                    NIHONGO QUEST • GUESS RELAY
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-text-muted font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>45 DETIK</span>
                </span>
              </div>

              {/* Score Display */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-xs text-text-secondary font-mono">Total Skor Poin:</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-teal drop-shadow-sm">
                      {score}
                    </span>
                    <span className="text-sm font-bold text-text-secondary font-heading">
                      PTS
                    </span>
                  </div>
                  <div className="text-xs text-text-muted font-mono space-y-0.5 pt-0.5">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <span className="text-emerald-800 dark:text-emerald-400 font-bold">{correctCount} Benar</span>
                      <span className="opacity-40">•</span>
                      <span className={wrongCount > 0 ? "text-red-700 dark:text-rose-400 font-bold" : ""}>{wrongCount} Salah</span>
                      <span className="opacity-40">•</span>
                      <span className="font-semibold">Akurasi {accuracy}%</span>
                    </div>
                    <div>Max Combo: {maxCombo}x</div>
                  </div>
                </div>

                <div className={`px-4 py-3 rounded-2xl border text-center ${rankInfo.color} shadow-sm shrink-0`}>
                  <div className="text-2xl font-black font-mono tracking-wider">
                    {rankInfo.rank}
                  </div>
                  <div className="text-[11px] font-bold font-heading whitespace-nowrap mt-0.5">
                    {rankInfo.title}
                  </div>
                </div>
              </div>

              {/* Difficulty / Source Display */}
              <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Sumber / Tingkat:</span>
                <span className="text-text-primary font-bold font-mono text-sm">
                  {activeSourceLabel}
                </span>
              </div>

              {/* Card Footer Tag */}
              <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>Nihongo Quest · Guess Relay</span>
                <span>Sprint 45s</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
