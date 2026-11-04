// Bagian-bagian "Bedah Pola" untuk modal Bunpou. Pada pola yang sudah dikurasi, tiap bagian
// mengisi satu lembar buku saku (Bedah Komponen, Pembentukan Makna, Contoh Nyata, Keluarga
// Pola, Cek Cepat) sehingga tiap lembar tetap pendek.

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Network,
  Puzzle,
  Quote,
  RotateCcw,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import type { PatternInsight } from '../../engine/bunpouInsight/bunpouInsight';
import { buildPartQuiz, quizzablePartIndexes, titleForms } from '../../engine/bunpouInsight/bunpouInsight';
import { PATTERN_TRANSPARENCY_LABEL } from '../../data/bunpouPatternInsights';
import { getFuriganaSegments } from '../../utils/furiganaUtils';
import { playSound, speakJapanese } from '../../utils/audio';

const CARD = 'p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs';
const PLUM_TEXT = 'text-[#5b4a7a] dark:text-[#d6c8f0]';

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }> = ({
  icon,
  children,
  aside,
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5 text-text-primary font-heading font-bold text-xs uppercase tracking-wider">
      {icon}
      <span>{children}</span>
    </div>
    {aside}
  </div>
);

const useStep = () => {
  const reduce = useReducedMotion();
  return { reduce, step: (i: number) => (reduce ? 0 : 0.08 + i * 0.12) };
};

// ---------------------------------------------------------------------------
// Bedah Komponen
// ---------------------------------------------------------------------------

export const PatternBreakdownSection: React.FC<{ insight: PatternInsight }> = ({ insight }) => {
  const { reduce, step } = useStep();
  return (
    <div className={`${CARD} space-y-3`}>
      <SectionTitle
        icon={<Puzzle className="w-3.5 h-3.5 text-[#7d6b9e] dark:text-[#b7a3dc]" />}
        aside={<span className="text-[10px] font-mono text-text-muted">{insight.parts.length} komponen</span>}
      >
        Bedah Komponen
      </SectionTitle>

      {/* Rumus komponen dalam satu baris */}
      <div className="flex flex-wrap items-end justify-center gap-x-1.5 gap-y-2 py-1">
        {insight.parts.map((part, i) => (
          // ＋ dibungkus bersama komponen sesudahnya agar tidak menggantung di ujung baris.
          <span key={`${part.text}-${i}`} className="inline-flex items-end gap-1.5">
            {i > 0 && (
              <motion.span
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: step(i) - 0.04 }}
                className="pb-2 text-text-muted font-bold text-sm select-none"
                aria-hidden
              >
                ＋
              </motion.span>
            )}
            <motion.button
              type="button"
              onClick={() => speakJapanese(part.reading ?? part.text)}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step(i), duration: 0.25 }}
              title={`Dengarkan 「${part.text}」`}
              className={`flex flex-col items-center px-2.5 sm:px-3 pt-1 pb-1.5 rounded-xl border cursor-pointer transition-colors ${
                part.omitted
                  ? 'border-dashed border-border-muted'
                  : 'border-border-subtle bg-surface-card shadow-xs hover:border-[#7d6b9e]/60'
              }`}
            >
              <span className="text-[10px] font-jp text-text-muted leading-none h-2.5">
                {part.reading && part.reading !== part.text ? part.reading : ''}
              </span>
              <span
                className={`text-2xl sm:text-[1.7rem] font-jp font-black leading-tight ${
                  part.omitted ? 'text-text-muted' : 'text-text-primary'
                }`}
              >
                {part.omitted ? `(${part.text})` : part.text}
              </span>
            </motion.button>
          </span>
        ))}
      </div>

      {/* Arti tiap komponen */}
      <div className="space-y-1.5">
        {insight.parts.map((part, i) => (
          <motion.div
            key={`${part.text}-row-${i}`}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: step(insight.parts.length) + i * 0.08 }}
            className={`flex items-start gap-2.5 p-2 rounded-xl border ${
              part.omitted ? 'border-dashed border-border-muted' : 'border-border-subtle bg-surface-card'
            }`}
          >
            <span className={`min-w-[3rem] shrink-0 text-center font-jp font-black text-base leading-snug ${PLUM_TEXT}`}>
              {part.text}
            </span>
            <span className="min-w-0 space-y-0.5">
              <span
                className={`inline-block px-1.5 py-px rounded-md bg-[#7d6b9e]/12 dark:bg-[#b7a3dc]/15 text-[9.5px] font-bold uppercase tracking-wider ${PLUM_TEXT}`}
              >
                {part.role}
                {part.omitted ? ' · sering dibuang' : ''}
              </span>
              <span className="block text-xs text-text-secondary leading-snug">{part.meaning}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <p className="text-[10.5px] text-text-muted text-center">Ketuk komponen untuk mendengar pelafalannya.</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pembentukan Makna
// ---------------------------------------------------------------------------

export const PatternFormationSection: React.FC<{ insight: PatternInsight }> = ({ insight }) => {
  const { reduce, step } = useStep();
  const transparency = PATTERN_TRANSPARENCY_LABEL[insight.transparency];
  return (
    <div className={`${CARD} space-y-2.5`}>
      <SectionTitle
        icon={<Quote className="w-3.5 h-3.5 text-gold" />}
        aside={
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold/15 text-gold border border-border-subtle"
            title={transparency.hint}
          >
            {transparency.label}
          </span>
        }
      >
        Pembentukan Makna
      </SectionTitle>

      {/* Komponen yang dirangkai, versi ringkas */}
      <p className="text-center font-jp font-bold text-base text-text-primary">
        {insight.parts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-text-muted text-sm mx-1">＋</span>}
            <span className={p.omitted ? 'text-text-muted' : ''}>{p.omitted ? `(${p.text})` : p.text}</span>
          </React.Fragment>
        ))}
      </p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: step(0) }}
        className="p-2.5 rounded-xl bg-surface-card/80 border border-border-subtle/80 space-y-0.5"
      >
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block font-mono">Harfiah</span>
        <p className="text-sm text-text-secondary italic leading-snug">“{insight.literal}”</p>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: step(1) }}
        className="flex justify-center -my-1"
        aria-hidden
      >
        <ArrowDown className="w-4 h-4 text-text-muted" />
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: step(2) }}
        className="p-2.5 rounded-xl bg-[#7d6b9e]/10 dark:bg-[#b7a3dc]/10 border border-border-subtle space-y-0.5"
      >
        <span className={`text-[10px] font-bold uppercase tracking-wider block font-mono ${PLUM_TEXT}`}>Makna Alami</span>
        <p className="text-sm sm:text-base font-bold text-text-primary font-heading leading-snug">{insight.natural}</p>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: step(3) }}
        className="space-y-1"
      >
        <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">{insight.explanation}</p>
        <p className="text-[10.5px] text-text-muted">{transparency.hint}</p>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Contoh Nyata (pola disorot)
