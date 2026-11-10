import React, { lazy, Suspense, useState } from 'react';
import { useMailStatus } from '../../lib/mail';
import { playSound } from '../../utils/audio';
import type { PostOfficeView } from './PostOffice';
import { MailboxIdle } from './MailScenes';
import { CASTLE_TILE, CASTLE_TILE_LABEL } from '../home/castleTile';

const PostOffice = lazy(() => import('./PostOffice').then(m => ({ default: m.PostOffice })));

interface MailboxCardProps {
  playerName: string;
  soundEnabled?: boolean;
  onOpenAuth?: () => void;
}

/** Ubin "Kotak Pos" di Castle: kotak pos merah mini, bendera + angka bila ada surat baru. */
export const MailboxCard: React.FC<MailboxCardProps> = ({ playerName, soundEnabled, onOpenAuth }) => {
  const status = useMailStatus();
  const [openView, setOpenView] = useState<PostOfficeView | null>(null);

  const flagUp = status.unread > 0;
  const adminWaiting = status.isAdmin && status.adminUnread > 0;
  const badge = status.unread + (status.isAdmin ? status.adminUnread : 0);

  const onClick = () => {
    if (!status.signedIn) {
      playSound('click', soundEnabled);
      onOpenAuth?.();
      return;
    }
    playSound('open_modal', soundEnabled);
    setOpenView(adminWaiting && !flagUp ? 'admin' : 'inbox');
  };

  const label = !status.signedIn
    ? 'Kotak Pos: masuk ke akun untuk membuka'
    : badge > 0
      ? `Kotak Pos: ${badge} surat baru`
      : 'Kotak Pos';

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        data-tour="castle-mailbox"
        className={`${CASTLE_TILE} hover:bg-surface-elevated/40 cursor-pointer`}
      >
        <MailboxIdle variant="red" flagUp={flagUp || adminWaiting} size={34} />
        <span className={`${CASTLE_TILE_LABEL} group-hover:text-gold transition-colors`}>Kotak Pos</span>
        {badge > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-wine-accent text-white text-[10px] font-black leading-[18px]">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

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
    </>
  );
};
