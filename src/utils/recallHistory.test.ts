import test from 'node:test';
import assert from 'node:assert/strict';
import { recordItemAttempt, recordItemInteraction, buildSmartRecallQueue, selectRecallEngine } from './mastery';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { stripDerivedStats } from '../state/derivedState';
import { mergeItemMastery } from './cloudMerge';
import type { ItemMasteryRecord } from '../types/content';

type Mastery = Record<string, ItemMasteryRecord>;

// Data pemain diambil dari database lewat kata/ID, tidak ada kosakata contoh yang ditanam di logika produksi.
const kotobaByWord = (w: string) => Object.values(KOTOBA_DATABASE).find(k => k.word === w)!;
const KURO = kotobaByWord('黒');
const DAIDOKORO = kotobaByWord('台所');
const KANJI = Object.values(KANJI_DATABASE).find(k => k.character === '黒') || Object.values(KANJI_DATABASE)[0];
const BUNPOU = Object.values(BUNPOU_DATABASE)[0];

const DAY = 24 * 60 * 60 * 1000;
const ids = (q: { itemId: string }[]) => q.map(i => i.itemId);

// Mirip handleStudyComplete: latihan menulis bernilai (score/total) -> recordItemAttempt.
function writeWithScore(m: Mastery, id: string, cat: 'kotoba' | 'kanji', score = 1, total = 1): Mastery {
  return { ...m, [id]: recordItemAttempt(m[id], id, cat, score, total, undefined, false, 'writing', cat) };
}
// Mirip handleRecordItemInteraction.
function interact(m: Mastery, id: string, cat: 'kotoba' | 'kanji' | 'bunpou', type: 'view' | 'writing' | 'flashcard' | 'quiz', ok = true): Mastery {
  return { ...m, [id]: recordItemInteraction(m[id], id, cat, type, ok, 'library') };
}
// Mirip handleItemReviewed (jawaban di Recall = percobaan 'quiz').
function answerInRecall(m: Mastery, id: string, cat: 'kotoba' | 'kanji' | 'bunpou', correct: boolean): Mastery {
  return { ...m, [id]: recordItemAttempt(m[id], id, cat, correct ? 7 : 4, 7, undefined, false, 'quiz', 'recall') };
}

// Simulasi refresh: simpan seperti usePersistence (tanpa data turunan) lalu baca ulang dari JSON.
function refresh(m: Mastery): Mastery {
  const persisted = JSON.stringify(stripDerivedStats({ itemMastery: m }));
  return JSON.parse(persisted).itemMastery;
}

test('fixture: data uji tersedia di database', () => {
  assert.ok(KURO && DAIDOKORO && KANJI && BUNPOU);
});

test('1. menulis 黒 di Library tercatat dengan ID stabil, kategori, jenis aktivitas, dan sumber', () => {
  let m: Mastery = {};
  m = writeWithScore(m, KURO.id, 'kotoba');
  const rec = m[KURO.id];
  assert.equal(rec.itemId, KURO.id);
  assert.equal(rec.category, 'kotoba');
  assert.equal(rec.writingCount, 1);
  assert.equal(rec.attemptsCount, 1);
  assert.equal(rec.bestScore.total, 1);
  assert.equal(rec.lastInteraction?.type, 'writing');
  assert.equal(rec.lastInteraction?.source, 'kotoba');
  assert.ok(Date.parse(rec.lastInteraction!.at) > 0);
});

test('2. setelah refresh, Recall mengambil 黒 dari riwayat yang tersimpan (engine canvas menulis)', () => {
  let m: Mastery = {};
  m = interact(m, KURO.id, 'kotoba', 'view'); // dibuka dulu di Library
  m = writeWithScore(m, KURO.id, 'kotoba');   // lalu latihan menulis
  const restored = refresh(m);
  const q = buildSmartRecallQueue(restored);
  const item = q.find(i => i.itemId === KURO.id);
  assert.ok(item, '黒 harus ada di antrean Recall setelah refresh');
  assert.equal(item!.category, 'kotoba');
  assert.equal(item!.exerciseFormat, 'canvas');
  // soal pilihan ganda writing-recall tetap tersedia sebagai cadangan
  assert.ok(item!.sampleQuestion!.options[item!.sampleQuestion!.correctIndex] === KURO.word);
  assert.ok(item!.sampleQuestion!.prompt.includes(KURO.reading));
});

