// ==============================================================================
// TOWER 1 — INDEKS DATA (lantai → Room)
// ==============================================================================

import { Room, RoomSkill } from '../../engine/tower1/types';
import { FLOOR_001_ROOMS } from './content/floor001';
import { FLOOR_002_ROOMS } from './content/floor002';
import { FLOOR_003_ROOMS } from './content/floor003';
import { FLOOR_004_ROOMS } from './content/floor004';
import { FLOOR_005_ROOMS } from './content/floor005';
import { FLOOR_006_ROOMS } from './content/floor006';
import { FLOOR_007_ROOMS } from './content/floor007';
import { FLOOR_008_ROOMS } from './content/floor008';
import { FLOOR_009_ROOMS } from './content/floor009';
import { FLOOR_010_ROOMS } from './content/floor010';
import { FLOOR_011_ROOMS } from './content/floor011';
import { FLOOR_012_ROOMS } from './content/floor012';
import { FLOOR_013_ROOMS } from './content/floor013';
import { FLOOR_014_ROOMS } from './content/floor014';
import { FLOOR_015_ROOMS } from './content/floor015';
import { FLOOR_016_ROOMS } from './content/floor016';

import { TOWER1_SKILL_ORDER } from './floors';

export * from './floors';

/** Room tiap lantai Menara 1. */
export const TOWER1_ROOMS: Record<number, Room[]> = {
  1: FLOOR_001_ROOMS,
  2: FLOOR_002_ROOMS,
  3: FLOOR_003_ROOMS,
  4: FLOOR_004_ROOMS,
  5: FLOOR_005_ROOMS,
  6: FLOOR_006_ROOMS,
  7: FLOOR_007_ROOMS,
  8: FLOOR_008_ROOMS,
  9: FLOOR_009_ROOMS,
  10: FLOOR_010_ROOMS,
  11: FLOOR_011_ROOMS,
  12: FLOOR_012_ROOMS,
  13: FLOOR_013_ROOMS,
  14: FLOOR_014_ROOMS,
  15: FLOOR_015_ROOMS,
  16: FLOOR_016_ROOMS
};

/** Jenis Room yang ada di sebuah lantai, berurutan menurut TOWER1_SKILL_ORDER (kosong bila lantai tersegel). */
export function floorSkills(floorId: number): RoomSkill[] {
  const present = new Set((TOWER1_ROOMS[floorId] ?? []).map(r => r.skill));
  return TOWER1_SKILL_ORDER.filter(s => present.has(s));
}
