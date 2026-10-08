import React, { useState, useMemo, useEffect } from 'react';
import { useTowerRuntime } from '../../hooks/useTowerRuntime';
import { TowerHUD } from './TowerHUD';
import { RoundRenderer } from './RoundRenderer';
import { BossGateModal } from './BossGateModal';
import { FloorResultModal } from './FloorResultModal';
import { FloorNarrativeModal } from './FloorNarrativeModal';
import { TowerPlayerProfile, FloorCompletionReport } from '../../types/tower';
import { generateFloorNarrative } from '../../engine/tower/world/floorNarrative';
import { recordFloorClear } from '../../engine/tower/world/towerProgress';
import { Play, RotateCcw, LogOut } from 'lucide-react';

interface TowerSessionRunnerProps {
  initialFloor?: number;
  playerProfile?: TowerPlayerProfile;
  seed?: string;
  soundEnabled?: boolean;
  onExit?: () => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onFloorCleared?: (floor: number, report: FloorCompletionReport) => void;
  className?: string;
}

export const TowerSessionRunner: React.FC<TowerSessionRunnerProps> = ({
  initialFloor = 1,
  playerProfile,
  seed,
  soundEnabled = true,
  onExit,
  onRewardPlayer,
  onFloorCleared,
  className = ''
}) => {
  const tower = useTowerRuntime({
    autoStart: true,
    initialFloor,
    playerProfile,
    seed,
    soundEnabled
  });

  const [isGateModalOpen, setIsGateModalOpen] = useState(true);
  const [isNarrativeOpen, setIsNarrativeOpen] = useState(true);
  const [hasRecordedCurrentReport, setHasRecordedCurrentReport] = useState(false);

  // Generate lore narrative for the current floor
  const narrative = useMemo(() => {
    if (!tower.blueprint) return null;
    return generateFloorNarrative(tower.currentFloor, tower.blueprint);
  }, [tower.currentFloor, tower.blueprint]);

  // Persist progression and trigger rewards on floor clear
  useEffect(() => {
    if (tower.floorReport && tower.floorReport.status === 'CLEAR' && !hasRecordedCurrentReport) {
      setHasRecordedCurrentReport(true);
      const mistakesCount = tower.floorReport.isFlawless ? 0 : Math.max(0, tower.floorReport.totalRounds - tower.floorReport.roundsCompleted);
      recordFloorClear(tower.currentFloor, tower.floorReport.accuracy, mistakesCount);
      if (onFloorCleared) {
        onFloorCleared(tower.currentFloor, tower.floorReport);
      }
      if (onRewardPlayer) {
        onRewardPlayer(tower.floorReport.totalExp, tower.floorReport.totalGold);
      }
    } else if (!tower.floorReport) {
      setHasRecordedCurrentReport(false);
    }
  }, [tower.floorReport, tower.currentFloor, hasRecordedCurrentReport, onFloorCleared, onRewardPlayer]);

  return (
    <div className={`flex flex-col min-h-screen bg-surface-base text-text-primary ${className}`}>
      {/* Top HUD */}
      <TowerHUD
        floor={tower.currentFloor}
        theme={tower.blueprint?.theme}
        arc={tower.blueprint?.arc}
        hp={tower.hp}
        maxHp={tower.maxHp}
        round={tower.currentRound}
        totalRounds={tower.totalRounds}
        phases={tower.blueprint?.rounds}
        score={tower.score}
        isPaused={tower.isPaused}
        onPauseToggle={() => {
          if (tower.isPaused) {
            tower.resume();
          } else {
            tower.pause();
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 max-w-4xl w-full mx-auto relative">
        {/* Pause Overlay */}
        {tower.isPaused && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-surface-base/80 p-6 text-center">
            <h3 className="text-2xl font-black text-text-primary font-heading mb-2">Tantangan Dijeda</h3>
            <p className="text-xs text-text-secondary max-w-xs mb-6">
              Progres ronde saat ini telah tersimpan secara otomatis. Kamu dapat melanjutkan kapan saja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={tower.resume}
                className="btn-physical-primary py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Lanjutkan</span>
              </button>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="btn-physical-secondary py-3 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Polymorphic Round Renderer */}
        <RoundRenderer
          phase={tower.currentPhase}
          input={tower.currentRoundInput}
          onSubmitAnswer={tower.submitAnswer}
          soundEnabled={soundEnabled}
        />
      </main>

      {/* Boss Gate Lock Modal */}
      {tower.isGateLocked && (
        <BossGateModal
          gateResult={tower.gateInfo}
          isOpen={isGateModalOpen}
          onClose={() => {
            setIsGateModalOpen(false);
            if (onExit) onExit();
          }}
          onJumpToTrainingFloor={floor => {
            setIsGateModalOpen(false);
            tower.startFloor(floor);
          }}
        />
      )}

      {/* Floor Completion Report Modal */}
      <FloorResultModal
        report={tower.floorReport}
        isOpen={!!tower.floorReport}
        onNextFloor={() => {
          setIsNarrativeOpen(true);
          tower.startFloor(tower.currentFloor + 1);
        }}
        onRetry={() => {
          setIsNarrativeOpen(true);
          tower.retryFloor();
        }}
        onClose={() => {
          if (onExit) onExit();
        }}
      />

      {/* Floor Narrative Lore & Objective Modal */}
      <FloorNarrativeModal
        narrative={narrative}
        isOpen={isNarrativeOpen && !tower.isGateLocked && !tower.floorReport}
        onStartFloor={() => setIsNarrativeOpen(false)}
        onClose={onExit}
      />
    </div>
  );
};
