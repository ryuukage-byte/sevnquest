import { useCallback } from 'react';
import { useAccess } from '../../state/entitlement';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';

/** Cek sumber materi Arcade sebelum mulai main (level JLPT atau buku template). */
export function useArcadeGuard() {
  const { guardLevel } = useAccess();
  return useCallback(
    (sourceType: 'LEVEL' | 'TEMPLATE_BOOK' | 'USER_DECK', level: string, bookId: string): boolean => {
      // Buku Saku buatan sendiri adalah materi milik pemain: tidak digerbang per level.
      if (sourceType === 'USER_DECK') return true;
      if (sourceType === 'TEMPLATE_BOOK') {
        const book = OFFICIAL_BOOKS.find(b => b.id === bookId);
        return guardLevel(book?.level, book?.title);
      }
      return guardLevel(level, `Arcade ${level}`);
    },
    [guardLevel]
  );
}
