// ==============================================================================
// NIHONGO TOWER — HP & DAMAGE SYSTEM (STAGE 3)
// ==============================================================================

export interface DamageReport {
  currentHp: number;
  maxHp: number;
  damageDealt: number;
  shieldAbsorbed: boolean;
  isDead: boolean;
}

export interface HealReport {
  currentHp: number;
  maxHp: number;
  healed: number;
}

/**
 * Manages player HP, damage calculations, and shield protections during Tower runs
 */
export class TowerHpSystem {
  private currentHp: number;
  private maxHp: number;
  private shieldCount: number = 0;

  constructor(initialHp: number = 3, maxHp: number = 3) {
    this.maxHp = Math.max(1, maxHp);
    this.currentHp = Math.min(this.maxHp, Math.max(0, initialHp));
  }

  /**
   * Applies damage to player, respecting active shields
   */
  public takeDamage(amount: number = 1): DamageReport {
    if (amount <= 0) {
      return {
        currentHp: this.currentHp,
        maxHp: this.maxHp,
        damageDealt: 0,
        shieldAbsorbed: false,
        isDead: this.currentHp <= 0
      };
    }

    // Shield protection check
    if (this.shieldCount > 0) {
      this.shieldCount--;
      return {
        currentHp: this.currentHp,
        maxHp: this.maxHp,
        damageDealt: 0,
        shieldAbsorbed: true,
        isDead: false
      };
    }

    const actualDamage = Math.min(this.currentHp, amount);
    this.currentHp = Math.max(0, this.currentHp - actualDamage);

    return {
      currentHp: this.currentHp,
      maxHp: this.maxHp,
      damageDealt: actualDamage,
      shieldAbsorbed: false,
      isDead: this.currentHp <= 0
    };
  }

  /**
   * Heals the player up to max HP
   */
  public heal(amount: number = 1): HealReport {
    if (amount <= 0) {
      return { currentHp: this.currentHp, maxHp: this.maxHp, healed: 0 };
    }

    const before = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    const healed = this.currentHp - before;

    return {
      currentHp: this.currentHp,
      maxHp: this.maxHp,
      healed
    };
  }

  /**
   * Adds protective shield (e.g., from combo streak or item)
   */
  public addShield(): void {
    this.shieldCount++;
  }

  public getShieldCount(): number {
    return this.shieldCount;
  }

  public hasShield(): boolean {
    return this.shieldCount > 0;
  }

  public getHp(): number {
    return this.currentHp;
  }

  public getMaxHp(): number {
    return this.maxHp;
  }

  public isAlive(): boolean {
    return this.currentHp > 0;
  }

  public reset(initialHp: number = 3, maxHp?: number): void {
    if (maxHp !== undefined) {
      this.maxHp = Math.max(1, maxHp);
    }
    this.currentHp = Math.min(this.maxHp, Math.max(0, initialHp));
    this.shieldCount = 0;
  }

  /**
   * Restores HP on Checkpoint floors (floors divisible by 10)
   */
  public handleCheckpointRestoration(): HealReport {
    return this.heal(this.maxHp); // Full restore at checkpoints
  }
}
