// ==============================================================================
// MENARA 2 — LANTAI PERUBAHAN BENTUK (kata kerja, kata sifat-i, kata sifat-na)
// Bentuk dihitung oleh mesin morfologi (engine/morphology), bukan ditulis tangan,
// sehingga semua kata kerja N5/N4 dapat dipakai. Pengecoh = bentuk dari golongan
// yang salah, atau bentuk lain dari kata yang sama.
// ==============================================================================

import { BuildItem, ChoiceQuestion, LessonStep, Room } from '../../engine/tower1/types';
import { splitBeats } from '../../engine/tower1/jp';
import { conjugateAdjective, conjugateVerb } from '../../engine/morphology/inflectionEngine';
import type { AdjectiveForm, ConjugationForm } from '../../engine/types';
import { KOTOBA_DATABASE } from '../kotoba';
import { VerbForms, VerbItem, kotobaItemToVerbItem } from '../conjugationRules';
import { FloorContent, first, hasKanji, isKana, makeOptions, rb, shuffle } from './common';
import { KONJ_LESSONS, LANJUT_LESSONS } from './conjLessons';

type VKey = keyof VerbForms;

const ENGINE_KEY: Record<VKey, ConjugationForm> = {
  dictionary: 'jisho', masu: 'masu', te: 'te', ta: 'ta', nai: 'nai', potential: 'potential', passive: 'passive',
  causative: 'causative', ba: 'ba', volitional: 'volitional', causative_passive: 'causative_passive',
  tai: 'tai', tara: 'tara', imperative: 'imperative'
};

const LABEL: Record<string, string> = {
  masu: 'bentuk sopan (ます)', te: 'bentuk て', ta: 'bentuk lampau (た)', nai: 'bentuk negatif (ない)',
  potential: 'bentuk potensial (bisa)', volitional: 'bentuk ajakan (よう)', tai: 'bentuk keinginan (たい)',
  ba: 'bentuk pengandaian (ば)', tara: 'bentuk pengandaian (たら)', passive: 'bentuk pasif', causative: 'bentuk kausatif',
  imperative: 'bentuk perintah', causative_passive: 'bentuk kausatif-pasif'
};

const GROUP_LABEL = { godan: 'Golongan 1 (godan)', ichidan: 'Golongan 2 (ichidan)', irregular: 'Golongan 3 (tak beraturan)' } as const;

// --------------------------------------------------------------------------
// Kolam kata kerja
// --------------------------------------------------------------------------
const poolCache = new Map<string, VerbItem[]>();

function verbPool(levels: string[]): VerbItem[] {
  const key = levels.join(',');
  const cached = poolCache.get(key);
  if (cached) return cached;
  const seen = new Set<string>();
  const out: VerbItem[] = [];
  const items = Object.values(KOTOBA_DATABASE).filter(k => k && k.wordType === 'verb' && levels.includes(k.jlpt));
  items.sort((a, b) => a.id.localeCompare(b.id));
  for (const k of items) {
    if (/[/／、,]/.test(k.word) || seen.has(k.reading)) continue;
    const v = kotobaItemToVerbItem(k);
    if (!v || !isKana(v.reading)) continue;
    const fr = v.formsReadings;
    if (!fr.masu || !fr.te || !fr.ta || !fr.nai || !fr.potential || !fr.passive || !fr.causative || !fr.ba || !fr.volitional) continue;
    if (![fr.causative_passive, fr.tai, fr.tara, fr.imperative].every(Boolean)) continue;
    seen.add(k.reading);
    out.push(v);
  }
  poolCache.set(key, out);
  return out;
}

const dictLabel = (v: VerbItem) => rb(v.kanji, v.reading);

/** Pilih n kata kerja bervariasi akhiran (round-robin per huruf akhir bacaan). */
function pickVerbs(pool: VerbItem[], n: number, seed: string, exclude: Set<string> = new Set()): VerbItem[] {
  const buckets = new Map<string, VerbItem[]>();
  for (const v of shuffle(pool.filter(x => !exclude.has(x.id)), seed)) {
    const end = v.reading.slice(-1);
    const list = buckets.get(end) ?? [];
    list.push(v);
    buckets.set(end, list);
  }
  const lists = shuffle(Array.from(buckets.values()), `${seed}:b`);
  const out: VerbItem[] = [];
  for (let i = 0; out.length < n && lists.some(l => l.length > i); i++) {
    for (const l of lists) if (l[i] && out.length < n) out.push(l[i]);
  }
  return out;
}

