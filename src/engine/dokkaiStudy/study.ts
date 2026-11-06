// ==============================================================================
// BEDAH DOKKAI
// Satu bacaan → bahan belajar lengkap:
//   1. Pahami  : paragraf, peran tiap paragraf (pembuka/pembalik/contoh/kesimpulan), kalimat per kalimat.
//   2. Materi  : kotoba, kanji, dan pola tata bahasa yang muncul — ditandai relatif terhadap level pembaca.
//   3. Inti    : gagasan utama (dari soal ide pokok bila ada, atau kalimat kunci hasil penilaian penanda).
//   4. Soal    : tepat 3 soal dengan pembahasan — bukti di teks, alasan kunci, alasan tiap pengecoh.
//
// Semua dari database & teks itu sendiri (tanpa LLM). Bagian yang hasil heuristik ditandai `auto`.
// ==============================================================================

import { analyzeText, type SentenceAnalysis, type TextAnalysis, type WordHit } from '../textStudy/textAnalyzer';
import { KANJI_DATABASE } from '../../data/kanji';
import type { KanjiItem, KotobaItem, BunpouItem } from '../../types/content';
import { levelRank, type DokkaiPassage, type DokkaiQuestionData } from './types';
import { bigrams, coverage, normSentence, splitParagraphs } from './text';

// ------------------------------------------------------------------------------
// TIPE
// ------------------------------------------------------------------------------

export type LevelBand = 'below' | 'at' | 'above';

export interface StudyWord {
  item: KotobaItem;
  surfaces: string[];
  count: number;
  sentence: string;
  band: LevelBand;
}

export interface StudyKanji {
  item: KanjiItem;
  band: LevelBand;
  /** Kata di teks yang memakai kanji ini. */
  inWords: string[];
}

export interface StudyGrammar {
  item: BunpouItem;
  matched: string;
  sentence: string;
  band: LevelBand;
}

export type ParagraphRole = 'opening' | 'turn' | 'example' | 'reason' | 'conclusion' | 'info' | 'body';

export interface StudyParagraph {
  index: number;
  text: string;
  role: ParagraphRole;
  /** Kalimat paling penting di paragraf ini. */
  keySentence: string;
  /** Arti kasar kalimat kunci (terjemahan bila ada, selain itu rangkaian arti kata). */
  keyGloss: string;
  /** Kata sambung/penanda yang menentukan peran. */
  marker?: string;
}

export interface MainIdea {
  /** Gagasan utama dalam bahasa Jepang. */
  text: string;
  translation?: string;
  /** Asal: 'given' = pasti (generator), 'question' = jawaban soal ide pokok, 'auto' = kalimat kunci heuristik. */
  basis: 'given' | 'question' | 'auto';
  keySentences: { text: string; gloss: string; reason: string }[];
  topicWords: KotobaItem[];
  /** Jenis teks: esai/cerita vs teks informasi (pengumuman, email, tabel). */
  textType: 'narrative' | 'opinion' | 'info';
}

export type QuestionKind = 'idea' | 'reason' | 'reference' | 'detail' | 'info' | 'vocab' | 'feeling';

export interface OptionReview {
  text: string;
  gloss: string;
  correct: boolean;
  /** Kalimat teks paling mirip dengan pilihan ini. */
  closest?: string;
  /** 0..1, seberapa banyak isi pilihan ditemukan di teks. */
  support: number;
  verdict: string;
}

export interface StudyQuestion {
  id: string;
  prompt: string;
  promptGloss: string;
  options: string[];
  correctIndex: number;
  kind: QuestionKind;
  kindLabel: string;
  strategy: string;
  evidence?: string;
  evidenceGloss?: string;
  explanation: string;
  /** true bila pembahasan disusun otomatis (soal tanpa pembahasan asli). */
  autoExplanation: boolean;
  /** true bila soal ini soal tambahan buatan sistem (bacaan punya < 3 soal). */
  supplementary: boolean;
  reviews: OptionReview[];
}

