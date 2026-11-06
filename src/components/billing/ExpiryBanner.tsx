import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAccess } from '../../state/entitlement';
import { daysUntil, TIER_LABEL } from '../../utils/access';
import { safeGetItem, safeSetItem } from '../../utils/storage';

const DISMISS_KEY = 'sevnquest_expiry_banner_dismissed';

/** Pengingat H-3/H-1 dan masa tenggang (PRD 6.5). Bisa ditutup, muncul lagi esok hari. */
export const ExpiryBanner: React.FC = () => {
  const { entitlement, openUpgrade } = useAccess();
  const today = new Date().toISOString().slice(0, 10);
  const [dismissed, setDismissed] = useState(() => safeGetItem(DISMISS_KEY) === today);

  if (dismissed || entitlement.isLifetime || entitlement.accessTier === 'basic' || !entitlement.accessExpiresAt) return null;
  const days = daysUntil(entitlement.accessExpiresAt);
  if (days === null || (days > 3 && !entitlement.accessInGrace)) return null;

  const tier = TIER_LABEL[entitlement.accessTier];
  // Pesan memakai kata "Akses" karena Full kini dibuka lewat donasi, bukan paket.
  const text = entitlement.accessInGrace
    ? `Akses ${tier} sudah berakhir. Masa tenggang 3 hari sedang berjalan; setelah itu kembali ke akses gratis.`
    : days <= 1
      ? `Akses ${tier} berakhir besok.`
      : `Akses ${tier} berakhir dalam ${days} hari.`;

  return (
    <div className="max-w-4xl lg:max-w-6xl w-full mx-auto px-3.5 sm:px-4 pt-3">
      <div className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-gold/50 bg-gold/10 text-xs text-text-primary">
        <AlertTriangle className="w-4 h-4 text-gold shrink-0" />
        <span className="flex-1">{text}</span>
        <button onClick={() => openUpgrade()} className="btn-cta px-3 py-1.5 text-[11px] font-bold shrink-0">Donasi</button>
        <button
          onClick={() => { safeSetItem(DISMISS_KEY, today); setDismissed(true); }}
          className="text-text-muted hover:text-text-primary shrink-0"
          title="Tutup untuk hari ini"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
