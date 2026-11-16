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
  const l = JSON.parse(readFileSync(join(dir, 'foundation-07.json'), 'utf8')) as Lesson;
  const bad = structuredClone(l);
  const practice = bad.scenes.find(x => x.type === 'practice') as any;
  practice.content.answer = ['s', 'x', 'v'];
  assert.ok(validateLesson(bad).length > 0);
});
