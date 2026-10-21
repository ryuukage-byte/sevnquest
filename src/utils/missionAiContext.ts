// ==============================================================================
// KONTEKS DAILY MISSION UNTUK AI EKSTERNAL (murni, tanpa React)
//
// Menyusun dokumen teks terstruktur dari satu misi harian (Guided Learning) berdasarkan basis data asli.
// Dokumen disalin pengguna lalu ditempel ke ChatGPT / Claude / AI lain. Tidak ada panggilan API AI di sini.
// Field yang kosong di basis data tidak ditulis, dan ID yang tidak ditemukan ditandai, tidak diisi karangan.
// ==============================================================================

import type { ExampleSentence, ItemMasteryRecord } from '../types/content';
import type { GuidedCategory, GuidedItemState } from '../engine/curriculum/types';
import { itemState } from '../engine/curriculum/curriculum';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';

export interface MissionContextInput {
  /** Judul misi yang tampil di aplikasi, mis. "Kotoba Baru". */
  missionTitle: string;
  category: GuidedCategory;
  /** Tanggal lokal misi, YYYY-MM-DD. */
  date: string;
  dayIndex: number;
  durationDays: number;
  currentLevel: string;
  targetLevel: string;
  /** ID materi yang ditugaskan pada misi ini (hanya kategori ini). */
  ids: string[];
  /** ID yang tertunda dari hari sebelumnya. */
  carried: ReadonlySet<string>;
  mastery?: Record<string, ItemMasteryRecord>;
}

const CATEGORY_NAME: Record<GuidedCategory, string> = {
  kotoba: 'kotoba (kosakata)',
  kanji: 'kanji',
  bunpou: 'bunpou (pola tata bahasa)',
};

const STATE_NAME: Record<GuidedItemState, string> = {
  baru: 'baru',
  dibuka: 'dibuka (baru dilihat, belum dipelajari)',
  dipelajari: 'dipelajari',
  dikuasai: 'dikuasai',
};

const AI_INSTRUCTIONS = [
  'Dokumen ini berisi materi dari Daily Mission SevnQuest (aplikasi belajar bahasa Jepang).',
  'Gunakan daftar materi di bawah sebagai sumber utama ketika pengguna bertanya tentang misi ini.',
  'Jangan menganggap materi yang tidak tercantum di daftar ini sebagai bagian dari misi.',
  'Jika pengguna meminta penjelasan, latihan, perbandingan, contoh kalimat, atau review, gunakan materi dalam dokumen ini sebagai dasar.',
  'Jika informasi yang dibutuhkan tidak tersedia di dokumen, jelaskan keterbatasannya daripada mengarang data.',
  'Pertahankan teks Jepang, furigana, dan kategori setiap materi apa adanya. Jangan mencampuradukkan kategori.',
  'Jangan memaksakan satu metode belajar tertentu. Ikuti instruksi pengguna berikutnya.',
];

type Line = string | false | undefined;
const compact = (lines: Line[]): string[] => lines.filter((l): l is string => Boolean(l));

function describeKotoba(id: string): string[] {
  const k = KOTOBA_DATABASE[id];
  if (!k) return [`- Data: tidak ditemukan di basis data (ID ${id})`];
  return compact([
    `- Kata: ${k.word}`,
    `- Bacaan: ${k.reading}`,
    `- Arti (Indonesia): ${k.meaningId}`,
    k.definitionId && `- Penjelasan (Indonesia): ${k.definitionId}`,
    `- Arti (Inggris): ${k.meaningEn}`,
    k.meaningJa && `- Arti (Jepang): ${k.meaningJa}`,
    `- Jenis kata: ${k.wordType}`,
    `- JLPT: ${k.jlpt}`,
    k.kanjiComponents?.length > 0 && `- Kanji penyusun: ${k.kanjiComponents.join(', ')}`,
    k.exampleSentence && `- Contoh kalimat: ${formatExample(k.exampleSentence)}`,
    k.collocations?.length ? `- Kolokasi: ${k.collocations.join(', ')}` : false,
  ]);
}

