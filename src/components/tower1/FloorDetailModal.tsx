// ==============================================================================
// TOWER 1 — DETAIL LANTAI (modal dari peta)
// ==============================================================================

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Eye, Hand, Hourglass, Lightbulb, Lock, Star, Target, TrendingUp, X } from 'lucide-react';
import { FloorNodeState, FloorSpec, Tower1Progress } from '../../engine/tower1/types';
import { TOWER1_DOMAIN_LABEL, TOWER1_SKILL_LABEL } from '../../data/tower1';
import { ALL_FLOOR_MAP, skillsOf } from '../../data/towers';
import { missingHard } from '../../engine/tower1/graph';
import { ModalPortal, SKILL_ICON } from './parts';

interface Props {
  spec: FloorSpec;
  state: FloorNodeState;
  progress: Tower1Progress;
  isRecommended: boolean;
  onEnter: () => void;
  onClose: () => void;
  onSelectFloor: (id: number) => void;
}

const BIG_IDEA: Record<string, string> = {
  BI1: 'Tiga aksara, satu sistem',
  BI2: 'Ritme ketukan (mora)',
  BI3: 'Predikat menutup kalimat',
  BI4: 'Partikel = penanda relasi',
  BI5: 'Konteks & penghilangan',
  BI6: 'Tiga keluarga predikat',
  BI7: 'Bentuk dasar & bentuk sopan',
  BI8: 'Bentuk → Fungsi → Makna'
};

export const FloorDetailModal: React.FC<Props> = ({ spec, state, progress, isRecommended, onEnter, onClose, onSelectFloor }) => {
  const missing = missingHard(spec, progress);
  const rec = progress.cleared[spec.id];
  const canEnter = state === 'available' || state === 'cleared';

  const rows = [
    { icon: <Eye className="w-4 h-4" />, label: 'Yang kamu lihat', text: spec.capability.see },
    { icon: <Hand className="w-4 h-4" />, label: 'Yang kamu lakukan', text: spec.capability.do },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'Yang berubah', text: spec.capability.change },
    { icon: <Target className="w-4 h-4" />, label: 'Buktinya', text: spec.capability.signal }
  ];

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Lantai ${spec.code} ${spec.name}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[88vh] overflow-y-auto panel panel-stitched rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ui-icon-box w-14 h-14 rounded-2xl flex-col shrink-0">
              <span className="text-[9px] font-bold text-text-muted leading-none">LANTAI</span>
              <span className="text-xl font-black text-gold font-heading leading-tight">{spec.code}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isRecommended && <span className="ui-chip is-active px-2 py-0.5 text-[10px] font-bold">Rekomendasi</span>}
              </div>
              <h2 className="text-lg font-bold text-text-primary font-heading leading-tight mt-1">{spec.name}</h2>
              <p className="text-xs text-text-secondary">{spec.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-physical-secondary p-2 rounded-xl shrink-0" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-text-muted">{TOWER1_DOMAIN_LABEL[spec.domain]}</p>

        {skillsOf(spec).length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">Ruangan di lantai ini</span>
            <div className="flex flex-wrap gap-1.5">
              {skillsOf(spec).map(sk => (
                <span key={sk} className="ui-chip px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1">
                  {SKILL_ICON[sk]}
                  {TOWER1_SKILL_LABEL[sk]}
                </span>
              ))}
            </div>
          </div>
        )}

        {rec && (
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex items-center justify-between">
            <span className="flex items-center gap-1" aria-label={`${rec.stars} bintang`}>
              {[1, 2, 3].map(n => (
                <Star key={n} className={`w-5 h-5 ${n <= rec.stars ? 'text-gold fill-gold' : 'text-text-muted'}`} strokeWidth={1.5} />
              ))}
            </span>
            <span className="text-xs text-text-secondary">
              Terbaik <strong className="text-gold font-mono">{rec.accuracy}%</strong> · {rec.attempts}x
            </span>
          </div>
        )}

        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.label} className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex items-start gap-3">
              <span className="ui-icon-box w-8 h-8 rounded-xl text-gold shrink-0">{r.icon}</span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">{r.label}</span>
                <p className="text-xs text-text-primary leading-relaxed">{r.text}</p>
              </div>
            </li>
          ))}
          <li className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex items-start gap-3">
            <span className="ui-icon-box w-8 h-8 rounded-xl text-gold shrink-0"><Lightbulb className="w-4 h-4" /></span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">Salah paham yang sering</span>
              <p className="text-xs text-text-primary leading-relaxed">{spec.capability.misconception}</p>
            </div>
          </li>
        </ul>

        {spec.bigIdeas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {spec.bigIdeas.map(b => (
              <span key={b} className="ui-chip px-2.5 py-1 text-[10px] font-bold">{BIG_IDEA[b] ?? b}</span>
            ))}
          </div>
        )}

        {(spec.hard.length > 0 || spec.soft.length > 0) && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">Prasyarat</span>
            <div className="flex flex-wrap gap-1.5">
              {spec.hard.map(id => {
                const done = !!progress.cleared[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectFloor(id)}
                    className="ui-chip px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    {done ? <Check className="w-3 h-3 text-state-success" /> : <Lock className="w-3 h-3 text-text-muted" />}
                    {ALL_FLOOR_MAP[id].code}
                  </button>
                );
              })}
              {spec.soft.map(id => {
                const done = !!progress.cleared[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectFloor(id)}
                    className="ui-chip px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1 opacity-80"
                    title="Disarankan (tidak wajib)"
                  >
                    {done ? <Check className="w-3 h-3 text-state-success" /> : null}
                    {ALL_FLOOR_MAP[id].code}
                    <span className="text-[9px] text-text-muted">disarankan</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {canEnter ? (
          <button
            type="button"
            onClick={onEnter}
            className="btn-physical-primary w-full py-3.5 rounded-2xl font-bold text-sm font-heading flex items-center justify-center gap-2"
          >
            <span>{state === 'cleared' ? 'Ulangi Lantai' : 'Masuk Lantai'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex items-center gap-2.5 text-xs text-text-secondary">
            {state === 'sealed' ? <Hourglass className="w-4 h-4 text-text-muted shrink-0" /> : <Lock className="w-4 h-4 text-text-muted shrink-0" />}
            <span>
              {state === 'sealed'
                ? 'Lantai ini sudah ada di peta, tetapi pintunya baru terbuka saat dibangun. Segera hadir.'
                : `Selesaikan dulu lantai ${missing.map(id => ALL_FLOOR_MAP[id].code).join(', ')}.`}
            </span>
          </div>
        )}
      </motion.div>
    </div>
    </ModalPortal>
  );
};
