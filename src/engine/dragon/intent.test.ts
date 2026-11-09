import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpret, extractDeckSlots, rankFeatures, matchTheme } from './intent';
import { dragonTierForRank, DRAGON_TIERS } from '../../data/dragon/tiers';

const cmds = (r: ReturnType<typeof interpret>) => r.choices.map(c => c.command).filter(Boolean);

test('bikin flashcard tanpa topik: naga menanyakan topik dan menunggu jawaban', () => {
  const r = interpret('Aku mau bikin flashcard');
  assert.equal(r.intent, 'create_deck_ask');
  assert.equal(r.awaiting?.kind, 'deck_topic');
  assert.ok(cmds(r).some(c => c?.type === 'deck_ai'));
});

test('jawaban topik melengkapi isian deck', () => {
  const ask = interpret('bikin flashcard kanji');
  assert.equal(ask.awaiting?.prefill.focus, 'kanji');
  const r = interpret('makanan', { awaiting: ask.awaiting });
  assert.equal(r.intent, 'create_deck');
  const deck = cmds(r).find(c => c?.type === 'deck_ai');
  assert.ok(deck && deck.type === 'deck_ai');
  assert.equal(deck.prefill.focus, 'kanji');
  assert.equal(deck.prefill.topic, 'makanan');
  assert.equal(deck.prefill.themeId, 'kuliner');
});

test('pertanyaan lain saat menunggu topik tidak dianggap topik', () => {
  const ask = interpret('Aku mau bikin flashcard');
  assert.equal(interpret('Apa itu Recall?', { awaiting: ask.awaiting }).intent, 'explain');
  assert.equal(interpret('Aku mau bikin flashcard', { awaiting: ask.awaiting }).intent, 'create_deck_ask');
  assert.equal(interpret('batal', { awaiting: ask.awaiting }).intent, 'cancel');
});

test('kalimat lengkap: jenis, level, jumlah, dan topik terbaca sekaligus', () => {
  const s = extractDeckSlots('tolong buatkan deck kosakata N5 20 kata tentang sekolah');
  assert.equal(s.focus, 'kotoba');
  assert.deepEqual(s.levels, ['N5']);
  assert.equal(s.count, 20);
  assert.equal(s.topic, 'sekolah');
  const r = interpret('tolong buatkan deck kosakata N5 20 kata tentang sekolah');
  assert.equal(r.intent, 'create_deck');
});

test('tema siap pakai dikenali dari kata kunci', () => {
  assert.equal(matchTheme('belanja'), 'konbini');
  assert.equal(matchTheme('xyzabc'), undefined);
});

test('penjelasan fitur memakai teks data, plus tombol buka', () => {
  const r = interpret('apa itu recall?');
  assert.equal(r.intent, 'explain');
  assert.deepEqual(cmds(r)[0], { type: 'recall' });
  const tower = interpret('Apa itu Menara?');
  assert.deepEqual(cmds(tower)[0], { type: 'tower' });
});

test('navigasi: kata kunci membawa ke sub-tab Library yang tepat', () => {
  assert.deepEqual(rankFeatures('kamus kanji')[0].command, { type: 'library', tab: 'kanji' });
  assert.deepEqual(rankFeatures('latihan soal')[0].command, { type: 'library', tab: 'soal' });
  const r = interpret('misi harian');
  assert.equal(r.intent, 'navigate');
  assert.deepEqual(cmds(r)[0], { type: 'tab', tab: 'daily' });
});

test('sapaan, pemula, dan tidak dikenal', () => {
  assert.equal(interpret('halo').intent, 'greeting');
  assert.equal(interpret('aku pemula, mulai dari mana?').intent, 'beginner');
  assert.equal(interpret('qwerty zzz').intent, 'unknown');
  assert.equal(interpret('   ').intent, 'empty');
});

test('pemetaan rank dukungan ke tier naga', () => {
  assert.equal(DRAGON_TIERS.length, 7);
  const expect: [number, string][] = [
    [0, 'hatchling'], [1, 'juvenile'], [2, 'young'], [3, 'adult'], [4, 'adult'],
    [5, 'elder'], [6, 'elder'], [7, 'ancient'], [8, 'celestial'], [9, 'celestial'], [-1, 'hatchling'], [NaN, 'hatchling'],
  ];
  for (const [rank, id] of expect) assert.equal(dragonTierForRank(rank).id, id, `rank ${rank}`);
});
