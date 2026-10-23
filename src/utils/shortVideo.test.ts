import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShortVideoUrl } from './shortVideo.ts';

test('parseShortVideoUrl: TikTok', () => {
  const v = parseShortVideoUrl('https://www.tiktok.com/@belajarjepang/video/7301234567890123456?lang=id');
  assert.equal(v?.platform, 'tiktok');
  assert.equal(v?.embedUrl, 'https://www.tiktok.com/embed/v2/7301234567890123456');
  assert.equal(parseShortVideoUrl('tiktok.com/@a/video/123')?.embedUrl, 'https://www.tiktok.com/embed/v2/123');
});

test('parseShortVideoUrl: TikTok ditolak jika bukan halaman video', () => {
  assert.equal(parseShortVideoUrl('https://www.tiktok.com/@belajarjepang'), null);
  assert.equal(parseShortVideoUrl('https://www.tiktok.com/12345'), null);
  assert.equal(parseShortVideoUrl('https://www.tiktok.com/@a/video/abc'), null);
});

test('parseShortVideoUrl: Instagram Reels', () => {
  const reel = parseShortVideoUrl('https://www.instagram.com/reel/C9xYz_12-ab/?igsh=abc');
  assert.equal(reel?.platform, 'instagram');
  assert.equal(reel?.embedUrl, 'https://www.instagram.com/reel/C9xYz_12-ab/embed/');

  assert.equal(parseShortVideoUrl('instagram.com/reels/C9xYz')?.embedUrl, 'https://www.instagram.com/reel/C9xYz/embed/');
  assert.equal(parseShortVideoUrl('https://instagram.com/p/C9xYz/')?.embedUrl, 'https://www.instagram.com/p/C9xYz/embed/');
  assert.equal(parseShortVideoUrl('https://www.instagram.com/someuser/'), null);
});

test('parseShortVideoUrl: YouTube Shorts dan watch', () => {
  const ID = 'dQw4w9WgXcQ';
  const short = parseShortVideoUrl(`https://www.youtube.com/shorts/${ID}`);
  assert.equal(short?.platform, 'youtube');
  assert.equal(short?.embedUrl, `https://www.youtube-nocookie.com/embed/${ID}`);
  assert.equal(parseShortVideoUrl(`https://youtu.be/${ID}`)?.embedUrl, `https://www.youtube-nocookie.com/embed/${ID}`);
});

test('parseShortVideoUrl: input tidak dikenali', () => {
  assert.equal(parseShortVideoUrl(''), null);
  assert.equal(parseShortVideoUrl('   '), null);
  assert.equal(parseShortVideoUrl('https://example.com/video/123'), null);
  assert.equal(parseShortVideoUrl('bukan url sama sekali'), null);
});
