import { PlayerStats } from '../types/rpg';
import { KANJI_DATABASE } from '../data/kanji';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { RPG_TIERS } from '../data/rpg/tiers';

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

const ASCENSION_THRESHOLD = 75; // 75% mastery required to ascend

export interface AscensionPillarProgress {
  category: 'kanji' | 'kotoba' | 'bunpou';
  label: string;
  masteredCount: number;
  totalCount: number;
  percentage: number; // 0 - 100
  passed: boolean;    // >= 75%
}

export interface AscensionTierProgress {
  currentJlpt: JlptLevel;
  targetJlpt: JlptLevel | null; // Next level to ascend to
  gateTierIndex: number; // The tier index capped at (1 for N5, 3 for N4, 5 for N3, 7 for N2)
  nextTierIndex: number; // The tier index unlocked upon ascension (2 for N4, 4 for N3, 6 for N2, 8 for N1)
  
  kanji: AscensionPillarProgress;
  kotoba: AscensionPillarProgress;
  bunpou: AscensionPillarProgress;
  
  overallAccumulationPct: number; // Average of kanji, kotoba, and bunpou percentages
  overallPassed: boolean;         // overallAccumulationPct >= 75
  
  hasRequiredExp: boolean;        // Does totalExp meet the next tier's requiredExpTotal?
  isGated: boolean;               // Is EXP high enough for next tier, but 75% mastery is not yet fulfilled?
  canAscend: boolean;             // All pillars >= 75% AND overall >= 75% AND hasRequiredExp
  isAscended: boolean;            // Has already ascended past this gate (tierIndex >= nextTierIndex or in stats.ascendedLevels)
  
  statusMessage: string;
}

/**
 * Maps a tier index (0 to 9) to its corresponding JLPT level
 */
export function getJlptLevelForTierIndex(tierIndex: number): JlptLevel {
  if (tierIndex <= 1) return 'N5';
  if (tierIndex <= 3) return 'N4';
  if (tierIndex <= 5) return 'N3';
  if (tierIndex <= 7) return 'N2';
  return 'N1';
}

/**
 * Returns the ascension gate configuration for each JLPT level
 */
const JLPT_ASCENSION_GATES: Record<JlptLevel, {
  targetJlpt: JlptLevel | null;
  gateTierIndex: number;
  nextTierIndex: number;
  requiredExpForNextTier: number;
}> = {
  N5: { targetJlpt: 'N4', gateTierIndex: 1, nextTierIndex: 2, requiredExpForNextTier: 4000 },
  N4: { targetJlpt: 'N3', gateTierIndex: 3, nextTierIndex: 4, requiredExpForNextTier: 22000 },
  N3: { targetJlpt: 'N2', gateTierIndex: 5, nextTierIndex: 6, requiredExpForNextTier: 80000 },
  N2: { targetJlpt: 'N1', gateTierIndex: 7, nextTierIndex: 8, requiredExpForNextTier: 210000 },
  N1: { targetJlpt: null, gateTierIndex: 9, nextTierIndex: 9, requiredExpForNextTier: 320000 },
};

/**
 * Calculates user's mastery for a specific JLPT level across Kanji, Kotoba, and Bunpou
 */
