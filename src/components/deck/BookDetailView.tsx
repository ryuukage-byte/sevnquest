import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  Award,
  ChevronRight,
  Layers
} from 'lucide-react';
import { OfficialBook, OfficialChapter } from '../../types/books';
import { ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';

interface BookDetailViewProps {
  book: OfficialBook;
  onBack: () => void;
  onSelectChapterDeck: (chapter: OfficialChapter) => void;
  onCloneChapter: (chapter: OfficialChapter) => void;
  clonedSuccessChapterId?: string | null;
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  onBack,
  onSelectChapterDeck,
  onCloneChapter,
  clonedSuccessChapterId,
  soundEnabled = true,
  itemMastery = {},
}) => {
  // Helper to calculate chapter mastery
  const getChapterStats = (chapter: OfficialChapter) => {
    const kanjiCount = chapter.items.filter(i => i.category === 'kanji').length;
    const kotobaCount = chapter.items.filter(i => i.category === 'kotoba').length;
    const bunpouCount = chapter.items.filter(i => i.category === 'bunpou').length;
    const total = chapter.items.length;

    let mastered = 0;
    for (const it of chapter.items) {
      const rec = itemMastery[it.id];
      if (rec && (rec.status === 'MASTERED' || rec.status === 'PERFECTED' || (rec.masteryPercentage && rec.masteryPercentage >= 80))) {
        mastered++;
      }
    }

    const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { kanjiCount, kotobaCount, bunpouCount, total, mastered, pct };
  };

  const totalBookItems = book.chapters.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            onBack();
            playSound('click', soundEnabled);
          }}
          className="flex items-center gap-2 text-xs sm:text-sm font-heading font-bold text-text-muted hover:text-text-primary transition-colors p-2 rounded-xl hover:bg-surface-inset"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Rak Buku</span>
        </button>

        <span className="text-xs font-mono text-text-muted">
          {book.chapters.length} Deck Tersedia
        </span>
      </div>

      {/* Book Cover Banner */}
      <div className={`panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle bg-surface-card space-y-4 shadow-sm relative overflow-hidden`}>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-20 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-col items-center justify-center shrink-0 relative">
              <span className="text-3xl font-bold font-jp text-text-primary">
                {book.coverIcon}
              </span>
              <span className="text-[9px] font-mono text-text-muted mt-1 uppercase tracking-tighter">
                {book.level}
              </span>
              <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border-subtle/60 rounded-full" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider border ${book.colorTheme.badgeBg}`}>
                  {book.level}
                </span>
                <span className="text-xs font-mono text-text-muted">
                  {book.chapters.length} Deck Bab · {totalBookItems} Total Materi
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">
                {book.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="space-y-1 px-1">
        <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading flex items-center gap-2">
          <Layers className="w-4 h-4 text-gold" />
          <span>Daftar Deck Bab Pembelajaran ({book.chapters.length} Deck)</span>
        </h2>
        <p className="text-xs text-text-secondary font-body">
          Pilih salah satu deck di bawah untuk membuka kartu hafalan, belajar flashcard, latihan menulis kuas, atau menyalin ke Buku Saku pribadimu.
        </p>
      </div>

      {/* Grid of Chapter Decks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {book.chapters.map((chapter) => {
          const stats = getChapterStats(chapter);
          const isCloned = clonedSuccessChapterId === chapter.id;

          return (
            <div
              key={chapter.id}
              onClick={() => {
                onSelectChapterDeck(chapter);
                playSound('click', soundEnabled);
              }}
              className="panel panel-stitched p-5 rounded-3xl border border-border-subtle hover:border-border-primary bg-surface-card cursor-pointer group transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Top Row: Icon, Deck Badge, and Quick Clone */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center group-hover:scale-105 group-hover:border-border-primary transition-all shadow-inner shrink-0">
                      <span className="font-jp font-bold text-base text-text-primary group-hover:text-gold transition-colors">
                        {chapter.coverIcon || book.coverIcon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider font-mono text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-border-subtle">
                        Deck Bab {chapter.chapterNumber}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {book.level}
                      </span>
                    </div>
                  </div>

                  {/* Bookmark / Clone button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloneChapter(chapter);
                    }}
                    disabled={isCloned}
                    className={`p-2 rounded-xl border transition-all shrink-0 ${
                      isCloned
                        ? 'bg-emerald-500/15 text-emerald-500 border-border-subtle'
                        : 'bg-surface-inset text-text-muted hover:text-gold hover:border-border-primary border-border-subtle'
                    }`}
                    title={isCloned ? 'Sudah tersalin ke Buku Saku Saya' : 'Salin deck bab ini ke Buku Saku Saya'}
                  >
                    {isCloned ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Chapter Title */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary font-heading line-clamp-2 group-hover:text-gold transition-colors leading-snug">
                    {chapter.titleId}
                  </h3>
                </div>

                {/* Content Category Badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] font-mono font-medium text-text-muted mr-1">
                    {stats.total} Kartu:
                  </span>
                  {stats.kanjiCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-border-subtle">
                      {stats.kanjiCount} Kanji
                    </span>
                  )}
                  {stats.kotobaCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-border-subtle">
                      {stats.kotobaCount} Kotoba
                    </span>
                  )}
                  {stats.bunpouCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-border-subtle">
                      {stats.bunpouCount} Bunpou
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Mastery & Open Button */}
              <div className="pt-3 mt-3 border-t border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                    {stats.pct > 0 ? (
                      <span className="text-gold font-bold">
                        {stats.pct}% Dikuasai ({stats.mastered}/{stats.total})
                      </span>
                    ) : (
                      <span>Belum dipelajari</span>
                    )}
                  </div>
                  <span className="font-heading font-bold text-xs text-gold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Buka Deck <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-surface-inset rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all duration-300"
                    style={{ width: `${stats.pct}%` }}
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
