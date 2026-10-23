import * as wanakana from 'wanakana';
import { explainVerbConjugation } from '../engine/morphology/inflectionEngine';
import type { ConjugationForm, VerbGroup as EngineVerbGroup } from '../engine/types';
import { CONJUGATION_FORMS_INFO } from './conjugationRules';

/* ==========================================================================
   GRAMMAR ANIMATION: resep pola = bentuk verba + akhiran pola.
   Perubahan bentuk verba SELALU dari engine morfologi (explainVerbConjugation);
   resep hanya menyatakan bentuk mana yang dipakai dan apa yang ditempel sesudahnya.
   ========================================================================== */

export interface GrammarAnimationRecipe {
  bunpouId: string;
  /** Bentuk verba yang dipakai pola ini. */
  form: ConjugationForm;
  /** Akhiran pola dalam kana, ditempel langsung setelah bentuk verba. */
  suffix: string;
  /** Arti kalimat jadi; {v} diganti arti verba (huruf kecil). */
  meaningTemplate: string;
  /** Penjelasan saat bagian akhiran diketuk. */
  suffixNote: string;
  defaultVerbId: string;
  /** Verba khusus (maks 3) yang perubahannya istimewa untuk bentuk pola ini. */
  specialVerbIds: string[];
}

export type GrammarVerbCategory = 'gol1' | 'gol2' | 'gol3' | 'khusus';

export interface GrammarAnimationVerb {
  id: string;
  kanji: string;
  reading: string;
  meaningId: string;
  category: GrammarVerbCategory;
  /** Kenapa verba ini khusus; tampil di tahap bentuk kamus. */
  specialNote?: string;
}

/** Contoh inti: satu Golongan 1, satu Golongan 2, dan kedua verba Golongan 3. */
const CORE_VERBS: GrammarAnimationVerb[] = [
  { id: 'v_kaku', kanji: '書く', reading: 'かく', meaningId: 'Menulis', category: 'gol1' },
  { id: 'v_taberu', kanji: '食べる', reading: 'たべる', meaningId: 'Makan', category: 'gol2' },
  { id: 'v_suru', kanji: 'する', reading: 'する', meaningId: 'Melakukan', category: 'gol3' },
  { id: 'v_kuru', kanji: '来る', reading: 'くる', meaningId: 'Datang', category: 'gol3' },
];

const SPECIAL_VERBS: Record<string, GrammarAnimationVerb> = {
  v_kaeru: {
    id: 'v_kaeru', kanji: '帰る', reading: 'かえる', meaningId: 'Pulang', category: 'khusus',
    specialNote: 'Meski berakhiran -eru seperti Golongan 2, る-nya tidak sekadar dibuang.',
  },
  v_hairu: {
    id: 'v_hairu', kanji: '入る', reading: 'はいる', meaningId: 'Masuk', category: 'khusus',
    specialNote: 'Meski berakhiran -iru seperti Golongan 2, る-nya tidak sekadar dibuang.',
  },
  v_iku: {
    id: 'v_iku', kanji: '行く', reading: 'いく', meaningId: 'Pergi', category: 'khusus',
    specialNote: 'Pengecualian bentuk て/た: 行って / 行った, bukan 行いて / 行いた.',
  },
  v_kau: {
    id: 'v_kau', kanji: '買う', reading: 'かう', meaningId: 'Membeli', category: 'khusus',
    specialNote: 'Akhiran う berubah menjadi わ, bukan あ: 買わない.',
  },
};

export const MAX_SPECIAL_VERBS = 3;

export const GRAMMAR_ANIMATION_RECIPES: GrammarAnimationRecipe[] = [
  {
    bunpouId: 'bp_n5_053',
    form: 'te',
    suffix: 'ください',
    meaningTemplate: 'Tolong {v}.',
    suffixNote: 'ください ditempel setelah bentuk て untuk meminta seseorang melakukan sesuatu dengan sopan.',
    defaultVerbId: 'v_kaku',
    specialVerbIds: ['v_iku', 'v_kaeru', 'v_hairu'],
  },
  {
    bunpouId: 'bp_n5_070',
    form: 'nai',
    suffix: 'でください',
    meaningTemplate: 'Tolong jangan {v}.',
    suffixNote: 'でください ditempel setelah bentuk ない untuk meminta seseorang TIDAK melakukan sesuatu dengan sopan.',
    defaultVerbId: 'v_taberu',
    specialVerbIds: ['v_kaeru', 'v_hairu', 'v_kau'],
  },
  {
    bunpouId: 'bp_n5_037',
    form: 'masu_stem',
    suffix: 'たいです',
    meaningTemplate: 'Saya ingin {v}.',
    suffixNote: 'たい ditempel pada batang ます (bentuk ます tanpa ます) untuk menyatakan keinginan pembicara; です membuatnya sopan.',
    defaultVerbId: 'v_taberu',
    specialVerbIds: ['v_kaeru', 'v_hairu'],
  },
  {
    bunpouId: 'bp_n5_057',
    form: 'te',
    suffix: 'もいいです',
    meaningTemplate: 'Boleh {v}.',
    suffixNote: 'もいいです ditempel setelah bentuk て untuk memberi atau meminta izin ("boleh ...").',
    defaultVerbId: 'v_kaku',
    specialVerbIds: ['v_iku', 'v_kaeru', 'v_hairu'],
  },
  {
    bunpouId: 'bp_n5_040',
    form: 'ta',
    suffix: 'ことがある',
    meaningTemplate: 'Pernah {v}.',
    suffixNote: 'ことがある ditempel setelah bentuk た untuk menyatakan pengalaman yang pernah dialami.',
    defaultVerbId: 'v_kaku',
    specialVerbIds: ['v_iku', 'v_kaeru', 'v_hairu'],
  },
];

