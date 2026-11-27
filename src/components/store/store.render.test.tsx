import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreView } from './StoreView';
import { UnlockPackDialog } from './UnlockPackDialog';
import { UpgradeModal } from '../billing/UpgradeModal';
import { GiftContents } from '../mailbox/GiftBox';
import { parseStoreCatalog } from '../../lib/storeCore';
import { parseGift } from '../../lib/mailCore';
import { parseEntitlement } from '../../utils/access';
import type { StoreState } from '../../state/store';

const noop = () => {};

const catalog = parseStoreCatalog({
  packs: [
    {
      id: 'kilat-n3', title: 'Kilat N3', level: 'N3', description: 'Kosakata dari 10 ujian JLPT N3', price_passes: 2, item_count: 598,
      chapter_summary: [{ id: 'c1', title: 'Wajib', count: 30 }], sources: ['n3_2024_12', 'n3_2025_07'],
      preview: [], status: 'published', content_version: 1, owned: false,
    },
    {
      id: 'kilat-n1', title: 'Kilat N1', level: 'N1', description: 'Kosakata dari 7 ujian JLPT N1', price_passes: 3, item_count: 360,
      chapter_summary: [], sources: [], preview: [], status: 'published', content_version: 1, owned: false,
    },
  ],
  pass: { balance: 2, next_grant_at: '2026-12-12T00:00:00Z', next_grant_amount: 3, can_buy: true },
});

const store = (over: Partial<StoreState> = {}): StoreState => ({
  catalog, loading: false, error: null, ownedBooks: [], refresh: async () => {}, unlock: async () => { throw new Error('x'); }, ...over,
});

test('StoreView: saldo, jatah berikutnya, kartu pack, dan kekurangan pass', () => {
  const html = renderToStaticMarkup(
    <StoreView store={store()} canBuyPasses onOpenOwned={noop} onPreview={noop} onBuyPasses={noop} onUpgrade={noop} />
  );
  assert.match(html, /Saldo pass/);
  assert.match(html, />2</);
  assert.match(html, /3 pass berikutnya/);
  assert.match(html, /Kilat N3/);
  assert.match(html, /598 kata/);
  assert.match(html, /Kurang 1 pass/, 'Kilat N1 (3 pass) dengan saldo 2');
  assert.match(html, /Tambah pass/);
  assert.doesNotMatch(html, /gradient/);
});

test('StoreView: pengguna bukan Full tidak melihat tombol beli pass', () => {
  const html = renderToStaticMarkup(
    <StoreView store={store()} canBuyPasses={false} onOpenOwned={noop} onPreview={noop} onBuyPasses={noop} onUpgrade={noop} />
  );
  assert.doesNotMatch(html, /Tambah pass/);
  assert.match(html, /Pass didapat dari donasi/);
});

test('StoreView: offline menampilkan pesan dan pack milik tetap terlihat', () => {
  const html = renderToStaticMarkup(
    <StoreView
      store={store({
        catalog: null,
        error: 'Toko butuh koneksi internet. Pack yang sudah kamu miliki tetap bisa dilatih.',
        ownedBooks: [{
          id: 'kilat-n3', title: 'Kilat N3', japaneseTitle: '', subtitle: '', description: '', level: 'N3', coverIcon: '速',
          colorTheme: { accentColor: '', badgeBg: '', borderAccent: '', cardBg: '' },
          chapters: [{ id: 'c1', bookId: 'kilat-n3', chapterNumber: 1, titleJp: '', titleId: 'Wajib', items: [{ id: 'k1', category: 'kotoba', addedAt: 'x' }] }],
        }],
      })}
      canBuyPasses onOpenOwned={noop} onPreview={noop} onBuyPasses={noop} onUpgrade={noop}
    />
  );
  assert.match(html, /butuh koneksi/);
  assert.match(html, /Pack Saya \(1\)/);
  assert.match(html, /Milikmu/);
});

test('UnlockPackDialog: harga dan saldo setelah dibuka, dirender sebagai overlay layar penuh', () => {
  const html = renderToStaticMarkup(
    <UnlockPackDialog pack={catalog.packs[0]} balance={5} busy={false} error={null} onConfirm={noop} onClose={noop} />
  );
  assert.match(html, /Buka Kilat N3\?/);
  assert.match(html, /5 → 3/);
  assert.match(html, /fixed inset-0 z-50/);
  assert.match(html, /overflow-y-auto overscroll-contain/);
});

test('UpgradeModal tab Pass: harga per pass, dan tertutup untuk pengguna bukan Full', () => {
  const full = renderToStaticMarkup(
    <UpgradeModal
      request={{ tab: 'pass' }}
      userId="u1"
      entitlement={parseEntitlement({ access_tier: 'full', access_expires_at: '2099-01-01T00:00:00Z', pass_balance: 4 })}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(full, /Tambah Pack Pass/);
  assert.match(full, /Saldo 4/);
  assert.match(full, /Beli 1 pass · Rp 7\.000/);
  assert.doesNotMatch(full, /Jadikan key hadiah/, 'pass tidak bisa dihadiahkan');

  const basic = renderToStaticMarkup(
    <UpgradeModal request={{ tab: 'pass' }} userId="u1" entitlement={parseEntitlement({ access_tier: 'basic' })} onClose={noop} onChanged={noop} />
  );
  assert.match(basic, /khusus pengguna Full/);
  assert.doesNotMatch(basic, /Beli 1 pass/);
});

test('Kotak hadiah surat pass', () => {
  const gift = parseGift({ kind: 'pass', amount: 14000, auto: true, passes: 2, pass_balance: 5 });
  assert.ok(gift);
  assert.equal(gift.passes, 2);
  const html = renderToStaticMarkup(<GiftContents gift={gift} onRequestFeature={noop} />);
  assert.match(html, /Pack Pass/);
  assert.match(html, /2 pass/);
  assert.match(html, /5 pass/);
  assert.doesNotMatch(html, /Termasuk akses Full/);
});

test('StoreShortcut tersembunyi selama monetisasi belum tampil (di luar provider = saklar mati)', async () => {
  const { StoreShortcut } = await import('./StoreShortcut');
  assert.equal(renderToStaticMarkup(<StoreShortcut onOpen={noop} />), '');
  assert.equal(renderToStaticMarkup(<StoreShortcut onOpen={noop} variant="tile" />), '');
});
