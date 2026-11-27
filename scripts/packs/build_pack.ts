/**
 * CLI pembuat Pack Kilat.
 *
 *   npx tsx scripts/packs/build_pack.ts N3 [--price 2] [--include-low]
 *
 * Hasil ditulis ke scripts/packs/out/<pack-id>/ (di-ignore git, JANGAN di-commit: isi kurasi tidak boleh bocor):
 *   book.json   isi pack (bentuk OfficialBook)
 *   meta.json   metadata untuk admin_upsert_pack
 *   upload.sql  jalankan di Supabase SQL Editor untuk mengunggah pack sebagai draft
 *   report.md   ringkasan + daftar yang perlu ditinjau manual
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aggregate, buildDictIndex, buildPackBook, examLabel, extractFromExam, noteFor,
  type DictEntry, type Exam, type Hit, type Miss,
} from './packBuilder';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5'] as const;
const DEFAULT_PRICE: Record<string, number> = { N1: 3, N2: 2, N3: 2, N4: 1, N5: 1 };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const level = (process.argv[2] ?? '').toUpperCase() as (typeof LEVELS)[number];
if (!LEVELS.includes(level)) {
  console.error('Pakai: npx tsx scripts/packs/build_pack.ts <N1|N2|N3|N4|N5> [--price n] [--include-low]');
  process.exit(1);
}
const price = Number(arg('--price') ?? DEFAULT_PRICE[level]);
const includeLow = process.argv.includes('--include-low');
const packId = `kilat-${level.toLowerCase()}`;

const dict = JSON.parse(readFileSync(join(ROOT, 'src/data/db/kotoba.json'), 'utf8')) as Record<string, DictEntry>;
const idx = buildDictIndex(Object.values(dict));

const examDir = join(ROOT, 'src/data/tryouts/official');
const files = readdirSync(examDir).filter(f => f.startsWith(`${level.toLowerCase()}_`) && f.endsWith('.json')).sort();
if (files.length === 0) {
  console.error(`Tidak ada tryout resmi ${level} di ${examDir}.`);
  process.exit(1);
}

const hits: Hit[] = [];
const misses: Miss[] = [];
const examIds: string[] = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(join(examDir, f), 'utf8'));
  const exam: Exam = { id: data.id ?? f.replace(/\.json$/, ''), questions: data.sections?.mojiGoi?.questions ?? [] };
  examIds.push(exam.id);
  const r = extractFromExam(idx, exam, level);
  hits.push(...r.hits);
  misses.push(...r.misses);
}

const stats = aggregate(hits);
// addedAt tetap (dari ujian terbaru) agar build ulang tanpa perubahan kata tidak menaikkan content_version.
const latest = [...examIds].sort().pop() ?? '';
const m = latest.match(/_(\d{4})_(\d{2})$/);
const addedAt = m ? `${m[1]}-${m[2]}-01T00:00:00.000Z` : '2026-01-01T00:00:00.000Z';
const book = buildPackBook({ packId, level, examIds, stats, includeLowConfidence: includeLow, addedAt });
const itemCount = book.chapters.reduce((n, ch) => n + ch.items.length, 0);
const meta = {
  id: packId,
  title: book.title,
  level,
  description: book.description,
  cover_icon: 'zap',
  price_passes: price,
  status: 'draft',
  sort_order: LEVELS.indexOf(level),
};

const outDir = join(ROOT, 'scripts/packs/out', packId);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'book.json'), JSON.stringify(book, null, 2));
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

const sqlLiteral = (v: unknown) => `$pack$${JSON.stringify(v)}$pack$::jsonb`;
writeFileSync(
  join(outDir, 'upload.sql'),
  `-- Unggah ${book.title} sebagai draft. Jalankan di Supabase SQL Editor.\n` +
  `-- Setelah ditinjau, terbitkan: select upsert_pack_internal('{"id":"${packId}","status":"published"}'::jsonb, null);\n` +
  `select upsert_pack_internal(${sqlLiteral(meta)}, ${sqlLiteral(book)});\n`,
);

// Laporan
const word = (id: string) => {
  const e = idx.entries.get(id);
  return e ? `${e.word}${e.reading && e.reading !== e.word ? `（${e.reading}）` : ''} [${e.jlpt ?? '-'}]` : id;
};
const low = stats.filter(s => s.lowConfidence).sort((a, b) => b.exams.length - a.exams.length);
const byKind = misses.reduce<Record<string, number>>((m, x) => ((m[x.kind] = (m[x.kind] ?? 0) + 1), m), {});
const levelMix = stats
  .filter(s => includeLow || !s.lowConfidence)
  .reduce<Record<string, number>>((m, s) => {
    const lv = idx.entries.get(s.id)?.jlpt ?? '-';
    m[lv] = (m[lv] ?? 0) + 1;
    return m;
  }, {});

const lines: string[] = [];
lines.push(`# Laporan ${book.title}`, '');
lines.push(`- Ujian: ${examIds.length} (${examIds.map(examLabel).join(', ')})`);
lines.push(`- Kata di pack: ${itemCount}`);
for (const ch of book.chapters) lines.push(`  - Bab ${ch.chapterNumber} ${ch.titleId}: ${ch.items.length}`);
lines.push(`- Sebaran level kamus: ${Object.entries(levelMix).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
lines.push(`- Kandidat tidak cocok ke kamus: ${misses.length} (${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(', ')})`);
lines.push(`- Kata soal 言い換え tebakan (tidak masuk pack kecuali --include-low): ${low.length}`);
lines.push('', '## 30 kata teratas', '');
for (const s of book.chapters[0]?.items.slice(0, 30) ?? []) lines.push(`- ${word(s.id)}: ${s.notes}`);
lines.push('', '## Tidak cocok ke kamus (tinjau manual)', '');
for (const m of misses) lines.push(`- ${m.examId} ${m.questionId} [${m.kind}/${m.role}] ${m.surface}`);
lines.push('', '## Tebakan kata soal 言い換え (tinjau manual)', '');
for (const s of low) lines.push(`- ${word(s.id)}: ${noteFor(s)}`);
writeFileSync(join(outDir, 'report.md'), lines.join('\n') + '\n');

console.log(`${book.title}: ${itemCount} kata dari ${examIds.length} ujian, ${misses.length} tidak cocok, ${low.length} tebakan.`);
console.log(`Hasil: ${outDir}`);
