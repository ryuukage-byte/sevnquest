// ==============================================================================
// NIHONGO TOWER — REACT RUNTIME LAYER HOOK (STAGE 4A)
// ==============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TowerFloorBlueprint,
  TowerState,
  RoundResult,
  RoundInput,
  RoundPhase,
  FloorCompletionReport,
  TowerPlayerProfile,
  BossGateResult,
  TowerEvent
} from '../types/tower';
import { RoundOrchestrator, SubmitAnswerOutcome } from '../engine/tower/round/roundOrchestrator';
import { CheckpointManager } from '../engine/tower/combat/checkpoint';
import { playSound } from '../utils/audio';

export interface UseTowerRuntimeOptions {
  autoStart?: boolean;
  initialFloor?: number;
  playerProfile?: TowerPlayerProfile;
  seed?: string;
  soundEnabled?: boolean;
}

/**
 * High-performance React hook bridging the Tower Engine and UI layers
 */
export function useTowerRuntime(options: UseTowerRuntimeOptions = {}) {
  const {
    autoStart = false,
    initialFloor = 1,
    playerProfile,
    seed,
    soundEnabled = true
  } = options;

  const orchestratorRef = useRef<RoundOrchestrator>(new RoundOrchestrator());
  const orchestrator = orchestratorRef.current;

  // React state synchronized with engine
  const [blueprint, setBlueprint] = useState<TowerFloorBlueprint | null>(null);
  const [state, setState] = useState<TowerState>(TowerState.IDLE);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [currentRoundInput, setCurrentRoundInput] = useState<RoundInput | null>(null);
  const [hp, setHp] = useState<number>(3);
  const [maxHp, setMaxHp] = useState<number>(3);
  const [floorReport, setFloorReport] = useState<FloorCompletionReport | null>(null);
  const [gateResult, setGateResult] = useState<BossGateResult | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [hasSavedCheckpoint, setHasSavedCheckpoint] = useState<boolean>(false);

  // Sync engine state to React
  const syncState = useCallback(() => {
    setState(orchestrator.getState());
    setHp(orchestrator.getHp());
    setMaxHp(orchestrator.getMaxHp());
    setCurrentRoundIndex(orchestrator.getCurrentRoundIndex());
    setCurrentRoundInput(orchestrator.getCurrentRoundInput());
    setBlueprint(orchestrator.getBlueprint());
    setRoundResults(orchestrator.getRoundResults());
    setGateResult(orchestrator.getLastGateResult());
    setHasSavedCheckpoint(CheckpointManager.hasResumeableSession());
  }, [orchestrator]);

  // Event listener subscription with audio integration
  useEffect(() => {
    setHasSavedCheckpoint(CheckpointManager.hasResumeableSession());

    const unsubscribe = orchestrator.subscribe(({ type, payload }) => {
      syncState();

      if (soundEnabled) {
        switch (type) {
          case TowerEvent.HP_LOST:
            playSound('wrong', true);
            break;
          case TowerEvent.ROUND_CLEAR:
            playSound('correct', true);
            break;
          case TowerEvent.PERFECT_ROUND:
            playSound('levelup', true);
            break;
          case TowerEvent.FLOOR_CLEAR:
          case TowerEvent.BOSS_DEFEATED:
            playSound('victory', true);
            break;
          case TowerEvent.FLOOR_FAILED:
            playSound('wrong', true);
            break;
        }
      }

      if (type === TowerEvent.FLOOR_CLEAR || type === TowerEvent.FLOOR_FAILED) {
        setFloorReport(payload as FloorCompletionReport);
      }
    });

    if (autoStart) {
      const { blueprint: bp, gateResult: gr } = orchestrator.startFloor(
        initialFloor,
        playerProfile,
        seed
      );
      setBlueprint(bp);
      setGateResult(gr);
      syncState();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const startFloor = useCallback(
    (floorNum?: number, customSeed?: string) => {
      setFloorReport(null);
      const targetFloor = floorNum ?? initialFloor;
      const { blueprint: bp, gateResult: gr } = orchestrator.startFloor(
        targetFloor,
        playerProfile,
        customSeed ?? seed
      );
      setBlueprint(bp);
      setGateResult(gr);
      syncState();
      return bp;
    },
    [orchestrator, initialFloor, playerProfile, seed, syncState]
  );

  const submitAnswer = useCallback(
    (result: RoundResult): SubmitAnswerOutcome => {
      const outcome = orchestrator.submitAnswer(result);
      if (outcome.nextRoundAvailable) {
        orchestrator.startNextRound();
      }
      syncState();
      if (outcome.floorReport) {
        setFloorReport(outcome.floorReport);
      }
      return outcome;
    },
    [orchestrator, syncState]
  );

  const startNextRound = useCallback(() => {
    const nextInput = orchestrator.startNextRound();
    syncState();
    return nextInput;
  }, [orchestrator, syncState]);

  const retryFloor = useCallback(() => {
    if (blueprint) {
      startFloor(blueprint.floor, seed);
    } else {
      startFloor(initialFloor, seed);
    }
  }, [blueprint, initialFloor, seed, startFloor]);

  const pause = useCallback(() => {
    const res = orchestrator.pauseFloor();
    syncState();
    return res;
  }, [orchestrator, syncState]);

  const resume = useCallback(() => {
    const res = orchestrator.resumeFloor();
    syncState();
    return res;
  }, [orchestrator, syncState]);

  const resumeSavedCheckpoint = useCallback(() => {
    const success = orchestrator.restoreCheckpoint();
    if (success) {
      syncState();
    }
    return success;
  }, [orchestrator, syncState]);

  const totalRounds = blueprint?.rounds.length || 0;
  const currentPhase: RoundPhase | null =
    blueprint && blueprint.rounds[currentRoundIndex]
      ? blueprint.rounds[currentRoundIndex]
      : null;

  const currentScore =
    roundResults.length > 0
      ? Math.round(
          roundResults.reduce((acc, r) => acc + r.score, 0) / roundResults.length
        )
      : 0;

  const progressPercentage =
    totalRounds > 0 ? Math.round((currentRoundIndex / totalRounds) * 100) : 0;

  return {
    orchestrator,
    currentFloor: blueprint?.floor || initialFloor,
    currentRound: currentRoundIndex + 1,
    totalRounds,
    currentPhase,
    currentRoundInput,
    hp,
    maxHp,
    state,
    score: currentScore,
    progress: progressPercentage,
    blueprint,
    floorReport,
    isGateLocked: gateResult ? !gateResult.canEnter : false,
    gateInfo: gateResult,
    roundResults,
    isPaused: state === TowerState.FLOOR_PAUSED,
    hasSavedCheckpoint,
    startFloor,
    submitAnswer,
    startNextRound,
    retryFloor,
    pause,
    resume,
    resumeSavedCheckpoint
  };
}
