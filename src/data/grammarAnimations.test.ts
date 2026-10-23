import test from 'node:test';
import assert from 'node:assert/strict';
import * as wanakana from 'wanakana';
import { conjugateVerb } from '../engine/morphology/inflectionEngine';
import {
  GRAMMAR_ANIMATION_RECIPES,
  MAX_SPECIAL_VERBS,
  buildGrammarAnimation,
  getGrammarAnimationRecipe,
  getRecipeVerbs,
} from './grammarAnimations';
import bunpouJson from './db/bunpou.json';

const BUNPOU = new Map((bunpouJson as { id: string; title: string; formula: string }[]).map(b => [b.id, b]));
const KANJI = /[一-龯]/;

test('setiap resep unik, menunjuk materi bunpou yang ada, dan verba default ada di contohnya', () => {
  const seen = new Set<string>();
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    assert.ok(!seen.has(r.bunpouId), `resep ganda ${r.bunpouId}`);
    seen.add(r.bunpouId);
    assert.ok(BUNPOU.has(r.bunpouId), `bunpou ${r.bunpouId}`);
    assert.ok(getRecipeVerbs(r).some(v => v.id === r.defaultVerbId), `${r.bunpouId} verba default ${r.defaultVerbId}`);
    assert.equal(getGrammarAnimationRecipe(r.bunpouId), r);
  }
});

test('akhiran resep benar-benar ada di rumus/judul materinya (cegah salah ketik)', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    if (!r.suffix) continue;
    const b = BUNPOU.get(r.bunpouId)!;
    const haystack = (b.formula + b.title).replace(/[\s＋+]/g, '');
    const head = r.suffix.slice(0, 2);
    assert.ok(haystack.includes(head), `${r.bunpouId}: 「${head}」 tidak ada di 「${b.formula}」`);
  }
});

test('akhiran berkanji wajib punya bacaan kana', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    if (KANJI.test(r.suffix)) assert.ok(r.suffixReading, `${r.bunpouId} 「${r.suffix}」 butuh suffixReading`);
    if (r.suffixReading) assert.ok(wanakana.isKana(r.suffixReading), `${r.bunpouId} bacaan 「${r.suffixReading}」 bukan kana`);
  }
});

test('contoh per pola: 1 Gol. 1, 1 Gol. 2, maks 2 Gol. 3, maks 3 verba khusus berketerangan', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    const verbs = getRecipeVerbs(r);
    const count = (c: string) => verbs.filter(v => v.category === c).length;
    assert.equal(count('gol1'), 1, r.bunpouId);
    assert.equal(count('gol2'), 1, r.bunpouId);
    assert.ok(count('gol3') >= 1 && count('gol3') <= 2, r.bunpouId);
    assert.ok(count('khusus') <= MAX_SPECIAL_VERBS, r.bunpouId);
    if (r.form === 'jisho') assert.equal(count('khusus'), 0, `${r.bunpouId}: bentuk kamus tidak berubah, verba khusus tak relevan`);
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
      assert.equal(anim.result.reading, form.reading + (r.suffixReading ?? r.suffix), `${r.bunpouId} ${v.kanji} reading`);
      assert.ok(wanakana.isKana(anim.result.reading), `${r.bunpouId} ${v.kanji} bacaan berkanji: ${anim.result.reading}`);
      assert.ok(!/\{v\}|\{V\}/.test(anim.result.meaning), `${r.bunpouId} ${v.kanji} meaning`);
    }
  }
});

test('tahap tersusun konsisten: mulai bentuk kamus, akhiran (jika ada) sebelum hasil, tiap tahap punya penjelasan', () => {
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    for (const v of getRecipeVerbs(r)) {
      const { stages, result } = buildGrammarAnimation(r, v)!;
      assert.equal(stages[0].kind, 'base');
      assert.equal(stages[0].segments.map(s => s.text).join(''), v.kanji);
      assert.equal(stages.at(-1)!.kind, 'result');
      if (r.suffix) {
        assert.equal(stages.at(-2)!.kind, 'suffix', `${r.bunpouId} ${v.kanji}`);
        assert.equal(stages.at(-2)!.segments.map(s => s.text).join(''), result.japanese);
      } else {
        assert.ok(!stages.some(s => s.kind === 'suffix'), `${r.bunpouId} tanpa akhiran`);
      }
      if (r.form === 'jisho') assert.deepEqual(stages.map(s => s.kind), ['base', 'suffix', 'result'], r.bunpouId);
      for (const s of stages) assert.ok(s.note.trim(), `${r.bunpouId} ${v.kanji} ${s.kind} note`);
    }
  }
});

test('contoh kunci: verba khusus, verba tak beraturan, bacaan akhiran, dan pengecualian kolokasi', () => {
  const build = (bunpouId: string, verbId: string) => {
    const r = getGrammarAnimationRecipe(bunpouId)!;
    const v = getRecipeVerbs(r).find(x => x.id === verbId);
    assert.ok(v, `${bunpouId} tidak punya verba ${verbId}`);
    return buildGrammarAnimation(r, v)!;
  };
  assert.equal(build('bp_n5_053', 'v_iku').result.japanese, '行ってください');
  assert.equal(build('bp_n5_070', 'v_kaeru').result.japanese, '帰らないでください');
  assert.equal(build('bp_n5_070', 'v_kau').result.japanese, '買わないでください');
  assert.equal(build('bp_n5_070', 'v_kuru').result.reading, 'こないでください');
  assert.equal(build('bp_n5_037', 'v_kaeru').result.japanese, '帰りたいです');
  assert.equal(build('bp_n5_057', 'v_hairu').result.japanese, '入ってもいいです');
  assert.equal(build('bp_n5_040', 'v_kaku').result.japanese, '書いたことがある');
  assert.equal(build('bp_n5_032', 'v_taberu').result.japanese, '食べすぎる');
  assert.equal(build('bp_n4_022', 'v_suru').result.reading, 'したあとで');
  assert.equal(build('bp_n5_102', 'v_kuru').result.reading, 'くるまえに');
  assert.equal(build('bp_n5_014', 'v_kaku').result.reading, 'かきかた');
  // Tanpa akhiran: ～て penghubung, arti diawali huruf besar.
  const te = build('bp_n5_048', 'v_taberu');
  assert.equal(te.result.japanese, '食べて');
  assert.equal(te.result.meaning, 'Makan, lalu …');
  // Kolokasi: 来る tidak dipakai untuk 〜方, verba intransitif tidak untuk てある.
  const kata = getRecipeVerbs(getGrammarAnimationRecipe('bp_n5_014')!);
  assert.ok(!kata.some(v => v.id === 'v_kuru'));
  const tearu = getRecipeVerbs(getGrammarAnimationRecipe('bp_n5_050')!);
  assert.ok(!tearu.some(v => ['v_iku', 'v_kaeru', 'v_hairu', 'v_kuru'].includes(v.id)));
  // Verba khusus menjelaskan kekhususannya di tahap pertama.
  assert.match(build('bp_n5_053', 'v_kaeru').stages[0].note, /Golongan 1/);
  // Ichidan + batang ます: hanya buang る, tanpa tahap "tambah".
  assert.ok(!build('bp_n5_037', 'v_taberu').stages.some(s => s.kind === 'add'));
  // Catatan aturan memilih baris yang relevan (く → いて), bukan seluruh tabel godan.
  assert.match(build('bp_n5_053', 'v_kaku').stages.find(s => s.kind === 'remove')!.note, /^く → いて/);
});
