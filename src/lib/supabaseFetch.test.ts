/**
 * Regresi jalur proxy Supabase (resilientFetch): galat JSON dari Supabase tidak boleh membuat
 * seluruh sesi beralih ke supabase.co (yang diblokir sebagian ISP), sedangkan proxy yang benar-benar
 * rusak tetap harus jatuh ke supabase.co.
 *
 * Catatan: `proxyBroken` adalah state modul. Kasus yang memicu fallback dijalankan terakhir
 * (urutan `it` dijalankan berurutan) agar kasus "proxy sehat" tidak terpengaruh.
 */
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { resilientFetch as ResilientFetch, isProxyFailureResponse as IsProxyFailure } from './supabase';

const PROXY = 'https://sevnquest.test/supabase-proxy/rest/v1/letters?select=id';
const DIRECT = 'https://iokhdhqnpslpwsxspvaj.supabase.co/rest/v1/letters?select=id';

let resilientFetch: typeof ResilientFetch;
let isProxyFailureResponse: typeof IsProxyFailure;
let replies: Response[] = [];
let calls: string[] = [];

before(async () => {
  ({ resilientFetch, isProxyFailureResponse } = await import('./supabase'));
});

beforeEach(() => {
  replies = [];
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    const next = replies.shift();
    if (!next) throw new Error('fetch tak terduga: ' + String(input));
    return next;
  }) as typeof fetch;
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('isProxyFailureResponse', () => {
  it('HTML dan galat gateway non-JSON = proxy rusak; JSON (sukses maupun galat) = jawaban Supabase', () => {
    const html = new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });
    const gateway = new Response('Bad gateway', { status: 502, headers: { 'content-type': 'text/plain' } });
    assert.equal(isProxyFailureResponse(html), true);
    assert.equal(isProxyFailureResponse(gateway), true);
    assert.equal(isProxyFailureResponse(json(400, { code: 'P0001' })), false);
    assert.equal(isProxyFailureResponse(json(404, { code: 'PGRST202' })), false);
    assert.equal(isProxyFailureResponse(json(200, [])), false);
  });
});

describe('resilientFetch: pemilihan jalur proxy', () => {
  it('galat JSON PostgREST lewat proxy diteruskan apa adanya dan proxy tetap dipakai', async () => {
    replies = [json(400, { code: 'P0001', message: 'Harus login' }), json(200, [])];
    const res = await resilientFetch(PROXY);
    assert.equal(res.status, 400);
    assert.deepEqual(calls, [PROXY]);

    await resilientFetch(PROXY);
    assert.deepEqual(calls, [PROXY, PROXY], 'galat aplikasi tidak boleh membuat permintaan berikutnya pindah ke supabase.co');
  });

  it('proxy mengembalikan HTML -> ulang ke supabase.co, dan permintaan berikutnya langsung ke sana', async () => {
    replies = [
      new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      json(200, [{ id: 1 }]),
      json(200, [{ id: 2 }]),
    ];
    const res = await resilientFetch(PROXY);
    assert.deepEqual(await res.json(), [{ id: 1 }]);
    assert.deepEqual(calls, [PROXY, DIRECT]);

    await resilientFetch(PROXY);
    assert.deepEqual(calls, [PROXY, DIRECT, DIRECT]);
  });
});
