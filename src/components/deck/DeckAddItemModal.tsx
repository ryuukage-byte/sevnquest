import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Check, CheckSquare, Square } from 'lucide-react';
import { UserDeck, DeckItemCategory } from '../../types/rpg';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { playSound } from '../../utils/audio';
import { searchJapanese } from '../../engine/search/universalSearch';
import { JapaneseSearchInput } from '../common/JapaneseSearchInput';
import { useBackButton } from '../../hooks/useBackButton';

interface SearchResultItem {
  id: string;
  category: DeckItemCategory;
  title: string;
  reading?: string;
  meaning: string;
  level: string;
}

interface DeckAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDeck: UserDeck;
  onAddItem: (item: { id: string; category: DeckItemCategory }) => void;
  onAddMultipleItems?: (items: { id: string; category: DeckItemCategory }[]) => void;
  soundEnabled?: boolean;
}

export const DeckAddItemModal: React.FC<DeckAddItemModalProps> = ({
  isOpen,
  onClose,
  targetDeck,
  onAddItem,
  onAddMultipleItems,
  soundEnabled = true,
}) => {
  useBackButton(isOpen, () => {
    onClose();
  }, 'deck_add_item_modal');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kotoba' | 'kanji' | 'bunpou'>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Set of existing item keys: "category:id"
  const existingItemKeys = useMemo(() => {
    return new Set(targetDeck.items.map(it => `${it.category}:${it.id}`));
  }, [targetDeck.items]);

  // Unified list of searchable items
  // Hanya dibangun saat modal dibuka (sebelumnya ikut dibangun setiap Buku Saku dibuka).
  const allSearchableItems: SearchResultItem[] = useMemo(() => {
    const results: SearchResultItem[] = [];
    if (!isOpen) return results;

    // Kotoba
    for (const item of Object.values(KOTOBA_DATABASE)) {
      results.push({
        id: item.id,
        category: 'kotoba',
        title: item.word,
        reading: item.reading,
        meaning: item.meaningId || item.meaningEn || '',
        level: item.jlpt || 'N5',
      });
    }

    // Kanji
    const seenKanji = new Set<string>();
    for (const item of Object.values(KANJI_DATABASE)) {
      if (item && item.character && !seenKanji.has(item.character)) {
        seenKanji.add(item.character);
        const kunStr = (item.kunyomi || []).join('、');
        const onStr = (item.onyomi || []).join('、');
        const reading = [kunStr, onStr].filter(Boolean).join(' | ');

        results.push({
          id: item.id || item.character,
          category: 'kanji',
          title: item.character,
          reading,
          meaning: item.meaningId || item.meaningEn || '',
          level: item.jlpt || 'N5',
        });
      }
    }

    // Bunpou
    for (const item of Object.values(BUNPOU_DATABASE)) {
      results.push({
        id: item.id,
        category: 'bunpou',
        title: item.title,
        reading: item.formula,
        meaning: item.meaningId || '',
        level: item.level || 'N3',
      });
    }

    return results;
  }, [isOpen]);

  const itemByKey = useMemo(
    () => new Map(allSearchableItems.map(it => [`${it.category}:${it.id}`, it])),
    [allSearchableItems]
  );

  const filteredItems = useMemo(() => {
    const passes = (item: SearchResultItem) =>
      (categoryFilter === 'all' || item.category === categoryFilter) &&
      (levelFilter === 'all' || item.level === levelFilter);

    // Pencarian: engine universal (romaji/kana/kanji/arti, terurut relevansi, ID kanonik).
    if (searchQuery.trim()) {
      const hits = searchJapanese(searchQuery, {
        entityTypes: categoryFilter === 'all' ? undefined : [categoryFilter],
        limit: Infinity,
      });
      const out: SearchResultItem[] = [];
      for (const hit of hits) {
        const item = itemByKey.get(`${hit.entityType}:${hit.entityId}`);
        if (item && passes(item)) out.push(item);
      }
      return out;
    }

    return allSearchableItems.filter(passes);
  }, [allSearchableItems, itemByKey, searchQuery, categoryFilter, levelFilter]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  // Non-existing displayed items that can be selected
  const selectableDisplayed = useMemo(() => {
    return displayedItems.filter(it => !existingItemKeys.has(`${it.category}:${it.id}`));
  }, [displayedItems, existingItemKeys]);

  if (!isOpen) return null;

  const handleToggleSelectKey = (key: string) => {
    playSound('click', soundEnabled);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    playSound('click', soundEnabled);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      const allSelected = selectableDisplayed.every(it => next.has(`${it.category}:${it.id}`));
      if (allSelected) {
        // Deselect visible
        selectableDisplayed.forEach(it => next.delete(`${it.category}:${it.id}`));
      } else {
        // Select all visible
        selectableDisplayed.forEach(it => next.add(`${it.category}:${it.id}`));
      }
      return next;
    });
  };

  const handleAddBatch = () => {
    if (selectedKeys.size === 0) return;
    playSound('correct', soundEnabled);

    const itemsToAdd = Array.from(selectedKeys).map(k => {
      const [category, id] = k.split(':');
      return { id, category: category as DeckItemCategory };
    });

    if (onAddMultipleItems) {
      onAddMultipleItems(itemsToAdd);
    } else {
      itemsToAdd.forEach(it => onAddItem(it));
    }

    setSelectedKeys(new Set());
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] p-3 sm:p-4 bg-surface-ground/80 flex justify-center items-center animate-fade-in">
          {/* Backdrop Click */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="w-full max-w-2xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] relative bg-surface-card"
          >
            {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-inset shrink-0">
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                <span>{targetDeck.coverIcon || '📖'}</span>
                <span>Tambah Materi ke &quot;{targetDeck.title}&quot;</span>
              </h3>
              <p className="text-xs text-text-secondary">
                Cari dan tambahkan materi satuan atau gunakan centang multi-pilih
              </p>
            </div>

            <button
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-border-subtle space-y-3 bg-surface-card shrink-0">
            <JapaneseSearchInput
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); setVisibleCount(30); }}
              placeholderIme="Cari kanji, kata, pola (romaji → kana)..."
              placeholderLatin="Cari kanji, kata, pola, arti..."
              soundEnabled={soundEnabled}
              className="w-full"
              inputClassName="w-full pl-10 pr-20 py-2.5 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-xs sm:text-sm text-text-primary font-medium font-jp"
            />

            <div className="flex flex-wrap items-center gap-2 pb-1">
              {/* Category Pills */}
              {[
                { id: 'all', label: 'Semua Kategori' },
                { id: 'kotoba', label: 'Kosakata' },
                { id: 'kanji', label: 'Kanji' },
                { id: 'bunpou', label: 'Tata Bahasa' },
              ].map((c) => {
                const isSelected = categoryFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategoryFilter(c.id as any);
                      setVisibleCount(30);
                      playSound('click', soundEnabled);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all border shrink-0 ${
                      isSelected
                        ? 'bg-surface-elevated text-text-primary border-border-primary shadow-sm font-black'
                        : 'bg-surface-inset text-text-secondary border-border-subtle hover:text-text-primary'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}

              <div className="h-4 w-px bg-border-subtle shrink-0 mx-1" />

              {/* Level Filter */}
              {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => {
                const isSelected = levelFilter === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      setLevelFilter(lvl);
                      setVisibleCount(30);
                      playSound('click', soundEnabled);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border shrink-0 ${
                      isSelected
                        ? 'bg-surface-elevated text-gold border-border-subtle'
                        : 'bg-surface-inset/60 text-text-muted border-border-subtle hover:text-text-secondary'
                    }`}
                  >
                    {lvl === 'all' ? 'Semua JLPT' : lvl}
                  </button>
                );
              })}
            </div>

            {/* Multi-Select Toolbar */}
            {selectableDisplayed.length > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-text-secondary hover:text-text-primary font-bold flex items-center gap-1.5 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-gold" />
                  <span>
                    {selectableDisplayed.every(it => selectedKeys.has(`${it.category}:${it.id}`))
                      ? 'Batal Pilih Semua'
                      : `Pilih Semua Ditampilkan (${selectableDisplayed.length})`}
                  </span>
                </button>

                {selectedKeys.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKeys(new Set())}
                    className="text-wine-accent hover:underline text-[11px]"
                  >
                    Bersihkan Pilihan ({selectedKeys.size})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5 pb-20">
            {displayedItems.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-xs">
                Tidak ada materi yang cocok dengan pencarian &quot;{searchQuery}&quot;
              </div>
            ) : (
              <>
                <p className="text-[11px] font-mono text-text-muted px-1">
                  Menampilkan {displayedItems.length} dari {filteredItems.length} hasil
                </p>

                <div className="space-y-2">
                  {displayedItems.map((item) => {
                    const key = `${item.category}:${item.id}`;
                    const isAlreadyInDeck = existingItemKeys.has(key);
                    const isSelected = selectedKeys.has(key);

                    return (
                      <div
                        key={key}
                        onClick={() => {
                          if (!isAlreadyInDeck) {
                            handleToggleSelectKey(key);
                          }
                        }}
                        className={`panel p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          isAlreadyInDeck
                            ? 'border-border-subtle opacity-65 cursor-default'
                            : isSelected
                            ? 'bg-surface-elevated border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)] cursor-pointer'
                            : 'border-border-subtle hover:border-border-primary cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {!isAlreadyInDeck ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectKey(key);
                              }}
                              className="text-gold shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-gold" />
                              ) : (
                                <Square className="w-5 h-5 text-text-muted hover:text-text-secondary" />
                              )}
                            </button>
                          ) : (
                            <div className="w-5 h-5 rounded flex items-center justify-center bg-surface-inset border border-border-subtle shrink-0">
                              <Check className="w-3.5 h-3.5 text-text-muted" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border border-border-subtle bg-surface-inset text-text-secondary">
                                {item.category}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border border-border-subtle bg-surface-inset text-text-primary">
                                {item.level}
                              </span>
                              {item.reading && (
                                <span className="text-[11px] font-mono text-text-secondary truncate max-w-[200px]">
                                  {item.reading}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm sm:text-base font-jp text-text-primary">
                              {item.title}
                            </h4>
                            <p className="text-xs text-text-secondary truncate">
                              {item.meaning}
                            </p>
                          </div>
                        </div>

                        {/* Fast Single Add Button */}
                        <button
                          disabled={isAlreadyInDeck}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSound('click', soundEnabled);
                            onAddItem({ id: item.id, category: item.category });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 transition-all shrink-0 ${
                            isAlreadyInDeck
                              ? 'bg-surface-inset text-text-muted border border-border-subtle cursor-default'
                              : 'bg-surface-inset hover:bg-surface-elevated text-text-primary border border-border-subtle hover:border-border-primary shadow-sm'
                          }`}
                        >
                          {isAlreadyInDeck ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-gold" />
                              <span>Sudah Ada</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Tambah</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {displayedItems.length < filteredItems.length && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 30)}
                      className="btn-physical-secondary px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      Muat Lebih Banyak ({filteredItems.length - displayedItems.length} sisa)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Floating Bottom Batch Action Bar */}
          {selectedKeys.size > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-3 left-4 right-4 p-3 rounded-2xl bg-surface-elevated border border-border-primary shadow-2xl flex items-center justify-between gap-3 z-10"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-bold text-text-primary">
                  {selectedKeys.size} materi siap ditambahkan
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKeys(new Set())}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-inset"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddBatch}
                  className="btn-physical-secondary px-4 py-1.5 rounded-xl text-xs font-heading font-bold text-gold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Semua ({selectedKeys.size})</span>
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