export interface DokkaiStudy {
  passage: DokkaiPassage;
  readerLevel: string;
  analysis: TextAnalysis;
  paragraphs: StudyParagraph[];
  /** Kalimat hasil analisis per paragraf (urutan sama dengan `paragraphs`). */
  sentencesByParagraph: SentenceAnalysis[][];
  words: StudyWord[];
  kanji: StudyKanji[];
  grammar: StudyGrammar[];
  glossary: { word: string; reading: string; meaning: string }[];
  mainIdea: MainIdea;
  questions: StudyQuestion[];
  stats: { chars: number; sentences: number; above: number; at: number; below: number };
}

// ------------------------------------------------------------------------------
// LEVEL
// ------------------------------------------------------------------------------

let kanjiLevel: Map<string, string> | null = null;
function getKanjiLevel(): Map<string, string> {
  if (!kanjiLevel) {
    kanjiLevel = new Map();
    for (const k of Object.values(KANJI_DATABASE)) if (k?.character && /^N[1-5]$/.test(k.jlpt)) kanjiLevel.set(k.character, k.jlpt);
  }
  return kanjiLevel;
}

const LEVEL_NAMES = ['N5', 'N4', 'N3', 'N2', 'N1'];

/**
 * Level efektif sebuah kata. Banyak entri hasil impor kamus memakai label N1/N2 bawaan walau katanya dasar
 * (ご飯, 一緒に, 明るい). Untuk kata berkanji, level tidak mungkin lebih tinggi dari kanji tersulitnya,
 * jadi diambil yang lebih rendah antara label database dan level kanji tersulit.
 */
export function wordLevel(item: Pick<KotobaItem, 'word' | 'jlpt'>): string {
  const db = levelRank(item.jlpt);
  const map = getKanjiLevel();
  let maxKanji = -1;
  for (const ch of item.word) {
    if (!/[一-龯々]/.test(ch)) continue;
    if (ch === '々') continue;
    const lv = map.get(ch);
    maxKanji = Math.max(maxKanji, lv ? levelRank(lv) : 4);
  }
  const r = maxKanji >= 0 ? Math.min(db, maxKanji) : db;
  return LEVEL_NAMES[r] ?? item.jlpt;
}

/** Kecocokan kana pendek ke kata berkanji (うに→雲丹, てはい→手配) hampir selalu salah baca pemindai. */
const SHORT_KANA_OK = new Set(['もう', 'まだ', 'よく', 'また', 'すぐ', 'いつ', 'どこ', 'だれ', 'なに', 'ここ', 'そこ', 'あそこ', 'これ', 'それ', 'あれ', 'いま', 'みな']);
/** Potongan kana yang sering tertangkap sebagai kata padahal bagian pola (ないように → 内容). */
const KANA_FALSE = new Set(['ないよう', 'いよう', 'ような', 'ように', 'ようだ', 'ところで', 'とこ']);
export function isLikelyFalseHit(w: Pick<WordHit, 'surface' | 'item'>): boolean {
  if (KANA_FALSE.has(w.surface) && w.surface !== w.item.word) return true;
  if (/^[぀-ゟ]{1,3}$/.test(w.surface) && /[一-龯]/.test(w.item.word) && w.surface !== w.item.word) return true;
  // Potongan kana 2 huruf (うに dari ように, つい dari について) jarang berdiri sebagai kata.
  return /^[぀-ゟ]{1,2}$/.test(w.surface) && !SHORT_KANA_OK.has(w.surface);
}

export function bandOf(itemLevel: string | undefined, readerLevel: string): LevelBand {
  const a = levelRank(itemLevel);
  const r = levelRank(readerLevel);
  if (a > 4) return 'above'; // level tidak diketahui → anggap perlu perhatian
  return a > r ? 'above' : a === r ? 'at' : 'below';
}

// ------------------------------------------------------------------------------
// PERAN PARAGRAF & KALIMAT KUNCI
// ------------------------------------------------------------------------------