// --------------------------------------------------------------------------
// Pengecoh bentuk kata kerja
// --------------------------------------------------------------------------
const OTHER_KEYS: VKey[] = ['masu', 'te', 'ta', 'nai', 'potential', 'passive', 'causative', 'ba', 'volitional'];

function wrongForms(v: VerbItem, key: VKey): string[] {
  const correct = v.formsReadings[key] ?? '';
  const pool: string[] = [];
  for (const g of ['godan', 'ichidan'] as const) {
    try {
      const r = conjugateVerb(v.kanji, v.reading, g).forms[ENGINE_KEY[key]]?.reading;
      if (r) pool.push(r);
    } catch { /* abaikan */ }
  }
  const sameVerb = OTHER_KEYS.filter(k => k !== key).map(k => v.formsReadings[k] ?? '');
  const ordered = [...pool.filter(r => r !== correct), ...shuffle(sameVerb, `wf:${v.id}:${key}`)];
  return Array.from(new Set(ordered.filter(r => r && r !== correct)));
}

const formQ = (v: VerbItem, key: VKey): ChoiceQuestion => {
  const right = v.formsReadings[key] ?? '';
  const { options, answer } = makeOptions(right, wrongForms(v, key), `fq:${v.id}:${key}`);
  return {
    prompt: `Ubah ke ${LABEL[key]}: "${v.meaningId}"`,
    glyph: dictLabel(v),
    say: v.reading,
    options,
    answer,
    explain: `${v.reading} → ${right} (${GROUP_LABEL[v.group]}).`
  };
};

const reverseQ = (v: VerbItem, key: VKey, pool: VerbItem[]): ChoiceQuestion => {
  const right = dictLabel(v);
  const sameEnding = pool.filter(x => x.id !== v.id && x.reading.slice(-1) === v.reading.slice(-1));
  const others = shuffle([...sameEnding, ...pool.filter(x => x.id !== v.id)], `rq:${v.id}:${key}`).map(dictLabel);
  const { options, answer } = makeOptions(right, others, `rqo:${v.id}:${key}`);
  return {
    prompt: `${LABEL[key][0].toUpperCase()}${LABEL[key].slice(1)} ini berasal dari kata kerja apa?`,
    glyph: v.formsReadings[key] ?? '',
    say: v.formsReadings[key],
    options,
    answer,
    explain: `${v.formsReadings[key]} = ${LABEL[key]} dari ${v.reading} ("${v.meaningId}").`
  };
};

const buildItem = (v: VerbItem, key: VKey, tilePool: string[]): BuildItem | null => {
  const right = v.formsReadings[key] ?? '';
  const answer = splitBeats(right);
  if (answer.length < 2 || answer.length > 9) return null;
  const wrongTiles = wrongForms(v, key).flatMap(w => splitBeats(w)).filter(t => !answer.includes(t));
  const extra = Array.from(new Set([...wrongTiles, ...shuffle(tilePool.filter(t => !answer.includes(t)), `bt:${v.id}`)])).slice(0, 2);
  return { prompt: `Susun ${LABEL[key]} dari "${v.reading}" ("${v.meaningId}").`, say: right, answer, extra, explain: `${v.reading} → ${right}.` };
};

// --------------------------------------------------------------------------
// Lantai kata kerja (satu atau beberapa bentuk)
// --------------------------------------------------------------------------
interface VerbFloorSpec {
  keys: VKey[];
  levels: string[];
  filter?: (v: VerbItem) => boolean;
}

