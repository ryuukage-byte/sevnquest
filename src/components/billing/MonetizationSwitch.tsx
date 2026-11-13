import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAccess } from '../../state/entitlement';
import { adminSetMonetizationPublic, billingErrorMessage } from '../../lib/billing';

/**
 * Saklar admin: saat mati, pengguna biasa tidak melihat apa pun soal donasi berbayar, tingkat, badge,
 * atau gembok materi (semua terbuka seperti sebelum monetisasi). Admin tetap melihat semuanya untuk uji coba.
 */
export const MonetizationSwitch: React.FC = () => {
  const { entitlement, refresh } = useAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const on = entitlement.monetizationPublic;

  const toggle = async () => {
    const next = !on;
    const msg = next
      ? 'Tampilkan monetisasi ke semua pengguna? Materi di atas N5 akan terkunci untuk akun tanpa donasi.'
      : 'Sembunyikan monetisasi dari pengguna? Semua materi kembali terbuka.';
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError(null);
    try {
      await adminSetMonetizationPublic(next);
      await refresh(true);
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-inset text-xs p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        {on ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-text-muted" />}
        <span className="flex-1 font-bold text-text-primary">Tampilkan monetisasi ke pengguna</span>
        <button
          disabled={busy}
          onClick={toggle}
          role="switch"
          aria-checked={on}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-border-subtle'}`}
        >
          {busy
            ? <Loader2 className="w-4 h-4 animate-spin absolute top-1 left-3.5 text-white" />
            : <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />}
        </button>
      </div>
      <p className="text-text-muted">
        {on
          ? 'Menyala: pengguna melihat halaman donasi, tingkat, badge, dan gembok materi.'
          : 'Mati: pengguna tidak melihat premium sama sekali, semua materi terbuka. Kamu (admin) tetap melihat semuanya, dan pembayaran + verifikasi otomatis tetap berjalan.'}
      </p>
      {error && <p className="text-rose-400">{error}</p>}
    </div>
  );
};
