// ==============================================================================
// NIHONGO TOWER — FLOOR NARRATIVE ENGINE (STAGE 5.2)
// ==============================================================================

import { TowerFloorBlueprint } from '../../../types/tower';
import { getRegionForFloor } from './towerRegions';

export interface FloorNarrative {
  floor: number;
  japaneseIntro: string;
  indonesianIntro: string;
  objective: string;
  npcName: string;
  npcRole: string;
  victoryMessage: string;
  failureMessage: string;
}

const NPC_ROSTER = [
  { name: 'Sensei Ryu (竜先生)', role: 'Master Kaligrafi' },
  { name: 'Kitsune Kohaku (狐の琥珀)', role: 'Roh Rubah Penjaga' },
  { name: 'Sumire (墨鈴)', role: 'Gadis Tinta Abadi' },
  { name: 'Monk Genkai (玄海僧正)', role: 'Petapa Menara' },
  { name: 'Kenshi Hayate (疾風の剣士)', role: 'Pendekar Angin' }
];

/**
 * Procedurally generates authentic Japanese RPG narrative text for any floor
 */
export function generateFloorNarrative(
  floor: number,
  blueprint: TowerFloorBlueprint
): FloorNarrative {
  const region = getRegionForFloor(floor);
  const npc = NPC_ROSTER[(floor * 7) % NPC_ROSTER.length];

  // 1. Boss Floor Narrative (every 100 floors)
  if (blueprint.isBossFloor) {
    return {
      floor,
      japaneseIntro: `「よくぞここまで辿り着いた。我が名は${region.bossName}。汝の言葉の真価を見せよ！」`,
      indonesianIntro: `Gerbang raksasa bergetar terbuka. ${region.bossTitle} berdiri di tengah arena bermandikan aura kekuatan kuno. Ujian terberat lantai ${floor} dimulai.`,
      objective: `Kalahkan ${region.bossName} dalam 4 fase evaluasi komprehensif JLPT ${blueprint.jlptTarget}.`,
      npcName: region.bossName,
      npcRole: region.bossTitle,
      victoryMessage: `「見事だ...！汝の言葉は本物だ。次の階層への道は開かれた。」`,
      failureMessage: `Tekanan aura penjaga terlalu kuat. Kuatkan fondasi kosakata dan tata bahasamu sebelum menantang kembali.`
    };
  }

  // 2. Boss Preparation Floor (Floors 95-99, 195-199, etc.)
  if (blueprint.isBossPreparation) {
    const bossFloor = Math.ceil(floor / 100) * 100;
    return {
      floor,
      japaneseIntro: `「試練の門は近い。足元を固め、一切の迷いを断ち切れ。」`,
      indonesianIntro: `Udaranya semakin pekat dan bergemuruh. Kamu merasakan kehadiran ${region.bossTitle} di lantai ${bossFloor}. Konsentrasi penuh diperlukan.`,
      objective: `Sintesis mendalam kosakata dan pola tata bahasa sebelum mencapai Gerbang Bos.`,
      npcName: npc.name,
      npcRole: npc.role,
      victoryMessage: `Langkahmu semakin mantap menyongsong pertarungan besar berikutnya!`,
      failureMessage: `Jangan menyerah! Persiapan yang matang adalah kunci penakluk menara.`
    };
  }

  // 3. Checkpoint Floor Narrative (Every 10 floors)
  if (blueprint.isCheckpoint) {
    return {
      floor,
      japaneseIntro: `「旅人よ、ここに安らぎの社がある。温かい茶を飲み、息を整えよ。」`,
      indonesianIntro: `Lentera suci berpendar hangat di tengah aula batu. Tempat peristirahatan di lantai ${floor} memulihkan seluruh energimu.`,
      objective: `Selesaikan meditasi ketuntasan untuk mengamankan pos pemeriksaan permanen.`,
      npcName: 'Petapa Kuil (社の隠者)',
      npcRole: 'Penjaga Pos Istirahat',
      victoryMessage: `Pos pemeriksaan lantai ${floor} tersimpan! Hati dan energimu telah pulih sepenuhnya.`,
      failureMessage: `Hiruplah nafas dalam-dalam. Pos peristirahatan selalu menunggumu kembali.`
    };
  }

  // 4. Standard Climbing Floors
  const firstWord = blueprint.vocabulary[0]?.word || '言葉';
  const firstKanji = blueprint.kanji[0]?.kanji || '字';
  const grammarPattern = blueprint.grammar[0]?.pattern || '文法';

  return {
    floor,
    japaneseIntro: `「${region.name}の階層を進む。新たな文字『${firstKanji}』と語彙『${firstWord}』の刻印が光を放っている。」`,
    indonesianIntro: `Melangkah di lantai ${floor} wilayah ${region.title}. Tablet kuno menuntut pemahaman terhadap kanji ${firstKanji} dan pola ${grammarPattern}.`,
    objective: `Kuasai ${blueprint.rounds.length} putaran tantangan: Inskripsi, Kosakata, dan Konjugasi.`,
    npcName: npc.name,
    npcRole: npc.role,
    victoryMessage: `Lantai ${floor} berhasil ditaklukkan! Jalur menuju lantai ${floor + 1} terbuka lebar.`,
    failureMessage: `Goresan aksaramu terhenti sejenak. Pelajari kembali kelemahanmu dan bangkit lagi!`
  };
}
