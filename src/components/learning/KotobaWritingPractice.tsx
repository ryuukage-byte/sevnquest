import { getWordTypeLabel } from '../../utils/wordType';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, RotateCcw, ArrowRight, Volume2, Layers, BookOpen, Clock } from 'lucide-react';
import { KotobaItem } from '../../types/content';
import { KanjiWritingCanvas, preloadStrokeData } from './KanjiWritingCanvas';
import { RubyText } from './RubyText';
import { playSound, speakJapanese } from '../../utils/audio';
import { getKotobaBaseExp, calculateWritingReward, WritingRewardResult } from '../../utils/rewards';
import { parseReadingVariations, getHighlightedKotobaYomikata } from '../../utils/readingHighlightUtils';

interface KotobaWritingPracticeProps {
  kotoba: KotobaItem;
  onFinishWord?: (score: number, reward?: WritingRewardResult) => void;
  onCompleteWord?: (score: number, reward?: WritingRewardResult) => void;
  onCancel?: () => void;
  soundEnabled?: boolean;
  nextButtonLabel?: string;
}

export const KotobaWritingPractice: React.FC<KotobaWritingPracticeProps> = ({
  kotoba,
  onFinishWord,
  onCompleteWord,
  onCancel,
  soundEnabled = true,
  nextButtonLabel,
}) => {
  const characters = useMemo(() => Array.from(kotoba.word), [kotoba.word]);
  const readingVariations = useMemo(() => parseReadingVariations(kotoba.reading), [kotoba.reading]);
  const hasMultipleReadings = readingVariations.length > 1;
  const [selectedReadingIdx, setSelectedReadingIdx] = useState<number>(-1);

  const displayPracticeReading = useMemo(() => {
    if (!hasMultipleReadings) return kotoba.reading;
    if (selectedReadingIdx >= 0 && selectedReadingIdx < readingVariations.length) {
      return readingVariations[selectedReadingIdx];
    }
    return readingVariations.join(' / ');
  }, [hasMultipleReadings, kotoba.reading, selectedReadingIdx, readingVariations]);

  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [completedChars, setCompletedChars] = useState<number[]>([]);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [watermarkEverUsed, setWatermarkEverUsed] = useState(false);
  const [animationCount, setAnimationCount] = useState(0);
  const [lastReward, setLastReward] = useState<WritingRewardResult | null>(null);

  // Award guard to prevent duplicate rewards for the same completion
  const hasAwardedRef = React.useRef(false);

  // Master Kotoba Stopwatch: persists across all syllables/characters
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const isWordFinished = completedChars.length === characters.length;

  // Reset state and stopwatch when kotoba changes
  useEffect(() => {
    setCurrentCharIndex(0);
    setCompletedChars([]);
    setTotalMistakes(0);
    setWatermarkEverUsed(false);
    setAnimationCount(0);
    setLastReward(null);
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    hasAwardedRef.current = false;
    // Preload all stroke data in the background!
    preloadStrokeData(kotoba.word);
  }, [kotoba.word]);

  // Timer interval running across the entire Kotoba practice session
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && !isWordFinished) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isWordFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentChar = characters[currentCharIndex];

  const triggerWordCompletion = (score: number, reward?: WritingRewardResult) => {
    if (hasAwardedRef.current) return;
    hasAwardedRef.current = true;
    onCompleteWord?.(score, reward);
  };

  const handleReset = () => {
    setCurrentCharIndex(0);
    setCompletedChars([]);
    setTotalMistakes(0);
    setElapsedSeconds(0); // Reset stopwatch from the beginning of the syllables
    setIsTimerRunning(true);
    hasAwardedRef.current = false;
    playSound('click', soundEnabled);
  };

  const handleFinishChar = () => {
    setCompletedChars(prev => [...prev, currentCharIndex]);
    
    if (currentCharIndex < characters.length - 1) {
      setTimeout(() => {
        setCurrentCharIndex(prev => prev + 1);
      }, 600); // Small delay before next char
    } else {
      // Final character completed
      setIsTimerRunning(false); // Stop stopwatch on word completion
      playSound('fanfare', soundEnabled);
      speakJapanese(displayPracticeReading || kotoba.reading || kotoba.word);
      const baseExp = getKotobaBaseExp(kotoba);
      const reward = calculateWritingReward({
        baseExp,
        elapsedSeconds,
        watermarkUsed: watermarkEverUsed,
        animationCount,
        mistakesCount: totalMistakes,
        strokeCount: characters.length * 4,
      });
      setLastReward(reward);
      const score = Math.max(0, 100 - (totalMistakes * 10));
      triggerWordCompletion(score, reward);
      // User reads the explanation card and can advance or go back to detail
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center space-y-5 animate-fade-in panel panel-stitched p-4 sm:p-6 rounded-3xl border border-border-subtle bg-surface-card">
      {!isWordFinished ? (
        <>
          {/* Active Recall Clue Header */}
          <div className="text-center space-y-3 w-full">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo/15 text-indigo border border-border-subtle text-xs font-bold flex items-center gap-1.5 shadow-sm font-heading">
                  <Edit3 className="w-3.5 h-3.5 text-indigo" /> Active Recall
                </span>
                <span className="px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle text-text-primary text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm" title="Stopwatch Waktu Menulis Kotoba">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  <span>{formatTime(elapsedSeconds)}</span>
                </span>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2 font-bold"
                >
                  Batal
                </button>
              )}
            </div>
            
            {/* Yomikata / Reading Card with dynamic syllable highlight per character (matching KanjiWritingCanvas layout) */}
            <div
              className="flex flex-col items-center justify-between px-4 py-3 rounded-2xl bg-surface-inset hover:bg-surface-card border border-border-subtle hover:border-border-primary transition-all shadow-inner group cursor-pointer w-full text-center"
              onClick={() => speakJapanese(displayPracticeReading || kotoba.reading || kotoba.word)}
              title="Klik untuk mendengar audio kata ini"
            >
              {/* Highlighted Yomikata Reading */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="font-bold font-jp">
                  {getHighlightedKotobaYomikata(kotoba.word, displayPracticeReading, currentCharIndex)}
                </div>
                <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent group-hover:scale-110 transition-all flex-shrink-0" />
              </div>

              {/* Indonesian Meaning */}
              <span className="text-xs sm:text-sm text-text-secondary font-medium leading-tight">
                {kotoba.meaningId}
              </span>
            </div>
          </div>

          {/* Target Slots */}
          <div className="flex items-end justify-center gap-2 sm:gap-3 py-1 min-h-[64px]">
            {characters.map((char, i) => {
              const isDone = completedChars.includes(i);
              const isActive = i === currentCharIndex;
              
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border transition-all relative
                      ${isDone ? 'bg-indigo/15 border-border-subtle shadow-sm' : 
                        isActive ? 'bg-surface-elevated border-border-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]' : 
                        'bg-surface-inset border-border-subtle shadow-[inset_1px_1px_3px_var(--neu-d)]'}
                    `}
                  >
                    <AnimatePresence>
                      {isDone && (
                        <motion.span
                          key={`span-${i}`}
                          initial={{ opacity: 0, y: 30, scale: 0.5 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-black text-indigo font-jp"
                        >
                          {char}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && !isDone && (
                      <motion.div
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-2 h-2 rounded-full bg-indigo"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Writing Canvas for the Current Character */}
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex justify-center" key={`canvas-${currentCharIndex}-${currentChar}`}>
              <KanjiWritingCanvas
                kanjiChar={currentChar}
                totalSheets={1} // 1 sheet per character for rapid recall
                soundEnabled={soundEnabled}
                autoAdvance={true}
                showStopwatch={false} // Use Kotoba's master word-level stopwatch
                showPromptHeader={false} // Master card already displays Kotoba prompt header
                level={kotoba.jlpt}
                onReady={() => {
                  if (!isWordFinished) {
                    setIsTimerRunning(true);
                  }
                }}
                onCompleteSheet={(_sheet, sheetScore, reward) => {
                  if (sheetScore < 100) {
                    setTotalMistakes(prev => prev + 1);
                  }
                  if (reward?.breakdown?.watermarkUsed) {
                    setWatermarkEverUsed(true);
                  }
                  if (reward?.breakdown?.hintsUsed) {
                    setAnimationCount(prev => prev + (reward.breakdown.hintsUsed || 0));
                  }
                }}
                onFinish={handleFinishChar}
              />
            </div>
          </div>
        </>
      ) : (
        /* Completion State: Full Kotoba Detail + Ulangi & Kembali Buttons */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full space-y-5 text-left"
        >
          {/* JLPT & Word Type Meta + Total Time */}
          <div className="flex items-center justify-center gap-2 flex-wrap pb-1 border-b border-border-subtle text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-text-primary font-bold border border-border-subtle shadow-sm">
              JLPT {kotoba.jlpt}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-text-muted border border-border-subtle uppercase font-semibold shadow-sm">
              {getWordTypeLabel(kotoba.wordType)}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-gold font-bold border border-border-subtle flex items-center gap-1.5 shadow-sm" title="Total Waktu Menulis Kotoba">
              <Clock className="w-3.5 h-3.5 text-gold" />
              <span>{formatTime(elapsedSeconds)}</span>
            </span>
          </div>

          {/* Giant Word & Reading Box */}
          <div className="text-center space-y-2 py-2">
            <h1 className="text-4xl sm:text-5xl font-black text-text-primary font-jp tracking-wider drop-shadow-sm">
              <RubyText japanese={kotoba.word} reading={displayPracticeReading} showFurigana={true} />
            </h1>
            {hasMultipleReadings ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {readingVariations.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedReadingIdx(i);
                        speakJapanese(v);
                        playSound('click', soundEnabled);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold font-jp border transition-all flex items-center gap-1.5 ${
                        selectedReadingIdx === i
                          ? 'bg-surface-elevated text-gold border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.25)] font-black'
                          : 'bg-surface-inset text-text-secondary border-border-subtle hover:border-border-muted hover:text-text-primary'
                      }`}
                      title={`Putar pelafalan #${i + 1}: ${v}`}
                    >
                      <span className="text-[10px] font-mono text-red-700 dark:text-amber-400 font-bold">#{i + 1}</span>
                      <span>{v}</span>
                      <Volume2 className="w-3.5 h-3.5 text-red-700 dark:text-amber-400" />
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-text-muted font-mono">
                  *Memiliki {readingVariations.length} cara baca alternatif. Hafalkan terpisah!
                </p>
              </div>
            ) : (
              <button
                onClick={() => speakJapanese(displayPracticeReading || kotoba.reading || kotoba.word)}
                className="btn-physical-secondary mx-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-colors text-xs font-bold"
                title="Dengarkan pelafalan"
              >
                <Volume2 className="w-3.5 h-3.5 text-wine-accent" />
                <span>Dengarkan Pelafalan</span>
              </button>
            )}
          </div>

          {/* Meaning Description Box */}
          <div className="space-y-1.5 bg-surface-inset p-4 rounded-2xl border border-border-subtle shadow-inner text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-black text-text-primary font-heading leading-snug">
              {kotoba.meaningId}
            </h3>
            {(kotoba.definitionId || kotoba.meaningJaId) && (
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                <span className="font-bold text-text-primary">Penjelasan Makna: </span>
                {kotoba.definitionId || kotoba.meaningJaId}
              </p>
            )}
            {kotoba.meaningJa && kotoba.meaningJa !== kotoba.word && (
              <p className="text-xs text-text-muted italic pt-0.5">
                <span className="not-italic font-semibold text-text-secondary">Makna JP: </span>
                <span className="font-jp">{kotoba.meaningJa}</span>
              </p>
            )}
            {kotoba.meaningEn && (
              <p className="text-[11px] text-text-secondary">
                English: {kotoba.meaningEn}
              </p>
            )}
          </div>

          {/* Kanji Components (if any) */}
          {kotoba.kanjiComponents && kotoba.kanjiComponents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Komponen Kanji
              </h4>
              <div className="flex flex-wrap gap-2">
                {kotoba.kanjiComponents.map((k, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-surface-inset text-text-primary border border-border-subtle text-sm font-jp font-bold shadow-sm"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Example Sentence (if any) */}
          {kotoba.exampleSentence && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Contoh Kalimat
              </h4>
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                <p className="text-sm font-jp text-text-primary leading-relaxed font-bold">
                  <RubyText 
                    japanese={kotoba.exampleSentence.japanese} 
                    reading={kotoba.exampleSentence.reading} 
                    showFurigana={true} 
                  />
                </p>
                <p className="text-xs text-text-secondary font-medium">
                  {kotoba.exampleSentence.meaningId}
                </p>
                <button
                  onClick={() => speakJapanese(kotoba.exampleSentence!.japanese)}
                  className="flex items-center gap-1.5 text-[11px] text-gold hover:underline font-bold uppercase tracking-wider mt-1"
                >
                  <Volume2 className="w-3 h-3" /> Putar Audio Kalimat
                </button>
              </div>
            </div>
          )}

          {/* Related Words / Collocations Preview (if any) */}
          {((kotoba.relatedWords && kotoba.relatedWords.length > 0) || (kotoba.collocations && kotoba.collocations.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {kotoba.relatedWords && kotoba.relatedWords.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                    Kata Terkait
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {kotoba.relatedWords.slice(0, 3).map((rw, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle font-jp text-text-primary">
                        {rw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {kotoba.collocations && kotoba.collocations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-text-muted uppercase tracking-wider text-[11px]">
                    Kolokasi (Frasa)
                  </span>
                  <div className="space-y-1">
                    {kotoba.collocations.slice(0, 2).map((c, i) => (
                      <p key={i} className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle font-jp text-text-secondary truncate">
                        {c}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: Ulangi Menulis & Lanjut Manual */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 w-full">
            <button
              type="button"
              onClick={handleReset}
              className="btn-physical-secondary flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-wine-accent" />
              <span>Ulangi Menulis</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                const score = Math.max(0, 100 - (totalMistakes * 10));
                triggerWordCompletion(score, lastReward || undefined);
                onFinishWord?.(score, lastReward || undefined);
              }}
              className="flex-1 btn btn-cta py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <span>{nextButtonLabel || 'Lanjut ke Kata Berikutnya'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                const score = Math.max(0, 100 - (totalMistakes * 10));
                triggerWordCompletion(score, lastReward || undefined);
                onCancel();
              }}
              className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2 font-bold transition-colors pt-1"
            >
              Kembali ke Detail
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};
