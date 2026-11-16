import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { toRomaji, isHiragana } from 'wanakana';
import { generatePlan, isPlanError } from '../planner/planner';
import { config } from './beginner/config';
import { particleRomaji, validateLesson, type Lesson, type Part } from '../engine/lessonSchema';

const dir = join(import.meta.dirname, 'beginner/lessons');
const lessons = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Lesson);
const allParts = (l: Lesson): Part[] => l.scenes.flatMap(s => (s.type === 'example' ? s.content.parts : []));

test('setiap materi produk Pemula bertingkat BEGINNER dengan id unik dan struktur valid', () => {
  assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
  for (const l of lessons) {
    assert.equal(l.level, 'BEGINNER', l.id);
    assert.deepEqual(validateLesson(l), [], l.id);
  }
});

test('jalur belajar hanya merujuk materi yang ada, dan tiap materi masuk tepat satu bab', () => {
  const ids = new Set(lessons.map(l => l.id));
  const used = config.paths.flatMap(p => p.chapters.map(c => c.lessonId).filter((x): x is string => !!x));
  for (const id of used) assert.ok(ids.has(id), `materi hilang: ${id}`);
  assert.equal(new Set(used).size, used.length, 'materi dipakai dua kali');
  assert.deepEqual([...ids].sort(), [...used].sort(), 'ada materi yatim');
  const chapterIds = config.paths.flatMap(p => p.chapters.map(c => c.id));
  assert.equal(new Set(chapterIds).size, chapterIds.length);
});

test('Japanese Foundation memuat 16 bab sesuai kurikulum', () => {
  const f = config.paths.find(p => p.id === 'foundation')!;
  assert.equal(f.chapters.length, 16);
});

test('setiap materi punya latihan dan ditutup rangkuman', () => {
  for (const l of lessons) {
    assert.ok(l.scenes.some(s => s.type === 'quiz' || s.type === 'practice'), `${l.id} tanpa latihan`);
    assert.equal(l.scenes.at(-1)!.type, 'summary', `${l.id} tidak ditutup rangkuman`);
  }
});

test('setiap kuis menjelaskan pilihan yang salah (why) bila materi Foundation', () => {
  for (const l of lessons.filter(x => x.id.startsWith('foundation-'))) {
    for (const s of l.scenes) {
      if (s.type !== 'quiz') continue;
      assert.ok(s.content.why, `${l.id}/${s.id} tanpa why`);
      s.content.options.forEach((_, i) => {
        if (i !== s.content.answer) assert.ok(s.content.why![i], `${l.id}/${s.id}: opsi ${i} salah tanpa penjelasan`);
      });
    }
  }
});

test('contoh kalimat: bacaan hiragana, romaji, dan kana konsisten', () => {
  let n = 0;
  for (const l of lessons) for (const p of allParts(l)) {
    n++;
    const expected = p.role === 'particle' && particleRomaji(p.ja) ? particleRomaji(p.ja)! : toRomaji(p.reading);
    assert.equal(p.romaji.replace(/ /g, ''), expected.replace(/ /g, ''), `${l.id}: ${p.ja} (${p.reading}) romaji "${p.romaji}" != "${expected}"`);
    assert.ok(isHiragana(p.reading), `${l.id}: bacaan "${p.reading}" harus hiragana`);
    if (isHiragana(p.ja) && !(p.role === 'particle' && particleRomaji(p.ja))) {
      assert.equal(p.reading, p.ja, `${l.id}: bacaan ≠ tulisan untuk ${p.ja}`);
    }
  }
  assert.ok(n > 30, 'terlalu sedikit contoh kalimat');
});

test('pengaturan bawaan planner Pemula menuntaskan seluruh materi target', () => {
  const p = generatePlan({
    goal: config.planner.goals[0].v, startLevel: config.planner.starts[0].v, ...config.planner.defaults,
    startDate: '2027-01-04', focus: 'balanced',
  });
  assert.ok(!isPlanError(p));
  if (!isPlanError(p)) assert.ok(p.summary.feasible, `coverage ${p.summary.coverage}`);
});
