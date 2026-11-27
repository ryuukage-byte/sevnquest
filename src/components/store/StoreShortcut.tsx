import React from 'react';
import { ChevronRight, Store, Ticket } from 'lucide-react';
import { useAccess } from '../../state/entitlement';
import { playSound } from '../../utils/audio';

interface Props {
  onOpen: () => void;
  soundEnabled?: boolean;
  /** 'banner' = baris lebar (Castle), 'tile' = tombol sejajar tombol lain (Menu). */
  variant?: 'banner' | 'tile';
}

/**
 * Pintasan ke Toko Pack (Buku Saku → tab Toko). Hanya tampil bila monetisasi tampil (saklar publik atau admin),
 * sama dengan tab Toko itu sendiri. Lencana menampilkan saldo pass bila tidak nol.
 */
export const StoreShortcut: React.FC<Props> = ({ onOpen, soundEnabled = true, variant = 'banner' }) => {
  const { monetizationVisible, entitlement } = useAccess();
  if (!monetizationVisible) return null;
  const balance = entitlement.passBalance;
  const open = () => { playSound('click', soundEnabled); onOpen(); };

  if (variant === 'tile') {
    return (
      <button
        type="button"
        onClick={open}
        className="flex-1 py-3 px-4 rounded-xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle hover:border-border-primary flex flex-col items-center justify-center gap-2 transition-all shadow-sm"
      >
        <Store className="w-5 h-5 text-gold" />
        <div className="text-center">
          <div className="text-xs font-bold text-text-primary font-heading">Toko Pack</div>
          <div className="text-[10px] text-text-muted">{balance > 0 ? `Saldo ${balance} pass` : 'Pack flashcard dari ujian resmi'}</div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      data-tour="castle-store"
      className="skeuo-card w-full rounded-2xl px-4 py-3 relative overflow-hidden flex items-center gap-3 text-left group"
    >
      <div className="skeuo-grain" />
      <span className="relative z-[2] p-2 rounded-xl bg-surface-inset/50 text-gold border border-border-subtle shrink-0">
        <Store className="w-4 h-4 md:w-5 md:h-5" />
      </span>
      <span className="relative z-[2] flex-1 min-w-0">
        <span className="block text-sm font-bold text-text-primary font-heading group-hover:text-gold transition-colors">Toko Pack</span>
        <span className="block text-[11px] text-text-secondary truncate">Kilat N3 · N2 · N1, kosakata dari ujian JLPT resmi</span>
      </span>
      {balance > 0 && (
        <span className="relative z-[2] rpg-badge-reward inline-flex items-center gap-1 shrink-0">
          <Ticket className="w-3.5 h-3.5" /> {balance}
        </span>
      )}
      <ChevronRight className="relative z-[2] w-4 h-4 text-gold-soft shrink-0" />
    </button>
  );
};
