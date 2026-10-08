// ==============================================================================
// NIHONGO TOWER — ROUND ORCHESTRATOR ENGINE (STAGE 3 & 4)
// ==============================================================================

import {
  TowerFloorBlueprint,
  TowerState,
  RoundResult,
  RoundInput,
  FloorCompletionReport,
  TowerPlayerProfile,
  TowerCheckpointState,
  TowerEvent,
  BossGateResult
} from '../../../types/tower';
import { generateFloorBlueprint } from '../floorGenerator';
import { RoundStateMachine, StateChangeListener } from './roundState';
import { RoundResolver } from './roundResolver';
import { TowerHpSystem, DamageReport } from '../combat/hpSystem';
import { RewardEngine } from '../combat/rewardEngine';
import { CheckpointManager } from '../combat/checkpoint';
import { checkBossGate } from '../combat/bossGate';

export interface SubmitAnswerOutcome {
  state: TowerState;
  hpRemaining: number;
  maxHp: number;
  damageReport: DamageReport;
  roundIndex: number;
  nextRoundAvailable: boolean;
  floorReport?: FloorCompletionReport;
}

export type FloorEventListener = (event: {
  type: TowerEvent;
  payload: any;
}) => void;

/**
 * Central Orchestrator managing Tower Floor progression, Round state machine,
 * HP system, Boss Gate enforcement, and rich game event dispatching.
 */
export class RoundOrchestrator {
  private blueprint: TowerFloorBlueprint | null = null;
  private playerProfile: TowerPlayerProfile | null = null;
  private stateMachine: RoundStateMachine;
  private hpSystem: TowerHpSystem;
  private currentRoundIndex: number = 0;
  private roundResults: RoundResult[] = [];
  private currentRoundInput: RoundInput | null = null;
  private startedAt: number = 0;
  private lastGateResult: BossGateResult | null = null;
  private listeners: Set<FloorEventListener> = new Set();

  constructor() {
    this.stateMachine = new RoundStateMachine(TowerState.IDLE);
    this.hpSystem = new TowerHpSystem(3, 3);
  }

  // ----------------------------------------------------------------------------
  // GATE VERIFICATION & FLOOR LIFECYCLE
  // ----------------------------------------------------------------------------

  /**
   * Pre-flight gate check for boss trials
   */
  public verifyBossGate(floor: number, playerProfile?: TowerPlayerProfile): BossGateResult {
    const result = checkBossGate(floor, playerProfile);
    this.lastGateResult = result;
    return result;
  }

  /**
   * Initializes and starts a new floor run
   * 
   * @param target Either a floor number or pre-generated TowerFloorBlueprint
   * @param playerProfile Optional player progression profile
   * @param seed Optional string seed for 100% deterministic blueprint generation
   */
  public startFloor(
    target: number | TowerFloorBlueprint,
    playerProfile?: TowerPlayerProfile,
    seed?: string
  ): { blueprint: TowerFloorBlueprint; gateResult: BossGateResult } {
    this.playerProfile = playerProfile || null;
    this.roundResults = [];
    this.currentRoundIndex = 0;
    this.startedAt = Date.now();

    // 1. Resolve blueprint
    if (typeof target === 'number') {
      this.blueprint = generateFloorBlueprint(target, playerProfile, seed);
    } else {
      this.blueprint = target;
    }

    // 2. Boss Gate Enforcement
    const gateResult = this.verifyBossGate(this.blueprint.floor, playerProfile);
    if (!gateResult.canEnter) {
      this.stateMachine.reset(TowerState.IDLE);
      this.dispatch(TowerEvent.GATE_LOCKED, gateResult);
      return { blueprint: this.blueprint, gateResult };
    }

    // 3. Initialize HP System (Checkpoint floors restore full HP)
    const initialLives = playerProfile?.lives || 3;
    this.hpSystem.reset(initialLives, 3);
    if (this.blueprint.isCheckpoint) {
      this.hpSystem.handleCheckpointRestoration();
    }

    // 4. State Machine: IDLE -> FLOOR_ACTIVE
    this.stateMachine.reset(TowerState.IDLE);
    this.stateMachine.transition(TowerState.FLOOR_ACTIVE);
    this.dispatch(TowerEvent.FLOOR_START, {
      floor: this.blueprint.floor,
      blueprint: this.blueprint
    });

    // 5. Prime the first round
    this.startRound(0);

    return { blueprint: this.blueprint, gateResult };
  }

