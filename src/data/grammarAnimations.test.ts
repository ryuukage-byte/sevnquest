import test from 'node:test';
import assert from 'node:assert/strict';
import { conjugateVerb } from '../engine/morphology/inflectionEngine';
import {
  GRAMMAR_ANIMATION_RECIPES,
  MAX_SPECIAL_VERBS,
  buildGrammarAnimation,
  getGrammarAnimationRecipe,
  getRecipeVerbs,
} from './grammarAnimations';
import bunpouJson from './db/bunpou.json';

const BUNPOU_IDS = new Set((bunpouJson as { id: string }[]).map(b => b.id));

test('setiap resep menunjuk materi bunpou yang ada, verba default, dan verba khusus yang terdaftar', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    assert.ok(BUNPOU_IDS.has(r.bunpouId), `bunpou ${r.bunpouId}`);
    const verbs = getRecipeVerbs(r);
    assert.ok(verbs.some(v => v.id === r.defaultVerbId), `verba default ${r.defaultVerbId}`);
    for (const id of r.specialVerbIds) assert.ok(verbs.some(v => v.id === id), `${r.bunpouId} verba khusus ${id}`);
    assert.equal(getGrammarAnimationRecipe(r.bunpouId), r);
  }
});

test('contoh per pola: 1 Gol. 1, 1 Gol. 2, 2 Gol. 3, maksimal 3 verba khusus berketerangan', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    const verbs = getRecipeVerbs(r);
    const count = (c: string) => verbs.filter(v => v.category === c).length;
    assert.equal(count('gol1'), 1, r.bunpouId);
    assert.equal(count('gol2'), 1, r.bunpouId);
    assert.equal(count('gol3'), 2, r.bunpouId);
    assert.ok(count('khusus') <= MAX_SPECIAL_VERBS, r.bunpouId);
    for (const v of verbs.filter(v => v.category === 'khusus')) assert.ok(v.specialNote, `${v.kanji} specialNote`);
  }
});

test('kalimat jadi = bentuk verba dari engine + akhiran pola, untuk semua verba contoh', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    for (const v of getRecipeVerbs(r)) {
      const anim = buildGrammarAnimation(r, v);
      assert.ok(anim, `${r.bunpouId} ${v.kanji}`);
      const form = conjugateVerb(v.kanji, v.reading).forms[r.form];
      assert.equal(anim.result.japanese, form.japanese + r.suffix, `${r.bunpouId} ${v.kanji}`);
      assert.equal(anim.result.reading, form.reading + r.suffix, `${r.bunpouId} ${v.kanji} reading`);
      assert.ok(!anim.result.meaning.includes('{v}'), `${r.bunpouId} ${v.kanji} meaning`);
    }
  }
});

test('tahap tersusun konsisten: mulai bentuk kamus, akhiran sebelum hasil, tiap tahap punya penjelasan', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    for (const v of getRecipeVerbs(r)) {
      const { stages, result } = buildGrammarAnimation(r, v)!;
      assert.equal(stages[0].kind, 'base');
      assert.equal(stages[0].segments.map(s => s.text).join(''), v.kanji);
      assert.equal(stages.at(-2)!.kind, 'suffix');
      assert.equal(stages.at(-2)!.segments.map(s => s.text).join(''), result.japanese);
      assert.equal(stages.at(-1)!.kind, 'result');
      for (const s of stages) assert.ok(s.note.trim(), `${r.bunpouId} ${v.kanji} ${s.kind} note`);
    }
  }
});

test('contoh kunci: verba khusus dan verba tak beraturan', () => {
  const recipe = (id: string) => getGrammarAnimationRecipe(id)!;
  const build = (bunpouId: string, verbId: string) => {
    const r = recipe(bunpouId);
    return buildGrammarAnimation(r, getRecipeVerbs(r).find(v => v.id === verbId)!)!;
  };
  assert.equal(build('bp_n5_053', 'v_iku').result.japanese, '行ってください');
  assert.equal(build('bp_n5_070', 'v_kaeru').result.japanese, '帰らないでください');
  assert.equal(build('bp_n5_070', 'v_kau').result.japanese, '買わないでください');
  assert.equal(build('bp_n5_070', 'v_kuru').result.reading, 'こないでください');
  assert.equal(build('bp_n5_037', 'v_kaeru').result.japanese, '帰りたいです');
  assert.equal(build('bp_n5_057', 'v_hairu').result.japanese, '入ってもいいです');
  assert.equal(build('bp_n5_070', 'v_hairu').result.japanese, '入らないでください');
  assert.equal(build('bp_n5_040', 'v_kaku').result.japanese, '書いたことがある');
  // Verba khusus menjelaskan kekhususannya di tahap pertama.
  assert.match(build('bp_n5_053', 'v_kaeru').stages[0].note, /Golongan 1/);
  // Ichidan + batang ます: hanya buang る, tanpa tahap "tambah".
  assert.ok(!build('bp_n5_037', 'v_taberu').stages.some(s => s.kind === 'add'));
  // Catatan aturan memilih baris yang relevan (く → いて), bukan seluruh tabel godan.
  assert.match(build('bp_n5_053', 'v_kaku').stages.find(s => s.kind === 'remove')!.note, /^く → いて/);
});
