import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWER1_FLOORS } from '../../data/tower1';
import { TOWER2_FLOORS, TOWER2_PLAN } from '../../data/tower2/floors';
import { getTower2Rooms } from '../../data/tower2/rooms';
import { validateGraph } from './graph';
import { parseRuby } from './jp';
import { Room } from './types';

test('Menara 2: lantai 017-100 berurutan, DAG valid bersama Menara 1', () => {
  assert.equal(TOWER2_FLOORS.length, 84);
  assert.equal(TOWER2_FLOORS[0].id, 17);
  assert.equal(TOWER2_FLOORS[83].id, 100);
  assert.deepEqual(validateGraph([...TOWER1_FLOORS, ...TOWER2_FLOORS]), []);
  assert.deepEqual(TOWER2_FLOORS[0].hard, [16]);
});

test('Menara 2: jumlah arc sesuai rencana', () => {
  const count: Record<string, number> = {};
  TOWER2_PLAN.forEach(p => { count[p.arc] = (count[p.arc] ?? 0) + 1; });
  assert.deepEqual(count, { kotoba5: 12, konj: 9, kanji5: 8, pola5: 10, kotoba4: 9, kanji4: 7, pola4: 14, lanjut: 6, boss: 9 });
  assert.deepEqual(TOWER2_PLAN.filter(p => p.arc === 'boss').map(p => p.floor), [20, 30, 40, 50, 60, 70, 80, 90, 100]);
});

const MIN_ROOMS = 3;

test('Menara 2: semua Room valid (id unik, jawaban ada di pilihan, ruby sah)', () => {
  const ids = new Set<string>();
  for (const f of TOWER2_FLOORS) {
    const rooms: Room[] = getTower2Rooms(f.id);
    assert.ok(rooms.length >= MIN_ROOMS, `lantai ${f.id} hanya ${rooms.length} Room`);
    assert.ok(rooms.some(r => r.kind !== 'lesson' && 'passRatio' in r && r.passRatio), `lantai ${f.id} tanpa ujian`);
    for (const r of rooms) {
      const where = `lantai ${f.id} / ${r.id}`;
      assert.ok(!ids.has(r.id), `id ganda ${r.id}`);
      ids.add(r.id);
      const ruby = (t?: string) => t && parseRuby(t).forEach(p => p.ruby && assert.match(p.ruby, /^[ぁ-んァ-ヶー]+$/, `${where}: ${t}`));
      if (r.kind === 'lesson') {
        assert.ok(r.steps.length > 0, where);
      } else if (r.kind === 'choice') {
        assert.ok(r.questions.length >= 3, `${where}: hanya ${r.questions.length} soal`);
        r.questions.forEach((q, i) => {
          assert.equal(new Set(q.options).size, q.options.length, `${where} #${i}: pilihan kembar ${JSON.stringify(q.options)}`);
          assert.ok(q.options.length >= 3, `${where} #${i}: pilihan kurang`);
          assert.ok(q.answer >= 0 && q.answer < q.options.length, `${where} #${i}: jawaban di luar pilihan`);
          assert.ok(q.prompt.length > 0, where);
          ruby(q.glyph);
          q.options.forEach(o => ruby(o));
        });
        if ('passRatio' in r && r.passRatio) assert.ok(r.questions.length >= 6, `${where}: ujian terlalu pendek (${r.questions.length})`);
      } else if (r.kind === 'build') {
        assert.ok(r.items.length >= 3, where);
        r.items.forEach((it, i) => assert.ok(it.answer.length >= 2 && it.answer.length <= 10, `${where} #${i}`));
      } else if (r.kind === 'pair') {
        assert.ok(r.pairs.length >= 3, where);
      }
    }
  }
});

test('Menara 2: jawaban benar tidak selalu di posisi yang sama', () => {
  const positions = new Set<number>();
  for (const room of getTower2Rooms(21)) if (room.kind === 'choice') room.questions.forEach(q => positions.add(q.answer));
  assert.ok(positions.size >= 3);
});
