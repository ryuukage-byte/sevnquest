import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAccess } from './_entitlement';

function fakeFetch(status: number, body: unknown, seen?: { url?: string; auth?: string }) {
  return (async (url: string, init?: RequestInit) => {
    if (seen) {
      seen.url = String(url);
      seen.auth = (init?.headers as Record<string, string>)?.Authorization;
    }
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
}

test('tanpa token → 401', async () => {
  const r = await checkAccess(undefined, 'deckAi', {}, fakeFetch(200, { allowed: true }));
  assert.deepEqual(r, { ok: false, status: 401, error: 'login_required' });
  const r2 = await checkAccess('Basic abc', 'immersion', {}, fakeFetch(200, { access_tier: 'full' }));
  assert.equal(r2.ok, false);
});

test('Deck AI: memanggil consume_ai_quota dengan JWT pengguna', async () => {
  const seen: { url?: string; auth?: string } = {};
  const r = await checkAccess('Bearer tok.en.x', 'deckAi', { SUPABASE_URL: 'https://x.supabase.co/' }, fakeFetch(200, { allowed: true }, seen));
  assert.deepEqual(r, { ok: true });
  assert.equal(seen.url, 'https://x.supabase.co/rest/v1/rpc/consume_ai_quota');
  assert.equal(seen.auth, 'Bearer tok.en.x');
});

test('Deck AI: tier kurang → 403, kuota habis → 429', async () => {
  assert.deepEqual(await checkAccess('Bearer t', 'deckAi', {}, fakeFetch(200, { allowed: false, reason: 'tier' })),
    { ok: false, status: 403, error: 'tier_required' });
  assert.deepEqual(await checkAccess('Bearer t', 'deckAi', {}, fakeFetch(200, { allowed: false, reason: 'quota' })),
    { ok: false, status: 429, error: 'daily_quota' });
});

test('Imersi: hanya access_tier full', async () => {
  assert.deepEqual(await checkAccess('Bearer t', 'immersion', {}, fakeFetch(200, { access_tier: 'full' })), { ok: true });
  assert.equal((await checkAccess('Bearer t', 'immersion', {}, fakeFetch(200, { access_tier: 'medium' }))).ok, false);
});

test('JWT kedaluwarsa → 401, server error → 503', async () => {
  assert.equal((await checkAccess('Bearer t', 'immersion', {}, fakeFetch(401, {})) as { status: number }).status, 401);
  assert.equal((await checkAccess('Bearer t', 'deckAi', {}, fakeFetch(500, {})) as { status: number }).status, 503);
  const boom = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
  assert.equal((await checkAccess('Bearer t', 'deckAi', {}, boom) as { status: number }).status, 503);
});

test('checkAccess imersi: saklar monetisasi mati → terbuka walau Basic', async () => {
  const r = await checkAccess('Bearer abc.def.ghi', 'immersion', {}, fakeFetch(200, { access_tier: 'basic', monetization_public: false }));
  assert.deepEqual(r, { ok: true });
  const r2 = await checkAccess('Bearer abc.def.ghi', 'immersion', {}, fakeFetch(200, { access_tier: 'basic', monetization_public: true }));
  assert.equal(r2.ok, false);
});
