import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateLesson, type Lesson } from './lessonSchema';

const dir = join(import.meta.dirname, '../products/beginner/lessons');
for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
  test(`materi ${f} valid`, () => {
    const l = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Lesson;
    assert.deepEqual(validateLesson(l), []);
  });
}

test('validator menangkap token yang tidak ada', () => {
  const l = JSON.parse(readFileSync(join(dir, 'beginner-006.json'), 'utf8')) as Lesson;
  const bad = structuredClone(l);
  (bad.scenes[5] as any).content.answer = ['s', 'x', 'v'];
  assert.ok(validateLesson(bad).length > 0);
});
