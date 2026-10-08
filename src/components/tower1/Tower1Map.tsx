// ==============================================================================
// MENARA 1 & 2 — tumpukan lantai (lantai tertinggi di puncak)
// Satu baris = satu lantai. Posisi pemain disorot; prasyarat ditulis di tiap baris.
// ==============================================================================

import React, { useEffect, useRef } from 'react';
import { Check, Hourglass, Lock, Star } from 'lucide-react';
import { FloorNodeState, FloorSpec, Tower1Progress } from '../../engine/tower1/types';
import { getFloorState, missingHard } from '../../engine/tower1/graph';
import { TOWER1_SKILL_LABEL } from '../../data/tower1';
import { ALL_FLOOR_MAP, skillsOf } from '../../data/towers';
import { SKILL_ICON } from './parts';

interface Props {
  floors: FloorSpec[];
  progress: Tower1Progress;
  recommendedId: number | null;
  selectedId: number | null;
  tower: 1 | 2;
  onSelect: (id: number) => void;
}

export const Tower1Map: React.FC<Props> = ({ floors, progress, recommendedId, selectedId, tower, onSelect }) => {
  const here = useRef<HTMLButtonElement | null>(null);
  const stack = [...floors].sort((a, b) => b.id - a.id); // puncak di atas

  useEffect(() => {
    here.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, []);

  return (
    <div className="panel panel-stitched rounded-3xl border border-border-subtle shadow-md p-3 sm:p-4 space-y-2">
      {/* Atap menara */}
      <div className="rounded-2xl bg-surface-inset border border-border-subtle shadow-inner px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">{tower === 1 ? 'Di atas Menara 1' : 'Puncak Menara 2'}</span>
          <span className="text-sm font-bold text-text-primary font-heading">{tower === 1 ? 'Menara Rangkai (Menara 2)' : 'Lantai 100 · Puncak Seratus'}</span>
        </div>
        <span className="ui-chip px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1">{tower === 1 ? 'Lantai 017–100' : 'Ujian akhir'}</span>
      </div>

      {stack.map(f => {
        const state: FloorNodeState = getFloorState(f, progress);
        const isHere = recommendedId === f.id;
        const rec = progress.cleared[f.id];
        const dim = state === 'locked' || state === 'sealed';
        const need = state === 'locked' ? missingHard(f, progress) : [];
        return (
          <button
            key={f.id}
            ref={isHere ? here : undefined}
            type="button"
            onClick={() => onSelect(f.id)}
            aria-label={`Lantai ${f.code} ${f.name}`}
            aria-current={isHere ? 'step' : undefined}
            className={`w-full text-left rounded-2xl p-3 flex items-center gap-3 transition-all active:translate-y-px ${
              isHere
                ? 'panel border border-border-primary shadow-md'
                : selectedId === f.id
                  ? 'panel border border-border-primary'
                  : 'panel border border-border-subtle hover:border-border-primary'
            } ${dim ? 'opacity-60' : ''}`}
          >
            <div className={`ui-icon-box w-14 h-14 rounded-xl flex-col shrink-0 ${isHere ? 'is-active' : ''}`}>
              <span className="text-[8px] font-bold text-text-muted leading-none tracking-wider">LANTAI</span>
              <span className={`text-xl font-black font-heading leading-tight ${state === 'available' || isHere ? 'text-gold' : 'text-text-secondary'}`}>
                {f.code}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {skillsOf(f).map(sk => (
                  <span key={sk} className="ui-chip px-1.5 py-0.5 text-[9px] font-bold inline-flex items-center gap-1">
                    {SKILL_ICON[sk]}
                    {TOWER1_SKILL_LABEL[sk]}
                  </span>
                ))}
                {isHere && <span className="ui-chip is-active px-1.5 py-0.5 text-[9px] font-bold">Posisimu</span>}
              </div>
              <span className="text-sm font-bold text-text-primary font-heading block truncate">{f.name}</span>
              <span className="text-[11px] text-text-secondary block truncate">{f.subtitle}</span>
              {state === 'locked' && (
                <span className="text-[10px] text-text-muted block mt-0.5">
                  Butuh: {need.map(id => ALL_FLOOR_MAP[id].code).join(' · ')}
                </span>
              )}
              {state === 'sealed' && <span className="text-[10px] text-text-muted block mt-0.5">Segera dibangun</span>}
            </div>

            <div className="shrink-0 flex flex-col items-end gap-1">
              {state === 'cleared' && <Check className="w-5 h-5 text-state-success" />}
              {state === 'locked' && <Lock className="w-4 h-4 text-text-muted" />}
              {state === 'sealed' && <Hourglass className="w-4 h-4 text-text-muted" />}
              {rec && (
                <span className="flex items-center gap-px" aria-label={`${rec.stars} bintang`}>
                  {[1, 2, 3].map(n => (
                    <Star key={n} className={`w-3 h-3 ${n <= rec.stars ? 'text-gold fill-gold' : 'text-text-muted'}`} strokeWidth={1.5} />
                  ))}
                </span>
              )}
            </div>
          </button>
        );
      })}

      <p className="text-[11px] text-text-muted text-center pt-1">{tower === 1 ? 'Dasar menara. Kamu mulai dari Lantai 001.' : 'Dasar Menara 2. Tangga dari puncak Menara 1 (Lantai 016).'}</p>
    </div>
  );
};
