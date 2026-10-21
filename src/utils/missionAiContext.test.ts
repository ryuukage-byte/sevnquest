import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMissionAiContext, type MissionContextInput } from './missionAiContext';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';
import type { ItemMasteryRecord } from '../types/content';

const base = (over: Partial<MissionContextInput> = {}): MissionContextInput => ({
  missionTitle: 'Kotoba Baru',
  category: 'kotoba',
  date: '2026-10-21',
  dayIndex: 5,
  durationDays: 60,
  currentLevel: 'N5',
  targetLevel: 'N3',
  ids: [],
  carried: new Set(),
  ...over,
});

const firstId = (db: Record<string, unknown>) => Object.keys(db)[0];

test('dokumen memuat instruksi untuk AI dan identitas misi', () => {
  const doc = buildMissionAiContext(base({ ids: [firstId(KOTOBA_DATABASE)] }));
  assert.match(doc, /^# Konteks Daily Mission — SevnQuest/);
  assert.match(doc, /Jangan menganggap materi yang tidak tercantum/);
  assert.match(doc, /ID misi: guided_kotoba_2026-10-21/);
  assert.match(doc, /Hari ke: 5 dari 60/);
  assert.match(doc, /Program belajar: N5 → N3/);
  assert.match(doc, /Jumlah materi: 1/);
});

test('program pemula ditulis sebagai "Pemula"', () => {
  const doc = buildMissionAiContext(base({ currentLevel: 'PEMULA', ids: [] }));
  assert.match(doc, /Program belajar: Pemula → N3/);
});

test('setiap materi diberi nomor, kategori, dan ID stabil', () => {
  const [a, b] = Object.keys(KOTOBA_DATABASE);
  const doc = buildMissionAiContext(base({ ids: [a, b] }));
  assert.match(doc, new RegExp(`### 1\\. \\[kotoba\\] ${a}\\n`));
  assert.match(doc, new RegExp(`### 2\\. \\[kotoba\\] ${b}\\n`));
});

test('isi kosakata diambil dari basis data asli', () => {
  const id = firstId(KOTOBA_DATABASE);
  const doc = buildMissionAiContext(base({ ids: [id] }));
  assert.ok(doc.includes(`- Kata: ${KOTOBA_DATABASE[id].word}`));
  assert.ok(doc.includes(`- Bacaan: ${KOTOBA_DATABASE[id].reading}`));
  assert.ok(doc.includes(`- Arti (Indonesia): ${KOTOBA_DATABASE[id].meaningId}`));
});

test('ID yang tidak ada di basis data ditandai, bukan diisi karangan', () => {
  const doc = buildMissionAiContext(base({ ids: ['kotoba_tidak_ada'] }));
  assert.match(doc, /- Data: tidak ditemukan di basis data \(ID kotoba_tidak_ada\)/);
});

test('status belajar diturunkan dari mastery; tanpa catatan berarti baru', () => {
  const [a, b] = Object.keys(KOTOBA_DATABASE);
  const mastery: Record<string, ItemMasteryRecord> = {};
  const doc = buildMissionAiContext(base({ ids: [a, b], mastery }));
  assert.match(doc, new RegExp(`${a}\\n- Status: baru\\n`));
  assert.match(doc, new RegExp(`${b}\\n- Status: baru\\n`));
});

test('materi tertunda diberi penanda', () => {
  const [a, b] = Object.keys(KOTOBA_DATABASE);
  const doc = buildMissionAiContext(base({ ids: [a, b], carried: new Set([b]) }));
  assert.match(doc, new RegExp(`${a}\\n- Status: baru\\n`));
  assert.match(doc, new RegExp(`${b}\\n- Status: baru, tertunda dari hari sebelumnya\\n`));
});

test('kanji: karakter, on/kun-yomi, dan radikal ditulis', () => {
  const id = firstId(KANJI_DATABASE);
  const k = KANJI_DATABASE[id];
  const doc = buildMissionAiContext(base({ category: 'kanji', missionTitle: 'Kanji Baru', ids: [id] }));
  assert.match(doc, new RegExp(`### 1\\. \\[kanji\\] ${id}\\n`));
  assert.ok(doc.includes(`- Karakter: ${k.character}`));
  assert.ok(doc.includes(`- Radikal: ${k.radical} (${k.radicalName})`));
  if (k.onyomi.length > 0) assert.ok(doc.includes(`- On'yomi: ${k.onyomi.join('、')}`));
});

test('bunpou: pola, penjelasan, dan contoh kalimat ditulis', () => {
  const id = firstId(BUNPOU_DATABASE);
  const b = BUNPOU_DATABASE[id];
  const doc = buildMissionAiContext(base({ category: 'bunpou', missionTitle: 'Bunpou Baru', ids: [id] }));
  assert.match(doc, new RegExp(`### 1\\. \\[bunpou\\] ${id}\\n`));
  assert.ok(doc.includes(`- Pola: ${b.formula}`));
  assert.ok(doc.includes(`- Penjelasan: ${b.explanation}`));
  const ex = (b.examples || [])[0];
  if (ex) assert.ok(doc.includes(`  - ${ex.japanese}`));
});

test('misi tanpa materi memberi keterangan eksplisit', () => {
  const doc = buildMissionAiContext(base({ ids: [] }));
  assert.match(doc, /Tidak ada materi pada misi ini\./);
  assert.match(doc, /Jumlah materi: 0/);
});

test('hanya materi kategori misi yang masuk dokumen', () => {
  const kotobaId = firstId(KOTOBA_DATABASE);
  const doc = buildMissionAiContext(base({ ids: [kotobaId] }));
  assert.doesNotMatch(doc, /\[kanji\]|\[bunpou\]/);
});
