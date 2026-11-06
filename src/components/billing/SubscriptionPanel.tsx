import React, { useEffect, useState } from 'react';
import { Crown, ShieldCheck, EyeOff, Loader2 } from 'lucide-react';
import { useAccess } from '../../state/entitlement';
import { badgeForTotal, formatIdr, monthlyRemaining } from '../../utils/access';
import { fetchDonorAnonymous, setDonorAnonymous } from '../../lib/billing';
import { playSound } from '../../utils/audio';

function fmt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Panel Pengaturan: paket aktif, tombol upgrade, opsi anonim donatur, dan pintu admin. */
export const SubscriptionPanel: React.FC<{ soundEnabled?: boolean }> = ({ soundEnabled = true }) => {
  const { entitlement, openUpgrade, openAdmin } = useAccess();
  const isDonor = entitlement.lifetimeTotal > 0 || entitlement.monthTotal > 0 || entitlement.isLifetime;
  const badge = badgeForTotal(entitlement.lifetimeTotal);
  const remaining = monthlyRemaining(entitlement);
  const [anonymous, setAnonymous] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isDonor) return;
    fetchDonorAnonymous().then(setAnonymous).catch(() => setAnonymous(false));
  }, [isDonor]);

  const toggleAnonymous = async () => {
    if (anonymous === null) return;
    setSaving(true);
    try {
      await setDonorAnonymous(!anonymous);
      setAnonymous(!anonymous);
      playSound('click', soundEnabled);
    } catch {
      playSound('wrong', soundEnabled);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel panel-stitched p-4 sm:p-5 space-y-3 shadow-md">
      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
        <Crown className="w-4 h-4 text-gold" /> Akses & Donasi
      </h3>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-heading font-black text-text-primary text-base">
          {entitlement.isLifetime ? 'Full selamanya' : entitlement.accessTier === 'full' ? 'Full' : 'Gratis'}
        </span>
        {!entitlement.isLifetime && entitlement.accessTier === 'full' && entitlement.accessExpiresAt && (
          <span className={entitlement.accessInGrace ? 'text-rose-400' : 'text-text-secondary'}>
            {entitlement.accessInGrace ? 'masa tenggang, ' : ''}sampai {fmt(entitlement.accessExpiresAt)}
          </span>
        )}
        {entitlement.accessTier === 'basic' && <span className="text-text-secondary">kana sampai N5</span>}
        {badge && (
          <span className="px-2 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold font-bold">{badge.kanji} {badge.title}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-border-subtle bg-surface-inset p-2.5">
          <div className="text-text-muted">Donasi bulan ini</div>
          <div className="font-mono font-bold text-text-primary">{formatIdr(entitlement.monthTotal)}</div>
          <div className="text-text-secondary">{entitlement.monthUnlocked ? 'Full bulan ini terbuka' : `kurang ${formatIdr(remaining)} untuk Full`}</div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-inset p-2.5">
          <div className="text-text-muted">Tabungan lifetime</div>
          <div className="font-mono font-bold text-text-primary">{formatIdr(entitlement.lifetimeTotal)}</div>
          <div className="text-text-secondary">dari {formatIdr(entitlement.config.lifetimeTarget)}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => { playSound('click', soundEnabled); openUpgrade(); }}
          className="btn-cta flex-1 py-2.5 text-xs font-heading font-black flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" /> Donasi & Buka Full
        </button>
        {entitlement.isAdmin && (
          <button
            onClick={() => { playSound('click', soundEnabled); openAdmin(); }}
            className="btn-physical-secondary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl"
          >
            <ShieldCheck className="w-4 h-4 text-gold" /> Verifikasi Pembayaran
          </button>
        )}
      </div>

      {isDonor && (
        <button
          onClick={toggleAnonymous}
          disabled={anonymous === null || saving}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border-subtle bg-surface-inset text-xs disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-text-secondary">
            <EyeOff className="w-4 h-4" /> Tampil anonim di papan donatur
          </span>
          {saving || anonymous === null ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          ) : (
            <span className={`w-9 h-5 rounded-full relative transition-colors ${anonymous ? 'bg-gold' : 'bg-surface-elevated border border-border-subtle'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${anonymous ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          )}
        </button>
      )}
    </div>
  );
};
