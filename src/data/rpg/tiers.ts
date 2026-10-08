import { TierInfo } from '../../types/rpg';

export const RPG_TIERS: TierInfo[] = [
  {
    tier: 1,
    name: 'Villager (N5)',
    titleName: 'Peasant Explorer (N5)',
    description: 'Pakaian petualang pemula yang bersiap mengawali langkah fondasi pertama di kurikulum N5.',
    visualAssetDesc: 'Simple linen tunic, wooden walking stick, humble starting adventurer.',
    baseColor: 'to-stone-600',
    glowColor: 'shadow-slate-800/40',
    requiredExpTotal: 0,
    perks: 'Fondasi dasar bahasa Jepang. Regenerasi stamina standar.',
    iconName: 'User'
  },
  {
    tier: 2,
    name: 'Novice (N5)',
    titleName: 'Novice Adventurer (N5)',
    description: 'Menggunakan baju kulit (leather armor) sederhana dan ikat kepala petualang lulusan N5.',
    visualAssetDesc: 'Sturdy leather armor, reinforced boots, bronze buckle, small dagger.',
    baseColor: 'to-teal-800',
    glowColor: 'shadow-emerald-500/30',
    requiredExpTotal: 1200,
    perks: '+5% Gold bonus dari kuis. Membuka Flashcard Speed Mode.',
    iconName: 'Shield'
  },
  {
    tier: 3,
    name: 'Apprentice (N4)',
    titleName: 'Iron Apprentice (N4)',
    description: 'Membawa pedang besi dan perisai kayu kokoh, mengarungi Lembah Petualang N4.',
    visualAssetDesc: 'Hardened iron short sword, carved wooden round shield, padded gambeson.',
    baseColor: 'to-cyan-800',
    glowColor: 'shadow-blue-500/30',
    requiredExpTotal: 4000,
    perks: '+10% EXP pada latihan Kanji. 50/50 Kuis Hint terbuka.',
    iconName: 'Sword'
  },
  {
    tier: 4,
    name: 'Squire (N4)',
    titleName: 'Valiant Squire (N4)',
    description: 'Armor rantai (chainmail), pedang baja yang mulai bersinar menembus ujian N4.',
    visualAssetDesc: 'Polished steel chainmail, steel broadsword with faint glow, heraldic crest.',
    baseColor: 'to-blue-800',
    glowColor: 'shadow-blue-500/40',
    requiredExpTotal: 10000,
    perks: '+10 Max MP. Kontrol kecepatan audio Choukai terbuka.',
    iconName: 'Zap'
  },
  {
    tier: 5,
    name: 'Knight (N3)',
    titleName: 'Honorable Knight (N3)',
    description: 'Armor besi penuh (full plate), memancarkan aura ketekunan mengarungi Kurikulum Soumatome N3.',
    visualAssetDesc: 'Full steel plate armor, visor helmet with plume, glowing knight blade.',
    baseColor: 'to-purple-900',
    glowColor: 'shadow-purple-500/40',
    requiredExpTotal: 22000,
    perks: '+15% Serangan Boss Battle. Bonus EXP Misi Harian +20%.',
    iconName: 'Award'
  },
  {
    tier: 6,
    name: 'Elite Knight (N3)',
    titleName: 'Royal Elite Knight (N3)',
    description: 'Dilengkapi jubah bangsawan dan pedang murni, menguasai seluruh 6 Minggu Soumatome N3.',
    visualAssetDesc: 'Royal velvet cape with gold trims, engraved runic plate, luminous longsword.',
    baseColor: 'to-red-800',
    glowColor: 'shadow-rose-500/50',
    requiredExpTotal: 45000,
    perks: '+1 Perisai Pembeku Streak harian. +25% Gold dari Dokkai.',
    iconName: 'Crown'
  },
  {
    tier: 7,
    name: 'Paladin (N2)',
    titleName: 'Grand Paladin Master (N2)',
    description: 'Armor emas perak mewah, tameng suci penjaga ilmu wacana tinggi Ranah N2.',
    visualAssetDesc: 'Gilded gold-and-silver heavy armor, radiant holy shield, sun-etched claymore.',
    baseColor: 'to-amber-600',
    glowColor: 'shadow-amber-400/50',
    requiredExpTotal: 80000,
    perks: '+20% Critical Study EXP boost. Gratis 1 MP Potion setiap login harian.',
    iconName: 'Sun'
  },
  {
    tier: 8,
    name: 'Hero (N2)',
    titleName: 'Legendary Hero (N2)',
    description: 'Aura kosmik berputar di tubuh, menggenggam pusaka legendaris penguasa N2.',
    visualAssetDesc: 'Cosmic glowing energy aura, floating celestial relic, legendary glowing excalibur.',
    baseColor: 'to-indigo-900',
    glowColor: 'shadow-sky-400/60',
    requiredExpTotal: 135000,
    perks: 'Lembar latihan kanji tanpa batas dengan evaluasi otomatis. +30% seluruh EXP.',
    iconName: 'Flame'
  },
  {
    tier: 9,
    name: 'Champion (N1)',
    titleName: 'Elemental Champion (N1)',
    description: 'Melayang di udara dengan elemen petir dan api suci, menembus puncak tersulit N1.',
    visualAssetDesc: 'Levitating avatar, elemental vortex of thunder & flames, divine twin blades.',
    baseColor: 'to-purple-800',
    glowColor: 'shadow-fuchsia-500/60',
    requiredExpTotal: 210000,
    perks: 'Kemampuan Super Boss Slayer: Kerusakan 2x lipat terhadap semua Stage Boss.',
    iconName: 'Swords'
  },
  {
    tier: 10,
    name: 'Mythic Deity (N1)',
    titleName: 'Mythic Deity of Knowledge (N1)',
    description: 'Wujud puncak pembelajar sejati, memancarkan aura kebijaksanaan dan penguasaan bahasa Jepang terlengkap (N5 ~ N1).',
    visualAssetDesc: 'Transcendent deity form, luminous halo crown, 6 wings of pure radiant light.',
    baseColor: 'to-amber-500',
    glowColor: 'shadow-amber-300/80',
    requiredExpTotal: 320000,
    perks: 'Penguasaan Penuh Seluruh Kurikulum Jepang (N5-N1). RPG Stats & Study Boost Maksimal.',
    iconName: 'Star'
  }
];

