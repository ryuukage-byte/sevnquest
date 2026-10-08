// ==============================================================================
// TOWER 1 — PENYIMPANAN PROGRES (localStorage)
// ==============================================================================

import { FloorClearRecord, RoomOutcome, Tower1Progress } from './types';
import { starsForAccuracy } from './graph';

export const TOWER1_STORAGE_KEY = 'nq_tower1_progress';

const EMPTY: Tower1Progress = { cleared: {} };

export function loadTower1Progress(): Tower1Progress {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TOWER1_STORAGE_KEY) : null;
    if (!raw) return { cleared: {} };
    const parsed = JSON.parse(raw);
    const cleared: Tower1Progress['cleared'] = {};
    if (parsed && typeof parsed.cleared === 'object' && parsed.cleared) {
      for (const [key, rec] of Object.entries(parsed.cleared as Record<string, any>)) {
        const id = Number(key);
        if (!Number.isInteger(id) || !rec || typeof rec.accuracy !== 'number') continue;
        cleared[id] = {
          stars: rec.stars === 3 || rec.stars === 2 ? rec.stars : 1,
          accuracy: rec.accuracy,
          clearedAt: typeof rec.clearedAt === 'string' ? rec.clearedAt : new Date(0).toISOString(),
          attempts: typeof rec.attempts === 'number' ? rec.attempts : 1
        };
      }
    }
    return { cleared };
  } catch {
    return { ...EMPTY, cleared: {} };
  }
}

export function saveTower1Progress(progress: Tower1Progress): void {
  try {
    window.localStorage.setItem(TOWER1_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* penyimpanan penuh/dikunci: progres sesi ini tetap ada di memori */
  }
}

export interface ClearResult {
  progress: Tower1Progress;
  /** true bila ini penyelesaian pertama lantai tersebut (hadiah hanya diberikan sekali). */
  firstClear: boolean;
  record: FloorClearRecord;
}

/** Mencatat penyelesaian; percobaan terbaik (akurasi tertinggi) yang disimpan. */
export function recordTower1Clear(floorId: number, accuracy: number): ClearResult {
  const current = loadTower1Progress();
  const prev = current.cleared[floorId];
  const best = prev ? Math.max(prev.accuracy, accuracy) : accuracy;
  const record: FloorClearRecord = {
    stars: starsForAccuracy(best),
    accuracy: Math.round(best),
    clearedAt: prev?.clearedAt ?? new Date().toISOString(),
    attempts: (prev?.attempts ?? 0) + 1
  };
  const progress: Tower1Progress = { cleared: { ...current.cleared, [floorId]: record } };
  saveTower1Progress(progress);
  return { progress, firstClear: !prev, record };
}

/** Gabungan dua salinan progres (mis. lokal + cloud): lantai terselesaikan = union, rekor terbaik menang. */
export function mergeTower1Progress(a?: Tower1Progress | null, b?: Tower1Progress | null): Tower1Progress {
  const cleared: Tower1Progress['cleared'] = { ...(b?.cleared ?? {}) };
  for (const [key, rec] of Object.entries(a?.cleared ?? {})) {
    const id = Number(key);
    const other = cleared[id];
    if (!other) {
      cleared[id] = rec;
      continue;
    }
    const best = rec.accuracy >= other.accuracy ? rec : other;
    cleared[id] = {
      stars: best.stars,
      accuracy: best.accuracy,
      clearedAt: rec.clearedAt < other.clearedAt ? rec.clearedAt : other.clearedAt,
      attempts: Math.max(rec.attempts, other.attempts)
    };
  }
  return { cleared };
}

// ------------------------------------------------------------------------------
// Progres Room di dalam satu lantai (agar bisa dilanjutkan setelah keluar)
// ------------------------------------------------------------------------------

const ROOMS_KEY = 'nq_tower1_rooms';
type RoomStore = Record<number, Record<string, RoomOutcome>>;

function readRooms(): RoomStore {
  try {
    const raw = window.localStorage.getItem(ROOMS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRooms(store: RoomStore): void {
  try {
    window.localStorage.setItem(ROOMS_KEY, JSON.stringify(store));
  } catch {
    /* abaikan */
  }
}

export function loadRoomOutcomes(floorId: number): Record<string, RoomOutcome> {
  return readRooms()[floorId] ?? {};
}

export function saveRoomOutcome(floorId: number, roomId: string, outcome: RoomOutcome): Record<string, RoomOutcome> {
  const store = readRooms();
  store[floorId] = { ...(store[floorId] ?? {}), [roomId]: outcome };
  writeRooms(store);
  return store[floorId];
}

export function clearRoomOutcomes(floorId: number): void {
  const store = readRooms();
  delete store[floorId];
  writeRooms(store);
}
