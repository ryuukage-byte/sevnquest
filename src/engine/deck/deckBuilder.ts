// ==============================================================================
// DECK BUILDER: topik → deck dari materi ASLI (ID kanonik), tanpa LLM.
// Memakai engine pencarian universal; LLM (opsional) hanya memperluas kata kunci.
// ==============================================================================

import { searchJapanese, type SearchResult, type SearchEntityType } from '../search/universalSearch';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { DECK_THEMES, type DeckTheme } from '../../data/deckThemes';
import type { DeckType, DeckItemRef, UserDeck, DeckItemCategory } from '../../types/rpg';

export interface DeckBuildRequest {
  /** Teks bebas dari pengguna. Boleh kosong bila themeId diisi. */
  topic?: string;
  themeId?: string;
  focus: DeckType;
  /** ['ALL'] atau subset N5..N1. */
  levels: string[];
  count: number;
  /** Kata kunci tambahan (mis. dari perluasan LLM). */
  extraKeywords?: string[];
}

export interface DeckBuildItem {
  entityId: string;
  category: DeckItemCategory;
  primaryText: string;
  reading: string;
  meaning: string;
  level: string;
  /** Kata kunci yang membuat materi ini terpilih. */
  matchedTerms: string[];
}

export interface DeckBuildResult {
  items: DeckBuildItem[];
  /** Kata kunci yang dipakai (untuk transparansi di UI). */
  terms: string[];
  /** Jumlah yang diminta tidak tercapai karena data tidak cukup. */
  shortfall: boolean;
}

const STOPWORDS = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'atau', 'the', 'and', 'of', 'in', 'to', 'for', 'bahasa', 'jepang', 'kosakata', 'kata', 'istilah', 'materi', 'deck']);
/** Skor minimal agar kecocokan arti dianggap "topikal" (arti kata utuh / awalan arti). */
const MIN_TOPICAL_SCORE = 0.55;
const MAX_TERMS = 24;

export function getTheme(id?: string): DeckTheme | undefined {
  return id ? DECK_THEMES.find(t => t.id === id) : undefined;
}

