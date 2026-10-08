import React, { useState, useMemo, lazy, Suspense } from 'react';
import { 
  Search, Volume2, CheckCircle2, XCircle, HelpCircle, 
  Feather, BookOpen, Headphones, FileText, Check, 
  Swords, Play, RotateCcw, Trophy, Award, ArrowRight, 
  ArrowLeft, Layers, Compass, Clock, Flame
} from 'lucide-react';
import { ALL_TRYOUTS } from '../../data/tryouts';
import { TryOutData } from '../../types/content';
import { KANJI_QUESTION_BANK as kanjiQuestionsDb, BUNPOU_QUESTION_BANK as bunpouQuestionsDb } from '../../data/questionBank';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { CHOUKAI_ENABLED } from '../../data/featureFlags';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { calculateQuizReward } from '../../utils/rewards';
import { smartSample } from '../../utils/smartRandomizer';
import furiganaDictRaw from '../../data/furiganaDictionary.json';
import { isKanji } from '../../utils/furiganaUtils';

const DungeonBattleModule = lazy(() => import('../dungeon/DungeonBattleModule').then(m => ({ default: m.DungeonBattleModule })));

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

  if (section === 'bunpou') {
    return 'grammar_form';
  }

  if (section === 'mojiGoi') {
    if (
      ins.includes('読み方') || 
      ins.includes('よみかた') || 
      ins.includes('ひらがなで') || 
      ins.includes('読み') ||
      p.includes('cara baca')
    ) {
      return 'kanji_reading';
    }
    if (ins.includes('漢字で書く') || ins.includes('表記') || ins.includes('どう書きますか') || p.includes('tulis') || p.includes('tulisan')) {
      return 'kanji_writing';
    }
    if (ins.includes('意味が最も近い') || ins.includes('言い換え') || ins.includes('同じ意味') || ins.includes('類義') || ins.includes('sinonim')) {
      return 'synonym';
    }
    if (ins.includes('使い方') || ins.includes('用法') || ins.includes('penggunaan')) {
      return 'vocab_usage';
    }
    return 'vocab_context';
  }

  return 'vocab_context';
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
  const candidateWords = Object.keys(dictWords)
    .filter(w => q.prompt.includes(w) && Array.from(w).some(c => isKanji(c)))
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

const ALL_SECTION_TABS: { value: JlptSection; label: string; jp: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'all', label: 'Semua Bagian', jp: '全て', icon: BookOpen },
  { value: 'mojiGoi', label: 'Moji & Goi', jp: '文字・語彙', icon: Feather },
  { value: 'bunpou', label: 'Bunpou', jp: '文法', icon: FileText },
  { value: 'dokkai', label: 'Dokkai', jp: '読解', icon: BookOpen },
  { value: 'choukai', label: 'Choukai', jp: '聴解', icon: Headphones },
  { value: 'tryout', label: 'Simulasi Ujian', jp: '模擬試験・試練', icon: Swords },
];

const SECTION_TABS = ALL_SECTION_TABS.filter(t => CHOUKAI_ENABLED || t.value !== 'choukai');

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Level' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
  { value: 'JFT', label: 'JFT-Basic' },
];

const SECTION_BADGE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  mojiGoi: { bg: 'bg-indigo/15 border-border-subtle', text: 'text-indigo', label: '文字・語彙 (Moji & Goi)' },
  bunpou: { bg: 'bg-purple-500/10 border-border-subtle', text: 'text-purple-400', label: '文法 (Bunpou)' },
  dokkai: { bg: 'bg-emerald-500/10 border-border-subtle', text: 'text-emerald-400', label: '読解 (Dokkai)' },
  choukai: { bg: 'bg-cyan-500/10 border-border-subtle', text: 'text-cyan-400', label: '聴解 (Choukai)' },
  tryout: { bg: 'bg-gold/15 border-border-subtle', text: 'text-gold', label: '模擬試験 (Simulasi Ujian)' },
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  N1: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-border-subtle' },
  N2: { bg: 'bg-indigo/15', text: 'text-indigo', border: 'border-border-subtle' },
  N3: { bg: 'bg-gold/15', text: 'text-gold', border: 'border-border-subtle' },
  N4: { bg: 'bg-surface-inset', text: 'text-emerald-800 dark:text-emerald-400', border: 'border-border-subtle' },
  N5: { bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-border-subtle' },
  JFT: { bg: 'bg-surface-inset', text: 'text-red-700 dark:text-amber-400', border: 'border-border-subtle' },
};

interface QuestionLibraryViewProps {
  soundEnabled?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordStudy?: (category: 'tryOuts' | 'questions' | 'dokkai' | 'choukai' | 'bunpou' | 'bossBattles', id: string, count?: number) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

export const QuestionLibraryView: React.FC<QuestionLibraryViewProps> = ({ 
  soundEnabled = true,
  onRewardPlayer,
  onRecordStudy,
  onCompleteStudyItem,
}) => {
  const [activeSection, setActiveSection] = useState<JlptSection>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<QuestionSubCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  // Active Full Exam Simulation (Dungeon Mode)
  const [activeDungeonTryout, setActiveDungeonTryout] = useState<TryOutData | null>(null);

  // Active Latihan Harian (10-Question Drill) State
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillQuestions, setDrillQuestions] = useState<UnifiedQuestionItem[]>([]);
  const [drillCurrentIndex, setDrillCurrentIndex] = useState(0);
  const [drillUserAnswers, setDrillUserAnswers] = useState<Record<number, number>>({});
  const [drillCompleted, setDrillCompleted] = useState(false);

