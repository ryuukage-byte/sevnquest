import { UserDeck, DeckItemRef } from '../types/rpg';
import { kanaDojoKotobaIds } from './entityIds';
import bunpouDb from './db/bunpou.json';
import kanjiDb from './db/kanji.json';
import kotobaDb from './db/kotoba.json';

const now = new Date().toISOString();

// Helper to extract items from arrays / dictionaries safely
const kanjiList = Object.values(kanjiDb as Record<string, { id?: string; character: string; jlpt?: string }>);
const kotobaList = Object.values(kotobaDb as Record<string, { id: string; jlpt?: string; level?: string }>);
const bunpouList = (bunpouDb as Array<{ id: string; title: string; level?: string }>);

// Helper to map ids to DeckItemRef
function toRefs(ids: string[], category: 'kanji' | 'kotoba' | 'bunpou'): DeckItemRef[] {
  return ids.map(id => ({
    id,
    category,
    addedAt: now,
  }));
}

// 1. KANA DOJO
const CANONICAL_HIRAGANA_ORDER = [
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
  'が','ぎ','ぐ','げ','ご',
  'ざ','じ','ず','ぜ','ぞ',
  'だ','ぢ','づ','で','ど',
  'ば','び','ぶ','べ','ぼ',
  'ぱ','ぴ','ぷ','ぺ','ぽ',
];

const CANONICAL_KATAKANA_ORDER = [
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
  'ガ','ギ','グ','ゲ','ゴ',
  'ザ','ジ','ズ','ゼ','ゾ',
  'ダ','ヂ','ヅ','デ','ド',
  'バ','ビ','ブ','ベ','ボ',
  'パ','ピ','プ','ペ','ポ',
  'ヴ',
];

const getKanaCanonicalRank = (k: { id?: string; character: string }) => {
  const char = k.character;
  const hIdx = CANONICAL_HIRAGANA_ORDER.indexOf(char);
  if (hIdx !== -1) return 100 + hIdx;
  const kIdx = CANONICAL_KATAKANA_ORDER.indexOf(char);
  if (kIdx !== -1) return 200 + kIdx;
  return 999;
};

const kanaKanjiIds = kanjiList
  .filter(k => k.jlpt === 'KANA' || (k.id && k.id.startsWith('kana_')))
  .sort((a, b) => getKanaCanonicalRank(a) - getKanaCanonicalRank(b))
  .map(k => k.id || k.character);

const kanaKotobaIds = kanaDojoKotobaIds(kotobaList.map(k => k.id));

const kanaRefs: DeckItemRef[] = [
  ...toRefs(kanaKanjiIds, 'kanji'),
  ...toRefs(kanaKotobaIds, 'kotoba'),
];

// 2. MINNA NO NIHONGO I (N5)
const n5BunpouIds = bunpouList
  .filter(b => b.id.includes('_n5_'))
  .map(b => b.id);

const n5KanjiIds = kanjiList
  .filter(k => k.jlpt === 'N5')
  .map(k => k.id || k.character);

const n5KotobaIds = kotobaList
  .filter(k => (k.jlpt === 'N5' || k.level === 'N5') && !k.id.startsWith('kt_train_'))
  .slice(0, 150)
  .map(k => k.id);

const minnaN5Refs: DeckItemRef[] = [
  ...toRefs(n5BunpouIds, 'bunpou'),
  ...toRefs(n5KanjiIds, 'kanji'),
  ...toRefs(n5KotobaIds, 'kotoba'),
];

// 3. MINNA NO NIHONGO II (N4)
const n4BunpouIds = bunpouList
  .filter(b => b.id.includes('_n4_'))
  .slice(0, 100)
  .map(b => b.id);

const n4KanjiIds = kanjiList
  .filter(k => k.jlpt === 'N4')
  .slice(0, 100)
  .map(k => k.id || k.character);

const n4KotobaIds = kotobaList
  .filter(k => k.jlpt === 'N4' || k.level === 'N4')
  .slice(0, 150)
  .map(k => k.id);

const minnaN4Refs: DeckItemRef[] = [
  ...toRefs(n4BunpouIds, 'bunpou'),
  ...toRefs(n4KanjiIds, 'kanji'),
  ...toRefs(n4KotobaIds, 'kotoba'),
];

// 4. SOUMATOME N3 (Canonical 6-week 132 grammar points)
const soumatomeN3BunpouIds = bunpouList
  .filter(b => b.id.startsWith('w'))
  .map(b => b.id);

const n3AllKanji = kanjiList.filter(k => k.jlpt === 'N3').map(k => k.id || k.character);
const n3AllKotoba = kotobaList.filter(k => k.jlpt === 'N3' || k.level === 'N3').map(k => k.id);

