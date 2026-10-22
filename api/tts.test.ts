import test from 'node:test';
import assert from 'node:assert/strict';
import { isCrossSite, synthesize } from './tts';

const q = (s: string) => new URLSearchParams(s);
const okFetch = (capture: { url?: string; body?: unknown }) =>
  (async (url: string, init?: RequestInit) => {
    capture.url = String(url);
    capture.body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ audioContent: btoa('ID3fake-mp3') }), { status: 200 });
  }) as unknown as typeof fetch;

test('tts: tanpa kunci → 503 (klien memakai suara perangkat)', async () => {
  const out = await synthesize(q('text=こんにちは'), {});
  assert.equal(out.status, 503);
});

test('tts: probe, validasi teks, dan sintesis suara neural', async () => {
  const env = { TTS_GOOGLE_API_KEY: 'k' };
  assert.equal((await synthesize(q('probe=1'), env)).status, 200);
  assert.equal((await synthesize(q('text=hello world'), env)).status, 400, 'bukan teks Jepang');
  assert.equal((await synthesize(q(`text=${'あ'.repeat(301)}`), env)).status, 400, 'terlalu panjang');

  const cap: { url?: string; body?: any } = {};
  const out = await synthesize(q('text=毎朝コーヒーを飲みます。&voice=male&rate=0.93'), env, okFetch(cap));
  assert.equal(out.status, 200);
  assert.equal(out.headers['Content-Type'], 'audio/mpeg');
  assert.match(out.headers['Cache-Control'], /immutable/);
  assert.equal(new TextDecoder().decode(out.body as Uint8Array), 'ID3fake-mp3');
  assert.equal(cap.body.voice.name, 'ja-JP-Neural2-C');
  assert.equal(cap.body.audioConfig.speakingRate, 0.95, 'kecepatan dibulatkan agar cache CDN efektif');
  assert.equal(cap.body.input.text, '毎朝コーヒーを飲みます。');
});

test('tts: permintaan lintas situs ditolak', () => {
  assert.equal(isCrossSite('cross-site'), true);
  assert.equal(isCrossSite('same-origin'), false);
  assert.equal(isCrossSite(undefined), false);
});