  // Free Explorer User Interactive Answers state: questionId -> selectedOptionIndex
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Build unified questions list from tryouts + kanji questions + bunpou questions + dokkai + choukai
  const allQuestions: UnifiedQuestionItem[] = useMemo(() => {
    const list: UnifiedQuestionItem[] = [];

    // 1. From Official Tryouts
    for (const tryout of ALL_TRYOUTS) {
      const lvl = tryout.level;
      const data = tryout.data;
      const source = tryout.title;

      // Moji Goi
      if (data?.sections?.mojiGoi?.questions) {
        data.sections.mojiGoi.questions.forEach((q, idx) => {
          const subCat = detectQuestionSubCategory('mojiGoi', q.instruction, q.prompt);
          const targetWord = getQuestionTargetWord({
            subCategory: subCat,
            instruction: q.instruction,
            prompt: q.prompt,
            options: q.options || [],
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
          });
          list.push({
            id: `to_${tryout.id}_mg_${q.id || idx}`,
            section: 'mojiGoi',
            subCategory: subCat,
            level: lvl,
            sourceTitle: source,
            instruction: q.instruction || 'Pilih jawaban yang paling tepat untuk melengkapi atau mengartikan kalimat.',
            prompt: q.prompt,
            ruby: q.ruby,
            targetWord,
            options: q.options || [],
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
            explanation: `Latihan Evaluasi ${lvl}. Pilihan jawaban yang tepat adalah nomor ${(q.correctIndex || 0) + 1}: "${(q.options || [])[q.correctIndex || 0]}".`
          });
        });
      }

      // Bunpou & Dokkai
      if (data?.sections?.bunpouDokkai?.questions) {
        data.sections.bunpouDokkai.questions.forEach((q, idx) => {
          const isDokkai = Boolean(q.passage) || (q.instruction && q.instruction.includes('文章'));
          const sec = isDokkai ? 'dokkai' : 'bunpou';
          const subCat = isDokkai ? 'dokkai_reading' : detectQuestionSubCategory('bunpou', q.instruction, q.prompt, q.passage);
          const targetWord = getQuestionTargetWord({
            subCategory: subCat,
            instruction: q.instruction,
            prompt: q.prompt,
            options: q.options || [],
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
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
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
            explanation: `Latihan Evaluasi ${lvl}. Kunci jawaban yang tepat adalah opsi ke-${(q.correctIndex || 0) + 1}: "${(q.options || [])[q.correctIndex || 0]}".`
          });
        });
      }

      // Choukai
      if (data?.sections?.choukai?.questions) {
        data.sections.choukai.questions.forEach((q, idx) => {
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
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
            explanation: `Soal Choukai ${lvl}. Jawaban yang tepat adalah nomor ${(q.correctIndex || 0) + 1}: "${(q.options || [])[q.correctIndex || 0]}".`
          });
        });
      }
    }

