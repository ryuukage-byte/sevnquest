import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone, X, ExternalLink, Info, AlertTriangle, Rocket, Lock, Check } from 'lucide-react';
import { Announcement, AnnouncementKind, ackGate, popupQueue } from '../../lib/announcementsCore';
import { markClosed, markRead, markShownThisSession, useAnnouncements } from '../../lib/announcements';
import { playSound } from '../../utils/audio';
import { AnnouncementBody } from './AnnouncementBody';

export const KIND_META: Record<AnnouncementKind, { label: string; Icon: typeof Info; tone: string; accent: string }> = {
  info: { label: 'Info', Icon: Info, tone: 'text-indigo', accent: 'border-l-indigo' },
  update: { label: 'Update', Icon: Rocket, tone: 'text-gold', accent: 'border-l-gold' },
  important: { label: 'Penting', Icon: AlertTriangle, tone: 'text-wine-accent', accent: 'border-l-wine-accent' },
};

type CardContent = Pick<Announcement, 'title' | 'body' | 'kind' | 'ctaLabel' | 'ctaUrl'>;

/** Isi pengumuman — dipakai pembaca dan pratinjau admin. */
export const AnnouncementCard: React.FC<{
  announcement: CardContent;
  footer?: React.ReactNode;
  onClose?: () => void;
  counter?: string;
}> = ({ announcement: a, footer, onClose, counter }) => {
  const meta = KIND_META[a.kind];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`breadcrumb-label flex items-center gap-1.5 ${meta.tone}`}>
          <Megaphone className="w-3.5 h-3.5" /> Pengumuman · {meta.label}
          {counter && <span className="text-text-muted">· {counter}</span>}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
            aria-label="Tutup pengumuman"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 ui-icon-box rounded-xl shrink-0 ${meta.tone}`}>
          <meta.Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold font-heading text-text-primary leading-snug pt-1.5 break-words min-w-0">
          {a.title || 'Tanpa judul'}
        </h3>
      </div>

      <AnnouncementBody body={a.body} />

      {a.ctaLabel && a.ctaUrl && (
        <a
          href={a.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-pill w-full justify-center gap-1.5 text-xs"
        >
          {a.ctaLabel} <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      {footer}
    </div>
  );
};

/** Hitung detik yang benar-benar dilihat (berhenti saat aplikasi di latar belakang). */
function useVisibleSeconds(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setElapsed(e => e + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return elapsed;
}

/**
 * Pembaca pengumuman (modal). Menegakkan opsi admin:
 * - dismissible=false: tanpa tombol X / klik latar, hanya bisa ditutup lewat konfirmasi
 * - minReadSeconds: tombol konfirmasi terkunci dengan hitung mundur
 * - requireAck: wajib centang "Saya sudah membaca"
 * Bila sudah pernah dikonfirmasi (alreadyRead), cukup tombol Tutup.
 */
export const AnnouncementReader: React.FC<{
  announcement: Announcement;
  alreadyRead?: boolean;
  counter?: string;
  soundEnabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ announcement: a, alreadyRead = false, counter, soundEnabled, onConfirm, onClose }) => {
  const gated = !alreadyRead;
  const elapsed = useVisibleSeconds(gated && a.minReadSeconds > 0);
  const [checked, setChecked] = useState(false);
  const { remainingSeconds, canConfirm } = gated ? ackGate(a, elapsed, checked) : { remainingSeconds: 0, canConfirm: true };
  const closable = alreadyRead || a.dismissible;

  useEffect(() => {
    if (!closable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closable, onClose]);

  const confirm = () => {
    if (!canConfirm) return;
    playSound('click', soundEnabled);
    onConfirm();
  };

  const footer = alreadyRead ? (
    <button type="button" onClick={onClose} className="btn btn-pill w-full justify-center text-xs">
      Tutup
    </button>
  ) : (
    <div className="space-y-3 pt-1">
      {a.requireAck && (
        <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-surface-inset border border-border-subtle cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--color-gold,#d4a017)] shrink-0"
          />
          <span className="text-xs font-bold text-text-primary">Saya sudah membaca dan memahami pengumuman ini.</span>
        </label>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={!canConfirm}
        className={`btn btn-pill w-full justify-center gap-1.5 text-xs ${canConfirm ? 'btn-cta' : 'opacity-60 cursor-not-allowed'}`}
      >
        {remainingSeconds > 0 ? (
          <>
            <Lock className="w-3.5 h-3.5" /> Baca dulu… {remainingSeconds} detik
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5" /> {a.requireAck || a.minReadSeconds > 0 || !a.dismissible ? 'Saya sudah membaca' : 'Mengerti'}
          </>
        )}
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[9970] flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="Pengumuman"
      onClick={closable ? onClose : undefined}
    >
      <motion.div
        key={a.id}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md panel panel-stitched p-5 sm:p-6 max-h-[92dvh] overflow-y-auto"
      >
        <AnnouncementCard announcement={a} onClose={closable ? onClose : undefined} counter={counter} footer={footer} />
      </motion.div>
    </div>
  );
};

/**
 * Pop-up otomatis: menampilkan pengumuman aktif sesuai opsi admin (tampilan, frekuensi), satu per satu.
 * Ditahan selama tur onboarding.
 */
export const AnnouncementPopupHost: React.FC<{ suppressed?: boolean; soundEnabled?: boolean }> = ({
  suppressed = false,
  soundEnabled,
}) => {
  const { list, reader } = useAnnouncements();
  const [current, setCurrent] = useState<Announcement | null>(null);
  const queue = popupQueue(list, reader);
  const next = queue[0];

  useEffect(() => {
    if (current || suppressed || !next) return;
    setCurrent(next);
    markShownThisSession(next.id);
  }, [current, suppressed, next]);

  if (!current || suppressed) return null;

  return (
    <AnnouncementReader
      key={current.id}
      announcement={current}
      counter={queue.length > 0 ? `${queue.length} lagi` : undefined}
      soundEnabled={soundEnabled}
      onConfirm={() => {
        markRead(current.id);
        setCurrent(null);
      }}
      onClose={() => {
        playSound('click', soundEnabled);
        markClosed(current.id);
        setCurrent(null);
      }}
    />
  );
};
