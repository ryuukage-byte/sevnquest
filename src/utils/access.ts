// Aturan akses (docs/prd/PRD_MONETISASI.md bagian 4). Murni, tanpa React/Supabase, supaya bisa diuji.
//   Basic (gratis): kana dan N5
//   Full          : semua materi lain (N4-N1, Kaigo, SSW, campuran), Deck AI, Imersi.
//                   Dibuka lewat donasi: total bulanan >= Rp 17.000, tiap setoran lifetime, atau lifetime penuh.
// 'medium' hanya tersisa sebagai nilai lama; tidak dijual lagi.

export type AccessTier = 'basic' | 'medium' | 'full';

const TIER_RANK: Record<AccessTier, number> = { basic: 1, medium: 2, full: 3 };

export const TIER_LABEL: Record<AccessTier, string> = { basic: 'Basic', medium: 'Medium', full: 'Full' };

export function isAccessTier(v: unknown): v is AccessTier {
  return v === 'basic' || v === 'medium' || v === 'full';
}

export function tierAtLeast(have: AccessTier, need: AccessTier): boolean {
  return TIER_RANK[have] >= TIER_RANK[need];
}

/**
 * Tier minimum untuk sebuah level materi. Menerima variasi penulisan yang dipakai di data:
 * 'N5', 'n5', 'JLPT N5', 'KANA', 'Hiragana', 'Kaigo', 'SSW', 'PM', 'ALL'/'all', 'JFT', dst.
 * Level yang tidak dikenal dianggap Basic agar materi lama tidak terkunci karena salah label.
 */
export function requiredTierForLevel(level: string | null | undefined): AccessTier {
  if (!level) return 'basic';
  const v = String(level).trim().toUpperCase();
  if (!v) return 'basic';
  if (v === 'ALL' || v === 'SEMUA' || v === 'CAMPURAN' || v === 'MIXED') return 'full';
  if (/KAIGO|SSW|^PM$|MEDIS|JFT/.test(v)) return 'full';
  if (/KANA|HIRAGANA|KATAKANA/.test(v)) return 'basic';
  // Rentang campuran ("N5_N4", "N3-N2") mengikuti level tertinggi di dalamnya.
  const levels = [...v.matchAll(/N\s*([1-5])/g)].map(x => Number(x[1]));
  if (levels.length) return Math.min(...levels) === 5 ? 'basic' : 'full';
  return 'basic';
}

export function canAccessLevel(have: AccessTier, level: string | null | undefined): boolean {
  return tierAtLeast(have, requiredTierForLevel(level));
}

/** Tower: lantai 1-60 = kana dan N5 (Basic), 61-100 = N4 (Full). Lihat src/data/tower2/floors.ts. */
export const TOWER_BASIC_LAST_FLOOR = 60;

export function requiredTierForTowerFloor(floor: number): AccessTier {
  return floor <= TOWER_BASIC_LAST_FLOOR ? 'basic' : 'full';
}

/** Fitur berbasis server. */
export const FEATURE_TIER = {
  deckAi: 'full',
  immersion: 'full',
} as const satisfies Record<string, AccessTier>;

export type GatedFeature = keyof typeof FEATURE_TIER;

// ---------------------------------------------------------------------------
// Entitlement (hasil RPC get_my_entitlement) + cache offline
// ---------------------------------------------------------------------------

export interface DonationConfig {
  monthlyThreshold: number;
  monthlyMin: number;
  lifetimeUnit: number;
  lifetimeTarget: number;
  fullDays: number;
}

export const DEFAULT_DONATION_CONFIG: DonationConfig = {
  monthlyThreshold: 17000,
  monthlyMin: 5000,
  lifetimeUnit: 25000,
  lifetimeTarget: 700000,
  fullDays: 30,
};

export interface Entitlement {
  accessTier: AccessTier;
  accessExpiresAt: string | null;
  accessInGrace: boolean;
  isLifetime: boolean;
  /** Total setoran lifetime (tidak pernah reset). */
  lifetimeTotal: number;
  badgeLevel: number;
  badgeTitle: string | null;
  /** 'YYYY-MM' (WIB) bulan berjalan menurut server. */
  month: string | null;
  /** Total donasi bulanan di bulan berjalan. */
  monthTotal: number;
  /** Full bulan ini sudah dibuka lewat jalur bulanan. */
  monthUnlocked: boolean;
  config: DonationConfig;
  isAdmin: boolean;
}

