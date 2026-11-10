import test from 'node:test';
import assert from 'node:assert/strict';
import { isDurationClose, parseQuery, pickRecord, toPayload, type LrclibRecord } from './lyrics';

test('isDurationClose: catatan /get ditolak bila durasinya jauh dari yang diminta', () => {
  assert.equal(isDurationClose({ duration: 212 }, 210), true);
  assert.equal(isDurationClose({ duration: 100 }, 212), false);
  assert.equal(isDurationClose({ duration: 100 }), true); // tanpa durasi yang diminta
  assert.equal(isDurationClose({}, 212), true); // catatan tanpa durasi tidak bisa dinilai
});

test('parseQuery: judul dan artis wajib; album dan durasi opsional', () => {
  assert.deepEqual(parseQuery(new URLSearchParams('title=アイドル&artist=YOASOBI&album=THE+BOOK+3&duration=213.5')), {
    title: 'アイドル',
    artist: 'YOASOBI',
    album: 'THE BOOK 3',
    durationSec: 213.5,
  });
  assert.deepEqual(parseQuery(new URLSearchParams('title=a&artist=b')), { title: 'a', artist: 'b', album: undefined, durationSec: undefined });
});

test('parseQuery: masukan tidak valid ditolak', () => {
  assert.equal(parseQuery(new URLSearchParams('artist=b')), null);
  assert.equal(parseQuery(new URLSearchParams('title=%20%20&artist=b')), null);
  assert.equal(parseQuery(new URLSearchParams('title=a&artist=b&duration=abc')), null);
  assert.equal(parseQuery(new URLSearchParams('title=a&artist=b&duration=-5')), null);
  assert.equal(parseQuery(new URLSearchParams('title=a&artist=b&duration=99999')), null);
});

test('pickRecord: durasi terdekat dipilih', () => {
  const recs: LrclibRecord[] = [
    { trackName: 'x', duration: 180, syncedLyrics: '[00:01.00]a\n[00:02.00]b' },
    { trackName: 'x', duration: 214, syncedLyrics: '[00:01.00]a\n[00:02.00]b' },
  ];
  assert.equal(pickRecord(recs, 213)?.duration, 214);
});

test('pickRecord: lirik berwaktu menang atas lirik biasa hanya bila selisihnya kurang dari 2 detik', () => {
  const plain: LrclibRecord = { duration: 200, plainLyrics: 'baris' };
  // lirik biasa dinilai selisih 0 + 2 = 2; lirik berwaktu selisih 1 menang
  const syncedClose: LrclibRecord = { duration: 201, syncedLyrics: '[00:01.00]a\n[00:02.00]b' };
  assert.equal(pickRecord([plain, syncedClose], 200), syncedClose);
  // selisih 3 kalah dari lirik biasa yang tepat sasaran
  const syncedFar: LrclibRecord = { duration: 203, syncedLyrics: '[00:01.00]a\n[00:02.00]b' };
  assert.equal(pickRecord([plain, syncedFar], 200), plain);
  // lirik biasa dengan durasi persis tetap bisa menang bila tidak ada yang berwaktu
  assert.equal(pickRecord([plain, { duration: 260, plainLyrics: 'lain' }], 200), plain);
});

test('pickRecord: catatan tanpa lirik dibuang; selisih lebih dari 12 detik ditolak', () => {
  assert.equal(pickRecord([{ duration: 200 }], 200), null);
  assert.equal(pickRecord([{ duration: 230, syncedLyrics: '[00:01.00]a\n[00:02.00]b' }], 200), null);
  assert.equal(pickRecord([], 200), null);
});

test('pickRecord: tanpa durasi, catatan pertama yang punya lirik dipilih', () => {
  const first: LrclibRecord = { duration: 100, plainLyrics: 'satu' };
  assert.equal(pickRecord([{ duration: 50 }, first, { duration: 999, plainLyrics: 'dua' }]), first);
});

test('toPayload: lirik berwaktu menjadi status synced dengan baris terurut', () => {
  const p = toPayload({
    trackName: 'アイドル',
    artistName: 'YOASOBI',
    duration: 213,
    syncedLyrics: '[00:10.00]二行目\n[00:05.00]一行目',
    plainLyrics: 'ignored',
  });
  assert.equal(p?.status, 'synced');
  if (p?.status === 'synced') {
    assert.deepEqual(p.lines, [
      { startMs: 5000, text: '一行目' },
      { startMs: 10000, text: '二行目' },
    ]);
    assert.equal(p.track.durationMs, 213000);
    assert.deepEqual(p.source, { name: 'LRCLIB', url: 'https://lrclib.net' });
  }
});

test('toPayload: LRC dengan satu waktu jatuh ke lirik biasa, bukan berwaktu', () => {
  const p = toPayload({ syncedLyrics: '[00:00.00]probe', plainLyrics: 'baris satu\nbaris dua\n\n' });
  assert.equal(p?.status, 'plain');
  if (p?.status === 'plain') assert.deepEqual(p.plainLines, ['baris satu', 'baris dua']);
});

test('toPayload: instrumental, dan catatan kosong menghasilkan null', () => {
  assert.equal(toPayload({ instrumental: true })?.status, 'instrumental');
  assert.equal(toPayload({ plainLyrics: '   \n  ', syncedLyrics: null }), null);
  assert.equal(toPayload({}), null);
});
