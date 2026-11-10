import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLrclibCaptions, lyricsToCaption } from './lrclibCaptions';

test('lyricsToCaption: lirik berwaktu jadi status ready dengan kind lrclib dan akhir baris', () => {
  const state = lyricsToCaption({
    status: 'synced',
    track: { durationMs: 200000 },
    lines: [
      { startMs: 1000, text: 'Muteki no egao' },
      { startMs: 1000, text: '無敵の笑顔' },
      { startMs: 4000, text: '知りたい' },
    ],
  });
  assert.equal(state.status, 'ready');
  if (state.status === 'ready') {
    assert.equal(state.kind, 'lrclib');
    assert.deepEqual(state.lines, [
      { startMs: 1000, endMs: 4000, text: '無敵の笑顔' },
      { startMs: 4000, endMs: 200000, text: '知りたい' },
    ]);
  }
});

test('lyricsToCaption: lirik biasa dan instrumental menjadi pesan galat yang jelas', () => {
  const plain = lyricsToCaption({ status: 'plain', plainLines: ['baris'] });
  assert.equal(plain.status, 'error');
  const instrumental = lyricsToCaption({ status: 'instrumental' });
  assert.equal(instrumental.status, 'error');
  if (instrumental.status === 'error') assert.match(instrumental.message, /instrumental/);
});

test('lyricsToCaption: lirik berwaktu yang semua barisnya kosong menjadi galat', () => {
  const state = lyricsToCaption({ status: 'synced', track: {}, lines: [{ startMs: 1000, text: '  ' }] });
  assert.equal(state.status, 'error');
});

test('fetchLrclibCaptions: membangun URL dengan parameter dan memetakan respons sukses', async () => {
  const realFetch = globalThis.fetch;
  let requested = '';
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requested = String(input);
    return new Response(
      JSON.stringify({ status: 'synced', track: { durationMs: 213000 }, lines: [{ startMs: 870, text: '無敵の笑顔' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;
  try {
    const state = await fetchLrclibCaptions({ title: 'アイドル', artist: 'YOASOBI', durationSec: 212.6 });
    assert.equal(requested, `/api/lyrics?title=${encodeURIComponent('アイドル')}&artist=YOASOBI&duration=213`);
    assert.equal(state.status, 'ready');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('fetchLrclibCaptions: galat 404 dan 503 dari server diterjemahkan', async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })) as typeof fetch;
    const notFound = await fetchLrclibCaptions({ title: 'x', artist: 'y' });
    assert.equal(notFound.status, 'error');
    if (notFound.status === 'error') assert.match(notFound.message, /tidak ditemukan/);

    globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'busy' }), { status: 503 })) as typeof fetch;
    const busy = await fetchLrclibCaptions({ title: 'x', artist: 'y' });
    if (busy.status === 'error') assert.match(busy.message, /sibuk/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('fetchLrclibCaptions: galat jaringan menjadi pesan, dan pembatalan tetap dilempar', async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const state = await fetchLrclibCaptions({ title: 'x', artist: 'y' });
    assert.equal(state.status, 'error');

    const ctrl = new AbortController();
    ctrl.abort();
    globalThis.fetch = (async () => {
      throw new DOMException('aborted', 'AbortError');
    }) as typeof fetch;
    await assert.rejects(fetchLrclibCaptions({ title: 'x', artist: 'y' }, ctrl.signal));
  } finally {
    globalThis.fetch = realFetch;
  }
});
