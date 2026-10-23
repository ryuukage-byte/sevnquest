import test from 'node:test';
import assert from 'node:assert/strict';
import * as wanakana from 'wanakana';
import { conjugateVerb } from '../engine/morphology/inflectionEngine';
import {
  GRAMMAR_ANIMATION_RECIPES,
  MAX_SPECIAL_VERBS,
  PARTNER_VERBS,
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
    // Awal atau akhir akhiran harus muncul; rumus kontraksi sering hanya menulis bentuk singkatnya (ちゃう, とく).
    const heads = [br.suffix.slice(0, 2), br.suffix.slice(-2), ...(br.contract?.pairs.map(([, to]) => to.slice(0, 2)) ?? [])];
    assert.ok(heads.some(h => haystack.includes(h)), `${tag}: 「${heads.join('／')}」 tidak ada di 「${b.formula}」`);
  }
});

test('bagian berkanji (akhiran, awalan, penutup, verba kedua) wajib punya bacaan kana', () => {
  for (const { br, tag } of BRANCHES) {
    const parts: [string | undefined, string | undefined, string][] = [
      [br.suffix, br.suffixReading, 'akhiran'],
      [br.prefix, br.prefixReading, 'awalan'],
      [br.tail, br.tailReading, 'penutup'],
      [br.partner?.suffix, br.partner?.suffixReading, 'akhiran verba kedua'],
    ];
    for (const [text, reading, what] of parts) {
      if (text && KANJI.test(text)) assert.ok(reading, `${tag} ${what} 「${text}」 butuh bacaan`);
      if (reading) assert.ok(wanakana.isKana(reading), `${tag} bacaan ${what} 「${reading}」 bukan kana`);
    }
  }
});

test('contoh per cabang: komposisi golongan (atau daftar verba kolokasi sendiri)', () => {
  for (const { r, br, i, tag } of BRANCHES) {
    const verbs = getRecipeVerbs(r, i);
    if (r.verbs) {
      // Pola berkolokasi sempit: daftar sendiri, tanpa kategori "khusus".
      assert.ok(verbs.length >= 2, `${tag}: minimal 2 verba kolokasi`);
      assert.ok(verbs.every(v => v.category !== 'khusus'), tag);
      continue;
    }
    const count = (c: string) => verbs.filter(v => v.category === c).length;
    assert.ok(count('gol1') >= 1, tag);
    // Tanpa pengecualian: 2 Gol. 1, 2 Gol. 2, 2 Gol. 3. Cabang/pola dengan pengecualian kolokasi boleh lebih sedikit.
    if (!br.excludeVerbIds?.length && !r.excludeVerbIds?.length) {
      assert.equal(count('gol1'), 2, tag);
      assert.equal(count('gol2'), 2, tag);
      assert.equal(count('gol3'), 2, tag);
    }
    assert.ok(count('gol1') <= 2 && count('gol2') <= 2 && count('gol3') <= 2, tag);
    assert.ok(count('khusus') <= MAX_SPECIAL_VERBS, tag);
    if (br.form === 'jisho') assert.equal(count('khusus'), 0, `${tag}: bentuk kamus tidak berubah, verba khusus tak relevan`);
    for (const v of verbs.filter(v => v.category === 'khusus')) assert.ok(v.specialNote, `${v.kanji} specialNote`);
  }
});

test('kalimat jadi: bacaan kana penuh, arti terisi; tanpa transformasi = (awalan +) bentuk engine + akhiran persis', () => {
  for (const { r, br, i, tag } of BRANCHES) {
    for (const v of getRecipeVerbs(r, i)) {
      const anim = buildGrammarAnimation(r, v, i);
      assert.ok(anim, `${tag} ${v.kanji}`);
      assert.ok(wanakana.isKana(anim.result.reading), `${tag} ${v.kanji} bacaan berkanji: ${anim.result.reading}`);
      assert.ok(!/\{[vVpPwxX]\}/.test(anim.result.meaning), `${tag} ${v.kanji} meaning: ${anim.result.meaning}`);
      if (!br.change && !br.contract && !br.partner && !br.tail) {
        const form = conjugateVerb(v.kanji, v.reading).forms[br.form];
        assert.equal(anim.result.japanese, (br.prefix ?? '') + form.japanese + br.suffix, `${tag} ${v.kanji}`);
        assert.equal(
          anim.result.reading,
          (br.prefixReading ?? br.prefix ?? '') + form.reading + (br.suffixReading ?? br.suffix),
          `${tag} ${v.kanji} reading`,
        );
      }
    }
  }
});

