// ==============================================================================
// GRAMMAR FUSION — LATIHAN BEBAS
// Membangun FusionStage dari pola mana pun (PATTERN_SCHEMAS + pola library) dan
// kata kerja mana pun. Tidak ada aturan baru: konjugasi tetap lewat conjugateVerb().
// ==============================================================================

import type { AdjectiveForm, ConjugationForm, GrammarPatternSchema } from '../types';
import { ADJ_COMPONENTS, CONJ_COMPONENTS, FUSION_FORM_LABEL, formLabel, makeAdjectiveRule, makeAppendRule, makeConjugationRule } from './rules';
import type { FusionBaseWord, FusionRule, FusionStage, FusionWordKind } from './types';

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

/** Jenis kata yang dibutuhkan sebuah pola (kata kerja / kata benda / kata sifat-i / kata sifat-na). */
export function patternWordKind(pattern: Pick<GrammarPatternSchema, 'predicateType'>): FusionWordKind {
  return pattern.predicateType;
}

const PARTICLE_DECOYS = ['の', 'に', 'で', 'と', 'を', 'が', 'は'];
const ADJ_DECOY_FORMS = Object.keys(ADJ_COMPONENTS) as AdjectiveForm[];

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
  const kind = patternWordKind(pattern);
  const suffix = pattern.fixedSuffix;
  const suffixReading = SUFFIX_READINGS[suffix] ?? suffix;
  const doneForm = 'pattern_done';
  const rules: Record<string, FusionRule> = {};
  const steps: FusionStage['steps'] = [];
  const components: string[] = [];
  const formLabels: Record<string, string> = { [doneForm]: pattern.pattern, decoy_done: '—' };

  const meaningText = pattern.meaningTemplateId
    .replace('{predicate}', '...')
    .replace(/di \{location\}/g, '')
    .replace(/\{object\}|\{location\}|\{subject\}|\{target\}|\{time\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const addRule = (r: FusionRule) => {
    if (!rules[r.id]) {
      rules[r.id] = r;
      components.push(r.id);
    }
    return r;
  };

  // Bentuk awal di papan, bentuk sebelum sufiks, dan pengecoh "langkah kiri" (sebelum sufiks).
  let initialForm = 'jisho';
  let beforeSuffix = 'jisho';
  let beforeLabel = (FUSION_FORM_LABEL.jisho ?? 'jisho').toLowerCase();
  const leftDecoys: FusionRule[] = [];

  if (kind === 'verb') {
    const conj = pattern.requiredConjugation as ConjugationForm;
    if (conj !== 'jisho' && CONJ_COMPONENTS[conj]) {
      const rule = addRule(makeConjugationRule(conj));
      steps.push({
        ruleId: rule.id,
        instruction: `Pola ${pattern.pattern} memakai ${FUSION_FORM_LABEL[conj]?.toLowerCase() ?? conj}. Ubah kata ke bentuk itu.`,
        resultMeaning: `${FUSION_FORM_LABEL[conj] ?? conj} dari ${verb.meaning}`,
      });
      beforeSuffix = conj;
      beforeLabel = (FUSION_FORM_LABEL[conj] ?? conj).toLowerCase();
    }
    for (const f of pickSome(FREE_FORMS.filter(f => f !== conj), 2, rand)) leftDecoys.push(makeConjugationRule(f));
  } else if (kind === 'noun') {
    initialForm = 'noun';
    beforeSuffix = 'noun';
    beforeLabel = 'kata benda';
    const p = pattern.leftParticle;
    if (p) {
      beforeSuffix = 'noun_particle';
      beforeLabel = `kata benda + ${p}`;
      formLabels.noun_particle = `Kata benda + ${p}`;
      const rule = addRule(makeAppendRule({
        id: 'add_particle', suffix: p, requires: 'noun', produces: beforeSuffix, hint: `〜${p}`,
        whyNot: `${p} ditempelkan langsung pada kata benda.`,
        explain: before => `${before.japanese} + ${p} → ${before.japanese}${p}. Partikel ${p} menyambung kata benda ke ${suffix}.`,
      }));
      steps.push({
        ruleId: rule.id,
        instruction: `Pola ${pattern.pattern} memakai kata benda + ${p}. Tempelkan ${p} dulu.`,
        resultMeaning: `${verb.meaning} + ${p}`,
      });
    }
    for (const p2 of pickSome(PARTICLE_DECOYS.filter(x => x !== p), 2, rand)) {
      leftDecoys.push(makeAppendRule({
        id: `decoy_particle_${p2}`, suffix: p2, requires: 'noun', produces: 'decoy_done', hint: `〜${p2}`,
        whyNot: `${p2} bukan partikel yang dipakai pola ini.`, explain: before => `${before.japanese}${p2}`,
      }));
    }
  } else {
    const type = kind === 'adjective-i' ? 'i' : 'na';
    const needsAttr = kind === 'adjective-na' && pattern.requiredConjugation === 'attributive';
    initialForm = kind === 'adjective-i' ? 'adj_i' : 'adj_na';
    beforeSuffix = initialForm;
    beforeLabel = (FUSION_FORM_LABEL[initialForm] ?? initialForm).toLowerCase();
    if (needsAttr) {
      const rule = addRule(makeAdjectiveRule('attributive', type, initialForm, 'adj_na_attr'));
      steps.push({
        ruleId: rule.id,
        instruction: `Pola ${pattern.pattern} memakai kata sifat-na + な. Tambahkan な dulu.`,
        resultMeaning: `${verb.meaning} + な`,
      });
      beforeSuffix = 'adj_na_attr';
      beforeLabel = (FUSION_FORM_LABEL.adj_na_attr ?? '').toLowerCase();
    }
    for (const f of pickSome(ADJ_DECOY_FORMS.filter(f => !(needsAttr && f === 'attributive') && !(type === 'i' && f === 'attributive')), 2, rand)) {
      leftDecoys.push(makeAdjectiveRule(f, type, initialForm, 'decoy_done'));
    }
  }

  // Sufiks pola
  const suffixRule = makeAppendRule({
    id: 'add_suffix',
    suffix,
    suffixReading,
    requires: beforeSuffix,
    produces: doneForm,
    hint: `〜${suffix}`,
    whyNot: `${suffix} hanya disambung setelah ${beforeLabel}.`,
    explain: (before, after) => `${before.japanese} + ${suffix} → ${after.japanese}. ${pattern.nuanceExplanation}`,
  });
  addRule(suffixRule);
  steps.push({
    ruleId: suffixRule.id,
    instruction: steps.length > 0
      ? `Tambahkan ${suffix} untuk membentuk ${pattern.pattern}.`
      : `Pola ini memakai ${beforeLabel} apa adanya. Tambahkan ${suffix}.`,
    resultMeaning: meaningText.replace('...', verb.meaning),
  });

  // Pengecoh: langkah kiri yang salah + sufiks pola lain
  for (const r of leftDecoys) addRule(r);
  const otherSuffixes = [...new Set((opts.allPatterns ?? []).map(p => p.fixedSuffix))].filter(s => s && s !== suffix);
  pickSome(otherSuffixes, 2, rand).forEach((s, i) => {
    addRule(makeAppendRule({
      id: `add_suffix_decoy_${i}`,
      suffix: s,
      suffixReading: SUFFIX_READINGS[s] ?? s,
      requires: beforeSuffix,
      produces: 'decoy_done',
      hint: `〜${s}`,
      whyNot: `${s} hanya disambung setelah ${beforeLabel}.`,
      explain: before => `${before.japanese}${s}`,
    }));
  });

  return {
    id: `free:${pattern.id}`,
    title: pattern.title,
    jlpt: pattern.jlpt,
    difficulty: DIFFICULTY[pattern.jlpt] ?? 3,
    initialForm,
    words: [verb],
    target: { pattern: pattern.pattern, meaning: meaningText, explanation: pattern.nuanceExplanation },
    steps,
    components,
    rules,
    formLabels,
    reward: FREE_REWARD,
  };
}

export { formLabel };
