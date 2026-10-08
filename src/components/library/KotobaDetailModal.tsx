import { getWordTypeLabel } from '../../utils/wordType';
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Volume2, Layers, Link as LinkIcon, Network, Edit3, ChevronLeft, ChevronRight, Zap, AlertTriangle, ArrowLeft } from 'lucide-react';
import { BookIcon } from '../ui/EngravingIcons';
import { KotobaItem, ItemMasteryRecord, KanjiItem } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { KotobaWritingPractice } from '../learning/KotobaWritingPractice';
import { parseReadingVariations } from '../../utils/readingHighlightUtils';
import { fisherYatesShuffle } from '../../utils/smartRandomizer';
import { useBackButton } from '../../hooks/useBackButton';
import { KanjiDetailModal } from './KanjiDetailModal';

import { UserDeck } from '../../types/rpg';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';

interface KotobaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KotobaItem | null;
  masteryRecord?: ItemMasteryRecord;
  soundEnabled?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
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

export const KotobaDetailModal: React.FC<KotobaDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  masteryRecord,
  soundEnabled = true,
  isBookmarked = false,
  onToggleBookmark,
  userDecks,
  onToggleDeckItem,
  onUpdateDecks,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  onRewardPlayer,
  onRecordStudy,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  // Navigation stack inside modal (e.g. drilling down through related words)
  const [currentItem, setCurrentItem] = useState<KotobaItem | null>(item);
  const [navHistory, setNavHistory] = useState<KotobaItem[]>([]);
  const [selectedKanjiChar, setSelectedKanjiChar] = useState<string | null>(null);

  const [isWritingMode, setIsWritingMode] = useState(false);
  const [selectedReadingIndex, setSelectedReadingIndex] = useState<number>(-1);
  const hasRecordedWritingRef = React.useRef(false);

  // Sync internal item when external item prop changes
  useEffect(() => {
    if (item) {
      setCurrentItem(item);
      setNavHistory([]);
      setSelectedKanjiChar(null);
    }
  }, [item]);

  const effectiveItem = currentItem || item;

  // Handle drilldown back step
  const handleBackInHistory = () => {
    if (selectedKanjiChar) {
      setSelectedKanjiChar(null);
      playSound('click', soundEnabled);
      return true;
    }
    if (isWritingMode) {
      setIsWritingMode(false);
      playSound('click', soundEnabled);
      return true;
    }
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory(h => h.slice(0, -1));
      setCurrentItem(prev);
      playSound('click', soundEnabled);
      return true;
    }
    return false;
  };

  // Hardware & Mobile Back Button Trap
  useBackButton(isOpen, () => {
    const handled = handleBackInHistory();
    if (handled) return false; // Handled sub-step, keep modal open
    onClose();
  }, 'kotoba_detail_modal');

  const handleSelectRelatedWord = (wordStr: string) => {
    if (!effectiveItem) return;
    const found = Object.values(KOTOBA_DATABASE).find(k => k.word === wordStr);
    const target: KotobaItem = found || {
      id: `kotoba_rel_${wordStr}`,
      word: wordStr,
      reading: wordStr,
      meaningId: `Kosakata terkait 「${wordStr}」`,
      meaningEn: `Related word ${wordStr}`,
      meaningJa: wordStr,
      wordType: 'noun',
      jlpt: effectiveItem.jlpt || 'N5',
      kanjiComponents: Array.from(wordStr).filter(c => /[\u4e00-\u9faf]/.test(c)),
    };

    setNavHistory(prev => [...prev, effectiveItem]);
    setCurrentItem(target);
    setIsWritingMode(false);
    playSound('click', soundEnabled);
  };

  const getKanjiItemForChar = (char: string): KanjiItem => {
    const fromDb = KANJI_DATABASE[char] || Object.values(KANJI_DATABASE).find(kj => kj.character === char);
    if (fromDb) return fromDb;

    return {
      id: `kj_${char}`,
      character: char,
      meaningId: `Aksara Kanji 「${char}」`,
      meaningEn: `Kanji character ${char}`,
      onyomi: [],
      kunyomi: [],
      strokeCount: 1,
      radical: '',
      radicalName: '',
      jlpt: 'N5',
      relatedWords: effectiveItem ? [{ word: effectiveItem.word, reading: effectiveItem.reading, meaningId: effectiveItem.meaningId }] : [],
      questions: []
    };
  };

  useEffect(() => {
    if (!isOpen) {
      setIsWritingMode(false);
      hasRecordedWritingRef.current = false;
      setSelectedKanjiChar(null);
    } else if (effectiveItem?.id) {
      setSelectedReadingIndex(-1);
      hasRecordedWritingRef.current = false;
      onRecordInteraction?.(effectiveItem.id, 'kotoba', 'flashcard', true);
    }
  }, [isOpen, effectiveItem?.id]);

  const handleWritingWordCompleted = (score: number, reward?: import('../../utils/rewards').WritingRewardResult) => {
    if (!effectiveItem) return;
    if (hasRecordedWritingRef.current) return;
    hasRecordedWritingRef.current = true;

    const exp = reward?.expGained ?? 20;
    const gold = reward?.goldGained ?? 5;
    if (onCompleteStudyItem) {
      onCompleteStudyItem('kotoba', exp, gold, effectiveItem.id, score >= 60 ? 1 : 0, 1, 'writing');
    } else {
      if (onRecordInteraction) {
        onRecordInteraction(effectiveItem.id, 'kotoba', 'writing', score >= 60);
      }
      onRewardPlayer?.(exp, gold);
      onRecordStudy?.('flashcards', effectiveItem.id, 1);
    }
  };

  const readingVariations = useMemo(() => parseReadingVariations(effectiveItem?.reading), [effectiveItem?.reading]);
  const hasMultipleReadings = readingVariations.length > 1;

  const displayReading = useMemo(() => {
    if (!hasMultipleReadings) return effectiveItem?.reading || '';
    if (selectedReadingIndex >= 0 && selectedReadingIndex < readingVariations.length) {
      return readingVariations[selectedReadingIndex];
    }
    return readingVariations.join(' / ');
  }, [hasMultipleReadings, effectiveItem?.reading, selectedReadingIndex, readingVariations]);

  // Dynamically compute related words based on shared Kanji components
  const dynamicRelatedWords = useMemo(() => {
    if (!effectiveItem || !effectiveItem.kanjiComponents || effectiveItem.kanjiComponents.length === 0) return [];
    
    // Find up to 5 other words that share at least one kanji
    const allItems = Object.values(KOTOBA_DATABASE);
    const related = allItems.filter(other => 
      other.id !== effectiveItem.id && 
      other.kanjiComponents &&
      other.kanjiComponents.some(kanji => effectiveItem.kanjiComponents!.includes(kanji))
    );
    
    // Shuffle and pick 5
    return fisherYatesShuffle(related).slice(0, 5);
  }, [effectiveItem]);

  if (!isOpen || !effectiveItem) return null;
  if (typeof document === 'undefined') return null;

  const relatedWords = effectiveItem.relatedWords || dynamicRelatedWords.map(rw => rw.word);
  const collocations = effectiveItem.collocations || [];

  return createPortal(
    <motion.div key="modal-container" className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:p-6" exit={{ opacity: 0 }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            onClose();
            playSound('click', soundEnabled);
          }}
          className="fixed inset-0 bg-black/75"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="panel panel-stitched relative w-full max-w-lg border border-border-subtle rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle bg-surface-inset">
            <div className="flex items-center gap-2">
              {navHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleBackInHistory}
                  className="btn-physical-secondary p-1.5 -ml-1 rounded-xl hover:text-wine-accent transition-all flex items-center gap-1 text-xs font-bold mr-1 cursor-pointer"
                  title="Kembali ke kata sebelumnya"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Kembali</span>
                </button>
              )}
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-heading">
                <BookIcon className="w-4 h-4 text-gold" />
                Detail Kosakata
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {(onPrev || onNext) && (
                <div className="flex items-center gap-1 mr-1 border-r border-border-subtle pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPrev?.();
                      playSound('click', soundEnabled);
                    }}
                    disabled={!hasPrev}
                    className="btn-physical-secondary p-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Kata Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onNext?.();
                      playSound('click', soundEnabled);
                    }}
                    disabled={!hasNext}
                    className="btn-physical-secondary p-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Kata Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <DeckBookmarkPicker
                itemId={effectiveItem.id}
                category="kotoba"
                itemTitle={effectiveItem.word}
                itemSubtitle={effectiveItem.meaningId || (effectiveItem as any).meaning}
                userDecks={userDecks}
                onToggleDeckItem={onToggleDeckItem}
                isDefaultBookmarked={isBookmarked}
                onToggleDefaultBookmark={onToggleBookmark}
                onUpdateDecks={onUpdateDecks}
                soundEnabled={soundEnabled}
              />
              <button
                onClick={() => {
                  onClose();
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
            
            {isWritingMode ? (
              <KotobaWritingPractice
                key={`writing-${effectiveItem.id}`}
                kotoba={effectiveItem}
                soundEnabled={soundEnabled}
                nextButtonLabel={hasNext ? 'Lanjut ke Kata Berikutnya' : 'Selesai Menulis'}
                onCompleteWord={(score, reward) => {
                  handleWritingWordCompleted(score, reward);
                }}
                onFinishWord={(score, reward) => {
                  handleWritingWordCompleted(score, reward);
                  if (onNext && hasNext) {
                    onNext();
                  } else {
                    setIsWritingMode(false);
                  }
                }}
                onCancel={() => setIsWritingMode(false)}
              />
            ) : (
              <>
                {/* Top Area: Word, Reading, Meaning, Badges */}
                <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex gap-2 justify-center flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-surface-inset text-text-primary text-xs font-mono font-bold border border-border-subtle shadow-sm">
                  {effectiveItem.jlpt.startsWith('N') ? `JLPT ${effectiveItem.jlpt}` : effectiveItem.jlpt}
                </span>
                {effectiveItem.tags?.includes('Kaigo') && effectiveItem.jlpt !== 'Kaigo' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-border-subtle text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shadow-sm">
                    🩺 Kaigo
                  </span>
                )}
                {effectiveItem.unitName && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-surface-inset text-text-secondary border border-border-subtle shadow-sm">
                    Unit: {effectiveItem.unitName}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-surface-inset text-text-secondary border border-border-subtle shadow-sm">
                  {(effectiveItem.id.match(/\d+$/) ? parseInt(effectiveItem.id.match(/\d+$/)![0], 10) % 10 : 0) < 5
                    ? 'Essential (Core)'
                    : (effectiveItem.id.match(/\d+$/) ? parseInt(effectiveItem.id.match(/\d+$/)![0], 10) % 10 : 0) < 8
                    ? 'Important (High Frequency)'
                    : 'Supplementary (Lanjutan)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-inset text-text-muted text-xs font-mono border border-border-subtle uppercase font-bold shadow-sm">
                  {getWordTypeLabel(effectiveItem.wordType)}
                </span>
                {hasMultipleReadings && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-border-subtle text-red-700 dark:text-amber-400 bg-surface-inset shadow-sm flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-red-700 dark:text-amber-400 fill-red-700/20 dark:fill-amber-400/25 shrink-0" />
                    <span>{readingVariations.length} Cara Baca Alternatif</span>
                  </span>
                )}
              </div>

              {masteryRecord && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface-inset border border-border-subtle text-text-secondary shadow-xs">
                  <span title="Berapa kali dipelajari via flashcard">Flashcard: {masteryRecord.flashcardCount || 0}x</span>
                  <span className="opacity-40">|</span>
                  <span title="Berapa kali latihan menulis kata ini">Ditulis: {masteryRecord.writingCount || 0}x</span>
                  <span className="opacity-40">|</span>
                  <span className="text-gold" title="Mastery">Lv.{masteryRecord.masteryLevel || 1} ({masteryRecord.masteryPercentage || 0}%)</span>
                </div>
              )}
              
              <div className="space-y-3 w-full">
                <h1 className="text-5xl font-black text-text-primary font-jp tracking-wider">
                  <RubyText japanese={effectiveItem.word} reading={displayReading} showFurigana={true} />
                </h1>

                {hasMultipleReadings ? (
                  <div className="w-full max-w-md mx-auto space-y-3 pt-1">
                    {/* Reading variation selector pills */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReadingIndex(-1);
                          playSound('click', soundEnabled);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          selectedReadingIndex === -1
                            ? 'bg-surface-elevated text-text-primary border-border-primary shadow-xs font-black'
                            : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-secondary'
                        }`}
                      >
                        Semua ({readingVariations.join(' / ')})
                      </button>

                      {readingVariations.map((v, idx) => {
                        const isSelected = selectedReadingIndex === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedReadingIndex(idx);
                              speakJapanese(v);
                              playSound('click', soundEnabled);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-jp border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-surface-elevated text-gold border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.25)] font-black'
                                : 'bg-surface-inset text-text-secondary border-border-subtle hover:border-border-muted hover:text-text-primary'
                            }`}
                            title={`Pilih bacaan #${idx + 1} (${v}) & putar suara`}
                          >
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-red-700 dark:text-amber-400 font-bold">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-black">{v}</span>
                            <Volume2 className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Educational Note */}
                    <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-left text-xs space-y-1 shadow-inner">
                      <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-amber-400 font-heading text-[11.5px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700 dark:text-amber-400 shrink-0" />
                        <span>CATATAN: JANGAN DIHAFAL GABUNG!</span>
                      </div>
                      <p className="text-[11.5px] text-text-secondary leading-relaxed">
                        Kata ini memiliki <strong>{readingVariations.length} cara baca alternatif</strong> ({readingVariations.map(r => `「${r}」`).join(' atau ')}), <em>bukan dibaca sekaligus sebagai satu kesatuan kata</em>. Hafalkan masing-masing cara baca secara terpisah sesuai konteks penggunaannya. Klik tombol bacaan di atas untuk mendengarkan audio per kata.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => speakJapanese(effectiveItem.reading || effectiveItem.word)}
                    className="btn-physical-secondary mx-auto mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-xs font-bold cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Dengarkan
                  </button>
                )}
              </div>


              <div className="space-y-2 bg-surface-inset p-4 rounded-2xl w-full border border-border-subtle text-left sm:text-center">
                <h2 className="text-xl font-black text-text-primary font-heading leading-snug">
                  {effectiveItem.meaningId}
                </h2>
                {(effectiveItem.definitionId || effectiveItem.meaningJaId) && (
                  <p className="text-xs text-indigo-400 dark:text-indigo-300 leading-relaxed font-medium">
                    <span className="font-bold text-text-secondary">Penjelasan Makna: </span>
                    {effectiveItem.definitionId || effectiveItem.meaningJaId}
                  </p>
                )}
                {effectiveItem.meaningJa && effectiveItem.meaningJa !== effectiveItem.word && (
                  <p className="text-xs text-text-muted italic">
                    {effectiveItem.tags?.includes('Kaigo') ? 'Penjelasan JP (やさしい日本語): ' : 'Makna JP: '}
                    <span className="font-jp not-italic font-semibold text-text-secondary">{effectiveItem.meaningJa}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setIsWritingMode(true);
                  playSound('click', soundEnabled);
                }}
                className="btn-cta mt-2 w-full max-w-xs mx-auto py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 font-heading cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Latih dengan Menulis (Active Recall)</span>
              </button>
            </div>

            {/* Kanji Breakdown - Interactive Links */}
            {effectiveItem.kanjiComponents && effectiveItem.kanjiComponents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Komponen Kanji
                </h4>
                <div className="flex flex-wrap gap-2">
                  {effectiveItem.kanjiComponents.map((k, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedKanjiChar(k);
                        playSound('click', soundEnabled);
                      }}
                      className="btn-physical-secondary px-3 py-1.5 rounded-xl hover:text-wine-accent text-sm font-jp font-bold transition-all cursor-pointer flex items-center gap-1"
                      title={`Buka detail kanji 「${k}」 di ensiklopedi`}
                    >
                      <span>{k}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Example Sentences */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Contoh Kalimat</h4>
              {effectiveItem.exampleSentence ? (
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                  <p className="text-sm font-jp text-text-primary leading-relaxed font-bold">
                    <RubyText 
                      japanese={effectiveItem.exampleSentence.japanese} 
                      reading={effectiveItem.exampleSentence.reading} 
                      showFurigana={true} 
                    />
                  </p>
                  <p className="text-xs text-text-secondary font-medium">
                    {effectiveItem.exampleSentence.meaningId}
                  </p>
                  <button
                    onClick={() => speakJapanese(effectiveItem.exampleSentence!.japanese)}
                    className="flex items-center gap-1.5 text-[10px] text-gold hover:underline font-bold uppercase tracking-wider mt-2 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Putar Audio
                  </button>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">Belum ada contoh kalimat.</p>
              )}
            </div>

            {/* Related Words & Collocations Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Related Words - Interactive Links */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Kata Terkait
                </h4>
                {relatedWords.length > 0 ? (
                  <ul className="space-y-1.5">
                    {relatedWords.map((word, i) => {
                      const matchedItem = Object.values(KOTOBA_DATABASE).find(k => k.word === word);
                      return (
                        <li
                          key={i}
                          onClick={() => handleSelectRelatedWord(word)}
                          className="text-sm text-text-primary font-jp bg-surface-inset hover:bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border-subtle hover:border-border-primary transition-all cursor-pointer flex items-center justify-between group active:scale-98"
                          title={`Lihat detail kosakata 「${word}」`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold group-hover:text-gold transition-colors">{word}</span>
                            {matchedItem?.reading && matchedItem.reading !== word && (
                              <span className="text-[11px] text-text-muted font-normal truncate">
                                ({matchedItem.reading})
                              </span>
                            )}
                          </div>
                          {matchedItem?.meaningId && (
                            <span className="text-[10px] text-text-secondary truncate max-w-[120px] font-normal ml-2">
                              {matchedItem.meaningId}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted italic">Tidak ada referensi kata terkait.</p>
                )}
              </div>

              {/* Collocations - Clickable for Audio */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5" /> Kolokasi (Frasa)
                </h4>
                {collocations.length > 0 ? (
                  <ul className="space-y-1.5">
                    {collocations.map((colloc, i) => (
                      <li
                        key={i}
                        onClick={() => {
                          speakJapanese(colloc);
                          playSound('click', soundEnabled);
                        }}
                        className="text-sm text-text-primary font-jp bg-surface-inset hover:bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border-subtle hover:border-border-primary transition-all cursor-pointer flex items-center justify-between group active:scale-98"
                        title="Klik untuk mendengarkan lafal frasa"
                      >
                        <span>{colloc}</span>
                        <Volume2 className="w-3.5 h-3.5 text-text-muted group-hover:text-gold transition-colors shrink-0" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-border-subtle bg-surface-inset">
                    <p className="text-[10px] text-text-muted text-center leading-relaxed">
                      Kolokasi (penggabungan kata lazim) belum tersedia untuk kosakata ini.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </>
            )}

          </div>
        </motion.div>

        {/* Kanji Component Drilldown Modal */}
        {selectedKanjiChar && (
          <KanjiDetailModal
            isOpen={!!selectedKanjiChar}
            onClose={() => setSelectedKanjiChar(null)}
            item={getKanjiItemForChar(selectedKanjiChar)}
            soundEnabled={soundEnabled}
            userDecks={userDecks}
            onToggleDeckItem={onToggleDeckItem}
            onUpdateDecks={onUpdateDecks}
          />
        )}
      </motion.div>,
    document.body
  );
};
