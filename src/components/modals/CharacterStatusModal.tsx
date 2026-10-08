import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Zap,
  Star,
  Flame,
  Award,
  BookOpen,
  Target,
  Calendar,
  Layers,
  Trophy,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { PlayerStats } from '../../types/rpg';
import { TierAvatar } from '../avatar/TierAvatar';
import { playSound } from '../../utils/audio';
import { calculateLanguageProfile, calculateCoverage } from '../../utils/mastery';
import { INITIAL_STUDY_STATS } from '../../utils/activity';
import { calculateAscensionProgress, getEffectiveTier } from '../../utils/ascension';
import { useBackButton } from '../../hooks/useBackButton';
import { getDojoRestCost, canRestAtDojo, countPotions } from '../../utils/recovery';

interface CharacterStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  stageProgress?: Record<string, import('../../types/rpg').StageClearData>;
  onAllocateStat?: (statKey: 'str' | 'agi' | 'int' | 'vit') => void;
  onRestAtDojo?: () => void;
  onUsePotion?: () => void;
  onStartRecall?: () => void;
  onUpdateName?: (newName: string) => void;
  onUpdateGender?: (gender: 'male' | 'female') => void;
  onAscendTier?: (targetTierIndex: number, targetJlpt: string | null) => void;
}

