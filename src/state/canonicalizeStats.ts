import type { PlayerStats, UserDeck, DeckItemRef } from '../types/rpg';
import type { ItemMasteryRecord } from '../types/content';
import { KANJI_DATABASE } from '../data/kanji';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { resolveLegacyId } from '../data/entityIds';
import { mergeItemMastery } from '../utils/cloudMerge';

/**
 * Normalisasi data PEMAIN ke ID kanonik materi:
 *  - alias bunpou lama (bunpou_001 -> w1d1g1)
 *  - kanji yang disimpan dengan KARAKTER (週) -> ID (kanji_001)
 * Progres di bawah dua kunci untuk materi yang sama digabung (record terbaru menang), sehingga
 * "satu materi = satu identitas" juga berlaku di sisi progres.
 */
export function canonicalEntityId(id: string): string {
  const legacy = resolveLegacyId(id);
  if (legacy !== id) return legacy;
  const kanji = Object.prototype.hasOwnProperty.call(KANJI_DATABASE, id) ? KANJI_DATABASE[id] : undefined;
  return kanji && kanji.id && kanji.id !== id ? kanji.id : id;
}

export function canonicalizeItemMastery(
  mastery: Record<string, ItemMasteryRecord> | undefined
): Record<string, ItemMasteryRecord> | undefined {
  if (!mastery) return mastery;
  let changed = false;
  const out: Record<string, ItemMasteryRecord> = {};
  for (const [key, rec] of Object.entries(mastery)) {
    const canonical = canonicalEntityId(key);
    const next = canonical === key && rec.itemId === key ? rec : { ...rec, itemId: canonical };
    if (canonical !== key) changed = true;
    out[canonical] = out[canonical]
      ? (changed = true, mergeItemMastery({ [canonical]: out[canonical] }, { [canonical]: next })[canonical])
      : next;
  }
  return changed ? out : mastery;
}

function masterExists(ref: DeckItemRef): boolean {
  if (ref.category === 'kotoba') return Boolean(KOTOBA_DATABASE[ref.id]);
  if (ref.category === 'kanji') return Boolean(KANJI_DATABASE[ref.id]);
  return Boolean(BUNPOU_DATABASE[ref.id]);
}

export function canonicalizeDecks(decks: UserDeck[] | undefined): UserDeck[] | undefined {
  if (!decks) return decks;
  let anyChanged = false;
  const out = decks.map(deck => {
    let changed = false;
    const seen = new Set<string>();
    const items: DeckItemRef[] = [];
    for (const ref of deck.items || []) {
      const id = canonicalEntityId(ref.id);
      let next = id === ref.id ? ref : { ...ref, id };
      // Materi master ada -> salinan customData (AI/kustom) menggandakan identitas: dibuang.
      if (next.customData && masterExists(next)) {
        const { customData: _dup, ...rest } = next;
        next = rest;
      }
      if (next !== ref) changed = true;
      const key = `${next.category}:${next.id}`;
      if (seen.has(key)) { changed = true; continue; }
      seen.add(key);
      items.push(next);
    }
    if (changed) anyChanged = true;
    return changed ? { ...deck, items } : deck;
  });
  return anyChanged ? out : decks;
}

/** Terapkan kanonikalisasi ke PlayerStats; mengembalikan objek yang sama bila tidak ada perubahan. */
export function canonicalizeStats(stats: PlayerStats): PlayerStats {
  const itemMastery = canonicalizeItemMastery(stats.itemMastery);
  const userDecks = canonicalizeDecks(stats.userDecks);
  if (itemMastery === stats.itemMastery && userDecks === stats.userDecks) return stats;
  return { ...stats, itemMastery, userDecks };
}
