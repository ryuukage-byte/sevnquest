import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Clapperboard } from 'lucide-react';
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
import { PLUM_BORDER, PLUM_ICON, PLUM_SOFT_BG, PLUM_TEXT, RolePill, SHEET_CARD, SectionTitle } from './bunpouSheetUi';

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
  suffix: PLUM_TEXT,
  partner: 'text-choukai',
  prefix: PLUM_TEXT,
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

  const chip = (selected: boolean, accent: 'plum' | 'gold' | 'partner' = 'plum') =>
    `px-2.5 py-1 rounded-lg border text-xs font-jp shadow-xs transition-colors cursor-pointer ${
      !selected
        ? 'bg-surface-inset border-border-subtle text-text-secondary font-medium hover:text-text-primary'
        : accent === 'gold'
          ? 'bg-gold/15 border-gold/50 text-gold font-bold'
          : accent === 'partner'
            ? 'bg-choukai/15 border-choukai/50 text-choukai font-bold'
            : `${PLUM_SOFT_BG} ${PLUM_BORDER} ${PLUM_TEXT} font-bold`
    }`;

  return (
    <div className={`${SHEET_CARD} space-y-3`}>
      <SectionTitle
        icon={<Clapperboard className={`w-3.5 h-3.5 ${PLUM_ICON}`} />}
        aside={
          <span className="text-[10px] font-mono text-text-muted">
            tahap {stageIdx + 1}/{anim.stages.length}
          </span>
        }
      >
        Animasi Pembentukan
      </SectionTitle>

      {recipe.verbBranchOnly && (
        <p className="text-[11px] text-text-muted leading-relaxed">
          Animasi ini menunjukkan sambungan dengan kata kerja. Sambungan kata benda/sifat ada di rumus di bawah.
        </p>
      )}

      {/* Pemilih: bentuk pola, kata kerja per golongan, verba kedua */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-surface-card border border-border-subtle space-y-2">
        {recipe.branches.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Pilih bentuk pola">
            <RolePill className="w-[3.75rem] text-center">Bentuk</RolePill>
            {recipe.branches.map((br, i) => (
              <button
                key={br.label}
                type="button"
                role="radio"
                aria-checked={i === branchIdx}
                onClick={() => pickBranch(i)}
                className={chip(i === branchIdx, 'gold')}
              >
                {br.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1.5" role="radiogroup" aria-label="Pilih kata kerja">
          {verbGroups.map(g => (
            <div key={g.category} className="flex flex-wrap items-center gap-1.5">
              <RolePill className="w-[3.75rem] text-center">{CATEGORY_LABEL[g.category]}</RolePill>
              {g.verbs.map(v => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === verb.id}
                  onClick={() => pickVerb(v.id)}
                  className={chip(v.id === verb.id)}
                >
                  {v.kanji}
                </button>
              ))}
            </div>
          ))}
        </div>

        {pickablePartner && (
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Pilih verba kedua">
            <RolePill className="text-center">Verba kedua</RolePill>
            {PARTNER_VERBS.map(v => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === partner.id}
                onClick={() => pickPartner(v.id)}
                className={chip(v.id === partner.id, 'partner')}
              >
                {v.kanji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panggung */}
      <div className="rounded-xl bg-surface-card border border-border-subtle px-3 py-4 min-h-[6.5rem] flex flex-col items-center justify-center text-center">
        <motion.div
          key={`${branchIdx}-${verb.id}-${partner.id}-${stageIdx}`}
          className={`font-black font-jp tracking-wide leading-snug ${
            textLength > 6 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[1.7rem]'
          } ${isResult ? PLUM_TEXT : 'text-text-primary'}`}
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
          <div className="mt-1 flex items-center gap-1 text-[11px] font-jp text-text-muted">
            <span>{isResult ? `${anim.result.reading} · ${anim.result.romaji}` : verb.reading}</span>
            {isResult && (
              <button
                type="button"
                onClick={() => speakJapanese(anim.result.japanese)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors cursor-pointer"
                title="Dengarkan pelafalan kalimat"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Penjelasan tahap: sebaris seperti arti komponen di Bedah Komponen */}
      <div className="flex items-start gap-2.5 p-2 rounded-xl border border-border-subtle bg-surface-card" aria-live="polite">
        <span
          className={`w-6 h-6 shrink-0 rounded-full ${PLUM_SOFT_BG} ${PLUM_TEXT} font-mono font-bold text-[11px] flex items-center justify-center`}
        >
          {stageIdx + 1}
        </span>
        <span className="min-w-0 space-y-0.5">
          <RolePill>{stage.label}</RolePill>
          <span className="block text-xs text-text-secondary leading-snug">{stage.note}</span>
        </span>
      </div>

      {/* Tahapan: bisa diketuk satu per satu */}
      <ol className="flex items-center px-1" aria-label="Tahapan pembentukan">
        {anim.stages.map((s, i) => (
          <li key={i} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
            {i > 0 && (
              <span
                className={`flex-1 h-0.5 mx-1 rounded-full ${i <= stageIdx ? 'bg-[#7d6b9e] dark:bg-[#b7a3dc]' : 'bg-border-subtle'}`}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === stageIdx ? 'step' : undefined}
              aria-label={`Tahap ${i + 1}: ${s.label}`}
              title={s.label}
              className={`w-6 h-6 shrink-0 rounded-full border text-[10.5px] font-mono font-bold flex items-center justify-center transition-colors cursor-pointer ${
                i === stageIdx
                  ? 'bg-[#7d6b9e] dark:bg-[#b7a3dc] border-transparent text-white dark:text-[#231c2f]'
                  : i < stageIdx
                    ? `${PLUM_SOFT_BG} ${PLUM_BORDER} ${PLUM_TEXT}`
                    : 'bg-surface-card border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              {i + 1}
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
