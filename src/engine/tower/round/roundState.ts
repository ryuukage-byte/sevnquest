// ==============================================================================
// NIHONGO TOWER — ROUND STATE MACHINE (STAGE 3)
// ==============================================================================

import { TowerState } from '../../../types/tower';

export type StateChangeListener = (currentState: TowerState, previousState: TowerState) => void;

/**
 * Strict transition graph preventing race conditions during round cycles
 */
const VALID_TRANSITIONS: Record<TowerState, TowerState[]> = {
  [TowerState.IDLE]: [TowerState.FLOOR_ACTIVE],
  [TowerState.FLOOR_ACTIVE]: [
    TowerState.ROUND_STARTED,
    TowerState.FLOOR_PAUSED,
    TowerState.FLOOR_FAILED
  ],
  [TowerState.ROUND_STARTED]: [
    TowerState.ROUND_ACTIVE,
    TowerState.FLOOR_PAUSED,
    TowerState.FLOOR_FAILED
  ],
  [TowerState.ROUND_ACTIVE]: [
    TowerState.ROUND_RESOLVING,
    TowerState.FLOOR_PAUSED,
    TowerState.FLOOR_FAILED
  ],
  [TowerState.ROUND_RESOLVING]: [
    TowerState.ROUND_RESULT,
    TowerState.ROUND_COMPLETED,
    TowerState.ROUND_FAILED,
    TowerState.FLOOR_FAILED
  ],
  [TowerState.ROUND_RESULT]: [
    TowerState.ROUND_COMPLETED,
    TowerState.ROUND_FAILED,
    TowerState.ROUND_STARTED,
    TowerState.FLOOR_CLEAR,
    TowerState.FLOOR_FAILED,
    TowerState.FLOOR_PAUSED
  ],
  [TowerState.ROUND_COMPLETED]: [
    TowerState.ROUND_STARTED,
    TowerState.FLOOR_CLEAR,
    TowerState.FLOOR_FAILED,
    TowerState.IDLE
  ],
  [TowerState.ROUND_FAILED]: [
    TowerState.ROUND_STARTED,
    TowerState.FLOOR_FAILED,
    TowerState.IDLE
  ],
  [TowerState.FLOOR_PAUSED]: [
    TowerState.FLOOR_ACTIVE,
    TowerState.ROUND_STARTED,
    TowerState.ROUND_ACTIVE,
    TowerState.FLOOR_FAILED,
    TowerState.IDLE
  ],
  [TowerState.FLOOR_CLEAR]: [
    TowerState.IDLE,
    TowerState.FLOOR_ACTIVE
  ],
  [TowerState.FLOOR_FAILED]: [
    TowerState.IDLE,
    TowerState.FLOOR_ACTIVE
  ]
};

/**
 * State machine governing the progression of a player through Tower floors and rounds
 */
export class RoundStateMachine {
  private currentState: TowerState = TowerState.IDLE;
  private stateBeforePause: TowerState | null = null;
  private listeners: Set<StateChangeListener> = new Set();

  constructor(initialState: TowerState = TowerState.IDLE) {
    this.currentState = initialState;
  }

  public getState(): TowerState {
    return this.currentState;
  }

  public canTransition(targetState: TowerState): boolean {
    const allowed = VALID_TRANSITIONS[this.currentState] || [];
    return allowed.includes(targetState);
  }

  public transition(targetState: TowerState): boolean {
    if (!this.canTransition(targetState)) {
      console.warn(
        `[RoundStateMachine] Invalid transition attempt from ${this.currentState} to ${targetState}`
      );
      return false;
    }

    const previousState = this.currentState;
    this.currentState = targetState;
    this.notifyListeners(targetState, previousState);
    return true;
  }

  public pause(): boolean {
    if (this.currentState === TowerState.FLOOR_PAUSED || this.isFinished()) {
      return false;
    }
    this.stateBeforePause = this.currentState;
    return this.transition(TowerState.FLOOR_PAUSED);
  }

  public resume(): boolean {
    if (this.currentState !== TowerState.FLOOR_PAUSED) {
      return false;
    }
    const resumeTarget = this.stateBeforePause || TowerState.FLOOR_ACTIVE;
    this.stateBeforePause = null;
    return this.transition(resumeTarget);
  }

  public reset(toState: TowerState = TowerState.IDLE): void {
    const previous = this.currentState;
    this.currentState = toState;
    this.stateBeforePause = null;
    this.notifyListeners(toState, previous);
  }

  public isFinished(): boolean {
    return (
      this.currentState === TowerState.FLOOR_CLEAR ||
      this.currentState === TowerState.FLOOR_FAILED
    );
  }

  public isPaused(): boolean {
    return this.currentState === TowerState.FLOOR_PAUSED;
  }

  public isRoundInProgress(): boolean {
    return (
      this.currentState === TowerState.ROUND_STARTED ||
      this.currentState === TowerState.ROUND_ACTIVE ||
      this.currentState === TowerState.ROUND_RESOLVING ||
      this.currentState === TowerState.ROUND_RESULT
    );
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(current: TowerState, previous: TowerState): void {
    for (const listener of this.listeners) {
      try {
        listener(current, previous);
      } catch (err) {
        console.error('[RoundStateMachine] Error in listener execution:', err);
      }
    }
  }
}
