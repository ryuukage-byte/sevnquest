import { GrammarPatternSchema, ConjugationForm, AdjectiveForm } from '../engine/types';
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

// Pola kata benda / kata sifat yang sudah dicek manual per rumus. Rumus "V/A/na/N ＋ ..." di Kamus Pola menyingkat
// cara menyambung (mis. Nの／naな／Nである), jadi hanya kombinasi di bawah yang hasil fusinya benar secara tata bahasa.
// Kunci: noun, noun_<partikel>, adj_i (Aい kamus), adj_na (na tanpa な), adj_na_attr (naな).
const NON_VERB_ALLOW: Record<string, string[]> = {
  w1d3g1: ['noun', 'adj_i', 'adj_na'], w1d3g2: ['noun'], w1d3g3: ['noun'], w1d5g1: ['noun_の'],
  w2d1g1: ['noun'], w2d1g3: ['noun', 'noun_に', 'noun_で'], w2d2g1: ['noun_に'], w2d2g2: ['noun_に'], w2d2g3: ['noun_に'], w2d2g4: ['noun_に'],
  w2d3g3: ['noun_の', 'adj_i'], w2d4g2: ['noun'], w2d5g1: ['noun', 'adj_i', 'adj_na'], w2d5g2: ['noun', 'adj_i', 'adj_na'], w2d5g3: ['noun', 'adj_i', 'adj_na'],
  w3d2g1: ['noun_と'], w3d2g4: ['noun', 'adj_i'], w3d3g2: ['adj_i'], w3d4g1: ['noun_の'], w3d4g2: ['noun_の'], w3d4g4: ['noun_の'], w3d5g1: ['noun_の'],
  w3d5g2: ['adj_i'], w3d5g4: ['noun'], w4d1g1: ['noun_に'], w4d1g2: ['adj_i'], w4d1g3: ['adj_i'], w4d1g4: ['noun', 'noun_で'], w4d2g3: ['adj_i'], w4d2g4: ['noun_に'],
  w4d3g1: ['noun', 'adj_i', 'adj_na_attr'], w4d3g2: ['adj_i', 'adj_na_attr'], w4d4g2: ['adj_i'], w5d1g2: ['adj_i'], w5d1g3: ['noun_に'], w5d1g4: ['noun_に'],
  w5d4g2: ['noun'], w5d4g4: ['noun'], w6d4g2: ['adj_i'], w6d4g3: ['adj_i'], w6d4g4: ['adj_i'],
  bp_n5_019: ['noun', 'adj_na'], bp_n4_010: ['noun'], bp_n4_018: ['noun'], bp_n4_092: ['noun'], bp_n4_104: ['noun'], bp_n4_185: ['noun'],
  bp_n2_033: ['noun'], bp_n2_034: ['noun'], bp_n2_037: ['noun'], bp_n2_083: ['noun'], bp_n2_111: ['noun'], bp_n2_134: ['noun'], bp_n2_135: ['noun'],
  bp_n2_136: ['noun'], bp_n2_138: ['noun'], bp_n2_141: ['noun'], bp_n2_144: ['noun'], bp_n2_150: ['noun'], bp_n2_151: ['noun'], bp_n2_153: ['noun'],
  bp_n2_155: ['noun'], bp_n2_156: ['noun'], bp_n2_163: ['noun'], bp_n2_191: ['noun'], bp_n2_205: ['noun'], bp_n2_206: ['noun'],
  bp_n1_038: ['noun'], bp_n1_056: ['noun'], bp_n1_091: ['noun'], bp_n1_111: ['noun'], bp_n1_112: ['noun'], bp_n1_117: ['noun'], bp_n1_131: ['noun'],
  bp_n1_149: ['noun'], bp_n1_162: ['noun'], bp_n1_169: ['noun'], bp_n1_170: ['noun'], bp_n1_172: ['noun'], bp_n1_173: ['noun'], bp_n1_184: ['noun'],
  bp_n1_192: ['noun'], bp_n1_194: ['noun'], bp_n1_195: ['noun'], bp_n1_201: ['noun'], bp_n1_202: ['noun'], bp_n1_204: ['noun'], bp_n1_220: ['noun'], bp_n1_223: ['noun'],
};

interface NonVerbLeft {
  key: string;
  type: 'noun' | 'adjective-i' | 'adjective-na';
  conj: AdjectiveForm;
  particle?: string;
}

// Sisi kiri rumus yang berupa kata benda / kata sifat: "N", "Nに", "Aい", "naな", "Kata Benda", "Kata Sifat-na", ...
// Token lain (V, Angka, Kalimat, "Aく", ada keterangan [..]) dilewati. Dipisah oleh "／" atau "・".
function parseNonVerbLefts(left: string): NonVerbLeft[] {
  const out: NonVerbLeft[] = [];
  for (const raw of left.split(/[／/・]/)) {
    const t = raw.trim();
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^(?:N|Kata Benda)([にのとで])?$/))) {
      out.push({ key: m[1] ? `noun_${m[1]}` : 'noun', type: 'noun', conj: 'base', particle: m[1] });
    } else if (/^(?:A|Aい|Kata Sifat-i)$/.test(t)) {
      out.push({ key: 'adj_i', type: 'adjective-i', conj: 'base' });
    } else if (/^(?:na|Kata Sifat-na)$/.test(t)) {
      out.push({ key: 'adj_na', type: 'adjective-na', conj: 'base' });
    } else if (t === 'naな') {
      out.push({ key: 'adj_na_attr', type: 'adjective-na', conj: 'attributive' });
    }
  }
  return out;
}

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

      if (extended) {
        for (const left of parseNonVerbLefts(parts[0]).filter(l => NON_VERB_ALLOW[item.id]?.includes(l.key))) {
          const id = `lib_${item.id}_${left.key}`;
          if (result.some(r => r.id === id)) continue;
          result.push({
            id,
            pattern: `〜${left.particle ?? ''}${suffix}`,
            title: item.title,
            jlpt: (item.level as GrammarPatternSchema['jlpt']) || 'N3',
            predicateType: left.type,
            requiredConjugation: left.conj,
            fixedSuffix: suffix,
            leftParticle: left.particle,
            slots: [{ role: 'predicate', required: true, allowedWordTypes: [left.type], conjugationRequirement: left.conj }],
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
  }
  return result;
}

export const LIBRARY_PATTERN_SCHEMAS: GrammarPatternSchema[] = buildLibraryPatterns(false);

/** Pola library yang lebih lengkap untuk Grammar Fusion. */
export const LIBRARY_PATTERN_SCHEMAS_EXTENDED: GrammarPatternSchema[] = buildLibraryPatterns(true);
