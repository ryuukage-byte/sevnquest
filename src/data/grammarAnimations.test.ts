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
/** Semua (resep, cabang) yang dianimasikan. */
const BRANCHES = GRAMMAR_ANIMATION_RECIPES.flatMap(r => r.branches.map((br, i) => ({ r, br, i, tag: `${r.bunpouId}[${br.label}]` })));

test('setiap resep unik, menunjuk materi bunpou yang ada, dan verba default ada di setiap cabang', () => {
  const seen = new Set<string>();
  for (const r of GRAMMAR_ANIMATION_RECIPES) {
    assert.ok(!seen.has(r.bunpouId), `resep ganda ${r.bunpouId}`);
    seen.add(r.bunpouId);
    assert.ok(BUNPOU.has(r.bunpouId), `bunpou ${r.bunpouId}`);
    assert.ok(r.branches.length >= 1, r.bunpouId);
    assert.equal(new Set(r.branches.map(br => br.label)).size, r.branches.length, `${r.bunpouId} label cabang ganda`);
    r.branches.forEach((_, i) =>
      assert.ok(getRecipeVerbs(r, i).some(v => v.id === r.defaultVerbId), `${r.bunpouId}[${i}] verba default ${r.defaultVerbId}`),
    );
    assert.equal(getGrammarAnimationRecipe(r.bunpouId), r);
  }
});

test('akhiran resep benar-benar ada di rumus/judul materinya (cegah salah ketik)', () => {
  for (const { r, br, tag } of BRANCHES) {
    if (!br.suffix) continue;
    const b = BUNPOU.get(r.bunpouId)!;
    const haystack = (b.formula + b.title).replace(/[\s＋+]/g, '');
    // Rumus pola kontraksi sering hanya menulis bentuk singkatnya (ちゃう, とく).
    const heads = [br.suffix, ...(br.contract?.pairs.map(([, to]) => to) ?? [])].map(t => t.slice(0, 2));
    assert.ok(heads.some(h => haystack.includes(h)), `${tag}: 「${heads.join('／')}」 tidak ada di 「${b.formula}」`);
  }
});

test('akhiran berkanji wajib punya bacaan kana', () => {
  for (const { br, tag } of BRANCHES) {
    if (KANJI.test(br.suffix)) assert.ok(br.suffixReading, `${tag} 「${br.suffix}」 butuh suffixReading`);
    if (br.suffixReading) assert.ok(wanakana.isKana(br.suffixReading), `${tag} bacaan 「${br.suffixReading}」 bukan kana`);
  }
});

test('contoh per cabang: 1 Gol. 1, 1 Gol. 2, maks 2 Gol. 3, maks 3 verba khusus berketerangan', () => {
  for (const { r, br, i, tag } of BRANCHES) {
    const verbs = getRecipeVerbs(r, i);
    const count = (c: string) => verbs.filter(v => v.category === c).length;
    assert.equal(count('gol1'), 1, tag);
    assert.equal(count('gol2'), 1, tag);
    assert.ok(count('gol3') >= 1 && count('gol3') <= 2, tag);
    assert.ok(count('khusus') <= MAX_SPECIAL_VERBS, tag);
    if (br.form === 'jisho') assert.equal(count('khusus'), 0, `${tag}: bentuk kamus tidak berubah, verba khusus tak relevan`);
    for (const v of verbs.filter(v => v.category === 'khusus')) assert.ok(v.specialNote, `${v.kanji} specialNote`);
  }
});

test('kalimat jadi: bacaan kana penuh; tanpa perubahan/kontraksi = bentuk engine + akhiran persis', () => {
  for (const { r, br, i, tag } of BRANCHES) {
    for (const v of getRecipeVerbs(r, i)) {
      const anim = buildGrammarAnimation(r, v, i);
      assert.ok(anim, `${tag} ${v.kanji}`);
      assert.ok(wanakana.isKana(anim.result.reading), `${tag} ${v.kanji} bacaan berkanji: ${anim.result.reading}`);
      assert.ok(!/\{v\}|\{V\}/.test(anim.result.meaning), `${tag} ${v.kanji} meaning`);
      if (!br.change && !br.contract) {
        const form = conjugateVerb(v.kanji, v.reading).forms[br.form];
        assert.equal(anim.result.japanese, form.japanese + br.suffix, `${tag} ${v.kanji}`);
        assert.equal(anim.result.reading, form.reading + (br.suffixReading ?? br.suffix), `${tag} ${v.kanji} reading`);
      }
    }
  }
});