/** Pecah topik bebas menjadi kata kunci pencarian. */
export function extractTerms(topic: string): string[] {
  const out: string[] = [];
  const whole = topic.normalize('NFKC').trim().toLowerCase();
  if (whole && whole.length <= 40) out.push(whole);
  for (const raw of whole.split(/[\s,&/+;:()]+/)) {
    const t = raw.trim();
    if (t.length >= 3 && !STOPWORDS.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

const levelOf = (r: SearchResult): string =>
  r.entityType === 'bunpou' ? r.entity.level : r.entity.jlpt;

const allowedTypes = (focus: DeckType): SearchEntityType[] => {
  if (focus === 'kotoba' || focus === 'flashcard') return ['kotoba'];
  if (focus === 'kanji' || focus === 'writing') return ['kanji'];
  if (focus === 'bunpou') return ['bunpou'];
  return ['kotoba', 'kanji', 'bunpou'];
};

/** Porsi per jenis untuk deck campuran; sisa dialihkan ke jenis lain bila kurang. */
const MIXED_SHARE: Record<SearchEntityType, number> = { kotoba: 0.6, kanji: 0.25, bunpou: 0.15 };

interface Cand { r: SearchResult; score: number; terms: string[] }

export function buildDeckFromTopic(req: DeckBuildRequest): DeckBuildResult {
  const theme = getTheme(req.themeId);
  const terms: string[] = [];
  const addTerm = (t: string) => {
    const k = t.normalize('NFKC').trim().toLowerCase();
    if (k && k.length <= 40 && !terms.includes(k) && terms.length < MAX_TERMS) terms.push(k);
  };
  theme?.keywords.forEach(addTerm);
  if (req.topic) extractTerms(req.topic).forEach(addTerm);
  (req.extraKeywords || []).forEach(addTerm);

  const types = allowedTypes(req.focus);
  const levelOk = (lvl: string) => req.levels.includes('ALL') || req.levels.includes(lvl);

  const cands = new Map<string, Cand>();
  const add = (r: SearchResult, weight: number, term: string) => {
    const key = `${r.entityType}:${r.entityId}`;
    const c = cands.get(key);
    if (c) {
      if (!c.terms.includes(term)) { c.terms.push(term); c.score += weight; }
    } else {
      cands.set(key, { r, score: weight, terms: [term] });
    }
  };

  // 1. Pencocokan kata kunci (identitas / arti kata utuh); makin banyak kata kunci cocok, makin tinggi.
  for (const term of terms) {
    for (const r of searchJapanese(term, { entityTypes: types, limit: 400 })) {
      if (r.score < MIN_TOPICAL_SCORE) continue;
      add(r, r.score, term);
    }
  }

  // 2. Tema bertag (mis. Kaigo): semua Kotoba bertag itu menjadi kandidat.
  const tagged = new Set<string>();
  if (theme?.tag && types.includes('kotoba')) {
    for (const item of Object.values(KOTOBA_DATABASE)) {
      if (!item?.tags?.includes(theme.tag)) continue;
      const key = `kotoba:${item.id}`;
      tagged.add(key);
      const existing = cands.get(key);
      if (existing) {
        existing.score += 0.5;
      } else {
        cands.set(key, {
          r: { entityType: 'kotoba', entityId: item.id, primaryText: item.word, reading: item.reading || item.word, romaji: '', meaning: item.meaningId || item.meaningEn || '', matchType: 'meaning', matchedField: 'meaning', score: 0.7, entity: item },
          score: 0.7,
          terms: [theme.tag],
        });
      }
    }
  }

  // 3. Filter level (materi bertag tema selalu lolos), urutkan: skor ↓, level mudah dulu, kata pendek dulu.
  const jlptRank = (l: string) => ({ N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 } as Record<string, number>)[l] ?? 5;
  const sorted = [...cands.entries()]
    .filter(([key, c]) => tagged.has(key) || levelOk(levelOf(c.r)))
    .map(([, c]) => c)
    .sort((a, b) =>
      b.score - a.score ||
      jlptRank(levelOf(a.r)) - jlptRank(levelOf(b.r)) ||
      a.r.primaryText.length - b.r.primaryText.length ||
      a.r.entityId.localeCompare(b.r.entityId));

  // 4. Pilih sesuai fokus.
  let picked: Cand[];
  if (types.length === 1) {
    picked = sorted.slice(0, req.count);
  } else {
    const quota: Record<string, number> = {};
    for (const t of types) quota[t] = Math.max(1, Math.round(req.count * MIXED_SHARE[t]));
    const chosen = new Set<Cand>();
    for (const c of sorted) {
      if (chosen.size >= req.count) break;
      if ((quota[c.r.entityType] ?? 0) > 0) { chosen.add(c); quota[c.r.entityType]--; }
    }
    for (const c of sorted) { // sisa kuota → jenis apa pun yang masih ada
      if (chosen.size >= req.count) break;
      chosen.add(c);
    }
    picked = sorted.filter(c => chosen.has(c));
  }

  const items: DeckBuildItem[] = picked.map(c => ({
    entityId: c.r.entityId,
    category: c.r.entityType,
    primaryText: c.r.primaryText,
    reading: c.r.reading,
    meaning: c.r.meaning,
    level: levelOf(c.r) || '',
    matchedTerms: c.terms,
  }));

  return { items, terms, shortfall: items.length < req.count };
}

/** Bungkus hasil menjadi UserDeck: hanya referensi ke ID kanonik, tanpa customData. */
export function toUserDeck(params: {
  title: string;
  description: string;
  coverIcon: string;
  focus: DeckType;
  levels: string[];
  items: Pick<DeckBuildItem, 'entityId' | 'category'>[];
}): UserDeck {
  const now = new Date().toISOString();
  const refs: DeckItemRef[] = params.items.map(i => ({ id: i.entityId, category: i.category, addedAt: now }));
  return {
    id: `deck_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: params.title,
    description: params.description,
    type: params.focus,
    coverIcon: params.coverIcon,
    level: params.levels.includes('ALL') ? 'ALL' : [...params.levels].sort().join(', '),
    createdAt: now,
    updatedAt: now,
    items: refs,
  };
}