// ---------------------------------------------------------------------------

const HIGHLIGHT_CLASS =
  'rounded-md px-0.5 bg-[#7d6b9e]/20 text-[#5b4a7a] dark:bg-[#b7a3dc]/20 dark:text-[#d6c8f0] font-bold underline decoration-[#7d6b9e] dark:decoration-[#b7a3dc] decoration-2 underline-offset-[5px]';

/** Kalimat dengan furigana, dan rentang pola disorot (kanji ber-furigana disorot utuh). */
const HighlightedSentence: React.FC<{ japanese: string; reading: string; highlight?: [number, number] }> = ({
  japanese,
  reading,
  highlight,
}) => {
  const segments = useMemo(() => getFuriganaSegments(japanese, reading), [japanese, reading]);
  const [hs, he] = highlight ?? [-1, -1];
  let offset = 0;

  return (
    <span className="ruby-text font-jp leading-relaxed" lang="ja">
      {segments.map((seg, i) => {
        const start = offset;
        const end = offset + seg.text.length;
        offset = end;
        if (seg.isKanji && seg.ruby) {
          const ruby = (
            <ruby className="ruby-word">
              {seg.text}
              <rp>(</rp>
              <rt className="text-[0.62em] font-semibold leading-none select-none text-[#3f3a32] dark:text-[#f0be52] font-jp tracking-tight">
                {seg.ruby}
              </rt>
              <rp>)</rp>
            </ruby>
          );
          return start < he && end > hs ? (
            <span key={i} className={HIGHLIGHT_CLASS}>
              {ruby}
            </span>
          ) : (
            <React.Fragment key={i}>{ruby}</React.Fragment>
          );
        }
        if (end <= hs || start >= he) return <span key={i}>{seg.text}</span>;
        const a = Math.max(hs, start) - start;
        const b = Math.min(he, end) - start;
        return (
          <span key={i}>
            {seg.text.slice(0, a)}
            <span className={HIGHLIGHT_CLASS}>{seg.text.slice(a, b)}</span>
            {seg.text.slice(b)}
          </span>
        );
      })}
    </span>
  );
};

