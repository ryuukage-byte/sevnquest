// Jalankan: npm test   (node:test + tsx; memakai data nyata dari database sumber)
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchJapanese, normalizeJapaneseQuery, createSubsetIndex, getUniversalIndex } from './universalSearch';
import { KOTOBA_DATABASE } from '../../data/kotoba';

const first = (q: string, types: ('kotoba' | 'kanji' | 'bunpou')[] = ['kotoba']) => searchJapanese(q, { entityTypes: types })[0];
const ID_NOMU = KOTOBA_DATABASE['kotoba_0057'].id;
const ID_TABERU = KOTOBA_DATABASE['kotoba_0564'].id;

test('data nyata: ID kanonik yang diuji memang 飲む dan 食べる', () => {
  assert.equal(KOTOBA_DATABASE[ID_NOMU].word, '飲む');
  assert.equal(KOTOBA_DATABASE[ID_TABERU].word, '食べる');
});

test('飲む: kanji, hiragana, katakana, romaji, variasi huruf → entity kanonik yang sama', () => {
  for (const q of ['飲む', 'のむ', 'ノム', 'nomu', 'Nomu', 'NOMU', '  nomu  ', 'ＮＯＭＵ']) {
    const r = first(q);
    assert.equal(r.entityId, ID_NOMU, `query "${q}"`);
    assert.equal(r.entity, KOTOBA_DATABASE[ID_NOMU], 'entity harus objek database yang sama, bukan salinan');
  }
});

test('食べる: kanji / kana / romaji → entity yang sama', () => {
  for (const q of ['食べる', 'たべる', 'taberu']) assert.equal(first(q).entityId, ID_TABERU, q);
});

test('spasi tidak mengubah hasil (benkyou suru = benkyousuru)', () => {
  const a = first('benkyou suru');
  const b = first('benkyousuru');
  assert.ok(a);
  assert.equal(a.entityId, b.entityId);
  assert.equal(first('べんきょうする').entityId, a.entityId);
});

test('ranking: exact identity selalu di atas; fuzzy/arti di bawah', () => {
  const r = searchJapanese('nomu', { entityTypes: ['kotoba'] });
  assert.equal(r[0].entityId, ID_NOMU);
  const exact = searchJapanese('食べる', { entityTypes: ['kotoba'] });
  assert.equal(exact[0].entityId, ID_TABERU);
  assert.equal(exact[0].matchType, 'exact-text');
  for (const x of exact.slice(1)) assert.ok(x.score < exact[0].score);
  const fuzzy = searchJapanese('nomuu', { entityTypes: ['kotoba'] });
  assert.ok(fuzzy.length > 0 && fuzzy.every(x => x.matchType === 'fuzzy' && x.score < 0.3));
});

test('arti: "makan" menemukan kata berarti makan, tetapi identitas tetap lebih tinggi', () => {
  const r = searchJapanese('makan', { entityTypes: ['kotoba'] });
  assert.ok(r.length > 0);
  assert.ok(r.some(x => x.matchType === 'meaning'));
  const nomuRows = searchJapanese('nomu', { entityTypes: ['kotoba'] });
  assert.ok(nomuRows[0].score > 0.9);
});

test('alias resmi: ID lama resolve ke ID kanonik', () => {
  const r = first('kt_train_20');
  assert.equal(r.entityId, 'kotoba_0564');
  assert.equal(r.matchType, 'exact-alias');
});

test('kanji: karakter exact; bacaan kana/romaji menemukan kanji yang sama', () => {
  const r = first('食', ['kanji']);
  assert.equal(r.entityType, 'kanji');
  assert.equal(r.primaryText, '食');
  assert.equal(r.matchType, 'exact-text');
  assert.ok(searchJapanese('taberu', { entityTypes: ['kanji'] }).some(x => x.primaryText === '食'));
});

test('bunpou: judul Jepang, romaji, dan arti', () => {
  const byTitle = first('ように', ['bunpou']);
  assert.equal(byTitle.entityType, 'bunpou');
  assert.equal(byTitle.matchType, 'exact-text');
  assert.equal(first('you ni', ['bunpou']).entityType, 'bunpou');
  assert.ok(searchJapanese('supaya', { entityTypes: ['bunpou'] }).length > 0);
});

test('filter entityTypes dihormati; default mencakup semua jenis', () => {
  assert.ok(searchJapanese('食', { entityTypes: ['kotoba'] }).every(r => r.entityType === 'kotoba'));
  const all = new Set(searchJapanese('taberu').map(r => r.entityType));
  assert.ok(all.has('kotoba') && all.has('kanji'));
});

test('negatif: query kosong / hanya spasi → []', () => {
  assert.deepEqual(searchJapanese(''), []);
  assert.deepEqual(searchJapanese('   '), []);
  assert.deepEqual(searchJapanese('xqzvwk'), []);
});

test('normalisasi: spasi, huruf lebar-penuh, katakana → hiragana', () => {
  const n = normalizeJapaneseQuery('  ＮＯＭＵ  ');
  assert.equal(n.text, 'nomu');
  assert.equal(n.hira, 'のむ');
  assert.equal(normalizeJapaneseQuery('ノム').hira, 'のむ');
});

test('indeks khusus (subset) membatasi hasil tanpa menggandakan data', () => {
  const subset = [KOTOBA_DATABASE[ID_TABERU]];
  const idx = createSubsetIndex({ kotoba: subset });
  assert.equal(searchJapanese('nomu', { index: idx, entityTypes: ['kotoba'] }).length, 0);
  assert.equal(searchJapanese('taberu', { index: idx, entityTypes: ['kotoba'] })[0].entity, KOTOBA_DATABASE[ID_TABERU]);
  assert.equal(createSubsetIndex({ kotoba: subset }).kotoba, idx.kotoba, 'dokumen di-cache per array sumber');
});

test('performa: pencarian Kotoba pada indeks hangat < 50ms', () => {
  getUniversalIndex();
  searchJapanese('nomu', { entityTypes: ['kotoba'] });
  const t = performance.now();
  for (let i = 0; i < 10; i++) searchJapanese('nomu', { entityTypes: ['kotoba'] });
  assert.ok((performance.now() - t) / 10 < 50);
});