const TURN_RE = /^(しかし|だが|ところが|でも|けれども|けれど|一方|それなのに|とはいえ|ただ、)/;
const EXAMPLE_RE = /(例えば|たとえば|例として|〜の例)/;
const REASON_RE = /^(なぜなら|というのは|その理由は|それは)|からだ。|ためだ。|からです。|ためです。/;
const CONCLUSION_START_RE = /^(つまり|要するに|このように|こうして|結局|だから|そのため|したがって|それで|このことから|以上)/;
const OPINION_RE = /(と思う|と思います|と考える|と考えます|べきだ|べきです|のではないか|のではないでしょうか|ではないだろうか|大切だ|大切です|大切なのは|重要だ|重要です|重要なのは|必要だ|必要です|必要なのは|ことだ。|ことです。|たいと思|てほしい|と言える|といえる|わけだ|に違いない)/;
const INFO_RE = /(案内|お知らせ|おしらせ|募集|申し込み|申込|受付|締め切り|料金|円|時間|日時|場所|件名|様$|さんへ|各位|ご注意|〒|電話|メール)/;

function scoreSentence(s: string, pIndex: number, pCount: number, sIndex: number, sCount: number): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  if (OPINION_RE.test(s)) { score += 3; reasons.push('ada penanda pendapat/kesimpulan penulis'); }
  if (CONCLUSION_START_RE.test(s)) { score += 3; reasons.push(`diawali penanda kesimpulan「${s.match(CONCLUSION_START_RE)![0]}」`); }
  if (TURN_RE.test(s)) { score += 2; reasons.push(`diawali pembalik「${s.match(TURN_RE)![0]}」— gagasan penting biasanya datang setelahnya`); }
  if (pIndex === pCount - 1 && pCount > 1) { score += 2; reasons.push('ada di paragraf terakhir (tempat umum kesimpulan)'); }
  if (pIndex === 0 && sIndex === 0) { score += 1; reasons.push('kalimat pembuka yang memperkenalkan topik'); }
  if (sIndex === sCount - 1 && sCount > 1) score += 0.5;
  if (EXAMPLE_RE.test(s)) { score -= 1.5; }
  if (s.length < 12) score -= 2;
  return { score, reason: reasons[0] || 'kalimat dengan isi paling padat di bagian ini' };
}

function paragraphRole(p: string, index: number, count: number, isInfo: boolean): { role: ParagraphRole; marker?: string } {
  if (isInfo) return { role: 'info' };
  const turn = p.match(TURN_RE);
  if (turn) return { role: 'turn', marker: turn[0] };
  const concl = p.match(CONCLUSION_START_RE);
  if (concl) return { role: 'conclusion', marker: concl[0] };
  if (EXAMPLE_RE.test(p)) return { role: 'example', marker: p.match(EXAMPLE_RE)![0] };
  if (index === 0) return { role: 'opening' };
  if (index === count - 1 && (OPINION_RE.test(p) || count > 2)) return { role: 'conclusion' };
  if (REASON_RE.test(p)) return { role: 'reason' };
  return { role: 'body' };
}

export const ROLE_LABEL: Record<ParagraphRole, { label: string; hint: string }> = {
  opening: { label: 'Pembuka · Topik', hint: 'Memperkenalkan situasi atau topik yang dibahas.' },
  turn: { label: 'Pembalikan', hint: 'Diawali kata pembalik. Gagasan yang lebih penting biasanya muncul di sini.' },
  example: { label: 'Contoh', hint: 'Memberi contoh konkret untuk mendukung gagasan. Jarang menjadi inti.' },
  reason: { label: 'Alasan', hint: 'Menjelaskan sebab/alasan dari pernyataan sebelumnya.' },
  conclusion: { label: 'Kesimpulan · Pendapat', hint: 'Bagian yang paling sering menyimpan inti bacaan dan pendapat penulis.' },
  info: { label: 'Informasi', hint: 'Teks informasi: cari syarat, tanggal, biaya, dan larangan — bukan pendapat.' },
  body: { label: 'Isi', hint: 'Mengembangkan cerita/gagasan dari paragraf sebelumnya.' },
};

// ------------------------------------------------------------------------------
// JENIS SOAL
// ------------------------------------------------------------------------------

