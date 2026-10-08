import React, { useState, useMemo } from 'react';
import type { DeckItemCategory } from '../../types/rpg';
import { AnimatePresence } from 'motion/react';
import { Search, Filter, ChevronDown, Bookmark, LayoutGrid, List, BookOpen, Zap, Trash2, ChevronRight } from 'lucide-react';
import { ScrollIcon } from '../ui/EngravingIcons';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { ALL_GRAMMAR_FUNCTION_CATEGORIES } from '../../data/bunpouMetadata';
import { BunpouItem, ItemMasteryRecord } from '../../types/content';
import { BunpouDetailModal } from './BunpouDetailModal';
import { ConjugationDojoView } from './ConjugationDojoView';
import { playSound } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';
import { isItemBookmarked } from '../../utils/decks';
import { getCanonicalGrammarTitle, getGrammarTitleInfo } from '../../utils/bunpouTitleUtils';
import { searchJapanese, createSubsetIndex } from '../../engine/search/universalSearch';
import { JapaneseSearchInput } from '../common/JapaneseSearchInput';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';
import { getBunpouCategoryTags } from '../../utils/bunpouSkillAdapter';

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Level' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

interface BunpouLibraryViewProps {
  items?: BunpouItem[];
  hideHeader?: boolean;
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRemoveItem?: (id: string, category: 'bunpou') => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success?: boolean
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionType?: 'writing' | 'flashcard' | 'quiz'
  ) => void;
}

