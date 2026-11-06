import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UpgradeModal } from './UpgradeModal';
import { LockedOverlay, withLevelGate } from './AccessGate';
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

test('UpgradeModal bulanan: Full bulan ini sudah terbuka', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal
      request={{}}
      userId="u1"
      entitlement={parseEntitlement({ access_tier: 'full', month_total: 20000, month_unlocked: true, access_expires_at: '2099-01-01T00:00:00Z' })}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(html, /Full bulan ini sudah terbuka/);
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

test('withLevelGate: tanpa provider (Basic) N5 terbuka, N4 terkunci', () => {
  const Inner: React.FC<{ isOpen: boolean; level: string; onClose: () => void }> = ({ level }) => <div>ISI {level}</div>;
  const Gated = withLevelGate(Inner, { getLevel: p => p.level, isOpen: p => p.isOpen, getClose: p => p.onClose, labelPrefix: 'Kotoba' });
  assert.match(renderToStaticMarkup(<Gated isOpen level="N5" onClose={noop} />), /ISI N5/);
  const locked = renderToStaticMarkup(<Gated isOpen level="N4" onClose={noop} />);
  assert.doesNotMatch(locked, /ISI N4/);
  assert.match(locked, /Kotoba N4 terkunci/);
});
