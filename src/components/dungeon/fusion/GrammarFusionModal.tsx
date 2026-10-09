import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Swords, Lightbulb, RotateCcw, Check, Wind, Trophy, ArrowRight, Shuffle, Dices } from 'lucide-react';
import { createFusionState, fusionReducer } from '../../../engine/fusion/fusionEngine';
import { formLabel, getRule } from '../../../engine/fusion/rules';
import { buildFreeStage } from '../../../engine/fusion/freeStage';
import { getFusionPatterns, getFusionVerbs, type FusionVerbEntry } from '../../../data/fusion/verbPool';
import type { GrammarPatternSchema } from '../../../engine/types';
import type { FusionAnimationPhase, FusionBaseWord, FusionRuleId, FusionStage } from '../../../engine/fusion/types';
import { playSound } from '../../../utils/audio';
import { FusionWordBoard } from './FusionWordBoard';
import { FusionPickerDialog } from './FusionPickerDialog';

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

interface RewardOut { exp: number; gold: number; note?: string }

export interface EndAction { label: string; onClick: () => void; primary?: boolean }

interface PlayerProps {
  stage: FusionStage;
  baseWord: FusionBaseWord;
  soundEnabled: boolean;
  reduceMotion: boolean;
  onFinished: (mistakes: number, hints: number, exp: number, gold: number) => RewardOut;
  endActions: EndAction[];
  onPickPattern: () => void;
  onPickVerb: () => void;
}

