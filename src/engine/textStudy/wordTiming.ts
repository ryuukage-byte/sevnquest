// ==============================================================================
// WORD TIMING
// Waktu per kata untuk sorotan "karaoke". Sumber utama: caption otomatis YouTube (tiap segmen
// membawa tOffsetMs). Untuk baris tanpa waktu kata (caption manual) dibuat PERKIRAAN: durasi baris
// dibagi menurut jumlah mora tiap potongan teks.
// ==============================================================================

export interface TimedWord {
  text: string;
  startMs: number;
  endMs: number;
}

interface TimedLine {
  text: string;
  startMs: number;
  endMs: number;
  words?: TimedWord[];
}

const PUNCT_ONLY = /^[\s、。，．！？!?「」『』（）()［］\[\]【】…・～〜\-―:：;；,."'“”]+$/;
const CHUNK_RE = /[一-龯㐀-䶿々]+[ぁ-ゟ]*|[ぁ-ゟ]+|[ァ-ヿー]+|[A-Za-z0-9]+|\s+|./gu;
const SMALL_KANA = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;
const KANJI = /[一-龯㐀-䶿々]/;
const MIN_LINE_MS = 500;
const MS_PER_CHAR_FALLBACK = 200;

/** Perkiraan jumlah mora: kanji ≈ 2, kana kecil (ゃゅょ…) 0, lainnya 1, tanda baca 0. */
function moraWeight(chunk: string): number {
  let w = 0;
  for (const ch of chunk) {
    if (PUNCT_ONLY.test(ch)) continue;
    if (KANJI.test(ch)) w += 2;
    else if (SMALL_KANA.test(ch)) continue;
    else w += 1;
  }
  return w;
}

/** Pecah teks jadi potongan kasar (kanji+okurigana / hiragana / katakana / alfanumerik); tanda baca menempel ke potongan sebelumnya. */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let pending = '';
  for (const piece of text.match(CHUNK_RE) ?? []) {
    if (PUNCT_ONLY.test(piece)) {
      if (chunks.length > 0) chunks[chunks.length - 1] += piece;
      else pending += piece;
    } else {
      chunks.push(pending + piece);
      pending = '';
    }
  }
  if (pending) chunks.push(pending);
  return chunks;
}

/** Bagi [startMs, endMs] ke potongan teks menurut bobot mora. Potongan saling menyambung tanpa celah. */
export function estimateWordTimings(text: string, startMs: number, endMs: number): TimedWord[] {
  const chunks = chunkText(text);
  if (chunks.length === 0) return [];

  const total = Math.max(endMs - startMs, 0) || Math.max(MIN_LINE_MS, text.length * MS_PER_CHAR_FALLBACK);
  const weights = chunks.map(c => Math.max(moraWeight(c), 0.5));
  const sum = weights.reduce((a, b) => a + b, 0);

  let cursor = startMs;
  return chunks.map((chunk, i) => {
    const start = Math.round(cursor);
    cursor += (weights[i] / sum) * total;
    return { text: chunk, startMs: start, endMs: i === chunks.length - 1 ? Math.round(startMs + total) : Math.round(cursor) };
  });
}

/** Kata berwaktu untuk sebuah baris: dari sumber bila ada, kalau tidak diperkirakan. */
export function wordsForLine(line: TimedLine): { words: TimedWord[]; estimated: boolean } {
  if (line.words && line.words.length > 0) return { words: line.words, estimated: false };
  return { words: estimateWordTimings(line.text, line.startMs, line.endMs), estimated: true };
}

/**
 * Posisi sorotan pada `ms`: -1 sebelum kata pertama; indeks kata yang sedang diucapkan;
 * `words.length` setelah kata terakhir selesai (seluruh baris sudah lewat).
 */
export function activeWordIndex(words: readonly TimedWord[], ms: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].startMs <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === words.length - 1 && found >= 0 && ms >= words[found].endMs) return words.length;
  return found;
}
