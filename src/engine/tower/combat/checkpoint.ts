// ==============================================================================
// NIHONGO TOWER — CHECKPOINT & SESSION PERSISTENCE (STAGE 3)
// ==============================================================================

import { TowerCheckpointState } from '../../../types/tower';

const CHECKPOINT_STORAGE_KEY = 'nq_tower_active_checkpoint';
const CURRENT_CHECKPOINT_VERSION = 1;

/**
 * Checkpoint Manager supporting offline continuation, resume, and crash recovery
 */
export class CheckpointManager {
  /**
   * Persists the active tower session state
   */
  public static save(state: TowerCheckpointState): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      const payload: TowerCheckpointState = {
        ...state,
        version: CURRENT_CHECKPOINT_VERSION,
        lastUpdatedAt: Date.now()
      };
      localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.warn('[CheckpointManager] Failed to persist checkpoint:', err);
      return false;
    }
  }

  /**
   * Loads a saved checkpoint if available and matching the version
   */
  public static load(): TowerCheckpointState | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const raw = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
      if (!raw) return null;

      const parsed: TowerCheckpointState = JSON.parse(raw);
      if (parsed.version !== CURRENT_CHECKPOINT_VERSION) {
        this.clear();
        return null;
      }

      // Check if checkpoint is not expired (e.g. valid for 7 days)
      const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.lastUpdatedAt > maxAgeMs) {
        this.clear();
        return null;
      }

      return parsed;
    } catch (err) {
      console.warn('[CheckpointManager] Failed to load checkpoint:', err);
      return null;
    }
  }

  /**
   * Checks whether a resumeable run is currently stored
   */
  public static hasResumeableSession(): boolean {
    const cp = this.load();
    return cp !== null && cp.hp > 0 && cp.currentRoundIndex < cp.blueprint.rounds.length;
  }

  /**
   * Clears the active checkpoint (called upon floor clear or surrender)
   */
  public static clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
