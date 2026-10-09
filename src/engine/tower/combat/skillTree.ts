// ==============================================================================
// NIHONGO TOWER — PASSIVE SKILL TREE & ECONOMY ENGINE (STAGE 5.3)
// ==============================================================================

export interface PassiveSkillDef {
  id: string;
  name: string;
  japaneseName: string;
  description: string;
  icon: string;
  maxLevel: number;
  costPerLevel: number[]; // SP cost per level [lvl1, lvl2, lvl3]
  effects: Array<{
    type: 'accuracy_boost' | 'timer_boost_sec' | 'starting_shield' | 'reward_multiplier' | 'max_hp_boost';
    valuePerLevel: number[];
  }>;
}

export const TOWER_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: 'kanji_vision',
    name: 'Kanji Vision',
    japaneseName: '漢字の眼 (Kanji no Me)',
    description: 'Memberikan toleransi akurasi goresan kanji pada kanvas penulisan.',
    icon: 'eye',
    maxLevel: 3,
    costPerLevel: [1, 2, 3],
    effects: [
      {
        type: 'accuracy_boost',
        valuePerLevel: [3, 5, 8] // +3%, +5%, +8%
      }
    ]
  },
  {
    id: 'grammar_insight',
    name: 'Grammar Insight',
    japaneseName: '文法の直感 (Bunpou no Chokkan)',
    description: 'Menambahkan bonus waktu pengerjaan untuk ronde berbatas waktu.',
    icon: 'clock',
    maxLevel: 3,
    costPerLevel: [1, 2, 3],
    effects: [
      {
        type: 'timer_boost_sec',
        valuePerLevel: [5, 10, 15] // +5s, +10s, +15s
      }
    ]
  },
  {
    id: 'iron_resolve',
    name: 'Iron Resolve',
    japaneseName: '不動の心 (Fudou no Kokoro)',
    description: 'Memulai setiap lantai menara dengan perisai pelindung gratis.',
    icon: 'shield',
    maxLevel: 2,
    costPerLevel: [3, 5],
    effects: [
      {
        type: 'starting_shield',
        valuePerLevel: [1, 2] // 1 shield, 2 shields
      }
    ]
  },
  {
    id: 'mnemonic_resonance',
    name: 'Mnemonic Resonance',
    japaneseName: '記憶の共鳴 (Kioku no Kyoumei)',
    description: 'Meningkatkan perolehan EXP dan Gold setelah menaklukkan lantai.',
    icon: 'zap',
    maxLevel: 3,
    costPerLevel: [1, 2, 4],
    effects: [
      {
        type: 'reward_multiplier',
        valuePerLevel: [10, 20, 30] // +10%, +20%, +30%
      }
    ]
  },
  {
    id: 'vitality_surge',
    name: 'Vitality Surge',
    japaneseName: '生命の息吹 (Seimei no Ibuki)',
    description: 'Meningkatkan kapasitas maksimum hati/HP pemain dari 3 menjadi 4.',
    icon: 'heart',
    maxLevel: 1,
    costPerLevel: [5],
    effects: [
      {
        type: 'max_hp_boost',
        valuePerLevel: [1] // +1 Heart
      }
    ]
  }
];

export interface PlayerTowerEconomy {
  skillPoints: number;
  allocatedSkills: Record<string, number>; // skillId -> level
  reviveTokens: number;
}

const STORAGE_KEY = 'nq_tower_skill_economy';

export class SkillTreeManager {
  private static defaultState: PlayerTowerEconomy = {
    skillPoints: 3,
    allocatedSkills: {},
    reviveTokens: 1
  };

  public static load(): PlayerTowerEconomy {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...this.defaultState };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...this.defaultState };
      return JSON.parse(raw);
    } catch {
      return { ...this.defaultState };
    }
  }

  public static save(state: PlayerTowerEconomy): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore
    }
  }

  public static getSkillLevel(skillId: string): number {
    const data = this.load();
    return data.allocatedSkills[skillId] || 0;
  }

  public static upgradeSkill(skillId: string): boolean {
    const skill = TOWER_PASSIVE_SKILLS.find(s => s.id === skillId);
    if (!skill) return false;

    const current = this.load();
    const currentLvl = current.allocatedSkills[skillId] || 0;

    if (currentLvl >= skill.maxLevel) return false;

    const cost = skill.costPerLevel[currentLvl];
    if (current.skillPoints < cost) return false;

    current.skillPoints -= cost;
    current.allocatedSkills[skillId] = currentLvl + 1;
    this.save(current);
    return true;
  }

  public static addSkillPoints(amount: number): number {
    const current = this.load();
    current.skillPoints = Math.max(0, current.skillPoints + amount);
    this.save(current);
    return current.skillPoints;
  }

  /**
   * Calculates aggregated bonus values for gameplay runtime
   */
  public static getActiveBonuses(): {
    accuracyBonus: number;
    timerBonusSec: number;
    startingShields: number;
    rewardMultiplier: number;
    maxHpBonus: number;
  } {
    const allocated = this.load().allocatedSkills;
    let accuracyBonus = 0;
    let timerBonusSec = 0;
    let startingShields = 0;
    let rewardMultiplier = 0;
    let maxHpBonus = 0;

    for (const skill of TOWER_PASSIVE_SKILLS) {
      const lvl = allocated[skill.id] || 0;
      if (lvl <= 0) continue;

      for (const eff of skill.effects) {
        const val = eff.valuePerLevel[lvl - 1] || 0;
        if (eff.type === 'accuracy_boost') accuracyBonus += val;
        if (eff.type === 'timer_boost_sec') timerBonusSec += val;
        if (eff.type === 'starting_shield') startingShields += val;
        if (eff.type === 'reward_multiplier') rewardMultiplier += val;
        if (eff.type === 'max_hp_boost') maxHpBonus += val;
      }
    }

    return {
      accuracyBonus,
      timerBonusSec,
      startingShields,
      rewardMultiplier,
      maxHpBonus
    };
  }
}
