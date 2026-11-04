// Bahan visual bersama lembar-lembar modal Bunpou (Bedah Pola, Rumus & Pola, Animasi Pembentukan)
// agar semua lembar memakai bahasa visual yang sama: kartu, judul bagian, pil peran, chip ＋ chip.

import React from 'react';

export const SHEET_CARD = 'p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs';
export const PLUM_TEXT = 'text-[#5b4a7a] dark:text-[#d6c8f0]';
export const PLUM_ICON = 'text-[#7d6b9e] dark:text-[#b7a3dc]';
export const PLUM_SOFT_BG = 'bg-[#7d6b9e]/12 dark:bg-[#b7a3dc]/15';
export const PLUM_BORDER = 'border-[#7d6b9e]/60 dark:border-[#b7a3dc]/50';

export const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }> = ({
  icon,
  children,
  aside,
}) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5 text-text-primary font-heading font-bold text-xs uppercase tracking-wider">
      {icon}
      <span>{children}</span>
    </div>
    {aside}
  </div>
);

/** Pil kecil untuk peran / kategori, mis. BENTUK, PARTIKEL, GOL. 1. */
export const RolePill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={`inline-block px-1.5 py-px rounded-md ${PLUM_SOFT_BG} ${PLUM_TEXT} text-[9.5px] font-bold uppercase tracking-wider font-sans ${className}`}
  >
    {children}
  </span>
);

/** Deretan chip yang disambung ＋ (＋ ikut chip sesudahnya agar tidak menggantung di ujung baris). */
export const PlusChips: React.FC<{ parts: string[]; size?: 'sm' | 'md' }> = ({ parts, size = 'sm' }) => (
  <span className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
    {parts.map((p, i) => (
      <span key={i} className="inline-flex items-center gap-1">
        {i > 0 && <span className="text-text-muted font-bold text-xs select-none">＋</span>}
        <span
          className={`rounded-lg bg-surface-card border border-border-subtle font-jp font-semibold text-text-primary shadow-xs ${
            size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'
          }`}
        >
          {p}
        </span>
      </span>
    ))}
  </span>
);

/** Pecah rumus "A ＋ B + C" menjadi bagian-bagiannya. */
export const splitFormula = (rule: string): string[] =>
  rule
    .split(/\s*[+＋]\s*/)
    .map(p => p.trim())
    .filter(Boolean);
