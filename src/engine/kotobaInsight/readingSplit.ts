// Pemecah cara baca per kanji untuk "Pemahaman Kotoba".
// Contoh: 安心 + あんしん → 安=あん (on), 心=しん (on).
// Perubahan bunyi yang lazim di kata majemuk ikut dikenali: rendaku (こころ → ごころ),
// sokuon (がく → がっ di 学校) dan handakuten (はい → ぱい di 心配 bila ada).

export type ReadingType = 'on' | 'kun' | 'irregular';

export interface KanjiReadingSource {
  onyomi: string[];
  kunyomi: string[];
}

export interface ReadingPart {
  /** Potongan teks kata: satu kanji, atau deretan kana. */
  text: string;
  /** Bacaan potongan ini (hiragana). */
  reading: string;
  isKanji: boolean;
  /** Jenis bacaan kanji. 'irregular' = 熟字訓 / tidak terurai (mis. 今日 → きょう). */
  readingType?: ReadingType;
  /** Bentuk dasar bacaan sebelum perubahan bunyi (mis. ごころ → こころ). */
  baseReading?: string;
  /** Kana pengiring bacaan kun (送り仮名), mis. 食 + べる. */
  okurigana?: string;
}

export interface ReadingSplit {
  parts: ReadingPart[];
  /** true bila setiap kanji berhasil dipasangkan dengan bacaannya sendiri. */
  aligned: boolean;
}

export const isKanjiChar = (ch: string): boolean => /[㐀-䶿一-鿿豈-﫿々〆]/.test(ch);

/** Tombol "Pemahaman Kotoba" hanya muncul untuk kata yang memuat kanji. Sengaja di file ringan ini agar
 *  UI daftar tidak ikut memuat data kurasi yang besar. */
export function hasKotobaInsight(item: { word?: string }): boolean {
  return Array.from(item.word || '').some(c => isKanjiChar(c) && c !== '々');
}

export const toHiragana = (s: string): string =>
  s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

const VOICED: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'じ', つ: 'ず', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};
const SEMI_VOICED: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };

interface ReadingCandidate {
  reading: string;
  base: string;
  type: 'on' | 'kun';
  okurigana?: string;
  /** Semakin kecil semakin wajar (bacaan apa adanya = 0). */
  cost: number;
}

/** Normalisasi satu entri bacaan dari database kanji: "シュウ (SHUU)", "やす.い", "-ごころ". */
function normalizeEntry(raw: string): { stem: string; okurigana?: string } | null {
  const cleaned = toHiragana(raw.replace(/[（(].*?[)）]/g, '').replace(/[-－\s]/g, '').trim());
  if (!cleaned || !/^[ぁ-ゖー.]+$/.test(cleaned)) return null;
  const [stem, okurigana] = cleaned.split('.');
  if (!stem) return null;
  return { stem, okurigana: okurigana || undefined };
}

function variantsOf(base: string, type: 'on' | 'kun', okurigana?: string): ReadingCandidate[] {
  const out: ReadingCandidate[] = [{ reading: base, base, type, okurigana, cost: 0 }];
  const first = base[0];
  if (VOICED[first]) out.push({ reading: VOICED[first] + base.slice(1), base, type, okurigana, cost: 1 });
  if (SEMI_VOICED[first]) out.push({ reading: SEMI_VOICED[first] + base.slice(1), base, type, okurigana, cost: 1 });
  const last = base[base.length - 1];
  if (base.length >= 2 && 'つちくきう'.includes(last)) {
    out.push({ reading: base.slice(0, -1) + 'っ', base, type, okurigana, cost: 1 });
    if (VOICED[first]) out.push({ reading: VOICED[first] + base.slice(1, -1) + 'っ', base, type, okurigana, cost: 2 });
  }
  return out;
}

const candidateCache = new Map<string, ReadingCandidate[]>();

