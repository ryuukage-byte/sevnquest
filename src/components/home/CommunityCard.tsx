import React from 'react';
import { Users, MessagesSquare, Clock } from 'lucide-react';
import { playSound } from '../../utils/audio';

/** Link grup komunitas SevnQuest. Kosong = tombol tampil "Segera hadir" (nonaktif). */
export const COMMUNITY_URL = '';

interface CommunityCardProps {
  soundEnabled?: boolean;
}

/** Kartu "Komunitas" di dashboard: ajakan gabung grup belajar. */
export const CommunityCard: React.FC<CommunityCardProps> = ({ soundEnabled }) => {
  const ready = COMMUNITY_URL.length > 0;

  return (
    <section className="panel panel-stitched p-4 sm:p-5 h-full flex flex-col" aria-label="Komunitas">
      <div className="flex items-center gap-4 flex-1">
        <span className="w-[76px] h-[76px] ui-icon-box rounded-2xl text-indigo flex items-center justify-center shrink-0">
          <Users className="w-9 h-9" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="breadcrumb-label text-indigo">Komunitas</p>
          <p className="text-sm font-bold font-heading text-text-primary">Gabung grup belajar</p>
          <p className="text-xs text-text-secondary">
            Belajar bareng, tanya jawab, dan dapat kabar terbaru SevnQuest.
          </p>
        </div>
      </div>

      <div className="mt-3">
        {ready ? (
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('click', soundEnabled)}
            className="w-full btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 text-indigo"
          >
            <MessagesSquare className="w-3.5 h-3.5" /> Gabung grup
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="w-full btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 text-text-muted opacity-70 cursor-not-allowed"
          >
            <Clock className="w-3.5 h-3.5" /> Segera hadir
          </button>
        )}
      </div>
    </section>
  );
};
