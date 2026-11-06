import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { lazyWithRetry as lazy } from '../utils/lazyWithRetry';
import { ModuleBoundary } from '../components/common/ModuleBoundary';
import {
  BASIC_ENTITLEMENT, canAccessLevel as canAccessLevelPure, entitlementFromCache, FEATURE_TIER, tierAtLeast,
  requiredTierForTowerFloor, requiredTierForLevel, type AccessTier, type CachedEntitlement, type Entitlement, type GatedFeature,
} from '../utils/access';
import { fetchEntitlement } from '../lib/billing';
import { safeGetItem, safeSetItem } from '../utils/storage';

const UpgradeModal = lazy(() => import('../components/billing/UpgradeModal').then(m => ({ default: m.UpgradeModal })));
const AdminPaymentsModal = lazy(() => import('../components/billing/AdminPaymentsModal').then(m => ({ default: m.AdminPaymentsModal })));

const CACHE_KEY = 'sevnquest_entitlement_cache';
const REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;

export interface UpgradeRequest {
  /** Tier minimum yang dibutuhkan materi/fitur yang barusan dicoba. */
  requiredTier?: AccessTier;
  /** Nama materi/fitur, ditampilkan di modal ("N3", "Deck AI", "Lantai 61"). */
  label?: string;
  /** Tab awal modal. */
  tab?: 'access' | 'donor';
}

interface EntitlementContextValue {
  entitlement: Entitlement;
  /** true sampai entitlement pertama (cache atau server) siap. */
  loading: boolean;
  refresh: (force?: boolean) => Promise<void>;
  canAccessLevel: (level: string | null | undefined) => boolean;
  canAccessTier: (tier: AccessTier) => boolean;
  canAccessTowerFloor: (floor: number) => boolean;
  canUseFeature: (feature: GatedFeature) => boolean;
  /** Buka modal Upgrade. Mengembalikan false supaya bisa dipakai sebagai guard: `if (!guard()) return`. */
  openUpgrade: (req?: UpgradeRequest) => false;
  /** Cek level; bila terkunci, buka modal Upgrade dan kembalikan false. */
  guardLevel: (level: string | null | undefined, label?: string) => boolean;
  guardTier: (tier: AccessTier, label?: string) => boolean;
  guardFeature: (feature: GatedFeature, label?: string) => boolean;
  openAdmin: () => void;
}

const noopFalse = () => false as const;

const EntitlementContext = createContext<EntitlementContextValue>({
  entitlement: BASIC_ENTITLEMENT,
  loading: false,
  refresh: async () => {},
  canAccessLevel: level => canAccessLevelPure('basic', level),
  canAccessTier: tier => tier === 'basic',
  canAccessTowerFloor: floor => requiredTierForTowerFloor(floor) === 'basic',
  canUseFeature: () => false,
  openUpgrade: noopFalse,
  guardLevel: level => canAccessLevelPure('basic', level),
  guardTier: tier => tier === 'basic',
  guardFeature: () => false,
  openAdmin: () => {},
});

function readCache(): CachedEntitlement | null {
  const raw = safeGetItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedEntitlement;
  } catch {
    return null;
  }
}

interface ProviderProps {
  userId: string | null | undefined;
  isAuthenticated: boolean;
  soundEnabled?: boolean;
  children: ReactNode;
}

export function EntitlementProvider({ userId, isAuthenticated, soundEnabled = true, children }: ProviderProps) {
  const [entitlement, setEntitlement] = useState<Entitlement>(() => entitlementFromCache(readCache(), userId));
  const [loading, setLoading] = useState(true);
  const [upgradeRequest, setUpgradeRequest] = useState<UpgradeRequest | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (!isAuthenticated || !userId) {
      setEntitlement({ ...BASIC_ENTITLEMENT });
      setLoading(false);
      return;
    }
    if (!force && Date.now() - lastFetchRef.current < REFRESH_MIN_INTERVAL_MS) return;
    lastFetchRef.current = Date.now();
    try {
      const fresh = await fetchEntitlement();
      setEntitlement(fresh);
      safeSetItem(CACHE_KEY, JSON.stringify({ userId, fetchedAt: Date.now(), entitlement: fresh } satisfies CachedEntitlement));
    } catch (err) {
      // Offline / server bermasalah: pakai cache (maks. 7 hari), selain itu Basic.
      console.warn('[entitlement] gagal memuat, memakai cache:', err);
      setEntitlement(entitlementFromCache(readCache(), userId));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    setEntitlement(entitlementFromCache(readCache(), userId));
    void refresh(true);
  }, [refresh, userId]);

  // Muat ulang saat app kembali dibuka (misal setelah pembayaran disetujui admin).
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const value = useMemo<EntitlementContextValue>(() => {
    const tier = entitlement.accessTier;
    const openUpgrade = (req?: UpgradeRequest) => {
      setUpgradeRequest(req || {});
      return false as const;
    };
    const canAccessTier = (t: AccessTier) => tierAtLeast(tier, t);
    return {
      entitlement,
      loading,
      refresh,
      canAccessLevel: level => canAccessLevelPure(tier, level),
      canAccessTier,
      canAccessTowerFloor: floor => canAccessTier(requiredTierForTowerFloor(floor)),
      canUseFeature: f => canAccessTier(FEATURE_TIER[f]),
      openUpgrade,
      guardLevel: (level, label) => {
        if (canAccessLevelPure(tier, level)) return true;
        return openUpgrade({ requiredTier: requiredTierForLevel(level), label: label || (level ? String(level) : undefined) });
      },
      guardTier: (t, label) => (canAccessTier(t) ? true : openUpgrade({ requiredTier: t, label })),
      guardFeature: (f, label) => (canAccessTier(FEATURE_TIER[f]) ? true : openUpgrade({ requiredTier: FEATURE_TIER[f], label })),
      openAdmin: () => setAdminOpen(true),
    };
  }, [entitlement, loading, refresh]);

  return (
    <EntitlementContext.Provider value={value}>
      {children}
      {upgradeRequest && (
        <ModuleBoundary label="Upgrade" onReset={() => setUpgradeRequest(null)}>
          <UpgradeModal
            request={upgradeRequest}
            userId={userId || null}
            entitlement={entitlement}
            soundEnabled={soundEnabled}
            onClose={() => setUpgradeRequest(null)}
            onChanged={() => refresh(true)}
          />
        </ModuleBoundary>
      )}
      {adminOpen && entitlement.isAdmin && (
        <ModuleBoundary label="Admin Pembayaran" onReset={() => setAdminOpen(false)}>
          <AdminPaymentsModal onClose={() => setAdminOpen(false)} soundEnabled={soundEnabled} />
        </ModuleBoundary>
      )}
    </EntitlementContext.Provider>
  );
}

export function useAccess(): EntitlementContextValue {
  return useContext(EntitlementContext);
}
