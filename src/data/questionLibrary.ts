/**
 * Model & penyusun Bank Soal (Library → Soal).
 *
 * Dipisah dari QuestionLibraryView agar daftar soal terpadu bisa dipakai ulang (Bedah Soal mencari
 * "soal serupa" dari sini) dan diuji tanpa React. Sumber: paket Simulasi Ujian (tryout resmi & paket),
 * database Dokkai/Choukai, Bank Soal Aksara Kanji, dan Bank Soal Tata Bahasa.
 */
import { ALL_TRYOUTS } from './tryouts';
import { KANJI_QUESTION_BANK as kanjiQuestionsDb, BUNPOU_QUESTION_BANK as bunpouQuestionsDb } from './questionBank';
import { CHOUKAI_DATABASE } from './choukai';
import { CHOUKAI_ENABLED } from './featureFlags';
import { DOKKAI_DATABASE } from './dokkai';
import { KANJI_DATABASE } from './kanji';
import { BUNPOU_DATABASE } from './bunpou';
import furiganaDictRaw from './furiganaDictionary.json';
import { isKanji } from '../utils/furiganaUtils';

export type JlptSection = 'all' | 'mojiGoi' | 'bunpou' | 'dokkai' | 'choukai' | 'tryout';

export type QuestionSubCategory = 
  | 'all'
  | 'kanji_reading'    // 漢字読み (Cara Baca Kanji)
  | 'kanji_writing'    // 表記 (Penulisan Aksara)
  | 'vocab_context'    // 文脈規定 (Konteks Kosakata)
  | 'synonym'          // 言い換え (Sinonim / Semakna)
  | 'vocab_usage'      // 用法 (Penggunaan Kata)
  | 'grammar_form'     // 文法形式 (Pola & Konjugasi)
  | 'sentence_star'    // 文の組み立て (Susun Kalimat ★)
  | 'grammar_meaning'  // 文型の意味 (Arti Pola — latihan bank soal)
  | 'moji_basic'       // 文字の基礎 (Dasar Aksara — arti/bacaan/goresan kanji & kana)
  | 'dokkai_reading'   // 読解 (Wacana Bacaan)
  | 'choukai_audio';   // 聴解 (Dialog Menyimak)

export interface UnifiedQuestionItem {
  id: string;
  section: 'mojiGoi' | 'bunpou' | 'dokkai' | 'choukai';
  subCategory: QuestionSubCategory;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'JFT';
  sourceTitle: string;
  instruction?: string;
  prompt: string;
  ruby?: string;
  targetWord?: string;
  passage?: string;
  audioText?: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  /** true bila `explanation` ditulis untuk soal ini (bukan teks generik "jawabannya nomor X"). */
  explanationCurated?: boolean;
  /** Bank Soal Tata Bahasa: id materi pola di database Bunpou. */
  materialId?: string;
  /** Bank Soal Kanji: id/karakter kanji yang diuji. */
  kanjiRefs?: string[];
}

export const SUBCATEGORY_CONFIG: Record<
  QuestionSubCategory,
  { label: string; jp: string; section: JlptSection; color: string; bg: string }