test('tahap tersusun konsisten: urut sesuai alur, tanpa ganda, tiap tahap punya penjelasan', () => {
  const ORDER = ['base', 'remove', 'shift', 'add', 'change', 'suffix', 'partner', 'tail', 'contract', 'prefix', 'result'];
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
      assert.equal(kinds.includes('partner'), !!br.partner, `${tag} tahap verba kedua`);
      assert.equal(kinds.includes('tail'), !!br.tail, `${tag} tahap penutup`);
      assert.equal(kinds.includes('prefix'), !!br.prefix, `${tag} tahap awalan`);
      // Tahap sebelum hasil menampilkan kalimat jadi yang sama.
      assert.equal(stages.at(-2)!.segments.map(s => s.text).join(''), result.japanese, `${tag} ${v.kanji}`);
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
  assert.equal(build('bp_n4_105', 'ちゃう', 'v_kaku').result.japanese, '書いちゃう');
  assert.equal(build('bp_n4_105', 'ちゃう', 'v_suru').result.japanese, 'しちゃう');
  assert.equal(build('w1d2g2', null, 'v_taberu').result.japanese, '食べちゃう');
  assert.equal(build('bp_n4_099', 'とく', 'v_kaku').result.japanese, '書いとく');
  assert.equal(build('bp_n4_099', 'おく', 'v_kaku').result.japanese, '書いておく');
  assert.equal(build('bp_n5_045', null, 'v_iku').result.japanese, '行っちゃいけない');
  assert.equal(build('bp_n5_073', 'なくちゃ', 'v_kuru').result.reading, 'こなくちゃ');
  assert.equal(build('bp_n5_073', 'なきゃ', 'v_kaeru').result.japanese, '帰らなきゃ');
  assert.equal(build('bp_n4_115', 'Vなくて', 'v_taberu').result.japanese, '食べなくてよかった');
  assert.equal(build('bp_n4_181', 'Vなくなる', 'v_kaku').result.japanese, '書かなくなる');
  assert.equal(build('w1d5g3', 'Vれます', 'v_suru').result.japanese, 'できますように');
  assert.equal(build('w5d3g2', 'Vなければ', 'v_kau').result.japanese, '買わなければよかった');
  assert.equal(build('w5d3g2', 'Vなかったら', 'v_kaeru').result.japanese, '帰らなかったらよかった');
  assert.equal(build('w6d3g3', 'Vている', 'v_taberu').result.japanese, '食べているところ');
  assert.equal(build('w2d6g3', 'V perintah', 'v_kuru').result.reading, 'こいといわれる');
  assert.equal(build('bp_n4_175', 'Vれる', 'v_kaeru').result.japanese, '帰れるように');
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
  const te = build('bp_n5_048', null, 'v_taberu').result;
  assert.equal(te.japanese, '食べて');
  assert.equal(te.meaning, 'Makan, lalu …');
  assert.ok(!getRecipeVerbs(getGrammarAnimationRecipe('bp_n5_014')!).some(v => v.id === 'v_kuru'));
  assert.ok(!getRecipeVerbs(getGrammarAnimationRecipe('bp_n5_050')!).some(v => ['v_iku', 'v_kaeru', 'v_hairu', 'v_kuru'].includes(v.id)));
  assert.match(build('bp_n5_053', null, 'v_kaeru').stages[0].note, /Golongan 1/);
  assert.ok(!build('bp_n5_037', null, 'v_taberu').stages.some(s => s.kind === 'add'));
  assert.match(build('bp_n5_053', null, 'v_kaku').stages.find(s => s.kind === 'remove')!.note, /^く → いて/);
});

