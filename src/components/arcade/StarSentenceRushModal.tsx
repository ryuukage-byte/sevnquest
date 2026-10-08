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
  Star,
  Award,
  Volume2,
  SkipForward,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { RubyText } from '../learning/RubyText';
import { playSound, speakJapanese } from '../../utils/audio';
import { 
  StarQuestion, 
  JLPT_STAR_QUESTIONS, 
  getRandomStarQuestions 
} from '../../data/starQuestionsData';

interface StarSentenceRushModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
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

type StarLevelFilter = 'ALL' | 'N5_N4' | 'N3' | 'N2' | 'N1';

interface ClearedStarRecord {
  id: string;
  level: string;
  prefix: string;
  suffix: string;
  placedWords: string[];
  starWord: string;
  correctStarWord: string;
  isCorrect: boolean;
  explanation?: string;
}

const STAR_LEVEL_OPTIONS: { id: StarLevelFilter; label: string; desc: string; count: number }[] = [
  { id: 'ALL', label: 'Semua Level', desc: 'Campuran N5 hingga N1 (137 Soal)', count: 137 },
  { id: 'N3', label: 'JLPT N3', desc: 'Tingkat Menengah Standar (50 Soal)', count: 50 },
  { id: 'N2', label: 'JLPT N2', desc: 'Tingkat Mahir & Bisnis (39 Soal)', count: 39 },
  { id: 'N1', label: 'JLPT N1', desc: 'Tingkat Ahli & Bahasa Formal (35 Soal)', count: 35 },
  { id: 'N5_N4', label: 'JLPT N5 & N4', desc: 'Tingkat Dasar & Pemula (13 Soal)', count: 13 },
];