function describeKanji(id: string): string[] {
  const k = KANJI_DATABASE[id];
  if (!k) return [`- Data: tidak ditemukan di basis data (ID ${id})`];
  return compact([
    `- Karakter: ${k.character}`,
    `- Arti (Indonesia): ${k.meaningId}`,
    `- Arti (Inggris): ${k.meaningEn}`,
    k.onyomi?.length > 0 && `- On'yomi: ${k.onyomi.join('、')}`,
    k.kunyomi?.length > 0 && `- Kun'yomi: ${k.kunyomi.join('、')}`,
    `- JLPT: ${k.jlpt}`,
    `- Jumlah goresan: ${k.strokeCount}`,
    `- Radikal: ${k.radical} (${k.radicalName})`,
    k.relatedWords?.length > 0 && `- Kosakata terkait: ${k.relatedWords.map(w => `${w.word} (${w.reading}) — ${w.meaningId}`).join('; ')}`,
  ]);
}

function describeBunpou(id: string): string[] {
  const b = BUNPOU_DATABASE[id];
  if (!b) return [`- Data: tidak ditemukan di basis data (ID ${id})`];
  const examples = (b.examples || []).map(ex => `  - ${formatExample(ex)}`);
  return compact([
    `- Judul: ${b.title}`,
    `- Bacaan: ${b.reading}`,
    `- Arti (Indonesia): ${b.meaningId}`,
    `- Arti (Inggris): ${b.meaningEn}`,
    `- Level: ${b.level}`,
    `- Pola: ${b.formula}`,
    `- Penjelasan: ${b.explanation}`,
    b.nuance && `- Nuansa: ${b.nuance}`,
    b.keyTakeaway && `- Inti: ${b.keyTakeaway}`,
    examples.length > 0 && '- Contoh:',
    ...examples,
  ]);
}

function formatExample(ex: ExampleSentence): string {
  return compact([
    `${ex.japanese}`,
    ex.reading && `(${ex.reading})`,
    ex.meaningId && `— ${ex.meaningId}`,
  ]).join(' ');
}

const DESCRIBE: Record<GuidedCategory, (id: string) => string[]> = {
  kotoba: describeKotoba,
  kanji: describeKanji,
  bunpou: describeBunpou,
};

/** Dokumen konteks lengkap untuk satu Daily Mission, siap disalin ke AI eksternal. */
export function buildMissionAiContext(input: MissionContextInput): string {
  const program = `${input.currentLevel === 'PEMULA' ? 'Pemula' : input.currentLevel} → ${input.targetLevel}`;
  const missionId = `guided_${input.category}_${input.date}`;

  const header = [
    '# Konteks Daily Mission — SevnQuest',
    '',
    '## Instruksi untuk AI',
    ...AI_INSTRUCTIONS.map(line => `- ${line}`),
    '',
    '## Identitas Misi',
    `- Misi: ${input.missionTitle}`,
    `- ID misi: ${missionId}`,
    `- Kategori: ${CATEGORY_NAME[input.category]}`,
    `- Tanggal: ${input.date}`,
    `- Hari ke: ${input.dayIndex} dari ${input.durationDays}`,
    `- Program belajar: ${program}`,
    `- Jumlah materi: ${input.ids.length}`,
    '- Status: status belajar pengguna di SevnQuest (baru, dibuka, dipelajari, dikuasai).',
    '',
    '## Daftar Materi',
  ];

  if (input.ids.length === 0) {
    return [...header, 'Tidak ada materi pada misi ini.', ''].join('\n');
  }

  const items = input.ids.flatMap((id, i) => {
    const state = STATE_NAME[itemState(input.mastery?.[id])];
    const tertunda = input.carried.has(id) ? ', tertunda dari hari sebelumnya' : '';
    return [
      '',
      `### ${i + 1}. [${input.category}] ${id}`,
      `- Status: ${state}${tertunda}`,
      ...DESCRIBE[input.category](id),
    ];
  });

  return [...header, ...items, ''].join('\n');
}
