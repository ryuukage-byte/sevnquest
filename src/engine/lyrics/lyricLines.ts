// ==============================================================================
// LYRIC LINES
// Menyiapkan lirik LRC untuk pemutar: baris kosong dibuang (jeda tetap terlihat dari akhir baris sebelumnya),
// dan baris yang berwaktu sama digabung. LRCLIB sering menyimpan lirik Jepang dan romajinya di waktu yang sama;
// yang dipakai adalah baris yang mengandung kana atau kanji, karena itu yang dipelajari.
// ==============================================================================

import { withEndTimes, type TimedLine } from './lrc';

export interface SungLine {
  startMs: number;
  endMs: number;
  text: string;
}

/** Hiragana, katakana, katakana setengah lebar, dan kanji (termasuk Extension A). */
const JAPANESE_RE = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/;

export function hasJapanese(text: string): boolean {
  return JAPANESE_RE.test(text);
}

/**
 * Baris berwaktu untuk pemutar. Input harus sudah terurut menurut waktu (parseLrc menjamin itu).
 * Dari setiap waktu yang sama, dipilih baris Jepang bila ada, kalau tidak baris pertama.
 */
export function toSungLines(lines: readonly TimedLine[], durationMs?: number): SungLine[] {
  const deduped: TimedLine[] = [];
  for (const line of lines) {
    if (line.text.trim() === '') continue;
    const last = deduped[deduped.length - 1];
    if (last && last.startMs === line.startMs) {
      // Waktu sama: ganti hanya bila yang pertama bukan Jepang dan yang ini Jepang.
      if (!hasJapanese(last.text) && hasJapanese(line.text)) deduped[deduped.length - 1] = line;
      continue;
    }
    deduped.push(line);
  }
  return withEndTimes(deduped, durationMs);
}
