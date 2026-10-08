import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, RotateCw, ArrowRight, ArrowLeft, Trophy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserDeck } from '../../types/rpg';
import { ResolvedDeckItem, resolveDeckItem } from '../../utils/decks';
import { playSound } from '../../utils/audio';
import { UniversalFlashcard } from '../learning/UniversalFlashcard';
import { ENGINE_EXP_MULTIPLIER, getKanjiBaseExp, getKotobaBaseExp, getBunpouBaseExp, calculateFlashcardReward } from '../../utils/rewards';

// Dynamic micro-multiplier for flashcard flips: Base EXP * 0.005
const FLASHCARD_FLIP_MULTIPLIER = ENGINE_EXP_MULTIPLIER.flashcard_flip;

interface DeckFlashcardRunnerProps {
  deck: UserDeck;
  onClose: () => void;
  onReward?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionType?: 'writing' | 'flashcard' | 'quiz'
  ) => void;
  soundEnabled?: boolean;
}

export const DeckFlashcardRunner: React.FC<DeckFlashcardRunnerProps> = ({
  deck,
  onClose,
  onReward,
  onCompleteStudyItem,
  soundEnabled = true,
}) => {
  // Resolve items
  const resolvedItems = useMemo(() => {
    return deck.items
      .map(ref => resolveDeckItem(ref))
      .filter((it): it is ResolvedDeckItem => it !== null);
  }, [deck.items]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    resolvedItems.forEach(it => cats.add(it.category));
    return Array.from(cats);
  }, [resolvedItems]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(['kotoba', 'kanji', 'bunpou']);

  const filteredItems = useMemo(() => {
    return resolvedItems.filter(it => selectedCategories.includes(it.category));
  }, [resolvedItems, selectedCategories]);

  const [queue, setQueue] = useState<ResolvedDeckItem[]>(filteredItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardExpPopup, setFlashcardExpPopup] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [finalRewards, setFinalRewards] = useState<{ exp: number; gold: number } | null>(null);

  // Sync queue when category filters change
  useEffect(() => {
    setQueue(filteredItems);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filteredItems]);

  const toggleCategory = (cat: string) => {
    playSound('click', soundEnabled);
    setSelectedCategories(prev => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // Keep at least 1
        return prev.filter(c => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const currentItem = queue[currentIndex];

  const handleCardFlip = () => {
    playSound('click', soundEnabled);
    const willFlipToBack = !isFlipped;
    setIsFlipped(prev => !prev);

    if (willFlipToBack && currentItem) {
      let baseExp = 15;
      if (currentItem.category === 'kanji' && currentItem.kanji) {
        baseExp = getKanjiBaseExp(currentItem.kanji);
      } else if (currentItem.category === 'kotoba' && currentItem.kotoba) {
        baseExp = getKotobaBaseExp(currentItem.kotoba);
      } else if (currentItem.category === 'bunpou' && currentItem.bunpou) {
        baseExp = getBunpouBaseExp(currentItem.bunpou);
      }
      const flipExp = Math.max(0.01, Number((baseExp * FLASHCARD_FLIP_MULTIPLIER).toFixed(2)));
      setAccumulatedExp(prev => Number((prev + flipExp).toFixed(2)));
      setFlashcardExpPopup(flipExp);

      if (onCompleteStudyItem) {
        const mod = currentItem.category === 'kanji' ? 'kanji' : (currentItem.category === 'bunpou' ? 'bunpou' : 'kotoba');
        onCompleteStudyItem(mod, flipExp, 0, currentItem.ref.id, 1, 1, 'flashcard');
      }

      setTimeout(() => {
        setFlashcardExpPopup(null);
      }, 800);
    }
  };

  const handleNext = () => {
    playSound('click', soundEnabled);
    setIsFlipped(false);
    setFlashcardExpPopup(null);

    // Calculate dynamic flashcard reward for current item based on its Base EXP
    let baseExp = 15;
    if (currentItem?.category === 'kanji' && currentItem.kanji) {
      baseExp = getKanjiBaseExp(currentItem.kanji);
    } else if (currentItem?.category === 'kotoba' && currentItem.kotoba) {
      baseExp = getKotobaBaseExp(currentItem.kotoba);
    } else if (currentItem?.category === 'bunpou' && currentItem.bunpou) {
      baseExp = getBunpouBaseExp(currentItem.bunpou);
    }
    const reward = calculateFlashcardReward(baseExp, true);
    const newExp = accumulatedExp + reward.expGained;
    const newGold = accumulatedGold + reward.goldGained;
    setAccumulatedExp(newExp);
    setAccumulatedGold(newGold);

    if (currentItem && onCompleteStudyItem) {
      const mod = currentItem.category === 'kanji' ? 'kanji' : (currentItem.category === 'bunpou' ? 'bunpou' : 'kotoba');
      onCompleteStudyItem(mod, reward.expGained, reward.goldGained, currentItem.ref.id, 1, 1);
    }

    if (currentIndex + 1 >= queue.length) {
      // Completed drill!
      setIsCompleted(true);
      playSound('victory', soundEnabled);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      // Reward dynamic EXP and Gold
      const earnedExp = Math.max(15, newExp);
      const earnedGold = Math.max(5, newGold);
      setFinalRewards({ exp: earnedExp, gold: earnedGold });
      if (onReward && !onCompleteStudyItem) {
        onReward(earnedExp, earnedGold);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    playSound('click', soundEnabled);
    setQueue(resolvedItems);
    setCurrentIndex(0);
    setIsFlipped(false);
    setAccumulatedExp(0);
    setAccumulatedGold(0);
    setFinalRewards(null);
    setIsCompleted(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      playSound('click', soundEnabled);
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (resolvedItems.length === 0) {
    const emptyContent = (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-surface-ground/90">
        <div className="panel panel-stitched p-6 rounded-3xl max-w-md w-full border border-border-subtle text-center space-y-4">
          <h3 className="text-lg font-heading font-bold text-text-primary">Deck Masih Kosong</h3>
          <p className="text-xs text-text-secondary">
            Tambahkan materi ke dalam deck ini terlebih dahulu sebelum memulai latihan flashcard.
          </p>
          <button
            onClick={onClose}
            className="btn-physical-secondary px-5 py-2 rounded-xl text-xs font-bold"
          >
            Kembali
          </button>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(emptyContent, document.body) : emptyContent;
  }

  const runnerContent = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-surface-ground/98 overflow-y-auto overscroll-contain"
      style={{ minHeight: '100dvh' }}
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between max-w-2xl w-full mx-auto shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{deck.coverIcon || '📖'}</span>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-text-primary">
              Flashcard: {deck.title}
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              {isCompleted ? 'Selesai' : `Kartu ${currentIndex + 1} dari ${queue.length}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            playSound('click', soundEnabled);
            onClose();
          }}
          className="btn-physical-secondary p-2 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Category Multi-Select Filter Bar */}
      {availableCategories.length > 1 && !isCompleted && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 max-w-2xl mx-auto w-full bg-surface-inset/60 border-b border-border-subtle/60 flex-wrap shrink-0">
          <span className="text-[10px] font-heading font-bold text-text-muted uppercase tracking-wider">Tipe:</span>
          {(['kotoba', 'kanji', 'bunpou'] as const).map(cat => {
            if (!availableCategories.includes(cat)) return null;
            const isChecked = selectedCategories.includes(cat);
            const label = cat === 'kotoba' ? 'Kotoba' : cat === 'kanji' ? 'Kanji' : 'Pola';
            const seal = cat === 'kotoba' ? '語' : cat === 'kanji' ? '字' : '文';
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none ${
                  isChecked
                    ? 'bg-surface-elevated text-gold border-border-subtle shadow-xs'
                    : 'bg-surface-card text-text-muted border-border-subtle hover:text-text-primary opacity-60'
                }`}
              >
                <span className="font-serif font-black text-[10px] opacity-80">{seal}</span>
                <span>{label}</span>
                {isChecked && <Check className="w-3 h-3 text-gold" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Flashcard Container */}
      <div className="flex-1 flex flex-col justify-start sm:justify-center items-center py-4 px-3 sm:px-4 max-w-xl w-full mx-auto min-h-0">
        {isCompleted ? (
          /* Completion Screen */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="panel panel-stitched p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-2xl text-center space-y-5 w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-inset border border-border-subtle text-gold flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gold">
                Sesi Flashcard Selesai
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-text-primary mt-1">
                Latihan Terfokus Selesai!
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Kamu telah meninjau seluruh materi di dalam deck ini.
              </p>
            </div>

            {/* Completion Stats */}
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-center">
              <span className="text-xs font-mono text-text-muted uppercase">Total Kartu Dipelajari</span>
              <p className="text-2xl font-black font-heading text-text-primary mt-1">{queue.length} Materi</p>
            </div>

            {/* Dynamic EXP & Gold Reward Banner */}
            {finalRewards && (
              <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <span className="font-bold text-wine-accent font-mono text-sm">
                  +{finalRewards.exp} EXP
                </span>
                <span className="text-xs text-gold font-mono font-bold">
                  +{finalRewards.gold} Gold
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  (Multiplier Flashcard)
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="btn-physical-secondary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Drill</span>
              </button>
              <button
                onClick={onClose}
                className="btn-physical-secondary px-6 py-2.5 rounded-xl text-xs font-heading font-bold transition-all"
              >
                Kembali ke Buku Saku
              </button>
            </div>
          </motion.div>
        ) : (
          /* Active Flashcard Drill matching World richness */
          <div className="w-full space-y-4">
            {/* Card Progress Header */}
            <div className="flex items-center justify-between text-xs text-text-muted w-full px-1">
              <span>
                Kartu <strong className="text-indigo font-bold">{currentIndex + 1}</strong> dari {queue.length}
              </span>
              <span className="font-mono text-gold font-bold">Total: {queue.length}</span>
            </div>

            {/* Interactive 3D Flip Card with Floating EXP Popup */}
            {currentItem && (
              <div className="relative w-full">
                <AnimatePresence>
                  {flashcardExpPopup !== null && (
                    <motion.div
                      key={`deck-exp-popup-${Date.now()}`}
                      initial={{ opacity: 0, y: 0, scale: 0.7 }}
                      animate={{ opacity: 1, y: -36, scale: 1.1 }}
                      exit={{ opacity: 0, y: -50 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="absolute top-3 right-3 sm:top-6 sm:right-6 z-50 text-emerald-400 font-mono font-black text-sm sm:text-base drop-shadow-md pointer-events-none flex items-center gap-1 bg-surface-card/90 px-2.5 py-1 rounded-full border border-border-subtle shadow-lg"
                    >
                      +{flashcardExpPopup} EXP
                    </motion.div>
                  )}
                </AnimatePresence>

                <UniversalFlashcard
                  item={currentItem}
                  isFlipped={isFlipped}
                  onFlip={handleCardFlip}
                  soundEnabled={soundEnabled}
                />
              </div>
            )}

            {/* Bottom Card Controls */}
            <div className="w-full pt-2">
              <div className="flex items-center justify-between gap-3 w-full">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="btn-physical-secondary flex-1 py-3 px-3 sm:px-4 rounded-2xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <button
                  onClick={handleCardFlip}
                  className="btn-physical-secondary flex-1 py-3 px-3 sm:px-4 rounded-2xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5 text-gold" />
                  <span>{isFlipped ? 'Tutup Arti' : 'Balik Kartu'}</span>
                </button>

                <button
                  onClick={handleNext}
                  className="flex-1 py-3 px-3 sm:px-4 rounded-2xl btn-cta text-text-primary font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
                >
                  <span>{currentIndex + 1 === queue.length ? 'Selesai' : 'Berikutnya'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(runnerContent, document.body) : runnerContent;
};
