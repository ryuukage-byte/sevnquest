import type { PlayerStats } from '../types/rpg';
import { getEffectiveTier } from '../utils/ascension';
import { applyExpGain } from '../utils/expAward';
import { recordStudyActivity } from '../utils/activity';
import { recordItemAttempt, recordItemInteraction, buildSmartRecallQueue } from '../utils/mastery';
import type { ErrorType } from '../types/content';
import { applyLevelFromExp } from './derivedState';
import { touchActiveDay } from './streak';
import type { RewardMeta } from '../engine/reward/types';
import { localDayKey } from '../engine/reward/ledger';

/**
 * Transisi state pemain yang MURNI (tanpa React) untuk reward dan hasil belajar.
 * Dipisahkan dari hooks/usePlayerActions.ts supaya perilaku EXP/mastery bisa diuji langsung.
 */

export type StudyModuleId = 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts';
export type StudyInteraction = 'writing' | 'flashcard' | 'quiz';

/** Terapkan reward EXP/gold. EXP pecahan dibawa lewat `expFraction`, bukan dibulatkan lalu hilang. */
export function applyRewardToStats(prev: PlayerStats, expGained: number, goldGained: number = 0): PlayerStats {
  const { totalExp, expFraction } = applyExpGain(prev.totalExp || 0, prev.expFraction, expGained);
  const { effectiveTierIndex, isGated, gatedReason } = getEffectiveTier({ ...prev, totalExp });

  // Level adalah fungsi dari totalExp: naik level memberi poin atribut dan menambah HP/MP maksimum.
  return applyLevelFromExp({
    ...prev,
    totalExp,
    expFraction,
    tierIndex: Math.max(0, effectiveTierIndex),
    tierPromotionGated: isGated,
    gatedReason,
    gold: Math.round(Math.max(0, (prev.gold || 0) + goldGained)),
  }).stats;
}

export function resolveStudyInteraction(
  moduleId: StudyModuleId,
  override?: StudyInteraction
): StudyInteraction {
  return override || (moduleId === 'kanji' ? 'writing' : moduleId === 'kotoba' ? 'flashcard' : 'quiz');
}

/** ID agregat sesi (drill/tryout/dungeon/star_rush) bukan item materi: tidak boleh membuat record mastery. */
export function isSessionAggregateId(moduleId: StudyModuleId, itemId?: string): boolean {
  return moduleId === 'questions' ||
    moduleId === 'tryOuts' ||
    (itemId !== undefined && /^(dungeon_|drill_|tryout_|star_rush)/.test(itemId));
}

/**
 * Sumber reward untuk hasil belajar yang pemanggilnya TIDAK menyebut sumber. Hanya pola yang tegas dikenali
 * dari ID/interaksi; selebihnya `study_unclassified` (tercatat, tanpa batas).
 */
export function inferStudyRewardMeta(moduleId: StudyModuleId, interaction: StudyInteraction, itemId?: string): RewardMeta {
  if (itemId && /^dungeon_/.test(itemId)) return { source: 'dungeon_session', ref: itemId, eventKey: itemId };
  if (itemId && /^drill_/.test(itemId)) return { source: 'drill_session', ref: itemId };
  if (interaction === 'writing' && itemId && !isSessionAggregateId(moduleId, itemId)) {
    return { source: 'writing_practice', ref: itemId };
  }
  return { source: 'study_unclassified', ref: itemId };
}

export interface StudyCompletion {
  moduleId: StudyModuleId;
  itemId?: string;
  /** undefined = tidak ada penilaian (mis. flashcard yang hanya dilihat); BUKAN jawaban benar. */
  score?: number;
  total?: number;
  interaction: StudyInteraction;
  detectedErrors?: ErrorType[];
}

export type MissionAdvance = {
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'quiz';
  amount: number;
  extra?: { isPerfect?: boolean };
};

