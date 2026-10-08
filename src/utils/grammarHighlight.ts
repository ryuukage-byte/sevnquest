// Grammar Formula Highlighter Utility
// Identifies the substring in an example sentence that corresponds to the grammar rule/formula.

import { BunpouItem } from '../types/content';

export interface GrammarSpan {
  start: number;
  end: number;
  matched: string;
}

export interface HighlightedSegment {
  text: string;
  isHighlight: boolean;
}

/**
 * Finds the substring in a Japanese sentence that matches the grammar pattern.
 */
function findGrammarSpan(japanese: string, item: BunpouItem): GrammarSpan | null {
  if (!japanese || !item) return null;

  const f = item.formula || '';
  const t = item.title || '';

  // Particle-safe verb stem pattern to avoid swallowing preceding topic/subject clauses (e.g. "今日は")
  const VERB_STEM = '[^はがをにもへでとからまで、。！？\\s]+?';

  // 1. High-priority Key Connectors & Suffixes
  const keyConnectors: { target: string; pattern: RegExp }[] = [
    { target: 'ようにする', pattern: /(?:ように(?:する|します|した|しました|しましょう|しない|してください))/ },
    { target: 'ようになる', pattern: /(?:ように(?:なる|なります|なった|なりました|ならない|なって))/ },
    { target: 'ように。', pattern: /(?:ように[。！]?$|ように(?:言う|頼む))/ },
    { target: 'ように', pattern: /(?:ように)/ },
    { target: 'と思う', pattern: new RegExp('(' + VERB_STEM + '(?:[おこごそぞとのぼぽもろよ]う|よう)と(?:思う|思います|思っている|と思っています|と思った|思いました))') },
    { target: 'とする', pattern: new RegExp('(' + VERB_STEM + '(?:[おこごそぞとのぼぽもろよ]う|よう)と(?:する|します|した|しました|して|している))') },
    { target: 'としない', pattern: new RegExp('(' + VERB_STEM + '(?:[おこごそぞとのぼぽもろよ]う|よう)と(?:しない|しません|しなかった|しないで))') },
    { target: 'みたいだ', pattern: /(?:みたい(?:だ|に|な|だった|で)?)/ },
    { target: 'らしい', pattern: /(?:らしい(?:です|かった|く)?)/ },
    { target: 'っぽい', pattern: /(?:っぽい(?:です|かった|く)?)/ },
    { target: 'ばかり', pattern: /(?:ばかり(?:だ|の|で|いる|います|いた)?)/ },
    { target: 'だけしか', pattern: /(?:だけしか)/ },
    { target: 'さえ', pattern: /(?:さえ)/ },
    { target: 'こそ', pattern: /(?:こそ)/ },
    { target: 'に関して', pattern: /(?:に関(?:して|しては|しても|する))/ },
    { target: 'について', pattern: /(?:につい(?:て|ての|ては|ても))/ },
    { target: 'によれば', pattern: /(?:によ(?:れば|ると))/ },
    { target: 'によって', pattern: /(?:によ(?:って|っては|り|る))/ },
    { target: 'わけ', pattern: /(?:わけ(?:だ|ではない|じゃない|がない|にはいかない))/ },
    { target: 'こと', pattern: /(?:こと(?:になる|になった|にする|にした|になっている|だ))/ },
    { target: 'ごらん', pattern: /(?:てごらん(?:なさい)?)/ },
  ];

  for (const kc of keyConnectors) {
    if (f.includes(kc.target) || t.includes(kc.target)) {
      const m = japanese.match(kc.pattern);
      if (m && m.index !== undefined) {
        return { start: m.index, end: m.index + m[0].length, matched: m[0] };
      }
    }
  }

  // 2. Auxiliary Verb Inflexions & Conjugations
  // Passive (受身形)
  if (f.includes('れる') || t.includes('受身') || f.includes('受身')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:れる|れます|れた|れました|れない|れなくて|れて|られる|られます|られた|られました|られない|られて)(?:いる|います|いた|いました|しまった|しまいました)?)'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // Causative (使役形)
  if (f.includes('せて') || t.includes('させて') || f.includes('させる') || t.includes('使役')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:させて|せて)(?:ください|もらえる|もらえますか|もらえませんか|いただく|いただけますか)?)'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // Chau / Jau (〜ちゃう / 〜じゃう)
  if (f.includes('ちゃう') || t.includes('ちゃう') || f.includes('じゃう') || t.includes('じゃう')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:ちゃう|ちゃった|ちゃおう|ちゃいます|じゃう|じゃった|じゃおう|じゃいます))'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // Toku / Doku (〜とく / 〜どく)
  if (f.includes('とく') || t.includes('とく') || f.includes('どく') || t.includes('どく')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:とく|とこう|といた|どく|どこう|どいた))'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // Naito / Nakucha (〜ないと / 〜なくちゃ)
  if (f.includes('ないと') || t.includes('ないと') || f.includes('なくちゃ') || t.includes('なくちゃ')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:ないと|なくちゃ|なきゃ))'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // Te-iru (〜ている)
  if (f.includes('ている') || t.includes('ている')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:て|で)(?:いる|います|いた|いました|いない|いなかった|いて))'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // Te-aru (〜てある)
  if (f.includes('てある') || t.includes('てある')) {
    const m = japanese.match(new RegExp('(' + VERB_STEM + '(?:て|で)(?:ある|あります|あった|ありました))'));
    if (m && m.index !== undefined) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // 3. Match from Sub-Formula Branches if available
  if (item.subFormulas && item.subFormulas.length > 0) {
    for (const sf of item.subFormulas) {
      if (sf.token && sf.token.length >= 2 && japanese.includes(sf.token)) {
        const idx = japanese.indexOf(sf.token);
        return { start: idx, end: idx + sf.token.length, matched: sf.token };
      }
    }
  }

  // 4. Match N5/N4 suffix titles starting with 〜 or ～ (e.g. 〜方, 〜やすい, 〜にくい, 〜すぎる)
  const suffixMatch = t.match(/^[〜～]([ぁ-ん一-龠々]+)/);
  if (suffixMatch) {
    const sfx = suffixMatch[1];
    const regex = new RegExp('([一-龠々ぁ-ん]*?' + sfx + '(?:です|だ|だった|ます|ました|ない)?)');
    const m = japanese.match(regex);
    if (m && m.index !== undefined && m[0].length > 0) {
      return { start: m.index, end: m.index + m[0].length, matched: m[0] };
    }
  }

  // 5. Match keyword from original title before parenthesis (e.g. "大きさ", "苦しみ")
  if (t.includes('（')) {
    const beforeParen = t.split('（')[0].trim();
    if (beforeParen.length >= 2 && japanese.includes(beforeParen)) {
      const idx = japanese.indexOf(beforeParen);
      return { start: idx, end: idx + beforeParen.length, matched: beforeParen };
    }
  }

  return null;
}

/**
 * Splits Japanese text into segments for subtle highlighting.
 */
export function splitSentenceForHighlight(
  japanese: string,
  item: BunpouItem
): HighlightedSegment[] {
  if (!japanese) return [];

  const span = findGrammarSpan(japanese, item);
  if (!span) {
    return [{ text: japanese, isHighlight: false }];
  }

  const segments: HighlightedSegment[] = [];
  if (span.start > 0) {
    segments.push({
      text: japanese.slice(0, span.start),
      isHighlight: false,
    });
  }

  segments.push({
    text: japanese.slice(span.start, span.end),
    isHighlight: true,
  });

  if (span.end < japanese.length) {
    segments.push({
      text: japanese.slice(span.end),
      isHighlight: false,
    });
  }

  return segments;
}
