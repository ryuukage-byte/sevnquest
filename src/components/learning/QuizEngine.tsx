import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Volume2, ArrowRight, RotateCcw, HelpCircle, BookOpen, Eye, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from './RubyText';
import { StarSentenceQuiz } from './StarSentenceQuiz';
import { calculateQuizReward } from '../../utils/rewards';
import { normalizeQuestion } from '../../utils/questionUtils';
import { sendScoreEvent } from '../../lib/supabase';
import { classifyWrongAnswer, setPendingErrors } from '../../utils/errorClassifier';
import type { ErrorType } from '../../types/content';

interface QuizEngineProps {
  title: string;
  questions: Question[];
  level?: string;
  onComplete: (score: number, total: number, expGained: number, goldGained: number) => void;
  onExit: () => void;
  baseExpPerQuestion?: number;
  baseGoldPerQuestion?: number;
  playerMp?: number;
  playerInt?: number;
  onUseMp?: (amount: number) => boolean;
  onWrongAnswer?: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({
  title,
  questions: propQuestions,
  level,
  onComplete,
  onExit,
  baseExpPerQuestion = 15,
  baseGoldPerQuestion: _baseGoldPerQuestion = 10,
  playerMp = 50,
  playerInt = 10,
  onUseMp,
  onWrongAnswer,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  // Jenis kesalahan sesi ini (dikirim ke mastery lewat setPendingErrors saat selesai)
  const sessionErrorsRef = React.useRef<ErrorType[]>([]);

  // Lock questions in state for the entire quiz session
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(propQuestions);
  const activeTitleRef = React.useRef(title);

  // Furigana and Translation toggles
  const [localFurigana, setLocalFurigana] = useState<boolean>(furiganaEnabled);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);

  // If a brand new quiz is mounted or title changes, update the session questions
  React.useEffect(() => {
    if (activeTitleRef.current !== title || (sessionQuestions.length === 0 && propQuestions.length > 0)) {
      activeTitleRef.current = title;
      setSessionQuestions(propQuestions);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowTranslation(false);
      setCorrectCount(0);
      setHiddenOptions([]);
      setIsFinished(false);
    }
  }, [title, propQuestions, sessionQuestions.length]);

  const questions = sessionQuestions.length > 0 ? sessionQuestions : propQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const rawCurrentQ = questions[currentIndex] || questions[0];
  const currentQ = normalizeQuestion(rawCurrentQ);
  const totalQ = questions.length;

  const isReadingQuestion = React.useMemo(() => {
    const inst = ((currentQ?.instruction || '') + ' ' + (currentQ?.instructionId || '')).toLowerCase();
    return inst.includes('読み方') || inst.includes('cara baca') || inst.includes('ひらがな');
  }, [currentQ]);

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
      sessionErrorsRef.current.push(classifyWrongAnswer(currentQ, idx));
      if (onWrongAnswer) onWrongAnswer();
    }

