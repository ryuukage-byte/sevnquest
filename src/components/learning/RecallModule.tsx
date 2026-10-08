import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, CheckCircle2, XCircle, Volume2, ArrowRight, Award, ShieldAlert, BookOpen, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RecallQueueItem, RecallPriorityTier } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { calcEngineExp, getEntityBaseExp } from '../../utils/rewards';
import { RubyText } from './RubyText';

interface RecallModuleProps {
  recallQueue: RecallQueueItem[];
  playerMp: number;
  playerInt: number;
  onUseMp?: (amount: number) => boolean;
  onItemReviewed: (itemId: string, category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai', isCorrect: boolean) => void;
  onCompleteRecallSession: (totalReviewed: number, correctCount: number, expGained: number, goldGained: number) => void;
  onExit: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
  /** Status sinkron cloud; dipakai untuk membedakan "antrean kosong" dari "progres belum termuat". */
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  /** true bila pemain sudah punya catatan mastery (pernah belajar sesuatu). */
  hasProgress?: boolean;
}

export const RecallModule: React.FC<RecallModuleProps> = ({
  recallQueue: liveRecallQueue,
  playerMp: _playerMp,
  playerInt,
  onUseMp,
  onItemReviewed,
  onCompleteRecallSession,
  onExit,
  soundEnabled = true,
  furiganaEnabled = true,
  syncStatus = 'idle',
  hasProgress = true,
}) => {
  // Antrean DIBEKUKAN selama sesi. handleItemReviewed membangun ulang `recallQueue` di stats tepat saat
  // pemain mengklik jawaban; kalau layar membaca antrean hidup itu, item yang baru dijawab turun/bergeser,
  // soal dikocok ulang, dan yang tampil jadi soal lain padahal skornya sudah dihitung dari soal sebelumnya.
  // Pengecualian: bila saat dibuka antrean masih kosong (progres sedang dimuat), ikuti antrean hidup
  // sampai terisi sekali.
  const [recallQueue, setSessionQueue] = useState<RecallQueueItem[]>(liveRecallQueue || []);
  useEffect(() => {
    if (recallQueue.length === 0 && liveRecallQueue && liveRecallQueue.length > 0) {
      setSessionQueue(liveRecallQueue);
    }
  }, [liveRecallQueue, recallQueue.length]);

  const [activeFilter, setActiveFilter] = useState<'ALL' | RecallPriorityTier>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // EXP sesi = Σ (Base EXP materi × multiplier engine) untuk tiap jawaban benar
  const [sessionExp, setSessionExp] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // Level 5 Sentence Construction State
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  // Bank kata berurutan tetap (diacak sekali per soal); kata yang terpakai hanya ditandai lewat id-nya,
  // sehingga saat dilepas ia kembali ke slot semula, bukan pindah ke belakang.
  const [availableWords, setAvailableWords] = useState<{ id: string; word: string }[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  // Filtered queue
  const filteredQueue = activeFilter === 'ALL'
    ? recallQueue
    : recallQueue.filter(q => q.priorityTier === activeFilter);

  const currentItem = filteredQueue[currentIndex] || filteredQueue[0] || recallQueue[0];

  // Initialize word bank if current question is Level 5 Sentence Production
  useEffect(() => {
    if (currentItem?.sampleQuestion?.difficultyLevel === 5 && currentItem.sampleQuestion.scrambleWords) {
      setAvailableWords(
        currentItem.sampleQuestion.scrambleWords.map((w, idx) => ({
          id: `${w}_${idx}`,
          word: w
        }))
      );
      setSelectedWords([]);
      setSelectedWordIds([]);
    } else {
      setSelectedWords([]);
      setSelectedWordIds([]);
      setAvailableWords([]);
    }
    // Kunci pada identitas soal, bukan objek `currentItem`: antrean Recall dihitung ulang saat stats
    // berubah dan menghasilkan soal Level 5 dengan acakan baru, yang akan mereset susunan di tengah jalan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentItem?.itemId, currentItem?.sampleQuestion?.id]);

  if (!recallQueue || recallQueue.length === 0) {
    // Antrean kosong punya tiga penyebab berbeda; pesannya harus dibedakan supaya pemain tidak mengira
    // progresnya hilang padahal hanya belum termuat dari cloud.
    const emptyState =
      syncStatus === 'syncing'
        ? { icon: <ShieldAlert className="w-10 h-10" />, title: 'MEMUAT PROGRESMU…', body: 'Sedang mengambil progres dari cloud. Materi Recall akan muncul setelah selesai.' }
        : syncStatus === 'error'
          ? { icon: <ShieldAlert className="w-10 h-10" />, title: 'PROGRES BELUM TERMUAT', body: 'Sinkronisasi dengan cloud gagal, jadi materi Recall belum bisa dihitung. Progresmu tidak hilang. Periksa koneksi lalu buka Recall lagi.' }
          : !hasProgress
            ? { icon: <BookOpen className="w-10 h-10" />, title: 'BELUM ADA MATERI DIULANG', body: 'Recall mengulang materi yang sudah kamu pelajari. Selesaikan beberapa lantai di Menara atau latihan dulu, lalu kembali ke sini.' }
            : { icon: <CheckCircle2 className="w-10 h-10" />, title: 'SEMUA MATERI TELAH SEGAR!', body: 'Tidak ada materi dalam antrean Recall yang perlu direview saat ini. Ingatanmu masih dalam kondisi prima.' };
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl panel panel-stitched border border-border-subtle text-center space-y-5 shadow-xl">
        <div className="p-4 inline-flex rounded-full bg-gold/15 border border-border-subtle text-gold shadow-md">
          {emptyState.icon}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gold font-heading">
            {emptyState.title}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {emptyState.body}
          </p>
        </div>
        <button
          onClick={onExit}
          className="rpg-btn rpg-btn-secondary w-full py-3.5 text-xs sm:text-sm font-heading"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="w-full max-w-lg mx-auto p-6 rounded-3xl panel panel-stitched border border-border-subtle text-center space-y-4">
        <p className="text-xs text-text-secondary">Tidak ada item pada filter ini.</p>
        <button
          onClick={() => {
            setActiveFilter('ALL');
            setCurrentIndex(0);
          }}
          className="rpg-btn rpg-btn-primary px-4 py-2 text-xs"
        >
          Tampilkan Semua Materi
        </button>
      </div>
    );
  }

  const currentQ = currentItem.sampleQuestion || {
    id: `rc_${currentItem.itemId}`,
    prompt: `Apa penggunaan yang tepat untuk materi 「${currentItem.title}」?`,
    options: [currentItem.subtitle || 'Pilihan arti tepat', 'Pilihan tidak relevan', 'Bukan kalimat alami', 'Salah bentuk'],
    correctIndex: 0,
    explanation: `${currentItem.title}: ${currentItem.subtitle}`
  };

  const totalItems = filteredQueue.length;

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setSessionExp(prev => prev + calcEngineExp(getEntityBaseExp(currentItem.category, currentItem.itemId) ?? 25, 'recall'));
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }

    onItemReviewed(currentItem.itemId, currentItem.category, isCorrect);
  };

  // Handle word selection for Level 5 sentence production
  const handleWordClick = (wordObj: { id: string; word: string }) => {
    if (isAnswered || selectedWordIds.includes(wordObj.id)) return;
    setSelectedWords(prev => [...prev, wordObj.word]);
    setSelectedWordIds(prev => [...prev, wordObj.id]);
  };

  const handleRemoveWord = (_word: string, indexToRemove: number) => {
    if (isAnswered) return;
    setSelectedWords(prev => prev.filter((_, i) => i !== indexToRemove));
    setSelectedWordIds(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmitSentenceProduction = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    const constructed = selectedWords.join('');
    const targetString = currentQ.orderedTarget ? currentQ.orderedTarget.join('') : (currentQ.options[0] || '');
    
    // Check if constructed matches target or contains all key components
    const isCorrect = constructed === targetString || constructed.replace(/\s+/g, '') === targetString.replace(/\s+/g, '');
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setSessionExp(prev => prev + calcEngineExp(getEntityBaseExp(currentItem.category, currentItem.itemId) ?? 25, 'sentence'));
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }

    onItemReviewed(currentItem.itemId, currentItem.category, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setHiddenOptions([]);
    } else {
      setIsFinished(true);
      const expGained = sessionExp + Math.round(playerInt * 2);
      const goldGained = correctCount * 15;

      if (correctCount >= Math.ceil(totalItems * 0.7)) {
        playSound('fanfare', soundEnabled);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onCompleteRecallSession(totalItems, correctCount, expGained, goldGained);
    }
  };

  const handleUse5050 = () => {
    if (hiddenOptions.length > 0 || isAnswered || currentQ.difficultyLevel === 5) return;
    const mpCost = 10;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk Mantra 50/50!');
      return;
    }

    playSound('coin', soundEnabled);
    const correctIdx = currentQ.correctIndex;
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== correctIdx);
    setHiddenOptions(wrongIndices.slice(0, 2));
  };

