// Pool kata kerja untuk Latihan Bebas: seluruh kotoba berjenis verb + kamus konjugasi bawaan.
import { KOTOBA_DATABASE } from '../kotoba';
import { VERB_CONJUGATION_DATABASE } from '../conjugationRules';
import { PATTERN_SCHEMAS } from '../../engine/syntax/patternSchemas';
import { LIBRARY_PATTERN_SCHEMAS } from '../libraryPatterns';
import type { GrammarPatternSchema } from '../../engine/types';
import type { FusionBaseWord } from '../../engine/fusion/types';

export interface FusionVerbEntry extends FusionBaseWord {
  id: string;
  level: string;
}

/** Ambil penulisan/bacaan pertama dari "作る/造る" atau "見る / 観る". */
const firstVariant = (t: string) => t.trim().split(/\s*[/／、,]\s*/)[0].trim();

let verbCache: FusionVerbEntry[] | null = null;

export function getFusionVerbs(): FusionVerbEntry[] {
  if (verbCache) return verbCache;
  const seen = new Set<string>();
  const out: FusionVerbEntry[] = [];
  const add = (e: FusionVerbEntry) => {
    const key = `${e.japanese}|${e.reading}`;
    if (!e.japanese || !e.reading || seen.has(key)) return;
    seen.add(key);
    out.push(e);
  };
  for (const k of Object.values(KOTOBA_DATABASE)) {
    if (k.wordType !== 'verb') continue;
    add({ id: k.id, japanese: firstVariant(k.word), reading: firstVariant(k.reading || k.word), meaning: (k.meaningId || k.meaningEn || '').toLowerCase(), level: k.jlpt || 'N5' });
  }
  for (const v of VERB_CONJUGATION_DATABASE) {
    add({ id: v.id, japanese: firstVariant(v.kanji), reading: firstVariant(v.reading), meaning: (v.meaningId || '').toLowerCase(), level: (v as { level?: string }).level || 'N5' });
  }
  verbCache = out;
  return out;
}

export function getFusionPatterns(): GrammarPatternSchema[] {
  return [...Object.values(PATTERN_SCHEMAS), ...LIBRARY_PATTERN_SCHEMAS];
}
