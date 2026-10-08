import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ArrowLeft, ArrowRight, Trophy, PenTool, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserDeck } from '../../types/rpg';
import { resolveDeckItem, ResolvedDeckItem } from '../../utils/decks';
import { UniversalWritingCard } from '../learning/UniversalWritingCard';
import { playSound } from '../../utils/audio';
import { asWritable } from '../../engine/traits/traits';

interface DeckWritingRunnerProps {
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

export const DeckWritingRunner: React.FC<DeckWritingRunnerProps> = ({
  deck,
  onClose,
  onReward,
  onCompleteStudyItem,
  soundEnabled = true,
}) => {
  // Resolve writable items by capability trait (ECS System model)
  const writableItems = useMemo(() => {
    return (deck.items || [])
      .map(ref => resolveDeckItem(ref))
      .filter((it): it is ResolvedDeckItem => it !== null && asWritable(it) !== null);
  }, [deck.items]);


  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [isFinishedAll, setIsFinishedAll] = useState(false);
  const [accumulatedExp, setAccumulatedExp] = useState(0);
  const [accumulatedGold, setAccumulatedGold] = useState(0);
  const [finalRewards, setFinalRewards] = useState<{ exp: number; gold: number } | null>(null);

  const currentItem = writableItems[currentIndex];

  const handleNextItem = (itemExp?: number, itemGold?: number) => {
    playSound('click', soundEnabled);
    if (!completedItems.includes(currentIndex)) {
      setCompletedItems(prev => [...prev, currentIndex]);
      if (currentItem && onCompleteStudyItem) {
        onCompleteStudyItem(
          currentItem.category,
          itemExp ?? 15,
          itemGold ?? 5,
          currentItem.ref.id,
          1,
          1,
          'writing'
        );
      }
    }

    const nextExp = accumulatedExp + (itemExp ?? 15);
    const nextGold = accumulatedGold + (itemGold ?? 5);
    setAccumulatedExp(nextExp);
    setAccumulatedGold(nextGold);

    if (currentIndex + 1 >= writableItems.length) {
      setIsFinishedAll(true);
      playSound('victory', soundEnabled);
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}

      const earnedExp = Math.max(30, nextExp);
      const earnedGold = Math.max(15, nextGold);
      setFinalRewards({ exp: earnedExp, gold: earnedGold });
      if (onReward && !onCompleteStudyItem) {
        onReward(earnedExp, earnedGold);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevItem = () => {
    if (currentIndex > 0) {
      playSound('click', soundEnabled);
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (writableItems.length === 0) {
    const emptyContent = (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-surface-ground/90">
        <div className="panel panel-stitched p-6 rounded-3xl max-w-md w-full border border-border-subtle text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-inset text-gold border border-border-subtle flex items-center justify-center mx-auto">
            <PenTool className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-heading font-bold text-text-primary">Tidak Ada Materi Tulisan</h3>
          <p className="text-xs text-text-secondary">
            Deck ini tidak memiliki materi Kanji atau Kosakata. Tambahkan kanji atau kata untuk memulai latihan menulis.
          </p>
          <button
            onClick={onClose}
            className="btn-physical-secondary px-5 py-2 rounded-xl text-xs font-bold"
          >
            Kembali ke Buku Saku
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
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border-subtle flex items-center justify-between max-w-3xl w-full mx-auto shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{deck.coverIcon || '✍️'}</span>
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-text-primary flex items-center gap-2">
              <span>Latihan Menulis: {deck.title}</span>
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              {isFinishedAll
                ? 'Selesai'
                : `Materi ${currentIndex + 1} dari ${writableItems.length} (${currentItem?.category.toUpperCase()})`}
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

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-start sm:justify-center items-center p-3 sm:p-4 max-w-3xl w-full mx-auto min-h-0">
        {isFinishedAll ? (
          /* Completion Card */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="panel panel-stitched p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-2xl text-center space-y-5 max-w-md w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-inset border border-border-subtle text-gold flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gold">
                Sesi Menulis Selesai
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-text-primary mt-1">
                Latihan Kaligrafi Sukses!
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Kamu telah menyelesaikan latihan menulis {writableItems.length} kanji & kata dalam deck ini.
              </p>
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
                  (Multiplier Menulis)
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setCompletedItems([]);
                  setAccumulatedExp(0);
                  setAccumulatedGold(0);
                  setFinalRewards(null);
                  setIsFinishedAll(false);
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Sesi</span>
              </button>
              <button
                onClick={onClose}
                className="btn-physical-secondary px-6 py-2.5 rounded-xl text-xs font-heading font-bold transition-all"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        ) : (
          /* Active Writing Canvas */
          <div className="w-full space-y-3">
            {/* Render Canvas using Unified UniversalWritingCard with Library-matched Card Framing */}
            {currentItem && (
              <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle bg-surface-card shadow-xl max-w-md w-full mx-auto space-y-3">
                {/* Meta Bar matching Library view */}
                {(() => {
                  const trait = asWritable(currentItem);
                  const isKana = trait?.level === 'KANA' || (trait?.character && trait.character.charCodeAt(0) >= 0x3040 && trait.character.charCodeAt(0) <= 0x30ff);
                  return (
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border-subtle/60 pb-2.5 px-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider text-[10px] border ${
                          isKana
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-border-subtle'
                            : 'bg-surface-inset text-wine-accent border-border-subtle'
                        }`}>
                          {isKana ? 'Aksara Kana' : `${trait?.level || 'N5'} Kanji`}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-surface-inset border border-border-subtle text-text-secondary">
                          {trait?.strokeCount || 1} Goresan
                        </span>
                        {trait?.sourceItem?.radical && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-jp bg-surface-inset border border-border-subtle text-text-muted">
                            {isKana ? 'Kategori: ' : '部首: '}{trait.sourceItem.radical}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-gold font-bold">
                        {currentIndex + 1} / {writableItems.length}
                      </span>
                    </div>
                  );
                })()}

                <div className="w-full flex justify-center">
                  <UniversalWritingCard
                    item={currentItem}
                    soundEnabled={soundEnabled}
                    showStopwatch={true}
                    totalSheets={1}
                    nextButtonLabel={
                      currentIndex + 1 === writableItems.length
                        ? 'Selesaikan Drill'
                        : 'Lanjut ke Materi Berikutnya'
                    }
                    onFinish={(_score, reward) => {
                      handleNextItem(reward?.expGained, reward?.goldGained);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Navigator Controls */}
            <div className="flex items-center justify-between px-2 pt-1">
              <button
                disabled={currentIndex === 0}
                onClick={handlePrevItem}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed border-transparent text-text-muted'
                    : 'bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={() => handleNextItem()}
                className="btn-physical-secondary px-5 py-2 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition-all"
              >
                <span>{currentIndex + 1 === writableItems.length ? 'Selesaikan Drill' : 'Berikutnya'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(runnerContent, document.body) : runnerContent;
};
