import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWER1_FLOORS, TOWER1_ROOMS, TOWER1_SKILL_LABEL } from '../../data/tower1';
import { POOL_F3, POOL_F4, POOL_F5, POOL_F6, POOL_F7, POOL_KATAKANA } from '../../data/tower1/kana';
import { WORDS_F3, WORDS_F4, WORDS_F5, WORDS_F6, WORDS_F7 } from '../../data/tower1/words';
import { WORDS_F8 } from '../../data/tower1/content/floor008';
import { computeRanks, getFloorState, getRecommendedFloor, missingHard, starsForAccuracy, validateGraph } from './graph';
import { offendingChars, parseRuby, readingOf, splitBeats, stripRuby } from './jp';
import { Room, Tower1Progress } from './types';
import { mergeTower1Progress } from './progress';

const progressOf = (...ids: number[]): Tower1Progress => ({
  cleared: Object.fromEntries(ids.map(id => [id, { stars: 3 as const, accuracy: 100, clearedAt: '', attempts: 1 }]))
});
const stateOf = (id: number, p: Tower1Progress) => getFloorState(TOWER1_FLOORS.find(f => f.id === id)!, p);

// --------------------------------------------------------------------------
// Graf
// --------------------------------------------------------------------------
test('DAG Tower 1 valid (tanpa siklus / prasyarat hilang)', () => {
  assert.deepEqual(validateGraph(TOWER1_FLOORS), []);
  assert.equal(TOWER1_FLOORS.length, 16);
});

test('Peringkat: prasyarat selalu di bawah dependennya', () => {
  const ranks = computeRanks(TOWER1_FLOORS);
  for (const f of TOWER1_FLOORS) {
    for (const p of [...f.hard, ...f.soft]) assert.ok(ranks[p] < ranks[f.id], `${p} < ${f.id}`);
  }
  assert.equal(ranks[1], 0);
});

test('Unlock: awalnya hanya 001; 002/003 terbuka setelah 001', () => {
  const none = progressOf();
  const open = TOWER1_FLOORS.filter(f => stateOf(f.id, none) === 'available').map(f => f.id);
  assert.deepEqual(open, [1]);
  const after1 = progressOf(1);
  assert.equal(stateOf(2, after1), 'available');
  assert.equal(stateOf(3, after1), 'available');
  assert.equal(stateOf(4, after1), 'locked');
});

test('Koreksi DAG: 008/009/010 butuh 006; 007 butuh 002 + 005', () => {
  const upTo5 = progressOf(1, 3, 4, 5);
  assert.equal(stateOf(6, upTo5), 'available');
  for (const id of [8, 9, 10]) assert.equal(stateOf(id, upTo5), 'locked', `lantai ${id} harus terkunci sebelum 006`);
  assert.equal(stateOf(7, upTo5), 'locked'); // belum ada 002
  assert.equal(stateOf(7, progressOf(1, 2, 3, 4, 5)), 'available');
  const upTo6 = progressOf(1, 3, 4, 5, 6);
  for (const id of [8, 9, 10]) assert.equal(stateOf(id, upTo6), 'available');
});

test('Lantai 11-16: terbuka setelah prasyaratnya; 015 butuh 007, 008, 009, 012, 014', () => {
  const upTo10 = progressOf(...Array.from({ length: 10 }, (_, i) => i + 1));
  assert.equal(stateOf(11, upTo10), 'available');
  assert.equal(stateOf(13, upTo10), 'available');
  assert.equal(stateOf(12, upTo10), 'locked');
  const spec = TOWER1_FLOORS.find(f => f.id === 15)!;
  assert.deepEqual(missingHard(spec, upTo10), [12, 14]);
  assert.equal(stateOf(16, progressOf(...Array.from({ length: 15 }, (_, i) => i + 1))), 'available');
});

test('Rekomendasi: nomor terkecil terbuka; mengutamakan prasyarat lunak terpenuhi', () => {
  assert.equal(getRecommendedFloor(TOWER1_FLOORS, progressOf()), 1);
  assert.equal(getRecommendedFloor(TOWER1_FLOORS, progressOf(1)), 2);
  // 006 selesai: terbuka 007(soft 006 ok), 008 (soft 007 belum), 009 (soft 008 belum), 010
  assert.equal(getRecommendedFloor(TOWER1_FLOORS, progressOf(1, 2, 3, 4, 5, 6)), 7);
  assert.equal(getRecommendedFloor(TOWER1_FLOORS, progressOf(...Array.from({ length: 10 }, (_, i) => i + 1))), 11);
  assert.equal(getRecommendedFloor(TOWER1_FLOORS, progressOf(...Array.from({ length: 16 }, (_, i) => i + 1))), null);
});

