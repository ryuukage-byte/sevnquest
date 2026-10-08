import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Clock, 
  ChevronRight, 
  Trophy, 
  PenTool, 
  ShieldAlert,
  Play,
  Award,
  Layers,
  HelpCircle,
  Castle,
  Star
} from 'lucide-react';
import { KanjiSpeedRushModal } from './KanjiSpeedRushModal';
import { SuddenDeathStreakModal } from './SuddenDeathStreakModal';
import { KotobaGuessModal } from './KotobaGuessModal';
import { ConjugationSpeedRushModal } from './ConjugationSpeedRushModal';
import { StarSentenceRushModal } from './StarSentenceRushModal';
import { playSound } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';

interface ArcadeHubViewProps {
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  playerLevel?: number;
  playerTierIndex?: number;
  onOpenTower?: () => void;
  /** Tower ditutup (dalam pengembangan): banner tetap tampil tetapi tombolnya nonaktif. */
  towerLocked?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

export const ArcadeHubView: React.FC<ArcadeHubViewProps> = ({
  soundEnabled = true,
  userDecks = [],
  playerLevel = 1,
  playerTierIndex = 0,
  onOpenTower,
  towerLocked = false,
  onRewardPlayer,
  onCompleteStudyItem,
}) => {
  const [activeModal, setActiveModal] = useState<'kanji_speed' | 'sudden_death' | 'kotoba_guess' | 'conjugation_rush' | 'star_rush' | null>(null);

  return (
    <div className="space-y-6">
      
      {/* 1. HERO BANNER: ARENA ARCADE */}
      <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-md space-y-3 relative overflow-hidden">
        <div className="space-y-1.5 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gold font-bold">
              Tantangan Kilat · Kecepatan & Akurasi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-wide">
            Arena Arcade
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Tantang batas kecepatan menulis dan ketangkasan bahasa Jepangmu! Selesaikan tantangan dalam batas waktu dan raih kartu pencapaian terbaikmu.
          </p>
        </div>
      </div>

      {/* FEATURED: NIHONGO TOWER 1.000 FLOORS BANNER */}
      {(onOpenTower || towerLocked) && (
        <div className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-wine-accent text-white flex items-center justify-center font-heading font-black text-xl shrink-0 shadow-md">
              <Castle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-wine-accent/15 border border-border-subtle text-wine-accent text-[10px] font-black tracking-wider uppercase">
                  Mode Unggulan
                </span>
                <span className="px-2 py-0.5 rounded-full bg-gold/15 border border-border-subtle text-gold text-[10px] font-black tracking-wider uppercase font-mono">
                  {towerLocked ? 'Dalam Pengembangan' : 'Beta Test'}
                </span>
                <span className="text-xs text-text-muted font-bold font-mono">
                  Menara 1 · 16 Lantai
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-heading text-text-primary mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Menara Nihongo</span>
                <span className="text-xs sm:text-sm font-semibold text-gold font-mono tracking-tight">
                  {towerLocked ? '(Segera Hadir)' : '(Menara 1 · Tutorial)'}
                </span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
                Mulai dari Menara Tutorial: belajar MELIHAT bahasa Jepang lewat aksara, bunyi, dan susunan kalimat sebelum menyusun kalimatmu sendiri.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={towerLocked ? undefined : onOpenTower}
            disabled={towerLocked}
            className="btn-physical-primary w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-xs font-heading flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{towerLocked ? 'Segera Hadir' : 'Daki Menara Sekarang'}</span>
            {!towerLocked && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* 2. ARCADE GAME CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* GAME 1: KANJI SPEED RUSH (60s) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-gold flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <span className="text-xs font-mono font-bold text-text-muted whitespace-nowrap shrink-0">60 Detik</span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-gold transition-colors">
                Kanji Speed Rush
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tulis sebanyak mungkin kanji dalam 60 detik.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('kanji_speed');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">Mulai</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* GAME 2: SUDDEN DEATH (3 NYAWA) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-crimson flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-text-muted whitespace-nowrap shrink-0">3 Nyawa</span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-crimson transition-colors">
                Sudden Death 3 Nyawa
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Jawab tanpa salah. Tiga kesalahan, permainan selesai.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('sudden_death');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">Mulai</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* GAME 3: KOTOBA GUESS RELAY (45s) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-indigo flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-text-muted whitespace-nowrap shrink-0">45 Detik</span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-teal transition-colors">
                Kotoba Guess Relay
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Tebak arti kata dari suaranya, secepat mungkin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('kotoba_guess');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">Mulai</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* GAME 4: ALTAR KONJUGASI KILAT (60s) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              <span className="text-xs font-mono font-bold text-text-muted whitespace-nowrap shrink-0">60 Detik</span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-amber-400 transition-colors">
                Altar Konjugasi Kilat
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Ubah kata kerja ke bentuk yang diminta dalam 60 detik.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('conjugation_rush');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">Mulai</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* GAME 5: SUSUN BINTANG KILAT (60s) */}
        <motion.div
          whileHover={{ y: -3 }}
          className="panel panel-stitched p-5 rounded-3xl bg-surface-card border border-border-subtle hover:border-border-primary shadow-md flex flex-col justify-between space-y-4 group transition-all relative overflow-hidden"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-inset border border-border-subtle text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <span className="text-xs font-mono font-bold text-text-muted whitespace-nowrap shrink-0">60 Detik</span>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary group-hover:text-amber-400 transition-colors">
                Susun Bintang Kilat
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Susun kalimat dan temukan kata di posisi ★ dalam 60 detik.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModal('star_rush');
            }}
            className="w-full btn-physical-primary py-2.5 rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">Mulai</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

      </div>


      {/* MODAL 1: KANJI SPEED RUSH */}
      <KanjiSpeedRushModal
        isOpen={activeModal === 'kanji_speed'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* MODAL 2: SUDDEN DEATH */}
      <SuddenDeathStreakModal
        isOpen={activeModal === 'sudden_death'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* MODAL 3: KOTOBA GUESS */}
      <KotobaGuessModal
        isOpen={activeModal === 'kotoba_guess'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* MODAL 4: CONJUGATION SPEED RUSH (ALTAR KONJUGASI KILAT) */}
      <ConjugationSpeedRushModal
        isOpen={activeModal === 'conjugation_rush'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        userDecks={userDecks}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

      {/* MODAL 5: STAR SENTENCE RUSH (SUSUN BINTANG KILAT) */}
      <StarSentenceRushModal
        isOpen={activeModal === 'star_rush'}
        onClose={() => setActiveModal(null)}
        soundEnabled={soundEnabled}
        playerLevel={playerLevel}
        playerTierIndex={playerTierIndex}
        onRewardPlayer={onRewardPlayer}
        onCompleteStudyItem={onCompleteStudyItem}
      />

    </div>
  );
};
