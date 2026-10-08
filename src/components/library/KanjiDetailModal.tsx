import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { KanjiItem, KotobaItem, ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';
import { KanjiDetailCard } from '../learning/KanjiDetailCard';
import { WritingRewardResult } from '../../utils/rewards';
import { UserDeck } from '../../types/rpg';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';
import { useBackButton } from '../../hooks/useBackButton';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KotobaDetailModal } from './KotobaDetailModal';

interface KanjiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KanjiItem | null;
  masteryRecord?: ItemMasteryRecord;
  soundEnabled?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onCompleteSheet?: (sheetNumber: number, score: number, reward?: WritingRewardResult) => void;
}

export const KanjiDetailModal: React.FC<KanjiDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  masteryRecord,
  soundEnabled = true,
  isBookmarked = false,
  onToggleBookmark,
  userDecks,
  onToggleDeckItem,
  onUpdateDecks,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  onCompleteSheet,
}) => {
  const [selectedKotobaItem, setSelectedKotobaItem] = useState<KotobaItem | null>(null);

  // Hardware / Mobile Back button support
  useBackButton(isOpen, () => {
    if (selectedKotobaItem) {
      setSelectedKotobaItem(null);
      playSound('click', soundEnabled);
      return false; // Handled child modal, keep kanji modal open
    }
    onClose();
  }, 'kanji_detail_modal');

  const handleSelectKotoba = (wordStr: string) => {
    if (!item) return;
    const found = Object.values(KOTOBA_DATABASE).find(k => k.word === wordStr);
    const target: KotobaItem = found || {
      id: `kotoba_rel_${wordStr}`,
      word: wordStr,
      reading: wordStr,
      meaningId: `Kosakata terkait 「${wordStr}」`,
      meaningEn: `Related word ${wordStr}`,
      meaningJa: wordStr,
      wordType: 'noun',
      jlpt: item.jlpt || 'N5',
      kanjiComponents: Array.from(wordStr).filter(c => /[\u4e00-\u9faf]/.test(c)),
    };
    setSelectedKotobaItem(target);
  };

  if (!isOpen || !item) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="kanji-modal-container"
        className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:p-6"
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto panel p-5 sm:p-7 rounded-3xl border border-border-subtle shadow-2xl z-10 space-y-4"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
        >
          {/* Close button row */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-heading uppercase tracking-wider text-text-secondary">
                Ensiklopedi Aksara & Kanji (Library)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {(onPrev || onNext) && (
                <div className="flex items-center gap-1 mr-1 border-r border-border-subtle pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPrev?.();
                      playSound('click', soundEnabled);
                    }}
                    disabled={!hasPrev}
                    className="btn-physical-secondary p-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Aksara/Kanji Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNext?.();
                      playSound('click', soundEnabled);
                    }}
                    disabled={!hasNext}
                    className="btn-physical-secondary p-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Aksara/Kanji Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <DeckBookmarkPicker
                itemId={item.id || item.character}
                category="kanji"
                itemTitle={item.character}
                itemSubtitle={item.meaningId || (item as any).meaning}
                userDecks={userDecks}
                onToggleDeckItem={onToggleDeckItem}
                isDefaultBookmarked={isBookmarked}
                onToggleDefaultBookmark={onToggleBookmark}
                onUpdateDecks={onUpdateDecks}
                soundEnabled={soundEnabled}
              />
              <button
                onClick={() => {
                  onClose();
                  playSound('click', soundEnabled);
                }}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Canonical Unified Kanji Detail & Studio */}
          <KanjiDetailCard
            key={item.id || item.character}
            item={item}
            masteryRecord={masteryRecord}
            soundEnabled={soundEnabled}
            furiganaEnabled={true}
            initialTab="detail"
            showQuestions={true}
            onCompleteSheet={onCompleteSheet}
            onSelectKotoba={handleSelectKotoba}
            onFinish={() => {
              if (onNext && hasNext) {
                onNext();
              }
            }}
          />
        </motion.div>

        {/* Nested Kotoba Detail Modal when clicking a related word */}
        {selectedKotobaItem && (
          <KotobaDetailModal
            isOpen={!!selectedKotobaItem}
            onClose={() => setSelectedKotobaItem(null)}
            item={selectedKotobaItem}
            soundEnabled={soundEnabled}
            userDecks={userDecks}
            onToggleDeckItem={onToggleDeckItem}
            onUpdateDecks={onUpdateDecks}
          />
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
