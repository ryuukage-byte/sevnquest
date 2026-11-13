import { useCallback } from 'react';
import { useAccess } from '../../state/entitlement';
import { OFFICIAL_BOOKS } from '../../data/officialBooks';

/** Cek sumber materi Arcade sebelum mulai main (level JLPT atau buku template). */
export function useArcadeGuard() {
  const { guardLevel } = useAccess();
  return useCallback(
    (sourceType: 'LEVEL' | 'TEMPLATE_BOOK', level: string, bookId: string): boolean => {
      if (sourceType === 'TEMPLATE_BOOK') {
        const book = OFFICIAL_BOOKS.find(b => b.id === bookId);
        return guardLevel(book?.level, book?.title);
      }
      return guardLevel(level, `Arcade ${level}`);
    },
    [guardLevel]
  );
}
