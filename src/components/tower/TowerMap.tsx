// ==============================================================================
// NIHONGO TOWER — ASCENDING VERTICAL TOWER MAP (STAGE 5.3)
// ==============================================================================

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  CheckCircle2,
  Trophy,
  Heart,
  ChevronUp,
  Compass,
  ArrowRight,
  ArrowLeft,
  Flame,
  Shield,
  BookOpen,
  Crown,
  Zap,
  X,
  Plus,
  Swords,
  Play
} from 'lucide-react';
import { TowerRegion, getRegionForFloor, getAllRegions } from '../../engine/tower/world/towerRegions';
import { TowerPlayerProfile } from '../../types/tower';
import { PlayerShowcaseCard } from './PlayerShowcaseCard';
import { SkillTreeManager, TOWER_PASSIVE_SKILLS } from '../../engine/tower/combat/skillTree';
import { loadTowerProgress } from '../../engine/tower/world/towerProgress';

export interface LandmarkTestFloor {
  floor: number;
  label: string;
  badge: string;
  badgeColor?: string;
  jlpt: string;
  isBoss: boolean;
  bossName?: string;
  description: string;
}

export const TEST_LANDMARK_FLOORS: LandmarkTestFloor[] = [
  {
    floor: 1000,
    label: 'Puncak Tertinggi Menara',
    badge: 'APEX MASTER',
    badgeColor: '#eab308',
    jlpt: 'N1',
    isBoss: true,
    bossName: 'Celestial Sovereign (天守の覇王)',
    description: 'Puncak 1.000 lantai. Ujian akhir penguasaan bahasa Jepang tingkat dewa.'
  },
  {
    floor: 900,
    label: 'Ujian Lorong Nirbatas',
    badge: 'GRAND BOSS',
    badgeColor: '#f59e0b',
    jlpt: 'N1',
    isBoss: true,
    bossName: 'Chronos Sage (時の賢者)',
    description: 'Bos penguji peribahasa kuno dan ungkapan tingkat tinggi N1.'
  },
  {
    floor: 800,
    label: 'Ujian Kelulusan N2',
    badge: 'GRAND BOSS',
    badgeColor: '#a855f7',
    jlpt: 'N2',
    isBoss: true,
    bossName: 'Tsukuyomi Sentinel (月読の守護兵)',
    description: 'Bos penguji kelulusan kurikulum JLPT N2 tingkat lanjut.'
  },
  {
    floor: 700,
    label: 'Kawah Ujian Bos N2',
    badge: 'LANDMARK BOSS',
    badgeColor: '#f97316',
    jlpt: 'N2',
    isBoss: true,
    bossName: 'Oni Warlord (鬼将軍)',
    description: 'Benteng bara tempat konjungsi formal dan wacana kompleks N2 ditempa.'
  },
  {
    floor: 600,
    label: 'Ujian Kelulusan N3',
    badge: 'GRAND BOSS',
    badgeColor: '#ec4899',
    jlpt: 'N3',
    isBoss: true,
    bossName: 'Nine-Tailed Illusionist (白狐の化身)',
    description: 'Bos penguji kelulusan kurikulum JLPT N3 menengah.'
  },
  {
    floor: 500,
    label: 'Kawah Arus Pasif/Kausatif',
    badge: 'MID BOSS',
    badgeColor: '#0ea5e9',
    jlpt: 'N3',
    isBoss: true,
    bossName: 'Seiryu Dragon Spirit (青龍)',
    description: 'Ujian pertengahan N3 menghadapi arus kalimat pasif & kausatif.'
  },
  {
    floor: 400,
    label: 'Pengarsip Gudang Kuno',
    badge: 'LANDMARK BOSS',
    badgeColor: '#8b5cf6',
    jlpt: 'N3',
    isBoss: true,
    bossName: 'Grand Archivist Shoki (大書記官)',
    description: 'Gudang naskah kuno pemahaman nuansa bacaan dan kanji majemuk N3.'
  },
  {
    floor: 300,
    label: 'Ujian Kelulusan N4',
    badge: 'GRAND BOSS',
    badgeColor: '#06b6d4',
    jlpt: 'N4',
    isBoss: true,
    bossName: 'Fujin Bladesmith (風神)',
    description: 'Bos penguji kelulusan kurikulum JLPT N4 dasar.'
  },
  {
    floor: 200,
    label: 'Kuil Penjaga Gerak N5/N4',
    badge: 'MID BOSS',
    badgeColor: '#10b981',
    jlpt: 'N5',
    isBoss: true,
    bossName: 'Tengu of the Grove (天狗)',
    description: 'Penjaga kuil hutan penguji verba perpindahan dan partikel lanjut.'
  },
  {
    floor: 100,
    label: 'Ujian Kelulusan N5',
    badge: 'GRAND BOSS',
    badgeColor: '#3b82f6',
    jlpt: 'N5',
    isBoss: true,
    bossName: 'Sumi no Shugosha (墨の守護者)',
    description: 'Gerbang kelulusan akbar tingkat pemula N5.'
  },
  {
    floor: 50,
    label: 'Ujian Pertengahan N5',
    badge: 'MID BOSS',
    badgeColor: '#6366f1',
    jlpt: 'N5',
    isBoss: true,
    bossName: 'Penjaga Kuil Aksara (Mid-Boss)',
    description: 'Ujian separuh perjalanan N5 menguji kata benda & tata bahasa awal.'
  },
  {
    floor: 10,
    label: 'Gerbang Bos Pondasi Kana',
    badge: 'TOWER BOSS',
    badgeColor: '#e11d48',
    jlpt: 'Intro',
    isBoss: true,
    bossName: 'Gerbang Ujian Pondasi (一・二・三)',
    description: 'Ujian kelulusan Hiragana & Katakana sebelum melangkah ke kosakata umum.'
  },
  {
    floor: 1,
    label: 'Langkah Pertama (AIUEO)',
    badge: 'PONDASI AWAL',
    badgeColor: '#10b981',
    jlpt: 'Intro',
    isBoss: false,
    description: 'Fondasi awal: Menulis 5 vokal dasar あ・い・う・え・お.'
  }
];

