// ==============================================================================
// KOLEKSI DOKKAI
// Menyatukan bacaan dari (1) database dokkai dan (2) bagian 読解 semua paket simulasi tryout.
// Soal tryout dikelompokkan per bacaan; bacaan isian rumpang (文章の文法 [21]/【48】) dan hasil
// ekstraksi PDF yang rusak tidak diikutkan, karena bukan latihan pemahaman bacaan.
// ==============================================================================

import { DOKKAI_DATABASE } from '../../data/dokkai';
import { ALL_TRYOUTS, type TryOutMeta } from '../../data/tryouts';
import type { DokkaiLevel, DokkaiPassage, DokkaiQuestionData } from './types';
import { bigrams, cleanPassageText, coverage } from './text';

const MONTH_ID: Record<number, string> = { 7: 'Juli', 12: 'Desember' };

/** Penanda rumpang isian wacana: [21], 【48】, （ 3 ）. */
const CLOZE_RE = /\[\s*\d{1,2}\s*\]|【\s*\d{1,2}\s*】|（\s*\d{1,2}\s*）/;
/** Sisa header/footer PDF yang ikut terekstrak. */
const JUNK_RE = /Tôi Yêu|Ng ữ|Group Yuuki|-- ?\d+ of \d+ ?--/;

export function isUsablePassage(text: string): boolean {
  if (!text || text.length < 40) return false;
  if (JUNK_RE.test(text) || CLOZE_RE.test(text)) return false;
  const jp = (text.match(/[぀-ヿ一-龯]/g) || []).length;
  const latin = (text.match(/[A-Za-zÀ-ỹ]/g) || []).length;
  return jp >= 30 && latin / Math.max(1, jp) < 0.15;
}

function isUsableQuestion(q: { prompt?: string; options?: string[]; correctIndex?: number }): boolean {
  const opts = q.options || [];
  if (!q.prompt || opts.length < 2) return false;
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= opts.length) return false;
  if (opts.some(o => !o || !o.trim() || o.length > 160 || JUNK_RE.test(o))) return false;
  if (/空欄|に何を入れ|に 何を 入れ/.test(q.prompt)) return false;
  return true;
}

function toLevel(lv: string | undefined): DokkaiLevel {
  const u = (lv || '').toUpperCase();
  if (u === 'N5' || u === 'N4' || u === 'N3' || u === 'N2' || u === 'N1') return u;
  return 'N4'; // JFT-Basic ≈ N4
}

function sourceLabelOf(meta: TryOutMeta): string {
  const { year, month } = meta.data;
  if (year && month) return `JLPT ${meta.level} ${MONTH_ID[month] || `bulan ${month}`} ${year}`;
  return meta.title;
}

const TITLE_SKIP_RE = /^(注|中略|※|[A-ZＡ-Ｚ][:：]?$|会社で|大学で)|^[A-ZＡ-Ｚ]?$|^(?!件名)[^：:\s]{1,10}[：:]/;
const META_INTRO_RE = /^(これは|以下は|次は|次の文章は|下は)[^。]*。/;

/** Judul ringkas: baris judul pendek bila ada, selain itu potongan kalimat pertama. */
export function deriveTitle(text: string): string {
  const lines = text
    .split('\n')
    .map(l => l.trim().replace(/^[(（]?[0-9０-９A-ZＡ-Ｚ]{1,2}[)）]\s*/, '').replace(/^[(（][^)）]{0,6}[)）]\s*/, '').trim())
    .filter(l => l && !TITLE_SKIP_RE.test(l) && /[぀-ヿ一-龯]{2,}/.test(l));
  for (const l of lines.slice(0, 3)) {
    if (l.length <= 24 && !/[。、]$/.test(l) && !l.includes('。')) return l.replace(/^[【「『◆]+|[】」』◆]+$/g, '');
  }
  const first = lines[0] || text;
  const body = first.replace(META_INTRO_RE, '').trim() || first;
  const sentence = body.split('。')[0];
  return sentence.length > 22 ? `${sentence.slice(0, 22)}…` : sentence;
}

