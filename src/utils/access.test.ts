import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requiredTierForLevel, canAccessLevel, tierAtLeast, requiredTierForTowerFloor,
  parseEntitlement, entitlementFromCache, ENTITLEMENT_CACHE_MAX_AGE_MS, BASIC_ENTITLEMENT, daysUntil, formatIdr,
  badgeForTotal, nextBadge, monthlyRemaining, lifetimeUnitsLeft, DEFAULT_DONATION_CONFIG,
} from './access';

test('level → tier: kana/N5 gratis, selain itu Full', () => {
  assert.equal(requiredTierForLevel('KANA'), 'basic');
  assert.equal(requiredTierForLevel('Katakana'), 'basic');
  assert.equal(requiredTierForLevel('N5'), 'basic');
  assert.equal(requiredTierForLevel('JLPT N5'), 'basic');
  for (const lv of ['N4', 'n3', 'N2', 'N1', 'Kaigo', 'SSW', 'PM', 'JFT', 'ALL', 'all', 'N5_N4', 'N3-N2']) {
    assert.equal(requiredTierForLevel(lv), 'full', lv);
  }
});

test('level tak dikenal/kosong tidak mengunci', () => {
  assert.equal(requiredTierForLevel(undefined), 'basic');
  assert.equal(requiredTierForLevel(''), 'basic');
  assert.equal(requiredTierForLevel('TEMATIK'), 'basic');
});

test('canAccessLevel / tierAtLeast', () => {
  assert.equal(canAccessLevel('basic', 'N5'), true);
  assert.equal(canAccessLevel('basic', 'N4'), false);
  assert.equal(canAccessLevel('full', 'N1'), true);
  assert.equal(tierAtLeast('full', 'medium'), true);
});

test('Tower: lantai 1-60 Basic, 61-100 Full', () => {
  assert.equal(requiredTierForTowerFloor(1), 'basic');
  assert.equal(requiredTierForTowerFloor(60), 'basic');
  assert.equal(requiredTierForTowerFloor(61), 'full');
  assert.equal(requiredTierForTowerFloor(100), 'full');
});

test('parseEntitlement aman terhadap masukan aneh; medium lama dibaca sebagai full', () => {
  assert.deepEqual(parseEntitlement(null), BASIC_ENTITLEMENT);
  const e = parseEntitlement({ access_tier: 'gold', badge_level: 99, is_admin: 'yes', month_total: -5 });
  assert.equal(e.accessTier, 'basic');
  assert.equal(e.badgeLevel, 8);
  assert.equal(e.isAdmin, false);
  assert.equal(e.monthTotal, 0);
  assert.deepEqual(e.config, DEFAULT_DONATION_CONFIG);
  assert.equal(parseEntitlement({ access_tier: 'medium' }).accessTier, 'full');
  const f = parseEntitlement({
    access_tier: 'full', is_lifetime: true, lifetime_total: 700000, badge_level: 8, badge_title: 'Eien',
    month_total: 5000, config: { monthly_threshold: 20000 },
  });
  assert.equal(f.isLifetime, true);
  assert.equal(f.badgeTitle, 'Eien');
  assert.equal(f.config.monthlyThreshold, 20000);
  assert.equal(f.config.lifetimeUnit, 25000);
});

test('cache entitlement: user lain atau lebih dari 7 hari → Basic', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  const ent = parseEntitlement({ access_tier: 'full', access_expires_at: '2026-12-01T00:00:00Z', lifetime_total: 50000 });
  const cached = { userId: 'u1', fetchedAt: now - 1000, entitlement: ent };
  assert.equal(entitlementFromCache(cached, 'u1', now).accessTier, 'full');
  assert.equal(entitlementFromCache(cached, 'u1', now).lifetimeTotal, 50000);
  assert.equal(entitlementFromCache(cached, 'u2', now).accessTier, 'basic');
  assert.equal(entitlementFromCache({ ...cached, fetchedAt: now - ENTITLEMENT_CACHE_MAX_AGE_MS - 1 }, 'u1', now).accessTier, 'basic');
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

test('donasi: kurang Rp X bulan ini, badge, sisa setoran lifetime', () => {
  const base = { config: DEFAULT_DONATION_CONFIG };
  assert.equal(monthlyRemaining({ ...base, monthTotal: 5000, monthUnlocked: false }), 12000);
  assert.equal(monthlyRemaining({ ...base, monthTotal: 20000, monthUnlocked: true }), 0);
  assert.equal(badgeForTotal(0), null);
  assert.equal(badgeForTotal(25000)?.title, 'Sakura');
  assert.equal(badgeForTotal(600000)?.title, 'Fuji');
  assert.equal(badgeForTotal(700000)?.title, 'Eien');
  assert.equal(nextBadge(600000)?.title, 'Eien');
  assert.equal(nextBadge(700000), null);
  assert.equal(lifetimeUnitsLeft({ ...base, lifetimeTotal: 0, isLifetime: false }), 28);
  assert.equal(lifetimeUnitsLeft({ ...base, lifetimeTotal: 675000, isLifetime: false }), 1);
  assert.equal(lifetimeUnitsLeft({ ...base, lifetimeTotal: 700000, isLifetime: true }), 0);
});

test('daysUntil dan formatIdr', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  assert.equal(daysUntil('2026-11-13T00:00:00Z', now), 3);
  assert.equal(daysUntil(null, now), null);
  assert.equal(formatIdr(14937), 'Rp 14.937');
});
