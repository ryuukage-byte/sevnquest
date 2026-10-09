import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Shuffle, X } from 'lucide-react';
import type { GrammarPatternSchema } from '../../../engine/types';
import type { FusionVerbEntry } from '../../../data/fusion/verbPool';

type Props =
  | { kind: 'pattern'; items: GrammarPatternSchema[]; currentId?: string; onPick: (p: GrammarPatternSchema) => void; onClose: () => void }
  | { kind: 'verb'; items: FusionVerbEntry[]; currentId?: string; onPick: (v: FusionVerbEntry) => void; onClose: () => void };

const LEVELS = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;
const MAX_ROWS = 80;
const FORM_TAG: Record<string, string> = {
  jisho: '辞書形', nai: 'ない形', te: 'て形', ta: 'た形', masu: 'ます形', masu_stem: 'ます語幹', volitional: '意向形',
};

/** Pemilih pola / kotoba dengan pencarian + filter level; dibuka dari kartu TARGET atau kartu kata. */
export const FusionPickerDialog: React.FC<Props> = props => {
  const { kind, onClose } = props;
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (props.kind === 'pattern') {
      return props.items.filter(p => (level === 'all' || p.jlpt === level) && (!q || p.pattern.includes(q) || p.title.toLowerCase().includes(q)));
    }
    return props.items.filter(v => (level === 'all' || v.level === level) &&
      (!q || v.japanese.includes(q) || v.reading.includes(q) || v.meaning.toLowerCase().includes(q)));
  }, [props.kind, props.items, query, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickRandom = () => {
    if (rows.length === 0) return;
    const r = rows[Math.floor(Math.random() * rows.length)];
    if (props.kind === 'pattern') props.onPick(r as GrammarPatternSchema);
    else props.onPick(r as FusionVerbEntry);
  };

  const row = (active: boolean) => `w-full text-left px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${active ? 'bg-gold/20 border-gold' : 'bg-surface-inset border-border-subtle hover:border-border-primary'}`;
  const title = kind === 'pattern' ? 'Pilih pola grammar' : 'Pilih kotoba';

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} className="panel w-full sm:max-w-md max-h-[70dvh] flex flex-col gap-3 p-3 bg-surface-card border border-border-subtle rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-heading font-black text-text-primary">{title} <span className="font-mono text-text-muted text-xs">({rows.length})</span></h4>
          <div className="flex items-center gap-2">
            <button type="button" onClick={pickRandom} className="btn-physical-secondary px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1"><Shuffle className="w-3 h-3" />Acak</button>
            <button type="button" aria-label="Tutup" onClick={onClose} className="btn-physical-secondary w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer p-0"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={kind === 'pattern' ? 'Cari pola atau judul…' : 'Cari kata, bacaan, atau arti…'}
            aria-label="Cari"
            className="w-full pl-9 pr-3 py-2 bg-surface-inset border border-border-subtle rounded-xl text-sm font-body text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none shrink-0 pb-0.5" role="group" aria-label="Filter level">
          {LEVELS.map(l => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer shrink-0 ${level === l ? 'bg-gold/20 text-gold border-gold' : 'bg-surface-inset text-text-muted border-border-subtle'}`}>
              {l === 'all' ? 'Semua' : l}
            </button>
          ))}
        </div>
        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
          {props.kind === 'pattern'
            ? (rows as GrammarPatternSchema[]).map(p => (
                <button key={p.id} type="button" onClick={() => props.onPick(p)} aria-pressed={props.currentId === p.id} className={row(props.currentId === p.id)}>
                  <span className="font-heading font-black text-gold" lang="ja">{p.pattern}</span>
                  <span className="text-xs text-text-muted"> · {p.jlpt} · V{FORM_TAG[p.requiredConjugation] ?? p.requiredConjugation}</span>
                  <span className="block text-xs text-text-secondary truncate">{p.title}</span>
                </button>
              ))
            : (rows as FusionVerbEntry[]).slice(0, MAX_ROWS).map(v => (
                <button key={v.id} type="button" onClick={() => props.onPick(v)} aria-pressed={props.currentId === v.id} className={row(props.currentId === v.id)}>
                  <span className="font-heading font-black text-text-primary" lang="ja">{v.japanese}</span>
                  <span className="text-text-secondary" lang="ja"> · {v.reading}</span>
                  <span className="block text-xs text-text-muted truncate">{v.meaning} · {v.level}</span>
                </button>
              ))}
          {rows.length === 0 && <p className="text-sm text-text-muted p-2">Tidak ada yang cocok.</p>}
          {kind === 'verb' && rows.length > MAX_ROWS && <p className="text-[11px] text-text-muted p-2">+{rows.length - MAX_ROWS} lainnya, persempit pencarian.</p>}
        </div>
      </div>
    </div>,
    document.body
  );
};