function verbFloor(floor: number, spec: VerbFloorSpec, lessons: LessonStep[], title: string): FloorContent {
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;
  const full = verbPool(spec.levels);
  const pool = spec.filter ? full.filter(spec.filter) : full;
  const seed = `verb:${floor}`;
  const practice = pickVerbs(pool, 10, seed);
  const used = new Set(practice.map(v => v.id));
  const reverse = pickVerbs(pool, 6, `${seed}:r`, used);
  reverse.forEach(v => used.add(v.id));
  const builds = pickVerbs(pool, 8, `${seed}:b`).filter(Boolean);
  const trialVerbs = pickVerbs(pool, 10, `${seed}:t`, used);
  const tilePool = Array.from(new Set(pool.flatMap(v => splitBeats(v.reading))));
  const keyAt = (i: number) => spec.keys[i % spec.keys.length];

  const practiceQs = practice.map((v, i) => formQ(v, keyAt(i)));
  const reverseQs = reverse.map((v, i) => reverseQ(v, keyAt(i), pool));
  const buildItems = builds.map((v, i) => buildItem(v, keyAt(i), tilePool)).filter((b): b is BuildItem => b !== null).slice(0, 6);
  const trialQs = trialVerbs.map((v, i) => formQ(v, keyAt(i)));

  const rooms: Room[] = [
    { id: id('learn'), skill: 'pola', kind: 'lesson', kicker: 'Temukan', title, steps: lessons },
    { id: id('form'), skill: 'pola', kind: 'choice', kicker: 'Latih', title: 'Pilih Bentuk yang Benar', questions: practiceQs },
    { id: id('base'), skill: 'kata', kind: 'choice', kicker: 'Latih', title: 'Mundur ke Kata Dasar', questions: reverseQs }
  ];
  if (buildItems.length >= 3) rooms.push({ id: id('build'), skill: 'menulis', kind: 'build', kicker: 'Latih', title: 'Susun Bentuknya', items: buildItems });
  rooms.push({ id: id('trial'), skill: 'pola', kind: 'choice', kicker: 'Ingat', title: 'Ujian: Kata Kerja Baru', passRatio: 0.8, questions: trialQs });
  return { rooms, bank: [...practiceQs, ...reverseQs] };
}

// --------------------------------------------------------------------------
// Lantai klasifikasi golongan
// --------------------------------------------------------------------------
function groupFloor(floor: number): FloorContent {
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;
  const pool = verbPool(['N5']);
  const irregular = pool.filter(v => v.group === 'irregular');
  const godan = pool.filter(v => v.group === 'godan');
  const ichidan = pool.filter(v => v.group === 'ichidan');
  // Kata kerja yang tampak golongan 2 tetapi golongan 1 (jebakan).
  const tricky = godan.filter(v => /[いきしちにひみりぎじびえけせてねへめれげぜでべ]る$/.test(v.reading));
  const make = (v: VerbItem): ChoiceQuestion => {
    const options = shuffle(Object.values(GROUP_LABEL) as string[], `gq:${v.id}`);
    const isTricky = v.group === 'godan' && /[いきしちにひみりぎじびえけせてねへめれげぜでべ]る$/.test(v.reading);
    return {
      prompt: `Termasuk golongan berapa kata kerja ini? ("${v.meaningId}")`,
      glyph: dictLabel(v),
      say: v.reading,
      options,
      answer: options.indexOf(GROUP_LABEL[v.group]),
      explain: v.group === 'irregular'
        ? `${v.reading}: kata kerja tak beraturan (する/くる dan turunannya).`
        : v.group === 'ichidan'
          ? `${v.reading}: berakhir -iru/-eru sehingga golongan 2 (buang る saat berubah).`
          : isTricky
            ? `${v.reading}: pengecualian! Tampak berakhir -iru/-eru tetapi golongan 1.`
            : `${v.reading}: golongan 1 (godan).`
    };
  };
  const practiceVerbs = [...irregular.slice(0, 2), ...tricky.slice(0, 3), ...pickVerbs(ichidan, 4, 'g1:i'), ...pickVerbs(godan, 4, 'g1:g')];
  const used = new Set(practiceVerbs.map(v => v.id));
  const trialVerbs = [...irregular.slice(2, 3), ...tricky.slice(3, 5), ...pickVerbs(ichidan, 3, 'g1:ti', used), ...pickVerbs(godan, 3, 'g1:tg', used)];
  const questions = shuffle(practiceVerbs, 'g1:p').map(make);
  const trial = shuffle(trialVerbs.length >= 8 ? trialVerbs : [...trialVerbs, ...pickVerbs(godan, 8, 'g1:tx', used)], 'g1:tr').slice(0, 10).map(make);
  const rooms: Room[] = [
    { id: id('learn'), skill: 'pola', kind: 'lesson', kicker: 'Temukan', title: 'Tiga Golongan Kata Kerja', steps: KONJ_LESSONS[1] },
    { id: id('group'), skill: 'pola', kind: 'choice', kicker: 'Latih', title: 'Golongan Berapa?', questions },
    { id: id('trial'), skill: 'pola', kind: 'choice', kicker: 'Ingat', title: 'Ujian: Kata Kerja Baru', passRatio: 0.8, questions: trial }
  ];
  return { rooms, bank: questions };
}

