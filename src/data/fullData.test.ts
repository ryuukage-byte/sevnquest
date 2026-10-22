import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import kotobaJson from './db/kotoba.json';
import kanjiQuestionsJson from './db/kanji_questions.json';
import bunpouQuestionsJson from './db/bunpou_questions.json';
import { KOTOBA_DETAIL_FIELDS, mergeKotobaDetails, splitKotobaEntries } from './kotobaSplit';
import { KANJI_DATABASE } from './kanji';
import { BUNPOU_DATABASE } from './bunpou';
import type { KotobaItem } from '../types/content';

type Raw = Record<string, Record<string, unknown>>;
const RAW_KOTOBA = kotobaJson as unknown as Raw;

test('kotoba: inti + detail = entri asli; inti tanpa field detail; hasExample menandai contoh kalimat', () => {
  const { core, detail } = splitKotobaEntries(RAW_KOTOBA);
  assert.deepEqual(Object.keys(core), Object.keys(RAW_KOTOBA), 'urutan & jumlah entri inti sama');

  for (const [id, entry] of Object.entries(core)) {
    for (const f of KOTOBA_DETAIL_FIELDS) assert.ok(!(f in entry), `${id} inti masih memuat ${f}`);
    assert.equal(Boolean(entry.hasExample), Boolean(RAW_KOTOBA[id].exampleSentence), `${id} hasExample`);
  }

  const merged = structuredClone(core) as unknown as Record<string, KotobaItem>;
  mergeKotobaDetails(merged, detail);
  for (const [id, original] of Object.entries(RAW_KOTOBA)) {
    const { hasExample: _marker, ...rest } = merged[id] as unknown as Record<string, unknown>;
    assert.deepEqual(rest, original, `${id} pulih utuh setelah digabung`);
  }
});

test('kotoba: detail tidak menimpa objek yang sama (tes/tsx memakai JSON utuh)', () => {
  const db = { a: { id: 'a', word: 'x', definitionId: 'd' } } as unknown as Record<string, KotobaItem>;
  mergeKotobaDetails(db, db);
  assert.equal(db.a.definitionId, 'd');
});

test('bank soal: hidrasi menghasilkan soal yang sama dengan pemasangan saat impor (perilaku lama)', async () => {
  await import('./kanjiQuestions');
  await import('./bunpouQuestions');

  const kanjiBank = new Map<string, string[]>();
  for (const q of kanjiQuestionsJson as Array<{ id: string; knowledge_refs?: string[]; kanji_refs?: string[] }>) {
    const ref = q.knowledge_refs?.[0] || q.kanji_refs?.[0];
    if (ref) kanjiBank.set(ref, [...(kanjiBank.get(ref) || []), q.id]);
  }
  for (const [id, k] of Object.entries(KANJI_DATABASE)) {
    assert.deepEqual(k.questions?.map(q => q.id), kanjiBank.get(id) || [], id);
  }

  const bunpouBank = new Map<string, string[]>();
  for (const q of bunpouQuestionsJson as Array<{ id: string; material_id: string }>) {
    bunpouBank.set(q.material_id, [...(bunpouBank.get(q.material_id) || []), q.id]);
  }
  for (const [id, b] of Object.entries(BUNPOU_DATABASE)) {
    const ids = b.questions.map(q => q.id);
    assert.deepEqual(ids, bunpouBank.get(id) || [`${id}_default_q1`], id);
  }
});

// Jaminan fullData.ts hanya berlaku bila jalur boot (impor statis dari App.tsx) tidak menarik data lengkap.
test('jalur boot tidak mengimpor bank soal / detail kotoba secara statis', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const exts = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
  const resolve = (from: string, spec: string) => {
    if (!spec.startsWith('.')) return null;
    const base = path.resolve(path.dirname(from), spec);
    for (const e of exts) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return base + e;
    return null;
  };
  const seen = new Set<string>();
  const queue = [path.join(root, 'App.tsx')];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.tsx?$/.test(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)) {
      const dep = resolve(file, m[1]);
      if (dep) queue.push(dep);
    }
  }
  const forbidden = ['data/kotobaDetails.ts', 'data/kanjiQuestions.ts', 'data/bunpouQuestions.ts', 'data/questionBank.ts',
    'data/db/kanji_questions.json', 'data/db/bunpou_questions.json', 'data/db/kanji_extreme_100_stages.json'];
  const rel = [...seen].map(f => path.relative(root, f).replace(/\\/g, '/'));
  for (const f of forbidden) assert.ok(!rel.includes(f), `${f} terjangkau dari App.tsx secara statis`);
  assert.ok(rel.includes('data/kotoba.ts'), 'sanity: graf impor terbaca');
});