export function getGrammarAnimationRecipe(bunpouId: string): GrammarAnimationRecipe | undefined {
  return GRAMMAR_ANIMATION_RECIPES.find(r => r.bunpouId === bunpouId);
}

/** Verba contoh untuk satu pola: verba inti + verba khusus pola itu. */
export function getRecipeVerbs(recipe: GrammarAnimationRecipe): GrammarAnimationVerb[] {
  const specials = recipe.specialVerbIds.map(id => SPECIAL_VERBS[id]).filter(Boolean);
  return [...CORE_VERBS, ...specials.slice(0, MAX_SPECIAL_VERBS)];
}

export type GrammarSegmentRole = 'stem' | 'ending' | 'removed' | 'added' | 'suffix';

export interface GrammarSegment {
  text: string;
  role: GrammarSegmentRole;
}

export interface GrammarAnimationStage {
  kind: 'base' | 'remove' | 'add' | 'suffix' | 'result';
  label: string;
  note: string;
  segments: GrammarSegment[];
}

export interface GrammarAnimation {
  stages: GrammarAnimationStage[];
  result: { japanese: string; reading: string; romaji: string; meaning: string };
}

const GROUP_NAME: Record<EngineVerbGroup, string> = {
  godan: 'Golongan 1 (Godan)',
  ichidan: 'Golongan 2 (Ichidan)',
  suru: 'Golongan 3 (Irregular)',
  kuru: 'Golongan 3 (Irregular)',
};

const FORM_LABEL: Partial<Record<ConjugationForm, string>> = {
  te: 'Bentuk て',
  nai: 'Bentuk ない',
  ta: 'Bentuk た',
  masu_stem: 'Batang ます',
};

/**
 * Baris aturan yang relevan dari ruleExplanation (CONJUGATION_FORMS_INFO) untuk verba ini.
 * Batang ます memakai aturan ます; た memakai aturan て (perubahannya identik, て→た / で→だ).
 */
function ruleNoteFor(form: ConjugationForm, group: EngineVerbGroup, word: string): string {
  const sourceId = form === 'masu_stem' ? 'masu' : form === 'ta' ? 'te' : form;
  const info = CONJUGATION_FORMS_INFO.find(f => f.id === sourceId);
  if (!info) return '';
  const ruleKey = group === 'godan' ? 'godan' : group === 'ichidan' ? 'ichidan' : 'irregular';
  const text = info.ruleExplanation[ruleKey];
  const ending = word.slice(-1);
  const bullets = text.split('\n').filter(l => l.startsWith('•'));
  const match = bullets.find(l => {
    const left = l.split('→')[0];
    return ruleKey === 'irregular' ? left.includes(word) : left.includes(ending);
  });
  let note = match ? match.replace(/^•\s*/, '') : text.replace(/\n/g, ' ');
  if (form === 'masu_stem') note += ' Untuk batang ます, ます-nya dibuang.';
  if (form === 'ta') note += ' Lalu て→た / で→だ.';
  return note;
}

function meaningOf(verb: GrammarAnimationVerb): string {
  return verb.meaningId.split('/')[0].trim().toLowerCase();
}

export function buildGrammarAnimation(recipe: GrammarAnimationRecipe, verb: GrammarAnimationVerb): GrammarAnimation | null {
  const exp = explainVerbConjugation(verb.kanji, verb.reading, recipe.form);
  if (!exp) return null;

  const base = exp.base.japanese;
  const removeStep = exp.steps.find(s => s.kind === 'remove');
  const addStep = exp.steps.find(s => s.kind === 'add');
  const stem = removeStep ? removeStep.text : base;
  const removed = removeStep?.part ?? '';
  const added = addStep?.part ?? '';
  const formLabel = FORM_LABEL[recipe.form] ?? recipe.form;
  const rule = ruleNoteFor(recipe.form, exp.group, base);

  const stages: GrammarAnimationStage[] = [
    {
      kind: 'base',
      label: 'Bentuk kamus',
      note: `${base} (${exp.base.reading}) termasuk ${GROUP_NAME[exp.group]}.${verb.specialNote ? ` ${verb.specialNote}` : ''}`,
      segments: [{ text: stem, role: 'stem' }, { text: removed, role: 'ending' }],
    },
  ];
  if (removed) {
    stages.push({
      kind: 'remove',
      label: `Buang 「${removed}」`,
      note: rule,
      segments: [{ text: stem, role: 'stem' }, { text: removed, role: 'removed' }],
    });
  }
  if (added) {
    stages.push({
      kind: 'add',
      label: `Tambah 「${added}」`,
      note: `${formLabel}: ${exp.result.japanese} (${exp.result.reading}).`,
      segments: [{ text: stem, role: 'stem' }, { text: added, role: 'added' }],
    });
  }
  stages.push({
    kind: 'suffix',
    label: `＋ ${recipe.suffix}`,
    note: recipe.suffixNote,
    segments: [{ text: stem, role: 'stem' }, { text: added, role: 'added' }, { text: recipe.suffix, role: 'suffix' }],
  });

  const japanese = exp.result.japanese + recipe.suffix;
  const reading = exp.result.reading + recipe.suffix;
  const meaning = recipe.meaningTemplate.replace('{v}', meaningOf(verb));
  stages.push({
    kind: 'result',
    label: 'Kalimat jadi',
    note: meaning,
    segments: [{ text: japanese, role: 'stem' }],
  });

  return { stages, result: { japanese, reading, romaji: wanakana.toRomaji(reading), meaning } };
}
