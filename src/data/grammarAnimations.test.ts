import test from 'node:test';
import assert from 'node:assert/strict';
import { conjugateVerb } from '../engine/morphology/inflectionEngine';
import {
  GRAMMAR_ANIMATION_RECIPES,
  GRAMMAR_ANIMATION_VERBS,
  buildGrammarAnimation,
  getGrammarAnimationRecipe,
} from './grammarAnimations';
import bunpouJson from './db/bunpou.json';

const BUNPOU_IDS = new Set((bunpouJson as { id: string }[]).map(b => b.id));

test('setiap resep menunjuk materi bunpou dan verba default yang ada', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    assert.ok(BUNPOU_IDS.has(r.bunpouId), `bunpou ${r.bunpouId}`);
    assert.ok(GRAMMAR_ANIMATION_VERBS.some(v => v.id === r.defaultVerbId), `verba ${r.defaultVerbId}`);
    assert.equal(getGrammarAnimationRecipe(r.bunpouId), r);
  }
});

test('kalimat jadi = bentuk verba dari engine + akhiran pola, untuk semua verba contoh', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    for (const v of GRAMMAR_ANIMATION_VERBS) {
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
    for (const v of GRAMMAR_ANIMATION_VERBS) {
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

test('contoh kunci: pengecualian dan verba tak beraturan', () => {
  const byId = (id: string) => GRAMMAR_ANIMATION_VERBS.find(v => v.id === id)!;
  const recipe = (id: string) => getGrammarAnimationRecipe(id)!;
  assert.equal(buildGrammarAnimation(recipe('bp_n5_053'), byId('v_iku'))!.result.japanese, '行ってください');
  assert.equal(buildGrammarAnimation(recipe('bp_n5_070'), byId('v_kuru'))!.result.reading, 'こないでください');
  assert.equal(buildGrammarAnimation(recipe('bp_n5_037'), byId('v_taberu'))!.result.japanese, '食べたいです');
  assert.equal(buildGrammarAnimation(recipe('bp_n5_040'), byId('v_kaku'))!.result.japanese, '書いたことがある');
  // Ichidan + batang ます: hanya buang る, tanpa tahap "tambah".
  const tai = buildGrammarAnimation(recipe('bp_n5_037'), byId('v_taberu'))!;
  assert.ok(!tai.stages.some(s => s.kind === 'add'));
  // Catatan aturan memilih baris yang relevan (く → いて), bukan seluruh tabel godan.
  const kaite = buildGrammarAnimation(recipe('bp_n5_053'), byId('v_kaku'))!;
  assert.match(kaite.stages.find(s => s.kind === 'remove')!.note, /^く → いて/);
});
