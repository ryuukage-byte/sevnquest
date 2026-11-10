import { STORAGE_KEY_DRAGON } from './storageKeys';

/**
 * Status Naga Pemandu. Sengaja terpisah dari PlayerStats: murni kosmetik, tidak memengaruhi
 * EXP, mastery, misi, atau sinkron cloud.
 */
export interface DragonState {
  /** ISO waktu menetas; null = masih telur. */
  hatchedAt: string | null;
  /** Indeks tier terakhir yang sudah dilihat pemain (untuk memicu animasi evolusi sekali). */
  lastSeenTier: number;
  /** Naga dikecilkan ke tepi layar. */
  minimized: boolean;
}

export const DEFAULT_DRAGON_STATE: DragonState = { hatchedAt: null, lastSeenTier: 0, minimized: false };

export function loadDragonState(): DragonState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_DRAGON) || 'null');
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_DRAGON_STATE };
    return {
      hatchedAt: typeof raw.hatchedAt === 'string' ? raw.hatchedAt : null,
      lastSeenTier: Number.isInteger(raw.lastSeenTier) && raw.lastSeenTier >= 0 ? raw.lastSeenTier : 0,
      minimized: raw.minimized === true,
    };
  } catch {
    return { ...DEFAULT_DRAGON_STATE };
  }
}

export function saveDragonState(state: DragonState): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRAGON, JSON.stringify(state));
  } catch {
    /* penyimpanan penuh / mode privat: tidak kritis */
  }
}
