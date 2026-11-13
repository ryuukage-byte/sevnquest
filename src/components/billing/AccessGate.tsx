import React from 'react';
import { Lock, Crown, X } from 'lucide-react';
import { useAccess } from '../../state/entitlement';
import { requiredTierForLevel, TIER_LABEL, type AccessTier } from '../../utils/access';

/** Pengganti isi modal saat materi terkunci (gating lunak, PRD 6.4). */
export const LockedOverlay: React.FC<{
  requiredTier: AccessTier;
  label: string;
  onClose?: () => void;
}> = ({ requiredTier, label, onClose }) => {
  const { openUpgrade } = useAccess();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="w-full max-w-sm panel panel-stitched bg-surface-card border border-border-subtle rounded-3xl p-6 text-center space-y-4 relative shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {onClose && (
          <button onClick={onClose} className="absolute top-3 right-3 btn-physical-secondary w-8 h-8 rounded-xl flex items-center justify-center p-0" title="Tutup">
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center">
          <Lock className="w-7 h-7 text-gold" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading font-black text-text-primary text-lg">{label} terkunci</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Materi ini butuh akses <b>{TIER_LABEL[requiredTier]}</b>. Gratis mencakup kana sampai N5; Full terbuka lewat
            donasi (total Rp 17.000 sebulan). Progres yang sudah kamu kumpulkan tetap tersimpan.
          </p>
        </div>
        <button
          onClick={() => openUpgrade({ requiredTier, label })}
          className="btn-cta w-full py-3 text-xs font-heading font-black flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" /> Buka dengan Donasi
        </button>
      </div>
    </div>
  );
};

/** Lencana gembok kecil untuk opsi level/item yang terkunci. */
export const LockBadge: React.FC<{ tier: AccessTier; className?: string }> = ({ tier, className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold ${className}`}>
    <Lock className="w-2.5 h-2.5" /> {TIER_LABEL[tier]}
  </span>
);

/**
 * Bungkus modal detail materi: bila level materinya di atas paket pengguna, tampilkan LockedOverlay sebagai gantinya.
 * Dipakai untuk modal Kotoba/Kanji/Bunpou sehingga semua jalur pembuka (Library, pencarian, deck) ikut terkunci.
 */
export function withLevelGate<P extends object>(
  Component: React.ComponentType<P>,
  opts: {
    getLevel: (p: P) => string | null | undefined;
    isOpen: (p: P) => boolean;
    getClose: (p: P) => (() => void) | undefined;
    labelPrefix: string;
  }
): React.FC<P> {
  const Gated: React.FC<P> = (props) => {
    const { canAccessLevel } = useAccess();
    const level = opts.getLevel(props);
    if (opts.isOpen(props) && level && !canAccessLevel(level)) {
      return (
        <LockedOverlay
          requiredTier={requiredTierForLevel(level)}
          label={`${opts.labelPrefix} ${level}`}
          onClose={opts.getClose(props)}
        />
      );
    }
    return <Component {...props} />;
  };
  Gated.displayName = `withLevelGate(${Component.displayName || Component.name || 'Component'})`;
  return Gated;
}
