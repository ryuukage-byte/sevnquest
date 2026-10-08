import React, { useState, useMemo, useDeferredValue } from 'react';
import type { DeckItemCategory } from '../../types/rpg';
import { Filter, ChevronDown, BookOpen, Bookmark, Trash2, LayoutGrid, Table } from 'lucide-react';
import { KANJI_DATABASE } from '../../data/kanji';
import { KanjiItem, ItemMasteryRecord } from '../../types/content';
import { KanjiDetailModal } from './KanjiDetailModal';
import { playSound } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';
import { isItemBookmarked } from '../../utils/decks';
import { searchJapanese, createSubsetIndex } from '../../engine/search/universalSearch';
import { JapaneseSearchInput } from '../common/JapaneseSearchInput';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';

const SUUJI_CHARACTERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零'];

// Canonical Japanese Gojuuon Textbook Order
const HIRAGANA_ORDER = [
  // Seion Dasar (46)
  'あ','い','う','え','お',
  'か','き','く','け','こ',
  'さ','し','す','せ','そ',
  'た','ち','つ','て','と',
  'な','に','ぬ','ね','の',
  'は','ひ','ふ','へ','ほ',
  'ま','み','む','め','も',
  'や','ゆ','よ',
  'ら','り','る','れ','ろ',
  'わ','を','ん',
  // Dakuon (Tengteng - 20)
  'が','ぎ','ぐ','げ','ご',
  'ざ','じ','ず','ぜ','ぞ',
  'だ','ぢ','づ','で','ど',
  'ば','び','ぶ','べ','ぼ',
  // Handakuon (Maru - 5)
  'ぱ','ぴ','ぷ','ぺ','ぽ'
];

const KATAKANA_ORDER = [
  // Seion Dasar (46)
  'ア','イ','ウ','エ','オ',
  'カ','キ','ク','ケ','コ',
  'サ','シ','ス','セ','ソ',
  'タ','チ','ツ','テ','ト',
  'ナ','ニ','ヌ','ネ','ノ',
  'ハ','ヒ','フ','ヘ','ホ',
  'マ','ミ','ム','メ','モ',
  'ヤ','ユ','ヨ',
  'ラ','リ','ル','レ','ロ',
  'ワ','ヲ','ン',
  // Dakuon (Tengteng - 20)
  'ガ','ギ','グ','ゲ','ゴ',
  'ザ','ジ','ズ','ゼ','ゾ',
  'ダ','ヂ','ヅ','デ','ド',
  'バ','ビ','ブ','ベ','ボ',
  // Handakuon (Maru - 5)
  'パ','ピ','プ','ペ','ポ',
  // Vu (1)
  'ヴ'
];

const DAKUON_HANDAKUON_CHARS = new Set([
  'が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ',
  'ガ','ギ','グ','ゲ','ゴ','ザ','ジ','ズ','ゼ','ゾ','ダ','ヂ','ヅ','デ','ド','バ','ビ','ブ','ベ','ボ','パ','ピ','プ','ペ','ポ','ヴ'
]);

export interface GojuuonRowDef {
  id: string;
  title: string;
  soundGroup: string;
  group: 'hira_seion' | 'hira_dakuon' | 'kata_seion' | 'kata_dakuon' | 'suuji';
  slots: (string | null)[];
  notes?: Record<number, string>;
}

