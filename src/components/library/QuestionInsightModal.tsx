// "Bedah Soal" — membongkar satu soal Bank Soal menjadi pelajaran bertahap:
// Pahami Perintah → Bedah Kalimat → (Susun Kalimat ★) → Analisis Pilihan → Kunci & Alasan → Soal Serupa.
// Tiap tahap hanya muncul bila datanya ada; isi disusun engine questionInsight dari database SevnQuest.

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  MessageCircle,
  RotateCcw,
  ScanSearch,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import type { KanjiItem, KotobaItem } from '../../types/content';
import type { UserDeck } from '../../types/rpg';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { getQuestionLibrary, type UnifiedQuestionItem } from '../../data/questionLibrary';
import { useAccess } from '../../state/entitlement';
import {
  QUESTION_STEP_TITLE,
  buildQuestionInsight,
  type OptionInsight,
  type QuestionInsight,
  type QuestionStepKind,
  type SentenceSegment,
  type WordInfo,
} from '../../engine/questionInsight/questionInsight';
import { playSound, speakJapanese } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import { lazyWithRetry as lazy } from '../../utils/lazyWithRetry';
import { recordKanjiWriting } from '../../utils/kanjiWritingRecord';
import { RubyText } from '../learning/RubyText';
import { KanjiDetailModal } from './KanjiDetailModal';

const KotobaInsightModal = lazy(() => import('./KotobaInsightModal').then(m => ({ default: m.KotobaInsightModal })));
const BunpouDetailModal = lazy(() => import('./BunpouDetailModal').then(m => ({ default: m.BunpouDetailModal })));

const SOURCES = { kotoba: KOTOBA_DATABASE, kanji: KANJI_DATABASE, bunpou: BUNPOU_DATABASE };

type InteractionHandler = (
  itemId: string,
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
  interactionType: 'view' | 'writing' | 'flashcard' | 'quiz',
  success?: boolean,
) => void;

type CompleteHandler = (
  moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
  expGained: number,
  goldGained: number,
  itemId?: string,
  score?: number,
  total?: number,
  interactionType?: 'writing' | 'flashcard' | 'quiz',
) => void;

interface QuestionInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: UnifiedQuestionItem | null;
  /** Pilihan yang dijawab pengguna (bila ada), ditandai di Analisis Pilihan. */
  userAnswer?: number;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordInteraction?: InteractionHandler;
  onCompleteStudyItem?: CompleteHandler;
}

const clean = (s: string) => s.replace(/@@/g, '');

