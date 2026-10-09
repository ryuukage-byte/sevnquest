// ==============================================================================
// GRAMMAR FUSION — RULE ENGINE
// Semua perubahan bentuk kata kerja dihitung oleh conjugateVerb() (inflectionEngine),
// bukan penggabungan string. Hanya sufiks pola (で, ください, ほうがいい, ...) yang ditempel langsung.
// ==============================================================================

import { conjugateVerb, explainVerbConjugation } from '../morphology/inflectionEngine';
import type { ConjugationForm, VerbGroup } from '../types';
import type { FusionFormId, FusionRule, FusionRuleContext, FusionRuleId, FusionRuleResult, FusionStage, FusionWord } from './types';

export const FUSION_FORM_LABEL: Record<FusionFormId, string> = {
  jisho: 'Bentuk kamus',
  nai: 'Bentuk nai',
  nai_de: 'Bentuk nai + で',
  nai_de_kudasai: 'Larangan sopan ないでください',
  te: 'Bentuk te',
  ta: 'Bentuk ta (lampau)',
  masu: 'Bentuk masu',
  masu_stem: 'Akar masu (連用形)',
  volitional: 'Bentuk volisional (意向形)',
};

/** Bentuk konjugasi yang tersedia sebagai komponen "ubah bentuk". */
export const CONJ_COMPONENTS: Partial<Record<ConjugationForm, { label: string; hint: string; kana: string }>> = {
  nai: { label: 'ない形', hint: '〜ない', kana: 'ない' },
  te: { label: 'て形', hint: '〜て', kana: 'て' },
  ta: { label: 'た形', hint: '〜た', kana: 'た' },
  masu: { label: 'ます形', hint: '〜ます', kana: 'ます' },
  masu_stem: { label: 'ます語幹', hint: '〜ます → 食べ', kana: '' },
  volitional: { label: '意向形', hint: '〜よう / 〜おう', kana: '' },
};

const GROUP_LABEL: Record<VerbGroup, string> = {
  ichidan: 'kelompok II (ichidan)',
  godan: 'kelompok I (godan)',
  kuru: 'kata kerja tak beraturan 来る',
  suru: 'kata kerja tak beraturan する',
};

export function formLabel(form: FusionFormId, stage?: Pick<FusionStage, 'formLabels'>): string {
  return stage?.formLabels?.[form] ?? FUSION_FORM_LABEL[form] ?? form;
}

/** Rule "ubah kata dasar (bentuk kamus) ke bentuk X" — hasil dari conjugateVerb(). */
export function makeConjugationRule(form: ConjugationForm): FusionRule {
  const info = CONJ_COMPONENTS[form];
  const label = info?.label ?? form;
  return {
    id: `dictionary_to_${form}`,
    label,
    hint: info?.hint ?? '',
    requires: 'jisho',
    produces: form,
    whyNot: `${label} dibentuk dari bentuk kamus, bukan dari kata yang sudah berubah.`,
    apply: ({ base }): FusionRuleResult => {
      const res = conjugateVerb(base.japanese, base.reading);
      const out = res.forms[form];
      const ex = explainVerbConjugation(base.japanese, base.reading, form);
      const removed = ex?.steps.find(s => s.kind === 'remove')?.part ?? '';
      const added = ex?.steps.find(s => s.kind === 'add')?.part ?? '';
      const change =
        removed && added
          ? `${removed} dihilangkan, lalu ${added} ditambahkan`
          : removed
            ? `${removed} dihilangkan`
            : added
              ? `${added} ditambahkan`
              : 'bentuk berubah mengikuti aturan kelompoknya';
      return {
        word: { japanese: out.japanese, reading: out.reading },
        form,
        explanation:
          `Bentuk kamus ${base.japanese} berubah menjadi ${formLabel(form).toLowerCase()} ${out.japanese}. ` +
          `Kata kerja ${base.japanese} termasuk ${GROUP_LABEL[res.group]}, sehingga ${change}.`,
      };
    },
  };
}

/** Rule "tempelkan sufiks pola" — dipakai oleh で, ください, dan sufiks pola apa pun. */
export function makeAppendRule(opts: {
  id: FusionRuleId;
  suffix: string;
  suffixReading?: string;
  requires: FusionFormId;
  produces: FusionFormId;
  label?: string;
  hint: string;
  whyNot: string;
  explain: (before: FusionWord, after: FusionWord) => string;
}): FusionRule {
  const reading = opts.suffixReading ?? opts.suffix;
  return {
    id: opts.id,
    label: opts.label ?? opts.suffix,
    hint: opts.hint,
    requires: opts.requires,
    produces: opts.produces,
    whyNot: opts.whyNot,
    apply: ({ current }): FusionRuleResult => {
      const word = { japanese: current.japanese + opts.suffix, reading: current.reading + reading };
      return { word, form: opts.produces, explanation: opts.explain(current, word) };
    },
  };
}

export const FUSION_RULES: Record<FusionRuleId, FusionRule> = {
  dictionary_to_nai: makeConjugationRule('nai'),
  dictionary_to_te: makeConjugationRule('te'),
  dictionary_to_masu: makeConjugationRule('masu'),
  add_de: makeAppendRule({
    id: 'add_de', suffix: 'で', requires: 'nai', produces: 'nai_de', hint: '〜ないで',
    whyNot: 'で pada pola larangan hanya menempel setelah bentuk ない.',
    explain: before => `${before.japanese} + で → ${before.japanese}で. Partikel で menyambung bentuk ない menjadi "tanpa melakukan / jangan melakukan".`,
  }),
  add_kudasai: makeAppendRule({
    id: 'add_kudasai', suffix: 'ください', requires: 'nai_de', produces: 'nai_de_kudasai', hint: '〜でください',
    whyNot: 'ください baru dipakai setelah ないで terbentuk.',
    explain: before => `${before.japanese} + ください → ${before.japanese}ください. ください menjadikannya permintaan sopan: "tolong jangan ...".`,
  }),
};

/** Cari rule: rule khusus stage lebih dulu, lalu rule bawaan. */
export function getRule(id: FusionRuleId, stage?: Pick<FusionStage, 'rules'>): FusionRule {
  const rule = stage?.rules?.[id] ?? FUSION_RULES[id];
  if (!rule) throw new Error(`Fusion rule tidak dikenal: ${id}`);
  return rule;
}

/** Terapkan rule; null bila bentuk saat ini tidak memenuhi syarat rule. */
export function applyRule(
  id: FusionRuleId,
  ctx: FusionRuleContext,
  stage?: Pick<FusionStage, 'rules'>
): FusionRuleResult | null {
  const rule = getRule(id, stage);
  if (ctx.form !== rule.requires) return null;
  return rule.apply(ctx);
}
