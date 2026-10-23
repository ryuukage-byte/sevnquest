import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Clapperboard, ArrowRight } from 'lucide-react';
import {
  PARTNER_VERBS,
  buildGrammarAnimation,
  getRecipeVerbs,
  type GrammarAnimationRecipe,
  type GrammarAnimationStage,
  type GrammarSegmentRole,
  type GrammarVerbCategory,
} from '../../data/grammarAnimations';
import { speakJapanese, playSound } from '../../utils/audio';

interface GrammarAnimationProps {
  recipe: GrammarAnimationRecipe;
  soundEnabled?: boolean;
}

const AUTOPLAY_MS = 1600;

const SEGMENT_CLASS: Record<GrammarSegmentRole, string> = {
  stem: 'text-text-primary',
  ending: 'text-text-primary underline decoration-dotted decoration-state-danger underline-offset-8',
  removed: 'text-state-danger',
  added: 'text-state-success',
  changed: 'text-gold',
  suffix: 'text-indigo',
  partner: 'text-choukai',
  prefix: 'text-indigo',
};

const CATEGORY_LABEL: Record<GrammarVerbCategory, string> = {
  gol1: 'Gol. 1',
  gol2: 'Gol. 2',
  gol3: 'Gol. 3',
  khusus: 'Khusus',
};

/** Ketuk bagian kata → lompat ke tahap yang menjelaskan bagian itu. */
const SEGMENT_STAGE: Partial<Record<GrammarSegmentRole, GrammarAnimationStage['kind']>> = {
  ending: 'remove',
  removed: 'remove',
  added: 'add',
  suffix: 'suffix',
  changed: 'contract',
  partner: 'partner',
  prefix: 'prefix',
};

