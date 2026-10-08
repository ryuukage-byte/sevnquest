import { UserDeck, DeckItemRef, DeckItemCategory, DeckType } from '../types/rpg';
import { KotobaItem, KanjiItem, BunpouItem } from '../types/content';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { fisherYatesShuffle } from './smartRandomizer';

export const DEFAULT_BOOKMARK_DECK_ID = 'default_bookmark';

export function createDefaultBookmarkDeck(): UserDeck {
  return {
    id: DEFAULT_BOOKMARK_DECK_ID,
    title: 'Buku Saku Bookmark',
    description: 'Koleksi otomatis materi dan catatan yang kamu tandai sebagai favorit dari perpustakaan.',
    type: 'mixed',
    isDefault: true,
    coverIcon: '🔖',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

export function ensureUserDecks(decks?: UserDeck[]): UserDeck[] {
  if (!decks || !Array.isArray(decks) || decks.length === 0) {
    return [createDefaultBookmarkDeck()];
  }
  const hasDefault = decks.some(d => d.id === DEFAULT_BOOKMARK_DECK_ID || d.isDefault);
  if (!hasDefault) {
    return [createDefaultBookmarkDeck(), ...decks];
  }
  return decks;
}

export function isItemBookmarked(
  userDecks: UserDeck[] | undefined,
  id: string,
  category: DeckItemCategory
): boolean {
  const decks = ensureUserDecks(userDecks);
  const bookmarkDeck = decks.find(d => d.id === DEFAULT_BOOKMARK_DECK_ID || d.isDefault);
  if (!bookmarkDeck) return false;

  return bookmarkDeck.items.some(
    item => item.id === id && item.category === category
  );
}

export function toggleBookmarkItem(
  userDecks: UserDeck[] | undefined,
  id: string,
  category: DeckItemCategory,
  notes?: string
): { userDecks: UserDeck[]; added: boolean } {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  let added = false;
  const updatedDecks = currentDecks.map(deck => {
    if (deck.id === DEFAULT_BOOKMARK_DECK_ID || deck.isDefault) {
      const exists = deck.items.some(it => it.id === id && it.category === category);
      if (exists) {
        added = false;
        return {
          ...deck,
          updatedAt: now,
          items: deck.items.filter(it => !(it.id === id && it.category === category)),
        };
      } else {
        added = true;
        const newItem: DeckItemRef = {
          id,
          category,
          addedAt: now,
          notes,
        };
        return {
          ...deck,
          updatedAt: now,
          items: [newItem, ...deck.items],
        };
      }
    }
    return deck;
  });

  return { userDecks: updatedDecks, added };
}

export function addItemToDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  itemRef: Omit<DeckItemRef, 'addedAt'>
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      const exists = deck.items.some(it => it.id === itemRef.id && it.category === itemRef.category);
      if (exists) return deck;

      const newItem: DeckItemRef = {
        ...itemRef,
        addedAt: now,
      };
      return {
        ...deck,
        updatedAt: now,
        items: [newItem, ...deck.items],
      };
    }
    return deck;
  });
}

export function removeItemFromDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  itemId: string,
  category: DeckItemCategory
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      return {
        ...deck,
        updatedAt: now,
        items: deck.items.filter(it => !(it.id === itemId && it.category === category)),
      };
    }
    return deck;
  });
}

