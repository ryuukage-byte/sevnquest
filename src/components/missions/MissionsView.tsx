import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, Trophy, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScrollIcon } from '../ui/EngravingIcons';
import { Mission } from '../../types/rpg';
import { playSound } from '../../utils/audio';

interface MissionsViewProps {
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  onClaimReward: (mission: Mission) => void;
  soundEnabled?: boolean;
}

export const MissionsView: React.FC<MissionsViewProps> = ({
  dailyMissions,
  weeklyMissions,
  onClaimReward,
  soundEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const currentList = activeTab === 'daily' ? dailyMissions : weeklyMissions;

  const handleClaim = (mission: Mission) => {
    playSound('coin', soundEnabled);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 }
    });
    onClaimReward(mission);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-6">
      {/* Header */}
      <div className="panel panel-stitched p-4 sm:p-5 mb-3 shadow-md border border-border-subtle">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading tracking-wide text-text-primary flex items-center gap-2">
            {activeTab === 'daily' ? <><ScrollIcon className="w-5 h-5 text-gold" /> Papan Sayembara Harian</> : <><Calendar className="w-5 h-5 text-gold" /> Mandat Ekspedisi Mingguan</>}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {activeTab === 'daily'
              ? 'Reset otomatis setiap jam 00:00 malam untuk farming EXP & Gold rutin.'
              : 'Tantangan mingguan dengan hadiah EXP & Gold berlipat ganda!'}
          </p>
        </div>
      </div>

      {/* Tabs as Skeuomorphic Pills */}
      <div className="skeuo-tier-row mb-3">
        <button
          onClick={() => {
            setActiveTab('daily');
            playSound('click', soundEnabled);
          }}
          className={`skeuo-tier-pill flex-1 flex justify-center items-center gap-2 ${activeTab === 'daily' ? 'active' : ''}`}
        >
          <ScrollIcon className="w-3.5 h-3.5" />
          Misi Harian
        </button>
        <button
          onClick={() => {
            setActiveTab('weekly');
            playSound('click', soundEnabled);
          }}
          className={`skeuo-tier-pill flex-1 flex justify-center items-center gap-2 ${activeTab === 'weekly' ? 'active' : ''}`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Mandat Mingguan
        </button>
      </div>

      {/* Info Status Strip */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs text-text-secondary shadow-inner mb-3">
        <div className="flex items-center gap-1.5 relative z-10">
          <Clock className="w-4 h-4 text-gold" />
          <span>Waktu Reset: <strong className="text-text-primary font-mono font-bold">00:00 (Tengah Malam)</strong></span>
        </div>
        <span className="text-gold font-mono font-bold relative z-10">
          {currentList.filter(m => m.claimed).length} / {currentList.length} Selesai
        </span>
      </div>

      {/* Missions List */}
      <div className="space-y-3">
        {currentList.map((mission) => {
          const isComplete = mission.progress >= mission.target;
          const percent = Math.min(100, Math.round((mission.progress / mission.target) * 100));

          return (
            <motion.div
              key={mission.id}
              whileHover={{ y: -1 }}
              className={`panel panel-stitched p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-border-subtle shadow-md ${
                mission.claimed ? 'opacity-60' : isComplete ? 'border-border-subtle' : ''
              }`}
            >
              <div className="space-y-1.5 flex-1 w-full relative z-10">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                    {mission.title}
                  </h3>
                  {mission.claimed && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-inset text-gold border border-border-subtle font-mono">
                      Selesai
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-secondary">
                  {mission.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex justify-between text-[11px] font-mono text-text-muted">
                    <span>Progress: {mission.progress} / {mission.target}</span>
                    <span className={isComplete ? 'text-gold font-bold' : ''}>{percent}%</span>
                  </div>
                  <div className="skeuo-progress-track">
                    <motion.div
                      animate={{ width: `${percent}%` }}
                      className={`skeuo-progress-bar ${isComplete ? 'completed' : ''}`}
                    />
                  </div>
                </div>

                {/* Rewards Badge */}
                <div className="flex items-center gap-3 pt-0.5 text-xs font-mono">
                  <span className="text-gold font-bold flex items-center gap-1">
                    +{mission.rewardExp} EXP
                  </span>
                </div>
              </div>

              {/* Claim Action Button */}
              <div className="self-end sm:self-center shrink-0 w-full sm:w-auto relative z-10">
                {mission.claimed ? (
                  <button
                    disabled
                    className="skeuo-btn-claimed w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terklaim
                  </button>
                ) : isComplete ? (
                  <button
                    onClick={() => handleClaim(mission)}
                    className="btn-cta animate-pulse w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-5 text-xs"
                  >
                    <Trophy className="w-4 h-4" />
                    KLAIM HADIAH!
                  </button>
                ) : (
                  <button
                    disabled
                    className="skeuo-btn-disabled w-full sm:w-auto"
                  >
                    Belum Selesai
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
