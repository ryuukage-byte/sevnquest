import React, { useState, useMemo } from 'react';
import { Layers, BookOpen, Check, Bookmark } from 'lucide-react';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import type { OfficialBook } from '../../types/books';
import { getBookStatsMap, getDeckItemCount } from '../../utils/arcadeSourceUtils';
import type { UserDeck } from '../../types/rpg';
import { playSound } from '../../utils/audio';
import { useAccess } from '../../state/entitlement';
import { LockBadge } from '../billing/AccessGate';
import { requiredTierForLevel } from '../../utils/access';

export interface LevelOption<T extends string = string> {
  id: T;
  label: string;
  desc: string;
}

export type ArcadeSourceType = 'LEVEL' | 'TEMPLATE_BOOK' | 'USER_DECK';

interface ArcadeSourceSelectorProps<T extends string = string> {
  sourceType: ArcadeSourceType;
  onSourceTypeChange: (type: ArcadeSourceType) => void;
  selectedLevel: T;
  onSelectLevel: (level: T) => void;
  selectedBookId: string;
  onSelectBookId: (bookId: string) => void;
  /** Buku Saku buatan pemain; bila diisi, muncul pilihan sumber "Buku Saku Saya". */
  userDecks?: UserDeck[];
  selectedDeckId?: string;
  onSelectDeckId?: (deckId: string) => void;
  levelOptions: LevelOption<T>[];
  mode: 'kanji' | 'kotoba' | 'conjugation';
  challengeDurationText: string;
  soundEnabled?: boolean;
}

