import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requiredTierForLevel, canAccessLevel, tierAtLeast, requiredTierForTowerFloor,
  parseEntitlement, entitlementFromCache, ENTITLEMENT_CACHE_MAX_AGE_MS, BASIC_ENTITLEMENT, daysUntil, formatIdr,
} from './access';

test('level → tier mengikuti PRD: kana/N5 gratis, N4-N3 Medium, N2-N1/Kaigo/SSW Full', () => {
  assert.equal(requiredTierForLevel('KANA'), 'basic');
  assert.equal(requiredTierForLevel('Katakana'), 'basic');
  assert.equal(requiredTierForLevel('N5'), 'basic');
  assert.equal(requiredTierForLevel('JLPT N5'), 'basic');
  assert.equal(requiredTierForLevel('N4'), 'medium');
  assert.equal(requiredTierForLevel('n3'), 'medium');
  assert.equal(requiredTierForLevel('N2'), 'full');
  assert.equal(requiredTierForLevel('N1'), 'full');
  assert.equal(requiredTierForLevel('Kaigo'), 'full');
  assert.equal(requiredTierForLevel('SSW'), 'full');
  assert.equal(requiredTierForLevel('PM'), 'full');
  assert.equal(requiredTierForLevel('JFT'), 'medium');
  assert.equal(requiredTierForLevel('ALL'), 'full');
  assert.equal(requiredTierForLevel('N5_N4'), 'medium');
  assert.equal(requiredTierForLevel('N3-N2'), 'full');
  assert.equal(requiredTierForLevel('all'), 'full');
});

test('level tak dikenal/kosong tidak mengunci', () => {
  assert.equal(requiredTierForLevel(undefined), 'basic');
  assert.equal(requiredTierForLevel(''), 'basic');
  assert.equal(requiredTierForLevel('TEMATIK'), 'basic');
});

test('canAccessLevel / tierAtLeast', () => {
  assert.equal(canAccessLevel('basic', 'N5'), true);
  assert.equal(canAccessLevel('basic', 'N4'), false);
  assert.equal(canAccessLevel('medium', 'N3'), true);
  assert.equal(canAccessLevel('medium', 'N2'), false);
  assert.equal(canAccessLevel('full', 'N1'), true);
  assert.equal(tierAtLeast('full', 'medium'), true);
  assert.equal(tierAtLeast('medium', 'full'), false);
});

test('Tower: lantai 1-60 Basic, 61-100 Medium', () => {
  assert.equal(requiredTierForTowerFloor(1), 'basic');
  assert.equal(requiredTierForTowerFloor(60), 'basic');
  assert.equal(requiredTierForTowerFloor(61), 'medium');
  assert.equal(requiredTierForTowerFloor(100), 'medium');
});

test('parseEntitlement aman terhadap masukan aneh', () => {
  assert.deepEqual(parseEntitlement(null), BASIC_ENTITLEMENT);
  const e = parseEntitlement({ access_tier: 'gold', donor_level: 99, is_admin: 'yes' });
  assert.equal(e.accessTier, 'basic');
  assert.equal(e.donorLevel, 7);
  assert.equal(e.isAdmin, false);
  const f = parseEntitlement({ access_tier: 'full', is_lifetime: true, lifetime_title: 'Eien', donor_level: 3, donor_title: 'Take' });
  assert.equal(f.accessTier, 'full');
  assert.equal(f.isLifetime, true);
  assert.equal(f.lifetimeTitle, 'Eien');
  assert.equal(f.donorTitle, 'Take');
});

test('cache entitlement: user lain atau lebih dari 7 hari → Basic', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  const ent = parseEntitlement({ access_tier: 'medium', access_expires_at: '2026-12-01T00:00:00Z' });
  const cached = { userId: 'u1', fetchedAt: now - 1000, entitlement: ent };
  assert.equal(entitlementFromCache(cached, 'u1', now).accessTier, 'medium');
  assert.equal(entitlementFromCache(cached, 'u2', now).accessTier, 'basic');
  assert.equal(entitlementFromCache({ ...cached, fetchedAt: now - ENTITLEMENT_CACHE_MAX_AGE_MS - 1 }, 'u1', now).accessTier, 'basic');
  assert.equal(entitlementFromCache(null, 'u1', now).accessTier, 'basic');
});

test('cache entitlement: lewat masa tenggang saat offline → Basic, lifetime tetap', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  const expired = parseEntitlement({ access_tier: 'full', access_expires_at: '2026-11-05T00:00:00Z' });
  assert.equal(entitlementFromCache({ userId: 'u', fetchedAt: now - 1000, entitlement: expired }, 'u', now).accessTier, 'basic');
  const grace = parseEntitlement({ access_tier: 'full', access_expires_at: '2026-11-08T00:00:00Z' });
  assert.equal(entitlementFromCache({ userId: 'u', fetchedAt: now - 1000, entitlement: grace }, 'u', now).accessTier, 'full');
  const life = parseEntitlement({ access_tier: 'full', is_lifetime: true });
  assert.equal(entitlementFromCache({ userId: 'u', fetchedAt: now - 1000, entitlement: life }, 'u', now).accessTier, 'full');
});

test('daysUntil dan formatIdr', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  assert.equal(daysUntil('2026-11-13T00:00:00Z', now), 3);
  assert.equal(daysUntil(null, now), null);
  assert.equal(formatIdr(14937), 'Rp 14.937');
});