test('Bintang berdasarkan akurasi', () => {
  assert.equal(starsForAccuracy(100), 3);
  assert.equal(starsForAccuracy(90), 3);
  assert.equal(starsForAccuracy(80), 2);
  assert.equal(starsForAccuracy(40), 1);
});

// --------------------------------------------------------------------------
// Utilitas Jepang
// --------------------------------------------------------------------------
test('splitBeats: ゃゅょ melebur, っ/ん/ー/vokal panjang terpisah', () => {
  assert.deepEqual(splitBeats('きょう'), ['きょ', 'う']);
  assert.deepEqual(splitBeats('ちょっと'), ['ちょ', 'っ', 'と']);
  assert.deepEqual(splitBeats('コーヒー'), ['コ', 'ー', 'ヒ', 'ー']);
  assert.deepEqual(splitBeats('ほん'), ['ほ', 'ん']);
  assert.equal(splitBeats('ほうれんそう').length, 6);
  assert.equal(splitBeats('ティー').length, 2);
});

test('parseRuby: markup furigana', () => {
  assert.deepEqual(parseRuby('[日本|にほん]の[学校|がっこう]'), [
    { base: '日本', ruby: 'にほん' }, { base: 'の' }, { base: '学校', ruby: 'がっこう' }
  ]);
  assert.equal(readingOf('[私|わたし]は[水|みず]を[飲|の]みます'), 'わたしはみずをのみます');
  assert.equal(stripRuby('[私|わたし]は'), '私は');
});

// --------------------------------------------------------------------------
// Kolam kata tertutup (klaim "baca tanpa Romaji" harus benar)
// --------------------------------------------------------------------------
const checkPool = (name: string, words: { jp: string }[], pool: Set<string>) =>
  test(`Kolam kata ${name} hanya memakai aksara yang sudah diajarkan`, () => {
    for (const w of words) assert.deepEqual(offendingChars(w.jp, pool), [], `${name}: "${w.jp}"`);
  });
checkPool('F3', WORDS_F3, POOL_F3);
checkPool('F4', WORDS_F4, POOL_F4);
checkPool('F5', WORDS_F5, POOL_F5);
checkPool('F6', WORDS_F6, POOL_F6);
checkPool('F7', WORDS_F7, POOL_F7);
checkPool('F8 (katakana)', WORDS_F8, POOL_KATAKANA);

test('Tidak ada kata duplikat dalam satu kolam', () => {
  for (const list of [WORDS_F3, WORDS_F4, WORDS_F5, WORDS_F6, WORDS_F7, WORDS_F8]) {
    assert.equal(new Set(list.map(w => w.jp)).size, list.length, 'kata duplikat dalam satu kolam');
  }
});

test('Kolam kata lantai 7 tanpa dakuten (prasyarat 006 hanya lunak)', () => {
  const voiced = /[がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ]/;
  for (const w of WORDS_F7) assert.ok(!voiced.test(w.jp), w.jp);
});

// --------------------------------------------------------------------------
// Room
// --------------------------------------------------------------------------
test('Lantai ready punya Room; lantai sealed (bila ada) tidak', () => {
  for (const f of TOWER1_FLOORS) {
    const rooms = TOWER1_ROOMS[f.id];
    if (f.status === 'ready') assert.ok(rooms && rooms.length > 0, `lantai ${f.id} tanpa Room`);
    else assert.equal(rooms, undefined, `lantai ${f.id} sealed tetapi punya Room`);
  }
  assert.deepEqual(TOWER1_FLOORS.filter(f => f.status === 'ready').map(f => f.id), Array.from({ length: 16 }, (_, i) => i + 1));
});

test('Setiap Room punya jenis kemampuan yang valid (bukan label graf)', () => {
  const valid = new Set(Object.keys(TOWER1_SKILL_LABEL));
  for (const [floor, rooms] of Object.entries(TOWER1_ROOMS) as [string, Room[]][]) {
    for (const room of rooms) assert.ok(valid.has(room.skill), `lantai ${floor} / ${room.id}: skill "${room.skill}" tidak dikenal`);
  }
});

