// Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompanionDoc, explainSelection, resolveSelection, writableChars } from './companion';

const TEXT = '昨日、友達と映画を見に行きました。\n\n日本語を勉強しなければならない。';

test('paragraf dipecah menjadi kalimat dan token yang menutup seluruh teks', () => {
  const doc = buildCompanionDoc(TEXT);
  assert.equal(doc.paragraphs.length, 2);
  assert.equal(doc.sentences.length, 2);
  for (const s of doc.sentences) {
    assert.equal(s.tokens.map(t => t.text).join(''), s.text, 'token harus menutup kalimat tanpa celah');
    for (let i = 1; i < s.tokens.length; i++) assert.equal(s.tokens[i].start, s.tokens[i - 1].end);
  }
});

test('mode Kata: kata terkonjugasi dijelaskan dengan bentuk kamus, bacaan, dan romaji', () => {
  const doc = buildCompanionDoc(TEXT);
  const s = doc.sentences[0];
  const at = s.text.indexOf('友達');
  const sel = resolveSelection(doc, 0, at, 'word')!;
  assert.equal(s.text.slice(sel.start, sel.end), '友達');
  const ex = explainSelection(doc, sel)!;
  assert.equal(ex.reading, 'ともだち');
  assert.equal(ex.romaji, 'tomodachi');
  assert.ok(ex.words[0].meaning.length > 0);
  assert.equal(ex.kanji.length, 2);
  assert.equal(ex.context.role, 'bersama / kutipan');
});

test('mode Kanji: satu huruf + bacaan di dalam kata', () => {
  const doc = buildCompanionDoc(TEXT);
  const s = doc.sentences[1];
  const at = s.text.indexOf('本');
  const sel = resolveSelection(doc, 1, at, 'kanji')!;
  assert.equal(sel.end - sel.start, 1);
  const ex = explainSelection(doc, sel)!;
  assert.equal(ex.kanji[0].char, '本');
  assert.ok(ex.kanji[0].item, 'kanji ada di database');
});

test('mode Frasa: pola tata bahasa didahulukan, lalu unit kata + partikel', () => {
  const doc = buildCompanionDoc(TEXT);
  const s = doc.sentences[1];
  const at = s.text.indexOf('なければ');
  const sel = resolveSelection(doc, 1, at, 'phrase')!;
  const ex = explainSelection(doc, sel)!;
  assert.ok(ex.grammar.some(g => g.matched === 'なければならない'));
  const sel2 = resolveSelection(doc, 1, 0, 'phrase')!;
  assert.equal(s.text.slice(sel2.start, sel2.end), '日本語を');
  const ex2 = explainSelection(doc, sel2)!;
  assert.ok(ex2.particles.some(p => p.particle === 'を' && p.marks === '日本語'));
  assert.equal(ex2.reading, 'にほんごを');
  assert.equal(ex2.romaji, 'nihongo o', 'romaji per token, partikel を dibaca o');
});

test('tanda baca tidak bisa dipilih; huruf tulisan unik', () => {
  const doc = buildCompanionDoc(TEXT);
  assert.equal(resolveSelection(doc, 0, doc.sentences[0].text.indexOf('、'), 'word'), null);
  assert.deepEqual(writableChars('見に見る。'), ['見', 'に', 'る']);
});

test('kata kerja terkonjugasi menyebut perubahan bentuk', () => {
  const doc = buildCompanionDoc('毎日本を読みました。');
  const s = doc.sentences[0];
  const tok = s.tokens.find(t => t.word && t.word.inflected);
  assert.ok(tok, 'ada kata terkonjugasi');
  const ex = explainSelection(doc, { si: 0, start: tok!.start, end: tok!.end, mode: 'word' })!;
  assert.ok(ex.words[0].inflection);
  assert.ok(/^[ぁ-ゖ]+$/.test(ex.words[0].reading), ex.words[0].reading);
});

test('paragraf kurasi: 7 per level, tiap kalimat berterjemahan dan terbaca utuh', async () => {
  const { COMPANION_TEXTS } = await import('../../data/writingCompanionTexts');
  const { normSentence } = await import('../dokkaiStudy/text');
  for (const lv of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    assert.equal(COMPANION_TEXTS.filter(t => t.level === lv).length, 7, lv);
  }
  assert.equal(new Set(COMPANION_TEXTS.map(t => t.id)).size, COMPANION_TEXTS.length, 'id unik');
  for (const t of COMPANION_TEXTS) {
    const translations: Record<string, string> = {};
    for (const [jp, id] of t.sentences) {
      assert.ok(/[。？！]$/.test(jp), `${t.id}: ${jp}`);
      assert.ok(id.trim().length > 3, `${t.id}: terjemahan kosong`);
      translations[normSentence(jp)] = id;
    }
    const doc = buildCompanionDoc(t.sentences.map(([jp]) => jp).join(''), translations);
    assert.equal(doc.sentences.length, t.sentences.length, `${t.id}: jumlah kalimat`);
    for (const s of doc.sentences) assert.ok(s.translation, `${t.id}: terjemahan tidak tersambung untuk ${s.text}`);
  }
});
