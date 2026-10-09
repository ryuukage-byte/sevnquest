import React, { useMemo, useState } from 'react';
import { Search, Shuffle, Sparkles } from 'lucide-react';
import type { GrammarPatternSchema } from '../../../engine/types';
import type { FusionVerbEntry } from '../../../data/fusion/verbPool';
import { playSound } from '../../../utils/audio';

interface Props {
  verbs: FusionVerbEntry[];
  patterns: GrammarPatternSchema[];
  soundEnabled: boolean;
  onStart: (verb: FusionVerbEntry, pattern: GrammarPatternSchema) => void;
}

const LEVELS = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;
const MAX_ROWS = 80;

const Chips: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto scrollbar-none" role="group" aria-label="Filter level">
    {LEVELS.map(l => (
      <button
        key={l}
        type="button"
        aria-pressed={value === l}
        onClick={() => onChange(l)}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer shrink-0 ${value === l ? 'bg-gold/20 text-gold border-gold' : 'bg-surface-inset text-text-muted border-border-subtle'}`}
      >
        {l === 'all' ? 'Semua' : l}
      </button>
    ))}
  </div>
);

const FORM_TAG: Record<string, string> = {
  jisho: '辞書形', nai: 'ない形', te: 'て形', ta: 'た形', masu: 'ます形', masu_stem: 'ます語幹', volitional: '意向形',
};

const pickRandom = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

/** Pilih kata kerja + pola, lalu mulai fusion — mirip Papan Tulis Pola, tapi pemain yang merakit hasilnya. */
export const FusionPicker: React.FC<Props> = ({ verbs, patterns, soundEnabled, onStart }) => {
  const [verbQuery, setVerbQuery] = useState('');
  const [verbLevel, setVerbLevel] = useState('all');
  const [patQuery, setPatQuery] = useState('');
  const [patLevel, setPatLevel] = useState('all');
  const [verb, setVerb] = useState<FusionVerbEntry | null>(null);
  const [pattern, setPattern] = useState<GrammarPatternSchema | null>(null);
  const click = () => playSound('click', soundEnabled);

  const filteredVerbs = useMemo(() => {
    const q = verbQuery.trim().toLowerCase();
    return verbs.filter(v => (verbLevel === 'all' || v.level === verbLevel) &&
      (!q || v.japanese.includes(q) || v.reading.includes(q) || v.meaning.toLowerCase().includes(q)));
  }, [verbs, verbQuery, verbLevel]);

  const filteredPatterns = useMemo(() => {
    const q = patQuery.trim().toLowerCase();
    return patterns.filter(p => (patLevel === 'all' || p.jlpt === patLevel) &&
      (!q || p.pattern.includes(q) || p.title.toLowerCase().includes(q)));
  }, [patterns, patQuery, patLevel]);

  const randomize = () => {
    click();
    setVerb(pickRandom(filteredVerbs) ?? pickRandom(verbs)!);
    setPattern(pickRandom(filteredPatterns) ?? pickRandom(patterns)!);
  };

  const input = 'w-full pl-9 pr-3 py-2 bg-surface-inset border border-border-subtle rounded-xl text-sm font-body text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary';
  const row = (active: boolean) => `w-full text-left px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${active ? 'bg-gold/20 border-gold' : 'bg-surface-inset border-border-subtle hover:border-border-primary'}`;

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="grid gap-3 md:grid-cols-2 lg:flex-1 lg:min-h-0">
        {/* KATA KERJA */}
        <section className="flex flex-col gap-2 min-h-0" aria-label="Pilih kata kerja">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-black text-text-primary text-sm">Kata kerja <span className="font-mono text-text-muted text-xs">({filteredVerbs.length})</span></h4>
            <button type="button" onClick={() => { click(); const v = pickRandom(filteredVerbs); if (v) setVerb(v); }} className="btn-physical-secondary px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1"><Shuffle className="w-3 h-3" />Acak</button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={verbQuery} onChange={e => setVerbQuery(e.target.value)} placeholder="Cari kata, bacaan, atau arti…" className={input} aria-label="Cari kata kerja" />
          </div>
          <Chips value={verbLevel} onChange={v => { click(); setVerbLevel(v); }} />
          <div className="space-y-1.5 overflow-y-auto max-h-64 md:max-h-none md:flex-1 md:min-h-0 pr-1">
            {filteredVerbs.slice(0, MAX_ROWS).map(v => (
              <button key={v.id} type="button" onClick={() => { click(); setVerb(v); }} aria-pressed={verb?.id === v.id} className={row(verb?.id === v.id)}>
                <span className="font-heading font-black text-text-primary" lang="ja">{v.japanese}</span>
                <span className="text-text-secondary" lang="ja"> · {v.reading}</span>
                <span className="block text-xs text-text-muted truncate">{v.meaning} · {v.level}</span>
              </button>
            ))}
            {filteredVerbs.length === 0 && <p className="text-sm text-text-muted p-2">Tidak ada kata yang cocok.</p>}
            {filteredVerbs.length > MAX_ROWS && <p className="text-[11px] text-text-muted p-2">+{filteredVerbs.length - MAX_ROWS} lainnya — persempit pencarian.</p>}
          </div>
        </section>

        {/* POLA */}
        <section className="flex flex-col gap-2 min-h-0" aria-label="Pilih pola">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-black text-text-primary text-sm">Pola grammar <span className="font-mono text-text-muted text-xs">({filteredPatterns.length})</span></h4>
            <button type="button" onClick={() => { click(); const p = pickRandom(filteredPatterns); if (p) setPattern(p); }} className="btn-physical-secondary px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1"><Shuffle className="w-3 h-3" />Acak</button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={patQuery} onChange={e => setPatQuery(e.target.value)} placeholder="Cari pola atau judul…" className={input} aria-label="Cari pola" />
          </div>
          <Chips value={patLevel} onChange={v => { click(); setPatLevel(v); }} />
          <div className="space-y-1.5 overflow-y-auto max-h-64 md:max-h-none md:flex-1 md:min-h-0 pr-1">
            {filteredPatterns.map(p => (
              <button key={p.id} type="button" onClick={() => { click(); setPattern(p); }} aria-pressed={pattern?.id === p.id} className={row(pattern?.id === p.id)}>
                <span className="font-heading font-black text-gold" lang="ja">{p.pattern}</span>
                <span className="text-xs text-text-muted"> · {p.jlpt} · V{FORM_TAG[p.requiredConjugation] ?? p.requiredConjugation}</span>
                <span className="block text-xs text-text-secondary truncate">{p.title}</span>
              </button>
            ))}
            {filteredPatterns.length === 0 && <p className="text-sm text-text-muted p-2">Tidak ada pola yang cocok.</p>}
          </div>
        </section>
      </div>

      {/* Aksi mulai: menempel di bawah agar terjangkau ibu jari */}
      <div className="sticky bottom-0 lg:static -mx-3 px-3 pb-2 pt-2 lg:m-0 lg:p-0 bg-surface-card/95 lg:bg-transparent backdrop-blur flex items-center gap-2 border-t border-border-subtle lg:border-0">
        <div className="min-w-0 flex-1 text-sm font-body text-text-secondary truncate" lang="ja" aria-live="polite">
          {verb && pattern ? <><b className="text-text-primary">{verb.japanese}</b> + <b className="text-gold">{pattern.pattern}</b></> : 'Pilih satu kata dan satu pola.'}
        </div>
        <button type="button" onClick={randomize} className="btn-physical-secondary px-3 h-12 rounded-2xl text-xs font-bold cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"><Shuffle className="w-4 h-4" />Acak semua</button>
        <button
          type="button"
          disabled={!verb || !pattern}
          onClick={() => { if (verb && pattern) { click(); onStart(verb, pattern); } }}
          className={`px-5 h-12 rounded-2xl font-heading font-black text-sm flex items-center gap-2 whitespace-nowrap shrink-0 ${verb && pattern ? 'btn-cta cursor-pointer' : 'bg-surface-inset text-text-muted border border-border-subtle opacity-60 cursor-not-allowed'}`}
        >
          <Sparkles className="w-4 h-4" />Mulai Fusion
        </button>
      </div>
    </div>
  );
};