test('kontraksi bersuara: verba berakhiran む/ぶ/ぬ/ぐ memakai で → じゃう / どく / じゃ', () => {
  const nomu = { id: 'v_nomu', kanji: '飲む', reading: 'のむ', meaningId: 'Minum', passiveId: 'Diminum', category: 'gol1' as const };
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

test('kausatif, pasif, dan kausatif-pasif (termasuk bentuk singkat) terbentuk dengan benar', () => {
  assert.equal(build('bp_n4_070', null, 'v_kau').result.japanese, '買わせる');
  assert.equal(build('bp_n4_070', null, 'v_kuru').result.reading, 'こさせる');
  assert.equal(build('bp_n4_060', null, 'v_kaeru').result.japanese, '帰らせてください');
  assert.equal(build('w1d1g3', 'もらえませんか', 'v_suru').result.japanese, 'させてもらえませんか');
  assert.equal(build('bp_n4_187', null, 'v_kaku').result.japanese, '書かれる');
  assert.equal(build('bp_n4_187', null, 'v_kaku').result.meaning, 'Ditulis. (pasif)');
  assert.equal(build('w1d1g1', 'Vれている', 'v_kaku').result.japanese, '書かれている');
  assert.equal(build('w1d1g2', null, 'v_kaeru').result.japanese, '帰られた');
  assert.equal(build('w1d1g2', null, 'v_kaeru').result.meaning, '(Merasa dirugikan karena) ditinggal pulang.');
  assert.equal(build('bp_n4_188', null, 'v_suru').result.japanese, 'できる');
  assert.equal(build('bp_n4_061', 'Panjang', 'v_taberu').result.japanese, '食べさせられる');
  assert.equal(build('bp_n4_061', 'Singkat', 'v_kaku').result.japanese, '書かされる');
  assert.equal(build('bp_n4_061', 'Singkat', 'v_kau').result.reading, 'かわされる');
  const shortVerbs = getRecipeVerbs(getGrammarAnimationRecipe('bp_n4_061')!, 1).map(v => v.id);
  for (const id of ['v_taberu', 'v_suru', 'v_kuru']) assert.ok(!shortVerbs.includes(id), `bentuk singkat tidak berlaku untuk ${id}`);
});

test('ず／ざる／ぬ／ねば／ん: ない diganti, する menjadi せ〜', () => {
  assert.equal(build('w3d1g3', null, 'v_kaku').result.japanese, '書かずに');
  assert.equal(build('w3d1g3', null, 'v_suru').result.japanese, 'せずに');
  assert.equal(build('w3d1g3', null, 'v_kuru').result.reading, 'こずに');
  assert.equal(build('bp_n2_049', null, 'v_suru').result.japanese, 'せざるを得ない');
  assert.equal(build('bp_n2_049', null, 'v_kau').result.reading, 'かわざるをえない');
  assert.equal(build('bp_n2_162', null, 'v_suru').result.japanese, 'せねばならない');
  assert.equal(build('bp_n2_159', null, 'v_taberu').result.japanese, '食べぬ');
  assert.equal(build('bp_n1_266', null, 'v_suru').result.japanese, 'せんがために');
  assert.equal(build('bp_n1_266', null, 'v_kaku').result.japanese, '書かんがために');
  assert.equal(build('bp_n1_060', 'ずには済まない', 'c_ayamaru').result.japanese, '謝らずには済まない');
  assert.equal(build('bp_n1_060', 'ずには済まない', 'c_benshou').result.japanese, '弁償せずには済まない');
  assert.equal(build('bp_n1_267', null, 'c_naku').result.japanese, '泣かんばかりに');
});

test('awalan, bahasa hormat, dan verba kedua', () => {
  assert.equal(build('bp_n4_172', null, 'v_kaku').result.japanese, 'もし書いたら');
  assert.equal(build('bp_n5_043', null, 'v_kuru').result.reading, 'だれもこない');
  assert.equal(build('bp_n2_022', null, 'v_kaku').result.japanese, '思うように書けない');
  assert.equal(build('bp_n4_032', null, 'h_matsu').result.japanese, 'お待ちになる');
  assert.equal(build('w6d5g3', null, 'k_okuru').result.reading, 'おおくりもうしあげる');
  assert.equal(build('bp_n5_042', null, 'v_kaku').result.japanese, '書いたり飲んだりする');
  assert.equal(build('bp_n5_042', null, 'v_kaku').result.meaning, 'Menulis, minum, dan sebagainya.');
  assert.equal(build('bp_n2_024', null, 'v_taberu').result.japanese, '食べるか食べないかのうちに');
  assert.equal(build('bp_n1_241', null, 'v_kaku').result.japanese, '書こうにも書けない');
  assert.equal(build('bp_n1_238', 'ようが〜まいが', 'v_suru').result.japanese, 'しようがするまいが');
  assert.equal(build('w4d3g3', null, 'v_taberu').result.japanese, '食べれば食べるほど');
  assert.equal(build('bp_n1_211', null, 'c_okoru').result.japanese, '起こるべくして起こった');
  const tari = build('bp_n5_042', null, 'v_kaku').stages.find(s => s.kind === 'partner')!;
  assert.deepEqual(tari.segments.filter(s => s.role === 'partner').map(s => s.text), ['飲んだり']);
});

test('bentuk maksud dan bentuk biasa (4 cabang dengan arti per cabang)', () => {
  assert.equal(build('w1d6g1', null, 'v_kaku').result.japanese, '書こうと思う');
  assert.equal(build('w1d6g1', null, 'v_kuru').result.reading, 'こようとおもう');
  assert.equal(build('bp_n4_026', null, 'v_suru').result.japanese, 'しよう');
  const omou = getGrammarAnimationRecipe('bp_n4_124')!;
  assert.deepEqual(omou.branches.map(br => br.label), ['Vる', 'Vない', 'Vた', 'Vなかった']);
  assert.equal(build('bp_n4_124', 'Vない', 'v_kaku').result.japanese, '書かないと思う');
  assert.equal(build('bp_n4_124', 'Vない', 'v_kaku').result.meaning, 'Saya pikir (dia) tidak menulis.');
  assert.equal(build('bp_n4_124', 'Vなかった', 'v_taberu').result.japanese, '食べなかったと思う');
  assert.equal(build('bp_n5_027', 'Vた', 'v_kaku').result.meaning, 'Sudah menulis, tapi …');
  assert.equal(build('w5d5g3', 'Vる', 'v_kaku').result.japanese, '必ずしも書くとは限らない');
});

test('〜げ: bentuk たい → batang たい (buang い) → ＋げ', () => {
  const ige = build('bp_n2_042', null, 'c_iu');
  assert.equal(ige.result.japanese, '言いたげ');
  assert.deepEqual(ige.stages.map(s => s.kind), ['base', 'shift', 'add', 'change', 'suffix', 'result']);
});

test('Golongan 1: suku kata terakhir diganti dalam barisnya (bukan dibuang); Golongan 2 tetap buang る', () => {
  const kinds = (bunpouId: string, label: string | null, verbId: string) => build(bunpouId, label, verbId).stages.map(s => s.label);
  // 書く → 書か + れる (pasif)
  assert.deepEqual(kinds('w1d1g1', 'Vれる', 'v_kaku'), ['Bentuk kamus', 'Ganti 「く」→「か」', 'Tambah 「れる」', 'Kalimat jadi']);
  // 書く → 書か + ない ; 買う → 買わ + ない
  assert.ok(kinds('bp_n5_070', null, 'v_kaku').includes('Ganti 「く」→「か」'));
  assert.ok(kinds('bp_n5_070', null, 'v_kau').includes('Ganti 「う」→「わ」'));
  // 書く → 書き (batang ます): hanya ganti, tanpa tambah
  assert.deepEqual(kinds('bp_n5_037', null, 'v_kaku').slice(0, 2), ['Bentuk kamus', 'Ganti 「く」→「き」']);
  assert.equal(kinds('bp_n5_037', null, 'v_kaku')[2], '＋ たいです');
  // 帰る (Golongan 1 berakhiran る) → 帰ら + ない
  assert.ok(kinds('bp_n5_070', null, 'v_kaeru').includes('Ganti 「る」→「ら」'));
  // Golongan 2 tetap buang る: 食べる → 食べ + られる
  assert.deepEqual(kinds('bp_n4_187', null, 'v_taberu'), ['Bentuk kamus', 'Buang 「る」', 'Tambah 「られる」', 'Kalimat jadi']);
  // Bentuk て Golongan 1 (perubahan bunyi) tetap buang + tambah: 書く → 書 + いて
  assert.deepEqual(kinds('bp_n5_053', null, 'v_kaku').slice(1, 3), ['Buang 「く」', 'Tambah 「いて」']);
  // 読む memperlihatkan て bersuara.
  assert.equal(build('bp_n4_105', 'ちゃう', 'v_yomu').result.japanese, '読んじゃう');
});

test('pola dua verba berbeda: semua pilihan verba kedua menghasilkan bentuk dan arti yang benar', () => {
  for (const { r, br, i, tag } of BRANCHES) {
    if (!br.partner || br.partner.same) continue;
    for (const pv of PARTNER_VERBS) {
      for (const v of getRecipeVerbs(r, i)) {
        const anim = buildGrammarAnimation(r, v, i, pv);
        assert.ok(anim, `${tag} ${v.kanji} + ${pv.kanji}`);
        assert.ok(wanakana.isKana(anim.result.reading), `${tag} ${v.kanji} + ${pv.kanji}: ${anim.result.reading}`);
        const partnerSeg = anim.stages.find(s => s.kind === 'partner')!.segments.find(s => s.role === 'partner')!;
        assert.ok(partnerSeg.text.startsWith(pv.kanji.slice(0, 1)), `${tag}: verba kedua harus ${pv.kanji}`);
      }
    }
  }
  const tari = (pvId: string) => {
    const r = getGrammarAnimationRecipe('bp_n5_042')!;
    const kaku = getRecipeVerbs(r).find(v => v.id === 'v_kaku')!;
    return buildGrammarAnimation(r, kaku, 0, PARTNER_VERBS.find(p => p.id === pvId))!.result;
  };
  assert.equal(tari('p_asobu').japanese, '書いたり遊んだりする');
  assert.equal(tari('p_utau').japanese, '書いたり歌ったりする');
  assert.equal(tari('p_neru').japanese, '書いたり寝たりする');
  assert.equal(tari('p_neru').meaning, 'Menulis, tidur, dan sebagainya.');
});
