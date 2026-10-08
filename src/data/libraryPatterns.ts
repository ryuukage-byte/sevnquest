import { GrammarPatternSchema, ConjugationForm } from '../engine/types';
import { BUNPOU_DATABASE } from './bunpou';

// Bentuk kata kerja di rumus library (mis. "Vる／Vない ＋ ようにする") -> bentuk konjugasi engine.
const FORM_MAP: Record<string, ConjugationForm> = {
  る: 'jisho',
  ない: 'nai',
  て: 'te',
  た: 'ta',
  よう: 'volitional',
  ます: 'masu',
};

// Ubah rumus library yang berbentuk "V<bentuk> ＋ <akhiran>" menjadi skema pola agar bisa dipakai Altar Pola & Kata.
// Rumus bebas (kata benda/adjektiva, tanpa pola V+akhiran) dilewati.
function buildLibraryPatterns(): GrammarPatternSchema[] {
  const result: GrammarPatternSchema[] = [];
  for (const item of Object.values(BUNPOU_DATABASE)) {
    const parts = item.formula.trim().split(/[＋+]/);
    if (parts.length !== 2) continue;

    const suffix = parts[1].split(/[／/；;。]/)[0].replace(/[（(].*$/, '').replace(/….*$/, '').trim();
    if (!suffix || /[A-Za-z]/.test(suffix)) continue;

    for (const left of parts[0].split(/[／/]/)) {
      const m = left.trim().match(/^V(る|ない|て|た|よう|ます)$/);
      if (!m) continue;
      const example = item.examples[0];
      result.push({
        id: `lib_${item.id}_${FORM_MAP[m[1]]}`,
        pattern: `〜${suffix}`,
        title: item.title,
        jlpt: (item.level as GrammarPatternSchema['jlpt']) || 'N3',
        predicateType: 'verb',
        requiredConjugation: FORM_MAP[m[1]],
        fixedSuffix: suffix,
        slots: [{ role: 'predicate', required: true, allowedWordTypes: ['verb'], conjugationRequirement: FORM_MAP[m[1]] }],
        meaningTemplateId: `{predicate} · ${item.meaningId}`,
        meaningTemplateEn: `{predicate} · ${item.meaningEn}`,
        nuanceExplanation: item.meaningId,
        example: example && {
          japanese: example.japanese,
          reading: example.reading,
          meaningId: example.meaningId,
        },
      });
    }
  }
  return result;
}

export const LIBRARY_PATTERN_SCHEMAS: GrammarPatternSchema[] = buildLibraryPatterns();
