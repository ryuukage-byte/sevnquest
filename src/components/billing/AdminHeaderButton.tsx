import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAccess } from '../../state/entitlement';

/** Pintasan ke halaman Verifikasi Pembayaran di header; hanya tampil untuk admin. */
export const AdminHeaderButton: React.FC = () => {
  const { entitlement, openAdmin } = useAccess();
  if (!entitlement.isAdmin) return null;
  return (
    <button
      type="button"
      onClick={openAdmin}
      className="btn-physical-secondary h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-[11px] font-bold"
      title="Verifikasi Pembayaran (admin)"
    >
      <ShieldCheck className="w-4 h-4 text-gold" />
      <span className="hidden sm:inline">Admin</span>
    </button>
  );
};