  if (isFinished) {
    const accuracy = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 100;
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl panel panel-stitched border border-border-subtle text-center space-y-6 shadow-2xl">
        <div className="p-4 inline-flex rounded-full bg-gold/15 border border-border-subtle text-gold shadow-xl">
          <Award className="w-12 h-12" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-gold uppercase tracking-widest font-mono">
            SESI RECALL ADAPTIF SELESAI
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-heading">
            DAYA INGAT DIPERKUAT!
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            {correctCount} dari {totalItems} materi berhasil diingat dengan tingkat akurasi ({accuracy}%).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-inset border border-border-subtle">
          <div>
            <span className="text-[11px] text-text-muted">EXP Diperoleh</span>
            <p className="text-lg font-bold text-gold font-mono">+{correctCount * 25} EXP</p>
          </div>
          <div>
            <span className="text-[11px] text-text-muted">Peningkatan True Mastery</span>
            <p className="text-lg font-bold text-gold font-mono">+{Math.round(accuracy * 0.15)}%</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="rpg-btn rpg-btn-primary w-full py-3.5 text-sm"
        >
          Selesai & Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Count items per priority
  const countCritical = recallQueue.filter(q => q.priorityTier === 'CRITICAL').length;
  const countWeak = recallQueue.filter(q => q.priorityTier === 'WEAK').length;
  const countReview = recallQueue.filter(q => q.priorityTier === 'REVIEW').length;
  const countMaintain = recallQueue.filter(q => q.priorityTier === 'MAINTAIN').length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-6">
      {/* Priority Filter Tabs — Unified 2-Color Skeuomorphic Design */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 text-xs">
        <button
          onClick={() => { setActiveFilter('ALL'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            activeFilter === 'ALL'
              ? 'seg-active text-gold font-mono'
              : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
          }`}
        >
          Semua ({recallQueue.length})
        </button>
        {countCritical > 0 && (
          <button
            onClick={() => { setActiveFilter('CRITICAL'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'CRITICAL'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Kritis</span>
            <span className="font-mono">({countCritical})</span>
          </button>
        )}
        {countWeak > 0 && (
          <button
            onClick={() => { setActiveFilter('WEAK'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'WEAK'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Lemah</span>
            <span className="font-mono">({countWeak})</span>
          </button>
        )}
        {countReview > 0 && (
          <button
            onClick={() => { setActiveFilter('REVIEW'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'REVIEW'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Jadwal SRS</span>
            <span className="font-mono">({countReview})</span>
          </button>
        )}
        {countMaintain > 0 && (
          <button
            onClick={() => { setActiveFilter('MAINTAIN'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'MAINTAIN'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Penguatan</span>
            <span className="font-mono">({countMaintain})</span>
          </button>
        )}
      </div>

      {/* Top Recall Progress & Priority Pill */}
      <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gold/15 text-gold border border-border-subtle">
              <Flame className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-text-primary font-heading">
              RECALL ADAPTIF • {currentIndex + 1} / {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-gold font-mono font-bold">
              True Mastery: {currentItem.trueMasteryScore || 65}%
            </span>
            <span className="text-xs font-mono font-bold text-text-secondary">
              Skor: {correctCount}/{currentIndex}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-gold transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
          />
        </div>

        {/* Diagnostic Reason Alert */}
        <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-primary">
            <ShieldAlert className="w-4 h-4 text-gold flex-shrink-0" />
            <span className="text-[11px] text-text-secondary">
              <strong className="font-bold text-text-primary font-heading mr-1">Alasan Pengujian:</strong>
              {currentItem.reasonText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-surface-card border border-border-subtle text-gold font-mono">
              {currentItem.priorityTier}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface-card border border-border-subtle text-text-secondary uppercase font-mono">
              {currentItem.category}
            </span>
          </div>
        </div>

        {/* Personalized Tutor Insight */}
        {currentItem.tutorInsight && (
          <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-[11px] text-text-secondary flex items-start gap-2">
            <p className="leading-relaxed">
              {currentItem.tutorInsight}
            </p>
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-subtle pb-3">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-gold" />
            <span className="font-bold text-text-primary font-heading">{currentItem.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {currentQ.difficultyLevel !== 5 && (
              <button
                onClick={handleUse5050}
                disabled={isAnswered || hiddenOptions.length > 0}
                className="px-2.5 py-1 rounded-lg bg-surface-inset hover:bg-surface-elevated disabled:opacity-40 text-gold border border-border-subtle text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <span>50/50 (10 MP)</span>
              </button>
            )}

            <button
              onClick={() => speakJapanese(currentQ.prompt)}
              className="btn-physical-secondary p-1.5 rounded-lg transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-gold" />
            </button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-text-primary font-medium whitespace-pre-line leading-relaxed">
          {currentQ.ruby ? (
            <RubyText
              japanese={currentQ.prompt}
              reading={currentQ.ruby}
              showFurigana={furiganaEnabled}
            />
          ) : (
            currentQ.prompt
          )}
        </p>

        {/* LEVEL 5: INTERACTIVE SENTENCE PRODUCTION BUILDER */}
        {currentQ.difficultyLevel === 5 ? (
          <div className="space-y-4 pt-2">
            {/* Target Assembly Box */}
            <div className="p-4 rounded-2xl bg-surface-inset border-2 border-dashed border-border-primary min-h-[64px] flex flex-wrap items-center gap-2">
              {selectedWords.length === 0 ? (
                <span className="text-xs text-text-muted italic">
                  Klik kata-kata di bawah untuk menyusun kalimat bahasa Jepang...
                </span>
              ) : (
                selectedWords.map((word, idx) => (
                  <motion.button
                    key={`${word}_${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => handleRemoveWord(word, idx)}
                    disabled={isAnswered}
                    className="btn-physical-secondary px-3 py-1.5 rounded-xl text-gold text-xs sm:text-sm font-bold flex items-center gap-1 transition-all"
                  >
                    <span>{word}</span>
                    <span className="text-[10px] opacity-60">×</span>
                  </motion.button>
                ))
              )}
            </div>

