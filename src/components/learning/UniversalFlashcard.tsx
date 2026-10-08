import { getWordTypeLabel } from '../../utils/wordType';
import React from 'react';
import { Volume2 } from 'lucide-react';
import { RubyText } from './RubyText';
import { playSound, speakJapanese } from '../../utils/audio';
import { ResolvedDeckItem } from '../../utils/decks';
import { KotobaItem, KanjiItem, BunpouItem } from '../../types/content';
import { parseReadingVariations } from '../../utils/readingHighlightUtils';
import { getEnrichedKanjiRelatedWords } from '../../utils/kanjiVocabularyEnricher';


export type UniversalFlashcardItem =
  | ResolvedDeckItem
  | KotobaItem
  | KanjiItem
  | BunpouItem
  | {
      id?: string;
      category?: 'kotoba' | 'kanji' | 'bunpou';
      displayTitle?: string;
      displayReading?: string;
      displayMeaning?: string;
      level?: string;
      kotoba?: KotobaItem;
      kanji?: KanjiItem;
      bunpou?: BunpouItem;
      [key: string]: any;
    };

export interface UniversalFlashcardProps {
  item: UniversalFlashcardItem;
  isFlipped: boolean;
  onFlip: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
  className?: string;
  topRightExtra?: React.ReactNode;
}

import { asFlashcard } from '../../engine/traits/traits';

interface NormalizedCardData {
  category: 'kanji' | 'kotoba' | 'bunpou';
  kanji?: KanjiItem;
  kotoba?: KotobaItem;
  bunpou?: BunpouItem;
  displayTitle: string;
  displayReading: string;
  displayMeaning: string;
  level: string;
}

function normalizeItem(raw: UniversalFlashcardItem): NormalizedCardData {
  const trait = asFlashcard(raw);
  if (!trait) {
    return {
      category: 'kotoba',
      displayTitle: (raw as any)?.displayTitle || (raw as any)?.word || (raw as any)?.character || '—',
      displayReading: (raw as any)?.displayReading || (raw as any)?.reading || '',
      displayMeaning: (raw as any)?.displayMeaning || (raw as any)?.meaningId || '',
      level: (raw as any)?.level || 'N5',
    };
  }

  return {
    category: trait.category,
    kanji: trait.kanji,
    kotoba: trait.kotoba,
    bunpou: trait.bunpou,
    displayTitle: trait.displayTitle,
    displayReading: trait.displayReading,
    displayMeaning: trait.displayMeaning,
    level: trait.level,
  };
}


