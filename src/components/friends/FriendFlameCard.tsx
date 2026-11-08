import React, { lazy, Suspense, useState } from 'react';
import { Flame, ChevronRight, Megaphone } from 'lucide-react';
import type { Mission } from '../../types/rpg';
import { useFriendStatus } from '../../lib/friendStreak';
import { bestFlame, flameProgress, friendBadgeCount } from '../../lib/friendStreakCore';
import { playSound } from '../../utils/audio';

const FriendFlamePanel = lazy(() => import('./FriendFlamePanel').then(m => ({ default: m.FriendFlamePanel })));

interface FriendFlameCardProps {
  dailyMissions: Mission[];
  soundEnabled?: boolean;
  onOpenAuth?: () => void;
  onOpenMissions?: () => void;
}

/** Kartu "Api Bareng" di Castle: streak berdua dengan teman, dinyalakan dengan misi harian. */
export const FriendFlameCard: React.FC<FriendFlameCardProps> = ({ dailyMissions, soundEnabled, onOpenAuth, onOpenMissions }) => {
  const status = useFriendStatus();
  const [open, setOpen] = useState(false);
  const progress = flameProgress(dailyMissions);
  const meDone = status.meDone || progress.ready;
  const active = status.friends.filter(f => f.status === 'active');
  const badge = friendBadgeCount({ ...status, meDone });
  const best = bestFlame(status);
  const nudger = !meDone ? active.find(f => f.nudgedMe) : undefined;
  const waitingFor = meDone ? active.filter(f => !f.friendDone).length : 0;

  const onClick = () => {
    if (!status.signedIn) {
      playSound('click', soundEnabled);
      onOpenAuth?.();
      return;
    }
    playSound('open_modal', soundEnabled);
    setOpen(true);
  };

  let subtitle: string;
  if (!status.signedIn) subtitle = 'Masuk ke akun untuk nyalain api bareng teman';
  else if (nudger) subtitle = `${nudger.friendName} ngingetin kamu buat belajar!`;
  else if (active.length === 0) subtitle = 'Ajak teman, jaga api belajar kalian tiap hari';
  else if (!meDone) subtitle = `Selesaikan misi harian ${progress.done}/${progress.required} untuk menyalakan api`;
  else if (waitingFor > 0) subtitle = `Apimu menyala. ${waitingFor} teman belum belajar, ingatkan mereka!`;
  else subtitle = 'Semua api menyala hari ini!';

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="panel !p-3 md:!p-4 relative w-full flex items-center gap-3 text-left hover:bg-surface-elevated/40 transition-colors group"
        aria-label={`Api Bareng: ${subtitle}`}
      >
        <span className="relative w-11 h-11 ui-icon-box rounded-xl shrink-0">
          <Flame className={`w-6 h-6 ${meDone && status.signedIn ? 'text-orange-400 fill-orange-400/70' : 'text-text-muted'}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-bold font-heading text-text-primary group-hover:text-gold transition-colors">
              Api Bareng
            </span>
            {status.signedIn && active.length > 0 && (
              <span className="px-1.5 rounded-full bg-surface-inset border border-border-subtle text-[10px] font-mono font-bold text-gold leading-4">
                {best} hari
              </span>
            )}
          </div>
          <div className={`text-[11px] md:text-xs truncate flex items-center gap-1 ${nudger ? 'text-amber-300' : 'text-text-secondary'}`}>
            {nudger && <Megaphone className="w-3 h-3 shrink-0" />}
            {subtitle}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold shrink-0" />
        {badge > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-wine-accent text-white text-[10px] font-black leading-[18px] text-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <Suspense fallback={null}>
          <FriendFlamePanel
            progress={progress}
            soundEnabled={soundEnabled}
            onClose={() => setOpen(false)}
            onOpenMissions={
              onOpenMissions
                ? () => {
                    setOpen(false);
                    onOpenMissions();
                  }
                : undefined
            }
          />
        </Suspense>
      )}
    </>
  );
};
