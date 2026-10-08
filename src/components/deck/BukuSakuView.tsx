import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Plus,
  ArrowLeft,
  Trash2,
  Edit2,
  PenTool,
  Play,
  Search,
  BookOpen,
  Bookmark,
  Layers,
  X,
} from 'lucide-react';
import { UserDeck, DeckItemCategory, DeckType, DeckItemRef } from '../../types/rpg';
import { OfficialBook, OfficialChapter } from '../../types/books';
import {
  OFFICIAL_BOOKS,
  chapterToUserDeck,
  bookToFullUserDeck,
  cloneChapterToUserDecks,
} from '../../data/officialBooks';
import { BookshelfView } from './BookshelfView';
import { BookDetailView } from './BookDetailView';
import { KotobaItem, KanjiItem, BunpouItem, ItemMasteryRecord } from '../../types/content';
import {
  ensureUserDecks,
  createCustomDeck,
  updateCustomDeck,
  deleteCustomDeck,
  addItemToDeck,
  removeItemFromDeck,
  addMultipleItemsToDeck,
  importBookmarkItemsToDeck,
  clearDeckItems,
  generatePresetDeckItems,
  resolveDeckItem,
  ResolvedDeckItem,
  DEFAULT_BOOKMARK_DECK_ID,
  toggleBookmarkItem,
} from '../../utils/decks';
import { playSound } from '../../utils/audio';
import { CreateDeckModal } from './CreateDeckModal';
import { AIDeckCustomizerModal } from './AIDeckCustomizerModal';
import { DeckAddItemModal } from './DeckAddItemModal';
import { DeckFlashcardRunner } from './DeckFlashcardRunner';
import { DeckWritingRunner } from './DeckWritingRunner';
import { DeckDetailView } from './DeckDetailView';
import { UniversalEntityModal } from '../modals/UniversalEntityModal';
import { KotobaDetailModal } from '../library/KotobaDetailModal';
import { KanjiDetailModal } from '../library/KanjiDetailModal';
import { BunpouDetailModal } from '../library/BunpouDetailModal';


interface BukuSakuViewProps {
  userDecks?: UserDeck[];
  onUpdateDecks: (decks: UserDeck[]) => void;
  resetSignal?: number;
  onRewardPlayer?: (exp: number, gold: number) => void;
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
  playerMp?: number;
  playerMaxMp?: number;
  playerInt?: number;
  playerStr?: number;
  playerHp?: number;
  playerMaxHp?: number;
  onUseMp?: (amount: number) => boolean;
  onHpDamage?: (amount: number) => void;
  onGameOver?: () => void;
  onStartRemediationRecall?: (itemIds: string[]) => void;
  itemMastery?: Record<string, ItemMasteryRecord>;
  furiganaEnabled?: boolean;
  initialSubTab?: 'my_pocket' | 'official_books';
  onSubTabChange?: (tab: 'my_pocket' | 'official_books') => void;
}

