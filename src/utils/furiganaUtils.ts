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
        const aligned = alignExact(wordMatch, reading, excludeKanji);
        if (aligned && aligned.mismatches === 0) segments.push(...aligned.segments);
        else segments.push({ text: wordMatch, ruby: reading, isKanji: true });
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

// ---------------------------------------------------------------------------------------------
// Penyelarasan teks ↔ bacaan (furigana dari bacaan eksplisit)
// ---------------------------------------------------------------------------------------------

/** Karakter yang "membawa bacaan" (mendapat furigana): kanji, 〇, ヶ/ヵ, angka, dan huruf Latin. */
function isReadingBearing(char: string): boolean {
  return isKanji(char) || char === '〇' || char === 'ヶ' || char === 'ヵ' || /[0-9０-９A-Za-zＡ-Ｚａ-ｚ]/.test(char);
}

/** Kana (termasuk ー) yang wajib cocok dengan bacaan; ・ diperlakukan sebagai tanda baca. */
function isKanaLiteral(char: string): boolean {
  return (isHiragana(char) || isKatakana(char)) && char !== '・' && char !== '゠';
}

/** Tanda baca / spasi / simbol: boleh ada atau tidak ada di bacaan. */
function isSkippableReadingChar(char: string): boolean {
  return !isKanaLiteral(char) && !isReadingBearing(char);
}

const VOWELS = new Set(['あ', 'い', 'う', 'え', 'お']);
// Bacaan kanji tidak pernah diawali kana ini (を hanya partikel); mencegah salah ketik "terserap" ke furigana.
const CANNOT_START_READING = new Set(['ん', 'っ', 'ー', 'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ', 'を']);

function kanaEquals(textChar: string, readingChar: string): boolean {
  if (charsMatch(textChar, readingChar)) return true;
  // Tanda panjang katakana ditulis sebagai vokal di sebagian bacaan (コーヒー ↔ こうひい).
  return textChar === 'ー' && VOWELS.has(katakanaToHiragana(readingChar));
}

type AlignToken =
  | { kind: 'group'; text: string; excluded: boolean }
  | { kind: 'kana'; text: string }
  | { kind: 'opt'; text: string };

/**
 * Bacaan beranotasi ("私わたしは友ともだち…" atau "日本[にほん]に…"): ambil bacaan polos (tanpa kanji & kurung
 * anotasi) dan urutan potongan kanji sebagai petunjuk batas furigana.
 */
function parseAnnotation(reading: string): { plain: string; hints: string[] } | null {
  if (!Array.from(reading).some(c => isKanji(c))) return null;
  const unbracketed = reading.replace(/([㐀-鿿豈-﫿々〆〇]+)[[(（《]([^\])）》]*)[\])）》]/g, '$1$2');
  const hints: string[] = [];
  let plain = '';
  let run = '';
  for (const c of unbracketed) {
    if (isKanji(c) || c === '〇') {
      run += c;
    } else {
      if (run) { hints.push(run); run = ''; }
      plain += c;
    }
  }
  if (run) hints.push(run);
  return { plain, hints };
}

function tokenizeForAlignment(japanese: string, hints: string[] | null, excludeKanji?: Set<string>): AlignToken[] {
  const tokens: AlignToken[] = [];
  const chars = Array.from(japanese);
  const hintQueue = hints ? [...hints] : null;
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (isReadingBearing(c)) {
      const excluded = !!excludeKanji?.has(c);
      let run = '';
      while (i < chars.length && isReadingBearing(chars[i]) && !!excludeKanji?.has(chars[i]) === excluded) {
        run += chars[i];
        i++;
      }
      // Pecah run kanji mengikuti petunjuk anotasi (三時間話 → 三 | 時間 | 話) bila cocok berurutan.
      const parts: string[] = [];
      let rest = run;
      while (hintQueue && hintQueue.length > 0 && rest.length > 0) {
        const kanjiOnly = Array.from(rest).filter(ch => isKanji(ch) || ch === '〇').join('');
        if (!kanjiOnly || kanjiOnly !== rest) break; // run berisi angka/huruf: tanpa pemecahan
        if (!rest.startsWith(hintQueue[0])) break;
        parts.push(hintQueue[0]);
        rest = rest.slice(hintQueue[0].length);
        hintQueue.shift();
      }
      if (rest) parts.push(rest);
      for (const part of parts) tokens.push({ kind: 'group', text: part, excluded });
    } else if (isKanaLiteral(c)) {
      tokens.push({ kind: 'kana', text: c });
      i++;
    } else {
      tokens.push({ kind: 'opt', text: c });
      i++;
    }
  }
  return tokens;
}

