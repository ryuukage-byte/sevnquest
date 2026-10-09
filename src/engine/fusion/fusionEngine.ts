// ==============================================================================
// GRAMMAR FUSION — STATE MACHINE + VALIDASI (murni, tanpa React)
// Hasil transformasi baru disimpan ke history HANYA setelah CHECK tervalidasi.
// Animasi hanya membaca state; ia tidak menghitung grammar.
// ==============================================================================

import { applyRule, formLabel, getRule } from './rules';
import type {
  FusionAction, FusionBaseWord, FusionFeedback, FusionRuleId, FusionStage, FusionState, FusionWord,
} from './types';

/** Urutan stabil tanpa acak, supaya pengecoh tidak membocorkan jawaban lewat posisi. */
function shuffled<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickBaseWord(stage: FusionStage, rand: () => number = Math.random): FusionBaseWord {
  return stage.words[Math.floor(rand() * stage.words.length)];
}

export function createFusionState(
  stage: FusionStage,
  baseWord: FusionBaseWord = pickBaseWord(stage),
  rand: () => number = Math.random
): FusionState {
  return {
    stage,
    currentStageId: stage.id,
    baseWord,
    currentStep: 0,
    currentWord: { japanese: baseWord.japanese, reading: baseWord.reading },
    currentForm: 'jisho',
    selectedComponent: null,
    transformationHistory: [],
    availableComponents: shuffled(stage.components, rand),
    animationState: 'idle',
    feedbackState: null,
    mistakes: 0,
    hintsUsed: 0,
    hintedComponent: null,
    completed: false,
    score: { exp: 0, gold: 0 },
  };
}

/** XP/gold akhir: tiap petunjuk dan kesalahan mengurangi, minimal 50% hadiah dasar. */
export function computeScore(stage: FusionStage, mistakes: number, hintsUsed: number): { exp: number; gold: number } {
  const factor = Math.max(0.5, 1 - 0.1 * hintsUsed - 0.05 * mistakes);
  return { exp: Math.round(stage.reward.exp * factor), gold: Math.round(stage.reward.gold * factor) };
}

/** Pesan salah: selalu menyebut alasan grammar-nya. */
export function explainWrongChoice(state: FusionState, ruleId: FusionRuleId): string {
  const rule = getRule(ruleId, state.stage);
  const expectedRule = getRule(state.stage.steps[state.currentStep].ruleId, state.stage);
  const applied = applyRule(ruleId, { base: state.baseWord, current: state.currentWord, form: state.currentForm }, state.stage);
  if (!applied) {
    return `${rule.label} belum bisa dipakai pada ${state.currentWord.japanese} (${formLabel(state.currentForm, state.stage)}). ${rule.whyNot}`;
  }
  return `${state.baseWord.japanese} + ${rule.label} → ${applied.word.japanese}, tetapi itu bukan arah pola ${state.stage.target.pattern}. Langkah ini membutuhkan ${expectedRule.label}.`;
}

export function fusionReducer(state: FusionState, action: FusionAction): FusionState {
  switch (action.type) {
    case 'SELECT': {
      if (state.completed || state.animationState !== 'idle') return state;
      if (!state.availableComponents.includes(action.ruleId)) return state;
      return { ...state, selectedComponent: action.ruleId, feedbackState: null };
    }

    case 'DROP': {
      if (state.completed || state.animationState !== 'idle') return state;
      if (!state.availableComponents.includes(action.ruleId)) return state;
      return fusionReducer({ ...state, selectedComponent: action.ruleId }, { type: 'CHECK' });
    }

    case 'CHECK': {
      if (state.completed || state.animationState !== 'idle' || !state.selectedComponent) return state;
      const step = state.stage.steps[state.currentStep];
      const chosen = state.selectedComponent;

      if (chosen !== step.ruleId) {
        return {
          ...state,
          mistakes: state.mistakes + 1,
          selectedComponent: null,
          feedbackState: { kind: 'wrong', message: explainWrongChoice(state, chosen) },
        };
      }

      const result = applyRule(chosen, { base: state.baseWord, current: state.currentWord, form: state.currentForm }, state.stage);
      if (!result) return state; // data stage tidak konsisten dengan rule; jangan merusak progres
      const nextStep = state.currentStep + 1;
      const completed = nextStep >= state.stage.steps.length;
      const feedback: FusionFeedback = { kind: 'correct', message: result.explanation };

      return {
        ...state,
        currentStep: nextStep,
        currentWord: result.word,
        currentForm: result.form,
        selectedComponent: null,
        hintedComponent: null,
        transformationHistory: [
          ...state.transformationHistory,
          {
            stepIndex: state.currentStep,
            ruleId: chosen,
            componentLabel: getRule(chosen, state.stage).label,
            from: state.currentWord,
            to: result.word,
            fromForm: state.currentForm,
            toForm: result.form,
            explanation: result.explanation,
          },
        ],
        animationState: 'approach',
        feedbackState: feedback,
        completed,
        score: completed ? computeScore(state.stage, state.mistakes, state.hintsUsed) : state.score,
      };
    }

    case 'ANIMATION_PHASE':
      return state.animationState === 'idle' ? state : { ...state, animationState: action.phase };

    case 'ANIMATION_DONE':
      return { ...state, animationState: 'idle' };

    case 'HINT': {
      if (state.completed || state.animationState !== 'idle') return state;
      const step = state.stage.steps[state.currentStep];
      const rule = getRule(step.ruleId, state.stage);
      return {
        ...state,
        hintsUsed: state.hintedComponent === step.ruleId ? state.hintsUsed : state.hintsUsed + 1,
        hintedComponent: step.ruleId,
        feedbackState: { kind: 'hint', message: `Petunjuk: gunakan komponen ${rule.label} (${rule.hint}).` },
      };
    }

    case 'RESET':
      return createFusionState(state.stage, action.baseWord ?? state.baseWord);

    default:
      return state;
  }
}

/** Teks "kata + komponen" untuk pratinjau pilihan. */
export function previewSelection(state: FusionState): FusionWord | null {
  if (!state.selectedComponent) return null;
  return applyRule(state.selectedComponent, { base: state.baseWord, current: state.currentWord, form: state.currentForm }, state.stage)?.word ?? null;
}

/** Diff awalan: bagian yang tetap, dibuang, dan ditambah — dipakai UI untuk efek morph. */
export function diffWords(from: string, to: string): { kept: string; removed: string; added: string } {
  let i = 0;
  const max = Math.min(from.length, to.length);
  while (i < max && from[i] === to[i]) i++;
  return { kept: from.slice(0, i), removed: from.slice(i), added: to.slice(i) };
}
