// ==============================================================================
// TOWER 1 — TABEL KANA (satu sumber untuk semua lantai aksara)
// Romaji = Hepburn. Hanya dipakai sebagai alat bantu bunyi di lantai awal.
// ==============================================================================

import { toKatakana } from 'wanakana';

export interface KanaCell {
  /** Hiragana. */
  k: string;
  /** Romaji. */
  r: string;
}

export interface KanaRow {
  id: string;
  label: string;
  cells: KanaCell[];
}

const cells = (pairs: string): KanaCell[] =>
  pairs.split(' ').map(p => {
    const [k, r] = p.split(':');
    return { k, r };
  });

export const ROW_A = { id: 'a', label: 'Baris A', cells: cells('あ:a い:i う:u え:e お:o') } satisfies KanaRow;
export const ROW_KA = { id: 'ka', label: 'Baris K', cells: cells('か:ka き:ki く:ku け:ke こ:ko') } satisfies KanaRow;
export const ROW_SA = { id: 'sa', label: 'Baris S', cells: cells('さ:sa し:shi す:su せ:se そ:so') } satisfies KanaRow;
export const ROW_TA = { id: 'ta', label: 'Baris T', cells: cells('た:ta ち:chi つ:tsu て:te と:to') } satisfies KanaRow;
export const ROW_NA = { id: 'na', label: 'Baris N', cells: cells('な:na に:ni ぬ:nu ね:ne の:no') } satisfies KanaRow;
export const ROW_HA = { id: 'ha', label: 'Baris H', cells: cells('は:ha ひ:hi ふ:fu へ:he ほ:ho') } satisfies KanaRow;
export const ROW_MA = { id: 'ma', label: 'Baris M', cells: cells('ま:ma み:mi む:mu め:me も:mo') } satisfies KanaRow;
export const ROW_YA = { id: 'ya', label: 'Baris Y', cells: cells('や:ya ゆ:yu よ:yo') } satisfies KanaRow;
export const ROW_RA = { id: 'ra', label: 'Baris R', cells: cells('ら:ra り:ri る:ru れ:re ろ:ro') } satisfies KanaRow;
export const ROW_WA = { id: 'wa', label: 'W + ん', cells: cells('わ:wa を:o ん:n') } satisfies KanaRow;

export const ROW_GA = { id: 'ga', label: 'Baris G', cells: cells('が:ga ぎ:gi ぐ:gu げ:ge ご:go') } satisfies KanaRow;
export const ROW_ZA = { id: 'za', label: 'Baris Z', cells: cells('ざ:za じ:ji ず:zu ぜ:ze ぞ:zo') } satisfies KanaRow;
export const ROW_DA = { id: 'da', label: 'Baris D', cells: cells('だ:da ぢ:ji づ:zu で:de ど:do') } satisfies KanaRow;
export const ROW_BA = { id: 'ba', label: 'Baris B', cells: cells('ば:ba び:bi ぶ:bu べ:be ぼ:bo') } satisfies KanaRow;
export const ROW_PA = { id: 'pa', label: 'Baris P', cells: cells('ぱ:pa ぴ:pi ぷ:pu ぺ:pe ぽ:po') } satisfies KanaRow;

export const BASIC_ROWS: KanaRow[] = [
  ROW_A, ROW_KA, ROW_SA, ROW_TA, ROW_NA, ROW_HA, ROW_MA, ROW_YA, ROW_RA, ROW_WA
];
export const VOICED_ROWS: KanaRow[] = [ROW_GA, ROW_ZA, ROW_DA, ROW_BA, ROW_PA];

const chars = (rows: KanaRow[]) => rows.flatMap(r => r.cells.map(c => c.k));

/** Aksara yang sudah dipelajari saat lantai tertentu (untuk memvalidasi kolam kata). */
export const POOL_F3 = new Set(chars([ROW_A, ROW_KA, ROW_SA]));
export const POOL_F4 = new Set([...POOL_F3, ...chars([ROW_TA, ROW_NA, ROW_HA])]);
export const POOL_F5 = new Set(chars(BASIC_ROWS));
export const POOL_F6 = new Set([...POOL_F5, ...chars(VOICED_ROWS)]);
/** Lantai 7: hiragana dasar + kana kecil (tanpa dakuten, lihat docs §3). */
export const POOL_F7 = new Set([...POOL_F5, 'ゃ', 'ゅ', 'ょ', 'っ']);
/** Lantai 10: hiragana lengkap + dakuten (prasyarat 006) tanpa kana kecil. */
export const POOL_F10 = POOL_F6;

export const KANA_BY_CHAR: Record<string, KanaCell> = Object.fromEntries(
  [...BASIC_ROWS, ...VOICED_ROWS].flatMap(r => r.cells).map(c => [c.k, c])
);

export const romajiOf = (hira: string): string => KANA_BY_CHAR[hira]?.r ?? hira;

/** Katakana yang dapat dipakai pada kata di lantai 8 (semua kana + dakuten + kecil + ー + kana asing). */
export const POOL_KATAKANA = new Set<string>([
  ...Array.from(toKatakana([...POOL_F6].join(''))),
  'ッ', 'ャ', 'ュ', 'ョ', 'ー', 'ィ', 'ェ', 'ァ', 'ォ', 'ヴ'
]);

export const toKata = (hira: string): string => toKatakana(hira);
