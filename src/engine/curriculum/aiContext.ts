// ==============================================================================
// KONTEKS AI UNTUK MISI HARIAN — murni, tanpa React, tanpa jaringan.
// Menyusun materi Misi Harian (kurikulum Guided Learning) menjadi dokumen teks terstruktur yang bisa
// ditempel ke ChatGPT / Claude. Hanya memakai data materi yang benar-benar ada; field kosong dilewati.
// Sengaja TIDAK memuat data pribadi pengguna (email, ID akun, skor, riwayat, mastery).
// ==============================================================================

import type { BunpouItem, ExampleSentence, KanjiItem, KotobaItem } from '../../types/content';
import type { DeckItemCategory, DeckItemRef, UserDeck } from '../../types/rpg';
import type { GuidedCategory, GuidedDay, GuidedProfile } from './types';

export interface AiContextDatabases {
  kotoba: Readonly<Record<string, KotobaItem | undefined>>;
  kanji: Readonly<Record<string, KanjiItem | undefined>>;
  bunpou: Readonly<Record<string, BunpouItem | undefined>>;
}

export interface AiContextInput {
  day: GuidedDay;
  /** Hari ke-n dalam program (opsional). */
  dayIndex?: number;
  profile?: Pick<GuidedProfile, 'currentLevel' | 'targetLevel'>;
  db: AiContextDatabases;
}

export interface AiContextResult {
  text: string;
  counts: Record<GuidedCategory, number> & { missing: number };
}

const CATEGORY_ORDER: GuidedCategory[] = ['kotoba', 'kanji', 'bunpou'];
const CATEGORY_LABEL: Record<GuidedCategory, string> = { kotoba: 'KOTOBA (kosakata)', kanji: 'KANJI', bunpou: 'BUNPOU (tata bahasa)' };

const clean = (v: string | undefined | null): string => (v ?? '').trim();

/** Tambah baris "Label: nilai" hanya bila nilainya ada. */
function field(lines: string[], label: string, value: string | undefined | null, indent = ''): void {
  const v = clean(value);
  if (v) lines.push(`${indent}- ${label}: ${v}`);
}

function list(lines: string[], label: string, values: ReadonlyArray<string> | undefined, indent = ''): void {
  const vs = (values || []).map(clean).filter(Boolean);
  if (vs.length) lines.push(`${indent}- ${label}: ${vs.join(' / ')}`);
}

function examples(lines: string[], items: ReadonlyArray<ExampleSentence> | undefined, indent = ''): void {
  if (!items?.length) return;
  lines.push(`${indent}- Contoh kalimat:`);
  items.forEach((e, i) => {
    const parts = [clean(e.japanese), clean(e.reading) && `(${clean(e.reading)})`, clean(e.meaningId) && `→ ${clean(e.meaningId)}`];
    lines.push(`${indent}  ${i + 1}. ${parts.filter(Boolean).join(' ')}`);
  });
}

function kotobaBlock(n: number, k: KotobaItem): string[] {
  const l: string[] = [`### ${n}. [KOTOBA] ${k.word}  (ID: ${k.id})`];
  field(l, 'Bacaan', k.reading);
  field(l, 'Arti (ID)', k.meaningId);
  field(l, 'Arti (EN)', k.meaningEn);
  field(l, 'Definisi (ID)', k.definitionId);
  field(l, 'Arti (JA)', k.meaningJa);
  field(l, 'Level JLPT', k.jlpt);
  field(l, 'Jenis kata', k.wordType);
  list(l, 'Komponen kanji', k.kanjiComponents);
  if (k.exampleSentence) {
    examples(l, [{ japanese: k.exampleSentence.japanese, reading: k.exampleSentence.reading, meaningId: k.exampleSentence.meaningId }]);
  }
  list(l, 'Kolokasi', k.collocations);
  list(l, 'Kata terkait', k.relatedWords);
  field(l, 'Unit', k.unitName);
  list(l, 'Tag', k.tags);
  return l;
}

function kanjiBlock(n: number, k: KanjiItem): string[] {
  const l: string[] = [`### ${n}. [KANJI] ${k.character}  (ID: ${k.id})`];
  field(l, 'Arti (ID)', k.meaningId);
  field(l, 'Arti (EN)', k.meaningEn);
  list(l, 'Onyomi', k.onyomi);
  list(l, 'Kunyomi', k.kunyomi);
  field(l, 'Level JLPT', k.jlpt);
  if (k.strokeCount) field(l, 'Jumlah goresan', String(k.strokeCount));
  field(l, 'Radikal', [clean(k.radical), clean(k.radicalName) && `(${clean(k.radicalName)})`].filter(Boolean).join(' '));
  if (k.relatedWords?.length) {
    l.push('- Kata terkait:');
    k.relatedWords.forEach(w => {
      l.push(`  - ${clean(w.word)}${clean(w.reading) ? ` (${clean(w.reading)})` : ''}${clean(w.meaningId) ? ` → ${clean(w.meaningId)}` : ''}`);
    });
  }
  return l;
}