export const BukuSakuView: React.FC<BukuSakuViewProps> = ({
  userDecks,
  onUpdateDecks,
  resetSignal,
  onRewardPlayer,
  onCompleteStudyItem,
  soundEnabled = true,
  playerMp = 100,
  playerMaxMp = 100,
  playerInt = 10,
  playerStr = 10,
  playerHp = 100,
  playerMaxHp = 100,
  onUseMp = () => true,
  onHpDamage,
  onGameOver,
  onStartRemediationRecall,
  itemMastery = {},
  furiganaEnabled = true,
  initialSubTab,
  onSubTabChange,
}) => {
  const decks = useMemo(() => ensureUserDecks(userDecks), [userDecks]);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'my_pocket' | 'official_books'>(initialSubTab || 'my_pocket');
  const [selectedOfficialBook, setSelectedOfficialBook] = useState<OfficialBook | null>(null);
  const [activeOfficialDeck, setActiveOfficialDeck] = useState<UserDeck | null>(null);
  const [clonedSuccessChapterId, setClonedSuccessChapterId] = useState<string | null>(null);
  const [virtualRunnerDeck, setVirtualRunnerDeck] = useState<UserDeck | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Reset to initial Deck List screen when navbar triggers reset
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setSelectedDeckId(null);
      setSelectedOfficialBook(null);
      setActiveOfficialDeck(null);
      setVirtualRunnerDeck(null);
      setActiveRunner(null);
      setIsCreateModalOpen(false);
      setIsAddItemModalOpen(false);
      setEditingDeck(null);
      setInspectedEntity(null);
      setSelectedKotoba(null);
      setSelectedKanji(null);
      setSelectedBunpou(null);
      setIsAiCustomizerOpen(false);
    }
  }, [resetSignal]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiCustomizerOpen, setIsAiCustomizerOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<UserDeck | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeRunner, setActiveRunner] = useState<'flashcard' | 'writing' | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kotoba' | 'kanji' | 'bunpou'>('all');
  const [deckSearch, setDeckSearch] = useState('');

  // Quick preset generator modal for active deck
  const [isQuickPresetModalOpen, setIsQuickPresetModalOpen] = useState(false);
  const [quickPresetLevel, setQuickPresetLevel] = useState<'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Kaigo'>('N5');
  const [quickPresetCount, setQuickPresetCount] = useState<number>(10);

  // Item detail inspection modals (Universal Pluggable Inspector)
  const [inspectedEntity, setInspectedEntity] = useState<any | null>(null);
  const [selectedKotoba, setSelectedKotoba] = useState<KotobaItem | null>(null);
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);
  const [selectedBunpou, setSelectedBunpou] = useState<BunpouItem | null>(null);


  // Handlers for Official Books & Chapters
  const handleCloneChapter = (chapter: OfficialChapter) => {
    if (!selectedOfficialBook) return;
    const { updatedDecks } = cloneChapterToUserDecks(chapter, selectedOfficialBook, decks);
    onUpdateDecks(updatedDecks);
    setClonedSuccessChapterId(chapter.id);
    playSound('levelup', soundEnabled);
    setTimeout(() => setClonedSuccessChapterId(null), 2500);
  };

  const handlePlayChapterFlashcard = (chapter: OfficialChapter) => {
    if (!selectedOfficialBook) return;
    const virtualDeck = chapterToUserDeck(chapter, selectedOfficialBook);
    setVirtualRunnerDeck(virtualDeck);
    setActiveRunner('flashcard');
  };

  const handlePlayChapterWriting = (chapter: OfficialChapter) => {
    if (!selectedOfficialBook) return;
    const virtualDeck = chapterToUserDeck(chapter, selectedOfficialBook);
    setVirtualRunnerDeck(virtualDeck);
    setActiveRunner('writing');
  };

  const handlePlayFullBook = (book: OfficialBook) => {
    const fullDeck = bookToFullUserDeck(book);
    setVirtualRunnerDeck(fullDeck);
    setActiveRunner('flashcard');
  };

  // Active selected deck object
  const activeDeck = useMemo(() => {
    if (!selectedDeckId) return null;
    return decks.find(d => d.id === selectedDeckId) || null;
  }, [decks, selectedDeckId]);

  // Resolved items for active deck
  const resolvedItems = useMemo(() => {
    if (!activeDeck) return [];
    return activeDeck.items
      .map(ref => resolveDeckItem(ref))
      .filter((it): it is ResolvedDeckItem => it !== null);
  }, [activeDeck]);

  // Filtered items inside active deck (category + search)
  const displayedItems = useMemo(() => {
    let list = resolvedItems;
    if (categoryFilter !== 'all') {
      list = list.filter(it => it.category === categoryFilter);
    }
    const q = deckSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(it =>
        it.displayTitle.toLowerCase().includes(q) ||
        (it.displayReading && it.displayReading.toLowerCase().includes(q)) ||
        it.displayMeaning.toLowerCase().includes(q)
      );
    }
    return list;
  }, [resolvedItems, categoryFilter, deckSearch]);

  // Overall Statistics across all decks
  const statsSummary = useMemo(() => {
    let totalItems = 0;
    let kotobaCount = 0;
    let kanjiCount = 0;
    let bunpouCount = 0;

    for (const d of decks) {
      for (const it of d.items) {
        totalItems++;
        if (it.category === 'kotoba') kotobaCount++;
        else if (it.category === 'kanji') kanjiCount++;
        else if (it.category === 'bunpou') bunpouCount++;
      }
    }

    return { totalDecks: decks.length, totalItems, kotobaCount, kanjiCount, bunpouCount };
  }, [decks]);

  // Handlers for Deck Management
  const handleSaveDeck = (data: {
    title: string;
    description: string;
    type: DeckType;
    coverIcon: string;
    initialItems?: DeckItemRef[];
  }) => {
    if (editingDeck) {
      const updated = updateCustomDeck(decks, editingDeck.id, data);
      onUpdateDecks(updated);
      setEditingDeck(null);
    } else {
      const { userDecks: updated, newDeck } = createCustomDeck(decks, data);
      onUpdateDecks(updated);
      setSelectedDeckId(newDeck.id);
      playSound('correct', soundEnabled);
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    if (window.confirm('Hapus deck ini beserta daftar latihannya?')) {
      playSound('click', soundEnabled);
      const updated = deleteCustomDeck(decks, deckId);
      onUpdateDecks(updated);
      if (selectedDeckId === deckId) {
        setSelectedDeckId(null);
      }
    }
  };

  const handleAddItem = (item: { id: string; category: DeckItemCategory }) => {
    if (!activeDeck) return;
    const updated = addItemToDeck(decks, activeDeck.id, item);
    onUpdateDecks(updated);
  };

  const handleAddMultipleItems = (items: { id: string; category: DeckItemCategory }[]) => {
    if (!activeDeck) return;
    const updated = addMultipleItemsToDeck(decks, activeDeck.id, items);
    onUpdateDecks(updated);
  };

  const handleRemoveItem = (itemId: string, category: DeckItemCategory) => {
    if (!activeDeck) return;
    playSound('click', soundEnabled);
    const updated = removeItemFromDeck(decks, activeDeck.id, itemId, category);
    onUpdateDecks(updated);
  };

  const handleToggleBookmark = (id: string, category: DeckItemCategory, notes?: string) => {
    const { userDecks: updated } = toggleBookmarkItem(decks, id, category, notes);
    onUpdateDecks(updated);
  };


  const handleImportBookmarks = () => {
    if (!activeDeck) return;
    const { userDecks: updated, importedCount } = importBookmarkItemsToDeck(decks, activeDeck.id);
    if (importedCount > 0) {
      playSound('correct', soundEnabled);
      onUpdateDecks(updated);
      alert(`Berhasil mengimpor ${importedCount} materi baru dari Buku Saku Bookmark!`);
    } else {
      alert('Semua materi dari Bookmark sudah ada di dalam deck ini.');
    }
  };

  const handleClearDeck = () => {
    if (!activeDeck) return;
    if (window.confirm('Kosongkan semua materi dari deck ini? (Deck tidak akan terhapus)')) {
      playSound('click', soundEnabled);
      const updated = clearDeckItems(decks, activeDeck.id);
      onUpdateDecks(updated);
    }
  };

  const handleApplyQuickPreset = () => {
    if (!activeDeck) return;
    const items = generatePresetDeckItems({
      type: activeDeck.type || 'mixed',
      level: quickPresetLevel,
      count: quickPresetCount,
    });
    const updated = addMultipleItemsToDeck(decks, activeDeck.id, items);
    onUpdateDecks(updated);
    setIsQuickPresetModalOpen(false);
    playSound('correct', soundEnabled);
  };

  const writableCount = useMemo(() => {
    return resolvedItems.filter(it => it.category === 'kanji' || it.category === 'kotoba').length;
  }, [resolvedItems]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Runner Modes */}
      {activeRunner === 'flashcard' && (virtualRunnerDeck || activeDeck) && (
        <DeckFlashcardRunner
          deck={virtualRunnerDeck || activeDeck!}
          onClose={() => {
            setActiveRunner(null);
            setVirtualRunnerDeck(null);
          }}
          onReward={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          soundEnabled={soundEnabled}
        />
      )}

      {activeRunner === 'writing' && (virtualRunnerDeck || activeDeck) && (
        <DeckWritingRunner
          deck={virtualRunnerDeck || activeDeck!}
          onClose={() => {
            setActiveRunner(null);
            setVirtualRunnerDeck(null);
          }}
          onReward={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Main Container */}
      {!activeDeck ? (
        <div className="space-y-6">
          {/* Sub-Tab Navigation Bar: Buku Saku Saya vs Buku Kurikulum Resmi */}
          <div className="panel p-1.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-2 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('my_pocket');
                onSubTabChange?.('my_pocket');
                setSelectedOfficialBook(null);
                playSound('click', soundEnabled);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all ${
                activeSubTab === 'my_pocket'
                  ? 'bg-surface-card text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Bookmark className={`w-4 h-4 shrink-0 ${activeSubTab === 'my_pocket' ? 'text-gold fill-gold' : ''}`} />
              <span>Buku Saku Saya ({decks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('official_books');
                onSubTabChange?.('official_books');
                playSound('click', soundEnabled);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all ${
                activeSubTab === 'official_books'
                  ? 'bg-surface-card text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <BookOpen className={`w-4 h-4 shrink-0 ${activeSubTab === 'official_books' ? 'text-gold' : ''}`} />
              <span>Buku Kurikulum Resmi ({OFFICIAL_BOOKS.length})</span>
            </button>
          </div>

          {activeSubTab === 'official_books' ? (
            activeOfficialDeck ? (
              <DeckDetailView
                deck={activeOfficialDeck}
                isTemplate={true}
                onBack={() => {
                  setActiveOfficialDeck(null);
                  playSound('click', soundEnabled);
                }}
                onCloneTemplate={() => {
                  const ch = selectedOfficialBook?.chapters.find(c => c.id === activeOfficialDeck.id);
                  if (ch && selectedOfficialBook) {
                    handleCloneChapter(ch);
                  }
                }}
                isCloned={selectedOfficialBook ? clonedSuccessChapterId === activeOfficialDeck.id : false}
                soundEnabled={soundEnabled}
                userDecks={decks}
                itemMastery={itemMastery}
                furiganaEnabled={furiganaEnabled}
                onRewardPlayer={onRewardPlayer}
                onCompleteStudyItem={onCompleteStudyItem}
              />
            ) : selectedOfficialBook ? (
              <BookDetailView
                book={selectedOfficialBook}
                onBack={() => {
                  setSelectedOfficialBook(null);
                  playSound('click', soundEnabled);
                }}
                onSelectChapterDeck={(chapter) => {
                  const virtualDeck = chapterToUserDeck(chapter, selectedOfficialBook);
                  setActiveOfficialDeck(virtualDeck);
                  playSound('click', soundEnabled);
                }}
                onCloneChapter={handleCloneChapter}
                clonedSuccessChapterId={clonedSuccessChapterId}
                soundEnabled={soundEnabled}
                itemMastery={itemMastery}
              />
            ) : (
              <BookshelfView
                onSelectBook={(b) => {
                  setSelectedOfficialBook(b);
                  playSound('click', soundEnabled);
                }}
                soundEnabled={soundEnabled}
                itemMastery={itemMastery}
              />
            )
          ) : (
            <>
              {/* Header & Stats Banner */}
              <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm border border-border-subtle">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  Buku Catatan Mandiri & Sistem Koleksi
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide flex items-center gap-2.5">
                  <span className="text-gold">手帳</span>
                  <span>Buku Saku Petualang</span>
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Kelola koleksi bookmark, buat deck kustom dengan preset otomatis, dan latih hafalanmu secara intensif.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsAiCustomizerOpen(true);
                    playSound('click', soundEnabled);
                  }}
                  className="btn-physical-primary py-2.5 px-4 rounded-2xl text-xs font-heading font-bold flex items-center gap-2 cursor-pointer"
                >
                  <span>Buat Deck AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingDeck(null);
                    setIsCreateModalOpen(true);
                    playSound('click', soundEnabled);
                  }}
                  className="btn-physical-secondary py-2.5 px-4 rounded-2xl text-xs font-heading font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-gold" />
                  <span>Buat Deck Baru</span>
                </button>
              </div>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="pt-2 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Total Deck</span>
                <p className="text-base font-bold font-mono text-text-primary">{statsSummary.totalDecks}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Total Materi Tersimpan</span>
                <p className="text-base font-bold font-mono text-gold">{statsSummary.totalItems}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Kosakata Disimpan</span>
                <p className="text-base font-bold font-mono text-text-primary">{statsSummary.kotobaCount}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase">Kanji & Pola Kalimat</span>
                <p className="text-base font-bold font-mono text-text-primary">{statsSummary.kanjiCount + statsSummary.bunpouCount}</p>
              </div>
            </div>
          </div>

          {/* Grid of Decks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => {
              const isDefault = deck.isDefault || deck.id === DEFAULT_BOOKMARK_DECK_ID;
              const itemCount = deck.items.length;
              const kotobaCount = deck.items.filter(it => it.category === 'kotoba').length;
              const kanjiCount = deck.items.filter(it => it.category === 'kanji').length;
              const bunpouCount = deck.items.filter(it => it.category === 'bunpou').length;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    setSelectedDeckId(deck.id);
                    setCategoryFilter('all');
                    setDeckSearch('');
                    playSound('click', soundEnabled);
                  }}
                  className={`panel panel-stitched p-5 rounded-3xl border cursor-pointer group transition-all duration-200 flex flex-col justify-between hover:shadow-lg ${
                    isDefault
                      ? 'border-border-subtle bg-surface-card hover:border-border-primary'
                      : 'border-border-subtle hover:border-border-primary bg-surface-card'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Icon, Badge, and Quick Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner shrink-0">
                          {isDefault ? (
                            <Bookmark className="w-5 h-5 text-gold" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-text-secondary" />
                          )}
                        </div>
                        <div>
                          {isDefault ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-border-subtle">
                              <Bookmark className="w-3 h-3 text-gold" />
                              <span>Bookmark Utama</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-text-secondary bg-surface-inset px-2 py-0.5 rounded-md border border-border-subtle">
                              {deck.type || 'mixed'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Options menu (for custom decks) */}
                      {!isDefault && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingDeck(deck);
                              setIsCreateModalOpen(true);
                              playSound('click', soundEnabled);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors"
                            title="Edit Deck"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeck(deck.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-wine-accent hover:bg-surface-inset transition-colors"
                            title="Hapus Deck"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-heading font-bold text-base text-text-primary group-hover:text-gold transition-colors line-clamp-2">
                        {deck.title}
                      </h3>
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between text-xs">
                    <div className="text-[11px] font-mono text-text-muted">
                      {itemCount === 0 ? (
                        <span>0 materi</span>
                      ) : (
                        <span>
                          {itemCount} materi ({kotobaCount} 語 • {kanjiCount} 字 • {bunpouCount} 文)
                        </span>
                      )}
                    </div>

                    <span className="font-heading font-bold text-xs text-text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Buka Deck &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  ) : activeDeck ? (
        <DeckDetailView
          deck={activeDeck}
          isTemplate={false}
          onBack={() => {
            setSelectedDeckId(null);
            setDeckSearch('');
            playSound('click', soundEnabled);
          }}
          onEditDeck={(d) => {
            setEditingDeck(d);
            setIsCreateModalOpen(true);
            playSound('click', soundEnabled);
          }}
          onDeleteDeck={handleDeleteDeck}
          onOpenAddItemModal={() => {
            setIsAddItemModalOpen(true);
            playSound('click', soundEnabled);
          }}
          onOpenQuickPresetModal={() => {
            setIsQuickPresetModalOpen(true);
            playSound('click', soundEnabled);
          }}
          onImportBookmarks={handleImportBookmarks}
          onRemoveItemFromDeck={handleRemoveItem}
          onClearDeck={handleClearDeck}
          onToggleBookmark={(id, cat) => {
            const { userDecks: updated } = toggleBookmarkItem(decks, id, cat);
            onUpdateDecks(updated);
          }}
          soundEnabled={soundEnabled}
          userDecks={decks}
          itemMastery={itemMastery}
          furiganaEnabled={furiganaEnabled}
          onRewardPlayer={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      ) : null}

      {/* Modals */}
      <CreateDeckModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDeck(null);
        }}
        onSave={handleSaveDeck}
        editingDeck={editingDeck}
        userDecks={decks}
        soundEnabled={soundEnabled}
        onOpenAiCustomizer={() => {
          setIsCreateModalOpen(false);
          setIsAiCustomizerOpen(true);
        }}
      />

      <AIDeckCustomizerModal
        isOpen={isAiCustomizerOpen}
        onClose={() => setIsAiCustomizerOpen(false)}
        onSaveDeck={(newDeck) => {
          const currentDecks = ensureUserDecks(userDecks);
          const updated = [newDeck, ...currentDecks];
          onUpdateDecks(updated);
          setSelectedDeckId(newDeck.id);
          setIsAiCustomizerOpen(false);
          playSound('levelup', soundEnabled);
        }}
        soundEnabled={soundEnabled}
      />

      {activeDeck && (
        <DeckAddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          targetDeck={activeDeck}
          onAddItem={handleAddItem}
          onAddMultipleItems={handleAddMultipleItems}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Quick Preset Generator Modal for Active Deck */}
      {isQuickPresetModalOpen && activeDeck && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-surface-ground/80 animate-fade-in">
          <div className="panel panel-stitched w-full max-w-md border border-border-subtle rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" />
                <h3 className="font-heading font-bold text-base text-text-primary">
                  Isi Cepat Preset JLPT
                </h3>
              </div>
              <button
                onClick={() => setIsQuickPresetModalOpen(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Target Level JLPT
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['all', 'N5', 'N4', 'N3', 'N2', 'N1', 'Kaigo'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setQuickPresetLevel(lvl)}
                      className={`flex-1 min-w-[42px] py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        quickPresetLevel === lvl
                          ? 'bg-surface-elevated text-gold border-border-subtle shadow-sm'
                          : 'bg-surface-inset text-text-muted border-border-subtle'
                      }`}
                    >
                      {lvl === 'all' ? 'Semua' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Jumlah Materi Ditambahkan
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 30, 50].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuickPresetCount(cnt)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        quickPresetCount === cnt
                          ? 'bg-surface-elevated text-text-primary border-border-primary'
                          : 'bg-surface-inset text-text-muted border-border-subtle'
                      }`}
                    >
                      {cnt} Item
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-text-secondary">
                Materi akan disaring sesuai tipe deck (<strong>{activeDeck.type}</strong>) dan dimasukkan langsung ke dalam deck ini tanpa menghapus materi yang sudah ada.
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickPresetModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-inset"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyQuickPreset}
                className="btn-physical-secondary px-4 py-1.5 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-gold" />
                <span>Tambahkan {quickPresetCount} Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Pluggable Entity Modal (ECS Inspector) */}
      <UniversalEntityModal
        isOpen={Boolean(inspectedEntity)}
        entity={inspectedEntity}
        onClose={() => setInspectedEntity(null)}
        soundEnabled={soundEnabled}
        userDecks={decks}
        onToggleBookmark={handleToggleBookmark}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* Legacy Fallback Item Detail Modals */}
      <KotobaDetailModal
        isOpen={Boolean(selectedKotoba)}
        item={selectedKotoba}
        onClose={() => setSelectedKotoba(null)}
        soundEnabled={soundEnabled}
        masteryRecord={selectedKotoba ? itemMastery?.[selectedKotoba.id] : undefined}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
        userDecks={decks}
      />

      <KanjiDetailModal
        isOpen={Boolean(selectedKanji)}
        item={selectedKanji}
        onClose={() => setSelectedKanji(null)}
        soundEnabled={soundEnabled}
      />


      <AnimatePresence>
        {selectedBunpou && (
          <BunpouDetailModal
            item={selectedBunpou}
            onClose={() => setSelectedBunpou(null)}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
