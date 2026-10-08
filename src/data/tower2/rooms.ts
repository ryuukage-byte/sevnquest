// ==============================================================================
// MENARA 2 — REGISTRI ROOM (dimuat malas; berat karena membaca database)
// getTower2Rooms(lantai) membangun dan menyimpan Room sebuah lantai.
// Lantai Penjaga (kelipatan 10) merangkai soal dari lantai-lantai sebelumnya.
// ==============================================================================

import { ChoiceQuestion, Room } from '../../engine/tower1/types';
import { FloorContent, shuffle } from './common';
import { buildKotobaFloor } from './kotobaFloor';
import { buildKanjiFloor } from './kanjiFloor';
import { buildPolaFloor } from './polaFloor';
import { buildKonjFloor, buildLanjutFloor } from './conjFloor';
import { TOWER2_FIRST_FLOOR, TOWER2_FLOORS, TOWER2_FLOOR_MAP, TOWER2_PLAN_MAP } from './floors';

const cache = new Map<number, FloorContent>();

function bossContent(floor: number): FloorContent {
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;
  const from = Math.max(TOWER2_FIRST_FLOOR, floor - 10);
  const sources: number[] = [];
  for (let f = from; f < floor; f++) if (TOWER2_PLAN_MAP[f] && TOWER2_PLAN_MAP[f].arc !== 'boss') sources.push(f);
  const take = floor === 100 ? 4 : Math.max(3, Math.ceil(18 / Math.max(1, sources.length)));
  let pool: ChoiceQuestion[] = sources.flatMap(f => shuffle(getContent(f).bank, `boss:${floor}:${f}`).slice(0, take));
  if (floor === 100) {
    const earlier: number[] = [];
    for (let f = TOWER2_FIRST_FLOOR; f < from; f++) if (TOWER2_PLAN_MAP[f] && TOWER2_PLAN_MAP[f].arc !== 'boss') earlier.push(f);
    pool = pool.concat(shuffle(earlier, 'boss100').slice(0, 14).flatMap(f => shuffle(getContent(f).bank, `boss100:${f}`).slice(0, 1)));
  }
  pool = shuffle(pool, `boss:${floor}:all`);
  const cut = Math.ceil(pool.length / (floor === 100 ? 3 : 2));
  const parts = [pool.slice(0, cut), pool.slice(cut, cut * 2), pool.slice(cut * 2)];
  const names = ['Babak I', 'Babak II', 'Babak Final'];
  const spec = TOWER2_FLOOR_MAP[floor];
  const recap = sources.map(f => ({ glyph: TOWER2_FLOOR_MAP[f].code, sub: TOWER2_FLOOR_MAP[f].name }));
  const rooms: Room[] = [
    {
      id: id('learn'), skill: 'pola', kind: 'lesson', kicker: 'Rangkuman', title: spec.name,
      steps: [
        {
          title: 'Ujian Penjaga',
          body: `Soal diambil dari lantai-lantai sebelum ${spec.code}. Soal diacak dan ujian boleh diulang; yang diuji adalah apakah materi bisa kamu panggil kembali.`,
          grid: recap
        }
      ]
    }
  ];
  parts.filter(p => p.length >= 4).forEach((questions, i) =>
    rooms.push({ id: id(`boss${i + 1}`), skill: 'kata', kind: 'choice', kicker: 'Ujian', title: `${names[i]} · ${questions.length} soal`, passRatio: 0.75, questions })
  );
  return { rooms, bank: pool };
}

function getContent(floor: number): FloorContent {
  const hit = cache.get(floor);
  if (hit) return hit;
  const plan = TOWER2_PLAN_MAP[floor];
  if (!plan) throw new Error(`Lantai ${floor} bukan bagian Menara 2`);
  let content: FloorContent;
  switch (plan.arc) {
    case 'kotoba5': content = buildKotobaFloor('N5', plan.nth, floor); break;
    case 'kotoba4': content = buildKotobaFloor('N4', plan.nth, floor); break;
    case 'kanji5': content = buildKanjiFloor('N5', plan.nth, floor); break;
    case 'kanji4': content = buildKanjiFloor('N4', plan.nth, floor); break;
    case 'pola5': content = buildPolaFloor('N5', plan.nth, floor); break;
    case 'pola4': content = buildPolaFloor('N4', plan.nth, floor); break;
    case 'konj': content = buildKonjFloor(plan.nth, floor); break;
    case 'lanjut': content = buildLanjutFloor(plan.nth, floor); break;
    default: content = bossContent(floor);
  }
  cache.set(floor, content);
  return content;
}

export function getTower2Rooms(floor: number): Room[] {
  return getContent(floor).rooms;
}

export { TOWER2_FLOORS };
