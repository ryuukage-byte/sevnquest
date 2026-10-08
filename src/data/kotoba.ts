import { KotobaItem } from '../types/content';
import kotobaData from './db/kotoba.json';
import { KOTOBA_ID_ALIASES, defineLookupAlias } from './entityIds';

export const KOTOBA_DATABASE: Record<string, KotobaItem> = kotobaData as Record<string, KotobaItem>;

// ID lama dari entri ganda yang sudah digabung tetap bisa dicari, tanpa menghitung materi dua kali.
for (const [alias, canonical] of Object.entries(KOTOBA_ID_ALIASES)) {
  const target = KOTOBA_DATABASE[canonical];
  if (target) defineLookupAlias(KOTOBA_DATABASE, alias, target);
}