test('tahap tersusun konsisten: urut sesuai alur, tanpa ganda, tiap tahap punya penjelasan', () => {
  const ORDER = ['base', 'remove', 'add', 'change', 'suffix', 'contract', 'result'];
  for (const { r, br, i, tag } of BRANCHES) {
    for (const v of getRecipeVerbs(r, i)) {
      const { stages, result } = buildGrammarAnimation(r, v, i)!;
      const kinds = stages.map(s => s.kind);
      assert.equal(stages[0].segments.map(s => s.text).join(''), v.kanji, `${tag} ${v.kanji} bentuk kamus`);
      assert.deepEqual(kinds, [...kinds].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), `${tag} ${v.kanji} urutan`);
      assert.equal(new Set(kinds).size, kinds.length, `${tag} ${v.kanji} tahap ganda`);
      assert.equal(kinds[0], 'base');
      assert.equal(kinds.at(-1), 'result');
      assert.equal(kinds.includes('suffix'), !!br.suffix, `${tag} tahap akhiran`);
      assert.equal(kinds.includes('change'), !!br.change, `${tag} tahap perubahan`);
      assert.equal(kinds.includes('contract'), !!br.contract, `${tag} tahap kontraksi`);
      // Tahap sebelum hasil menampilkan kalimat jadi yang sama.
      assert.equal(stages.at(-2)!.segments.map(s => s.text).join(''), result.japanese, `${tag} ${v.kanji}`);
      if (br.form === 'jisho' && !br.change && !br.contract) assert.deepEqual(kinds, ['base', 'suffix', 'result'], tag);
      for (const s of stages) assert.ok(s.note.trim(), `${tag} ${v.kanji} ${s.kind} note`);
    }
  }
});

/** Hasil satu cabang (dicari dari labelnya) untuk satu verba. */
function build(bunpouId: string, label: string | null, verbId: string) {
  const r = getGrammarAnimationRecipe(bunpouId)!;
  assert.ok(r, `resep ${bunpouId}`);
  const i = label === null ? 0 : r.branches.findIndex(br => br.label === label);
  assert.ok(i >= 0, `${bunpouId} tidak punya cabang ${label}`);
  const v = getRecipeVerbs(r, i).find(x => x.id === verbId);
  assert.ok(v, `${bunpouId}[${label}] tidak punya verba ${verbId}`);
  return buildGrammarAnimation(r, v, i)!;
}

test('kontraksi dan perubahan bentuk menghasilkan bentuk yang benar', () => {
  // てしまう → ちゃう, termasuk する.
  assert.equal(build('bp_n4_105', 'ちゃう', 'v_kaku').result.japanese, '書いちゃう');
  assert.equal(build('bp_n4_105', 'ちゃう', 'v_suru').result.japanese, 'しちゃう');
  assert.equal(build('w1d2g2', null, 'v_taberu').result.japanese, '食べちゃう');
  // ておく → とく, cabang formal tetap utuh.
  assert.equal(build('bp_n4_099', 'とく', 'v_kaku').result.japanese, '書いとく');
  assert.equal(build('bp_n4_099', 'おく', 'v_kaku').result.japanese, '書いておく');
  // ては → ちゃ.
  assert.equal(build('bp_n5_045', null, 'v_iku').result.japanese, '行っちゃいけない');
  // ない → なくては → なくちゃ ; ない → なければ → なきゃ.
  assert.equal(build('bp_n5_073', 'なくちゃ', 'v_kuru').result.reading, 'こなくちゃ');
  assert.equal(build('bp_n5_073', 'なきゃ', 'v_kaeru').result.japanese, '帰らなきゃ');
  // Perubahan sebelum akhiran.
  assert.equal(build('bp_n4_115', 'Vなくて', 'v_taberu').result.japanese, '食べなくてよかった');
  assert.equal(build('bp_n4_181', 'Vなくなる', 'v_kaku').result.japanese, '書かなくなる');
  assert.equal(build('w1d5g3', 'Vれます', 'v_suru').result.japanese, 'できますように');
  assert.equal(build('w5d3g2', 'Vなければ', 'v_kau').result.japanese, '買わなければよかった');
  // Cabang lain dari pola yang sama.
  assert.equal(build('w5d3g2', 'Vなかったら', 'v_kaeru').result.japanese, '帰らなかったらよかった');
  assert.equal(build('w6d3g3', 'Vている', 'v_taberu').result.japanese, '食べているところ');
  assert.equal(build('w2d6g3', 'V perintah', 'v_kuru').result.reading, 'こいといわれる');
  assert.equal(build('bp_n4_175', 'Vれる', 'v_kaeru').result.japanese, '帰れるように');
  // Tahap kontraksi menandai bagian yang menyusut.
  const chau = build('bp_n4_105', 'ちゃう', 'v_kaku').stages.find(s => s.kind === 'contract')!;
  assert.equal(chau.label, 'Singkat 「てしまう」→「ちゃう」');
  assert.deepEqual(chau.segments.filter(s => s.role === 'changed').map(s => s.text), ['ちゃう']);
});