function calculateJlptPillars(stats: PlayerStats, jlpt: JlptLevel): {
  kanji: AscensionPillarProgress;
  kotoba: AscensionPillarProgress;
  bunpou: AscensionPillarProgress;
  overallAccumulationPct: number;
  allPassed: boolean;
} {
  const itemMastery = stats.itemMastery || {};

  // 1. KANJI
  const allKanji = Object.values(KANJI_DATABASE).filter(k => k.jlpt === jlpt);
  const totalKanji = Math.max(1, allKanji.length);
  let kanjiMastered = 0;

  for (const k of allKanji) {
    const rec = itemMastery[k.id] || itemMastery[k.character];
    if (rec) {
      if ((rec.masteryPercentage || 0) >= 70 || rec.status === 'MASTERED' || rec.status === 'PERFECTED') {
        kanjiMastered++;
      }
    } else if (stats.studyStats?.kanjiWriting?.uniqueIds?.includes(k.id || k.character)) {
      kanjiMastered++;
    }
  }

  const kanjiPct = Math.min(100, Math.round((kanjiMastered / totalKanji) * 100));

  // 2. KOTOBA
  const allKotoba = Object.values(KOTOBA_DATABASE).filter(k => k.jlpt === jlpt);
  const totalKotoba = Math.max(1, allKotoba.length);
  let kotobaMastered = 0;

  for (const k of allKotoba) {
    const rec = itemMastery[k.id];
    if (rec) {
      if ((rec.masteryPercentage || 0) >= 70 || rec.status === 'MASTERED' || rec.status === 'PERFECTED') {
        kotobaMastered++;
      }
    } else if (stats.studyStats?.flashcards?.uniqueIds?.includes(k.id)) {
      kotobaMastered++;
    }
  }

  const kotobaPct = Math.min(100, Math.round((kotobaMastered / totalKotoba) * 100));

  // 3. BUNPOU
  const allBunpou = Object.values(BUNPOU_DATABASE).filter(b => b.level === jlpt);
  const totalBunpou = Math.max(1, allBunpou.length);
  let bunpouMastered = 0;

  for (const b of allBunpou) {
    const rec = itemMastery[b.id];
    if (rec) {
      if ((rec.masteryPercentage || 0) >= 70 || rec.status === 'MASTERED' || rec.status === 'PERFECTED') {
        bunpouMastered++;
      }
    } else if (stats.studyStats?.bunpou?.uniqueIds?.includes(b.id)) {
      bunpouMastered++;
    }
  }

  const bunpouPct = Math.min(100, Math.round((bunpouMastered / totalBunpou) * 100));

  // OVERALL
  const overallAccumulationPct = Math.round((kanjiPct + kotobaPct + bunpouPct) / 3);

  const kanjiPassed = kanjiPct >= ASCENSION_THRESHOLD;
  const kotobaPassed = kotobaPct >= ASCENSION_THRESHOLD;
  const bunpouPassed = bunpouPct >= ASCENSION_THRESHOLD;
  const allPassed = kanjiPassed && kotobaPassed && bunpouPassed && (overallAccumulationPct >= ASCENSION_THRESHOLD);

  return {
    kanji: {
      category: 'kanji',
      label: 'Kanji',
      masteredCount: kanjiMastered,
      totalCount: totalKanji,
      percentage: kanjiPct,
      passed: kanjiPassed,
    },
    kotoba: {
      category: 'kotoba',
      label: 'Kotoba',
      masteredCount: kotobaMastered,
      totalCount: totalKotoba,
      percentage: kotobaPct,
      passed: kotobaPassed,
    },
    bunpou: {
      category: 'bunpou',
      label: 'Bunpou',
      masteredCount: bunpouMastered,
      totalCount: totalBunpou,
      percentage: bunpouPct,
      passed: bunpouPassed,
    },
    overallAccumulationPct,
    allPassed,
  };
}

/**
 * Calculates current tier's ascension progress for the profile modal
 */
