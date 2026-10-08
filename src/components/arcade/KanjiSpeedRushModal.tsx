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
  ArrowRight, 
  Flame, 
  Loader2,
  ChevronRight,
  Layers,
  Award
} from 'lucide-react';
import { KanjiWritingCanvas } from '../learning/KanjiWritingCanvas';
import { KANJI_DATABASE } from '../../data/kanji';
import { KanjiItem } from '../../types/content';
import { playSound } from '../../utils/audio';
import { RPG_TIERS } from '../../data/rpg/tiers';
import { UserDeck } from '../../types/rpg';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { getKanjiPoolForBook } from '../../utils/arcadeSourceUtils';
import { ArcadeSourceSelector } from './ArcadeSourceSelector';
import { calcEngineExp, getKanjiBaseExp } from '../../utils/rewards';

interface KanjiSpeedRushModalProps {
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

type LevelFilter = 'ALL' | 'KANA' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

interface ClearedRecord {
  character: string;
  meaning: string;
  reading: string;
  score: number;
}

const LEVEL_OPTIONS: { id: LevelFilter; label: string; desc: string }[] = [
  { id: 'ALL', label: 'Semua Level', desc: 'Campuran Kanji N5 hingga N1' },
  { id: 'N5', label: 'JLPT N5', desc: 'Kanji dasar (80 karakter)' },
  { id: 'N4', label: 'JLPT N4', desc: 'Kanji pra-menengah (167 karakter)' },
  { id: 'N3', label: 'JLPT N3', desc: 'Kanji menengah (366 karakter)' },
  { id: 'N2', label: 'JLPT N2', desc: 'Kanji mahir (367 karakter)' },
  { id: 'N1', label: 'JLPT N1', desc: 'Kanji ahli (1233 karakter)' },
  { id: 'KANA', label: 'Kana (Hiragana & Katakana)', desc: 'Latihan goresan aksara dasar' }
];

export const KanjiSpeedRushModal: React.FC<KanjiSpeedRushModalProps> = ({
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
  const [isCanvasLoading, setIsCanvasLoading] = useState<boolean>(true);
  
  // Game session data
  const [kanjiQueue, setKanjiQueue] = useState<KanjiItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [clearedList, setClearedList] = useState<ClearedRecord[]>([]);
  

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

  // Helper to build randomized queue
  const buildQueue = useCallback((): KanjiItem[] => {
    let pool: KanjiItem[] = [];

    if (sourceType === 'TEMPLATE_BOOK') {
      pool = getKanjiPoolForBook(selectedBookId);
      if (pool.length === 0) {
        pool = Object.values(KANJI_DATABASE).filter(k => k.jlpt === 'N5');
      }
    } else if (selectedLevel === 'ALL') {
      // Pick balanced selection across levels (exclude KANA for default mixed kanji)
      pool = Object.values(KANJI_DATABASE).filter(k => k.jlpt && k.jlpt !== 'KANA');
    } else {
      pool = Object.values(KANJI_DATABASE).filter(k => k.jlpt === selectedLevel);
    }

    // Deduplicate by character
    const seen = new Set<string>();
    const uniquePool: KanjiItem[] = [];
    for (const item of pool) {
      if (item && item.character && !seen.has(item.character)) {
        seen.add(item.character);
        uniquePool.push(item);
      }
    }

    // Shuffle
    const shuffled = [...uniquePool].sort(() => Math.random() - 0.5);
    return shuffled.length > 0 ? shuffled : Object.values(KANJI_DATABASE).slice(0, 30);
  }, [sourceType, selectedBookId, selectedLevel]);

  // Reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setGameState('ready');
      setTimeLeft(60);
      setClearedList([]);
      setCurrentIndex(0);
      setIsCanvasLoading(true);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    playSound('click', soundEnabled);
    setGameState('ready');
    setTimeLeft(60);
    setClearedList([]);
    setCurrentIndex(0);
    setIsCanvasLoading(true);
    onClose();
  }, [soundEnabled, onClose]);

