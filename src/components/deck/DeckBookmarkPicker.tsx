import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Check, Plus, X } from 'lucide-react';
import { UserDeck, DeckItemCategory, DeckType } from '../../types/rpg';
import { playSound } from '../../utils/audio';
import { DEFAULT_BOOKMARK_DECK_ID, ensureUserDecks, createCustomDeck } from '../../utils/decks';

export interface DeckBookmarkPickerProps {
  itemId: string;
  category: DeckItemCategory;
  itemTitle?: string;
  itemSubtitle?: string;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  isDefaultBookmarked?: boolean;
  onToggleDefaultBookmark?: () => void;
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  soundEnabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const DeckBookmarkPicker: React.FC<DeckBookmarkPickerProps> = ({
  itemId,
  category,
  itemTitle,
  itemSubtitle,
  userDecks,
  onToggleDeckItem,
  isDefaultBookmarked = false,
  onToggleDefaultBookmark,
  onToggleBookmark,
  onUpdateDecks,
  soundEnabled = true,
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsCreatingNew(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const allDecks = ensureUserDecks(userDecks);

  // Check if this item is in ANY deck
  const isInAnyDeck = allDecks.some(deck =>
    deck.items.some(it => it.id === itemId && it.category === category)
  ) || isDefaultBookmarked;

  const handleToggle = (deck: UserDeck) => {
    playSound('click', soundEnabled);
    const isDefault = deck.isDefault || deck.id === DEFAULT_BOOKMARK_DECK_ID;

    if (onToggleBookmark) {
      onToggleBookmark(itemId, category, undefined, deck.id);
    } else if (isDefault && onToggleDefaultBookmark) {
      onToggleDefaultBookmark();
    } else if (onToggleDeckItem) {
      onToggleDeckItem(deck.id);
    }
  };

  const handleCreateAndAddDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim() || !onUpdateDecks) return;

    playSound('click', soundEnabled);
    const deckType: DeckType = category === 'kotoba' ? 'kotoba' : category === 'kanji' ? 'kanji' : category === 'bunpou' ? 'bunpou' : 'mixed';
    const { userDecks: updatedDecks } = createCustomDeck(userDecks, {
      title: newDeckTitle.trim(),
      type: deckType,
      coverIcon: category === 'kanji' ? '🈸' : category === 'kotoba' ? '📚' : '📜',
      initialItems: [
        {
          id: itemId,
          category,
          addedAt: new Date().toISOString(),
        }
      ],
    });

    onUpdateDecks(updatedDecks);
    setNewDeckTitle('');
    setIsCreatingNew(false);
  };

  return (
    <>
      {/* Trigger Button: Clean Bookmark Icon */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
          playSound('click', soundEnabled);
        }}
        className={className || (compact
          ? `p-1 sm:p-1.5 rounded-lg border transition-all cursor-pointer ${
              isInAnyDeck
                ? 'bg-surface-elevated text-gold border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.3)]'
                : 'bg-surface-inset text-text-muted hover:text-gold border-border-subtle'
            }`
          : `p-2 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              isInAnyDeck
                ? 'bg-surface-elevated text-gold border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.3)]'
                : 'bg-surface-card border-border-subtle text-text-muted hover:text-gold'
            }`
        )}
        title={isInAnyDeck ? 'Tersimpan di Buku Saku (Klik untuk atur)' : 'Simpan ke Buku Saku'}
        aria-label="Atur Buku Saku"
      >
        <Bookmark className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${isInAnyDeck ? 'fill-gold text-gold' : ''}`} />
      </button>

      {/* Deck Selection Modal / Bottom Sheet via Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            setIsCreatingNew(false);
          }}
        >
          <div
            className="w-full sm:max-w-md bg-surface-elevated panel-stitched border border-border-primary rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Handle */}
            <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto sm:hidden -mt-1 mb-1" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gold/15 border border-border-subtle flex items-center justify-center text-gold shrink-0">
                  <Bookmark className="w-5 h-5 fill-gold" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-heading font-bold text-text-primary flex items-center gap-2 truncate">
                    <span>Simpan ke Buku Saku</span>
                  </h3>
                  <p className="text-xs text-text-muted truncate">
                    {itemTitle ? (
                      <span className="font-semibold text-text-secondary">
                        {itemTitle} {itemSubtitle ? `• ${itemSubtitle}` : ''}
                      </span>
                    ) : (
                      'Pilih deck untuk menambahkan materi ini'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsCreatingNew(false);
                  playSound('click', soundEnabled);
                }}
                className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors shrink-0 cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deck List Scroll Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
              <p className="text-[11px] font-bold text-text-muted tracking-wider uppercase">
                Daftar Buku Saku Kamu ({allDecks.length})
              </p>

              {allDecks.map((deck) => {
                const isIncluded = deck.items.some(
                  it => it.id === itemId && it.category === category
                ) || (Boolean(deck.isDefault || deck.id === DEFAULT_BOOKMARK_DECK_ID) && isDefaultBookmarked);
                const isDefault = deck.isDefault || deck.id === DEFAULT_BOOKMARK_DECK_ID;

                return (
                  <div
                    key={deck.id}
                    onClick={() => handleToggle(deck)}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all select-none ${
                      isIncluded
                        ? 'bg-surface-elevated border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]'
                        : 'bg-surface-inset/80 border-border-subtle hover:border-border-muted hover:bg-surface-card text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {deck.coverIcon || (isDefault ? '🔖' : '📖')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-heading font-bold truncate ${isIncluded ? 'text-gold' : 'text-text-primary'}`}>
                            {deck.title}
                          </p>
                          {isDefault && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-text-muted shrink-0">
                              Utama
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">
                          {deck.items.length} materi tersimpan
                        </p>
                      </div>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 transition-all ${
                        isIncluded
                          ? 'seg-active text-gold scale-105'
                          : 'border-border-muted bg-surface-card/60'
                      }`}
                    >
                      {isIncluded && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Deck Section */}
            {onUpdateDecks && (
              <div className="pt-2 border-t border-border-subtle">
                {!isCreatingNew ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(true);
                      playSound('click', soundEnabled);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border-muted hover:border-border-primary text-text-secondary hover:text-gold text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-surface-inset/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Buat Buku Saku Baru</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateAndAddDeck} className="space-y-2">
                    <p className="text-xs font-bold text-text-primary">Judul Buku Saku Baru:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Contoh: Kanji Sulit N5..."
                        value={newDeckTitle}
                        onChange={(e) => setNewDeckTitle(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-hidden text-text-primary"
                        maxLength={40}
                      />
                      <button
                        type="submit"
                        disabled={!newDeckTitle.trim()}
                        className="btn-physical-primary px-3.5 py-2 text-xs font-bold rounded-xl disabled:opacity-40 transition-all cursor-pointer shrink-0"
                      >
                        Buat & Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNew(false);
                          setNewDeckTitle('');
                        }}
                        className="btn-physical-secondary p-2 text-xs rounded-xl"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Bottom Done Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCreatingNew(false);
                playSound('click', soundEnabled);
              }}
              className="btn-physical-secondary w-full py-3 rounded-2xl font-heading font-bold text-xs tracking-wider transition-colors cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
