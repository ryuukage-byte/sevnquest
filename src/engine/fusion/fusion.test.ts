import test from 'node:test';
import assert from 'node:assert/strict';
import { createFusionState, fusionReducer, diffWords, computeScore } from './fusionEngine';
import { applyRule } from './rules';
import { FUSION_STAGES } from '../../data/fusion/stages';
import { recordFusionClear } from './progress';
import type { FusionAction, FusionState } from './types';

const stage = FUSION_STAGES[0];
const start = () => createFusionState(stage, stage.words[0], () => 0.5);
const run = (s: FusionState, ...a: FusionAction[]) => a.reduce(fusionReducer, s);
const pick = (s: FusionState, id: any) => run(s, { type: 'SELECT', ruleId: id }, { type: 'CHECK' });
const settle = (s: FusionState) => fusionReducer(s, { type: 'ANIMATION_DONE' });

test('urutan 食べる → 食べない → 食べないで → 食べないでください', () => {
  let s = start();
  const seen = [s.currentWord.japanese];
  for (const step of stage.steps) { s = settle(pick(s, step.ruleId)); seen.push(s.currentWord.japanese); }
  assert.deepEqual(seen, ['食べる', '食べない', '食べないで', '食べないでください']);
  assert.equal(s.currentWord.reading, 'たべないでください');
  assert.equal(s.completed, true);
  assert.equal(s.currentForm, 'nai_de_kudasai');
});

test('pilihan salah menambah mistakes tapi tidak merusak progres', () => {
  let s = settle(pick(start(), 'dictionary_to_nai'));
  const before = s.currentWord;
  s = pick(s, 'dictionary_to_te');
  assert.equal(s.mistakes, 1);
  assert.equal(s.currentStep, 1);
  assert.deepEqual(s.currentWord, before);
  assert.equal(s.transformationHistory.length, 1);
  assert.equal(s.feedbackState?.kind, 'wrong');
  assert.match(s.feedbackState!.message, /で|て/);
});

test('urutan salah ditolak dengan alasan (で sebelum ない)', () => {
  const s = pick(start(), 'add_de');
  assert.equal(s.currentStep, 0);
  assert.equal(s.currentWord.japanese, '食べる');
  assert.match(s.feedbackState!.message, /ない/);
});

test('input diblokir saat animasi berlangsung', () => {
  const s = pick(start(), 'dictionary_to_nai'); // animasi belum selesai
  assert.notEqual(s.animationState, 'idle');
  assert.equal(fusionReducer(s, { type: 'SELECT', ruleId: 'add_de' }).selectedComponent, null);
  assert.equal(fusionReducer(s, { type: 'HINT' }).hintsUsed, 0);
});

test('CHECK tanpa pilihan tidak berubah; hint tidak dihitung ganda', () => {
  assert.equal(run(start(), { type: 'CHECK' }).mistakes, 0);
  const s = run(start(), { type: 'HINT' }, { type: 'HINT' });
  assert.equal(s.hintsUsed, 1);
  assert.equal(s.hintedComponent, 'dictionary_to_nai');
});

test('reset mengembalikan stage dari awal', () => {
  const s = run(settle(pick(start(), 'dictionary_to_nai')), { type: 'RESET' });
  assert.equal(s.currentStep, 0);
  assert.equal(s.currentWord.japanese, '食べる');
  assert.equal(s.transformationHistory.length, 0);
});

test('rule memakai engine konjugasi: godan & kuru/suru tidak ditebak', () => {
  const nai = (japanese: string, reading: string) =>
    applyRule('dictionary_to_nai', { base: { japanese, reading }, current: { japanese, reading }, form: 'jisho' })!.word.japanese;
  assert.equal(nai('飲む', 'のむ'), '飲まない');
  assert.equal(nai('書く', 'かく'), '書かない');
  assert.equal(nai('帰る', 'かえる'), '帰らない');
  assert.equal(nai('来る', 'くる'), '来ない');
  assert.equal(nai('勉強する', 'べんきょうする'), '勉強しない');
});

test('rule append menolak bentuk yang tidak memenuhi syarat', () => {
  const w = { japanese: '食べる', reading: 'たべる' };
  assert.equal(applyRule('add_de', { base: w, current: w, form: 'jisho' }), null);
  assert.equal(applyRule('dictionary_to_nai', { base: w, current: w, form: 'nai' }), null);
});