export function calculateMaxHp(level: number, vit: number): number {
  return 100 + (level * 10) + (vit * 15);
}

export function calculateMaxMp(level: number, int: number): number {
  return 40 + (level * 5) + (int * 8);
}

export function calculateLevelFromExp(totalExp: number): number {
  const safeExp = Math.max(0, totalExp);
  const calculated = Math.floor((-1 + Math.sqrt(9 + 0.16 * safeExp)) / 2);
  return Math.max(1, calculated);
}

export function getLevelInfo(totalExp: number): {
  level: number;
  currentLevelExp: number;
  expNeededForNextLevel: number;
  progressPercent: number;
  currentLevelStartExp: number;
  nextLevelStartExp: number;
} {
  const safeExp = Math.max(0, totalExp);
  const level = calculateLevelFromExp(safeExp);

  // Total exp needed to start this level
  const currentLevelStartExp = 25 * level * level + 25 * level - 50;
  // Total exp needed to reach next level
  const nextLevelStartExp = 25 * (level + 1) * (level + 1) + 25 * (level + 1) - 50;

  const currentLevelExp = safeExp - currentLevelStartExp;
  const expNeededForNextLevel = nextLevelStartExp - currentLevelStartExp;
  const progressPercent = Math.min(100, Math.max(0, (currentLevelExp / expNeededForNextLevel) * 100));

  return {
    level,
    currentLevelExp,
    expNeededForNextLevel,
    progressPercent,
    currentLevelStartExp,
    nextLevelStartExp
  };
}

interface TierGateRequirement {
  requiredWorldId: string;
  requiredWorldName: string;
  requiredJlpt: string;
  minStageCompletionPct: number; // 77
}