function bunpouBlock(n: number, b: BunpouItem): string[] {
  const l: string[] = [`### ${n}. [BUNPOU] ${b.title}  (ID: ${b.id})`];
  field(l, 'Bacaan', b.reading);
  field(l, 'Arti (ID)', b.meaningId);
  field(l, 'Arti (EN)', b.meaningEn);
  field(l, 'Level JLPT', b.level);
  field(l, 'Rumus / pola', b.formula);
  field(l, 'Penjelasan', b.explanation);
  field(l, 'Nuansa', b.nuance);
  field(l, 'Kategori pola', b.categoryType);
  list(l, 'Fungsi', b.functions);
  field(l, 'Inti', b.keyTakeaway);
  list(l, 'Kata kunci terkait', b.relatedKeywords);
  examples(l, b.examples);
  if (b.subFormulas?.length) {
    l.push('- Sub-pola:');
    b.subFormulas.forEach(s => {
      l.push(`  - ${clean(s.token)}${clean(s.meaning) ? ` — ${clean(s.meaning)}` : ''}`);
      field(l, 'Posisi pemakaian', s.usageLocation, '    ');
      (s.connectionConditions || []).forEach(c => {
        l.push(`    - Sambungan (${clean(c.partOfSpeech)}): ${clean(c.rule)}${clean(c.example) ? ` — contoh: ${clean(c.example)}` : ''}`);
      });
      examples(l, s.examples, '    ');
    });
  }
  if (b.comparisonNotes?.length) {
    l.push('- Perbandingan dengan pola lain:');
    b.comparisonNotes.forEach(c => l.push(`  - vs ${clean(c.targetGrammar)}: ${clean(c.difference)}`));
  }
  return l;
}

const instructions = (what: string, scope: string): string[] => [
  `Dokumen ini berisi materi dari ${what} aplikasi belajar bahasa Jepang SevnQuest.`,
  `- Jadikan daftar materi di bawah sebagai SUMBER UTAMA saat aku bertanya tentang ${scope} ini.`,
  `- Materi yang tidak tercantum di sini BUKAN bagian dari ${scope} ini; jangan menganggapnya begitu.`,
  '- Bila aku meminta penjelasan, latihan, perbandingan, contoh kalimat, atau review, pakai materi dalam dokumen ini sebagai dasarnya.',
  '- Bila informasi yang kubutuhkan tidak tersedia di dokumen ini, jelaskan keterbatasannya; jangan mengarang data.',
  '- Tiap materi diberi kategori ([KOTOBA] / [KANJI] / [BUNPOU]) dan ID; jangan mencampuradukkan kategorinya.',
  '- Tidak ada metode belajar yang ditetapkan. Ikuti instruksiku berikutnya.',
];

/** Susun dokumen konteks AI untuk satu Misi Harian. Materi yang ID-nya tak ditemukan di basis data dilaporkan, bukan dikarang. */
export function buildDailyMissionAiContext({ day, dayIndex, profile, db }: AiContextInput): AiContextResult {
  const counts = { kotoba: 0, kanji: 0, bunpou: 0, missing: 0 };
  const body: string[] = [];
  const missingIds: string[] = [];

  for (const cat of CATEGORY_ORDER) {
    const ids = [...new Set(day[cat] || [])];
    if (!ids.length) continue;
    body.push('', `## ${CATEGORY_LABEL[cat]} — ${ids.length} materi`);
    let n = 0;
    for (const id of ids) {
      const item = db[cat][id];
      if (!item) {
        counts.missing++;
        missingIds.push(`${cat}:${id}`);
        continue;
      }
      n++;
      counts[cat]++;
      const block =
        cat === 'kotoba' ? kotobaBlock(n, item as KotobaItem)
        : cat === 'kanji' ? kanjiBlock(n, item as KanjiItem)
        : bunpouBlock(n, item as BunpouItem);
      body.push('', ...block);
    }
  }

  const head: string[] = ['# KONTEKS MATERI — MISI HARIAN SEVNQUEST', '', '## Instruksi untuk AI', ...instructions('Misi Harian', 'misi'), '', '## Identitas Misi'];
  head.push(`- Jenis: Misi Harian (kurikulum Guided Learning)`);
  head.push(`- Tanggal: ${day.date}`);
  if (dayIndex) head.push(`- Hari ke: ${dayIndex}`);
  if (profile) head.push(`- Jalur level: ${profile.currentLevel} → ${profile.targetLevel}`);
  head.push(`- Jumlah materi: ${counts.kotoba} kotoba, ${counts.kanji} kanji, ${counts.bunpou} bunpou`);
  if (day.recallTarget) {
    head.push(`- Catatan: misi Recall (${day.recallTarget} jawaban) mengulang materi jatuh tempo yang dipilih sistem; daftarnya tidak disertakan dokumen ini.`);
  }
  if (missingIds.length) {
    head.push(`- Catatan: ${missingIds.length} materi tidak ditemukan di basis data dan dilewati (${missingIds.join(', ')}).`);
  }
  if (counts.kotoba + counts.kanji + counts.bunpou === 0) {
    body.push('', 'Misi ini tidak memiliki daftar materi baru (kotoba/kanji/bunpou).');
  }

  return { text: [...head, ...body, '', '# AKHIR KONTEKS'].join('\n') + '\n', counts };
}

