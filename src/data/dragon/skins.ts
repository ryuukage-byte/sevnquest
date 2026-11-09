/**
 * Gaya (skin) Naga Pemandu yang menyelaraskan naga dengan identitas visual SevnQuest:
 * logo kompas berbilah perak yang dipahat (bidang terang/gelap), navy #12151d, aksen emas #f0be52,
 * indigo, merah hanko, ikon ukiran tinta, dan avatar pixel art ksatria.
 *
 * finish:
 *  - metal   : bidang dipahat dua nada (terang/gelap) seperti bilah logo.
 *  - lacquer : pernis mengilap dengan pinggiran emas (urushi).
 *  - ink     : kertas washi + garis tinta sumi bergaya ukiran (sama seperti ikon navigasi).
 *  - pixel   : versi logam yang dirender pixel art, senada dengan avatar karakter.
 */
import type { DragonPalette } from './tiers';

export type DragonFinish = 'metal' | 'lacquer' | 'ink' | 'pixel';

export interface DragonSkinPalette extends DragonPalette {
  /** Sisi gelap tanduk (bidang tak terkena cahaya). */
  hornShade: string;
  /** Warna pipi; null = tanpa rona. */
  cheek: string | null;
  /** Warna garis tepi aksen (pinggiran emas pernis); default = outline. */
  trim?: string;
}

export interface DragonSkin {
  id: string;
  name: string;
  /** Satu kalimat: dari mana gaya ini diambil. */
  inspiration: string;
  finish: DragonFinish;
  palette: DragonSkinPalette;
}

export const DRAGON_SKINS: DragonSkin[] = [
  {
    id: 'perak-kompas',
    name: 'Perak Kompas',
    inspiration: 'Bilah perak logo SevnQuest: bidang dipahat terang/gelap, mata emas.',
    finish: 'metal',
    palette: {
      body: '#e3e6eb', bodyShade: '#8a929e', belly: '#f4f5f7', wing: '#5d6573', wingMembrane: '#c3c9d2',
      horn: '#f4f5f7', hornShade: '#9aa2ad', eye: '#f0be52', outline: '#141823', glow: '#c3c9d2', cheek: null,
    },
  },
  {
    id: 'emas-tempa',
    name: 'Emas Tempa',
    inspiration: 'Aksen emas UI SevnQuest, ditempa seperti medali dengan bidang dipahat.',
    finish: 'metal',
    palette: {
      body: '#f6d27a', bodyShade: '#a97c16', belly: '#fdeec4', wing: '#7a5a0e', wingMembrane: '#e8bd55',
      horn: '#fff4d1', hornShade: '#c49a33', eye: '#12151d', outline: '#2e2006', glow: '#f0be52', cheek: null,
    },
  },
  {
    id: 'indigo-aizome',
    name: 'Indigo Aizome',
    inspiration: 'Indigo tema malam SevnQuest dengan tanduk perak dan mata emas.',
    finish: 'metal',
    palette: {
      body: '#7d9fd6', bodyShade: '#2c4677', belly: '#d3def1', wing: '#22375f', wingMembrane: '#6f93cf',
      horn: '#eef0f3', hornShade: '#9aa2ad', eye: '#f0be52', outline: '#0c1220', glow: '#6f93cf', cheek: null,
    },
  },
  {
    id: 'obsidian-ksatria',
    name: 'Obsidian Ksatria',
    inspiration: 'Zirah hitam-ungu-emas avatar ksatria SevnQuest.',
    finish: 'metal',
    palette: {
      body: '#4a4f5e', bodyShade: '#16181f', belly: '#7a62a8', wing: '#231d2e', wingMembrane: '#5c4785',
      horn: '#f6d27a', hornShade: '#a97c16', eye: '#f0be52', outline: '#07080b', glow: '#f0be52', cheek: null,
    },
  },
  {
    id: 'pernis-hanko',
    name: 'Pernis Hanko',
    inspiration: 'Merah hanko SevnQuest sebagai pernis urushi, berpinggir emas.',
    finish: 'lacquer',
    palette: {
      body: '#e2555b', bodyShade: '#7e1d23', belly: '#f6e3c3', wing: '#6a161b', wingMembrane: '#c23b42',
      horn: '#f6d27a', hornShade: '#a97c16', eye: '#1c0709', outline: '#2a080b', glow: '#f0be52', cheek: null, trim: '#d9a54a',
    },
  },
  {
    id: 'tinta-sumi',
    name: 'Tinta Sumi',
    inspiration: 'Gaya ukiran tinta ikon navigasi SevnQuest di atas kertas washi.',
    finish: 'ink',
    palette: {
      body: '#efe6d2', bodyShade: '#d6c8a8', belly: '#f8f2e4', wing: '#2a2622', wingMembrane: '#d6c8a8',
      horn: '#2a2622', hornShade: '#2a2622', eye: '#1c1a17', outline: '#1c1a17', glow: '#f0be52', cheek: '#a82025',
    },
  },
  {
    id: 'pixel-ksatria',
    name: 'Pixel Ksatria',
    inspiration: 'Pixel art senada avatar karakter SevnQuest: baja, navy, dan emas.',
    finish: 'pixel',
    palette: {
      body: '#c9ced6', bodyShade: '#5d6573', belly: '#eef0f3', wing: '#2b3242', wingMembrane: '#7d8796',
      horn: '#f6d27a', hornShade: '#a97c16', eye: '#f0be52', outline: '#0b0d12', glow: '#f0be52', cheek: null,
    },
  },
];

/**
 * Nada tinta per tier untuk gaya Tinta Sumi (indeks = DragonTier.index). Tier tetap satu gaya;
 * yang berubah adalah warna lapisan tinta (wash), iris, tanduk, dan aksen.
 */
export interface InkTone {
  /** Warna lapisan tinta di sayap, jambul ekor, bayangan. */
  wash: string;
  /** Warna iris mata. */
  iris: string;
  /** Warna tanduk & duri. */
  horn: string;
  /** Aksen kedua (kumis, halo, permata). */
  accent: string;
}

export const INK_TIER_TONES: InkTone[] = [
  { wash: '#4a4540', iris: '#2a2622', horn: '#2a2622', accent: '#a82025' }, // Hatchling: sumi
  { wash: '#2f4f86', iris: '#2f4f86', horn: '#2a2622', accent: '#a82025' }, // Juvenile: aizome (indigo)
  { wash: '#a82025', iris: '#7e1d23', horn: '#2a2622', accent: '#d9a54a' }, // Young: hanko
  { wash: '#5b4389', iris: '#5b4389', horn: '#2a2622', accent: '#d9a54a' }, // Adult: fuji (ungu)
  { wash: '#1f2f55', iris: '#1f2f55', horn: '#1c1a17', accent: '#d9a54a' }, // Elder: indigo tua + emas
  { wash: '#6e1a1a', iris: '#6e1a1a', horn: '#1c1a17', accent: '#d9a54a' }, // Ancient: merah tua + segel
  { wash: '#b0832a', iris: '#8a6418', horn: '#b0832a', accent: '#e8b84a' }, // Celestial: emas + ensō
];

/** Gaya naga yang aktif di aplikasi (dipilih pemilik: Tinta Sumi). */
export const ACTIVE_DRAGON_SKIN: DragonSkin = DRAGON_SKINS.find(s => s.id === 'tinta-sumi')!;