/** Misi yang maju akibat satu hasil belajar. Flashcard kanji bukan "lembar menulis". */
export function getStudyMissionAdvances(c: Pick<StudyCompletion, 'moduleId' | 'interaction' | 'score' | 'total'>): MissionAdvance[] {
  const out: MissionAdvance[] = [];
  const { moduleId, interaction, score, total } = c;
  if (interaction === 'writing' || (moduleId === 'kanji' && interaction !== 'flashcard')) out.push({ category: 'kanji', amount: 1 });
  if (moduleId === 'bunpou') out.push({ category: 'bunpou', amount: 1 });
  else if (moduleId === 'kotoba' && interaction !== 'writing') out.push({ category: 'kotoba', amount: 1 });
  else if (moduleId === 'choukai') out.push({ category: 'choukai', amount: 1 });
  else if (moduleId === 'dokkai') {
    const isPerfect = score !== undefined && total !== undefined && total > 0 && score === total;
    out.push({ category: 'dokkai', amount: 1, extra: { isPerfect } });
  } else if (moduleId === 'boss') out.push({ category: 'boss', amount: 1 });
  if (score && score > 0) out.push({ category: 'quiz', amount: score });
  return out;
}

/**
 * Catat hasil belajar ke itemMastery + antrean Recall + statistik aktivitas.
 *  - Ada skor/total  -> jawaban bernilai: recordItemAttempt (akurasi, streak, SRS).
 *  - Flashcard tanpa skor -> latihan ringan: recordItemInteraction('flashcard'); BUKAN attempt, SRS tidak bergerak.
 */
export function applyStudyToStats(prev: PlayerStats, c: StudyCompletion, now: Date = new Date()): PlayerStats {
  const { moduleId, itemId, score, total, interaction } = c;
  const isAggregate = isSessionAggregateId(moduleId, itemId);
  let updatedMastery = prev.itemMastery || {};
  let updatedRecallQueue = prev.recallQueue || [];

  if (itemId && !isAggregate) {
    const cat = moduleId === 'boss' ? 'bunpou' : moduleId;
    const currentItem = prev.itemMastery ? prev.itemMastery[itemId] : undefined;
    let record = currentItem;
    if (score !== undefined && total !== undefined) {
      const isContextual = moduleId === 'dokkai' || moduleId === 'boss';
      record = recordItemAttempt(
        currentItem, itemId, cat as 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
        score, total,
        c.detectedErrors && c.detectedErrors.length > 0 ? c.detectedErrors : undefined,
        isContextual, interaction, moduleId
      );
    } else if (interaction === 'flashcard') {
      record = recordItemInteraction(
        currentItem, itemId, cat as 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
        'flashcard', true, moduleId
      );
    }
    if (record && record !== currentItem) {
      updatedMastery = { ...updatedMastery, [itemId]: record };
      try {
        updatedRecallQueue = buildSmartRecallQueue(updatedMastery);
      } catch (e) {
        console.warn('Failed to update recall queue', e);
      }
    }
  }

  let next: PlayerStats = { ...prev, itemMastery: updatedMastery, recallQueue: updatedRecallQueue };

  const effectiveId = itemId || `study_${moduleId}_${Date.now()}`;
  if (interaction === 'flashcard') next = recordStudyActivity(next, 'flashcards', effectiveId);
  else if (interaction === 'writing' || moduleId === 'kanji') next = recordStudyActivity(next, 'kanjiWriting', effectiveId);
  else if (moduleId === 'kotoba') next = recordStudyActivity(next, 'flashcards', effectiveId);
  else if (moduleId === 'boss') next = recordStudyActivity(next, 'bossBattles', effectiveId);
  else if (moduleId === 'questions') next = recordStudyActivity(next, 'questions', effectiveId, total || 1);
  else if (moduleId === 'tryOuts') next = recordStudyActivity(next, 'tryOuts', effectiveId, 1);
  else next = recordStudyActivity(next, moduleId as 'bunpou' | 'dokkai' | 'choukai', effectiveId);

  // Total soal yang dijawab (hanya untuk sesi kuis bernilai)
  if (total && total > 1 && moduleId !== 'kanji' && moduleId !== 'kotoba' && interaction !== 'writing' && interaction !== 'flashcard') {
    next = recordStudyActivity(next, 'questions', effectiveId, total);
  }
  // Hasil belajar nyata menandai hari ini aktif (streak), walau EXP-nya ditolak batas harian.
  return touchActiveDay(next, localDayKey(now));
}