export interface FuriganaAlignment {
  segments: RubySegment[];
  /** true bila bacaan bisa diselaraskan dengan teks (furigana = bacaan data). */
  aligned: boolean;
  /** Jumlah ketidakcocokan kana teks ↔ bacaan yang ditoleransi (0 = persis). */
  mismatches: number;
}

const ALIGN_MAX_CELLS = 400_000;

/**
 * Selaraskan teks dengan bacaan memakai pemrograman dinamis (biaya minimum). Kana di teks harus cocok dengan
 * bacaan (salah ketik di bacaan ditoleransi dengan biaya), tanda baca opsional, dan setiap run kanji/angka/huruf
 * menyerap ≥1 karakter bacaan. Bila ada beberapa penyelarasan, run kanji yang lebih awal mengambil bacaan
 * terpendek (seperti regex non-greedy).
 */
function alignExact(japanese: string, readingInput: string, excludeKanji?: Set<string>): FuriganaAlignment | null {
  const annotation = parseAnnotation(readingInput);
  const readingText = annotation ? annotation.plain : readingInput;
  const tokens = tokenizeForAlignment(japanese, annotation?.hints ?? null, excludeKanji);
  const reading = Array.from(readingText);
  const n = tokens.length;
  const m = reading.length;
  if ((n + 1) * (m + 1) > ALIGN_MAX_CELLS) return null;

  const INF = 1e9;
  const width = m + 1;
  // cost[t * width + p] = biaya minimum menyelaraskan tokens[t..] dengan reading[p..]
  const cost = new Float64Array((n + 1) * width).fill(INF);
  const choice = new Int32Array((n + 1) * width).fill(-1); // >0: panjang grup; 0: cocok/lewati token; -2: lewati bacaan
  // Biaya: 1 per kana yang tidak cocok; tanda baca yang hanya ada di satu sisi 0,01 (lebih baik dicocokkan);
  // pemecah seri antar-penyelarasan sama baiknya ≤ 0,001 (panjang bacaan wajar per karakter, cocok kamus).
  const skipCost = (p: number) => (/[\s　]/.test(reading[p]) ? 0 : isSkippableReadingChar(reading[p]) ? 0.01 : 1);

  for (let p = m; p >= 0; p--) cost[n * width + p] = p === m ? 0 : cost[n * width + p + 1] + skipCost(p);

  for (let t = n - 1; t >= 0; t--) {
    const tok = tokens[t];
    const groupLen = tok.kind === 'group' ? Array.from(tok.text).length : 0;
    const maxK = tok.kind === 'group' ? groupLen * 6 + 2 : 0;
    // Panjang bacaan yang wajar: jumlah panjang bacaan kamus per kanji (2 bila tidak ada).
    const expectedLen = tok.kind === 'group'
      ? Array.from(tok.text).reduce((n, ch) => n + (furiganaDict.kanji[ch]?.length || 2), 0)
      : 0;
    const dictReadings = tok.kind === 'group'
      ? [furiganaDict.words[tok.text], groupLen === 1 ? furiganaDict.kanji[tok.text] : undefined].filter((r): r is string => !!r)
      : [];
    for (let p = m; p >= 0; p--) {
      let best = INF;
      let bestChoice = -1;
      const idx = t * width + p;
      if (tok.kind === 'group') {
        // Grup tidak boleh menyerap tanda baca/spasi, dan bacaan kanji tidak mungkin diawali ん/っ/ー/kana kecil.
        if (p < m && CANNOT_START_READING.has(katakanaToHiragana(reading[p])) && /[\u3400-\u9fff\uf900-\ufaff々〆〇]/.test(tok.text[0])) {
          // biarkan best = INF untuk pilihan grup; masih bisa lewati bacaan di bawah
        } else for (let k = 1; k <= maxK && p + k <= m; k++) {
          if (isSkippableReadingChar(reading[p + k - 1]) || reading[p + k - 1] === 'を') break;
          let c = cost[(t + 1) * width + p + k] + Math.abs(k - expectedLen) * 1e-4;
          if (dictReadings.length > 0 && dictReadings.includes(reading.slice(p, p + k).join(''))) c -= 5e-4;
          if (c < best) { best = c; bestChoice = k; }
        }
      } else if (tok.kind === 'kana') {
        if (p < m) {
          const c = cost[(t + 1) * width + p + 1] + (kanaEquals(tok.text, reading[p]) ? 0 : 1);
          if (c < best) { best = c; bestChoice = 0; }
        }
        // Kana teks tanpa pasangan sedikit lebih mahal daripada kana yang salah ketik (substitusi).
        const del = cost[(t + 1) * width + p] + 1.0003;
        if (del < best) { best = del; bestChoice = -3; }
      } else {
        if (p < m && reading[p] === tok.text) {
          const c = cost[(t + 1) * width + p + 1];
          if (c < best) { best = c; bestChoice = 0; }
        }
        const skip = cost[(t + 1) * width + p] + (/[\s　]/.test(tok.text) ? 0 : 0.01);
        if (skip < best) { best = skip; bestChoice = -3; }
      }
      if (p < m) {
        const c = cost[idx + 1] + skipCost(p);
        if (c < best) { best = c; bestChoice = -2; }
      }
      cost[idx] = best;
      choice[idx] = bestChoice;
    }
  }

  const total = cost[0];
  if (!(total < INF)) return null;

  const segments: RubySegment[] = [];
  let t = 0;
  let p = 0;
  while (t < n) {
    const ch = choice[t * width + p];
    if (ch === -2) { p++; continue; }
    const tok = tokens[t];
    if (tok.kind === 'group') {
      const ruby = reading.slice(p, p + ch).join('');
      if (tok.excluded || ruby === tok.text) segments.push({ text: tok.text, isKanji: !tok.excluded && isKanji(tok.text[0]) });
      else segments.push({ text: tok.text, ruby, isKanji: true });
      p += ch;
    } else {
      segments.push({ text: tok.text, isKanji: false });
      if (ch === 0) p++;
    }
    t++;
  }
  const mismatches = Math.round(total);
  return { segments: mergeNonKanjiSegments(segments), aligned: true, mismatches };
}

