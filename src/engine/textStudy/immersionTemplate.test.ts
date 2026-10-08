import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImmersionPrompt, parseImmersionTemplate, mergeWordTimings, TEMPLATE_SCHEMA } from './immersionTemplate';

const ID = 'ZRtdQ81jPUQ';
const lines = [
  { startMs: 640, endMs: 4900, text: '無敵の笑顔出すメディア', words: [{ text: '無敵', startMs: 640, endMs: 1240 }] },
  { startMs: 5000, endMs: 9000, text: '見せてリア抜けてる' },
];

test('buildImmersionPrompt: dengan baris -> waktu dikunci, data baris ikut, tanpa waktu kata', () => {
  const p = buildImmersionPrompt(ID, lines);
  assert.ok(p.includes(`https://www.youtube.com/watch?v=${ID}`));
  assert.ok(p.includes('PERSIS'));
  assert.ok(p.includes(TEMPLATE_SCHEMA));
  assert.ok(p.includes('"startMs":640,"endMs":4900,"text":"無敵の笑顔出すメディア"'));
  assert.ok(!p.slice(p.indexOf('DATA BARIS')).includes('"words"')); // waktu per kata tidak dikirim (terlalu panjang)
});

test('buildImmersionPrompt: tanpa baris -> melarang mengarang', () => {
  const p = buildImmersionPrompt(ID);
  assert.ok(p.includes('JANGAN mengarang'));
  assert.ok(!p.includes('DATA BARIS'));
});

test('buildImmersionPrompt: video panjang dibatasi', () => {
  const many = Array.from({ length: 500 }, (_, i) => ({ startMs: i * 1000, endMs: i * 1000 + 900, text: `行${i}` }));
  const p = buildImmersionPrompt(ID, many);
  assert.ok(p.includes('hanya 400 baris pertama'));
  assert.ok(p.includes('行399') && !p.includes('行400'));
});

test('parseImmersionTemplate: balasan AI dengan pagar kode dan kalimat pembuka', () => {
  const reply = 'Tentu! Ini hasilnya:\n```json\n' + JSON.stringify({
    schema: TEMPLATE_SCHEMA, videoId: ID, title: 'アイドル',
    lines: [
      { startMs: 5000, endMs: 9000, text: '見せてリア抜けてる', translation: 'Tunjukkan…' },
      { startMs: 640, endMs: 4900, text: '無敵の笑顔で荒らすメディア', translation: 'Media yang dikacaukan senyum tak terkalahkan' },
    ],
  }) + '\n```\nSemoga membantu.';
  const r = parseImmersionTemplate(reply);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.template.videoId, ID);
  assert.deepEqual(r.template.lines.map(l => l.startMs), [640, 5000]); // diurutkan
  assert.equal(r.template.lines[0].translation, 'Media yang dikacaukan senyum tak terkalahkan');
});

test('parseImmersionTemplate: baris rusak dibuang, endMs dilengkapi, videoId cadangan dipakai', () => {
  const r = parseImmersionTemplate(JSON.stringify({
    lines: [
      { startMs: 1000, text: 'あ' },
      { startMs: 2000, endMs: 1000, text: 'い' }, // endMs <= start -> dilengkapi
      { startMs: 'x', text: 'rusak' },
      { text: 'tanpa waktu' },
      'bukan objek',
    ],
  }), ID);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.dropped, 3);
  assert.equal(r.template.videoId, ID);
  assert.equal(r.template.lines[0].endMs, 2000); // sampai awal baris berikut
  assert.equal(r.template.lines[1].endMs, 5000); // baris terakhir: +3000ms
});

test('parseImmersionTemplate: tolak masukan tidak valid', () => {
  assert.equal(parseImmersionTemplate('halo').ok, false);
  assert.equal(parseImmersionTemplate('{"lines": []}', ID).ok, false);
  assert.equal(parseImmersionTemplate('{"lines":[{"startMs":0,"text":"あ"}]}').ok, false); // tanpa videoId
  assert.equal(parseImmersionTemplate('{"videoId":"pendek","lines":[{"startMs":0,"text":"あ"}]}').ok, false);
  assert.equal(parseImmersionTemplate('[1,2,3]', ID).ok, false);
});

test('parseImmersionTemplate: teks dibersihkan dan dibatasi', () => {
  const r = parseImmersionTemplate(JSON.stringify({ videoId: ID, lines: [{ startMs: 0, text: 'あ\u0000\n\n い' + 'x'.repeat(1000), translation: '<b>x</b>' }] }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.template.lines[0].text.length <= 300);
  assert.ok(!/[\u0000-\u001f]/.test(r.template.lines[0].text));
  assert.equal(r.template.lines[0].translation, '<b>x</b>'); // tidak dieksekusi: hanya dirender sebagai teks oleh React
});

test('mergeWordTimings: waktu kata dipulihkan hanya bila teks dan waktu mulai sama', () => {
  const tpl = {
    videoId: ID,
    lines: [
      { startMs: 650, endMs: 4900, text: '無敵の笑顔出すメディア' }, // sama (selisih 10ms)
      { startMs: 5000, endMs: 9000, text: '見せてリア抜けている' }, // teks diubah AI
    ],
  };
  const merged = mergeWordTimings(tpl, [lines[0], { ...lines[1], words: [{ text: 'x', startMs: 5000, endMs: 5100 }] }]);
  assert.equal(merged.lines[0].words?.length, 1);
  assert.equal(merged.lines[1].words, undefined);
});
