/**
 * Adaptor: item materi aplikasi (KotobaItem/KanjiItem/BunpouItem) -> entitas identitas
 * (src/types/identity.ts). Memberi satu bentuk kanonik untuk graf pengetahuan & sinkronisasi,
 * tanpa mengubah dataset sumber. Relasi dibuat lewat ID, bukan salinan teks
 * (VocabularyEntity.kanjiIds berisi ID kanji, bukan karakter).
 */
import type { KanjiItem, KotobaItem, BunpouItem } from '../types/content';
import type { KanjiEntity, VocabularyEntity, GrammarEntity } from '../types/identity';
import { KANJI_DATABASE } from './kanji';
import { KOTOBA_DATABASE } from './kotoba';
import { BUNPOU_DATABASE } from './bunpou';
import { resolveLegacyId } from './entityIds';

type Jlpt = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

function toJlpt(level: string | undefined): Jlpt | undefined {
  const l = (level || '').toUpperCase();
  return l === 'N5' || l === 'N4' || l === 'N3' || l === 'N2' || l === 'N1' ? l : undefined;
}

const KANJI_RE = /[一-鿿㐀-䶿]/;

export function toKanjiEntity(item: KanjiItem): KanjiEntity {
  return {
    id: item.id,
    character: item.character,
    jlptLevel: toJlpt(item.jlpt),
    strokeCount: item.strokeCount,
    onyomi: item.onyomi || [],
    kunyomi: item.kunyomi || [],
    meanings: [item.meaningId, item.meaningEn].filter(Boolean) as string[],
    meaningId: item.meaningId,
    meaningEn: item.meaningEn,
    radical: item.radical,
    radicalName: item.radicalName,
    status: 'published',
  };
}

export function toVocabularyEntity(item: KotobaItem): VocabularyEntity {
  const chars = item.kanjiComponents?.length ? item.kanjiComponents : Array.from(item.word);
  const kanjiIds: string[] = [];
  for (const ch of chars) {
    if (!KANJI_RE.test(ch)) continue;
    const id = KANJI_DATABASE[ch]?.id;
    if (id && !kanjiIds.includes(id)) kanjiIds.push(id);
  }
  return {
    id: item.id,
    word: item.word,
    reading: item.reading,
    meanings: [item.meaningId, item.meaningEn].filter(Boolean) as string[],
    meaningId: item.meaningId,
    meaningEn: item.meaningEn,
    meaningJa: item.meaningJa,
    partOfSpeech: item.wordType ? [item.wordType] : [],
    jlptLevel: toJlpt(item.jlpt),
    kanjiIds,
    kanaOnly: !Array.from(item.word).some(c => KANJI_RE.test(c)),
    collocations: item.collocations,
    tags: item.tags,
    status: 'published',
  };
}

export function toGrammarEntity(item: BunpouItem): GrammarEntity {
  return {
    id: item.id,
    pattern: item.title,
    name: item.title,
    formula: item.formula,
    meaningId: item.meaningId,
    meaningEn: item.meaningEn,
    explanationNote: item.explanation,
    jlptLevel: toJlpt(item.level) ?? 'N5',
    functions: item.functions,
    nuance: item.nuance,
    relatedKeywords: item.relatedKeywords,
    status: 'published',
  };
}

export type IdentityEntity =
  | { type: 'kanji'; entity: KanjiEntity }
  | { type: 'vocabulary'; entity: VocabularyEntity }
  | { type: 'grammar'; entity: GrammarEntity };

/** Cari entitas identitas dari kategori aplikasi + ID (alias lama / karakter kanji diterima). */
export function getIdentityEntity(category: 'kotoba' | 'kanji' | 'bunpou', id: string): IdentityEntity | null {
  if (category === 'kanji') {
    const item = KANJI_DATABASE[id];
    return item ? { type: 'kanji', entity: toKanjiEntity(item) } : null;
  }
  if (category === 'kotoba') {
    const item = KOTOBA_DATABASE[id];
    return item ? { type: 'vocabulary', entity: toVocabularyEntity(item) } : null;
  }
  const item = BUNPOU_DATABASE[resolveLegacyId(id)];
  return item ? { type: 'grammar', entity: toGrammarEntity(item) } : null;
}
