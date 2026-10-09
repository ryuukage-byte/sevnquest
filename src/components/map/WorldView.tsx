import React, { useState, useEffect } from 'react';
import { Swords, Zap, Castle, Lock } from 'lucide-react';
import { TOWER_ENABLED } from '../../data/featureFlags';
import { UserDeck } from '../../types/rpg';
import { ItemMasteryRecord } from '../../types/content';
import { playSound } from '../../utils/audio';
import { DungeonType, DungeonPayload, generateDungeonSession } from '../../utils/dungeonGenerator';
import { TextStudyDungeonModal } from '../dungeon/TextStudyDungeonModal';
import { ImmersionDungeonModal } from '../dungeon/ImmersionDungeonModal';
import { GrammarFusionModal } from '../dungeon/fusion/GrammarFusionModal';
import { DungeonPortalHub } from '../dungeon/DungeonPortalHub';
import { DungeonSetupModal } from '../dungeon/DungeonSetupModal';
import { DungeonSessionRunner } from '../dungeon/DungeonSessionRunner';
import { ArcadeHubView } from '../arcade/ArcadeHubView';
import { Tower1View } from '../tower1';

export type WorldNavView = 'world_hub' | 'dungeon' | 'arcade' | 'tower';

interface WorldViewProps {
  resetSignal?: number;
  playerLevel?: number;
  playerTierIndex?: number;
  soundEnabled?: boolean;
  navView?: WorldNavView;
  onNavViewChange?: (view: WorldNavView) => void;
  userDecks?: UserDeck[];
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onNavigateTab?: (tab: 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'settings') => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  /** Hasil lantai Tower (masteryGain per itemId) -> mastery/SRS pemain. */
  onTowerMastery?: (masteryGain: Record<string, number>) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
  itemMastery?: Record<string, ItemMasteryRecord>;
}

