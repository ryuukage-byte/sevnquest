// "Pemahaman Kotoba" — pengalaman belajar 1–3 menit yang membongkar bagaimana sebuah kotoba
// terbentuk dan terhubung dengan kotoba lain. Setiap animasi punya tujuan: pemisahan kanji
// menjelaskan komponen, penggabungan menjelaskan pembentukan makna, kanji jangkar yang diam
// sementara pasangannya berganti menjelaskan keluarga kosakata.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  MessageCircle,
  Network,
  RotateCcw,
  Volume2,
  X,
} from 'lucide-react';
import { BookIcon } from '../ui/EngravingIcons';
import type { KanjiItem, KotobaItem } from '../../types/content';
import type { UserDeck } from '../../types/rpg';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { TRANSPARENCY_LABEL } from '../../data/kotobaInsights';
import {
  INSIGHT_STEP_LABEL,
  WORD_STRUCTURE_LABEL,
  buildKotobaInsight,
  type FamilyWord,
  type InsightKanji,
  type InsightQuestion,
  type InsightStepKind,
  type KanjiFamily,
  type KotobaInsight,
} from '../../engine/kotobaInsight/kotobaInsight';
import { playSound, speakJapanese } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import { KanjiDetailModal } from './KanjiDetailModal';
import { recordKanjiWriting } from '../../utils/kanjiWritingRecord';

const SOURCES = { kotoba: KOTOBA_DATABASE, kanji: KANJI_DATABASE };

const toKatakana = (s: string) => s.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));

/** Bacaan on ditulis katakana (アン), kun hiragana (やす) — konvensi kamus kanji. */
const kanjiReadingLabel = (k: InsightKanji) => (k.readingType === 'on' ? toKatakana(k.reading) : k.reading);

const READING_TYPE_BADGE: Record<string, { label: string; title: string }> = {
  on: { label: '音 on', title: "On'yomi — bacaan asal Tiongkok" },
  kun: { label: '訓 kun', title: "Kun'yomi — bacaan asli Jepang" },
  irregular: { label: 'khusus', title: 'Bacaan khusus di kata ini' },
};

interface KotobaInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KotobaItem | null;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'view' | 'writing' | 'flashcard' | 'quiz',
    success?: boolean,
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionType?: 'writing' | 'flashcard' | 'quiz',
  ) => void;
}

