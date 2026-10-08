// ==============================================================================
// NIHONGO QUEST: UNIFIED ENTITY REGISTRY & KNOWLEDGE GRAPH REPOSITORY
// Single point of access for all Core Knowledge items, relations, & traits
// ==============================================================================

import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KotobaItem, KanjiItem, BunpouItem } from '../../types/content';
import { DeckItemRef } from '../../types/rpg';
import { ResolvedDeckItem } from '../../utils/decks';
import { TraitType, hasTrait, getTraits } from '../traits/traits';

export interface UnifiedEntity {
  id: string;
  category: 'kotoba' | 'kanji' | 'bunpou';
  title: string;
  reading: string;
  meaning: string;
  level: string;
  traits: TraitType[];
  rawItem: KotobaItem | KanjiItem | BunpouItem;
  kotoba?: KotobaItem;
  kanji?: KanjiItem;
  bunpou?: BunpouItem;
}

export interface RelatedGraphNodes {
  kanji: KanjiItem[];
  kotoba: KotobaItem[];
  bunpou: BunpouItem[];
}

export interface EntitySearchOptions {
  category?: 'all' | 'kotoba' | 'kanji' | 'bunpou';
  level?: string;
  trait?: TraitType;
  limit?: number;
}

class EntityRegistryService {
  private kanjiByCharCache: Map<string, KanjiItem> = new Map();
  private kanjiToKotobaCache: Map<string, string[]> = new Map(); // char -> kotobaIds
  private isIndexInitialized = false;

  private ensureIndex() {
    if (this.isIndexInitialized) return;

    // Index Kanji by Character
    for (const item of Object.values(KANJI_DATABASE)) {
      if (item && item.character) {
        this.kanjiByCharCache.set(item.character, item);
      }
    }

    // Index Kotoba by Kanji character containment
    for (const [id, item] of Object.entries(KOTOBA_DATABASE)) {
      if (!item || !item.word) continue;
      const chars = Array.from(item.word);
      for (const ch of chars) {
        if (!this.kanjiToKotobaCache.has(ch)) {
          this.kanjiToKotobaCache.set(ch, []);
        }
        this.kanjiToKotobaCache.get(ch)!.push(id);
      }
    }

    this.isIndexInitialized = true;
  }

  /**
   * Retrieves any entity by ID across Kotoba, Kanji, and Bunpou databases.
   */
  public getEntity(id: string): UnifiedEntity | null {
    this.ensureIndex();

    // 1. Check Kotoba
    const kotoba = KOTOBA_DATABASE[id];
    if (kotoba) {
      return {
        id,
        category: 'kotoba',
        title: kotoba.word,
        reading: kotoba.reading,
        meaning: kotoba.meaningId || kotoba.meaningEn || '',
        level: kotoba.jlpt || 'N5',
        traits: getTraits(kotoba),
        rawItem: kotoba,
        kotoba,
      };
    }

    // 2. Check Kanji (by ID or Character)
    const kanji = KANJI_DATABASE[id] || this.kanjiByCharCache.get(id);
    if (kanji) {
      const kunStr = (kanji.kunyomi || []).join('、');
      const onStr = (kanji.onyomi || []).join('、');
      return {
        id: kanji.id || kanji.character,
        category: 'kanji',
        title: kanji.character,
        reading: [kunStr, onStr].filter(Boolean).join(' | '),
        meaning: kanji.meaningId || kanji.meaningEn || '',
        level: kanji.jlpt || 'N5',
        traits: getTraits(kanji),
        rawItem: kanji,
        kanji,
      };
    }

    // 3. Check Bunpou
    const bunpou = BUNPOU_DATABASE[id];
    if (bunpou) {
      return {
        id,
        category: 'bunpou',
        title: bunpou.title,
        reading: bunpou.formula,
        meaning: bunpou.meaningId || '',
        level: bunpou.level || 'N3',
        traits: getTraits(bunpou),
        rawItem: bunpou,
        bunpou,
      };
    }

    return null;
  }

  /**
   * Directly fetch a Kotoba item.
   */
  public getKotoba(id: string): KotobaItem | null {
    return KOTOBA_DATABASE[id] || null;
  }

  /**
   * Directly fetch a Kanji item by ID or character.
   */
  public getKanji(idOrChar: string): KanjiItem | null {
    this.ensureIndex();
    return KANJI_DATABASE[idOrChar] || this.kanjiByCharCache.get(idOrChar) || null;
  }

  /**
   * Directly fetch a Bunpou item.
   */
  public getBunpou(id: string): BunpouItem | null {
    return BUNPOU_DATABASE[id] || null;
  }

  /**
   * Resolves a lightweight Deck reference into a strongly-typed entity with display fields.
   */
  public resolveDeckItem(ref: DeckItemRef): ResolvedDeckItem | null {
    if (!ref || !ref.id) return null;

    if (ref.category === 'kotoba') {
      const item = this.getKotoba(ref.id);
      if (!item) return null;
      return {
        ref,
        category: 'kotoba',
        kotoba: item,
        displayTitle: item.word,
        displayReading: item.reading,
        displayMeaning: item.meaningId || item.meaningEn || '',
        level: item.jlpt || 'N5',
      };
    }

    if (ref.category === 'kanji') {
      const item = this.getKanji(ref.id);
      if (!item) return null;
      const kunStr = (item.kunyomi || []).join('、');
      const onStr = (item.onyomi || []).join('、');
      return {
        ref,
        category: 'kanji',
        kanji: item,
        displayTitle: item.character,
        displayReading: [kunStr, onStr].filter(Boolean).join(' | '),
        displayMeaning: item.meaningId || item.meaningEn || '',
        level: item.jlpt || 'N5',
      };
    }

    if (ref.category === 'bunpou') {
      const item = this.getBunpou(ref.id);
      if (!item) return null;
      return {
        ref,
        category: 'bunpou',
        bunpou: item,
        displayTitle: item.title,
        displayReading: item.formula,
        displayMeaning: item.meaningId || '',
        level: item.level || 'N3',
      };
    }

    return null;
  }