export const UniversalFlashcard: React.FC<UniversalFlashcardProps> = ({
  item,
  isFlipped,
  onFlip,
  soundEnabled = true,
  furiganaEnabled = true,
  className = '',
  topRightExtra,
}) => {
  const norm = normalizeItem(item);

  const kotobaVariations = React.useMemo(() => {
    return parseReadingVariations(norm.kotoba?.reading || norm.displayReading);
  }, [norm.kotoba?.reading, norm.displayReading]);
  const hasMultipleKotobaReadings = kotobaVariations.length > 1;
  const kotobaRubyReading = hasMultipleKotobaReadings
    ? kotobaVariations.join(' / ')
    : (norm.kotoba?.reading || norm.displayReading);

  const kanjiTotalReadings = React.useMemo(() => {
    return (norm.kanji?.onyomi?.length || 0) + (norm.kanji?.kunyomi?.length || 0);
  }, [norm.kanji?.onyomi, norm.kanji?.kunyomi]);
  const hasMultipleKanjiReadings = kanjiTotalReadings > 1;

  const handleCardClick = () => {
    playSound('click', soundEnabled);
    onFlip();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative w-full aspect-[4/3] min-h-[360px] max-h-[460px] rounded-3xl cursor-pointer perspective-1000 select-none group ${className}`}
    >
      <div className={`card w-full h-full relative ${isFlipped ? 'flipped' : ''}`}>
        
        {/* ================================================================== */}
        {/* FRONT OF CARD                                                      */}
        {/* ================================================================== */}
        <div className="face rounded-3xl border border-border-subtle bg-surface-card p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl overflow-y-auto no-scrollbar">
          
          {norm.category === 'kanji' ? (
            <>
              {/* Kanji Top Meta Bar */}
              <div className="w-full flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-surface-inset text-wine-accent border border-border-subtle text-[11px] font-mono font-bold">
                    Kanji • {norm.kanji?.jlpt || norm.level}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-inset text-text-secondary border border-border-subtle text-[11px] font-mono">
                    {norm.kanji?.strokeCount || 1} Goresan
                  </span>
                  {hasMultipleKanjiReadings && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-inset text-red-700 dark:text-amber-400 border border-border-subtle text-[10px] font-mono font-bold flex items-center gap-1">
                      <span>⚡</span> {kanjiTotalReadings} Cara Baca
                    </span>
                  )}
                  {norm.kanji?.radical && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-inset text-text-muted border border-border-subtle text-[10px] font-jp">
                      部首: {norm.kanji.radical}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {topRightExtra}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const readingToSpeak =
                        norm.kanji?.kunyomi?.[0]?.replace(/[.-]/g, '') ||
                        norm.kanji?.onyomi?.[0]?.split(' ')[0] ||
                        norm.kanji?.character ||
                        norm.displayTitle;
                      speakJapanese(readingToSpeak);
                    }}
                    className="btn-physical-secondary p-2 rounded-xl text-wine-accent transition-colors"
                    title="Dengar pelafalan"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Giant Kanji Center */}
              <div className="text-center space-y-2 my-auto">
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-surface-inset border border-border-subtle flex items-center justify-center text-6xl sm:text-7xl font-bold text-wine-accent font-jp shadow-inner select-none group-hover:scale-105 transition-transform">
                  {norm.kanji?.character || norm.displayTitle}
                </div>
                <p className="text-xs font-mono text-text-secondary pt-1">
                  {norm.kanji?.onyomi?.[0] || norm.kanji?.kunyomi?.[0] || norm.displayReading}
                </p>
                <p className="text-xs text-text-muted pt-1 font-mono">
                  (Klik untuk membalik kartu & melihat arti & yomikata)
                </p>
              </div>

              {/* Bottom Radical Info */}
              <div className="text-[11px] text-text-muted font-mono">
                {norm.kanji?.radicalName ? `Radikal: ${norm.kanji.radicalName}` : 'Karakter Kanji'}
              </div>
            </>
          ) : norm.category === 'bunpou' ? (
            <>
              {/* Bunpou Top Meta Bar */}
              <div className="w-full flex justify-between items-center text-xs">
                <span className="px-2.5 py-1 rounded-full bg-surface-inset text-purple-400 border border-border-subtle text-[11px] font-mono font-bold">
                  Bunpou • {norm.bunpou?.level || norm.level}
                </span>
                <div className="flex items-center gap-1.5">
                  {topRightExtra}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakJapanese(norm.bunpou?.title || norm.displayTitle);
                    }}
                    className="btn-physical-secondary p-2 rounded-xl text-purple-400 transition-colors"
                    title="Dengar pelafalan"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Giant Bunpou Center */}
              <div className="text-center space-y-2 my-auto">
                <h3 className="text-3xl sm:text-4xl font-black text-text-primary tracking-wide font-jp drop-shadow-sm">
                  {norm.bunpou?.title || norm.displayTitle}
                </h3>
                <div className="inline-block px-3.5 py-1.5 rounded-xl bg-surface-inset border border-border-subtle text-purple-300 font-mono text-xs font-bold shadow-sm">
                  {norm.bunpou?.formula || norm.displayReading}
                </div>
                <p className="text-xs text-text-muted pt-2 font-mono">
                  (Klik untuk membalik kartu & melihat aturan & contoh)
                </p>
              </div>

              {/* Bottom Function Tag */}
              <div className="text-[11px] text-text-muted font-mono">
                {norm.bunpou?.functions?.[0] || 'Kaidah Tata Bahasa'}
              </div>
            </>
          ) : (
            /* Kotoba (Kosakata) Front Face */
            <>
              {/* Kotoba Top Meta Bar */}
              <div className="w-full flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-surface-inset text-indigo border border-border-subtle text-[11px] font-mono font-bold">
                    {norm.kotoba?.jlpt || norm.level} • {getWordTypeLabel(norm.kotoba?.wordType) || 'Kosakata'}
                  </span>
                  {hasMultipleKotobaReadings && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-inset text-red-700 dark:text-amber-400 border border-border-subtle text-[10px] font-mono font-bold flex items-center gap-1">
                      <span>⚡</span> {kotobaVariations.length} Cara Baca
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {topRightExtra}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakJapanese(norm.kotoba?.word || norm.displayTitle);
                    }}
                    className="btn-physical-secondary p-2 rounded-xl text-gold transition-colors"
                    title="Dengar pelafalan"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Center Big Word with RubyText */}
              <div className="text-center space-y-2 my-auto">
                <h3 className="text-4xl sm:text-5xl font-black text-text-primary tracking-wider font-heading drop-shadow-sm">
                  <RubyText
                    japanese={norm.kotoba?.word || norm.displayTitle}
                    reading={kotobaRubyReading}
                    showFurigana={furiganaEnabled}
                  />
                </h3>
                <p className="text-xs text-text-muted pt-2 font-mono">
                  (Klik untuk membalik kartu & melihat arti)
                </p>
              </div>

              {/* Kanji Breakdown Pills */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {(norm.kotoba?.kanjiComponents || []).length > 0 ? (
                  norm.kotoba!.kanjiComponents.map((k, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2.5 py-0.5 rounded-md bg-surface-inset text-text-secondary border border-border-subtle font-jp font-bold shadow-sm"
                    >
                      {k}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-text-muted font-mono">
                    Kana Fonetik (Hiragana/Katakana)
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ================================================================== */}
        {/* BACK OF CARD                                                       */}
        {/* ================================================================== */}
        <div className="face back rounded-3xl border border-border-subtle bg-surface-elevated p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl overflow-y-auto no-scrollbar">
          
          {norm.category === 'kanji' ? (
            <>
              {/* Kanji Top Header */}
              <div className="w-full flex justify-between items-center text-xs">
                <span className="text-wine-accent font-bold tracking-wider uppercase font-mono">
                  Detail & Makna Kanji
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const readingToSpeak =
                      norm.kanji?.kunyomi?.[0]?.replace(/[.-]/g, '') ||
                      norm.kanji?.onyomi?.[0]?.split(' ')[0] ||
                      norm.kanji?.character ||
                      norm.displayTitle;
                    speakJapanese(readingToSpeak);
                  }}
                  className="btn-physical-secondary p-2 rounded-xl text-wine-accent transition-colors"
                  title="Dengar pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Kanji Center Details */}
              <div className="text-center space-y-2.5 my-auto w-full max-w-md">
                <h4 className="text-2xl sm:text-3xl font-black text-gold font-heading leading-tight">
                  {norm.kanji?.meaningId || norm.displayMeaning}
                </h4>
                {norm.kanji?.meaningEn && (
                  <p className="text-xs text-text-secondary italic">
                    English: {norm.kanji.meaningEn}
                  </p>
                )}

                {/* Onyomi & Kunyomi Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left">
                    <span className="text-[10px] font-bold text-wine-accent uppercase font-mono block mb-1">
                      音読み (Onyomi)
                    </span>
                    <div className="flex flex-wrap gap-1 font-jp font-bold text-text-primary">
                      {(norm.kanji?.onyomi || []).length > 0 ? (
                        norm.kanji!.onyomi.map((on, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakJapanese(on.split(' ')[0]);
                            }}
                            className="px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle hover:border-border-primary text-wine-accent flex items-center gap-1 text-xs transition-colors"
                            title="Dengar bacaan Onyomi"
                          >
                            <span>{on}</span>
                            <Volume2 className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))
                      ) : (
                        <span className="text-text-muted italic text-[11px]">-</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left">
                    <span className="text-[10px] font-bold text-state-success uppercase font-mono block mb-1">
                      訓読み (Kunyomi)
                    </span>
                    <div className="flex flex-wrap gap-1 font-jp font-bold text-text-primary">
                      {(norm.kanji?.kunyomi || []).length > 0 ? (
                        norm.kanji!.kunyomi.map((kun, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakJapanese(kun.replace(/[.-]/g, '').split(' ')[0]);
                            }}
                            className="px-1.5 py-0.5 rounded bg-surface-card border border-state-success/20 hover:border-state-success text-state-success flex items-center gap-1 text-xs transition-colors"
                            title="Dengar bacaan Kunyomi"
                          >
                            <span>{kun}</span>
                            <Volume2 className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))
                      ) : (
                        <span className="text-text-muted italic text-[11px]">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {hasMultipleKanjiReadings && (
                  <p className="text-[10px] text-text-muted font-mono text-center pt-0.5">
                    *Kanji memiliki {kanjiTotalReadings} cara baca (Onyomi &amp; Kunyomi). Hafalkan terpisah sesuai konteks!
                  </p>
                )}

                {/* Related Words */}
                {(() => {
                  const words = norm.kanji?.character
                    ? getEnrichedKanjiRelatedWords(norm.kanji.character, norm.kanji.relatedWords, 6)
                    : (norm.kanji?.relatedWords || []);
                  if (!words || words.length === 0) return null;
                  return (
                    <div className="w-full p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left space-y-1 mt-1">
                      <span className="text-[10px] font-bold text-text-muted uppercase font-mono">
                        Contoh Kosakata Terkait:
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {words.map((rw, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakJapanese(rw.word);
                            }}
                            className="px-2 py-1 rounded-lg bg-surface-card border border-border-subtle hover:border-border-primary flex items-center gap-1.5 text-[11px] transition-colors"
                          >
                            <span className="font-jp font-bold text-text-primary">{rw.word}</span>
                            <span className="text-text-muted font-mono">({rw.reading})</span>
                            <span className="text-text-secondary">— {rw.meaningId}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <p className="text-[11px] text-text-muted font-mono">
                (Klik untuk kembali ke tampilan depan)
              </p>
            </>
          ) : norm.category === 'bunpou' ? (
            <>
              {/* Bunpou Top Header */}
              <div className="w-full flex justify-between items-center text-xs">
                <span className="text-purple-400 font-bold tracking-wider uppercase font-mono">
                  Makna & Aturan Tata Bahasa
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakJapanese(norm.bunpou?.title || norm.displayTitle);
                  }}
                  className="btn-physical-secondary p-2 rounded-xl text-purple-400 transition-colors"
                  title="Dengar pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bunpou Center Details */}
              <div className="text-center space-y-2.5 my-auto w-full max-w-md">
                <h4 className="text-xl sm:text-2xl font-black text-gold font-heading leading-tight">
                  {norm.bunpou?.meaningId || norm.displayMeaning}
                </h4>

                {/* Formula Box */}
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle text-left space-y-1">
                  <span className="text-[10px] font-bold text-purple-400 uppercase font-mono block">
                    Rumus & Pembentukan:
                  </span>
                  <p className="font-mono text-xs text-text-primary font-bold">
                    {norm.bunpou?.formula || norm.displayReading}
                  </p>
                </div>

                {/* Explanation */}
                {norm.bunpou?.explanation && (
                  <p className="text-xs text-text-secondary italic text-left bg-surface-inset/50 p-2.5 rounded-xl border border-border-subtle/50">
                    "{norm.bunpou.explanation}"
                  </p>
                )}

                {/* Example Sentences */}
                {norm.bunpou?.examples && norm.bunpou.examples.length > 0 && (
                  <div className="w-full p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-left space-y-1.5">
                    <span className="text-[10px] font-bold text-text-muted uppercase font-mono">
                      Contoh Penggunaan:
                    </span>
                    <div className="space-y-1.5">
                      {norm.bunpou.examples.slice(0, 2).map((ex, i) => (
                        <div key={i} className="text-xs space-y-0.5 border-b border-border-subtle/40 pb-1 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-jp font-bold text-text-primary">{ex.japanese}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakJapanese(ex.japanese);
                              }}
                              className="p-1 rounded text-purple-400 hover:bg-surface-elevated"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-text-secondary">{ex.meaningId}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-text-muted font-mono">
                (Klik untuk kembali ke tampilan depan)
              </p>
            </>
          ) : (
            /* Kotoba Back Face */
            <>
              {/* Kotoba Top Header */}
              <div className="w-full flex justify-between items-center text-xs">
                <span className="text-indigo font-bold tracking-wider uppercase font-mono">
                  Terjemahan & Arti Kosakata
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakJapanese(norm.kotoba?.word || norm.displayTitle);
                  }}
                  className="btn-physical-secondary p-2 rounded-xl text-gold transition-colors"
                  title="Dengar pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Kotoba Center Details */}
              <div className="text-center space-y-2.5 my-auto w-full max-w-md">
                <h4 className="text-2xl sm:text-3xl font-black text-gold font-heading leading-tight">
                  {norm.kotoba?.meaningId || norm.displayMeaning}
                </h4>
                {(norm.kotoba?.definitionId || norm.kotoba?.meaningJaId) && (
                  <p className="text-xs text-amber-200/90 dark:text-amber-300 font-medium">
                    <span className="font-bold text-text-primary">Penjelasan: </span>
                    {norm.kotoba.definitionId || norm.kotoba.meaningJaId}
                  </p>
                )}
                {norm.kotoba?.meaningJa && norm.kotoba.meaningJa !== (norm.kotoba?.word || norm.displayTitle) && (
                  <p className="text-xs text-text-secondary italic font-jp">
                    Definisi JP: {norm.kotoba.meaningJa}
                  </p>
                )}
                {norm.kotoba?.meaningEn && (
                  <p className="text-xs text-text-muted italic">
                    English: {norm.kotoba.meaningEn}
                  </p>
                )}

                {/* Alternative Readings Box for Kotoba */}
                {hasMultipleKotobaReadings && (
                  <div className="w-full p-2.5 rounded-2xl bg-surface-inset border border-border-subtle text-left space-y-1.5 my-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-red-700 dark:text-amber-400 font-heading">
                      <span>⚡ Memiliki {kotobaVariations.length} Cara Baca (Hafalkan Terpisah):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {kotobaVariations.map((v, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJapanese(v);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-surface-card border border-border-subtle hover:border-red-700/40 text-text-primary text-xs font-jp font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          title={`Dengarkan bacaan #${i + 1}: ${v}`}
                        >
                          <span className="text-[10px] font-mono text-red-700 dark:text-amber-400 font-bold">#{i + 1}</span>
                          <span>{v}</span>
                          <Volume2 className="w-3 h-3 text-red-700 dark:text-amber-400" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight">
                      *Peringatan: Bukan dibaca sekaligus! Masing-masing digunakan sesuai konteks.
                    </p>
                  </div>
                )}

                {/* Example Sentence */}
                {norm.kotoba?.exampleSentence && (
                  <div className="mt-2 p-3 rounded-xl bg-surface-inset border border-border-subtle text-left space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-text-primary">
                        <RubyText
                          japanese={norm.kotoba.exampleSentence.japanese}
                          reading={norm.kotoba.exampleSentence.reading}
                          showFurigana={furiganaEnabled}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakJapanese(norm.kotoba!.exampleSentence!.japanese);
                        }}
                        className="btn-physical-secondary p-1.5 rounded-lg text-gold shrink-0 transition-colors"
                        title="Dengarkan kalimat contoh"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary font-medium">
                      {norm.kotoba.exampleSentence.meaningId}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-text-muted font-mono">
                (Klik untuk kembali ke tampilan depan)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