test('3. belajar kotoba lewat flashcard -> Recall memilihnya dengan format soal arti/konteks', () => {
  let m: Mastery = {};
  m = interact(m, DAIDOKORO.id, 'kotoba', 'flashcard');
  const item = buildSmartRecallQueue(refresh(m)).find(i => i.itemId === DAIDOKORO.id);
  assert.ok(item);
  assert.equal(item!.category, 'kotoba');
  assert.ok(item!.sampleQuestion);
  assert.equal(item!.exerciseFormat, 'flashcard');
  const q = item!.sampleQuestion!;
  assert.equal(new Set(q.options).size, q.options.length, 'opsi tidak boleh ganda');
});

test('4. kanji dan bunpou: item serta content type yang benar terambil', () => {
  let m: Mastery = {};
  m = writeWithScore(m, KANJI.id, 'kanji');
  m = { ...m, [BUNPOU.id]: recordItemAttempt(undefined, BUNPOU.id, 'bunpou', 0, 1, undefined, false, 'quiz', 'bunpou') };
  const q = buildSmartRecallQueue(refresh(m));
  const kj = q.find(i => i.itemId === KANJI.id);
  const bp = q.find(i => i.itemId === BUNPOU.id);
  assert.equal(kj?.category, 'kanji');
  assert.ok(kj?.sampleQuestion);
  assert.equal(bp?.category, 'bunpou');
  assert.ok(bp?.sampleQuestion);
});

test('5. tanpa riwayat performa: tidak ada mastery rekaan dan tidak otomatis WEAK', () => {
  // hanya dibuka
  let viewed: Mastery = interact({}, DAIDOKORO.id, 'kotoba', 'view');
  const v = viewed[DAIDOKORO.id];
  assert.equal(v.masteryPercentage, 0);
  assert.deepEqual(v.bestScore, { score: 0, total: 0 });
  assert.equal(v.attemptsCount, 0);
  assert.equal(v.consecutivePerfects, 0);
  assert.equal(v.viewCount, 1);
  assert.deepEqual(buildSmartRecallQueue(viewed), [], 'paparan saja tidak masuk Recall');

  // dilatih (flashcard) tetapi belum pernah diuji
  const practiced = interact({}, DAIDOKORO.id, 'kotoba', 'flashcard');
  const rec = practiced[DAIDOKORO.id];
  assert.deepEqual(rec.bestScore, { score: 0, total: 0 });
  assert.equal(rec.masteryPercentage, 0);
  const [item] = buildSmartRecallQueue(practiced);
  assert.equal(item.reason, 'NEW_UNTESTED');
  assert.notEqual(item.priorityTier, 'WEAK');
  assert.equal(item.trueMasteryScore, undefined, 'tidak boleh ada True Mastery rekaan');
});

test('6. render/event berulang dan refresh tidak menggandakan riwayat', () => {
  let m: Mastery = {};
  const first = recordItemInteraction(m[KURO.id], KURO.id, 'kotoba', 'view', true, 'library');
  m = { [KURO.id]: first };
  // event identik beruntun (StrictMode / re-render / klik ganda) -> record yang sama persis
  const again = recordItemInteraction(m[KURO.id], KURO.id, 'kotoba', 'view', true, 'library');
  const again2 = recordItemInteraction(again, KURO.id, 'kotoba', 'view', true, 'library');
  assert.equal(again, first);
  assert.equal(again2, first);
  assert.equal(first.viewCount, 1);
  // refresh berkali-kali tidak mengubah apa pun
  const r1 = refresh(refresh(m));
  assert.deepEqual(r1, m);
  assert.equal(Object.keys(r1).length, 1);
  // pembangunan antrean berulang bersifat murni (tidak memutasi riwayat)
  const snapshot = JSON.stringify(m);
  buildSmartRecallQueue(m); buildSmartRecallQueue(m);
  assert.equal(JSON.stringify(m), snapshot);
  // jawaban kuis adalah hasil nyata: tidak di-dedupe
  const q1 = recordItemInteraction(first, KURO.id, 'kotoba', 'quiz', true, 'library');
  const q2 = recordItemInteraction(q1, KURO.id, 'kotoba', 'quiz', true, 'library');
  assert.equal(q2.quizCount, 2);
});

