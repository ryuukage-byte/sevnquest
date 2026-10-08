// Furigana / Ruby Text Utilities
// Provides kanji detection, normalization, dictionary fallback, and kanji-reading alignment for inline ruby text rendering.

import furiganaDictRaw from '../data/furiganaDictionary.json';

export interface RubySegment {
  text: string;
  ruby?: string;
  isKanji: boolean;
}

interface FuriganaDict {
  kanji: Record<string, string>;
  words: Record<string, string>;
}

const furiganaDict: FuriganaDict = furiganaDictRaw as FuriganaDict;

/**
 * Check if a character is a CJK Unified Ideograph (kanji) or ideographic iteration mark.
 */
export function isKanji(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    code === 0x3005 || // 々 (Ideographic Iteration Mark)
    code === 0x3006    // 〆 (Ideographic Closing Mark)
  );
}

/**
 * Check if a character is hiragana.
 */
function isHiragana(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309F;
}

/**
 * Check if a character is katakana.
 */
function isKatakana(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

/**
 * Normalize punctuation, parentheses, and blank underscores to prevent desync between Japanese prompt and reading.
 */
export function normalizeJapanesePunctuation(str: string): string {
  if (!str) return '';
  return str
    .replace(/（[\s　]*）/g, '（　）')
    .replace(/\([\s　]*\)/g, '（　）')
    .replace(/[＿_]{2,}/g, '＿＿＿');
}

/**
 * Convert a single katakana character to hiragana.
 */
function katakanaToHiragana(char: string): string {
  if (!char) return '';
  const code = char.charCodeAt(0);
  if (code >= 0x30A1 && code <= 0x30F6) {
    return String.fromCharCode(code - 0x60);
  }
  return char;
}

/**
 * Compare two characters, treating katakana and hiragana equivalents as equal.
 */
function charsMatch(c1: string, c2: string): boolean {
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  return katakanaToHiragana(c1) === katakanaToHiragana(c2);
}

/**
 * Check if haystack starts with needle at given position, kana-insensitive.
 */
function startsWithKana(haystack: string, needle: string, pos: number): boolean {
  if (pos + needle.length > haystack.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (!charsMatch(haystack[pos + i], needle[i])) return false;
  }
  return true;
}

/**
 * Merge adjacent non-kanji segments into single segments for clean DOM rendering.
 */
function mergeNonKanjiSegments(segments: RubySegment[]): RubySegment[] {
  const merged: RubySegment[] = [];

  for (const seg of segments) {
    if (!seg.isKanji && merged.length > 0 && !merged[merged.length - 1].isKanji) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

/**
 * Detect context-sensitive stem readings for inflected verbs and adjectives
 * when the inflected surface form (e.g. 食べました, 来ました, 行った) is not in the dictionary.
 */
function getInflectedKanjiReading(kanjiChar: string, followingText: string): string | null {
  if (!followingText) return null;

  // 1. 食べる (taberu) and its inflections (食べた, 食べて, 食べます, 食べない, 食べたい, etc.)
  if (kanjiChar === '食' && followingText.startsWith('べ')) {
    return 'た';
  }

  // 2. 来る (kuru / kuru-family verbs)
  if (kanjiChar === '来') {
    // 来ます, 来て, 来た, 来たい, 来たら
    if (/^[まてたい]/.test(followingText)) return 'き';
    // 来ない, 来られる, 来させる, 来よう, 来い
    if (/^[ならさよい]/.test(followingText)) return 'こ';
    // 来る, 来れば
    if (/^[るれ]/.test(followingText)) return 'く';
  }

  // 3. 飲む (nomu) -> 飲んだ, 飲んで, 飲みます, 飲まない
  if (kanjiChar === '飲' && /^[みんまめも]/.test(followingText)) return 'の';

  // 4. 行く (iku) vs 行う (okonau)
  if (kanjiChar === '行') {
    if (/^[きっかけこ]/.test(followingText)) return 'い';
    if (/^[いうわっえ]/.test(followingText)) return 'おこな';
  }

  // 5. 話す (hanasu) -> 話した, 話して, 話します
  if (kanjiChar === '話' && /^[しさせそ]/.test(followingText)) return 'はな';

  // 6. 待つ (matsu) -> 待った, 待って, 待ちます
  if (kanjiChar === '待' && /^[ちったてと]/.test(followingText)) return 'ま';

  // 7. 買う (kau) -> 買った, 買って, 買います
  if (kanjiChar === '買' && /^[いっわえお]/.test(followingText)) return 'か';

  // 8. 書く (kaku) -> 書いた, 書いて, 書きます
  if (kanjiChar === '書' && /^[きいかけこ]/.test(followingText)) return 'か';

  // 9. 読む (yomu) -> 読んだ, 読んで, 読みます
  if (kanjiChar === '読' && /^[みんまめも]/.test(followingText)) return 'よ';

  // 10. 泳ぐ (oyogu) -> 泳いだ, 泳いで, 泳ぎます
  if (kanjiChar === '泳' && /^[ぎいがげご]/.test(followingText)) return 'およ';

  // 11. 遊ぶ (asobu) -> 遊んだ, 遊んで, 遊びます
  if (kanjiChar === '遊' && /^[びんばべぼ]/.test(followingText)) return 'あそ';

  // 12. 死ぬ (shinu) -> 死んだ, 死んで, 死にます
  if (kanjiChar === '死' && /^[にんなねの]/.test(followingText)) return 'し';

  // 13. 作る (tsukuru) -> 作った, 作って, 作ります
  if (kanjiChar === '作' && /^[りっられろ]/.test(followingText)) return 'つく';

  // 14. 使う (tsukau) -> 使った, 使って, 使います
  if (kanjiChar === '使' && /^[いっわえお]/.test(followingText)) return 'つか';

  // 15. 見る (miru) / 見せる (miseru)
  if (kanjiChar === '見' && /^[まてたなよろらせ]/.test(followingText)) return 'み';

  // 16. 寝る (neru)
  if (kanjiChar === '寝' && /^[まてたなよろら]/.test(followingText)) return 'ね';

  // 17. 起きる (okiru)
  if (kanjiChar === '起' && followingText.startsWith('き')) return 'お';

  // 18. 教える (oshieru)
  if (kanjiChar === '教' && followingText.startsWith('え')) return 'おし';

  // 19. 答える (kotaeru)
  if (kanjiChar === '答' && followingText.startsWith('え')) return 'こた';

  // 20. 始める (hajimeru)
  if (kanjiChar === '始' && followingText.startsWith('め')) return 'はじ';

  // 21. 終わる (owaru)
  if (kanjiChar === '終' && /^[わっり]/.test(followingText)) return 'お';

  // 22. 忘れる (wasureru)
  if (kanjiChar === '忘' && followingText.startsWith('れ')) return 'わす';

  // 23. 疲れる (tsukareru)
  if (kanjiChar === '疲' && followingText.startsWith('れ')) return 'つか';

  // 24. 覚える (oboeru)
  if (kanjiChar === '覚' && followingText.startsWith('え')) return 'おぼ';

  // 25. 調べる (shiraberu)
  if (kanjiChar === '調' && followingText.startsWith('べ')) return 'しら';

  // 26. 考える (kangaeru)
  if (kanjiChar === '考' && followingText.startsWith('え')) return 'かんが';

  // 27. 立つ (tatsu)
  if (kanjiChar === '立' && /^[ちったて]/.test(followingText)) return 'た';

  // 28. 座る (suwaru)
  if (kanjiChar === '座' && /^[りっられ]/.test(followingText)) return 'すわ';

  // 29. 乗る (noru)
  if (kanjiChar === '乗' && /^[りっられ]/.test(followingText)) return 'の';

  // 30. 降りる (oriru) vs 降る (furu)
  if (kanjiChar === '降') {
    if (followingText.startsWith('り')) return 'お';
    if (/^[るっら]/.test(followingText)) return 'ふ';
  }

  // 31. 貸す (kasu)
  if (kanjiChar === '貸' && /^[しさせ]/.test(followingText)) return 'か';

  // 32. 借りる (kariru)
  if (kanjiChar === '借' && followingText.startsWith('り')) return 'か';

  // 33. 走る (hashiru)
  if (kanjiChar === '走' && /^[りっられ]/.test(followingText)) return 'はし';

  // 34. 帰る (kaeru)
  if (kanjiChar === '帰' && /^[りっられ]/.test(followingText)) return 'かえ';

  // 35. 入る (hairu) vs 入れる (ireru)
  if (kanjiChar === '入') {
    if (followingText.startsWith('れ')) return 'い';
    if (/^[りっられ]/.test(followingText)) return 'はい';
  }

  // 36. 出す (dasu) vs 出る (deru) vs 出かける (dekakeru)
  if (kanjiChar === '出') {
    if (followingText.startsWith('か')) return 'で';
    if (/^[しさせ]/.test(followingText)) return 'だ';
    if (/^[るてたなよ]/.test(followingText)) return 'で';
  }

  // 37. 切る (kiru)
  if (kanjiChar === '切' && /^[りっられ]/.test(followingText)) return 'き';

  // 38. 知る (shiru)
  if (kanjiChar === '知' && /^[りっられ]/.test(followingText)) return 'し';

  // 39. 洗う (arau)
  if (kanjiChar === '洗' && /^[いっわえ]/.test(followingText)) return 'あら';

  // 40. 開ける (akeru) vs 開く (aku / hiraku)
  if (kanjiChar === '開') {
    if (followingText.startsWith('け')) return 'あ';
    if (/^[きいかけ]/.test(followingText)) return 'あ';
  }

  // 41. 閉める (shimeru) / 閉まる (shimaru)
  if (kanjiChar === '閉') {
    if (/^[めま]/.test(followingText)) return 'し';
  }

  // 42. 消す (kesu) vs 消える (kieru)
  if (kanjiChar === '消') {
    if (/^[しさせ]/.test(followingText)) return 'け';
    if (followingText.startsWith('え')) return 'き';
  }

  // 43. 置く (oku)
  if (kanjiChar === '置' && /^[きいかけ]/.test(followingText)) return 'お';

  // 44. 落とす (otosu) vs 落ちる (ochiru)
  if (kanjiChar === '落' && /^[とち]/.test(followingText)) return 'お';

  // 45. 直す (naosu) / 直る (naoru)
  if (kanjiChar === '直' && /^[しりっ]/.test(followingText)) return 'なお';

  // 46. 呼ぶ (yobu)
  if (kanjiChar === '呼' && /^[びんばべぼ]/.test(followingText)) return 'よ';

  // 47. 頼む (tanomu)
  if (kanjiChar === '頼' && /^[みんまめも]/.test(followingText)) return 'たの';

  // 48. 運ぶ (hakobu)
  if (kanjiChar === '運' && /^[びんばべぼ]/.test(followingText)) return 'はこ';

  // 49. 急ぐ (isogu)
  if (kanjiChar === '急' && /^[ぎいがげご]/.test(followingText)) return 'いそ';

  // 50. 働く (hataraku)
  if (kanjiChar === '働' && /^[きいかけこ]/.test(followingText)) return 'はたら';

  return null;
}

/**
 * Automatically annotate kanji words in Japanese text using the comprehensive built-in dictionary.
 * Used as an automatic fallback when no explicit reading string is provided for a question.
 */
function autoAnnotateFurigana(text: string, excludeKanji?: Set<string>): RubySegment[] {
  if (!text) return [];

  const segments: RubySegment[] = [];
  let i = 0;

  // Filter dictionary words that actually appear in this text, sorted by length descending
  // CRITICAL: Only match words containing at least one Kanji! Pure kana words never take furigana.
  const matchedWords = Object.keys(furiganaDict.words)
    .filter(w => text.includes(w) && Array.from(w).some(c => isKanji(c)))
    .sort((a, b) => b.length - a.length);

  while (i < text.length) {
    // 1. Suffix pattern 〜方 / ～方 / ~方 (way of doing, e.g. 〜方) is always 'かた'
    if (text.startsWith('〜方', i) || text.startsWith('～方', i) || text.startsWith('~方', i)) {
      segments.push({ text: text[i], isKanji: false });
      segments.push({ text: '方', ruby: 'かた', isKanji: true });
      i += 2;
      continue;
    }

    // 2. Verb stem + 方 (e.g. 使い方, 書き方, 作り方, やり方, 食べ方, 教え方, 行き方, 読み方) or suffix 〜方
    // When 方 is preceded by '〜'/'～'/'~' or hiragana other than 'の' (which is usually noun modifier の方 / hou),
    // it functions as the action-method nominalizer suffix 'かた' (kata).
    if (text[i] === '方') {
      const prev = i > 0 ? text[i - 1] : '';
      if (prev === '〜' || prev === '～' || prev === '~' || (isHiragana(prev) && prev !== 'の' && prev !== '之')) {
        segments.push({ text: '方', ruby: 'かた', isKanji: true });
        i++;
        continue;
      }
    }

    // Check if substring matches known compound word
    let wordMatch: string | null = null;
    for (const w of matchedWords) {
      if (text.startsWith(w, i)) {
        // If all kanji in word are excluded, skip word match
        const containsExcluded = excludeKanji && Array.from(w).some(c => excludeKanji.has(c));
        if (!containsExcluded) {
          wordMatch = w;
          break;
        }
      }
    }

    if (wordMatch) {
      let reading = furiganaDict.words[wordMatch];
      const hasKanji = Array.from(wordMatch).some(c => isKanji(c));
      const hasNonKanji = Array.from(wordMatch).some(c => !isKanji(c));
      const readingHasKanji = reading ? Array.from(reading).some(c => isKanji(c)) : true;

      // If a single kanji matched as a word but is immediately followed by hiragana (okurigana),
      // prefer the verb/adjective stem kunyomi from kanji dictionary (e.g. 終わった -> お, 割った -> わ, 乾いた -> かわ)
      if (wordMatch.length === 1 && i + 1 < text.length && isHiragana(text[i + 1]) && furiganaDict.kanji[wordMatch]) {
        reading = furiganaDict.kanji[wordMatch];
        segments.push({ text: wordMatch, ruby: reading, isKanji: true });
      } else if (hasKanji && hasNonKanji && !readingHasKanji) {
        // Word contains both kanji and okurigana (e.g. 飽きる, 食べる, 思い出す)
        // Align wordMatch against reading so only kanji characters receive ruby, leaving okurigana as plain text
        const subSegments = alignKanjiReadings(wordMatch, reading, excludeKanji);
        segments.push(...subSegments);
      } else if (hasKanji) {
        segments.push({ text: wordMatch, ruby: readingHasKanji ? undefined : reading, isKanji: true });
      } else {
        segments.push({ text: wordMatch, isKanji: false });
      }
      i += wordMatch.length;
      continue;
    }

    const char = text[i];
    if (isKanji(char)) {
      if (excludeKanji && excludeKanji.has(char)) {
        segments.push({ text: char, isKanji: false });
      } else {
        // 1. Check dynamic inflection rules for common verbs and adjectives
        const followingText = text.slice(i + 1);
        const inflectedReading = getInflectedKanjiReading(char, followingText);
        if (inflectedReading) {
          segments.push({ text: char, ruby: inflectedReading, isKanji: true });
        } else {
          // 2. Fallback to kanji dictionary
          const singleReading = furiganaDict.kanji[char];
          segments.push({ text: char, ruby: singleReading || undefined, isKanji: true });
        }
      }
      i++;
      continue;
    }

    // Collect continuous non-kanji text
    let nonKanji = '';
    while (i < text.length && !isKanji(text[i])) {
      if (text.startsWith('〜方', i) || text.startsWith('～方', i) || text.startsWith('~方', i)) break;
      if (matchedWords.some(w => text.startsWith(w, i))) break;
      nonKanji += text[i];
      i++;
    }
    if (nonKanji) {
      segments.push({ text: nonKanji, isKanji: false });
    }
  }

  return mergeNonKanjiSegments(segments);
}

/**
 * Parse an annotated reading string where kanji is accompanied by inline reading or bracketed furigana
 * (e.g. "これはあくまでも仮かりの数字すうじであって" or "日本[にほん]に行[い]く")
 */
function parseAnnotatedReading(
  japanese: string,
  reading: string,
  excludeKanji?: Set<string>
): RubySegment[] {
  const segments: RubySegment[] = [];
  let jIdx = 0;
  let rIdx = 0;

  while (jIdx < japanese.length && rIdx < reading.length) {
    const jChar = japanese[jIdx];

    if (isKanji(jChar)) {
      if (excludeKanji && excludeKanji.has(jChar)) {
        segments.push({ text: jChar, isKanji: false });
        jIdx++;
        if (rIdx < reading.length && reading[rIdx] === jChar) rIdx++;
        continue;
      }

      let kanjiSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && !(excludeKanji && excludeKanji.has(japanese[jIdx]))) {
        kanjiSeq += japanese[jIdx];
        jIdx++;
      }

      if (reading.startsWith(kanjiSeq, rIdx)) {
        rIdx += kanjiSeq.length;
      }

      let ruby = '';
      if (reading[rIdx] === '[' || reading[rIdx] === '(' || reading[rIdx] === '（' || reading[rIdx] === '《') {
        const closeChar = reading[rIdx] === '[' ? ']' : reading[rIdx] === '(' ? ')' : reading[rIdx] === '（' ? '）' : '》';
        rIdx++;
        while (rIdx < reading.length && reading[rIdx] !== closeChar) {
          ruby += reading[rIdx];
          rIdx++;
        }
        if (rIdx < reading.length) rIdx++;
      } else {
        const nextJChar = jIdx < japanese.length ? japanese[jIdx] : null;
        if (nextJChar) {
          while (rIdx < reading.length && reading[rIdx] !== nextJChar && !isKanji(reading[rIdx])) {
            ruby += reading[rIdx];
            rIdx++;
          }
        } else {
          while (rIdx < reading.length && !isKanji(reading[rIdx])) {
            ruby += reading[rIdx];
            rIdx++;
          }
        }
      }

      const finalRuby = ruby || furiganaDict.words[kanjiSeq] || furiganaDict.kanji[kanjiSeq] || undefined;
      segments.push({ text: kanjiSeq, ruby: finalRuby, isKanji: true });
    } else {
      segments.push({ text: jChar, isKanji: false });
      jIdx++;
      if (rIdx < reading.length && reading[rIdx] === jChar) {
        rIdx++;
      }
    }
  }

  while (jIdx < japanese.length) {
    const jChar = japanese[jIdx];
    if (isKanji(jChar)) {
      const finalRuby = furiganaDict.kanji[jChar] || undefined;
      segments.push({ text: jChar, ruby: finalRuby, isKanji: true });
    } else {
      segments.push({ text: jChar, isKanji: false });
    }
    jIdx++;
  }

  return mergeNonKanjiSegments(segments);
}

/**
 * Align a Japanese text (with kanji) against its full-hiragana reading
 * to produce ruby segments with kanji → reading mappings.
 */
function alignKanjiReadings(
  origJapanese: string,
  origReading: string,
  excludeKanji?: Set<string>
): RubySegment[] {
  if (!origJapanese) {
    return [];
  }
  if (!origReading) {
    return autoAnnotateFurigana(origJapanese, excludeKanji);
  }

  const japanese = normalizeJapanesePunctuation(origJapanese);
  const reading = normalizeJapanesePunctuation(origReading).replace(/\s{2,}/g, ' / ');

  if (japanese === reading) {
    const hasKanji = Array.from(japanese).some(c => isKanji(c));
    if (hasKanji) {
      return autoAnnotateFurigana(origJapanese, excludeKanji);
    }
    return [{ text: origJapanese, isKanji: false }];
  }

  // If reading itself contains kanji, parse it as an annotated reading string (e.g. 漢字[かんじ] or 漢字かんじ)
  const readingHasKanji = Array.from(reading).some(c => isKanji(c));
  if (readingHasKanji) {
    const inlineSegments = parseAnnotatedReading(japanese, reading, excludeKanji);
    if (inlineSegments.some(s => s.isKanji && s.ruby)) {
      return inlineSegments;
    }
    return autoAnnotateFurigana(origJapanese, excludeKanji);
  }

  const segments: RubySegment[] = [];
  let jIdx = 0;
  let rIdx = 0;

  while (jIdx < japanese.length) {
    const jChar = japanese[jIdx];

    if (isKanji(jChar) && !(excludeKanji?.has(jChar))) {
      let kanjiSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && !(excludeKanji?.has(japanese[jIdx]))) {
        kanjiSeq += japanese[jIdx];
        jIdx++;
      }

      // Collect the following non-kanji anchor sequence in japanese
      let anchor = '';
      let lookAhead = jIdx;
      while (lookAhead < japanese.length && (!isKanji(japanese[lookAhead]) || excludeKanji?.has(japanese[lookAhead]))) {
        anchor += japanese[lookAhead];
        lookAhead++;
      }

      let readingEnd = rIdx;
      if (anchor.length > 0) {
        // In Japanese, each kanji has at least 1 mora (character) in reading
        const minLen = kanjiSeq.length;
        let found = -1;

        // Try matching anchor sequence with up to 4 characters prefix
        for (let aLen = Math.min(anchor.length, 4); aLen >= 1; aLen--) {
          const subAnchor = anchor.substring(0, aLen);
          for (let i = rIdx + minLen; i <= reading.length - aLen; i++) {
            if (startsWithKana(reading, subAnchor, i)) {
              found = i;
              break;
            }
          }
          if (found >= 0) break;
        }

        // Fallback: if minLen was too strict, try from rIdx + 1
        if (found < 0) {
          for (let aLen = Math.min(anchor.length, 4); aLen >= 1; aLen--) {
            const subAnchor = anchor.substring(0, aLen);
            for (let i = rIdx + 1; i <= reading.length - aLen; i++) {
              if (startsWithKana(reading, subAnchor, i)) {
                found = i;
                break;
              }
            }
            if (found >= 0) break;
          }
        }

        if (found >= 0) {
          readingEnd = found;
        } else {
          readingEnd = Math.min(rIdx + kanjiSeq.length * 3, reading.length);
        }
      } else {
        readingEnd = reading.length;
      }

      const rubyText = reading.substring(rIdx, readingEnd);
      // Fallback to dictionary if rubyText is empty
      const finalRuby = rubyText || furiganaDict.words[kanjiSeq] || furiganaDict.kanji[kanjiSeq] || undefined;
      segments.push({ text: kanjiSeq, ruby: finalRuby, isKanji: true });
      rIdx = readingEnd;
    } else if (isKanji(jChar) && excludeKanji?.has(jChar)) {
      let excludedSeq = '';
      while (jIdx < japanese.length && isKanji(japanese[jIdx]) && excludeKanji?.has(japanese[jIdx])) {
        excludedSeq += japanese[jIdx];
        jIdx++;
      }
      segments.push({ text: excludedSeq, isKanji: false });
    } else {
      segments.push({ text: jChar, isKanji: false });
      jIdx++;
      // Skip any extraneous whitespace in reading if jChar is not whitespace
      while (rIdx < reading.length && /[\s　]/.test(reading[rIdx]) && !/[\s　]/.test(jChar)) {
        rIdx++;
      }
      // Advance rIdx if reading matches jChar
      if (rIdx < reading.length && charsMatch(jChar, reading[rIdx])) {
        rIdx++;
      } else if (rIdx < reading.length && /[\s　]/.test(jChar) && /[\s　]/.test(reading[rIdx])) {
        rIdx++;
      }
    }
  }

  return mergeNonKanjiSegments(segments);
}

/**
 * Universal helper that returns ruby segments for any Japanese text,
 * whether an explicit reading string is provided or auto-annotated.
 */
export function getFuriganaSegments(
  japanese: string,
  reading?: string,
  excludeKanji?: Set<string>
): RubySegment[] {
  if (!japanese) return [];
  if (reading && reading.trim() && reading.trim() !== japanese.trim()) {
    return alignKanjiReadings(japanese, reading, excludeKanji);
  }
  return autoAnnotateFurigana(japanese, excludeKanji);
}