export const WorldView: React.FC<WorldViewProps> = ({
  resetSignal,
  soundEnabled = true,
  onNavigateTab,
  userDecks,
  onUpdateDecks,
  onRewardPlayer,
  onTowerMastery,
  onCompleteStudyItem,
  playerLevel = 1,
  playerTierIndex = 0,
  itemMastery = {},
  navView,
  onNavViewChange,
}) => {
  // 3 Modes: arcade (default), dungeon, tower
  const [worldMode, setWorldMode] = useState<'arcade' | 'dungeon' | 'tower'>(() => {
    if (navView === 'dungeon') return 'dungeon';
    if (navView === 'tower' && TOWER_ENABLED) return 'tower';
    return 'arcade';
  });

  const [setupDungeonType, setSetupDungeonType] = useState<DungeonType | null>(null);
  const [textStudyOpen, setTextStudyOpen] = useState(false);
  const [immersionOpen, setImmersionOpen] = useState(false);
  const [fusionOpen, setFusionOpen] = useState(false);
  const [activeDungeonPayload, setActiveDungeonPayload] = useState<DungeonPayload | null>(null);

  useEffect(() => {
    if (navView === 'dungeon') {
      setWorldMode('dungeon');
    } else if (navView === 'tower') {
      setWorldMode(TOWER_ENABLED ? 'tower' : 'arcade');
    } else if (navView === 'arcade' || navView === 'world_hub') {
      setWorldMode('arcade');
    }
  }, [navView]);

  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setWorldMode('arcade');
      setSetupDungeonType(null);
      setTextStudyOpen(false);
      setImmersionOpen(false);
      setFusionOpen(false);
      setActiveDungeonPayload(null);
    }
  }, [resetSignal]);

  const handleSwitchMode = (mode: 'arcade' | 'dungeon' | 'tower') => {
    if (mode === 'tower' && !TOWER_ENABLED) return; // Tower ditutup (lihat data/featureFlags.ts)
    playSound('click', soundEnabled);
    setWorldMode(mode);
    if (onNavViewChange) {
      const targetNav: WorldNavView = mode === 'dungeon' ? 'dungeon' : mode === 'tower' ? 'tower' : 'world_hub';
      onNavViewChange(targetNav);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-12 animate-fade-in px-2 sm:px-0">
      {/* 1. HEADER UTAMA: WORLD */}
      <div className="panel panel-stitched p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl ${
            worldMode === 'arcade'
              ? 'bg-amber-500/15 text-amber-400 border-border-subtle'
              : worldMode === 'dungeon'
                ? 'bg-crimson/15 text-crimson border-border-subtle'
                : 'bg-wine-accent/15 text-wine-accent border-border-subtle'
          } border flex items-center justify-center shrink-0 shadow-sm`}>
            {worldMode === 'arcade' ? (
              <Zap className="w-6 h-6 fill-amber-400/20" />
            ) : worldMode === 'dungeon' ? (
              <Swords className="w-6 h-6" />
            ) : (
              <Castle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              {worldMode === 'arcade'
                ? 'World · Arena Game'
                : worldMode === 'dungeon'
                  ? 'World · Mode Dungeon'
                  : 'World · Menara Nihongo'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-body">
              {worldMode === 'arcade'
                ? 'Uji kecepatan menulis dan refleksmu di game arcade dengan tantangan rekor terbaik.'
                : worldMode === 'dungeon'
                  ? 'Latihan bebas tanpa beban: menulis aksara, flashcard kilat, susun pola kalimat, ubah bentuk kata, dan kuis cepat.'
                  : 'Daki Menara Nihongo lantai demi lantai: Menara 1 melatih cara MELIHAT bahasa Jepang, Menara 2 melatihmu MEMAKAINYA sampai Lantai 100.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. FOUR-MODE SWITCHER BAR */}
      <div className="panel p-1.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-1.5 sm:gap-2 shadow-inner overflow-x-auto scrollbar-none">
        
        {/* TAB 1: ARENA ARCADE */}
        <button
          type="button"
          onClick={() => handleSwitchMode('arcade')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'arcade'
              ? 'bg-surface-card text-amber-400 shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Zap className={`w-4 h-4 shrink-0 ${worldMode === 'arcade' ? 'text-amber-400 fill-amber-400/20' : ''}`} />
          <span>
            <span className="inline sm:hidden">Arcade</span>
            <span className="hidden sm:inline">Arena Arcade</span>
          </span>
        </button>

        {/* TAB 2: MODE DUNGEON */}
        <button
          type="button"
          onClick={() => handleSwitchMode('dungeon')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            worldMode === 'dungeon'
              ? 'bg-surface-card text-crimson shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Swords className={`w-4 h-4 shrink-0 ${worldMode === 'dungeon' ? 'text-crimson' : ''}`} />
          <span>
            <span className="inline sm:hidden">Dungeon</span>
            <span className="hidden sm:inline">Mode Dungeon</span>
          </span>
        </button>

        {/* TAB 4: MENARA 1.000 */}
        <button
          type="button"
          onClick={() => handleSwitchMode('tower')}
          disabled={!TOWER_ENABLED}
          aria-disabled={!TOWER_ENABLED}
          title={TOWER_ENABLED ? undefined : 'Menara sedang dalam pengembangan'}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold font-sans transition-all whitespace-nowrap ${
            !TOWER_ENABLED
              ? 'text-text-muted opacity-60 cursor-not-allowed'
              : worldMode === 'tower'
              ? 'bg-surface-card text-wine-accent shadow-sm border border-border-subtle'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {TOWER_ENABLED
            ? <Castle className={`w-4 h-4 shrink-0 ${worldMode === 'tower' ? 'text-wine-accent' : ''}`} />
            : <Lock className="w-4 h-4 shrink-0" />}
          <span>
            <span className="inline sm:hidden">Tower</span>
            <span className="hidden sm:inline">Menara Nihongo</span>
          </span>
          {!TOWER_ENABLED && (
            <span className="px-1.5 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-[9px] font-mono font-bold uppercase tracking-wider">Segera</span>
          )}
        </button>

      </div>

      {/* 3. CONTENT PER ACTIVE MODE */}
      {worldMode === 'arcade' && (
        /* MODE 1: ARENA ARCADE */
        <ArcadeHubView
          soundEnabled={soundEnabled}
          userDecks={userDecks}
          playerLevel={playerLevel}
          playerTierIndex={playerTierIndex}
          onOpenTower={() => handleSwitchMode('tower')}
          towerLocked={!TOWER_ENABLED}
          onRewardPlayer={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
        />
      )}

      {worldMode === 'dungeon' && (
        /* MODE 2: DUNGEON PORTAL HUB */
        <DungeonPortalHub
          onSelectDungeon={(type) => {
            if (type === 'text_study') {
              setTextStudyOpen(true);
            } else if (type === 'grammar_fusion') {
              setFusionOpen(true);
            } else if (type === 'immersion') {
              setImmersionOpen(true);
            } else if (type === 'blackboard') {
              try {
                playSound('attack', soundEnabled);
                const payload = generateDungeonSession(
                  {
                    type: 'blackboard',
                    levelCategory: 'all',
                    floorCount: 15,
                    mode: 'standard',
                  },
                  userDecks
                );
                setActiveDungeonPayload(payload);
              } catch (err) {
                console.error('Failed to start blackboard playground:', err);
              }
            } else {
              setSetupDungeonType(type);
            }
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {TOWER_ENABLED && worldMode === 'tower' && (
        /* MODE 3: MENARA NIHONGO (Menara 1 Tutorial + Menara 2 Rangkai, lantai 001–100) */
        <Tower1View soundEnabled={soundEnabled} onRewardPlayer={onRewardPlayer} />
      )}

      {/* MODAL 3: DUNGEON SETUP MODAL */}
      {setupDungeonType && (
        <DungeonSetupModal
          isOpen={true}
          dungeonType={setupDungeonType}
          userDecks={userDecks}
          onNavigateTab={onNavigateTab}
          onClose={() => setSetupDungeonType(null)}
          onStartDungeon={(cfg) => {
            try {
              const payload = generateDungeonSession(cfg, userDecks);
              setSetupDungeonType(null);
              setActiveDungeonPayload(payload);
            } catch (err) {
              console.error('Failed to start dungeon session:', err);
            }
          }}
          soundEnabled={soundEnabled}
        />
      )}

      {textStudyOpen && (
        <TextStudyDungeonModal
          soundEnabled={soundEnabled}
          onRewardPlayer={onRewardPlayer}
          onClose={() => setTextStudyOpen(false)}
        />
      )}

      {fusionOpen && (
        <GrammarFusionModal
          soundEnabled={soundEnabled}
          onRewardPlayer={onRewardPlayer}
          onClose={() => setFusionOpen(false)}
        />
      )}

      {immersionOpen && (
        <ImmersionDungeonModal
          soundEnabled={soundEnabled}
          onClose={() => setImmersionOpen(false)}
        />
      )}

      {/* MODAL 4: DUNGEON SESSION RUNNER */}
      {activeDungeonPayload && (
        <DungeonSessionRunner
          payload={activeDungeonPayload}
          onClose={() => setActiveDungeonPayload(null)}
          onRestart={(cfg) => {
            const payload = generateDungeonSession(cfg, userDecks);
            setActiveDungeonPayload(payload);
          }}
          onRewardPlayer={onRewardPlayer}
          onCompleteStudyItem={onCompleteStudyItem}
          soundEnabled={soundEnabled}
          userDecks={userDecks}
          onUpdateDecks={onUpdateDecks}
        />
      )}
    </div>
  );
};
