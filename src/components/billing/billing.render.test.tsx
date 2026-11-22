import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UpgradeModal, claimUnlocked, CLAIM_DELAY_MIN } from './UpgradeModal';
import { LockedOverlay, withLevelGate } from './AccessGate';
import { sortMonthlyDonors } from './DonorBoard';
import { parseEntitlement, BASIC_ENTITLEMENT } from '../../utils/access';

const noop = () => {};

test('UpgradeModal bulanan: donasi 5.000 → kurang Rp 12.000 untuk Full', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal
      request={{ requiredTier: 'full', label: 'Kotoba N3' }}
      userId="u1"
      entitlement={parseEntitlement({ access_tier: 'basic', month_total: 5000 })}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(html, /Kotoba N3/);
  assert.match(html, /Kurang .*Rp 12\.000/);
  assert.match(html, /Rp 17\.000/);
});

test('UpgradeModal bulanan: penggeser 7 tingkat, tingkat 1 sudah tercapai → bawaan tingkat 2', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal
      request={{}}
      userId="u1"
      entitlement={parseEntitlement({ access_tier: 'full', month_total: 20000, month_tier: 1, month_unlocked: true, access_expires_at: '2099-01-01T00:00:00Z' })}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(html, /type="range"/);
  assert.match(html, /Tingkat 2/);
  assert.match(html, /prioritas Lv\.1/);
  assert.match(html, /150rb\+/);
  assert.match(html, /Kurang .*Rp 5\.000/);
});

test('UpgradeModal lifetime: tangga badge dan target Rp 700.000', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal
      request={{ tab: 'donor' }}
      userId="u1"
      entitlement={parseEntitlement({ access_tier: 'full', lifetime_total: 600000, badge_level: 7, badge_title: 'Fuji' })}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(html, /Tabungan Lifetime/);
  assert.match(html, /Rp 700\.000/);
  assert.match(html, /Sakura/);
  assert.match(html, /Eien/);
  assert.match(html, /Setor Rp 25\.000/);
});

test('UpgradeModal: tanpa entitlement tetap render', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal request={{}} userId={null} entitlement={BASIC_ENTITLEMENT} onClose={noop} onChanged={noop} />
  );
  assert.match(html, /Dukung SevnQuest/);
});

test('LockedOverlay menyebut akses yang dibutuhkan', () => {
  const html = renderToStaticMarkup(<LockedOverlay requiredTier="full" label="Kanji N1" onClose={noop} />);
  assert.match(html, /Kanji N1 terkunci/);
  assert.match(html, /Full/);
});

test('withLevelGate: tanpa provider (saklar monetisasi mati) semua level terbuka', () => {
  const Inner: React.FC<{ isOpen: boolean; level: string; onClose: () => void }> = ({ level }) => <div>ISI {level}</div>;
  const Gated = withLevelGate(Inner, { getLevel: p => p.level, isOpen: p => p.isOpen, getClose: p => p.onClose, labelPrefix: 'Kotoba' });
  assert.match(renderToStaticMarkup(<Gated isOpen level="N5" onClose={noop} />), /ISI N5/);
  assert.match(renderToStaticMarkup(<Gated isOpen level="N1" onClose={noop} />), /ISI N1/);
});

test('UpgradeModal: rincian keuntungan tampil di tingkat selain Tingkat 1', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal request={{ requiredTier: 'full', label: 'X' }} userId="u1" entitlement={parseEntitlement({ access_tier: 'full', month_total: 17000, month_tier: 1 })} onClose={noop} onChanged={noop} />,
  );
  assert.match(html, /Keuntungan Tingkat 2/);
  assert.match(html, /Super Premium Lv\.1/);
  assert.match(html, /Semua materi N4 sampai N1/);
});

test('donatur bulan ini diurutkan dari donasi terbesar', () => {
  const row = (n: string, rank: number | null, tier = 1) => ({
    display_name: n, is_anonymous: false, badge_level: 0, badge_title: null, is_lifetime: false,
    monthly_this_month: true, month_tier: tier, month_rank: rank,
  });
  const out = sortMonthlyDonors([row('C', 3), row('A', 1), row('X', null, 5), row('B', 2)]);
  assert.deepEqual(out.map(r => r.display_name), ['A', 'B', 'C', 'X']);
});

test('UpgradeModal tab Tahunan tampil dengan label hemat', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal request={{ requiredTier: 'full', label: 'X' }} userId="u1" entitlement={parseEntitlement({ access_tier: 'basic' })} onClose={noop} onChanged={noop} />,
  );
  assert.match(html, /Tahunan/);
  assert.match(html, /-50%/);
});

test('lapor "sudah bayar" baru terbuka setelah 5 menit, atau bila sudah diklaim/kedaluwarsa', () => {
  const t0 = Date.parse('2026-11-22T08:00:00Z');
  const order = { status: 'pending' as const, created_at: new Date(t0).toISOString(), expires_at: new Date(t0 + 30 * 60_000).toISOString() };
  assert.equal(claimUnlocked(order, t0 + 60_000), false);
  assert.equal(claimUnlocked(order, t0 + CLAIM_DELAY_MIN * 60_000), true);
  assert.equal(claimUnlocked({ ...order, status: 'claimed' }, t0), true);
  assert.equal(claimUnlocked({ ...order, status: 'expired' }, t0), true);
  assert.equal(claimUnlocked({ ...order, expires_at: new Date(t0 - 1).toISOString() }, t0), true);
  assert.equal(claimUnlocked({ ...order, status: 'paid' }, t0 + 99 * 60_000), false);
});
