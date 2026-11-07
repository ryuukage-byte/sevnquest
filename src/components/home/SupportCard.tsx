import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, Download, Maximize2, X } from 'lucide-react';
import { playSound } from '../../utils/audio';

/** QRIS yang sama dengan untuk pembayaran (GoPay Merchant: Sevnsoul Store, Digital & Kreatif). */
export const QRIS_SRC = `${import.meta.env.BASE_URL || './'}qris.png`;
const QRIS_MERCHANT = 'Sevnsoul Store, Digital & Kreatif';

interface SupportCardProps {
  soundEnabled?: boolean;
}

/** Kartu "Dukung SevnQuest" di dashboard: QRIS kecil, ketuk untuk memperbesar / menyimpan. */
export const SupportCard: React.FC<SupportCardProps> = ({ soundEnabled }) => {
  const [open, setOpen] = useState(false);

  const show = () => {
    playSound('open_modal', soundEnabled);
    setOpen(true);
  };

  return (
    <section className="panel panel-stitched p-4 sm:p-5 h-full flex flex-col" aria-label="Dukung SevnQuest">
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          onClick={show}
          className="shrink-0 w-[76px] h-[76px] rounded-xl bg-white p-1.5 border border-border-subtle shadow-sm hover:scale-105 transition-transform cursor-zoom-in"
          aria-label="Perbesar QRIS"
        >
          <img src={QRIS_SRC} alt="" className="w-full h-full [image-rendering:pixelated]" loading="lazy" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="breadcrumb-label text-gold">Dukung SevnQuest</p>
          <p className="text-sm font-bold font-heading text-text-primary">Traktir lewat QRIS</p>
          <p className="text-xs text-text-secondary">
            Scan dari GoPay, OVO, DANA, ShopeePay, atau m-banking mana saja.
          </p>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={show}
          className="w-full btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 text-gold"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Buka QRIS
        </button>
      </div>

      {open && <QrisModal soundEnabled={soundEnabled} onClose={() => setOpen(false)} />}
    </section>
  );
};

const QrisModal: React.FC<{ soundEnabled?: boolean; onClose: () => void }> = ({ soundEnabled, onClose }) => {
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
            Terima kasih sudah mendukung. Sudah transfer? Kirim surat ke admin lewat Kotak Pos beserta bukti bayarnya.
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