const KIND_RULES: { kind: QuestionKind; re: RegExp; label: string; strategy: string }[] = [
  {
    kind: 'idea',
    re: /テーマ|言いたい|伝えたい|全体|主張|筆者の考え|筆者が考え|この文章の内容|最も言いたい|述べている|筆者は.*どう考え|ぶんしょうの 内容|合っている/,
    label: 'Ide pokok / isi sesuai teks',
    strategy: 'Cari kalimat pendapat/kesimpulan (biasanya paragraf terakhir, setelah しかし/つまり). Pilihan yang hanya benar sebagian atau terlalu umum biasanya pengecoh.',
  },
  {
    kind: 'reason',
    re: /なぜ|どうして|理由|のは なぜ|ためか|原因/,
    label: 'Alasan (なぜ)',
    strategy: 'Cari 〜から / 〜ため / 〜ので / なぜなら di sekitar bagian yang ditanyakan. Jawaban adalah sebabnya, bukan akibatnya.',
  },
  {
    kind: 'reference',
    re: /(?<!こ)とは何か|(?<!こ)とは 何|何を指|どういうこと|どのような こと|どんなこと|それ|その/,
    label: 'Rujukan / maksud ungkapan',
    strategy: 'Kata tunjuk (それ・この・そのような) merujuk ke kalimat SEBELUMNYA. Baca 1–2 kalimat di depan bagian yang ditanyakan.',
  },
  {
    kind: 'feeling',
    re: /気持ち|どう思|どう感じ|感想/,
    label: 'Perasaan / sikap tokoh',
    strategy: 'Cari kata perasaan (うれしい・残念・驚いた・〜と思った) dan penyebabnya di teks.',
  },
  {
    kind: 'info',
    re: /しなければならない|いくら|何時|何日|いつ|どこ|どれ|何を|何が|だれ|申し込|選べる|できる/,
    label: 'Mencari informasi',
    strategy: 'Garis bawahi syarat dalam soal (siapa, kapan, berapa orang, biaya), lalu cocokkan satu per satu dengan teks/tabel. Perhatikan catatan kecil (※, ただし).',
  },
];
const INFO_RULE = KIND_RULES.find(r => r.kind === 'info')!;

export function detectQuestionKind(prompt: string, isInfoText: boolean): { kind: QuestionKind; label: string; strategy: string } {
  for (const r of KIND_RULES) if (r.re.test(prompt)) {
    if (r.kind === 'idea' && /合っている/.test(prompt) && isInfoText) continue;
    if (r.kind === 'reference' && !/[「」]|下線|(?<!こ)とは/.test(prompt) && !/^(それ|その)/.test(prompt)) continue;
    return { kind: r.kind, label: r.label, strategy: r.strategy };
  }
  if (isInfoText) return { kind: 'info', label: INFO_RULE.label, strategy: INFO_RULE.strategy };
  return {
    kind: 'detail',
    label: 'Detail isi',
    strategy: 'Temukan bagian teks yang membicarakan hal yang ditanyakan, lalu bandingkan setiap pilihan dengan kalimat itu kata demi kata.',
  };
}

// ------------------------------------------------------------------------------
// PENCARIAN BUKTI
// ------------------------------------------------------------------------------

interface IndexedSentence { text: string; grams: Set<string> }

function bestSentence(target: string, extra: string, sentences: IndexedSentence[]): { text?: string; support: number } {
  const tg = bigrams(target);
  const eg = bigrams(extra);
  let best: IndexedSentence | undefined;
  let bestScore = 0;
  let bestSupport = 0;
  for (const s of sentences) {
    const sup = coverage(tg, s.grams);
    const score = sup * 0.75 + coverage(eg, s.grams) * 0.25;
    if (score > bestScore) { bestScore = score; best = s; bestSupport = sup; }
  }
  return { text: best?.text, support: bestSupport };
}

/** Teks yang dikutip dalam soal (「…」) dicari langsung di bacaan. */
function quotedEvidence(prompt: string, sentences: IndexedSentence[]): string | undefined {
  for (const m of prompt.matchAll(/「([^」]{2,40})」/g)) {
    const q = m[1].replace(/\s/g, '');
    const hit = sentences.find(s => s.text.replace(/\s/g, '').includes(q));
    if (hit) return hit.text;
  }
  return undefined;
}

// ------------------------------------------------------------------------------
// GLOSS
// ------------------------------------------------------------------------------

