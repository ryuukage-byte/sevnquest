// ==============================================================================
// NIHONGO TOWER — TOWER REGION ENGINE (STAGE 5.1)
// ==============================================================================

import { TowerArc, JLPTLevel } from '../../../types/tower';

export interface TowerRegion {
  id: string;
  startFloor: number;
  endFloor: number;
  name: string;          // Kanji / Japanese name (e.g. "森の神社")
  title: string;         // English / Indonesian title (e.g. "Forest Shrine")
  arc: TowerArc;
  jlptTier: JLPTLevel;
  environment: string;   // 'village_gate' | 'forest_shrine' | 'wind_canyon' | 'ancient_archive' | 'dragon_waterfall' | 'misty_peaks' | 'infernal_fortress' | 'moonlit_tower' | 'infinite_corridor' | 'celestial_zenith'
  bossName: string;      // The Guardian at the end of the region
  bossTitle: string;
  description: string;
  loreQuote: string;
  accentColor: string;
  bgGradient: string;
}

/**
 * 10 Thematic Regions spanning the 1,000 Floor Linguistic Journey
 */
export const TOWER_REGIONS: TowerRegion[] = [
  {
    id: 'beginning_gate',
    startFloor: 1,
    endFloor: 100,
    name: '始まりの門',
    title: 'The Beginning Gate',
    arc: TowerArc.FOUNDATION,
    jlptTier: JLPTLevel.N5,
    environment: 'village_gate',
    bossName: 'Sumi no Shugosha (墨の守護者)',
    bossTitle: 'The Ink Guardian',
    description: 'Gerbang desa kuno tempat langkah pertama menggoreskan aksara dan fondasi bahasa.',
    loreQuote: '「一歩を踏み出す者に、言葉の光が宿る。」',
    accentColor: '#3b82f6',
    bgGradient: 'from-blue-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'forest_shrine',
    startFloor: 101,
    endFloor: 200,
    name: '森の神社',
    title: 'Forest Shrine',
    arc: TowerArc.ELEMENTARY,
    jlptTier: JLPTLevel.N5,
    environment: 'forest_shrine',
    bossName: 'Tengu of the Grove (天狗)',
    bossTitle: 'Guardian of Motion Verbs',
    description: 'Kuil tersembunyi di rimbun pepohonan tempat pergerakan dan verba dasar diasah.',
    loreQuote: '「風が木々を揺らすように、言葉は心を動かす。」',
    accentColor: '#10b981',
    bgGradient: 'from-emerald-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'wind_canyon',
    startFloor: 201,
    endFloor: 300,
    name: '風の渓谷',
    title: 'Wind Canyon',
    arc: TowerArc.ELEMENTARY,
    jlptTier: JLPTLevel.N4,
    environment: 'wind_canyon',
    bossName: 'Fujin Bladesmith (風神)',
    bossTitle: 'Master of Potential & Volition',
    description: 'Ngarai berangin kencang tempat perubahan bentuk kata kerja diuji dalam badai konjugasi.',
    loreQuote: '「形を変えぬ刃は折れる。変幻自在な言葉こそ力なり。」',
    accentColor: '#06b6d4',
    bgGradient: 'from-cyan-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'ancient_archive',
    startFloor: 301,
    endFloor: 400,
    name: '宮殿の書庫',
    title: 'Ancient Archive',
    arc: TowerArc.INTERMEDIATE,
    jlptTier: JLPTLevel.N3,
    environment: 'ancient_archive',
    bossName: 'Grand Archivist Shoki (大書記官)',
    bossTitle: 'Keeper of Nuance & Context',
    description: 'Gudang naskah kuno yang menyimpan pemahaman bacaan dan kanji majemuk N3.',
    loreQuote: '「文字の奥にある真意を読め。表面だけを見る者は惑わされる。」',
    accentColor: '#8b5cf6',
    bgGradient: 'from-purple-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'dragon_waterfall',
    startFloor: 401,
    endFloor: 500,
    name: '竜神の滝',
    title: 'Dragon Waterfall',
    arc: TowerArc.INTERMEDIATE,
    jlptTier: JLPTLevel.N3,
    environment: 'dragon_waterfall',
    bossName: 'Seiryu Dragon Spirit (青龍)',
    bossTitle: 'Lord of Causative & Passive Currents',
    description: 'Arus air deras tempat aliran kalimat pasif dan kausatif mengalir bagai air bah.',
    loreQuote: '「流れに逆らうな、言葉の力に身を委ねよ。」',
    accentColor: '#0ea5e9',
    bgGradient: 'from-sky-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'misty_peaks',
    startFloor: 501,
    endFloor: 600,
    name: '霧の霊峰',
    title: 'Misty Peaks',
    arc: TowerArc.INTERMEDIATE,
    jlptTier: JLPTLevel.N3,
    environment: 'misty_peaks',
    bossName: 'Nine-Tailed Illusionist (白狐の化身)',
    bossTitle: 'Sovereign of N3 Fluency',
    description: 'Puncak berkabut tebal tempat syarat pengandaian dan ekspresi bersyarat diuji hingga tuntas.',
    loreQuote: '「真実と幻の間で、確かな言葉のみが霧を晴らす。」',
    accentColor: '#ec4899',
    bgGradient: 'from-pink-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'infernal_fortress',
    startFloor: 601,
    endFloor: 700,
    name: '紅蓮の城塞',
    title: 'Infernal Fortress',
    arc: TowerArc.ADVANCED,
    jlptTier: JLPTLevel.N2,
    environment: 'infernal_fortress',
    bossName: 'Oni Warlord (鬼将軍)',
    bossTitle: 'Commander of Complex Discourse',
    description: 'Benteng batu hitam berpijar tempat ungkapan tajam dan tata bahasa formal N2 ditempa.',
    loreQuote: '「鍛え上げられぬ言葉は、この炎の中で灰と化す。」',
    accentColor: '#f97316',
    bgGradient: 'from-orange-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'moonlit_tower',
    startFloor: 701,
    endFloor: 800,
    name: '月影の尖塔',
    title: 'Moonlit Spire',
    arc: TowerArc.ADVANCED,
    jlptTier: JLPTLevel.N2,
    environment: 'moonlit_tower',
    bossName: 'Tsukuyomi Sentinel (月読の守護兵)',
    bossTitle: 'Sovereign of N2 Mastery',
    description: 'Menara anggun bermandikan cahaya purnama tempat prosa puitis dan sastra modern berpadu.',
    loreQuote: '「静寂の中にこそ、最も深い言葉が響く。」',
    accentColor: '#a855f7',
    bgGradient: 'from-violet-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'infinite_corridor',
    startFloor: 801,
    endFloor: 900,
    name: '無限の回廊',
    title: 'Infinite Corridor',
    arc: TowerArc.MASTER,
    jlptTier: JLPTLevel.N1,
    environment: 'infinite_corridor',
    bossName: 'Chronos Sage (時の賢者)',
    bossTitle: 'Arbiter of Classical Idioms',
    description: 'Lorong nirbatas tempat peribahasa kuno dan ungkapan tingkat tinggi N1 diuji.',
    loreQuote: '「過去から未来へ、言葉は時を超えて受け継がれる。」',
    accentColor: '#eab308',
    bgGradient: 'from-amber-950 via-slate-900 to-zinc-950'
  },
  {
    id: 'celestial_zenith',
    startFloor: 901,
    endFloor: 1000,
    name: '天空の天守',
    title: 'Celestial Zenith',
    arc: TowerArc.MASTER,
    jlptTier: JLPTLevel.N1,
    environment: 'celestial_zenith',
    bossName: 'Ascended Grandmaster (昇天の武神)',
    bossTitle: 'Emperor of Total Japanese Mastery',
    description: 'Puncak tertinggi menara di atas awan tempat sintesis filosofis dan kemahiran mutlak bertahta.',
    loreQuote: '「千の階梯を越えし者よ。言葉は今、汝と一つになった。」',
    accentColor: '#e11d48',
    bgGradient: 'from-rose-950 via-slate-900 to-zinc-950'
  }
];

/**
 * Returns the corresponding region for any floor 1 - 1000
 */
export function getRegionForFloor(floor: number): TowerRegion {
  const clamped = Math.max(1, Math.min(1000, Math.floor(floor)));
  const found = TOWER_REGIONS.find(r => clamped >= r.startFloor && clamped <= r.endFloor);
  return found || TOWER_REGIONS[0];
}

/**
 * Returns all regions
 */
export function getAllRegions(): TowerRegion[] {
  return [...TOWER_REGIONS];
}
