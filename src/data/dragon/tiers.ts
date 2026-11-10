/**
 * Tier Naga Pemandu. Murni kosmetik + kemudahan; tidak pernah mengunci materi belajar.
 *
 * Tier diturunkan dari rank dukungan yang SUDAH dihitung server (public.mail_plan_for, dibaca klien lewat
 * useMailStatus().tierRank): 0 Free, 1 Premium, 2..8 Super Premium Lv.1..7, 9 Admin.
 * Ubah pemetaan cukup di MIN_RANK.
 */

export type DragonTierId = 'hatchling' | 'juvenile' | 'young' | 'adult' | 'elder' | 'ancient' | 'celestial';

export interface DragonPalette {
  body: string;
  bodyShade: string;
  belly: string;
  wing: string;
  wingMembrane: string;
  horn: string;
  eye: string;
  outline: string;
  /** Warna aura/halo (tier tinggi). */
  glow: string;
}

export interface DragonTier {
  id: DragonTierId;
  index: number;
  name: string;
  /** Rank dukungan minimal. */
  minRank: number;
  /** Label syarat untuk ditampilkan ke pemain. */
  requirement: string;
  palette: DragonPalette;
  /** Panjang tanduk 0..1 dan skala sayap. */
  horn: number;
  wing: number;
  perks: string[];
}

export const DRAGON_TIERS: DragonTier[] = [
  {
    id: 'hatchling', index: 0, name: 'Hatchling', minRank: 0, requirement: 'Semua pemain',
    palette: { body: '#7fc8a9', bodyShade: '#5aa98a', belly: '#f6efd2', wing: '#5aa98a', wingMembrane: '#b9e4cf', horn: '#f3e3b5', eye: '#2f6b55', outline: '#2c4a3f', glow: '#b9e4cf' },
    horn: 0.25, wing: 0.7,
    perks: ['Pemandu fitur & navigasi', 'Bantu menyiapkan deck flashcard'],
  },
  {
    id: 'juvenile', index: 1, name: 'Juvenile', minRank: 1, requirement: 'Premium',
    palette: { body: '#6fb1e0', bodyShade: '#4c8fc2', belly: '#f4efdc', wing: '#4c8fc2', wingMembrane: '#b8daf2', horn: '#f3e3b5', eye: '#244e72', outline: '#22384f', glow: '#b8daf2' },
    horn: 0.45, wing: 0.8,
    perks: ['Sisik biru laut'],
  },
  {
    id: 'young', index: 2, name: 'Young Dragon', minRank: 2, requirement: 'Super Premium Lv.1',
    palette: { body: '#e98c8c', bodyShade: '#c96a6e', belly: '#fbeedd', wing: '#c96a6e', wingMembrane: '#f6c7c2', horn: '#fff1cf', eye: '#6b2a33', outline: '#4d232a', glow: '#f6c7c2' },
    horn: 0.6, wing: 0.9,
    perks: ['Sisik merah hanko'],
  },
  {
    id: 'adult', index: 3, name: 'Adult Dragon', minRank: 3, requirement: 'Super Premium Lv.2',
    palette: { body: '#8e7cd6', bodyShade: '#6c5ab8', belly: '#f1ead9', wing: '#6c5ab8', wingMembrane: '#cdc3f0', horn: '#fbe6b0', eye: '#3a2c74', outline: '#2c2450', glow: '#cdc3f0' },
    horn: 0.75, wing: 1,
    perks: ['Sisik ungu fuji'],
  },
  {
    id: 'elder', index: 4, name: 'Elder Dragon', minRank: 5, requirement: 'Super Premium Lv.4',
    palette: { body: '#3f8f88', bodyShade: '#2d6f69', belly: '#efe4c4', wing: '#2d6f69', wingMembrane: '#9fd3cb', horn: '#f0d58c', eye: '#1d4844', outline: '#173936', glow: '#9fd3cb' },
    horn: 0.85, wing: 1.05,
    perks: ['Sisik hijau giok', 'Aura'],
  },
  {
    id: 'ancient', index: 5, name: 'Ancient Dragon', minRank: 7, requirement: 'Super Premium Lv.6',
    palette: { body: '#b5523b', bodyShade: '#8e3b28', belly: '#f3dfb7', wing: '#8e3b28', wingMembrane: '#e8a98a', horn: '#f4cf6b', eye: '#4a1a10', outline: '#3a160d', glow: '#f4cf6b' },
    horn: 1, wing: 1.1,
    perks: ['Sisik tembaga', 'Aura emas'],
  },
  {
    id: 'celestial', index: 6, name: 'Celestial Dragon', minRank: 8, requirement: 'Super Premium Lv.7',
    palette: { body: '#f2f0fa', bodyShade: '#c9c3e6', belly: '#fff8e6', wing: '#c9c3e6', wingMembrane: '#e6e1ff', horn: '#f0be52', eye: '#4b3f8f', outline: '#3d3566', glow: '#f0be52' },
    horn: 1, wing: 1.2,
    perks: ['Halo emas', 'Aura emas'],
  },
];

/** Tier naga untuk rank dukungan (admin & rank di atas 8 → Celestial). */
export function dragonTierForRank(rank: number): DragonTier {
  const r = Number.isFinite(rank) ? rank : 0;
  let tier = DRAGON_TIERS[0];
  for (const t of DRAGON_TIERS) if (r >= t.minRank) tier = t;
  return tier;
}

export const DRAGON_DEFAULT_NAME = 'Tatsu';