> = {
  all: { label: 'Semua Format', jp: '全て', section: 'all', color: 'text-text-primary', bg: 'bg-surface-inset border-border-subtle' },
  kanji_reading: { label: 'Cara Baca Kanji', jp: '漢字読み', section: 'mojiGoi', color: 'text-indigo dark:text-indigo-soft', bg: 'bg-indigo/15 border-border-subtle' },
  kanji_writing: { label: 'Penulisan Aksara', jp: '表記', section: 'mojiGoi', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/15 border-border-subtle' },
  vocab_context: { label: 'Konteks Kosakata', jp: '文脈規定', section: 'mojiGoi', color: 'text-emerald-800 dark:text-emerald-400', bg: 'bg-emerald-500/15 border-border-subtle' },
  synonym: { label: 'Sinonim / Semakna', jp: '言い換え', section: 'mojiGoi', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/15 border-border-subtle' },
  vocab_usage: { label: 'Penggunaan Kata', jp: '用法', section: 'mojiGoi', color: 'text-red-700 dark:text-amber-400', bg: 'bg-red-700/15 border-border-subtle' },
  grammar_form: { label: 'Pola & Konjugasi', jp: '文法形式', section: 'bunpou', color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-500/15 border-border-subtle' },
  sentence_star: { label: 'Susun Kalimat (★)', jp: '文の組み立て', section: 'bunpou', color: 'text-gold dark:text-gold', bg: 'bg-gold/15 border-border-subtle' },
  grammar_meaning: { label: 'Arti Pola', jp: '文型の意味', section: 'bunpou', color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-500/15 border-border-subtle' },
  moji_basic: { label: 'Dasar Aksara', jp: '文字の基礎', section: 'mojiGoi', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/15 border-border-subtle' },
  dokkai_reading: { label: 'Wacana Bacaan', jp: '読解', section: 'dokkai', color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/15 border-border-subtle' },
  choukai_audio: { label: 'Dialog Menyimak', jp: '聴解', section: 'choukai', color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-500/15 border-border-subtle' },
};

export function detectQuestionSubCategory(
  section: 'mojiGoi' | 'bunpou' | 'dokkai' | 'choukai',
  instruction: string = '',
  prompt: string = '',
  passage?: string
): QuestionSubCategory {
  if (passage || section === 'dokkai') return 'dokkai_reading';
  if (section === 'choukai') return 'choukai_audio';

  const ins = instruction.toLowerCase();
  const p = prompt.toLowerCase();

  // Check for Star sentence
  if (p.includes('★') || p.includes('⭐') || ins.includes('★') || ins.includes('星') || ins.includes('並び替え') || ins.includes('組み立て')) {
    return 'sentence_star';
  }

  const isUsage = ins.includes('使い方') || ins.includes('つかいかた') || ins.includes('用法') || ins.includes('penggunaan');

  if (section === 'bunpou') {
    // Beberapa paket menaruh soal 用法 (使い方) di bagian 文法; formatnya tetap soal kosakata.
    return isUsage ? 'vocab_usage' : 'grammar_form';
  }

  if (section === 'mojiGoi') {
    if (
      ins.includes('読み方') || 
      ins.includes('よみかた') || 
      ins.includes('ひらがなで') || 
      ins.includes('読み') ||
      ins.includes('cara baca') ||
      p.includes('cara baca')
    ) {
      return 'kanji_reading';
    }
    // N5/N4 menulis perintahnya dengan hiragana: 「___のことばは どう かきますか」.
    if (ins.includes('漢字で書く') || ins.includes('表記') || ins.includes('どう書きますか') || /どう\s*かきますか|かんじで\s*かく/.test(ins) || p.includes('tulis') || p.includes('tulisan')) {
      return 'kanji_writing';
    }
    if (
      ins.includes('意味が最も近い') || ins.includes('言い換え') || ins.includes('同じ意味') || ins.includes('類義') || ins.includes('sinonim') ||
      /おなじ\s*いみ|いみが\s*(もっとも\s*)?ちかい/.test(ins)
    ) {
      return 'synonym';
    }
    if (isUsage) {
      return 'vocab_usage';
    }
    return 'vocab_context';
  }

  return 'vocab_context';
}

const PROMPT_BLANK_RE = /[（(][\s　]*[)）]|_{3,}|＿{2,}/;
const avgLength = (xs: string[]) => (xs.length ? xs.reduce((n, x) => n + x.length, 0) / xs.length : 0);

/**
 * Koreksi label dari BENTUK soal, untuk paket yang memakai perintah 問題 yang keliru:
 * - "表記" tetapi prompt punya bagian kosong （　） → soal isian (文脈規定);
 * - "使い方" tetapi pilihannya bukan kalimat → soal isian kosakata / pola;
 * - "文脈規定" tanpa bagian kosong dan pilihannya kalimat → soal kalimat semakna (言い換え).
 */
export function refineSubCategory(subCat: QuestionSubCategory, prompt: string, options: string[]): QuestionSubCategory {
  const hasBlank = PROMPT_BLANK_RE.test(prompt);
  const sentenceOptions = avgLength(options) >= 12 || options.some(o => /[。]$/.test(o.trim()));
  if (subCat === 'kanji_writing' && hasBlank) return 'vocab_context';
  if (subCat === 'vocab_usage' && !sentenceOptions) return hasBlank || prompt.length > 20 ? 'grammar_form' : 'vocab_context';
  if (subCat === 'vocab_context' && !hasBlank && sentenceOptions) return 'synonym';
  return subCat;
}

let kanjiDictWordsCache: string[] | null = null;
/** Kata berkanji di kamus furigana (dihitung sekali; dulu Object.keys ×7.000 per soal). */
function kanjiDictWords(): string[] {
  if (!kanjiDictWordsCache) {
    kanjiDictWordsCache = Object.keys(furiganaDictRaw.words as Record<string, string>).filter(w => Array.from(w).some(c => isKanji(c)));
  }
  return kanjiDictWordsCache;
}

/**
 * Automatically detects the tested word/kanji in reading questions.
 * In JLPT "漢字読み" (Cara Baca Kanji), the word being tested should NOT have ruby displayed on it,
 * and should be styled with a distinct, high-contrast visual accent so users can clearly see what word they are reading.
 */
export function getQuestionTargetWord(q: {
  subCategory?: string;
  instruction?: string;
  prompt: string;
  options?: string[];
  correctIndex?: number;
}): string | undefined {
  if (!q.prompt) return undefined;

  // 1. Check for explicit bracketed or underlined tokens in prompt: (関係), （関係）, 【関係】, [関係], <u>関係</u>, _関係_, etc.
  const bracketMatches = q.prompt.match(/[\(（【\[〔〈《<u>_＿]([^\)）】\]〕〉》<>\s_＿]+)[\)）】\]〕〉》<\/u>_＿]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      const inner = match.replace(/[\(（【\[〔〈《<u>_＿\)）】\]〕〉》<\/u>]/g, '').trim();
      if (inner && Array.from(inner).some(c => isKanji(c))) {
        return inner;
      }
    }
  }

  // 2. Only proceed if it is a kanji reading question or asks for yomikata/hiragana
  const isReadingQuestion = 
    q.subCategory === 'kanji_reading' ||
    (q.instruction && (
      q.instruction.includes('読み方') || 
      q.instruction.includes('よみかた') || 
      q.instruction.includes('ひらがなで') || 
      q.instruction.includes('読み') ||
      q.instruction.toLowerCase().includes('cara baca')
    )) ||
    (q.prompt && (
      q.prompt.includes('読み方') ||
      q.prompt.toLowerCase().includes('cara baca')
    ));

  if (!isReadingQuestion || !q.options || q.options.length === 0) {
    return undefined;
  }

  // Strip romaji e.g. "かんけい (kankei)" -> "かんけい", trim whitespace
  const cleanOptions = q.options.map(opt => 
    opt.replace(/\s*[\(（][^)]*[\)）]/g, '').trim()
  ).filter(Boolean);

  if (cleanOptions.length === 0) return undefined;

  const dictWords = furiganaDictRaw.words as Record<string, string>;
  const dictKanji = furiganaDictRaw.kanji as Record<string, string>;

  // A. Check compound words from dictionary that exist in prompt (longer matches first)
  const candidateWords = kanjiDictWords()
    .filter(w => q.prompt.includes(w))
    .sort((a, b) => b.length - a.length);

  const correctOpt = cleanOptions[q.correctIndex ?? 0];

  // Priority 1: Dictionary compound whose reading exactly matches correct option
  if (correctOpt) {
    for (const w of candidateWords) {
      if (dictWords[w] === correctOpt) {
        return w;
      }
    }
  }

  // Priority 2: Dictionary compound whose reading matches any candidate option
  for (const w of candidateWords) {
    const reading = dictWords[w];
    if (cleanOptions.includes(reading)) {
      return w;
    }
  }

  // Priority 3: Verb/Adjective okurigana match
  // e.g. prompt has "着きました", candidate option is "つきました", dictionary has "着く" -> "つく"
  for (const opt of cleanOptions) {
    for (const w of candidateWords) {
      const reading = dictWords[w];
      if (w.length >= 2 && reading.length >= 2) {
        const kanjiStem = w.slice(0, -1);
        const readingStem = reading.slice(0, -1);
        if (q.prompt.includes(kanjiStem) && opt.startsWith(readingStem)) {
          const okurigana = opt.slice(readingStem.length);
          const surfaceCandidate = kanjiStem + okurigana;
          if (q.prompt.includes(surfaceCandidate)) {
            return surfaceCandidate;
          }
          return kanjiStem;
        }
      }
    }
  }

  // B. Single kanji character match against dictionary
  const singleKanjisInPrompt = Array.from(q.prompt).filter(c => isKanji(c));
  if (correctOpt) {
    for (const k of singleKanjisInPrompt) {
      if (dictKanji[k] === correctOpt) {
        return k;
      }
    }
  }
  for (const k of singleKanjisInPrompt) {
    const reading = dictKanji[k];
    if (reading && cleanOptions.includes(reading)) {
      return k;
    }
  }

  // C. Okurigana match with single kanji (e.g. prompt "着きました", opt "つきました", dictKanji['着'] === 'つ')
  for (const opt of cleanOptions) {
    for (const k of singleKanjisInPrompt) {
      const reading = dictKanji[k];
      if (reading && opt.startsWith(reading)) {
        const okurigana = opt.slice(reading.length);
        const surfaceCandidate = k + okurigana;
        if (q.prompt.includes(surfaceCandidate)) {
          return surfaceCandidate;
        }
        return k;
      }
    }
  }

  // D. Fallback: If prompt contains only 1 contiguous kanji sequence
  const kanjiSequences = q.prompt.match(/[\u4e00-\u9faf\u3400-\u4dbf々〆]+/g) || [];
  if (kanjiSequences.length === 1) {
    return kanjiSequences[0];
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Bank Soal Aksara Kanji & Tata Bahasa: level dan jenis soal dari data, bukan ditebak.
// ---------------------------------------------------------------------------

type Level = UnifiedQuestionItem['level'];
const LEVELS = new Set<Level>(['N5', 'N4', 'N3', 'N2', 'N1']);

/** Level soal kanji dari kanji yang diuji (kj_n1_… / kanji_001 / karakter). */
export function kanjiQuestionLevel(refs: readonly string[] | undefined): Level {
  for (const ref of refs || []) {
    const lvl = KANJI_DATABASE[ref]?.jlpt as Level | undefined;
    if (lvl && LEVELS.has(lvl)) return lvl;
    const m = ref.match(/_n([1-5])_/i);
    if (m) return `N${m[1]}` as Level;
  }
  return 'N3';
}

/** Level soal bunpou dari materi polanya; materi lama (w1d1g1 …) adalah kurikulum N3. */
export function bunpouQuestionLevel(materialId: string | undefined): Level {
  const lvl = materialId ? (BUNPOU_DATABASE[materialId]?.level as Level | undefined) : undefined;
  return lvl && LEVELS.has(lvl) ? lvl : 'N3';
}

export type KanjiBankShape = 'strokes' | 'kana' | 'onkun' | 'kanji_meaning' | 'word_meaning' | 'word_reading';

/** Bentuk soal Bank Kanji dibaca dari kalimat perintahnya (format bank sudah seragam). */
export function classifyKanjiBankPrompt(prompt: string): KanjiBankShape {
  if (/goresan/i.test(prompt)) return 'strokes';
  if (/huruf\s+(Hiragana|Katakana)|(Hiragana|Katakana)\s+ini/i.test(prompt)) return 'kana';
  if (/Tebak\s+(Onyomi|Kunyomi)/i.test(prompt)) return 'onkun';
  if (/memiliki arti \/ makna utama/i.test(prompt)) return 'kanji_meaning';
  if (/arti kata|の意味|Arti dari|artinya/i.test(prompt)) return 'word_meaning';
  return 'word_reading';
}

const KANJI_BANK_SUBCATEGORY: Record<KanjiBankShape, QuestionSubCategory> = {
  strokes: 'moji_basic',
  kana: 'moji_basic',
  onkun: 'moji_basic',
  kanji_meaning: 'moji_basic',
  word_meaning: 'vocab_context',
  word_reading: 'kanji_reading',
};

const KANJI_BANK_INSTRUCTION: Record<KanjiBankShape, string> = {
  strokes: 'Tentukan jumlah goresan aksara berikut:',
  kana: 'Tentukan cara baca huruf kana berikut:',
  onkun: 'Pilih bacaan kanji (on’yomi / kun’yomi) yang tepat:',
  kanji_meaning: 'Pilih arti utama kanji berikut:',
  word_meaning: 'Pilih arti kata yang ditandai sesuai konteks kalimat:',
  word_reading: 'Pilih cara baca (yomikata) kata yang ditandai:',
};

/** Kata yang ditandai pada prompt bank: (関係), 「下線部」, atau kanji tunggal di 「」. */
export function markedWordInPrompt(prompt: string): string | undefined {
  const paren = prompt.match(/[(（]([^()（）\s]+)[)）]/);
  if (paren && Array.from(paren[1]).some(c => isKanji(c))) return paren[1];
  const quoted = [...prompt.matchAll(/「([^「」]+)」/g)].map(m => m[1]);
  // 「kalimat」の「kata」… → kata yang ditanya ada di kutipan terakhir yang pendek.
  const short = quoted.filter(x => x.length <= 8);
  return short.length ? short[short.length - 1] : undefined;
}

interface RawKanjiQuestion {
  id: string;
  prompt: string;
  ruby?: string;
  options?: string[];
  correct_index?: number;
  explanation?: string;
  kanji_refs?: string[];
  knowledge_refs?: string[];
}

interface RawBunpouQuestion {
  id: string;
  material_id?: string;
  type?: string;
  prompt: string;
  ruby?: string;
  options?: string[];
  correct_answer?: number;
  explanation?: string;
}

const genericExplanation = (lvl: string, idx: number, opt: string | undefined, kind: 'mg' | 'bd' | 'ck') =>
  kind === 'mg'
    ? `Latihan Evaluasi ${lvl}. Pilihan jawaban yang tepat adalah nomor ${idx + 1}: "${opt}".`
    : kind === 'bd'
      ? `Latihan Evaluasi ${lvl}. Kunci jawaban yang tepat adalah opsi ke-${idx + 1}: "${opt}".`
      : `Soal Choukai ${lvl}. Jawaban yang tepat adalah nomor ${idx + 1}: "${opt}".`;

/** Seluruh soal Bank Soal dalam satu daftar (urutan: tryout, Choukai, Dokkai, Bank Kanji, Bank Tata Bahasa). */
export function buildQuestionLibrary(): UnifiedQuestionItem[] {
  const list: UnifiedQuestionItem[] = [];

  // 1. Paket Simulasi Ujian
  for (const tryout of ALL_TRYOUTS) {
    const lvl = tryout.level;
    const data = tryout.data;
    const source = tryout.title;

    data?.sections?.mojiGoi?.questions?.forEach((q, idx) => {
      const subCat = refineSubCategory(detectQuestionSubCategory('mojiGoi', q.instruction, q.prompt), q.prompt, q.options || []);
      const correctIndex = q.correctIndex !== undefined ? q.correctIndex : 0;
      const targetWord = getQuestionTargetWord({
        subCategory: subCat,
        instruction: q.instruction,
        prompt: q.prompt,
        options: q.options || [],
        correctIndex,
      });
      list.push({
        id: `to_${tryout.id}_mg_${q.id || idx}`,
        section: SUBCATEGORY_CONFIG[subCat].section === 'bunpou' ? 'bunpou' : 'mojiGoi',
        subCategory: subCat,
        level: lvl,
        sourceTitle: source,
        instruction: q.instruction || 'Pilih jawaban yang paling tepat untuk melengkapi atau mengartikan kalimat.',
        prompt: q.prompt,
        ruby: q.ruby,
        targetWord,
        options: q.options || [],
        correctIndex,
        explanation: q.explanation || genericExplanation(lvl, correctIndex, (q.options || [])[correctIndex], 'mg'),
        explanationCurated: Boolean(q.explanation),
      });
    });

    data?.sections?.bunpouDokkai?.questions?.forEach((q, idx) => {
      const isDokkai = Boolean(q.passage) || Boolean(q.instruction && q.instruction.includes('文章'));
      const subCat = isDokkai
        ? 'dokkai_reading'
        : refineSubCategory(detectQuestionSubCategory('bunpou', q.instruction, q.prompt, q.passage), q.prompt, q.options || []);
      const sec = isDokkai ? 'dokkai' : SUBCATEGORY_CONFIG[subCat].section === 'mojiGoi' ? 'mojiGoi' : 'bunpou';
      const correctIndex = q.correctIndex !== undefined ? q.correctIndex : 0;
      const targetWord = getQuestionTargetWord({
        subCategory: subCat,
        instruction: q.instruction,
        prompt: q.prompt,
        options: q.options || [],
        correctIndex,
      });
      list.push({
        id: `to_${tryout.id}_bd_${q.id || idx}`,
        section: sec,
        subCategory: subCat,
        level: lvl,
        sourceTitle: source,
        instruction: q.instruction || (isDokkai ? 'Bacalah teks wacana berikut lalu jawablah pertanyaannya.' : 'Pilih pola tata bahasa yang paling sesuai.'),
        prompt: q.prompt,
        ruby: q.ruby,
        targetWord,
        passage: q.passage,
        options: q.options || [],
        correctIndex,
        explanation: q.explanation || genericExplanation(lvl, correctIndex, (q.options || [])[correctIndex], 'bd'),
        explanationCurated: Boolean(q.explanation),
      });
    });

    data?.sections?.choukai?.questions?.forEach((q, idx) => {
      const correctIndex = q.correctIndex !== undefined ? q.correctIndex : 0;
      list.push({
        id: `to_${tryout.id}_ck_${q.id || idx}`,
        section: 'choukai',
        subCategory: 'choukai_audio',
        level: lvl,
        sourceTitle: source,
        instruction: q.instruction || 'Dengarkan percakapan berikut lalu pilih jawaban yang tepat.',
        prompt: q.prompt,
        audioText: q.ruby || q.prompt,
        options: q.options || [],
        correctIndex,
        explanation: q.explanation || genericExplanation(lvl, correctIndex, (q.options || [])[correctIndex], 'ck'),
        explanationCurated: Boolean(q.explanation),
      });
    });
  }

  // 2. Database Choukai
  Object.values(CHOUKAI_DATABASE).forEach(ck => {
    const lvl = (ck.level?.includes('N4') ? 'N4' : ck.level?.includes('N5') ? 'N5' : 'N3') as Level;
    (ck.questions || []).forEach((q, qIdx) => {
      list.push({
        id: `db_ck_${ck.id}_${q.id || qIdx}`,
        section: 'choukai',
        subCategory: 'choukai_audio',
        level: lvl,
        sourceTitle: ck.title,
        instruction: `Percakapan: ${ck.dialogueSpeaker || 'Pelafalan Penutur Asli'}`,
        prompt: q.prompt,
        audioText: ck.audioText || ck.transcript,
        options: q.options || [],
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
        explanation: q.explanation || `Dengarkan baik-baik dialog. Jawaban yang benar adalah pilihan ke-${(q.correctIndex || 0) + 1}.`,
        explanationCurated: Boolean(q.explanation),
      });
    });
  });

  // 3. Database Dokkai
  Object.values(DOKKAI_DATABASE).forEach(dk => {
    const lvl = (dk.level?.includes('N4') ? 'N4' : dk.level?.includes('N5') ? 'N5' : 'N3') as Level;
    (dk.questions || []).forEach((q, qIdx) => {
      list.push({
        id: `db_dk_${dk.id}_${q.id || qIdx}`,
        section: 'dokkai',
        subCategory: 'dokkai_reading',
        level: lvl,
        sourceTitle: dk.title,
        instruction: 'Bacalah teks wacana berikut:',
        passage: dk.text,
        prompt: q.prompt,
        options: q.options || [],
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
        explanation: q.explanation || `Pahami makna inti wacana. Kunci yang tepat adalah opsi ke-${(q.correctIndex || 0) + 1}.`,
        explanationCurated: Boolean(q.explanation),
      });
    });
  });

  // 4. Bank Soal Aksara Kanji — seluruh soal, level dari kanji yang diuji.
  if (Array.isArray(kanjiQuestionsDb)) {
    for (const kq of kanjiQuestionsDb as RawKanjiQuestion[]) {
      const shape = classifyKanjiBankPrompt(kq.prompt);
      const refs = kq.knowledge_refs?.length ? kq.knowledge_refs : kq.kanji_refs;
      list.push({
        id: `kq_${kq.id}`,
        section: 'mojiGoi',
        subCategory: KANJI_BANK_SUBCATEGORY[shape],
        level: kanjiQuestionLevel(refs),
        sourceTitle: 'Bank Soal Aksara Kanji',
        instruction: KANJI_BANK_INSTRUCTION[shape],
        prompt: kq.prompt,
        ruby: kq.ruby,
        targetWord: shape === 'word_reading' || shape === 'word_meaning' ? markedWordInPrompt(kq.prompt) : undefined,
        options: kq.options || [],
        correctIndex: kq.correct_index !== undefined ? kq.correct_index : 0,
        explanation: kq.explanation || 'Perhatikan bentuk kanji dan kaidah pembacaan onyomi/kunyomi.',
        explanationCurated: Boolean(kq.explanation),
        kanjiRefs: refs,
      });
    }
  }

  // 5. Bank Soal Tata Bahasa — seluruh soal, level dari materi polanya.
  if (Array.isArray(bunpouQuestionsDb)) {
    for (const bq of bunpouQuestionsDb as RawBunpouQuestion[]) {
      const recognition = bq.type === 'recognition';
      list.push({
        id: `bq_${bq.id}`,
        section: 'bunpou',
        subCategory: recognition ? 'grammar_meaning' : 'grammar_form',
        level: bunpouQuestionLevel(bq.material_id),
        sourceTitle: 'Bank Soal Tata Bahasa',
        instruction: recognition
          ? 'Pilih arti dan fungsi yang tepat untuk pola tata bahasa berikut:'
          : 'Lengkapi kalimat berikut dengan pola tata bahasa yang tepat:',
        prompt: bq.prompt,
        ruby: bq.ruby,
        options: bq.options || [],
        correctIndex: bq.correct_answer !== undefined ? bq.correct_answer : 0,
        explanation: bq.explanation || 'Sesuaikan bentuk sambungan part of speech dengan makna kalimat.',
        explanationCurated: Boolean(bq.explanation),
        materialId: bq.material_id,
      });
    }
  }

  return CHOUKAI_ENABLED ? list : list.filter(q => q.section !== 'choukai');
}

/** Format latihan dasar (bukan format soal JLPT) — tidak ikut Latihan Harian "Semua Format". */
export const BASIC_DRILL_SUBCATEGORIES: ReadonlySet<QuestionSubCategory> = new Set(['moji_basic', 'grammar_meaning']);

let libraryCache: UnifiedQuestionItem[] | null = null;
/** Daftar terpadu yang dibangun sekali per sesi. */
export function getQuestionLibrary(): UnifiedQuestionItem[] {
  if (!libraryCache) libraryCache = buildQuestionLibrary();
  return libraryCache;
}
