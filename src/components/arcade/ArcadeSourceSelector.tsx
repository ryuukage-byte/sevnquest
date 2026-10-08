import React, { useState, useMemo } from 'react';
import { Layers, BookOpen, Check, Compass } from 'lucide-react';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import type { OfficialBook } from '../../types/books';
import { getBookStatsMap } from '../../utils/arcadeSourceUtils';
import { playSound } from '../../utils/audio';

export interface LevelOption<T extends string = string> {
  id: T;
  label: string;
  desc: string;
}

interface ArcadeSourceSelectorProps<T extends string = string> {
  sourceType: 'LEVEL' | 'TEMPLATE_BOOK';
  onSourceTypeChange: (type: 'LEVEL' | 'TEMPLATE_BOOK') => void;
  selectedLevel: T;
  onSelectLevel: (level: T) => void;
  selectedBookId: string;
  onSelectBookId: (bookId: string) => void;
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
  levelOptions,
  mode,
  challengeDurationText,
  soundEnabled = true,
}: ArcadeSourceSelectorProps<T>) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-text-primary font-heading flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-text-muted" />
          <span>Pilih Sumber Soal Tantangan:</span>
        </label>

        <div className="flex items-center p-1 bg-surface-inset border border-border-subtle rounded-2xl text-xs font-heading shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => {
              onSourceTypeChange('LEVEL');
              playSound('click', soundEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-bold flex items-center gap-1.5 ${
              sourceType === 'LEVEL'
                ? 'bg-surface-elevated text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span>Tingkatan JLPT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSourceTypeChange('TEMPLATE_BOOK');
              playSound('click', soundEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all font-bold flex items-center gap-1.5 ${
              sourceType === 'TEMPLATE_BOOK'
                ? 'bg-surface-elevated text-text-primary shadow-xs border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${sourceType === 'TEMPLATE_BOOK' ? 'text-gold' : 'text-text-muted'}`} />
            <span>Rak Buku Template</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold border border-border-subtle font-mono">
              {OFFICIAL_BOOKS.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. MODE A: TINGKATAN JLPT GRID */}
      {sourceType === 'LEVEL' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in">
          {levelOptions.map(opt => {
            const isSelected = selectedLevel === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelectLevel(opt.id);
                  playSound('click', soundEnabled);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-surface-elevated border-border-primary text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-border-primary'
                    : 'bg-surface-inset border-border-subtle text-text-muted hover:text-text-primary hover:border-border-primary/60 shadow-inner'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-heading block ${isSelected ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shadow-xs shrink-0 ml-1" />
                  )}
                </div>
                <span className={`text-[10px] line-clamp-1 mt-1 font-body ${isSelected ? 'text-text-secondary' : 'text-text-muted'}`}>
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. MODE B: RAK BUKU TEMPLATE GRID */}
      {sourceType === 'TEMPLATE_BOOK' && (
        <div className="space-y-2.5 animate-fade-in">
          {/* Category Filter Pills for Books */}
          <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => {
                setBookCategoryFilter('ALL');
                playSound('click', soundEnabled);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-heading transition-all whitespace-nowrap ${
                bookCategoryFilter === 'ALL'
                  ? 'bg-gold/15 text-gold border border-border-subtle'
                  : 'bg-surface-inset text-text-muted border border-border-subtle hover:text-text-primary'
              }`}
            >
              Semua Rak ({OFFICIAL_BOOKS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setBookCategoryFilter('CURRICULUM');
                playSound('click', soundEnabled);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-heading transition-all whitespace-nowrap ${
                bookCategoryFilter === 'CURRICULUM'
                  ? 'bg-teal/15 text-teal border border-border-subtle'
                  : 'bg-surface-inset text-text-muted border border-border-subtle hover:text-text-primary'
              }`}
            >
              Kurikulum JLPT ({OFFICIAL_BOOKS.filter(b => b.category !== 'thematic' && b.level !== 'TEMATIK').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setBookCategoryFilter('THEMATIC');
                playSound('click', soundEnabled);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-heading transition-all whitespace-nowrap ${
                bookCategoryFilter === 'THEMATIC'
                  ? 'bg-rose-500/15 text-rose-400 border border-border-subtle'
                  : 'bg-surface-inset text-text-muted border border-border-subtle hover:text-text-primary'
              }`}
            >
              Tematik Kehidupan ({OFFICIAL_BOOKS.filter(b => b.category === 'thematic' || b.level === 'TEMATIK').length})
            </button>
          </div>

          {/* Bookshelf Grid */}
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
                  onClick={() => {
                    onSelectBookId(book.id);
                    playSound('click', soundEnabled);
                  }}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 cursor-pointer relative ${
                    isSelected
                      ? 'bg-surface-elevated border-border-primary text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.35)] ring-1 ring-border-primary'
                      : 'bg-surface-inset border-border-subtle text-text-muted hover:text-text-primary hover:border-border-primary/60 shadow-inner'
                  }`}
                >
                  {/* Book Cover Icon */}
                  <div className="w-9 h-9 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-lg font-heading shrink-0 shadow-inner">
                    {book.coverIcon || '📖'}
                  </div>

                  {/* Book Information */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md border ${book.colorTheme?.badgeBg || 'bg-surface-card border-border-subtle'}`}>
                        {book.level}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {count || 0} {mode === 'kanji' ? 'kanji' : mode === 'conjugation' ? 'kata kerja' : 'kata'}
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold font-heading line-clamp-1 mt-1 ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {book.title}
                    </h4>
                    <p className="text-[10px] text-text-muted line-clamp-1 mt-0.5 font-body">
                      {book.subtitle || book.description}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-gold text-surface-ground flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ACTIVE SOURCE SUMMARY BANNER */}
      <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center font-bold text-xs font-mono text-text-primary shadow-xs shrink-0">
            {sourceType === 'LEVEL' ? (
              activeLevelOption.id === 'ALL' ? 'ALL' : activeLevelOption.id
            ) : (
              activeBook?.coverIcon || '📖'
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-text-muted block">
              {sourceType === 'LEVEL' ? 'Tingkatan JLPT Dipilih' : 'Rak Buku Template Dipilih'}
            </span>
            <span className="text-xs font-bold text-text-primary font-heading truncate block">
              {sourceType === 'LEVEL' ? activeLevelOption.label : activeBook?.title}
            </span>
            {sourceType === 'TEMPLATE_BOOK' && (
              <span className="text-[10px] text-text-muted font-mono block">
                {activeBookItemCount} {mode === 'kanji' ? 'kanji' : mode === 'conjugation' ? 'kata kerja' : 'kosakata'} siap dilatih
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
