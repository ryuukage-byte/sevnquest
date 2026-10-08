import type { KotobaItem } from '../types/content';

export type WordType = KotobaItem['wordType'];

/** Label tampilan (Indonesia + istilah Jepang) untuk tiap jenis kata hasil klasifikasi JMdict. */
const WORD_TYPE_LABELS: Record<WordType, { id: string; jp: string }> = {
  noun: { id: 'Kata Benda', jp: '名詞' },
  verb: { id: 'Kata Kerja', jp: '動詞' },
  'adjective-i': { id: 'Kata Sifat -i', jp: 'い形容詞' },
  'adjective-na': { id: 'Kata Sifat -na', jp: 'な形容詞' },
  'adjective-pn': { id: 'Kata Penjelas Benda', jp: '連体詞' },
  adverb: { id: 'Kata Keterangan', jp: '副詞' },
  conjunction: { id: 'Kata Sambung', jp: '接続詞' },
  particle: { id: 'Partikel', jp: '助詞' },
  pronoun: { id: 'Kata Ganti', jp: '代名詞' },
  counter: { id: 'Kata Bantu Bilangan', jp: '助数詞' },
  numeral: { id: 'Angka', jp: '数詞' },
  interjection: { id: 'Kata Seru', jp: '感動詞' },
  expression: { id: 'Ungkapan', jp: '表現' },
  prefix: { id: 'Awalan', jp: '接頭辞' },
  suffix: { id: 'Akhiran', jp: '接尾辞' },
  auxiliary: { id: 'Kata Bantu', jp: '助動詞' },
};

export function getWordTypeLabel(type?: string | null): string {
  if (!type) return '';
  return WORD_TYPE_LABELS[type as WordType]?.id ?? type;
}

export function getWordTypeLabelJp(type?: string | null): string {
  if (!type) return '';
  return WORD_TYPE_LABELS[type as WordType]?.jp ?? '';
}