export const KotobaInsightModal: React.FC<KotobaInsightModalProps> = ({
  isOpen,
  onClose,
  item,
  soundEnabled = true,
  userDecks,
  onToggleDeckItem,
  onUpdateDecks,
  onRewardPlayer,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  // Jaringan kosakata: mengetuk kata keluarga membuka pemahaman kata itu (bisa kembali).
  const [current, setCurrent] = useState<KotobaItem | null>(item);
  const [history, setHistory] = useState<{ item: KotobaItem; step: number }[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [kanjiChar, setKanjiChar] = useState<string | null>(null);
  const rewardedRef = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (item) {
      setCurrent(item);
      setHistory([]);
      setStepIdx(0);
      setVisited(new Set([0]));
    }
  }, [item]);

  const insight = useMemo(() => (current ? buildKotobaInsight(current, SOURCES) : null), [current]);

  useEffect(() => {
    if (isOpen && current?.id && KOTOBA_DATABASE[current.id]) onRecordInteraction?.(current.id, 'kotoba', 'view', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, current?.id]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[data-active]');
    if (rail && active) rail.scrollTo({ left: active.offsetLeft - rail.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
  }, [stepIdx, current?.id]);

  const goBack = () => {
    if (kanjiChar) {
      setKanjiChar(null);
      return true;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setCurrent(prev.item);
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
  }, 'kotoba_insight_modal');

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

  const openWord = (wordId: string) => {
    const target = KOTOBA_DATABASE[wordId];
    if (!target || target.id === insight.item.id) return;
    playSound('click', soundEnabled);
    setHistory(h => [...h, { item: insight.item, step: stepIdx }]);
    setCurrent(target);
    setStepIdx(0);
    setVisited(new Set([0]));
  };

  const openKanji = (char: string) => {
    playSound('click', soundEnabled);
    setKanjiChar(char);
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
      relatedWords: [{ word: insight.word, reading: insight.reading, meaningId: insight.meaning }],
      questions: [],
    };

  const handleQuizDone = (correct: number, total: number) => {
    const id = insight.item.id;
    if (!KOTOBA_DATABASE[id] || rewardedRef.current.has(id)) return;
    rewardedRef.current.add(id);
    const exp = 5 * correct;
    const gold = correct;
    if (onCompleteStudyItem) {
      onCompleteStudyItem('kotoba', exp, gold, id, correct, total, 'quiz');
    } else {
      onRecordInteraction?.(id, 'kotoba', 'quiz', correct * 2 >= total);
      if (exp > 0) onRewardPlayer?.(exp, gold);
    }
  };

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
        aria-label={`Pemahaman Kotoba ${insight.word}`}
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
                title={`Kembali ke ${history[history.length - 1].item.word}`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-jp">{history[history.length - 1].item.word}</span>
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 font-heading">
                <BookIcon className="w-4 h-4 text-gold shrink-0" />
                Pemahaman Kotoba
              </h3>
              <p className="text-[11px] text-text-muted font-mono truncate">
                <span className="font-jp text-text-secondary font-bold">{insight.word}</span> · {INSIGHT_STEP_LABEL[step].no}{' '}
                {INSIGHT_STEP_LABEL[step].title}
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

        {/* Rel tahapan: progressive disclosure, tetap bisa diketuk */}
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
                  <span className="font-mono">{done ? <Check className="w-3 h-3" /> : INSIGHT_STEP_LABEL[s].no}</span>
                  <span className={active ? 'inline' : 'hidden sm:inline'}>{INSIGHT_STEP_LABEL[s].title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Panggung */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${insight.item.id}-${step}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {step === 'recognize' && <RecognizeStep insight={insight} />}
              {step === 'breakdown' && <BreakdownStep insight={insight} onOpenKanji={openKanji} soundEnabled={soundEnabled} />}
              {step === 'formation' && <FormationStep insight={insight} />}
              {step === 'family' && (
                <FamilyStep insight={insight} onOpenWord={openWord} onOpenKanji={openKanji} soundEnabled={soundEnabled} />
              )}
              {step === 'usage' && <UsageStep insight={insight} soundEnabled={soundEnabled} />}
              {step === 'quiz' && (
                <QuizStep
                  insight={insight}
                  soundEnabled={soundEnabled}
                  onDone={handleQuizDone}
                  onOpenWord={openWord}
                  onRestart={() => goToStep(0)}
                />
              )}
              {step !== 'quiz' && insight.narration[step] && <Narration text={insight.narration[step]} />}
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
                {INSIGHT_STEP_LABEL[steps[stepIdx + 1]].title.split(' dalam ')[0]}
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
          onToggleDeckItem={onToggleDeckItem}
          onUpdateDecks={onUpdateDecks}
          onCompleteSheet={(_sheet, score, reward) =>
            recordKanjiWriting(getKanjiItem(kanjiChar), score, reward, { onCompleteStudyItem, onRewardPlayer })
          }
        />
      )}
    </motion.div>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// Bagian bersama
// ---------------------------------------------------------------------------

const Narration: React.FC<{ text: string }> = ({ text }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.9, duration: 0.35 }}
      className="flex gap-2.5 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle"
      aria-live="polite"
    >
      <MessageCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
      <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">{text}</p>
    </motion.div>
  );
};

const SpeakButton: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label, className = '' }) => (
  <button
    type="button"
    onClick={() => speakJapanese(text)}
    className={`btn-physical-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${className}`}
    title="Dengarkan pelafalan"
  >
    <Volume2 className="w-3.5 h-3.5" />
    {label}
  </button>
);

/** Jadwal fase animasi; berhenti di fase terakhir. Reduced motion → langsung fase akhir. */
function usePhases(delays: number[], resetKey: string) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(reduce ? delays.length : 0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduce) {
      setPhase(delays.length);
      return;
    }
    setPhase(0);
    const timers = delays.map((d, i) => window.setTimeout(() => setPhase(i + 1), d));
    return () => timers.forEach(t => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, run, reduce]);
  return { phase, replay: () => setRun(r => r + 1), reduce: !!reduce };
}

// ---------------------------------------------------------------------------
// 01 Kenali Kotoba
// ---------------------------------------------------------------------------

