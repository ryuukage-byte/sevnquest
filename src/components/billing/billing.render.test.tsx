import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UpgradeModal } from './UpgradeModal';
import { LockedOverlay, withLevelGate } from './AccessGate';
import { parseEntitlement, BASIC_ENTITLEMENT } from '../../utils/access';

const noop = () => {};

test('UpgradeModal: paket Basic menampilkan Medium/Full dan alasan kunci', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal
      request={{ requiredTier: 'medium', label: 'Kotoba N3' }}
      userId="u1"
      entitlement={BASIC_ENTITLEMENT}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(html, /Kotoba N3/);
  assert.match(html, /Medium/);
  assert.match(html, /Rp 15\.000/);
  assert.match(html, /Rp 350\.000/);
});

test('UpgradeModal: tab donatur menampilkan Lifetime Rp 700.000 dan D1-D7', () => {
  const html = renderToStaticMarkup(
    <UpgradeModal
      request={{ tab: 'donor' }}
      userId="u1"
      entitlement={parseEntitlement({ access_tier: 'medium', access_expires_at: '2099-01-01T00:00:00Z' })}
      onClose={noop}
      onChanged={noop}
    />
  );
  assert.match(html, /Lifetime/);
  assert.match(html, /Rp 700\.000/);
  assert.match(html, /Sakura/);
  assert.match(html, /Fuji/);
});

test('LockedOverlay menyebut paket yang dibutuhkan', () => {
  const html = renderToStaticMarkup(<LockedOverlay requiredTier="full" label="Kanji N1" onClose={noop} />);
  assert.match(html, /Kanji N1 terkunci/);
  assert.match(html, /Full/);
});

test('withLevelGate: tanpa provider (Basic) N5 terbuka, N2 terkunci', () => {
  const Inner: React.FC<{ isOpen: boolean; level: string; onClose: () => void }> = ({ level }) => <div>ISI {level}</div>;
  const Gated = withLevelGate(Inner, { getLevel: p => p.level, isOpen: p => p.isOpen, getClose: p => p.onClose, labelPrefix: 'Kotoba' });
  assert.match(renderToStaticMarkup(<Gated isOpen level="N5" onClose={noop} />), /ISI N5/);
  const locked = renderToStaticMarkup(<Gated isOpen level="N2" onClose={noop} />);
  assert.doesNotMatch(locked, /ISI N2/);
  assert.match(locked, /Kotoba N2 terkunci/);
});
