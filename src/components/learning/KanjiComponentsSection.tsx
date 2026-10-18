import React, { useEffect, useState } from 'react';
import { Layers, HelpCircle } from 'lucide-react';

interface KanjiComponentsSectionProps {
  /** Penjelasan asal-usul makna. Jika kosong, tombol info tidak ditampilkan. */
  etymology?: string;
  /** Daftar chip komponen kanji. */
  children: React.ReactNode;
}

/** Header "Komponen Kanji" + tombol info untuk toggle kotak etimologi. */
export const KanjiComponentsSection: React.FC<KanjiComponentsSectionProps> = ({ etymology, children }) => {
  const [open, setOpen] = useState(false);

  // Tutup kotak saat pindah ke kata lain
  useEffect(() => {
    setOpen(false);
  }, [etymology]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Komponen Kanji
        </h4>
        {etymology && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label="Asal-usul kanji (etimologi)"
            title="Asal-usul kanji (etimologi)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              open
                ? 'bg-surface-inset text-gold border-gold/40'
                : 'text-text-muted border-border-subtle hover:text-gold'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Asal-usul</span>
          </button>
        )}
      </div>

      {etymology && open && (
        <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Asal-usul Kanji (Etimologi)
          </p>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">{etymology}</p>
        </div>
      )}

      {children}
    </div>
  );
};