test('7. beberapa item layak: urutan mengikuti prioritas, bukan satu soal tetap', () => {
  const kotoba = Object.values(KOTOBA_DATABASE).slice(10, 16);
  let m: Mastery = {};
  // CRITICAL: salah berulang
  for (let i = 0; i < 3; i++) m = answerInRecall(m, kotoba[0].id, 'kotoba', false);
  // WEAK: satu jawaban salah
  m = answerInRecall(m, kotoba[1].id, 'kotoba', false);
  // baru dilatih, belum diuji
  m = interact(m, kotoba[2].id, 'kotoba', 'writing');
  m = interact(m, kotoba[3].id, 'kotoba', 'flashcard');
  const q = buildSmartRecallQueue(m);
  const tiers = q.map(i => i.priorityTier);
  assert.equal(q[0].itemId, kotoba[0].id);
  assert.equal(tiers[0], 'CRITICAL');
  assert.ok(ids(q).indexOf(kotoba[1].id) < ids(q).indexOf(kotoba[2].id), 'WEAK mendahului yang baru dilatih');
  assert.ok(q.length >= 4);

  // urutan tidak bergantung urutan penyisipan (tie-break stabil)
  const reversed: Mastery = {};
  for (const k of Object.keys(m).reverse()) reversed[k] = m[k];
  assert.deepEqual(ids(buildSmartRecallQueue(reversed)), ids(q));

  // menjawab item teratas di Recall mengeluarkannya dari kelompok "belum diuji": tidak berulang selamanya
  let n: Mastery = interact(interact({}, kotoba[2].id, 'kotoba', 'flashcard'), kotoba[3].id, 'kotoba', 'flashcard');
  const first = buildSmartRecallQueue(n)[0].itemId;
  n = answerInRecall(n, first, 'kotoba', true);
  const after = buildSmartRecallQueue(n);
  assert.ok(!ids(after).includes(first) || after[0].itemId !== first, 'item yang sudah diuji tidak diulang di posisi pertama');
  assert.equal(after[0].itemId, [kotoba[2].id, kotoba[3].id].find(i => i !== first));
});

test('8. riwayat kosong / hanya paparan -> antrean kosong (tanpa soal sisipan)', () => {
  assert.deepEqual(buildSmartRecallQueue({}), []);
  assert.deepEqual(buildSmartRecallQueue(interact({}, KURO.id, 'kotoba', 'view')), []);
  assert.deepEqual(buildSmartRecallQueue(undefined), []);
});

test('9. data pemain berbeda tidak tercampur', () => {
  const userA = writeWithScore({}, KURO.id, 'kotoba');
  const userB = interact({}, DAIDOKORO.id, 'kotoba', 'flashcard');
  const snapA = JSON.stringify(userA);
  const qA = buildSmartRecallQueue(userA);
  const qB = buildSmartRecallQueue(userB);
  assert.deepEqual(ids(qA), [KURO.id]);
  assert.deepEqual(ids(qB), [DAIDOKORO.id]);
  // interaksi pemain B tidak memutasi riwayat A
  interact(userB, KURO.id, 'kotoba', 'writing');
  assert.equal(JSON.stringify(userA), snapA);
  // penggabungan lokal+cloud milik SATU pemain tetap per-ID, tidak menimpa item lain
  const merged = mergeItemMastery(userA, userB);
  assert.deepEqual(Object.keys(merged).sort(), [KURO.id, DAIDOKORO.id].sort());
});

