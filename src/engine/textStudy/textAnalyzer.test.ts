// Jalankan: npm test   (node:test + tsx; memakai data nyata dari database sumber)
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText } from './textAnalyzer';
import { buildTextQuiz } from './textQuiz';

test('menemukan kotoba (termasuk konjugasi), pola, dan kanji', () => {
  const a = analyzeText('昨日、友達と映画を見に行きました。日本語を勉強しなければならない。');
  const surfaces = a.vocab.flatMap(v => v.surfaces);
  assert.ok(surfaces.includes('友達'));
  assert.ok(surfaces.some(s => s.startsWith('行')));
  assert.equal(a.sentences.length, 2);
  assert.ok(a.kanji.length > 3);
  assert.ok(a.grammar.some(g => g.matched === 'なければならない'));
  assert.ok(buildTextQuiz(a).length > 0);
});

test('pola dikenali lewat bentuk konjugasi, bukan string mentah', () => {
  for (const [text, tail] of [
    ['日本語が話せるようになりました。', 'ようになりました'],
    ['日本語が話せるようになった。', 'ようになった'],
    ['日本語が話せるようになって、嬉しい。', 'ようになって'],
    ['日本語が話せるようになります。', 'ようになります'],
  ] as const) {
    const g = analyzeText(text).sentences[0].grammar.find(x => x.key === 'ようになる');
    assert.ok(g, text);
    assert.equal(g.matched, tail);
    assert.ok(g.phrase.startsWith('話せる'), g.phrase);
  }
});

test('beberapa pola dalam satu kalimat terdeteksi terpisah', () => {
  const g = analyzeText('雨が降っているので、行かなくてもいいです。').sentences[0].grammar.map(x => x.key);
  assert.ok(g.includes('ので') && g.includes('なくてもいい') && g.includes('ている'));
});

test('negatif sopan dan partikel/struktur', () => {
  const s = analyzeText('朝ご飯を食べなければなりません。').sentences[0];
  assert.ok(s.grammar.some(x => x.key === 'なければならない' && x.matched === 'なければなりません'));
  assert.deepEqual(s.particles.map(p => p.particle), ['を']);
  assert.equal(s.chunks[s.chunks.length - 1].role.startsWith('predikat'), true);
});

test('teks kosong tidak crash', () => {
  assert.deepEqual(analyzeText('').vocab, []);
});