            {/* Word Bank Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableWords.map((item) => {
                const used = selectedWordIds.includes(item.id);
                return (
                  <motion.button
                    key={item.id}
                    whileHover={used ? {} : { scale: 1.05 }}
                    whileTap={used ? {} : { scale: 0.95 }}
                    onClick={() => handleWordClick(item)}
                    disabled={isAnswered || used}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      used
                        ? 'border border-dashed border-border-subtle text-transparent'
                        : 'btn-physical-secondary'
                    }`}
                  >
                    {item.word}
                  </motion.button>
                );
              })}
            </div>

            {/* Submit Sentence Button */}
            {!isAnswered && (
              <button
                onClick={handleSubmitSentenceProduction}
                disabled={selectedWords.length === 0}
                className="rpg-btn rpg-btn-primary w-full py-3 text-xs sm:text-sm gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Periksa Susunan Kalimat</span>
              </button>
            )}
          </div>
        ) : (
          /* STANDARD MULTIPLE CHOICE OPTIONS (LEVELS 1 - 4) */
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {currentQ.options.map((opt, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              if (isHidden) {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface-inset/30 border border-border-subtle/30 opacity-30 text-center text-xs italic text-text-muted pointer-events-none"
                  >
                    (Pilihan tereliminasi)
                  </div>
                );
              }

              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let optionStyle = 'bg-surface-card border-border-subtle hover:border-border-primary hover:bg-surface-elevated text-text-primary shadow-sm';
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'bg-gold/15 border-border-subtle text-gold font-bold shadow-md';
                } else if (isSelected) {
                  optionStyle = 'bg-surface-inset border-border-primary text-text-muted font-medium opacity-70';
                } else {
                  optionStyle = 'bg-surface-inset/40 border-border-subtle/40 text-text-muted opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                >
                  <span className="font-jp">{opt}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-text-muted flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback / Explanation */}
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3 pt-3"
          >
            <div className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-gold block mb-1 font-heading">Pengingat Memori:</strong>
              {currentQ.explanation}
            </div>

            <button
              onClick={handleNext}
              className="rpg-btn rpg-btn-primary w-full py-3 text-xs sm:text-sm gap-2"
            >
              <span>Materi Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