test('contoh kunci: verba khusus, verba tak beraturan, bacaan akhiran, dan pengecualian kolokasi', () => {
  assert.equal(build('bp_n5_053', null, 'v_iku').result.japanese, '行ってください');
  assert.equal(build('bp_n5_070', null, 'v_kaeru').result.japanese, '帰らないでください');
  assert.equal(build('bp_n5_070', null, 'v_kau').result.japanese, '買わないでください');
  assert.equal(build('bp_n5_070', null, 'v_kuru').result.reading, 'こないでください');
  assert.equal(build('bp_n5_037', null, 'v_kaeru').result.japanese, '帰りたいです');
  assert.equal(build('bp_n5_057', null, 'v_hairu').result.japanese, '入ってもいいです');
  assert.equal(build('bp_n5_040', null, 'v_kaku').result.japanese, '書いたことがある');
  assert.equal(build('bp_n5_032', null, 'v_taberu').result.japanese, '食べすぎる');
  assert.equal(build('bp_n4_022', null, 'v_suru').result.reading, 'したあとで');
  assert.equal(build('bp_n5_102', null, 'v_kuru').result.reading, 'くるまえに');
  assert.equal(build('bp_n5_014', null, 'v_kaku').result.reading, 'かきかた');
  // Tanpa akhiran: ～て penghubung, arti diawali huruf besar.
  const te = build('bp_n5_048', null, 'v_taberu').result;
  assert.equal(te.japanese, '食べて');
  assert.equal(te.meaning, 'Makan, lalu …');
  // Kolokasi: 来る tidak dipakai untuk 〜方, verba intransitif tidak untuk てある.
  assert.ok(!getRecipeVerbs(getGrammarAnimationRecipe('bp_n5_014')!).some(v => v.id === 'v_kuru'));
  assert.ok(!getRecipeVerbs(getGrammarAnimationRecipe('bp_n5_050')!).some(v => ['v_iku', 'v_kaeru', 'v_hairu', 'v_kuru'].includes(v.id)));
  // Verba khusus menjelaskan kekhususannya di tahap pertama.
  assert.match(build('bp_n5_053', null, 'v_kaeru').stages[0].note, /Golongan 1/);
  // Ichidan + batang ます: hanya buang る, tanpa tahap "tambah".
  assert.ok(!build('bp_n5_037', null, 'v_taberu').stages.some(s => s.kind === 'add'));
  // Catatan aturan memilih baris yang relevan (く → いて), bukan seluruh tabel godan.
  assert.match(build('bp_n5_053', null, 'v_kaku').stages.find(s => s.kind === 'remove')!.note, /^く → いて/);
});

test('kontraksi bersuara: verba berakhiran む/ぶ/ぬ/ぐ memakai で → じゃう / どく / じゃ', () => {
  const nomu = { id: 'v_nomu', kanji: '飲む', reading: 'のむ', meaningId: 'Minum', category: 'gol1' as const };
  const result = (bunpouId: string, label: string | null) => {
    const r = getGrammarAnimationRecipe(bunpouId)!;
    const i = label === null ? 0 : r.branches.findIndex(br => br.label === label);
    return buildGrammarAnimation(r, nomu, i)!.result;
  };
  assert.equal(result('bp_n4_105', 'ちゃう').japanese, '飲んじゃう');
  assert.equal(result('bp_n4_099', 'とく').japanese, '飲んどく');
  assert.equal(result('bp_n5_045', null).japanese, '飲んじゃいけない');
  assert.equal(result('bp_n4_105', 'ちゃう').reading, 'のんじゃう');
});