const FusionPlayer: React.FC<PlayerProps> = ({ stage, baseWord, soundEnabled, reduceMotion, onFinished, endActions, onPickPattern, onPickVerb }) => {
  const [state, dispatch] = useReducer(fusionReducer, undefined, () => createFusionState(stage, baseWord));
  const [flight, setFlight] = useState<{ dx: number; dy: number; label: string } | null>(null);
  const [reward, setReward] = useState<RewardOut | null>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: FusionRuleId; x: number; y: number; over: boolean } | null>(null);
  const [dropTip, setDropTip] = useState<string | null>(null);
  const stopDragRef = useRef<(() => void) | null>(null);
  const rewardedRef = useRef(false);

  const click = () => playSound('click', soundEnabled);
  const busy = state.animationState !== 'idle';
  const lastEntry = state.transformationHistory[state.transformationHistory.length - 1] ?? null;
  const step = state.stage.steps[Math.min(state.currentStep, state.stage.steps.length - 1)];

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

  // Drag and drop berbasis pointer events: satu jalur untuk mouse, sentuhan, dan pena.
  useEffect(() => () => stopDragRef.current?.(), []);

  const isOverBoard = (x: number, y: number) => {
    const r = boardRef.current?.getBoundingClientRect();
    const pad = 12;
    return !!r && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };

  const startDrag = (e: React.PointerEvent, id: FusionRuleId) => {
    if (busy || state.completed || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    stopDragRef.current?.();
    click();
    setDropTip(null);
    setDrag({ id, x: e.clientX, y: e.clientY, over: isOverBoard(e.clientX, e.clientY) });
    const move = (ev: PointerEvent) => setDrag({ id, x: ev.clientX, y: ev.clientY, over: isOverBoard(ev.clientX, ev.clientY) });
    const end = (ev: PointerEvent) => {
      stop();
      if (ev.type === 'pointerup' && isOverBoard(ev.clientX, ev.clientY)) handleDrop(id, ev.clientX, ev.clientY);
      else if (ev.type === 'pointerup') setDropTip('Lepaskan komponen di atas kartu kata untuk menggabungkannya.');
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      stopDragRef.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    stopDragRef.current = stop;
  };

  const handleDrop = (id: FusionRuleId, x?: number, y?: number) => {
    if (busy || state.completed) return;
    const isRight = id === step.ruleId;
    playSound(isRight ? 'correct' : 'wrong', soundEnabled);
    const w = wordRef.current;
    if (isRight && !reduceMotion && w && x !== undefined && y !== undefined) {
      const r = w.getBoundingClientRect();
      setFlight({ dx: x - (r.left + r.width / 2), dy: y - (r.top + r.height / 2), label: getRule(id, state.stage).label });
    }
    setDropTip(null);
    dispatch({ type: 'DROP', ruleId: id });
  };

  const fb = state.feedbackState;
  const showBoardReward = state.completed && !busy;

  const stepper = (
    <ol className="flex lg:flex-col gap-2" aria-label="Langkah transformasi">
      {state.stage.steps.map((s, i) => {
        const done = i < state.currentStep;
        const active = i === state.currentStep && !state.completed;
        const rule = getRule(s.ruleId, state.stage);
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
            <span className="min-w-0 flex-1">
              <span className="block font-heading font-black text-text-primary break-words">+ {rule.label}</span>
              <span className="hidden lg:block text-text-secondary leading-snug break-words">{s.instruction}</span>
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
        <button
          type="button"
          onClick={() => { click(); onPickPattern(); }}
          aria-label="Ganti pola grammar"
          title="Klik untuk mengganti pola"
          className={`${card} w-full text-left block cursor-pointer hover:border-gold transition-colors`}
        >
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Target</div>
            <div className="font-heading font-black text-gold text-lg leading-tight break-words">{state.stage.target.pattern}</div>
          </div>
          <div className="min-w-0 text-xs text-text-secondary mt-1 text-left break-words">{state.stage.target.meaning}</div>
          <div className="text-[10px] font-mono text-text-muted mt-1">Ketuk untuk ganti pola</div>
        </button>
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
        <div
          ref={boardRef}
          aria-label="Kartu kata: lepaskan komponen di sini"
          className={`panel rounded-3xl border bg-surface-inset relative overflow-hidden transition-colors ${
            drag?.over ? 'border-gold ring-4 ring-gold/40' : drag ? 'border-dashed border-gold/70' : 'border-border-subtle'
          }`}
        >
          <button
            type="button"
            onClick={() => { click(); onPickVerb(); }}
            aria-label="Ganti kotoba"
            className="absolute top-2 left-3 right-3 z-10 text-left truncate text-[11px] font-mono text-text-muted hover:text-gold cursor-pointer"
          >
            {baseWord.japanese} · {baseWord.meaning} (ganti)
          </button>
          <div
            role="button"
            tabIndex={0}
            aria-label="Klik kata untuk mengganti kotoba"
            title="Klik kata untuk mengganti kotoba"
            onClick={() => { if (!busy && !drag) { click(); onPickVerb(); } }}
            onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) { click(); onPickVerb(); } }}
            className="cursor-pointer"
          >
          <FusionWordBoard
            word={state.currentWord}
            form={state.currentForm}
            stage={state.stage}
            animating={busy ? lastEntry : null}
            phase={state.animationState}
            reduceMotion={reduceMotion}
            flight={flight}
            wordRef={wordRef}
          />
          </div>
          <div className="min-h-[1.75rem] pb-2 text-center text-xs sm:text-sm text-text-secondary font-body" aria-live="polite">
            {!state.completed && !busy && (
              drag
                ? <span>{state.currentWord.japanese} + <b className="text-gold">{getRule(drag.id, state.stage).label}</b> {drag.over ? '— lepas untuk menggabungkan' : '— seret ke kartu ini'}</span>
                : <span>{dropTip ?? 'Seret komponen dari bawah ke kartu ini, lalu lepaskan.'}</span>
            )}
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
            <div className="font-heading font-black text-base sm:text-lg text-text-primary break-words">
              {state.currentWord.japanese} — {state.stage.target.meaning.split('...').join(baseWord.meaning)}
            </div>
            <div className="text-sm font-mono text-gold">
              +{reward?.exp ?? state.score.exp} EXP · +{reward?.gold ?? state.score.gold} Gold
              {reward?.note && <span className="block text-[11px] text-text-muted font-body">{reward.note}</span>}
            </div>
            <div className="text-xs text-text-secondary">Kesalahan {state.mistakes} · Petunjuk {state.hintsUsed}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              {endActions.map(a => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => { click(); a.onClick(); }}
                  className={`flex-1 min-w-0 px-3 py-3 rounded-2xl text-sm break-words cursor-pointer ${a.primary ? 'btn-cta font-heading font-black' : 'btn-physical-secondary font-bold'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div role="group" aria-label="Komponen grammar" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {state.availableComponents.map(id => {
                const r = getRule(id, state.stage);
                const hinted = state.hintedComponent === id;
                const dragging = drag?.id === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy || state.completed}
                    aria-label={`${r.label}. Seret ke kartu kata; atau tekan Enter untuk menjatuhkannya.`}
                    onPointerDown={e => startDrag(e, id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); handleDrop(id); } }}
                    onClick={e => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                    className={`min-h-[56px] px-2 py-2 rounded-2xl border text-center transition-all select-none cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60 bg-surface-card border-border-subtle hover:border-border-primary ${
                      dragging ? 'opacity-40' : ''
                    } ${hinted ? 'ring-2 ring-gold' : ''}`}
                  >
                    <span className="block font-heading font-black text-text-primary text-sm sm:text-base break-words leading-tight">{r.label}</span>
                    <span className="block text-[11px] font-mono text-text-muted break-words">{r.hint}</span>
                  </button>
                );
              })}
            </div>

            {/* Aksi: menempel di bawah pada HP agar terjangkau ibu jari */}
            <div className="sticky bottom-0 lg:static -mx-3 px-3 pb-2 pt-2 lg:m-0 lg:p-0 bg-surface-card/95 lg:bg-transparent backdrop-blur flex items-center justify-end gap-2 border-t border-border-subtle lg:border-0">
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
            <div className="font-heading font-black text-text-primary flex flex-wrap items-center gap-1.5 break-all" lang="ja">
              <span>{lastEntry.from.japanese}</span><ArrowRight className="w-4 h-4 text-gold" /><span>{lastEntry.to.japanese}</span>
            </div>
            <div className="text-[11px] font-mono text-gold">{formLabel(lastEntry.toForm, state.stage)}</div>
            <p className="text-sm text-text-secondary font-body leading-relaxed break-words">{lastEntry.explanation}</p>
            <p className="text-xs text-text-muted">Arti: {state.stage.steps[lastEntry.stepIndex].resultMeaning}</p>
          </div>
        ) : (
          <div className={`${card} text-sm text-text-secondary`}>Seret komponen ke <b>kartu kata</b> lalu lepaskan. Kalau cocok, kata berubah; kalau tidak, komponen ditolak.</div>
        )}

        {state.completed && !busy && (
          <div className={`${card} text-sm text-text-secondary font-body leading-relaxed break-words`}>{state.stage.target.explanation}</div>
        )}

        {state.transformationHistory.length - (busy ? 1 : 0) > 0 && (
          <ul className={`${card} space-y-1 text-sm`} aria-label="Riwayat transformasi" lang="ja">
            {state.transformationHistory.slice(0, state.transformationHistory.length - (busy ? 1 : 0)).map(h => (
              <li key={h.stepIndex} className="font-body text-text-primary break-words">
                {h.from.japanese} <span className="text-gold">+ {h.componentLabel}</span> → <b>{h.to.japanese}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
      {drag && createPortal(
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 100 }}
          className={`px-4 py-3 rounded-2xl border-2 font-heading font-black text-base shadow-2xl ${drag.over ? 'bg-gold text-black border-gold scale-110' : 'bg-surface-card text-text-primary border-gold'}`}
        >
          {getRule(drag.id, state.stage).label}
        </div>,
        document.body
      )}
    </div>
  );
};

// Kombinasi (pola × kata) yang sudah memberi hadiah pada sesi halaman ini — mencegah farming.
const freeRewarded = new Set<string>();

const randomItem = <T,>(items: T[], not?: T): T => {
  const pool = items.length > 1 && not !== undefined ? items.filter(i => i !== not) : items;
  return pool[Math.floor(Math.random() * pool.length)];
};

/** Dungeon = sandbox engine: pola dan kotoba diacak lewat tombol, tidak ada stage. */
export const GrammarFusionModal: React.FC<Props> = ({ onClose, soundEnabled = true, onRewardPlayer }) => {
  const allVerbs = React.useMemo(() => getFusionVerbs(), []);
  const allPatterns = React.useMemo(() => getFusionPatterns(), []);
  const [runId, setRunId] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(readReduceMotion);
  const [pick, setPick] = useState(() => ({ verb: randomItem<FusionVerbEntry>(allVerbs), pattern: randomItem<GrammarPatternSchema>(allPatterns) }));
  const [picker, setPicker] = useState<'pattern' | 'verb' | null>(null);
  const click = () => playSound('click', soundEnabled);

  const stage = React.useMemo(
    () => buildFreeStage(pick.pattern, pick.verb, { allPatterns }),
    // runId ikut agar pengecoh diacak ulang saat "Ulangi".
    [pick, allPatterns, runId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleFinished = useCallback((_m: number, _h: number, exp: number, gold: number): RewardOut => {
    const key = `${pick.pattern.id}|${pick.verb.japanese}`;
    if (freeRewarded.has(key)) return { exp: 0, gold: 0, note: 'Kombinasi pola dan kata ini sudah memberi hadiah di sesi ini.' };
    freeRewarded.add(key);
    onRewardPlayer?.(exp, gold);
    return { exp, gold, note: 'Hadiah kombinasi baru.' };
  }, [pick, onRewardPlayer]);

  const shufflePattern = () => { click(); setPick(p => ({ ...p, pattern: randomItem(allPatterns, p.pattern) })); };
  const shuffleAll = () => { click(); setPick(p => ({ pattern: randomItem(allPatterns, p.pattern), verb: randomItem(allVerbs, p.verb) })); };
  const shuffleVerb = () => { click(); setPick(p => ({ ...p, verb: randomItem(allVerbs, p.verb) })); };

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

  const endActions: EndAction[] = [
    { label: 'Ulangi', onClick: () => setRunId(r => r + 1) },
    { label: 'Acak kotoba', onClick: () => setPick(p => ({ ...p, verb: randomItem(allVerbs, p.verb) })) },
    { label: 'Acak pola', primary: true, onClick: () => setPick(p => ({ ...p, pattern: randomItem(allPatterns, p.pattern) })) },
  ];

  const shuffleBtn = 'btn-physical-secondary flex items-center gap-1.5 whitespace-nowrap px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold cursor-pointer';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-3 bg-black/85">
      <div role="dialog" aria-modal="true" aria-label="Bunpou Dungeon: Grammar Fusion" className="panel panel-stitched relative w-full max-w-[1280px] h-[100dvh] sm:h-[96dvh] sm:max-h-[1000px] flex flex-col border border-border-subtle sm:rounded-3xl shadow-2xl overflow-hidden bg-surface-card animate-scale-up">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-text-primary truncate">Bunpou Dungeon: Grammar Fusion</h3>
              <p className="text-[11px] text-text-secondary truncate" title={`${pick.pattern.title}`}>{pick.pattern.jlpt} · {pick.pattern.title} · {pick.verb.japanese}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={shufflePattern} className={`${shuffleBtn} hidden sm:flex`}>
              <Shuffle className="w-4 h-4" />Acak Pola
            </button>
            <button type="button" onClick={shuffleVerb} className={`${shuffleBtn} hidden sm:flex`}>
              <Shuffle className="w-4 h-4" />Acak Kotoba
            </button>
            <button type="button" onClick={shuffleAll} aria-label="Acak Semua" title="Acak pola dan kotoba sekaligus" className={`${shuffleBtn} hidden sm:flex`}>
              <Dices className="w-4 h-4" />Acak Semua
            </button>
            <button type="button" aria-pressed={reduceMotion} aria-label="Kurangi gerak" title="Kurangi gerak (matikan animasi fusion)" onClick={toggleMotion} className={`btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer p-0 ${reduceMotion ? 'text-gold' : ''}`}>
              <Wind className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Tutup" onClick={() => { click(); onClose(); }} className="btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer p-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tombol acak untuk HP (di header tidak muat) */}
        <div className="sm:hidden grid grid-cols-3 gap-2 mx-3 mt-2 shrink-0">
          <button type="button" onClick={shufflePattern} className={`${shuffleBtn} justify-center`}><Shuffle className="w-3.5 h-3.5" />Acak Pola</button>
          <button type="button" onClick={shuffleVerb} className={`${shuffleBtn} justify-center`}><Shuffle className="w-3.5 h-3.5" />Acak Kotoba</button>
          <button type="button" onClick={shuffleAll} aria-label="Acak Semua" title="Acak pola dan kotoba sekaligus" className={`${shuffleBtn} justify-center`}><Dices className="w-4 h-4" />Semua</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-3 sm:p-4">
          <FusionPlayer
            key={`${stage.id}:${pick.verb.japanese}:${runId}`}
            stage={stage}
            baseWord={pick.verb}
            soundEnabled={soundEnabled}
            reduceMotion={reduceMotion}
            onFinished={handleFinished}
            endActions={endActions}
            onPickPattern={() => setPicker('pattern')}
            onPickVerb={() => setPicker('verb')}
          />
        </div>
      </div>
      {picker === 'pattern' && (
        <FusionPickerDialog kind="pattern" items={allPatterns} currentId={pick.pattern.id} onClose={() => setPicker(null)} onPick={pattern => { setPick(p => ({ ...p, pattern })); setPicker(null); }} />
      )}
      {picker === 'verb' && (
        <FusionPickerDialog kind="verb" items={allVerbs} currentId={pick.verb.id} onClose={() => setPicker(null)} onPick={verb => { setPick(p => ({ ...p, verb })); setPicker(null); }} />
      )}
    </div>,
    document.body
  );
};