export function addMultipleItemsToDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  items: { id: string; category: DeckItemCategory; notes?: string }[]
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      const existingKeys = new Set(deck.items.map(it => `${it.category}:${it.id}`));
      const newItems: DeckItemRef[] = [];
      for (const item of items) {
        const key = `${item.category}:${item.id}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newItems.push({
            id: item.id,
            category: item.category,
            addedAt: now,
            notes: item.notes,
          });
        }
      }
      return {
        ...deck,
        updatedAt: now,
        items: [...newItems, ...deck.items],
      };
    }
    return deck;
  });
}

export function importBookmarkItemsToDeck(
  userDecks: UserDeck[] | undefined,
  targetDeckId: string
): { userDecks: UserDeck[]; importedCount: number } {
  const currentDecks = ensureUserDecks(userDecks);
  const bookmarkDeck = currentDecks.find(d => d.id === DEFAULT_BOOKMARK_DECK_ID || d.isDefault);
  if (!bookmarkDeck || bookmarkDeck.items.length === 0) {
    return { userDecks: currentDecks, importedCount: 0 };
  }

  let importedCount = 0;
  const now = new Date().toISOString();
  const updated = currentDecks.map(deck => {
    if (deck.id === targetDeckId) {
      const existingKeys = new Set(deck.items.map(it => `${it.category}:${it.id}`));
      const toAdd: DeckItemRef[] = [];
      for (const item of bookmarkDeck.items) {
        const key = `${item.category}:${item.id}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          toAdd.push({ ...item, addedAt: now });
          importedCount++;
        }
      }
      return {
        ...deck,
        updatedAt: now,
        items: [...toAdd, ...deck.items],
      };
    }
    return deck;
  });

  return { userDecks: updated, importedCount };
}

export function clearDeckItems(
  userDecks: UserDeck[] | undefined,
  deckId: string
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();
  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      return {
        ...deck,
        updatedAt: now,
        items: [],
      };
    }
    return deck;
  });
}


export function toggleItemInDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  itemId: string,
  category: DeckItemCategory,
  notes?: string
): { userDecks: UserDeck[]; added: boolean } {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();
  let added = false;

  const updatedDecks = currentDecks.map(deck => {
    if (deck.id === deckId) {
      const exists = deck.items.some(it => it.id === itemId && it.category === category);
      if (exists) {
        added = false;
        return {
          ...deck,
          updatedAt: now,
          items: deck.items.filter(it => !(it.id === itemId && it.category === category)),
        };
      } else {
        added = true;
        const newItem: DeckItemRef = {
          id: itemId,
          category,
          addedAt: now,
          notes,
        };
        return {
          ...deck,
          updatedAt: now,
          items: [newItem, ...deck.items],
        };
      }
    }
    return deck;
  });

  return { userDecks: updatedDecks, added };
}

export interface GeneratePresetOptions {
  type: DeckType;
  level: 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Kaigo';
  count: number;
}

