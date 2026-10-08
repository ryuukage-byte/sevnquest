import React, { useState, useMemo } from 'react';
import { ChevronRight, Layers, Award, Compass, BookOpen } from 'lucide-react';
import { OfficialBook } from '../../types/books';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';
import { ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';

interface BookshelfViewProps {
  onSelectBook: (book: OfficialBook) => void;
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
}

const CURRICULUM_FILTERS = [
  { id: 'ALL', label: 'Semua Level' },
  { id: 'KANA', label: 'KANA' },
  { id: 'N5', label: 'N5' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
  { id: 'N1', label: 'N1' },
  { id: 'Kaigo', label: 'Kaigo · SSW' },
];

const THEMATIC_FILTERS = [
  { id: 'ALL', label: 'Semua Topik' },
  { id: 'book_theme_body', label: '🫀 Tubuh & Kesehatan' },
  { id: 'book_theme_home', label: '🏠 Rumah & Kehidupan' },
  { id: 'book_theme_public', label: '📮 Fasilitas Publik' },
];

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  onSelectBook,
  soundEnabled = true,
  itemMastery = {},
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'THEMATIC' | 'CURRICULUM'>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL');
  const [selectedThematicFilter, setSelectedThematicFilter] = useState('ALL');

  const thematicCount = useMemo(
    () => OFFICIAL_BOOKS.filter(b => b.category === 'thematic' || b.level === 'TEMATIK').length,
    []
  );
  const curriculumCount = useMemo(
    () => OFFICIAL_BOOKS.filter(b => b.category !== 'thematic' && b.level !== 'TEMATIK').length,
    []
  );

  const filteredBooks = useMemo(() => {
    let list = OFFICIAL_BOOKS;

    if (activeCategory === 'THEMATIC') {
      list = list.filter(b => b.category === 'thematic' || b.level === 'TEMATIK');
      if (selectedThematicFilter !== 'ALL') {
        list = list.filter(b => b.id === selectedThematicFilter);
      }
    } else if (activeCategory === 'CURRICULUM') {
      list = list.filter(b => b.category !== 'thematic' && b.level !== 'TEMATIK');
      if (selectedLevelFilter !== 'ALL') {
        list = list.filter(b => b.level === selectedLevelFilter);
      }
    } else {
      // ALL category
      if (selectedLevelFilter !== 'ALL') {
        list = list.filter(b => b.level === selectedLevelFilter);
      }
    }

    return list;
  }, [activeCategory, selectedLevelFilter, selectedThematicFilter]);

  // Helper to calculate book mastery percentage
  const getBookStats = (book: OfficialBook) => {
    let totalItems = 0;
    let masteredCount = 0;

    for (const ch of book.chapters) {
      for (const it of ch.items) {
        totalItems++;
        const record = itemMastery[it.id];
        if (record && (record.status === 'MASTERED' || record.status === 'PERFECTED' || (record.masteryPercentage && record.masteryPercentage >= 80))) {
          masteredCount++;
        }
      }
    }

    const pct = totalItems > 0 ? Math.round((masteredCount / totalItems) * 100) : 0;
    return { totalItems, masteredCount, pct };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner / Header */}
      <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl space-y-5 shadow-sm border border-border-subtle bg-surface-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
              <span>Rak Buku Kurikulum & Tematik · 本棚</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide flex items-center gap-2.5">
              <span>Buku Pelajaran & Modul Belajar</span>
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              Koleksi buku terstruktur (Minna no Nihongo, Soumatome, Kanzen Master) dan <strong>Rak Tematik Situasional</strong> (Tubuh, Rumah, Kantor Pos, dll) yang dipecah menjadi deck-deck terfokus (15–25 materi).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center font-bold font-mono text-base">
              {OFFICIAL_BOOKS.length}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted block">Koleksi Rak</span>
              <span className="text-xs font-bold text-text-primary font-heading">Siap Dipelajari</span>
            </div>
          </div>
        </div>

        {/* Primary Category Switcher */}
        <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-inset rounded-2xl border border-border-subtle w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('ALL');
                setSelectedLevelFilter('ALL');
                playSound('click', soundEnabled);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === 'ALL'
                  ? 'bg-surface-card text-text-primary shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Semua Rak ({OFFICIAL_BOOKS.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('THEMATIC');
                setSelectedThematicFilter('ALL');
                playSound('click', soundEnabled);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeCategory === 'THEMATIC'
                  ? 'bg-rose-500/15 text-rose-500 shadow-sm border border-border-subtle font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>🏷️ Rak Tematik</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-card border border-border-subtle font-mono">
                {thematicCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('CURRICULUM');
                setSelectedLevelFilter('ALL');
                playSound('click', soundEnabled);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeCategory === 'CURRICULUM'
                  ? 'bg-teal/15 text-teal shadow-sm border border-border-subtle font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>🎓 Kurikulum Standar</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-card border border-border-subtle font-mono">
                {curriculumCount}
              </span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-text-muted self-end sm:self-center">
            Menampilkan {filteredBooks.length} Buku
          </span>
        </div>

        {/* Secondary Sub-Filters (Contextual) */}
        {activeCategory === 'THEMATIC' ? (
          <div className="pt-2 flex flex-wrap items-center gap-1.5 pb-1">
            {THEMATIC_FILTERS.map(f => {
              const isActive = selectedThematicFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedThematicFilter(f.id);
                    playSound('click', soundEnabled);
                  }}
                  className={`notebook-filter-tab text-xs py-1.5 px-3 whitespace-nowrap ${isActive ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pt-2 flex flex-wrap items-center gap-1.5 pb-1">
            {CURRICULUM_FILTERS.map(f => {
              const isActive = selectedLevelFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevelFilter(f.id);
                    playSound('click', soundEnabled);
                  }}
                  className={`notebook-filter-tab text-xs py-1.5 px-3 whitespace-nowrap ${isActive ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid of Books */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filteredBooks.map((book) => {
          const { totalItems, pct } = getBookStats(book);
          const isThematic = book.category === 'thematic' || book.level === 'TEMATIK';

          return (
            <div
              key={book.id}
              onClick={() => {
                onSelectBook(book);
                playSound('click', soundEnabled);
              }}
              className={`panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle bg-surface-card hover:shadow-xl transition-all duration-200 cursor-pointer group flex flex-col justify-between relative overflow-hidden`}
            >
              <div className="space-y-3">
                {/* Header Row: Book Spine Icon + Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-14 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-col items-center justify-center group-hover:scale-105 transition-transform shrink-0 relative">
                      <span className="text-xl font-bold font-jp text-text-primary">
                        {book.coverIcon}
                      </span>
                      <span className="text-[8px] font-mono text-text-muted mt-0.5 uppercase tracking-tighter">
                        {isThematic ? 'TEMA' : 'BOOK'}
                      </span>
                      {/* Book spine line effect */}
                      <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border-subtle/50 rounded-full" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider border ${book.colorTheme.badgeBg}`}>
                          {isThematic ? 'TEMATIK' : book.level}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {book.chapters.length} Deck Bab
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-gold transition-colors mt-1">
                        {book.title}
                      </h2>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-surface-inset text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Subtitle & Description */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-secondary line-clamp-1">
                    {book.subtitle}
                  </p>
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                    {book.description}
                  </p>
                </div>
              </div>

              {/* Bottom Details & Progress */}
              <div className="pt-4 mt-4 border-t border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-muted flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-text-secondary" />
                    <span>{totalItems} Materi Pembelajaran</span>
                  </span>
                  <span className="text-text-primary font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-gold" />
                    <span>{pct}% Kuasai</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
                  <div
                    className="h-full bg-gold rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
