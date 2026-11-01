import test from 'node:test';
import assert from 'node:assert/strict';
import { KANJI_DATABASE } from '../../data/kanji';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KOTOBA_FORMATION_NOTES } from '../../data/kotobaInsights';
import type { KotobaItem } from '../../types/content';
import { buildKotobaInsight, hasKotobaInsight } from './kotobaInsight';
import { isKanjiChar, splitWordReading } from './readingSplit';

const SRC = { kotoba: KOTOBA_DATABASE, kanji: KANJI_DATABASE };
const lookup = (c: string) => KANJI_DATABASE[c];
const ALL = Object.values(KOTOBA_DATABASE);
const byWord = (w: string) => {
  const found = ALL.find(k => k.word === w);
  assert.ok(found, `kotoba ${w} ada di database`);
  return found!;
};
const fmt = (w: string, r: string) =>
  splitWordReading(w, r, lookup)
    .parts.map(p => `${p.text}=${p.reading}`)
    .join(' ');

test('pemecah bacaan: per kanji, termasuk perubahan bunyi', () => {
  assert.equal(fmt('安心', 'あんしん'), '安=あん 心=しん');
  assert.equal(fmt('学校', 'がっこう'), '学=がっ 校=こう');
  assert.equal(fmt('手紙', 'てがみ'), '手=て 紙=がみ');
  assert.equal(fmt('熱心', 'ねっしん'), '熱=ねっ 心=しん');
  assert.equal(fmt('食べる', 'たべる'), '食=た べる=べる');
  assert.equal(fmt('お茶', 'おちゃ'), 'お=お 茶=ちゃ');
  assert.equal(fmt('人々', 'ひとびと'), '人=ひと 々=びと');
  const gakkou = splitWordReading('学校', 'がっこう', lookup).parts[0];
  assert.equal(gakkou.baseReading, 'がく');
  assert.equal(gakkou.readingType, 'on');
});

test('pemecah bacaan: 熟字訓 ditandai sebagai satu kesatuan', () => {
  for (const [w, r] of [['今日', 'きょう'], ['大人', 'おとな']]) {
    const split = splitWordReading(w, r, lookup);
    assert.equal(split.aligned, false, w);
    assert.deepEqual(split.parts.map(p => [p.text, p.reading, p.readingType]), [[w, r, 'irregular']]);
  }
});

test('安心: enam tahap lengkap sesuai rancangan', () => {
  const ins = buildKotobaInsight(byWord('安心'), SRC);
  assert.deepEqual(ins.steps, ['recognize', 'breakdown', 'formation', 'family', 'usage', 'quiz']);
  assert.equal(ins.romaji, 'ANSHIN');
  assert.equal(ins.structure, 'jukugo');
  assert.equal(ins.readingStyle?.ja, '音読み');
  assert.deepEqual(ins.kanji.map(k => [k.char, k.reading]), [['安', 'あん'], ['心', 'しん']]);
  assert.equal(ins.formation?.transparency, 'langsung');
  assert.equal(ins.formation?.literal, 'Hati yang merasa aman');

  const fam = Object.fromEntries(ins.families.map(f => [f.kanji, f.words.map(w => w.word)]));
  assert.ok(fam['安'].includes('安全'), `keluarga 安: ${fam['安']}`);
  assert.ok(fam['心'].includes('心配'), `keluarga 心: ${fam['心']}`);
  assert.ok(!fam['安'].includes('安心') && !fam['心'].includes('安心'), 'kata asal tidak masuk keluarganya sendiri');
  for (const f of ins.families) assert.equal(new Set(f.words.map(w => w.word)).size, f.words.length, 'tanpa kata ganda');

  assert.equal(ins.usage?.lemma, '安心する');
  const [a, b] = ins.usage!.highlight!;
  assert.ok(ins.usage!.japanese.slice(a, b).startsWith('安心し'));
});

test('kata kanji tunggal tidak dipaksa punya tahap pembentukan makna', () => {
  const ins = buildKotobaInsight(byWord('山'), SRC);
  assert.equal(ins.structure, 'single');
  assert.ok(!ins.steps.includes('formation'));
  assert.ok(ins.steps.includes('breakdown'));
});

test('kata dengan okurigana: kanji membawa makna, kana menjadi akhiran', () => {
  const ins = buildKotobaInsight(byWord('食べる'), SRC);
  assert.equal(ins.structure, 'okurigana');
  assert.equal(ins.kanji.length, 1);
  assert.match(ins.formation!.explanation, /okurigana/);
  assert.equal(ins.usage?.surface?.startsWith('食べ'), true);
});

test('bacaan bentuk する di database tidak ikut ke romaji', () => {
  const entry = ALL.find(k => k.word === '勉強' && k.reading === 'べんきょうする');
  if (!entry) return;
  const ins = buildKotobaInsight(entry, SRC);
  assert.equal(ins.reading, 'べんきょう');
  assert.equal(ins.romaji, 'BENKYOU');
});

test('tombol Pemahaman hanya untuk kata berkanji', () => {
  assert.equal(hasKotobaInsight({ word: 'ありがとう' }), false);
  assert.equal(hasKotobaInsight({ word: 'コーヒー' }), false);
  assert.equal(hasKotobaInsight({ word: '安心' }), true);
});

test('catatan kurasi: menunjuk kotoba yang ada dan kanji penyusunnya', () => {
  for (const [word, note] of Object.entries(KOTOBA_FORMATION_NOTES)) {
    byWord(word);
    const kanji = Array.from(word).filter(isKanjiChar);
    assert.deepEqual(Object.keys(note.parts).sort(), [...new Set(kanji)].sort(), `${word}: arti per kanji`);
    assert.ok(note.literal && note.explanation, word);
  }
});

test('uji pemahaman: opsi unik, satu jawaban benar, dan deterministik (sampel luas)', () => {
  const sample: KotobaItem[] = ALL.filter(k => hasKotobaInsight(k)).filter((_, i) => i % 37 === 0);
  assert.ok(sample.length > 200);
  for (const item of sample) {
    const ins = buildKotobaInsight(item, SRC);
    assert.equal(ins.steps[0], 'recognize', item.id);
    for (const q of ins.quiz) {
      assert.ok(q.options.length >= 3 && q.options.length <= 4, `${item.id} ${q.id}`);
      assert.equal(new Set(q.options).size, q.options.length, `${item.id} ${q.id} opsi ganda: ${q.options}`);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length, `${item.id} ${q.id}`);
    }
    const reading = ins.quiz.find(q => q.id === 'reading');
    if (reading) assert.equal(reading.options[reading.correctIndex], ins.reading.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)));
    if (ins.usage?.highlight) {
      const [a, b] = ins.usage.highlight;
      assert.ok(a >= 0 && b > a && b <= ins.usage.japanese.length, item.id);
    }
  }
  const again = buildKotobaInsight(byWord('安心'), SRC);
  assert.deepEqual(again.quiz, buildKotobaInsight(byWord('安心'), SRC).quiz);
});