test('10. perilaku Recall/SRS yang ada tetap: jadwal, kritis, penguatan', () => {
  const [a, b, c] = Object.values(KOTOBA_DATABASE).slice(20, 23);
  // latihan sempurna yang sudah diuji di kuis -> belum jatuh tempo -> tidak muncul
  let m: Mastery = {};
  m = answerInRecall(m, a.id, 'kotoba', true);
  m = answerInRecall(m, a.id, 'kotoba', true);
  m = answerInRecall(m, a.id, 'kotoba', true);
  assert.ok(!ids(buildSmartRecallQueue(m)).includes(a.id), 'item yang belum jatuh tempo tidak diulang');

  // jatuh tempo -> REVIEW 'SRS_DUE'
  const due: Mastery = { [a.id]: { ...m[a.id], nextReviewDue: new Date(Date.now() - DAY).toISOString(), lastReviewedAt: new Date(Date.now() - 2 * DAY).toISOString() } };
  const dueItem = buildSmartRecallQueue(due).find(i => i.itemId === a.id);
  assert.ok(dueItem);
  assert.equal(dueItem!.priorityTier, 'REVIEW');
  assert.equal(dueItem!.reason, 'SRS_DUE');
  assert.equal(typeof dueItem!.trueMasteryScore, 'number');

  // 3x salah -> CRITICAL; salah sekali -> WEAK dengan mastery nyata
  let w: Mastery = {};
  for (let i = 0; i < 3; i++) w = answerInRecall(w, b.id, 'kotoba', false);
  w = answerInRecall(w, c.id, 'kotoba', false);
  const wq = buildSmartRecallQueue(w);
  assert.equal(wq.find(i => i.itemId === b.id)!.priorityTier, 'CRITICAL');
  assert.equal(typeof wq.find(i => i.itemId === c.id)!.trueMasteryScore, 'number');

  // batas jumlah item
  const many: Mastery = {};
  for (const k of Object.values(KOTOBA_DATABASE).slice(30, 50)) many[k.id] = answerInRecall({}, k.id, 'kotoba', false)[k.id];
  assert.equal(buildSmartRecallQueue(many, 10).length, 10);
  assert.equal(buildSmartRecallQueue(many, 3).length, 3);
});

test('regresi: sekali buka + sekali menulis tidak langsung MASTERED (paparan bukan percobaan)', () => {
  let m: Mastery = interact({}, KURO.id, 'kotoba', 'view');
  m = writeWithScore(m, KURO.id, 'kotoba');
  assert.notEqual(m[KURO.id].status, 'MASTERED');
  assert.equal(m[KURO.id].attemptsCount, 1);
  assert.equal(m[KURO.id].reviewIntervalDays, 2);
});

test('regresi: 台所 yang hanya dibuka tidak membuat Recall macet di soal itu', () => {
  // Gejala lama: record paparan memakai skor 1/1 rekaan (True Mastery 90%, WEAK) dan selalu urutan pertama,
  // sementara 黒 yang dilatih menulis keluar dari antrean. Sekarang: paparan tak masuk, 黒 masuk.
  let m: Mastery = interact({}, DAIDOKORO.id, 'kotoba', 'view');
  m = interact(m, KURO.id, 'kotoba', 'view');
  m = writeWithScore(m, KURO.id, 'kotoba');
  const q = buildSmartRecallQueue(refresh(m));
  assert.deepEqual(ids(q), [KURO.id]);
});

