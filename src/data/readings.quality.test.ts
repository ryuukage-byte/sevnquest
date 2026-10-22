// Gerbang kualitas data: bacaan (furigana) harus selaras persis dengan teksnya. Bacaan yang salah ketik
// membuat furigana dan suara TTS berbeda dari tulisan.
import test from 'node:test';
import assert from 'node:assert/strict';
import kotobaJson from './db/kotoba.json';
import bunpouJson from './db/bunpou.json';
import { alignFurigana } from '../utils/furiganaUtils';

type Pair = { where: string; text: string; reading: string };

function collect(): Pair[] {
  const pairs: Pair[] = [];
  const add = (where: string, text?: string, reading?: string) => {
    const t = (text ?? '').trim();
    const r = (reading ?? '').trim();
    if (t && r && t !== r) pairs.push({ where, text: t, reading: r });
  };
  for (const [id, k] of Object.entries(kotobaJson as Record<string, { word?: string; reading?: string; exampleSentence?: { japanese?: string; reading?: string } }>)) {
    add(`kotoba ${id} (kata)`, k.word, k.reading);
    add(`kotoba ${id} (contoh)`, k.exampleSentence?.japanese, k.exampleSentence?.reading);
  }
  for (const b of bunpouJson as { id: string; examples?: { jp?: string; reading?: string }[] }[]) {
    (b.examples || []).forEach((ex, i) => add(`bunpou ${b.id} #${i}`, ex.jp, ex.reading));
  }
  return pairs;
}

// Entri yang bacaannya memang bukan bacaan tulisan itu (kata berbeda / gaya lama), dicatat agar tidak diam-diam bertambah.
const KNOWN_EXCEPTIONS = new Set<string>([
  'kotoba kotoba_n1_0041 (kata)', // 恐ろしい ↔ おっかない (sinonim, bukan bacaan)
  'kotoba kotoba_n2_0002 (kata)', // アイデア/アイディア
  'kotoba kotoba_n1_0005 (kata)', // 呆気なく / あっさり
  'kotoba kotoba_0549 (kata)', // 見る / 観る
  'kotoba kotoba_0609 (kata)', // 伯母さん / 叔母さん
]);

test('data: setiap bacaan kalimat contoh & kata selaras persis dengan tulisannya', () => {
  const bad: string[] = [];
  for (const p of collect()) {
    if (KNOWN_EXCEPTIONS.has(p.where)) continue;
    const a = alignFurigana(p.text, p.reading);
    const hasReadingChars = /[㐀-鿿豈-﫿々〇0-9０-９A-Za-z]/.test(p.text);
    if (hasReadingChars && (!a.aligned || a.mismatches > 0)) bad.push(`${p.where}: ${p.text} ← ${p.reading}`);
  }
  assert.deepEqual(bad, [], `Bacaan tidak cocok dengan tulisan (perbaiki di db/*.json):\n${bad.slice(0, 20).join('\n')}`);
});
