import React, { useMemo, useState } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { FEATURES, type FeatureEntry, type FeatureTarget } from '../../data/appFeatures';

export type { FeatureTarget };

const norm = (s: string) => s.normalize('NFKC').toLowerCase().trim();

interface FeatureSearchProps {
  onSelect: (target: FeatureTarget) => void;
}

/** Pencarian fitur di Castle: ketik kata kunci, ketuk hasil untuk langsung menuju fitur. */
export const FeatureSearch: React.FC<FeatureSearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const tokens = norm(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return FEATURES.filter(f => {
      const hay = `${f.title} ${f.hint} ${f.keywords}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    }).slice(0, 5);
  }, [query]);

  const pick = (f: FeatureEntry) => {
    setQuery('');
    onSelect(f.target);
  };

  return (
    <div className="p-3 space-y-2">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && results[0]) pick(results[0]);
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder="Cari fitur, flashcard, menulis…"
          aria-label="Cari fitur"
          className="w-full pl-10 pr-10 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary transition-all shadow-inner font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer"
            title="Hapus pencarian"
            aria-label="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {query.trim() && (
        results.length > 0 ? (
          <ul className="space-y-1.5">
            {results.map(f => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => pick(f)}
                  className="w-full p-3 rounded-2xl bg-surface-inset border border-border-subtle hover:border-border-primary flex items-center justify-between gap-3 text-left transition-all group cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-text-primary font-heading group-hover:text-gold transition-colors">{f.title}</span>
                    <span className="block text-[10px] text-text-secondary font-mono truncate">{f.hint}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-secondary font-body px-1">Fitur tidak ditemukan. Coba kata lain, mis. “flashcard”, “menulis”, “misi”.</p>
        )
      )}
    </div>
  );
};
