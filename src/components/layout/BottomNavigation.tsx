import React from 'react';
import { CastleIcon, CompassIcon, ScrollIcon, BookIcon, BookmarkIcon, TrophyIcon, SettingsIcon } from '../ui/EngravingIcons';
import { playSound } from '../../utils/audio';

export type TabType = 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'shop' | 'settings';

interface BottomNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  soundEnabled?: boolean;
}

const BottomNavigationComponent: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  soundEnabled = true,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Castle', icon: CastleIcon },
    { id: 'maps', label: 'World', icon: CompassIcon },
    { id: 'daily', label: 'Misi', icon: ScrollIcon },
    { id: 'leaderboard', label: 'Rank', icon: TrophyIcon },
    { id: 'library', label: 'Library', icon: BookIcon },
    { id: 'deck', label: 'Buku Saku', icon: BookmarkIcon },
    { id: 'settings', label: 'Menu', icon: SettingsIcon },
  ];

  return (
    <nav
      aria-label="Navigasi Utama"
      style={{
        paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.25rem, env(safe-area-inset-right))',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
      className="fixed z-40 skeuo-navbar bottom-0 inset-x-0 md:inset-x-auto md:top-0 md:bottom-0 md:left-0 md:right-auto md:w-24 md:h-[100dvh] md:min-h-[100dvh] pt-1.5 pb-1 px-1 sm:px-2 md:py-8 overflow-x-auto md:overflow-y-auto select-none"
    >
      <div className="max-w-xl md:max-w-none mx-auto w-full md:h-full flex md:flex-col items-center justify-around md:justify-start md:gap-5 relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              type="button"
              key={item.id}
              data-tour={`nav-${item.id}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onChangeTab(item.id);
                playSound('click', soundEnabled);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-1 px-1.5 sm:px-3 rounded-2xl transition-[transform,color] duration-150 active:scale-95 ${
                isActive
                  ? 'text-indigo font-bold scale-105'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div
                className={`ui-icon-box p-1.5 sm:p-2 rounded-xl ${
                  isActive ? 'is-active text-indigo' : 'text-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-wider font-heading font-bold truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const BottomNavigation = React.memo(BottomNavigationComponent);
