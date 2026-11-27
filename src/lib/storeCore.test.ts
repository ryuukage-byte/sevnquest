import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PASS_STATE, examSourceLabel, packsNeedingSync, parseOwnedPacks, parsePackContents, parsePassState,
  parseStoreCatalog, passOrderAmount, passShortfall, storeErrorMessage, unlockBlock,
} from './storeCore';
import { BASIC_ENTITLEMENT, canBuyPasses, parseEntitlement } from '../utils/access';

const CATALOG = {
  packs: [
    {
      id: 'kilat-n3', title: 'Kilat N3', level: 'N3', description: 'd', cover_icon: 'zap', price_passes: 2, item_count: 574,
      chapter_summary: [{ id: 'kilat-n3_ch1', title: 'Wajib', count: 28 }],
      sources: ['n3_2024_12', 7], preview: [{ id: 'k1', category: 'kotoba', addedAt: 'x', notes: 'Muncul di 5 ujian' }, { id: 'bad' }],
      status: 'published', content_version: 3, owned: false, unlocked_at: null,
    },
    { title: 'tanpa id' },
  ],
  pass: { balance: 5, next_grant_at: '2026-12-12T00:00:00Z', next_grant_amount: 3, can_buy: true, price_idr: 7000, max_per_order: 20 },
};

test('parseStoreCatalog membaca pack dan saldo, membuang data rusak', () => {
  const c = parseStoreCatalog(CATALOG);
  assert.equal(c.packs.length, 1);
  const p = c.packs[0];
  assert.equal(p.pricePasses, 2);
  assert.equal(p.itemCount, 574);
  assert.deepEqual(p.sources, ['n3_2024_12']);
  assert.equal(p.preview.length, 1);
  assert.equal(p.preview[0].notes, 'Muncul di 5 ujian');
  assert.equal(p.chapters[0].title, 'Wajib');
  assert.equal(c.pass.balance, 5);
  assert.equal(c.pass.nextGrantAmount, 3);
  assert.equal(c.pass.canBuy, true);
});

test('parsePassState: masukan kosong jatuh ke default yang aman', () => {
  assert.deepEqual(parsePassState(null), DEFAULT_PASS_STATE);
  assert.equal(parsePassState({ balance: -4, can_buy: 'yes' }).balance, 0);
  assert.equal(parsePassState({ can_buy: 'yes' }).canBuy, false);
});

test('unlockBlock dan passShortfall', () => {
  const { packs, pass } = parseStoreCatalog(CATALOG);
  const pack = packs[0];
  assert.equal(unlockBlock(pack, pass), null);
  assert.equal(unlockBlock(pack, { ...pass, balance: 1 }), 'insufficient');
  assert.equal(passShortfall(pack, { ...pass, balance: 1 }), 1);
  assert.equal(unlockBlock({ ...pack, owned: true }, pass), 'owned');
  assert.equal(unlockBlock({ ...pack, status: 'retired' }, pass), 'unavailable');
});

test('parsePackContents membentuk OfficialBook dan membuang bab kosong', () => {
  const c = parsePackContents({
    pack_id: 'kilat-n3', content_version: 2,
    book: {
      title: 'Kilat N3', level: 'N3', coverIcon: '速',
      chapters: [
        { id: 'c1', chapterNumber: 1, titleId: 'Wajib', items: [{ id: 'k1', category: 'kotoba', addedAt: 'x' }] },
        { id: 'c2', chapterNumber: 2, titleId: 'Kosong', items: [{ id: 'k2', category: 'lain' }] },
      ],
    },
  });
  assert.ok(c);
  assert.equal(c.contentVersion, 2);
  assert.equal(c.book.id, 'kilat-n3');
  assert.equal(c.book.level, 'N3');
  assert.equal(c.book.chapters.length, 1);
  assert.equal(c.book.chapters[0].bookId, 'kilat-n3');
  assert.equal(parsePackContents({ pack_id: 'x', book: { chapters: [] } }), null);
  assert.equal(parsePackContents({ book: {} }), null);
});

test('packsNeedingSync: unduh yang belum ada di cache atau versinya lebih baru', () => {
  const owned = parseOwnedPacks([
    { pack_id: 'a', content_version: 2 }, { pack_id: 'b', content_version: 1 }, { pack_id: 'c', content_version: 1 }, {},
  ]);
  assert.equal(owned.length, 3);
  assert.deepEqual(packsNeedingSync(owned, { a: { contentVersion: 1 }, b: { contentVersion: 1 } }), ['a', 'c']);
});

test('passOrderAmount', () => {
  assert.equal(passOrderAmount(1), 7000);
  assert.equal(passOrderAmount(3), 21000);
  assert.equal(passOrderAmount(0), null);
  assert.equal(passOrderAmount(21), null);
  assert.equal(passOrderAmount(1.5), null);
});

test('canBuyPasses: hanya Full aktif, bukan masa tenggang', () => {
  assert.equal(canBuyPasses(BASIC_ENTITLEMENT), false);
  assert.equal(canBuyPasses(parseEntitlement({ access_tier: 'full' })), true);
  assert.equal(canBuyPasses(parseEntitlement({ access_tier: 'full', access_in_grace: true })), false);
});

test('parseEntitlement membaca saldo pass dan harga pass', () => {
  const e = parseEntitlement({ access_tier: 'full', pass_balance: 9, config: { pass_price_idr: 8000, pass_max_per_order: 10 } });
  assert.equal(e.passBalance, 9);
  assert.equal(e.config.passPriceIdr, 8000);
  assert.equal(e.config.passMaxPerOrder, 10);
  const d = parseEntitlement({});
  assert.equal(d.passBalance, 0);
  assert.equal(d.config.passPriceIdr, 7000);
});

test('examSourceLabel dan storeErrorMessage', () => {
  assert.equal(examSourceLabel('n2_2023_07'), 'Jul 2023');
  assert.match(storeErrorMessage({ message: 'insufficient_passes' }), /belum cukup/);
  assert.match(storeErrorMessage(new Error('already_owned')), /sudah kamu miliki/);
  assert.match(storeErrorMessage({ message: 'not_full' }), /Full/);
  assert.match(storeErrorMessage('weird'), /Coba lagi/);
});
