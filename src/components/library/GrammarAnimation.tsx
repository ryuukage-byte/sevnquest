import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Clapperboard } from 'lucide-react';
import {
  GRAMMAR_ANIMATION_VERBS,
  buildGrammarAnimation,
  type GrammarAnimationRecipe,
  type GrammarAnimationStage,
  type GrammarSegmentRole,
} from '../../data/grammarAnimations';
import { speakJapanese, playSound } from '../../utils/audio';

interface GrammarAnimationProps {
  recipe: GrammarAnimationRecipe;
  soundEnabled?: boolean;
}

const AUTOPLAY_MS = 1600;

const SEGMENT_CLASS: Record<GrammarSegmentRole, string> = {
  stem: 'text-text-primary',
  ending: 'text-gold underline decoration-dotted underline-offset-8',
  removed: 'text-state-danger line-through',
  added: 'text-state-success',
  suffix: 'text-kotoba',
};

/** Ketuk bagian kata → lompat ke tahap yang menjelaskan bagian itu. */
const SEGMENT_STAGE: Partial<Record<GrammarSegmentRole, GrammarAnimationStage['kind']>> = {
  ending: 'remove',
  removed: 'remove',
  added: 'add',
  suffix: 'suffix',
};

export const GrammarAnimation: React.FC<GrammarAnimationProps> = ({ recipe, soundEnabled = true }) => {
  const reduceMotion = useReducedMotion();
  const [verbId, setVerbId] = useState(recipe.defaultVerbId);
  const [stageIdx, setStageIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const verb = GRAMMAR_ANIMATION_VERBS.find(v => v.id === verbId) ?? GRAMMAR_ANIMATION_VERBS[0];
  const anim = useMemo(() => buildGrammarAnimation(recipe, verb), [recipe, verb]);
  const lastIdx = anim ? anim.stages.length - 1 : 0;

  // Animasi hanya berjalan saat diminta, dan berhenti di tahap terakhir.
  useEffect(() => {
    if (!playing) return;
    if (stageIdx >= lastIdx) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setStageIdx(i => Math.min(i + 1, lastIdx)), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, stageIdx, lastIdx]);

  // Tab tidak aktif → jeda, supaya tidak ada pekerjaan di latar belakang.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!anim) return null;
  const stage = anim.stages[stageIdx];
  const isResult = stage.kind === 'result';

  const goTo = (idx: number) => {
    playSound('click', soundEnabled);
    setPlaying(false);
    setStageIdx(Math.max(0, Math.min(idx, lastIdx)));
  };

  const togglePlay = () => {
    playSound('click', soundEnabled);
    if (playing) {
      setPlaying(false);
      return;
    }
    if (stageIdx >= lastIdx) setStageIdx(0);
    setPlaying(true);
  };

  const replay = () => {
    playSound('click', soundEnabled);
    setStageIdx(0);
    setPlaying(true);
  };

  const pickVerb = (id: string) => {
    playSound('click', soundEnabled);
    setVerbId(id);
    setStageIdx(0);
    setPlaying(false);
  };

  const onSegmentClick = (role: GrammarSegmentRole) => {
    const kind = SEGMENT_STAGE[role];
    const idx = kind ? anim.stages.findIndex(s => s.kind === kind) : -1;
    if (idx >= 0) goTo(idx);
  };

  const enter = (role: GrammarSegmentRole) => {
    if (reduceMotion || role === 'stem') return false;
    if (role === 'added') return { opacity: 0, y: -12 };
    if (role === 'suffix') return { opacity: 0, x: 28 };
    if (role === 'removed') return { opacity: 1 };
    return { opacity: 0 };
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-text-primary font-heading">
          <Clapperboard className="w-4 h-4 text-gold" /> Animasi Pembentukan
        </h4>
        <span className="text-[10px] font-mono text-text-muted">
          Tahap {stageIdx + 1}/{anim.stages.length}
        </span>
      </div>

      {/* Pilihan verba */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="radiogroup" aria-label="Pilih kata kerja">
        {GRAMMAR_ANIMATION_VERBS.map(v => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={v.id === verb.id}
            onClick={() => pickVerb(v.id)}
            className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-heading font-bold transition-colors ${
              v.id === verb.id
                ? 'bg-gold/15 border-gold/50 text-gold'
                : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            {v.kanji}
          </button>
        ))}
      </div>

      {/* Panggung */}
      <div className="rounded-xl bg-surface-card border border-border-subtle/80 px-3 py-5 min-h-[7.5rem] flex flex-col items-center justify-center text-center">
        <motion.div
          key={`${verb.id}-${stageIdx}`}
          className={`font-bold font-heading tracking-wide ${
            stage.segments.reduce((n, s) => n + s.text.length, 0) > 6 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
          } ${isResult ? 'text-gold' : ''}`}
          lang="ja"
        >
          {stage.segments
            .filter(s => s.text)
            .map((s, i) => {
              const tappable = !!SEGMENT_STAGE[s.role];
              return (
                <motion.span
                  key={i}
                  initial={enter(s.role)}
                  animate={s.role === 'removed' && !reduceMotion ? { opacity: 0.4 } : { opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
                  onClick={tappable ? () => onSegmentClick(s.role) : undefined}
                  className={`inline-block ${isResult ? '' : SEGMENT_CLASS[s.role]} ${tappable ? 'cursor-pointer' : ''}`}
                >
                  {s.text}
                </motion.span>
              );
            })}
        </motion.div>
        {(stage.kind === 'base' || isResult) && (
          <p className="mt-1.5 text-xs font-mono text-text-muted">
            {isResult ? `${anim.result.reading} · ${anim.result.romaji}` : verb.reading}
          </p>
        )}
      </div>

      {/* Penjelasan tahap */}
      <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle/80 space-y-0.5" aria-live="polite">
        <span className="text-[11px] font-bold text-gold font-heading block">{stage.label}</span>
        <p className="text-xs text-text-secondary leading-relaxed">{stage.note}</p>
      </div>

      {/* Tahapan: bisa diketuk satu per satu */}
      <ol className="flex flex-wrap gap-1.5">
        {anim.stages.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === stageIdx ? 'step' : undefined}
              className={`px-2 py-1 rounded-lg border text-[11px] font-heading font-bold transition-colors ${
                i === stageIdx
                  ? 'bg-kotoba/15 border-kotoba/50 text-kotoba'
                  : i < stageIdx
                    ? 'bg-surface-card border-border-subtle text-text-secondary'
                    : 'bg-surface-card border-border-subtle text-text-muted'
              }`}
            >
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      {/* Kontrol */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => goTo(stageIdx - 1)}
          disabled={stageIdx === 0}
          aria-label="Tahap sebelumnya"
          className="p-2 rounded-lg bg-surface-card border border-border-subtle text-text-secondary disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap rounded-lg bg-gold/15 border border-gold/50 text-gold text-xs font-bold font-heading"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? 'Jeda' : stageIdx === 0 ? 'Mulai' : stageIdx >= lastIdx ? 'Putar lagi' : 'Lanjutkan'}
        </button>
        <button
          type="button"
          onClick={replay}
          aria-label="Ulangi animasi"
          className="p-2 rounded-lg bg-surface-card border border-border-subtle text-text-secondary"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => goTo(stageIdx + 1)}
          disabled={stageIdx >= lastIdx}
          aria-label="Tahap berikutnya"
          className="p-2 rounded-lg bg-surface-card border border-border-subtle text-text-secondary disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {isResult && (
          <button
            type="button"
            onClick={() => speakJapanese(anim.result.japanese)}
            aria-label="Dengarkan"
            className="p-2 rounded-lg bg-surface-card border border-border-subtle text-text-secondary"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
