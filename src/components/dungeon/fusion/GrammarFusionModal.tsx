import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Lightbulb, RotateCcw, Check, ChevronRight, Wind, Trophy, ArrowRight } from 'lucide-react';
import { FUSION_STAGES } from '../../../data/fusion/stages';
import { createFusionState, fusionReducer, previewSelection } from '../../../engine/fusion/fusionEngine';
import { FUSION_FORM_LABEL, getRule } from '../../../engine/fusion/rules';
import { loadFusionProgress, recordFusionClear, saveFusionProgress, type FusionProgress } from '../../../engine/fusion/progress';
import type { FusionAnimationPhase, FusionBaseWord, FusionRuleId, FusionStage } from '../../../engine/fusion/types';
import { playSound } from '../../../utils/audio';
import { FusionWordBoard } from './FusionWordBoard';

interface Props {
  onClose: () => void;
  soundEnabled?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
}

/** Durasi tiap fase (ms); total ±1000 ms. */
const PHASES: { phase: FusionAnimationPhase; ms: number }[] = [
  { phase: 'approach', ms: 260 },
  { phase: 'absorb', ms: 200 },
  { phase: 'morph', ms: 220 },
  { phase: 'reveal', ms: 200 },
  { phase: 'settle', ms: 120 },
];
const REPEAT_REWARD_RATIO = 0.4;
const MOTION_KEY = 'nq_fusion_reduce_motion';

