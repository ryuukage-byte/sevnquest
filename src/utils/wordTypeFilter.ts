// Filter kategori jenis kata (wordType) untuk mode arcade kotoba.

export type WordCategoryId =
  | 'NOUN'
  | 'VERB'
  | 'ADJECTIVE'
  | 'ADVERB'
  | 'EXPRESSION'
  | 'OTHER';

export interface WordCategory {
  id: WordCategoryId;
  label: string;
  desc: string;
  types: string[];
}

export const WORD_CATEGORIES: WordCategory[] = [
  { id: 'NOUN', label: 'Kata Benda', desc: 'Nomina, pronomina, angka, counter', types: ['noun', 'pronoun', 'numeral', 'counter'] },
  { id: 'VERB', label: 'Kata Kerja', desc: 'Verba', types: ['verb'] },
  { id: 'ADJECTIVE', label: 'Kata Sifat', desc: 'Adjektiva-i, -na, dan rentaishi', types: ['adjective-i', 'adjective-na', 'adjective-pn'] },
  { id: 'ADVERB', label: 'Kata Keterangan', desc: 'Adverbia', types: ['adverb'] },
  { id: 'EXPRESSION', label: 'Ungkapan', desc: 'Ekspresi dan kata seru', types: ['expression', 'interjection'] },
  { id: 'OTHER', label: 'Kata Lainnya', desc: 'Konjungsi, partikel, awalan, akhiran', types: ['conjunction', 'particle', 'suffix', 'prefix', 'auxiliary'] },
];

const TYPE_TO_CATEGORY: Record<string, WordCategoryId> = {};
WORD_CATEGORIES.forEach(c => c.types.forEach(t => { TYPE_TO_CATEGORY[t] = c.id; }));

export function getWordCategory(item: { wordType?: string }): WordCategoryId | null {
  return (item.wordType && TYPE_TO_CATEGORY[item.wordType]) || null;
}

/** Set kosong = semua kategori (tanpa filter). */
export function filterByWordCategories<T extends { wordType?: string }>(
  pool: T[],
  selected: ReadonlySet<WordCategoryId>
): T[] {
  if (selected.size === 0) return pool;
  return pool.filter(item => {
    const cat = getWordCategory(item);
    return cat !== null && selected.has(cat);
  });
}

export function countByWordCategory<T extends { wordType?: string }>(
  pool: T[]
): Record<WordCategoryId, number> {
  const counts: Record<WordCategoryId, number> = {
    NOUN: 0, VERB: 0, ADJECTIVE: 0, ADVERB: 0, EXPRESSION: 0, OTHER: 0,
  };
  for (const item of pool) {
    const cat = getWordCategory(item);
    if (cat) counts[cat]++;
  }
  return counts;
}

export const MIN_POOL_SIZE = 4;

export function wordCategoryLabel(selected: ReadonlySet<WordCategoryId>): string {
  if (selected.size === 0) return 'Semua Kategori';
  return WORD_CATEGORIES.filter(c => selected.has(c.id)).map(c => c.label).join(', ');
}