/** Rangkaian arti kata dari kalimat (tanpa kecocokan palsu & tanpa duplikat). */
export function sentenceGloss(s: Pick<SentenceAnalysis, 'words'>): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const w of s.words) {
    if (isLikelyFalseHit(w) || seen.has(w.item.id)) continue;
    seen.add(w.item.id);
    const first = (w.item.meaningId || '').split(/[;；,，／/]/)[0].replace(/\(.*?\)/g, '').trim();
    if (first) parts.push(first);
  }
  return parts.join(' · ');
}

function glossOf(text: string, translations?: Record<string, string>): string {
  const t = translations?.[normSentence(text)];
  if (t) return t;
  const a = analyzeText(text);
  return a.sentences.map(s => s.translation || sentenceGloss(s)).filter(Boolean).join(' / ');
}

// ------------------------------------------------------------------------------
// SOAL TAMBAHAN (bacaan dengan < 3 soal)
// ------------------------------------------------------------------------------

function supplementaryVocabQuestions(passage: DokkaiPassage, words: StudyWord[], need: number): DokkaiQuestionData[] {
  // Kosakata isi (bukan fungsi) dengan arti jelas; prioritaskan yang di atas/sama dengan level pembaca.
  const usable = words.filter(w =>
    ['noun', 'verb', 'adjective-i', 'adjective-na', 'adverb'].includes(w.item.wordType) &&
    w.surfaces.some(sf => sf.length >= 2) &&
    w.item.word.length >= 2 && (w.item.meaningId || '').trim().length > 1);
  const ordered = [...usable.filter(w => w.band === 'above'), ...usable.filter(w => w.band === 'at'), ...usable.filter(w => w.band === 'below')];
  const out: DokkaiQuestionData[] = [];
  const firstMeaning = (k: KotobaItem) => (k.meaningId || '').split(/[;；,，／/]/)[0].trim();
  const usedMeanings = new Set<string>();
  for (const w of ordered) {
    if (out.length >= need) break;
    const correct = firstMeaning(w.item);
    if (!correct || usedMeanings.has(correct)) continue;
    const distractors: string[] = [];
    for (const o of usable) {
      if (distractors.length >= 3) break;
      const m = firstMeaning(o.item);
      if (o.item.id === w.item.id || !m || m === correct || distractors.includes(m)) continue;
      if (o.item.wordType !== w.item.wordType && distractors.length < 2) continue;
      distractors.push(m);
    }
    for (const o of usable) { // isi kekurangan dengan jenis kata lain
      if (distractors.length >= 3) break;
      const m = firstMeaning(o.item);
      if (o.item.id !== w.item.id && m && m !== correct && !distractors.includes(m)) distractors.push(m);
    }
    if (distractors.length < 3) continue;
    usedMeanings.add(correct);
    const pos = (w.item.id.length + out.length) % 4;
    const options = [...distractors];
    options.splice(pos, 0, correct);
    const surface = w.surfaces[0];
    out.push({
      id: `${passage.id}_vocab_${w.item.id}`,
      prompt: `文中の「${surface}」の意味として最もよいものはどれか。`,
      options,
      correctIndex: pos,
      evidence: w.sentence,
      explanation:
        `「${surface}」${surface !== w.item.word ? ` adalah bentuk dari ${w.item.word}` : ''}（${w.item.reading}）berarti "${w.item.meaningId}". ` +
        `Di teks muncul pada kalimat: 「${w.sentence}」. Arti lain di pilihan adalah arti kata-kata lain dari bacaan yang sama.`,
    });
  }
  return out;
}

// ------------------------------------------------------------------------------
// BANGUN STUDI
// ------------------------------------------------------------------------------

const MAX_QUESTIONS = 3;

