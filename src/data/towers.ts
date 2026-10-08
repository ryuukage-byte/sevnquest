// ==============================================================================
// MENARA — GABUNGAN MENARA 1 (001-016) DAN MENARA 2 (017-100)
// Satu graf, satu progres (nq_tower1_progress, kunci = nomor lantai).
// Room Menara 2 dibangun dari database yang besar, jadi dimuat malas.
// ==============================================================================

import { FloorSpec, Room, RoomSkill } from '../engine/tower1/types';
import { TOWER1_FLOORS, TOWER1_ROOMS, TOWER1_SKILL_ORDER } from './tower1';
import { TOWER2_FLOORS } from './tower2/floors';

export const ALL_FLOORS: FloorSpec[] = [...TOWER1_FLOORS, ...TOWER2_FLOORS];
export const ALL_FLOOR_MAP: Record<number, FloorSpec> = Object.fromEntries(ALL_FLOORS.map(f => [f.id, f]));
export const TOP_FLOOR = ALL_FLOORS[ALL_FLOORS.length - 1].id;

export const towerOf = (spec: FloorSpec): 1 | 2 => spec.tower ?? 1;

/** Jenis Room di sebuah lantai, berurutan menurut TOWER1_SKILL_ORDER. */
export function skillsOf(spec: FloorSpec): RoomSkill[] {
  const present = new Set<RoomSkill>(spec.skills ?? (TOWER1_ROOMS[spec.id] ?? []).map(r => r.skill));
  return TOWER1_SKILL_ORDER.filter(s => present.has(s));
}

/** Room lantai (Menara 1 langsung, Menara 2 lewat impor malas). */
export async function loadFloorRooms(floorId: number): Promise<Room[]> {
  const direct = TOWER1_ROOMS[floorId];
  if (direct) return direct;
  const mod = await import('./tower2/rooms');
  return mod.getTower2Rooms(floorId);
}
