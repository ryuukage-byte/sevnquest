import { PlayerStats, StudyStatistics } from '../types/rpg';

export type ActivityType = keyof StudyStatistics;

export const INITIAL_STUDY_STATS: StudyStatistics = {
  questions: { total: 0, uniqueIds: [] },
  flashcards: { total: 0, uniqueIds: [] },
  kanjiWriting: { total: 0, uniqueIds: [] },
  tryOuts: { total: 0, uniqueIds: [] },
  dokkai: { total: 0, uniqueIds: [] },
  choukai: { total: 0, uniqueIds: [] },
  bunpou: { total: 0, uniqueIds: [] },
  stages: { total: 0, uniqueIds: [] },
  bossBattles: { total: 0, uniqueIds: [] },
};

/**
 * Records a learning activity and updates the total vs unique counters.
 * This should be called whenever a user completes an action, not just when they open it.
 */
export function recordStudyActivity(
  stats: PlayerStats,
  type: ActivityType,
  contentId: string,
  amount: number = 1
): PlayerStats {
  const currentStats = stats.studyStats || INITIAL_STUDY_STATS;
  const targetLog = currentStats[type] || { total: 0, uniqueIds: [] };

  const isUnique = !targetLog.uniqueIds.includes(contentId);
  const updatedUniqueIds = isUnique ? [...targetLog.uniqueIds, contentId] : targetLog.uniqueIds;

  return {
    ...stats,
    studyStats: {
      ...currentStats,
      [type]: {
        total: targetLog.total + amount,
        uniqueIds: updatedUniqueIds,
      }
    }
  };
}