export const PatternExamplesSection: React.FC<{ insight: PatternInsight }> = ({ insight }) => {
  const forms = useMemo(() => new Set(titleForms(insight.title)), [insight.title]);
  return (
    <div className="space-y-2.5 sm:space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle icon={<Zap className="w-3.5 h-3.5 text-wine-accent" />}>Pola dalam Kalimat</SectionTitle>
        <span className="text-[10px] font-mono text-text-muted">{insight.examples.length} kalimat</span>
      </div>
      {insight.examples.map((ex, i) => {
        const surface = ex.highlight ? ex.japanese.slice(...ex.highlight) : null;
        return (
          <div key={i} className="p-3 sm:p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-medium text-text-muted select-none tracking-wide">例 {i + 1}</span>
              <button
                type="button"
                onClick={() => speakJapanese(ex.japanese)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
                title="Dengarkan kalimat"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
              <HighlightedSentence japanese={ex.japanese} reading={ex.reading} highlight={ex.highlight} />
            </p>
            <p className="text-xs text-text-secondary leading-normal">{ex.meaningId}</p>
            {surface && !forms.has(surface) && (
              <p className="text-[11px] text-text-muted">
                Bentuk di kalimat: <span className="font-jp font-bold text-text-secondary">{surface}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Keluarga Pola (bisa dilipat)
// ---------------------------------------------------------------------------

export const PatternFamilySection: React.FC<{
  insight: PatternInsight;
  soundEnabled: boolean;
  onOpenPattern?: (id: string) => void;
}> = ({ insight, soundEnabled, onOpenPattern }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (insight.family.length === 0) {
    return (
      <div className={`${CARD} space-y-1.5`}>
        <SectionTitle icon={<Network className="w-3.5 h-3.5 text-indigo" />}>Keluarga Pola</SectionTitle>
        <p className="text-xs text-text-muted">Belum ada pola terkurasi lain yang memakai komponen pola ini.</p>
      </div>
    );
  }

  return (
    <div className={`${CARD} space-y-2`}>
      <SectionTitle icon={<Network className="w-3.5 h-3.5 text-indigo" />}>Keluarga Pola</SectionTitle>
      <p className="text-[11px] text-text-muted leading-relaxed">
        Pola lain yang dibangun dari komponen yang sama. Ketuk komponen untuk membuka keluarganya.
      </p>

      {insight.family.map(group => {
        const isOpen = Boolean(open[group.key]);
        const total = group.members.length + group.more;
        return (
          <div key={group.key} className="rounded-xl border border-border-subtle bg-surface-card overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                setOpen(o => ({ ...o, [group.key]: !o[group.key] }));
              }}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 whitespace-nowrap font-jp font-black text-base ${PLUM_TEXT}`}>「{group.key}」</span>
                <span className="text-[11px] text-text-muted truncate">
                  {group.members
                    .slice(0, 3)
                    .map(m => m.title)
                    .join('・')}
                  {total > 3 ? ' …' : ''}
                </span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-text-muted">{total} pola</span>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="px-2 pb-2 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.members.map(m => {
                        const clickable = Boolean(onOpenPattern);
                        const Tag = clickable ? 'button' : 'div';
                        return (
                          <Tag
                            key={m.id}
                            {...(clickable
                              ? {
                                  type: 'button' as const,
                                  onClick: () => {
                                    playSound('click', soundEnabled);
                                    onOpenPattern!(m.id);
                                  },
                                }
                              : {})}
                            className={`flex flex-col justify-start min-w-0 px-2.5 py-2 rounded-xl bg-surface-inset border border-border-subtle text-left ${
                              clickable ? 'cursor-pointer hover:border-indigo/60 transition-colors' : ''
                            }`}
                          >
                            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="font-jp font-bold text-sm text-text-primary leading-snug break-all">{m.title}</span>
                              <span className="text-[9px] font-mono text-text-muted">{m.level}</span>
                              {m.standalone && (
                                <span className="px-1 rounded bg-indigo/10 text-indigo text-[9px] font-bold uppercase tracking-wider">
                                  dasar
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-text-muted leading-snug line-clamp-2">{m.meaning}</span>
                          </Tag>
                        );
                      })}
                    </div>
                    {group.more > 0 && <p className="text-[10.5px] text-text-muted px-1">+{group.more} pola lain</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Cek Cepat: arti tiap komponen
// ---------------------------------------------------------------------------

export const PatternQuickCheck: React.FC<{
  insight: PatternInsight;
  soundEnabled: boolean;
  onAnswered?: (correct: boolean) => void;
}> = ({ insight, soundEnabled, onAnswered }) => {
  const quizParts = useMemo(() => quizzablePartIndexes(insight), [insight]);
  const [cursor, setCursor] = useState(0);
  const quiz = useMemo(
    () => (quizParts.length ? buildPartQuiz(insight.id, quizParts[cursor % quizParts.length]) : null),
    [insight.id, quizParts, cursor]
  );
  const [picked, setPicked] = useState<number | null>(null);
  if (!quiz) return null;

  const pick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    const ok = idx === quiz.correctIndex;
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
    onAnswered?.(ok);
  };

  const next = () => {
    playSound('click', soundEnabled);
    setPicked(null);
    setCursor(c => c + 1);
  };

  return (
    <div className={`${CARD} space-y-2.5`}>
      <SectionTitle
        icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        aside={
          <span className="text-[10px] font-mono text-text-muted">
            {(cursor % quizParts.length) + 1}/{quizParts.length}
          </span>
        }
      >
        Cek Cepat: Komponen
      </SectionTitle>
      <p className="text-sm text-text-primary leading-relaxed">
        Dalam pola <span className="font-jp font-bold">「{insight.title}」</span>, komponen{' '}
        <span className={`font-jp font-black text-base ${PLUM_TEXT}`}>「{quiz.part.text}」</span> berarti…
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {quiz.options.map((opt, i) => {
          const isRight = picked !== null && i === quiz.correctIndex;
          const isWrong = picked === i && i !== quiz.correctIndex;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={`p-2.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-2 shadow-xs ${
                isRight
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : isWrong
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                    : 'bg-surface-card border-border-subtle text-text-primary hover:bg-surface-elevated cursor-pointer'
              } ${picked !== null ? 'cursor-default' : 'active:scale-[0.99]'}`}
            >
              <span>{opt}</span>
              {isRight && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {isWrong && <XCircle className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="flex items-center justify-end pt-0.5">
          <button
            type="button"
            onClick={next}
            className="btn-physical-primary text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 cursor-pointer font-heading"
          >
            {quizParts.length > 1 ? (
              <>
                <span>Komponen Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ulangi</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