  /**
   * Filters any array of items (or DeckItemRefs) to only those satisfying a required trait.
   */
  public filterByTrait<T>(items: T[], trait: TraitType): T[] {
    return items.filter(item => {
      // If it's a DeckItemRef, resolve first
      const raw = (item as any)?.id && (item as any)?.category ? this.resolveDeckItem(item as any) : item;
      return hasTrait(raw, trait);
    });
  }

  /**
   * Traverses the relational knowledge graph for any item ID.
   */
  public getRelated(id: string): RelatedGraphNodes {
    this.ensureIndex();
    const result: RelatedGraphNodes = { kanji: [], kotoba: [], bunpou: [] };

    // 1. Is it Kotoba?
    const kotoba = this.getKotoba(id);
    if (kotoba) {
      // Find constituent Kanji
      const chars = Array.from(kotoba.word || '');
      for (const ch of chars) {
        const kj = this.kanjiByCharCache.get(ch);
        if (kj && !result.kanji.some(k => k.character === kj.character)) {
          result.kanji.push(kj);
        }
      }

      // Find related vocabulary via explicit field
      if (kotoba.relatedWords) {
        for (const rw of kotoba.relatedWords) {
          const match = Object.values(KOTOBA_DATABASE).find(k => k.word === rw);
          if (match && !result.kotoba.some(k => k.id === match.id)) {
            result.kotoba.push(match);
          }
        }
      }
      return result;
    }

    // 2. Is it Kanji?
    const kanji = this.getKanji(id);
    if (kanji) {
      // Find all Kotoba containing this Kanji
      const kotobaIds = this.kanjiToKotobaCache.get(kanji.character) || [];
      for (const kid of kotobaIds.slice(0, 12)) {
        const kb = KOTOBA_DATABASE[kid];
        if (kb && !result.kotoba.some(k => k.id === kb.id)) {
          result.kotoba.push(kb);
        }
      }
      return result;
    }

    // 3. Is it Bunpou?
    const bunpou = this.getBunpou(id);
    if (bunpou) {
      // Parse examples to extract words or related patterns
      if (bunpou.comparisonNotes) {
        for (const note of bunpou.comparisonNotes) {
          const target = Object.values(BUNPOU_DATABASE).find(b =>
            b.title.includes(note.targetGrammar) || note.targetGrammar.includes(b.title)
          );
          if (target && !result.bunpou.some(b => b.id === target.id)) {
            result.bunpou.push(target);
          }
        }
      }
      return result;
    }

    return result;
  }

  /**
   * Search all databases with flexible filtering.
   */
  public search(query: string, options: EntitySearchOptions = {}): UnifiedEntity[] {
    const q = query.trim().toLowerCase();
    const limit = options.limit || 50;
    const results: UnifiedEntity[] = [];

    // Helper match
    const matches = (text?: string) => Boolean(text && text.toLowerCase().includes(q));

    // Kotoba
    if (!options.category || options.category === 'all' || options.category === 'kotoba') {
      for (const item of Object.values(KOTOBA_DATABASE)) {
        if (results.length >= limit) break;
        if (!item) continue;
        if (options.level && options.level !== 'all' && item.jlpt !== options.level) continue;

        if (!q || matches(item.word) || matches(item.reading) || matches(item.meaningId) || matches(item.meaningEn)) {
          if (!options.trait || hasTrait(item, options.trait)) {
            results.push(this.getEntity(item.id)!);
          }
        }
      }
    }

    // Kanji
    if (!options.category || options.category === 'all' || options.category === 'kanji') {
      for (const item of Object.values(KANJI_DATABASE)) {
        if (results.length >= limit) break;
        if (!item) continue;
        if (options.level && options.level !== 'all' && item.jlpt !== options.level) continue;

        if (!q || matches(item.character) || matches(item.meaningId) || matches(item.meaningEn) || item.kunyomi.some(matches) || item.onyomi.some(matches)) {
          if (!options.trait || hasTrait(item, options.trait)) {
            results.push(this.getEntity(item.id || item.character)!);
          }
        }
      }
    }

    // Bunpou
    if (!options.category || options.category === 'all' || options.category === 'bunpou') {
      for (const item of Object.values(BUNPOU_DATABASE)) {
        if (results.length >= limit) break;
        if (!item) continue;
        if (options.level && options.level !== 'all' && item.level !== options.level) continue;

        if (!q || matches(item.title) || matches(item.formula) || matches(item.meaningId)) {
          if (!options.trait || hasTrait(item, options.trait)) {
            results.push(this.getEntity(item.id)!);
          }
        }
      }
    }

    return results;
  }
}

export const EntityRegistry = new EntityRegistryService();

