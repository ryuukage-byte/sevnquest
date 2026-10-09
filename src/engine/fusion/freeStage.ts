// ==============================================================================
// GRAMMAR FUSION — LATIHAN BEBAS
// Membangun FusionStage dari pola mana pun (PATTERN_SCHEMAS + pola library) dan
// kata kerja mana pun. Tidak ada aturan baru: konjugasi tetap lewat conjugateVerb().
// ==============================================================================

import type { ConjugationForm, GrammarPatternSchema } from '../types';
import { CONJ_COMPONENTS, FUSION_FORM_LABEL, formLabel, makeAppendRule, makeConjugationRule } from './rules';
import type { FusionBaseWord, FusionRule, FusionStage } from './types';

/** Bacaan sufiks pola yang memuat kanji (sufiks lain sudah kana, bacaannya sama). */
const SUFFIX_READINGS: Record<string, string> = {
  'と思う': 'とおもう',
  '上げる': 'あげる',
  '切る': 'きる',
};

const DIFFICULTY: Record<GrammarPatternSchema['jlpt'], FusionStage['difficulty']> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
const FREE_REWARD = { exp: 15, gold: 8 };
const FREE_FORMS = Object.keys(CONJ_COMPONENTS) as ConjugationForm[];

const pickSome = <T,>(items: T[], n: number, rand: () => number): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

/** Kata dasar untuk pola: bentuk kamus + arti. */
export interface FreeStageOptions {
  /** Pola lain untuk dijadikan sufiks pengecoh. */
  allPatterns?: GrammarPatternSchema[];
  rand?: () => number;
}

export function buildFreeStage(
  pattern: GrammarPatternSchema,
  verb: FusionBaseWord,
  opts: FreeStageOptions = {}
): FusionStage {
  const rand = opts.rand ?? Math.random;
  const conj = pattern.requiredConjugation as ConjugationForm;
  const needsConj = conj !== 'jisho';
  const suffix = pattern.fixedSuffix;
  const suffixReading = SUFFIX_READINGS[suffix] ?? suffix;
  const doneForm = 'pattern_done';
  const rules: Record<string, FusionRule> = {};
  const steps: FusionStage['steps'] = [];
  const components: string[] = [];

  const meaningText = pattern.meaningTemplateId
    .replace('{predicate}', '...')
    .replace(/di \{location\}/g, '')
    .replace(/\{object\}|\{location\}|\{subject\}|\{target\}|\{time\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Konjugasi (bila pola butuh bentuk selain kamus)
  if (needsConj && CONJ_COMPONENTS[conj]) {
    const rule = makeConjugationRule(conj);
    rules[rule.id] = rule;
    components.push(rule.id);
    steps.push({
      ruleId: rule.id,
      instruction: `Pola ${pattern.pattern} memakai ${FUSION_FORM_LABEL[conj]?.toLowerCase() ?? conj}. Ubah kata ke bentuk itu.`,
      resultMeaning: `${FUSION_FORM_LABEL[conj] ?? conj} dari ${verb.meaning}`,
    });
  }

  // 2. Sufiks pola
  const suffixRule = makeAppendRule({
    id: 'add_suffix',
    suffix,
    suffixReading,
    requires: needsConj ? conj : 'jisho',
    produces: doneForm,
    hint: `〜${suffix}`,
    whyNot: `${suffix} hanya disambung setelah ${(FUSION_FORM_LABEL[conj] ?? conj).toLowerCase()}.`,
    explain: (before, after) =>
      `${before.japanese} + ${suffix} → ${after.japanese}. ${pattern.nuanceExplanation}`,
  });
  rules[suffixRule.id] = suffixRule;
  components.push(suffixRule.id);
  steps.push({
    ruleId: suffixRule.id,
    instruction: needsConj
      ? `Tambahkan ${suffix} untuk membentuk ${pattern.pattern}.`
      : `Pola ini memakai bentuk kamus apa adanya. Tambahkan ${suffix}.`,
    resultMeaning: meaningText.replace('...', verb.meaning),
  });

  // 3. Pengecoh: bentuk konjugasi lain + sufiks pola lain
  const wrongForms = FREE_FORMS.filter(f => f !== conj);
  for (const f of pickSome(wrongForms, needsConj ? 2 : 2, rand)) {
    const r = makeConjugationRule(f);
    rules[r.id] = r;
    components.push(r.id);
  }
  const otherSuffixes = [...new Set((opts.allPatterns ?? []).map(p => p.fixedSuffix))].filter(s => s && s !== suffix);
  pickSome(otherSuffixes, 2, rand).forEach((s, i) => {
    const r = makeAppendRule({
      id: `add_suffix_decoy_${i}`,
      suffix: s,
      suffixReading: SUFFIX_READINGS[s] ?? s,
      requires: needsConj ? conj : 'jisho',
      produces: 'decoy_done',
      hint: `〜${s}`,
      whyNot: `${s} hanya disambung setelah ${(FUSION_FORM_LABEL[conj] ?? conj).toLowerCase()}.`,
      explain: before => `${before.japanese}${s}`,
    });
    rules[r.id] = r;
    components.push(r.id);
  });

  return {
    id: `free:${pattern.id}`,
    title: pattern.title,
    jlpt: pattern.jlpt,
    difficulty: DIFFICULTY[pattern.jlpt] ?? 3,
    words: [verb],
    target: { pattern: pattern.pattern, meaning: meaningText, explanation: pattern.nuanceExplanation },
    steps,
    components,
    rules,
    formLabels: { [doneForm]: pattern.pattern, decoy_done: '—' },
    reward: FREE_REWARD,
  };
}

export { formLabel };
