/**
 * Pembuat isi Pack "Kilat" (docs/prd/PRD_TOKO_PACK.md bagian 9).
 *
 * Mengambil kotoba dari bagian 文字・語彙 tryout resmi, mencocokkannya ke kamus kotoba app, menghitung
 * frekuensi lintas ujian, lalu menyusun buku berbentuk OfficialBook (bab Wajib / Sering / Pernah Muncul).
 *
 * Murni (tanpa I/O) supaya bisa diuji. CLI-nya ada di build_pack.ts.
 */
import { conjugateAdjective, conjugateVerb } from '../../src/engine/morphology/inflectionEngine';

// ---------------------------------------------------------------------------
// Tipe masukan (subset dari data app)
// ---------------------------------------------------------------------------
export interface DictEntry {
  id: string;
  word: string;
  reading?: string;
  jlpt?: string;
  wordType?: string;
}

export interface ExamQuestion {
  id: string;
  instruction?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Exam {
  id: string; // mis. n3_2024_12
  questions: ExamQuestion[]; // bagian mojiGoi
}

export type QuestionKind = 'reading' | 'writing' | 'context' | 'paraphrase' | 'usage' | 'unknown';
export type Role = 'target' | 'answer' | 'distractor';

// ---------------------------------------------------------------------------
// Indeks kamus
// ---------------------------------------------------------------------------
interface Form {
  id: string;
  surface: string;
  reading: string;
  base: boolean; // bentuk kamus (bukan konjugasi)
}

export interface DictIndex {
  entries: Map<string, DictEntry>;
  bySurface: Map<string, Form[]>;
  byReading: Map<string, Form[]>;
}

const KANJI = /[一-龯々〆ヵヶ]/;
const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];
const DERIVED_ICHIDAN = new Set(['passive', 'potential', 'causative', 'causative_passive']);
const ICHIDAN_SUFFIXES = ['た', 'て', 'ない', 'ます', 'なかった'];
const POLITE_SUFFIXES = ['ました', 'ません', 'ましょう', 'ませんでした'];

/** Katakana → hiragana (ー dibiarkan). */
export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function hasKanji(s: string): boolean {
  return KANJI.test(s);
}

function variants(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[、,;／/・]/)
    .map(s => s.replace(/[（(].*?[）)]/g, '').trim())
    .filter(Boolean);
}

function push(map: Map<string, Form[]>, key: string, form: Form) {
  if (!key) return;
  const list = map.get(key);
  if (list) {
    if (!list.some(f => f.id === form.id && f.surface === form.surface && f.reading === form.reading)) list.push(form);
  } else {
    map.set(key, [form]);
  }
}

function formsFor(entry: DictEntry): Form[] {
  const out: Form[] = [];
  const words = variants(entry.word);
  const readings = variants(entry.reading);
  const reading0 = readings[0] ?? (hasKanji(entry.word) ? '' : words[0] ?? '');
  for (const w of words) {
    out.push({ id: entry.id, surface: w, reading: reading0, base: true });
    try {
      if (entry.wordType === 'verb') {
        const res = conjugateVerb(w, reading0 || undefined);
        for (const [name, f] of Object.entries(res.forms)) {
          if (!f?.japanese) continue;
          out.push({ id: entry.id, surface: f.japanese, reading: f.reading, base: false });
          // Bentuk turunan berakhiran る (pasif, potensial, kausatif) dikonjugasi lagi seperti ichidan: かこまれた, 任せて.
          if (name === 'masu_stem') {
            for (const suf of POLITE_SUFFIXES) {
              out.push({ id: entry.id, surface: f.japanese + suf, reading: f.reading + suf, base: false });
            }
          }
          if (name === 'nai') {
            out.push({ id: entry.id, surface: f.japanese + 'で', reading: f.reading + 'で', base: false });
          }
          if (DERIVED_ICHIDAN.has(name) && f.japanese.endsWith('る') && f.reading.endsWith('る')) {
            for (const suf of ICHIDAN_SUFFIXES) {
              out.push({ id: entry.id, surface: f.japanese.slice(0, -1) + suf, reading: f.reading.slice(0, -1) + suf, base: false });
            }
          }
        }
      } else if (entry.wordType === 'adjective-i' || entry.wordType === 'adjective-na') {
        const res = conjugateAdjective(w, reading0 || undefined, entry.wordType === 'adjective-i' ? 'i' : 'na');
        for (const f of Object.values(res.forms)) {
          if (f?.japanese) out.push({ id: entry.id, surface: f.japanese, reading: f.reading, base: false });
        }
      }
    } catch {
      // Konjugasi gagal untuk entri aneh: cukup bentuk dasarnya.
    }
  }
  for (const r of readings.slice(1)) out.push({ id: entry.id, surface: words[0] ?? r, reading: r, base: true });
  return out;
}

