/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy } from 'react';
import type { PlayerStats, StageClearData, Mission } from '../types/rpg';
import type { TabType } from '../components/layout/BottomNavigation';
import { HomeView } from '../components/home/HomeView';
import { MissionsView } from '../components/missions/MissionsView';
import { AuthModal } from '../components/auth/AuthModal';
import { ModuleBoundary } from '../components/common/ModuleBoundary';
import { FreezeWhenHidden } from '../components/common/FreezeWhenHidden';
import { recordStudyActivity } from '../utils/activity';
import type { useAppNavigation } from '../hooks/useAppNavigation';
import type { usePlayerActions } from '../hooks/usePlayerActions';
import type { CloudSyncStatus } from '../hooks/useCloudSync';
import type { Dispatch, SetStateAction } from 'react';

// Modul berat di-lazy-load: tidak ikut chunk awal (kode + dataset tryout, hanzi-writer, dst.).
// Semuanya berada di dalam <ModuleBoundary> yang menyediakan Suspense + ErrorBoundary per modul.
const WorldView = lazy(() => import('../components/map/WorldView').then(m => ({ default: m.WorldView })));
const SettingsView = lazy(() => import('../components/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const RecallModule = lazy(() => import('../components/learning/RecallModule').then(m => ({ default: m.RecallModule })));
const LibraryView = lazy(() => import('../components/library/LibraryView').then(m => ({ default: m.LibraryView })));
const BukuSakuView = lazy(() => import('../components/deck/BukuSakuView').then(m => ({ default: m.BukuSakuView })));
const LeaderboardView = lazy(() => import('../components/leaderboard/LeaderboardView').then(m => ({ default: m.LeaderboardView })));

type Nav = ReturnType<typeof useAppNavigation>;
type Actions = ReturnType<typeof usePlayerActions>;

export interface MainContentProps extends Nav, Actions {
  stats: PlayerStats;
  stageProgress: Record<string, StageClearData>;
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  setStats: Dispatch<SetStateAction<PlayerStats>>;
  isAuthenticated: boolean;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  saveToCloud: (payload: import('../lib/supabase').CloudSavePayload) => Promise<boolean>;
}

/** Konten utama: overlay (recall) + tab keep-alive. Dipindah apa adanya dari App.tsx. */
export function MainContent(props: MainContentProps) {
  const {
    stats, setStats, stageProgress, dailyMissions, weeklyMissions,
    activeTab, visitedTabs,
    setIsStatusModalOpen, isRecallActive, setIsRecallActive,
    isAuthModalOpen, setIsAuthModalOpen,
    worldNavView, setWorldNavView, worldResetCount, deckResetCount, deckInitialSubTab, setDeckInitialSubTab,
    handleTabChange, handleOpenTower,
    handleRewardPlayer, handleStudyComplete, handleRecordItemInteraction, handleTowerMastery,
    handleStartRemediationRecall, handleItemReviewed, handleCompleteRecallSession, handleUseMp,
    handleClaimMission, handleGameOver, handleHpDamage, handleResetData,
    handleUpdateName, handleUpdateSignature, handleToggleBookmark, handleUpdateDecks, handleReplayOnboarding,
    isAuthenticated, setIsAuthenticated, cloudSyncStatus, lastSyncedAt, saveToCloud,
  } = props;

  return (
    <>
        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl lg:max-w-6xl w-full mx-auto px-3.5 sm:px-4 py-4 sm:py-5">
          {isRecallActive && (
            <ModuleBoundary label="Recall SRS" onReset={() => setIsRecallActive(false)}>
            <RecallModule
              recallQueue={stats.recallQueue || []}
              playerMp={stats.mp}
              playerInt={stats.int}
              onUseMp={handleUseMp}
              onItemReviewed={handleItemReviewed}
              onCompleteRecallSession={handleCompleteRecallSession}
              onExit={() => setIsRecallActive(false)}
              soundEnabled={stats.soundEnabled}
              furiganaEnabled={stats.furiganaEnabled ?? true}
              syncStatus={cloudSyncStatus}
              hasProgress={Object.keys(stats.itemMastery || {}).length > 0}
            />
            </ModuleBoundary>
          )}

          {/* Standard Tab Views (Keep-Alive Container for 0ms Instant Tab Switching) */}
          <div className={isRecallActive ? 'hidden' : 'block'}>
            <div className="tab-views-container relative w-full">
              {/* Home Tab */}
              <div
                className={activeTab === 'home' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'home'}
              >
                <FreezeWhenHidden active={activeTab === 'home'}>
                {visitedTabs.has('home') && (
                  <ModuleBoundary label="Beranda">
                  <HomeView
                    stats={stats}
                    dailyMissions={dailyMissions}
                    onOpenStatusModal={() => setIsStatusModalOpen(true)}
                    onNavigateTab={(tab) => handleTabChange(tab as TabType)}
                    onStartRecall={() => setIsRecallActive(true)}
                    onOpenTower={handleOpenTower}
                  />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>

              {/* World Tab (Arcade, Dungeon, Tower) */}
              <div
                className={activeTab === 'maps' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'maps'}
              >
                <FreezeWhenHidden active={activeTab === 'maps'}>
                {visitedTabs.has('maps') && (
                  <ModuleBoundary label="World">
                    <WorldView
                      resetSignal={worldResetCount}
                      navView={worldNavView}
                      onNavViewChange={setWorldNavView}
                      playerLevel={stats.level}
                      playerTierIndex={stats.tierIndex}
                      soundEnabled={stats.soundEnabled}
                      userDecks={stats.userDecks}
                      onUpdateDecks={handleUpdateDecks}
                      onNavigateTab={(tab) => handleTabChange(tab as TabType)}
                      onRewardPlayer={handleRewardPlayer}
                      onCompleteStudyItem={handleStudyComplete}
                      onTowerMastery={handleTowerMastery}
                      itemMastery={stats.itemMastery || {}}
                    />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>

              {/* Missions Tab (Daily & Weekly) */}
              <div
                className={(activeTab === 'daily' || activeTab === 'weekly') ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'daily' && activeTab !== 'weekly'}
              >
                <FreezeWhenHidden active={activeTab === 'daily' || activeTab === 'weekly'}>
                {(visitedTabs.has('daily') || visitedTabs.has('weekly')) && (
                  <ModuleBoundary label="Misi">
                  <MissionsView
                    dailyMissions={dailyMissions}
                    weeklyMissions={weeklyMissions}
                    onClaimReward={handleClaimMission}
                    soundEnabled={stats.soundEnabled}
                  />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>

              {/* Leaderboard Tab */}
              <div
                className={activeTab === 'leaderboard' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'leaderboard'}
              >
                <FreezeWhenHidden active={activeTab === 'leaderboard'}>
                {visitedTabs.has('leaderboard') && (
                  <ModuleBoundary label="Papan Peringkat">
                  <LeaderboardView
                    currentUserId={stats.userId!}
                    currentUserStats={stats}
                    soundEnabled={stats.soundEnabled}
                    onOpenStatusModal={() => setIsStatusModalOpen(true)}
                    onUpdateSignature={handleUpdateSignature}
                    isActive={activeTab === 'leaderboard'}
                  />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>

              {/* Library Tab */}
              <div
                className={activeTab === 'library' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'library'}
              >
                <FreezeWhenHidden active={activeTab === 'library'}>
                {visitedTabs.has('library') && (
                  <ModuleBoundary label="Perpustakaan">
                  <LibraryView
                    soundEnabled={stats.soundEnabled}
                    itemMastery={stats.itemMastery}
                    onRewardPlayer={handleRewardPlayer}
                    onRecordStudy={(cat, id, count) => setStats(prev => recordStudyActivity(prev, cat, id, count))}
                    onRecordInteraction={handleRecordItemInteraction}
                    onCompleteStudyItem={handleStudyComplete}
                    userDecks={stats.userDecks}
                    onToggleBookmark={handleToggleBookmark}
                    onUpdateDecks={handleUpdateDecks}
                  />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>

              {/* Deck / Buku Saku Tab */}
              <div
                className={activeTab === 'deck' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'deck'}
              >
                <FreezeWhenHidden active={activeTab === 'deck'}>
                {visitedTabs.has('deck') && (
                  <ModuleBoundary label="Buku Saku">
                  <BukuSakuView
                    userDecks={stats.userDecks}
                    resetSignal={deckResetCount}
                    initialSubTab={deckInitialSubTab}
                    onSubTabChange={(subTab) => setDeckInitialSubTab(subTab)}
                    onUpdateDecks={handleUpdateDecks}
                    onRewardPlayer={handleRewardPlayer}
                    onCompleteStudyItem={handleStudyComplete}
                    soundEnabled={stats.soundEnabled}
                    playerMp={stats.mp}
                    playerMaxMp={stats.maxMp}
                    playerInt={stats.int}
                    playerStr={stats.str}
                    playerHp={stats.hp}
                    playerMaxHp={stats.maxHp}
                    onUseMp={handleUseMp}
                    onHpDamage={handleHpDamage}
                    onGameOver={handleGameOver}
                    onStartRemediationRecall={handleStartRemediationRecall}
                    itemMastery={stats.itemMastery || {}}
                    furiganaEnabled={stats.furiganaEnabled ?? true}
                  />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>

              {/* Settings Tab */}
              <div
                className={activeTab === 'settings' ? 'block animate-tab-enter' : 'hidden'}
                aria-hidden={activeTab !== 'settings'}
              >
                <FreezeWhenHidden active={activeTab === 'settings'}>
                {visitedTabs.has('settings') && (
                  <ModuleBoundary label="Pengaturan">
                  <SettingsView
                    stats={stats}
                    onUpdateSettings={(newSettings) => setStats(prev => ({ ...prev, ...newSettings }))}
                    onResetData={handleResetData}
                    isAuthenticated={isAuthenticated}
                    onOpenAuth={() => setIsAuthModalOpen(true)}
                    onSaveBeforeLogout={async () => {
                      if (isAuthenticated && stats.userId) {
                        await saveToCloud({
                          stats,
                          stageProgress,
                          dailyMissions,
                          weeklyMissions,
                          updatedAt: new Date().toISOString()
                        });
                      }
                    }}
                    syncStatus={cloudSyncStatus}
                    lastSyncedAt={lastSyncedAt}
                    onUpdateName={handleUpdateName}
                    onReplayTutorial={handleReplayOnboarding}
                  />
                  </ModuleBoundary>
                )}
                </FreezeWhenHidden>
              </div>
            </div>
          </div>
          
          <AuthModal
            isOpen={isAuthModalOpen}
            isMandatory={false}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={() => {
              setIsAuthModalOpen(false);
              setIsAuthenticated(true);
            }}
            soundEnabled={stats.soundEnabled}
          />
        </main>
    </>
  );
}