const RecognizeStep: React.FC<{ insight: KotobaInsight }> = ({ insight }) => {
  const reduce = useReducedMotion();
  const structure = WORD_STRUCTURE_LABEL[insight.structure];
  const kanji = insight.kanji.filter(k => k.char !== '々');
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: 'Jumlah kanji', value: <span className="font-mono">{kanji.length}</span> },
    {
      label: 'Kanji penyusun',
      value: <span className="font-jp">{kanji.length ? kanji.map(k => k.char).join(' + ') : '—'}</span>,
    },
    {
      label: 'Jenis',
      value: (
        <span>
          <span className="font-jp">
            {structure.ja}（{structure.reading}）
          </span>{' '}
          — {structure.id}
        </span>
      ),
    },
  ];
  if (insight.readingStyle) {
    facts.push({
      label: 'Cara baca',
      value: (
        <span>
          <span className="font-jp">
            {insight.readingStyle.ja}（{insight.readingStyle.reading}）
          </span>{' '}
          — {insight.readingStyle.id}
        </span>
      ),
    });
  }

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <motion.h1
        lang="ja"
        initial={reduce ? false : { opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-6xl sm:text-7xl font-black font-jp tracking-wider text-text-primary pt-2"
      >
        {insight.word}
      </motion.h1>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.35 }}
        className="flex items-center gap-2 flex-wrap justify-center"
      >
        <span className="text-lg font-jp font-bold text-text-secondary">{insight.reading}</span>
        <span className="text-text-muted">—</span>
        <span className="text-sm font-mono font-bold tracking-widest text-gold">{insight.romaji}</span>
        <SpeakButton text={insight.reading || insight.word} />
      </motion.div>
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.55 }}
        className="text-xl font-black font-heading text-text-primary leading-snug"
      >
        {insight.meaning}
      </motion.p>

      <dl className="w-full grid gap-1.5 text-left">
        {facts.map((f, i) => (
          <motion.div
            key={f.label}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduce ? 0 : 0.75 + i * 0.12 }}
            className="flex items-baseline gap-3 px-3.5 py-2 rounded-xl bg-surface-inset border border-border-subtle"
          >
            <dt className="text-[11px] font-bold uppercase tracking-wider text-text-muted w-28 shrink-0">{f.label}</dt>
            <dd className="text-sm text-text-primary font-semibold">{f.value}</dd>
          </motion.div>
        ))}
      </dl>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 02 Bedah Kanji
// ---------------------------------------------------------------------------

