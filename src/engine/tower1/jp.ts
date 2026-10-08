// ==============================================================================
// TOWER 1 — UTILITAS TEKS JEPANG (ketukan/mora, markup furigana, pemeriksa aksara)
// ==============================================================================

const SMALL_Y = new Set(['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ']);
// Kana kecil katakana asing (ティ, ファ, ジェ...) menempel ke aksara sebelumnya, sama seperti ゃゅょ.
const SMALL_FOREIGN = new Set(['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ']);

/**
 * Memecah kata kana menjadi ketukan (mora): ゃゅょ dan kana kecil menempel pada aksara
 * sebelumnya (きょ = 1 ketukan), sedangkan っ, ん, ー, dan bagian vokal panjang masing-masing 1 ketukan.
 */
export function splitBeats(word: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(word)) {
    if ((SMALL_Y.has(ch) || SMALL_FOREIGN.has(ch)) && out.length > 0) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
  }
  return out;
}

export interface RubyPart {
  base: string;
  ruby?: string;
}

/** Mengurai markup "[漢字|かんじ]" menjadi bagian-bagian teks biasa & furigana. */
export function parseRuby(text: string): RubyPart[] {
  const parts: RubyPart[] = [];
  const re = /\[([^|\]]+)\|([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ base: text.slice(last, m.index) });
    parts.push({ base: m[1], ruby: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ base: text.slice(last) });
  return parts;
}

/** Teks tanpa markup (untuk TTS & pemeriksaan): bagian dasar saja. */
export function stripRuby(text: string): string {
  return parseRuby(text).map(p => p.base).join('');
}

/** Bacaan penuh teks bermarkup: furigana menggantikan kanji dasarnya. */
export function readingOf(text: string): string {
  return parseRuby(text).map(p => p.ruby ?? p.base).join('');
}

/** true bila setiap karakter `text` termasuk dalam `allowed`. Mengembalikan karakter yang melanggar. */
export function offendingChars(text: string, allowed: Set<string>): string[] {
  return Array.from(text).filter(ch => !allowed.has(ch));
}

/** Pengacak deterministik (mulberry32) agar tes & pengecoh stabil. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