const TIER_GATE_REQUIREMENTS: Record<number, TierGateRequirement> = {
  2: { // Entering Tier 3 (Apprentice - N4)
    requiredWorldId: 'world_n5',
    requiredWorldName: 'World N5 (Dunia Permulaan)',
    requiredJlpt: 'N5',
    minStageCompletionPct: 77
  },
  4: { // Entering Tier 5 (Knight - N3)
    requiredWorldId: 'world_n4',
    requiredWorldName: 'World N4 (Langkah Petualang)',
    requiredJlpt: 'N4',
    minStageCompletionPct: 77
  },
  6: { // Entering Tier 7 (Paladin - N2)
    requiredWorldId: 'world_n3',
    requiredWorldName: 'World N3 (Peta Soumatome N3)',
    requiredJlpt: 'N3',
    minStageCompletionPct: 77
  },
  8: { // Entering Tier 9 (Champion - N1)
    requiredWorldId: 'world_n2',
    requiredWorldName: 'World N2 (Ranah Mahir)',
    requiredJlpt: 'N2',
    minStageCompletionPct: 77
  }
};

export interface TierGateCheckResult {
  isGated: boolean;
  effectiveTierIndex: number;
  potentialTierIndex: number;
  gatedReason?: string;
  gateRequirement?: TierGateRequirement;
  worldClearedCount?: number;
  worldTotalCount?: number;
  currentPercentage?: number;
}

function checkTierGate(
  potentialTierIndex: number,
  _stageProgress: Record<string, import('../../types/rpg').StageClearData> = {},
  _worldStagesMap: Record<string, string[]> = {}
): TierGateCheckResult {
  return {
    isGated: false,
    effectiveTierIndex: potentialTierIndex,
    potentialTierIndex
  };
}

export function getTierForExp(
  totalExp: number,
  stageProgress?: Record<string, import('../../types/rpg').StageClearData>,
  worldStagesMap?: Record<string, string[]>
): {
  tierIndex: number;
  potentialTierIndex: number;
  isGated: boolean;
  gateResult?: TierGateCheckResult;
  currentTier: TierInfo;
  nextTier: TierInfo | null;
  expInCurrentTier: number;
  expForNextTier: number;
  progressPercent: number;
  remainingExpToNextTier: number;
} {
  const safeExp = Math.max(0, totalExp);
  let potentialTierIndex = 0;
  for (let i = RPG_TIERS.length - 1; i >= 0; i--) {
    if (safeExp >= RPG_TIERS[i].requiredExpTotal) {
      potentialTierIndex = i;
      break;
    }
  }

  let tierIndex = potentialTierIndex;
  let gateResult: TierGateCheckResult = { isGated: false, effectiveTierIndex: potentialTierIndex, potentialTierIndex };

  if (stageProgress && worldStagesMap) {
    gateResult = checkTierGate(potentialTierIndex, stageProgress, worldStagesMap);
    tierIndex = gateResult.effectiveTierIndex;
  }

  const currentTier = RPG_TIERS[tierIndex];
  const nextTier = tierIndex < RPG_TIERS.length - 1 ? RPG_TIERS[tierIndex + 1] : null;

  if (!nextTier) {
    return {
      tierIndex,
      potentialTierIndex,
      isGated: gateResult.isGated,
      gateResult,
      currentTier,
      nextTier: null,
      expInCurrentTier: safeExp - currentTier.requiredExpTotal,
      expForNextTier: 0,
      progressPercent: 100,
      remainingExpToNextTier: 0
    };
  }

  const expInCurrentTier = safeExp - currentTier.requiredExpTotal;
  const expForNextTier = nextTier.requiredExpTotal - currentTier.requiredExpTotal;
  const progressPercent = Math.min(100, Math.max(0, (expInCurrentTier / expForNextTier) * 100));
  const remainingExpToNextTier = Math.max(0, nextTier.requiredExpTotal - safeExp);

  return {
    tierIndex,
    potentialTierIndex,
    isGated: gateResult.isGated,
    gateResult,
    currentTier,
    nextTier,
    expInCurrentTier,
    expForNextTier,
    progressPercent,
    remainingExpToNextTier
  };
}

/** Poin atribut (STR/AGI/INT/VIT) yang didapat setiap naik 1 level. */
export const ATTRIBUTE_POINTS_PER_LEVEL = 3;