// --------------------------------------------------------------------------
// Lantai kata sifat
// --------------------------------------------------------------------------
interface AdjItem { word: string; reading: string; meaning: string; kind: 'i' | 'na' | 'noun' }

function adjPool(kind: 'i' | 'na' | 'noun', levels: string[]): AdjItem[] {
  const type = kind === 'i' ? 'adjective-i' : kind === 'na' ? 'adjective-na' : 'noun';
  const out: AdjItem[] = [];
  const seen = new Set<string>();
  const items = Object.values(KOTOBA_DATABASE).filter(k => k && k.wordType === type && levels.includes(k.jlpt));
  items.sort((a, b) => a.id.localeCompare(b.id));
  for (const k of items) {
    const word = first(k.word);
    const reading = first(k.reading || word);
    if (!isKana(reading) || seen.has(reading) || /[/／]/.test(k.word)) continue;
    if (kind === 'i' && !reading.endsWith('い')) continue;
    // kata sifat-na yang berakhir い (きれい, ゆうめい) dilewati agar tidak ambigu dengan kata sifat-i
    if (kind === 'na' && reading.endsWith('い')) continue;
    if (kind === 'noun' && (Array.from(reading).length > 6 || Array.from(reading).length < 3 || hasKanji(reading))) continue;
    seen.add(reading);
    out.push({ word, reading, meaning: k.meaningId.split(/\s*[;；]\s*/)[0], kind });
  }
  return out;
}

const adjLabel = (a: AdjItem) => rb(a.word, a.reading);

const I_ADJ: { key: AdjectiveForm; label: string; wrong: (stem: string, word: string) => string[] }[] = [
  { key: 'negative', label: 'negatif', wrong: (s, w) => [`${w}くない`, `${s}ない`, `${s}じゃない`, `${s}くなかった`] },
  { key: 'past', label: 'lampau', wrong: (s, w) => [`${w}かった`, `${s}だった`, `${s}くかった`, `${s}いかった`] },
  { key: 'past_negative', label: 'lampau negatif', wrong: (s, w) => [`${w}くなかった`, `${s}くないだった`, `${s}かったくない`, `${s}くかった`] },
  { key: 'te', label: 'sambung (て)', wrong: (s, w) => [`${w}くて`, `${s}で`, `${s}いて`, `${s}って`] }
];

const NA_FORMS: { key: AdjectiveForm; label: string; wrong: (b: string) => string[] }[] = [
  { key: 'negative', label: 'negatif', wrong: b => [`${b}くない`, `${b}ない`, `${b}かった`, `${b}だない`] },
  { key: 'past', label: 'lampau', wrong: b => [`${b}かった`, `${b}いだった`, `${b}じゃなかった`, `${b}くだった`] },
  { key: 'past_negative', label: 'lampau negatif', wrong: b => [`${b}くなかった`, `${b}じゃない`, `${b}だった`, `${b}ないだった`] },
  { key: 'te', label: 'sambung (て)', wrong: b => [`${b}くて`, `${b}いて`, `${b}って`, `${b}だて`] },
  { key: 'attributive', label: 'penerang benda (+ benda)', wrong: b => [`${b}の`, `${b}い`, `${b}で`, `${b}く`] }
];