    // 2. From Choukai Database
    Object.values(CHOUKAI_DATABASE).forEach((ck) => {
      const lvl = (ck.level?.includes('N4') ? 'N4' : ck.level?.includes('N5') ? 'N5' : 'N3') as 'N5' | 'N4' | 'N3';
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
          explanation: q.explanation || `Dengarkan baik-baik dialog. Jawaban yang benar adalah pilihan ke-${(q.correctIndex || 0) + 1}.`
        });
      });
    });

    // 3. From Dokkai Database
    Object.values(DOKKAI_DATABASE).forEach((dk) => {
      const lvl = (dk.level?.includes('N4') ? 'N4' : dk.level?.includes('N5') ? 'N5' : 'N3') as 'N5' | 'N4' | 'N3';
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
          explanation: q.explanation || `Pahami makna inti wacana. Kunci yang tepat adalah opsi ke-${(q.correctIndex || 0) + 1}.`
        });
      });
    });

    // 4. Sample slice from Kanji Questions (Moji/Goi)
    if (Array.isArray(kanjiQuestionsDb)) {
      kanjiQuestionsDb.slice(0, 100).forEach((kq) => {
        const targetWord = getQuestionTargetWord({
          subCategory: 'kanji_reading',
          instruction: 'Pilihlah cara baca (yomikata) atau kanji yang tepat:',
          prompt: kq.prompt,
          options: kq.options || [],
          correctIndex: kq.correct_index !== undefined ? kq.correct_index : 0,
        });
        list.push({
          id: `kq_${kq.id}`,
          section: 'mojiGoi',
          subCategory: 'kanji_reading',
          level: 'N3',
          sourceTitle: 'Bank Soal Aksara Kanji',
          instruction: 'Pilihlah cara baca (yomikata) atau kanji yang tepat:',
          prompt: kq.prompt,
          ruby: (kq as any).ruby,
          targetWord,
          options: kq.options || [],
          correctIndex: kq.correct_index !== undefined ? kq.correct_index : 0,
          explanation: kq.explanation || 'Perhatikan bentuk kanji dan kaidah pembacaan onyomi/kunyomi.'
        });
      });
    }

    // 5. Sample slice from Bunpou Questions (Grammar)
    if (Array.isArray(bunpouQuestionsDb)) {
      bunpouQuestionsDb.slice(0, 100).forEach((bq) => {
        const targetWord = getQuestionTargetWord({
          subCategory: 'grammar_form',
          instruction: 'Lengkapi kalimat berikut dengan pola tata bahasa yang tepat:',
          prompt: bq.prompt,
          options: bq.options || [],
          correctIndex: bq.correct_answer !== undefined ? bq.correct_answer : 0,
        });
        list.push({
          id: `bq_${bq.id}`,
          section: 'bunpou',
          subCategory: 'grammar_form',
          level: 'N3',
          sourceTitle: 'Bank Soal Tata Bahasa',
          instruction: 'Lengkapi kalimat berikut dengan pola tata bahasa yang tepat:',
          prompt: bq.prompt,
          ruby: bq.ruby,
          targetWord,
          options: bq.options || [],
          correctIndex: bq.correct_answer !== undefined ? bq.correct_answer : 0,
          explanation: bq.explanation || 'Sesuaikan bentuk sambungan part of speech dengan makna kalimat.'
        });
      });
    }

    return CHOUKAI_ENABLED ? list : list.filter(q => q.section !== 'choukai');
  }, []);

  // Section & Level Filter Counts
  const countsBySection = useMemo(() => {
    const counts: Record<string, number> = { 
      all: allQuestions.length, 
      mojiGoi: 0, 
      bunpou: 0, 
      dokkai: 0, 
      choukai: 0,
      tryout: ALL_TRYOUTS.length,
    };
    for (const q of allQuestions) {
      if (counts[q.section] !== undefined) counts[q.section]++;
    }
    return counts;
  }, [allQuestions]);

  const countsByLevel = useMemo(() => {
    const counts: Record<string, number> = { all: allQuestions.length, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, JFT: 0 };
    for (const q of allQuestions) {
      if (counts[q.level] !== undefined) counts[q.level]++;
    }
    return counts;
  }, [allQuestions]);

  // Sub-Category Counts (dynamic based on active section & level)
  const countsBySubCategory = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const q of allQuestions) {
      const matchSec = activeSection === 'all' || activeSection === 'tryout' || q.section === activeSection;
      const matchLvl = levelFilter === 'all' || q.level === levelFilter;
      if (matchSec && matchLvl) {
        counts.all = (counts.all || 0) + 1;
        counts[q.subCategory] = (counts[q.subCategory] || 0) + 1;
      }
    }
    return counts;
  }, [allQuestions, activeSection, levelFilter]);

  // Available SubCategories for current section
  const availableSubCategories = useMemo(() => {
    if (activeSection === 'tryout') return [];
    if (activeSection === 'mojiGoi') {
      return ['all', 'kanji_reading', 'kanji_writing', 'vocab_context', 'synonym', 'vocab_usage'] as QuestionSubCategory[];
    }
    if (activeSection === 'bunpou') {
      return ['all', 'grammar_form', 'sentence_star'] as QuestionSubCategory[];
    }
    if (activeSection === 'dokkai') {
      return ['all', 'dokkai_reading'] as QuestionSubCategory[];
    }
    if (activeSection === 'choukai') {
      return ['all', 'choukai_audio'] as QuestionSubCategory[];
    }
    return [
      'all',
      'kanji_reading',
      'kanji_writing',
      'vocab_context',
      'synonym',
      'vocab_usage',
      'grammar_form',
      'sentence_star',
      'dokkai_reading',
      ...(CHOUKAI_ENABLED ? ['choukai_audio' as const] : []),
    ] as QuestionSubCategory[];
  }, [activeSection]);

  // Filtering for Explorer
  const filteredQuestions = useMemo(() => {
    if (activeSection === 'tryout') return [];

    return allQuestions.filter((q) => {
      // 1. Section Filter
      if (activeSection !== 'all' && q.section !== activeSection) return false;

      // 2. Level Filter
      if (levelFilter !== 'all' && q.level !== levelFilter) return false;

      // 3. SubCategory Filter
      if (selectedSubCategory !== 'all' && q.subCategory !== selectedSubCategory) return false;

      // 4. Search Query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();

      return (
        q.prompt.toLowerCase().includes(query) ||
        (q.instruction && q.instruction.toLowerCase().includes(query)) ||
        (q.passage && q.passage.toLowerCase().includes(query)) ||
        (q.explanation && q.explanation.toLowerCase().includes(query)) ||
        q.options.some((opt) => opt.toLowerCase().includes(query))
      );
    });
  }, [allQuestions, activeSection, levelFilter, selectedSubCategory, searchQuery]);

  // Filtered Tryouts for Tryout tab & Hero Section
  const filteredTryouts = useMemo(() => {
    if (levelFilter === 'all') return ALL_TRYOUTS;
    return ALL_TRYOUTS.filter(t => t.level === levelFilter);
  }, [levelFilter]);

  const displayedQuestions = filteredQuestions.slice(0, visibleCount);

  // --- LATIHAN HARIAN (10 SOAL DRILL) LOGIC ---
  const handleStartDrill = (
    section: JlptSection = activeSection,
    level: string = levelFilter,
    subCat: QuestionSubCategory = selectedSubCategory
  ) => {
    let pool = allQuestions.filter((q) => {
      const matchSec = (section === 'all' || section === 'tryout') ? true : q.section === section;
      const matchLvl = level === 'all' ? true : q.level === level;
      const matchSub = subCat === 'all' ? true : q.subCategory === subCat;
      return matchSec && matchLvl && matchSub;
    });

    if (pool.length < 10) {
      pool = allQuestions.filter((q) => {
        const matchSec = (section === 'all' || section === 'tryout') ? true : q.section === section;
        const matchLvl = level === 'all' ? true : q.level === level;
        return matchSec && matchLvl;
      });
    }

    if (pool.length < 10) {
      pool = allQuestions.filter((q) => (level === 'all' ? true : q.level === level));
    }
    if (pool.length === 0) {
      pool = allQuestions;
    }

    const shuffled = smartSample(pool, 10, {
      getId: q => q.id,
      contextKey: `question_library_drill_${level}_${section}`
    });
    setDrillQuestions(shuffled);
    setDrillCurrentIndex(0);
    setDrillUserAnswers({});
    setDrillCompleted(false);
    setIsDrillActive(true);
    playSound('click', soundEnabled);
  };

  const handleDrillSelectOption = (optionIdx: number) => {
    if (drillUserAnswers[drillCurrentIndex] !== undefined) return;
    const currentQ = drillQuestions[drillCurrentIndex];
    if (!currentQ) return;

    const isCorrect = optionIdx === currentQ.correctIndex;
    setDrillUserAnswers((prev) => ({ ...prev, [drillCurrentIndex]: optionIdx }));

    if (isCorrect) {
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
  };

  const handleDrillNext = () => {
    if (drillCurrentIndex < drillQuestions.length - 1) {
      setDrillCurrentIndex((prev) => prev + 1);
      playSound('click', soundEnabled);
    } else {
      // Completed drill
      setDrillCompleted(true);
      playSound('levelUp', soundEnabled);

      let correctScore = 0;
      drillQuestions.forEach((q, idx) => {
        if (drillUserAnswers[idx] === q.correctIndex) {
          correctScore++;
        }
      });

      const levelSample = levelFilter === 'all' ? (drillQuestions[0]?.level || 'N3') : levelFilter;
      const quizReward = calculateQuizReward(levelSample, correctScore, drillQuestions.length);
      const expGain = quizReward.totalExpGained;
      const goldGain = quizReward.goldGained;
      if (onCompleteStudyItem) {
        onCompleteStudyItem('questions', expGain, goldGain, `drill_${activeSection}_${levelFilter}`, correctScore, drillQuestions.length);
      } else {
        if (onRewardPlayer && expGain > 0) {
          onRewardPlayer(expGain, goldGain);
        }
        if (onRecordStudy) {
          onRecordStudy('questions', `drill_${activeSection}_${levelFilter}`, correctScore);
        }
      }
    }
  };

  const drillCorrectScore = useMemo(() => {
    let score = 0;
    drillQuestions.forEach((q, idx) => {
      if (drillUserAnswers[idx] === q.correctIndex) score++;
    });
    return score;
  }, [drillQuestions, drillUserAnswers]);

  // Handle free explorer answer
  const handleSelectOptionExplorer = (questionId: string, optionIdx: number, correctIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    if (optionIdx === correctIdx) {
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
  };

  // --- IF RUNNING FULL DUNGEON EXAM SIMULATOR ---
  if (activeDungeonTryout) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Suspense fallback={<div className="panel panel-stitched p-12 text-center text-text-muted font-mono">Memuat Simulator Ujian...</div>}>
          <DungeonBattleModule
            tryOutData={activeDungeonTryout}
            onComplete={(score, total, exp, gold, tryoutId) => {
              if (onCompleteStudyItem) {
                onCompleteStudyItem('tryOuts', exp, gold, tryoutId || 'tryout_exam', score, total);
              } else {
                onRewardPlayer?.(exp, gold);
                onRecordStudy?.('tryOuts', tryoutId || 'tryout_exam', total);
              }
              setActiveDungeonTryout(null);
            }}
            onBack={() => setActiveDungeonTryout(null)}
            soundEnabled={soundEnabled}
          />
        </Suspense>
      </div>
    );
  }

  // --- IF RUNNING LATIHAN HARIAN (10 SOAL) INTERACTIVE DRILL ---
  if (isDrillActive) {
    if (drillCompleted) {
      const percentage = Math.round((drillCorrectScore / 10) * 100);
      let grade = 'C';
      let gradeText = 'Perlu Lebih Banyak Latihan';
      let gradeColor = 'text-amber-400 border-border-subtle bg-amber-400/10';

      if (percentage >= 90) {
        grade = 'S';
        gradeText = 'Sempurna! Penguasaan Luar Biasa';
        gradeColor = 'text-gold border-border-subtle bg-gold/10';
      } else if (percentage >= 80) {
        grade = 'A';
        gradeText = 'Luar Biasa! Kemampuan Sangat Mantap';
        gradeColor = 'text-emerald-400 border-border-subtle bg-emerald-500/10';
      } else if (percentage >= 60) {
        grade = 'B';
        gradeText = 'Bagus! Sudah Menguasai Dasar';
        gradeColor = 'text-cyan-400 border-border-subtle bg-cyan-500/10';
      }

      return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
          {/* Result Card */}
          <div className="panel panel-stitched p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-md text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center">
              <Trophy className="w-8 h-8 text-gold" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Evaluasi Latihan Harian (10 Soal)
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-heading">
                Latihan Selesai!
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary">
                {gradeText}
              </p>
            </div>

            {/* Score & Grade Display */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-2">
              <div className="p-4 px-6 rounded-2xl bg-surface-inset border border-border-subtle text-center min-w-[140px]">
                <span className="text-[11px] font-mono text-text-muted uppercase block">Skor Benar</span>
                <span className="text-2xl sm:text-3xl font-bold text-text-primary font-mono">
                  {drillCorrectScore} <span className="text-sm font-normal text-text-muted">/ 10</span>
                </span>
              </div>

              <div className="p-4 px-6 rounded-2xl bg-surface-inset border border-border-subtle text-center min-w-[140px]">
                <span className="text-[11px] font-mono text-text-muted uppercase block">Akurasi</span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
                  {percentage}%
                </span>
              </div>

              <div className={`p-4 px-6 rounded-2xl border text-center min-w-[140px] ${gradeColor}`}>
                <span className="text-[11px] font-mono uppercase block opacity-80">Predikat</span>
                <span className="text-2xl sm:text-3xl font-bold font-mono">
                  {grade}
                </span>
              </div>
            </div>

            {/* Rewards Card */}
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center gap-6 text-xs font-bold font-mono">
              <div className="flex items-center gap-2 text-indigo">
                <Award className="w-4 h-4" />
                <span>+{drillCorrectScore * 10} EXP Didapatkan</span>
              </div>
              <div className="flex items-center gap-2 text-gold">
                <span>+{drillCorrectScore * 5} Gold Didapatkan</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleStartDrill(activeSection, levelFilter)}
                className="btn-skeuo-gold w-full sm:w-auto px-6 py-3 text-xs sm:text-sm transition-all"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Latihan 10 Soal Baru (Acak)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDrillActive(false)}
                className="btn-skeuo-indigo w-full sm:w-auto px-6 py-3 text-xs sm:text-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Kembali ke Bank Soal</span>
              </button>
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted" />
              Tinjauan & Pembahasan Soal Latihan (10 Soal)
            </h3>

            <div className="space-y-3">
              {drillQuestions.map((q, idx) => {
                const userAns = drillUserAnswers[idx];
                const isCorrect = userAns === q.correctIndex;

                return (
                  <div 
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border-subtle/50 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle font-mono text-[11px] font-bold text-text-primary">
                          Soal {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle font-mono text-[10px] text-text-muted">
                          {q.level} • {SECTION_BADGE_STYLE[q.section]?.label || q.section}
                        </span>
                      </div>
                      <span className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {isCorrect ? 'Jawaban Benar' : 'Jawaban Salah'}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-jp text-text-primary font-medium">
                      <RubyText text={q.prompt} ruby={q.ruby} targetWord={q.targetWord} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-jp pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = userAns === oIdx;
                        const isRightAnswer = oIdx === q.correctIndex;

                        let style = 'bg-surface-card border-border-subtle text-text-secondary opacity-70';
                        if (isRightAnswer) {
                          style = 'bg-emerald-500/10 border-border-subtle text-emerald-400 font-bold opacity-100';
                        } else if (isChosen && !isRightAnswer) {
                          style = 'bg-rose-500/10 border-border-subtle text-rose-400 font-bold opacity-100';
                        }

                        return (
                          <div key={oIdx} className={`p-2.5 rounded-xl border flex items-center gap-2 ${style}`}>
                            <span className="w-5 h-5 rounded bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-[10px]">
                              {oIdx + 1}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle text-xs text-text-secondary space-y-1">
                      <span className="font-bold text-text-primary block font-mono text-[11px]">
                        💡 Pembahasan:
                      </span>
                      <p className="leading-relaxed whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Active Drill Question Runner
    const currentQ = drillQuestions[drillCurrentIndex];
    const isAnswered = drillUserAnswers[drillCurrentIndex] !== undefined;
    const selectedAns = drillUserAnswers[drillCurrentIndex];
    const isCorrectCurrent = selectedAns === currentQ?.correctIndex;

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Drill Progress & Control Header */}
        <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              onClick={() => setIsDrillActive(false)}
              className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Keluar Latihan</span>
            </button>

            <div className="flex items-center gap-2 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle text-text-primary font-bold">
                Level {currentQ?.level || levelFilter}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle text-emerald-400 font-bold">
                {drillCorrectScore} Benar
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>Soal {drillCurrentIndex + 1} dari {drillQuestions.length}</span>
              <span>{Math.round(((drillCurrentIndex + 1) / drillQuestions.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-inset border border-border-subtle overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${((drillCurrentIndex + 1) / drillQuestions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="panel panel-stitched p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-sm space-y-5 animate-fade-in">
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${SECTION_BADGE_STYLE[currentQ.section]?.bg} ${SECTION_BADGE_STYLE[currentQ.section]?.text}`}>
                {SECTION_BADGE_STYLE[currentQ.section]?.label || currentQ.section}
              </span>
              <span className="text-xs font-mono text-text-muted">
                {currentQ.sourceTitle}
              </span>
            </div>

            {/* Instruction */}
            {currentQ.instruction && (
              <div className="p-3 rounded-xl bg-surface-card border border-border-subtle flex items-start gap-2.5 shadow-sm">
                <div className="w-5 h-5 rounded-lg bg-indigo/10 border border-border-subtle text-indigo flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-3 h-3" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-text-primary font-jp leading-snug">
                  {currentQ.instruction}
                </div>
              </div>
            )}

            {/* Dokkai Passage Box */}
            {currentQ.passage && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2 max-h-64 overflow-y-auto font-jp text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-text-muted border-b border-border-subtle/50 pb-1">
                  <FileText className="w-3 h-3" /> Wacana Bacaan (Passage)
                </div>
                {currentQ.passage}
              </div>
            )}

            {/* Choukai Audio Button */}
            {currentQ.section === 'choukai' && currentQ.audioText && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle">
                <button
                  onClick={() => speakJapanese(currentQ.audioText!)}
                  className="btn-physical-secondary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Volume2 className="w-4 h-4 text-gold" />
                  Putar Audio Percakapan
                </button>
                <span className="text-[11px] text-text-muted font-jp">
                  Dengarkan dialog untuk menentukan jawaban yang tepat
                </span>
              </div>
            )}

            {/* Prompt */}
            <div className="text-base sm:text-lg font-medium text-text-primary font-jp leading-relaxed py-2">
              <RubyText text={currentQ.prompt} ruby={currentQ.ruby} targetWord={currentQ.targetWord} />
            </div>

            {/* 4 Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAns === optIdx;
                const isRight = optIdx === currentQ.correctIndex;

                let btnStyle = 'bg-surface-card border-border-subtle hover:border-border-muted text-text-primary';
                if (isAnswered) {
                  if (isRight) {
                    btnStyle = 'bg-emerald-500/15 border-border-subtle text-emerald-400 font-bold';
                  } else if (isSelected && !isRight) {
                    btnStyle = 'bg-rose-500/15 border-border-subtle text-rose-400 font-bold';
                  } else {
                    btnStyle = 'bg-surface-card border-border-subtle opacity-50 text-text-muted';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleDrillSelectOption(optIdx)}
                    disabled={isAnswered}
                    className={`p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-jp flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        {optIdx + 1}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </div>
                    {isAnswered && isRight && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isRight && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation card appears upon answering */}
            {isAnswered && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold font-mono">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-text-primary">
                      Jawaban Benar: Pilihan ({currentQ.correctIndex + 1}) — {currentQ.options[currentQ.correctIndex]}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isCorrectCurrent ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isCorrectCurrent ? 'Jawaban Kamu Benar!' : 'Belum Tepat'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Footer Next Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleDrillNext}
                disabled={!isAnswered}
                className={`px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                  isAnswered
                    ? 'btn-skeuo-gold shadow-md active:scale-95 cursor-pointer'
                    : 'bg-surface-inset border border-border-subtle text-text-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="whitespace-nowrap">
                  {drillCurrentIndex < drillQuestions.length - 1 ? 'Soal Berikutnya' : 'Selesaikan Latihan & Evaluasi'}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- STANDARD BANK SOAL & EXPLORER VIEW ---
  return (
    <div className="space-y-6">
      {/* Top JLPT Section Navigation Tabs (Now including Simulasi Ujian beside Choukai) */}
      <div className="panel panel-stitched p-3 sm:p-4 rounded-3xl border border-border-subtle shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {SECTION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.value;
            const count = countsBySection[tab.value] || 0;

            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveSection(tab.value);
                  setSelectedSubCategory('all');
                  setVisibleCount(30);
                  playSound('click', soundEnabled);
                }}
                className={`ui-chip px-4 py-2.5 text-xs sm:text-sm font-bold gap-2 shrink-0 ${isActive ? 'is-active' : ''}`}
              >
                <Icon className="w-4 h-4 opacity-75" />
                <span>{tab.label}</span>
                <span className="font-jp text-[11px] opacity-70">({tab.jp})</span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle/50 opacity-80">
                  {tab.value === 'tryout' ? `${filteredTryouts.length} Paket` : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Level Quick Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border-subtle/40">
          <span className="text-[11px] font-mono font-bold text-text-muted uppercase shrink-0 mr-1">
            Filter Level:
          </span>
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLevelFilter(opt.value);
                setVisibleCount(30);
                playSound('click', soundEnabled);
              }}
              className={`ui-chip px-3 py-1 text-xs font-medium shrink-0 ${levelFilter === opt.value ? 'is-active font-bold' : ''}`}
            >
              <span>{opt.label}</span>
              <span className="font-mono text-[10px] opacity-60">
                {opt.value === 'all' ? allQuestions.length : countsByLevel[opt.value] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Sub-Category Format Quick Badges (When not in Tryout) */}
        {activeSection !== 'tryout' && availableSubCategories.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle/40">
            <span className="text-[11px] font-mono font-bold text-text-muted uppercase shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-gold" />
              Tipe Soal:
            </span>
            {availableSubCategories.map((subCat) => {
              const meta = SUBCATEGORY_CONFIG[subCat];
              const isSubActive = selectedSubCategory === subCat;
              const count = countsBySubCategory[subCat] || 0;

              return (
                <button
                  key={subCat}
                  onClick={() => {
                    setSelectedSubCategory(subCat);
                    setVisibleCount(30);
                    playSound('click', soundEnabled);
                  }}
                  className={`ui-chip px-3 py-1 text-xs font-medium shrink-0 ${isSubActive ? 'is-active font-bold' : ''}`}
                >
                  <span>{meta.label}</span>
                  <span className="font-jp text-[10px] opacity-65">({meta.jp})</span>
                  <span className="font-mono text-[10px] opacity-60">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero Action Modes Grid (Latihan Harian 10 Soal + Simulasi Ujian Nyata) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1: Latihan Harian (10 Soal) */}
        <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4 hover:border-border-primary transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-gold/15 text-gold border border-border-subtle flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Mode Latihan Cepat
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {levelFilter === 'all' ? 'Semua Level' : `Level ${levelFilter}`}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading">
              Latihan Harian (10 Soal Acak)
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Drill interaktif 10 soal acak sesuai kategori dan level aktif. Dapatkan pembahasan instan, evaluasi skor, serta bonus EXP & Gold.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleStartDrill(activeSection, levelFilter)}
            className="btn-skeuo-gold w-full py-3.5 px-4 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span className="whitespace-nowrap">Mulai Latihan Harian (10 Soal)</span>
          </button>
        </div>

        {/* Mode 2: Paket Simulasi Ujian Nyata (Dungeon Battle) */}
        <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4 hover:border-border-primary transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo/15 text-indigo border border-border-subtle flex items-center gap-1">
                <Swords className="w-3 h-3" />
                Ujian Nyata (Dungeon)
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {filteredTryouts.length} Paket Tersedia
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading">
              Simulasi Ujian Berskala Penuh
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Kondisi ujian JLPT sesungguhnya dengan batas waktu standar, multi-sesi (Moji-Goi, Bunpou-Dokkai{CHOUKAI_ENABLED ? ', Choukai' : ''}), lembar jawaban grid, dan sertifikat kelulusan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (filteredTryouts.length > 0) {
                setActiveDungeonTryout(filteredTryouts[0].data);
              } else {
                setActiveSection('tryout');
              }
              playSound('click', soundEnabled);
            }}
            className="btn-skeuo-indigo w-full py-3.5 px-4 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 shrink-0 text-gold" />
            <span className="whitespace-nowrap">
              {activeSection === 'tryout' ? 'Pilih Paket Ujian di Bawah' : 'Buka Paket Ujian Nyata'}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW A: IF IN TRYOUT TAB -> Display Paket Ujian Grid */}
      {activeSection === 'tryout' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Swords className="w-5 h-5 text-gold" />
              Paket Simulasi Ujian JLPT ({filteredTryouts.length} Paket)
            </h3>
            <span className="text-xs font-mono text-text-muted">
              {levelFilter === 'all' ? 'Menampilkan Seluruh Level' : `Level ${levelFilter}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTryouts.map((to) => {
              const lvlColor = LEVEL_COLORS[to.level] || LEVEL_COLORS.N5;

              return (
                <div
                  key={to.id}
                  className="panel panel-stitched p-5 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4 hover:border-border-muted transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${lvlColor.bg} ${lvlColor.text} ${lvlColor.border}`}>
                        Level {to.level}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        Kode: {to.code}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-text-primary font-heading">
                        {to.title}
                      </h4>
                      <p className="text-xs text-text-secondary mt-1">
                        Paket simulasi ujian dengan format soal standar JLPT
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-text-secondary">
                      <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-text-muted" />
                        <span>{to.totalQuestions} Soal</span>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        <span>Timer Standar</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveDungeonTryout(to.data);
                      playSound('click', soundEnabled);
                    }}
                    className="btn-physical-secondary w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-gold fill-current" />
                    <span>Mulai Ujian Nyata</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW B: QUESTION EXPLORER (Moji-Goi, Bunpou, Dokkai, Choukai, or All) */
        <div className="space-y-4">
          {/* Search Bar & Explorer Summary */}
          <div className="panel panel-stitched p-4 rounded-2xl border border-border-subtle shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(30);
                }}
                placeholder="Cari soal, wacana, opsi..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-inset border border-border-subtle text-text-primary placeholder:text-text-muted text-xs sm:text-sm font-medium focus:outline-none focus:border-border-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted hover:text-text-primary"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-text-muted w-full sm:w-auto justify-between sm:justify-end">
              <span>Menampilkan {Math.min(visibleCount, filteredQuestions.length)} dari {filteredQuestions.length} soal</span>
              {Object.keys(userAnswers).length > 0 && (
                <span className="px-2 py-0.5 rounded bg-surface-inset font-bold text-text-primary border border-border-subtle">
                  {Object.keys(userAnswers).length} Dijawab
                </span>
              )}
            </div>
          </div>

          {/* Question Cards List */}
          {displayedQuestions.length > 0 ? (
            <div className="space-y-4">
              {displayedQuestions.map((q, qIndex) => {
                const badgeMeta = SECTION_BADGE_STYLE[q.section] || SECTION_BADGE_STYLE.mojiGoi;
                const selectedAnswer = userAnswers[q.id];
                const isAnswered = selectedAnswer !== undefined;
                const isRevealed = revealedExplanations[q.id];

                return (
                  <div
                    key={q.id}
                    className="panel panel-stitched p-5 sm:p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4 hover:border-border-muted transition-colors"
                  >
                    {/* Header: Level Badge, Section Badge, Sub-Category Badge & Number */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="px-2 py-0.5 rounded bg-surface-inset font-bold text-text-primary border border-border-subtle text-[11px] font-mono">
                          {q.level}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${badgeMeta.bg} ${badgeMeta.text}`}>
                          {badgeMeta.label}
                        </span>
                        {q.subCategory && q.subCategory !== 'all' && SUBCATEGORY_CONFIG[q.subCategory] && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold border ${SUBCATEGORY_CONFIG[q.subCategory].bg} ${SUBCATEGORY_CONFIG[q.subCategory].color}`}>
                            {SUBCATEGORY_CONFIG[q.subCategory].jp} · {SUBCATEGORY_CONFIG[q.subCategory].label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        No. {qIndex + 1}
                      </span>
                    </div>

                    {/* Instruction */}
                    {q.instruction && (
                      <p className="text-xs text-text-secondary font-medium italic">
                        {q.instruction}
                      </p>
                    )}

                    {/* Dokkai Passage Box */}
                    {q.passage && (
                      <div className="p-4 rounded-xl bg-surface-inset/80 border border-border-subtle space-y-2 max-h-60 overflow-y-auto font-jp text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-text-muted border-b border-border-subtle/50 pb-1">
                          <FileText className="w-3 h-3" /> Wacana Bacaan (Passage)
                        </div>
                        {q.passage}
                      </div>
                    )}

                    {/* Choukai Audio Prompt Button */}
                    {q.section === 'choukai' && q.audioText && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-inset border border-border-subtle">
                        <button
                          onClick={() => speakJapanese(q.audioText!)}
                          className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                        >
                          <Volume2 className="w-4 h-4 text-gold" />
                          Putar Dialog / Suara Soal
                        </button>
                        <span className="text-[11px] text-text-muted font-jp">
                          Gunakan speaker untuk mendengarkan percakapan
                        </span>
                      </div>
                    )}

                    {/* Prompt Text */}
                    <div className="text-sm sm:text-base font-medium text-text-primary font-jp leading-relaxed">
                      <RubyText text={q.prompt} ruby={q.ruby} targetWord={q.targetWord} />
                    </div>

                    {/* Multiple Choice Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswer === optIdx;
                        const isCorrect = optIdx === q.correctIndex;

                        let btnStyle = 'bg-surface-card border-border-subtle hover:border-border-muted text-text-primary';
                        if (isAnswered) {
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-500/10 border-border-subtle text-emerald-400 font-bold';
                          } else if (isSelected && !isCorrect) {
                            btnStyle = 'bg-rose-500/10 border-border-subtle text-rose-400 font-bold';
                          } else {
                            btnStyle = 'bg-surface-card border-border-subtle opacity-50 text-text-muted';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOptionExplorer(q.id, optIdx, q.correctIndex)}
                            disabled={isAnswered}
                            className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-jp flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                                {optIdx + 1}
                              </span>
                              <span className="leading-snug">{opt}</span>
                            </div>
                            {isAnswered && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            {isAnswered && isSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Toggle & Content */}
                    <div className="pt-2 flex flex-col space-y-2 border-t border-border-subtle/50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setRevealedExplanations((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                            playSound('click', soundEnabled);
                          }}
                          className="text-xs font-bold font-mono text-text-muted hover:text-text-primary flex items-center gap-1.5 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {isRevealed ? 'Sembunyikan Pembahasan' : 'Lihat Pembahasan & Kunci Jawaban'}
                        </button>

                        {isAnswered && (
                          <span className={`text-xs font-bold font-mono ${selectedAnswer === q.correctIndex ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {selectedAnswer === q.correctIndex ? 'Jawaban Benar!' : 'Jawaban Salah'}
                          </span>
                        )}
                      </div>

                      {isRevealed && (
                        <div className="p-3.5 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-secondary space-y-1.5 animate-fade-in">
                          <div className="flex items-center gap-2 text-text-primary font-bold">
                            <Check className="w-4 h-4 text-emerald-400" />
                            Kunci Jawaban Benar: Opsi ({q.correctIndex + 1}) — {q.options[q.correctIndex]}
                          </div>
                          <p className="leading-relaxed whitespace-pre-line text-text-secondary">
                            {q.explanation || 'Perhatikan konteks kalimat dan makna tata bahasa.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center panel rounded-2xl border border-border-subtle space-y-3">
              <BookOpen className="w-10 h-10 text-text-muted mx-auto opacity-50" />
              <h3 className="text-base font-bold text-text-primary">Tidak Ada Soal Ditemukan</h3>
              <p className="text-xs text-text-secondary">Coba pilih level atau kata kunci pencarian yang lain.</p>
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredQuestions.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setVisibleCount((prev) => prev + 30);
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary px-6 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider transition-all"
              >
                Muat Lebih Banyak ({filteredQuestions.length - visibleCount} Tersisa)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
