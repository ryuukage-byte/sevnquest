// Transkrip tersimpan untuk video Library Choukai (src/data/choukaiTranscripts/<videoId>.json).
// Dimuat saat dibutuhkan (lazy) supaya tidak membesarkan bundle utama. Tambah lewat
// scripts/choukai/import-transcript.ts. Tidak ada panggilan API YouTube saat dipakai.

import { parseImmersionTemplate, type ImmersionTemplate } from '../engine/textStudy/immersionTemplate';

const FILES = import.meta.glob<{ default: unknown }>('./choukaiTranscripts/*.json');
const PATH_BY_ID = new Map(Object.keys(FILES).map(p => [p.replace(/^.*\/|\.json$/g, ''), p]));

export function hasChoukaiTranscript(videoId: string): boolean {
  return PATH_BY_ID.has(videoId);
}

export async function loadChoukaiTranscript(videoId: string): Promise<ImmersionTemplate | null> {
  const path = PATH_BY_ID.get(videoId);
  if (!path) return null;
  const mod = await FILES[path]();
  const parsed = parseImmersionTemplate(JSON.stringify(mod.default), videoId);
  return parsed.ok ? parsed.template : null;
}
