import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, RotateCcw, CheckCircle2, XCircle, Volume2 } from 'lucide-react';
import { Question } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from './RubyText';

interface StarSentenceQuizProps {
  question: Question;
  isAnswered: boolean;
  onAnswer: (selectedOptionIndex: number, isCorrect: boolean) => void;
  soundEnabled?: boolean;
}

export const StarSentenceQuiz: React.FC<StarSentenceQuizProps> = ({
  question,
  isAnswered,
  onAnswer,
  soundEnabled = true,
}) => {
  // Determine parts of the prompt: prefix, blanks, and suffix
  // e.g. "山田さんは ______ ______ __★__ ______ 会社を辞めたらしい。"
  // Or if prompt contains ★, extract parts around blanks
  const starPosition = question.starIndex ?? 2; // 0-indexed (2 = 3rd slot)

  // Options as items with their original index (0 to 3)
  const [availableItems, setAvailableItems] = useState<{ text: string; originalIndex: number }[]>([]);
  const [slots, setSlots] = useState<( { text: string; originalIndex: number } | null)[]>([null, null, null, null]);
  const [submitted, setSubmitted] = useState(false);
  // Hasil penilaian disimpan SEKALI saat verifikasi; seluruh tampilan feedback memakai nilai yang sama
  // dengan skor, bukan menghitung ulang dari indeks (yang bisa berbeda).
  const [result, setResult] = useState<boolean | null>(null);

  // Satu sumber teks untuk kartu di pool DAN isi slot. Dulu pool memakai `options` sedangkan slot memakai
  // `scrambleWords`, sehingga kartu yang diketuk dan teks yang masuk slot bisa berbeda.
  const sourceTexts: string[] =
    question.scrambleWords && question.scrambleWords.length === 4 ? question.scrambleWords : question.options;
  const orderedTarget = question.orderedTarget && question.orderedTarget.length === 4 ? question.orderedTarget : null;

  // Initialize available items from question options or scrambleWords
  const questionKey = question.id || question.prompt;
  useEffect(() => {
    setAvailableItems(sourceTexts.map((text, idx) => ({ text, originalIndex: idx })));
    setSlots([null, null, null, null]);
    setSubmitted(false);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey]);

  // Clean prompt text for display
  // Split prompt around the blanks pattern if possible
  const promptText = question.prompt || '';
  let prefix = '';
  let suffix = '';
  
  // Match patterns like "前置テキスト ______ ______ __★__ ______ 後置テキスト"
  // or "〜＿＿＿　＿＿＿　＿★＿　＿＿＿〜"
  const blanksRegex = /[＿_]{2,}\s*[＿_]{2,}\s*[＿_]*[★*☆][＿_]*\s*[＿_]{2,}/;
  const match = promptText.match(blanksRegex);
  if (match && match.index !== undefined) {
    prefix = promptText.substring(0, match.index).trim();
    suffix = promptText.substring(match.index + match[0].length).trim();
  } else {
    // Fallback: if prompt has ★, split around it or show prompt above
    prefix = promptText.replace(/[＿_]{2,}/g, '').replace(/[★*☆]/g, '').trim();
  }

  // Handle placing a card into the next empty slot
  const handleSelectCard = (item: { text: string; originalIndex: number }) => {
    if (submitted || isAnswered) return;
    
    const firstEmptyIndex = slots.findIndex(s => s === null);
    if (firstEmptyIndex === -1) return;

    playSound('click', soundEnabled);
    const newSlots = [...slots];
    newSlots[firstEmptyIndex] = item;
    setSlots(newSlots);

    setAvailableItems(prev => prev.filter(i => i.originalIndex !== item.originalIndex));
  };

  // Handle removing a card from a slot back to available cards
  const handleRemoveFromSlot = (slotIdx: number) => {
    if (submitted || isAnswered) return;
    const item = slots[slotIdx];
    if (!item) return;

    playSound('click', soundEnabled);
    const newSlots = [...slots];
    newSlots[slotIdx] = null;
    setSlots(newSlots);

    setAvailableItems(prev => [...prev, item].sort((a, b) => a.originalIndex - b.originalIndex));
  };

  // Reset all slots
  const handleResetSlots = () => {
    if (submitted || isAnswered) return;
    playSound('click', soundEnabled);
    setAvailableItems(sourceTexts.map((text, idx) => ({ text, originalIndex: idx })));
    setSlots([null, null, null, null]);
  };

  // Verify answer
  const handleVerify = () => {
    if (submitted || isAnswered) return;
    const allFilled = slots.every(s => s !== null);
    if (!allFilled) return;

    setSubmitted(true);

    // The item sitting in the star slot
    const starItem = slots[starPosition];
    const starOptionIndex = starItem ? starItem.originalIndex : -1;

    // Bila ada urutan target, itulah kebenarannya (correctIndex pada soal ini merujuk ke `options`,
    // bukan ke `scrambleWords`, jadi membandingkan indeks tidak bermakna). Selain itu: kata di posisi ★.
    const isCorrect = orderedTarget
      ? slots.map(s => s?.text).join('') === orderedTarget.join('')
      : starOptionIndex === question.correctIndex;
    setResult(isCorrect);

    if (isCorrect) {
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }

    onAnswer(starOptionIndex, isCorrect);
  };

  const allSlotsFilled = slots.every(s => s !== null);
  const starWord = slots[starPosition]?.text;
  const correctOptionText = question.options[question.correctIndex];

  // Full constructed sentence
  const constructedSentence = `${prefix} ${slots.map(s => s?.text || '＿＿').join(' ')} ${suffix}`.trim();

  return (
    <div className="w-full space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-surface-inset border border-border-subtle text-gold text-xs font-bold font-heading flex items-center gap-1.5 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
            <span>文の組み立て (Susun Kalimat Bintang)</span>
          </span>
          <span className="text-[11px] text-text-secondary hidden sm:inline">
            Susun 4 bagian kata & temukan kata di posisi ★
          </span>
        </div>

        {!submitted && !isAnswered && slots.some(s => s !== null) && (
          <button
            onClick={handleResetSlots}
            className="btn btn-pill px-2.5 py-1 text-xs font-bold flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Main Sentence Card with Slots */}
      <div className="panel panel-stitched p-4 sm:p-5 shadow-md space-y-4">
        {/* Instruction note */}
        <p className="text-xs text-text-secondary font-medium">
          Ketuk kartu di bawah untuk mengisi slot 1, 2, ★, dan 4 secara berurutan:
        </p>

        {/* Sentence Frame with 4 Interactive Slots */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 py-2 px-1 text-sm sm:text-base font-bold text-text-primary">
          {prefix && (
            <span className="text-text-primary font-jp px-1 py-1 text-base sm:text-lg leading-loose">
              <RubyText japanese={prefix} showFurigana={true} />
            </span>
          )}

          {/* The 4 Slots */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
            {slots.map((slot, idx) => {
              const isStarSlot = idx === starPosition;
              const isFilled = slot !== null;

              return (
                <div key={idx} className="relative flex flex-col items-center">
                  <motion.button
                    whileTap={!submitted ? { scale: 0.96 } : {}}
                    onClick={() => handleRemoveFromSlot(idx)}
                    disabled={submitted || isAnswered || !isFilled}
                    className={`min-w-[70px] sm:min-w-[90px] h-12 sm:h-14 px-3 py-1.5 rounded-xl text-center text-xs sm:text-sm font-jp font-bold flex items-center justify-center transition-all border shadow-sm ${
                      isFilled
                        ? isStarSlot
                          ? submitted
                            ? result === true
                              ? 'bg-state-success/20 text-state-success border-state-success'
                              : 'bg-wine-accent/20 text-wine-accent border-border-subtle'
                            : 'bg-surface-elevated text-gold border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.25)]'
                          : submitted
                            ? 'bg-surface-inset text-text-secondary border-border-subtle'
                            : 'bg-surface-card text-text-primary border-border-subtle hover:border-border-muted'
                        : isStarSlot
                          ? 'border border-dashed border-border-subtle bg-gold/5 text-gold shadow-[inset_1px_1px_3px_var(--neu-d)]'
                          : 'border border-dashed border-border-subtle bg-surface-inset text-text-muted shadow-[inset_1px_1px_3px_var(--neu-d)]'
                    }`}
                  >
                    {isFilled ? (
                      <span className="truncate max-w-[120px]">
                        <RubyText japanese={slot.text} showFurigana={true} />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-mono">
                        {isStarSlot ? <Star className="w-3.5 h-3.5 fill-gold text-gold" /> : `[ ${idx + 1} ]`}
                      </span>
                    )}
                  </motion.button>

                  {/* Slot Number Subscript */}
                  <span className={`text-[10px] mt-1 font-mono font-bold flex items-center gap-0.5 ${
                    isStarSlot ? 'text-gold font-black' : 'text-text-muted'
                  }`}>
                    {isStarSlot ? <><Star className="w-2.5 h-2.5 fill-gold text-gold" /> Slot ★</> : `Slot ${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>

          {suffix && (
            <span className="text-text-primary font-jp px-1 py-1 text-base sm:text-lg leading-loose">
              <RubyText japanese={suffix} showFurigana={true} />
            </span>
          )}
        </div>

        {/* Highlight of current word in Star Position */}
        <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <Star className="w-4 h-4 fill-gold text-gold shrink-0" />
            <span>
              Pilihan di Posisi ★:{' '}
              <strong className="text-gold font-jp font-bold text-sm">
                {starWord || '(belum terisi)'}
              </strong>
            </span>
          </div>

          {allSlotsFilled && !submitted && !isAnswered && (
            <span className="text-[11px] text-state-success font-bold animate-pulse">
              ✓ Siap diverifikasi
            </span>
          )}
        </div>
      </div>

      {/* Available Word Cards Pool */}
      {!submitted && !isAnswered && (
        <div className="space-y-2">
          <div className="text-xs text-text-secondary font-bold px-1 flex items-center justify-between">
            <span>Bagian Kalimat yang Tersedia (Ketuk untuk pasang):</span>
            <span className="font-mono text-text-muted">{availableItems.length} tersisa</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {sourceTexts.map((optionText, optIdx) => {
              const isAvailable = availableItems.some(i => i.originalIndex === optIdx);
              const targetItem = availableItems.find(i => i.originalIndex === optIdx);

              return (
                <motion.button
                  key={optIdx}
                  whileHover={isAvailable ? { scale: 1.02 } : {}}
                  whileTap={isAvailable ? { scale: 0.98 } : {}}
                  onClick={() => targetItem && handleSelectCard(targetItem)}
                  disabled={!isAvailable}
                  className={`p-3 rounded-2xl text-left border transition-all flex items-center gap-2.5 ${
                    isAvailable
                      ? 'panel hover:border-border-primary text-text-primary shadow-sm cursor-pointer'
                      : 'bg-surface-inset text-text-muted border-border-subtle cursor-not-allowed opacity-30'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 border ${
                    isAvailable
                      ? 'bg-surface-inset text-indigo border-border-subtle'
                      : 'bg-surface-card text-text-muted border-border-subtle'
                  }`}>
                    {optIdx + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-jp font-bold flex-1 truncate">
                    {optionText}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Action Button: Verify / Submit */}
          <div className="pt-2">
            <button
              onClick={handleVerify}
              disabled={!allSlotsFilled}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold font-heading text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                allSlotsFilled
                  ? 'btn-cta cursor-pointer'
                  : 'btn btn-pill opacity-40 cursor-not-allowed'
              }`}
            >
              <span>Verifikasi Urutan & Posisi Bintang (★)</span>
            </button>
          </div>
        </div>
      )}

      {/* Answer Feedback & Result Explanation */}
      <AnimatePresence>
        {(submitted || isAnswered) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 sm:p-5 rounded-2xl border shadow-lg space-y-3 ${
              result === true
                ? 'bg-state-success/15 border-state-success/40 text-text-primary'
                : 'bg-wine-accent/15 border-border-subtle text-text-primary'
            }`}
          >
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result === true ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-state-success" />
                    <span className="text-sm font-bold text-state-success font-heading">
                      Tepat Sekali! Kata di posisi ★ benar.
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-wine-accent" />
                    <span className="text-sm font-bold text-wine-accent font-heading">
                      Kurang Tepat di Posisi ★.
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => speakJapanese(constructedSentence)}
                className="btn-physical-secondary p-1.5 rounded-xl transition-colors"
                title="Dengarkan pengucapan kalimat utuh"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Complete Reconstructed Sentence */}
            <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle space-y-1">
              <p className="text-xs text-text-secondary font-mono font-bold">
                Kalimat Lengkap yang Benar:
              </p>
              <p className="text-sm sm:text-base font-jp font-bold text-text-primary">
                {prefix}{' '}
                {question.orderedTarget ? (
                  question.orderedTarget.map((w, idx) => (
                    <span
                      key={idx}
                      className={idx === starPosition ? 'text-gold underline font-black px-1' : 'px-0.5'}
                    >
                      {w}
                    </span>
                  ))
                ) : (
                  <span>
                    Jawaban bintang (★) adalah opsi ke-{question.correctIndex + 1}: <strong className="text-gold">{correctOptionText}</strong>
                  </span>
                )}
                {' '}{suffix}
              </p>
            </div>

            {/* Explanation Note */}
            {question.explanation && (
              <div className="text-xs text-text-secondary leading-relaxed pt-1 border-t border-border-subtle">
                <strong className="text-gold">Penjelasan Pola Tata Bahasa: </strong>
                {question.explanation}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
