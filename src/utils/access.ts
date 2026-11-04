// Aturan akses tier (docs/prd/PRD_MONETISASI.md bagian 4). Murni, tanpa React/Supabase, supaya bisa diuji.
//   Basic  (gratis): kana dan N5
//   Medium         : + N4, N3
//   Full           : + N2, N1, Kaigo, SSW, materi campuran semua level, Deck AI, Imersi

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
  if (/KAIGO|SSW|^PM$|MEDIS/.test(v)) return 'full';
  if (/JFT/.test(v)) return 'medium'; // JFT-Basic setara A2 (sekitar N4)
  if (/KANA|HIRAGANA|KATAKANA/.test(v)) return 'basic';
  // Rentang campuran ("N5_N4", "N3-N2") mengikuti level tertinggi di dalamnya.
  const levels = [...v.matchAll(/N\s*([1-5])/g)].map(x => Number(x[1]));
  if (levels.length) {
    const n = Math.min(...levels);
    if (n === 5) return 'basic';
    if (n === 4 || n === 3) return 'medium';
    return 'full';
  }
  return 'basic';
}

export function canAccessLevel(have: AccessTier, level: string | null | undefined): boolean {
  return tierAtLeast(have, requiredTierForLevel(level));
}

/** Tower: lantai 1-60 = kana dan N5 (Basic), 61-100 = N4 (Medium). Lihat src/data/tower2/floors.ts. */
export const TOWER_BASIC_LAST_FLOOR = 60;

export function requiredTierForTowerFloor(floor: number): AccessTier {
  return floor <= TOWER_BASIC_LAST_FLOOR ? 'basic' : 'medium';
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

export interface Entitlement {
  accessTier: AccessTier;
  accessExpiresAt: string | null;
  accessInGrace: boolean;
  isLifetime: boolean;
  donorLevel: number;
  donorTitle: string | null;
  donorExpiresAt: string | null;
  donorInGrace: boolean;
  lifetimeTitle: string | null;
  isAdmin: boolean;
}

export const BASIC_ENTITLEMENT: Entitlement = {
  accessTier: 'basic',
  accessExpiresAt: null,
  accessInGrace: false,
  isLifetime: false,
  donorLevel: 0,
  donorTitle: null,
  donorExpiresAt: null,
  donorInGrace: false,
  lifetimeTitle: null,
  isAdmin: false,
};

/** Ubah jsonb dari RPC menjadi Entitlement; nilai aneh jatuh ke Basic. */
export function parseEntitlement(raw: unknown): Entitlement {
  if (!raw || typeof raw !== 'object') return { ...BASIC_ENTITLEMENT };
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const donor = Number(r.donor_level);
  return {
    accessTier: isAccessTier(r.access_tier) ? r.access_tier : 'basic',
    accessExpiresAt: str(r.access_expires_at),
    accessInGrace: r.access_in_grace === true,
    isLifetime: r.is_lifetime === true,
    donorLevel: Number.isFinite(donor) ? Math.max(0, Math.min(7, Math.trunc(donor))) : 0,
    donorTitle: str(r.donor_title),
    donorExpiresAt: str(r.donor_expires_at),
    donorInGrace: r.donor_in_grace === true,
    lifetimeTitle: str(r.lifetime_title),
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
    donor_level: e.donorLevel,
    donor_title: e.donorTitle,
    donor_expires_at: e.donorExpiresAt,
    donor_in_grace: e.donorInGrace,
    lifetime_title: e.lifetimeTitle,
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
// Katalog paket (cermin tabel subscription_prices; server tetap sumber kebenaran harga)
// ---------------------------------------------------------------------------

export interface PlanOption {
  tierCode: string;
  periodMonths: number; // 0 = sekali bayar
  priceIdr: number;
  label: string;
  title?: string;
}

export const ACCESS_PLANS: PlanOption[] = [
  { tierCode: 'medium', periodMonths: 1, priceIdr: 15000, label: 'Medium 1 bulan' },
  { tierCode: 'medium', periodMonths: 3, priceIdr: 42000, label: 'Medium 3 bulan' },
  { tierCode: 'medium', periodMonths: 12, priceIdr: 150000, label: 'Medium 12 bulan' },
  { tierCode: 'full', periodMonths: 1, priceIdr: 35000, label: 'Full 1 bulan' },
  { tierCode: 'full', periodMonths: 3, priceIdr: 99000, label: 'Full 3 bulan' },
  { tierCode: 'full', periodMonths: 12, priceIdr: 350000, label: 'Full 12 bulan' },
];

export const DONOR_PLANS: PlanOption[] = [
  { tierCode: 'd1', periodMonths: 1, priceIdr: 25000, label: 'D1', title: 'Sakura' },
  { tierCode: 'd2', periodMonths: 1, priceIdr: 50000, label: 'D2', title: 'Ume' },
  { tierCode: 'd3', periodMonths: 1, priceIdr: 75000, label: 'D3', title: 'Take' },
  { tierCode: 'd4', periodMonths: 1, priceIdr: 100000, label: 'D4', title: 'Matsu' },
  { tierCode: 'd5', periodMonths: 1, priceIdr: 150000, label: 'D5', title: 'Tsuki' },
  { tierCode: 'd6', periodMonths: 1, priceIdr: 250000, label: 'D6', title: 'Taiyou' },
  { tierCode: 'd7', periodMonths: 1, priceIdr: 500000, label: 'D7', title: 'Fuji' },
];

export const LIFETIME_PLAN: PlanOption = {
  tierCode: 'lifetime', periodMonths: 0, priceIdr: 700000, label: 'Lifetime', title: 'Eien',
};

export const DONOR_BENEFITS: string[] = [
  'Badge donatur, nama di papan donatur',
  '+ Frame avatar khusus',
  '+ Voting topik konten berikutnya',
  '+ Nama tampil di halaman utama',
  '+ Prioritas antrian request konten',
  '+ Sesi feedback 1-on-1 per bulan',
  '+ Nama di kredit app',
];

export function planLabel(tierCode: string, periodMonths: number): string {
  const all = [...ACCESS_PLANS, ...DONOR_PLANS, LIFETIME_PLAN];
  const p = all.find(x => x.tierCode === tierCode && x.periodMonths === periodMonths);
  if (!p) return `${tierCode} ${periodMonths} bln`;
  if (p.tierCode.startsWith('d')) return `Donatur ${p.label} ${p.title} (1 bulan)`;
  if (p.tierCode === 'lifetime') return `Lifetime (title ${p.title})`;
  return p.label;
}

export function formatIdr(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
