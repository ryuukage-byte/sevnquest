import React from 'react';
import { Users } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { CASTLE_TILE, CASTLE_TILE_LABEL } from './castleTile';

/** Link grup komunitas SevnQuest. Kosong = ubin tampil redup dengan tanda "Segera". */
export const COMMUNITY_URL = '';

interface CommunityCardProps {
  soundEnabled?: boolean;
}

/** Ubin "Komunitas" di Castle: membuka grup belajar. */
export const CommunityCard: React.FC<CommunityCardProps> = ({ soundEnabled }) => {
  const ready = COMMUNITY_URL.length > 0;
  const icon = (
    <span className="p-2 rounded-xl bg-surface-inset/50 text-indigo border border-border-subtle shrink-0">
      <Users className="w-4 h-4 md:w-5 md:h-5" />
    </span>
  );

  if (!ready) {
    return (
      <div
        className={`${CASTLE_TILE} opacity-60 cursor-default`}
        aria-label="Komunitas: segera hadir"
        title="Grup komunitas segera hadir"
      >
        {icon}
        <span className={CASTLE_TILE_LABEL}>Komunitas</span>
        <span className="absolute top-1.5 right-1.5 px-1.5 rounded-full bg-surface-inset text-text-muted text-[9px] font-bold leading-4 border border-border-subtle">
          Segera
        </span>
      </div>
    );
  }

  return (
    <a
      href={COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => playSound('click', soundEnabled)}
      aria-label="Gabung grup komunitas"
      title="Gabung grup komunitas"
      className={`${CASTLE_TILE} hover:bg-surface-elevated/40 cursor-pointer`}
    >
      {icon}
      <span className={`${CASTLE_TILE_LABEL} group-hover:text-gold transition-colors`}>Komunitas</span>
    </a>
  );
};