const ALTERNATIVE_SEPARATOR = /(\s*[/／]\s*)/;

/** Bacaan berisi beberapa alternatif ("かねもち / おかねもち"): pakai yang paling cocok dengan teks. */
function alignBestReading(text: string, reading: string, excludeKanji?: Set<string>): FuriganaAlignment | null {
  const options = /[/／]/.test(reading) ? reading.split(/\s*[/／]\s*/).filter(Boolean) : [reading];
  let best: FuriganaAlignment | null = null;
  for (const option of options) {
    const r = alignExact(text, option, excludeKanji);
    if (r && (!best || r.mismatches < best.mismatches)) best = r;
  }
  return best;
}

/**
 * Teks berisi beberapa bentuk tulisan ("丸い / 円い", "堅 / 硬/固い") dengan satu bacaan: selaraskan bacaan
 * dengan tiap bentuk secara terpisah (bila jumlah alternatif bacaan sama, dipasangkan berurutan).
 */
function alignAlternatives(text: string, reading: string, excludeKanji?: Set<string>): FuriganaAlignment | null {
  if (!/[/／]/.test(text)) return null;
  const parts = text.split(ALTERNATIVE_SEPARATOR);
  const forms = parts.filter((_, i) => i % 2 === 0);
  const readings = reading.split(/\s*[/／]\s*/).filter(Boolean);
  const segments: RubySegment[] = [];
  let mismatches = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) { segments.push({ text: parts[i], isKanji: false }); continue; }
    const formIndex = i / 2;
    const form = parts[i];
    if (!form) continue;
    const r = alignBestReading(form, readings.length === forms.length ? readings[formIndex] : readings.join(' / '), excludeKanji);
    if (!r) return null;
    segments.push(...r.segments);
    mismatches += r.mismatches;
  }
  return { segments: mergeNonKanjiSegments(segments), aligned: true, mismatches };
}

/**
 * Bacaan beranotasi per kata: teks dengan bacaan tiap kata disisipkan tepat setelah kata itu
 * ("乗り遅のりおくれる", "使い方つかいかたを", "日本[にほん]に"). Temukan sisipan (hanya boleh muncul setelah
 * karakter pembawa bacaan) dengan backtracking, lalu selaraskan tiap kata dengan bacaannya sendiri. Kata = akhiran
 * terpanjang dari teks sejak kata sebelumnya yang diawali kanji dan cocok persis dengan bacaannya.
 */
