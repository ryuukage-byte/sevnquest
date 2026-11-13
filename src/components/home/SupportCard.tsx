import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, Download, X } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { CASTLE_TILE, CASTLE_TILE_LABEL } from './castleTile';
import { useAccess } from '../../state/entitlement';
import { formatIdr, monthlyRemaining } from '../../utils/access';

/** QRIS yang sama dengan untuk pembayaran (GoPay Merchant: Sevnsoul Store, Digital & Kreatif). */
export const QRIS_SRC = `${import.meta.env.BASE_URL || './'}qris.png`;
const QRIS_MERCHANT = 'Sevnsoul Store, Digital & Kreatif';

interface SupportCardProps {
  soundEnabled?: boolean;
}

/**
 * Ubin "Donasi" di Castle: membuka halaman Dukung SevnQuest (donasi bulanan / lifetime dengan QRIS bernominal),
 * supaya donasi tercatat ke akun dan membuka akses Full. QRIS polos tetap tersedia lewat QrisModal.
 */
export const SupportCard: React.FC<SupportCardProps> = ({ soundEnabled }) => {
  const { openUpgrade, entitlement, monetizationVisible } = useAccess();
  const remaining = monthlyRemaining(entitlement);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playSound('open_modal', soundEnabled);
          // Monetisasi belum ditampilkan ke pengguna: tetap QRIS polos seperti biasa.
          if (monetizationVisible) openUpgrade();
          else setOpen(true);
        }}
        aria-label="Donasi lewat QRIS"
        data-tour="castle-donasi"
        title={!monetizationVisible ? 'Donasi lewat QRIS' : entitlement.isLifetime ? 'Kamu Lifetime. Terima kasih!' : remaining > 0 ? `Kurang ${formatIdr(remaining)} untuk Full bulan ini` : 'Donasi lewat QRIS'}
        className={`${CASTLE_TILE} hover:bg-surface-elevated/40 cursor-pointer`}
      >
        <span className="p-2 rounded-xl bg-surface-inset/50 text-gold border border-border-subtle shrink-0">
          <Coffee className="w-4 h-4 md:w-5 md:h-5" />
        </span>
        <span className={`${CASTLE_TILE_LABEL} group-hover:text-gold transition-colors`}>Donasi</span>
      </button>

      {open && <QrisModal soundEnabled={soundEnabled} onClose={() => setOpen(false)} />}
    </>
  );
};

/** Modal QRIS polos (nominal bebas, tidak tercatat ke akun). */
export const QrisModal: React.FC<{ soundEnabled?: boolean; onClose: () => void }> = ({ soundEnabled, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const close = () => {
    playSound('click', soundEnabled);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9960] flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="QRIS SevnQuest"
      onClick={close}
    >
      <div
        className="panel panel-stitched w-full max-w-sm p-4 sm:p-5 flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between">
          <p className="breadcrumb-label text-gold flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5" /> Dukung SevnQuest
          </p>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated/60"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full max-w-[300px] aspect-square rounded-2xl bg-white p-2 shadow-md">
          <img
            src={QRIS_SRC}
            alt={`QRIS ${QRIS_MERCHANT}`}
            className="w-full h-full [image-rendering:pixelated]"
          />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold font-heading text-text-primary">{QRIS_MERCHANT}</p>
          <p className="text-[11px] text-text-secondary">
            Terima kasih sudah mendukung SevnQuest!
          </p>
        </div>

        <a
          href={QRIS_SRC}
          download="qris-sevnquest.png"
          onClick={() => playSound('click', soundEnabled)}
          className="w-full btn btn-pill text-xs gap-1.5 justify-center"
        >
          <Download className="w-3.5 h-3.5" /> Simpan gambar QRIS
        </a>
      </div>
    </div>,
    document.body,
  );
};
