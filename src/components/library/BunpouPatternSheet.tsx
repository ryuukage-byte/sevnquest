import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, CheckCircle2, ChevronRight, Puzzle, Quote, RotateCcw, Network, Volume2, XCircle, Zap } from 'lucide-react';
import type { PatternInsight } from '../../engine/bunpouInsight/bunpouInsight';
import { buildPartQuiz, quizzablePartIndexes } from '../../engine/bunpouInsight/bunpouInsight';
import { PATTERN_TRANSPARENCY_LABEL } from '../../data/bunpouPatternInsights';
import { getFuriganaSegments } from '../../utils/furiganaUtils';
import { playSound, speakJapanese } from '../../utils/audio';

interface BunpouPatternSheetProps {
  insight: PatternInsight;
  soundEnabled: boolean;
  /** Membuka pola lain dari Keluarga Pola. Tanpa ini, anggota keluarga hanya ditampilkan. */
  onOpenPattern?: (id: string) => void;
  onQuizAnswered?: (correct: boolean) => void;
}

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

export const BunpouPatternSheet: React.FC<BunpouPatternSheetProps> = ({
  insight,
  soundEnabled,
  onOpenPattern,
  onQuizAnswered,
}) => {
  const reduce = useReducedMotion();
  const transparency = PATTERN_TRANSPARENCY_LABEL[insight.transparency];
  const step = (i: number) => (reduce ? 0 : 0.08 + i * 0.12);

  // Cek cepat: satu soal per komponen, bergiliran.
  const quizParts = useMemo(() => quizzablePartIndexes(insight), [insight]);
  const [quizCursor, setQuizCursor] = useState(0);
  const quiz = useMemo(
    () => (quizParts.length ? buildPartQuiz(insight.id, quizParts[quizCursor % quizParts.length]) : null),
    [insight.id, quizParts, quizCursor]
  );
  const [picked, setPicked] = useState<number | null>(null);

  const pick = (idx: number) => {
    if (picked !== null || !quiz) return;
    setPicked(idx);
    const ok = idx === quiz.correctIndex;
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
    onQuizAnswered?.(ok);
  };

  const nextQuiz = () => {
    playSound('click', soundEnabled);
    setPicked(null);
    setQuizCursor(c => c + 1);
  };

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* ── Bedah Komponen ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-3">
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
              <span className="min-w-[3rem] shrink-0 text-center font-jp font-black text-base text-[#5b4a7a] dark:text-[#d6c8f0] leading-snug">
                {part.text}
              </span>
              <span className="min-w-0 space-y-0.5">
                <span className="inline-block px-1.5 py-px rounded-md bg-[#7d6b9e]/12 dark:bg-[#b7a3dc]/15 text-[#5b4a7a] dark:text-[#d6c8f0] text-[9.5px] font-bold uppercase tracking-wider">
                  {part.role}
                  {part.omitted ? ' · sering dibuang' : ''}
                </span>
                <span className="block text-xs text-text-secondary leading-snug">{part.meaning}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Pembentukan Makna ── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: step(insight.parts.length) }}
        className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5"
      >
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

        <div className="p-2.5 rounded-xl bg-surface-card/80 border border-border-subtle/80 space-y-0.5">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block font-mono">Harfiah</span>
          <p className="text-sm text-text-secondary italic leading-snug">“{insight.literal}”</p>
        </div>
        <div className="flex justify-center -my-1" aria-hidden>
          <ArrowDown className="w-4 h-4 text-text-muted" />
        </div>
        <div className="p-2.5 rounded-xl bg-[#7d6b9e]/10 dark:bg-[#b7a3dc]/10 border border-border-subtle space-y-0.5">
          <span className="text-[10px] font-bold text-[#5b4a7a] dark:text-[#d6c8f0] uppercase tracking-wider block font-mono">
            Makna Alami
          </span>
          <p className="text-sm sm:text-base font-bold text-text-primary font-heading leading-snug">{insight.natural}</p>
        </div>

        <p className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">{insight.explanation}</p>
        <p className="text-[10.5px] text-text-muted">{transparency.hint}</p>
      </motion.div>

      {/* ── Pola dalam Kalimat ── */}
      {insight.examples.some(e => e.highlight) && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5">
          <SectionTitle icon={<Zap className="w-3.5 h-3.5 text-wine-accent" />}>Pola dalam Kalimat</SectionTitle>
          {insight.examples
            .filter(e => e.highlight)
            .map((ex, i) => (
              <div key={i} className="p-2.5 sm:p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
                    <HighlightedSentence japanese={ex.japanese} reading={ex.reading} highlight={ex.highlight} />
                  </p>
                  <button
                    type="button"
                    onClick={() => speakJapanese(ex.japanese)}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors cursor-pointer shrink-0"
                    title="Dengarkan kalimat"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-text-secondary leading-normal">{ex.meaningId}</p>
                <p className="text-[11px] text-text-muted">
                  Bentuk di kalimat:{' '}
                  <span className="font-jp font-bold text-text-secondary">{ex.japanese.slice(...ex.highlight!)}</span>
                </p>
              </div>
            ))}
        </div>
      )}

      {/* ── Keluarga Pola ── */}
      {insight.family.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-3">
          <SectionTitle icon={<Network className="w-3.5 h-3.5 text-indigo" />}>Keluarga Pola</SectionTitle>
          {insight.family.map(group => (
            <div key={group.key} className="space-y-1.5">
              <p className="text-[11px] text-text-muted">
                Juga memakai <span className="font-jp font-bold text-text-primary text-xs">「{group.key}」</span>
              </p>
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
                      className={`flex flex-col justify-start min-w-0 px-2.5 py-2 rounded-xl bg-surface-card border border-border-subtle text-left ${
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
              {group.more > 0 && <p className="text-[10.5px] text-text-muted">+{group.more} pola lain</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Cek Cepat ── */}
      {quiz && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5">
          <SectionTitle
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            aside={
              <span className="text-[10px] font-mono text-text-muted">
                {(quizCursor % quizParts.length) + 1}/{quizParts.length}
              </span>
            }
          >
            Cek Cepat
          </SectionTitle>
          <p className="text-sm text-text-primary leading-relaxed">
            Dalam pola <span className="font-jp font-bold">「{insight.title}」</span>, komponen{' '}
            <span className="font-jp font-black text-base text-[#5b4a7a] dark:text-[#d6c8f0]">「{quiz.part.text}」</span>{' '}
            berarti…
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
            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={nextQuiz}
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
      )}
    </div>
  );
};