function candidatesFor(char: string, source: KanjiReadingSource | undefined): ReadingCandidate[] {
  const cached = candidateCache.get(char);
  if (cached) return cached;
  const list: ReadingCandidate[] = [];
  const seen = new Set<string>();
  const push = (raws: string[], type: 'on' | 'kun') => {
    for (const raw of raws) {
      const n = normalizeEntry(raw);
      if (!n) continue;
      for (const c of variantsOf(n.stem, type, n.okurigana)) {
        const key = `${c.reading}|${c.type}|${c.okurigana ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(c);
      }
    }
  };
  push(source?.onyomi ?? [], 'on');
  push(source?.kunyomi ?? [], 'kun');
  candidateCache.set(char, list);
  return list;
}

/**
 * Pecah bacaan kata menjadi bacaan per kanji.
 * Bila tidak terurai (熟字訓 seperti 今日・大人), deretan kanji itu ditandai 'irregular'
 * dan menerima seluruh bacaannya sebagai satu kesatuan.
 */
export function splitWordReading(
  word: string,
  reading: string,
  lookup: (char: string) => KanjiReadingSource | undefined,
): ReadingSplit {
  const chars = Array.from(word);
  let target = toHiragana(reading.split(/\s*[/／]\s*/)[0] ?? '').replace(/\s/g, '');
  // Beberapa entri menyimpan bacaan verba-する walau kata tertulis tanpa する (mis. 勉強 / べんきょうする).
  if (target.endsWith('する') && !word.endsWith('する')) target = target.slice(0, -2);

  type Step = { part: ReadingPart; next: number; cost: number };
  const memo = new Map<string, { parts: ReadingPart[]; cost: number } | null>();

  // Paling banyak satu kanji boleh berbacaan khusus (mis. 日 = に dalam 日本); lebih dari itu → 熟字訓.
  const solve = (ci: number, ri: number, irregularUsed: boolean): { parts: ReadingPart[]; cost: number } | null => {
    if (ci === chars.length) return ri === target.length ? { parts: [], cost: 0 } : null;
    const key = `${ci}:${ri}:${irregularUsed ? 1 : 0}`;
    if (memo.has(key)) return memo.get(key)!;

    const ch = chars[ci];
    const steps: Step[] = [];

    if (!isKanjiChar(ch)) {
      const kana = toHiragana(ch);
      if (target[ri] === kana || (ch === 'ー' && ri < target.length)) {
        steps.push({ part: { text: ch, reading: target[ri], isKanji: false }, next: ri + 1, cost: 0 });
      }
    } else {
      const prevChar = ci > 0 ? chars[ci - 1] : undefined;
      const sourceChar = ch === '々' && prevChar ? prevChar : ch;
      for (const c of candidatesFor(sourceChar, lookup(sourceChar))) {
        if (!target.startsWith(c.reading, ri)) continue;
        // Bacaan kun diharapkan diikuti okurigana-nya bila kata memang menulisnya.
        const after = chars.slice(ci + 1).join('');
        let okuriCost = 0;
        let okurigana: string | undefined;
        if (c.type === 'kun' && c.okurigana) {
          const okuri = c.okurigana;
          if (toHiragana(after).startsWith(okuri)) okurigana = okuri;
          else if (toHiragana(after).startsWith(okuri[0])) okurigana = undefined; // konjugasi (食べ-ます)
          else okuriCost = 1; // dipakai tanpa okurigana (mis. 話 dalam 話し合い → はなし)
        }
        steps.push({
          part: {
            text: ch,
            reading: c.reading,
            isKanji: true,
            readingType: c.type,
            baseReading: c.base !== c.reading ? c.base : undefined,
            okurigana,
          },
          next: ri + c.reading.length,
          cost: c.cost + okuriCost + (c.type === 'kun' ? 0.5 : 0),
        });
      }
      const multiKanji = chars.filter(isKanjiChar).length > 1;
      if (!irregularUsed && multiKanji) {
        for (let len = 1; len <= 3 && ri + len <= target.length; len++) {
          steps.push({
            part: { text: ch, reading: target.slice(ri, ri + len), isKanji: true, readingType: 'irregular' },
            next: ri + len,
            cost: 6,
          });
        }
      }
    }

    let best: { parts: ReadingPart[]; cost: number } | null = null;
    for (const s of steps) {
      const rest = solve(ci + 1, s.next, irregularUsed || s.part.readingType === 'irregular');
      if (!rest) continue;
      const total = s.cost + rest.cost;
      if (!best || total < best.cost) best = { parts: [s.part, ...rest.parts], cost: total };
    }
    memo.set(key, best);
    return best;
  };

  const solved = solve(0, 0, false);
  const kanjiParts = solved?.parts.filter(p => p.isKanji) ?? [];
  // Bila semua kanji kecuali satu tak terbaca normal di kata 2-kanji, anggap saja 熟字訓.
  const tooIrregular = kanjiParts.length === 2 && kanjiParts.some(p => p.readingType === 'irregular');
  if (solved && !tooIrregular) {
    return { parts: mergeKana(solved.parts), aligned: !kanjiParts.some(p => p.readingType === 'irregular') };
  }
  return { parts: fallbackSplit(chars, target), aligned: false };
}

/** Gabungkan kana yang berurutan (べ + る → べる) supaya tampil sebagai satu potongan. */
function mergeKana(parts: ReadingPart[]): ReadingPart[] {
  const out: ReadingPart[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (!p.isKanji && last && !last.isKanji) {
      out[out.length - 1] = { ...last, text: last.text + p.text, reading: last.reading + p.reading };
    } else {
      out.push(p);
    }
  }
  return out;
}

/** Kana di luar kanji dicocokkan dari kedua ujung; sisa bacaan diberikan ke deretan kanji. */
function fallbackSplit(chars: string[], target: string): ReadingPart[] {
  let start = 0;
  let end = chars.length;
  let rs = 0;
  let re = target.length;
  const head: ReadingPart[] = [];
  const tail: ReadingPart[] = [];
  while (start < end && !isKanjiChar(chars[start]) && toHiragana(chars[start]) === target[rs]) {
    head.push({ text: chars[start], reading: target[rs], isKanji: false });
    start++;
    rs++;
  }
  while (end > start && !isKanjiChar(chars[end - 1]) && toHiragana(chars[end - 1]) === target[re - 1]) {
    tail.unshift({ text: chars[end - 1], reading: target[re - 1], isKanji: false });
    end--;
    re--;
  }
  const middle = chars.slice(start, end).join('');
  const middleParts: ReadingPart[] = middle
    ? [{ text: middle, reading: target.slice(rs, re), isKanji: true, readingType: 'irregular' }]
    : [];
  return mergeKana([...head, ...middleParts, ...tail]);
}
