import type { WritingRewardResult } from './rewards';

type StudyCompleteFn = (
  moduleId: 'kanji',
  expGained: number,
  goldGained: number,
  itemId?: string,
  score?: number,
  total?: number,
  interactionType?: 'writing'
) => void;

interface Deps {
  onCompleteStudyItem?: StudyCompleteFn | ((...args: any[]) => void);
  onRewardPlayer?: (exp: number, gold: number) => void;
}

/**
 * Catat satu kali selesai menulis kanji (EXP/gold, mastery, misi) lewat SATU jalur: handleStudyComplete.
 * Dipakai oleh semua tempat yang membuka KanjiDetailModal (Library Kanji, drilldown dari Kosakata, Buku Saku),
 * supaya hasil menulis tidak hilang dan tidak terhitung ganda.
 */
export function recordKanjiWriting(
  item: { id?: string; character: string } | null | undefined,
  score: number,
  reward: WritingRewardResult | undefined,
  { onCompleteStudyItem, onRewardPlayer }: Deps
): void {
  if (!item) return;
  const exp = reward?.expGained ?? 15;
  const gold = reward?.goldGained ?? 5;
  const id = item.id || item.character;
  if (onCompleteStudyItem) {
    onCompleteStudyItem('kanji', exp, gold, id, score >= 60 ? 1 : 0, 1, 'writing');
  } else {
    onRewardPlayer?.(exp, gold);
  }
}