interface TowerMapProps {
  currentFloor: number;
  highestClearedFloor: number;
  onSelectFloor: (floor: number) => void;
  playerProfile?: TowerPlayerProfile;
  onBack?: () => void;
  className?: string;
}

export const TowerMap: React.FC<TowerMapProps> = ({
  currentFloor,
  highestClearedFloor,
  onSelectFloor,
  playerProfile,
  onBack,
  className = ''
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeFloorRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'landmarks' | 'foundation'>('landmarks');
  const [selectedPreviewFloor, setSelectedPreviewFloor] = useState<number | null>(null);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [economy, setEconomy] = useState(() => SkillTreeManager.load());

  const handleUpgradeSkill = (skillId: string) => {
    const success = SkillTreeManager.upgradeSkill(skillId);
    if (success) {
      setEconomy(SkillTreeManager.load());
    }
  };

  // Focus strictly on the 10 Foundation Floors (Lantai 1-10)
  const floorsToRender = useMemo(() => {
    const list: number[] = [];
    // Render top to bottom: higher floors at top, floor 1 at bottom!
    for (let f = 10; f >= 1; f--) {
      list.push(f);
    }
    return list;
  }, []);

  // Auto-scroll to active floor on mount
  useEffect(() => {
    if (activeFloorRef.current) {
      activeFloorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const scrollToCurrentFloor = () => {
    if (activeFloorRef.current) {
      activeFloorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const activeRegion = getRegionForFloor(currentFloor);

  return (
    <div className={`relative flex flex-col h-full w-full bg-surface-base select-none overflow-hidden ${className}`}>
      {/* Top Floating Region Banner */}
      <div className="sticky top-0 z-20 w-full bg-surface-card/90 border-b border-border-subtle p-3 px-4 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn-physical-secondary p-1.5 rounded-xl transition-all cursor-pointer shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm font-black font-heading text-sm shrink-0"
            style={{ backgroundColor: activeRegion.accentColor }}
          >
            塔
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-text-primary uppercase tracking-wider font-heading truncate">
                {activeRegion.name}
              </span>
              <span className="text-[10px] text-text-muted font-bold hidden sm:inline">
                ({activeRegion.title})
              </span>
            </div>
            <p className="text-[10px] text-text-secondary truncate max-w-[130px] sm:max-w-xs">
              Lantai {activeRegion.startFloor}-{activeRegion.endFloor} • {activeRegion.bossTitle}
            </p>
          </div>
        </div>

        {/* Right side action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Showcase Card Button */}
          <button
            type="button"
            onClick={() => setIsShowcaseOpen(true)}
            className="btn-physical-secondary flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-gold text-xs font-bold transition-all cursor-pointer"
            title="Kartu Prestise Petualangan"
          >
            <Trophy className="w-3.5 h-3.5 fill-gold/20" />
            <span className="hidden md:inline text-[11px]">Prestise</span>
          </button>

          {/* Passive Skills Button */}
          <button
            type="button"
            onClick={() => setIsSkillTreeOpen(true)}
            className="btn-physical-secondary flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-wine-accent text-xs font-bold transition-all cursor-pointer"
            title="Keahlian Pasif Menara"
          >
            <span className="text-[11px] font-mono font-bold">{economy.skillPoints} SP</span>
          </button>

          {/* Quick jump to player pin button */}
          <button
            type="button"
            onClick={scrollToCurrentFloor}
            className="btn-physical-secondary flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-wine-accent animate-pulse" />
            <span className="text-[11px] font-heading font-black">F.{currentFloor}</span>
          </button>
        </div>
      </div>

      {/* Mode Selector & Quick Testing Warp Bar */}
      <div className="w-full bg-surface-card/60 border-b border-border-subtle px-4 py-2 flex flex-col gap-2 z-10 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-surface-inset rounded-2xl border border-border-subtle max-w-md w-full mx-auto">
          <button
            type="button"
            onClick={() => setViewMode('landmarks')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              viewMode === 'landmarks'
                ? 'bg-surface-elevated text-wine-accent shadow-sm border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Landmark & Bos (Testing 1-1000)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('foundation')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              viewMode === 'foundation'
                ? 'bg-surface-elevated text-wine-accent shadow-sm border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pondasi Dasar (Lantai 1-10)</span>
          </button>
        </div>

        {/* Quick Testing Warp Bar */}
        <div className="w-full max-w-xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-gold" />
            Uji Cepat:
          </span>
          {TEST_LANDMARK_FLOORS.slice().reverse().map(lm => (
            <button
              key={lm.floor}
              type="button"
              onClick={() => setSelectedPreviewFloor(lm.floor)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 transition-all border cursor-pointer ${
                currentFloor === lm.floor
                  ? 'seg-active text-gold'
                  : lm.isBoss
                    ? 'bg-surface-elevated hover:bg-surface-inset text-wine-accent border-border-subtle hover:border-border-primary'
                    : 'bg-surface-elevated hover:bg-surface-inset text-text-primary border-border-subtle'
              }`}
              title={`${lm.label} (${lm.jlpt})`}
            >
              F.{lm.floor}
            </button>
          ))}
        </div>
      </div>

      {/* Main Vertical Climbing Spire */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-8 relative flex flex-col items-center space-y-4"
      >
        {viewMode === 'landmarks' ? (
          /* LANDMARK & BOSS TESTING FLOORS (1000 down to 1) */
          TEST_LANDMARK_FLOORS.map(landmark => {
            const floorNum = landmark.floor;
            const isCurrent = floorNum === currentFloor;
            const floorRegion = getRegionForFloor(floorNum);

            return (
              <React.Fragment key={floorNum}>
                {/* Floor Spire Node */}
                <div
                  ref={isCurrent ? activeFloorRef : null}
                  className="w-full max-w-sm flex flex-col items-center relative"
                >
                  {/* Vertical Cable / Spire Line */}
                  <div className="w-1 h-6 bg-border-subtle/50 -mb-2 z-0" />

                  {/* Node Card */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPreviewFloor(floorNum)}
                    className={`w-full z-10 rounded-2xl p-4 transition-all border shadow-sm relative cursor-pointer ${
                      isCurrent
                        ? 'bg-surface-elevated border-border-strong shadow-md'
                        : landmark.floor === 1000
                          ? 'bg-surface-card border-border-subtle hover:bg-surface-elevated'
                          : landmark.isBoss
                            ? 'bg-surface-card border-border-subtle hover:bg-surface-elevated'
                            : 'bg-surface-card border-border-subtle hover:bg-surface-elevated hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Floor Icon & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-heading font-black text-sm ${
                            landmark.floor === 1000
                              ? 'bg-gold/15 text-gold border border-border-subtle shadow-inner'
                              : landmark.isBoss
                                ? 'bg-surface-inset text-wine-accent border border-border-subtle shadow-inner'
                                : isCurrent
                                  ? 'seg-active text-gold'
                                  : 'bg-surface-inset text-emerald-400 border border-border-subtle'
                          }`}
                        >
                          {landmark.floor === 1000 ? (
                            <Crown className="w-5 h-5 text-gold" />
                          ) : landmark.isBoss ? (
                            <Trophy className="w-5 h-5 text-wine-accent" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-text-primary font-heading truncate">
                              Lantai {floorNum}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border shrink-0"
                              style={{
                                backgroundColor: `${landmark.badgeColor || '#9333ea'}15`,
                                color: landmark.badgeColor || '#c084fc',
                                borderColor: `${landmark.badgeColor || '#9333ea'}40`
                              }}
                            >
                              {landmark.badge}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-wine-accent text-white text-[9px] font-black tracking-wider uppercase shadow-sm shrink-0">
                                Posisi Kamu
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-text-primary mt-0.5 truncate">
                            {landmark.label}
                          </p>
                          <p className="text-[11px] text-text-secondary truncate mt-0.5">
                            {landmark.bossName ? `Bos: ${landmark.bossName}` : landmark.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Action Arrow */}
                      <div className="shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-surface-inset flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          /* 10 FOUNDATION CURRICULUM FLOORS (10 down to 1) */
          floorsToRender.map(floorNum => {
            const isCurrent = floorNum === currentFloor;
            const isCleared = floorNum <= highestClearedFloor;
            const isUnlocked = floorNum <= highestClearedFloor + 1;
            const isBoss = floorNum === 10;
            const isCheckpoint = floorNum === 5;
            const isBossPrep = floorNum === 9;
            const floorRegion = getRegionForFloor(floorNum);

            return (
              <React.Fragment key={floorNum}>
                {/* Floor Spire Node */}
                <div
                  ref={isCurrent ? activeFloorRef : null}
                  className="w-full max-w-sm flex flex-col items-center relative"
                >
                  {/* Vertical Cable / Spire Line */}
                  <div className="w-1 h-6 bg-border-subtle/50 -mb-2 z-0" />

                  {/* Node Card */}
                  <motion.div
                    whileHover={{ scale: isUnlocked ? 1.02 : 1 }}
                    whileTap={{ scale: isUnlocked ? 0.98 : 1 }}
                    onClick={() => {
                      if (isUnlocked) {
                        setSelectedPreviewFloor(floorNum);
                      }
                    }}
                    className={`w-full z-10 rounded-2xl p-4 transition-all border shadow-sm relative cursor-pointer ${
                      isCurrent
                        ? 'bg-surface-elevated border-border-strong shadow-md'
                        : isCleared
                          ? 'bg-surface-card border-border-subtle hover:bg-surface-elevated hover:border-border-strong opacity-95'
                          : isUnlocked
                            ? 'bg-surface-card border-border-subtle hover:bg-surface-elevated hover:border-border-strong'
                            : 'bg-surface-inset/60 border-transparent opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Floor Icon & Number */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-heading font-black text-sm ${
                            isBoss
                              ? 'bg-surface-inset text-wine-accent border border-border-subtle shadow-inner'
                              : isCheckpoint
                                ? 'bg-surface-inset text-gold border border-border-subtle shadow-inner'
                                : isCurrent
                                  ? 'seg-active text-gold'
                                  : isCleared
                                    ? 'bg-surface-inset text-emerald-400 border border-border-subtle'
                                    : 'bg-surface-inset text-text-muted border border-border-subtle'
                          }`}
                        >
                          {isBoss ? (
                            <Trophy className="w-5 h-5 text-wine-accent" />
                          ) : isCheckpoint ? (
                            <Heart className="w-5 h-5 text-gold fill-gold/20" />
                          ) : isCleared ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : !isUnlocked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            floorNum
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-text-primary font-heading">
                              Lantai {floorNum}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-wine-accent text-white text-[9px] font-black tracking-wider uppercase shadow-sm">
                                Posisi Kamu
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[190px]">
                            {isBoss
                              ? 'Ujian Kelulusan Gerbang Awal (Bos F.10)'
                              : isCheckpoint
                                ? 'Pos Pemeriksaan (Checkpoint)'
                                : isBossPrep
                                  ? 'Katakana Essentials (Kata Serapan)'
                                  : floorRegion.title}
                          </p>
                        </div>
                      </div>

                      {/* Right: Action or Status */}
                      <div className="shrink-0">
                        {isUnlocked && (
                          <div className="w-8 h-8 rounded-xl bg-surface-inset flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Floor Preview Bottom Drawer Modal */}
      <AnimatePresence>
        {selectedPreviewFloor !== null && (() => {
          const selectedLandmark = TEST_LANDMARK_FLOORS.find(l => l.floor === selectedPreviewFloor);
          const region = getRegionForFloor(selectedPreviewFloor);

          return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-md bg-surface-card panel-stitched rounded-t-3xl sm:rounded-3xl p-6 border border-border-subtle shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-wine-accent/20 text-wine-accent flex items-center justify-center font-black font-heading text-base">
                      F.{selectedPreviewFloor}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-text-primary font-heading">
                        Lantai {selectedPreviewFloor}
                      </h3>
                      <span className="text-xs text-text-secondary">
                        {region.title} ({region.name})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPreviewFloor(null)}
                    className="text-text-muted hover:text-text-primary text-xs font-bold p-1 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                {/* Information pill */}
                <div className="space-y-3 mb-6">
                  <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-xs flex items-center justify-between">
                    <span className="text-text-muted">Target JLPT:</span>
                    <span className="font-bold text-wine-accent">
                      Level {region.jlptTier}
                    </span>
                  </div>

                  {selectedLandmark && (
                    <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Tipe Tantangan:</span>
                        <span className="font-bold text-gold">{selectedLandmark.badge}</span>
                      </div>
                      {selectedLandmark.bossName && (
                        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50">
                          <span className="text-text-muted">Nama Bos / Penjaga:</span>
                          <span className="font-bold text-wine-accent">{selectedLandmark.bossName}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-text-secondary pt-1 border-t border-border-subtle/50">
                        {selectedLandmark.description}
                      </p>
                    </div>
                  )}

                  <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-xs flex items-center justify-between">
                    <span className="text-text-muted">Akses Testing:</span>
                    <span className="font-bold text-emerald-400">
                      Terbuka Bebas (Bypass Gate Aktif)
                    </span>
                  </div>
                </div>

                {/* Start climbing button */}
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedPreviewFloor;
                    setSelectedPreviewFloor(null);
                    onSelectFloor(target);
                  }}
                  className="btn-physical-primary w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Uji Tantangan Lantai Ini</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 1. Player Showcase Prestige Card Modal */}
      <AnimatePresence>
        {isShowcaseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm relative"
            >
              <button
                type="button"
                onClick={() => setIsShowcaseOpen(false)}
                className="btn-physical-secondary absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer p-0"
              >
                <X className="w-4 h-4" />
              </button>

              <PlayerShowcaseCard
                playerName={playerProfile?.userId || 'Pendaki Menara'}
                currentFloor={currentFloor}
                highestFloorCleared={highestClearedFloor}
                flawlessFloorCount={loadTowerProgress().flawlessFloorCount}
                kanjiMasteredCount={Object.keys(playerProfile?.masteryRecords || {}).length || 240}
                grammarMasteredCount={Object.keys(playerProfile?.weakGrammarIds || {}).length || 85}
                vocabMasteredCount={highestClearedFloor * 6 || 120}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Passive Skill Tree & Economy Modal */}
      <AnimatePresence>
        {isSkillTreeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-surface-card panel-stitched rounded-3xl p-6 border border-border-subtle shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div>
                    <h3 className="text-base font-black text-text-primary font-heading">
                      Keahlian Pasif Menara
                    </h3>
                    <span className="text-[11px] text-text-secondary">
                      Tingkatkan kemampuan permanen
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-xl bg-surface-inset border border-border-subtle text-wine-accent text-xs font-black font-mono">
                    {economy.skillPoints} SP Tersedia
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSkillTreeOpen(false)}
                    className="p-1 text-text-muted hover:text-text-primary rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Skills Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {TOWER_PASSIVE_SKILLS.map(skill => {
                  const currentLevel = economy.allocatedSkills[skill.id] || 0;
                  const isMax = currentLevel >= skill.maxLevel;
                  const nextCost = !isMax ? skill.costPerLevel[currentLevel] : null;
                  const canAfford = !isMax && nextCost !== null && economy.skillPoints >= nextCost;

                  return (
                    <div
                      key={skill.id}
                      className="p-3.5 rounded-2xl bg-surface-inset/80 border border-border-subtle flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-text-primary font-heading">
                              {skill.name}
                            </h4>
                            <span className="text-[10px] text-text-muted font-japanese">
                              {skill.japaneseName}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                            {skill.description}
                          </p>
                        </div>

                        {/* Level badge */}
                        <span className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-[10px] font-mono font-bold shrink-0">
                          Lv.{currentLevel}/{skill.maxLevel}
                        </span>
                      </div>

                      {/* Upgrade action */}
                      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
                        <div className="flex gap-1">
                          {Array.from({ length: skill.maxLevel }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2.5 h-2.5 rounded-full ${
                                idx < currentLevel ? 'bg-wine-accent' : 'bg-surface-card border border-border-subtle'
                              }`}
                            />
                          ))}
                        </div>

                        {isMax ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-border-subtle">
                            Tingkat Maksimal
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleUpgradeSkill(skill.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              canAfford
                                ? 'btn-physical-primary'
                                : 'bg-surface-elevated text-text-muted border border-border-subtle cursor-not-allowed opacity-60'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Upgrade ({nextCost} SP)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