const soumatomeN3Refs: DeckItemRef[] = [
  ...toRefs(soumatomeN3BunpouIds, 'bunpou'),
  ...toRefs(n3AllKanji.slice(0, 100), 'kanji'),
  ...toRefs(n3AllKotoba.slice(0, 150), 'kotoba'),
];

// 5. SHIN KANZEN MASTER N3
const kanzenN3BunpouIds = bunpouList
  .filter(b => b.id.includes('_n3_') || (b.id.startsWith('w') && parseInt(b.id.charAt(1) || '0', 10) >= 4))
  .slice(0, 60)
  .map(b => b.id);

const kanzenN3Refs: DeckItemRef[] = [
  ...toRefs(kanzenN3BunpouIds.length > 0 ? kanzenN3BunpouIds : soumatomeN3BunpouIds.slice(60, 120), 'bunpou'),
  ...toRefs(n3AllKanji.slice(100, 200), 'kanji'),
  ...toRefs(n3AllKotoba.slice(150, 300), 'kotoba'),
];

// 6. SOUMATOME N2
const n2AllBunpou = bunpouList.filter(b => b.id.includes('_n2_')).map(b => b.id);
const n2AllKanji = kanjiList.filter(k => k.jlpt === 'N2').map(k => k.id || k.character);
const n2AllKotoba = kotobaList.filter(k => k.jlpt === 'N2' || k.level === 'N2').map(k => k.id);

const soumatomeN2Refs: DeckItemRef[] = [
  ...toRefs(n2AllBunpou.slice(0, 100), 'bunpou'),
  ...toRefs(n2AllKanji.slice(0, 100), 'kanji'),
  ...toRefs(n2AllKotoba.slice(0, 150), 'kotoba'),
];

// 7. SHIN KANZEN MASTER N2
const kanzenN2Refs: DeckItemRef[] = [
  ...toRefs(n2AllBunpou.slice(100, 200), 'bunpou'),
  ...toRefs(n2AllKanji.slice(100, 200), 'kanji'),
  ...toRefs(n2AllKotoba.slice(150, 300), 'kotoba'),
];

// 8. SHIN KANZEN MASTER N1
const n1AllBunpou = bunpouList.filter(b => b.id.includes('_n1_')).map(b => b.id);
const n1AllKanji = kanjiList.filter(k => k.jlpt === 'N1').map(k => k.id || k.character);
const n1AllKotoba = kotobaList.filter(k => k.jlpt === 'N1' || k.level === 'N1').map(k => k.id);

const kanzenN1Refs: DeckItemRef[] = [
  ...toRefs(n1AllBunpou.slice(0, 120), 'bunpou'),
  ...toRefs(n1AllKanji.slice(0, 120), 'kanji'),
  ...toRefs(n1AllKotoba.slice(0, 150), 'kotoba'),
];

// 9. KAIGO & TOKUTEI GINOU (Caregiver & SSW)
const kaigoKotobaIds = kotobaList
  .filter(k => (k as any).tags?.includes('Kaigo') || (k as any).tags?.includes('SSW') || k.jlpt === 'Kaigo' || k.jlpt === 'SSW')
  .map(k => k.id);

const kaigoKanjiKeywords = ['介', '護', '病', '院', '薬', '医', '体', '患', '熱', '痛', '血', '便', '尿', '食', '歩', '寝', '洗', '顔', '歯', '耳', '目', '手', '足', '骨'];
const kaigoKanjiIds = kanjiList
  .filter(k => kaigoKanjiKeywords.includes(k.character))
  .map(k => k.id || k.character);

const kaigoRefs: DeckItemRef[] = [
  ...toRefs(kaigoKanjiIds, 'kanji'),
  ...toRefs(kaigoKotobaIds, 'kotoba'),
];