test('engine Recall mengikuti cara belajar: canvas, flashcard, soal; hasil Recall (engine apa pun) menandai sudah diuji', () => {
  const k = kotobaByWord('黒');
  const bunpouFlash = interact({}, BUNPOU.id, 'bunpou', 'flashcard');
  assert.equal(buildSmartRecallQueue(bunpouFlash)[0].exerciseFormat, 'flashcard');

  // kanji yang ditulis -> canvas
  const kanjiWritten = writeWithScore({}, KANJI.id, 'kanji');
  assert.equal(buildSmartRecallQueue(kanjiWritten).find(i => i.itemId === KANJI.id)!.exerciseFormat, 'canvas');

  // dijawab di Recall lewat canvas ('writing') -> recallCount naik, tidak muncul lagi sebagai "belum diuji"
  let m: Mastery = writeWithScore({}, k.id, 'kotoba');
  m = { ...m, [k.id]: recordItemAttempt(m[k.id], k.id, 'kotoba', 7, 7, undefined, false, 'writing', 'recall') };
  assert.equal(m[k.id].recallCount, 1);
  const after = buildSmartRecallQueue(m).find(i => i.itemId === k.id);
  assert.ok(!after || after.reason !== 'NEW_UNTESTED', 'sudah diuji lewat canvas: tidak diulang sebagai baru');

  // item yang sudah diuji bergantian engine antar sesi
  const engines = new Set<string | null>();
  let t: Mastery = writeWithScore({}, k.id, 'kotoba');
  for (let i = 0; i < 4; i++) {
    t = { ...t, [k.id]: recordItemAttempt(t[k.id], k.id, 'kotoba', 4, 7, undefined, false, 'quiz', 'recall') };
    engines.add(selectRecallEngine({ category: 'kotoba', itemId: k.id, difficultyLevel: 1, masteryRecord: t[k.id] }));
  }
  assert.ok(engines.has('canvas') && engines.has(null), 'bergantian canvas / soal');

  // level konteks (>=4) tetap soal, dan data engine tak ada -> null
  assert.equal(selectRecallEngine({ category: 'kotoba', itemId: k.id, difficultyLevel: 4, masteryRecord: t[k.id] }), null);
  assert.equal(selectRecallEngine({ category: 'kotoba', itemId: 'tidak_ada', difficultyLevel: 1, masteryRecord: t[k.id] }), null);
});

import { getFusionPatternForBunpou } from '../engine/recall/bunpouEngines';
import { conjugateVerb } from '../engine/morphology/inflectionEngine';

const PATTERN_BUNPOU = Object.values(BUNPOU_DATABASE).find(b => {
  const p = getFusionPatternForBunpou(b.id);
  return p && p.requiredConjugation !== 'jisho';
})!;
const PLAIN_BUNPOU = Object.values(BUNPOU_DATABASE).find(b => !getFusionPatternForBunpou(b.id))!;

test('engine bunpou: Grammar Fusion untuk pola V+akhiran, konjugasi dari conjugateVerb, bunpou lain tetap soal', () => {
  const pattern = getFusionPatternForBunpou(PATTERN_BUNPOU.id)!;
  // baru dilatih (kuis salah) -> sudah diuji; paksa belum diuji lewat latihan menulis tanpa kuis
  let m: Mastery = { [PATTERN_BUNPOU.id]: recordItemInteraction(undefined, PATTERN_BUNPOU.id, 'bunpou', 'writing', true, 'library') };
  const first = buildSmartRecallQueue(m)[0];
  assert.equal(first.exerciseFormat, 'fusion');
  assert.equal(first.fusion?.patternId, pattern.id);
  assert.ok(first.fusion!.verb.japanese);

  // item yang sudah diuji bergantian: fusion -> konjugasi -> soal kurasi
  const formats = new Set<string>();
  for (let n = 0; n < 4; n++) {
    m = { ...m, [PATTERN_BUNPOU.id]: recordItemAttempt(m[PATTERN_BUNPOU.id], PATTERN_BUNPOU.id, 'bunpou', 4, 7, undefined, false, 'quiz', 'recall') };
    const it = buildSmartRecallQueue(m).find(i => i.itemId === PATTERN_BUNPOU.id)!;
    formats.add(it.exerciseFormat!);
    if (it.exerciseFormat === 'conjugation') {
      const q = it.sampleQuestion!;
      const v = it.fusion!.verb;
      const expected = conjugateVerb(v.japanese, v.reading).forms[pattern.requiredConjugation as import('../engine/types').ConjugationForm].japanese;
      assert.equal(q.options[q.correctIndex], expected, 'jawaban = hasil conjugateVerb');
      assert.equal(new Set(q.options).size, 4);
      assert.ok(q.difficultyLevel !== 5, 'soal konjugasi bukan mode susun kalimat');
    }
  }
  assert.ok(formats.has('fusion') && formats.has('conjugation'), `format: ${[...formats]}`);

  // bunpou tanpa pola Fusion: tidak ada engine fusion
  const plain = buildSmartRecallQueue({ [PLAIN_BUNPOU.id]: recordItemAttempt(undefined, PLAIN_BUNPOU.id, 'bunpou', 0, 1, undefined, false, 'quiz', 'bunpou') })[0];
  assert.ok(plain.exerciseFormat !== 'fusion' && plain.exerciseFormat !== 'conjugation');
  assert.equal(plain.fusion, undefined);
});

