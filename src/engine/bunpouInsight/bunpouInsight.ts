// Engine "Bedah Pola": merangkai catatan kurasi pola kalimat menjadi bahan tab Bedah Pola
// (komponen, pembentukan makna, sorotan di contoh kalimat, keluarga pola, cek cepat).
// Semua deterministik: tidak ada data yang dikarang di luar catatan kurasi.

import type { BunpouItem } from '../../types/content';
import {
  BUNPOU_PATTERN_INSIGHTS,
  type PatternInsightNote,
  type PatternPart,
  type PatternTransparency,
} from '../../data/bunpouPatternInsights';

export interface PatternExample {
  japanese: string;
  reading: string;
  meaningId: string;
  /** Rentang [awal, akhir) pola di dalam `japanese`, bila ditemukan. */
  highlight?: [number, number];
}

export interface PatternFamilyMember {
  id: string;
  title: string;
  meaning: string;
  level: string;
  /** true bila pola ini adalah komponen itu sendiri (mis. pola 「は」 untuk komponen は). */
  standalone: boolean;
}

export interface PatternFamilyGroup {
  /** Komponen yang menghubungkan, mis. いけない. */
  key: string;
  members: PatternFamilyMember[];
  /** Jumlah anggota lain yang tidak ditampilkan. */
  more: number;
}

export interface PatternQuiz {
  part: PatternPart;
  partIndex: number;
  options: string[];
  correctIndex: number;
}

export interface PatternInsight {
  id: string;
  title: string;
  parts: PatternPart[];
  literal: string;
  natural: string;
  explanation: string;
  transparency: PatternTransparency;
  examples: PatternExample[];
  family: PatternFamilyGroup[];
}

export const FAMILY_LIMIT = 4;

export function hasPatternInsight(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUNPOU_PATTERN_INSIGHTS, id);
}

export const partKey = (p: PatternPart) => p.base ?? p.text;

