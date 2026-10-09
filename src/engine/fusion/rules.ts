// ==============================================================================
// GRAMMAR FUSION — RULE ENGINE
// Semua perubahan bentuk kata kerja dihitung oleh conjugateVerb() (inflectionEngine),
// bukan penggabungan string. Hanya sufiks pola (で, ください) yang ditempel langsung.
// ==============================================================================

import { conjugateVerb, explainVerbConjugation } from '../morphology/inflectionEngine';
import type { ConjugationForm, VerbGroup } from '../types';
import type { FusionFormId, FusionRule, FusionRuleId, FusionRuleResult, FusionWord } from './types';

export const FUSION_FORM_LABEL: Record<FusionFormId, string> = {
  jisho: 'Bentuk kamus',
  nai: 'Bentuk nai',
  nai_de: 'Bentuk nai + で',
  nai_de_kudasai: 'Larangan sopan ないでください',
  te: 'Bentuk te',
  masu: 'Bentuk masu',
};

const GROUP_LABEL: Record<VerbGroup, string> = {
  ichidan: 'kelompok II (ichidan)',
  godan: 'kelompok I (godan)',
  kuru: 'kata kerja tak beraturan 来る',
  suru: 'kata kerja tak beraturan する',
};

const FORM_NAME: Partial<Record<ConjugationForm, string>> = {
  nai: 'ない',
  te: 'て',
  masu: 'ます',
};

function conjugateRule(
  id: FusionRuleId,
  form: ConjugationForm,
  produces: FusionFormId,
  label: string,
  hint: string,
  whyNot: string
): FusionRule {
  return {
    id,
    label,
    hint,
    requires: 'jisho',
    produces,
    whyNot,
    apply: ({ base }): FusionRuleResult => {
      const res = conjugateVerb(base.japanese, base.reading);
      const out = res.forms[form];
      const ex = explainVerbConjugation(base.japanese, base.reading, form);
      const removed = ex?.steps.find(s => s.kind === 'remove')?.part ?? '';
      const added = ex?.steps.find(s => s.kind === 'add')?.part ?? '';
      const groupText = GROUP_LABEL[res.group];
      const change =
        removed && added
          ? `${removed} dihilangkan, lalu ${added} ditambahkan`
          : added
            ? `${added} ditambahkan`
            : 'bentuk berubah mengikuti aturan kelompoknya';
      return {
        word: { japanese: out.japanese, reading: out.reading },
        form: produces,
        explanation:
          `Bentuk kamus berubah menjadi ${FUSION_FORM_LABEL[produces].toLowerCase()}. ` +
          `Kata kerja ${base.japanese} termasuk ${groupText}, sehingga ${change} (${FORM_NAME[form] ?? ''}).`,
      };
    },
  };
}

function appendRule(
  id: FusionRuleId,
  suffix: string,
  suffixReading: string,
  requires: FusionFormId,
  produces: FusionFormId,
  label: string,
  hint: string,
  whyNot: string,
  explain: (before: FusionWord) => string
): FusionRule {
  return {
    id,
    label,
    hint,
    requires,
    produces,
    whyNot,
    apply: ({ current }): FusionRuleResult => ({
      word: { japanese: current.japanese + suffix, reading: current.reading + suffixReading },
      form: produces,
      explanation: explain(current),
    }),
  };
}

export const FUSION_RULES: Record<FusionRuleId, FusionRule> = {
  dictionary_to_nai: conjugateRule(
    'dictionary_to_nai', 'nai', 'nai', 'ない形', '〜ない',
    'ない形 hanya bisa dibentuk dari bentuk kamus.'
  ),
  dictionary_to_te: conjugateRule(
    'dictionary_to_te', 'te', 'te', 'て形', '〜て',
    'て形 dibentuk dari bentuk kamus, bukan dari kata yang sudah berubah.'
  ),
  dictionary_to_masu: conjugateRule(
    'dictionary_to_masu', 'masu', 'masu', 'ます形', '〜ます',
    'ます形 dibentuk dari bentuk kamus, bukan dari kata yang sudah berubah.'
  ),
  add_de: appendRule(
    'add_de', 'で', 'で', 'nai', 'nai_de', 'で', '〜ないで',
    'で pada pola larangan hanya menempel setelah bentuk ない.',
    before => `${before.japanese} + で → ${before.japanese}で. Partikel で menyambung bentuk ない menjadi "tanpa melakukan / jangan melakukan".`
  ),
  add_kudasai: appendRule(
    'add_kudasai', 'ください', 'ください', 'nai_de', 'nai_de_kudasai', 'ください', '〜でください',
    'ください baru dipakai setelah ないで terbentuk.',
    before => `${before.japanese} + ください → ${before.japanese}ください. ください menjadikannya permintaan sopan: "tolong jangan ...".`
  ),
};

export function getRule(id: FusionRuleId): FusionRule {
  return FUSION_RULES[id];
}

/** Terapkan rule; null bila bentuk saat ini tidak memenuhi syarat rule. */
export function applyRule(id: FusionRuleId, ctx: { base: FusionWord; current: FusionWord; form: FusionFormId }): FusionRuleResult | null {
  const rule = FUSION_RULES[id];
  if (ctx.form !== rule.requires) return null;
  return rule.apply(ctx);
}
