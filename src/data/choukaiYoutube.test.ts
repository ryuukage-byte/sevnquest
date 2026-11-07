import test from 'node:test';
import assert from 'node:assert/strict';
import { CHOUKAI_YOUTUBE, CHOUKAI_LEVELS, CHOUKAI_CATEGORY_LABELS } from './choukaiYoutube.ts';
import { isYouTubeChannelUrl, parseYouTubeId } from '../utils/youtube.ts';

test('isYouTubeChannelUrl: bentuk channel yang sah', () => {
  assert.equal(isYouTubeChannelUrl('https://www.youtube.com/@nihongo_channel'), true);
  assert.equal(isYouTubeChannelUrl('https://www.youtube.com/channel/UC1234567890abcdefghijAB'), true);
  assert.equal(isYouTubeChannelUrl('https://youtube.com/c/SomeName'), true);
  assert.equal(isYouTubeChannelUrl('https://www.youtube.com/user/someone'), true);
});

test('isYouTubeChannelUrl: menolak yang bukan channel', () => {
  assert.equal(isYouTubeChannelUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  assert.equal(isYouTubeChannelUrl('http://www.youtube.com/@nihongo_channel'), false);
  assert.equal(isYouTubeChannelUrl('https://evil.example.com/@nihongo_channel'), false);
  assert.equal(isYouTubeChannelUrl('https://www.youtube.com/channel/bukan-id'), false);
  assert.equal(isYouTubeChannelUrl('bukan url'), false);
});

test('CHOUKAI_YOUTUBE: setiap entri valid', () => {
  const ids = new Set<string>();
  const videoIds = new Set<string>();
  for (const e of CHOUKAI_YOUTUBE) {
    assert.ok(e.id.trim(), 'id kosong');
    assert.ok(!ids.has(e.id), `id ganda: ${e.id}`);
    ids.add(e.id);
    assert.ok(e.title.trim(), `${e.id}: judul kosong`);
    assert.ok(CHOUKAI_LEVELS.includes(e.level), `${e.id}: level tidak dikenal`);
    assert.ok(e.category in CHOUKAI_CATEGORY_LABELS, `${e.id}: kategori tidak dikenal`);
    if (e.kind === 'video') {
      const vid = parseYouTubeId(e.url);
      assert.ok(vid && /^https:\/\//.test(e.url), `${e.id}: URL video YouTube tidak valid`);
      assert.ok(!videoIds.has(vid!), `${e.id}: video ganda`);
      videoIds.add(vid!);
    } else {
      assert.ok(isYouTubeChannelUrl(e.url), `${e.id}: URL channel YouTube tidak valid`);
    }
  }
});
