/**
 * Toko Pack: katalog, saldo pass, dan cache isi pack milik pengguna (docs/prd/PRD_TOKO_PACK.md bagian 7).
 * Isi pack disimpan di localStorage per akun supaya pack yang sudah dibuka tetap bisa dilatih offline.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OfficialBook } from '../types/books';
import { fetchMyOwnedPacks, fetchPackContents, fetchStoreCatalog, unlockPack as unlockPackRpc } from '../lib/store';
import { packsNeedingSync, parsePackBook, storeErrorMessage, type StoreCatalog } from '../lib/storeCore';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { useAccess } from './entitlement';

const CACHE_PREFIX = 'sevnquest_pack_cache_v1:';

interface CachedPack {
  contentVersion: number;
  book: OfficialBook;
}
type PackCache = Record<string, CachedPack | undefined>;

function readCache(userId: string | null): PackCache {
  if (!userId) return {};
  const raw = safeGetItem(CACHE_PREFIX + userId);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, { contentVersion?: number; book?: unknown }>;
    const out: PackCache = {};
    for (const [id, v] of Object.entries(parsed || {})) {
      const book = parsePackBook(v?.book, id);
      if (book) out[id] = { contentVersion: Number(v?.contentVersion) || 0, book };
    }
    return out;
  } catch {
    return {};
  }
}

function writeCache(userId: string | null, cache: PackCache) {
  if (!userId) return;
  safeSetItem(CACHE_PREFIX + userId, JSON.stringify(cache));
}

export interface StoreState {
  catalog: StoreCatalog | null;
  loading: boolean;
  error: string | null;
  /** Pack yang sudah dibuka (dari cache), urut sesuai katalog bila tersedia. */
  ownedBooks: OfficialBook[];
  refresh: () => Promise<void>;
  /** Buka pack; melempar Error dengan pesan Indonesia bila gagal. */
  unlock: (packId: string) => Promise<OfficialBook>;
}

/** Hanya aktif bila `enabled` (Toko tampil): tanpa itu tidak ada panggilan ke server. */
export function useStore(enabled: boolean): StoreState {
  const { userId, refresh: refreshEntitlement } = useAccess();
  const [cache, setCache] = useState<PackCache>(() => readCache(userId));
  const [catalog, setCatalog] = useState<StoreCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  useEffect(() => {
    setCache(readCache(userId));
    setCatalog(null);
  }, [userId]);

  const saveToCache = useCallback((packId: string, entry: CachedPack) => {
    setCache(prev => {
      const next = { ...prev, [packId]: entry };
      writeCache(userId, next);
      return next;
    });
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const [cat, owned] = await Promise.all([fetchStoreCatalog(), fetchMyOwnedPacks()]);
      setCatalog(cat);
      for (const packId of packsNeedingSync(owned, cacheRef.current)) {
        try {
          const c = await fetchPackContents(packId);
          saveToCache(packId, { contentVersion: c.contentVersion, book: c.book });
        } catch (err) {
          console.warn('[store] gagal mengunduh isi pack', packId, err);
        }
      }
    } catch (err) {
      setError(storeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, userId, saveToCache]);

  useEffect(() => { void refresh(); }, [refresh]);

  const unlock = useCallback(async (packId: string) => {
    try {
      const { contents, pass } = await unlockPackRpc(packId);
      saveToCache(packId, { contentVersion: contents.contentVersion, book: contents.book });
      setCatalog(prev => prev && {
        pass,
        packs: prev.packs.map(p => (p.id === packId ? { ...p, owned: true, unlockedAt: new Date().toISOString() } : p)),
      });
      void refreshEntitlement(true);
      return contents.book;
    } catch (err) {
      // Mis. sudah dimiliki di perangkat lain: muat ulang supaya tampilan sesuai server.
      void refresh();
      throw new Error(storeErrorMessage(err));
    }
  }, [saveToCache, refresh, refreshEntitlement]);

  const ownedBooks = useMemo(() => {
    const order = new Map((catalog?.packs ?? []).map((p, i) => [p.id, i]));
    return Object.entries(cache)
      .filter((e): e is [string, CachedPack] => !!e[1])
      .sort(([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b))
      .map(([, v]) => v.book);
  }, [cache, catalog]);

  return { catalog, loading, error, ownedBooks, refresh, unlock };
}
