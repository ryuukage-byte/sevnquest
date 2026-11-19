// ==============================================================================
// SCROLL LOCK BERSAMA (ref-count) — bagian dari GLOBAL UI POSITIONING STANDARD
// Lihat docs/architecture/UI_POSITIONING_STANDARD.md
//
// Pola lama di tiap modal ("simpan overflow lama → set hidden → kembalikan") rusak
// bila dua overlay terbuka bersamaan lalu ditutup tidak berurutan: overlay pertama
// mengembalikan '' padahal overlay kedua masih terbuka, lalu overlay kedua
// mengembalikan 'hidden' → halaman terkunci permanen. Modul ini menghitung jumlah
// pemegang kunci per elemen dan baru memulihkan gaya asli saat pemegang terakhir lepas.
// ==============================================================================

export interface ScrollLockTarget {
  style: { overflow: string; paddingRight: string };
}

interface LockState {
  count: number;
  overflow: string;
  paddingRight: string;
}

const locks = new WeakMap<ScrollLockTarget, LockState>();

/**
 * Kunci gulir `target` (biasanya document.body). Mengembalikan fungsi pelepas yang
 * aman dipanggil berkali-kali. `scrollbarWidth` > 0 menambah padding kanan agar
 * konten di belakang tidak bergeser saat scrollbar desktop hilang.
 */
export function acquireScrollLock(target: ScrollLockTarget, scrollbarWidth = 0): () => void {
  let state = locks.get(target);
  if (!state) {
    state = { count: 0, overflow: target.style.overflow, paddingRight: target.style.paddingRight };
    locks.set(target, state);
    target.style.overflow = 'hidden';
    if (scrollbarWidth > 0) target.style.paddingRight = `${scrollbarWidth}px`;
  }
  state.count += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = locks.get(target);
    if (!current) return;
    current.count -= 1;
    if (current.count <= 0) {
      target.style.overflow = current.overflow;
      target.style.paddingRight = current.paddingRight;
      locks.delete(target);
    }
  };
}

/** Jumlah pemegang kunci aktif (untuk pengujian/diagnosis). */
export function scrollLockCount(target: ScrollLockTarget): number {
  return locks.get(target)?.count ?? 0;
}

/** Kunci gulir halaman (document.body) dengan kompensasi lebar scrollbar. Aman di SSR. */
export function lockPageScroll(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  return acquireScrollLock(document.body, scrollbarWidth);
}
