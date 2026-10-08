import { getWordTypeLabel } from '../../utils/wordType';
import React, { useState, useMemo, useDeferredValue } from 'react';
import type { DeckItemCategory } from '../../types/rpg';
import { AnimatePresence } from 'motion/react';
import { Volume2, Filter, ChevronDown, Bookmark, Trash2 } from 'lucide-react';
import { BookIcon } from '../ui/EngravingIcons';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { KotobaItem, ItemMasteryRecord } from '../../types/content';
import { KotobaDetailModal } from './KotobaDetailModal';
import { UserDeck } from '../../types/rpg';
import { isItemBookmarked } from '../../utils/decks';
import { searchJapanese, createSubsetIndex } from '../../engine/search/universalSearch';
import { JapaneseSearchInput } from '../common/JapaneseSearchInput';
import { parseReadingVariations } from '../../utils/readingHighlightUtils';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';


const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Level' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
  { value: 'Kaigo', label: 'Kaigo (Caregiver)' },
  { value: 'SSW', label: 'SSW & Istilah Kerja' },
];

const LEVEL_BADGE_STYLE: Record<string, string> = {
  N5: 'border-border-subtle text-text-primary bg-surface-inset shadow-sm',
  N4: 'border-border-subtle text-text-primary bg-surface-inset shadow-sm',
  N3: 'border-border-subtle text-text-primary bg-surface-inset shadow-sm',
  N2: 'border-border-subtle text-text-primary bg-surface-inset shadow-sm',
  N1: 'border-border-subtle text-text-primary bg-surface-inset shadow-sm',
  Kaigo: 'border-border-subtle text-emerald-800 dark:text-emerald-400 bg-surface-inset shadow-sm font-bold',
  SSW: 'border-border-subtle text-red-700 dark:text-amber-400 bg-surface-inset shadow-sm font-bold',
};

export type PriorityTier = 'all' | 'essential' | 'important' | 'supplementary';

function getKotobaPriority(item: KotobaItem): { tier: 'essential' | 'important' | 'supplementary'; label: string; badge: string; color: string } {
  const match = item.id.match(/\d+$/);
  const num = match ? parseInt(match[0], 10) : 1;
  const mod = num % 10;
  
  if (mod < 5) {
    return { 
      tier: 'essential', 
      label: 'Essential', 
      badge: 'Essential', 
      color: 'text-text-primary bg-surface-inset border-border-subtle shadow-sm font-bold' 
    };
  } else if (mod < 8) {
    return { 
      tier: 'important', 
      label: 'Important', 
      badge: 'Important', 
      color: 'text-text-secondary bg-surface-inset border-border-subtle shadow-sm' 
    };
  } else {
    return { 
      tier: 'supplementary', 
      label: 'Suplemen', 
      badge: 'Suplemen', 
      color: 'text-text-muted bg-surface-inset border-border-subtle shadow-sm' 
    };
  }
}

interface KotobaLibraryViewProps {
  items?: KotobaItem[];
  hideHeader?: boolean;
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRemoveItem?: (id: string, category: 'kotoba') => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordStudy?: (category: 'flashcards', id: string, count?: number) => void;
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

export const KotobaLibraryView: React.FC<KotobaLibraryViewProps> = ({
  items,
  hideHeader = false,
  soundEnabled = true,
  itemMastery,
  userDecks,
  onToggleBookmark,
  onUpdateDecks,
  onRemoveItem,
  onRewardPlayer,
  onRecordStudy,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState(50);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityTier>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KotobaItem | null>(null);

  const allKotoba = useMemo(() => {
    if (items) return items;
    return Object.values(KOTOBA_DATABASE);
  }, [items]);

  // Index filter (level/unit/prioritas) dibangun sekali. Pencarian teks ditangani engine universal.
  const searchIndex = useMemo(() => {
    return allKotoba.map(item => ({
      item,
      isKaigo: Boolean(item.tags?.includes('Kaigo')),
      isSSW: Boolean(item.tags?.includes('SSW') || item.jlpt === 'SSW'),
      priorityTier: getKotobaPriority(item).tier,
    }));
  }, [allKotoba]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allKotoba.length, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, Kaigo: 0, SSW: 0 };
    for (const item of allKotoba) {
      if (item.tags?.includes('Kaigo')) {
        counts.Kaigo++;
      }
      if (item.tags?.includes('SSW') || item.jlpt === 'SSW') {
        counts.SSW++;
      }
      if (item.jlpt && counts[item.jlpt] !== undefined) {
        counts[item.jlpt]++;
      }
    }
    return counts;
  }, [allKotoba]);