test('Struktur Room valid: id unik, soal konsisten, jawaban ada di pilihan', () => {
  const ids = new Set<string>();
  for (const [floor, rooms] of Object.entries(TOWER1_ROOMS) as [string, Room[]][]) {
    // Setiap lantai harus punya setidaknya satu Room latihan (non-lesson) sebagai mastery signal.
    assert.ok(rooms.some(r => r.kind !== 'lesson'), `lantai ${floor} tanpa latihan`);
    assert.ok(rooms.some(r => r.kind !== 'lesson' && 'passRatio' in r && r.passRatio), `lantai ${floor} tanpa ujian (passRatio)`);
    for (const room of rooms) {
      assert.ok(!ids.has(room.id), `id ganda ${room.id}`);
      ids.add(room.id);
      const where = `lantai ${floor} / ${room.id}`;
      switch (room.kind) {
        case 'lesson':
          assert.ok(room.steps.length > 0, where);
          break;
        case 'choice':
          assert.ok(room.questions.length > 0, where);
          room.questions.forEach((q, i) => {
            assert.equal(new Set(q.options).size, q.options.length, `${where} #${i}: pilihan kembar ${JSON.stringify(q.options)}`);
            assert.ok(q.options.length >= 2, `${where} #${i}`);
            assert.ok(q.answer >= 0 && q.answer < q.options.length, `${where} #${i}: jawaban di luar pilihan`);
          });
          break;
        case 'pair': {
          assert.ok(room.pairs.length >= 3, where);
          assert.equal(new Set(room.pairs.map(p => p[0])).size, room.pairs.length, `${where}: kiri kembar`);
          assert.equal(new Set(room.pairs.map(p => p[1])).size, room.pairs.length, `${where}: kanan kembar`);
          break;
        }
        case 'build':
          room.items.forEach((it, i) => {
            assert.ok(it.answer.length >= 2, `${where} #${i}`);
          });
          break;
        case 'pick':
          room.items.forEach((it, i) => {
            assert.ok(it.correct.length > 0, `${where} #${i}`);
            for (const c of it.correct) assert.ok(c >= 0 && c < it.tokens.length, `${where} #${i}: indeks ${c}`);
          });
          break;
      }
    }
  }
});

test('Lantai 3-5: soal baca-kata tidak membocorkan Romaji (opsi berupa arti, bukan huruf Latin bunyi)', () => {
  for (const floor of [3, 4, 5]) {
    for (const room of TOWER1_ROOMS[floor]) {
      if (room.kind !== 'choice') continue;
      for (const q of room.questions) {
        if (q.prompt.startsWith('Baca kata')) {
          assert.ok(q.glyph && !/[a-z]/i.test(q.glyph), `${room.id}: glyph kata harus kana`);
          assert.ok(!q.fallback, `${room.id}: soal baca-kata tidak boleh punya fallback romaji`);
        }
      }
    }
  }
});

test('Ujian gerbang lantai 5 tidak memuat Romaji pada soal', () => {
  for (const room of TOWER1_ROOMS[5].filter(r => r.id === 'f005-gate-read' || r.id === 'f005-gate-listen')) {
    assert.equal(room.kind, 'choice');
    if (room.kind !== 'choice') continue;
    for (const q of room.questions) {
      assert.ok(!(q.glyph ?? '').match(/[a-z]/i), `${room.id}: glyph berisi huruf Latin`);
    }
  }
});

test('Kalimat Lantai 10: hanya aksara yang sudah dipelajari (hiragana + dakuten, furigana ok)', () => {
  const allowed = new Set([...POOL_F6, '私', '水', '飲', '先生', '本', '読', '学校', '大']);
  for (const ch of Array.from('私水飲先生本読学校大')) allowed.add(ch);
  const room = TOWER1_ROOMS[10];
  for (const r of room) {
    if (r.kind !== 'pick') continue;
    for (const item of r.items) {
      for (const t of item.tokens) {
        const bad = offendingChars(stripRuby(t.text), allowed);
        assert.deepEqual(bad, [], `${r.id}: "${t.text}"`);
      }
      // Raja kalimat ada di indeks terakhir pada Room "temukan raja" (kecuali soal khusus).
      if (r.id === 'f010-find' || r.id === 'f010-trial') {
        assert.deepEqual(item.correct, [item.tokens.length - 1]);
      }
    }
  }
});

