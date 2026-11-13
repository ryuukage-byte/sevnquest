/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Cloud, Download } from 'lucide-react';
import { PlayerStats, StageClearData, Mission } from './types/rpg';
import { StudyTimerBadge } from './components/layout/StudyTimerBadge';
import { PwaInstallModal } from './components/pwa/PwaInstallModal';
import { usePwaInstall } from './hooks/usePwaInstall';
import { HomeView } from './components/home/HomeView';
import { MissionsView } from './components/missions/MissionsView';
import { BottomNavigation, TabType } from './components/layout/BottomNavigation';
import { CharacterStatusModal } from './components/modals/CharacterStatusModal';
import { playSound } from './utils/audio';
import { applyDojoRest, applyPotion } from './utils/recovery';
import { recordStudyActivity } from './utils/activity';
import { AuthModal } from './components/auth/AuthModal';
import { ModuleBoundary } from './components/common/ModuleBoundary';
import { AnnouncementPopupHost } from './components/announcements/AnnouncementModal';
import { MainContent } from './app/MainContent';
import { loadInitialStats, loadStageProgress, loadDailyMissions, loadWeeklyMissions } from './state/loadPlayerState';
import { useToast } from './hooks/useToast';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useDailyRollover } from './hooks/useDailyRollover';
import { useTheme } from './hooks/useTheme';
import { usePersistence } from './hooks/usePersistence';
import { useCloudSync } from './hooks/useCloudSync';
import { usePlayerActions } from './hooks/usePlayerActions';
import { EntitlementProvider } from './state/entitlement';
import { ExpiryBanner } from './components/billing/ExpiryBanner';
import { AdminHeaderButton } from './components/billing/AdminHeaderButton';
import { DeviceGate } from './components/billing/DeviceGate';
import { BootSplash } from './components/common/BootSplash';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { DRAGON_ENABLED, TOWER_ENABLED } from './data/featureFlags';
import type { AppCommand } from './engine/dragon/intent';

// Naga Pemandu di-lazy-load: tidak menambah chunk awal.
const DragonMascot = lazyWithRetry(() => import('./components/dragon/DragonMascot').then(m => ({ default: m.DragonMascot })));

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
    isOnboardingActive, handleCompleteOnboarding, handleReplayOnboarding,
  } = nav;

  // Active Study Tracking (Recall SRS, Library, and Buku Saku)
  const isStudying = Boolean(nav.isRecallActive || activeTab === 'library' || activeTab === 'deck');

  // Tombol "Pasang App" (PWA) di header, di samping lencana waktu belajar.
  const pwa = usePwaInstall(stats.soundEnabled);

  // Pelacak waktu hidup di <StudyTimerBadge> (re-render per detik terisolasi dari App).
  const handleStudyTimeSave = useCallback((todaySec: number, totalSec: number, studyDate: string) => {
    setStats(prev => ({ ...prev, todayStudySeconds: todaySec, totalStudySeconds: totalSec, lastStudyDate: studyDate }));
  }, []);

  const { isAuthenticated, setIsAuthenticated, authChecked, cloudSyncStatus, lastSyncedAt, saveToCloud } = useCloudSync({
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

  // Perintah dari Naga Pemandu → navigasi yang sudah ada (tidak mengubah logika fitur).
  const handleDragonCommand = useCallback((cmd: AppCommand) => {
    switch (cmd.type) {
      case 'tab': handleTabChange(cmd.tab); break;
      case 'library': nav.handleOpenLibraryTab(cmd.tab); break;
      case 'recall': setIsStatusModalOpen(false); setIsRecallActive(true); break;
      case 'tower': if (TOWER_ENABLED) nav.handleOpenTower(); else handleTabChange('maps'); break;
      case 'status': setIsStatusModalOpen(true); break;
      case 'tour': handleReplayOnboarding(); break;
      case 'official_books': nav.handleNavigateToOfficialBooks(); break;
      case 'deck_ai': nav.handleOpenDeckAi(cmd.prefill); break;
      case 'install': pwa.handleInstallClick(); break;
    }
  }, [handleTabChange, nav, setIsStatusModalOpen, setIsRecallActive, handleReplayOnboarding, pwa]);
  const dragonHidden = nav.isRecallActive;
  // Di dalam hub Dungeon/Menara naga diredam (tombolnya hilang), tetapi tur yang sedang jalan tetap boleh masuk.
  const dragonQuiet = activeTab === 'maps' && nav.worldNavView !== 'world_hub';


  // Wajib login (PRD 6.4): tanpa sesi, hanya layar masuk/daftar yang tampil.
  // Progres lokal tamu tidak hilang: useCloudSync menggabungkannya ke akun saat login pertama.
  if (!authChecked) return <BootSplash />;
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-surface-base text-text-primary flex flex-col items-center justify-center gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center">
            <Swords className="w-5 h-5 text-gold" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-widest font-heading">SevnQuest</div>
            <div className="text-[10px] text-text-secondary font-mono tracking-wider">The Learning World</div>
          </div>
        </div>
        <AuthModal
          isOpen
          isMandatory
          onClose={() => {}}
          onSuccess={() => setIsAuthenticated(true)}
          soundEnabled={stats.soundEnabled}
        />
      </div>
    );
  }

  return (
    <DeviceGate userId={stats.userId}>
    <EntitlementProvider userId={stats.userId} isAuthenticated={isAuthenticated} soundEnabled={stats.soundEnabled}>
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
        <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full flex items-center justify-between relative z-10">
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
            <AdminHeaderButton />
            {/* Today's Study Time Tracker */}
            <StudyTimerBadge
              isStudying={isStudying}
              initialTodaySeconds={stats.todayStudySeconds || 0}
              initialTotalSeconds={stats.totalStudySeconds || 0}
              lastStudyDate={stats.lastStudyDate}
              onSave={handleStudyTimeSave}
            />
            {activeTab === 'home' && !pwa.isStandalone && (
              <button
                type="button"
                onClick={pwa.handleInstallClick}
                data-tour="pwa-install"
                title="Pasang SevnQuest sebagai aplikasi"
                aria-label="Pasang App"
                className="btn-physical-secondary py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none transition-all text-indigo cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pasang App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <ExpiryBanner />

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

      {/* Panduan pemasangan PWA (dipakai bila prompt native tidak tersedia) */}
      <PwaInstallModal
        isOpen={pwa.showInstallGuide}
        onClose={() => pwa.setShowInstallGuide(false)}
        deferredPrompt={pwa.deferredPrompt}
        onInstalled={pwa.markInstalled}
        soundEnabled={stats.soundEnabled}
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

      {/* Pengumuman broadcast admin (ditahan selama tur perkenalan Tatsu) */}
      <AnnouncementPopupHost suppressed={isOnboardingActive} soundEnabled={stats.soundEnabled} />

      {/* Naga Pemandu (maskot + navigator fitur) */}
      {DRAGON_ENABLED && (
        <ErrorBoundary fallback={<></>} label="Naga Pemandu">
          <Suspense fallback={null}>
            <DragonMascot hidden={dragonHidden} quiet={dragonQuiet} soundEnabled={stats.soundEnabled} activeTab={activeTab} onCommand={handleDragonCommand} autoTour={isOnboardingActive} onAutoTourDone={handleCompleteOnboarding} />
          </Suspense>
        </ErrorBoundary>
      )}

    </div>
    </EntitlementProvider>
    </DeviceGate>
  );
}
