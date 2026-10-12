// ==============================================================================
// RECALL — ENGINE BUNPOU: GRAMMAR FUSION + KONJUGASI
// Memetakan item bunpou ke pola Fusion (pola library `lib_<bunpouId>_<bentuk>` diturunkan dari
// rumus bunpou itu sendiri) dan membuat soal konjugasi dari conjugateVerb(). Tidak ada aturan
// konjugasi baru: hasil selalu dari inflectionEngine yang sama dengan Fusion / Library.
// ==============================================================================

import { getFusionPatterns, getFusionVerbs, type FusionVerbEntry } from '../../data/fusion/verbPool';
import { conjugateVerb, explainVerbConjugation } from '../morphology/inflectionEngine';
import { FUSION_FORM_LABEL } from '../fusion/rules';
import type { ConjugationForm, GrammarPatternSchema } from '../types';
import type { Question } from '../../types/content';

let patternIndex: Map<string, GrammarPatternSchema> | null = null;

/** Pola Fusion untuk sebuah item bunpou (null bila rumusnya bukan "V<bentuk> ＋ akhiran"). */
export function getFusionPatternForBunpou(bunpouId: string): GrammarPatternSchema | null {
  if (!patternIndex) {
    patternIndex = new Map();
    for (const p of getFusionPatterns()) {
      const m = /^lib_(.+)_[a-z_]+$/.exec(p.id);
      if (m && !patternIndex.has(m[1])) patternIndex.set(m[1], p);
    }
  }
  return patternIndex.get(bunpouId) ?? null;
}

let verbPool: FusionVerbEntry[] | null = null;

/** Kata kerja dasar untuk latihan: level dasar dulu (N5/N4), dan harus bisa dikonjugasi ke bentuk yang dibutuhkan pola. */
export function pickRecallVerb(pattern: GrammarPatternSchema, rand: () => number = Math.random): FusionVerbEntry | null {
  if (!verbPool) {
    const all = getFusionVerbs();
    const basic = all.filter(v => v.level === 'N5' || v.level === 'N4');
    verbPool = basic.length >= 20 ? basic : all;
  }
  const form = pattern.requiredConjugation as ConjugationForm;
  for (let i = 0; i < 40; i++) {
    const v = verbPool[Math.floor(rand() * verbPool.length)];
    if (!v) return null;
    const forms = conjugateVerb(v.japanese, v.reading).forms;
    if (forms[form]?.japanese && forms.jisho?.japanese) return v;
  }
  return null;
}

const FORMS_FOR_DECOYS: ConjugationForm[] = ['masu', 'te', 'ta', 'nai', 'nakatta', 'volitional', 'ba', 'tara', 'potential'];

/** Soal konjugasi: ubah kata kerja ke bentuk yang dituntut pola bunpou; pengecoh = bentuk lain dari kata yang sama. */
export function buildConjugationQuestion(
  pattern: GrammarPatternSchema,
  verb: FusionVerbEntry,
  shuffle: <T>(a: T[]) => T[],
  level: 1 | 2 | 3 | 4 | 5
): Question | null {
  const form = pattern.requiredConjugation as ConjugationForm;
  if (form === 'jisho') return null; // pola memakai bentuk kamus apa adanya: tidak ada yang dikonjugasi
  const res = conjugateVerb(verb.japanese, verb.reading);
  const answer = res.forms[form]?.japanese;
  if (!answer) return null;

  const wrong: string[] = [];
  for (const f of shuffle(FORMS_FOR_DECOYS.filter(x => x !== form))) {
    const t = res.forms[f]?.japanese;
    if (t && t !== answer && !wrong.includes(t)) wrong.push(t);
    if (wrong.length === 3) break;
  }
  if (wrong.length < 3) return null;

  const options = shuffle([answer, ...wrong]);
  const label = FUSION_FORM_LABEL[form] ?? form;
  const exp = explainVerbConjugation(verb.japanese, verb.reading, form);
  const steps = exp ? exp.steps.map(s => (s.kind === 'base' ? s.text : s.kind === 'remove' ? `buang ${s.part}` : `tambah ${s.part}`)).join(' → ') : '';
  return {
    id: `rc_conj_${verb.id}_${form}`,
    prompt: `【Level ${level}: Konjugasi】\nPola 「${pattern.pattern}」 memakai ${label.toLowerCase()}.\nUbah 「${verb.japanese}」 (${verb.reading}) ke bentuk yang benar:`,
    options,
    correctIndex: options.indexOf(answer),
    difficultyLevel: level,
    explanation: `${verb.japanese} → ${answer} (${label}). ${steps}. Lalu disambung: ${answer}${pattern.fixedSuffix} = ${pattern.pattern}.`
  };
}
