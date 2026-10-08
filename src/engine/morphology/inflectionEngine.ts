// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — MORPHOLOGICAL CONJUGATOR
// ==============================================================================

import {
  VerbGroup,
  ConjugationForm,
  VerbConjugationResult,
  AdjectiveType,
  AdjectiveForm,
  AdjectiveConjugationResult,
} from '../types';

/**
 * Godan verbs ending in -iru / -eru that mimic Ichidan verbs.
 * Dicocokkan lewat KATA, bukan bacaan: bacaannya sama dengan verba ichidan
 * (切る/着る きる, 要る/居る いる, 練る/寝る ねる, 減る/経る へる).
 */
const GODAN_EXCEPTIONS = new Set([
  '帰る', '入る', '走る', '切る', '斬る', '知る', '要る', '煎る', '炒る', '減る', '喋る', '滑る',
  '蹴る', '照る', '握る', '限る', '散る', '焦る', '遮る', '覆る', '蘇る', '甦る', '参る', '返る',
  '湿る', '捻る', '捩る', '茂る', '齧る', '噛る', '千切る', '契る', '詰る', '罵る', '練る', '弄る',
  '毟る', '抓る', '嘲る', '貶る', '謗る', '混じる', '交じる', '雑じる',
]);

/** Kata kana-only yang pasti godan (homofon ichidan seperti かえる/きる/ねる sengaja tidak masuk). */
const GODAN_KANA_EXCEPTIONS = new Set([
  'はいる', 'はしる', 'しる', 'しゃべる', 'すべる', 'にぎる', 'かぎる', 'ちる', 'あせる',
  'さえぎる', 'くつがえる', 'よみがえる', 'まいる', 'ひねる', 'しげる', 'かじる', 'ちぎる',
  'なじる', 'ののしる', 'いじる', 'むしる', 'ねじる', 'つねる', 'しくじる', 'ひっくりかえる', 'まじる',
]);

/** Akhiran kata majemuk yang selalu godan (引っ繰り返る, 区切る, 恐れ入る, 振り返る). */
const GODAN_COMPOUND_SUFFIXES = ['切る', '入る', '返る', '帰る'];

const SEPARATOR = /s*[/／、,]s*/;

/** Ambil penulisan pertama bila ada beberapa ("作る/造る", "見る / 観る"). */
function firstVariant(text: string): string {
  return text.trim().split(SEPARATOR)[0].trim();
}

const hasKanji = (text: string) => /[一-龯々]/.test(text);

/**
 * Detect the grammatical group of a Japanese verb.
 * Klasifikasi bertumpu pada KATA; bacaan hanya untuk bunyi sebelum る dan kata kana-only.
 * Jangan memakai endsWith pada bacaan: つくる ≠ 来る, おくる ≠ 来る, 刷る(する) ≠ する.
 */
export function detectVerbGroup(word: string, reading?: string): VerbGroup {
  const w = firstVariant(word);
  const r = firstVariant(reading || '');
  const kanaOnly = !hasKanji(w);

  // 1. Suru verbs (する, 勉強する, 為る)
  if (w.endsWith('する') || (w.endsWith('為る') && r.endsWith('する'))) return 'suru';

  // 2. Kuru verbs (来る, 持って来る, くる, もってくる). 出来る (できる) = ichidan.
  if (w.endsWith('来る') || w.endsWith('來る')) {
    return w.endsWith('出来る') ? 'ichidan' : 'kuru';
  }
  if (kanaOnly && (w === 'くる' || /[てで]くる$/.test(w))) return 'kuru';

  // 3. Godan yang menyerupai ichidan (-iru / -eru). 出切る (できる) di data = 出来る → ichidan.
  if (w === '出切る') return 'ichidan';
  if (GODAN_EXCEPTIONS.has(w) || (kanaOnly && GODAN_KANA_EXCEPTIONS.has(w))) return 'godan';
  if (GODAN_COMPOUND_SUFFIXES.some(suf => w.length > suf.length && w.endsWith(suf))) return 'godan';

  // 4. Verbs not ending in 'る' are always Godan (う, く, ぐ, す, つ, ぬ, ぶ, む)
  if (!w.endsWith('る') && !r.endsWith('る')) return 'godan';

  // 5. Verbs ending in 'る' preceded by 'i' or 'e' vowel sound are usually Ichidan
  const target = r || w;
  if (target.length >= 2) {
    const charBeforeRu = target[target.length - 2];
    if (/[いきしちにひみりぎじぢびぴえけせてねへめれげぜでべぺ]/.test(charBeforeRu)) return 'ichidan';
  }

  return 'godan';
}