export const TEMPLATE_DECKS: UserDeck[] = [
  {
    id: 'template_kana_dojo',
    title: 'Kuil Aksara Kana Dojo (修練の庭)',
    description: 'Fondasi aksara Jepang: Hiragana & Katakana lengkap (Seion dasar, Dakuon tengteng, Handakuon maru) dilengkapi latihan kuas kaligrafi dan kosakata ucapan dasar.',
    level: 'KANA',
    type: 'mixed',
    isDefault: false,
    coverIcon: '仮',
    createdAt: now,
    updatedAt: now,
    items: kanaRefs,
  },
  {
    id: 'template_minna_n5',
    title: 'Deck Minna no Nihongo I (初級I · N5)',
    description: 'Kurikulum standar Bab 1〜25: Partikel penting, kata kerja harian, bentuk -te, tata bahasa dasar, dan 79 Kanji resmi N5.',
    level: 'N5',
    type: 'mixed',
    isDefault: false,
    coverIcon: '初',
    createdAt: now,
    updatedAt: now,
    items: minnaN5Refs,
  },
  {
    id: 'template_minna_n4',
    title: 'Deck Minna no Nihongo II (初級II · N4)',
    description: 'Kurikulum pra-menengah Bab 26〜50: Bentuk potensial, pengandaian (tara/ba), kalimat pasif, kausatif, keigo, dan kanji N4.',
    level: 'N4',
    type: 'mixed',
    isDefault: false,
    coverIcon: '進',
    createdAt: now,
    updatedAt: now,
    items: minnaN4Refs,
  },
  {
    id: 'template_soumatome_n3',
    title: 'Deck Nihongo Soumatome N3 (志の世界)',
    description: 'Peta terstruktur 6 minggu Soumatome N3: 132 pola kalimat esensial menengah, kanji tematik, dan kosakata percakapan kontekstual.',
    level: 'N3',
    type: 'mixed',
    isDefault: false,
    coverIcon: '志',
    createdAt: now,
    updatedAt: now,
    items: soumatomeN3Refs,
  },
  {
    id: 'template_kanzen_n3',
    title: 'Deck Shin Kanzen Master N3 (完全マスター N3)',
    description: 'Pendalaman tata bahasa & presisi nuansa kalimat menengah JLPT N3: perbedaan ekspresi serupa, kanji fungsional, dan kotoba ujian.',
    level: 'N3',
    type: 'mixed',
    isDefault: false,
    coverIcon: '極',
    createdAt: now,
    updatedAt: now,
    items: kanzenN3Refs,
  },
  {
    id: 'template_soumatome_n2',
    title: 'Deck Nihongo Soumatome N2 (精鋭の世界)',
    description: 'Kurikulum mahir JLPT N2: Pola kalimat formal berita/bisnis, ekspresi emosional lanjutan, serta kanji & kosakata tingkat tinggi.',
    level: 'N2',
    type: 'mixed',
    isDefault: false,
    coverIcon: '精',
    createdAt: now,
    updatedAt: now,
    items: soumatomeN2Refs,
  },
  {
    id: 'template_kanzen_n2',
    title: 'Deck Shin Kanzen Master N2 (完全マスター N2)',
    description: 'Penguasaan komprehensif struktur tata bahasa & analisis nuansa rumit JLPT N2 untuk target skor maksimal.',
    level: 'N2',
    type: 'mixed',
    isDefault: false,
    coverIcon: '達',
    createdAt: now,
    updatedAt: now,
    items: kanzenN2Refs,
  },
  {
    id: 'template_kanzen_n1',
    title: 'Deck Shin Kanzen Master N1 (頂点の領域)',
    description: 'Puncak keahlian JLPT N1: Pola kalimat sastra klasik/formal tingkat tinggi, kanji kompleks, dan kosakata abstrak tingkat mahir.',
    level: 'N1',
    type: 'mixed',
    isDefault: false,
    coverIcon: '頂',
    createdAt: now,
    updatedAt: now,
    items: kanzenN1Refs,
  },
  {
    id: 'template_kaigo_ssw',
    title: 'Deck Keperawatan Kaigo & Tokutei Ginou (介護と特定技能)',
    description: '397 Kosakata & Kanji Praktis Caregiver: Istilah medis dasar, pengukuran tanda vital, komunikasi lansia (利用者), ambulasi, ekskresi, kebersihan, dan etika kerja lapangan di Jepang.',
    level: 'Kaigo',
    type: 'mixed',
    isDefault: false,
    coverIcon: '介',
    createdAt: now,
    updatedAt: now,
    items: kaigoRefs,
  },
];

/**
 * Get a template deck by its ID
 */
export function getTemplateDeckById(id: string): UserDeck | undefined {
  return TEMPLATE_DECKS.find(deck => deck.id === id);
}

/**
 * 1-Click clone a template deck into user's personal Buku Saku decks
 */
export function cloneTemplateToUserDecks(
  templateId: string,
  currentDecks: UserDeck[] = []
): { updatedDecks: UserDeck[]; clonedDeck: UserDeck | null } {
  const template = getTemplateDeckById(templateId);
  if (!template) {
    return { updatedDecks: currentDecks, clonedDeck: null };
  }

  const newId = `deck_cloned_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const clonedDeck: UserDeck = {
    ...template,
    id: newId,
    title: `${template.title} (Salinan)`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Clone items array
    items: template.items.map(item => ({ ...item, addedAt: new Date().toISOString() })),
  };

  return {
    updatedDecks: [clonedDeck, ...currentDecks],
    clonedDeck,
  };
}
