// ==============================================================================
// NIHONGO TOWER — FLOOR NARRATIVE MODAL (STAGE 5.2)
// ==============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ArrowRight, X, Target } from 'lucide-react';
import { FloorNarrative } from '../../engine/tower/world/floorNarrative';

interface FloorNarrativeModalProps {
  narrative: FloorNarrative | null;
  isOpen: boolean;
  onStartFloor: () => void;
  onClose?: () => void;
}

export const FloorNarrativeModal: React.FC<FloorNarrativeModalProps> = ({
  narrative,
  isOpen,
  onStartFloor,
  onClose
}) => {
  if (!isOpen || !narrative) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md bg-surface-card panel-stitched rounded-3xl p-6 border border-border-subtle shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-wine-accent/15 text-wine-accent flex items-center justify-center font-black font-heading text-xs">
                F.{narrative.floor}
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider block font-bold">
                  Kisah Tantangan
                </span>
                <h3 className="text-sm font-black text-text-primary font-heading">
                  Lantai {narrative.floor}
                </h3>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* NPC Speaker Box */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-inset border border-border-subtle mb-4">
            <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center text-wine-accent shrink-0 shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-text-primary font-heading leading-tight truncate">
                {narrative.npcName}
              </h4>
              <span className="text-[10px] text-text-muted truncate block">
                {narrative.npcRole}
              </span>
            </div>
          </div>

          {/* Japanese Dialogue Quote */}
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle mb-4">
            <p className="text-sm font-bold text-text-primary leading-relaxed font-japanese">
              {narrative.japaneseIntro}
            </p>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              {narrative.indonesianIntro}
            </p>
          </div>

          {/* Objective Box */}
          <div className="p-3 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center gap-2.5 mb-6 text-xs">
            <Target className="w-4 h-4 text-wine-accent shrink-0" />
            <span className="text-text-primary font-bold">
              Objektif: {narrative.objective}
            </span>
          </div>

          {/* Start Action Button */}
          <button
            type="button"
            onClick={onStartFloor}
            className="btn-physical-primary w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Mulai Membuka Tantangan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
