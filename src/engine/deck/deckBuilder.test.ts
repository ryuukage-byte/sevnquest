// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeckFromTopic, extractTerms, toUserDeck } from './deckBuilder';
import { planTopic, sanitizePlan, rateLimited } from '../../../api/deck-topic';
import { KOTOBA_DATABASE } from '../../data/kotoba';

const base = { focus: 'kotoba' as const, levels: ['ALL'], count: 20 };

test('tema kuliner: materi asli ber-ID kanonik, tanpa duplikat, sesuai jumlah', () => {
  const r = buildDeckFromTopic({ ...base, themeId: 'kuliner' });
  assert.equal(r.items.length, 20);
  assert.equal(new Set(r.items.map(i => i.entityId)).size, r.items.length);
  for (const i of r.items) {
    assert.equal(i.category, 'kotoba');
    assert.ok(KOTOBA_DATABASE[i.entityId], `ID ${i.entityId} harus ada di database`);
    assert.equal(KOTOBA_DATABASE[i.entityId].word, i.primaryText);
  }
});

test('filter level dihormati', () => {
  const r = buildDeckFromTopic({ ...base, themeId: 'kuliner', levels: ['N5', 'N4'] });
  assert.ok(r.items.length > 0);
  assert.ok(r.items.every(i => ['N5', 'N4'].includes(i.level)));
});

test('tema bertag Kaigo mengambil materi bertag Kaigo', () => {
  const r = buildDeckFromTopic({ ...base, themeId: 'kaigo', levels: ['N5'] });
  assert.equal(r.items.length, 20);
  const tagged = r.items.filter(i => KOTOBA_DATABASE[i.entityId].tags?.includes('Kaigo'));
  assert.ok(tagged.length >= 15, 'mayoritas bertag Kaigo walau filter level N5');
});

test('topik bebas Indonesia, romaji, dan tanpa hasil', () => {
  assert.ok(buildDeckFromTopic({ ...base, topic: 'makan', count: 10 }).items.length > 0);
  const none = buildDeckFromTopic({ ...base, topic: 'xqzvwk', count: 10 });
  assert.equal(none.items.length, 0);
  assert.equal(none.shortfall, true);
});

test('kata kunci tambahan (perluasan AI) menambah kandidat', () => {
  const plain = buildDeckFromTopic({ ...base, topic: 'xqzvwk', count: 10 });
  const expanded = buildDeckFromTopic({ ...base, topic: 'xqzvwk', count: 10, extraKeywords: ['makan', 'minum'] });
  assert.ok(expanded.items.length > plain.items.length);
});

test('fokus kanji / bunpou / campuran mengembalikan jenis yang benar', () => {
  assert.ok(buildDeckFromTopic({ ...base, topic: 'makan', focus: 'kanji', count: 5 }).items.every(i => i.category === 'kanji'));
  assert.ok(buildDeckFromTopic({ ...base, topic: 'sebab', focus: 'bunpou', count: 5 }).items.every(i => i.category === 'bunpou'));
  const mixed = buildDeckFromTopic({ ...base, themeId: 'kuliner', focus: 'mixed', count: 20 });
  assert.ok(mixed.items.length <= 20);
  assert.ok(new Set(mixed.items.map(i => i.category)).size >= 2);
});

test('extractTerms: stopword dibuang, frasa utuh dipertahankan', () => {
  const t = extractTerms('Izakaya & Restoran untuk pemula');
  assert.ok(t.includes('izakaya') && t.includes('restoran') && t.includes('pemula'));
  assert.ok(!t.includes('untuk'));
});

test('toUserDeck: hanya referensi ID kanonik, tanpa customData', () => {
  const r = buildDeckFromTopic({ ...base, themeId: 'musim', count: 5 });
  const deck = toUserDeck({ title: 'T', description: 'D', coverIcon: '🌸', focus: 'kotoba', levels: ['ALL'], items: r.items });
  assert.equal(deck.items.length, r.items.length);
  assert.ok(deck.items.every(i => i.customData === undefined && KOTOBA_DATABASE[i.id]));
});

// ----- server (api/deck-topic.ts) -----
const okFetch = (content: string) => (async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) })) as unknown as typeof fetch;
const env = { DECK_AI_BASE_URL: 'https://example.test/v1', DECK_AI_API_KEY: 'k', DECK_AI_MODEL: 'm' };

test('server: tanpa konfigurasi → 503; topik kosong/panjang → 400', async () => {
  assert.equal((await planTopic({ topic: 'x' }, {})).status, 503);
  assert.equal((await planTopic({}, env)).status, 400);
  assert.equal((await planTopic({ topic: 'a'.repeat(500) }, env)).status, 400);
});

test('server: keluaran model disanitasi (tag HTML, panjang, tipe)', async () => {
  const bad = JSON.stringify({ title: '<b>Kuliner</b>', description: 'd', icon: '🍱', keywords: ['Makan', 'makan', 'x', 5, '<script>', 'minum'] });
  const out = await planTopic({ topic: 'kuliner' }, env, okFetch('Berikut:\n' + bad));
  assert.equal(out.status, 200);
  const plan = out.body.plan!;
  assert.ok(!/[<>]/.test(plan.title));
  assert.deepEqual(plan.keywords.filter(k => k === 'makan').length, 1);
  assert.ok(plan.keywords.every(k => typeof k === 'string' && !/[<>]/.test(k)));
});

test('server: keluaran sampah / upstream gagal → error, bukan crash', async () => {
  assert.equal((await planTopic({ topic: 'x' }, env, okFetch('bukan json'))).status, 502);
  assert.equal(sanitizePlan({ title: 'T', keywords: [] }), null);
  const failing = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
  assert.equal((await planTopic({ topic: 'x' }, env, failing)).status, 504);
});

test('server: rate limit per IP', () => {
  const now = Date.now();
  let limited = false;
  for (let i = 0; i < 12; i++) limited = rateLimited('1.2.3.4', now);
  assert.equal(limited, true);
  assert.equal(rateLimited('5.6.7.8', now), false);
});