export const BunpouLibraryView: React.FC<BunpouLibraryViewProps> = ({
  items,
  hideHeader = false,
  soundEnabled = true,
  itemMastery,
  userDecks,
  onToggleBookmark,
  onUpdateDecks,
  onRemoveItem,
  onRewardPlayer,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  const [subSection, setSubSection] = useState<'dictionary' | 'conjugation'>('dictionary');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(40);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [functionFilter, setFunctionFilter] = useState<string>('Semua Fungsi');
  const [selectedItem, setSelectedItem] = useState<BunpouItem | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem('bunpou_library_view_mode');
      return saved === 'compact' ? 'compact' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const handleSetViewMode = (mode: 'cards' | 'compact') => {
    setViewMode(mode);
    try {
      localStorage.setItem('bunpou_library_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const allBunpou = useMemo(() => {
    if (items) return items;
    return Object.values(BUNPOU_DATABASE);
  }, [items]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allBunpou.length, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    for (const item of allBunpou) {
      if (counts[item.level] !== undefined) {
        counts[item.level]++;
      }
    }
    return counts;
  }, [allBunpou]);

  const bunpouSearchIndex = useMemo(() => createSubsetIndex({ bunpou: allBunpou }), [allBunpou]);

  const filteredBunpou = useMemo(() => {
    // Pencarian teks ditangani engine universal (rumus, varian, judul kanonik, romaji, arti, fungsi),
    // hasilnya terurut relevansi. Filter level/fungsi diterapkan sesudahnya.
    const hasQuery = Boolean(searchQuery.trim());
    const candidates = hasQuery
      ? searchJapanese(searchQuery, { entityTypes: ['bunpou'], index: bunpouSearchIndex, limit: Infinity }).map(r => r.entity as BunpouItem)
      : allBunpou;

    return candidates.filter((item) => {
      // 1. Level Filter
      if (levelFilter !== 'all' && item.level !== levelFilter) {
        return false;
      }

      // 2. Function Category Filter
      if (functionFilter !== 'Semua Fungsi') {
        const matchesCategory = item.functions?.some(fn => 
          fn.toLowerCase().includes(functionFilter.toLowerCase())
        );
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [allBunpou, bunpouSearchIndex, levelFilter, functionFilter, searchQuery]);

  const displayedBunpou = useMemo(() => {
    return filteredBunpou.slice(0, visibleCount);
  }, [filteredBunpou, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 40);
    playSound('click', soundEnabled);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header Banner */}
      {!hideHeader && (
        <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary shrink-0 shadow-inner">
              <ScrollIcon className="w-6 h-6 text-text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-wide font-heading">
                Kamus Tata Bahasa (Bunpou)
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary font-medium">
                Kamus {allBunpou.length.toLocaleString()} pola tata bahasa JLPT (N5〜N1) terstruktur berdasarkan fungsi, rumus, dan nuansa.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pr-3 text-xs font-mono text-text-secondary bg-surface-inset px-3 py-1.5 rounded-xl border border-border-subtle">
            <span>{allBunpou.length.toLocaleString()} Pola</span>
          </div>
        </div>
      )}

      {/* Sub-Section Switcher: Kamus Pola Kalimat vs Perubahan Bentuk Kata */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-card border border-border-subtle rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setSubSection('dictionary');
            playSound('click', soundEnabled);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all ${
            subSection === 'dictionary'
              ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-inset'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo" />
          <span>Kamus Pola Kalimat ({allBunpou.length.toLocaleString()})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubSection('conjugation');
            playSound('click', soundEnabled);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all ${
            subSection === 'conjugation'
              ? 'bg-surface-elevated text-indigo shadow-sm border border-border-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-inset'
          }`}
        >
          <Zap className="w-4 h-4 text-red-700 dark:text-amber-400" />
          <span>Perubahan Bentuk Kata (Konjugasi)</span>
          <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider bg-surface-inset text-red-700 dark:text-amber-400 border border-border-subtle px-1.5 py-0.5 rounded font-mono font-bold">
            Dojo & Latihan
          </span>
        </button>
      </div>

      {subSection === 'conjugation' ? (
        <ConjugationDojoView soundEnabled={soundEnabled} onRewardPlayer={onRewardPlayer} />
      ) : (
        <>
          {/* Search & Level Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
        <JapaneseSearchInput
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setVisibleCount(40); }}
          placeholderIme="Cari rumus (romaji → kana)..."
          placeholderLatin="Cari rumus, arti, fungsi..."
          soundEnabled={soundEnabled}
        />

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              playSound('click', soundEnabled);
            }}
            className="btn-physical-secondary flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all text-xs font-bold"
          >
            <Filter className="w-4 h-4 text-text-secondary" />
            <span>{levelFilter === 'all' ? 'Semua Level' : `Level ${levelFilter}`}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-secondary">
              {levelFilter === 'all' ? `${allBunpou.length} Rumus` : `${(levelCounts[levelFilter] || 0).toLocaleString()} Rumus`}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-surface-card border border-border-subtle shadow-xl z-50 p-1.5 space-y-1 animate-fade-in">
                {LEVEL_OPTIONS.map((opt) => {
                  const isSelected = levelFilter === opt.value;
                  const count = levelCounts[opt.value] || 0;
                  const badgeText = opt.value === 'all' ? `${count.toLocaleString()} Rumus` : count.toLocaleString();

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setLevelFilter(opt.value);
                        setVisibleCount(40);
                        setIsDropdownOpen(false);
                        playSound('click', soundEnabled);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-surface-elevated text-text-primary border border-border-primary'
                          : 'text-text-primary hover:bg-surface-elevated border border-transparent'
                      }`}
                    >
                      <span className="font-heading tracking-wide text-sm">{opt.label}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-border-subtle bg-surface-inset text-text-secondary">
                        {badgeText}
                      </span>
                    </button>
                  );
                })}

                <div className="pt-2 px-2 pb-1 border-t border-border-subtle text-[10px] text-text-muted font-mono text-center flex items-center justify-center gap-1.5">
                  <span>{allBunpou.length} pola tata bahasa</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Function Categories Filter (Pills) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-text-secondary font-heading uppercase tracking-wider pl-1">
          Kategori Fungsi (機能):
        </span>
        <div className="flex flex-wrap items-center gap-2 pb-1.5">
          {ALL_GRAMMAR_FUNCTION_CATEGORIES.map((cat) => {
            const isSelected = functionFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFunctionFilter(cat);
                  setVisibleCount(40);
                  playSound('click', soundEnabled);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border font-jp ${
                  isSelected
                    ? 'bg-surface-elevated text-text-primary border-border-primary shadow-sm font-black'
                    : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & View Mode Switcher */}
      <div className="text-xs text-text-muted px-1 flex items-center justify-between gap-3">
        <span>
          Menampilkan <strong className="text-text-primary">{displayedBunpou.length}</strong> dari <strong className="text-text-primary">{filteredBunpou.length}</strong> pola
        </span>

        {/* Mode Switcher: Cards vs Compact List */}
        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-xl border border-border-subtle shrink-0">
          <button
            type="button"
            onClick={() => {
              handleSetViewMode('cards');
              playSound('click', soundEnabled);
            }}
            title="Tampilan Kartu Lengkap"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'cards'
                ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-primary'
                : 'text-text-secondary hover:text-text-primary border border-transparent'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kartu</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleSetViewMode('compact');
              playSound('click', soundEnabled);
            }}
            title="Tampilan Daftar Ringkas"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'compact'
                ? 'bg-surface-elevated text-text-primary shadow-sm border border-border-primary'
                : 'text-text-secondary hover:text-text-primary border border-transparent'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ringkas</span>
          </button>
        </div>
      </div>

      {viewMode === 'compact' ? (
        /* Compact List View: Fast scanning dictionary-style */
        <div className="space-y-2">
          {displayedBunpou.map((item) => {
            const titleInfo = getGrammarTitleInfo(item);
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  playSound('click', soundEnabled);
                }}
                className="panel px-3.5 sm:px-4 py-2.5 sm:py-3 group shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl border border-border-subtle hover:border-border-primary flex items-center justify-between gap-3 sm:gap-4"
              >
                {/* Left: Badge + Clean Title + Meaning */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-surface-inset text-indigo text-[11px] sm:text-xs font-mono font-bold border border-border-subtle shrink-0">
                    {item.baseLevel ? item.baseLevel : item.level}
                  </span>

                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-indigo transition-colors shrink-0 font-jp">
                      {titleInfo.mainTitle}
                    </h3>
                    {titleInfo.formationRule && (
                      <span className="text-[11px] font-mono text-indigo font-medium hidden md:inline truncate">
                        ({titleInfo.formationRule})
                      </span>
                    )}
                    <p className="text-xs sm:text-sm text-text-secondary truncate font-medium">
                      {item.meaningId}
                    </p>
                  </div>
                </div>

                {/* Right: Remove + Bookmark + Arrow */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {onRemoveItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.id, 'bunpou');
                        playSound('click', soundEnabled);
                      }}
                      className="btn-physical-secondary p-1.5 rounded-lg hover:text-wine-accent transition-all shrink-0"
                      title="Hapus dari deck ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onToggleBookmark && (
                    <DeckBookmarkPicker
                      itemId={item.id}
                      category="bunpou"
                      itemTitle={item.title}
                      itemSubtitle={item.meaningId || (item as any).meaning}
                      userDecks={userDecks}
                      onToggleBookmark={onToggleBookmark}
                      onUpdateDecks={onUpdateDecks}
                      soundEnabled={soundEnabled}
                      compact
                    />
                  )}
                  <span className="text-text-muted group-hover:text-indigo group-hover:translate-x-0.5 transition-all text-sm font-bold pl-0.5">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean & Elegant Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {displayedBunpou.map((item) => {
            const titleInfo = getGrammarTitleInfo(item);
            const categoryTags = getBunpouCategoryTags(item);
            const levelLabel = item.baseLevel ? `Level ${item.baseLevel}` : `Level ${item.level}`;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  playSound('click', soundEnabled);
                }}
                className="panel panel-stitched flex flex-col justify-between p-4 sm:p-5 group shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl border border-border-subtle hover:border-border-primary space-y-3.5"
              >
                {/* Top row: Level Badge + Actions */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-surface-inset text-indigo text-xs font-mono font-bold border border-border-subtle shadow-xs">
                    {levelLabel}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id, 'bunpou');
                          playSound('click', soundEnabled);
                        }}
                        className="btn-physical-secondary p-1.5 rounded-lg hover:text-wine-accent transition-all shrink-0 cursor-pointer"
                        title="Hapus dari deck ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onToggleBookmark && (
                      <DeckBookmarkPicker
                        itemId={item.id}
                        category="bunpou"
                        itemTitle={item.title}
                        itemSubtitle={item.meaningId || (item as any).meaning}
                        userDecks={userDecks}
                        onToggleBookmark={onToggleBookmark}
                        onUpdateDecks={onUpdateDecks}
                        soundEnabled={soundEnabled}
                        compact
                      />
                    )}
                  </div>
                </div>

                {/* Main: Clean Title, Formation Rule & Meaning */}
                <div className="space-y-1.5 py-0.5 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary font-heading group-hover:text-indigo transition-colors leading-snug font-jp truncate">
                    {titleInfo.mainTitle}
                  </h3>
                  {titleInfo.formationRule && (
                    <p className="text-xs font-mono text-indigo font-medium truncate">
                      {titleInfo.formationRule}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed line-clamp-2">
                    {item.meaningId || (item as any).meaning}
                  </p>
                </div>

                {/* Tags & Action Row */}
                <div className="pt-2.5 border-t border-border-subtle/60 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {categoryTags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] sm:text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-surface-inset text-text-muted border border-border-subtle/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-indigo group-hover:translate-x-0.5 transition-transform shrink-0 font-heading">
                    <span>Pelajari Skill</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Empty State */}
      {displayedBunpou.length === 0 && (
        <div className="panel panel-stitched p-12 text-center rounded-3xl space-y-2">
          <p className="text-sm font-bold text-text-primary">Tidak ada tata bahasa yang cocok.</p>
          <p className="text-xs text-text-muted">Coba ubah kata kunci pencarian atau reset filter fungsi.</p>
        </div>
      )}

      {/* Load More Button */}
      {displayedBunpou.length < filteredBunpou.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            className="btn-cta px-6 py-2.5 rounded-2xl text-xs font-bold transition-all font-heading"
          >
            Muat Lebih Banyak ({filteredBunpou.length - displayedBunpou.length} tersisa)
          </button>
        </div>
      )}
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <BunpouDetailModal
            item={selectedItem}
            masteryRecord={selectedItem ? itemMastery?.[selectedItem.id] : undefined}
            onClose={() => setSelectedItem(null)}
            soundEnabled={soundEnabled}
            isBookmarked={Boolean(isItemBookmarked(userDecks, selectedItem.id, 'bunpou'))}
            onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(selectedItem.id, 'bunpou') : undefined}
            userDecks={userDecks}
            onToggleDeckItem={onToggleBookmark && selectedItem ? (deckId) => onToggleBookmark(selectedItem.id, 'bunpou', undefined, deckId) : undefined}
            onUpdateDecks={onUpdateDecks}
            onRewardPlayer={onRewardPlayer}
            onRecordInteraction={onRecordInteraction}
            onCompleteStudyItem={onCompleteStudyItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
