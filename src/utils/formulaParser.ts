// Formula Parser Utility
// Tokenizes raw formula strings into structured, renderable token objects
// for the interactive formula display system.

import {
  findPatternBySymbol,
  findConnectorByToken,
  findAuxiliaryByToken,
} from '../data/conjugationBank';

export interface FormulaToken {
  text: string;
  type: 'pattern' | 'auxiliary' | 'connector' | 'separator' | 'literal';
  linkedPatternId?: string;
  linkedType?: 'conjugation' | 'auxiliary' | 'connector';
}

/**
 * Remove parenthetical labels from formula text.
 * e.g. "Vれる（受身形）" → "Vれる"
 * Handles both fullwidth （） and halfwidth () parentheses.
 */
function stripParentheticalLabels(text: string): string {
  // Remove fullwidth parentheses content: （...）
  let result = text.replace(/（[^）]*）/g, '');
  // Remove halfwidth parentheses content that looks like a label
  // but keep functional parentheses like (さ) in V(さ)せて
  result = result.replace(/\((?!さ\))[^)]{2,}\)/g, '');
  return result.trim();
}

/**
 * Known separator characters in formulas
 */
const SEPARATORS = ['＋', '／', '→', '；', '・'];

/**
 * Try to identify what kind of token a text fragment is
 * and link it to the conjugation bank or auxiliary inflection bank.
 */
function classifyToken(text: string): FormulaToken[] {
  const trimmed = text.trim();

  if (!trimmed) {
    return [{ text: '', type: 'literal' }];
  }

  // Check if it's a separator
  if (SEPARATORS.includes(trimmed)) {
    return [{ text: trimmed, type: 'separator' }];
  }

  // Try to match as a verb/adjective conjugation pattern
  // Check for V-prefixed patterns
  if (/^[VAN]/.test(trimmed) || /^na/.test(trimmed) || /^\[文\]/.test(trimmed)) {
    // Extract the core verb form symbol for matching
    const matchResult = matchVerbPattern(trimmed);
    if (matchResult) {
      const [patternId, matchedText] = matchResult;
      const tokens: FormulaToken[] = [{
        text: matchedText,
        type: 'pattern',
        linkedPatternId: patternId,
        linkedType: 'conjugation',
      }];
      
      const remainder = trimmed.slice(matchedText.length).trim();
      if (remainder.length > 0) {
        // Recursively classify the remainder (e.g. "いる" after "Vて", or "おく" after "Vて")
        tokens.push(...classifyToken(remainder));
      }
      return tokens;
    }
  }

  // Check if it's an auxiliary sentence-ending verb (e.g. いる, ある, おく, しまう, みる, ください, れる, せる)
  const auxId = findAuxiliaryByToken(trimmed);
  if (auxId) {
    return [{
      text: trimmed,
      type: 'auxiliary',
      linkedPatternId: auxId,
      linkedType: 'auxiliary',
    }];
  }

  // Try to match as a grammar connector
  const connectorId = findConnectorByToken(trimmed);
  if (connectorId) {
    return [{
      text: trimmed,
      type: 'connector',
      linkedPatternId: connectorId,
      linkedType: 'connector',
    }];
  }

  // Try pattern match again with broader rules
  const broadMatchResult = matchVerbPatternBroad(trimmed);
  if (broadMatchResult) {
    const [patternId, matchedText] = broadMatchResult;
    const tokens: FormulaToken[] = [{
      text: matchedText,
      type: 'pattern',
      linkedPatternId: patternId,
      linkedType: 'conjugation',
    }];
    
    const remainder = trimmed.slice(matchedText.length).trim();
    if (remainder.length > 0) {
      tokens.push(...classifyToken(remainder));
    }
    return tokens;
  }

  // Unrecognized — treat as literal
  return [{ text: trimmed, type: 'literal' }];
}

/**
 * Match a token text to a known verb conjugation pattern.
 */