function readReduceMotion(): boolean {
  try {
    const saved = window.localStorage.getItem(MOTION_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch { /* abaikan */ }
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';

interface RewardOut { exp: number; gold: number; firstClear: boolean }

interface PlayerProps {
  stage: FusionStage;
  baseWord: FusionBaseWord;
  soundEnabled: boolean;
  reduceMotion: boolean;
  hasNext: boolean;
  onFinished: (mistakes: number, hints: number, exp: number, gold: number) => RewardOut;
  onReplay: () => void;
  onNext: () => void;
  onClose: () => void;
}

const FusionPlayer: React.FC<PlayerProps> = ({ stage, baseWord, soundEnabled, reduceMotion, hasNext, onFinished, onReplay, onNext, onClose }) => {
  const [state, dispatch] = useReducer(fusionReducer, undefined, () => createFusionState(stage, baseWord));
  const [flight, setFlight] = useState<{ dx: number; dy: number; label: string } | null>(null);
  const [reward, setReward] = useState<RewardOut | null>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Partial<Record<FusionRuleId, HTMLButtonElement | null>>>({});
  const rewardedRef = useRef(false);

  const click = () => playSound('click', soundEnabled);
  const busy = state.animationState !== 'idle';
  const lastEntry = state.transformationHistory[state.transformationHistory.length - 1] ?? null;
  const step = state.stage.steps[Math.min(state.currentStep, state.stage.steps.length - 1)];
  const preview = previewSelection(state);

  // Penggerak animasi: hanya memajukan fase; grammar sudah final di reducer.
  // Dipicu sekali per transformasi (panjang history). reduceMotion dibaca lewat ref agar
  // pergantian fase atau toggle di tengah animasi tidak membatalkan timer dan mengunci input.
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const historyLen = state.transformationHistory.length;
  useEffect(() => {
    if (historyLen === 0) return;
    const finish = () => { dispatch({ type: 'ANIMATION_DONE' }); setFlight(null); };
    if (reduceRef.current) {
      const t = window.setTimeout(finish, 0);
      return () => window.clearTimeout(t);
    }
    const timers: number[] = [];
    let at = 0;
    PHASES.forEach(({ phase, ms }, i) => {
      if (i > 0) timers.push(window.setTimeout(() => dispatch({ type: 'ANIMATION_PHASE', phase }), at));
      at += ms;
    });
    timers.push(window.setTimeout(finish, at));
    return () => timers.forEach(window.clearTimeout);
  }, [historyLen]);

  // Hadiah diberikan sekali, setelah animasi hasil akhir selesai.
  useEffect(() => {
    if (state.completed && !busy && !rewardedRef.current) {
      rewardedRef.current = true;
      playSound('fanfare', soundEnabled);
      setReward(onFinished(state.mistakes, state.hintsUsed, state.score.exp, state.score.gold));
    }
  }, [state.completed, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id: FusionRuleId) => {
    if (busy || state.completed) return;
    click();
    dispatch({ type: 'SELECT', ruleId: id });
  };

  const handleCheck = () => {
    if (busy || state.completed || !state.selectedComponent) return;
    const isRight = state.selectedComponent === step.ruleId;
    playSound(isRight ? 'correct' : 'wrong', soundEnabled);
    if (isRight && !reduceMotion) {
      const btn = btnRefs.current[state.selectedComponent];
      const w = wordRef.current;
      if (btn && w) {
        const b = btn.getBoundingClientRect();
        const r = w.getBoundingClientRect();
        setFlight({
          dx: b.left + b.width / 2 - (r.left + r.width / 2),
          dy: b.top + b.height / 2 - (r.top + r.height / 2),
          label: getRule(state.selectedComponent).label,
        });
      }
    }
    dispatch({ type: 'CHECK' });
  };

  const fb = state.feedbackState;
  const showBoardReward = state.completed && !busy;

  const stepper = (
    <ol className="flex lg:flex-col gap-2" aria-label="Langkah transformasi">
      {state.stage.steps.map((s, i) => {
        const done = i < state.currentStep;
        const active = i === state.currentStep && !state.completed;
        const rule = getRule(s.ruleId);
        return (
          <li
            key={i}
            aria-current={active ? 'step' : undefined}
            className={`flex-1 lg:flex-none flex items-center gap-2 p-2 rounded-xl border text-xs ${
              done ? 'bg-state-success/15 border-state-success' : active ? 'bg-gold/15 border-gold' : 'bg-surface-inset border-border-subtle opacity-70'
            }`}
          >
            <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-mono font-bold text-[11px] border ${done ? 'bg-state-success text-white border-state-success' : 'border-border-subtle'}`}>
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block font-heading font-black text-text-primary truncate">+ {rule.label}</span>
              <span className="hidden lg:block text-text-secondary leading-snug">{s.instruction}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_280px] lg:h-full lg:min-h-0">
      {/* KIRI / ATAS: target + langkah */}
      <section className="space-y-2 lg:overflow-y-auto" aria-label="Target dan langkah">
        <div className={`${card} flex lg:block items-center justify-between gap-2`}>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Target</div>
            <div className="font-heading font-black text-gold text-lg leading-tight">{state.stage.target.pattern}</div>
          </div>
          <div className="text-xs text-text-secondary lg:mt-1 text-right lg:text-left">{state.stage.target.meaning}</div>
        </div>
        {stepper}
        {!state.completed && (
          <div className={`${card} text-sm hidden lg:block`}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Instruksi</div>
            <div className="font-body text-text-primary">{step.instruction}</div>
          </div>
        )}
      </section>

      {/* TENGAH: papan fusion + komponen + aksi */}
      <section className="flex flex-col gap-3 min-w-0 lg:min-h-0 lg:overflow-y-auto">
        <div className="panel rounded-3xl border border-border-subtle bg-surface-inset relative overflow-hidden">
          <div className="absolute top-2 left-3 text-[11px] font-mono text-text-muted">
            {baseWord.japanese} · {baseWord.meaning}
          </div>
          <FusionWordBoard
            word={state.currentWord}
            form={state.currentForm}
            animating={busy ? lastEntry : null}
            phase={state.animationState}
            reduceMotion={reduceMotion}
            flight={flight}
            wordRef={wordRef}
          />
          {/* Pratinjau pilihan (kata belum berubah sampai Cek Jawaban) */}
          <div className="min-h-[1.75rem] pb-2 text-center text-xs sm:text-sm text-text-secondary font-body" aria-live="polite">
            {!state.completed && !busy && (state.selectedComponent && preview ? (
              <span>
                {state.currentWord.japanese} + <b className="text-gold">{getRule(state.selectedComponent).label}</b> → ?
              </span>
            ) : (
              <span className="lg:hidden">{step.instruction}</span>
            ))}
          </div>
        </div>

        {/* Banner feedback: salah (dengan alasan) / petunjuk / benar singkat */}
        <div aria-live="polite" className="lg:min-h-[3rem]">
          {fb && !(fb.kind === 'correct' && busy) && (
            <div
              className={`p-3 rounded-2xl border text-sm font-body ${
                fb.kind === 'wrong'
                  ? 'bg-state-danger/15 border-state-danger text-text-primary'
                  : fb.kind === 'hint'
                    ? 'bg-gold/15 border-gold text-text-primary'
                    : 'bg-state-success/15 border-state-success text-text-primary'
              }`}
            >
              {fb.kind === 'correct' ? <span className="font-bold">Benar! {lastEntry?.from.japanese} → {lastEntry?.to.japanese}</span> : fb.message}
            </div>
          )}
        </div>

        {showBoardReward ? (
          <div className={`${card} text-center space-y-3`}>
            <Trophy className="w-8 h-8 text-gold mx-auto" />
            <div className="font-heading font-black text-lg text-text-primary">
              {state.currentWord.japanese} — Tolong jangan {baseWord.meaning}
            </div>
            <div className="text-sm font-mono text-gold">
              +{reward?.exp ?? state.score.exp} EXP · +{reward?.gold ?? state.score.gold} Gold
              {reward && !reward.firstClear && <span className="text-text-muted"> (ulangan {Math.round(REPEAT_REWARD_RATIO * 100)}%)</span>}
            </div>
            <div className="text-xs text-text-secondary">Kesalahan {state.mistakes} · Petunjuk {state.hintsUsed}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => { click(); onReplay(); }} className="btn-physical-secondary flex-1 px-4 py-3 rounded-2xl text-sm font-bold cursor-pointer">Ulangi (kata baru)</button>
              {hasNext ? (
                <button type="button" onClick={() => { click(); onNext(); }} className="btn-cta flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-heading font-black text-sm cursor-pointer">
                  <span>Stage berikutnya</span><ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={() => { click(); onClose(); }} className="btn-cta flex-1 px-4 py-3 rounded-2xl font-heading font-black text-sm cursor-pointer">Selesai</button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div role="group" aria-label="Komponen grammar" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {state.availableComponents.map(id => {
                const r = getRule(id);
                const selected = state.selectedComponent === id;
                const hinted = state.hintedComponent === id;
                return (
                  <button
                    key={id}
                    ref={el => { btnRefs.current[id] = el; }}
                    type="button"
                    disabled={busy || state.completed}
                    aria-pressed={selected}
                    onClick={() => handleSelect(id)}
                    className={`min-h-[56px] px-2 py-2 rounded-2xl border text-center transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected ? 'bg-gold/25 border-gold shadow-md -translate-y-0.5' : 'bg-surface-card border-border-subtle hover:border-border-primary'
                    } ${hinted ? 'ring-2 ring-gold' : ''}`}
                  >
                    <span className="block font-heading font-black text-text-primary text-base">{r.label}</span>
                    <span className="block text-[11px] font-mono text-text-muted">{r.hint}</span>
                  </button>
                );
              })}
            </div>

            {/* Aksi: menempel di bawah pada HP agar terjangkau ibu jari */}
            <div className="sticky bottom-0 lg:static -mx-3 px-3 pb-2 pt-2 lg:m-0 lg:p-0 bg-surface-card/95 lg:bg-transparent backdrop-blur flex items-center gap-2 border-t border-border-subtle lg:border-0">
              <button
                type="button"
                onClick={handleCheck}
                disabled={!state.selectedComponent || busy}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-heading font-black text-sm select-none ${
                  state.selectedComponent && !busy ? 'btn-cta cursor-pointer' : 'bg-surface-inset text-text-muted border border-border-subtle opacity-60 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Cek Jawaban</span>
              </button>
              <button type="button" aria-label="Petunjuk" disabled={busy} onClick={() => { click(); dispatch({ type: 'HINT' }); }} className="btn-physical-secondary w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer p-0 disabled:opacity-50">
                <Lightbulb className="w-5 h-5" />
              </button>
              <button type="button" aria-label="Ulang dari awal" disabled={busy} onClick={() => { click(); dispatch({ type: 'RESET' }); setFlight(null); }} className="btn-physical-secondary w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer p-0 disabled:opacity-50">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </section>

      {/* KANAN / BAWAH: penjelasan + riwayat */}
      <section className="space-y-2 lg:overflow-y-auto" aria-label="Penjelasan dan progres">
        <div className={`${card} flex items-center justify-between text-xs font-mono text-text-secondary`}>
          <span>Langkah {Math.min(state.currentStep + (state.completed ? 0 : 1), state.stage.steps.length)}/{state.stage.steps.length}</span>
          <span>Salah {state.mistakes} · Hint {state.hintsUsed}</span>
        </div>

        {lastEntry && !busy ? (
          <div className={`${card} space-y-1.5`}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Perubahan terakhir</div>
            <div className="font-heading font-black text-text-primary flex flex-wrap items-center gap-1.5" lang="ja">
              <span>{lastEntry.from.japanese}</span><ArrowRight className="w-4 h-4 text-gold" /><span>{lastEntry.to.japanese}</span>
            </div>
            <div className="text-[11px] font-mono text-gold">{FUSION_FORM_LABEL[lastEntry.toForm]}</div>
            <p className="text-sm text-text-secondary font-body leading-relaxed">{lastEntry.explanation}</p>
            <p className="text-xs text-text-muted">Arti: {state.stage.steps[lastEntry.stepIndex].resultMeaning}</p>
          </div>
        ) : (
          <div className={`${card} text-sm text-text-secondary`}>Pilih komponen, lalu tekan <b>Cek Jawaban</b> untuk melihat kata berubah.</div>
        )}

        {state.completed && !busy && (
          <div className={`${card} text-sm text-text-secondary font-body leading-relaxed`}>{state.stage.target.explanation}</div>
        )}

        {state.transformationHistory.length - (busy ? 1 : 0) > 0 && (
          <ul className={`${card} space-y-1 text-sm`} aria-label="Riwayat transformasi" lang="ja">
            {state.transformationHistory.slice(0, state.transformationHistory.length - (busy ? 1 : 0)).map(h => (
              <li key={h.stepIndex} className="font-body text-text-primary">
                {h.from.japanese} <span className="text-gold">+ {h.componentLabel}</span> → <b>{h.to.japanese}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export const GrammarFusionModal: React.FC<Props> = ({ onClose, soundEnabled = true, onRewardPlayer }) => {
  const [progress, setProgress] = useState<FusionProgress>(() => loadFusionProgress());
  const [stageIndex, setStageIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(readReduceMotion);
  const stage = FUSION_STAGES[stageIndex];
  // Kata dasar dipilih sekali per percobaan (runId), bukan tiap render.
  const baseWord = React.useMemo(() => stage.words[Math.floor(Math.random() * stage.words.length)], [stage, runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinished = useCallback((mistakes: number, hints: number, exp: number, gold: number): RewardOut => {
    const { progress: next, firstClear } = recordFusionClear(progress, stage.id, mistakes, hints);
    setProgress(next);
    saveFusionProgress(next);
    const ratio = firstClear ? 1 : REPEAT_REWARD_RATIO;
    const out = { exp: Math.round(exp * ratio), gold: Math.round(gold * ratio), firstClear };
    onRewardPlayer?.(out.exp, out.gold);
    return out;
  }, [progress, stage.id, onRewardPlayer]);

  const toggleMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    try { window.localStorage.setItem(MOTION_KEY, next ? '1' : '0'); } catch { /* abaikan */ }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-3 bg-black/85">
      <div role="dialog" aria-modal="true" aria-label="Bunpou Dungeon: Grammar Fusion" className="panel panel-stitched relative w-full max-w-[1280px] h-[100dvh] sm:h-[96dvh] sm:max-h-[1000px] flex flex-col border border-border-subtle sm:rounded-3xl shadow-2xl overflow-hidden bg-surface-card animate-scale-up">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-text-primary truncate">Bunpou Dungeon: Grammar Fusion</h3>
              <p className="text-[11px] text-text-secondary truncate">{stage.jlpt} · {stage.title}{progress.cleared[stage.id] ? ' · ✓ selesai' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" aria-pressed={reduceMotion} aria-label="Kurangi gerak" title="Kurangi gerak" onClick={toggleMotion} className={`btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer p-0 ${reduceMotion ? 'text-gold' : ''}`}>
              <Wind className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Tutup" onClick={() => { playSound('click', soundEnabled); onClose(); }} className="btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer p-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-3 sm:p-4">
          <FusionPlayer
            key={`${stage.id}:${runId}`}
            stage={stage}
            baseWord={baseWord}
            soundEnabled={soundEnabled}
            reduceMotion={reduceMotion}
            hasNext={stageIndex + 1 < FUSION_STAGES.length}
            onFinished={handleFinished}
            onReplay={() => setRunId(r => r + 1)}
            onNext={() => { setStageIndex(i => i + 1); setRunId(r => r + 1); }}
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