test('Furigana Lantai 9: setiap markup valid dan bacaan hanya kana', () => {
  const kanaOnly = /^[ぁ-んー]+$/;
  const collect = (text: string) => parseRuby(text).filter(p => p.ruby).forEach(p => assert.match(p.ruby!, kanaOnly, text));
  for (const room of TOWER1_ROOMS[9]) {
    if (room.kind === 'choice') room.questions.forEach(q => q.glyph && collect(q.glyph));
    if (room.kind === 'pick') room.items.forEach(it => it.tokens.forEach(t => collect(t.text)));
    if (room.kind === 'lesson') room.steps.forEach(s => { if (s.glyph) collect(s.glyph); if (s.example) collect(s.example.jp); });
  }
});

test('Contoh & tabel pada pelajaran lantai 3-7 hanya memakai aksara yang sudah diajarkan', () => {
  const pools: Record<number, Set<string>> = { 3: POOL_F3, 4: POOL_F4, 5: POOL_F5, 6: POOL_F6, 7: POOL_F7 };
  const clean = (t: string) => t.replace(/[\s→゛゜]/g, '');
  for (const [floor, pool] of Object.entries(pools)) {
    for (const room of TOWER1_ROOMS[Number(floor)]) {
      if (room.kind !== 'lesson') continue;
      for (const s of room.steps) {
        const texts = [s.example?.jp, s.glyph && /[぀-ヿ]/.test(s.glyph) ? s.glyph : undefined,
          ...(s.grid ?? []).map(g => g.glyph), ...(s.chunks ?? []).map(c => c.text), ...(s.beats ?? [])];
        for (const t of texts) {
          if (!t) continue;
          assert.deepEqual(offendingChars(clean(stripRuby(t)), pool), [], `lantai ${floor} / ${room.id}: "${t}"`);
        }
      }
    }
  }
});

test('Gabungan progres: union lantai, rekor terbaik menang', () => {
  const rec = (accuracy: number, stars: 1 | 2 | 3, clearedAt: string, attempts: number) => ({ accuracy, stars, clearedAt, attempts });
  const a: Tower1Progress = { cleared: { 1: rec(80, 2, '2026-01-02', 2), 2: rec(100, 3, '2026-01-03', 1) } };
  const b: Tower1Progress = { cleared: { 1: rec(95, 3, '2026-01-01', 5), 3: rec(70, 1, '2026-01-04', 1) } };
  const m = mergeTower1Progress(a, b);
  assert.deepEqual(Object.keys(m.cleared).map(Number).sort(), [1, 2, 3]);
  assert.deepEqual(m.cleared[1], rec(95, 3, '2026-01-01', 5));
  assert.deepEqual(mergeTower1Progress(undefined, undefined), { cleared: {} });
  assert.deepEqual(mergeTower1Progress(a, undefined).cleared[2], a.cleared[2]);
});


// --------------------------------------------------------------------------
// Lantai 11-16: kanji hanya lewat furigana; ujian cukup besar
// --------------------------------------------------------------------------
test('Lantai 11-16: teks Jepang hanya kana (kanji hanya lewat furigana)', () => {
  const kanji = /[\u4e00-\u9fff]/;
  const check = (where: string, text: string | undefined) => {
    if (!text) return;
    const bare = text.replace(/\[([^|\]]+)\|[^\]]+\]/g, '');
    assert.ok(!kanji.test(bare), `${where}: kanji tanpa furigana pada "${text}"`);
  };
  for (const floor of [11, 12, 13, 14, 15, 16]) {
    for (const room of TOWER1_ROOMS[floor]) {
      const where = `lantai ${floor} / ${room.id}`;
      if (room.kind === 'choice') room.questions.forEach(q => check(where, q.glyph));
      if (room.kind === 'pick') room.items.forEach(it => it.tokens.forEach(t => check(where, t.text)));
      if (room.kind === 'pair') room.pairs.forEach(p => check(where, p[0]));
      if (room.kind === 'lesson') room.steps.forEach(s => {
        if (s.example) check(where, s.example.jp);
        (s.chunks ?? []).forEach(c => check(where, c.text));
      });
    }
  }
});

test('Lantai 11-16: setiap lantai punya ujian dengan soal cukup', () => {
  for (const floor of [11, 12, 13, 14, 15, 16]) {
    const trials = TOWER1_ROOMS[floor].filter(r => r.kind !== 'lesson' && 'passRatio' in r && r.passRatio);
    assert.ok(trials.length >= 1, `lantai ${floor}`);
    for (const t of trials) {
      const n = t.kind === 'choice' ? t.questions.length : t.kind === 'pick' ? t.items.length : 0;
      assert.ok(n >= 4, `${t.id} hanya ${n} soal`);
    }
  }
});
