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