export function calculateAscensionProgress(stats: PlayerStats): AscensionTierProgress {
  const currentTierIndex = stats.tierIndex ?? 0;
  const currentJlpt = getJlptLevelForTierIndex(currentTierIndex);
  const gateConfig = JLPT_ASCENSION_GATES[currentJlpt];
  const pillars = calculateJlptPillars(stats, currentJlpt);

  const hasRequiredExp = (stats.totalExp || 0) >= gateConfig.requiredExpForNextTier;
  const isAscendedExplicitly = (stats.ascendedLevels?.includes(currentJlpt as any)) ?? false;
  const isAscendedByTier = currentTierIndex >= gateConfig.nextTierIndex;
  const isAscended = isAscendedExplicitly || isAscendedByTier || (gateConfig.targetJlpt === null);

  // Gated: EXP is high enough for next JLPT level, but hasn't met 75% in all pillars
  const isGated = !isAscended && hasRequiredExp && !pillars.allPassed;

  // Can Ascend: Has required EXP AND meets 75% on all pillars AND not yet ascended
  const canAscend = !isAscended && hasRequiredExp && pillars.allPassed;

  let statusMessage = '';
  if (gateConfig.targetJlpt === null) {
    statusMessage = 'Puncak Tertinggi! Kamu telah mencapai tingkat penguasaan tertinggi di Nihongo Quest.';
  } else if (isAscended) {
    statusMessage = `Telah lulus Ascend ${currentJlpt}! Selamat mengarungi materi tingkat ${gateConfig.targetJlpt}.`;
  } else if (canAscend) {
    statusMessage = `Syarat 75% terpenuhi & EXP mencukupi! Siap melakukan Ascend ke ${gateConfig.targetJlpt}.`;
  } else if (isGated) {
    const missing: string[] = [];
    if (!pillars.kanji.passed) missing.push(`Kanji (${pillars.kanji.percentage}%/75%)`);
    if (!pillars.kotoba.passed) missing.push(`Kotoba (${pillars.kotoba.percentage}%/75%)`);
    if (!pillars.bunpou.passed) missing.push(`Bunpou (${pillars.bunpou.percentage}%/75%)`);
    statusMessage = `Kenaikan Tier Tertahan: Perlu minimal 75% penguasaan materi ${missing.join(', ')}.`;
  } else if (!hasRequiredExp) {
    const expShortage = Math.max(0, gateConfig.requiredExpForNextTier - (stats.totalExp || 0));
    statusMessage = `Kumpulkan ${expShortage.toLocaleString()} EXP lagi dan capai 75% penguasaan materi untuk Ascend ke ${gateConfig.targetJlpt}.`;
  } else {
    statusMessage = `Tingkatkan penguasaan materi hingga minimal 75% di setiap tipe untuk Ascend ke ${gateConfig.targetJlpt}.`;
  }

  return {
    currentJlpt,
    targetJlpt: gateConfig.targetJlpt,
    gateTierIndex: gateConfig.gateTierIndex,
    nextTierIndex: gateConfig.nextTierIndex,
    kanji: pillars.kanji,
    kotoba: pillars.kotoba,
    bunpou: pillars.bunpou,
    overallAccumulationPct: pillars.overallAccumulationPct,
    overallPassed: pillars.overallAccumulationPct >= ASCENSION_THRESHOLD,
    hasRequiredExp,
    isGated,
    canAscend,
    isAscended,
    statusMessage,
  };
}

/**
 * Determines the player's true effective tier index considering total EXP and JLPT ascension gates
 */
export function getEffectiveTier(stats: PlayerStats): {
  effectiveTierIndex: number;
  potentialTierIndex: number;
  isGated: boolean;
  gatedReason?: string;
  gateJlpt?: JlptLevel;
} {
  const safeExp = Math.max(0, stats.totalExp || 0);

  // 1. Calculate potential tier purely based on EXP
  let potentialTierIndex = 0;
  for (let i = RPG_TIERS.length - 1; i >= 0; i--) {
    if (safeExp >= RPG_TIERS[i].requiredExpTotal) {
      potentialTierIndex = i;
      break;
    }
  }

  // 2. Check each JLPT ascension gate sequentially
  const GATES: { gateJlpt: JlptLevel; unlockTier: number; capTier: number }[] = [
    { gateJlpt: 'N5', unlockTier: 2, capTier: 1 }, // Novice N5 cap, Apprentice N4 unlock
    { gateJlpt: 'N4', unlockTier: 4, capTier: 3 }, // Squire N4 cap, Knight N3 unlock
    { gateJlpt: 'N3', unlockTier: 6, capTier: 5 }, // Elite Knight N3 cap, Paladin N2 unlock
    { gateJlpt: 'N2', unlockTier: 8, capTier: 7 }, // Hero N2 cap, Champion N1 unlock
  ];

  for (const gate of GATES) {
    if (potentialTierIndex >= gate.unlockTier) {
      // Check if user has ascended this gate
      const isExplicitlyAscended = stats.ascendedLevels?.includes(gate.gateJlpt) ?? false;
      if (!isExplicitlyAscended) {
        const pillars = calculateJlptPillars(stats, gate.gateJlpt);
        if (!pillars.allPassed) {
          return {
            effectiveTierIndex: gate.capTier,
            potentialTierIndex,
            isGated: true,
            gatedReason: `Kenaikan ke tingkat berikutnya tertahan: penguasaan materi ${gate.gateJlpt} belum mencapai 75% di semua kategori.`,
            gateJlpt: gate.gateJlpt,
          };
        }
      }
    }
  }

  return {
    effectiveTierIndex: potentialTierIndex,
    potentialTierIndex,
    isGated: false,
  };
}