export const GOJUUON_ROWS: GojuuonRowDef[] = [
  // --- HIRAGANA SEION (46 aksara dalam 10 baris 5-kolom baku) ---
  { id: 'h_a', title: 'Baris A (あ行)', soundGroup: 'Vokal Dasar (a · i · u · e · o)', group: 'hira_seion', slots: ['あ', 'い', 'う', 'え', 'お'] },
  { id: 'h_ka', title: 'Baris Ka (か行)', soundGroup: 'Konsonan k-', group: 'hira_seion', slots: ['か', 'き', 'く', 'け', 'こ'] },
  { id: 'h_sa', title: 'Baris Sa (さ行)', soundGroup: 'Konsonan s-', group: 'hira_seion', slots: ['さ', 'し', 'す', 'せ', 'そ'] },
  { id: 'h_ta', title: 'Baris Ta (た行)', soundGroup: 'Konsonan t-', group: 'hira_seion', slots: ['た', 'ち', 'つ', 'て', 'と'] },
  { id: 'h_na', title: 'Baris Na (な行)', soundGroup: 'Konsonan n-', group: 'hira_seion', slots: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { id: 'h_ha', title: 'Baris Ha (は行)', soundGroup: 'Konsonan h-', group: 'hira_seion', slots: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  { id: 'h_ma', title: 'Baris Ma (ま行)', soundGroup: 'Konsonan m-', group: 'hira_seion', slots: ['ま', 'み', 'む', 'め', 'も'] },
  { id: 'h_ya', title: 'Baris Ya (や行)', soundGroup: 'Semivokal y-', group: 'hira_seion', slots: ['や', null, 'ゆ', null, 'よ'], notes: { 1: '(い)', 3: '(え)' } },
  { id: 'h_ra', title: 'Baris Ra (ら行)', soundGroup: 'Konsonan r-', group: 'hira_seion', slots: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { id: 'h_wa', title: 'Baris Wa & N (わ行・撥音)', soundGroup: 'wa · wo · n', group: 'hira_seion', slots: ['わ', null, 'を', null, 'ん'], notes: { 1: '—', 3: '—' } },

  // --- HIRAGANA DAKUON (20) & HANDAKUON (5) ---
  { id: 'h_ga', title: 'Baris Ga (が行)', soundGroup: 'Tengteng g-', group: 'hira_dakuon', slots: ['が', 'ぎ', 'ぐ', 'げ', 'ご'] },
  { id: 'h_za', title: 'Baris Za (ざ行)', soundGroup: 'Tengteng z-', group: 'hira_dakuon', slots: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'] },
  { id: 'h_da', title: 'Baris Da (だ行)', soundGroup: 'Tengteng d-', group: 'hira_dakuon', slots: ['だ', 'ぢ', 'づ', 'で', 'ど'] },
  { id: 'h_ba', title: 'Baris Ba (ば行)', soundGroup: 'Tengteng b-', group: 'hira_dakuon', slots: ['ば', 'び', 'ぶ', 'べ', 'ぼ'] },
  { id: 'h_pa', title: 'Baris Pa (ぱ行)', soundGroup: 'Maru p-', group: 'hira_dakuon', slots: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'] },

  // --- KATAKANA SEION (46 aksara dalam 10 baris 5-kolom baku) ---
  { id: 'k_a', title: 'Baris A (ア行)', soundGroup: 'Vokal Dasar (a · i · u · e · o)', group: 'kata_seion', slots: ['ア', 'イ', 'ウ', 'エ', 'オ'] },
  { id: 'k_ka', title: 'Baris Ka (カ行)', soundGroup: 'Konsonan k-', group: 'kata_seion', slots: ['カ', 'キ', 'ク', 'ケ', 'コ'] },
  { id: 'k_sa', title: 'Baris Sa (サ行)', soundGroup: 'Konsonan s-', group: 'kata_seion', slots: ['サ', 'シ', 'ス', 'セ', 'ソ'] },
  { id: 'k_ta', title: 'Baris Ta (タ行)', soundGroup: 'Konsonan t-', group: 'kata_seion', slots: ['タ', 'チ', 'ツ', 'テ', 'ト'] },
  { id: 'k_na', title: 'Baris Na (ナ行)', soundGroup: 'Konsonan n-', group: 'kata_seion', slots: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'] },
  { id: 'k_ha', title: 'Baris Ha (ハ行)', soundGroup: 'Konsonan h-', group: 'kata_seion', slots: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'] },
  { id: 'k_ma', title: 'Baris Ma (マ行)', soundGroup: 'Konsonan m-', group: 'kata_seion', slots: ['マ', 'ミ', 'ム', 'メ', 'モ'] },
  { id: 'k_ya', title: 'Baris Ya (ヤ行)', soundGroup: 'Semivokal y-', group: 'kata_seion', slots: ['ヤ', null, 'ユ', null, 'ヨ'], notes: { 1: '(イ)', 3: '(エ)' } },
  { id: 'k_ra', title: 'Baris Ra (ラ行)', soundGroup: 'Konsonan r-', group: 'kata_seion', slots: ['ラ', 'リ', 'ル', 'レ', 'ロ'] },
  { id: 'k_wa', title: 'Baris Wa & N (ワ行・撥音)', soundGroup: 'wa · wo · n', group: 'kata_seion', slots: ['ワ', null, 'ヲ', null, 'ン'], notes: { 1: '—', 3: '—' } },

  // --- KATAKANA DAKUON (20), HANDAKUON (5) & VU (1) ---
  { id: 'k_ga', title: 'Baris Ga (ガ行)', soundGroup: 'Tengteng g-', group: 'kata_dakuon', slots: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'] },
  { id: 'k_za', title: 'Baris Za (ザ行)', soundGroup: 'Tengteng z-', group: 'kata_dakuon', slots: ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'] },
  { id: 'k_da', title: 'Baris Da (ダ行)', soundGroup: 'Tengteng d-', group: 'kata_dakuon', slots: ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'] },
  { id: 'k_ba', title: 'Baris Ba (バ行)', soundGroup: 'Tengteng b-', group: 'kata_dakuon', slots: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'] },
  { id: 'k_pa', title: 'Baris Pa (パ行)', soundGroup: 'Maru p-', group: 'kata_dakuon', slots: ['パ', 'ピ', 'プ', 'ペ', 'ポ'] },
  { id: 'k_vu', title: 'Baris Vu (ヴ)', soundGroup: 'Katakana Khusus v-', group: 'kata_dakuon', slots: [null, null, 'ヴ', null, null], notes: { 0: '—', 1: '—', 3: '—', 4: '—' } },

  // --- SUUJI (14) ---
  { id: 's_1_5', title: 'Angka Suuji 1 - 5', soundGroup: 'Satuan 1〜5', group: 'suuji', slots: ['一', '二', '三', '四', '五'] },
  { id: 's_6_10', title: 'Angka Suuji 6 - 10', soundGroup: 'Satuan 6〜10', group: 'suuji', slots: ['六', '七', '八', '九', '十'] },
  { id: 's_units', title: 'Angka Satuan Besar & Nol', soundGroup: 'Ratus, Ribu, Puluh Ribu, Nol', group: 'suuji', slots: ['百', '千', '万', '零', null], notes: { 4: '—' } },
];

const getKanaRowLabel = (char: string): string => {
  if (['あ','い','う','え','お','ア','イ','ウ','エ','オ'].includes(char)) return 'Baris A (Vokal)';
  if (['か','き','く','け','こ','カ','キ','ク','ケ','コ'].includes(char)) return 'Baris Ka (k-)';
  if (['さ','し','す','せ','そ','サ','シ','ス','セ','ソ'].includes(char)) return 'Baris Sa (s-)';
  if (['た','ち','つ','て','と','タ','チ','ツ','テ','ト'].includes(char)) return 'Baris Ta (t-)';
  if (['な','に','ぬ','ね','の','ナ','ニ','ヌ','ネ','ノ'].includes(char)) return 'Baris Na (n-)';
  if (['は','ひ','ふ','へ','ほ','ハ','ヒ','フ','ヘ','ホ'].includes(char)) return 'Baris Ha (h-)';
  if (['ま','み','む','め','も','マ','ミ','ム','メ','モ'].includes(char)) return 'Baris Ma (m-)';
  if (['や','ゆ','よ','ヤ','ユ','ヨ'].includes(char)) return 'Baris Ya (y-)';
  if (['ら','り','る','れ','ろ','ラ','リ','ル','レ','ロ'].includes(char)) return 'Baris Ra (r-)';
  if (['わ','を','ん','ワ','ヲ','ン'].includes(char)) return 'Baris Wa (w-/n)';
  if (['が','ぎ','ぐ','げ','ご','ガ','ギ','グ','ゲ','ゴ'].includes(char)) return 'Baris Ga (Tengteng g-)';
  if (['ざ','じ','ず','ぜ','ぞ','ザ','ジ','ズ','ゼ','ゾ'].includes(char)) return 'Baris Za (Tengteng z-)';
  if (['だ','ぢ','づ','で','ど','ダ','ヂ','ヅ','デ','ド'].includes(char)) return 'Baris Da (Tengteng d-)';
  if (['ば','び','ぶ','べ','ぼ','バ','ビ','ブ','ベ','ボ'].includes(char)) return 'Baris Ba (Tengteng b-)';
  if (['ぱ','ぴ','ぷ','ぺ','ぽ','パ','ピ','プ','ペ','ポ'].includes(char)) return 'Baris Pa (Maru p-)';
  if (char === 'ヴ') return 'Baris Vu (Katakana v-)';
  return 'Aksara Kana';
};

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Aksara' },
  { value: 'KANA', label: 'KANA (Dasar)' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const KANA_CATEGORIES = [
  { value: 'all', label: 'Semua Kana & Angka', shortLabel: 'Semua' },
  { value: 'hiragana', label: 'Hiragana Semua', shortLabel: 'Hiragana' },
  { value: 'hiragana_seion', label: 'Hiragana Dasar', shortLabel: 'Hira Dasar' },
  { value: 'hiragana_dakuon', label: 'Hiragana Tengteng/Maru', shortLabel: 'Hira Tengteng/Maru' },
  { value: 'katakana', label: 'Katakana Semua', shortLabel: 'Katakana' },
  { value: 'katakana_seion', label: 'Katakana Dasar', shortLabel: 'Kata Dasar' },
  { value: 'katakana_dakuon', label: 'Katakana Tengteng/Maru', shortLabel: 'Kata Tengteng/Maru' },
  { value: 'suuji', label: 'Angka Suuji', shortLabel: 'Angka' },
];

interface KanjiLibraryViewProps {
  items?: KanjiItem[];
  hideHeader?: boolean;
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRemoveItem?: (id: string, category: 'kanji') => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordStudy?: (category: 'kanjiWriting', id: string, count?: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success?: boolean
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

export const KanjiLibraryView: React.FC<KanjiLibraryViewProps> = ({
  items,
  hideHeader = false,
  soundEnabled = true,
  itemMastery,
  userDecks,
  onToggleBookmark,
  onUpdateDecks,
  onRemoveItem,
  onRewardPlayer,
  onRecordStudy,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState(200);
  const [viewMode, setViewMode] = useState<'gojuuon' | 'grid'>('gojuuon');

  const suujiSet = useMemo(() => new Set(SUUJI_CHARACTERS), []);

  // Detect if provided items are exclusively or predominantly Kana
  const isDeckKanaOnly = useMemo(() => {
    if (!items || items.length === 0) return false;
    return items.every(
      k =>
        k.jlpt === 'KANA' ||
        k.radical === 'Hiragana' ||
        k.radical === 'Katakana' ||
        HIRAGANA_ORDER.includes(k.character) ||
        KATAKANA_ORDER.includes(k.character) ||
        suujiSet.has(k.character)
    );
  }, [items, suujiSet]);

  const [levelFilter, setLevelFilter] = useState<string>(() => {
    if (items && items.length > 0) {
      const isKana = items.every(
        k =>
          k.jlpt === 'KANA' ||
          k.radical === 'Hiragana' ||
          k.radical === 'Katakana' ||
          HIRAGANA_ORDER.includes(k.character) ||
          KATAKANA_ORDER.includes(k.character) ||
          SUUJI_CHARACTERS.includes(k.character)
      );
      if (isKana) return 'KANA';
    }
    return 'all';
  });

  const [kanaCategory, setKanaCategory] = useState<
    'all' | 'hiragana' | 'hiragana_seion' | 'hiragana_dakuon' | 'katakana' | 'katakana_seion' | 'katakana_dakuon' | 'suuji'
  >('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);

  // De-duplicate kanji database (since it has both id and character keys)
  const allKanji = useMemo(() => {
    if (items) return items;
    const seen = new Set<string>();
    const list: KanjiItem[] = [];
    for (const item of Object.values(KANJI_DATABASE)) {
      if (item && item.character && !seen.has(item.character)) {
        seen.add(item.character);
        list.push(item);
      }
    }
    return list;
  }, [items]);

  // Fast character lookup map for rendering Gojuuon table slots
  const kanjiByCharMap = useMemo(() => {
    const map = new Map<string, KanjiItem>();
    for (const item of allKanji) {
      if (item && item.character && !map.has(item.character)) {
        map.set(item.character, item);
      }
    }
    return map;
  }, [allKanji]);

  // Pre-index Kanji for sub-millisecond search across all items
  const kanjiSearchIndex = useMemo(() => {
    return allKanji.map(item => ({
      item,
      isHiragana: HIRAGANA_ORDER.includes(item.character) || item.radical === 'Hiragana',
      isKatakana: KATAKANA_ORDER.includes(item.character) || item.radical === 'Katakana',
      isSuuji: suujiSet.has(item.character),
      isDakuon: DAKUON_HANDAKUON_CHARS.has(item.character),
      jlpt: item.jlpt || 'N3',
    }));
  }, [allKanji, suujiSet]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allKanji.length,
      KANA: 0,
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
      kana_hiragana: 0,
      kana_hiragana_seion: 0,
      kana_hiragana_dakuon: 0,
      kana_katakana: 0,
      kana_katakana_seion: 0,
      kana_katakana_dakuon: 0,
      kana_suuji: 0,
    };

    for (const item of allKanji) {
      const lvl = item.jlpt || 'N3';
      const isHira = HIRAGANA_ORDER.includes(item.character) || item.radical === 'Hiragana';
      const isKata = KATAKANA_ORDER.includes(item.character) || item.radical === 'Katakana';
      const isNum = suujiSet.has(item.character);
      const isDakuon = DAKUON_HANDAKUON_CHARS.has(item.character);

      if (isHira) {
        counts.kana_hiragana++;
        if (isDakuon) counts.kana_hiragana_dakuon++;
        else counts.kana_hiragana_seion++;
      }
      if (isKata) {
        counts.kana_katakana++;
        if (isDakuon) counts.kana_katakana_dakuon++;
        else counts.kana_katakana_seion++;
      }
      if (isNum) counts.kana_suuji++;

      if (isHira || isKata || isNum) {
        counts.KANA++;
      }

      if (counts[lvl] !== undefined && lvl !== 'KANA') {
        counts[lvl]++;
      }
    }
    return counts;
  }, [allKanji, suujiSet]);

  const kanjiSearchDocs = useMemo(() => createSubsetIndex({ kanji: allKanji }), [allKanji]);

  const filteredKanji = useMemo(() => {
    const hasQuery = Boolean(deferredQuery.trim());

    // Pencarian teks: engine universal (urutan relevansi). null = tanpa query.
    let rankOf: Map<string, number> | null = null;
    if (hasQuery) {
      rankOf = new Map();
      searchJapanese(deferredQuery, { entityTypes: ['kanji'], index: kanjiSearchDocs, limit: Infinity })
        .forEach((r, i) => rankOf!.set(r.primaryText, i));
    }

    const filtered: KanjiItem[] = [];

    for (let i = 0; i < kanjiSearchIndex.length; i++) {
      const entry = kanjiSearchIndex[i];
      const item = entry.item;

      // 1. Level Filter
      if (levelFilter === 'KANA' || isDeckKanaOnly) {
        if (!entry.isHiragana && !entry.isKatakana && !entry.isSuuji) continue;
        if (kanaCategory === 'hiragana' && !entry.isHiragana) continue;
        if (kanaCategory === 'hiragana_seion' && (!entry.isHiragana || entry.isDakuon)) continue;
        if (kanaCategory === 'hiragana_dakuon' && (!entry.isHiragana || !entry.isDakuon)) continue;
        if (kanaCategory === 'katakana' && !entry.isKatakana) continue;
        if (kanaCategory === 'katakana_seion' && (!entry.isKatakana || entry.isDakuon)) continue;
        if (kanaCategory === 'katakana_dakuon' && (!entry.isKatakana || !entry.isDakuon)) continue;
        if (kanaCategory === 'suuji' && !entry.isSuuji) continue;
      } else if (levelFilter !== 'all') {
        if (entry.jlpt !== levelFilter) continue;
      }

      // 2. Search Query Match
      if (rankOf && !rankOf.has(item.character)) {
        continue;
      }

      filtered.push(item);
    }

    // Always sort KANA in canonical Japanese textbook order (Gojuuon)
    const getKanaRank = (item: KanjiItem) => {
      const char = item.character;
      const hIdx = HIRAGANA_ORDER.indexOf(char);
      if (hIdx !== -1) return 100 + hIdx;
      const kIdx = KATAKANA_ORDER.indexOf(char);
      if (kIdx !== -1) return 200 + kIdx;
      const sIdx = SUUJI_CHARACTERS.indexOf(char);
      if (sIdx !== -1) return 300 + sIdx;
      return 999;
    };

    if (levelFilter === 'KANA' || isDeckKanaOnly) {
      return [...filtered].sort((a, b) => getKanaRank(a) - getKanaRank(b));
    }

    // Dengan query: urutan relevansi dari engine (kecuali mode Kana yang punya urutan baku).
    if (rankOf) {
      const ranks = rankOf;
      return [...filtered].sort((a, b) => ranks.get(a.character)! - ranks.get(b.character)!);
    }

    return filtered;
  }, [kanjiSearchIndex, kanjiSearchDocs, levelFilter, kanaCategory, deferredQuery, isDeckKanaOnly]);

  const displayedKanji = filteredKanji.slice(0, visibleCount);

  const selectedIndex = useMemo(() => {
    if (!selectedKanji) return -1;
    return filteredKanji.findIndex(
      k => (k.id || k.character) === (selectedKanji.id || selectedKanji.character)
    );
  }, [selectedKanji, filteredKanji]);

  const hasNext = selectedIndex >= 0 && selectedIndex < filteredKanji.length - 1;
  const hasPrev = selectedIndex > 0;

  const handleNextKanji = () => {
    if (hasNext) {
      if (selectedIndex + 1 >= visibleCount) {
        setVisibleCount(prev => Math.min(prev + 50, filteredKanji.length));
      }
      setSelectedKanji(filteredKanji[selectedIndex + 1]);
    }
  };

  const handlePrevKanji = () => {
    if (hasPrev) {
      setSelectedKanji(filteredKanji[selectedIndex - 1]);
    }
  };

  const isKanaMode = levelFilter === 'KANA' || isDeckKanaOnly;
  const isSearchActive = Boolean(searchQuery.trim());

  // Filter Gojuuon rows based on selected subcategory and available characters in deck
  const activeGojuuonRows = useMemo(() => {
    const charSet = new Set(filteredKanji.map(k => k.character));

    return GOJUUON_ROWS.filter(row => {
      // Subcategory filter
      if (kanaCategory === 'hiragana' && row.group !== 'hira_seion' && row.group !== 'hira_dakuon') return false;
      if (kanaCategory === 'hiragana_seion' && row.group !== 'hira_seion') return false;
      if (kanaCategory === 'hiragana_dakuon' && row.group !== 'hira_dakuon') return false;
      if (kanaCategory === 'katakana' && row.group !== 'kata_seion' && row.group !== 'kata_dakuon') return false;
      if (kanaCategory === 'katakana_seion' && row.group !== 'kata_seion') return false;
      if (kanaCategory === 'katakana_dakuon' && row.group !== 'kata_dakuon') return false;
      if (kanaCategory === 'suuji' && row.group !== 'suuji') return false;

      // Only display rows that have at least one character present in current filtered items
      return row.slots.some(ch => ch && charSet.has(ch));
    });
  }, [kanaCategory, filteredKanji]);

  return (
    <div className="space-y-6">
      {/* Search & Level Filters Toolbar */}
      <div className="panel panel-stitched p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input with Japanese IME Toggle */}
          <JapaneseSearchInput
            value={searchQuery}
            onChange={(v) => { setSearchQuery(v); setVisibleCount(100); }}
            placeholderIme="Cari kanji/kana (romaji → kana)..."
            placeholderLatin="Cari kanji, arti, onyomi, kunyomi..."
            soundEnabled={soundEnabled}
            inputClassName="w-full pl-10 pr-20 py-2.5 rounded-xl bg-surface-inset border border-border-subtle text-text-primary placeholder:text-text-muted text-sm font-medium focus:outline-hidden focus:border-border-muted font-jp"
          />

          {/* Level Dropdown for Mobile / Desktop */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-surface-inset border border-border-subtle text-text-primary text-sm font-bold flex items-center justify-between gap-3 hover:border-border-muted transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-muted" />
                Level: {LEVEL_OPTIONS.find(o => o.value === levelFilter)?.label || levelFilter}
              </span>
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 panel py-1.5 rounded-xl shadow-xl border border-border-subtle z-30 space-y-0.5">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setLevelFilter(opt.value);
                      setIsDropdownOpen(false);
                      setVisibleCount(200);
                      playSound('click', soundEnabled);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      levelFilter === opt.value
                        ? 'bg-surface-inset font-bold text-wine-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-inset/60'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-[10px] opacity-60">
                      {levelCounts[opt.value] || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Level Quick Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLevelFilter(opt.value);
                setVisibleCount(200);
                playSound('click', soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                levelFilter === opt.value
                  ? 'bg-surface-inset border border-border-subtle text-wine-accent font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-inset/60 border border-transparent'
              }`}
            >
              <span>{opt.label}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-card border border-border-subtle/50 opacity-80">
                {levelCounts[opt.value] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Subcategory Filter Tabs when KANA is selected */}
        {isKanaMode && (
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border-subtle overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-text-muted uppercase font-mono shrink-0 mr-1">
                Kategori KANA:
              </span>
              {KANA_CATEGORIES.map((cat) => {
                const count =
                  cat.value === 'all'
                    ? levelCounts.KANA
                    : cat.value === 'hiragana'
                    ? levelCounts.kana_hiragana
                    : cat.value === 'hiragana_seion'
                    ? levelCounts.kana_hiragana_seion
                    : cat.value === 'hiragana_dakuon'
                    ? levelCounts.kana_hiragana_dakuon
                    : cat.value === 'katakana'
                    ? levelCounts.kana_katakana
                    : cat.value === 'katakana_seion'
                    ? levelCounts.kana_katakana_seion
                    : cat.value === 'katakana_dakuon'
                    ? levelCounts.kana_katakana_dakuon
                    : levelCounts.kana_suuji;
                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setKanaCategory(cat.value as any);
                      setVisibleCount(200);
                      playSound('click', soundEnabled);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                      kanaCategory === cat.value
                        ? 'seg-active text-gold font-bold'
                        : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle'
                    }`}
                  >
                    <span>{cat.shortLabel}</span>
                    <span className="font-mono text-[10px] opacity-80">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Layout Toggle for Kana: Bagan 5 Kolom vs Grid Kartu */}
            {!isSearchActive && (
              <div className="flex items-center gap-1 shrink-0 p-1 bg-surface-inset rounded-xl border border-border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('gojuuon');
                    playSound('click', soundEnabled);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'gojuuon'
                      ? 'bg-surface-card text-wine-accent font-bold shadow-xs border border-border-subtle'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Tampilan Tabel Buku Teks 5 Baris (Gojuon-zu)"
                >
                  <Table className="w-3.5 h-3.5 text-gold" />
                  <span className="hidden sm:inline">Bagan 5 Kolom</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('grid');
                    playSound('click', soundEnabled);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-surface-card text-wine-accent font-bold shadow-xs border border-border-subtle'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Tampilan Grid Kartu Bebas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid Kartu</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Meta */}
      <div className="flex items-center justify-between px-1 text-xs text-text-muted font-mono">
        <span>
          Menampilkan {Math.min(displayedKanji.length, filteredKanji.length)} dari {filteredKanji.length} Aksara
        </span>
        {searchQuery && (
          <span>Pencarian: &quot;{searchQuery}&quot;</span>
        )}
      </div>

      {/* CONTENT AREA */}
      {displayedKanji.length > 0 ? (
        isKanaMode && !isSearchActive && viewMode === 'gojuuon' ? (
          /* ========================================================================= */
          /* MODE 1: BAGAN 5 KOLOM (GOJUUON-ZU) - PERSIS SEPERTI DI BUKU TEKS JEPANG */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Vowel Column Header Guide */}
            <div className="rounded-2xl bg-surface-inset/80 border border-border-subtle p-3 shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle text-[11px] font-mono text-text-muted">
                <span className="font-bold flex items-center gap-1.5 text-text-secondary">
                  <Table className="w-3.5 h-3.5 text-gold" />
                  Panduan 5 Kolom Vokal (五十音図 - Gojūon-zu)
                </span>
                <span className="hidden sm:inline text-text-muted">Tersusun rapi 5 vokal per baris: a · i · u · e · o</span>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:gap-3.5 text-center">
                <div className="py-1.5 px-1 rounded-xl bg-surface-card border border-border-subtle shadow-xs">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase text-text-muted block">Kolom 1 (-a)</span>
                  <span className="text-xs sm:text-sm font-jp font-bold text-wine-accent">あ段 / A</span>
                </div>
                <div className="py-1.5 px-1 rounded-xl bg-surface-card border border-border-subtle shadow-xs">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase text-text-muted block">Kolom 2 (-i)</span>
                  <span className="text-xs sm:text-sm font-jp font-bold text-wine-accent">い段 / I</span>
                </div>
                <div className="py-1.5 px-1 rounded-xl bg-surface-card border border-border-subtle shadow-xs">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase text-text-muted block">Kolom 3 (-u)</span>
                  <span className="text-xs sm:text-sm font-jp font-bold text-wine-accent">う段 / U</span>
                </div>
                <div className="py-1.5 px-1 rounded-xl bg-surface-card border border-border-subtle shadow-xs">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase text-text-muted block">Kolom 4 (-e)</span>
                  <span className="text-xs sm:text-sm font-jp font-bold text-wine-accent">え段 / E</span>
                </div>
                <div className="py-1.5 px-1 rounded-xl bg-surface-card border border-border-subtle shadow-xs">
                  <span className="text-[9px] sm:text-[10px] font-mono uppercase text-text-muted block">Kolom 5 (-o)</span>
                  <span className="text-xs sm:text-sm font-jp font-bold text-wine-accent">お段 / O</span>
                </div>
              </div>
            </div>

            {/* Gojuuon Rows Container */}
            <div className="space-y-5">
              {activeGojuuonRows.map((row) => (
                <div key={row.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-heading font-bold text-text-primary">
                        {row.title}
                      </h4>
                      <span className="text-[10px] font-mono text-text-secondary bg-surface-inset px-2 py-0.5 rounded-md border border-border-subtle">
                        {row.soundGroup}
                      </span>
                    </div>
                  </div>

                  {/* Exactly 5 Slots per Row */}
                  <div className="grid grid-cols-5 gap-2 sm:gap-3.5">
                    {row.slots.map((char, slotIdx) => {
                      if (!char) {
                        return (
                          <div
                            key={`empty-${slotIdx}`}
                            className="panel p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-dashed border-border-subtle/50 flex flex-col items-center justify-center text-center opacity-40 select-none min-h-[95px] sm:min-h-[145px] bg-surface-card/40"
                          >
                            <span className="text-xs sm:text-sm font-jp text-text-muted font-bold">
                              {row.notes?.[slotIdx] || '—'}
                            </span>
                            <span className="text-[8px] sm:text-[9.5px] text-text-muted font-mono mt-0.5">
                              kosong
                            </span>
                          </div>
                        );
                      }

                      const item = kanjiByCharMap.get(char);
                      if (!item) {
                        return (
                          <div
                            key={`missing-${char}`}
                            className="panel p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-border-subtle/40 flex flex-col items-center justify-center text-center opacity-30 min-h-[95px] sm:min-h-[145px]"
                          >
                            <span className="font-jp text-xl text-text-muted">{char}</span>
                          </div>
                        );
                      }

                      return (
                        <KanjiCardItem
                          key={item.character}
                          item={item}
                          soundEnabled={soundEnabled}
                          userDecks={userDecks}
                          onToggleBookmark={onToggleBookmark}
                          onUpdateDecks={onUpdateDecks}
                          onRemoveItem={onRemoveItem}
                          onSelect={setSelectedKanji}
                          compact
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MODE 2: RESPONSIVE CARDS GRID (5-KOLOM UNTUK KANA, STANDARD UNTUK KANJI) */
          /* ========================================================================= */
          <div
            className={
              isKanaMode
                ? 'grid grid-cols-5 gap-2 sm:gap-3.5'
                : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4'
            }
          >
            {displayedKanji.map((item) => (
              <KanjiCardItem
                key={item.character}
                item={item}
                soundEnabled={soundEnabled}
                userDecks={userDecks}
                onToggleBookmark={onToggleBookmark}
                onUpdateDecks={onUpdateDecks}
                onRemoveItem={onRemoveItem}
                onSelect={setSelectedKanji}
                compact={isKanaMode}
              />
            ))}
          </div>
        )
      ) : (
        <div className="p-12 text-center panel rounded-2xl border border-border-subtle space-y-3">
          <BookOpen className="w-10 h-10 text-text-muted mx-auto opacity-50" />
          <h3 className="text-base font-bold text-text-primary">Tidak Ada Aksara Ditemukan</h3>
          <p className="text-xs text-text-secondary">Coba ubah kata kunci pencarian atau filter kategori aksara.</p>
        </div>
      )}

      {/* Load More Button for Non-Kana Large Datasets */}
      {!isKanaMode && visibleCount < filteredKanji.length && (
        <div className="text-center pt-4">
          <button
            onClick={() => {
              setVisibleCount(prev => prev + 48);
              playSound('click', soundEnabled);
            }}
            className="btn-physical-secondary px-6 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
          >
            Muat Lebih Banyak ({filteredKanji.length - visibleCount} Tersisa)
          </button>
        </div>
      )}

      {/* Detail & Writing Modal */}
      <KanjiDetailModal
        isOpen={Boolean(selectedKanji)}
        onClose={() => setSelectedKanji(null)}
        item={selectedKanji}
        masteryRecord={selectedKanji ? itemMastery?.[selectedKanji.id || selectedKanji.character] : undefined}
        soundEnabled={soundEnabled}
        isBookmarked={Boolean(selectedKanji && isItemBookmarked(userDecks, selectedKanji.id || selectedKanji.character, 'kanji'))}
        onToggleBookmark={onToggleBookmark && selectedKanji ? () => onToggleBookmark(selectedKanji.id || selectedKanji.character, 'kanji') : undefined}
        userDecks={userDecks}
        onToggleDeckItem={onToggleBookmark && selectedKanji ? (deckId) => onToggleBookmark(selectedKanji.id || selectedKanji.character, 'kanji', undefined, deckId) : undefined}
        onUpdateDecks={onUpdateDecks}
        onCompleteSheet={(_sheet, score, reward) => {
          if (!selectedKanji) return;
          const exp = reward?.expGained ?? 15;
          const gold = reward?.goldGained ?? 5;
          const kanjiId = selectedKanji.id || selectedKanji.character;
          if (onRecordInteraction) {
            onRecordInteraction(kanjiId, 'kanji', 'writing', score >= 60);
          }
          if (onCompleteStudyItem) {
            onCompleteStudyItem('kanji', exp, gold, kanjiId, score >= 60 ? 1 : 0, 1);
          } else {
            onRewardPlayer?.(exp, gold);
            onRecordStudy?.('kanjiWriting', kanjiId, 1);
          }
        }}
        onNext={handleNextKanji}
        onPrev={handlePrevKanji}
        hasNext={hasNext}
        hasPrev={hasPrev}
      />
    </div>
  );
};

// ==============================================================================
// REUSABLE KANJI / KANA CARD ITEM
// ==============================================================================
const KanjiCardItem: React.FC<{
  item: KanjiItem;
  soundEnabled: boolean;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRemoveItem?: (id: string, category: 'kanji') => void;
  onSelect: (item: KanjiItem) => void;
  compact?: boolean;
}> = ({
  item,
  soundEnabled,
  userDecks,
  onToggleBookmark,
  onUpdateDecks,
  onRemoveItem,
  onSelect,
  compact = false,
}) => {
  const isHira = item.radical === 'Hiragana' || (item.jlpt === 'KANA' && item.character >= 'ぁ' && item.character <= 'ん');
  const isKata = item.radical === 'Katakana' || (item.jlpt === 'KANA' && item.character >= 'ァ' && item.character <= 'ン');
  const isNum = SUUJI_CHARACTERS.includes(item.character);

  const isKana = isHira || isKata;
  const isBasicGlyph = isKana || isNum;

  const badgeLabel = isHira ? 'Hiragana' : isKata ? 'Katakana' : isNum ? 'Angka' : item.jlpt || 'N3';
  const badgeColor = isHira
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-border-subtle'
    : isKata
      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-border-subtle'
      : isNum
        ? 'bg-indigo/15 text-indigo dark:text-indigo-soft border-border-subtle'
        : 'bg-surface-inset text-text-primary border-border-subtle';

  return (
    <div
      onClick={() => {
        onSelect(item);
        playSound('click', soundEnabled);
      }}
      className={`group panel rounded-xl sm:rounded-2xl border border-border-subtle hover:border-border-muted transition-all cursor-pointer flex flex-col items-center justify-between text-center hover:shadow-md hover:-translate-y-0.5 select-none ${
        compact ? 'p-2 sm:p-3 space-y-1.5 sm:space-y-2' : 'p-3.5 sm:p-4 space-y-2.5 sm:space-y-3'
      }`}
    >
      {/* Top Badges */}
      <div className="w-full flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-text-muted gap-1 min-h-[18px]">
        {!isBasicGlyph ? (
          <span className={`px-1 sm:px-1.5 py-0.5 rounded font-bold border text-[8px] sm:text-[9.5px] tracking-wide whitespace-nowrap leading-none ${badgeColor}`}>
            {badgeLabel}
          </span>
        ) : (
          <span className="text-[8px] sm:text-[9.5px] font-mono text-text-muted/70 whitespace-nowrap">
            {item.strokeCount}画
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {!isBasicGlyph && (
            <span className="whitespace-nowrap text-[8.5px] sm:text-[10px]">{item.strokeCount}画</span>
          )}
          {onRemoveItem && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(item.id || item.character, 'kanji');
                playSound('click', soundEnabled);
              }}
              className="btn-physical-secondary p-0.5 sm:p-1 rounded hover:text-wine-accent transition-all cursor-pointer"
              title="Hapus dari deck ini"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          )}
          {onToggleBookmark && (
            <DeckBookmarkPicker
              itemId={item.id || item.character}
              category="kanji"
              itemTitle={item.character}
              itemSubtitle={item.meaningId || (item as any).meaning || (isNum ? 'Angka Suuji' : isKana ? 'Aksara Kana' : item.jlpt)}
              userDecks={userDecks}
              onToggleBookmark={onToggleBookmark}
              onUpdateDecks={onUpdateDecks}
              soundEnabled={soundEnabled}
              compact
            />
          )}
        </div>
      </div>

      {/* Glyph Box */}
      <div className={`rounded-xl sm:rounded-2xl bg-surface-inset flex items-center justify-center border border-border-subtle group-hover:border-border-primary transition-colors shadow-inner ${
        compact ? 'w-10 h-10 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16'
      }`}>
        <span className={`font-jp font-bold text-text-primary select-none group-hover:scale-105 transition-transform ${
          compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
        }`}>
          {item.character}
        </span>
      </div>

      {/* Meaning & Readings */}
      <div className="w-full space-y-0.5">
        {isKana ? (
          <div className="text-[11px] sm:text-xs font-mono font-bold text-text-primary truncate">
            {(item.kunyomi?.[0] || item.onyomi?.[0] || '-').toLowerCase()}
          </div>
        ) : (
          <>
            <h4
              className="text-[10.5px] sm:text-xs font-bold text-text-primary truncate font-heading"
              title={item.meaningId}
            >
              {item.meaningId}
            </h4>
            <div className="text-[9.5px] sm:text-[11px] text-text-muted font-mono font-bold truncate">
              {item.onyomi?.[0] ? item.onyomi[0].split(' ')[0] : item.kunyomi?.[0]?.split(' ')[0] || '-'}
            </div>
          </>
        )}
      </div>

      {/* Row / Radical label */}
      <span className="hidden sm:inline-block text-[8.5px] sm:text-[9.5px] text-text-secondary font-medium px-1.5 py-0.5 rounded-md bg-surface-inset/70 border border-border-subtle truncate max-w-full whitespace-nowrap">
        {isHira || isKata
          ? getKanaRowLabel(item.character)
          : isNum
            ? 'Angka / Sūji'
            : (item.radical && !item.radical.includes('Lihat') && item.radical.trim() !== ''
                ? `Radikal: ${item.radical}`
                : `Kanji ${item.jlpt || ''}`.trim())}
      </span>
    </div>
  );
};
