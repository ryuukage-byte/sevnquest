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
// Penulisan bentuk kata kerja versi Indonesia: "Kata Kerja [Bentuk Masu]" -> bentuk konjugasi engine.
// "Bentuk Masu" di rumus library selalu berarti akar ます (食べ + 方, 食べ + たい), bukan ます penuh.
const ID_FORM_MAP: Record<string, ConjugationForm> = { Kamus: 'jisho', Masu: 'masu_stem' };

// Sufiks yang hanya deretan akhiran konjugasi (bukan pola) tidak dipakai.
const BARE_ENDINGS = new Set(['る', 'ない', 'た', 'て', 'だ', 'ます', 'ません', 'ました']);

/**
 * extended=false: perilaku asli (Altar Pola & Kata) — hanya rumus "V<bentuk> ＋ akhiran" utuh.
 * extended=true: dipakai Grammar Fusion — juga rumus bercabang "；" dan penulisan "Kata Kerja [Bentuk X]".
 */
function buildLibraryPatterns(extended: boolean): GrammarPatternSchema[] {
  const result: GrammarPatternSchema[] = [];
  for (const item of Object.values(BUNPOU_DATABASE)) {
    // Satu entri bisa memuat beberapa rumus yang dipisah "；".
    for (const alt of extended ? item.formula.split(/[；;]/) : [item.formula]) {
      const parts = alt.trim().split(/[＋+]/).map(p => p.trim());
      if (parts.length !== 2) continue;

      const suffix = parts[1].split(/[／/；;。]/)[0].replace(/[（(].*$/, '').replace(/….*$/, '').trim();
      if (!suffix || /[A-Za-z]/.test(suffix) || BARE_ENDINGS.has(suffix)) continue;

      const forms: ConjugationForm[] = [];
      const idForm = !extended ? null : parts[0].match(/^Kata Kerja\s*\[Bentuk (Kamus|Masu)\]$/);
      if (idForm) {
        forms.push(ID_FORM_MAP[idForm[1]]);
      } else {
        for (const left of parts[0].split(/[／/]/)) {
          const m = left.trim().match(/^V(る|ない|て|た|よう|ます)$/);
          if (!m) continue;
          // "Vます ＋ 上げる/切る/かける/たて" memakai akar ます (食べ), bukan ます penuh; hanya "Vます ＋ ように" yang memakai ます.
          forms.push(m[1] === 'ます' && !suffix.startsWith('よう') ? 'masu_stem' : FORM_MAP[m[1]]);
        }
      }

      const example = item.examples[0];
      for (const form of forms) {
        const id = `lib_${item.id}_${form}`;
        if (result.some(r => r.id === id)) continue;
        result.push({
          id,
          pattern: `〜${suffix}`,
          title: item.title,
          jlpt: (item.level as GrammarPatternSchema['jlpt']) || 'N3',
          predicateType: 'verb',
          requiredConjugation: form,
          fixedSuffix: suffix,
          slots: [{ role: 'predicate', required: true, allowedWordTypes: ['verb'], conjugationRequirement: form }],
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
  }
  return result;
}

export const LIBRARY_PATTERN_SCHEMAS: GrammarPatternSchema[] = buildLibraryPatterns(false);

/** Pola library yang lebih lengkap untuk Grammar Fusion. */
export const LIBRARY_PATTERN_SCHEMAS_EXTENDED: GrammarPatternSchema[] = buildLibraryPatterns(true);
