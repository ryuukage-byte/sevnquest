import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone, X, ExternalLink, Info, AlertTriangle, Rocket } from 'lucide-react';
import { Announcement, AnnouncementKind, pickUnseen } from '../../lib/announcementsCore';
import { fetchActiveAnnouncements, loadSeenIds, markSeen } from '../../lib/announcements';
import { playSound } from '../../utils/audio';
import { AnnouncementBody } from './AnnouncementBody';

export const KIND_META: Record<AnnouncementKind, { label: string; Icon: typeof Info; tone: string }> = {
  info: { label: 'Info', Icon: Info, tone: 'text-indigo' },
  update: { label: 'Update', Icon: Rocket, tone: 'text-gold' },
  important: { label: 'Penting', Icon: AlertTriangle, tone: 'text-wine-accent' },
};

/** Kartu isi pengumuman — dipakai modal pemain dan pratinjau admin. */
export const AnnouncementCard: React.FC<{
  announcement: Pick<Announcement, 'title' | 'body' | 'kind' | 'ctaLabel' | 'ctaUrl'>;
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

/**
 * Menampilkan pengumuman admin yang aktif & belum dibaca, satu per satu (terbaru dulu).
 * Status "sudah dibaca" disimpan per perangkat (localStorage).
 */
export const AnnouncementModal: React.FC<{ suppressed?: boolean; soundEnabled?: boolean }> = ({
  suppressed = false,
  soundEnabled,
}) => {
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Beri jeda agar tidak bersaing dengan boot / sinkron cloud.
    const timer = window.setTimeout(async () => {
      const list = await fetchActiveAnnouncements();
      if (cancelled) return;
      setActiveIds(list.map(a => a.id));
      setQueue(pickUnseen(list, loadSeenIds()));
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const current = queue[0];

  const dismiss = useCallback(() => {
    if (!current) return;
    playSound('click', soundEnabled);
    markSeen(current.id, activeIds);
    setQueue(q => q.slice(1));
  }, [current, activeIds, soundEnabled]);

  if (!current || suppressed) return null;

  return (
    <div
      className="fixed inset-0 z-[9970] flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="Pengumuman"
    >
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md panel panel-stitched p-5 sm:p-6 max-h-[92dvh] overflow-y-auto"
      >
        <AnnouncementCard
          announcement={current}
          onClose={dismiss}
          counter={queue.length > 1 ? `${queue.length} baru` : undefined}
          footer={
            <button type="button" onClick={dismiss} className="btn btn-pill w-full justify-center text-xs">
              {queue.length > 1 ? 'Mengerti, berikutnya' : 'Mengerti'}
            </button>
          }
        />
      </motion.div>
    </div>
  );
};