function fromDatabase(): DokkaiPassage[] {
  const out: DokkaiPassage[] = [];
  for (const d of Object.values(DOKKAI_DATABASE)) {
    // Entri placeholder ("Tunggu AI") tidak berisi teks Jepang sungguhan.
    if (!d?.text || !isUsablePassage(cleanPassageText(d.text))) continue;
    const questions: DokkaiQuestionData[] = (d.questions || []).filter(isUsableQuestion).map(q => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || undefined,
    }));
    out.push({
      id: d.id,
      title: d.title.replace(/^Reading:\s*/, ''),
      level: toLevel(d.level),
      levelLabel: d.level,
      source: 'database',
      sourceLabel: 'Database Dokkai',
      category: d.category,
      text: cleanPassageText(d.text),
      questions,
      vocabularyList: d.vocabularyList,
    });
  }
  return out;
}

function fromTryouts(): DokkaiPassage[] {
  const out: DokkaiPassage[] = [];
  for (const meta of ALL_TRYOUTS) {
    const groups = new Map<string, DokkaiPassage>();
    for (const q of meta.data.sections?.bunpouDokkai?.questions || []) {
      if (!q.passage) continue;
      const text = cleanPassageText(q.passage)
        .split('\n')
        .filter(l => !/選びなさい|答えなさい|問いに対する答え/.test(l))
        .join('\n')
        .trim();
      if (!isUsablePassage(text) || !isUsableQuestion(q)) continue;
      let g = groups.get(text);
      if (!g) {
        g = {
          id: `tryout_${meta.id}_${groups.size + 1}`,
          title: deriveTitle(text),
          level: toLevel(meta.level),
          levelLabel: meta.level,
          source: 'tryout',
          sourceLabel: sourceLabelOf(meta),
          category: q.instruction?.match(/^(問題|もんだい)\s*\d+/)?.[0],
          text,
          questions: [],
        };
        groups.set(text, g);
      }
      g.questions.push({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || undefined,
        instruction: q.instruction,
      });
    }
    out.push(...groups.values());
  }
  return out;
}

/**
 * Beberapa paket menempelkan soal ke bacaan yang salah (soal tentang supermarket di bawah teks musik).
 * Soal berbahasa Jepang yang hampir tidak berbagi isi dengan bacaannya dibuang.
 */
export function questionFitsPassage(q: Pick<DokkaiQuestionData, 'prompt' | 'options'>, text: string): boolean {
  const jp = /[぀-ヿ一-龯]/;
  if (!jp.test(q.prompt)) return true; // soal berbahasa Indonesia (JFT) tidak bisa dibandingkan
  const pg = bigrams(text);
  const best = Math.max(coverage(bigrams(q.prompt), pg), ...q.options.map(o => coverage(bigrams(o), pg)));
  return best >= 0.2;
}

let cache: DokkaiPassage[] | null = null;

/** Semua bacaan unik (teks sama dari paket berbeda digabung, soal tidak digandakan). */
export function getDokkaiCollection(): DokkaiPassage[] {
  if (cache) return cache;
  const byText = new Map<string, DokkaiPassage>();
  for (const p of [...fromDatabase(), ...fromTryouts()]) {
    const key = p.text.replace(/\s/g, '');
    const prev = byText.get(key);
    if (!prev) { byText.set(key, { ...p, questions: [...p.questions] }); continue; }
    const seen = new Set(prev.questions.map(q => q.prompt.replace(/\s/g, '')));
    for (const q of p.questions) {
      const k = q.prompt.replace(/\s/g, '');
      if (!seen.has(k)) { seen.add(k); prev.questions.push(q); }
      else if (!prev.questions.find(x => x.prompt.replace(/\s/g, '') === k)?.explanation && q.explanation) {
        const target = prev.questions.find(x => x.prompt.replace(/\s/g, '') === k);
        if (target) target.explanation = q.explanation;
      }
    }
  }
  cache = [...byText.values()]
    .map(p => ({ ...p, questions: p.questions.filter(q => questionFitsPassage(q, p.text)) }))
    .filter(p => p.questions.length > 0);
  return cache;
}

export function findDokkai(id: string): DokkaiPassage | undefined {
  return getDokkaiCollection().find(p => p.id === id);
}
