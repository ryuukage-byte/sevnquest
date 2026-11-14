// ==============================================================================
// SOAL KANA (Hiragana/Katakana) YANG DIBANGUN DARI DATA
// Huruf kana bukan kanji: tidak punya "arti". Soal untuknya harus menguji bunyi,
// dengan pengecoh dari aksara sejenis (Hiragana dengan Hiragana) dan tanpa bunyi
// kembar (じ/ぢ sama-sama "ji", ず/づ sama-sama "zu").
// Pengecoh dipilih deterministik (seed dari id) agar soal stabil antar-render.
// ==============================================================================

import type { KanjiItem, Question } from '../types/content';
import { hashString, seededShuffle } from '../engine/tower1/jp';
import { pickUniqueDistractors } from './quizOptions';

type KanaLike = Pick<KanjiItem, 'id' | 'character' | 'jlpt' | 'radical' | 'kunyomi' | 'onyomi'>;

export function isKanaItem(item: Partial<KanaLike> | null | undefined): boolean {
  if (!item) return false;
  return item.jlpt === 'KANA' || (item.id || '').startsWith('kana_') || item.radical === 'Hiragana' || item.radical === 'Katakana';
}

export function kanaScript(item: Partial<KanaLike>): 'Hiragana' | 'Katakana' {
  if (item.radical === 'Katakana') return 'Katakana';
  if (item.radical === 'Hiragana') return 'Hiragana';
  const code = (item.character || '').charCodeAt(0);
  return code >= 0x30a0 && code <= 0x30ff ? 'Katakana' : 'Hiragana';
}

/** Bunyi romaji kana, mis. "a", "shi", "ga". */
export function kanaRomaji(item: Partial<KanaLike>): string {
  const raw = item.kunyomi?.[0] || item.onyomi?.[0] || '';
  return raw.split(/[\s(（/]/)[0].trim().toLowerCase();
}

/** Bangun soal pilihan ganda untuk satu huruf kana: aksara → bunyi, dan bunyi → aksara. */
export function buildKanaQuestions(item: KanaLike, pool: KanaLike[]): Question[] {
  const romaji = kanaRomaji(item);
  if (!item.character || !romaji) return [];
  const script = kanaScript(item);
  const sameScript = pool.filter(k => isKanaItem(k) && kanaScript(k) === script && k.character !== item.character && kanaRomaji(k));
  const seed = hashString(item.id || item.character);
  const shuffled = seededShuffle(sameScript, seed);

  const questions: Question[] = [];

  // 1. Melihat aksara → memilih bunyi.
  const wrongSounds = pickUniqueDistractors(romaji, shuffled.map(kanaRomaji), 3);
  if (wrongSounds.length === 3) {
    const options = seededShuffle([romaji, ...wrongSounds], seed + 1);
    questions.push({
      id: `q_${item.id}_gen_read`,
      prompt: `Bagaimana cara membaca huruf ${script} ini: 「${item.character}」?`,
      options,
      correctIndex: options.indexOf(romaji),
      explanation: `Huruf ${script} 「${item.character}」 dibaca "${romaji}".`,
      category: 'kanji',
      difficulty: 'KANA',
    });
  }

  // 2. Bunyi → memilih aksara. Pengecoh tidak boleh sebunyi dengan jawaban (じ vs ぢ).
  const wrongGlyphs: string[] = [];
  const usedSounds = new Set([romaji]);
  for (const k of shuffled) {
    const r = kanaRomaji(k);
    if (usedSounds.has(r) || wrongGlyphs.includes(k.character)) continue;
    usedSounds.add(r);
    wrongGlyphs.push(k.character);
    if (wrongGlyphs.length === 3) break;
  }
  if (wrongGlyphs.length === 3) {
    const options = seededShuffle([item.character, ...wrongGlyphs], seed + 2);
    questions.push({
      id: `q_${item.id}_gen_pick`,
      prompt: `Huruf ${script} manakah yang dibaca "${romaji}"?`,
      options,
      correctIndex: options.indexOf(item.character),
      explanation: `Bunyi "${romaji}" ditulis 「${item.character}」 dalam ${script}.`,
      category: 'kanji',
      difficulty: 'KANA',
    });
  }

  return questions;
}
