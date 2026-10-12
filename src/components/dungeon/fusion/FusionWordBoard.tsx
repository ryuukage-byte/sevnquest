import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { toRomaji } from 'wanakana';
import { diffWords } from '../../../engine/fusion/fusionEngine';
import { formLabel } from '../../../engine/fusion/rules';
import { FORM_INFO } from '../../../engine/fusion/formInfo';
import type { FusionAnimationPhase, FusionFormId, FusionHistoryEntry, FusionStage, FusionWord } from '../../../engine/fusion/types';

interface Props {
  word: FusionWord;
  form: FusionFormId;
  stage: Pick<FusionStage, 'formLabels'>;
  /** Entri transformasi yang sedang dianimasikan (null saat idle). */
  animating: FusionHistoryEntry | null;
  phase: FusionAnimationPhase;
  reduceMotion: boolean;
  /** Posisi awal komponen relatif ke pusat kata (px); null = tanpa efek terbang. */
  flight: { dx: number; dy: number; label: string } | null;
  wordRef: React.RefObject<HTMLDivElement | null>;
  /** Klik lencana bentuk kata (penjelasan) dan teks kata (ganti kotoba); opsional. */
  onFormClick?: (form: FusionFormId) => void;
  onWordClick?: () => void;
}

const PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * 70, y: Math.sin(a) * 38 };
});

/**
 * Papan kata. Teks yang tampil SELALU berasal dari state engine (from/to);
 * fase animasi hanya mengatur gaya per-karakter, sehingga bacaan tetap terbaca di setiap fase.
 */
export const FusionWordBoard: React.FC<Props> = ({ word, form, stage, animating, phase, reduceMotion, flight, wordRef, onFormClick, onWordClick }) => {
  const showFrom = !!animating && (phase === 'approach' || phase === 'absorb' || phase === 'morph');
  const shown = animating ? (showFrom ? animating.from : animating.to) : word;
  const shownForm = animating ? (showFrom ? animating.fromForm : animating.toForm) : form;
  const diff = useMemo(
    () => (animating ? diffWords(animating.from.japanese, animating.to.japanese) : null),
    [animating]
  );

  const glowing = !reduceMotion && (phase === 'absorb' || phase === 'reveal');
  const n = Math.max(shown.japanese.length, 4);

  const charStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'inline-block',
    textShadow: glowing ? '0 0 18px var(--color-gold, #f0be52)' : 'none',
    transition: reduceMotion ? 'none' : 'text-shadow 200ms ease',
    ...extra,
  });

  let chars: React.ReactNode;
  if (animating && diff) {
    const kept = [...diff.kept].map((c, i) => <span key={`k${i}`} style={charStyle()}>{c}</span>);
    if (showFrom) {
      const fading = phase === 'morph' && !reduceMotion;
      chars = (
        <>
          {kept}
          {[...diff.removed].map((c, i) => (
            <span
              key={`r${i}`}
              style={charStyle({
                opacity: fading ? 0.18 : 1,
                transform: fading ? 'scale(0.55)' : 'scale(1)',
                filter: fading ? 'blur(2px)' : 'none',
                transition: reduceMotion ? 'none' : 'opacity 220ms ease, transform 220ms ease, filter 220ms ease, text-shadow 200ms ease',
              })}
            >
              {c}
            </span>
          ))}
        </>
      );
    } else {
      chars = (
        <>
          {kept}
          {[...diff.added].map((c, i) => (
            <motion.span
              key={`a${i}`}
              style={charStyle()}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.55, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : i * 0.04 }}
            >
              {c}
            </motion.span>
          ))}
        </>
      );
    }
  } else {
    chars = [...shown.japanese].map((c, i) => <span key={i} style={{ display: 'inline-block' }}>{c}</span>);
  }

  return (
    <div className="relative flex flex-col items-center justify-center text-center px-3 py-3 sm:py-6 lg:[--fusion-cap:4.25rem]" style={{ containerType: 'inline-size' }} role="img" aria-label={`${shown.japanese}, ${formLabel(shownForm, stage)}`}>
      {onFormClick && FORM_INFO[shownForm] ? (
        <button
          type="button"
          onClick={() => onFormClick(shownForm)}
          aria-label={`Penjelasan ${formLabel(shownForm, stage)}`}
          className="max-w-full px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-gold/15 text-gold border border-border-subtle uppercase tracking-wider mb-2 sm:mb-3 break-words cursor-pointer hover:border-gold"
        >
        {formLabel(shownForm, stage)}
          <span aria-hidden="true" className="ml-1.5 opacity-70">?</span>
        </button>
      ) : (
        <span className="max-w-full px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-gold/15 text-gold border border-border-subtle uppercase tracking-wider mb-2 sm:mb-3 break-words">
        {formLabel(shownForm, stage)}
        </span>
      )}

      <div ref={wordRef} className="relative max-w-full">
        {/* Partikel kecil, tidak menutup teks (aria-hidden, nonaktif saat reduced motion). */}
        {!reduceMotion && (phase === 'absorb' || phase === 'reveal') && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {PARTICLES.map((p, i) => (
              <motion.span
                key={`${phase}${i}`}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-gold/70"
                initial={phase === 'absorb' ? { x: p.x * 2, y: p.y * 2, opacity: 0 } : { x: 0, y: 0, opacity: 0.9 }}
                animate={phase === 'absorb' ? { x: 0, y: 0, opacity: 0.8 } : { x: p.x, y: p.y, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        <div
          className={`relative font-heading font-black text-text-primary whitespace-nowrap leading-tight ${onWordClick ? 'cursor-pointer' : ''}`}
          onClick={onWordClick}
          style={{ fontSize: `min(calc(88cqw / ${n}), var(--fusion-cap, 5.5rem))` }}
          lang="ja"
        >
          {chars}
        </div>

        {/* Komponen yang terbang masuk ke kata lalu melebur. */}
        {flight && !reduceMotion && (phase === 'approach' || phase === 'absorb') && (
          <motion.div
            key="ghost"
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-8 -mt-4 px-3 py-1.5 rounded-xl bg-gold/30 border border-gold text-text-primary font-heading font-black text-sm whitespace-nowrap"
            initial={{ x: flight.dx, y: flight.dy, scale: 1, opacity: 0.95 }}
            animate={
              phase === 'approach'
                ? { x: 0, y: 0, scale: 1, opacity: 1 }
                : { x: 0, y: 0, scale: 0.3, opacity: 0 }
            }
            transition={{ duration: phase === 'approach' ? 0.26 : 0.2, ease: 'easeInOut' }}
          >
            {flight.label}
          </motion.div>
        )}
      </div>

      <div className="mt-2 text-sm sm:text-base text-text-secondary font-body" lang="ja">{shown.reading}</div>
      <div className="text-xs sm:text-sm text-text-muted font-mono">{toRomaji(shown.reading)}</div>
    </div>
  );
};
