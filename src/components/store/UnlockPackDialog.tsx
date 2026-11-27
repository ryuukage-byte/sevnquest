import React from 'react';
import { AlertCircle, Ticket, X } from 'lucide-react';
import { ViewportPortal } from '../ui/ViewportPortal';
import { useBackButton } from '../../hooks/useBackButton';
import { playSound } from '../../utils/audio';
import type { StorePack } from '../../lib/storeCore';

interface Props {
  pack: StorePack;
  balance: number;
  busy: boolean;
  error: string | null;
  soundEnabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Konfirmasi buka pack. Modal halaman (z-50), dirender lewat portal sesuai standar viewport. */
export const UnlockPackDialog: React.FC<Props> = ({ pack, balance, busy, error, soundEnabled = true, onConfirm, onClose }) => {
  useBackButton(true, () => { onClose(); }, 'unlock_pack_dialog');
  const after = balance - pack.pricePasses;
  return (
    <ViewportPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto overscroll-contain"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-pack-title"
          onClick={e => e.stopPropagation()}
          className="my-auto w-full max-w-sm panel panel-stitched bg-surface-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl relative"
        >
          <div className="skeuo-grain" />
          <div className="relative z-[2] p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-surface-inset border border-gold/40 flex items-center justify-center text-gold shrink-0">
                  <Ticket className="w-5 h-5" />
                </div>
                <h2 id="unlock-pack-title" className="font-heading font-black text-text-primary text-base">Buka {pack.title}?</h2>
              </div>
              <button
                type="button"
                onClick={() => { playSound('click', soundEnabled); onClose(); }}
                disabled={busy}
                className="btn-physical-secondary w-8 h-8 rounded-xl flex items-center justify-center p-0 shrink-0"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-dashed border-[color:var(--thread)] bg-surface-inset p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-text-secondary">Harga</span><b className="text-text-primary">{pack.pricePasses} pass</b></div>
              <div className="flex justify-between"><span className="text-text-secondary">Saldo</span><b className="text-text-primary">{balance} → {after}</b></div>
              <div className="flex justify-between"><span className="text-text-secondary">Isi</span><b className="text-text-primary">{pack.itemCount} kata</b></div>
            </div>
            <p className="text-xs text-text-secondary">Pack jadi milikmu selamanya dan muncul di Buku Saku, termasuk pembaruan isinya nanti.</p>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl border border-border-subtle bg-rose-500/10 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || after < 0}
              className="btn-cta w-full px-5 py-3 text-sm font-heading font-black flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" /> {busy ? 'Membuka...' : `Buka dengan ${pack.pricePasses} pass`}
            </button>
          </div>
        </div>
      </div>
    </ViewportPortal>
  );
};
