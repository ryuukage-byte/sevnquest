// Bunpou Search & Formula Query Matcher Utility
// Supports searching grammar patterns by:
// 1. Formula with variants (e.g. "Vる + ように", "Vない+ように", "Vれる ように", "Vている", "Vて ＋ いる", "Vとく")
// 2. Canonical pattern title (e.g. "〜ように", "~ように", "ように", "〜れる・〜られる")
// 3. Romaji readings (e.g. "you ni", "te iru", "mitai da", "koto ni suru")
// 4. Meaning in Indonesian or English (e.g. "supaya", "agar", "kebiasaan", "passive")
// 5. Function tags & nuance (e.g. "推測", "dugaan", "perumpamaan")
// 6. Sub-formula rules & condition combinations (e.g. "N みたいに", "na ＋ みたいだ")

import { BunpouItem } from '../types/content';
import { getCanonicalGrammarTitle } from './bunpouTitleUtils';
import * as wanakana from 'wanakana';

/**
 * Normalizes text by standardizing fullwidth/halfwidth characters,
 * operators, tildes, and whitespace.
 */
function normalizeSearchStr(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[〜～~]/g, '') // remove tildes so "~ように", "〜ように" and "ように" match identically
    .replace(/[\uFF0B+]/g, ' + ') // fullwidth ＋ to halfwidth +
    .replace(/[\uFF0F/]/g, ' / ') // fullwidth ／ to halfwidth /
    .replace(/[（(]/g, ' ')
    .replace(/[）)]/g, ' ')
    .replace(/[\u3000\s]+/g, ' ') // fullwidth space to standard space
    .trim();
}

/**
 * Strips all spaces, punctuation, and operators for compact string matching.
 * e.g. "Vる／Vない／Vれる ＋ ように" → "vるvないvれるように"
 * e.g. "Vる + ように" → "vるように"
 * e.g. "Vて ＋ いる" → "vている"
 */
function toCompactStr(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s+＋/／~～〜()（）\[\]【】・、，,.:;'"\-_]/g, '');
}

/**
 * Evaluates whether a BunpouItem matches the search query.
 */
export function matchBunpouItem(item: BunpouItem, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const q = rawQuery.trim().toLowerCase();
  const normQ = normalizeSearchStr(rawQuery);
  const compactQ = toCompactStr(rawQuery);

  const canonicalTitle = getCanonicalGrammarTitle(item);
  const normCanonicalTitle = normalizeSearchStr(canonicalTitle);
  const compactCanonicalTitle = toCompactStr(canonicalTitle);

  const normTitle = normalizeSearchStr(item.title);
  const compactTitle = toCompactStr(item.title);

  const normFormula = normalizeSearchStr(item.formula || '');
  const compactFormula = toCompactStr(item.formula || '');

  const normReading = normalizeSearchStr(item.reading || '');
  const compactReading = toCompactStr(item.reading || '');

  const normMeaningId = (item.meaningId || '').toLowerCase();
  const normMeaningEn = (item.meaningEn || '').toLowerCase();

  // 1. Direct or normalized substring match
  if (
    item.title.toLowerCase().includes(q) ||
    canonicalTitle.toLowerCase().includes(q) ||
    normCanonicalTitle.includes(normQ) ||
    normTitle.includes(normQ) ||
    normFormula.includes(normQ) ||
    normReading.includes(normQ) ||
    normMeaningId.includes(q) ||
    normMeaningEn.includes(q)
  ) {
    return true;
  }

  // 2. Compact string match (handles space/punctuation variations like "Vている" vs "Vて ＋ いる")
  if (compactQ.length >= 2) {
    if (
      compactFormula.includes(compactQ) ||
      compactTitle.includes(compactQ) ||
      compactCanonicalTitle.includes(compactQ) ||
      compactReading.includes(compactQ)
    ) {
      return true;
    }
  }

  // 3. Romaji-to-Kana query matching (e.g. "you ni" -> "ように", "hazu da" -> "はずだ")
  const qKana = wanakana.toHiragana(normQ, { IMEMode: true });
  const compactQKana = toCompactStr(qKana);
  if (compactQKana.length >= 2) {
    if (
      normCanonicalTitle.includes(qKana) ||
      normTitle.includes(qKana) ||
      normFormula.includes(qKana) ||
      normReading.includes(qKana) ||
      compactCanonicalTitle.includes(compactQKana) ||
      compactTitle.includes(compactQKana) ||
      compactFormula.includes(compactQKana) ||
      compactReading.includes(compactQKana)
    ) {
      return true;
    }
  }

  // 3. Multi-token / tokenized query match
  // e.g. "Vる + ように" → tokens ["vる", "ように"]
  // e.g. "vない ように" → tokens ["vない", "ように"]
  // e.g. "te iru" → tokens ["te", "iru"]
  const tokens = q
    .split(/[\s+＋/／~～〜()（）\[\]【】・,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (tokens.length > 1) {
    // Build aggregated corpus for this item
    const subFormulaTokens: string[] = [];
    if (item.subFormulas) {
      item.subFormulas.forEach(sub => {
        subFormulaTokens.push(sub.token);
        subFormulaTokens.push(sub.meaning);
        if (sub.connectionConditions) {
          sub.connectionConditions.forEach(cond => {
            subFormulaTokens.push(cond.rule);
            if (cond.example) subFormulaTokens.push(cond.example);
          });
        }
      });
    }

    const functionsText = (item.functions || []).join(' ');
    const keywordsText = (item.relatedKeywords || []).join(' ');

    const corpus = [
      item.title,
      canonicalTitle,
      item.formula || '',
      item.reading || '',
      item.meaningId || '',
      item.meaningEn || '',
      functionsText,
      keywordsText,
      subFormulaTokens.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    // Check if EVERY token is satisfied
    const allTokensMatch = tokens.every(tok => {
      const compactTok = toCompactStr(tok);
      if (!compactTok) return true;
      return corpus.includes(tok) || toCompactStr(corpus).includes(compactTok);
    });

    if (allTokensMatch) return true;
  }

  // 4. Function categories check
  if (item.functions && item.functions.some(fn => fn.toLowerCase().includes(q))) {
    return true;
  }

  // 5. Related keywords check
  if (item.relatedKeywords && item.relatedKeywords.some(kw => kw.toLowerCase().includes(q))) {
    return true;
  }

  // 6. Sub-formula conditions check
  if (item.subFormulas) {
    for (const sub of item.subFormulas) {
      if (
        sub.token.toLowerCase().includes(q) ||
        normalizeSearchStr(sub.token).includes(normQ) ||
        toCompactStr(sub.token).includes(compactQ)
      ) {
        return true;
      }
      if (sub.connectionConditions) {
        for (const cond of sub.connectionConditions) {
          if (
            cond.rule.toLowerCase().includes(q) ||
            normalizeSearchStr(cond.rule).includes(normQ) ||
            toCompactStr(cond.rule).includes(compactQ)
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}