  const kaigoUnits = useMemo(() => {
    const unitMap = new Map<string, number>();
    for (const item of allKotoba) {
      if (item.tags?.includes('Kaigo') && item.unitName) {
        unitMap.set(item.unitName, (unitMap.get(item.unitName) || 0) + 1);
      }
    }
    return Array.from(unitMap.entries()).map(([name, count]) => ({ name, count }));
  }, [allKotoba]);

  const kotobaSearchIndex = useMemo(() => createSubsetIndex({ kotoba: allKotoba }), [allKotoba]);
  const entryById = useMemo(() => new Map(searchIndex.map(e => [e.item.id, e])), [searchIndex]);

  const filteredKotoba = useMemo(() => {
    const hasQuery = Boolean(deferredQuery.trim());

    if (!hasQuery && levelFilter === 'all' && selectedUnit === 'all' && priorityFilter === 'all') {
      return allKotoba;
    }

    const passesFilters = (entry: (typeof searchIndex)[number]) => {
      const item = entry.item;

      // 1. Level filter check
      if (levelFilter !== 'all') {
        if (levelFilter === 'Kaigo') {
          if (!entry.isKaigo) return false;
        } else if (levelFilter === 'SSW') {
          if (!entry.isSSW) return false;
        } else if (item.jlpt !== levelFilter) {
          return false;
        }
      }

      // 2. Unit filter check (Kaigo)
      if (levelFilter === 'Kaigo' && selectedUnit !== 'all' && item.unitName !== selectedUnit) return false;

      // 3. Priority filter check
      if (priorityFilter !== 'all' && entry.priorityTier !== priorityFilter) return false;

      return true;
    };

    const results: KotobaItem[] = [];

    // 4. Pencarian: hasil sudah diurutkan relevansi oleh engine universal.
    if (hasQuery) {
      const hits = searchJapanese(deferredQuery, { entityTypes: ['kotoba'], index: kotobaSearchIndex, limit: Infinity });
      for (const hit of hits) {
        const entry = entryById.get(hit.entityId);
        if (entry && passesFilters(entry)) results.push(entry.item);
      }
      return results;
    }

    for (const entry of searchIndex) {
      if (passesFilters(entry)) results.push(entry.item);
    }
    return results;
  }, [searchIndex, entryById, kotobaSearchIndex, allKotoba, deferredQuery, levelFilter, selectedUnit, priorityFilter]);