// ------------------------------------------------------------------ DECK

export type DeckSourceKind = 'official' | 'bookmark' | 'custom';

export interface DeckAiContextInput {
  deck: Pick<UserDeck, 'title' | 'description' | 'level' | 'items'>;
  kind: DeckSourceKind;
  db: AiContextDatabases;
}

const DECK_KIND_LABEL: Record<DeckSourceKind, string> = {
  official: 'Deck resmi SevnQuest',
  bookmark: 'Buku Saku Bookmark (dikumpulkan pengguna)',
  custom: 'Deck buatan pengguna',
};

/** Materi kustom buatan pengguna (tanpa entri di basis data): hanya field yang memang diisi pengguna. */
function customBlock(n: number, category: DeckItemCategory, ref: DeckItemRef): string[] {
  const c = ref.customData!;
  const l: string[] = [`### ${n}. [${category.toUpperCase()}] ${clean(c.word)}  (ID: ${ref.id}) — materi kustom buatan pengguna, bukan dari basis data SevnQuest`];
  field(l, 'Bacaan', c.reading);
  field(l, 'Arti', c.meaning);
  field(l, 'Level', c.level);
  if (clean(c.exampleJp)) {
    examples(l, [{ japanese: c.exampleJp!, reading: clean(c.exampleReading) === clean(c.exampleJp) ? '' : c.exampleReading || '', meaningId: c.exampleId || '' }]);
  }
  return l;
}

/** Dokumen konteks AI untuk satu deck (resmi, buatan sendiri, atau Buku Saku Bookmark). */
export function buildDeckAiContext({ deck, kind, db }: DeckAiContextInput): AiContextResult {
  const counts = { kotoba: 0, kanji: 0, bunpou: 0, missing: 0 };
  const body: string[] = [];
  const missingIds: string[] = [];
  const seen = new Set<string>();
  const refs = (deck.items || []).filter(r => {
    const key = `${r.category}:${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const cat of CATEGORY_ORDER) {
    const inCat = refs.filter(r => r.category === cat);
    if (!inCat.length) continue;
    body.push('', `## ${CATEGORY_LABEL[cat]} — ${inCat.length} materi`);
    let n = 0;
    for (const ref of inCat) {
      const master = db[cat][ref.id];
      let block: string[] | undefined;
      if (master) {
        block = cat === 'kotoba' ? kotobaBlock(n + 1, master as KotobaItem)
          : cat === 'kanji' ? kanjiBlock(n + 1, master as KanjiItem)
          : bunpouBlock(n + 1, master as BunpouItem);
      } else if (ref.customData) {
        block = customBlock(n + 1, cat, ref);
      }
      if (!block) {
        counts.missing++;
        missingIds.push(`${cat}:${ref.id}`);
        continue;
      }
      n++;
      counts[cat]++;
      body.push('', ...block);
    }
  }

  const head: string[] = ['# KONTEKS MATERI — DECK SEVNQUEST', '', '## Instruksi untuk AI', ...instructions('sebuah deck', 'deck'), '', '## Identitas Deck'];
  head.push(`- Nama: ${clean(deck.title)}`);
  head.push(`- Jenis: ${DECK_KIND_LABEL[kind]}`);
  field(head, 'Deskripsi', deck.description);
  field(head, 'Level', deck.level);
  head.push(`- Jumlah materi: ${counts.kotoba} kotoba, ${counts.kanji} kanji, ${counts.bunpou} bunpou`);
  if (missingIds.length) {
    head.push(`- Catatan: ${missingIds.length} materi tidak ditemukan di basis data dan dilewati (${missingIds.join(', ')}).`);
  }
  if (counts.kotoba + counts.kanji + counts.bunpou === 0) body.push('', 'Deck ini belum berisi materi.');

  return { text: [...head, ...body, '', '# AKHIR KONTEKS'].join('\n') + '\n', counts };
}
