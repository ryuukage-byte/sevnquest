// ==============================================================================
// NIHONGO TOWER — BOSS FLOOR GATE SYSTEM (STAGE 4)
// ==============================================================================

import {
  JLPTLevel,
  TowerPlayerProfile,
  BossGateRequirement,
  BossGateResult
} from '../../../types/tower';
import { extractPlayerWeaknesses } from '../masteryEngine';

/**
 * Gate requirements mapping for each 100-floor JLPT Trial
 */
const BOSS_GATE_REQUIREMENTS: Record<number, BossGateRequirement> = {
  100: {
    jlptLevel: JLPTLevel.N5,
    minKanjiMastery: 70,
    minGrammarMastery: 65,
    minVocabularyMastery: 75
  },
  200: {
    jlptLevel: JLPTLevel.N5,
    minKanjiMastery: 75,
    minGrammarMastery: 70,
    minVocabularyMastery: 78
  },
  300: {
    jlptLevel: JLPTLevel.N4,
    minKanjiMastery: 75,
    minGrammarMastery: 70,
    minVocabularyMastery: 80
  },
  400: {
    jlptLevel: JLPTLevel.N4,
    minKanjiMastery: 78,
    minGrammarMastery: 72,
    minVocabularyMastery: 82
  },
  500: {
    jlptLevel: JLPTLevel.N3,
    minKanjiMastery: 78,
    minGrammarMastery: 75,
    minVocabularyMastery: 82
  },
  600: {
    jlptLevel: JLPTLevel.N3,
    minKanjiMastery: 80,
    minGrammarMastery: 78,
    minVocabularyMastery: 85
  },
  700: {
    jlptLevel: JLPTLevel.N2,
    minKanjiMastery: 80,
    minGrammarMastery: 80,
    minVocabularyMastery: 85
  },
  800: {
    jlptLevel: JLPTLevel.N2,
    minKanjiMastery: 82,
    minGrammarMastery: 82,
    minVocabularyMastery: 88
  },
  900: {
    jlptLevel: JLPTLevel.N1,
    minKanjiMastery: 85,
    minGrammarMastery: 85,
    minVocabularyMastery: 90
  },
  1000: {
    jlptLevel: JLPTLevel.N1,
    minKanjiMastery: 90,
    minGrammarMastery: 90,
    minVocabularyMastery: 92
  }
};

/**
 * Evaluates whether player meets the prerequisites to unlock and enter a Boss Gate
 */
export function checkBossGate(
  floor: number,
  playerProfile?: TowerPlayerProfile | any
): BossGateResult {
  const isBossFloor = floor % 100 === 0 && floor > 0;
  const gateRequirement = BOSS_GATE_REQUIREMENTS[floor] || {
    jlptLevel: floor <= 300 ? JLPTLevel.N5 : floor <= 600 ? JLPTLevel.N3 : JLPTLevel.N1,
    minKanjiMastery: 70,
    minGrammarMastery: 65,
    minVocabularyMastery: 75
  };

  const gateName = `Gerbang Ujian ${gateRequirement.jlptLevel} — Lantai ${floor}`;

  // Non-boss floors never have entry gates, and testing mode bypasses lock
  if (!isBossFloor || playerProfile?.isTestMode || playerProfile?.bypassBossGate || !playerProfile) {
    return {
      canEnter: true,
      gateName,
      floor,
      requirements: gateRequirement,
      currentMastery: { kanji: 100, grammar: 100, vocabulary: 100 },
      weaknesses: [],
      recommendedFloors: [Math.max(1, floor - 5), floor]
    };
  }

  // Calculate player's pillar mastery scores from profile
  const { weakWords, weakGrammar, weakKanji, masteryMap } = extractPlayerWeaknesses(playerProfile);

  let totalVocabScore = 0;
  let vocabCount = 0;
  let totalKanjiScore = 0;
  let kanjiCount = 0;
  let totalGrammarScore = 0;
  let grammarCount = 0;

  for (const [id, m] of Object.entries(masteryMap)) {
    // Kategori dari record mastery adalah sumber kebenaran; tebakan dari awalan ID hanya cadangan.
    const category = m.category
      || (/^(kj_|kanji_|kana_)/.test(id) || id.length === 1 ? 'kanji'
        : /^bp_|^w[0-9]+d[0-9]+g[0-9]+/.test(id) || id.includes('grammar') ? 'bunpou'
        : 'kotoba');
    if (category === 'kanji') {
      totalKanjiScore += m.masteryScore;
      kanjiCount++;
    } else if (category === 'bunpou') {
      totalGrammarScore += m.masteryScore;
      grammarCount++;
    } else if (category === 'kotoba') {
      totalVocabScore += m.masteryScore;
      vocabCount++;
    }
    // dokkai/choukai tidak termasuk tiga pilar gerbang
  }

  // Base fallback if fresh or unindexed (gives reasonable defaults or uses profile)
  const currentKanji = kanjiCount > 0 ? Math.round(totalKanjiScore / kanjiCount) : 75;
  const currentGrammar = grammarCount > 0 ? Math.round(totalGrammarScore / grammarCount) : 70;
  const currentVocab = vocabCount > 0 ? Math.round(totalVocabScore / vocabCount) : 80;

  const currentMastery = {
    kanji: currentKanji,
    grammar: currentGrammar,
    vocabulary: currentVocab
  };

  const weaknesses: string[] = [];
  if (currentKanji < gateRequirement.minKanjiMastery) {
    weaknesses.push(`Penguasaan Kanji (${currentKanji}% / Min ${gateRequirement.minKanjiMastery}%)`);
  }
  if (currentGrammar < gateRequirement.minGrammarMastery) {
    weaknesses.push(`Penguasaan Tata Bahasa (${currentGrammar}% / Min ${gateRequirement.minGrammarMastery}%)`);
  }
  if (currentVocab < gateRequirement.minVocabularyMastery) {
    weaknesses.push(`Penguasaan Kosakata (${currentVocab}% / Min ${gateRequirement.minVocabularyMastery}%)`);
  }

  // Syarat masuk hanya rata-rata penguasaan tiga pilar; daftar item rawan bersifat informasi saja
  // (sebelumnya satu kata rawan saja sudah mengunci gerbang selamanya).
  const canEnter = weaknesses.length === 0;
  if (weakWords.length > 0) weaknesses.push(`Kosakata rawan: ${weakWords.slice(0, 3).join(', ')}`);
  if (weakGrammar.length > 0) weaknesses.push(`Pola rawan: ${weakGrammar.slice(0, 2).join(', ')}`);
  if (weakKanji.length > 0) weaknesses.push(`Kanji rawan: ${weakKanji.slice(0, 3).join(', ')}`);
  const recommendedStart = Math.max(1, floor - 25);
  const recommendedEnd = Math.max(1, floor - 1);

  return {
    canEnter,
    gateName,
    floor,
    requirements: gateRequirement,
    currentMastery,
    weaknesses,
    recommendedFloors: [recommendedStart, recommendedEnd]
  };
}