  /**
   * Starts a specific round by index
   */
  public startRound(roundIndex: number): RoundInput {
    if (!this.blueprint) {
      throw new Error('[RoundOrchestrator] Cannot start round: No active floor blueprint.');
    }

    this.currentRoundIndex = roundIndex;
    this.stateMachine.transition(TowerState.ROUND_STARTED);

    // Resolve contract input via RoundResolver
    this.currentRoundInput = RoundResolver.resolveRound(this.blueprint, roundIndex);

    // State becomes interactive
    this.stateMachine.transition(TowerState.ROUND_ACTIVE);

    this.dispatch(TowerEvent.ROUND_STARTED, {
      roundIndex,
      phase: this.currentRoundInput.phase,
      input: this.currentRoundInput
    });

    return this.currentRoundInput;
  }

  /**
   * Advances to the next round if available
   */
  public startNextRound(): RoundInput | null {
    if (!this.blueprint) return null;

    if (this.currentRoundIndex + 1 < this.blueprint.rounds.length) {
      return this.startRound(this.currentRoundIndex + 1);
    }

    return null;
  }

  /**
   * Submits a standardized RoundResult contract from any adapter (Canvas, Quiz, etc.)
   */
  public submitAnswer(result: RoundResult): SubmitAnswerOutcome {
    if (!this.blueprint) {
      throw new Error('[RoundOrchestrator] Cannot submit answer: No active floor blueprint.');
    }

    // 1. Transition into resolving state
    this.stateMachine.transition(TowerState.ROUND_RESOLVING);

    // 2. Record round result
    this.roundResults.push(result);

    // 3. Process combat damage through HP system
    const damageReport = this.hpSystem.takeDamage(result.hpDamage);
    if (damageReport.shieldAbsorbed) {
      this.dispatch(TowerEvent.SHIELD_ABSORBED, damageReport);
    } else if (damageReport.damageDealt > 0) {
      this.dispatch(TowerEvent.HP_LOST, damageReport);
    }

    // 4. Notify round completion status
    if (result.correct) {
      this.dispatch(TowerEvent.ROUND_CLEAR, { result, damageReport });
      if (result.score === 100) {
        this.dispatch(TowerEvent.PERFECT_ROUND, { result });
      }
    } else {
      this.dispatch(TowerEvent.ROUND_FAILED, { result, damageReport });
    }

    // 5. Evaluate survival and progression
    if (damageReport.isDead) {
      this.stateMachine.transition(TowerState.ROUND_FAILED);
      this.stateMachine.transition(TowerState.FLOOR_FAILED);

      const floorReport = this.completeFloor();
      CheckpointManager.clear();
      this.dispatch(TowerEvent.FLOOR_FAILED, floorReport);

      return {
        state: TowerState.FLOOR_FAILED,
        hpRemaining: 0,
        maxHp: this.hpSystem.getMaxHp(),
        damageReport,
        roundIndex: this.currentRoundIndex,
        nextRoundAvailable: false,
        floorReport
      };
    }

    // Round was survived
    if (result.correct) {
      this.stateMachine.transition(TowerState.ROUND_RESULT);
      this.stateMachine.transition(TowerState.ROUND_COMPLETED);
    } else {
      this.stateMachine.transition(TowerState.ROUND_RESULT);
      this.stateMachine.transition(TowerState.ROUND_FAILED);
    }

    // 6. Check if more rounds remain
    const hasMoreRounds = this.currentRoundIndex + 1 < this.blueprint.rounds.length;

    if (hasMoreRounds) {
      // Auto-save checkpoint for resume/crash recovery
      this.saveCheckpoint();

      return {
        state: this.stateMachine.getState(),
        hpRemaining: this.hpSystem.getHp(),
        maxHp: this.hpSystem.getMaxHp(),
        damageReport,
        roundIndex: this.currentRoundIndex,
        nextRoundAvailable: true
      };
    }

    // All rounds finished successfully!
    this.stateMachine.transition(TowerState.FLOOR_CLEAR);
    const floorReport = this.completeFloor();
    CheckpointManager.clear();

    this.dispatch(TowerEvent.FLOOR_CLEAR, floorReport);
    if (this.blueprint.isBossFloor) {
      this.dispatch(TowerEvent.BOSS_DEFEATED, {
        floor: this.blueprint.floor,
        report: floorReport
      });
    }
    if (floorReport.baseReward.titleReward) {
      this.dispatch(TowerEvent.TITLE_UNLOCKED, {
        title: floorReport.baseReward.titleReward
      });
    }

    return {
      state: TowerState.FLOOR_CLEAR,
      hpRemaining: this.hpSystem.getHp(),
      maxHp: this.hpSystem.getMaxHp(),
      damageReport,
      roundIndex: this.currentRoundIndex,
      nextRoundAvailable: false,
      floorReport
    };
  }

