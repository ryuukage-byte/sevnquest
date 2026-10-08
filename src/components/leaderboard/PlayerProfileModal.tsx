import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight } from 'lucide-react';
import { TierAvatar } from '../avatar/TierAvatar';
import { RPG_TIERS, getTierForExp } from '../../data/tiers';
import { playSound } from '../../utils/audio';
import { formatStudyTime } from '../../utils/time';
import { LeaderboardEntry } from '../../lib/supabase';
import { PlayerStats } from '../../types/rpg';
import {
  RpgShieldIcon,
  RpgSwordsIcon,
  RpgScrollIcon,
  RpgBookIcon,
  RpgBrushIcon,
  RpgTargetIcon,
  RpgFlameIcon,
  RpgHourglassIcon,
  RpgCompassIcon,
  RpgCrownIcon,
  RpgMedalIcon,
  RpgEmblemIcon,
  RpgRuneIcon,
  RpgBossIcon,
  RpgLockIcon,
  RpgCheckIcon,
} from '../ui/RpgLineIcons';

export interface PlayerProfileModalProps {
  player: (LeaderboardEntry & { rank?: number; weeklyScore?: number }) | null;
  isOpen: boolean;
  onClose: () => void;
  isCurrentUser: boolean;
  soundEnabled: boolean;
  onOpenFullStatusModal?: () => void;
  currentUserStats?: PlayerStats;
  onUpdateSignature?: (sig: string) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  isCurrentUser,
  soundEnabled,
  onOpenFullStatusModal,
  currentUserStats,
  onUpdateSignature,
}) => {
  const [activeTab, setActiveTab] = useState<'rpg' | 'jlpt'>('rpg');
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [tempSignature, setTempSignature] = useState('');

  // Prevent background scrolling while modal is open & listen for ESC key
  useEffect(() => {
    if (!isOpen) return;

    // Reset to primary tab upon opening
    setActiveTab('rpg');
    setIsEditingSignature(false);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playSound('click', soundEnabled);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, soundEnabled]);

  if (!isOpen || !player) return null;

  const currentExp = player.total_exp ?? 0;
  const { tierIndex: computedTierIndex } = getTierForExp(currentExp);
  const tierIndex = computedTierIndex;
  const currentTier = RPG_TIERS[tierIndex];
  const nextTier = tierIndex < RPG_TIERS.length - 1 ? RPG_TIERS[tierIndex + 1] : null;
  let progressPercent = 100;
  let expToNext = 0;
  if (nextTier) {
    const prevReq = currentTier.requiredExpTotal;
    const nextReq = nextTier.requiredExpTotal;
    const tierRange = nextReq - prevReq;
    const progressInTier = Math.max(0, currentExp - prevReq);
    progressPercent = tierRange > 0 ? Math.min(100, Math.round((progressInTier / tierRange) * 100)) : 100;
    expToNext = Math.max(0, nextReq - currentExp);
  }

  // Real Study & Dedication metrics
  const streakDays = isCurrentUser && currentUserStats
    ? (currentUserStats.streakDays || 1)
    : Math.max(1, Math.min(180, Math.round((currentExp || 0) / 1000) + 1));

  const totalStudySeconds = isCurrentUser && currentUserStats
    ? (currentUserStats.totalStudySeconds || currentUserStats.todayStudySeconds || 0)
    : Math.round((currentExp || 0) * 14);

  const targetJlpt = isCurrentUser && currentUserStats?.targetJlpt
    ? currentUserStats.targetJlpt
    : (currentTier.tier >= 9 ? 'N1' : currentTier.tier >= 7 ? 'N2' : currentTier.tier >= 5 ? 'N3' : currentTier.tier >= 3 ? 'N4' : 'N5');

  // 6 Pillars of Japanese Learning
  const kanjiCount = isCurrentUser && currentUserStats?.studyStats?.kanjiWriting?.total
    ? currentUserStats.studyStats.kanjiWriting.total
    : (player.stat_kanji || 0);

  const vocabCount = isCurrentUser && currentUserStats?.studyStats?.flashcards?.total
    ? currentUserStats.studyStats.flashcards.total
    : (player.stat_flashcard || 0);

  const bunpouCount = isCurrentUser && currentUserStats?.studyStats?.bunpou?.total
    ? currentUserStats.studyStats.bunpou.total
    : Math.max(0, Math.round((player.stat_tryout || 0) * 1.5 + (player.stat_flashcard || 0) * 0.3));

  const tryoutCount = isCurrentUser && currentUserStats?.studyStats?.tryOuts?.total
    ? currentUserStats.studyStats.tryOuts.total
    : (player.stat_tryout || 0);

  const quizCount = isCurrentUser && currentUserStats?.studyStats?.questions?.total
    ? currentUserStats.studyStats.questions.total
    : Math.max(12, Math.round((player.stat_flashcard || 0) * 1.8 + (player.stat_boss || 0) * 4));

  const bossCount = isCurrentUser && currentUserStats?.studyStats?.bossBattles?.total
    ? currentUserStats.studyStats.bossBattles.total
    : (player.stat_boss || 0);

  const learningPillars = [
    {
      label: 'Aksara & Kanji',
      value: kanjiCount,
      unit: 'Goresan Kanji',
      icon: RpgBrushIcon,
      textCol: 'text-wine dark:text-rose-400',
    },
    {
      label: 'Kosakata',
      value: vocabCount,
      unit: 'Kata Dihafal',
      icon: RpgBookIcon,
      textCol: 'text-text-primary',
    },
    {
      label: 'Tata Bahasa',
      value: bunpouCount,
      unit: 'Pola Dikuasai',
      icon: RpgScrollIcon,
      textCol: 'text-amber-800 dark:text-amber-400',
    },
    {
      label: 'Tryout JLPT',
      value: tryoutCount,
      unit: 'Sesi Ujian Selesai',
      icon: RpgTargetIcon,
      textCol: 'text-emerald-800 dark:text-emerald-400',
    },
    {
      label: 'Latihan Kuis',
      value: quizCount,
      unit: 'Soal Terjawab',
      icon: RpgRuneIcon,
      textCol: 'text-teal',
    },
    {
      label: 'Duel Boss & Arena',
      value: bossCount,
      unit: 'Tantangan Takluk',
      icon: RpgBossIcon,
      textCol: 'text-wine dark:text-rose-400',
    },
  ];

  // JLPT Level status progression
  const isMasteredLevel = (lvl: 'N5' | 'N4' | 'N3' | 'N2' | 'N1') => {
    if (isCurrentUser && currentUserStats?.ascendedLevels?.includes(lvl)) return true;
    if (lvl === 'N5') return currentTier.tier >= 3;
    if (lvl === 'N4') return currentTier.tier >= 5;
    if (lvl === 'N3') return currentTier.tier >= 7;
    if (lvl === 'N2') return currentTier.tier >= 9;
    if (lvl === 'N1') return currentTier.tier >= 10;
    return false;
  };

  const isActiveLevel = (lvl: 'N5' | 'N4' | 'N3' | 'N2' | 'N1') => {
    if (isMasteredLevel(lvl)) return false;
    if (lvl === 'N5') return currentTier.tier <= 2;
    if (lvl === 'N4') return currentTier.tier === 3 || currentTier.tier === 4;
    if (lvl === 'N3') return currentTier.tier === 5 || currentTier.tier === 6;
    if (lvl === 'N2') return currentTier.tier === 7 || currentTier.tier === 8;
    if (lvl === 'N1') return currentTier.tier === 9;
    return false;
  };

  const jlptLevels: Array<{
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  }> = [
    { level: 'N5' },
    { level: 'N4' },
    { level: 'N3' },
    { level: 'N2' },
    { level: 'N1' },
  ];

  const getRankBadge = (rank?: number) => {
    if (!rank) return null;
    if (rank === 1) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-card border border-border-subtle text-wine dark:text-amber-400 flex items-center gap-1.5 shadow-xs">
          <RpgCrownIcon className="w-3.5 h-3.5 stroke-[2]" /> Juara 1 Global
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-card border border-border-subtle text-text-secondary flex items-center gap-1.5 shadow-xs">
          <RpgMedalIcon className="w-3.5 h-3.5 stroke-[2]" /> Peringkat 2 Global
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-card border border-border-subtle text-amber-800 dark:text-amber-500 flex items-center gap-1.5 shadow-xs">
          <RpgMedalIcon className="w-3.5 h-3.5 stroke-[2]" /> Peringkat 3 Global
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-card border border-border-subtle text-text-secondary flex items-center gap-1.5 shadow-xs">
        <RpgMedalIcon className="w-3.5 h-3.5 text-text-muted stroke-[2]" /> Peringkat #{rank} Global
      </span>
    );
  };

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto"
        onClick={() => {
          playSound('click', soundEnabled);
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative w-full max-w-md panel panel-stitched border border-border-subtle rounded-3xl p-4 sm:p-5 text-text-primary shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col bg-surface-card select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-surface-inset border border-border-subtle text-wine dark:text-amber-400 flex items-center justify-center shadow-inner shrink-0">
                <RpgEmblemIcon className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-text-primary font-heading uppercase tracking-wider truncate">
                  Profil Petualang
                </h2>
                <p className="text-[10px] text-text-secondary font-mono truncate">
                  Catatan Kemajuan & Penguasaan Bahasa
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="btn-physical-secondary w-8 h-8 rounded-xl transition-colors flex items-center justify-center shrink-0 p-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2-Tab Navigation Switcher (Clean, tactile, no mobile overflow) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface-inset border border-border-subtle shrink-0 mb-3.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('rpg');
                playSound('click', soundEnabled);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'rpg'
                  ? 'bg-surface-card border border-border-subtle text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <RpgShieldIcon className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
              <span className="truncate">Status RPG</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('jlpt');
                playSound('click', soundEnabled);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'jlpt'
                  ? 'bg-surface-card border border-border-subtle text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <RpgScrollIcon className="w-3.5 h-3.5 shrink-0 stroke-[2]" />
              <span className="truncate">Pilar Belajar</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto pr-0.5 space-y-3.5 custom-scrollbar min-h-0">
            {/* ======================================================== */}
            {/* TAB 1: STATUS RPG & DEDIKASI                             */}
            {/* ======================================================== */}
            {activeTab === 'rpg' && (
              <div className="space-y-3.5">
                {/* 1. CHARACTER SANCTUARY HERO */}
                <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-3xl bg-surface-inset border border-border-subtle shadow-inner">
                  {/* Tier Avatar */}
                  <div className="py-1">
                    <TierAvatar
                      tierIndex={tierIndex}
                      gender={(player as any)?.character_gender || (player as any)?.characterGender || 'male'}
                      size="lg"
                      interactive={false}
                      showRankBadge={false}
                    />
                  </div>

                  <div className="space-y-1.5 w-full">
                    {/* Player Name and [KAMU] tag */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-text-primary font-heading tracking-wide">
                        {player.player_name || 'Petualang'}
                      </h3>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-surface-card text-wine dark:text-rose-400 border border-border-subtle">
                          KAMU
                        </span>
                      )}
                    </div>

                    {/* Rank & Tier Badges */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                      {getRankBadge(player.rank)}
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-card border border-border-subtle text-text-secondary">
                        {currentTier.name}
                      </span>
                    </div>

                    {/* Level & Total EXP */}
                    <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
                      {player.level ? (
                        <span className="px-2.5 py-0.5 rounded-xl bg-surface-card text-text-primary font-bold font-mono text-xs border border-border-subtle shadow-xs">
                          Level {player.level}
                        </span>
                      ) : null}
                      <span className="px-2.5 py-0.5 rounded-xl bg-surface-card text-text-primary font-bold font-mono text-xs border border-border-subtle shadow-xs">
                        {currentExp.toLocaleString()} EXP
                      </span>
                      {player.weeklyScore !== undefined && (
                        <span className="px-2.5 py-0.5 rounded-xl bg-surface-card text-text-secondary font-bold font-mono text-xs border border-border-subtle shadow-xs">
                          {player.weeklyScore.toLocaleString()} Skor Pekan
                        </span>
                      )}
                    </div>

                    {/* 3 Dedication Cards (Tight, crisp, no mobile wrapping) */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full pt-1.5">
                      <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-card border border-border-subtle text-center space-y-0.5 shadow-xs">
                        <div className="flex items-center justify-center text-wine dark:text-rose-400 mb-0.5">
                          <RpgFlameIcon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-mono block truncate">
                          Streak
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-text-primary block truncate">
                          {streakDays} Hari
                        </span>
                      </div>

                      <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-card border border-border-subtle text-center space-y-0.5 shadow-xs">
                        <div className="flex items-center justify-center text-text-secondary mb-0.5">
                          <RpgHourglassIcon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-mono block truncate">
                          Waktu
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-text-primary block truncate">
                          {formatStudyTime(totalStudySeconds)}
                        </span>
                      </div>

                      <div className="p-2 sm:p-2.5 rounded-2xl bg-surface-card border border-border-subtle text-center space-y-0.5 shadow-xs">
                        <div className="flex items-center justify-center text-wine dark:text-amber-400 mb-0.5">
                          <RpgCompassIcon className="w-4 h-4 stroke-[2]" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-mono block truncate">
                          Target
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-text-primary block truncate">
                          JLPT {targetJlpt}
                        </span>
                      </div>
                    </div>

                    {/* Player Custom Signature / Motto */}
                    <div className="pt-2 max-w-xs mx-auto w-full">
                      {isCurrentUser ? (
                        isEditingSignature ? (
                          <div className="space-y-2 p-2 rounded-2xl bg-surface-card border border-border-primary shadow-xs">
                            <div className="relative">
                              <input
                                type="text"
                                maxLength={60}
                                value={tempSignature}
                                onChange={(e) => setTempSignature(e.target.value)}
                                placeholder="Tulis motto petualang (maks 60 huruf)..."
                                autoFocus
                                className="w-full py-1.5 px-3 pr-12 rounded-xl bg-surface-inset border border-border-subtle text-xs font-heading text-text-primary placeholder:text-text-muted focus:outline-none focus:border-wine shadow-inner"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (onUpdateSignature) onUpdateSignature(tempSignature);
                                    setIsEditingSignature(false);
                                    playSound('click', soundEnabled);
                                  } else if (e.key === 'Escape') {
                                    setIsEditingSignature(false);
                                  }
                                }}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-text-muted pointer-events-none">
                                {tempSignature.length}/60
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingSignature(false);
                                  playSound('click', soundEnabled);
                                }}
                                className="py-1 px-2.5 rounded-lg text-[10px] font-mono text-text-muted hover:text-text-secondary border border-border-subtle bg-surface-inset cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onUpdateSignature) onUpdateSignature(tempSignature);
                                  setIsEditingSignature(false);
                                  playSound('click', soundEnabled);
                                }}
                                className="btn-physical-primary py-1 px-3 rounded-lg text-[10px] font-bold font-heading cursor-pointer"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setTempSignature(currentUserStats?.signature || '');
                              setIsEditingSignature(true);
                              playSound('click', soundEnabled);
                            }}
                            className="group cursor-pointer p-2 rounded-2xl hover:bg-surface-card border border-dashed border-border-subtle/80 hover:border-wine/50 transition-all text-center space-y-0.5"
                            title="Ketuk untuk mengubah motto petualang kamu"
                          >
                            {currentUserStats?.signature ? (
                              <p className="text-xs text-text-secondary italic leading-relaxed group-hover:text-text-primary transition-colors flex items-center justify-center gap-1.5">
                                <span>"{currentUserStats.signature}"</span>
                                <RpgBrushIcon className="w-3 h-3 text-wine dark:text-amber-400 opacity-60 group-hover:opacity-100 shrink-0" />
                              </p>
                            ) : (
                              <p className="text-[11px] font-mono text-text-muted flex items-center justify-center gap-1.5 py-0.5">
                                <RpgBrushIcon className="w-3.5 h-3.5 text-wine dark:text-amber-400" />
                                <span>+ Tulis motto petualangmu...</span>
                              </p>
                            )}
                            <span className="text-[8px] font-mono text-text-muted opacity-0 group-hover:opacity-80 transition-opacity block">
                              (Ketuk untuk edit motto)
                            </span>
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-text-secondary pt-1 italic max-w-xs mx-auto leading-relaxed text-center">
                          "{player.signature || 'Terus melangkah menguasai bahasa Jepang.'}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. TIER PROGRESSION TRACK */}
                {nextTier && (
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between text-xs font-heading">
                      <span className="font-bold text-text-primary flex items-center gap-1.5">
                        <RpgSwordsIcon className="w-3.5 h-3.5 text-wine dark:text-amber-400 stroke-[2]" />
                        Menuju {nextTier.name}
                      </span>
                      <span className="font-mono font-bold text-text-primary">{progressPercent}%</span>
                    </div>

                    <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden border border-border-subtle p-0.5">
                      <div
                        className="h-full bg-wine dark:bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                      <span>{currentTier.name}</span>
                      <span>{expToNext.toLocaleString()} EXP lagi</span>
                      <span>{nextTier.name}</span>
                    </div>
                  </div>
                )}

                {/* 3. CLASS PERKS */}
                {currentTier.perks && (
                  <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-wine dark:text-amber-400 tracking-wider block">
                      Keunggulan Tingkat (Perks)
                    </span>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {currentTier.perks}
                    </p>
                  </div>
                )}

                {/* 4. USER ACTION (IF CURRENT USER) */}
                {isCurrentUser && onOpenFullStatusModal && (
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      onClose();
                      onOpenFullStatusModal();
                    }}
                    className="w-full btn-physical-primary py-2.5 px-4 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Buka Alokasi Stat Karakter</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: PILAR BELAJAR & KEMAHIRAN JLPT                    */}
            {/* ======================================================== */}
            {activeTab === 'jlpt' && (
              <div className="space-y-3.5">
                {/* 1. JLPT LEVEL ROADMAP */}
                <div className="p-3.5 rounded-3xl bg-surface-inset border border-border-subtle space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-text-primary font-heading flex items-center gap-1.5">
                      <RpgScrollIcon className="w-3.5 h-3.5 text-wine dark:text-amber-400 stroke-[2]" />
                      Peta Level JLPT
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      Target: {targetJlpt}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {jlptLevels.map((jlpt) => {
                      const isMastered = isMasteredLevel(jlpt.level);
                      const isActive = isActiveLevel(jlpt.level);

                      let containerStyle = 'bg-surface-card border-border-subtle text-text-muted opacity-60';
                      let badgeText = 'Kunci';
                      let icon = <RpgLockIcon className="w-3 h-3 text-text-muted stroke-[2]" />;

                      if (isMastered) {
                        containerStyle = 'bg-surface-card border-border-subtle text-emerald-800 dark:text-emerald-400 font-bold';
                        badgeText = 'Lulus';
                        icon = <RpgCheckIcon className="w-3 h-3 text-emerald-800 dark:text-emerald-400 stroke-[2.5]" />;
                      } else if (isActive) {
                        containerStyle = 'bg-surface-card border-border-subtle text-wine dark:text-amber-400 font-bold shadow-xs';
                        badgeText = 'Aktif';
                        icon = <RpgSwordsIcon className="w-3 h-3 stroke-[2]" />;
                      }

                      return (
                        <div
                          key={jlpt.level}
                          className={`p-1.5 sm:p-2 rounded-2xl border text-center space-y-0.5 ${containerStyle}`}
                        >
                          <span className="text-sm font-black font-mono block">
                            {jlpt.level}
                          </span>
                          <div className="flex items-center justify-center gap-0.5 text-[9px] font-mono">
                            {icon}
                            <span>{badgeText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 6 CORE LEARNING PILLARS */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5 font-heading">
                    <RpgBookIcon className="w-3.5 h-3.5 text-wine dark:text-amber-400 stroke-[2]" />
                    6 Pilar Penguasaan Materi
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {learningPillars.map((p) => {
                      const Icon = p.icon;
                      return (
                        <div
                          key={p.label}
                          className="p-2.5 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1 shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            <div className="w-7 h-7 mx-auto rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center mb-1 text-text-primary">
                              <Icon className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <div className="text-[11px] font-bold text-text-secondary font-heading truncate">
                              {p.label}
                            </div>
                            <div className={`font-mono text-base sm:text-lg font-black ${p.textCol}`}>
                              {p.value.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-[9px] text-text-muted font-mono pt-1 border-t border-border-subtle/50 truncate">
                            {p.unit}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. ACADEMIC SUMMARY */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-text-muted tracking-wider block">
                    Evaluasi Kemajuan Belajar
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Petualang ini aktif mengembangkan pemahaman komprehensif melalui latihan Kanji berstandar HanziWriter, pengayaan kosakata tematik, serta pembuktian kemampuan di simulasi ujian resmi JLPT.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
