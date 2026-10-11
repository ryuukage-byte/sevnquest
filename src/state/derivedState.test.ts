import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlayerStats } from '../types/rpg';
import { recordItemAttempt } from '../utils/mastery';
import { refreshRecallQueue } from './derivedState';

function statsWith(itemMastery: PlayerStats['itemMastery']): PlayerStats {
  return { itemMastery, recallQueue: [] } as unknown as PlayerStats;
}

test('refreshRecallQueue mengisi antrean dari itemMastery yang sudah ada', () => {
  const record = recordItemAttempt(undefined, 'kanji_test_item', 'kanji', 4, 7);
  const stats = statsWith({ [record.itemId]: record });

  const refreshed = refreshRecallQueue(stats);

  assert.ok(refreshed.recallQueue && refreshed.recallQueue.length > 0);
  assert.equal(refreshed.recallQueue?.[0].itemId, record.itemId);
});

test('refreshRecallQueue mengembalikan objek yang sama bila antrean tidak berubah', () => {
  const record = recordItemAttempt(undefined, 'kanji_test_item', 'kanji', 4, 7);
  const once = refreshRecallQueue(statsWith({ [record.itemId]: record }));

  assert.equal(refreshRecallQueue(once), once);
});