test('diffWords & skor & progres', () => {
  assert.deepEqual(diffWords('食べる', '食べない'), { kept: '食べ', removed: 'る', added: 'ない' });
  assert.deepEqual(diffWords('食べない', '食べないで'), { kept: '食べない', removed: '', added: 'で' });
  assert.deepEqual(computeScore(stage, 0, 0), stage.reward);
  assert.equal(computeScore(stage, 20, 20).exp, Math.round(stage.reward.exp * 0.5));
  const a = recordFusionClear({ cleared: {} }, 's', 2, 1);
  assert.equal(a.firstClear, true);
  assert.equal(recordFusionClear(a.progress, 's', 0, 0).firstClear, false);
});

test('data stage konsisten: tiap langkah valid berurutan & ada komponen', () => {
  for (const st of FUSION_STAGES) {
    for (const w of st.words) {
      let s = createFusionState(st, w);
      for (const step of st.steps) { assert.ok(s.availableComponents.includes(step.ruleId)); s = settle(pick(s, step.ruleId)); }
      assert.equal(s.completed, true, `${st.id}/${w.japanese}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Latihan Bebas: semua pola × semua kata kerja
// ---------------------------------------------------------------------------
import { buildFreeStage, patternWordKind } from './freeStage';
import { getFusionPatterns, getFusionVerbs, getFusionWords } from '../../data/fusion/verbPool';

const verbs = getFusionVerbs();
const patterns = getFusionPatterns();

function playFree(patternId: string, japanese: string) {
  const pattern = patterns.find(p => p.id === patternId)!;
  const verb = verbs.find(v => v.japanese === japanese)!;
  const st = buildFreeStage(pattern, verb, { allPatterns: patterns, rand: () => 0.5 });
  let s = createFusionState(st, verb, () => 0.5);
  for (const step of st.steps) s = settle(pick(s, step.ruleId));
  return s;
}

test('Latihan Bebas: seluruh kombinasi pola × kata kerja bisa diselesaikan', () => {
  assert.ok(verbs.length > 1000 && patterns.length >= 60);
  const failures: string[] = [];
  for (const p of patterns.filter(p => p.predicateType === 'verb')) {
    for (const v of verbs) {
      const st = buildFreeStage(p, v, { allPatterns: patterns, rand: () => 0.5 });
      let s = createFusionState(st, v, () => 0.5);
      for (const step of st.steps) s = settle(pick(s, step.ruleId));
      const ok = s.completed && s.currentWord.japanese.endsWith(p.fixedSuffix) && s.currentWord.reading.length > 0;
      if (!ok && failures.length < 5) failures.push(`${p.id}/${v.japanese}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('Latihan Bebas: hasil akhir persis conjugateVerb(bentuk pola) + sufiks', () => {
  assert.equal(playFree('te_wa_ikenai', '行く').currentWord.japanese, '行ってはいけない');
  assert.equal(playFree('te_mo_ii', '飲む').currentWord.japanese, '飲んでもいい');
  assert.equal(playFree('nai_hou_ga_ii', 'ある').currentWord.japanese, 'ないほうがいい');
  assert.equal(playFree('ta_hou_ga_ii', '来る').currentWord.japanese, '来たほうがいい');
  const suruVerb = verbs.find(v => v.japanese.length > 2 && v.japanese.endsWith('する'))!;
  assert.equal(playFree('te_wa_ikenai', suruVerb.japanese).currentWord.reading, suruVerb.reading.slice(0, -2) + 'してはいけない');
});

test('Latihan Bebas: pola berbentuk kamus hanya 1 langkah; pengecoh ditolak dengan alasan', () => {
  const jisho = patterns.find(p => p.requiredConjugation === 'jisho')!;
  const verb = verbs.find(v => v.japanese === '食べる')!;
  const st = buildFreeStage(jisho, verb, { allPatterns: patterns, rand: () => 0.5 });
  assert.equal(st.steps.length, 1);
  const decoy = st.components.find(c => c.startsWith('dictionary_to_'))!;
  const s = pick(createFusionState(st, verb, () => 0.5), decoy);
  assert.equal(s.currentStep, 0);
  assert.equal(s.mistakes, 1);
  assert.equal(s.currentWord.japanese, '食べる');
  assert.ok(s.feedbackState!.message.length > 10);
});

test('pola library "Vます＋上げる/切る" memakai akar ます', () => {
  const ageru = patterns.find(p => p.fixedSuffix === '上げる');
  assert.equal(ageru?.requiredConjugation, 'masu_stem');
  const s = (() => {
    const verb = verbs.find(v => v.japanese === '書く')!;
    const st = buildFreeStage(ageru!, verb, { allPatterns: patterns, rand: () => 0.5 });
    let state = createFusionState(st, verb, () => 0.5);
    for (const step of st.steps) state = settle(pick(state, step.ruleId));
    return state.currentWord;
  })();
  assert.equal(s.japanese, '書き上げる');
  assert.equal(s.reading, 'かきあげる');
});

test('DROP benar langsung bertransformasi; DROP salah ditolak dan dihitung', () => {
  const ok = fusionReducer(start(), { type: 'DROP', ruleId: stage.steps[0].ruleId });
  assert.equal(ok.currentStep, 1);
  assert.equal(ok.animationState, 'approach');
  const bad = fusionReducer(start(), { type: 'DROP', ruleId: stage.steps[1].ruleId });
  assert.equal(bad.currentStep, 0);
  assert.equal(bad.mistakes, 1);
  assert.equal(bad.currentWord.japanese, start().currentWord.japanese);
  assert.equal(fusionReducer(ok, { type: 'DROP', ruleId: stage.steps[1].ruleId }), ok);
});

// ---------------------------------------------------------------------------
// Pola kata benda & kata sifat
// ---------------------------------------------------------------------------
const playWord = (patternId: string, japanese: string) => {
  const pattern = patterns.find(p => p.id === patternId)!;
  const word = getFusionWords(patternWordKind(pattern)).find(w => w.japanese === japanese)!;
  assert.ok(pattern && word, `${patternId}/${japanese}`);
  const st = buildFreeStage(pattern, word, { allPatterns: patterns, rand: () => 0.5 });
  let s = createFusionState(st, word, () => 0.5);
  for (const step of st.steps) s = settle(pick(s, step.ruleId));
  return s;
};

test('pola kata benda & kata sifat: tiap pola selesai dengan kata dasar jenisnya', () => {
  const nonVerb = patterns.filter(p => p.predicateType !== 'verb');
  assert.ok(nonVerb.length >= 50);
  const failures: string[] = [];
  for (const p of nonVerb) {
    const words = getFusionWords(patternWordKind(p));
    assert.ok(words.length > 50, p.id);
    for (const w of words.slice(0, 30)) {
      const st = buildFreeStage(p, w, { allPatterns: patterns, rand: () => 0.5 });
      let s = createFusionState(st, w, () => 0.5);
      for (const step of st.steps) s = settle(pick(s, step.ruleId));
      const expected = `${w.japanese}${p.leftParticle ?? ''}${p.fixedSuffix}`;
      const na = p.requiredConjugation === 'attributive' ? 'な' : '';
      if (!s.completed || !(s.currentWord.japanese === expected || (na && s.currentWord.japanese === `${w.japanese}${na}${p.fixedSuffix}`)) || !s.currentWord.reading) {
        if (failures.length < 5) failures.push(`${p.id}/${w.japanese} -> ${s.currentWord.japanese}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test('pola kata benda: partikel lalu sufiks; kata sifat-i langsung; kata sifat-na + な', () => {
  assert.equal(playWord('lib_w2d2g1_noun_に', '学校').currentWord.japanese, '学校に関して');
  assert.equal(playWord('lib_w1d3g2_noun', '学校').currentWord.japanese, '学校らしい');
  assert.equal(playWord('lib_w4d3g2_adj_i', '暑い').currentWord.japanese, '暑いほど');
  assert.equal(playWord('lib_w4d3g2_adj_na_attr', '静か').currentWord.japanese, '静かなほど');
  assert.equal(playWord('lib_w4d3g2_adj_na_attr', '静か').currentWord.reading, 'しずかなほど');
  assert.equal(playWord('lib_bp_n5_019_adj_na', '静か').currentWord.japanese, '静かで');
});

test('pola kata benda: pengecoh partikel ditolak dengan alasan', () => {
  const pattern = patterns.find(p => p.id === 'lib_w2d2g1_noun_に')!;
  const word = getFusionWords('noun').find(w => w.japanese === '学校')!;
  const st = buildFreeStage(pattern, word, { allPatterns: patterns, rand: () => 0.5 });
  assert.equal(st.initialForm, 'noun');
  assert.equal(st.steps.length, 2);
  const decoy = st.components.find(c => c.startsWith('decoy_particle_'))!;
  const s = pick(createFusionState(st, word, () => 0.5), decoy);
  assert.equal(s.mistakes, 1);
  assert.equal(s.currentWord.japanese, '学校');
  assert.ok(s.feedbackState!.message.length > 10);
});