export function buildDictIndex(entries: Iterable<DictEntry>): DictIndex {
  const idx: DictIndex = { entries: new Map(), bySurface: new Map(), byReading: new Map() };
  for (const e of entries) {
    if (!e?.id || !e.word) continue;
    idx.entries.set(e.id, e);
    for (const f of formsFor(e)) {
      push(idx.bySurface, f.surface, f);
      if (f.reading) push(idx.byReading, f.reading, f);
      // Onomatope/kata kana di kamus sering berkatakana (バラバラ), di soal berhiragana (ばらばら).
      const hs = toHiragana(f.surface);
      if (hs !== f.surface && !hasKanji(hs)) push(idx.bySurface, hs, f);
      const hr = toHiragana(f.reading);
      if (f.reading && hr !== f.reading) push(idx.byReading, hr, f);
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Pencocokan
// ---------------------------------------------------------------------------
function levelDistance(entry: DictEntry | undefined, level: string): number {
  const a = LEVEL_ORDER.indexOf(entry?.jlpt ?? '');
  const b = LEVEL_ORDER.indexOf(level);
  if (a < 0 || b < 0) return 9;
  return Math.abs(a - b);
}

/** Pilih satu id dari kandidat: bentuk dasar dulu, lalu level terdekat dengan level ujian, lalu id terkecil. */
function pickBest(idx: DictIndex, forms: Form[], level: string): string | null {
  if (forms.length === 0) return null;
  const ids = [...new Set(forms.map(f => f.id))];
  const baseIds = new Set(forms.filter(f => f.base).map(f => f.id));
  ids.sort((x, y) => {
    const bx = baseIds.has(x) ? 0 : 1;
    const by = baseIds.has(y) ? 0 : 1;
    if (bx !== by) return bx - by;
    const dx = levelDistance(idx.entries.get(x), level);
    const dy = levelDistance(idx.entries.get(y), level);
    if (dx !== dy) return dx - dy;
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return ids[0];
}

const TRAILING_PARTICLES = ['な', 'に', 'の', 'と', 'だ'];

/** Cari kata kamus untuk satu permukaan (opsi jawaban, kata soal 用法, dst.). */
export function matchSurface(idx: DictIndex, raw: string, level: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const direct = idx.bySurface.get(s);
  if (direct?.length) return pickBest(idx, direct, level);
  for (const p of TRAILING_PARTICLES) {
    if (s.length > p.length + 1 && s.endsWith(p)) {
      const hit = idx.bySurface.get(s.slice(0, -p.length));
      if (hit?.length) return pickBest(idx, hit, level);
    }
  }
  // Kana saja: tulisan di kamus mungkin berkanji (あやしい → 怪しい). Cocokkan lewat bacaan bentuk dasar.
  // Bentuk dasar dulu; bila tidak ada, bentuk konjugasi (あたった → 当たる). Hanya bila hasilnya tunggal.
  if (!hasKanji(s)) {
    for (const baseOnly of [true, false]) {
      const byRead = (idx.byReading.get(s) ?? []).filter(f => f.base === baseOnly);
      const ids = [...new Set(byRead.map(f => f.id))];
      if (ids.length === 0) continue;
      // Homonim: ambil yang levelnya paling dekat dengan level ujian, asal tidak seri.
      const dist = ids.map(id => levelDistance(idx.entries.get(id), level));
      const min = Math.min(...dist);
      const nearest = ids.filter((_, i) => dist[i] === min);
      return nearest.length === 1 ? nearest[0] : null;
    }
  }
  return null;
}

/** Soal 読み方: kata bergaris bawah = kata kamus yang muncul di kalimat dan bacaannya = jawaban benar. */
export function matchReadingTarget(idx: DictIndex, prompt: string, answerReading: string, level: string): string | null {
  const forms = (idx.byReading.get(answerReading.trim()) ?? []).filter(f => hasKanji(f.surface) && prompt.includes(f.surface));
  if (forms.length === 0) return null;
  const longest = Math.max(...forms.map(f => f.surface.length));
  return pickBest(idx, forms.filter(f => f.surface.length === longest), level);
}

/**
 * Soal 言い換え: kata bergaris bawah tidak ditandai di data. Ambil kata kamus terpanjang di kalimat yang
 * berlevel ujian atau lebih tinggi dan bukan salah satu opsi. Hasilnya ditandai "perlu tinjau".
 */
export function guessParaphraseTarget(
  idx: DictIndex, prompt: string, optionIds: Set<string>, level: string
): string | null {
  const minLevel = LEVEL_ORDER.indexOf(level);
  let best: { id: string; len: number; dist: number } | null = null;
  for (let i = 0; i < prompt.length; i++) {
    for (let j = Math.min(prompt.length, i + 8); j >= i + 2; j--) {
      const sub = prompt.slice(i, j);
      const forms = idx.bySurface.get(sub);
      if (!forms) continue;
      const id = pickBest(idx, forms, level);
      if (!id || optionIds.has(id)) continue;
      const lv = LEVEL_ORDER.indexOf(idx.entries.get(id)?.jlpt ?? '');
      if (lv < 0 || lv < minLevel - 1) continue; // kata terlalu dasar (mis. N5 di soal N3)
      const dist = Math.abs(lv - minLevel);
      if (!best || sub.length > best.len || (sub.length === best.len && dist < best.dist)) {
        best = { id, len: sub.length, dist };
      }
      break;
    }
  }
  return best?.id ?? null;
}

/** Kata yang diuji di soal 用法: baris pertama, tanpa awalan instruksi ("…選びなさい: 風潮"). */
export function usageWord(prompt: string): string {
  const first = prompt.split(/\r?\n/)[0] ?? '';
  const afterColon = first.split(/[:：]/).pop() ?? first;
  return afterColon.replace(/^[\s「]+|[\s」。]+$/g, '');
}

export function classifyQuestion(instruction: string | undefined): QuestionKind {
  const s = instruction ?? '';
  if (s.includes('読み方')) return 'reading';
  if (s.includes('漢字で書')) return 'writing';
  if (s.includes('意味が最も近い')) return 'paraphrase';
  if (s.includes('使い方')) return 'usage';
  if (s.includes('入れる')) return 'context';
  return 'unknown';
}

export interface Hit {
  id: string;
  role: Role;
  examId: string;
  questionId: string;
  lowConfidence?: boolean;
}

export interface Miss {
  examId: string;
  questionId: string;
  kind: QuestionKind;
  role: Role;
  surface: string;
}

export interface ExtractResult {
  hits: Hit[];
  misses: Miss[];
}

export function extractFromExam(idx: DictIndex, exam: Exam, level: string): ExtractResult {
  const hits: Hit[] = [];
  const misses: Miss[] = [];
  const add = (id: string | null, role: Role, q: ExamQuestion, kind: QuestionKind, surface: string, low = false) => {
    if (id) hits.push({ id, role, examId: exam.id, questionId: q.id, ...(low ? { lowConfidence: true } : {}) });
    else misses.push({ examId: exam.id, questionId: q.id, kind, role, surface });
  };

  for (const q of exam.questions) {
    const kind = classifyQuestion(q.instruction);
    const correct = q.options[q.correctIndex] ?? '';
    switch (kind) {
      case 'reading':
        add(matchReadingTarget(idx, q.prompt, correct, level), 'target', q, kind, `${q.prompt} → ${correct}`);
        break;
      case 'writing':
        // Pengecoh soal 表記 umumnya kanji karangan, jadi hanya jawaban benar yang dipakai.
        add(matchSurface(idx, correct, level), 'target', q, kind, correct);
        break;
      case 'usage': {
        const w = usageWord(q.prompt);
        add(matchSurface(idx, w, level), 'target', q, kind, w);
        break;
      }
      case 'context':
        q.options.forEach((opt, i) => {
          const id = matchSurface(idx, opt, level);
          // Opsi satu huruf = soal 語形成 (imbuhan seperti 感・離), bukan kata; tidak dicatat sebagai miss.
          if (!id && opt.trim().length <= 1) return;
          add(id, i === q.correctIndex ? 'answer' : 'distractor', q, kind, opt);
        });
        break;
      case 'paraphrase': {
        const optionIds = new Set<string>();
        q.options.forEach((opt, i) => {
          const id = matchSurface(idx, opt, level);
          if (id) optionIds.add(id);
          // Opsi 言い換え sering berupa frasa; yang tidak cocok tidak dicatat sebagai miss.
          if (id) add(id, i === q.correctIndex ? 'answer' : 'distractor', q, kind, opt);
        });
        add(guessParaphraseTarget(idx, q.prompt, optionIds, level), 'target', q, kind, q.prompt, true);
        break;
      }
      default:
        break;
    }
  }
  return { hits, misses };
}

// ---------------------------------------------------------------------------
// Penyusunan buku
// ---------------------------------------------------------------------------
export interface WordStat {
  id: string;
  exams: string[];
  target: number;
  answer: number;
  distractor: number;
  lowConfidence: boolean;
}

export function aggregate(hits: Hit[]): WordStat[] {
  const map = new Map<string, WordStat & { examSet: Set<string>; sure: boolean }>();
  for (const h of hits) {
    let s = map.get(h.id);
    if (!s) {
      s = { id: h.id, exams: [], target: 0, answer: 0, distractor: 0, lowConfidence: false, examSet: new Set(), sure: false };
      map.set(h.id, s);
    }
    s.examSet.add(h.examId);
    s[h.role] += 1;
    if (!h.lowConfidence) s.sure = true;
  }
  return [...map.values()].map(({ examSet, sure, ...s }) => ({
    ...s,
    exams: [...examSet].sort(),
    lowConfidence: !sure,
  }));
}

/** n3_2024_12 → "Des 2024" */
export function examLabel(examId: string): string {
  const m = examId.match(/_(\d{4})_(\d{2})$/);
  if (!m) return examId;
  const month = m[2] === '07' ? 'Jul' : m[2] === '12' ? 'Des' : m[2];
  return `${month} ${m[1]}`;
}

export function noteFor(s: WordStat): string {
  const parts = [`Muncul di ${s.exams.length} ujian (${s.exams.map(examLabel).join(', ')})`];
  const roles: string[] = [];
  if (s.target) roles.push(`kata soal ${s.target}×`);
  if (s.answer) roles.push(`jawaban ${s.answer}×`);
  if (s.distractor) roles.push(`pengecoh ${s.distractor}×`);
  if (roles.length) parts.push(roles.join(', '));
  return parts.join(' · ');
}

function weight(s: WordStat): number {
  return s.target * 3 + s.answer * 2 + s.distractor;
}

export interface PackChapterSpec {
  minExams: number;
  maxExams?: number;
  titleId: string;
  titleJp: string;
  description: string;
}

export const DEFAULT_CHAPTERS: PackChapterSpec[] = [
  { minExams: 3, titleId: 'Wajib', titleJp: '必修', description: 'Muncul di 3 ujian atau lebih.' },
  { minExams: 2, maxExams: 2, titleId: 'Sering', titleJp: '頻出', description: 'Muncul di 2 ujian.' },
  { minExams: 1, maxExams: 1, titleId: 'Pernah Muncul', titleJp: '既出', description: 'Muncul di 1 ujian.' },
];

export interface PackBookInput {
  packId: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  examIds: string[];
  stats: WordStat[];
  /** Kata ber-lowConfidence ikut dimasukkan? Default tidak (ditulis ke laporan untuk ditinjau). */
  includeLowConfidence?: boolean;
  addedAt?: string;
  chapters?: PackChapterSpec[];
}

export function buildPackBook(input: PackBookInput) {
  const addedAt = input.addedAt ?? new Date().toISOString();
  const specs = input.chapters ?? DEFAULT_CHAPTERS;
  const stats = input.stats
    .filter(s => input.includeLowConfidence || !s.lowConfidence)
    .sort((a, b) => b.exams.length - a.exams.length || weight(b) - weight(a) || (a.id < b.id ? -1 : 1));

  const chapters = specs
    .map((spec, i) => {
      const items = stats
        .filter(s => s.exams.length >= spec.minExams && (spec.maxExams === undefined || s.exams.length <= spec.maxExams))
        .map(s => ({ id: s.id, category: 'kotoba' as const, addedAt, notes: noteFor(s) }));
      return {
        id: `${input.packId}_ch${i + 1}`,
        bookId: input.packId,
        chapterNumber: i + 1,
        titleJp: spec.titleJp,
        titleId: spec.titleId,
        description: spec.description,
        items,
      };
    })
    .filter(ch => ch.items.length > 0)
    .map((ch, i) => ({ ...ch, chapterNumber: i + 1, id: `${input.packId}_ch${i + 1}` }));

  return {
    id: input.packId,
    title: `Kilat ${input.level}`,
    japaneseTitle: `${input.level} 速習 語彙`,
    subtitle: `Kotoba dari ${input.examIds.length} ujian JLPT resmi`,
    description:
      `Kosakata yang benar-benar keluar di ${input.examIds.length} ujian JLPT ${input.level} ` +
      `(${input.examIds.map(examLabel).join(', ')}), diurutkan dari yang paling sering muncul.`,
    level: input.level,
    category: 'thematic' as const,
    coverIcon: '速',
    colorTheme: {
      accentColor: 'text-gold',
      badgeBg: 'bg-gold/15 text-gold border-gold/30',
      borderAccent: 'border-gold/40 hover:border-gold',
      cardBg: 'bg-surface-card',
    },
    sources: [...input.examIds].sort(),
    chapters,
  };
}