    sendScoreEvent('quiz_answer', currentQ.id || `q_${currentIndex}`, isCorrect);
  };

  const handleStarAnswer = (selectedIdx: number, isCorrect: boolean) => {
    if (isAnswered) return;
    setSelectedOption(selectedIdx);
    setIsAnswered(true);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      sessionErrorsRef.current.push(classifyWrongAnswer(currentQ, selectedIdx));
      if (onWrongAnswer) onWrongAnswer();
    }

    sendScoreEvent('quiz_answer', currentQ.id || `q_${currentIndex}`, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < totalQ - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowTranslation(false);
      setHiddenOptions([]);
    } else {
      setIsFinished(true);
      const sampleLevel = level || (currentQ as any)?.level || (questions[0] as any)?.level || 'N3';
      const quizReward = calculateQuizReward(sampleLevel, correctCount, totalQ, playerInt);
      const expGained = quizReward.totalExpGained;
      const goldGained = quizReward.goldGained;

      if (correctCount >= Math.ceil(totalQ * 0.7)) {
        playSound('fanfare', soundEnabled);
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setPendingErrors(sessionErrorsRef.current);
      sessionErrorsRef.current = [];
      onComplete(correctCount, totalQ, expGained, goldGained);
    }
  };

  const handleUse5050Hint = () => {
    if (hiddenOptions.length > 0 || isAnswered) return;
    const mpCost = 15;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk menggunakan skill 50/50 Hint!');
      return;
    }

    playSound('coin', soundEnabled);
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== currentQ.correctIndex);
    const toHide = wrongIndices.slice(0, 2);
    setHiddenOptions(toHide);
  };

  const handlePlayAudio = (text: string) => {
    speakJapanese(text);
  };

  if (isFinished) {
    const isSuccess = correctCount >= Math.ceil(totalQ * 0.6);
    const sampleLevel = level || (currentQ as any)?.level || (questions[0] as any)?.level || 'N3';
    const quizReward = calculateQuizReward(sampleLevel, correctCount, totalQ, playerInt);
    const expGained = quizReward.totalExpGained;

    return (
      <div className="w-full max-w-xl mx-auto p-6 panel panel-stitched text-center space-y-5 shadow-2xl">
        <div className="p-4 inline-flex rounded-full bg-surface-inset border border-border-subtle text-gold">
          {isSuccess ? <CheckCircle2 className="w-9 h-9" /> : <RotateCcw className="w-9 h-9" />}
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">
          {isSuccess ? 'Ujian Selesai! Luar Biasa!' : 'Tetap Berjuang! Coba Lagi!'}
        </h3>

        <div className="text-xs sm:text-sm text-text-secondary">
          Skor Akhir: <strong className="text-gold font-mono text-xl">{correctCount}</strong> / {totalQ} Benar
        </div>

        {/* Rewards Earned Box */}
        <div className="flex flex-col items-center gap-3 max-w-sm mx-auto p-4 rounded-2xl bg-surface-inset border border-border-subtle">
          <div className="text-center">
            <span className="text-[11px] text-text-muted">Total Base EXP</span>
            <div className="text-base sm:text-lg font-bold text-gold flex items-center justify-center gap-1 font-mono">
              +{expGained} EXP
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswered(false);
              setShowTranslation(false);
              setCorrectCount(0);
              setHiddenOptions([]);
              setIsFinished(false);
              setSessionQuestions(propQuestions);
              playSound('click', soundEnabled);
            }}
            className="btn btn-pill py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Ulangi Drill
          </button>
          <button
            onClick={() => {
              playSound('click', soundEnabled);
              onExit();
            }}
            className="btn-cta py-2.5 px-5 rounded-xl text-xs font-bold transition-all"
          >
            Kembali ke Modul
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-3.5 sm:p-6 panel text-text-primary shadow-xl space-y-4">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo font-heading truncate block">
            {title}
          </span>
          <div className="text-xs text-text-secondary">
            Pertanyaan <strong className="text-text-primary">{currentIndex + 1}</strong> dari {totalQ}
          </div>
        </div>

        {/* 50/50 Skill Hint Button */}
        <button
          onClick={handleUse5050Hint}
          disabled={hiddenOptions.length > 0 || isAnswered || playerMp < 15}
          className={`btn btn-pill text-xs flex items-center gap-1.5 shrink-0 ${
            hiddenOptions.length > 0
              ? 'opacity-40 cursor-not-allowed'
              : playerMp >= 15
              ? 'text-indigo border-border-subtle hover:bg-indigo/10'
              : 'opacity-40 cursor-not-allowed'
          }`}
          title="Gunakan 15 MP untuk membuang 2 pilihan salah"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>50/50 Hint (15 MP)</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rpg-progress-track rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
          className="h-full bg-indigo rounded-full shadow-sm"
        />
      </div>

      {/* Question Body: Star Sentence Quiz or Standard Multiple Choice */}
      {((currentQ.scrambleWords && currentQ.scrambleWords.length === 4) || currentQ.prompt.includes('★') || currentQ.prompt.includes('＿★＿')) ? (
        <StarSentenceQuiz
          question={currentQ}
          isAnswered={isAnswered}
          onAnswer={handleStarAnswer}
          soundEnabled={soundEnabled}
        />
      ) : (
        <>
          {/* Layer 1: Separate Instruction Bar (Kalimat Perintah) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-surface-card border border-border-subtle flex items-start gap-2.5 shadow-sm">
            <div className="w-6 h-6 rounded-lg bg-indigo/10 border border-border-subtle text-indigo flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-text-primary font-jp leading-snug">
                {currentQ.instruction}
              </div>
              {currentQ.instructionId && (
                <div className="text-[11px] sm:text-xs text-text-secondary leading-relaxed">
                  {currentQ.instructionId}
                </div>
              )}
            </div>
          </div>

          {/* Layer 2: Pure Japanese Question Card (Full Bahasa Jepang) */}
          <div className="p-4 sm:p-6 rounded-2xl bg-surface-inset border border-border-subtle shadow-md space-y-3">
            {/* Toolbar: Tag + Furigana Toggle + Native Audio */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-subtle/50">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-indigo font-heading flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo animate-pulse" />
                SOAL BAHASA JEPANG
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isReadingQuestion}
                  onClick={() => setLocalFurigana(prev => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-jp border transition-all ${
                    isReadingQuestion
                      ? 'bg-surface-card text-text-muted/60 border-border-subtle cursor-not-allowed opacity-60'
                      : localFurigana
                        ? 'bg-indigo/15 text-indigo border-border-subtle shadow-sm'
                        : 'bg-surface-card text-text-muted border-border-subtle hover:text-text-primary'
                  }`}
                  title={isReadingQuestion ? 'Furigana dikunci (OFF) pada soal tebak cara baca agar jawaban tidak bocor' : 'Aktifkan / Nonaktifkan Furigana Hiragana'}
                >
                  {isReadingQuestion ? 'ふりがな LOCK' : `ふりがな ${localFurigana ? 'ON' : 'OFF'}`}
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayAudio(currentQ.audioPrompt || currentQ.prompt)}
                  className="btn-physical-secondary p-1.5 rounded-lg text-indigo transition-colors"
                  title="Dengarkan Pengucapan Asli"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* The Pure Japanese Prompt Text with Ruby */}
            <div className="py-2.5 sm:py-3.5 text-center sm:text-left">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary leading-[2.2] tracking-wide font-jp">
                <RubyText
                  japanese={currentQ.prompt}
                  reading={currentQ.ruby}
                  showFurigana={localFurigana && !isReadingQuestion}
                />
              </h3>
            </div>

            {/* Layer 3: Independent Translation Toggle (Separate from prompt, collapsed by default) */}
            {currentQ.translation && !isAnswered && (
              <div className="pt-1 border-t border-border-subtle/40">
                <button
                  type="button"
                  onClick={() => setShowTranslation(prev => !prev)}
                  className="text-[11px] sm:text-xs text-text-secondary hover:text-indigo font-medium flex items-center gap-1.5 transition-colors group"
                >
                  {showTranslation ? (
                    <EyeOff className="w-3.5 h-3.5 text-text-muted group-hover:text-indigo" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-indigo" />
                  )}
                  <span>{showTranslation ? 'Sembunyikan Terjemahan' : 'Bantuan: Tampilkan Arti Kalimat'}</span>
                </button>
                <AnimatePresence>
                  {showTranslation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2.5 rounded-xl bg-surface-card/90 border border-border-subtle text-xs text-text-secondary italic"
                    >
                      Arti: &ldquo;{currentQ.translation}&rdquo;
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-2">
            {currentQ.options.map((option, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              if (isHidden) {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-inset/40 border border-dashed border-border-subtle text-text-muted text-xs italic text-center"
                  >
                    Pilihan dieliminasi oleh Hint 50/50
                  </div>
                );
              }

              let btnStyle = 'panel hover:border-border-primary text-text-primary';

              if (isAnswered) {
                if (idx === currentQ.correctIndex) {
                  btnStyle = 'bg-state-success/15 border-state-success text-state-success font-bold';
                } else if (idx === selectedOption) {
                  btnStyle = 'bg-wine-accent/15 border-border-subtle text-wine-accent font-bold';
                } else {
                  btnStyle = 'bg-surface-inset border-border-subtle text-text-muted opacity-40';
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileTap={!isAnswered ? { scale: 0.99 } : {}}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle text-xs flex items-center justify-center font-mono font-bold text-indigo shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-jp text-sm sm:text-base leading-snug">
                      <RubyText
                        japanese={option}
                        reading={currentQ.optionsRuby?.[idx]}
                        showFurigana={localFurigana}
                      />
                    </span>
                  </div>

                  {isAnswered && idx === currentQ.correctIndex && (
                    <CheckCircle2 className="w-5 h-5 text-state-success shrink-0" />
                  )}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && (
                    <XCircle className="w-5 h-5 text-wine-accent shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation Banner (when answered) */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border text-xs space-y-3 ${
                  selectedOption === currentQ.correctIndex
                    ? 'bg-state-success/10 border-state-success/30 text-text-primary'
                    : 'bg-wine-accent/10 border-border-subtle text-text-primary'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 font-heading">
                  {selectedOption === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-state-success" />
                      <span className="text-state-success">Jawaban Benar! (+{baseExpPerQuestion} EXP)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-wine-accent" />
                      <span className="text-wine-accent">Kurang Tepat</span>
                    </>
                  )}
                </div>

                {/* Full Sentence Translation in review */}
                {currentQ.translation && (
                  <div className="p-2.5 rounded-lg bg-surface-card/80 border border-border-subtle space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo font-heading block">
                      Arti Kalimat:
                    </span>
                    <p className="text-xs sm:text-sm text-text-primary font-medium">
                      &ldquo;{currentQ.translation}&rdquo;
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">
                    Penjelasan & Kaidah:
                  </span>
                  <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                    {currentQ.explanation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Next Button */}
      {isAnswered && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl btn-cta font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-heading"
        >
          <span>{currentIndex < totalQ - 1 ? 'Lanjut ke Soal Berikutnya' : 'Lihat Hasil Akhir'}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
};
