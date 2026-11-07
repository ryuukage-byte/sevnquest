// Simpan transkrip video Choukai sebagai data statis (tanpa API YouTube saat dipakai).
//
// Pakai:
//   npx tsx scripts/choukai/import-transcript.ts <videoId|URL> <file>
// <file> berisi salah satu:
//   - teks yang disalin dari panel "Tampilkan transkrip" YouTube (0:03 + kalimat), atau
//   - JSON template Immersion (schema sevnquest.immersion.v1, mis. hasil "Prompt AI & JSON").
// Hasil: src/data/choukaiTranscripts/<videoId>.json

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseYouTubeId } from '../../src/utils/youtube.ts';
import { parseTranscriptPaste } from '../../src/engine/textStudy/transcriptPaste.ts';
import { parseImmersionTemplate, TEMPLATE_SCHEMA } from '../../src/engine/textStudy/immersionTemplate.ts';

const [idArg, file] = process.argv.slice(2);
const videoId = idArg ? parseYouTubeId(idArg) : null;
if (!videoId || !file) {
  console.error('Pakai: npx tsx scripts/choukai/import-transcript.ts <videoId|URL> <file>');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8');
const lines = raw.trim().startsWith('{') ? null : parseTranscriptPaste(raw);
const candidate = lines ? JSON.stringify({ schema: TEMPLATE_SCHEMA, videoId, lines }) : raw;
const parsed = parseImmersionTemplate(candidate, videoId);
if (!parsed.ok) {
  console.error(`Gagal: ${parsed.error}`);
  process.exit(1);
}
if (parsed.template.videoId !== videoId) {
  console.error(`videoId di JSON (${parsed.template.videoId}) berbeda dengan ${videoId}`);
  process.exit(1);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/choukaiTranscripts');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${videoId}.json`);
writeFileSync(out, JSON.stringify({ schema: TEMPLATE_SCHEMA, ...parsed.template }, null, 1) + '\n');
console.log(`Tersimpan ${parsed.template.lines.length} baris -> ${out}${parsed.dropped ? ` (${parsed.dropped} baris dibuang)` : ''}`);
