import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Heart, 
  Flame, 
  RotateCcw, 
  Trophy, 
  CheckCircle2, 
  XCircle,
  Volume2,
  ChevronRight,
  Layers,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { KOTOBA_DATABASE as kotobaDb } from '../../data/kotoba';
import { playSound, speakJapanese } from '../../utils/audio';
import { RPG_TIERS } from '../../data/rpg/tiers';
import { UserDeck } from '../../types/rpg';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { getKotobaPoolForBook } from '../../utils/arcadeSourceUtils';
import { ArcadeSourceSelector } from './ArcadeSourceSelector';
import { calcEngineExp, getEntityBaseExp } from '../../utils/rewards';

interface SuddenDeathStreakModalProps {
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

interface QuizQuestion {
  id: string;
  word: string;
  reading: string;
  questionType: 'meaning' | 'reading';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const LEVEL_OPTIONS: { id: LevelFilter; label: string; desc: string }[] = [
  { id: 'ALL', label: 'Semua Level', desc: 'Kosakata N5 hingga N1' },
  { id: 'N5', label: 'JLPT N5', desc: 'Kosakata dasar' },
  { id: 'N4', label: 'JLPT N4', desc: 'Kosakata pra-menengah' },
  { id: 'N3', label: 'JLPT N3', desc: 'Kosakata menengah' },
  { id: 'N2', label: 'JLPT N2', desc: 'Kosakata mahir' },
  { id: 'N1', label: 'JLPT N1', desc: 'Kosakata ahli' }
];

const rawKotobaList = Object.values(kotobaDb as Record<string, any>);

export const SuddenDeathStreakModal: React.FC<SuddenDeathStreakModalProps> = ({
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
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  
  // 3 Nyawa
  const [lives, setLives] = useState<number>(3);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalCorrect, setTotalCorrect] = useState<number>(0);

  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  // Player Tier Information
  const currentTier = RPG_TIERS[playerTierIndex] || RPG_TIERS[0];

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

  // Filter pool based on level
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

  // Generator for fresh multiple-choice question
  const generateQuestion = useCallback((): QuizQuestion | null => {
    if (!filteredPool || filteredPool.length < 4) return null;

    const randomIndex = Math.floor(Math.random() * filteredPool.length);
    const targetItem = filteredPool[randomIndex];
    
    // Choose between meaning question or reading question
    const isMeaningQuestion = Math.random() > 0.35 || !targetItem.reading;
    
    // Pick 3 distractor items
    const distractors: any[] = [];
    const usedIndices = new Set<number>([randomIndex]);
    while (distractors.length < 3 && distractors.length < filteredPool.length - 1) {
      const idx = Math.floor(Math.random() * filteredPool.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        distractors.push(filteredPool[idx]);
      }
    }

    if (isMeaningQuestion) {
      const correctText = targetItem.meaningId || targetItem.meaningEn || 'Arti';
      const options = [
        correctText,
        ...distractors.map(d => d.meaningId || d.meaningEn || 'Pilihan lain')
      ].sort(() => Math.random() - 0.5);

      return {
        id: targetItem.id || `q_${Date.now()}`,
        word: targetItem.word,
        reading: targetItem.reading || targetItem.word,
        questionType: 'meaning',
        prompt: 'Arti bahasa Indonesia yang tepat adalah...',
        options,
        correctIndex: options.indexOf(correctText),
        explanation: `${targetItem.word} (${targetItem.reading}) = ${correctText}`
      };
    } else {
      const correctText = targetItem.reading;
      const options = [
        correctText,
        ...distractors.map(d => d.reading || d.word)
      ].sort(() => Math.random() - 0.5);

      return {
        id: targetItem.id || `q_${Date.now()}`,
        word: targetItem.word,
        reading: targetItem.reading,
        questionType: 'reading',
        prompt: 'Cara baca (yomikata) yang tepat adalah...',
        options,
        correctIndex: options.indexOf(correctText),
        explanation: `${targetItem.word} dibaca ${correctText} (${targetItem.meaningId || targetItem.meaningEn})`
      };
    }
  }, [filteredPool]);

  // Reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setGameState('ready');
      setLives(3);
      setCurrentStreak(0);
      setMaxStreak(0);
      setTotalCorrect(0);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setIsShaking(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    playSound('click', soundEnabled);
    setGameState('ready');
    setLives(3);
    setCurrentStreak(0);
    setMaxStreak(0);
    setTotalCorrect(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setIsShaking(false);
    onClose();
  }, [soundEnabled, onClose]);

  // Start / Restart game
  const handleStartGame = () => {
    playSound('attack', soundEnabled);
    setLives(3);
    setCurrentStreak(0);
    setMaxStreak(0);
    setTotalCorrect(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setIsShaking(false);
    
    const q = generateQuestion();
    setCurrentQ(q);
    setGameState('playing');
  };

  // Handle user option selection
  const handleSelectOption = (idx: number) => {
    if (isAnswerRevealed || !currentQ) return;

    setSelectedOption(idx);
    setIsAnswerRevealed(true);

    const isCorrect = idx === currentQ.correctIndex;

    if (isCorrect) {
      playSound('correct', soundEnabled);
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setTotalCorrect(prev => prev + 1);

      // Rewards
      // Base EXP kata × engine arcade, + bonus streak (maks +10).
      const baseKotobaExp = getEntityBaseExp('kotoba', currentQ.id) ?? 30;
      const expGain = Math.max(1, calcEngineExp(baseKotobaExp, 'arcade')) + Math.min(newStreak, 10);
      const goldGain = 5 + Math.floor(newStreak / 2);
      // Satu jalur reward saja: onCompleteStudyItem sudah memberi EXP/Gold di App.handleStudyComplete.
      if (onCompleteStudyItem) {
        onCompleteStudyItem('kotoba', expGain, goldGain, currentQ.id, 1, 1);
      } else {
        onRewardPlayer?.(expGain, goldGain);
      }

      // Next question after brief celebration
      setTimeout(() => {
        setSelectedOption(null);
        setIsAnswerRevealed(false);
        const nextQ = generateQuestion();
        setCurrentQ(nextQ);
      }, 750);
    } else {
      playSound('wrong', soundEnabled);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      const nextLives = lives - 1;
      setLives(nextLives);
      setCurrentStreak(0); // Streak resets on wrong answer

      if (nextLives <= 0) {
        // Game Over!
        setTimeout(() => {
          playSound('fanfare', soundEnabled);
          setGameState('gameover');
        }, 1100);
      } else {
        // Next question after review
        setTimeout(() => {
          setSelectedOption(null);
          setIsAnswerRevealed(false);
          const nextQ = generateQuestion();
          setCurrentQ(nextQ);
        }, 1100);
      }
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

  // Rank determination
  const rankInfo = useMemo(() => {
    if (maxStreak >= 30) return { rank: 'SSS', title: 'Legenda Hidup Nihongo', color: 'text-amber-300 border-border-subtle bg-amber-500/10' };
    if (maxStreak >= 20) return { rank: 'SS', title: 'Dewa Hafalan Kotoba', color: 'text-rose-400 border-rose-500 bg-rose-500/10' };
    if (maxStreak >= 12) return { rank: 'S', title: 'Pendekar Memori', color: 'text-purple-400 border-border-subtle bg-purple-500/10' };
    if (maxStreak >= 7) return { rank: 'A', title: 'Murid Tangguh', color: 'text-teal border-border-subtle bg-teal/10' };
    if (maxStreak >= 3) return { rank: 'B', title: 'Petualang Gigih', color: 'text-blue-400 border-border-subtle bg-blue-500/10' };
    return { rank: 'C', title: 'Pemula Berani', color: 'text-stone-400 border-stone-500 bg-stone-500/10' };
  }, [maxStreak]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/85 animate-fade-in overflow-hidden">
      {/* Dark backdrop click dismiss on desktop */}
      <div 
        className="fixed inset-0" 
        onClick={handleClose}
        aria-hidden="true" 
      />

      <div className={`relative z-10 w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-lg bg-surface-card border-0 sm:border border-border-subtle rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isShaking ? 'animate-shake' : ''}`} onClick={(e) => e.stopPropagation()}>
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-5 border-b border-border-subtle bg-surface-inset/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary shadow-inner">
              <ShieldAlert className="w-5 h-5 text-crimson" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
                  Survival Mode
                </span>
                <span className="text-[10px] text-text-muted font-mono">• 3 Nyawa</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading">
                Sudden Death Streak
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

        {/* 1. LOBBY STATE */}
        {gameState === 'ready' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Scrollable instructions & level selector */}
            <div className="flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto overscroll-contain custom-scrollbar">
              <div className="text-center space-y-2 py-3">
                <div className="flex items-center justify-center gap-2 text-crimson text-2xl font-mono">
                  <Heart className="w-7 h-7 fill-crimson drop-shadow-md" />
                  <Heart className="w-7 h-7 fill-crimson drop-shadow-md" />
                  <Heart className="w-7 h-7 fill-crimson drop-shadow-md" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
                  Berapa Soal Bisa Kamu Jawab Dengan 3 Nyawa?
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  Jawab soal kosakata dan bacaan tanpa salah. Setiap jawaban salah akan mengurangi 1 nyawa. Kumpulkan combo streak tertinggi!
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
                mode="kotoba"
                challengeDurationText="3 Nyawa Survival"
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
                <Flame className="w-4 h-4 fill-current" />
                <span>Mulai Uji 3 Nyawa</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. PLAYING STATE */}
        {gameState === 'playing' && currentQ && (
          <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain custom-scrollbar min-h-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            
            {/* LIVES AND STREAK STATUS */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
              {/* Hearts Display */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map(h => (
                  <Heart
                    key={h}
                    className={`w-6 h-6 transition-all duration-300 ${
                      h <= lives 
                        ? 'text-crimson fill-crimson scale-100' 
                        : 'text-border-subtle fill-surface-inset scale-90 opacity-40'
                    }`}
                  />
                ))}
              </div>

              {/* Streak Counter */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary font-mono font-bold text-xs shadow-xs">
                <Flame className="w-3.5 h-3.5 text-gold fill-gold" />
                <span>Streak: {currentStreak}x</span>
              </div>
            </div>

            {/* QUESTION DISPLAY */}
            <div className="p-6 rounded-3xl bg-surface-inset border border-border-subtle text-center space-y-3 shadow-inner">
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                {currentQ.prompt}
              </span>

              {/* Japanese Word Prompt */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl font-bold font-japanese text-text-primary tracking-wide">
                  {currentQ.word}
                </span>
                <button
                  type="button"
                  onClick={() => speakJapanese(currentQ.word)}
                  className="btn-physical-secondary p-2 rounded-xl hover:text-gold transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {currentQ.reading && currentQ.questionType === 'meaning' && (
                <span className="text-xs font-mono text-text-muted block">
                  ({currentQ.reading})
                </span>
              )}
            </div>

            {/* 4 OPTIONS */}
            <div className="grid grid-cols-1 gap-2.5">
              {currentQ.options.map((opt, idx) => {
                let btnStyle = 'bg-surface-card border-border-subtle text-text-secondary hover:border-border-primary hover:text-text-primary';
                
                if (isAnswerRevealed) {
                  if (idx === currentQ.correctIndex) {
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
                    className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-heading transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswerRevealed && idx === currentQ.correctIndex && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswerRevealed && idx === selectedOption && idx !== currentQ.correctIndex && (
                      <XCircle className="w-4 h-4 text-crimson shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* 3. GAME OVER STATE */}
        {gameState === 'gameover' && (
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
                    NIHONGO QUEST • SUDDEN DEATH
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-text-muted font-bold">
                  3 NYAWA
                </span>
              </div>

              {/* Score Display */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-xs text-text-secondary font-mono">Streak Tertinggi:</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-crimson drop-shadow-sm">
                      {maxStreak}
                    </span>
                    <span className="text-sm font-bold text-text-secondary font-heading">
                      Soal Tanpa Salah!
                    </span>
                  </div>
                  <span className="text-xs text-text-muted font-mono block">
                     Total Benar: {totalCorrect} Soal
                  </span>
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
                <span>Nihongo Quest · Sudden Death</span>
                <span>Survival 3 Nyawa</span>
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
