import { useEffect, useRef } from 'react';
import type { Mission } from '../types/rpg';
import { checkInFlame, setFriendPlayerName, useFriendStatus } from '../lib/friendStreak';
import { flameProgress } from '../lib/friendStreakCore';

/**
 * Api Bareng: begitu syarat misi harian terpenuhi, catat ke server bahwa api pemain hari ini menyala
 * (sekali per hari server; panggilan server idempoten). Tamu / server tanpa migrasi dilewati.
 */
export function useFriendFlameCheckin(dailyMissions: Mission[], playerName: string | undefined): void {
  const status = useFriendStatus();
  const ready = flameProgress(dailyMissions).ready;
  const attempted = useRef('');

  useEffect(() => {
    setFriendPlayerName(playerName || '');
  }, [playerName]);

  useEffect(() => {
    if (!ready || !status.signedIn || !status.loaded || status.meDone || status.error) return;
    const key = status.today || 'unknown';
    if (attempted.current === key) return;
    attempted.current = key;
    void checkInFlame().then(res => {
      if (!res.ok) attempted.current = '';
    });
  }, [ready, status.signedIn, status.loaded, status.meDone, status.today, status.error]);
}
