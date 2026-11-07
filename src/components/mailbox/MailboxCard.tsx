import React, { lazy, Suspense, useState } from 'react';
import { PenLine, MailOpen, Landmark, LogIn } from 'lucide-react';
import { useMailStatus } from '../../lib/mail';
import { ADMIN_OFFICE } from '../../lib/mailCore';
import { playSound } from '../../utils/audio';
import type { PostOfficeView } from './PostOffice';
import { MailboxIdle } from './MailScenes';

const PostOffice = lazy(() => import('./PostOffice').then(m => ({ default: m.PostOffice })));

interface MailboxCardProps {
  playerName: string;
  soundEnabled?: boolean;
  onOpenAuth?: () => void;
}

/** Kartu "Kotak Pos" di dashboard: alamat pemain, bendera surat baru, buka kotak pos / tulis surat. */
export const MailboxCard: React.FC<MailboxCardProps> = ({ playerName, soundEnabled, onOpenAuth }) => {
  const status = useMailStatus();
  const [openView, setOpenView] = useState<PostOfficeView | null>(null);

  const open = (v: PostOfficeView) => {
    playSound('open_modal', soundEnabled);
    setOpenView(v);
  };

  const flagUp = status.unread > 0;

  return (
    <section className="panel panel-stitched p-4 sm:p-5 h-full flex flex-col" aria-label="Kotak Pos">
      <div className="flex items-center gap-4 flex-1">
        {/* Kotak pos merah; bendera naik bila ada surat baru */}
        <MailboxIdle variant="red" flagUp={flagUp} size={76} />

        <div className="min-w-0 flex-1">
          <p className="breadcrumb-label text-indigo">Kotak Pos</p>
          {!status.signedIn ? (
            <>
              <p className="text-sm font-bold font-heading text-text-primary">Punya kotak pos sendiri</p>
              <p className="text-xs text-text-secondary">
                Masuk ke akun untuk mendapat alamat kotak pos dan berkirim surat dengan admin.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm sm:text-base font-bold font-heading text-text-primary truncate">
                {flagUp ? `${status.unread} surat baru untukmu` : 'Tidak ada surat baru'}
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                Alamat: <span className="font-mono font-bold text-gold-soft">{status.address ?? (status.loaded ? '—' : '…')}</span>
              </p>
              {status.isAdmin && status.adminUnread > 0 && (
                <p className="text-[11px] font-bold text-gold flex items-center gap-1 mt-0.5">
                  <Landmark className="w-3 h-3" /> {ADMIN_OFFICE}: {status.adminUnread} surat belum dibaca
                </p>
              )}
              {status.error && <p className="text-[10px] text-wine-accent mt-0.5">{status.error}</p>}
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {!status.signedIn ? (
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onOpenAuth?.();
            }}
            className="col-span-2 btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 text-indigo"
          >
            <LogIn className="w-3.5 h-3.5" /> Masuk untuk membuka kotak pos
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => open(status.isAdmin && status.adminUnread > 0 && !flagUp ? 'admin' : 'inbox')}
              className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 text-indigo"
            >
              <MailOpen className="w-3.5 h-3.5" /> Buka Kotak Pos
            </button>
            <button
              type="button"
              onClick={() => open('compose')}
              className="btn btn-pill text-xs gap-1.5 justify-center"
            >
              <PenLine className="w-3.5 h-3.5" /> Tulis Surat
            </button>
          </>
        )}
      </div>

      {openView && (
        <Suspense fallback={null}>
          <PostOffice
            initialView={openView}
            playerName={playerName}
            soundEnabled={soundEnabled}
            onClose={() => setOpenView(null)}
          />
        </Suspense>
      )}
    </section>
  );
};