  // Start new game
  const handleStartGame = () => {
    playSound('attack', soundEnabled);
    const queue = buildQueue();
    setKanjiQueue(queue);
    setCurrentIndex(0);
    setClearedList([]);
    setTimeLeft(60);
    setIsCanvasLoading(true); // Starts paused until canvas is ready!
    setGameState('playing');
  };

  // Timer Effect: Counts down ONLY when playing and NOT loading stroke data!
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (isCanvasLoading) return; // Freezes timer during loading transitions!

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
  }, [gameState, isCanvasLoading, soundEnabled]);

  // When canvas finishes stroke loading and is ready for user input
  const handleCanvasReady = useCallback(() => {
    setIsCanvasLoading(false);
  }, []);

  // When user successfully draws current kanji
  const handleKanjiDone = useCallback((reward?: any) => {
    const currentItem = kanjiQueue[currentIndex];
    if (!currentItem) return;

    playSound('coin', soundEnabled);
    
    // Reward player EXP & Gold
    const expGain = Math.max(1, calcEngineExp(getKanjiBaseExp(currentItem), 'arcade'));
    const goldGain = 10;
    // Satu jalur reward saja (lihat catatan di SuddenDeathStreakModal).
    if (onCompleteStudyItem) {
      onCompleteStudyItem('kanji', expGain, goldGain, currentItem.id || currentItem.character, 1, 1);
    } else {
      onRewardPlayer?.(expGain, goldGain);
    }

    const primaryReading = Array.isArray(currentItem.onyomi) && currentItem.onyomi[0] 
      ? currentItem.onyomi[0] 
      : Array.isArray(currentItem.kunyomi) && currentItem.kunyomi[0] 
        ? currentItem.kunyomi[0] 
        : ((currentItem as any).reading || '');

    setClearedList(prev => [
      ...prev,
      {
        character: currentItem.character,
        meaning: currentItem.meaningId || currentItem.meaningEn || 'Kanji',
        reading: primaryReading,
        score: reward?.accuracyScore || 100
      }
    ]);

    // Advance to next kanji
    if (currentIndex + 1 < kanjiQueue.length) {
      setIsCanvasLoading(true); // Freeze timer immediately until next kanji loads
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop or replenish queue if player completes entire pool
      const fresh = buildQueue();
      setKanjiQueue(fresh);
      setCurrentIndex(0);
      setIsCanvasLoading(true);
    }
  }, [currentIndex, kanjiQueue, onRewardPlayer, onCompleteStudyItem, soundEnabled, buildQueue, selectedLevel]);

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

  // Calculate Rank and Title
  const count = clearedList.length;
  const rankInfo = useMemo(() => {
    if (count >= 10) return { rank: 'SSS', title: 'Dewa Kuas Jepang', color: 'text-amber-300 border-border-subtle bg-amber-500/10' };
    if (count >= 8) return { rank: 'SS', title: 'Master Kaligrafi', color: 'text-rose-400 border-rose-500 bg-rose-500/10' };
    if (count >= 6) return { rank: 'S', title: 'Pendekar Kanji', color: 'text-purple-400 border-border-subtle bg-purple-500/10' };
    if (count >= 4) return { rank: 'A', title: 'Murid Berbakat', color: 'text-teal border-border-subtle bg-teal/10' };
    if (count >= 2) return { rank: 'B', title: 'Pelajar Rajin', color: 'text-blue-400 border-border-subtle bg-blue-500/10' };
    return { rank: 'C', title: 'Langkah Awal', color: 'text-stone-400 border-stone-500 bg-stone-500/10' };
  }, [count]);

  if (!isOpen) return null;

  const currentKanji = kanjiQueue[currentIndex];

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
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
                  Arena Arcade
                </span>
                <span className="text-[10px] text-text-muted font-mono">• 60 Detik</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading">
                Kanji Speed Rush
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

        {/* 1. STATE: READY (LOBBY / LEVEL SELECTOR) */}
        {gameState === 'ready' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Scrollable instructions & level selector */}
            <div className="flex-1 p-5 sm:p-6 space-y-6 overflow-y-auto overscroll-contain custom-scrollbar">
              {/* Hero Banner */}
              <div className="text-center space-y-2 py-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold block">
                  Uji Kecepatan Kuas · Pause Saat Loading
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-heading text-text-primary">
                  Berapa Kanji Bisa Kamu Tulis Dalam 1 Menit?
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                  Tulis goresan kanji secara akurat secepat mungkin. Timer <strong>otomatis berhenti</strong> saat karakter baru sedang dimuat, jadi hanya waktu aktif menulis yang dihitung!
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
                mode="kanji"
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
                <Zap className="w-4 h-4 fill-current" />
                <span>Mulai Tantangan (60 Detik)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. STATE: PLAYING (CANVAS RUNNER + PAUSE AWARE TIMER) */}
        {gameState === 'playing' && (
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 flex flex-col items-center space-y-4 custom-scrollbar min-h-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5">
            
            {/* STATUS HEADER BAR: TIMER & SCORE */}
            <div className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
              
              {/* Score Counter */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border-subtle text-text-primary flex items-center justify-center font-mono font-black text-sm shadow-xs">
                  {clearedList.length}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted block">Kanji Selesai</span>
                  <span className="text-xs font-bold text-text-primary font-heading">
                    {clearedList.length} Kanji
                  </span>
                </div>
              </div>

              {/* Smart Pausing Timer */}
              <div className="flex items-center gap-2">
                {isCanvasLoading ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 border border-border-subtle text-blue-400 font-mono text-xs animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="font-bold">Timer Paused (Loading...)</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono font-bold text-sm border shadow-xs ${
                    timeLeft <= 10 
                      ? 'bg-crimson/20 text-crimson border-border-subtle animate-pulse'
                      : 'bg-surface-card text-gold border-border-subtle'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* PROGRESS RULER */}
            <div className="w-full h-1.5 bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
              <div 
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 10 ? 'bg-crimson' : 'bg-gold'
                }`}
                style={{ width: `${(timeLeft / 60) * 100}%` }}
              />
            </div>

            {/* INTEGRATED WRITING CANVAS */}
            {currentKanji && (
              <div className="w-full flex justify-center py-1">
                <KanjiWritingCanvas
                  key={`${currentKanji.character}_${currentIndex}`}
                  kanjiChar={currentKanji.character}
                  level={currentKanji.jlpt || 'N5'}
                  meaning={currentKanji.meaningId || currentKanji.meaningEn || 'Kanji'}
                  strokeCount={currentKanji.strokeCount}
                  onyomi={currentKanji.onyomi}
                  kunyomi={currentKanji.kunyomi}
                  soundEnabled={soundEnabled}
                  totalSheets={1}
                  autoAdvance={true}
                  showCompletionDetail={false}
                  showStopwatch={false}
                  onReady={handleCanvasReady}
                  onFinish={handleKanjiDone}
                  className="scale-95 sm:scale-100"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. STATE: FINISHED (RESULT SCORECARD) */}
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
                    NIHONGO QUEST • SPEED RUSH
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-text-muted font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>60 DETIK</span>
                </span>
              </div>

              {/* Main Score & Rank Display */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-xs text-text-secondary font-mono">Total Kanji Ditulis:</span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-gold drop-shadow-sm">
                      {clearedList.length}
                    </span>
                    <span className="text-sm font-bold text-text-secondary font-heading">
                      Kanji / Menit
                    </span>
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

              {/* List of successfully drawn kanji */}
              {clearedList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-text-muted block">
                    Koleksi Kanji Terverifikasi:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                    {clearedList.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-surface-card border border-border-subtle text-xs font-mono font-bold text-text-primary flex items-center gap-1 shadow-2xs"
                      >
                        <span className="text-gold font-serif text-sm">{c.character}</span>
                        <span className="text-[10px] text-text-muted font-normal">({c.reading})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Footer Tag */}
              <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>Nihongo Quest · Speed Rush</span>
                <span>Mode Arkade 60s</span>
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
