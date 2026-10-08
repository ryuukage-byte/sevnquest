// ==============================================================================
// NIHONGO TOWER — BOSS GATE MODAL (STAGE 4B)
// ==============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ShieldAlert, BookOpen, ArrowRight, X } from 'lucide-react';
import { BossGateResult } from '../../types/tower';

interface BossGateModalProps {
  gateResult: BossGateResult | null;
  isOpen: boolean;
  onClose: () => void;
  onJumpToTrainingFloor?: (floor: number) => void;
}

export const BossGateModal: React.FC<BossGateModalProps> = ({
  gateResult,
  isOpen,
  onClose,
  onJumpToTrainingFloor
}) => {
  if (!isOpen || !gateResult) return null;

  const { requirements, currentMastery, weaknesses, recommendedFloors } = gateResult;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md bg-surface-card panel-stitched rounded-3xl p-6 border border-border-subtle shadow-2xl relative overflow-hidden"
        >
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-wine-accent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center my-4">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-rose-500 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest font-heading">
              Akses Dibatasi
            </span>
            <h2 className="text-xl font-black text-text-primary font-heading mt-1">
              {gateResult.gateName}
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Gerbang bos membutuhkan penguasaan komprehensif sebelum kamu dapat menantang ujian ini.
            </p>
          </div>

          {/* Mastery Requirements Grid */}
          <div className="space-y-2.5 my-5">
            {/* Kanji */}
            <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs">
              <span className="font-bold text-text-secondary">Penguasaan Kanji</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${currentMastery.kanji >= requirements.minKanjiMastery ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentMastery.kanji}%
                </span>
                <span className="text-text-muted">/ Min {requirements.minKanjiMastery}%</span>
              </div>
            </div>

            {/* Grammar */}
            <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs">
              <span className="font-bold text-text-secondary">Tata Bahasa (Bunpou)</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${currentMastery.grammar >= requirements.minGrammarMastery ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentMastery.grammar}%
                </span>
                <span className="text-text-muted">/ Min {requirements.minGrammarMastery}%</span>
              </div>
            </div>

            {/* Vocabulary */}
            <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs">
              <span className="font-bold text-text-secondary">Kosakata (Kotoba)</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${currentMastery.vocabulary >= requirements.minVocabularyMastery ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentMastery.vocabulary}%
                </span>
                <span className="text-text-muted">/ Min {requirements.minVocabularyMastery}%</span>
              </div>
            </div>
          </div>

          {/* Weaknesses List */}
          {weaknesses.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-xs mb-5">
              <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>Titik Lemah yang Perlu Diperkuat:</span>
              </div>
              <ul className="list-disc list-inside text-text-secondary space-y-0.5 ml-1">
                {weaknesses.slice(0, 3).map((w, idx) => (
                  <li key={idx} className="truncate">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation & Action */}
          <div className="space-y-2">
            {onJumpToTrainingFloor && (
              <button
                type="button"
                onClick={() => onJumpToTrainingFloor(recommendedFloors[0])}
                className="btn-physical-primary w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Latih di Lantai {recommendedFloors[0]} - {recommendedFloors[1]}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-physical-secondary w-full py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              Kembali ke Pemilihan Lantai
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