import { DOKKAI_DATABASE } from '../data/dokkai';
import { CHOUKAI_DATABASE } from '../data/choukai';

test('engine lain: listening (kotoba), dokkai, choukai', () => {
  // listening muncul dalam rotasi kotoba yang sudah diuji, dengan audioPrompt dan tanpa menampilkan kata di soal
  const k = kotobaByWord('黒');
  let m: Mastery = writeWithScore({}, k.id, 'kotoba');
  let sawListening = false;
  for (let n = 0; n < 6 && !sawListening; n++) {
    m = { ...m, [k.id]: recordItemAttempt(m[k.id], k.id, 'kotoba', 4, 7, undefined, false, 'quiz', 'recall') };
    const it = buildSmartRecallQueue(m).find(i => i.itemId === k.id)!;
    if (it.exerciseFormat === 'listening') {
      sawListening = true;
      const q = it.sampleQuestion!;
      assert.ok(q.audioPrompt && q.audioPrompt.length > 0);
      assert.ok(!q.prompt.includes(k.word), 'kata tidak boleh bocor di teks soal listening');
      assert.equal(q.options[q.correctIndex], k.meaningId);
      assert.ok(q.difficultyLevel !== 5);
    }
  }
  assert.ok(sawListening, 'listening masuk rotasi');

  // dokkai: soal kurasi dari wacana
  const dk = Object.values(DOKKAI_DATABASE)[0];
  const dkItem = buildSmartRecallQueue({ [dk.id]: recordItemAttempt(undefined, dk.id, 'dokkai' as any, 0, 3, undefined, true, 'quiz', 'dokkai') }).find(i => i.itemId === dk.id)!;
  assert.equal(dkItem.exerciseFormat, 'dokkai');
  assert.ok(dkItem.sampleQuestion!.prompt.startsWith('【Dokkai'));
  assert.ok(dk.questions.some(q => dkItem.sampleQuestion!.prompt.includes(q.prompt)));

  // choukai: audio dialog + soal
  const ck = Object.values(CHOUKAI_DATABASE)[0];
  const ckItem = buildSmartRecallQueue({ [ck.id]: recordItemAttempt(undefined, ck.id, 'choukai' as any, 0, 3, undefined, false, 'quiz', 'choukai') }).find(i => i.itemId === ck.id)!;
  assert.equal(ckItem.exerciseFormat, 'choukai');
  assert.equal(ckItem.sampleQuestion!.audioPrompt, ck.audioText);
});

test('soal kurasi level 5 (kanji/dokkai) tidak pernah memakai mode susun-kalimat tanpa kata acak', () => {
  const kj = Object.values(KANJI_DATABASE).find(k => k.questions?.length)!;
  const rec = { ...recordItemAttempt(undefined, kj.id, 'kanji', 3, 3, undefined, false, 'quiz', 'x'), masteryLevel: 5 as const };
  const q = buildSmartRecallQueue({ [kj.id]: { ...rec, consecutivePerfects: 9, decayFactor: 1, mistakeCount: 3 } }).find(i => i.itemId === kj.id);
  if (q?.sampleQuestion) assert.ok(q.sampleQuestion.difficultyLevel !== 5 || (q.sampleQuestion.scrambleWords?.length ?? 0) > 0);
});