/**
 * High-precision Verb Conjugator
 */
export function conjugateVerb(
  word: string,
  reading?: string,
  /** Paksa golongan tertentu — dipakai untuk membuat pengecoh "salah golongan" yang realistis. */
  groupOverride?: VerbGroup
): VerbConjugationResult {
  const w = firstVariant(word);
  const r = firstVariant(reading || w);
  const group = groupOverride ?? detectVerbGroup(w, r);

  const forms: Record<ConjugationForm, { japanese: string; reading: string }> = {} as any;

  // ─────────────────────────────────────────────────────────────
  // 1. SURU VERBS
  // ─────────────────────────────────────────────────────────────
  if (group === 'suru') {
    const prefixJp = w === 'する' ? '' : w.slice(0, -2);
    const prefixRd = r === 'する' ? '' : r.slice(0, -2);

    const make = (suffixJp: string, suffixRd: string) => ({
      japanese: prefixJp + suffixJp,
      reading: prefixRd + suffixRd,
    });

    forms.jisho = { japanese: w, reading: r };
    forms.masu = make('します', 'します');
    forms.masu_stem = make('し', 'し');
    forms.te = make('して', 'して');
    forms.ta = make('した', 'した');
    forms.nai = make('しない', 'しない');
    forms.nakatta = make('しなかった', 'しなかった');
    forms.ba = make('すれば', 'すれば');
    forms.tara = make('したら', 'したら');
    forms.volitional = make('しよう', 'しよう');
    forms.imperative = make('しろ', 'しろ');
    forms.potential = make('できる', 'できる');
    forms.passive = make('される', 'される');
    forms.causative = make('させる', 'させる');
    forms.causative_passive = make('させられる', 'させられる');
    forms.tai = make('したい', 'したい');
    forms.sou_appearance = make('しそう', 'しそう');
    forms.sou_hearsay = make('するそう', 'するそう');
    forms.yasui = make('しやすい', 'しやすい');
    forms.nikui = make('しにくい', 'しにくい');

    return { word: w, reading: r, group, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. KURU VERBS
  // ─────────────────────────────────────────────────────────────
  if (group === 'kuru') {
    const isKanji = w.includes('来');
    const prefixJp = isKanji ? w.replace(/来[る|て|た|ない]*$/, '') : w.replace(/くる$/, '');
    const prefixRd = r.replace(/くる$/, '');

    const makeKuru = (kanjiEnding: string, kanaEnding: string) => ({
      japanese: prefixJp + (isKanji ? kanjiEnding : kanaEnding),
      reading: prefixRd + kanaEnding,
    });

    forms.jisho = { japanese: w, reading: r };
    forms.masu = makeKuru('来ます', 'きます');
    forms.masu_stem = makeKuru('来', 'き');
    forms.te = makeKuru('来て', 'きて');
    forms.ta = makeKuru('来た', 'きた');
    forms.nai = makeKuru('来ない', 'こない');
    forms.nakatta = makeKuru('来なかった', 'こなかった');
    forms.ba = makeKuru('来れば', 'くれば');
    forms.tara = makeKuru('来たら', 'きたら');
    forms.volitional = makeKuru('来よう', 'こよう');
    forms.imperative = makeKuru('来い', 'こい');
    forms.potential = makeKuru('来られる', 'こられる');
    forms.passive = makeKuru('来られる', 'こられる');
    forms.causative = makeKuru('来させる', 'こさせる');
    forms.causative_passive = makeKuru('来させられる', 'こさせられる');
    forms.tai = makeKuru('来たい', 'きたい');
    forms.sou_appearance = makeKuru('来そう', 'きそう');
    forms.sou_hearsay = makeKuru('来るそう', 'くるそう');
    forms.yasui = makeKuru('来やすい', 'きやすい');
    forms.nikui = makeKuru('来にくい', 'きにくい');

    return { word: w, reading: r, group, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ICHIDAN VERBS
  // ─────────────────────────────────────────────────────────────
  if (group === 'ichidan') {
    const stemJp = w.slice(0, -1);
    const stemRd = r.slice(0, -1);

    const make = (suffix: string) => ({
      japanese: stemJp + suffix,
      reading: stemRd + suffix,
    });

    forms.jisho = { japanese: w, reading: r };
    forms.masu = make('ます');
    forms.masu_stem = make('');
    forms.te = make('て');
    forms.ta = make('た');
    forms.nai = make('ない');
    forms.nakatta = make('なかった');
    forms.ba = make('れば');
    forms.tara = make('たら');
    forms.volitional = make('よう');
    forms.imperative = make('ろ');
    forms.potential = make('られる');
    forms.passive = make('られる');
    forms.causative = make('させる');
    forms.causative_passive = make('させられる');
    forms.tai = make('たい');
    forms.sou_appearance = make('そう');
    forms.sou_hearsay = { japanese: w + 'そう', reading: r + 'そう' };
    forms.yasui = make('やすい');
    forms.nikui = make('にくい');

    return { word: w, reading: r, group, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. GODAN VERBS
  // ─────────────────────────────────────────────────────────────
  const lastCharRd = r[r.length - 1];
  const stemJp = w.slice(0, -1);
  const stemRd = r.slice(0, -1);

  // Godan Kana shifts mapping
  const shifts: Record<string, { a: string; i: string; e: string; o: string; te: string; ta: string }> = {
    'う': { a: 'わ', i: 'い', e: 'え', o: 'おう', te: 'って', ta: 'った' },
    'く': { a: 'か', i: 'き', e: 'け', o: 'こう', te: 'いて', ta: 'いた' },
    'ぐ': { a: 'が', i: 'ぎ', e: 'げ', o: 'ごう', te: 'いで', ta: 'いだ' },
    'す': { a: 'さ', i: 'し', e: 'せ', o: 'そう', te: 'して', ta: 'した' },
    'つ': { a: 'た', i: 'ち', e: 'て', o: 'とう', te: 'って', ta: 'った' },
    'ぬ': { a: 'な', i: 'に', e: 'ね', o: 'のう', te: 'んで', ta: 'んだ' },
    'ぶ': { a: 'ば', i: 'び', e: 'べ', o: 'ぼう', te: 'んで', ta: 'んだ' },
    'む': { a: 'ま', i: 'み', e: 'め', o: 'もう', te: 'んで', ta: 'んだ' },
    'る': { a: 'ら', i: 'り', e: 'れ', o: 'ろう', te: 'って', ta: 'った' },
  };

  const shift = shifts[lastCharRd] || shifts['う'];

  // Special Irregular: 行く (iku / yuku) -> 行って / 行った (not iite / iida)
  let teSuffix = shift.te;
  let taSuffix = shift.ta;
  if (w === '行く' || r === 'いく' || r === 'ゆく') {
    teSuffix = 'って';
    taSuffix = 'った';
  }

  const make = (suffixJp: string, suffixRd?: string) => ({
    japanese: stemJp + suffixJp,
    reading: stemRd + (suffixRd || suffixJp),
  });

  forms.jisho = { japanese: w, reading: r };
  forms.masu = make(shift.i + 'ます');
  forms.masu_stem = make(shift.i);
  forms.te = make(teSuffix);
  forms.ta = make(taSuffix);
  forms.nai = make(shift.a + 'ない');
  forms.nakatta = make(shift.a + 'なかった');
  forms.ba = make(shift.e + 'ば');
  forms.tara = make(taSuffix + 'ら');
  forms.volitional = make(shift.o);
  forms.imperative = make(shift.e);
  forms.potential = make(shift.e + 'る');
  forms.passive = make(shift.a + 'れる');
  forms.causative = make(shift.a + 'せる');
  forms.causative_passive = make(shift.a + 'せられる');
  forms.tai = make(shift.i + 'たい');
  forms.sou_appearance = make(shift.i + 'そう');
  forms.sou_hearsay = { japanese: w + 'そう', reading: r + 'そう' };
  forms.yasui = make(shift.i + 'やすい');
  forms.nikui = make(shift.i + 'にくい');

  return { word: w, reading: r, group, forms };
}

/**
 * High-precision Adjective Conjugator
 */
export function conjugateAdjective(
  word: string,
  reading: string | undefined,
  type: AdjectiveType
): AdjectiveConjugationResult {
  const w = word.trim();
  const r = (reading || w).trim();

  const forms: Record<AdjectiveForm, { japanese: string; reading: string }> = {} as any;

  // ─────────────────────────────────────────────────────────────
  // I-KEIYOUSHIS
  // ─────────────────────────────────────────────────────────────
  if (type === 'i') {
    // Special case: いい (ii / yoi)
    if (w === 'いい' || r === 'いい' || w === '良い') {
      forms.base = { japanese: w, reading: r };
      forms.negative = { japanese: 'よくない', reading: 'よくない' };
      forms.past = { japanese: 'よかった', reading: 'よかった' };
      forms.past_negative = { japanese: 'よくなかった', reading: 'よくなかった' };
      forms.te = { japanese: 'よくて', reading: 'よくて' };
      forms.adverbial = { japanese: 'よく', reading: 'よく' };
      forms.sou_appearance = { japanese: 'よさそう', reading: 'よさそう' };
      forms.attributive = { japanese: w, reading: r };
      return { word: w, reading: r, type, forms };
    }

    const stemJp = w.replace(/い$/, '');
    const stemRd = r.replace(/い$/, '');

    const make = (suffix: string) => ({
      japanese: stemJp + suffix,
      reading: stemRd + suffix,
    });

    forms.base = { japanese: w, reading: r };
    forms.negative = make('くない');
    forms.past = make('かった');
    forms.past_negative = make('くなかった');
    forms.te = make('くて');
    forms.adverbial = make('く');
    forms.sou_appearance = make('そう');
    forms.attributive = { japanese: w, reading: r };

    return { word: w, reading: r, type, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // NA-KEIYOUSHIS
  // ─────────────────────────────────────────────────────────────
  // Normalize if user provided with 'な' or 'だ' at the end
  const cleanJp = w.replace(/[なだ]$/, '');
  const cleanRd = r.replace(/[なだ]$/, '');

  const make = (suffix: string) => ({
    japanese: cleanJp + suffix,
    reading: cleanRd + suffix,
  });

  forms.base = { japanese: cleanJp, reading: cleanRd };
  forms.negative = make('じゃない');
  forms.past = make('だった');
  forms.past_negative = make('じゃなかった');
  forms.te = make('で');
  forms.adverbial = make('に');
  forms.sou_appearance = make('そう');
  forms.attributive = make('な');

  return { word: cleanJp, reading: cleanRd, type, forms };
}

/**
 * Penjelasan langkah perubahan bentuk verba.
 * Hasil akhir SELALU diambil dari conjugateVerb(); langkah hanya diturunkan dari selisih
 * bentuk kamus → hasil, jadi tidak ada rule konjugasi kedua.
 */
export interface VerbConjugationStep {
  kind: 'base' | 'remove' | 'add';
  /** Teks utuh setelah langkah ini. */
  text: string;
  /** Potongan yang dibuang / ditambahkan (kosong untuk langkah 'base'). */
  part: string;
}

export interface VerbConjugationExplanation {
  group: VerbGroup;
  base: { japanese: string; reading: string };
  result: { japanese: string; reading: string };
  steps: VerbConjugationStep[];
}

export function explainVerbConjugation(
  word: string,
  reading: string | undefined,
  form: ConjugationForm
): VerbConjugationExplanation | null {
  const res = conjugateVerb(word, reading);
  const base = res.forms.jisho;
  const result = res.forms[form];
  if (!base || !result || !result.japanese) return null;

  let common = 0;
  const max = Math.min(base.japanese.length, result.japanese.length);
  while (common < max && base.japanese[common] === result.japanese[common]) common++;

  const removed = base.japanese.slice(common);
  const added = result.japanese.slice(common);
  const steps: VerbConjugationStep[] = [{ kind: 'base', text: base.japanese, part: '' }];
  if (removed) steps.push({ kind: 'remove', text: base.japanese.slice(0, common), part: removed });
  if (added) steps.push({ kind: 'add', text: result.japanese, part: added });

  return { group: res.group, base, result, steps };
}