export const ArcadeSourceSelector = <T extends string>({
  sourceType,
  onSourceTypeChange,
  selectedLevel,
  onSelectLevel,
  selectedBookId,
  onSelectBookId,
  userDecks,
  selectedDeckId,
  onSelectDeckId,
  levelOptions,
  mode,
  challengeDurationText,
  soundEnabled = true,
}: ArcadeSourceSelectorProps<T>) => {
  const { guardLevel, canAccessLevel } = useAccess();
  const [bookCategoryFilter, setBookCategoryFilter] = useState<'ALL' | 'CURRICULUM' | 'THEMATIC'>('ALL');

  // Pre-calculate counts of items per book for snappy display
  const statsMap = useMemo(() => getBookStatsMap(), []);

  // Filtered official template books
  const filteredBooks = useMemo(() => {
    if (bookCategoryFilter === 'CURRICULUM') {
      return OFFICIAL_BOOKS.filter(b => b.category !== 'thematic' && b.level !== 'TEMATIK');
    }
    if (bookCategoryFilter === 'THEMATIC') {
      return OFFICIAL_BOOKS.filter(b => b.category === 'thematic' || b.level === 'TEMATIK');
    }
    return OFFICIAL_BOOKS;
  }, [bookCategoryFilter]);

  const activeLevelOption = useMemo(() => {
    return levelOptions.find(opt => opt.id === selectedLevel) || levelOptions[0];
  }, [levelOptions, selectedLevel]);

  const activeBook = useMemo(() => {
    return OFFICIAL_BOOKS.find(b => b.id === selectedBookId) || OFFICIAL_BOOKS[0];
  }, [selectedBookId]);

  const deckEnabled = Array.isArray(userDecks) && Boolean(onSelectDeckId);
  const deckRows = useMemo(
    () => (deckEnabled ? userDecks!.map(d => ({ deck: d, count: getDeckItemCount(d, mode) })) : []),
    [deckEnabled, userDecks, mode]
  );
  const activeDeckRow = deckRows.find(r => r.deck.id === selectedDeckId);
  const unitLabel = mode === 'kanji' ? 'kanji' : mode === 'conjugation' ? 'kata kerja' : 'kata';

  const activeBookItemCount = useMemo(() => {
    if (!activeBook) return 0;
    const stats = statsMap[activeBook.id];
    if (!stats) return 0;
    if (mode === 'kanji') return stats.kanjiCount;
    if (mode === 'conjugation') return stats.verbCount || stats.kotobaCount;
    return stats.kotobaCount;
  }, [activeBook, statsMap, mode]);

  return (
    <div className="space-y-3.5">
      {/* 1. TOP SEGMENTED CONTROL: Tingkatan JLPT vs Rak Buku Template */}
      <div data-tour="arcade-source-tabs" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-text-primary font-heading flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-text-muted" />
          <span>Pilih Sumber Soal Tantangan:</span>
        </label>

        <div className="arc-seg" role="group" aria-label="Sumber soal">
          <button
            type="button"
            aria-pressed={sourceType === 'LEVEL'}
            onClick={() => {
              onSourceTypeChange('LEVEL');
              playSound('click', soundEnabled);
            }}
            className="arc-seg-btn"
          >
            <span>Level JLPT</span>
          </button>

          <button
            type="button"
            aria-pressed={sourceType === 'TEMPLATE_BOOK'}
            onClick={() => {
              onSourceTypeChange('TEMPLATE_BOOK');
              playSound('click', soundEnabled);
            }}
            className="arc-seg-btn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rak Buku</span>
            <span className="arc-pill-count">{OFFICIAL_BOOKS.length}</span>
          </button>

          {deckEnabled && (
            <button
              type="button"
              aria-pressed={sourceType === 'USER_DECK'}
              onClick={() => {
                onSourceTypeChange('USER_DECK');
                playSound('click', soundEnabled);
              }}
              className="arc-seg-btn"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Buku Saku</span>
              <span className="arc-pill-count">{userDecks!.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MODE A: LEVEL JLPT */}
      {sourceType === 'LEVEL' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fade-in">
          {levelOptions.map(opt => {
            const isSelected = selectedLevel === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  playSound('click', soundEnabled);
                  if (!guardLevel(opt.id, `Arcade ${opt.label}`)) return;
                  onSelectLevel(opt.id);
                }}
                className="arc-opt flex flex-col gap-1"
              >
                <span className="flex items-center justify-between gap-1 w-full">
                  <span className="text-xs font-bold font-heading">{opt.label}</span>
                  {!canAccessLevel(opt.id) && <LockBadge tier={requiredTierForLevel(opt.id)} />}
                </span>
                <span className="text-[10px] line-clamp-1 font-body opacity-80">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. MODE B: RAK BUKU TEMPLATE */}
      {sourceType === 'TEMPLATE_BOOK' && (
        <div className="space-y-2.5 animate-fade-in">
          <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
            {([
              ['ALL', 'Semua', OFFICIAL_BOOKS.length],
              ['CURRICULUM', 'Kurikulum JLPT', OFFICIAL_BOOKS.filter(b => b.category !== 'thematic' && b.level !== 'TEMATIK').length],
              ['THEMATIC', 'Tematik', OFFICIAL_BOOKS.filter(b => b.category === 'thematic' || b.level === 'TEMATIK').length],
            ] as const).map(([id, label, n]) => (
              <button
                key={id}
                type="button"
                aria-pressed={bookCategoryFilter === id}
                onClick={() => {
                  setBookCategoryFilter(id);
                  playSound('click', soundEnabled);
                }}
                className="arc-pill"
              >
                <span>{label}</span>
                <span className="arc-pill-count">{n}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 sm:max-h-64 overflow-y-auto p-1 custom-scrollbar">
            {filteredBooks.map(book => {
              const isSelected = selectedBookId === book.id;
              const stats = statsMap[book.id];
              const count = mode === 'kanji'
                ? stats?.kanjiCount
                : mode === 'conjugation'
                ? (stats?.verbCount || stats?.kotobaCount)
                : stats?.kotobaCount;

              return (
                <button
                  key={book.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    playSound('click', soundEnabled);
                    if (!guardLevel(book.level, book.title)) return;
                    onSelectBookId(book.id);
                  }}
                  className="arc-opt flex items-start gap-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-lg font-heading shrink-0">
                    {book.coverIcon || '📖'}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md border ${book.colorTheme?.badgeBg || 'bg-surface-card border-border-subtle'}`}>
                        {book.level}
                      </span>
                      {!canAccessLevel(book.level) && <LockBadge tier={requiredTierForLevel(book.level)} />}
                      <span className="text-[10px] font-mono text-text-muted">
                        {count || 0} {unitLabel}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold font-heading line-clamp-1 mt-1 text-text-primary">
                      {book.title}
                    </h4>
                    <p className="text-[10px] text-text-muted line-clamp-1 mt-0.5 font-body">
                      {book.subtitle || book.description}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-gold text-surface-ground flex items-center justify-center z-[2]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODE C: BUKU SAKU BUATAN SENDIRI */}
      {sourceType === 'USER_DECK' && deckEnabled && (
        <div className="animate-fade-in">
          {deckRows.length === 0 ? (
            <p className="p-3 rounded-2xl bg-surface-inset border border-dashed border-border-subtle text-[11px] text-text-muted font-body leading-relaxed">
              Belum ada Buku Saku. Buat di tab Buku Saku, lalu simpan kata atau kanji ke dalamnya.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 sm:max-h-64 overflow-y-auto p-1 custom-scrollbar">
              {deckRows.map(({ deck, count }) => {
                const isSelected = selectedDeckId === deck.id;
                const empty = count === 0;
                return (
                  <button
                    key={deck.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={empty}
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onSelectDeckId!(deck.id);
                    }}
                    className="arc-opt flex items-start gap-2.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-lg font-heading shrink-0">
                      {deck.coverIcon || '🔖'}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-xs font-bold font-heading line-clamp-1 text-text-primary">
                        {deck.title}
                      </h4>
                      <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                        {empty ? `Belum ada ${unitLabel}` : `${count} ${unitLabel}`}
                      </span>
                    </div>
                    {isSelected && !empty && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-gold text-surface-ground flex items-center justify-center z-[2]">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. RINGKASAN SUMBER AKTIF */}
      <div data-tour="arcade-source-summary" className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center font-bold text-xs font-mono text-text-primary shrink-0">
            {sourceType === 'LEVEL'
              ? activeLevelOption.id === 'ALL' ? 'ALL' : activeLevelOption.id
              : sourceType === 'USER_DECK'
              ? activeDeckRow?.deck.coverIcon || '🔖'
              : activeBook?.coverIcon || '📖'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-text-muted block">
              {sourceType === 'LEVEL' ? 'Level JLPT Dipilih' : sourceType === 'USER_DECK' ? 'Buku Saku Dipilih' : 'Rak Buku Dipilih'}
            </span>
            <span className="text-xs font-bold text-text-primary font-heading truncate block">
              {sourceType === 'LEVEL'
                ? activeLevelOption.label
                : sourceType === 'USER_DECK'
                ? activeDeckRow?.deck.title || 'Pilih satu Buku Saku'
                : activeBook?.title}
            </span>
            {sourceType === 'TEMPLATE_BOOK' && (
              <span className="text-[10px] text-text-muted font-mono block">
                {activeBookItemCount} {unitLabel} siap dilatih
              </span>
            )}
            {sourceType === 'USER_DECK' && activeDeckRow && (
              <span className="text-[10px] text-text-muted font-mono block">
                {activeDeckRow.count} {unitLabel} siap dilatih
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 pl-2">
          <span className="text-[10px] font-mono text-text-muted block">Format Mode</span>
          <span className="text-xs font-bold text-text-primary font-mono">{challengeDurationText}</span>
        </div>
      </div>
    </div>
  );
};