function adjFloor(floor: number, kind: 'i' | 'na'): FloorContent {
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;
  const levels = ['N5', 'N4'];
  const adjectives = kind === 'i' ? adjPool('i', levels) : [...adjPool('na', levels), ...shuffle(adjPool('noun', ['N5']), 'na:noun').slice(0, 14)];
  const forms = kind === 'i' ? I_ADJ : NA_FORMS;
  const lesson = KONJ_LESSONS[kind === 'i' ? 7 : 8];

  const make = (a: AdjItem, f: (typeof forms)[number], i: number): ChoiceQuestion => {
    const res = conjugateAdjective(a.word, a.reading, a.kind === 'i' ? 'i' : 'na');
    const right = res.forms[f.key].reading;
    const base = a.kind === 'i' ? a.reading : res.forms.base.reading;
    const stem = a.kind === 'i' ? (a.reading === 'いい' ? 'よ' : a.reading.slice(0, -1)) : base;
    const wrong = a.kind === 'i'
      ? (f as (typeof I_ADJ)[number]).wrong(stem, a.reading)
      : (f as (typeof NA_FORMS)[number]).wrong(base);
    const { options, answer } = makeOptions(right, wrong, `adj:${floor}:${a.reading}:${f.key}:${i}`);
    const typeNote = a.kind === 'i' ? 'kata sifat-i' : a.kind === 'na' ? 'kata sifat-na' : 'benda';
    return {
      prompt: `Ubah ke bentuk ${f.label}. (${typeNote}: "${a.meaning}")`,
      glyph: adjLabel(a),
      say: a.reading,
      options,
      answer,
      explain: `${a.reading} → ${right}.`
    };
  };

  const picked = shuffle(adjectives, `adj:${floor}`);
  const practice = picked.slice(0, 10).map((a, i) => make(a, forms[i % forms.length], i));
  const attrib = kind === 'na' ? picked.filter(a => a.kind === 'na').slice(10, 14).map((a, i) => make(a, NA_FORMS[4], i + 20)) : [];
  const trial = picked.slice(10, 20).map((a, i) => make(a, forms[(i + 1) % forms.length], i + 40));
  const tilePool = Array.from(new Set(picked.flatMap(a => splitBeats(a.reading))));
  const builds: BuildItem[] = picked.slice(20, 28).map((a, i) => {
    const f = forms[i % forms.length];
    const res = conjugateAdjective(a.word, a.reading, a.kind === 'i' ? 'i' : 'na');
    const right = res.forms[f.key].reading;
    const answer = splitBeats(right);
    if (answer.length < 2 || answer.length > 9) return null;
    const extra = shuffle(tilePool.filter(t => !answer.includes(t)), `abx:${floor}:${i}`).slice(0, 2);
    return { prompt: `Susun bentuk ${f.label} dari "${a.reading}" ("${a.meaning}").`, say: right, answer, extra, explain: `${a.reading} → ${right}.` } as BuildItem;
  }).filter((b): b is BuildItem => b !== null).slice(0, 6);

  const rooms: Room[] = [
    { id: id('learn'), skill: 'pola', kind: 'lesson', kicker: 'Temukan', title: kind === 'i' ? 'Kata Sifat-i Berubah Bentuk' : 'Kata Sifat-na & Benda Berubah Bentuk', steps: lesson },
    { id: id('form'), skill: 'pola', kind: 'choice', kicker: 'Latih', title: 'Pilih Bentuk yang Benar', questions: [...practice, ...attrib] }
  ];
  if (builds.length >= 3) rooms.push({ id: id('build'), skill: 'menulis', kind: 'build', kicker: 'Latih', title: 'Susun Bentuknya', items: builds });
  rooms.push({ id: id('trial'), skill: 'pola', kind: 'choice', kicker: 'Ingat', title: 'Ujian: Kata Baru', passRatio: 0.8, questions: trial });
  return { rooms, bank: practice };
}

