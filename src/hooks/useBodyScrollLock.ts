import { useEffect } from 'react';
import { lockPageScroll } from '../utils/scrollLock';

/**
 * Kunci gulir halaman selama `active` bernilai true. Ber-ref-count, jadi aman untuk
 * overlay bertumpuk yang ditutup dalam urutan apa pun (lihat utils/scrollLock.ts).
 */
export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    return lockPageScroll();
  }, [active]);
}