function alignAnnotated(text: string, annotatedInput: string, excludeKanji?: Set<string>): FuriganaAlignment | null {
  if (!Array.from(annotatedInput).some(c => isKanji(c))) return null;
  const annotated = Array.from(
    annotatedInput.replace(/([\u3400-\u9fff\uf900-\ufaff々〆〇]+)[[(（《]([^\])）》]*)[\])）》]/g, '$1$2')
  );
  const t = Array.from(text);
  if (annotated.length > 600 || t.length > 300) return null;
  const insertable = (c: string) => isHiragana(c) || isKatakana(c);
  const memo = new Map<number, boolean>();
  // ok(i, j, inIns): sisa teks t[i..] bisa dicocokkan dengan annotated[j..]; inIns = sedang dalam sisipan.
  const ok = (i: number, j: number, canInsert: boolean): boolean => {
    if (j === annotated.length) return i === t.length;
    const key = (i * 1024 + j) * 2 + (canInsert ? 1 : 0);
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let res = false;
    if (i < t.length && annotated[j] === t[i]) res = ok(i + 1, j + 1, isReadingBearing(t[i]));
    if (!res && canInsert && insertable(annotated[j])) res = ok(i, j + 1, true);
    memo.set(key, res);
    return res;
  };
  if (!ok(0, 0, false)) return null;

  // Rekonstruksi: posisi teks → bacaan sisipan setelahnya (cocok didahulukan, sama seperti pencarian di atas).
  const insertions = new Map<number, string>();
  let i = 0;
  let j = 0;
  let canInsert = false;
  while (j < annotated.length) {
    if (i < t.length && annotated[j] === t[i] && ok(i + 1, j + 1, isReadingBearing(t[i]))) {
      canInsert = isReadingBearing(t[i]);
      i++;
      j++;
    } else {
      insertions.set(i, (insertions.get(i) ?? '') + annotated[j]);
      j++;
      canInsert = true;
    }
  }
  if (insertions.size === 0) return null;

  const segments: RubySegment[] = [];
  let mismatches = 0;
  let boundary = 0;
  for (const [end, ruby] of [...insertions.entries()].sort((a, b) => a[0] - b[0])) {
    let chosen: FuriganaAlignment | null = null;
    let start = -1;
    for (let s = boundary; s < end; s++) {
      if (!isReadingBearing(t[s])) continue;
      const word = t.slice(s, end).join('');
      const aligned = alignExact(word, ruby, excludeKanji);
      if (aligned && aligned.mismatches === 0) { chosen = aligned; start = s; break; }
    }
    if (!chosen) {
      // Kata tak bisa ditentukan: furigana menutupi run pembawa bacaan terakhir apa adanya.
      start = end - 1;
      while (start > boundary && isReadingBearing(t[start - 1])) start--;
      chosen = { segments: [{ text: t.slice(start, end).join(''), ruby, isKanji: true }], aligned: true, mismatches: 1 };
    }
    for (const ch of t.slice(boundary, start)) segments.push({ text: ch, isKanji: false });
    segments.push(...chosen.segments);
    mismatches += chosen.mismatches;
    boundary = end;
  }
  for (const ch of t.slice(boundary)) {
    // Kanji tanpa anotasi: pakai kamus agar tetap berfurigana.
    segments.push(isKanji(ch) ? { text: ch, ruby: furiganaDict.kanji[ch] || undefined, isKanji: true } : { text: ch, isKanji: false });
  }
  return { segments: mergeNonKanjiSegments(segments), aligned: true, mismatches };
}

/** Kana teks yang boleh tidak cocok dengan bacaan sebelum bacaan dianggap tidak bisa dipercaya. */
function mismatchBudget(japanese: string): number {
  const kana = Array.from(japanese).filter(isKanaLiteral).length;
  return Math.max(1, Math.floor(kana * 0.12));
}

/**
 * Furigana untuk teks + bacaan eksplisit, beserta status penyelarasannya. Bacaan yang tidak bisa diselaraskan
 * (salah ketik berat / bukan bacaan teks ini) tidak dipakai: furigana jatuh ke kamus bawaan.
 */
export function alignFurigana(
  japanese: string,
  reading: string,
  excludeKanji?: Set<string>
): FuriganaAlignment {
  const text = normalizeJapanesePunctuation(japanese);
  const rd = normalizeJapanesePunctuation(reading).trim();
  if (!rd || rd === text) {
    // Tanpa kanji tidak ada yang perlu diselaraskan; dengan kanji, bacaan yang sama dengan teks tidak membantu.
    const hasReadingChars = Array.from(text).some(isReadingBearing);
    return { segments: autoAnnotateFurigana(japanese, excludeKanji), aligned: !hasReadingChars, mismatches: 0 };
  }
  const result = alignAlternatives(text, rd, excludeKanji)
    ?? alignAnnotated(text, rd, excludeKanji)
    ?? alignBestReading(text, rd, excludeKanji);
  if (result && result.mismatches <= mismatchBudget(text)) return result;
  return { segments: autoAnnotateFurigana(japanese, excludeKanji), aligned: false, mismatches: result?.mismatches ?? -1 };
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
  if (!origJapanese) return [];
  if (!origReading) return autoAnnotateFurigana(origJapanese, excludeKanji);
  return alignFurigana(origJapanese, origReading, excludeKanji).segments;
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
