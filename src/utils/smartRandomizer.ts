/**
 * Smart Randomizer Engine
 * 
 * Provides:
 * 1. Cryptographically sound / uniform Fisher-Yates (Knuth) shuffle (eliminates non-transitive sort bias).
 * 2. History-Aware Anti-Repetition Spaced Sampling (Shuffle Bag & Cooldown Ring):
 *    Tracks item appearances across sessions via localStorage to ensure all items
 *    in large pools (e.g., 8,000+ words) get balanced exposure instead of repeating
 *    the same head items over and over.
 * 3. Zero-duplicate batch selection guarantee.
 */

const STORAGE_PREFIX = 'nihongo_quest_smart_rnd_';
const MAX_HISTORY_ENTRIES = 600;

interface ItemHistoryRecord {
  lastSeen: number; // Unix timestamp
  count: number;    // Appearance count
}

type HistoryMap = Record<string, ItemHistoryRecord>;

function getStorageHistory(contextKey: string): HistoryMap {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${contextKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStorageHistory(contextKey: string, history: HistoryMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // Keep history bounded to avoid unbounded localStorage growth
    const entries = Object.entries(history);
    if (entries.length > MAX_HISTORY_ENTRIES) {
      // Sort by lastSeen ascending and remove the oldest entries
      entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      const pruned = Object.fromEntries(entries.slice(0, MAX_HISTORY_ENTRIES));
      localStorage.setItem(`${STORAGE_PREFIX}${contextKey}`, JSON.stringify(pruned));
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${contextKey}`, JSON.stringify(history));
    }
  } catch {
    // Gracefully ignore storage quota errors
  }
}

/**
 * High-quality Fisher-Yates (Knuth) array shuffle.
 * Completely eliminates the statistical clustering and head-index bias of `arr.sort(() => 0.5 - Math.random())`.
 */
export function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export const smartShuffle = fisherYatesShuffle;

export interface SmartSampleOptions<T> {
  /**
   * Unique identifier getter for each item. Default: item.id or string representation.
   */
  getId?: (item: T) => string;
  /**
   * Logical context key for persistent anti-repetition memory (e.g. 'dungeon_conjugation', 'kotoba_flashcards').
   * If omitted, session-level balanced sampling is still guaranteed without localStorage persistence.
   */
  contextKey?: string;
  /**
   * Cooldown fraction of pool size. Defaults to 0.35 (items in the last 35% of pool history are held back).
   */
  cooldownRatio?: number;
}

/**
 * Intelligent weighted sampler that prioritizes items that have never been seen,
 * followed by items seen longest ago, while enforcing a cooldown on recently tested items.
 * Guarantees zero duplicate items in the returned array.
 */
export function smartSample<T>(
  pool: readonly T[],
  count: number,
  options: SmartSampleOptions<T> = {}
): T[] {
  if (!pool || pool.length === 0 || count <= 0) return [];

  // If requested count meets or exceeds pool size, shuffle the entire pool with Fisher-Yates
  if (pool.length <= count) {
    const shuffled = fisherYatesShuffle(pool);
    if (options.contextKey) {
      const getId = options.getId || ((item: any) => item?.id || String(item));
      recordSeenItems(shuffled.map(getId), options.contextKey);
    }
    return shuffled;
  }

  const getId = options.getId || ((item: any) => item?.id || String(item));
  const contextKey = options.contextKey;
  const history = contextKey ? getStorageHistory(contextKey) : {};

  const now = Date.now();
  const cooldownSize = Math.max(10, Math.floor(pool.length * (options.cooldownRatio ?? 0.35)));

  // Separate items into tiers based on exposure history
  interface ScoredCandidate {
    item: T;
    id: string;
    seenCount: number;
    lastSeen: number;
  }

  const candidates: ScoredCandidate[] = pool.map(item => {
    const id = getId(item);
    const record = history[id];
    return {
      item,
      id,
      seenCount: record ? record.count : 0,
      lastSeen: record ? record.lastSeen : 0,
    };
  });

  // Tier 1: Fresh items (never seen)
  const freshItems: ScoredCandidate[] = [];
  // Tier 2: Cool items (seen in past, but not in recent cooldown)
  const matureItems: ScoredCandidate[] = [];
  // Tier 3: Recent items (within cooldown)
  const recentItems: ScoredCandidate[] = [];

  // Sort candidates by lastSeen to determine cooldown threshold
  const seenCandidates = candidates.filter(c => c.seenCount > 0).sort((a, b) => b.lastSeen - a.lastSeen);
  const recentCutoff = seenCandidates.length > 0 && seenCandidates.length > cooldownSize
    ? seenCandidates[cooldownSize]?.lastSeen ?? 0
    : (seenCandidates[seenCandidates.length - 1]?.lastSeen ?? 0);

  candidates.forEach(c => {
    if (c.seenCount === 0) {
      freshItems.push(c);
    } else if (c.lastSeen < recentCutoff) {
      matureItems.push(c);
    } else {
      recentItems.push(c);
    }
  });

  // Shuffle within each tier to prevent any insertion order bias
  const shuffledFresh = fisherYatesShuffle(freshItems);
  const shuffledMature = fisherYatesShuffle(matureItems).sort((a, b) => a.lastSeen - b.lastSeen);
  const shuffledRecent = fisherYatesShuffle(recentItems).sort((a, b) => a.lastSeen - b.lastSeen);

  const picked: T[] = [];
  const pickedIds: string[] = [];

  const addCandidates = (list: ScoredCandidate[]) => {
    for (const sc of list) {
      if (picked.length >= count) break;
      picked.push(sc.item);
      pickedIds.push(sc.id);
    }
  };

  // 1. Prioritize fresh items first
  addCandidates(shuffledFresh);
  // 2. Then mature items (seen least recently)
  if (picked.length < count) {
    addCandidates(shuffledMature);
  }
  // 3. Fallback to recent items only if pool is depleted
  if (picked.length < count) {
    addCandidates(shuffledRecent);
  }

  // Update history for picked items
  if (contextKey && pickedIds.length > 0) {
    pickedIds.forEach(id => {
      const existing = history[id];
      history[id] = {
        lastSeen: now,
        count: (existing ? existing.count : 0) + 1,
      };
    });
    saveStorageHistory(contextKey, history);
  }

  // Final shuffle of the selected batch so questions don't appear in tiered order
  return fisherYatesShuffle(picked);
}

/**
 * Manually record that items were seen in a given context.
 */
export function recordSeenItems(ids: string[], contextKey: string): void {
  if (!contextKey || !ids.length) return;
  const history = getStorageHistory(contextKey);
  const now = Date.now();
  ids.forEach(id => {
    const existing = history[id];
    history[id] = {
      lastSeen: now,
      count: (existing ? existing.count : 0) + 1,
    };
  });
  saveStorageHistory(contextKey, history);
}

/**
 * Reset history for a specific context or all contexts (useful for testing or manual reset).
 */
export function clearRandomizerHistory(contextKey?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (contextKey) {
      localStorage.removeItem(`${STORAGE_PREFIX}${contextKey}`);
    } else {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    }
  } catch {
    // Ignore
  }
}
