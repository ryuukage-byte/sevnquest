import React from 'react';
import { KanjiItem } from '../types/content';
import { KANJI_DATABASE } from '../data/kanji';
import furiganaDictRaw from '../data/furiganaDictionary.json';

const kataToHira = (str: string) => {
  return str.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
};

const rendakuMap: Record<string, string> = {
  'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
  'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
  'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
  'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
};

const handakutenMap: Record<string, string> = {
  'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
};

const getKanjiStems = (kanji: KanjiItem): string[] => {
  const stems = new Set<string>();
  const addStem = (s?: string) => {
    if (!s) return;
    const h = kataToHira(s);
    stems.add(h);
    // Sokuon change: if stem ends with つ, ち, く, き -> could become っ (e.g. けつ -> けっ in 結婚)
    if (/[つちくき]$/.test(h)) {
      stems.add(h.slice(0, -1) + 'っ');
    }
    // Rendaku change
    const firstChar = h[0];
    if (rendakuMap[firstChar]) {
      const voiced = rendakuMap[firstChar] + h.slice(1);
      stems.add(voiced);
      if (/[つちくき]$/.test(voiced)) {
        stems.add(voiced.slice(0, -1) + 'っ');
      }
    }
    if (handakutenMap[firstChar]) {
      const pSound = handakutenMap[firstChar] + h.slice(1);
      stems.add(pSound);
      if (/[つちくき]$/.test(pSound)) {
        stems.add(pSound.slice(0, -1) + 'っ');
      }
    }
  };

  (kanji?.onyomi || []).forEach(o => {
    const base = o.split(' ')[0].split(/[\.・\-\/]/)[0].trim();
    addStem(base);
  });
  (kanji?.kunyomi || []).forEach(k => {
    const base = k.split(' ')[0].split(/[\.・\-\/]/)[0].trim();
    addStem(base);
  });
  return Array.from(stems).filter(Boolean).sort((a, b) => b.length - a.length);
};

let kanjiReadingsCache: Map<string, string[]> | null = null;

function getKanjiReadingsMap(): Map<string, string[]> {
  if (kanjiReadingsCache) return kanjiReadingsCache;
  kanjiReadingsCache = new Map();
  for (const item of Object.values(KANJI_DATABASE || {})) {
    const char = item?.character;
    if (!char) continue;
    const list: string[] = [];
    const addClean = (r: string) => {
      if (!r) return;
      const clean = r.split(' ')[0].split(/[ (（\.・\-\/]/)[0].trim();
      const h = kataToHira(clean);
      if (h && !list.includes(h)) list.push(h);
    };
    (item.onyomi || []).forEach(addClean);
    (item.kunyomi || []).forEach(addClean);
    kanjiReadingsCache.set(char, list);
  }
  return kanjiReadingsCache;
}

function getCharCandidateReadings(char: string): Set<string> {
  const cands = new Set<string>();
  const rawDict = (furiganaDictRaw as any)?.kanji?.[char];
  if (rawDict) cands.add(kataToHira(rawDict));

  const map = getKanjiReadingsMap();
  const dbReadings = map.get(char);
  if (dbReadings) {
    dbReadings.forEach(r => cands.add(r));
  }

  const expanded = new Set(cands);
  for (const h of cands) {
    if (/[つちくき]$/.test(h)) expanded.add(h.slice(0, -1) + 'っ');
    const f = h[0];
    if (rendakuMap[f]) expanded.add(rendakuMap[f] + h.slice(1));
    if (handakutenMap[f]) expanded.add(handakutenMap[f] + h.slice(1));
    if (/[つちくき]$/.test(h)) {
      if (rendakuMap[f]) expanded.add(rendakuMap[f] + h.slice(1, -1) + 'っ');
      if (handakutenMap[f]) expanded.add(handakutenMap[f] + h.slice(1, -1) + 'っ');
    }
  }
  return expanded;
}

/**
 * Aligns a Japanese word (kanji and/or kana) against its hiragana reading,
 * returning an array of reading segments of length equal to word.length.
 * E.g.
 *   alignWordReading('帰る', 'かえる') -> ['かえ', 'る']
 *   alignWordReading('日本', 'にほん') -> ['に', 'ほん']
 *   alignWordReading('時計', 'とけい') -> ['と', 'けい']
 */
export function alignWordReading(word: string, reading: string): string[] {
  const chars = Array.from(word || '');
  const n = chars.length;
  if (n === 0) return [];

  const cleanFirst = (reading || '').trim().split(/[ /、,;]/)[0];
  const r = kataToHira(cleanFirst);
  const m = r.length;

  if (n === 1) return [r];
  if (kataToHira(word) === r) return chars.map(c => kataToHira(c));

  // Dynamic programming: find optimal boundary points p0 = 0 < p1 < ... < pn = m
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(-Infinity));
  const parent: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(-1));
  dp[0][0] = 0;

  for (let i = 0; i < n; i++) {
    const char = chars[i];
    const isKanaChar = /^[\u3040-\u30ff]$/.test(char);
    const kanaHira = isKanaChar ? kataToHira(char) : null;
    const cands = isKanaChar ? null : getCharCandidateReadings(char);

    for (let j = 0; j <= m; j++) {
      if (dp[i][j] === -Infinity) continue;

      const remainingChars = n - 1 - i;
      const maxLen = m - j - remainingChars;
      const minLen = (i === n - 1) ? (m - j) : 1;

      for (let len = minLen; len <= (i === n - 1 ? minLen : Math.min(maxLen, 4)); len++) {
        if (len < 1) continue;
        const slice = r.substring(j, j + len);
        let score = 1;

        if (isKanaChar) {
          if (slice === kanaHira) {
            score = 100;
          } else {
            score = -50;
          }
        } else {
          if (cands && cands.has(slice)) {
            score = 60;
          } else if (cands) {
            for (const c of cands) {
              if (c.startsWith(slice) || slice.startsWith(c)) {
                score = 25;
                break;
              }
            }
          }
          if (len === 1 || len === 2) score += 5;
        }

        const nextScore = dp[i][j] + score;
        if (nextScore > dp[i + 1][j + len]) {
          dp[i + 1][j + len] = nextScore;
          parent[i + 1][j + len] = j;
        }
      }
    }
  }

  if (parent[n][m] !== -1) {
    const res: string[] = [];
    let curR = m;
    for (let i = n; i > 0; i--) {
      const prevR = parent[i][curR];
      res.unshift(r.substring(prevR, curR));
      curR = prevR;
    }
    return res;
  }

  // Fallback: proportional partition
  const res: string[] = [];
  let prevPos = 0;
  for (let i = 0; i < n; i++) {
    const nextPos = (i === n - 1) ? m : Math.round(((i + 1) / n) * m);
    res.push(r.substring(prevPos, Math.max(prevPos + 1, nextPos)));
    prevPos = nextPos;
  }
  return res;
}

