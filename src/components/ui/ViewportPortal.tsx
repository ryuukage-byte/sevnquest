// ==============================================================================
// VIEWPORT PORTAL — fondasi semua overlay (GLOBAL UI POSITIONING STANDARD)
// Lihat docs/architecture/UI_POSITIONING_STANDARD.md
//
// `position: fixed` hanya relatif ke layar bila TIDAK ada leluhur yang memakai
// transform / filter / perspective / will-change: transform / contain / backdrop-filter.
// Pembungkus tab, kartu ber-hover (translateY + brightness) dan motion.div semuanya
// bisa menjadi leluhur seperti itu, sehingga modal "menempel" ke elemen tersebut dan
// muncul jauh di luar layar. Merender overlay langsung ke document.body memutus
// ketergantungan itu untuk selamanya.
// ==============================================================================

import React from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export interface ViewportPortalProps {
  children: React.ReactNode;
  /**
   * Kunci gulir halaman di belakang selama portal terpasang (default: true).
   * Pakai `false` untuk elemen non-blocking seperti toast.
   */
  lockScroll?: boolean;
}

/**
 * Render `children` ke document.body agar `position: fixed` selalu relatif ke viewport.
 * Di lingkungan tanpa DOM (render-to-string pada tes) anak dirender di tempat.
 */
export const ViewportPortal: React.FC<ViewportPortalProps> = ({ children, lockScroll = true }) => {
  useBodyScrollLock(lockScroll);
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
};

/*
 * Pola markup standar modal tengah (lihat dokumen standar):
 *
 *   <ViewportPortal>
 *     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80
 *                     overflow-y-auto overscroll-contain">          ← latar: gulir di sini, bukan halaman
 *       <div className="my-auto w-full max-w-sm ...">…</div>      ← my-auto: tengah bila muat,
 *     </div>                                                         mulai dari atas bila lebih tinggi
 *   </ViewportPortal>
 */
