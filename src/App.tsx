/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Cloud } from 'lucide-react';
import { PlayerStats, StageClearData, Mission } from './types/rpg';
import { StudyTimerBadge } from './components/layout/StudyTimerBadge';
import { HomeView } from './components/home/HomeView';
import { MissionsView } from './components/missions/MissionsView';
import { BottomNavigation, TabType } from './components/layout/BottomNavigation';
import { CharacterStatusModal } from './components/modals/CharacterStatusModal';
import { playSound } from './utils/audio';
import { applyDojoRest, applyPotion } from './utils/recovery';
import { recordStudyActivity } from './utils/activity';
import { AuthModal } from './components/auth/AuthModal';
import { ModuleBoundary } from './components/common/ModuleBoundary';
import { SpotlightOnboarding } from './components/tutorial/SpotlightOnboarding';
import { MainContent } from './app/MainContent';
import { loadInitialStats, loadStageProgress, loadDailyMissions, loadWeeklyMissions } from './state/loadPlayerState';
import { useToast } from './hooks/useToast';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useDailyRollover } from './hooks/useDailyRollover';
import { useTheme } from './hooks/useTheme';
import { usePersistence } from './hooks/usePersistence';
import { useCloudSync } from './hooks/useCloudSync';
import { usePlayerActions } from './hooks/usePlayerActions';

export default function App() {
  // State inti (diinisialisasi dari localStorage lewat state/loadPlayerState.ts)
  const [stats, setStats] = useState<PlayerStats>(loadInitialStats);
  const [stageProgress, setStageProgress] = useState<Record<string, StageClearData>>(loadStageProgress);
  const [dailyMissions, setDailyMissions] = useState<Mission[]>(loadDailyMissions);
  const [weeklyMissions, setWeeklyMissions] = useState<Mission[]>(loadWeeklyMissions);

  // Ref terbaru untuk efek/handler async (hindari stale closure)
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const stageProgressRef = useRef(stageProgress);
  stageProgressRef.current = stageProgress;
  const dailyMissionsRef = useRef(dailyMissions);
  dailyMissionsRef.current = dailyMissions;
  const weeklyMissionsRef = useRef(weeklyMissions);
  weeklyMissionsRef.current = weeklyMissions;

  const { toastMessage: cloudSyncMessage, showToast } = useToast();

  const nav = useAppNavigation();
  const {
    activeTab, setActiveTab,
    isStatusModalOpen, setIsStatusModalOpen, setIsRecallActive,
    handleTabChange,
    isOnboardingActive, handleCompleteOnboarding, handleOpenAuthFromOnboarding, handleReplayOnboarding,
  } = nav;

  // Active Study Tracking (Recall SRS, Library, and Buku Saku)
  const isStudying = Boolean(nav.isRecallActive || activeTab === 'library' || activeTab === 'deck');

  // Pelacak waktu hidup di <StudyTimerBadge> (re-render per detik terisolasi dari App).
  const handleStudyTimeSave = useCallback((todaySec: number, totalSec: number, studyDate: string) => {
    setStats(prev => ({ ...prev, todayStudySeconds: todaySec, totalStudySeconds: totalSec, lastStudyDate: studyDate }));
  }, []);

  const { isAuthenticated, setIsAuthenticated, cloudSyncStatus, lastSyncedAt, saveToCloud } = useCloudSync({
    stats, stageProgress, dailyMissions, weeklyMissions,
    statsRef, stageProgressRef, dailyMissionsRef, weeklyMissionsRef,
    setStats, setStageProgress, setDailyMissions, setWeeklyMissions, showToast,
  });

  useDailyRollover({ setStats, setDailyMissions, setWeeklyMissions });
  useTheme(stats.theme);
  usePersistence({
    stats, stageProgress, dailyMissions, weeklyMissions,
    statsRef, stageProgressRef, dailyMissionsRef, weeklyMissionsRef, showToast,
  });

  const actions = usePlayerActions({
    stats, setStats, dailyMissions, setDailyMissions, setWeeklyMissions, setStageProgress,
    setIsRecallActive, setActiveTab,
    showToast,
  });
  const {
    handleAllocateStat, handleAscendTier, handleUpdateName, handleUpdateSignature,
  } = actions;


  return (
    <div 
      className="min-h-[100dvh] flex flex-col font-sans antialiased bg-surface-base text-text-primary selection:bg-gold selection:text-surface-base md:pl-24"
      style={{
        paddingBottom: 'max(5rem, calc(4rem + env(safe-area-inset-bottom)))',
      }}
    >
      {/* Cloud Sync Floating Toast Notification */}
      <AnimatePresence>
        {cloudSyncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full panel border border-border-subtle shadow-xl flex items-center gap-2 text-xs font-bold text-text-primary pointer-events-none"
          >
            <Cloud className="w-4 h-4 text-gold animate-pulse shrink-0" />
            <span>{cloudSyncMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Main Navigation Header */}
      <header 
        className="sticky top-0 z-30 bg-surface-card/95 border-b border-border-subtle shadow-md px-4 py-2.5 sm:py-3"
        style={{
          paddingTop: 'max(0.625rem, env(safe-area-inset-top))',
        }}
      >
        <div className="max-w-4xl lg:max-w-6xl mx-auto w-full flex items-center justify-between relative z-10">
          <div
            onClick={() => {
              setIsRecallActive(false);
              setActiveTab('home');
              playSound('click', stats.soundEnabled);
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-surface-inset text-indigo border border-border-subtle flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Swords className="w-4 h-4 stroke-[2.5] text-gold" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold tracking-widest text-text-primary font-heading">
                SevnQuest
              </span>
              <p className="text-[10px] text-text-secondary font-mono tracking-wider">
                The Learning World
              </p>
            </div>
          </div>

          {/* Quick HUD in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs">
            {/* Today's Study Time Tracker */}
            <StudyTimerBadge
              isStudying={isStudying}
              initialTodaySeconds={stats.todayStudySeconds || 0}
              initialTotalSeconds={stats.totalStudySeconds || 0}
              lastStudyDate={stats.lastStudyDate}
              onSave={handleStudyTimeSave}
            />
          </div>
        </div>
      </header>

      <MainContent
        {...nav}
        stats={stats}
        setStats={setStats}
        stageProgress={stageProgress}
        dailyMissions={dailyMissions}
        weeklyMissions={weeklyMissions}
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncedAt={lastSyncedAt}
        saveToCloud={saveToCloud}
        {...actions}
      />

      {/* Character Status Modal (Triggered by Avatar click or HUD click) */}
      <CharacterStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        stats={stats}
        stageProgress={stageProgress}
        onAllocateStat={handleAllocateStat}
        onRestAtDojo={() => setStats(prev => applyDojoRest(prev))}
        onUsePotion={() => setStats(prev => applyPotion(prev))}
        onStartRecall={() => {
          setIsStatusModalOpen(false);
          setIsRecallActive(true);
        }}
        onUpdateName={handleUpdateName}
        onUpdateGender={(gender) => setStats(prev => ({ ...prev, characterGender: gender }))}
        onAscendTier={handleAscendTier}
      />

      {/* Bottom Fixed Navigation Bar */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        soundEnabled={stats.soundEnabled}
      />

      {/* Interactive Spotlight Onboarding Tour */}
      <SpotlightOnboarding
        isOpen={isOnboardingActive}
        onComplete={handleCompleteOnboarding}
        onOpenAuth={handleOpenAuthFromOnboarding}
        soundEnabled={stats.soundEnabled}
      />
    </div>
  );
}