export const QuestionInsightModal: React.FC<QuestionInsightModalProps> = ({
  isOpen,
  onClose,
  question,
  userAnswer,
  soundEnabled = true,
  userDecks,
  onUpdateDecks,
  onRewardPlayer,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  // "Bedah soal ini" dari Soal Serupa membuka soal itu; tombol kembali memulihkan soal sebelumnya.
  const [current, setCurrent] = useState<UnifiedQuestionItem | null>(question);
  const [answer, setAnswer] = useState<number | undefined>(userAnswer);
  const [history, setHistory] = useState<{ q: UnifiedQuestionItem; step: number; answer?: number }[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [kotobaItem, setKotobaItem] = useState<KotobaItem | null>(null);
  const [kanjiChar, setKanjiChar] = useState<string | null>(null);
  const [patternId, setPatternId] = useState<string | null>(null);
  const rewardedRef = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (question) {
      setCurrent(question);
      setAnswer(userAnswer);
      setHistory([]);
      setStepIdx(0);
      setVisited(new Set([0]));
    }
  }, [question, userAnswer]);

  // Soal Serupa hanya diambil dari level yang terbuka untuk pengguna (gating lunak, PRD 6.4).
  const { canAccessLevel } = useAccess();
  const pool = useMemo(() => getQuestionLibrary().filter(q => canAccessLevel(q.level)), [canAccessLevel]);
  const insight = useMemo(() => (current ? buildQuestionInsight(current, SOURCES, pool) : null), [current, pool]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[data-active]');
    if (rail && active) rail.scrollTo({ left: active.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
  }, [stepIdx, current?.id]);

  const nestedOpen = Boolean(kotobaItem || kanjiChar || patternId);

  const goBack = () => {
    if (nestedOpen) {
      setKotobaItem(null);
      setKanjiChar(null);
      setPatternId(null);
      return true;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setCurrent(prev.q);
      setAnswer(prev.answer);
      setStepIdx(prev.step);
      setVisited(new Set(Array.from({ length: prev.step + 1 }, (_, i) => i)));
      playSound('click', soundEnabled);
      return true;
    }
    return false;
  };

  useBackButton(isOpen, () => {
    if (goBack()) return false;
    onClose();
  }, 'question_insight_modal');

  if (!isOpen || !insight || typeof document === 'undefined') return null;

  const steps = insight.steps;
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx >= steps.length - 1;

  const goToStep = (idx: number) => {
    const next = Math.max(0, Math.min(idx, steps.length - 1));
    playSound('click', soundEnabled);
    setStepIdx(next);
    setVisited(v => new Set(v).add(next));
  };

  const openQuestion = (q: UnifiedQuestionItem, picked?: number) => {
    if (!current || q.id === current.id) return;
    playSound('click', soundEnabled);
    setHistory(h => [...h, { q: current, step: stepIdx, answer }]);
    setCurrent(q);
    setAnswer(picked);
    setStepIdx(0);
    setVisited(new Set([0]));
  };

  const openWord = (w: WordInfo) => {
    const item = w.kotobaId ? KOTOBA_DATABASE[w.kotobaId] : undefined;
    if (!item || !w.insight) return;
    playSound('click', soundEnabled);
    setKotobaItem(item);
  };
  const openKanji = (char: string) => {
    playSound('click', soundEnabled);
    setKanjiChar(char);
  };
  const openPattern = (id: string) => {
    if (!BUNPOU_DATABASE[id]) return;
    playSound('click', soundEnabled);
    setPatternId(id);
  };

  const getKanjiItem = (char: string): KanjiItem =>
    KANJI_DATABASE[char] ?? {
      id: `kj_${char}`,
      character: char,
      meaningId: `Aksara Kanji 「${char}」`,
      meaningEn: `Kanji character ${char}`,
      onyomi: [],
      kunyomi: [],
      strokeCount: 1,
      radical: '',
      radicalName: '',
      jlpt: 'N5',
      relatedWords: [],
      questions: [],
    };

  const handleSimilarDone = (correct: number, total: number) => {
    const id = `insight_${insight.question.id}`;
    if (rewardedRef.current.has(id) || total === 0) return;
    rewardedRef.current.add(id);
    const exp = 4 * correct;
    const gold = correct;
    if (onCompleteStudyItem) onCompleteStudyItem('questions', exp, gold, id, correct, total, 'quiz');
    else if (exp > 0) onRewardPlayer?.(exp, gold);
  };

  const guide = insight.task.guide;
  const handlers: StepHandlers = { onOpenWord: openWord, onOpenKanji: openKanji, onOpenPattern: openPattern, soundEnabled };

  return createPortal(
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-4 sm:p-6" exit={{ opacity: 0 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          onClose();
          playSound('click', soundEnabled);
        }}
        className="fixed inset-0 bg-black/75"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Bedah Soal ${guide.name}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="panel panel-stitched relative w-full max-w-xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden h-[min(92vh,860px)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5 border-b border-border-subtle bg-surface-inset">
          <div className="flex items-center gap-2 min-w-0">
            {history.length > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="btn-physical-secondary p-1.5 -ml-1 rounded-xl flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0"
                title="Kembali ke soal sebelumnya"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Soal sebelumnya</span>
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 font-heading">
                <ScanSearch className="w-4 h-4 text-gold shrink-0" />
                Bedah Soal
              </h3>
              <p className="text-[11px] text-text-muted font-mono truncate">
                <span className="text-text-secondary font-bold">{insight.question.level}</span> ·{' '}
                <span className="font-jp">{guide.ja}</span> · {stepIdx + 1}. {QUESTION_STEP_TITLE[step]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              playSound('click', soundEnabled);
            }}
            className="btn-physical-secondary p-1.5 rounded-xl cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rel tahapan */}
        <ol ref={railRef} className="flex items-center gap-1 px-3 sm:px-5 py-2 border-b border-border-subtle overflow-x-auto no-scrollbar" aria-label="Tahapan">
          {steps.map((s, i) => {
            const active = i === stepIdx;
            const done = visited.has(i) && !active;
            return (
              <li key={s} className="flex items-center gap-1 shrink-0">
                {i > 0 && <span className={`w-3 h-px ${visited.has(i) ? 'bg-gold/60' : 'bg-border-subtle'}`} />}
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  aria-current={active ? 'step' : undefined}
                  data-active={active || undefined}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg whitespace-nowrap text-[10.5px] font-bold transition-colors cursor-pointer border ${
                    active
                      ? 'bg-gold/15 text-gold border-gold/40'
                      : done
                        ? 'bg-surface-inset text-text-secondary border-border-subtle'
                        : 'text-text-muted border-transparent hover:text-text-secondary'
                  }`}
                >
                  <span className="font-mono">{done ? <Check className="w-3 h-3" /> : String(i + 1).padStart(2, '0')}</span>
                  <span className={active ? 'inline' : 'hidden sm:inline'}>{QUESTION_STEP_TITLE[s]}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Panggung */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${insight.question.id}-${step}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {step === 'task' && <TaskStep insight={insight} />}
              {step === 'sentence' && <SentenceStep insight={insight} {...handlers} />}
              {step === 'build' && <BuildStep insight={insight} />}
              {step === 'options' && <OptionsStep insight={insight} userAnswer={answer} {...handlers} />}
              {step === 'answer' && <AnswerStep insight={insight} {...handlers} />}
              {step === 'similar' && (
                <SimilarStep
                  key={insight.question.id}
                  insight={insight}
                  soundEnabled={soundEnabled}
                  onDone={handleSimilarDone}
                  onOpenQuestion={openQuestion}
                  onRestart={() => goToStep(0)}
                />
              )}
              {step !== 'similar' && insight.narration[step] && <Narration text={insight.narration[step]!} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigasi */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5 border-t border-border-subtle bg-surface-inset">
          <button
            type="button"
            onClick={() => goToStep(stepIdx - 1)}
            disabled={stepIdx === 0}
            className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-default"
            aria-label="Tahap sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>
          <span className="text-[11px] font-mono text-text-muted whitespace-nowrap">
            {stepIdx + 1}/{steps.length}
          </span>
          {isLast ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                playSound('click', soundEnabled);
              }}
              className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              Selesai
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(stepIdx + 1)}
              className="btn-physical-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer font-heading min-w-0"
            >
              <span className="truncate">
                <span className="sm:hidden">Lanjut: </span>
                {QUESTION_STEP_TITLE[steps[stepIdx + 1]]}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </motion.div>

      {kanjiChar && (
        <KanjiDetailModal
          isOpen
          onClose={() => setKanjiChar(null)}
          item={getKanjiItem(kanjiChar)}
          soundEnabled={soundEnabled}
          userDecks={userDecks}
          onUpdateDecks={onUpdateDecks}
          onCompleteSheet={(_sheet, score, reward) =>
            recordKanjiWriting(getKanjiItem(kanjiChar), score, reward, { onCompleteStudyItem, onRewardPlayer })
          }
        />
      )}
      {kotobaItem && (
        <Suspense fallback={null}>
          <KotobaInsightModal
            isOpen
            onClose={() => setKotobaItem(null)}
            item={kotobaItem}
            soundEnabled={soundEnabled}
            userDecks={userDecks}
            onUpdateDecks={onUpdateDecks}
            onRewardPlayer={onRewardPlayer}
            onRecordInteraction={onRecordInteraction}
            onCompleteStudyItem={onCompleteStudyItem}
          />
        </Suspense>
      )}
      {patternId && BUNPOU_DATABASE[patternId] && (
        <Suspense fallback={null}>
          <BunpouDetailModal
            item={BUNPOU_DATABASE[patternId]}
            onClose={() => setPatternId(null)}
            soundEnabled={soundEnabled}
            userDecks={userDecks}
            onUpdateDecks={onUpdateDecks}
            onRewardPlayer={onRewardPlayer}
            onRecordInteraction={onRecordInteraction}
            onCompleteStudyItem={onCompleteStudyItem}
          />
        </Suspense>
      )}
    </motion.div>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// Bagian bersama
// ---------------------------------------------------------------------------

interface StepHandlers {
  onOpenWord: (w: WordInfo) => void;
  onOpenKanji: (char: string) => void;
  onOpenPattern: (id: string) => void;
  soundEnabled: boolean;
}

const Narration: React.FC<{ text: string }> = ({ text }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.6, duration: 0.35 }}
      className="flex gap-2.5 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle"
      aria-live="polite"
    >
      <MessageCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
      <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">{text}</p>
    </motion.div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{children}</h4>
);

const SpeakButton: React.FC<{ text: string; label?: string }> = ({ text, label }) => (
  <button
    type="button"
    onClick={() => speakJapanese(text)}
    className="btn-physical-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer"
    title="Dengarkan"
  >
    <Volume2 className="w-3.5 h-3.5" />
    {label}
  </button>
);

const Chip: React.FC<{ children: React.ReactNode; tone?: 'gold' | 'danger' | 'success' | 'muted'; title?: string }> = ({ children, tone = 'muted', title }) => {
  const toneClass =
    tone === 'gold'
      ? 'bg-gold/15 text-gold border-gold/40'
      : tone === 'danger'
        ? 'bg-state-danger/10 text-state-danger border-state-danger/30'
        : tone === 'success'
          ? 'bg-state-success/15 text-state-success border-state-success/30'
          : 'bg-surface-inset text-text-secondary border-border-subtle';
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${toneClass}`}>
      {children}
    </span>
  );
};

/** Kartu kata yang bisa diketuk untuk membuka Pemahaman Kotoba. */
const WordButton: React.FC<{ word: WordInfo; onOpen: (w: WordInfo) => void; surface?: string; note?: string }> = ({ word, onOpen, surface, note }) => {
  const clickable = word.insight && Boolean(word.kotobaId);
  const body = (
    <>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="font-jp font-bold text-text-primary">{surface && surface !== word.word ? surface : word.word}</span>
        {surface && surface !== word.word && <span className="text-[11px] text-text-muted font-jp">→ {word.word}</span>}
        {word.reading && word.reading !== word.word && <span className="text-[11px] text-text-muted font-jp">{word.reading}</span>}
        {word.jlpt && <span className="text-[9.5px] font-mono text-text-muted">{word.jlpt}</span>}
      </div>
      {word.meaning && <div className="text-[11.5px] text-text-secondary leading-snug">{word.meaning}</div>}
      {note && <div className="text-[10.5px] text-text-muted leading-snug">{note}</div>}
    </>
  );
  return clickable ? (
    <button
      type="button"
      onClick={() => onOpen(word)}
      className="text-left p-2.5 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer"
      title="Buka Pemahaman Kotoba"
    >
      {body}
    </button>
  ) : (
    <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle">{body}</div>
  );
};

const segmentClass: Record<SentenceSegment['role'], string> = {
  plain: '',
  answer: 'rounded-md px-0.5 bg-gold/20 text-gold underline decoration-gold decoration-2 underline-offset-[6px]',
  target: 'rounded-md px-0.5 underline decoration-gold decoration-2 underline-offset-[6px] text-text-primary',
  fragment: 'rounded-md px-0.5 bg-surface-card border border-border-subtle',
};

const SentenceLine: React.FC<{ segments: SentenceSegment[]; className?: string }> = ({ segments, className = '' }) => (
  <p className={`font-jp font-bold text-text-primary leading-relaxed ${className}`} lang="ja">
    {segments.map((s, i) => (
      <span key={i} className={segmentClass[s.role]}>
        {s.text}
      </span>
    ))}
  </p>
);

// ---------------------------------------------------------------------------
// 1. Pahami Perintah
// ---------------------------------------------------------------------------

const TaskStep: React.FC<{ insight: QuestionInsight }> = ({ insight }) => {
  const reduce = useReducedMotion();
  const { task, question: q } = insight;
  const g = task.guide;
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center text-center gap-1.5 pt-1">
        {task.mondai && <Chip tone="gold">問題 {task.mondai}</Chip>}
        <motion.h1
          lang="ja"
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl sm:text-4xl font-black font-jp text-text-primary"
        >
          {g.ja}
        </motion.h1>
        <p className="text-xs font-jp text-text-muted">{g.reading}</p>
        <p className="text-base font-black font-heading text-text-primary">{g.name}</p>
        {!g.jlpt && <span className="text-[10.5px] text-text-muted">Latihan dasar Bank Soal (bukan format soal JLPT)</span>}
      </div>

      <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
        <SectionTitle>Yang diuji</SectionTitle>
        <p className="text-sm text-text-primary leading-relaxed">{g.asks}</p>
      </div>

      {task.instructionJa && (
        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5">
          <SectionTitle>Kalimat perintah</SectionTitle>
          <p className="text-sm font-jp text-text-primary leading-relaxed" lang="ja">
            {task.instructionJa}
          </p>
          <p className="text-xs text-text-secondary">“{task.instructionId}”</p>
          {task.terms.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {task.terms.map((t, i) => (
                <motion.div
                  key={t.ja}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.2 + i * 0.06 }}
                  className="flex items-baseline gap-2 px-2.5 py-1.5 rounded-lg bg-surface-card border border-border-subtle"
                >
                  <span className="font-jp font-bold text-text-primary text-sm">{t.ja}</span>
                  {t.reading !== t.ja && <span className="font-jp text-[10.5px] text-text-muted">{t.reading}</span>}
                  <span className="text-[11.5px] text-text-secondary ml-auto text-right">{t.id}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
      {!task.instructionJa && (
        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
          <SectionTitle>Perintah</SectionTitle>
          <p className="text-sm text-text-primary">{task.instructionId}</p>
          {task.question && <p className="text-xs text-text-secondary">{clean(task.question)}</p>}
        </div>
      )}

      <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
        <SectionTitle>Soal</SectionTitle>
        <div className="text-sm sm:text-base font-jp text-text-primary leading-relaxed">
          <RubyText text={clean(q.prompt)} ruby={q.ruby} targetWord={q.targetWord} />
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Strategi mengerjakan</SectionTitle>
        <ol className="space-y-1.5">
          {g.strategy.map((s, i) => (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.35 + i * 0.1 }}
              className="flex gap-2.5 text-xs sm:text-[13px] text-text-secondary leading-relaxed"
            >
              <span className="w-5 h-5 rounded-md bg-gold/15 text-gold border border-gold/30 text-[10.5px] font-mono font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span>{s}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Bedah Kalimat
// ---------------------------------------------------------------------------

const SentenceStep: React.FC<{ insight: QuestionInsight } & StepHandlers> = ({ insight, onOpenWord, onOpenPattern }) => {
  const reduce = useReducedMotion();
  const s = insight.sentence!;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-inset border border-border-subtle p-4 sm:p-5 space-y-3">
        <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <SentenceLine segments={s.segments} className="text-lg sm:text-xl" />
        </motion.div>
        {s.translation ? (
          <p className="text-sm text-text-secondary font-medium">
            “{s.translation}”
            <span className="block text-[10.5px] text-text-muted mt-0.5">{s.translationSource === 'explanation' ? 'Terjemahan dari pembahasan soal.' : 'Terjemahan dari contoh kalimat di database.'}</span>
          </p>
        ) : (
          <p className="text-[11px] text-text-muted">Terjemahan utuh belum tersedia. Pahami lewat kosakata dan struktur di bawah.</p>
        )}
        <SpeakButton text={s.text} label="Putar kalimat" />
      </div>

      {s.chunks.length > 1 && (
        <div className="space-y-2">
          <SectionTitle>Struktur kalimat</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {s.chunks.map((c, i) => (
              <motion.div
                key={`${c.text}-${i}`}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.15 + i * 0.07 }}
                className="px-2.5 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-center"
              >
                <div className="font-jp font-bold text-sm text-text-primary">{c.text}</div>
                {c.role && <div className="text-[10px] text-text-muted">{c.role}</div>}
              </motion.div>
            ))}
          </div>
          <p className="text-[10.5px] text-text-muted">Potongan berdasarkan partikel, disusun otomatis.</p>
        </div>
      )}

      {s.words.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>Kosakata dalam kalimat</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {s.words.map(w => (
              <WordButton
                key={`${w.kotobaId ?? w.word}-${w.surface}`}
                word={w}
                surface={w.surface}
                onOpen={onOpenWord}
                note={[w.formLabel, w.alternatives?.length ? `bisa juga: ${w.alternatives.join(' / ')}` : ''].filter(Boolean).join(' · ') || undefined}
              />
            ))}
          </div>
        </div>
      )}

      {s.grammar.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>Pola dalam kalimat</SectionTitle>
          <div className="grid gap-1.5">
            {s.grammar.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => onOpenPattern(g.id)}
                className="text-left px-3 py-2 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer"
              >
                <span className="font-jp font-bold text-text-primary">{g.matched}</span>
                <span className="text-[11px] text-text-muted font-jp"> → {g.title.split(/[（(]/)[0]}</span>
                <div className="text-[11.5px] text-text-secondary">{g.meaning}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Susun Kalimat ★
// ---------------------------------------------------------------------------

const BuildStep: React.FC<{ insight: QuestionInsight }> = ({ insight }) => {
  const reduce = useReducedMotion();
  const b = insight.build!;
  const q = insight.question;
  const [placed, setPlaced] = useState(reduce ? b.order.length : 0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduce) {
      setPlaced(b.order.length);
      return;
    }
    setPlaced(0);
    const timers = b.order.map((_, i) => window.setTimeout(() => setPlaced(i + 1), 600 + i * 700));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [run, reduce, b.order]);
  const done = placed >= b.order.length;
  const placedSet = new Set(b.order.slice(0, placed));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SectionTitle>Potongan pilihan</SectionTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {q.options.map((opt, i) => (
            <motion.div
              key={i}
              animate={{ opacity: placedSet.has(i) ? 0.35 : 1, scale: placedSet.has(i) ? 0.96 : 1 }}
              className="px-3 py-2 rounded-xl bg-surface-inset border border-border-subtle font-jp text-sm text-text-primary flex items-center gap-2"
            >
              <span className="w-5 h-5 rounded-md bg-surface-card border border-border-subtle font-mono text-[10.5px] flex items-center justify-center">{i + 1}</span>
              {clean(opt)}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-inset border border-border-subtle p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 font-jp text-sm sm:text-base text-text-primary" lang="ja">
          {b.before && <span className="text-text-secondary">{b.before}</span>}
          {b.order.map((optIdx, pos) => {
            const filled = pos < placed;
            const star = pos === b.starPos;
            return (
              <div
                key={pos}
                className={`relative min-w-[3.5rem] min-h-[2.25rem] px-2 py-1 rounded-lg border-2 border-dashed flex items-center justify-center ${
                  star ? 'border-gold/70' : 'border-border-muted'
                } ${filled ? (star ? 'bg-gold/15 border-solid' : 'bg-surface-card border-solid') : ''}`}
              >
                {star && <Star className="absolute -top-2 -right-2 w-4 h-4 text-gold fill-current" />}
                <AnimatePresence>
                  {filled && (
                    <motion.span
                      initial={reduce ? false : { opacity: 0, y: -14, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`font-bold ${star ? 'text-gold' : ''}`}
                    >
                      {clean(q.options[optIdx])}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {b.after && <span className="text-text-secondary">{b.after}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-muted font-mono">
          <span>Urutan nomor: {b.order.map(i => i + 1).join(' → ')}</span>
          <span>· ★ = kotak ke-{b.starPos + 1}</span>
        </div>
      </div>

      {done && (
        <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-2xl bg-gold/10 border border-gold/30 text-sm text-text-primary">
          Potongan di posisi ★ adalah <span className="font-jp font-black text-gold">「{clean(q.options[q.correctIndex])}」</span>, jadi jawabannya nomor{' '}
          {q.correctIndex + 1}.
        </motion.div>
      )}

      <button type="button" onClick={() => setRun(r => r + 1)} className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
        <RotateCcw className="w-3.5 h-3.5" /> Putar ulang
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. Analisis Pilihan
// ---------------------------------------------------------------------------

const PartsCard: React.FC<{ insight: QuestionInsight; onOpenKanji: (c: string) => void }> = ({ insight, onOpenKanji }) => {
  const reduce = useReducedMotion();
  const parts = insight.parts;
  if (!parts?.length) return null;
  const word = parts.map(p => p.text).join('');
  return (
    <div className="rounded-2xl bg-surface-inset border border-border-subtle p-4 space-y-2">
      <SectionTitle>Bedah kata 「{word}」</SectionTitle>
      <div className="flex justify-center gap-2 flex-wrap">
        {parts.map((p, i) =>
          p.isKanji ? (
            <motion.button
              key={i}
              type="button"
              onClick={() => onOpenKanji(p.text.slice(0, 1))}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.1 + i * 0.12 }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-surface-card border border-border-subtle hover:border-gold/50 cursor-pointer min-w-[4.5rem]"
              title="Buka detail kanji"
            >
              <span className="text-[11px] font-jp text-gold font-bold">{p.reading}</span>
              <span className="text-3xl font-jp font-black text-text-primary" lang="ja">
                {p.text}
              </span>
              {p.readingType && <span className="text-[9.5px] font-mono text-text-muted">{p.readingType === 'on' ? '音 on' : p.readingType === 'kun' ? '訓 kun' : 'khusus'}</span>}
              {p.meaning && <span className="text-[10.5px] text-text-secondary text-center leading-tight max-w-[7rem]">{p.meaning}</span>}
            </motion.button>
          ) : (
            <div key={i} className="flex flex-col items-center justify-center gap-0.5 px-2 py-2">
              <span className="text-[11px] font-jp text-text-muted">{p.reading}</span>
              <span className="text-2xl font-jp font-bold text-text-secondary">{p.text}</span>
            </div>
          ),
        )}
      </div>
      {insight.targetInfo?.meaning && <p className="text-center text-sm font-bold text-text-primary">{insight.targetInfo.meaning}</p>}
    </div>
  );
};

const KanjiCard: React.FC<{ insight: QuestionInsight; onOpenKanji: (c: string) => void }> = ({ insight, onOpenKanji }) => {
  const k = insight.kanji;
  if (!k) return null;
  return (
    <div className="rounded-2xl bg-surface-inset border border-border-subtle p-4 flex gap-4 items-center">
      <button type="button" onClick={() => onOpenKanji(k.char)} className="text-5xl font-jp font-black text-text-primary px-3 py-1 rounded-xl bg-surface-card border border-border-subtle hover:border-gold/50 cursor-pointer" title="Buka detail kanji">
        {k.char}
      </button>
      <div className="space-y-1 text-xs min-w-0">
        <p className="text-sm font-bold text-text-primary">{k.meaning}</p>
        {k.onyomi.length > 0 && (
          <p className="text-text-secondary">
            <span className="font-mono text-text-muted">音 on</span> <span className="font-jp">{k.onyomi.join('、')}</span>
          </p>
        )}
        {k.kunyomi.length > 0 && (
          <p className="text-text-secondary">
            <span className="font-mono text-text-muted">訓 kun</span> <span className="font-jp">{k.kunyomi.join('、')}</span>
          </p>
        )}
        {k.words.length > 0 && (
          <p className="text-text-muted truncate">
            Contoh: <span className="font-jp">{k.words.map(w => `${w.word}（${w.reading}）`).join('・')}</span>
          </p>
        )}
      </div>
    </div>
  );
};

const OptionCard: React.FC<{ o: OptionInsight; picked: boolean; delay: number } & StepHandlers> = ({ o, picked, delay, onOpenWord, onOpenPattern, onOpenKanji }) => {
  const reduce = useReducedMotion();
  const tone = o.isCorrect ? 'border-state-success/60 bg-state-success/10' : picked ? 'border-state-danger/50 bg-state-danger/5' : 'border-border-subtle bg-surface-inset';
  const textNode = o.diff ? (
    <span className="font-jp" lang="ja">
      {o.diff.map((d, i) => (
        <span key={i} className={d.same ? '' : 'text-state-danger underline decoration-2 underline-offset-4'}>
          {d.text}
        </span>
      ))}
    </span>
  ) : o.highlight ? (
    <span className="font-jp" lang="ja">
      {o.text.slice(0, o.highlight[0])}
      <span className="text-gold font-black underline decoration-gold decoration-2 underline-offset-4">{o.text.slice(o.highlight[0], o.highlight[1])}</span>
      {o.text.slice(o.highlight[1])}
    </span>
  ) : (
    <span className="font-jp" lang="ja">
      {o.text}
    </span>
  );
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : delay }}
      className={`p-3.5 rounded-2xl border space-y-2 ${tone}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`w-6 h-6 rounded-lg border flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
            o.isCorrect ? 'bg-state-success/20 border-state-success/50 text-state-success' : 'bg-surface-card border-border-subtle text-text-secondary'
          }`}
        >
          {o.isCorrect ? <Check className="w-3.5 h-3.5" /> : o.index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm sm:text-base font-bold text-text-primary leading-snug">{textNode}</div>
          <div className="flex flex-wrap gap-1">
            {o.isCorrect && <Chip tone="success">Jawaban benar</Chip>}
            {picked && !o.isCorrect && <Chip tone="danger">Pilihanmu</Chip>}
            {picked && o.isCorrect && <Chip tone="gold">Pilihanmu</Chip>}
            {o.traps?.map(t => (
              <Chip key={t.kind} tone="danger">
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">{o.verdict}</p>

      {o.kanjiSwaps && o.kanjiSwaps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {o.kanjiSwaps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-card border border-border-subtle text-[11px]">
              <button type="button" onClick={() => onOpenKanji(s.to)} className="font-jp font-black text-state-danger text-base cursor-pointer" title="Buka detail kanji">
                {s.to}
              </button>
              <span className="text-text-muted">≠</span>
              <button type="button" onClick={() => onOpenKanji(s.from)} className="font-jp font-black text-state-success text-base cursor-pointer" title="Buka detail kanji">
                {s.from}
              </button>
              {s.sharedReading && <span className="text-text-muted font-jp">sama-sama {s.sharedReading}</span>}
            </div>
          ))}
        </div>
      )}

      {o.form && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
          <span className="font-jp font-bold text-text-primary">{o.form.lemma}</span>
          <span className="text-text-muted">→</span>
          <Chip tone="gold">{o.form.label}</Chip>
        </div>
      )}

      {o.pattern && (
        <button
          type="button"
          onClick={() => onOpenPattern(o.pattern!.id)}
          className="w-full text-left px-3 py-2 rounded-xl bg-surface-card border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer"
          title="Buka detail pola"
        >
          <div className="flex items-center gap-1.5 text-[11px]">
            <BookOpen className="w-3.5 h-3.5 text-gold" />
            <span className="font-jp font-bold text-text-primary">{o.pattern.title.split(/[（(]/)[0]}</span>
            <span className="font-mono text-text-muted">{o.pattern.level}</span>
          </div>
          {o.pattern.formula && <div className="text-[11px] font-jp text-text-muted mt-0.5">{o.pattern.formula}</div>}
        </button>
      )}

      {o.particles && o.particles.length > 1 && (
        <div className="grid gap-1">
          {o.particles.map((p, i) => (
            <div key={i} className="text-[11.5px] text-text-secondary">
              <span className="font-jp font-bold text-text-primary">{p.ja}</span> — {p.fn}
            </div>
          ))}
        </div>
      )}

      {o.pieces && o.pieces.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            {o.pieces.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-text-muted text-xs">+</span>}
                <span
                  className={`px-1.5 py-0.5 rounded-md border font-jp text-sm ${
                    p.kind === 'pattern' ? 'bg-gold/10 border-gold/30 text-text-primary' : p.kind === 'particle' ? 'bg-surface-card border-border-subtle text-text-secondary' : 'bg-surface-card border-border-subtle text-text-primary font-bold'
                  }`}
                >
                  {p.surface}
                </span>
              </React.Fragment>
            ))}
          </div>
          <ul className="space-y-0.5">
            {o.pieces
              .filter(p => p.gloss)
              .map((p, i) => (
                <li key={i} className="text-[11px] text-text-muted leading-snug">
                  <span className="font-jp text-text-secondary">{p.surface}</span>: {p.gloss}
                </li>
              ))}
          </ul>
          <p className="text-[10px] text-text-muted">Diurai otomatis dari database. Bisa kurang tepat untuk ungkapan yang jarang.</p>
        </div>
      )}

      {(o.word || (o.altWords && o.altWords.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {o.word && o.word.insight && <WordButton word={o.word} onOpen={onOpenWord} />}
          {o.altWords?.map(w => (
            <WordButton key={w.kotobaId ?? w.word} word={w} onOpen={onOpenWord} note="Kata lain dengan bacaan/tulisan serupa" />
          ))}
        </div>
      )}

      {o.owner?.patternId && (
        <button type="button" onClick={() => onOpenPattern(o.owner!.patternId!)} className="text-[11px] font-bold text-gold hover:underline cursor-pointer">
          Lihat pola 「{o.owner.text.split(/[（(]/)[0]}」
        </button>
      )}
      {o.owner && !o.owner.patternId && o.owner.text.length === 1 && (
        <button type="button" onClick={() => onOpenKanji(o.owner!.text)} className="text-[11px] font-bold text-gold hover:underline cursor-pointer">
          Lihat kanji 「{o.owner.text}」
        </button>
      )}
    </motion.div>
  );
};

const OptionsStep: React.FC<{ insight: QuestionInsight; userAnswer?: number } & StepHandlers> = ({ insight, userAnswer, ...handlers }) => {
  // Jawaban benar ditampilkan lebih dulu, lalu pengecoh sesuai nomor.
  const ordered = [...insight.options].sort((a, b) => Number(b.isCorrect) - Number(a.isCorrect) || a.index - b.index);
  return (
    <div className="space-y-3">
      {(insight.kind === 'reading' || insight.kind === 'writing' || insight.kind === 'wordMeaning') && <PartsCard insight={insight} onOpenKanji={handlers.onOpenKanji} />}
      {(insight.kind === 'onkun' || insight.kind === 'kanjiMeaning') && <KanjiCard insight={insight} onOpenKanji={handlers.onOpenKanji} />}
      {insight.kind === 'usage' && insight.targetInfo && (
        <div className="space-y-1.5">
          <SectionTitle>Kata yang diuji</SectionTitle>
          <WordButton word={insight.targetInfo} onOpen={handlers.onOpenWord} />
        </div>
      )}
      {insight.kind === 'reading' && insight.parts && (
        <p className="text-[11px] text-text-muted">Huruf yang berbeda dari bacaan benar ditandai merah.</p>
      )}
      <div className="space-y-2">
        {ordered.map((o, i) => (
          <OptionCard key={o.index} o={o} picked={userAnswer === o.index} delay={0.1 + i * 0.12} {...handlers} />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. Kunci & Alasan
// ---------------------------------------------------------------------------

const AnswerStep: React.FC<{ insight: QuestionInsight } & StepHandlers> = ({ insight, onOpenWord, onOpenKanji, onOpenPattern }) => {
  const reduce = useReducedMotion();
  const a = insight.answer;
  const q = insight.question;
  return (
    <div className="space-y-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 rounded-2xl bg-state-success/10 border border-state-success/40 text-center space-y-1"
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Kunci jawaban · nomor {q.correctIndex + 1}</p>
        <p className="text-2xl font-jp font-black text-text-primary" lang="ja">
          {a.text}
        </p>
      </motion.div>

      {a.curated && a.lines.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
          <SectionTitle>Pembahasan</SectionTitle>
          {a.lines.map((l, i) => (
            <p key={i} className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">
              {l.label && <span className="font-bold text-text-primary">{l.label}: </span>}
              {l.text}
            </p>
          ))}
        </div>
      )}

      {a.summary.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
          <SectionTitle>
            <span className="inline-flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-gold" /> {a.curated ? 'Ringkasan dari database' : 'Ringkasan (disusun dari database)'}
            </span>
          </SectionTitle>
          <ul className="space-y-1.5">
            {a.summary.map((s, i) => (
              <li key={i} className="text-xs sm:text-[13px] text-text-secondary leading-relaxed flex gap-2">
                <span className="text-gold">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(a.words.length > 0 || a.patterns.length > 0 || a.kanji.length > 0) && (
        <div className="space-y-2">
          <SectionTitle>Pelajari lebih dalam</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {a.words.map(w => (
              <button
                key={w.kotobaId ?? w.word}
                type="button"
                onClick={() => onOpenWord(w)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 text-xs cursor-pointer"
              >
                <span className="text-text-muted">Pemahaman Kotoba </span>
                <span className="font-jp font-bold text-text-primary">{w.word}</span>
              </button>
            ))}
            {a.patterns.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPattern(p.id)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 text-xs cursor-pointer"
              >
                <span className="text-text-muted">Pola </span>
                <span className="font-jp font-bold text-text-primary">{p.title.split(/[（(]/)[0]}</span>
              </button>
            ))}
            {a.kanji.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onOpenKanji(c)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 text-xs cursor-pointer"
              >
                <span className="text-text-muted">Kanji </span>
                <span className="font-jp font-bold text-text-primary">{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6. Soal Serupa
// ---------------------------------------------------------------------------

const SimilarStep: React.FC<{
  insight: QuestionInsight;
  soundEnabled: boolean;
  onDone: (correct: number, total: number) => void;
  onOpenQuestion: (q: UnifiedQuestionItem, picked?: number) => void;
  onRestart: () => void;
}> = ({ insight, soundEnabled, onDone, onOpenQuestion, onRestart }) => {
  const reduce = useReducedMotion();
  const items = insight.similar;
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const finished = qi >= items.length;
  const correct = Object.entries(answers).filter(([i, a]) => items[Number(i)]?.item.correctIndex === a).length;
  const reportedRef = useRef(false);

  useEffect(() => {
    if (finished && !reportedRef.current) {
      reportedRef.current = true;
      onDone(correct, items.length);
      playSound(correct === items.length ? 'victory' : 'coin', soundEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished) {
    return (
      <div className="space-y-4 text-center">
        <motion.div
          initial={reduce ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto w-28 h-28 rounded-full bg-surface-inset border-2 border-gold/50 flex flex-col items-center justify-center"
        >
          <span className="text-3xl font-black font-mono text-gold">
            {correct}/{items.length}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">benar</span>
        </motion.div>
        <p className="text-sm text-text-secondary">
          {correct === items.length ? 'Hebat! Kamu sudah menguasai hal yang diuji soal ini.' : 'Bedah soal yang belum tepat untuk memperkuat pemahamanmu.'}
        </p>
        <div className="grid gap-1.5 text-left">
          {items.map((s, i) => (
            <button
              key={s.item.id}
              type="button"
              onClick={() => onOpenQuestion(s.item, answers[i])}
              className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer flex items-center gap-2"
            >
              {answers[i] === s.item.correctIndex ? <Check className="w-4 h-4 text-state-success shrink-0" /> : <X className="w-4 h-4 text-state-danger shrink-0" />}
              <span className="font-jp text-xs text-text-primary truncate flex-1">{clean(s.item.prompt)}</span>
              <span className="text-[10.5px] font-bold text-gold shrink-0 inline-flex items-center gap-1">
                <ScanSearch className="w-3.5 h-3.5" /> Bedah
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onRestart} className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
          <RotateCcw className="w-3.5 h-3.5" /> Ulangi dari awal
        </button>
      </div>
    );
  }

  const s = items[qi];
  const q = s.item;
  const answered = picked !== null;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    setAnswers(a => ({ ...a, [qi]: i }));
    playSound(i === q.correctIndex ? 'correct' : 'wrong', soundEnabled);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>
          Soal {qi + 1}/{items.length}
        </span>
        <span className="flex gap-1">
          {items.map((_, i) => (
            <span key={i} className={`h-1.5 w-5 rounded-full ${i < qi ? 'bg-gold' : i === qi ? 'bg-gold/50' : 'bg-border-subtle'}`} />
          ))}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={reduce ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -16 }}
          className="space-y-3"
        >
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="gold">{s.reason}</Chip>
            <Chip>
              {q.level} · {q.sourceTitle}
            </Chip>
          </div>
          {q.instruction && <p className="text-[11.5px] text-text-muted font-jp">{q.instruction}</p>}
          <div className="text-sm sm:text-base font-jp text-text-primary leading-relaxed">
            <RubyText text={clean(q.prompt)} ruby={q.ruby} targetWord={q.targetWord} />
          </div>
          <div className="grid gap-2">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const state = !answered ? 'idle' : isCorrect ? 'correct' : i === picked ? 'wrong' : 'dim';
              return (
                <button
                  key={`${opt}-${i}`}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-semibold font-jp transition-colors flex items-center justify-between gap-2 ${
                    state === 'correct'
                      ? 'border-state-success bg-state-success/15 text-text-primary'
                      : state === 'wrong'
                        ? 'border-state-danger bg-state-danger/10 text-text-primary'
                        : state === 'dim'
                          ? 'border-border-subtle bg-surface-inset text-text-muted'
                          : 'border-border-subtle bg-surface-inset text-text-primary hover:border-gold/50 cursor-pointer'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-surface-card border border-border-subtle font-mono text-[10.5px] flex items-center justify-center shrink-0">{i + 1}</span>
                    {clean(opt)}
                  </span>
                  {state === 'correct' && <Check className="w-4 h-4 text-state-success shrink-0" />}
                  {state === 'wrong' && <X className="w-4 h-4 text-state-danger shrink-0" />}
                </button>
              );
            })}
          </div>
          {answered && (
            <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <p className="text-xs text-text-secondary leading-relaxed p-3 rounded-xl bg-surface-inset border border-border-subtle whitespace-pre-line">
                {picked === q.correctIndex ? 'Tepat! ' : `Belum tepat. Jawabannya nomor ${q.correctIndex + 1}. `}
                {q.explanationCurated ? clean(q.explanation ?? '').replace(/<\/?b>|<br\s*\/?>/g, ' ') : ''}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpenQuestion(q, picked ?? undefined)}
                  className="btn-physical-secondary flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <ScanSearch className="w-3.5 h-3.5" /> Bedah soal ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                    setQi(i => i + 1);
                    playSound('click', soundEnabled);
                  }}
                  className="btn-physical-primary flex-1 py-2.5 rounded-xl text-xs font-bold font-heading cursor-pointer"
                >
                  {qi + 1 < items.length ? 'Soal berikutnya' : 'Lihat hasil'}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
