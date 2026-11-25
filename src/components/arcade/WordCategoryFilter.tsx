import React from 'react';
import { Filter, Check } from 'lucide-react';
import { playSound } from '../../utils/audio';
import {
  WORD_CATEGORIES,
  MIN_POOL_SIZE,
  type WordCategoryId,
} from '../../utils/wordTypeFilter';

interface WordCategoryFilterProps {
  selected: Set<WordCategoryId>;
  onChange: (next: Set<WordCategoryId>) => void;
  counts: Record<WordCategoryId, number>;
  poolSize: number;
  soundEnabled?: boolean;
}

export const WordCategoryFilter: React.FC<WordCategoryFilterProps> = ({
  selected,
  onChange,
  counts,
  poolSize,
  soundEnabled = true,
}) => {
  const toggle = (id: WordCategoryId) => {
    playSound('click', soundEnabled);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const isAll = selected.size === 0;
  const tooFew = poolSize < MIN_POOL_SIZE;

  return (
    <div className="space-y-2.5" data-tour="arcade-word-category-filter">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-text-primary font-heading flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span>Filter Kategori Kata:</span>
        </label>
        <span className="text-[10px] font-mono text-text-muted">{poolSize} kata</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            onChange(new Set());
          }}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-heading border transition-all cursor-pointer ${
            isAll
              ? 'bg-gold/15 text-gold border-gold/40'
              : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-primary'
          }`}
        >
          Semua
        </button>

        {WORD_CATEGORIES.map(cat => {
          const active = selected.has(cat.id);
          const count = counts[cat.id] ?? 0;
          const empty = count === 0;
          return (
            <button
              key={cat.id}
              type="button"
              title={cat.desc}
              disabled={empty}
              onClick={() => toggle(cat.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-heading border transition-all flex items-center gap-1.5 ${
                empty
                  ? 'opacity-40 cursor-not-allowed bg-surface-inset text-text-muted border-border-subtle'
                  : active
                  ? 'bg-teal/15 text-teal border-teal/40 cursor-pointer'
                  : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-primary cursor-pointer'
              }`}
            >
              {active && <Check className="w-3 h-3 stroke-[3]" />}
              <span>{cat.label}</span>
              <span className="font-mono text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-text-muted font-body leading-snug">
        Pilih satu atau lebih kategori untuk fokus menghafal. Kosongkan (Semua) untuk campuran.
      </p>

      {tooFew && (
        <p className="text-[11px] font-bold text-crimson font-heading">
          Kata di kombinasi ini terlalu sedikit (minimal {MIN_POOL_SIZE}). Ganti level, rak buku, atau kategori.
        </p>
      )}
    </div>
  );
};
