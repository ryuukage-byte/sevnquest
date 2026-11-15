import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { generatePlan, isPlanError } from '../planner/planner';
import { config } from './beginner/config';
import type { Lesson } from '../engine/lessonSchema';

const dir = join(import.meta.dirname, 'beginner/lessons');
const lessons = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Lesson);

test('setiap materi produk Pemula bertingkat BEGINNER dengan id unik', () => {
  assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
  for (const l of lessons) assert.equal(l.level, 'BEGINNER', l.id);
});

test('modul hanya merujuk materi yang ada, dan tiap materi masuk tepat satu modul', () => {
  const ids = new Set(lessons.map(l => l.id));
  const used = config.modules.flatMap(m => m.lessonIds);
  for (const id of used) assert.ok(ids.has(id), `materi hilang: ${id}`);
  assert.equal(new Set(used).size, used.length);
  assert.deepEqual([...ids].sort(), [...used].sort());
});

test('pengaturan bawaan planner Pemula menuntaskan seluruh materi target', () => {
  const p = generatePlan({
    goal: config.planner.goals[0].v, startLevel: config.planner.starts[0].v, ...config.planner.defaults,
    startDate: '2027-01-04', focus: 'balanced',
  });
  assert.ok(!isPlanError(p));
  if (!isPlanError(p)) assert.ok(p.summary.feasible, `coverage ${p.summary.coverage}`);
});