export function generatePresetDeckItems(options: GeneratePresetOptions): DeckItemRef[] {
  const { type, level, count } = options;
  const now = new Date().toISOString();

  // Gather matching Kotoba
  const matchingKotoba = Object.values(KOTOBA_DATABASE).filter(item => {
    if (!item) return false;
    if (level === 'all') return true;
    if (level === 'Kaigo') return Boolean(item.tags?.includes('Kaigo'));
    return item.jlpt === level;
  });

  // Gather matching Kanji
  const seenKanji = new Set<string>();
  const matchingKanji = Object.values(KANJI_DATABASE).filter(item => {
    if (!item || !item.character || seenKanji.has(item.character)) return false;
    seenKanji.add(item.character);
    if (level === 'all') return true;
    if (level === 'Kaigo') {
      return matchingKotoba.some(k => k.kanjiComponents?.includes(item.character));
    }
    return item.jlpt === level;
  });

  // Gather matching Bunpou
  const matchingBunpou = Object.values(BUNPOU_DATABASE).filter(item => {
    if (!item) return false;
    if (level === 'all') return true;
    if (level === 'Kaigo') return item.level === 'N4' || item.level === 'N3';
    return item.level === level;
  });

  const pickItems = <T>(arr: T[], n: number): T[] => {
    if (arr.length <= n) return [...arr];
    return fisherYatesShuffle(arr).slice(0, n);
  };

  const results: DeckItemRef[] = [];
  const addedSet = new Set<string>();

  const addRef = (id: string, category: DeckItemCategory) => {
    const key = `${category}:${id}`;
    if (!addedSet.has(key)) {
      addedSet.add(key);
      results.push({ id, category, addedAt: now });
    }
  };

  if (type === 'kotoba') {
    const picked = pickItems(matchingKotoba, count);
    picked.forEach(it => addRef(it.id, 'kotoba'));
  } else if (type === 'kanji') {
    const picked = pickItems(matchingKanji, count);
    picked.forEach(it => addRef(it.id || it.character, 'kanji'));
  } else if (type === 'bunpou') {
    const picked = pickItems(matchingBunpou, count);
    picked.forEach(it => addRef(it.id, 'bunpou'));
  } else if (type === 'writing') {
    const kanjiCount = Math.ceil(count * 0.7);
    const kotobaCount = count - kanjiCount;
    const pickedKanji = pickItems(matchingKanji, kanjiCount);
    const pickedKotoba = pickItems(matchingKotoba, kotobaCount);
    pickedKanji.forEach(it => addRef(it.id || it.character, 'kanji'));
    pickedKotoba.forEach(it => addRef(it.id, 'kotoba'));
  } else if (type === 'flashcard') {
    const kotobaCount = Math.ceil(count * 0.6);
    const kanjiCount = count - kotobaCount;
    const pickedKotoba = pickItems(matchingKotoba, kotobaCount);
    const pickedKanji = pickItems(matchingKanji, kanjiCount);
    pickedKotoba.forEach(it => addRef(it.id, 'kotoba'));
    pickedKanji.forEach(it => addRef(it.id || it.character, 'kanji'));
  } else {
    const kotobaCount = Math.ceil(count * 0.5);
    const kanjiCount = Math.ceil(count * 0.3);
    const bunpouCount = Math.max(1, count - kotobaCount - kanjiCount);

    const pickedKotoba = pickItems(matchingKotoba, kotobaCount);
    const pickedKanji = pickItems(matchingKanji, kanjiCount);
    const pickedBunpou = pickItems(matchingBunpou, bunpouCount);

    pickedKotoba.forEach(it => addRef(it.id, 'kotoba'));
    pickedKanji.forEach(it => addRef(it.id || it.character, 'kanji'));
    pickedBunpou.forEach(it => addRef(it.id, 'bunpou'));
  }

  // Backfill if needed
  if (results.length < count) {
    const allPool = [
      ...matchingKotoba.map(k => ({ id: k.id, cat: 'kotoba' as DeckItemCategory })),
      ...matchingKanji.map(k => ({ id: k.id || k.character, cat: 'kanji' as DeckItemCategory })),
      ...matchingBunpou.map(b => ({ id: b.id, cat: 'bunpou' as DeckItemCategory })),
    ];
    for (const item of pickItems(allPool, allPool.length)) {
      if (results.length >= count) break;
      addRef(item.id, item.cat);
    }
  }

  return results;
}