export const GrammarAnimation: React.FC<GrammarAnimationProps> = ({ recipe, soundEnabled = true }) => {
  const reduceMotion = useReducedMotion();
  const [branchIdx, setBranchIdx] = useState(0);
  const [partnerId, setPartnerId] = useState(PARTNER_VERBS[0].id);
  const [verbId, setVerbId] = useState(recipe.defaultVerbId);
  const [stageIdx, setStageIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  const verbs = useMemo(() => getRecipeVerbs(recipe, branchIdx), [recipe, branchIdx]);
  const verb = verbs.find(v => v.id === verbId) ?? verbs[0];
  const verbGroups = (Object.keys(CATEGORY_LABEL) as GrammarVerbCategory[])
    .map(category => ({ category, verbs: verbs.filter(v => v.category === category) }))
    .filter(g => g.verbs.length > 0);
  const partner = PARTNER_VERBS.find(v => v.id === partnerId) ?? PARTNER_VERBS[0];
  // Pemilih verba kedua hanya untuk pola dua verba yang berbeda (たり〜たり, つ〜つ, …).
  const pickablePartner = !!recipe.branches[branchIdx]?.partner && !recipe.branches[branchIdx].partner!.same;
  const anim = useMemo(() => buildGrammarAnimation(recipe, verb, branchIdx, partner), [recipe, verb, branchIdx, partner]);
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

  const pickPartner = (id: string) => {
    playSound('click', soundEnabled);
    setPartnerId(id);
    setStageIdx(0);
    setPlaying(false);
  };

  const pickBranch = (idx: number) => {
    playSound('click', soundEnabled);
    setBranchIdx(idx);
    setStageIdx(0);
    setPlaying(false);
  };

  const onSegmentClick = (role: GrammarSegmentRole) => {
    const kind = SEGMENT_STAGE[role];
    // Akhiran verba bisa "dibuang" (Golongan 2) atau "diganti" sebaris (Golongan 1); bagian yang berubah
    // bisa berasal dari penggantian itu, perubahan sebelum akhiran, atau kontraksi.
    const idx = role === 'changed'
      ? anim.stages.findIndex(s => s.kind === 'shift' || s.kind === 'change' || s.kind === 'contract')
      : role === 'ending' || role === 'removed'
        ? anim.stages.findIndex(s => s.kind === 'remove' || s.kind === 'shift')
        : kind ? anim.stages.findIndex(s => s.kind === kind) : -1;
    if (idx >= 0) goTo(idx);
  };

  const enter = (role: GrammarSegmentRole) => {
    if (reduceMotion || role === 'stem') return false;
    if (role === 'added') return { opacity: 0, y: -12 };
    if (role === 'suffix' || role === 'partner') return { opacity: 0, x: 28 };
    if (role === 'prefix') return { opacity: 0, x: -28 };
    if (role === 'removed') return { opacity: 1 };
    if (role === 'changed') return { opacity: 0, scale: 0.6 };
    return { opacity: 0 };
  };

  const textLength = stage.segments.reduce((n, s) => n + s.text.length, 0);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-text-primary font-heading font-bold text-xs uppercase tracking-wider">
          <Clapperboard className="w-3.5 h-3.5 text-indigo" />
          <span>Animasi Pembentukan</span>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          {stageIdx + 1}/{anim.stages.length}
        </span>
      </div>

      {recipe.verbBranchOnly && (
        <p className="text-[11px] text-text-muted leading-relaxed font-sans">
          Animasi ini menunjukkan sambungan dengan kata kerja. Sambungan kata benda/sifat ada di rumus di bawah.
        </p>
      )}

      {/* Pilihan cabang: pola dengan beberapa cara membentuk (Vる／Vない, formal／kontraksi) */}
      {recipe.branches.length > 1 && (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Pilih bentuk pola">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading mr-0.5">Bentuk</span>
          {recipe.branches.map((br, i) => (
            <button
              key={br.label}
              type="button"
              role="radio"
              aria-checked={i === branchIdx}
              onClick={() => pickBranch(i)}
              className={`px-2 py-0.5 rounded-md border border-border-subtle text-[11px] font-jp shadow-xs transition-colors cursor-pointer ${
                i === branchIdx
                  ? 'bg-gold/15 text-gold font-bold'
                  : 'bg-surface-card text-text-secondary font-medium hover:text-text-primary'
              }`}
            >
              {br.label}
            </button>
          ))}
        </div>
      )}

      {/* Pilihan verba: per golongan + verba khusus pola ini */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" role="radiogroup" aria-label="Pilih kata kerja">
        {verbGroups.map(g => (
          <div key={g.category} className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading">
              {CATEGORY_LABEL[g.category]}
            </span>
            {g.verbs.map(v => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === verb.id}
                onClick={() => pickVerb(v.id)}
                className={`px-2 py-0.5 rounded-md border border-border-subtle text-[11px] font-jp shadow-xs transition-colors cursor-pointer ${
                  v.id === verb.id
                    ? 'bg-indigo/20 text-indigo font-bold'
                    : 'bg-surface-card text-text-secondary font-medium hover:text-text-primary'
                }`}
              >
                {v.kanji}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Pilihan verba kedua (pola dua verba yang berbeda) */}
      {pickablePartner && (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Pilih verba kedua">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading mr-0.5">Verba kedua</span>
          {PARTNER_VERBS.map(v => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === partner.id}
              onClick={() => pickPartner(v.id)}
              className={`px-2 py-0.5 rounded-md border border-border-subtle text-[11px] font-jp shadow-xs transition-colors cursor-pointer ${
                v.id === partner.id
                  ? 'bg-choukai/20 text-choukai font-bold'
                  : 'bg-surface-card text-text-secondary font-medium hover:text-text-primary'
              }`}
            >
              {v.kanji}
            </button>
          ))}
        </div>
      )}

      {/* Panggung */}
      <div className="rounded-xl bg-surface-card border border-border-subtle px-3 py-4 min-h-[6.5rem] flex flex-col items-center justify-center text-center">
        <motion.div
          key={`${branchIdx}-${verb.id}-${partner.id}-${stageIdx}`}
          className={`font-bold font-jp tracking-wide leading-snug ${
            textLength > 6 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          } ${isResult ? 'text-indigo' : ''}`}
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
                  animate={s.role === 'removed' ? { opacity: 0.35, y: reduceMotion ? 0 : 6, scale: reduceMotion ? 1 : 0.85 } : { opacity: 1, x: 0, y: 0, scale: 1 }}
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
          <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-text-muted">
            <span>{isResult ? `${anim.result.reading} · ${anim.result.romaji}` : verb.reading}</span>
            {isResult && (
              <button
                type="button"
                onClick={() => speakJapanese(anim.result.japanese)}
                className="p-1 rounded-lg text-text-muted hover:text-indigo hover:bg-surface-inset transition-colors cursor-pointer"
                title="Dengarkan pelafalan kalimat"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Penjelasan tahap */}
      <div className="space-y-0.5" aria-live="polite">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted font-heading">{stage.label}</span>
        <p className="text-xs text-text-secondary leading-relaxed font-sans">{stage.note}</p>
      </div>

      {/* Tahapan: bisa diketuk satu per satu */}
      <ol className="p-2 sm:p-2.5 rounded-xl bg-surface-card border border-border-subtle flex flex-wrap items-center gap-1.5 text-[11px]">
        {anim.stages.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight className="w-3 h-3 text-text-muted" />}
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === stageIdx ? 'step' : undefined}
              className={`px-2 py-0.5 rounded-md font-jp transition-colors cursor-pointer ${
                i === stageIdx
                  ? 'bg-indigo/20 text-indigo border border-border-subtle font-bold'
                  : 'bg-surface-inset text-text-secondary font-medium hover:text-text-primary'
              }`}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {/* Kontrol */}
      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => goTo(stageIdx - 1)}
          disabled={stageIdx === 0}
          aria-label="Tahap sebelumnya"
          className="btn-physical-secondary p-1.5 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="btn-physical-primary text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 font-heading font-bold whitespace-nowrap cursor-pointer"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {playing ? 'Jeda' : stageIdx === 0 ? 'Mulai' : stageIdx >= lastIdx ? 'Putar lagi' : 'Lanjutkan'}
        </button>
        <button
          type="button"
          onClick={replay}
          aria-label="Ulangi animasi"
          className="btn-physical-secondary p-1.5 rounded-xl cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => goTo(stageIdx + 1)}
          disabled={stageIdx >= lastIdx}
          aria-label="Tahap berikutnya"
          className="btn-physical-secondary p-1.5 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
