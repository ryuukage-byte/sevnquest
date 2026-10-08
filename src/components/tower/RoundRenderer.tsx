// ==============================================================================
// NIHONGO TOWER — ROUND RENDERER CONTRACT (STAGE 4B)
// ==============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RoundPhase,
  RoundInput,
  RoundResult,
  InscriptionRoundInput,
  IdentificationRoundInput,
  AlchemyRoundInput,
  SentenceRoundInput,
  JLPTRoundInput,
  GenericRoundInput
} from '../../types/tower';
import { KanjiWritingCanvas } from '../learning/KanjiWritingCanvas';
import { QuizEngine } from '../learning/QuizEngine';
import { Question } from '../../types/content';
import { CanvasAdapter } from '../../engine/tower/adapters/canvasAdapter';
import { QuizAdapter, QuizQuestionAnswer } from '../../engine/tower/adapters/quizAdapter';
import { ConjugationAdapter, ConjugationAnswer } from '../../engine/tower/adapters/conjugationAdapter';
import { playSound } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface RoundRendererProps {
  phase: RoundPhase | null;
  input: RoundInput | null;
  onSubmitAnswer: (result: RoundResult) => void;
  soundEnabled?: boolean;
  className?: string;
}

export const RoundRenderer: React.FC<RoundRendererProps> = ({
  phase,
  input,
  onSubmitAnswer,
  soundEnabled = true,
  className = ''
}) => {
  if (!phase || !input) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted">
        <div className="w-8 h-8 rounded-full border-2 border-border-subtle border-t-transparent animate-spin mb-3" />
        <p className="text-sm font-bold font-heading">Menyiapkan tantangan ronde...</p>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 1. INSCRIPTION RENDERER (Stroke Writing Canvas)
  // ----------------------------------------------------------------------------
  if (phase === RoundPhase.INSCRIPTION) {
    return (
      <InscriptionInteractiveRunner
        input={input as InscriptionRoundInput}
        soundEnabled={soundEnabled}
        onSubmitAnswer={onSubmitAnswer}
        className={className}
      />
    );
  }

  // ----------------------------------------------------------------------------
  // 2. IDENTIFICATION RENDERER (Vocabulary Reading & Meaning Quiz)
  // ----------------------------------------------------------------------------
  if (phase === RoundPhase.IDENTIFICATION) {
    const idInput = input as IdentificationRoundInput;

    const quizQuestions: Question[] = useMemo(() => {
      return idInput.questions.map((q, idx) => {
        const correctIdx = q.options.indexOf(q.correctAnswer);
        return {
          id: `${q.targetId}_${idx}`,
          prompt: q.prompt,
          options: q.options,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: `Jawaban benar: ${q.correctAnswer}`,
          category: 'kotoba',
          difficulty: 'normal'
        };
      });
    }, [idInput]);

    const handleQuizFinish = (score: number, total: number) => {
      const answers: QuizQuestionAnswer[] = idInput.questions.map((q, idx) => {
        // Evaluate score proportion
        const isCorrect = idx < score;
        return {
          targetId: q.targetId,
          selectedAnswer: isCorrect ? q.correctAnswer : 'salah',
          correctAnswer: q.correctAnswer,
          isCorrect
        };
      });

      const result = QuizAdapter.toRoundResult({
        answers,
        roundIndex: idInput.roundIndex,
        phase: RoundPhase.IDENTIFICATION,
        passThresholdPercentage: idInput.difficultySettings?.accuracyRequired || 70
      });

      onSubmitAnswer(result);
    };

    const isVocabRound = idInput.roundIndex >= 2;
    const quizTitle = isVocabRound
      ? `Kuis Kosakata & Makna (F.${idInput.floor})`
      : `Identifikasi Aksara & Bunyi (F.${idInput.floor})`;

    return (
      <div className={`w-full max-w-2xl mx-auto ${className}`}>
        <QuizEngine
          title={quizTitle}
          questions={quizQuestions}
          soundEnabled={soundEnabled}
          onComplete={handleQuizFinish}
          onExit={() => {}}
        />
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 3. ALCHEMY RENDERER (Verb & Adjective Conjugation Engine)
  // ----------------------------------------------------------------------------
  if (phase === RoundPhase.ALCHEMY) {
    const alchemyInput = input as AlchemyRoundInput;
    return (
      <AlchemyInteractiveRunner
        input={alchemyInput}
        soundEnabled={soundEnabled}
        onSubmitAnswer={onSubmitAnswer}
        className={className}
      />
    );
  }

  // ----------------------------------------------------------------------------
  // 4. SENTENCE RENDERER (Grammar Scramble & Synthesis)
  // ----------------------------------------------------------------------------
  if (phase === RoundPhase.SENTENCE) {
    const sentenceInput = input as SentenceRoundInput;
    return (
      <SentenceInteractiveRunner
        input={sentenceInput}
        soundEnabled={soundEnabled}
        onSubmitAnswer={onSubmitAnswer}
        className={className}
      />
    );
  }

  // ----------------------------------------------------------------------------
  // 5. JLPT BOSS RENDERER (Trial Diagnostic Boss Floors)
  // ----------------------------------------------------------------------------
  if (
    phase === RoundPhase.JLPT_VOCABULARY ||
    phase === RoundPhase.JLPT_GRAMMAR ||
    phase === RoundPhase.JLPT_READING ||
    phase === RoundPhase.JLPT_LISTENING
  ) {
    const jlptInput = input as JLPTRoundInput;

    const questions: Question[] = useMemo(() => {
      return jlptInput.questions.map(q => {
        const correctIdx = q.options.indexOf(q.correctAnswer);
        return {
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: q.explanation || `Kunci jawaban: ${q.correctAnswer}`,
          translation: q.contextText
        };
      });
    }, [jlptInput]);

    const handleBossComplete = (score: number, total: number) => {
      const answers: QuizQuestionAnswer[] = jlptInput.questions.map((q, idx) => {
        const isCorrect = idx < score;
        return {
          targetId: q.id,
          selectedAnswer: isCorrect ? q.correctAnswer : 'salah',
          correctAnswer: q.correctAnswer,
          isCorrect
        };
      });

      const result = QuizAdapter.toRoundResult({
        answers,
        roundIndex: jlptInput.roundIndex,
        phase,
        passThresholdPercentage: 75
      });

      onSubmitAnswer(result);
    };

    return (
      <div className={`w-full max-w-2xl mx-auto ${className}`}>
        <div className="bg-surface-elevated panel-stitched border border-border-subtle rounded-2xl p-4 mb-4 text-center">
          <span className="text-xs font-black text-wine-accent uppercase tracking-widest font-heading">
            Ujian Bos JLPT {jlptInput.jlptLevel}
          </span>
          <p className="text-xs text-text-secondary mt-0.5">
            Selesaikan soal evaluasi komprehensif untuk menaklukkan lantai bos ini.
          </p>
        </div>

        <QuizEngine
          title={`Ujian Bos ${jlptInput.jlptLevel} (${phase.replace('jlpt_', '').toUpperCase()})`}
          questions={questions}
          soundEnabled={soundEnabled}
          onComplete={handleBossComplete}
          onExit={() => {}}
        />
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // FALLBACK GENERIC RENDERER
  // ----------------------------------------------------------------------------
  const genericInput = input as GenericRoundInput;
  return (
    <div className={`w-full max-w-md mx-auto text-center p-8 bg-surface-card rounded-2xl border border-border-subtle ${className}`}>
      <h3 className="text-lg font-black text-text-primary font-heading">
        {genericInput.title || `Tantangan Ronde`}
      </h3>
      <p className="text-xs text-text-secondary mt-1 mb-6">
        {genericInput.description || 'Selesaikan tantangan ini untuk melanjutkan perjalanan menara.'}
      </p>

      <button
        type="button"
        onClick={() => {
          onSubmitAnswer({
            roundIndex: genericInput.roundIndex,
            phase,
            score: 100,
            correct: true,
            mistakes: [],
            hpDamage: 0
          });
        }}
        className="btn-physical-primary w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all"
      >
        Lanjutkan Ronde
      </button>
    </div>
  );
};

// ------------------------------------------------------------------------------
// SUB-RUNNER: INSCRIPTION RUNNER (Kanji & Kana Stroke Writing)
// ------------------------------------------------------------------------------

interface InscriptionInteractiveRunnerProps {
  input: InscriptionRoundInput;
  soundEnabled: boolean;
  onSubmitAnswer: (result: RoundResult) => void;
  className?: string;
}

const InscriptionInteractiveRunner: React.FC<InscriptionInteractiveRunnerProps> = ({
  input,
  soundEnabled,
  onSubmitAnswer,
  className = ''
}) => {
  const targets = useMemo(() => {
    return input.targets && input.targets.length > 0 ? input.targets : [input.targetKanji];
  }, [input.targets, input.targetKanji]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [characterScores, setCharacterScores] = useState<number[]>([]);
  const scoreRef = useRef<number>(100);

  const currentTarget = targets[currentIndex] || input.targetKanji;

  const handleSheetComplete = (_sheetNumber: number, accuracyScore: number) => {
    scoreRef.current = accuracyScore;
  };

  const isLastTarget = currentIndex + 1 >= targets.length;

  const handleProceedNext = () => {
    const currentScore = scoreRef.current;
    const newScores = [...characterScores, currentScore];
    setCharacterScores(newScores);

    if (!isLastTarget) {
      playSound('click', soundEnabled);
      setCurrentIndex(prev => prev + 1);
      scoreRef.current = 100;
      return;
    }

    // All target characters completed
    const minAcc = input.minAccuracyScore || 70;
    const avgScore = Math.round(newScores.reduce((acc, s) => acc + s, 0) / Math.max(1, newScores.length));
    const isCorrect = avgScore >= minAcc;

    const mistakes = isCorrect
      ? []
      : [
          {
            targetId: targets.map(t => t.kanji).join(', '),
            expected: targets.map(t => t.kanji).join('・'),
            actual: `Rata-rata akurasi: ${avgScore}% (minimal ${minAcc}%)`,
            reason: 'Ketepatan goresan beberapa aksara belum memenuhi standar kelulusan.'
          }
        ];

    const masteryUpdates = targets.map((t, idx) => {
      const charScore = newScores[idx] ?? avgScore;
      const charPassed = charScore >= minAcc;
      return {
        targetId: t.id || t.kanji,
        targetType: 'kanji' as const,
        previousScore: 0,
        newScore: 0,
        delta: charPassed ? (charScore >= 90 ? 20 : 15) : -8,
        isCorrect: charPassed
      };
    });

    const result: RoundResult = {
      roundIndex: input.roundIndex,
      phase: RoundPhase.INSCRIPTION,
      score: avgScore,
      correct: isCorrect,
      mistakes,
      hpDamage: isCorrect ? 0 : 1,
      timeSpentMs: 0,
      masteryUpdates,
      metadata: {
        completedCharacters: targets.map(t => t.kanji),
        scores: newScores
      }
    };

    onSubmitAnswer(result);
  };

  const isKana = currentTarget.meaning.includes('Hiragana') ||
    currentTarget.meaning.includes('Katakana') ||
    currentTarget.kanji.charCodeAt(0) < 0x4e00;

  const nextButtonLabel = isLastTarget
    ? 'Selesaikan Ronde Inskripsi'
    : `Lanjut ke Aksara Berikutnya (${targets[currentIndex + 1]?.kanji || ''})`;

  return (
    <div className={`w-full max-w-lg mx-auto flex flex-col items-center ${className}`}>
      <div className="text-center mb-2">
        <span className="text-[11px] font-bold text-wine-accent uppercase tracking-widest font-heading">
          {isKana ? 'Tantangan Inskripsi Aksara Kana' : 'Tantangan Inskripsi Kanji'}
        </span>
        <p className="text-xs text-text-secondary mt-0.5">
          {isKana
            ? `Tuliskan setiap aksara sesuai urutan goresan • Target Akurasi: ${input.minAccuracyScore}%`
            : `Tuliskan goresan kanji sesuai petunjuk bacaan & arti • Target Akurasi: ${input.minAccuracyScore}%`}
        </p>
      </div>

      {/* Multi-Character Step Navigator */}
      {targets.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap">
          {targets.map((t, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={`${t.kanji}_${idx}`}
                className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold font-jp border transition-all ${
                  isCurrent
                    ? 'bg-surface-elevated text-wine-accent border-border-strong shadow-sm scale-105'
                    : isCompleted
                      ? 'bg-surface-inset text-emerald-400 border-border-subtle'
                      : 'bg-surface-inset text-text-muted border-border-subtle opacity-50'
                }`}
              >
                <span>{t.kanji}</span>
                {isCompleted && <span className="text-[10px] text-emerald-400">✓</span>}
              </div>
            );
          })}
        </div>
      )}

      <KanjiWritingCanvas
        key={`${currentTarget.kanji}_${currentIndex}_${input.roundIndex}`}
        kanjiChar={currentTarget.kanji}
        meaning={currentTarget.meaning}
        onyomi={currentTarget.onyomi}
        kunyomi={currentTarget.kunyomi}
        totalSheets={1}
        autoAdvance={false}
        showCompletionDetail={true}
        nextButtonLabel={nextButtonLabel}
        showStopwatch={true}
        soundEnabled={soundEnabled}
        onCompleteSheet={handleSheetComplete}
        onFinish={handleProceedNext}
      />
    </div>
  );
};

// ------------------------------------------------------------------------------
// SUB-RUNNER: ALCHEMY CONJUGATION RUNNER
// ------------------------------------------------------------------------------

interface AlchemyInteractiveRunnerProps {
  input: AlchemyRoundInput;
  soundEnabled: boolean;
  onSubmitAnswer: (result: RoundResult) => void;
  className?: string;
}

const AlchemyInteractiveRunner: React.FC<AlchemyInteractiveRunnerProps> = ({
  input,
  soundEnabled,
  onSubmitAnswer,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ConjugationAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const currentTarget = input.targets[currentIndex];

  // Generate 4 plausible choices for multiple-choice conjugation practice
  const options = useMemo(() => {
    if (!currentTarget) return [];
    const correct = currentTarget.expectedConjugated;
    const base = currentTarget.dictionaryForm;

    // Distractor heuristic
    const distractors = [
      `${base}ます`,
      `${base.slice(0, -1)}て`,
      `${base.slice(0, -1)}ない`,
      `${base.slice(0, -1)}た`
    ].filter(d => d !== correct);

    const pool = Array.from(new Set([correct, ...distractors])).slice(0, 4);
    return pool.sort(() => Math.random() - 0.5);
  }, [currentTarget]);

  const handleSelectOption = (opt: string) => {
    if (isChecked) return;
    setSelectedOption(opt);
    setIsChecked(true);

    const isCorrect = opt === currentTarget.expectedConjugated;
    if (soundEnabled) {
      playSound(isCorrect ? 'correct' : 'wrong', true);
    }

    const answerRecord: ConjugationAnswer = {
      targetId: currentTarget.targetId,
      dictionaryForm: currentTarget.dictionaryForm,
      ruleName: currentTarget.ruleName,
      userInput: opt,
      expected: currentTarget.expectedConjugated,
      isCorrect
    };

    const newAnswers = [...answers, answerRecord];
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex + 1 < input.targets.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsChecked(false);
    } else {
      // Completed all alchemy targets -> submit to adapter
      const result = ConjugationAdapter.toRoundResult({
        answers,
        roundIndex: input.roundIndex,
        passThresholdPercentage: input.difficultySettings?.accuracyRequired || 70
      });
      onSubmitAnswer(result);
    }
  };

  if (!currentTarget) return null;

  return (
    <div className={`w-full max-w-lg mx-auto bg-surface-card panel-stitched rounded-3xl p-6 border border-border-subtle shadow-xl ${className}`}>
      <div className="flex items-center justify-between text-xs text-text-secondary mb-4 pb-3 border-b border-border-subtle">
        <span className="font-bold text-wine-accent uppercase tracking-wider font-heading">
          Alkemia Konjugasi • Tingkat {input.tier}
        </span>
        <span className="font-mono">{currentIndex + 1} / {input.targets.length}</span>
      </div>

      {/* Target Word & Prompt */}
      <div className="text-center my-6">
        <span className="text-xs px-2.5 py-1 rounded-full bg-surface-elevated text-text-secondary border border-border-subtle">
          Bentuk: {currentTarget.ruleName}
        </span>
        <h3 className="text-3xl font-black text-text-primary font-heading mt-3 mb-1">
          {currentTarget.dictionaryForm}
        </h3>
        <p className="text-xs text-text-muted">
          ({currentTarget.reading}) • {currentTarget.meaning}
        </p>
      </div>

      {/* Multiple Choice Options */}
      <div className="grid grid-cols-2 gap-3 my-6">
        {options.map((opt, i) => {
          let btnStyle = 'bg-surface-inset border-border-subtle text-text-primary hover:border-border-strong';
          if (isChecked) {
            if (opt === currentTarget.expectedConjugated) {
              btnStyle = 'bg-emerald-500/20 border-border-subtle text-emerald-400 font-bold';
            } else if (opt === selectedOption) {
              btnStyle = 'bg-red-500/20 border-border-subtle text-red-400 font-bold';
            } else {
              btnStyle = 'bg-surface-inset/50 border-transparent text-text-muted opacity-40';
            }
          }

          return (
            <button
              key={`${opt}_${i}`}
              type="button"
              disabled={isChecked}
              onClick={() => handleSelectOption(opt)}
              className={`btn-physical-secondary py-3.5 px-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${btnStyle}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      {isChecked && (
        <button
          type="button"
          onClick={handleNext}
          className="btn-physical-primary w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>{currentIndex + 1 < input.targets.length ? 'Lanjut Kata Berikutnya' : 'Selesaikan Ronde'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------
// SUB-RUNNER: SENTENCE & KANA ORDERING RUNNER (Multi-Exercise Enabled)
// ------------------------------------------------------------------------------

interface SentenceInteractiveRunnerProps {
  input: SentenceRoundInput;
  soundEnabled: boolean;
  onSubmitAnswer: (result: RoundResult) => void;
  className?: string;
}

const SentenceInteractiveRunner: React.FC<SentenceInteractiveRunnerProps> = ({
  input,
  soundEnabled,
  onSubmitAnswer,
  className = ''
}) => {
  const exercises = useMemo(() => {
    if (input.exercises && input.exercises.length > 0) {
      return input.exercises;
    }
    return [
      {
        prompt: input.prompt,
        englishMeaning: input.englishMeaning,
        scrambledSegments: input.scrambledSegments,
        correctOrder: input.correctOrder
      }
    ];
  }, [input]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctExercises, setCorrectExercises] = useState(0);
  const [collectedMistakes, setCollectedMistakes] = useState<any[]>([]);

  const currentExercise = exercises[currentIdx] || exercises[0];
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(currentExercise?.scrambledSegments || []);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean | null>(null);

  useEffect(() => {
    if (currentExercise) {
      setSelectedTokens([]);
      setAvailableTokens(currentExercise.scrambledSegments);
      setIsSubmitted(false);
      setIsCorrectFeedback(null);
    }
  }, [currentIdx, currentExercise]);

  const handlePickToken = (token: string, idx: number) => {
    if (isSubmitted) return;
    const newAvail = [...availableTokens];
    newAvail.splice(idx, 1);
    setAvailableTokens(newAvail);
    setSelectedTokens([...selectedTokens, token]);
  };

  const handleRemoveToken = (token: string, idx: number) => {
    if (isSubmitted) return;
    const newSel = [...selectedTokens];
    newSel.splice(idx, 1);
    setSelectedTokens(newSel);
    setAvailableTokens([...availableTokens, token]);
  };

  const handleReset = () => {
    if (isSubmitted) return;
    setSelectedTokens([]);
    setAvailableTokens(currentExercise.scrambledSegments);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const constructed = selectedTokens.join('');
    const expected = currentExercise.correctOrder.join('');
    const isCorrect = constructed === expected;
    setIsCorrectFeedback(isCorrect);

    if (soundEnabled) {
      playSound(isCorrect ? 'correct' : 'wrong', true);
    }

    const newMistakes = isCorrect
      ? collectedMistakes
      : [
          ...collectedMistakes,
          {
            targetId: input.grammar.id,
            expected,
            actual: constructed,
            reason: `Susunan kata '${expected}' belum tepat.`
          }
        ];
    setCollectedMistakes(newMistakes);

    const newCorrect = isCorrect ? correctExercises + 1 : correctExercises;
    if (isCorrect) {
      setCorrectExercises(newCorrect);
    }

    setTimeout(() => {
      if (currentIdx + 1 < exercises.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        // All exercises completed
        const finalScore = Math.round((newCorrect / exercises.length) * 100);
        const pass = finalScore >= (input.difficultySettings?.accuracyRequired || 65);

        const result: RoundResult = {
          roundIndex: input.roundIndex,
          phase: RoundPhase.SENTENCE,
          score: finalScore,
          correct: pass,
          mistakes: newMistakes,
          hpDamage: pass ? 0 : 1,
          masteryUpdates: [
            {
              targetId: input.grammar.id,
              targetType: 'grammar',
              previousScore: 0,
              newScore: 0,
              delta: pass ? 15 : -8,
              isCorrect: pass
            }
          ]
        };

        onSubmitAnswer(result);
      }
    }, 1100);
  };

  return (
    <div className={`w-full max-w-lg mx-auto bg-surface-card panel-stitched rounded-3xl p-6 border border-border-subtle shadow-xl ${className}`}>
      {/* Exercise progress header */}
      <div className="flex items-center justify-between text-xs text-text-secondary mb-3 pb-2 border-b border-border-subtle">
        <span className="font-bold text-wine-accent uppercase tracking-wider font-heading">
          Penyusunan Aksara & Kalimat
        </span>
        <span className="font-mono text-text-muted">
          Soal {currentIdx + 1} dari {exercises.length}
        </span>
      </div>

      <div className="text-center mb-5">
        <h3 className="text-base font-bold text-text-primary mt-1">
          {currentExercise.prompt}
        </h3>
        {currentExercise.englishMeaning && (
          <p className="text-xs text-text-secondary mt-0.5">{currentExercise.englishMeaning}</p>
        )}
      </div>

      {/* Assembly Dropzone */}
      <div
        className={`min-h-[70px] p-3 rounded-2xl bg-surface-inset border-2 border-dashed flex flex-wrap items-center gap-2 mb-6 transition-colors ${
          isCorrectFeedback === true
            ? 'border-emerald-500/60 bg-emerald-500/10'
            : isCorrectFeedback === false
              ? 'border-rose-500/60 bg-rose-500/10'
              : 'border-border-subtle'
        }`}
      >
        {selectedTokens.length === 0 ? (
          <span className="text-xs text-text-muted italic mx-auto">
            Ketuk potongan aksara di bawah untuk menyusun urutan yang benar...
          </span>
        ) : (
          selectedTokens.map((tok, idx) => (
            <motion.button
              key={`${tok}_${idx}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="button"
              disabled={isSubmitted}
              onClick={() => handleRemoveToken(tok, idx)}
              className="btn-physical-secondary px-3.5 py-2 rounded-xl text-wine-accent text-base font-bold cursor-pointer font-jp"
            >
              {tok}
            </motion.button>
          ))
        )}
      </div>

      {/* Available Scrambled Pieces */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 min-h-[50px]">
        {availableTokens.map((tok, idx) => (
          <button
            key={`${tok}_${idx}`}
            type="button"
            disabled={isSubmitted}
            onClick={() => handlePickToken(tok, idx)}
            className="btn-physical-secondary px-4 py-2 rounded-xl text-base font-bold transition-all cursor-pointer font-jp"
          >
            {tok}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isSubmitted || selectedTokens.length === 0}
          className="btn-physical-secondary p-3 rounded-2xl disabled:opacity-40 transition-all cursor-pointer"
          title="Ulangi susunan"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitted || availableTokens.length > 0}
          className="btn-physical-primary flex-1 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          <span>
            {currentIdx + 1 < exercises.length ? 'Periksa & Lanjut' : 'Selesaikan Susunan'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