export function buildDokkaiStudy(passage: DokkaiPassage, readerLevel: string = passage.level): DokkaiStudy {
  const analysis = analyzeText(passage.text);
  const translations = passage.sentenceTranslations;
  // Terjemahan pasti dari generator mengisi kalimat yang belum punya terjemahan database.
  if (translations) for (const s of analysis.sentences) if (!s.translation) s.translation = translations[normSentence(s.text)];

  const paragraphsRaw = splitParagraphs(passage.text);
  const isInfo = INFO_RE.test(passage.text.slice(0, 80)) && !OPINION_RE.test(passage.text) ||
    passage.questions.some(q => /(案内|お知らせ|おしらせ|メール|ちらし|右のページ|ポスター|けいじ|掲示)/.test(q.instruction || '')) ||
    (passage.text.match(/\d+[時円日月人]/g) || []).length >= 4;

  // Kalimat per paragraf: cocokkan urutan kalimat analisis ke paragraf asal.
  const sentencesByParagraph: SentenceAnalysis[][] = paragraphsRaw.map(() => []);
  let pi = 0;
  for (const s of analysis.sentences) {
    const key = s.text.replace(/\s/g, '').slice(0, 8);
    while (pi < paragraphsRaw.length - 1 && !paragraphsRaw[pi].replace(/\s/g, '').includes(key)) pi++;
    sentencesByParagraph[pi].push(s);
  }

  const paragraphs: StudyParagraph[] = paragraphsRaw.map((p, i) => {
    const sents = sentencesByParagraph[i].map(s => s.text);
    let best = sents[0] || p;
    let bestScore = -Infinity;
    sents.forEach((s, j) => {
      const { score } = scoreSentence(s, i, paragraphsRaw.length, j, sents.length);
      if (score > bestScore) { bestScore = score; best = s; }
    });
    const { role, marker } = paragraphRole(p, i, paragraphsRaw.length, isInfo);
    return { index: i, text: p, role, marker, keySentence: best, keyGloss: glossOf(best, translations) };
  });

  // --- Materi ---
  const words: StudyWord[] = analysis.vocab
    .map(v => ({ ...v, surfaces: v.surfaces.filter(sf => !isLikelyFalseHit({ surface: sf, item: v.item })) }))
    .filter(v => v.surfaces.length > 0)
    .map(v => ({ ...v, band: bandOf(wordLevel(v.item), readerLevel) }));
  const wordsSorted = [...words].sort((a, b) =>
    (a.band === 'above' ? 0 : a.band === 'at' ? 1 : 2) - (b.band === 'above' ? 0 : b.band === 'at' ? 1 : 2) ||
    levelRank(wordLevel(b.item)) - levelRank(wordLevel(a.item)) || b.count - a.count);
  const kanji: StudyKanji[] = analysis.kanji.filter(k => /^N[1-5]$/.test(k.jlpt)).map(k => ({
    item: k,
    band: bandOf(k.jlpt, readerLevel),
    inWords: [...new Set(words.filter(w => w.item.word.includes(k.character)).map(w => w.item.word))].slice(0, 4),
  })).sort((a, b) => levelRank(b.item.jlpt) - levelRank(a.item.jlpt));
  const grammar: StudyGrammar[] = analysis.grammar.map(g => ({ ...g, band: bandOf(g.item.level, readerLevel) }))
    .sort((a, b) => levelRank(b.item.level) - levelRank(a.item.level));

  // --- Inti ---
  const allSentences: IndexedSentence[] = analysis.sentences.map(s => ({ text: s.text, grams: bigrams(s.text) }));
  const scored = paragraphs.flatMap((p, i) => sentencesByParagraph[i].map((s, j) => ({
    text: s.text, ...scoreSentence(s.text, i, paragraphs.length, j, sentencesByParagraph[i].length),
  }))).sort((a, b) => b.score - a.score);
  const keySentences = scored.slice(0, isInfo ? 2 : 3).map(s => ({ text: s.text, gloss: glossOf(s.text, translations), reason: s.reason }));

  const ideaQ = passage.questions.find(q => detectQuestionKind(q.prompt, isInfo).kind === 'idea' && /テーマ|言いたい|伝えたい|全体|主張|考え/.test(q.prompt));
  const topicWords = words
    .filter(w => w.item.wordType === 'noun' && w.item.word.length >= 2)
    .sort((a, b) => b.count - a.count || levelRank(wordLevel(b.item)) - levelRank(wordLevel(a.item)))
    .slice(0, 5)
    .map(w => w.item);
  const essayLike = OPINION_RE.test(passage.text) || paragraphs.some(p => p.role === 'conclusion' && p.marker);
  const textType: MainIdea['textType'] = isInfo ? 'info' : essayLike ? 'opinion' : 'narrative';
  let mainIdea: MainIdea;
  if (passage.mainIdea) {
    mainIdea = { text: passage.mainIdea.text, translation: passage.mainIdea.translation, basis: 'given', keySentences, topicWords, textType };
  } else if (ideaQ) {
    const t = ideaQ.options[ideaQ.correctIndex];
    mainIdea = { text: t, translation: glossOf(t), basis: 'question', keySentences, topicWords, textType };
  } else {
    const t = keySentences[0]?.text || paragraphs[0]?.keySentence || '';
    mainIdea = { text: t, translation: glossOf(t, translations), basis: 'auto', keySentences, topicWords, textType };
  }

  // --- Soal ---
  const base = passage.questions.slice(0, MAX_QUESTIONS);
  const supplements = base.length < MAX_QUESTIONS ? supplementaryVocabQuestions(passage, wordsSorted, MAX_QUESTIONS - base.length) : [];
  const questions: StudyQuestion[] = [...base.map(q => ({ q, sup: false })), ...supplements.map(q => ({ q, sup: true }))].map(({ q, sup }) => {
    const { kind, label, strategy } = sup
      ? { kind: 'vocab' as QuestionKind, label: 'Kosakata dalam konteks', strategy: 'Baca kalimat tempat kata itu muncul; arti yang cocok dengan konteks kalimat adalah jawabannya.' }
      : detectQuestionKind(q.prompt, isInfo);
    const correctText = q.options[q.correctIndex];
    const evidence = q.evidence || quotedEvidence(q.prompt, allSentences) || bestSentence(correctText, q.prompt, allSentences).text;
    const reviews: OptionReview[] = q.options.map((o, i) => {
      const { text: closest, support } = bestSentence(o, '', allSentences);
      const correct = i === q.correctIndex;
      let verdict: string;
      if (sup) verdict = correct ? 'Arti yang cocok dengan konteks kalimat.' : 'Ini arti kata lain di bacaan, bukan kata yang ditanyakan.';
      else if (correct) verdict = support >= 0.35 ? 'Didukung langsung oleh teks (lihat kalimat bukti).' : 'Disimpulkan dari isi teks — kata-katanya berbeda (parafrase), maknanya sama.';
      else if (support >= 0.5) verdict = 'Memakai kata-kata dari teks, tetapi isinya tidak sama dengan yang ditulis (detail berbeda/terbalik).';
      else if (support >= 0.25) verdict = 'Hanya sebagian yang disebut di teks; sisanya tidak sesuai.';
      else verdict = 'Tidak disebutkan di teks.';
      return { text: o, gloss: sup ? '' : glossOf(o), correct, closest: support >= 0.25 ? closest : undefined, support, verdict };
    });
    const autoExplanation = !q.explanation;
    const explanation = q.explanation ||
      `Jawaban: 「${correctText}」. ` +
      (evidence ? `Bagian teks yang menjadi bukti: 「${evidence}」. ` : '') +
      `${strategy}`;
    return {
      id: q.id,
      prompt: q.prompt,
      promptGloss: sup ? `Apa arti 「${q.prompt.match(/「([^」]+)」/)?.[1] ?? ''}」 di dalam teks?` : glossOf(q.prompt),
      options: q.options,
      correctIndex: q.correctIndex,
      kind,
      kindLabel: label,
      strategy,
      evidence,
      evidenceGloss: evidence ? glossOf(evidence, translations) : undefined,
      explanation,
      autoExplanation,
      supplementary: sup,
      reviews,
    };
  });

  const glossary = passage.vocabularyList?.filter(v => v.word && v.meaning && !/placeholder/i.test(v.word)) || [];
  const stats = {
    chars: analysis.charCount,
    sentences: analysis.sentences.length,
    above: words.filter(w => w.band === 'above').length,
    at: words.filter(w => w.band === 'at').length,
    below: words.filter(w => w.band === 'below').length,
  };

  return { passage, readerLevel, analysis, paragraphs, sentencesByParagraph, words: wordsSorted, kanji, grammar, glossary, mainIdea, questions, stats };
}
