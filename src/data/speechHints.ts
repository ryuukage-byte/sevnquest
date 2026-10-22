/**
 * Petunjuk ucapan TTS untuk pasangan (teks, bacaan) dari data, dihitung saat build (virtual:sevn-speech-hints,
 * lihat scripts/speech/speechHints.ts). Dimuat bersama data lengkap (fullData.ts).
 */
import hints from 'virtual:sevn-speech-hints';
import { KOTOBA_DATABASE } from './kotoba';
import { KANJI_DATABASE } from './kanji';
import { BUNPOU_DATABASE } from './bunpou';
import { isFullDataReady } from './fullData';
import { speechHintKey } from '../utils/speechText';

export const SPEECH_HINTS: Readonly<Record<string, string>> = hints;

// Pasangan yang sudah dinilai saat build. Harus sama dengan collectSpeechPairs di scripts/speech/speechHints.ts.
let knownPairs: Set<string> | null = null;

function addPair(set: Set<string>, text?: string, reading?: string) {
  const t = (text ?? '').trim();
  const r = (reading ?? '').trim();
  if (t && r && t !== r) set.add(speechHintKey(t, r));
}

function buildKnownPairs(): Set<string> {
  const set = new Set<string>();
  for (const k of Object.values(KOTOBA_DATABASE)) {
    addPair(set, k.word, k.reading);
    addPair(set, k.exampleSentence?.japanese, k.exampleSentence?.reading);
  }
  for (const b of Object.values(BUNPOU_DATABASE)) {
    for (const ex of b.examples || []) addPair(set, ex.japanese, ex.reading);
  }
  for (const k of Object.values(KANJI_DATABASE)) {
    for (const rw of k.relatedWords || []) addPair(set, rw.word, rw.reading);
  }
  return set;
}

export function isKnownSpeechPair(text: string, reading: string): boolean {
  if (!knownPairs) {
    const built = buildKnownPairs();
    // Sebelum detail kotoba termuat, contoh kalimat belum ada: jangan simpan himpunan yang belum lengkap.
    if (!isFullDataReady()) return built.has(speechHintKey(text.trim(), reading.trim()));
    knownPairs = built;
  }
  return knownPairs.has(speechHintKey(text.trim(), reading.trim()));
}
