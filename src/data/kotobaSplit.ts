/**
 * Pemisahan kamus kotoba menjadi INTI dan DETAIL (dipakai plugin build `kotobaSplit` di vite.config.ts).
 *
 * Inti = field yang dibaca jalur boot (ID, kata, bacaan, arti, level, jenis kata, komponen kanji, tag).
 * Detail = teks panjang yang hanya ditampilkan layar lazy (contoh kalimat, kolokasi, definisi). Di build,
 * `db/kotoba.json` hanya berisi inti; detail dimuat di latar belakang oleh `kotobaDetails.ts` dan digabung
 * ke objek yang sama. Di tes (tsx, tanpa plugin) JSON tetap utuh sehingga penggabungan tidak mengubah apa pun.
 */
import type { KotobaItem } from '../types/content';

export const KOTOBA_DETAIL_FIELDS = [
  'exampleSentence',
  'collocations',
  'definitionId',
  'meaningJaId',
  'meaningJa',
] as const satisfies ReadonlyArray<keyof KotobaItem>;

export type KotobaDetailField = (typeof KOTOBA_DETAIL_FIELDS)[number];
export type KotobaDetail = Partial<Pick<KotobaItem, KotobaDetailField>>;

type RawEntry = Record<string, unknown>;

const DETAIL_SET: ReadonlySet<string> = new Set(KOTOBA_DETAIL_FIELDS);

/**
 * Pecah kamus mentah. Entri inti yang punya contoh kalimat diberi `hasExample: true` karena kurikulum
 * (jalur boot) mengurutkan kata berdasarkan ada/tidaknya contoh sebelum detail sempat dimuat.
 */
export function splitKotobaEntries(db: Record<string, RawEntry>): {
  core: Record<string, RawEntry>;
  detail: Record<string, RawEntry>;
} {
  const core: Record<string, RawEntry> = {};
  const detail: Record<string, RawEntry> = {};
  for (const [id, entry] of Object.entries(db)) {
    const c: RawEntry = {};
    const d: RawEntry = {};
    for (const [field, value] of Object.entries(entry)) {
      if (DETAIL_SET.has(field)) d[field] = value;
      else c[field] = value;
    }
    if (d.exampleSentence) c.hasExample = true;
    core[id] = c;
    if (Object.keys(d).length > 0) detail[id] = d;
  }
  return { core, detail };
}

/** Gabungkan detail ke objek kamus yang sudah ada (in place, supaya semua referensi ikut lengkap). */
export function mergeKotobaDetails(
  db: Record<string, KotobaItem>,
  detail: Record<string, KotobaDetail>,
): void {
  for (const [id, fields] of Object.entries(detail)) {
    const item = db[id];
    if (!item || item === (fields as unknown)) continue;
    for (const field of KOTOBA_DETAIL_FIELDS) {
      if (field in fields) (item as unknown as RawEntry)[field] = fields[field];
    }
  }
}