const BreakdownStep: React.FC<{ insight: KotobaInsight; onOpenKanji: (c: string) => void; soundEnabled: boolean }> = ({
  insight,
  onOpenKanji,
}) => {
  // 0 utuh → 1 berpisah → 2 penjelasan per kanji → 3 bergabung kembali
  const { phase, replay, reduce } = usePhases([700, 1300, 3400], insight.item.id);
  const parts = insight.parts;
  const split = phase >= 1 && phase < 3;
  const spread = parts.length >= 3 ? 30 : 46;
  const kanjiParts = parts.filter(p => p.isKanji);
  const kana = parts.filter(p => !p.isKanji);
  const kanjiByChar = new Map(insight.kanji.map(k => [k.char, k]));
  const jukujikun = insight.structure === 'jukujikun';

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl bg-surface-inset border border-border-subtle py-7 flex flex-col items-center justify-center overflow-hidden">
        <div className="flex items-end justify-center" lang="ja">
          {parts.map((p, i) => {
            const offset = (i - (parts.length - 1) / 2) * spread;
            return (
              <motion.span
                key={i}
                animate={{
                  x: split && !reduce ? offset : 0,
                  scale: phase === 3 && !reduce ? [1, 1.08, 1] : 1,
                }}
                transition={{ type: 'spring', stiffness: 160, damping: 16 }}
                className={`inline-flex flex-col items-center text-5xl sm:text-6xl font-black font-jp ${
                  p.isKanji ? (phase === 3 ? 'text-gold' : 'text-text-primary') : 'text-text-muted'
                }`}
              >
                <motion.span
                  animate={{ opacity: phase >= 2 && phase < 3 ? 1 : 0, y: phase >= 2 && phase < 3 ? 0 : 6 }}
                  className="text-[11px] font-mono font-bold text-gold h-4 mb-1"
                >
                  {p.reading}
                </motion.span>
                {p.text}
              </motion.span>
            );
          })}
        </div>
        <motion.p
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
          className="mt-2 text-[11px] font-mono text-text-muted"
        >
          {insight.reading}
        </motion.p>
        <button
          type="button"
          onClick={replay}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-text-muted hover:text-gold transition-colors cursor-pointer"
          title="Ulangi animasi"
          aria-label="Ulangi animasi"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`grid gap-2 ${insight.kanji.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : insight.kanji.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            {insight.kanji.map((k, i) => {
              const badge = READING_TYPE_BADGE[k.readingType ?? 'irregular'];
              return (
                <motion.button
                  key={`${k.char}-${i}`}
                  type="button"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : i * 0.15 }}
                  onClick={() => k.char !== '々' && onOpenKanji(k.char)}
                  className="text-left p-3 rounded-2xl bg-surface-card border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer space-y-1.5"
                  title={`Buka kanji ${k.char} di Library Kanji`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl font-black font-jp text-text-primary">{k.char}</span>
                    {!jukujikun && k.reading && (
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-[10px] font-mono text-text-muted" title={badge.title}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted uppercase tracking-wider font-bold">Cara baca</div>
                  <div className="text-sm font-jp font-bold text-gold">
                    {k.reading ? kanjiReadingLabel(k) : jukujikun ? '— (dibaca utuh)' : '—'}
                    {k.baseReading && (
                      <span className="ml-1.5 text-[10px] font-normal text-text-muted font-sans">
                        dari {k.readingType === 'on' ? toKatakana(k.baseReading) : k.baseReading}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted uppercase tracking-wider font-bold">Makna dasar</div>
                  <div className="text-sm font-semibold text-text-primary leading-snug">{k.meaning || '—'}</div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {phase >= 2 && (kana.length > 0 || kanjiParts.some(p => p.baseReading) || jukujikun || kanjiParts.some(p => p.readingType === 'irregular')) && (
        <ul className="space-y-1.5 text-[11.5px] text-text-secondary leading-relaxed">
          {kana.length > 0 && (
            <li className="flex gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
              <span>
                <span className="font-jp font-bold">{kana.map(p => p.text).join(' · ')}</span> ditulis dengan kana
                {insight.structure === 'okurigana' ? ' (okurigana): bagian yang berubah saat dikonjugasi.' : '.'}
              </span>
            </li>
          )}
          {kanjiParts
            .filter(p => p.baseReading)
            .map((p, i) => (
              <li key={`b${i}`} className="flex gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                <span>
                  Bunyi <span className="font-jp font-bold">{p.text}</span> berubah:{' '}
                  <span className="font-jp">{p.baseReading}</span> → <span className="font-jp font-bold">{p.reading}</span>{' '}
                  {p.reading.endsWith('っ') ? '(bunyi tertahan っ sebelum konsonan berikutnya).' : '(bunyi menjadi bersuara di tengah kata).'}
                </span>
              </li>
            ))}
          {jukujikun && (
            <li className="flex gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
              <span>
                Bacaan <span className="font-jp font-bold">{insight.reading}</span> milik kata ini secara utuh (熟字訓), bukan gabungan bacaan per kanji.
                Kanjinya tetap memberi petunjuk makna.
              </span>
            </li>
          )}
          {!jukujikun &&
            kanjiParts
              .filter(p => p.readingType === 'irregular')
              .map((p, i) => (
                <li key={`i${i}`} className="flex gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                  <span>
                    <span className="font-jp font-bold">{p.text}</span> dibaca <span className="font-jp font-bold">{p.reading}</span> — bacaan khusus di kata ini.
                  </span>
                </li>
              ))}
        </ul>
      )}
      {kanjiByChar.size > 0 && phase >= 2 && (
        <p className="text-[10.5px] text-text-muted text-center">Ketuk kartu kanji untuk membukanya di Library Kanji.</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 03 Pembentukan Makna
// ---------------------------------------------------------------------------

const FormationStep: React.FC<{ insight: KotobaInsight }> = ({ insight }) => {
  const reduce = useReducedMotion();
  const f = insight.formation!;
  const kanji = insight.kanji.filter(k => k.char !== '々');
  const okuri = insight.structure === 'okurigana' ? insight.parts.filter(p => !p.isKanji).map(p => p.text).join('') : '';
  const rows: { left: string; right: string; jp?: boolean }[] = kanji.map(k => ({ left: k.char, right: k.meaning }));
  if (okuri) rows.push({ left: okuri, right: 'okurigana (akhiran)' });
  const t = f.transparency !== 'umum' ? TRANSPARENCY_LABEL[f.transparency] : undefined;
  const base = rows.length * 0.35;
  const d = (s: number) => (reduce ? 0 : s);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-inset border border-border-subtle p-4 sm:p-5 flex flex-col items-center gap-2">
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <motion.span initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(i * 0.35 - 0.1) }} className="text-lg font-black text-text-muted">
                +
              </motion.span>
            )}
            <motion.div
              initial={reduce ? false : { opacity: 0, x: i % 2 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: d(i * 0.35), type: 'spring', stiffness: 180, damping: 18 }}
              className="flex items-center gap-3 min-w-[12rem] justify-center"
            >
              <span className="text-3xl font-black font-jp text-text-primary">{r.left}</span>
              <span className="text-text-muted font-bold">=</span>
              <span className="text-base font-bold text-text-secondary">{r.right}</span>
            </motion.div>
          </React.Fragment>
        ))}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: d(base + 0.1) }}
          className="py-1"
        >
          <ArrowDown className="w-5 h-5 text-gold" />
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: d(base + 0.4), type: 'spring', stiffness: 160, damping: 15 }}
          className="w-full rounded-2xl bg-surface-card border border-gold/40 p-3.5 text-center space-y-1"
        >
          <div className="text-4xl font-black font-jp text-gold" lang="ja">
            {insight.word}
          </div>
          {f.literal && <p className="text-base font-black text-text-primary font-heading">= {f.literal}</p>}
          <p className={`${f.literal ? 'text-xs text-text-secondary' : 'text-base font-black text-text-primary font-heading'}`}>
            {f.literal ? 'Arti: ' : '= '}
            {insight.meaning}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: d(base + 0.7) }}
        className="space-y-2"
      >
        {t && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-border-subtle bg-surface-inset">
            <span className="px-2 py-0.5 rounded-md bg-gold/15 text-gold text-[10px] font-bold uppercase tracking-wider shrink-0">{t.label}</span>
            <span className="text-[11.5px] text-text-secondary leading-relaxed">{t.hint}</span>
          </div>
        )}
        {!f.note && insight.structure !== 'okurigana' && (
          <p className="text-[11.5px] text-text-muted leading-relaxed px-1">
            <span className="font-bold text-text-secondary">Catatan:</span> arti gabungan tidak selalu bisa ditebak hanya dengan menjumlahkan arti
            kanjinya. Jadikan arti kanji sebagai jembatan ingatan, dan pegang definisi kata sebagai acuan.
            {insight.definition && (
              <>
                {' '}
                <span className="text-text-secondary">Definisi: {insight.definition}</span>
              </>
            )}
          </p>
        )}
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 04 Keluarga Kosakata
// ---------------------------------------------------------------------------

const FamilyStep: React.FC<{
  insight: KotobaInsight;
  onOpenWord: (id: string) => void;
  onOpenKanji: (c: string) => void;
  soundEnabled: boolean;
}> = ({ insight, onOpenWord, onOpenKanji, soundEnabled }) => {
  const [tab, setTab] = useState<number | 'graph'>(0);
  const fam = typeof tab === 'number' ? insight.families[tab] : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {insight.families.map((f, i) => (
          <button
            key={f.kanji}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => {
              setTab(i);
              playSound('click', soundEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              tab === i ? 'bg-gold/15 text-gold border-gold/40' : 'bg-surface-inset text-text-secondary border-border-subtle hover:text-text-primary'
            }`}
          >
            Keluarga <span className="font-jp text-sm">{f.kanji}</span>
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'graph'}
          onClick={() => {
            setTab('graph');
            playSound('click', soundEnabled);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
            tab === 'graph' ? 'bg-gold/15 text-gold border-gold/40' : 'bg-surface-inset text-text-secondary border-border-subtle hover:text-text-primary'
          }`}
        >
          <Network className="w-3.5 h-3.5" /> Jaringan
        </button>
      </div>

      {fam ? (
        <FamilyCarousel key={fam.kanji} family={fam} origin={insight} onOpenWord={onOpenWord} onOpenKanji={onOpenKanji} />
      ) : (
        <VocabularyGraph insight={insight} onOpenWord={onOpenWord} />
      )}
    </div>
  );
};

const CAROUSEL_MS = 1800;

const FamilyCarousel: React.FC<{
  family: KanjiFamily;
  origin: KotobaInsight;
  onOpenWord: (id: string) => void;
  onOpenKanji: (c: string) => void;
}> = ({ family, origin, onOpenWord, onOpenKanji }) => {
  const reduce = useReducedMotion();
  // Kata asal ikut diputar supaya terlihat posisinya di antara saudara-saudaranya.
  const originChars = Array.from(origin.word);
  const ring: (FamilyWord & { isOrigin?: boolean })[] = useMemo(
    () => [
      ...family.words,
      {
        id: origin.item.id,
        word: origin.word,
        reading: origin.reading,
        meaningId: origin.meaning.split(/[;；]/)[0],
        jlpt: origin.item.jlpt,
        anchorIndex: originChars.indexOf(family.kanji),
        sameReading: true,
        isOrigin: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [family, origin.item.id],
  );
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      if (!document.hidden) setIdx(i => (i + 1) % ring.length);
    }, CAROUSEL_MS);
    return () => window.clearInterval(t);
  }, [paused, ring.length]);

  const w = ring[idx];
  const chars = Array.from(w.word);
  const left = chars.slice(0, Math.max(0, w.anchorIndex)).join('');
  const right = chars.slice(w.anchorIndex + 1).join('');

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl bg-surface-inset border border-border-subtle py-6 px-3"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-5xl sm:text-6xl font-black font-jp" lang="ja">
          <div className="flex justify-end overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`l-${w.id}`}
                initial={reduce ? false : { opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 24 }}
                transition={{ duration: 0.35 }}
                className={w.isOrigin ? 'text-gold' : 'text-text-secondary'}
              >
                {left}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => onOpenKanji(family.kanji)}
            className="px-1 rounded-xl text-text-primary underline decoration-gold/70 decoration-4 underline-offset-[10px] cursor-pointer"
            title={`Buka kanji ${family.kanji}`}
          >
            {family.kanji}
          </button>
          <div className="flex justify-start overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`r-${w.id}`}
                initial={reduce ? false : { opacity: 0, y: -24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 24 }}
                transition={{ duration: 0.35 }}
                className={w.isOrigin ? 'text-gold' : 'text-text-secondary'}
              >
                {right}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={w.id}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center space-y-0.5"
          >
            <p className="text-xs font-jp text-text-muted">
              {w.reading} {w.isOrigin && <span className="font-sans text-gold font-bold">· kata yang sedang dipelajari</span>}
            </p>
            <p className="text-sm font-bold text-text-primary">{w.meaningId}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex justify-center gap-1.5">
          {ring.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setIdx(i);
                setPaused(true);
              }}
              aria-label={r.word}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === idx ? 'w-5 bg-gold' : 'w-1.5 bg-text-muted/40'}`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 px-3 py-1.5 bg-surface-inset text-[10px] font-bold uppercase tracking-wider text-text-muted">
          <span>Kotoba</span>
          <span>Arti</span>
          <span>Level</span>
        </div>
        {family.words.map(fw => (
          <button
            key={fw.id}
            type="button"
            onClick={() => onOpenWord(fw.id)}
            className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3 py-2 border-t border-border-subtle text-left hover:bg-surface-elevated transition-colors cursor-pointer group"
            title={`Pelajari ${fw.word}`}
          >
            <span className="font-jp">
              <span className="text-base font-bold text-text-primary group-hover:text-gold transition-colors">{fw.word}</span>
              <span className="ml-1.5 text-[11px] text-text-muted">{fw.reading}</span>
            </span>
            <span className="text-xs text-text-secondary truncate">
              {fw.meaningId}
              {fw.sameReading && family.reading && (
                <span className="ml-1.5 px-1 py-px rounded bg-surface-inset border border-border-subtle text-[9.5px] font-mono text-text-muted" title="Kanji ini dibaca sama">
                  {family.kanji}={family.reading}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-text-muted">
              {fw.jlpt}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-text-muted leading-relaxed px-1">
        Arti gabungan tidak selalu bisa ditebak dari kanjinya. Ketuk sebuah kotoba untuk melihat cara maknanya terbentuk.
      </p>
    </div>
  );
};

/** Vocabulary Knowledge Graph: kata asal di tengah, kanji sebagai simpul, keluarga di tepi. */
const VocabularyGraph: React.FC<{ insight: KotobaInsight; onOpenWord: (id: string) => void }> = ({ insight, onOpenWord }) => {
  const reduce = useReducedMotion();
  const W = 400;
  const families = insight.families.slice(0, 4);
  const n = families.length;
  const H = n >= 3 ? 340 : 280;
  const cx = W / 2;
  const cy = H / 2;
  const hubR = n === 1 ? 0 : 88;
  const leafR = 76;

  const hubs = families.map((f, i) => {
    const angle = n === 1 ? Math.PI : n === 2 ? Math.PI * i : Math.PI + (2 * Math.PI * i) / n;
    const hx = n === 1 ? cx - 60 : cx + hubR * Math.cos(angle);
    const hy = n === 1 ? cy : cy + hubR * Math.sin(angle);
    const leaves = f.words.slice(0, 4);
    const fan = n === 1 ? Math.PI * 0.9 : Math.PI * 0.75;
    const leafNodes = leaves.map((w, j) => {
      const a = angle + (leaves.length === 1 ? 0 : -fan / 2 + (fan * j) / (leaves.length - 1));
      return {
        w,
        x: Math.min(W - 34, Math.max(34, hx + leafR * Math.cos(a))),
        y: Math.min(H - 20, Math.max(18, hy + leafR * Math.sin(a))),
      };
    });
    return { f, x: hx, y: hy, angle, leafNodes };
  });

  const delay = (s: number) => (reduce ? 0 : s);

  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-surface-inset border border-border-subtle p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Jaringan kosakata ${insight.word}`}>
          {hubs.map((h, i) => (
            <g key={`edges-${h.f.kanji}`}>
              <motion.line
                x1={cx}
                y1={cy}
                x2={h.x}
                y2={h.y}
                className="stroke-gold"
                strokeWidth={2}
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ delay: delay(0.2 + i * 0.1), duration: 0.4 }}
              />
              {h.leafNodes.map((l, j) => (
                <motion.line
                  key={l.w.id}
                  x1={h.x}
                  y1={h.y}
                  x2={l.x}
                  y2={l.y}
                  className="stroke-text-muted"
                  strokeWidth={1.25}
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={{ delay: delay(0.6 + i * 0.15 + j * 0.06), duration: 0.35 }}
                />
              ))}
            </g>
          ))}

          {/* Kata asal */}
          <motion.g initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <rect
              x={cx - Math.max(36, Array.from(insight.word).length * 13 + 14)}
              y={cy - 22}
              width={Math.max(72, Array.from(insight.word).length * 26 + 28)}
              height={44}
              rx={14}
              className="fill-surface-card stroke-gold"
              strokeWidth={2}
            />
            <text x={cx} y={cy + 8} textAnchor="middle" className="fill-gold font-jp" fontSize={22} fontWeight={900}>
              {insight.word}
            </text>
          </motion.g>

          {hubs.map((h, i) => (
            <g key={`nodes-${h.f.kanji}`}>
              <motion.g
                initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay(0.45 + i * 0.1) }}
                style={{ transformOrigin: `${h.x}px ${h.y}px` }}
              >
                <circle cx={h.x} cy={h.y} r={20} className="fill-surface-elevated stroke-gold" strokeWidth={1.5} />
                <text x={h.x} y={h.y + 7} textAnchor="middle" className="fill-text-primary font-jp" fontSize={19} fontWeight={800}>
                  {h.f.kanji}
                </text>
              </motion.g>
              {h.leafNodes.map((l, j) => {
                const len = Array.from(l.w.word).length;
                const width = Math.max(44, len * 15 + 16);
                return (
                  <motion.g
                    key={l.w.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${l.w.word} — ${l.w.meaningId}`}
                    onClick={() => onOpenWord(l.w.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') onOpenWord(l.w.id);
                    }}
                    className="cursor-pointer outline-none group"
                    initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: delay(0.8 + i * 0.15 + j * 0.06) }}
                    style={{ transformOrigin: `${l.x}px ${l.y}px` }}
                  >
                    <rect
                      x={l.x - width / 2}
                      y={l.y - 15}
                      width={width}
                      height={30}
                      rx={10}
                      className="fill-surface-card stroke-border-subtle group-hover:stroke-gold group-focus-visible:stroke-gold transition-colors"
                      strokeWidth={1.25}
                    />
                    <text x={l.x} y={l.y + 6} textAnchor="middle" className="fill-text-primary font-jp" fontSize={15} fontWeight={700}>
                      {l.w.word}
                    </text>
                  </motion.g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <p className="text-[11px] text-text-muted text-center">
        Ketuk kotoba di jaringan untuk mempelajarinya. Setiap kata baru memperluas jaringanmu.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 05 Penggunaan dalam Kalimat
// ---------------------------------------------------------------------------

const UsageStep: React.FC<{ insight: KotobaInsight; soundEnabled: boolean }> = ({ insight, soundEnabled }) => {
  const u = insight.usage!;
  const { phase, reduce } = usePhases([700, 1300], insight.item.id);
  const [before, mid, after] = u.highlight
    ? [u.japanese.slice(0, u.highlight[0]), u.japanese.slice(u.highlight[0], u.highlight[1]), u.japanese.slice(u.highlight[1])]
    : [u.japanese, '', ''];
  const note = insight.formation?.note?.usageNote;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-inset border border-border-subtle p-4 sm:p-5 space-y-2.5">
        <p className="text-xl sm:text-2xl font-jp font-bold text-text-primary leading-relaxed" lang="ja">
          {before}
          {mid && (
            <motion.span
              animate={
                phase >= 1
                  ? { backgroundColor: 'rgba(240,190,82,0.22)', color: 'var(--color-gold)' }
                  : { backgroundColor: 'rgba(240,190,82,0)' }
              }
              transition={{ duration: reduce ? 0 : 0.5 }}
              className="rounded-md px-0.5 underline decoration-gold decoration-2 underline-offset-[6px]"
            >
              {mid}
            </motion.span>
          )}
          {after}
        </p>
        <p className="text-xs font-jp text-text-muted">{u.reading}</p>
        <p className="text-sm text-text-secondary font-medium">“{u.meaningId}”</p>
        <div className="flex items-center gap-2 flex-wrap">
          <SpeakButton text={u.japanese} label="Putar kalimat" />
          {u.borrowed && <span className="text-[10.5px] text-text-muted">Contoh kalimat dari kosakata lain.</span>}
        </div>
      </div>

      <motion.dl
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        className="grid gap-1.5"
      >
        <div className="flex items-baseline gap-3 px-3.5 py-2 rounded-xl bg-surface-card border border-gold/40">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-text-muted w-24 shrink-0">Kotoba</dt>
          <dd className="text-base font-jp font-black text-gold">{u.lemma}</dd>
        </div>
        {u.surface && u.surface !== u.lemma && (
          <div className="flex items-baseline gap-3 px-3.5 py-2 rounded-xl bg-surface-inset border border-border-subtle">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-text-muted w-24 shrink-0">Di kalimat</dt>
            <dd className="text-sm text-text-primary">
              <span className="font-jp font-bold">{u.surface}</span> → bentuk kamus <span className="font-jp font-bold">{u.lemma}</span>
            </dd>
          </div>
        )}
        <div className="flex items-baseline gap-3 px-3.5 py-2 rounded-xl bg-surface-inset border border-border-subtle">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-text-muted w-24 shrink-0">Arti</dt>
          <dd className="text-sm font-semibold text-text-primary">{insight.meaning}</dd>
        </div>
        {(note || insight.definition) && (
          <div className="flex items-baseline gap-3 px-3.5 py-2 rounded-xl bg-surface-inset border border-border-subtle">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-text-muted w-24 shrink-0">Penggunaan</dt>
            <dd className="text-sm text-text-secondary leading-relaxed">{note ?? insight.definition}</dd>
          </div>
        )}
      </motion.dl>

      {insight.collocations.length > 0 && phase >= 2 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Frasa yang lazim</h4>
          <div className="flex flex-wrap gap-1.5">
            {insight.collocations.slice(0, 4).map(c => {
              const jp = c.replace(/\s*[(（].*$/, '');
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    speakJapanese(jp);
                    playSound('click', soundEnabled);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle text-xs text-text-primary hover:border-gold/50 transition-colors cursor-pointer"
                >
                  <span className="font-jp font-bold">{jp}</span>
                  <span className="text-text-muted ml-1">{c.slice(jp.length).trim()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 06 Uji Pemahaman
// ---------------------------------------------------------------------------

const QuizStep: React.FC<{
  insight: KotobaInsight;
  soundEnabled: boolean;
  onDone: (correct: number, total: number) => void;
  onOpenWord: (id: string) => void;
  onRestart: () => void;
}> = ({ insight, soundEnabled, onDone, onOpenWord, onRestart }) => {
  const reduce = useReducedMotion();
  const qs = insight.quiz;
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const finished = qi >= qs.length;
  const reportedRef = useRef(false);

  useEffect(() => {
    if (finished && !reportedRef.current) {
      reportedRef.current = true;
      onDone(correct, qs.length);
      playSound(correct === qs.length ? 'victory' : 'coin', soundEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (finished) {
    const next = insight.families.flatMap(f => f.words).filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i).slice(0, 4);
    return (
      <div className="space-y-4 text-center">
        <motion.div
          initial={reduce ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto w-28 h-28 rounded-full bg-surface-inset border-2 border-gold/50 flex flex-col items-center justify-center"
        >
          <span className="text-3xl font-black font-mono text-gold">
            {correct}/{qs.length}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">benar</span>
        </motion.div>
        <p className="text-sm text-text-secondary">
          {correct === qs.length
            ? `Hebat! Kamu memahami ${insight.word} beserta kanji penyusunnya.`
            : `Bagus. Ulangi tahap yang terlewat untuk memperkuat pemahaman ${insight.word}.`}
        </p>
        {next.length > 0 && (
          <div className="space-y-2 text-left">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Lanjutkan jaringanmu</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {next.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onOpenWord(w.id)}
                  className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer text-left"
                >
                  <div className="font-jp font-bold text-text-primary">{w.word}</div>
                  <div className="text-[11px] text-text-muted truncate">{w.meaningId}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={onRestart} className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
          <RotateCcw className="w-3.5 h-3.5" /> Ulangi dari awal
        </button>
      </div>
    );
  }

  const q: InsightQuestion = qs[qi];
  const answered = picked !== null;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const ok = i === q.correctIndex;
    if (ok) setCorrect(c => c + 1);
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>
          Soal {qi + 1}/{qs.length}
        </span>
        <span className="flex gap-1">
          {qs.map((_, i) => (
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
          <p className="text-sm font-bold text-text-primary">{q.prompt}</p>
          {q.subject && (
            <div className="text-center text-5xl font-black font-jp text-text-primary py-2" lang="ja">
              {q.subject}
            </div>
          )}
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
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-between gap-2 ${
                    q.optionsJp ? 'font-jp text-base' : ''
                  } ${
                    state === 'correct'
                      ? 'border-state-success bg-state-success/15 text-text-primary'
                      : state === 'wrong'
                        ? 'border-state-danger bg-state-danger/10 text-text-primary'
                        : state === 'dim'
                          ? 'border-border-subtle bg-surface-inset text-text-muted'
                          : 'border-border-subtle bg-surface-inset text-text-primary hover:border-gold/50 cursor-pointer'
                  }`}
                >
                  <span>{opt}</span>
                  {state === 'correct' && <Check className="w-4 h-4 text-state-success shrink-0" />}
                  {state === 'wrong' && <X className="w-4 h-4 text-state-danger shrink-0" />}
                </button>
              );
            })}
          </div>
          {answered && (
            <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed p-3 rounded-xl bg-surface-inset border border-border-subtle">
                {picked === q.correctIndex ? 'Tepat! ' : 'Belum tepat. '}
                {q.explanation}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setQi(i => i + 1);
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-primary w-full py-2.5 rounded-xl text-xs font-bold font-heading cursor-pointer"
              >
                {qi + 1 < qs.length ? 'Soal berikutnya' : 'Lihat hasil'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