// --------------------------------------------------------------------------
// Rangkaian ます lengkap
// --------------------------------------------------------------------------
function masuFullFloor(floor: number): FloorContent {
  const id = (s: string) => `f${String(floor).padStart(3, '0')}-${s}`;
  const pool = verbPool(['N5']).filter(v => v.formsReadings.masu.endsWith('ます'));
  const kinds = [
    { label: 'bentuk negatif sopan (ません)', make: (v: VerbItem) => `${stem(v)}ません` },
    { label: 'bentuk lampau sopan (ました)', make: (v: VerbItem) => `${stem(v)}ました` },
    { label: 'bentuk lampau negatif sopan (ませんでした)', make: (v: VerbItem) => `${stem(v)}ませんでした` },
    { label: 'permintaan "tolong ..." (〜てください)', make: (v: VerbItem) => `${v.formsReadings.te}ください` }
  ];
  const stem = (v: VerbItem) => v.formsReadings.masu.slice(0, -2);
  const make = (v: VerbItem, k: (typeof kinds)[number], i: number): ChoiceQuestion => {
    const right = k.make(v);
    const all = [...kinds.map(x => x.make(v)), `${stem(v)}ない`, `${stem(v)}ませ`, `${stem(v)}ますた`];
    const { options, answer } = makeOptions(right, all.filter(x => x !== right), `mf:${floor}:${v.id}:${i}`);
    return { prompt: `Ubah ke ${k.label}: "${v.meaningId}"`, glyph: dictLabel(v), say: v.reading, options, answer, explain: `${v.reading} → ${right}.` };
  };
  const picked = pickVerbs(pool, 20, `mf:${floor}`);
  const practice = picked.slice(0, 10).map((v, i) => make(v, kinds[i % 4], i));
  const trial = picked.slice(10, 20).map((v, i) => make(v, kinds[(i + 1) % 4], i + 20));
  const tilePool = Array.from(new Set(pool.flatMap(v => splitBeats(v.reading))));
  const builds: BuildItem[] = pickVerbs(pool, 8, `mf:${floor}:b`).map((v, i) => {
    const k = kinds[i % 4];
    const right = k.make(v);
    const answer = splitBeats(right);
    if (answer.length > 10) return null;
    return { prompt: `Susun ${k.label} dari "${v.reading}" ("${v.meaningId}").`, say: right, answer, extra: shuffle(tilePool.filter(t => !answer.includes(t)), `mfx:${v.id}`).slice(0, 2), explain: `${v.reading} → ${right}.` } as BuildItem;
  }).filter((b): b is BuildItem => b !== null).slice(0, 6);
  const rooms: Room[] = [
    { id: id('learn'), skill: 'pola', kind: 'lesson', kicker: 'Temukan', title: 'Rangkaian ます Lengkap', steps: KONJ_LESSONS[9] },
    { id: id('form'), skill: 'pola', kind: 'choice', kicker: 'Latih', title: 'Pilih Bentuk yang Benar', questions: practice }
  ];
  if (builds.length >= 3) rooms.push({ id: id('build'), skill: 'menulis', kind: 'build', kicker: 'Latih', title: 'Susun Bentuknya', items: builds });
  rooms.push({ id: id('trial'), skill: 'pola', kind: 'choice', kicker: 'Ingat', title: 'Ujian: Kata Kerja Baru', passRatio: 0.8, questions: trial });
  return { rooms, bank: practice };
}

// --------------------------------------------------------------------------
// Titik masuk
// --------------------------------------------------------------------------
const godanOnly = (v: VerbItem) => v.group === 'godan';

export function buildKonjFloor(nth: number, floor: number): FloorContent {
  switch (nth) {
    case 1: return groupFloor(floor);
    case 2: return verbFloor(floor, { keys: ['masu'], levels: ['N5'] }, KONJ_LESSONS[2], 'Bentuk Sopan ます');
    case 3: return verbFloor(floor, { keys: ['te'], levels: ['N5'], filter: godanOnly }, KONJ_LESSONS[3], 'Bentuk て I (Golongan 1)');
    case 4: return verbFloor(floor, { keys: ['te'], levels: ['N5'] }, KONJ_LESSONS[4], 'Bentuk て II (Golongan 2 & 3)');
    case 5: return verbFloor(floor, { keys: ['ta'], levels: ['N5'] }, KONJ_LESSONS[5], 'Bentuk Lampau た');
    case 6: return verbFloor(floor, { keys: ['nai'], levels: ['N5'] }, KONJ_LESSONS[6], 'Bentuk Negatif ない');
    case 7: return adjFloor(floor, 'i');
    case 8: return adjFloor(floor, 'na');
    default: return masuFullFloor(floor);
  }
}

export function buildLanjutFloor(nth: number, floor: number): FloorContent {
  const levels = ['N5', 'N4'];
  const lesson = LANJUT_LESSONS[nth];
  switch (nth) {
    case 1: return verbFloor(floor, { keys: ['potential'], levels }, lesson, 'Bentuk Potensial (bisa)');
    case 2: return verbFloor(floor, { keys: ['volitional', 'tai'], levels }, lesson, 'Ajakan & Keinginan (よう・たい)');
    case 3: return verbFloor(floor, { keys: ['ba', 'tara'], levels }, lesson, 'Pengandaian (ば・たら)');
    case 4: return verbFloor(floor, { keys: ['passive'], levels }, lesson, 'Bentuk Pasif');
    case 5: return verbFloor(floor, { keys: ['causative'], levels }, lesson, 'Bentuk Kausatif');
    default: return verbFloor(floor, { keys: ['imperative', 'causative_passive'], levels }, lesson, 'Perintah & Kausatif-Pasif');
  }
}