export function createCustomDeck(
  userDecks: UserDeck[] | undefined,
  data: {
    title: string;
    description?: string;
    type: DeckType;
    coverIcon?: string;
    initialItems?: DeckItemRef[];
  }
): { userDecks: UserDeck[]; newDeck: UserDeck } {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();
  const id = `deck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newDeck: UserDeck = {
    id,
    title: data.title.trim() || 'Deck Baru',
    description: data.description?.trim() || '',
    type: data.type || 'mixed',
    coverIcon: data.coverIcon || '📖',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    items: data.initialItems || [],
  };

  return {
    userDecks: [...currentDecks, newDeck],
    newDeck,
  };
}

export function updateCustomDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string,
  updates: Partial<Pick<UserDeck, 'title' | 'description' | 'type' | 'coverIcon'>>
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  const now = new Date().toISOString();

  return currentDecks.map(deck => {
    if (deck.id === deckId) {
      return {
        ...deck,
        ...updates,
        updatedAt: now,
      };
    }
    return deck;
  });
}

export function deleteCustomDeck(
  userDecks: UserDeck[] | undefined,
  deckId: string
): UserDeck[] {
  const currentDecks = ensureUserDecks(userDecks);
  // Never delete default deck
  return currentDecks.filter(deck => deck.id !== deckId || deck.isDefault);
}

export interface ResolvedDeckItem {
  ref: DeckItemRef;
  category: DeckItemCategory;
  kotoba?: KotobaItem;
  kanji?: KanjiItem;
  bunpou?: BunpouItem;
  displayTitle: string;
  displayReading?: string;
  displayMeaning: string;
  level: string;
}

export function resolveDeckItem(ref: DeckItemRef): ResolvedDeckItem | null {
  // 1. Item kustom/AI hanya dipakai bila TIDAK ada materi master dengan ID tersebut. Bila ada, master
  //    (identitas permanen) yang menang; salinan customData tidak boleh menggandakan materi.
  const hasMaster =
    (ref.category === 'kotoba' && Boolean(KOTOBA_DATABASE[ref.id])) ||
    (ref.category === 'kanji' && Boolean(KANJI_DATABASE[ref.id])) ||
    (ref.category === 'bunpou' && Boolean(BUNPOU_DATABASE[ref.id]));
  if (ref.customData && !hasMaster) {
    const cd = ref.customData;
    const levelStr = cd.level || 'N5';

    // Contoh kalimat kustom -> bentuk sesuai tipe konten (exampleSentence / ExampleSentence / RelatedWord).
    const exampleJp = cd.exampleJp;
    const exampleReading = cd.exampleReading || cd.exampleJp || '';
    const exampleTranslation = cd.exampleId || '';

    if (ref.category === 'kotoba') {
      const pseudoKotoba: KotobaItem = {
        id: ref.id,
        word: cd.word,
        reading: cd.reading || cd.word,
        meaningId: cd.meaning,
        meaningEn: cd.meaning,
        meaningJa: '',
        jlpt: levelStr,
        wordType: 'expression',
        kanjiComponents: [],
        exampleSentence: exampleJp
          ? { japanese: exampleJp, reading: exampleReading, meaningId: exampleTranslation }
          : undefined,
      };

      return {
        ref,
        category: 'kotoba',
        kotoba: pseudoKotoba,
        displayTitle: pseudoKotoba.word,
        displayReading: pseudoKotoba.reading,
        displayMeaning: pseudoKotoba.meaningId || '',
        level: pseudoKotoba.jlpt || 'N5',
      };
    }

    if (ref.category === 'kanji') {
      const pseudoKanji: KanjiItem = {
        id: ref.id,
        character: cd.word,
        meaningId: cd.meaning,
        meaningEn: cd.meaning,
        onyomi: cd.reading ? [cd.reading] : [],
        kunyomi: [],
        strokeCount: 1,
        jlpt: levelStr,
        radical: '',
        radicalName: '',
        relatedWords: exampleJp
          ? [{ word: exampleJp, reading: exampleReading, meaningId: exampleTranslation }]
          : [],
        questions: [],
      };

      return {
        ref,
        category: 'kanji',
        kanji: pseudoKanji,
        displayTitle: pseudoKanji.character,
        displayReading: cd.reading || '',
        displayMeaning: pseudoKanji.meaningId || '',
        level: pseudoKanji.jlpt || 'N5',
      };
    }

    if (ref.category === 'bunpou') {
      const pseudoBunpou: BunpouItem = {
        id: ref.id,
        title: cd.word,
        reading: cd.reading || '',
        formula: cd.reading || cd.word,
        meaningId: cd.meaning,
        meaningEn: cd.meaning,
        explanation: cd.meaning,
        level: levelStr,
        examples: exampleJp
          ? [{ japanese: exampleJp, reading: exampleReading, meaningId: exampleTranslation }]
          : [],
        questions: [],
      };

      return {
        ref,
        category: 'bunpou',
        bunpou: pseudoBunpou,
        displayTitle: pseudoBunpou.title,
        displayReading: pseudoBunpou.formula,
        displayMeaning: pseudoBunpou.meaningId || '',
        level: pseudoBunpou.level || 'N3',
      };
    }
  }

  // 2. Existing database lookup by reference ID
  if (ref.category === 'kotoba') {
    const item = KOTOBA_DATABASE[ref.id];
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
    const item = KANJI_DATABASE[ref.id];
    if (!item) return null;
    const kunStr = (item.kunyomi || []).join('、');
    const onStr = (item.onyomi || []).join('、');
    const reading = [kunStr, onStr].filter(Boolean).join(' | ');

    return {
      ref,
      category: 'kanji',
      kanji: item,
      displayTitle: item.character,
      displayReading: reading,
      displayMeaning: item.meaningId || item.meaningEn || '',
      level: item.jlpt || 'N5',
    };
  }

  if (ref.category === 'bunpou') {
    const item = BUNPOU_DATABASE[ref.id];
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