export const BASIC_ENTITLEMENT: Entitlement = {
  accessTier: 'basic',
  accessExpiresAt: null,
  accessInGrace: false,
  isLifetime: false,
  lifetimeTotal: 0,
  badgeLevel: 0,
  badgeTitle: null,
  month: null,
  monthTotal: 0,
  monthUnlocked: false,
  config: DEFAULT_DONATION_CONFIG,
  isAdmin: false,
};

function num(v: unknown, fallback: number, max = 1e9): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.trunc(n)) : fallback;
}

function parseConfig(raw: unknown): DonationConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_DONATION_CONFIG;
  return {
    monthlyThreshold: num(r.monthly_threshold, d.monthlyThreshold) || d.monthlyThreshold,
    monthlyMin: num(r.monthly_min, d.monthlyMin) || d.monthlyMin,
    lifetimeUnit: num(r.lifetime_unit, d.lifetimeUnit) || d.lifetimeUnit,
    lifetimeTarget: num(r.lifetime_target, d.lifetimeTarget) || d.lifetimeTarget,
    fullDays: num(r.full_days, d.fullDays) || d.fullDays,
  };
}

/** Ubah jsonb dari RPC menjadi Entitlement; nilai aneh jatuh ke Basic. */
export function parseEntitlement(raw: unknown): Entitlement {
  if (!raw || typeof raw !== 'object') return { ...BASIC_ENTITLEMENT };
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const tier = r.access_tier === 'medium' ? 'full' : r.access_tier;
  return {
    accessTier: isAccessTier(tier) ? tier : 'basic',
    accessExpiresAt: str(r.access_expires_at),
    accessInGrace: r.access_in_grace === true,
    isLifetime: r.is_lifetime === true,
    lifetimeTotal: num(r.lifetime_total, 0),
    badgeLevel: num(r.badge_level, 0, 8),
    badgeTitle: str(r.badge_title),
    month: str(r.month),
    monthTotal: num(r.month_total, 0),
    monthUnlocked: r.month_unlocked === true,
    config: parseConfig(r.config),
    isAdmin: r.is_admin === true,
  };
}

/** Cache entitlement berlaku maksimal 7 hari tanpa koneksi (PRD 6.4). */
export const ENTITLEMENT_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedEntitlement {
  userId: string;
  fetchedAt: number;
  entitlement: Entitlement;
}

/** Entitlement dari cache bila milik user yang sama dan belum terlalu tua; selain itu Basic. */
export function entitlementFromCache(
  cached: CachedEntitlement | null | undefined,
  userId: string | null | undefined,
  now = Date.now()
): Entitlement {
  if (!cached || !userId || cached.userId !== userId) return { ...BASIC_ENTITLEMENT };
  if (!(now - cached.fetchedAt >= 0 && now - cached.fetchedAt <= ENTITLEMENT_CACHE_MAX_AGE_MS)) {
    return { ...BASIC_ENTITLEMENT };
  }
  const e = parseEntitlement(toRaw(cached.entitlement));
  // Langganan yang kedaluwarsa (lewat masa tenggang 3 hari) saat offline tetap turun ke Basic.
  if (!e.isLifetime && e.accessExpiresAt) {
    const end = Date.parse(e.accessExpiresAt) + 3 * 24 * 60 * 60 * 1000;
    if (Number.isFinite(end) && end < now) return { ...e, accessTier: 'basic' };
  }
  return e;
}

function toRaw(e: Entitlement): Record<string, unknown> {
  return {
    access_tier: e.accessTier,
    access_expires_at: e.accessExpiresAt,
    access_in_grace: e.accessInGrace,
    is_lifetime: e.isLifetime,
    lifetime_total: e.lifetimeTotal,
    badge_level: e.badgeLevel,
    badge_title: e.badgeTitle,
    month: e.month,
    month_total: e.monthTotal,
    month_unlocked: e.monthUnlocked,
    config: {
      monthly_threshold: e.config.monthlyThreshold,
      monthly_min: e.config.monthlyMin,
      lifetime_unit: e.config.lifetimeUnit,
      lifetime_target: e.config.lifetimeTarget,
      full_days: e.config.fullDays,
    },
    is_admin: e.isAdmin,
  };
}