function matchVerbPattern(text: string): [string, string] | undefined {

  // Direct symbol matches from bank
  const directMatch = findPatternBySymbol(text);
  if (directMatch) return [directMatch, text];

  // Pattern-specific matching rules
  const matchRules: [RegExp, string][] = [
    // Passive forms
    [/^V[（(]?さ[）)]?せて/, 'shieki_te'],
    [/^V[（(]?さ[）)]?せ/, 'shieki'],
    [/^Vれる/, 'ukemi'],
    // Verb forms
    [/^Vます$/, 'masu'],
    [/^Vます/, 'masu'],
    [/^Vて$/, 'te_kei'],
    [/^Vて/, 'te_kei'],
    [/^Vで$/, 'te_kei_voiced'],
    [/^Vで/, 'te_kei_voiced'],
    [/^Vない/, 'nai'],
    [/^Vた$/, 'ta'],
    [/^Vた/, 'ta'],
    [/^Vよう/, 'ikou'],
    [/^Vば$/, 'ba'],
    [/^Vば/, 'ba'],
    [/^V命令形/, 'meirei'],
    [/^Vずに/, 'zu'],
    [/^Vず$/, 'zu'],
    [/^Vる$/, 'jisho'],
    [/^Vる[^な]/, 'jisho'],
    [/^Vるな/, 'jisho'], // Prohibition uses dictionary form
    // Noun/Adj patterns
    [/^Aい/, 'adj_i'],
    [/^Aく/, 'adj_i'],
    [/^Aかった/, 'adj_i'],
    [/^Aければ/, 'adj_i'],
    [/^A（い→/, 'adj_i'],
    [/^A$/, 'adj_i'],
    [/^naな/, 'adj_na'],
    [/^naだ/, 'adj_na'],
    [/^naで/, 'adj_na'],
    [/^naさ/, 'adj_na'],
    [/^naみ/, 'adj_na'],
    [/^naならば/, 'adj_na'],
    [/^naである/, 'adj_na'],
    [/^na$/, 'adj_na'],
    [/^N[のにで１２]/, 'noun'],
    [/^Nである/, 'noun'],
    [/^Nだった/, 'noun'],
    [/^N[（(]/, 'noun'],
    [/^N$/, 'noun'],
    [/^N\d/, 'noun'],
  ];

  for (const [regex, patternId] of matchRules) {
    const match = text.match(regex);
    if (match) return [patternId, match[0]];
  }

  return undefined;
}

/**
 * Broader pattern matching for compound/less common forms
 */
function matchVerbPatternBroad(text: string): [string, string] | undefined {
  const cleaned = text.replace(/\s+/g, '');

  if (/^V/.test(cleaned)) {
    // Any V-prefixed token that wasn't caught — try to identify
    if (/ません$/.test(cleaned)) return ['masu', text.match(/^V[^ ]*ません/)?.[0] || 'V'];
    if (/れます$/.test(cleaned)) return ['kano', text.match(/^V[^ ]*れます/)?.[0] || 'V'];
    if (/^V$/.test(cleaned)) return ['jisho', 'V'];
    // If we don't recognize it, DO NOT blindly split the 'V' off
    // returning undefined allows it to stay as one literal token (like Vちゃう)
    return undefined;
  }
  if (/^A$/.test(cleaned)) return ['adj_i', 'A'];
  if (/^na$/.test(cleaned)) return ['adj_na', 'na'];
  if (/^N$/.test(cleaned)) return ['noun', 'N'];

  return undefined;
}

/**
 * Parse a formula string into a list of renderable tokens.
 *
 * Handles patterns like:
 * - "Vれる（受身形）" → [{text: "Vれる", type: "pattern", ...}]
 * - "Vよう ＋ とする" → [{text: "Vよう", ...}, {text: "＋", type: "separator"}, {text: "とする", ...}]
 * - "Vる／Vない ＋ ようにする" → multiple tokens
 * - "Vて→Vちゃう ／ V で→Vじゃう" → multiple tokens with separators
 */
export function parseFormula(formula: string): FormulaToken[] {
  if (!formula || !formula.trim()) {
    return [{ text: formula || '', type: 'literal' }];
  }

  // Step 1: Strip parenthetical labels
  const cleaned = stripParentheticalLabels(formula);

  // Step 2: Split on separators while keeping them
  // Split on: ＋ ／ → ； ・ (with surrounding spaces)
  const parts = cleaned.split(/(\s*[＋／→；・]\s*)/);

  const tokens: FormulaToken[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check if this part is just a separator
    const sepMatch = trimmed.match(/^([＋／→；・])$/);
    if (sepMatch) {
      tokens.push({ text: ` ${sepMatch[1]} `, type: 'separator' });
      continue;
    }

    // This part might contain sub-tokens separated by ・ or spaces
    // But first try to classify the whole thing
    const wholeTokens = classifyToken(trimmed);
    if (wholeTokens.length > 1 || wholeTokens[0].type !== 'literal' || trimmed.length <= 3) {
      tokens.push(...wholeTokens);
      continue;
    }

    // For longer literals, try splitting by spaces to find sub-tokens
    const subParts = trimmed.split(/\s+/);
    if (subParts.length > 1) {
      for (const sub of subParts) {
        if (!sub.trim()) continue;
        tokens.push(...classifyToken(sub.trim()));
      }
    } else {
      tokens.push(...wholeTokens);
    }
  }

  // Filter out empty tokens
  return tokens.filter(t => t.text.trim() !== '');
}


/**
 * Splits a composite formula string into distinct variants.
 * Handles " / " or newlines as variant delimiters, but respects nested
 * parentheses and brackets so expressions like "(~らしい / ようだ / みたいだ)"
 * are not incorrectly split.
 */
export function splitFormulaVariants(formula: string): string[] {
  if (!formula) return [];
  const results: string[] = [];
  let current = '';
  let depthParen = 0;
  let depthBracket = 0;

  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];
    if (char === '(' || char === '（') depthParen++;
    else if (char === ')' || char === '）') depthParen = Math.max(0, depthParen - 1);
    else if (char === '[' || char === '【') depthBracket++;
    else if (char === ']' || char === '】') depthBracket = Math.max(0, depthBracket - 1);

    // Check if we hit " / " at root depth
    if (depthParen === 0 && depthBracket === 0 && formula.slice(i, i + 3) === ' / ') {
      if (current.trim()) results.push(current.trim());
      current = '';
      i += 2; // skip " /"
      continue;
    }

    if (char === '\n' && depthParen === 0 && depthBracket === 0) {
      if (current.trim()) results.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    results.push(current.trim());
  }

  return results.length > 0 ? results : [formula];
}