export const StarSentenceRushModal: React.FC<StarSentenceRushModalProps> = ({
  isOpen,
  onClose,
  soundEnabled = true,
  playerLevel = 1,
  playerTierIndex = 0,
  onRewardPlayer,
  onCompleteStudyItem,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<StarLevelFilter>('ALL');
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');

  // Timer & Score
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [clearedList, setClearedList] = useState<ClearedStarRecord[]>([]);

  // Current Question & Slots State
  const [currentQuestion, setCurrentQuestion] = useState<StarQuestion | null>(null);
  const [questionDeck, setQuestionDeck] = useState<StarQuestion[]>([]);
  const [slots, setSlots] = useState<( { text: string; originalIndex: number } | null)[]>([null, null, null, null]);
  const [availableOptions, setAvailableOptions] = useState<{ text: string; originalIndex: number }[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  // Floating feedback animation
  const [scoreFeedback, setScoreFeedback] = useState<{
    amount: number;
    multiplier: number;
    id: number;
  } | null>(null);

  // Filter pool questions
  const filteredQuestions = useMemo(() => {
    if (selectedLevel === 'ALL') return JLPT_STAR_QUESTIONS;
    if (selectedLevel === 'N5_N4') {
      return JLPT_STAR_QUESTIONS.filter(q => q.level === 'N5' || q.level === 'N4');
    }
    return JLPT_STAR_QUESTIONS.filter(q => q.level === selectedLevel);
  }, [selectedLevel]);

  // Load next question
  const loadNextQuestion = useCallback((deck: StarQuestion[]) => {
    let nextDeck = [...deck];
    if (nextDeck.length === 0) {
      // Reshuffle pool
      nextDeck = [...filteredQuestions].sort(() => Math.random() - 0.5);
    }
    const nextQ = nextDeck.shift() || null;
    setQuestionDeck(nextDeck);
    setCurrentQuestion(nextQ);

    if (nextQ) {
      setSlots([null, null, null, null]);
      setAvailableOptions(nextQ.options.map((text, idx) => ({ text, originalIndex: idx })));
      setIsAnswerChecked(false);
      setIsCorrect(false);
    }
  }, [filteredQuestions]);

  // Start game session
  const handleStartGame = () => {
    playSound('start_game', soundEnabled);
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const firstQ = shuffled.shift() || null;

    setQuestionDeck(shuffled);
    setCurrentQuestion(firstQ);
    if (firstQ) {
      setSlots([null, null, null, null]);
      setAvailableOptions(firstQ.options.map((text, idx) => ({ text, originalIndex: idx })));
      setIsAnswerChecked(false);
      setIsCorrect(false);
    }

    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setClearedList([]);
    setScoreFeedback(null);
    setGameState('playing');
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft <= 0) {
      handleGameOver();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  // Handle Placing an Option into First Empty Slot
  const handleSelectOption = (item: { text: string; originalIndex: number }) => {
    if (isAnswerChecked || !currentQuestion) return;

    const firstEmptyIndex = slots.findIndex(s => s === null);
    if (firstEmptyIndex === -1) return;

    playSound('click', soundEnabled);
    const newSlots = [...slots];
    newSlots[firstEmptyIndex] = item;
    setSlots(newSlots);

    // Remove from available
    setAvailableOptions(prev => prev.filter(i => i.originalIndex !== item.originalIndex));

    // If this fills all 4 slots, auto-verify!
    const allFilled = newSlots.every(s => s !== null);
    if (allFilled) {
      verifyAnswer(newSlots);
    }
  };

  // Handle Removing Card from Slot
  const handleRemoveFromSlot = (slotIdx: number) => {
    if (isAnswerChecked) return;
    const item = slots[slotIdx];
    if (!item) return;

    playSound('click', soundEnabled);
    const newSlots = [...slots];
    newSlots[slotIdx] = null;
    setSlots(newSlots);

    setAvailableOptions(prev => [...prev, item].sort((a, b) => a.originalIndex - b.originalIndex));
  };

  // Reset All Slots
  const handleResetSlots = () => {
    if (isAnswerChecked || !currentQuestion) return;
    playSound('click', soundEnabled);
    setSlots([null, null, null, null]);
    setAvailableOptions(currentQuestion.options.map((text, idx) => ({ text, originalIndex: idx })));
  };

  // Verify Answer
  const verifyAnswer = (filledSlots: ({ text: string; originalIndex: number } | null)[]) => {
    if (!currentQuestion || isAnswerChecked) return;

    const starItem = filledSlots[currentQuestion.starIndex];
    const correct = starItem?.originalIndex === currentQuestion.correctIndex;

    setIsAnswerChecked(true);
    setIsCorrect(correct);

    const placedTexts = filledSlots.map(s => s?.text || '');
    const correctStarText = currentQuestion.options[currentQuestion.correctIndex];
    const userStarText = starItem?.text || '';

    // Record for end game review
    setClearedList(prev => [
      ...prev,
      {
        id: currentQuestion.id,
        level: currentQuestion.level,
        prefix: currentQuestion.prefix,
        suffix: currentQuestion.suffix,
        placedWords: placedTexts,
        starWord: userStarText,
        correctStarWord: correctStarText,
        isCorrect: correct,
        explanation: currentQuestion.explanation
      }
    ]);

    if (correct) {
      playSound('correct', soundEnabled);
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      const multiplier = Math.min(3.0, 1.0 + (newCombo - 1) * 0.2);
      const pts = Math.round(100 * multiplier);
      setScore(prev => prev + pts);
      setCorrectCount(prev => prev + 1);

      setScoreFeedback({
        amount: pts,
        multiplier: Math.round(multiplier * 10) / 10,
        id: Date.now()
      });

      // Quick advance in 0.45s
      setTimeout(() => {
        loadNextQuestion(questionDeck);
      }, 450);
    } else {
      playSound('wrong', soundEnabled);
      setCombo(0);
      setWrongCount(prev => prev + 1);

      // Advance in 0.85s to let user notice the correct star word
      setTimeout(() => {
        loadNextQuestion(questionDeck);
      }, 850);
    }
  };

  // Skip question
  const handleSkipQuestion = () => {
    if (isAnswerChecked || !currentQuestion) return;
    playSound('click', soundEnabled);
    setCombo(0);
    setWrongCount(prev => prev + 1);
    loadNextQuestion(questionDeck);
  };

  // Game Over Handler
  const handleGameOver = () => {
    playSound('game_over', soundEnabled);
    setGameState('finished');
  };

  // Calculate RPG Achievement Rank
  const achievementRank = useMemo(() => {
    if (correctCount >= 14) return { rank: 'SSS', title: 'Kaisar Bintang', jp: '星の覇王', color: 'text-amber-300', exp: 200, gold: 150 };
    if (correctCount >= 11) return { rank: 'SS', title: 'Master Sintaksis', jp: '構文の達人', color: 'text-purple-300', exp: 160, gold: 120 };
    if (correctCount >= 8) return { rank: 'S', title: 'Penjelajah Kalimat', jp: '文の探究者', color: 'text-sky-300', exp: 120, gold: 90 };
    if (correctCount >= 5) return { rank: 'A', title: 'Perangkai Kata', jp: '言葉の紡ぎ手', color: 'text-emerald-300', exp: 90, gold: 65 };
    if (correctCount >= 2) return { rank: 'B', title: 'Murid Rajin', jp: '熱心な修道士', color: 'text-orange-300', exp: 60, gold: 40 };
    return { rank: 'C', title: 'Langkah Awal', jp: '初めの一歩', color: 'text-slate-300', exp: 30, gold: 20 };
  }, [correctCount]);

  // Claim Rewards
  const [hasClaimedReward, setHasClaimedReward] = useState(false);
  const handleClaimReward = () => {
    if (hasClaimedReward) return;
    setHasClaimedReward(true);
    playSound('level_up', soundEnabled);

    // Satu jalur reward saja. score/total = jawaban benar / total dijawab (bukan poin permainan),
    // supaya misi kuis & statistik pertanyaan tidak membengkak oleh poin.
    if (onCompleteStudyItem) {
      onCompleteStudyItem('tryOuts', achievementRank.exp, achievementRank.gold, 'star_rush', correctCount, correctCount + wrongCount);
    } else {
      onRewardPlayer?.(achievementRank.exp, achievementRank.gold);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-surface-card border border-border-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="p-4 sm:px-6 border-b border-border-subtle flex items-center justify-between bg-surface-elevated/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-border-subtle flex items-center justify-center text-amber-400 shadow-inner">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary leading-tight">
                  Susun Bintang Kilat (60s)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-border-subtle text-amber-300">
                  文の組み立て
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Soal Asli Resmi JLPT • Cari kata posisi ★ secepat mungkin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer p-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STATE 1: READY / LOBBY */}
          {gameState === 'ready' && (
            <div className="space-y-5 animate-fade-in">
              {/* Hero Banner */}
              <div className="p-5 rounded-2xl bg-surface-elevated panel-stitched border border-border-subtle text-center relative overflow-hidden shadow-inner">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 border border-border-subtle text-amber-300 text-xs font-bold font-mono mb-2">
                  <span>SPEED RUSH 60 DETIK</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-wide">
                  Tantangan Susun Kalimat Bintang
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-md mx-auto leading-relaxed">
                  Diambil langsung dari soal asli <strong>問題２ (文の組み立て)</strong> ujian JLPT resmi. Susun 4 potongan kalimat dan temukan kata yang mengisi posisi <strong className="text-amber-400">★</strong>!
                </p>

                {/* Rules Highlights */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border-subtle/60 text-left">
                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle/50">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">WAKTU</span>
                    <span className="text-sm font-bold font-mono text-gold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 60 Detik
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle/50">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">COMBO</span>
                    <span className="text-sm font-bold font-mono text-orange-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> Hingga 3.0x
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle/50">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">SOAL ASLI</span>
                    <span className="text-sm font-bold font-mono text-amber-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-300" /> {filteredQuestions.length} Soal
                    </span>
                  </div>
                </div>
              </div>

              {/* Level Filter Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gold" />
                  Pilih Tingkat Level JLPT:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STAR_LEVEL_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedLevel(opt.id);
                        playSound('click', soundEnabled);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedLevel === opt.id
                          ? 'bg-surface-elevated border-border-primary text-text-primary shadow-md'
                          : 'bg-surface-inset hover:bg-surface-elevated border-border-subtle text-text-secondary'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                          <span>{opt.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border-subtle text-text-muted font-mono">
                            {opt.count} soal
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">{opt.desc}</div>
                      </div>
                      {selectedLevel === opt.id && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={handleStartGame}
                className="btn-physical-primary w-full py-3.5 sm:py-4 rounded-2xl font-bold font-heading text-base tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-current" />
                <span>MULAI TANTANGAN (60 DETIK)</span>
              </button>
            </div>
          )}

          {/* STATE 2: PLAYING */}
          {gameState === 'playing' && currentQuestion && (
            <div className="space-y-4 animate-fade-in">
              {/* TOP STATUS BAR: Timer, Score, Combo */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
                {/* Timer */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm transition-all ${
                  timeLeft <= 10 
                    ? 'bg-rose-500/20 border border-rose-500/50 text-rose-400 animate-pulse'
                    : timeLeft <= 20
                    ? 'bg-amber-500/20 border border-border-subtle text-amber-300'
                    : 'bg-surface-elevated text-text-primary border border-border-subtle'
                }`}>
                  <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-rose-400 animate-spin' : 'text-gold'}`} />
                  <span>{timeLeft}s</span>
                </div>

                {/* Score & Combo */}
                <div className="flex items-center gap-3">
                  {combo > 1 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-inset border border-border-subtle text-orange-300 text-xs font-bold font-mono animate-scale-up">
                      <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                      <span>{combo}x COMBO</span>
                    </div>
                  )}

                  <div className="text-right">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">SKOR</span>
                    <span className="font-mono font-bold text-base sm:text-lg text-gold leading-none">
                      {score.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* QUESTION CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-card panel-stitched border border-border-primary shadow-md space-y-4 relative overflow-hidden">
                {/* Score feedback popup */}
                <AnimatePresence>
                  {scoreFeedback && (
                    <motion.div
                      key={scoreFeedback.id}
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: -15, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="absolute top-3 right-3 pointer-events-none z-20 px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-500/60 text-emerald-300 font-mono font-bold text-xs shadow-lg flex items-center gap-1"
                    >
                      <span>+{scoreFeedback.amount} PTS</span>
                      {scoreFeedback.multiplier > 1 && (
                        <span className="text-[10px] text-amber-300">({scoreFeedback.multiplier}x)</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subheader: Level Badge & Audio */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 border border-border-subtle text-amber-300">
                      JLPT {currentQuestion.level}
                    </span>
                    <span className="text-xs text-text-secondary">
                      Temukan kata untuk posisi <strong className="text-amber-400">★</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const fullSentence = `${currentQuestion.prefix} ${currentQuestion.options.join(' ')} ${currentQuestion.suffix}`;
                      speakJapanese(fullSentence);
                    }}
                    className="btn-physical-secondary p-1.5 rounded-xl transition-all cursor-pointer"
                    title="Dengarkan pengucapan kalimat"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Sentence Display Frame */}
                <div className="p-4 rounded-xl bg-surface-inset border border-border-subtle/80 space-y-3">
                  {/* Prefix Text */}
                  {currentQuestion.prefix && (
                    <div className="text-base sm:text-lg font-bold font-jp text-text-primary leading-relaxed">
                      {currentQuestion.prefix}
                    </div>
                  )}

                  {/* 4 Interactive Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                    {[0, 1, 2, 3].map(slotIdx => {
                      const isStarSlot = slotIdx === currentQuestion.starIndex;
                      const filledItem = slots[slotIdx];

                      return (
                        <div
                          key={slotIdx}
                          onClick={() => handleRemoveFromSlot(slotIdx)}
                          className={`relative min-h-[52px] sm:min-h-[58px] p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                            filledItem
                              ? isAnswerChecked
                                ? isStarSlot
                                  ? isCorrect
                                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 shadow-md'
                                    : 'bg-rose-500/20 border-2 border-rose-500 text-rose-300 shadow-md'
                                  : 'bg-surface-card border border-border-subtle text-text-primary'
                                : isStarSlot
                                ? 'bg-amber-500/15 border-2 border-border-subtle text-amber-200 shadow-md ring-1 ring-border-primary'
                                : 'bg-surface-card border border-border-subtle text-text-primary hover:border-border-primary'
                              : isStarSlot
                              ? 'border-2 border-dashed border-border-subtle bg-amber-500/5 text-amber-400/60'
                              : 'border-2 border-dashed border-border-subtle/80 bg-surface-elevated/40 text-text-muted/60'
                          }`}
                        >
                          {/* Star Badge Indicator */}
                          {isStarSlot && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[9px] font-bold font-mono flex items-center gap-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-stone-950" />
                              <span>POSISI ★</span>
                            </span>
                          )}

                          {filledItem ? (
                            <span className="text-xs sm:text-sm font-bold font-jp leading-tight break-all">
                              {filledItem.text}
                            </span>
                          ) : (
                            <span className="text-xs font-mono font-bold opacity-40">
                              {isStarSlot ? '★' : slotIdx + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Suffix Text */}
                  {currentQuestion.suffix && (
                    <div className="text-base sm:text-lg font-bold font-jp text-text-primary leading-relaxed">
                      {currentQuestion.suffix}
                    </div>
                  )}
                </div>

                {/* Incorrect Answer Flash Banner */}
                {isAnswerChecked && !isCorrect && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2 animate-shake">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-200">
                      <span className="font-bold">Jawaban salah! </span>
                      Kata yang benar di posisi ★ adalah:{' '}
                      <strong className="text-amber-300 font-jp underline underline-offset-2">
                        {currentQuestion.options[currentQuestion.correctIndex]}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Correct Answer Flash Banner */}
                {isAnswerChecked && isCorrect && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2 animate-scale-up">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-xs text-emerald-200 font-bold">
                      Tepat sekali! Susunan kalimat benar!
                    </div>
                  </div>
                )}

                {/* AVAILABLE OPTIONS TO TAP */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                    <span>Ketuk kata untuk memasukkan ke dalam kotak:</span>
                    <button
                      type="button"
                      onClick={handleResetSlots}
                      disabled={isAnswerChecked || slots.every(s => s === null)}
                      className="text-xs font-bold text-gold hover:text-amber-300 flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {currentQuestion.options.map((optText, optIdx) => {
                      const isPlaced = slots.some(s => s?.originalIndex === optIdx);

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption({ text: optText, originalIndex: optIdx })}
                          disabled={isPlaced || isAnswerChecked}
                          className={`p-3 rounded-xl border text-left font-jp font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                            isPlaced
                              ? 'opacity-25 bg-surface-inset border-border-subtle/40 pointer-events-none'
                              : 'bg-surface-elevated hover:bg-surface-inset border-border-subtle hover:border-border-primary shadow-sm active:scale-[0.98]'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-surface-inset border border-border-subtle text-[11px] font-mono text-text-secondary flex items-center justify-center shrink-0">
                            {optIdx + 1}
                          </span>
                          <span className="text-xs sm:text-sm text-text-primary leading-tight break-all flex-1">
                            {optText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FOOTER ACTIONS: Skip */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    disabled={isAnswerChecked}
                    className="btn-physical-secondary py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Lewati Soal</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: FINISHED / SUMMARY */}
          {gameState === 'finished' && (
            <div className="space-y-5 animate-fade-in">
              {/* Achievement Badge Banner */}
              <div className="p-5 rounded-2xl bg-surface-card panel-stitched border border-border-subtle text-center relative overflow-hidden shadow-md">
                {/* Stempel rank di pojok kanan (plakat skor, sesuai DESIGN.md) */}
                <div className="absolute top-3 right-3 w-14 h-14 rounded-xl bg-surface-inset border border-border-subtle shadow-inner flex items-center justify-center">
                  <span className={`text-3xl font-black font-heading ${achievementRank.color}`}>
                    {achievementRank.rank}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-inset border border-border-subtle text-xs font-bold font-mono text-text-secondary mb-2">
                  <Trophy className="w-3.5 h-3.5 text-gold" />
                  <span>WAKTU HABIS!</span>
                </div>
                <div className="text-lg font-bold font-heading mt-1 text-text-primary">
                  {achievementRank.title}
                </div>
                <div className="text-xs font-mono text-text-muted">
                  {achievementRank.jp}
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">SKOR TOTAL</span>
                  <span className="font-mono font-bold text-lg text-gold">{score.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">BENAR</span>
                  <span className="font-mono font-bold text-lg text-emerald-400">{correctCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">SALAH / LEWAT</span>
                  <span className="font-mono font-bold text-lg text-rose-400">{wrongCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">MAX COMBO</span>
                  <span className="font-mono font-bold text-lg text-orange-400">{maxCombo}x</span>
                </div>
              </div>

              {/* Claim Reward Card */}
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-3 shadow-inner">
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-gold" />
                    <span>Hadiah Arena Tantangan:</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    +{achievementRank.exp} EXP • +{achievementRank.gold} Gold
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClaimReward}
                  disabled={hasClaimedReward}
                  className={`py-2 px-4 rounded-xl font-bold font-heading text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                    hasClaimedReward
                      ? 'bg-surface-elevated text-emerald-400 border border-emerald-500/30'
                      : 'bg-gold hover:bg-gold-light text-stone-950 shadow-md active:scale-95'
                  }`}
                >
                  {hasClaimedReward ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>KLAIM SELESAI</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-stone-950" />
                      <span>AMBIL HADIAH</span>
                    </>
                  )}
                </button>
              </div>

              {/* Review Cleared Questions */}
              {clearedList.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                    Review Soal yang Dikerjakan ({clearedList.length}):
                  </span>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {clearedList.map((rec, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          rec.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border-subtle">
                            JLPT {rec.level}
                          </span>
                          <span className="font-bold text-[11px] flex items-center gap-1">
                            {rec.isCorrect ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            {rec.isCorrect ? 'Benar' : 'Salah'}
                          </span>
                        </div>

                        {/* Sentence order */}
                        <div className="font-jp text-xs leading-relaxed text-text-primary">
                          {rec.prefix} <strong className="text-amber-300">★【{rec.correctStarWord}】</strong> {rec.suffix}
                        </div>

                        {rec.explanation && (
                          <div className="text-[11px] text-text-muted mt-1 border-t border-border-subtle/50 pt-1 leading-normal">
                            {rec.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restart & Exit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="btn-physical-primary flex-1 py-3 rounded-xl font-bold font-heading text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>MAIN LAGI</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn-physical-secondary py-3 px-5 rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  KELUAR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