const findReadingSegments = (word: string, reading: string, kanji: KanjiItem) => {
  if (!reading) return { prefix: '', target: '', suffix: '' };

  const cleanReading = reading.replace(/[.-]/g, '').trim();
  const char = kanji?.character;
  const kanjiIdx = word ? word.indexOf(char) : -1;

  // Method 1: High-precision character alignment using alignWordReading (e.g. 時計 -> [と, けい])
  if (kanjiIdx !== -1 && word) {
    const aligned = alignWordReading(word, cleanReading);
    if (aligned && aligned.length === word.length) {
      return {
        prefix: aligned.slice(0, kanjiIdx).join(''),
        target: aligned[kanjiIdx] || '',
        suffix: aligned.slice(kanjiIdx + 1).join(''),
      };
    }
  }

  // Handle dot notation in dictionary readings (e.g. "う.る" -> kanji reading is "う", okurigana is "る")
  if (reading.includes('.')) {
    const [kanjiPart, okuri = ''] = reading.split('.');
    const cleanOkuri = okuri.replace(/[.-]/g, '').trim();
    return {
      prefix: '',
      target: kanjiPart.trim(),
      suffix: cleanOkuri,
    };
  }

  // Method 2: Okurigana alignment (if word has kana before/after target kanji)
  if (kanjiIdx !== -1 && word) {
    const wordPrefix = word.slice(0, kanjiIdx);
    const wordSuffix = word.slice(kanjiIdx + 1);
    const isSuffixAllKana = wordSuffix.length > 0 && /^[\u3040-\u309F]+$/.test(wordSuffix);
    const isPrefixAllKana = wordPrefix.length > 0 && /^[\u3040-\u309F]+$/.test(wordPrefix);

    if (isSuffixAllKana && cleanReading.endsWith(wordSuffix)) {
      const rest = cleanReading.slice(0, cleanReading.length - wordSuffix.length);
      if (isPrefixAllKana && rest.startsWith(wordPrefix)) {
        return {
          prefix: wordPrefix,
          target: rest.slice(wordPrefix.length),
          suffix: wordSuffix,
        };
      } else if (!wordPrefix) {
        return {
          prefix: '',
          target: rest,
          suffix: wordSuffix,
        };
      }
    }
  }

  // Method 3: Match known stems (onyomi & kunyomi with sokuon and rendaku variations)
  const stems = getKanjiStems(kanji);
  for (const stem of stems) {
    if (cleanReading.includes(stem)) {
      if (kanjiIdx === 0 && cleanReading.startsWith(stem)) {
        return {
          prefix: '',
          target: stem,
          suffix: cleanReading.slice(stem.length),
        };
      }
      if (kanjiIdx !== -1 && kanjiIdx === word.length - 1 && cleanReading.endsWith(stem)) {
        return {
          prefix: cleanReading.slice(0, cleanReading.length - stem.length),
          target: stem,
          suffix: '',
        };
      }
      const idx = cleanReading.indexOf(stem);
      return {
        prefix: cleanReading.substring(0, idx),
        target: stem,
        suffix: cleanReading.substring(idx + stem.length),
      };
    }
  }

  return { prefix: '', target: cleanReading, suffix: '' };
};

