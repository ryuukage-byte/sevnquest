// ==============================================================================
// SAKUBUN STUDIO — INTERACTIVE SENTENCE CONSTRUCTION PRACTICE
// Powered by Japanese Language Intelligence Engine (J-LIE)
// ==============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Volume2,
  Lightbulb,
  BookOpen,
  Send,
  HelpCircle,
} from 'lucide-react';
import {
  generateSentenceExercise,
  validateSentenceSubmission,
  SentencePracticeExercise,
  SentenceTile,
  ValidationFeedback,
  PATTERN_SCHEMAS,
} from '../../engine';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from './RubyText';

export interface SakubunStudioProps {
  initialPatternId?: string;
  onReward?: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onClose?: () => void;
  playerMp?: number;
  playerInt?: number;
  onUseMp?: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const SakubunStudio: React.FC<SakubunStudioProps> = ({
  initialPatternId,
  onReward,
  onClose,
  playerMp = 50,
  playerInt = 10,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  // Pattern selection
  const patternList = useMemo(() => Object.values(PATTERN_SCHEMAS), []);
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    initialPatternId && PATTERN_SCHEMAS[initialPatternId] ? initialPatternId : patternList[0].id
  );

  // Active exercise & user selection state
  const [exercise, setExercise] = useState<SentencePracticeExercise>(() =>
    generateSentenceExercise({ patternId: selectedPatternId, includeDistractors: true })
  );

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [hiddenDistractorIds, setHiddenDistractorIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<ValidationFeedback | null>(null);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);

  // Initialize or re-generate exercise when pattern changes
  const startNewExercise = useCallback((patternId: string) => {
    playSound('click', soundEnabled);
    const newEx = generateSentenceExercise({ patternId, includeDistractors: true });
    setExercise(newEx);
    setSelectedTileIds([]);
    setHiddenDistractorIds(new Set());
    setFeedback(null);
  }, [soundEnabled]);

  // Handle tile click: move from pool to construction slot
  const handleSelectTile = (tileId: string) => {
    if (feedback?.isCorrect) return;
    playSound('click', soundEnabled);
    setSelectedTileIds(prev => [...prev, tileId]);
    if (feedback && !feedback.isCorrect) {
      setFeedback(null); // Clear error state on new change
    }
  };

  // Handle tile click in construction slot: remove back to pool
  const handleRemoveTile = (tileId: string) => {
    if (feedback?.isCorrect) return;
    playSound('click', soundEnabled);
    setSelectedTileIds(prev => prev.filter(id => id !== tileId));
    if (feedback && !feedback.isCorrect) {
      setFeedback(null);
    }
  };

  // Clear all selected tiles
  const handleResetSlots = () => {
    playSound('click', soundEnabled);
    setSelectedTileIds([]);
    setFeedback(null);
  };

  // MP Hint Skill: eliminate 1 distractor tile using 5 MP
  const handleUseMpHint = () => {
    if (onUseMp && !onUseMp(5)) {
      alert('MP tidak mencukupi untuk menggunakan Hint (butuh 5 MP)!');
      return;
    }

    playSound('coin', soundEnabled);
    const distractors = exercise.availableTiles.filter(
      t => t.isDistractor && !hiddenDistractorIds.has(t.id) && !selectedTileIds.includes(t.id)
    );

    if (distractors.length > 0) {
      const targetToHide = distractors[0];
      setHiddenDistractorIds(prev => new Set([...prev, targetToHide.id]));
    } else {
      setShowHintModal(true);
    }
  };

  // Submit and validate sentence
  const handleVerify = () => {
    if (selectedTileIds.length === 0) return;

    const result = validateSentenceSubmission(exercise, selectedTileIds);
    setFeedback(result);

    if (result.isCorrect) {
      playSound('levelup', soundEnabled);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      // Calculate reward (Base 25 EXP + INT bonus + streak bonus)
      const intMultiplier = 1 + (playerInt * 0.02);
      const expEarned = Math.round((25 + streak * 5) * intMultiplier);
      const goldEarned = 15 + streak * 3;
      setStreak(prev => prev + 1);

      if (onReward) {
        onReward(expEarned, goldEarned, 'sakubun', exercise.patternId, 1, 1);
      }
    } else {
      playSound('wrong', soundEnabled);
      setStreak(0);
    }
  };

  // Available tiles in pool (not yet placed in construction line & not hidden by hint)
  const availableInPool = useMemo(() => {
    const selectedSet = new Set(selectedTileIds);
    return exercise.availableTiles.filter(
      t => !selectedSet.has(t.id) && !hiddenDistractorIds.has(t.id)
    );
  }, [exercise.availableTiles, selectedTileIds, hiddenDistractorIds]);

  // Tiles currently in the construction slot
  const selectedTiles = useMemo(() => {
    const tileMap = new Map<string, SentenceTile>(exercise.availableTiles.map(t => [t.id, t]));
    return selectedTileIds.map(id => tileMap.get(id)).filter(Boolean) as SentenceTile[];
  }, [exercise.availableTiles, selectedTileIds]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 select-none pb-8 animate-fadeIn">
      {/* Top Header Card */}
      <div className="p-4 rounded-3xl bg-surface-base border border-border-subtle shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-surface-inset border border-border-subtle text-red-700 dark:text-gold">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading">
                  Sakubun Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/15 text-gold border border-border-subtle">
                  {exercise.patternTitle.split(':')[0] || 'N5/N4'}
                </span>
                {streak > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-border-subtle flex items-center gap-1">
                    🔥 {streak}x Streak
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary">
                Latihan merakit kalimat bahasa Jepang dinamis dengan kaidah tata bahasa & partikel
              </p>
            </div>
          </div>

          {/* Pattern Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPatternId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedPatternId(nextId);
                startNewExercise(nextId);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-inset border border-border-subtle text-xs font-bold text-text-primary cursor-pointer hover:border-border-primary transition-colors focus:outline-none"
            >
              {patternList.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface-base text-text-primary">
                  {p.pattern} ({p.jlpt})
                </option>
              ))}
            </select>

            {onClose && (
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Keluar
              </button>
            )}
          </div>
        </div>

        {/* Target Translation Prompt */}
        <div className="mt-3.5 p-4 rounded-2xl bg-surface-inset border border-border-subtle relative overflow-hidden">
          <div className="text-[11px] font-bold text-gold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Tantangan Kalimat:</span>
            <button
              type="button"
              onClick={() => speakJapanese(exercise.targetSentenceJp)}
              className="p-1 rounded-lg text-text-muted hover:text-gold transition-colors flex items-center gap-1 text-[11px]"
              title="Dengar contoh pelafalan asli"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Dengar Native</span>
            </button>
          </div>
          <p className="text-base sm:text-lg font-bold text-text-primary font-heading leading-snug">
            "{exercise.promptMeaningId}"
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            Pola target: <span className="text-gold font-bold">{PATTERN_SCHEMAS[exercise.patternId]?.pattern}</span>
          </p>
        </div>
      </div>

      {/* Construction Slot Board (Dropzone) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-base border-2 border-dashed border-border-subtle shadow-sm min-h-[140px] flex flex-col justify-between">
        <div className="text-xs font-bold text-text-muted flex items-center justify-between mb-2">
          <span>Area Susunan Kalimat:</span>
          {selectedTiles.length > 0 && (
            <button
              type="button"
              onClick={handleResetSlots}
              className="text-[11px] text-text-muted hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Selected Tiles Sequence */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-h-[58px] py-1">
          {selectedTiles.length === 0 ? (
            <div className="w-full text-center py-3 text-text-muted text-xs italic">
              Klik ubin kata dan partikel di bawah untuk menyusun kalimat...
            </div>
          ) : (
            <AnimatePresence>
              {selectedTiles.map((tile, _idx) => {
                const isParticle = tile.role === 'particle';
                const isSuffix = tile.role === 'grammar_suffix';
                return (
                  <motion.button
                    key={tile.id}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    type="button"
                    onClick={() => handleRemoveTile(tile.id)}
                    className={`px-3 sm:px-4 py-2 rounded-2xl text-sm sm:text-base font-bold transition-all shadow-sm border cursor-pointer active:scale-95 ${
                      isParticle
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                        : isSuffix
                        ? 'bg-purple-500/15 text-purple-300 border-border-subtle hover:bg-purple-500/25'
                        : 'bg-surface-elevated text-text-primary border-border-subtle hover:border-border-primary'
                    }`}
                  >
                    <RubyText japanese={tile.text} reading={tile.reading} showFurigana={furiganaEnabled} />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Assembled Sentence Preview */}
        {selectedTiles.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border-subtle/40 text-xs text-text-secondary flex items-center justify-between">
            <span className="truncate">
              Tersusun: <strong className="text-text-primary">{selectedTiles.map(t => t.text).join('')}</strong>
            </span>
            <span className="text-[10px] text-text-muted">Klik ubin untuk membatalkan</span>
          </div>
        )}
      </div>

      {/* Available Tile Pool */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-base border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-text-muted">
          <span>Pilihan Ubin Kata & Partikel:</span>
          <span className="text-[11px] text-text-muted">{availableInPool.length} ubin tersedia</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-h-[50px]">
          {availableInPool.map((tile) => {
            const isParticle = tile.role === 'particle';
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleSelectTile(tile.id)}
                className={`px-3.5 sm:px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition-all border shadow-sm cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                  isParticle
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-surface-inset text-text-primary border-border-subtle hover:border-border-primary hover:bg-surface-elevated'
                }`}
              >
                <RubyText japanese={tile.text} reading={tile.reading} showFurigana={furiganaEnabled} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Alert (If validated) */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-3xl border ${
            feedback.isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/10 border-red-500/40 text-red-400'
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.isCorrect ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            )}
            <div className="flex-1 space-y-1 text-xs sm:text-sm">
              <div className="font-bold flex items-center justify-between">
                <span>{feedback.isCorrect ? 'Benar Sekali!' : 'Susunan Kurang Tepat'}</span>
                {feedback.isCorrect && (
                  <span className="text-gold font-bold text-xs">+25 EXP & +15 Gold</span>
                )}
              </div>
              <p className="text-text-primary">{feedback.detailedFeedback}</p>
              <p className="text-text-secondary text-xs italic">
                💡 {feedback.pedagogicalAdvice}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Left Side: Hint & Clues */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseMpHint}
            disabled={playerMp < 5 || feedback?.isCorrect}
            className="btn-physical-secondary px-3.5 py-2.5 rounded-2xl text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            title="Gunakan 5 MP untuk membuang ubin pengecoh"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint (5 MP)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHintModal(true)}
            className="btn-physical-secondary px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Kaidah Pola</span>
          </button>
        </div>

        {/* Right Side: Check / Next Button */}
        <div>
          {feedback?.isCorrect ? (
            <button
              type="button"
              onClick={() => startNewExercise(selectedPatternId)}
              className="btn-physical-primary px-6 py-2.5 rounded-2xl font-heading font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Kalimat Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVerify}
              disabled={selectedTileIds.length === 0}
              className="btn-physical-primary px-6 py-2.5 rounded-2xl font-heading font-bold text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>Periksa Kalimat</span>
            </button>
          )}
        </div>
      </div>

      {/* Grammar Rule Dialog Modal */}
      {showHintModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-5 rounded-3xl bg-surface-base border border-border-subtle shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <h3 className="font-heading font-bold text-base text-gold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Kaidah: {exercise.patternTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHintModal(false)}
                className="text-text-muted hover:text-text-primary text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
              <p>
                <strong className="text-text-primary">Rumus Pembentukan:</strong>{' '}
                <span className="text-gold font-mono">{PATTERN_SCHEMAS[exercise.patternId]?.pattern}</span>
              </p>
              <p>
                <strong className="text-text-primary">Penjelasan Nuansa:</strong>{' '}
                {exercise.grammarExplanation}
              </p>
              <p>
                <strong className="text-text-primary">Petunjuk Susunan:</strong>{' '}
                {exercise.hint}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHintModal(false)}
              className="btn-physical-secondary w-full py-2 rounded-2xl text-gold text-xs font-bold transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