export const CharacterStatusModal: React.FC<CharacterStatusModalProps> = ({
  isOpen,
  onClose,
  stats,
  stageProgress: _stageProgress = {},
  onUpdateGender,
  onAscendTier,
  onRestAtDojo,
  onUsePotion,
}) => {
  const restCost = getDojoRestCost(stats.hp, stats.maxHp, stats.mp, stats.maxMp);
  const potionCount = countPotions(stats.inventory);
  const hpFull = stats.hp >= stats.maxHp;
  const fullyRested = hpFull && stats.mp >= stats.maxMp;
  // Mobile/Hardware back button handler
  useBackButton(isOpen, () => {
    onClose();
  }, 'character_status_modal');

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playSound('click', stats.soundEnabled);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, stats.soundEnabled]);

  if (!isOpen) return null;

  const { effectiveTierIndex } = getEffectiveTier(stats);
  const ascensionProgress = calculateAscensionProgress(stats);
  
  const languageProfile = calculateLanguageProfile(stats.itemMastery || {});
  const coverage = calculateCoverage(stats);
  const studyStats = stats.studyStats || INITIAL_STUDY_STATS;
  const unlockedAchievements = stats.streakDays > 0 ? 1 : 0;
  const totalAchievements = 12;

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 overflow-y-auto"
        onClick={() => {
          playSound('click', stats.soundEnabled);
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl panel panel-stitched border border-border-subtle rounded-3xl p-4 sm:p-6 text-text-primary shadow-2xl overflow-hidden my-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0 mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-surface-inset border border-border-subtle text-indigo shrink-0">
                <Target className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-text-primary font-heading uppercase tracking-wider truncate">
                  Nihongo Quest Profile
                </h2>
                <p className="text-[9px] sm:text-[10px] text-text-secondary font-mono truncate">
                  5 Realms Progression & Dynamic Mastery
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playSound('click', stats.soundEnabled);
                onClose();
              }}
              className="btn-physical-secondary p-1.5 rounded-full transition-colors shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-4 sm:space-y-6 custom-scrollbar">
            
            {/* 1. IDENTITY & TOTAL STUDY EXP */}
            <div className="flex flex-col items-center text-center space-y-3 p-3.5 sm:p-4 rounded-3xl bg-surface-inset border border-border-subtle shadow-inner">
              <TierAvatar
                tierIndex={effectiveTierIndex ?? stats.tierIndex}
                gender={stats.characterGender || 'male'}
                size="lg"
              />

              {/* Character Gender Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-card border border-border-subtle shadow-sm w-full max-w-xs justify-center">
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', stats.soundEnabled);
                    onUpdateGender?.('male');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                    (stats.characterGender || 'male') === 'male'
                      ? 'bg-blue-600/20 text-blue-400 border border-border-subtle shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
                  }`}
                >
                  <span>♂️</span>
                  <span>Pendekar Pria</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', stats.soundEnabled);
                    onUpdateGender?.('female');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                    stats.characterGender === 'female'
                      ? 'bg-rose-600/20 text-rose-400 border border-border-subtle shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
                  }`}
                >
                  <span>♀️</span>
                  <span>Pendekar Wanita</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">
                    {stats.playerName || 'Pelajar Bahasa'}
                  </h3>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-xl bg-surface-card text-gold font-bold font-mono text-xs border border-border-subtle shadow-sm">
                    {stats.totalExp.toLocaleString()} Akumulasi EXP Belajar
                  </span>
                </div>
              </div>
            </div>

            {/* 1b. PEMULIHAN: Istirahat di Dojo & Potion */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-surface-inset border border-border-subtle shadow-inner space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold font-heading uppercase tracking-wider text-text-secondary">Kondisi Petualang</span>
                <span className="text-xs font-mono font-bold text-text-primary">
                  HP {stats.hp}/{stats.maxHp} · MP {stats.mp}/{stats.maxMp} · <span className="text-gold">{stats.gold.toLocaleString()} Koin</span>
                </span>
              </div>
              <div className="w-full h-2 bg-surface-base rounded-full overflow-hidden border border-border-subtle">
                <div className="h-full bg-state-danger rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, (stats.hp / Math.max(1, stats.maxHp)) * 100))}%` }} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={hpFull || potionCount === 0}
                  onClick={() => { playSound('coin', stats.soundEnabled); onUsePotion?.(); }}
                  className="btn-physical-secondary flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold font-heading disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Gunakan Potion ({potionCount}) · +30% HP
                </button>
                <button
                  type="button"
                  disabled={!canRestAtDojo(stats)}
                  onClick={() => { playSound('coin', stats.soundEnabled); onRestAtDojo?.(); }}
                  className="btn-physical-primary flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold font-heading disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fullyRested ? 'Sudah Bugar' : `Istirahat di Dojo · ${restCost} Koin`}
                </button>
              </div>
            </div>

            {/* 2. ASCENSION TIER PROGRESSION CARD */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-surface-inset border border-border-subtle space-y-3.5 sm:space-y-4 shadow-sm relative overflow-hidden">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    ascensionProgress.canAscend
                      ? 'bg-state-success/15 border-border-subtle text-state-success'
                      : ascensionProgress.isGated
                      ? 'bg-amber-500/15 border-border-subtle text-amber-400'
                      : 'bg-surface-card border-border-subtle text-indigo'
                  }`}>
                    {ascensionProgress.canAscend ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : ascensionProgress.isGated ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary font-heading flex items-center gap-1.5 flex-wrap">
                      <span>Ujian Ascend Tier</span>
                      {ascensionProgress.targetJlpt && (
                        <span className="text-text-muted font-mono font-normal whitespace-nowrap">
                          ({ascensionProgress.currentJlpt} <ArrowRight className="w-3 h-3 inline text-text-muted" /> {ascensionProgress.targetJlpt})
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-text-secondary font-mono leading-tight">
                      Syarat Naik Tingkat: Minimal 75% di setiap kategori
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 self-start sm:self-auto">
                  {ascensionProgress.canAscend ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-state-success/20 text-state-success border border-border-subtle shadow-sm whitespace-nowrap">
                      Siap Ascend
                    </span>
                  ) : ascensionProgress.isGated ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-border-subtle flex items-center gap-1 whitespace-nowrap">
                      <AlertTriangle className="w-3 h-3" />
                      Tertahan (&lt;75%)
                    </span>
                  ) : ascensionProgress.isAscended ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-indigo/20 text-indigo border border-border-subtle flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3" />
                      Tercapai
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-surface-card text-text-muted border border-border-subtle whitespace-nowrap">
                      Persiapan Ujian
                    </span>
                  )}
                </div>
              </div>

              {/* Overall Accumulation Progress Bar */}
              <div className="space-y-1.5 bg-surface-card/60 p-2.5 sm:p-3 rounded-2xl border border-border-subtle">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-secondary flex items-center gap-1 text-[10px] sm:text-[11px] truncate">
                    Akumulasi Penguasaan Tier ({ascensionProgress.currentJlpt})
                  </span>
                  <div className="flex items-center gap-1.5 font-bold shrink-0 ml-2">
                    <span className={ascensionProgress.overallPassed ? 'text-state-success' : 'text-text-primary'}>
                      {ascensionProgress.overallAccumulationPct}%
                    </span>
                    <span className="text-text-muted text-[10px]">/ 75% Target</span>
                  </div>
                </div>

                <div className="relative h-2.5 w-full bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
                  {/* 75% Threshold Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-text-muted/40 z-10"
                    style={{ left: '75%' }}
                    title="Ambang Batas 75%"
                  />
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ascensionProgress.overallPassed
                        ? 'bg-state-success'
                        : 'bg-indigo'
                    }`}
                    style={{ width: `${Math.min(100, ascensionProgress.overallAccumulationPct)}%` }}
                  />
                </div>
              </div>

              {/* 3 Pillars Summary Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {[
                  {
                    key: 'kanji',
                    label: 'Kanji',
                    data: ascensionProgress.kanji,
                    icon: Edit2,
                    color: 'text-wine-accent',
                    barColor: 'bg-wine-accent',
                  },
                  {
                    key: 'kotoba',
                    label: 'Kotoba',
                    data: ascensionProgress.kotoba,
                    icon: Layers,
                    color: 'text-indigo',
                    barColor: 'bg-indigo',
                  },
                  {
                    key: 'bunpou',
                    label: 'Bunpou',
                    data: ascensionProgress.bunpou,
                    icon: BookOpen,
                    color: 'text-gold',
                    barColor: 'bg-gold',
                  },
                ].map((pillar) => (
                  <div
                    key={pillar.key}
                    className="p-2 sm:p-2.5 rounded-2xl bg-surface-card border border-border-subtle flex flex-col justify-between space-y-1 sm:space-y-1.5 text-center min-w-0 overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[9px] sm:text-[10px] font-bold ${pillar.color} font-heading uppercase truncate`}>
                        {pillar.label}
                      </span>
                      {pillar.data.passed ? (
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-state-success shrink-0" />
                      ) : (
                        <span className="text-[8px] sm:text-[9px] font-mono text-text-muted shrink-0 whitespace-nowrap">
                          {pillar.data.percentage}/75%
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-center gap-1 font-mono">
                      <span className="text-xs sm:text-base font-bold text-text-primary">
                        {pillar.data.percentage}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-surface-inset rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pillar.data.passed ? 'bg-state-success' : pillar.barColor} rounded-full`}
                        style={{ width: `${Math.min(100, pillar.data.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Message & Action Button */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
                  {ascensionProgress.statusMessage}
                </p>

                {ascensionProgress.canAscend && (
                  <button
                    onClick={() => {
                      if (ascensionProgress.nextTierIndex && ascensionProgress.targetJlpt) {
                        playSound('levelup', stats.soundEnabled);
                        onAscendTier?.(ascensionProgress.nextTierIndex, ascensionProgress.targetJlpt);
                      }
                    }}
                    className="btn-physical-primary w-full py-2.5 px-4 rounded-2xl font-bold font-heading text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Lakukan Ascend ke {ascensionProgress.targetJlpt}!</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. STUDY STATISTICS (TOTAL VS UNIQUE) */}
            <div className="space-y-2.5 sm:space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                <BookOpen className="w-4 h-4 text-indigo" />
                Study Statistics
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Flashcards */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-xl bg-indigo/15 flex items-center justify-center mb-1.5 sm:mb-2">
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Flashcards</h4>
                  <div className="flex flex-col text-[10px] sm:text-[11px]">
                    <span className="text-indigo font-mono font-bold">{studyStats.flashcards.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.flashcards.uniqueIds.length} Unique</span>
                  </div>
                </div>

                {/* Questions */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-xl bg-state-success/15 flex items-center justify-center mb-1.5 sm:mb-2">
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-state-success" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Questions</h4>
                  <div className="flex flex-col text-[10px] sm:text-[11px]">
                    <span className="text-state-success font-mono font-bold">{studyStats.questions.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.questions.uniqueIds.length} Unique</span>
                  </div>
                </div>

                {/* Kanji Writing */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-xl bg-wine-accent/15 flex items-center justify-center mb-1.5 sm:mb-2">
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-wine-accent" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Kanji Writing</h4>
                  <div className="flex flex-col text-[10px] sm:text-[11px]">
                    <span className="text-wine-accent font-mono font-bold">{studyStats.kanjiWriting.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.kanjiWriting.uniqueIds.length} Unique</span>
                  </div>
                </div>

                {/* Try Outs / Boss */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-xl bg-gold/15 flex items-center justify-center mb-1.5 sm:mb-2">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary font-heading">Try Outs</h4>
                  <div className="flex flex-col text-[10px] sm:text-[11px]">
                    <span className="text-gold font-mono font-bold">{studyStats.tryOuts.total} Total</span>
                    <span className="text-text-muted font-mono">{studyStats.tryOuts.uniqueIds.length} Unique</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MASTERY VS COVERAGE (N5 - N1) */}
            <div className="space-y-2.5 sm:space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                <Target className="w-4 h-4 text-gold" />
                Mastery vs Coverage (N5 - N1)
              </h3>
              
              <div className="p-3.5 sm:p-4 rounded-3xl bg-surface-inset border border-border-subtle space-y-3.5 sm:space-y-4">
                {/* Overall Mastery & Coverage */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-border-subtle">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-text-muted block font-mono">Overall Mastery (Depth)</span>
                    <span className="text-2xl sm:text-3xl font-bold text-gold font-mono">{languageProfile.overallPercentage}%</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-text-muted block font-mono">Overall Coverage (Breadth)</span>
                    <span className="text-lg sm:text-xl font-bold text-state-success font-mono">{coverage.overall}%</span>
                  </div>
                </div>

                {/* Pillar Breakdown */}
                <div className="space-y-2.5 sm:space-y-3">
                  {[
                    { key: 'kotoba', label: 'Kotoba', mastery: languageProfile.pillars.kotoba.percentage, cov: coverage.kotoba, color: 'bg-indigo text-indigo' },
                    { key: 'kanji', label: 'Kanji', mastery: languageProfile.pillars.kanji.percentage, cov: coverage.kanji, color: 'bg-wine-accent text-wine-accent' },
                    { key: 'bunpou', label: 'Bunpou', mastery: languageProfile.pillars.bunpou.percentage, cov: coverage.bunpou, color: 'bg-gold text-gold' },
                    { key: 'dokkai', label: 'Dokkai', mastery: languageProfile.pillars.dokkai.percentage, cov: coverage.dokkai, color: 'bg-dokkai text-dokkai' },
                    { key: 'choukai', label: 'Choukai', mastery: languageProfile.pillars.choukai.percentage, cov: coverage.choukai, color: 'bg-choukai text-choukai' },
                  ].map(pillar => (
                    <div key={pillar.key} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-14 sm:w-16 text-[11px] sm:text-xs font-bold text-text-primary shrink-0">{pillar.label}</div>
                      
                      {/* Mastery Bar */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex justify-between text-[9px] sm:text-[10px] font-mono">
                          <span className={`${pillar.color.split(' ')[1]} truncate`}>Mastery {pillar.mastery}%</span>
                        </div>
                        <div className="h-1.5 w-full rpg-progress-track rounded-full overflow-hidden">
                          <div className={`h-full ${pillar.color.split(' ')[0]} rounded-full`} style={{ width: `${pillar.mastery}%` }} />
                        </div>
                      </div>

                      {/* Coverage Bar */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex justify-between text-[9px] sm:text-[10px] font-mono">
                          <span className="text-state-success truncate">Coverage {pillar.cov}%</span>
                        </div>
                        <div className="h-1.5 w-full rpg-progress-track rounded-full overflow-hidden">
                          <div className="h-full bg-state-success rounded-full" style={{ width: `${pillar.cov}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] text-text-muted italic mt-2 text-center">
                  * Coverage = Materi yang pernah dipelajari. Mastery = Kekuatan pemahaman & ingatan (SRS).
                </p>
              </div>
            </div>

            {/* 4. STREAK & ACHIEVEMENTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Streak */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                  <Flame className="w-4 h-4 text-gold" />
                  Activity Streak
                </h3>
                <div className="p-4 rounded-3xl bg-surface-inset border border-border-subtle grid grid-cols-2 gap-4">
                  <div className="text-center space-y-1 border-r border-border-subtle">
                    <span className="text-[10px] text-text-muted uppercase">Current Streak</span>
                    <div className="flex items-center justify-center gap-1 text-gold">
                      <Flame className="w-5 h-5 fill-gold" />
                      <span className="text-xl font-bold font-mono">{stats.streakDays}</span>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-text-muted uppercase">Longest Streak</span>
                    <div className="flex items-center justify-center gap-1 text-text-primary">
                      <Award className="w-5 h-5" />
                      <span className="text-xl font-bold font-mono">{stats.longestStreak || stats.streakDays}</span>
                    </div>
                  </div>
                  <div className="col-span-2 pt-3 mt-1 border-t border-border-subtle text-center flex items-center justify-center gap-2 text-xs text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    Total Active Days: <strong className="text-text-primary">{stats.totalActiveDays || stats.streakDays}</strong>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-heading">
                  <Trophy className="w-4 h-4 text-gold" />
                  Achievements
                </h3>
                <div className="p-4 rounded-3xl bg-surface-inset border border-border-subtle flex flex-col justify-center items-center text-center h-[132px]">
                  <span className="text-3xl font-bold text-text-primary font-mono">
                    {unlockedAchievements} <span className="text-text-muted text-xl">/ {totalAchievements}</span>
                  </span>
                  <p className="text-[11px] text-text-muted mt-2">
                    Achievement system will be fully integrated soon! 
                    Keep practicing to unlock badges.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
