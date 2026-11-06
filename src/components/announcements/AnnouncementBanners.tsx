import React, { useState } from 'react';
import { ChevronRight, EyeOff, Pin } from 'lucide-react';
import { Announcement, bannerList, bodyExcerpt, remainingLabel } from '../../lib/announcementsCore';
import { hideBanner, markRead, useAnnouncements } from '../../lib/announcements';
import { playSound } from '../../utils/audio';
import { AnnouncementReader, KIND_META } from './AnnouncementModal';

/**
 * Kartu pengumuman di dashboard (Castle). Tetap tampil selama pengumuman aktif;
 * bisa disembunyikan pemain hanya bila admin mengizinkan (dismissible).
 */
export const AnnouncementBanners: React.FC<{ soundEnabled?: boolean }> = ({ soundEnabled }) => {
  const { list, reader } = useAnnouncements();
  const [open, setOpen] = useState<Announcement | null>(null);
  const items = bannerList(list, reader);
  const acked = new Set(reader.acked);

  if (items.length === 0 && !open) return null;

  return (
    <div className="space-y-2" aria-label="Pengumuman">
      {items.map(a => {
        const meta = KIND_META[a.kind];
        const unread = !acked.has(a.id);
        const remaining = remainingLabel(a.endsAt);
        return (
          <div
            key={a.id}
            className={`panel !p-0 overflow-hidden border-l-4 ${meta.accent} flex items-stretch`}
          >
            <button
              type="button"
              onClick={() => {
                playSound('open_modal', soundEnabled);
                setOpen(a);
              }}
              className="flex-1 min-w-0 flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-surface-elevated/40 transition-colors"
            >
              <div className={`w-10 h-10 ui-icon-box rounded-xl shrink-0 ${meta.tone}`}>
                <meta.Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`breadcrumb-label ${meta.tone}`}>Pengumuman · {meta.label}</span>
                  {unread && (
                    <span className="px-1.5 py-0.5 rounded-full bg-wine-accent/15 text-wine-accent text-[9px] font-black uppercase tracking-wider">
                      Belum dibaca
                    </span>
                  )}
                  {!a.dismissible && <Pin className="w-3 h-3 text-text-muted" aria-label="Disematkan" />}
                </div>
                <p className="text-sm font-bold font-heading text-text-primary truncate">{a.title}</p>
                <p className="text-xs text-text-secondary line-clamp-2">{bodyExcerpt(a.body)}</p>
                {remaining && <p className="text-[10px] text-text-muted mt-0.5">{remaining}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
            </button>
            {a.dismissible && (
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  hideBanner(a.id);
                }}
                className="px-3 text-text-muted hover:text-text-primary border-l border-border-subtle"
                aria-label="Sembunyikan pengumuman"
                title="Sembunyikan"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}

      {open && (
        <AnnouncementReader
          key={open.id}
          announcement={open}
          alreadyRead={acked.has(open.id)}
          soundEnabled={soundEnabled}
          onConfirm={() => {
            markRead(open.id);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
};
