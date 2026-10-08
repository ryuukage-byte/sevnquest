import { useState, useEffect, useCallback } from 'react';
import type { TabType } from '../components/layout/BottomNavigation';
import type { WorldNavView } from '../components/map/WorldView';
import { useBackButton } from './useBackButton';
import { STORAGE_KEY_ONBOARDING } from '../state/storageKeys';

/**
 * Navigasi tab, overlay (recall), tombol back sistem, dan onboarding.
 * Dipisah dari App.tsx; perilaku tidak berubah.
 */
export function useAppNavigation() {
// Navigation & UI State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(() => new Set<TabType>(['home']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isRecallActive, setIsRecallActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [worldNavView, setWorldNavView] = useState<WorldNavView>('world_hub');
  const [worldResetCount, setWorldResetCount] = useState(0);
  const [deckResetCount, setDeckResetCount] = useState(0);
  const [deckInitialSubTab, setDeckInitialSubTab] = useState<'my_pocket' | 'official_books'>('my_pocket');
  const [tabHistory, setTabHistory] = useState<TabType[]>([]);

  // Hardware / System Back Button Handlers
  useBackButton(isRecallActive, () => {
    setIsRecallActive(false);
  }, 'smart_recall_overlay');

  useBackButton(isAuthModalOpen, () => {
    setIsAuthModalOpen(false);
  }, 'auth_modal');

  // Di tab World, dari dalam mode (dungeon/tower) tombol back kembali ke hub World
  useBackButton(
    activeTab === 'maps' && !isRecallActive && worldNavView !== 'world_hub',
    () => {
      setWorldNavView('world_hub');
      setWorldResetCount(c => c + 1);
    },
    'maps_world_navigation'
  );

  // Tab navigation history: when on any secondary tab, back returns to previous tab or home
  useBackButton(
    activeTab !== 'home' && !isRecallActive && !isStatusModalOpen && !isAuthModalOpen,
    () => {
      if (tabHistory.length > 0) {
        const prevTab = tabHistory[tabHistory.length - 1];
        setTabHistory(h => h.slice(0, -1));
        setActiveTab(prevTab);
      } else {
        setActiveTab('home');
      }
    },
    'tab_navigation'
  );

  const handleTabChange = useCallback((tab: TabType) => {
    // If re-tapping the current active tab (Pop to Root / Scroll to Top)
    if (tab === activeTab && !isRecallActive) {
      if (tab === 'maps') {
        setWorldNavView('world_hub');
        setWorldResetCount(c => c + 1);
      } else if (tab === 'deck') {
        setDeckResetCount(c => c + 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Record tab navigation history
    if (tab !== activeTab) {
      setTabHistory(prev => [...prev.filter(t => t !== tab), activeTab]);
    }

    // Dismiss any fullscreen overlays or active modals
    setIsRecallActive(false);
    setIsStatusModalOpen(false);

    // Reset tab to its initial "Halaman Awal" when entering
    if (tab === 'maps') {
      setWorldNavView('world_hub');
      setWorldResetCount(c => c + 1);
    } else if (tab === 'deck') {
      setDeckResetCount(c => c + 1);
    }

    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, isRecallActive]);

  // Pintasan langsung ke Menara (tidak lewat reset hub World di handleTabChange)
  const handleOpenTower = useCallback(() => {
    if (activeTab !== 'maps') setTabHistory(prev => [...prev.filter(t => t !== 'maps'), activeTab]);
    setIsRecallActive(false);
    setIsStatusModalOpen(false);
    setWorldNavView('tower');
    setActiveTab('maps');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleNavigateToOfficialBooks = useCallback(() => {
    setDeckInitialSubTab('official_books');
    handleTabChange('deck');
  }, [handleTabChange]);
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY_ONBOARDING);
    } catch {
      return false;
    }
  });

  const handleCompleteOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state', e);
    }
  }, []);

  const handleOpenAuthFromOnboarding = useCallback(() => {
    handleCompleteOnboarding();
    setIsAuthModalOpen(true);
  }, [handleCompleteOnboarding]);

  const handleReplayOnboarding = useCallback(() => {
    setIsRecallActive(false);
    setActiveTab('home');
    setIsOnboardingActive(true);
  }, []);

  return {
    activeTab, setActiveTab, visitedTabs,
    isStatusModalOpen, setIsStatusModalOpen,
    isRecallActive, setIsRecallActive,
    isAuthModalOpen, setIsAuthModalOpen,
    worldNavView, setWorldNavView, worldResetCount,
    deckResetCount, deckInitialSubTab, setDeckInitialSubTab,
    handleTabChange, handleOpenTower, handleNavigateToOfficialBooks,
    isOnboardingActive, handleCompleteOnboarding, handleOpenAuthFromOnboarding, handleReplayOnboarding,
  };
}
