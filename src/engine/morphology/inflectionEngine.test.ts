import test from 'node:test';
import assert from 'node:assert/strict';
import { conjugateVerb, detectVerbGroup } from './inflectionEngine';
import { generateConjugationQuestion, kotobaItemToVerbItem, validateConjugationQuestion, VERB_CONJUGATION_DATABASE } from '../../data/conjugationRules';
import kotobaData from '../../data/db/kotoba.json';

// Bug: endsWith pada bacaan → つくる/おくる dianggap 来る, 刷る(する) dianggap する
const WRONG_KURU_OR_SURU: [string, string, string][] = [
  ['作る', 'つくる', '作ります'], ['作る/造る', 'つくる', '作ります'], ['造る', 'つくる', '造ります'],
  ['送る', 'おくる', '送ります'], ['贈る', 'おくる', '贈ります'], ['見送る', 'みおくる', '見送ります'],
  ['捲る', 'まくる', '捲ります'], ['刷る', 'する', '刷ります'], ['擦る', 'こする', '擦ります'],
  ['擦る', 'かする', '擦ります'], ['剃る', 'する', '剃ります'],
];

test('verba godan berbacaan くる/する tidak salah jadi kuru/suru', () => {
  for (const [w, r, masu] of WRONG_KURU_OR_SURU) {
    assert.equal(detectVerbGroup(w, r), 'godan', `${w}/${r}`);
    assert.equal(conjugateVerb(w, r).forms.masu.japanese, masu, `${w} masu`);
  }
});

// Bug: godan berakhiran i/e+る ditebak ichidan → ます tanpa り
const GODAN_I_E: [string, string][] = [
  ['混じる', 'まじる'], ['交じる', 'まじる'], ['湿る', 'しめる'], ['捻る', 'ひねる'], ['茂る', 'しげる'],
  ['齧る', 'かじる'], ['噛る', 'かじる'], ['千切る', 'ちぎる'], ['契る', 'ちぎる'], ['詰る', 'なじる'],
  ['罵る', 'ののしる'], ['練る', 'ねる'], ['弄る', 'いじる'], ['毟る', 'むしる'],
];

test('godan berakhiran i/e+る masuk pengecualian', () => {
  for (const [w, r] of GODAN_I_E) {
    // 混じる/交じる: JMdict mencatat godan (まじる)
    assert.equal(detectVerbGroup(w, r), 'godan', `${w}/${r}`);
    assert.match(conjugateVerb(w, r).forms.masu.japanese, /り(ます)$/, `${w} masu`);
  }
});

test('homofon ichidan tidak ikut ter-godan-kan lewat bacaan', () => {
  for (const [w, r] of [['着る', 'きる'], ['居る', 'いる'], ['寝る', 'ねる'], ['経る', 'へる'], ['出来る', 'できる'], ['見る', 'みる']]) {
    assert.equal(detectVerbGroup(w, r), 'ichidan', `${w}/${r}`);
  }
  for (const [w, r] of [['切る', 'きる'], ['要る', 'いる'], ['減る', 'へる'], ['帰る', 'かえる'], ['入る', 'はいる']]) {
    assert.equal(detectVerbGroup(w, r), 'godan', `${w}/${r}`);
  }
});

test('verba tak beraturan tetap benar', () => {
  assert.equal(detectVerbGroup('来る', 'くる'), 'kuru');
  assert.equal(detectVerbGroup('持って来る', 'もってくる'), 'kuru');
  assert.equal(detectVerbGroup('する', 'する'), 'suru');
  assert.equal(detectVerbGroup('勉強する', 'べんきょうする'), 'suru');
  assert.equal(detectVerbGroup('為る', 'する'), 'suru');
  assert.equal(conjugateVerb('来る', 'くる').forms.masu.japanese, '来ます');
  assert.equal(conjugateVerb('勉強する', 'べんきょうする').forms.te.japanese, '勉強して');
});

test('soal konjugasi: tepat satu jawaban benar, tanpa placeholder, untuk semua verba di bank', () => {
  const verbs = Object.values(kotobaData as Record<string, any>).filter(e => e.wordType === 'verb');
  const items = [...VERB_CONJUGATION_DATABASE, ...verbs.map(kotobaItemToVerbItem).filter((v): v is NonNullable<typeof v> => !!v)];
  for (const verb of items) {
    for (const formId of ['masu', 'te', 'ta', 'nai', 'potential', 'passive', 'causative', 'ba', 'volitional', 'causative_passive', 'tai', 'tara', 'imperative']) {
      const q = generateConjugationQuestion(formId, verb);
      assert.deepEqual(validateConjugationQuestion(q), [], `${verb.kanji} ${formId}: ${q.options.join(',')}`);
      assert.equal(q.options.length, 4, `${verb.kanji} ${formId} harus 4 opsi`);
    }
  }
});

test('soal 作る ます形: jawaban 作ります ada, 作るきます tidak ada', () => {
  const verb = VERB_CONJUGATION_DATABASE.find(v => v.kanji === '作る') ?? kotobaItemToVerbItem({ id: 'x', word: '作る', reading: 'つくる', meaningId: 'Membuat' } as any)!;
  for (let i = 0; i < 30; i++) {
    const q = generateConjugationQuestion('masu', verb);
    assert.equal(q.options[q.correctIndex], '作ります');
    assert.ok(!q.options.includes('作るきます'));
  }
});
