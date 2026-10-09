// Pool kata kerja untuk Latihan Bebas: seluruh kotoba berjenis verb + kamus konjugasi bawaan.
import { KOTOBA_DATABASE } from '../kotoba';
import { VERB_CONJUGATION_DATABASE } from '../conjugationRules';
import { PATTERN_SCHEMAS } from '../../engine/syntax/patternSchemas';
import { LIBRARY_PATTERN_SCHEMAS_EXTENDED } from '../libraryPatterns';
import type { GrammarPatternSchema } from '../../engine/types';
import type { FusionBaseWord, FusionWordKind } from '../../engine/fusion/types';

/** Entri kotoba untuk Grammar Fusion: kata kerja, kata benda, atau kata sifat (nama lama dipertahankan). */
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
    add({ id: k.id, japanese: firstVariant(k.word), reading: firstVariant(k.reading || k.word), meaning: (k.meaningId || k.meaningEn || '').toLowerCase(), level: k.jlpt || 'N5', kind: 'verb' });
  }
  for (const v of VERB_CONJUGATION_DATABASE) {
    add({ id: v.id, japanese: firstVariant(v.kanji), reading: firstVariant(v.reading), meaning: (v.meaningId || '').toLowerCase(), level: (v as { level?: string }).level || 'N5', kind: 'verb' });
  }
  verbCache = out;
  return out;
}

const KANA_ONLY = /^[\u3040-\u30ffー]+$/;
const JP_ONLY = /^[\u3040-\u30ff\u4e00-\u9fff々ー]+$/;
const KOTOBA_KIND: Record<Exclude<FusionWordKind, 'verb'>, string> = { noun: 'noun', 'adjective-i': 'adjective-i', 'adjective-na': 'adjective-na' };
const wordCache: Partial<Record<FusionWordKind, FusionVerbEntry[]>> = {};

/** Kata kerja / kata benda / kata sifat-i / kata sifat-na yang bisa dipakai sebagai kata dasar. */
export function getFusionWords(kind: FusionWordKind): FusionVerbEntry[] {
  if (kind === 'verb') return getFusionVerbs();
  const cached = wordCache[kind];
  if (cached) return cached;
  const seen = new Set<string>();
  const out: FusionVerbEntry[] = [];
  for (const k of Object.values(KOTOBA_DATABASE)) {
    if (k.wordType !== KOTOBA_KIND[kind]) continue;
    const japanese = firstVariant(k.word);
    // Bacaan kosong hanya boleh bila kata itu sendiri sudah kana; kata kanji tanpa bacaan dilewati.
    const reading = firstVariant(k.reading || '') || (KANA_ONLY.test(japanese) ? japanese : '');
    if (!JP_ONLY.test(japanese) || !reading || seen.has(`${japanese}|${reading}`)) continue;
    seen.add(`${japanese}|${reading}`);
    out.push({ id: k.id, japanese, reading, meaning: (k.meaningId || k.meaningEn || '').toLowerCase(), level: k.jlpt || 'N5', kind });
  }
  wordCache[kind] = out;
  return out;
}

export function getFusionPatterns(): GrammarPatternSchema[] {
  return [...Object.values(PATTERN_SCHEMAS), ...LIBRARY_PATTERN_SCHEMAS_EXTENDED];
}
