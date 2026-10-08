import React, { useRef } from 'react';

/**
 * Untuk tab keep-alive: selama tab tersembunyi, kembalikan ELEMEN YANG SAMA (bukan yang baru) sehingga
 * React melewati re-render seluruh subpohonnya. Tanpa ini, setiap pindah tab me-render ulang semua tab
 * yang pernah dibuka (makin banyak tab dibuka, makin lambat).
 *
 * Render terakhir saat berubah menjadi tersembunyi tetap diteruskan sekali, supaya prop seperti
 * `isActive` sempat bernilai false. Saat tab aktif lagi, konten dirender dengan props terbaru.
 * State internal tab tidak terpengaruh.
 */
export const FreezeWhenHidden: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
  const frozen = useRef<React.ReactNode>(children);
  const wasActive = useRef(active);
  if (active || wasActive.current) frozen.current = children;
  wasActive.current = active;
  return <>{frozen.current}</>;
};
