import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyMissionAiContext, type AiContextDatabases } from './aiContext';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import type { GuidedDay } from './types';
import type { BunpouItem, KanjiItem, KotobaItem } from '../../types/content';

const kotoba = {
  id: 'k1', word: '食べる', reading: 'たべる', meaningId: 'makan', meaningEn: 'eat', meaningJa: '', jlpt: 'N5',
  wordType: 'verb', kanjiComponents: ['食'], exampleSentence: { japanese: '寿司を食べる。', reading: 'すしをたべる。', meaningId: 'Makan sushi.' },
} as KotobaItem;
const kanji = {
  id: 'kj1', character: '食', meaningId: 'makan', meaningEn: 'eat', onyomi: ['ショク'], kunyomi: ['た.べる'], jlpt: 'N5',
  strokeCount: 9, radical: '食', radicalName: 'shoku', relatedWords: [{ word: '食事', reading: 'しょくじ', meaningId: 'makan' }], questions: [],
} as KanjiItem;
const bunpou = {
  id: 'b1', title: '〜ながら', reading: 'nagara', meaningId: 'sambil', meaningEn: 'while', level: 'N4',
  explanation: 'Dua aksi bersamaan.', formula: 'V-masu + ながら', examples: [{ japanese: '歩きながら話す。', reading: 'あるきながらはなす。', meaningId: 'Bicara sambil jalan.' }], questions: [],
} as BunpouItem;

const db: AiContextDatabases = { kotoba: { k1: kotoba }, kanji: { kj1: kanji }, bunpou: { b1: bunpou } };
const day = (over: Partial<GuidedDay> = {}): GuidedDay => ({
  date: '2026-10-18', kotoba: ['k1'], kanji: ['kj1'], bunpou: ['b1'], carried: [], recallTarget: 12, claimed: {}, ...over,
});

test('A1. memuat instruksi AI, identitas misi, dan semua kategori dengan ID', () => {
  const { text, counts } = buildDailyMissionAiContext({ day: day(), dayIndex: 3, profile: { currentLevel: 'N5', targetLevel: 'N4' }, db });
  assert.deepEqual(counts, { kotoba: 1, kanji: 1, bunpou: 1, missing: 0 });
  for (const s of ['Instruksi untuk AI', 'SUMBER UTAMA', 'Tanggal: 2026-10-18', 'Hari ke: 3', 'N5 → N4',
    '[KOTOBA] 食べる  (ID: k1)', '[KANJI] 食  (ID: kj1)', '[BUNPOU] 〜ながら  (ID: b1)',
    'たべる', 'ショク', 'V-masu + ながら', '歩きながら話す。']) {
    assert.ok(text.includes(s), `harus memuat: ${s}`);
  }
});

test('A2. field yang tidak ada dilewati, tidak dikarang', () => {
  const { text } = buildDailyMissionAiContext({ day: day({ kanji: [], bunpou: [] }), db });
  assert.ok(!text.includes('Definisi'));
  assert.ok(!text.includes('Kolokasi'));
  assert.ok(!text.includes('Hari ke'));
  assert.ok(!text.includes('[KANJI] 食'));
  assert.ok(!text.includes('## KANJI'));
});

test('A3. ID yang tak ditemukan dilaporkan, bukan dikarang; ID ganda digabung', () => {
  const { text, counts } = buildDailyMissionAiContext({ day: day({ kotoba: ['k1', 'k1', 'hilang'], kanji: [], bunpou: [] }), db });
  assert.equal(counts.kotoba, 1);
  assert.equal(counts.missing, 1);
  assert.ok(text.includes('kotoba:hilang'));
});

test('A4. tidak membocorkan data pribadi (hanya field materi + tanggal)', () => {
  const { text } = buildDailyMissionAiContext({ day: day({ claimed: { kotoba: true } }), db });
  assert.ok(!/claimed|userId|email|mastery/i.test(text));
});

test('A5. basis data asli: seluruh materi sampel menghasilkan dokumen tanpa "undefined"/"[object"', () => {
  const real: AiContextDatabases = { kotoba: KOTOBA_DATABASE, kanji: KANJI_DATABASE, bunpou: BUNPOU_DATABASE };
  const pick = (o: Record<string, unknown>, n: number) => Object.keys(o).slice(0, n);
  const { text, counts } = buildDailyMissionAiContext({
    day: day({ kotoba: pick(KOTOBA_DATABASE, 40), kanji: pick(KANJI_DATABASE, 40), bunpou: pick(BUNPOU_DATABASE, 40) }), db: real,
  });
  assert.equal(counts.missing, 0);
  assert.ok(counts.kotoba > 0 && counts.kanji > 0 && counts.bunpou > 0);
  assert.ok(!/undefined|\[object|NaN|null/.test(text));
});

// ------------------------------------------------------------ deck
import { buildDeckAiContext } from './aiContext';

const ref = (id: string, category: 'kotoba' | 'kanji' | 'bunpou', extra = {}) => ({ id, category, addedAt: '2026-01-01', ...extra });

test('D1. deck: identitas + jenis + semua kategori, dedupe, kustom ditandai tanpa data karangan', () => {
  const { text, counts } = buildDeckAiContext({
    kind: 'custom', db,
    deck: {
      title: 'Deck Saya', description: 'uji', level: 'N5',
      items: [
        ref('k1', 'kotoba'), ref('k1', 'kotoba'), ref('kj1', 'kanji'), ref('b1', 'bunpou'),
        ref('x9', 'kotoba', { customData: { word: 'ひみつ', meaning: 'rahasia' } }),
        ref('gone', 'kanji'),
      ],
    },
  });
  assert.deepEqual(counts, { kotoba: 2, kanji: 1, bunpou: 1, missing: 1 });
  for (const s of ['Nama: Deck Saya', 'Deck buatan pengguna', '[KOTOBA] 食べる', 'materi kustom buatan pengguna', 'Arti: rahasia', 'kanji:gone']) {
    assert.ok(text.includes(s), s);
  }
  const from = text.indexOf('ひみつ');
  const custom = text.slice(from, text.indexOf('\n\n', from));
  assert.ok(!/Level JLPT|Jenis kata|Bacaan/.test(custom), 'tidak mengarang field yang tidak diisi');
});

test('D2. deck resmi/bookmark berlabel benar; deck kosong tidak error', () => {
  assert.ok(buildDeckAiContext({ kind: 'official', db, deck: { title: 'Bab 1', items: [] } }).text.includes('Deck resmi SevnQuest'));
  const b = buildDeckAiContext({ kind: 'bookmark', db, deck: { title: 'Bookmark', items: [] } }).text;
  assert.ok(b.includes('Buku Saku Bookmark') && b.includes('belum berisi materi'));
});