  /**
   * Finalizes the floor and runs decoupled RewardEngine calculation
   */
  public completeFloor(): FloorCompletionReport {
    if (!this.blueprint) {
      throw new Error('[RoundOrchestrator] Cannot complete floor: No active floor blueprint.');
    }

    const report = RewardEngine.calculateFloorReward({
      blueprint: this.blueprint,
      roundResults: this.roundResults,
      hpRemaining: this.hpSystem.getHp(),
      maxHp: this.hpSystem.getMaxHp(),
      activeStreak: this.playerProfile?.activeStreak || 0
    });

    return report;
  }

  // ----------------------------------------------------------------------------
  // PAUSE, RESUME, AND CHECKPOINT INTEGRATION
  // ----------------------------------------------------------------------------

  public pauseFloor(): boolean {
    const paused = this.stateMachine.pause();
    if (paused) {
      this.saveCheckpoint();
    }
    return paused;
  }

  public resumeFloor(): boolean {
    return this.stateMachine.resume();
  }

  public saveCheckpoint(): boolean {
    if (!this.blueprint) return false;

    const snapshot: TowerCheckpointState = {
      version: 1,
      floor: this.blueprint.floor,
      seed: this.blueprint.seed || `NQ_${this.blueprint.floor}`,
      blueprint: this.blueprint,
      state: this.stateMachine.getState(),
      currentRoundIndex: this.currentRoundIndex,
      hp: this.hpSystem.getHp(),
      maxHp: this.hpSystem.getMaxHp(),
      roundResults: [...this.roundResults],
      startedAt: this.startedAt,
      lastUpdatedAt: Date.now()
    };

    return CheckpointManager.save(snapshot);
  }

  public restoreCheckpoint(): boolean {
    const saved = CheckpointManager.load();
    if (!saved || saved.hp <= 0) return false;

    this.blueprint = saved.blueprint;
    this.currentRoundIndex = saved.currentRoundIndex;
    this.roundResults = saved.roundResults;
    this.startedAt = saved.startedAt;
    this.hpSystem.reset(saved.hp, saved.maxHp);

    this.stateMachine.reset(saved.state);

    if (this.currentRoundIndex < this.blueprint.rounds.length) {
      this.currentRoundInput = RoundResolver.resolveRound(
        this.blueprint,
        this.currentRoundIndex
      );
      this.stateMachine.transition(TowerState.ROUND_ACTIVE);
    }

    this.dispatch(TowerEvent.CHECKPOINT_RESTORED, saved);
    return true;
  }

  // ----------------------------------------------------------------------------
  // GETTERS & EVENT SUBSCRIPTION
  // ----------------------------------------------------------------------------

  public getState(): TowerState {
    return this.stateMachine.getState();
  }

  public getHp(): number {
    return this.hpSystem.getHp();
  }

  public getMaxHp(): number {
    return this.hpSystem.getMaxHp();
  }

  public getCurrentRoundIndex(): number {
    return this.currentRoundIndex;
  }

  public getCurrentRoundInput(): RoundInput | null {
    return this.currentRoundInput;
  }

  public getBlueprint(): TowerFloorBlueprint | null {
    return this.blueprint;
  }

  public getRoundResults(): RoundResult[] {
    return [...this.roundResults];
  }

  public getLastGateResult(): BossGateResult | null {
    return this.lastGateResult;
  }

  public subscribe(listener: FloorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private dispatch(type: TowerEvent, payload: any): void {
    for (const listener of this.listeners) {
      try {
        listener({ type, payload });
      } catch (err) {
        console.error('[RoundOrchestrator] Error notifying subscriber:', err);
      }
    }
  }
}
