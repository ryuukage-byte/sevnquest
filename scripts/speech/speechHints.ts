/**
 * Petunjuk ucapan (dijalankan saat build/dev oleh plugin sevn-speech-hints di vite.config.ts, tidak ke browser).
 *
 * Untuk setiap pasangan (teks, bacaan) di data, kuromoji (penganalisis morfologi ala MeCab, mendekati cara mesin
 * TTS membaca kanji) menentukan unit mana yang akan dibaca berbeda dari furigana data. Hasilnya peta
 * speechHintKey → teks hibrida, hanya untuk pasangan yang berisiko; pasangan lain diucapkan dengan kanji aslinya.
 * Daftar pasangan harus sama dengan src/data/speechHints.ts (sisi runtime).
 */
import fs from 'node:fs';
import path from 'node:path';
import kuromoji from 'kuromoji';
import { buildSpeechHint, speechHintKey } from '../../src/utils/speechText';

export const SPEECH_SOURCE_FILES = ['kotoba.json', 'bunpou.json', 'kanji.json'];

type Pair = [text: string, reading: string];

interface RawKotoba { word?: string; reading?: string; exampleSentence?: { japanese?: string; reading?: string } }
interface RawBunpou { examples?: { jp?: string; reading?: string }[] }
interface RawKanji { relatedWords?: { word?: string; reading?: string }[] }

function pushPair(out: Pair[], text?: string, reading?: string) {
  const t = (text ?? '').trim();
  const r = (reading ?? '').trim();
  // Bentuk/bacaan alternatif ("なん / なに", "丸い / 円い") diucapkan dari bacaannya oleh resolveSpeechText.
  if (t && r && t !== r && !/[/／]/.test(t + r)) out.push([t, r]);
}

export function collectSpeechPairs(dbDir: string): Pair[] {
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dbDir, file), 'utf8'));
  const pairs: Pair[] = [];
  for (const k of Object.values(read('kotoba.json') as Record<string, RawKotoba>)) {
    pushPair(pairs, k.word, k.reading);
    pushPair(pairs, k.exampleSentence?.japanese, k.exampleSentence?.reading);
  }
  for (const b of read('bunpou.json') as RawBunpou[]) {
    for (const ex of b.examples || []) pushPair(pairs, ex.jp, ex.reading);
  }
  const kanji = read('kanji.json') as Record<string, RawKanji> | RawKanji[];
  for (const k of Array.isArray(kanji) ? kanji : Object.values(kanji)) {
    for (const rw of k.relatedWords || []) pushPair(pairs, rw.word, rw.reading);
  }
  return pairs;
}

function buildTokenizer(dicPath: string): Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => (err ? reject(err) : resolve(tokenizer)));
  });
}

export async function buildSpeechHints(dbDir: string, dicPath: string): Promise<Record<string, string>> {
  const tokenizer = await buildTokenizer(dicPath);
  const hints: Record<string, string> = {};
  const seen = new Set<string>();
  for (const [text, reading] of collectSpeechPairs(dbDir)) {
    const key = speechHintKey(text, reading);
    if (seen.has(key)) continue;
    seen.add(key);
    const tokens = tokenizer.tokenize(text).map(t => ({ surface: t.surface_form, reading: t.reading }));
    const hint = buildSpeechHint(text, reading, tokens);
    if (hint && hint !== text) hints[key] = hint;
  }
  return hints;
}
