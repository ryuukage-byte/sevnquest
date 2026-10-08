// ==============================================================================
// NIHONGO TOWER — PLAYER SHOWCASE CARD (STAGE 5.4)
// ==============================================================================

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Share2,
  Copy,
  Check,
  BookOpen,
  Award,
  Flame,
  Shield,
  Star
} from 'lucide-react';
import { getRegionForFloor } from '../../engine/tower/world/towerRegions';

interface PlayerShowcaseCardProps {
  playerName?: string;
  avatarUrl?: string;
  currentFloor: number;
  highestFloorCleared: number;
  kanjiMasteredCount?: number;
  grammarMasteredCount?: number;
  vocabMasteredCount?: number;
  flawlessFloorCount?: number;
  equippedTitle?: string;
  totalStudyHours?: number;
  className?: string;
}

export const PlayerShowcaseCard: React.FC<PlayerShowcaseCardProps> = ({
  playerName = 'Naru',
  avatarUrl,
  currentFloor,
  highestFloorCleared,
  kanjiMasteredCount = 380,
  grammarMasteredCount = 112,
  vocabMasteredCount = 1420,
  flawlessFloorCount = 28,
  equippedTitle,
  totalStudyHours = 45,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const region = getRegionForFloor(currentFloor);
  const jlptEstimate = region.jlptTier;
  const activeTitle = equippedTitle || `Penakluk ${region.title}`;

  const handleCopySummary = () => {
    const text = `⛩️ NIHONGO QUEST JOURNEY\n` +
      `👤 Pendaki: ${playerName}\n` +
      `🗼 Posisi Menara: Lantai ${currentFloor} / 1.000\n` +
      `📜 Estimasi Level: JLPT ${jlptEstimate}\n` +
      `🀄 Kanji Dikuasai: ${kanjiMasteredCount}\n` +
      `📖 Kosakata Dikuasai: ${vocabMasteredCount}\n` +
      `✨ Kemenangan Flawless: ${flawlessFloorCount} Lantai\n` +
      `⚔️ Gelar: 「${activeTitle}」\n` +
      `#SevnQuest #NihongoTower #BelajarJepang`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`w-full max-w-sm mx-auto select-none ${className}`}>
      {/* Showcase Trading Card Container */}
      <motion.div
        whileHover={{ y: -4 }}
        className="rounded-3xl p-6 bg-surface-card panel-stitched border border-border-subtle shadow-md relative overflow-hidden"
      >
        {/* Decorative Background Kanji Watermark */}
        <div className="absolute -right-6 -bottom-10 text-[140px] font-black text-white/5 pointer-events-none font-heading leading-none select-none">
          塔
        </div>

        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle/80">
          <div className="flex items-center gap-1.5 text-wine-accent">
            <span className="text-[10px] font-black tracking-widest uppercase font-heading">
              SevnQuest Journey Card
            </span>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-wine-accent text-white shadow-sm">
            JLPT {jlptEstimate}
          </span>
        </div>

        {/* Avatar & Player Identity */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={playerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-wine-accent flex items-center justify-center text-white font-black text-2xl font-heading">
                {playerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-black text-text-primary font-heading truncate leading-tight">
              {playerName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mt-0.5 truncate">
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{activeTitle}</span>
            </div>
            <span className="text-[11px] text-text-muted mt-0.5 block truncate">
              Wilayah: {region.name}
            </span>
          </div>
        </div>

        {/* Main Floor Spire Metric */}
        <div className="p-3.5 rounded-2xl bg-surface-inset/80 border border-border-subtle mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
              Puncak Tertinggi
            </span>
            <span className="text-2xl font-black text-text-primary font-heading leading-tight">
              Lantai {highestFloorCleared}
            </span>
            <span className="text-[10px] text-text-muted block mt-0.5">
              dari 1.000 Lantai Menara
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
              Posisi Aktif
            </span>
            <span className="text-lg font-black text-wine-accent font-heading leading-tight">
              F.{currentFloor}
            </span>
          </div>
        </div>

        {/* 4 Pillar Grid Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-5 text-xs">
          {/* Kanji */}
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
            <span className="text-[10px] text-text-muted block">Kanji Dikuasai</span>
            <span className="text-base font-black text-emerald-400 font-heading">
              {kanjiMasteredCount.toLocaleString()}
            </span>
          </div>

          {/* Vocabulary */}
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
            <span className="text-[10px] text-text-muted block">Kosakata Aktif</span>
            <span className="text-base font-black text-cyan-400 font-heading">
              {vocabMasteredCount.toLocaleString()}
            </span>
          </div>

          {/* Grammar */}
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
            <span className="text-[10px] text-text-muted block">Tata Bahasa</span>
            <span className="text-base font-black text-purple-400 font-heading">
              {grammarMasteredCount} Pola
            </span>
          </div>

          {/* Flawless */}
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
            <span className="text-[10px] text-text-muted block">Flawless Victor</span>
            <span className="text-base font-black text-amber-400 font-heading">
              {flawlessFloorCount} Lantai
            </span>
          </div>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleCopySummary}
          className="btn-physical-primary w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Ringkasan Tersalin!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Salin Ringkasan Kartu</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
