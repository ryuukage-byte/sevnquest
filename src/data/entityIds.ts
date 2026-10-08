/**
 * Identitas materi: tabel alias ID lama -> ID kanonik.
 *
 * Prinsip (lihat peta arsitektur): setiap materi punya SATU identitas permanen. ID warisan
 * tidak boleh menjadi entri tambahan di basis data (menggandakan materi), hanya alias pencarian.
 * Berkas ini hanya mengimpor peta alias kecil (bukan dataset) agar ringan dan bisa dipakai di mana saja.
 */
import kotobaAliasJson from './db/kotoba_aliases.json';

/** bunpou_00X (format lama) -> ID kanonik di bunpou.json. */
export const LEGACY_BUNPOU_ID_ALIASES: Readonly<Record<string, string>> = {
  bunpou_001: 'w1d1g1',
  bunpou_002: 'w1d1g2',
  bunpou_003: 'w1d1g3',
  bunpou_004: 'w1d2g1',
  bunpou_005: 'w1d2g2',
};

/**
 * Entri kotoba ganda (word+reading sama) digabung oleh scripts/dedupe_kotoba_identity.cjs; kunci = ID lama
 * (mis. kt_train_20), nilai = ID kanonik (kotoba_0564).
 */
export const KOTOBA_ID_ALIASES: Readonly<Record<string, string>> = kotobaAliasJson as Record<string, string>;

/** Ubah ID warisan menjadi ID kanonik; ID lain dikembalikan apa adanya. */
export function resolveLegacyId(id: string): string {
  if (Object.prototype.hasOwnProperty.call(LEGACY_BUNPOU_ID_ALIASES, id)) return LEGACY_BUNPOU_ID_ALIASES[id];
  if (Object.prototype.hasOwnProperty.call(KOTOBA_ID_ALIASES, id)) return KOTOBA_ID_ALIASES[id];
  return id;
}

/**
 * Kosakata Kana Dojo = kt_train_* yang masih ada + yang sudah digabung ke entri utama, urut seperti semula,
 * dalam ID kanonik (tanpa duplikat).
 */
export function kanaDojoKotobaIds(presentIds: string[]): string[] {
  const all = new Set<string>(presentIds.filter(id => id.startsWith('kt_train_')));
  Object.keys(KOTOBA_ID_ALIASES).forEach(a => { if (a.startsWith('kt_train_')) all.add(a); });
  const resolved = [...all].sort().map(resolveLegacyId);
  return resolved.filter((id, i) => resolved.indexOf(id) === i);
}

/**
 * Daftarkan `aliasKey` sebagai kunci PENCARIAN (non-enumerable) pada basis data berbentuk Record.
 * `db[alias]` tetap berfungsi, tetapi Object.values/keys/entries tidak lagi menghitung materi dua kali.
 */
export function defineLookupAlias<T>(db: Record<string, T>, aliasKey: string, value: T): void {
  if (Object.prototype.hasOwnProperty.call(db, aliasKey)) return;
  Object.defineProperty(db, aliasKey, { value, enumerable: false, configurable: true, writable: true });
}