/** Judul pola dinormalisasi menjadi bentuk-bentuk dasarnya: 「〜てもいい」 → ['てもいい']. */
export function titleForms(title: string): string[] {
  return title
    .replace(/[（(].*?[）)]/g, '')
    .split(/[・／/]/)
    .map(t => t.replace(/[〜~\s]/g, '').trim())
    .filter(Boolean);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Judul ringkas: buang catatan dalam kurung (judul pola lama N3 memuat rumus lengkap di dalam kurung). */
export function shortTitle(title: string): string {
  return title.replace(/\s*[（(].*$/, '').trim() || title;
}

/** Judul tampilan: judul kurasi bila ada, selain itu judul database tanpa catatan dalam kurung. */
export function displayTitle(item: Pick<BunpouItem, 'id' | 'title'>): string {
  return BUNPOU_PATTERN_INSIGHTS[item.id]?.title ?? shortTitle(item.title);
}

/** Cari rentang pola di kalimat. Pola bisa berubah bentuk, jadi pakai `match` kurasi bila ada. */
export function findPatternSpan(sentence: string, note: PatternInsightNote, title: string): [number, number] | undefined {
  const sources = note.match?.length ? note.match : titleForms(title).filter(t => t.length > 1).map(escapeRe);
  for (const src of sources) {
    const m = new RegExp(src).exec(sentence);
    if (m && m[0].length > 0) return [m.index, m.index + m[0].length];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Keluarga pola: pola lain yang berbagi komponen.
// ---------------------------------------------------------------------------

const LEVEL_ORDER: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

function familyIndex(): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const [id, note] of Object.entries(BUNPOU_PATTERN_INSIGHTS)) {
    for (const key of new Set(note.parts.map(partKey))) {
      if (!idx.has(key)) idx.set(key, []);
      idx.get(key)!.push(id);
    }
  }
  return idx;
}

let cachedIndex: Map<string, string[]> | null = null;
let cachedStandalone: { db: Record<string, BunpouItem>; map: Map<string, string[]> } | null = null;

function standaloneIndex(db: Record<string, BunpouItem>): Map<string, string[]> {
  if (cachedStandalone?.db === db) return cachedStandalone.map;
  const map = new Map<string, string[]>();
  for (const item of Object.values(db)) {
    for (const form of titleForms(item.title)) {
      if (!map.has(form)) map.set(form, []);
      if (!map.get(form)!.includes(item.id)) map.get(form)!.push(item.id);
    }
  }
  cachedStandalone = { db, map };
  return map;
}

function buildFamily(id: string, note: PatternInsightNote, db: Record<string, BunpouItem>): PatternFamilyGroup[] {
  cachedIndex ??= familyIndex();
  const standalone = standaloneIndex(db);
  const groups: PatternFamilyGroup[] = [];
  const seenKeys = new Set<string>();

  for (const part of note.parts) {
    const key = partKey(part);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const ids: { id: string; standalone: boolean }[] = [];
    for (const sid of standalone.get(key) ?? []) ids.push({ id: sid, standalone: true });
    for (const cid of cachedIndex.get(key) ?? []) {
      if (!ids.some(x => x.id === cid)) ids.push({ id: cid, standalone: false });
    }

    const members = ids
      .filter(x => x.id !== id && db[x.id])
      .map(x => {
        const item = db[x.id];
        return {
          id: item.id,
          title: displayTitle(item),
          meaning: BUNPOU_PATTERN_INSIGHTS[item.id]?.natural ?? item.meaningId,
          level: item.level,
          standalone: x.standalone,
        };
      })
      .sort(
        (a, b) =>
          Number(b.standalone) - Number(a.standalone) ||
          (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) ||
          a.id.localeCompare(b.id)
      );

    if (members.length === 0) continue;
    groups.push({ key, members: members.slice(0, FAMILY_LIMIT), more: Math.max(0, members.length - FAMILY_LIMIT) });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Rakitan utama
// ---------------------------------------------------------------------------

export function buildPatternInsight(item: BunpouItem, db: Record<string, BunpouItem>): PatternInsight | null {
  const note = BUNPOU_PATTERN_INSIGHTS[item.id];
  if (!note) return null;

  const examples: PatternExample[] = item.examples.map(ex => ({
    japanese: ex.japanese,
    reading: ex.reading,
    meaningId: ex.meaningId,
    highlight: findPatternSpan(ex.japanese, note, item.title),
  }));

  return {
    id: item.id,
    title: displayTitle(item),
    parts: note.parts,
    literal: note.literal,
    natural: note.natural,
    explanation: note.explanation,
    transparency: note.transparency,
    examples,
    family: buildFamily(item.id, note, db),
  };
}

// ---------------------------------------------------------------------------
// Cek cepat: "Dalam pola X, komponen Y berarti …?" (pengecoh dari komponen pola lain)
// ---------------------------------------------------------------------------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Komponen yang bisa ditanyakan (yang dihilangkan saat diucapkan tidak ditanyakan). */
export function quizzablePartIndexes(insight: Pick<PatternInsight, 'parts'>): number[] {
  return insight.parts.map((p, i) => (p.omitted ? -1 : i)).filter(i => i >= 0);
}

export function buildPartQuiz(id: string, partIndex: number): PatternQuiz | null {
  const note = BUNPOU_PATTERN_INSIGHTS[id];
  const part = note?.parts[partIndex];
  if (!part) return null;

  const ownKeys = new Set(note.parts.map(partKey));
  const pool: string[] = [];
  for (const other of Object.values(BUNPOU_PATTERN_INSIGHTS)) {
    for (const p of other.parts) {
      if (ownKeys.has(partKey(p)) || p.meaning === part.meaning || pool.includes(p.meaning)) continue;
      // Pengecoh yang menyebut komponen ini sendiri (mis. ん = "の yang diucapkan ringkas") bisa ikut benar.
      if ([...ownKeys].some(k => p.meaning.includes(k))) continue;
      pool.push(p.meaning);
    }
  }
  if (pool.length < 3) return null;

  const seed = hash(`${id}#${partIndex}`);
  const distractors = seededShuffle(pool, seed).slice(0, 3);
  const options = seededShuffle([part.meaning, ...distractors], seed ^ 0x9e3779b9);
  return { part, partIndex, options, correctIndex: options.indexOf(part.meaning) };
}