/** Hari tersisa sebelum kedaluwarsa (bisa negatif saat masa tenggang); null bila tidak ada tanggal. */
export function daysUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - now) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------
// Donasi: badge permanen dan hitungan "kurang Rp X lagi"
// ---------------------------------------------------------------------------

export interface Badge {
  level: number;
  title: string;
  kanji: string;
  minTotal: number;
}

/** Cermin badge_for() di database. Level 8 (Eien) = Full selamanya. */
export const BADGES: Badge[] = [
  { level: 1, title: 'Sakura', kanji: '桜', minTotal: 25000 },
  { level: 2, title: 'Ume', kanji: '梅', minTotal: 50000 },
  { level: 3, title: 'Take', kanji: '竹', minTotal: 100000 },
  { level: 4, title: 'Matsu', kanji: '松', minTotal: 200000 },
  { level: 5, title: 'Tsuki', kanji: '月', minTotal: 300000 },
  { level: 6, title: 'Taiyou', kanji: '太陽', minTotal: 450000 },
  { level: 7, title: 'Fuji', kanji: '富士', minTotal: 600000 },
  { level: 8, title: 'Eien', kanji: '永遠', minTotal: 700000 },
];

export function badgeForTotal(total: number): Badge | null {
  let best: Badge | null = null;
  for (const b of BADGES) if (total >= b.minTotal) best = b;
  return best;
}

export function nextBadge(total: number): Badge | null {
  return BADGES.find(b => total < b.minTotal) ?? null;
}

/** Sisa donasi bulan ini agar Full 30 hari terbuka (0 bila sudah terbuka). */
export function monthlyRemaining(e: Pick<Entitlement, 'monthTotal' | 'monthUnlocked' | 'config'>): number {
  if (e.monthUnlocked) return 0;
  return Math.max(0, e.config.monthlyThreshold - e.monthTotal);
}

/** Jumlah setoran lifetime yang masih bisa dibuat sampai target. */
export function lifetimeUnitsLeft(e: Pick<Entitlement, 'lifetimeTotal' | 'isLifetime' | 'config'>): number {
  if (e.isLifetime) return 0;
  return Math.max(0, Math.floor((e.config.lifetimeTarget - e.lifetimeTotal) / e.config.lifetimeUnit));
}

export function planLabel(tierCode: string, baseAmount: number): string {
  if (tierCode === 'monthly') return `Donasi bulanan ${formatIdr(baseAmount)}`;
  if (tierCode === 'lifetime_unit') return `Setoran lifetime ${formatIdr(baseAmount)}`;
  return `${tierCode} ${formatIdr(baseAmount)}`;
}

export function formatIdr(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

// ---------------------------------------------------------------------------
// Jatah harian fitur untuk akses Gratis (Bedah Soal). Disimpan lokal (gating lunak).
// Membuka ulang soal yang sama di hari yang sama tidak memakai jatah lagi.
// ---------------------------------------------------------------------------

/** Bedah Soal gratis per hari; Full tanpa batas. */
export const FREE_DAILY_INSIGHTS = 3;

export interface DailyAllowance {
  day: string;
  ids: string[];
}

export function parseAllowance(raw: string | null, today: string): DailyAllowance {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<DailyAllowance>) : null;
    if (v && v.day === today && Array.isArray(v.ids)) return { day: today, ids: v.ids.filter(x => typeof x === 'string').slice(0, 100) };
  } catch {
    /* rusak: mulai ulang */
  }
  return { day: today, ids: [] };
}

/** Coba pakai satu jatah untuk `id`. `allowed` false bila jatah habis dan id belum pernah dibuka hari ini. */
export function consumeDailyAllowance(
  current: DailyAllowance,
  id: string,
  limit: number
): { allowed: boolean; next: DailyAllowance; remaining: number } {
  if (current.ids.includes(id)) {
    return { allowed: true, next: current, remaining: Math.max(0, limit - current.ids.length) };
  }
  if (current.ids.length >= limit) return { allowed: false, next: current, remaining: 0 };
  const next = { day: current.day, ids: [...current.ids, id] };
  return { allowed: true, next, remaining: Math.max(0, limit - next.ids.length) };
}