/**
 * Splits a reading string that may contain multiple alternative readings.
 * Delimiters supported:
 * - slashes: '/' or '／'
 * - Japanese commas: '、'
 * - Standard commas/semicolons: ',' or ';'
 * - Multiple consecutive spaces: '\s{2,}'
 */
export const parseReadingVariations = (reading?: string): string[] => {
  if (!reading) return [];
  const normalized = reading
    .replace(/／/g, '/')
    .replace(/、/g, '/')
    .replace(/[,;]/g, '/')
    .replace(/\s{2,}/g, '/');

  return normalized
    .split('/')
    .map(r => r.trim())
    .filter(Boolean);
};

/**
 * Normalizes example vocabulary word and reading for clean display in RubyText.
 * Handles cases where dictionary entries have dotted okurigana, e.g. "売" with "う.る" -> "売る" with "うる".
 */
export const normalizeWordAndReading = (word: string, reading?: string) => {
  if (!reading) return { displayWord: word, displayReading: '' };
  // Handle alternative readings: pick primary
  const primary = reading.split(/[/,、;]/)[0].trim();
  if (primary.includes('.')) {
    const [kanjiPart, okuri = ''] = primary.split('.');
    const cleanOkuri = okuri.replace(/[.-]/g, '');
    const displayWord = cleanOkuri && !word.includes(cleanOkuri) ? word + cleanOkuri : word;
    const displayReading = kanjiPart + cleanOkuri;
    return { displayWord, displayReading };
  }
  return { displayWord: word, displayReading: primary };
};

export const getHighlightedYomikata = (word: string, reading: string, kanji: KanjiItem) => {
  const primaryReading = parseReadingVariations(reading)[0] || reading;
  if (!primaryReading) {
    const fallback = (kanji?.kunyomi?.[0] || kanji?.onyomi?.[0] || '').replace(/[.-]/g, '').trim();
    if (fallback) {
      return (
        <span className="inline-flex items-baseline font-jp tracking-wide">
          <span className="text-red-700 dark:text-amber-400 font-bold">{fallback}</span>
        </span>
      );
    }
    return null;
  }

  const seg = findReadingSegments(word, primaryReading, kanji);

  return (
    <span className="inline-flex items-baseline font-jp tracking-wide">
      {seg.prefix && (
        <span className="text-text-primary">
          {seg.prefix}
        </span>
      )}
      <span className="text-red-700 dark:text-amber-400 font-bold">
        {seg.target}
      </span>
      {seg.suffix && (
        <span className="text-text-primary">
          {seg.suffix}
        </span>
      )}
    </span>
  );
};

/**
 * Returns a high-contrast highlighted yomikata element for Kotoba writing mode,
 * highlighting the reading segment corresponding to the character currently being written.
 */
export const getHighlightedKotobaYomikata = (
  word: string,
  reading: string,
  activeCharIndex: number
) => {
  if (!reading) return <span className="text-wine-accent font-bold">{word}</span>;

  const readings = parseReadingVariations(reading);

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-2 font-jp text-xl sm:text-2xl">
      {readings.map((singleReading, rIdx) => {
        const segs = alignWordReading(word, singleReading);
        const prefix = segs.slice(0, activeCharIndex).join('');
        const target = segs[activeCharIndex] || '';
        const suffix = segs.slice(activeCharIndex + 1).join('');

        return (
          <React.Fragment key={rIdx}>
            {rIdx > 0 && <span className="text-text-muted/50 px-1">/</span>}
            <span className="inline-flex items-center gap-0.5">
              {prefix && (
                <span className="text-text-primary/90 font-medium tracking-normal px-0.5">
                  {prefix}
                </span>
              )}
              {target ? (
                <span className="text-red-700 dark:text-amber-400 font-extrabold tracking-wider">
                  {target}
                </span>
              ) : null}
              {suffix && (
                <span className="text-text-primary/90 font-medium tracking-normal px-0.5">
                  {suffix}
                </span>
              )}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};