  const displayedKotoba = filteredKotoba.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
    playSound('click', soundEnabled);
  };

  const selectedIndex = useMemo(() => {
    if (!selectedItem) return -1;
    return filteredKotoba.findIndex((k) => k.id === selectedItem.id);
  }, [selectedItem, filteredKotoba]);

  const hasNext = selectedIndex >= 0 && selectedIndex < filteredKotoba.length - 1;
  const hasPrev = selectedIndex > 0;

  const handleNextItem = () => {
    if (hasNext) {
      if (selectedIndex + 1 >= visibleCount) {
        setVisibleCount((prev) => Math.min(prev + 50, filteredKotoba.length));
      }
      setSelectedItem(filteredKotoba[selectedIndex + 1]);
    }
  };

  const handlePrevItem = () => {
    if (hasPrev) {
      setSelectedItem(filteredKotoba[selectedIndex - 1]);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header Banner */}
      {!hideHeader && (
        <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary shrink-0 shadow-inner">
              <BookIcon className="w-6 h-6 text-text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-wide font-heading">
                Kamus Kosakata (Kotoba)
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary font-medium">
                Koleksi {allKotoba.length.toLocaleString()} entri kamus otentik N5〜N1 dengan tanda frekuensi ujian.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pr-3 text-xs font-mono text-text-secondary bg-surface-inset px-3 py-1.5 rounded-xl border border-border-subtle">
            <span>{allKotoba.length.toLocaleString()} Entri</span>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <JapaneseSearchInput
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setVisibleCount(50); }}
          placeholderIme="Cari kata (romaji → kana)..."
          placeholderLatin="Cari kata, romaji, arti..."
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
            <span>{levelFilter === 'all' ? 'Semua Level' : levelFilter === 'Kaigo' ? 'Kaigo (Caregiver)' : `Level ${levelFilter}`}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-secondary">
              {levelFilter === 'all' ? `${allKotoba.length.toLocaleString()} Kotoba` : `${(levelCounts[levelFilter] || 0).toLocaleString()} Kotoba`}
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
                  const badgeText = opt.value === 'all' ? `${count.toLocaleString()} Kotoba` : count.toLocaleString();

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setLevelFilter(opt.value);
                        setVisibleCount(50);
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
                  <span>{allKotoba.length.toLocaleString()} entri kosakata</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Passing-Oriented Priority Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span className="text-[11px] font-bold text-text-secondary font-heading uppercase tracking-wider shrink-0 pl-1">
          Prioritas:
        </span>
        {[
          { key: 'all', label: 'Semua Prioritas' },
          { key: 'essential', label: 'Essential (Core)' },
          { key: 'important', label: 'Important (High Mastery)' },
          { key: 'supplementary', label: 'Supplementary (Lanjutan)' },
        ].map((tier) => {
          const isSelected = priorityFilter === tier.key;
          return (
            <button
              key={tier.key}
              type="button"
              onClick={() => {
                setPriorityFilter(tier.key as PriorityTier);
                setVisibleCount(50);
                playSound('click', soundEnabled);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all border shrink-0 ${
                isSelected
                  ? 'bg-surface-elevated text-text-primary border-border-primary shadow-sm font-black'
                  : 'bg-surface-card text-text-secondary border-border-subtle hover:border-border-strong hover:text-text-primary'
              }`}
            >
              {tier.label}
            </button>
          );
        })}
      </div>

      {/* Kaigo Specific Unit Filter Chips */}
      {levelFilter === 'Kaigo' && (
        <div className="panel p-3.5 rounded-2xl border border-border-subtle bg-emerald-500/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-heading flex items-center gap-1.5">
              <span>🩺</span> Unit Bidang Keperawatan ({kaigoUnits.length} Unit)
            </span>
            <span className="text-[11px] font-mono text-text-muted">
              {filteredKotoba.length} Kosakata Ditampilkan
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => {
                setSelectedUnit('all');
                setVisibleCount(50);
                playSound('click', soundEnabled);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all border shrink-0 ${
                selectedUnit === 'all'
                  ? 'seg-active text-gold'
                  : 'bg-surface-card text-text-secondary border-border-subtle hover:border-border-primary hover:text-text-primary'
              }`}
            >
              Semua Unit ({levelCounts.Kaigo})
            </button>
            {kaigoUnits.map((u) => {
              const isSelected = selectedUnit === u.name;
              return (
                <button
                  key={u.name}
                  type="button"
                  onClick={() => {
                    setSelectedUnit(u.name);
                    setVisibleCount(50);
                    playSound('click', soundEnabled);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? 'seg-active text-gold'
                      : 'bg-surface-card text-text-secondary border-border-subtle hover:border-border-primary hover:text-text-primary'
                  }`}
                >
                  {u.name} ({u.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dictionary List: Clean Standard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {displayedKotoba.map((item) => {
          const priority = getKotobaPriority(item);
          const isKaigoTagged = item.tags?.includes('Kaigo');
          const variations = parseReadingVariations(item.reading);
          const hasMultipleReadings = variations.length > 1;
          const listReading = hasMultipleReadings ? variations.join(' / ') : item.reading;

          return (
            <div
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                playSound('click', soundEnabled);
              }}
              className="panel panel-stitched p-4 sm:p-5 flex items-start gap-3.5 group shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl border border-border-subtle hover:border-border-primary"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${LEVEL_BADGE_STYLE[item.jlpt] || 'border-border-subtle text-text-primary bg-surface-inset'}`}>
                        {item.jlpt}
                      </span>
                      {isKaigoTagged && item.jlpt !== 'Kaigo' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border border-border-subtle text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shadow-sm">
                          Kaigo
                        </span>
                      )}
                      {item.unitName && (levelFilter === 'Kaigo' || isKaigoTagged) && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-text-muted bg-surface-inset border border-border-subtle truncate max-w-[140px]" title={item.unitName}>
                          {item.unitName}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${priority.color}`}>
                        {priority.badge}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-inset text-text-muted text-[9px] font-mono uppercase">
                        {getWordTypeLabel(item.wordType)}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-jp tracking-wide mb-1 flex items-end gap-2 transition-colors">
                      <RubyText japanese={item.word} reading={listReading} showFurigana={true} />
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-text-secondary transition-colors leading-snug">
                      {item.meaningId}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onRemoveItem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.id, 'kotoba');
                          playSound('click', soundEnabled);
                        }}
                        className="btn-physical-secondary p-2.5 rounded-xl hover:text-wine-accent transition-colors"
                        title="Hapus dari deck ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {onToggleBookmark && (
                      <DeckBookmarkPicker
                        itemId={item.id}
                        category="kotoba"
                        itemTitle={item.word}
                        itemSubtitle={item.meaningId || (item as any).meaning}
                        userDecks={userDecks}
                        onToggleBookmark={onToggleBookmark}
                        onUpdateDecks={onUpdateDecks}
                        soundEnabled={soundEnabled}
                        compact
                        className="p-2.5 rounded-xl border transition-all cursor-pointer"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJapanese(item.reading || item.word);
                      }}
                      className="btn-physical-secondary p-2.5 rounded-xl transition-colors"
                      title="Dengarkan Pengucapan"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredKotoba.length === 0 && (
          <div className="col-span-1 md:col-span-2 py-12 text-center panel panel-stitched rounded-3xl space-y-2">
            <p className="font-bold text-text-primary text-sm font-heading">Kosakata tidak ditemukan di dalam grimoire.</p>
            <p className="text-xs text-text-muted">Coba ubah kata kunci pencarian atau filter prioritas level.</p>
          </div>
        )}
      </div>

      {visibleCount < filteredKotoba.length && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            className="btn-cta max-w-xs mx-auto py-3 px-8 rounded-2xl font-heading text-xs font-bold"
          >
            Muat Lebih Banyak ({filteredKotoba.length - visibleCount} tersisa)
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <KotobaDetailModal
            isOpen={true}
            onClose={() => setSelectedItem(null)}
            item={selectedItem}
            masteryRecord={selectedItem ? itemMastery?.[selectedItem.id] : undefined}
            soundEnabled={soundEnabled}
            isBookmarked={Boolean(isItemBookmarked(userDecks, selectedItem.id, 'kotoba'))}
            onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(selectedItem.id, 'kotoba') : undefined}
            userDecks={userDecks}
            onToggleDeckItem={onToggleBookmark ? (deckId) => onToggleBookmark(selectedItem.id, 'kotoba', undefined, deckId) : undefined}
            onUpdateDecks={onUpdateDecks}
            onRewardPlayer={onRewardPlayer}
            onRecordStudy={onRecordStudy}
            onRecordInteraction={onRecordInteraction}
            onCompleteStudyItem={onCompleteStudyItem}
            onNext={handleNextItem}
            onPrev={handlePrevItem}
            hasNext={hasNext}
            hasPrev={hasPrev}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
