import React, { useEffect, useState } from 'react';
import { Heart, Loader2, Infinity as InfinityIcon } from 'lucide-react';
import { fetchDonorBoard, type DonorBoardRow } from '../../lib/billing';
import { useAccess } from '../../state/entitlement';

/**
 * Papan donatur: hanya di dalam app (pengguna login), terpisah dari papan skor belajar.
 * Donatur yang memilih anonim tampil sebagai "Donatur anonim".
 */
export const DonorBoard: React.FC = () => {
  const { openUpgrade } = useAccess();
  const [rows, setRows] = useState<DonorBoardRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDonorBoard().then(setRows).catch(() => { setError(true); setRows([]); });
  }, []);

  const lifetime = (rows || []).filter(r => r.is_lifetime);
  const monthly = (rows || []).filter(r => !r.is_lifetime && r.donor_level > 0);

  return (
    <div className="space-y-4">
      <div className="px-3.5 py-2.5 text-xs text-center text-text-secondary bg-surface-inset rounded-xl border border-border-subtle">
        Terima kasih untuk semua yang menjaga SevnQuest tetap hidup. Papan ini terpisah dari peringkat belajar; donasi tidak memberi EXP.
      </div>

      {rows === null && (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      )}
      {error && <p className="text-center text-xs text-rose-400">Papan donatur belum bisa dimuat. Coba lagi nanti.</p>}

      {lifetime.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gold font-heading flex items-center gap-1.5">
            <InfinityIcon className="w-4 h-4" /> Lifetime · 永遠
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {lifetime.map((r, i) => (
              <div key={`l${i}`} className="flex items-center gap-2.5 p-3 rounded-2xl border border-gold/50 bg-gold/10">
                <span className="text-lg">👑</span>
                <span className="flex-1 min-w-0 font-bold text-sm text-text-primary truncate">{r.display_name || 'Donatur anonim'}</span>
                {r.donor_level > 0 && <span className="text-[10px] font-bold text-indigo">D{r.donor_level} {r.donor_title}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {monthly.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary font-heading flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-400" /> Donatur Bulan Ini
          </h3>
          <div className="space-y-1.5">
            {monthly.map((r, i) => (
              <div key={`m${i}`} className="flex items-center gap-3 p-2.5 rounded-xl border border-border-subtle bg-surface-inset">
                <span className="w-9 text-center font-mono font-black text-indigo">D{r.donor_level}</span>
                <span className="flex-1 min-w-0 text-sm font-bold text-text-primary truncate">{r.display_name || 'Donatur anonim'}</span>
                <span className="text-[11px] text-text-secondary">{r.donor_title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {rows && rows.length === 0 && !error && (
        <p className="text-center text-xs text-text-muted py-6">Belum ada donatur. Jadilah yang pertama!</p>
      )}

      <button
        onClick={() => openUpgrade({ tab: 'donor' })}
        className="btn-cta w-full py-3 text-xs font-heading font-black flex items-center justify-center gap-2"
      >
        <Heart className="w-4 h-4" /> Jadi Donatur
      </button>
    </div>
  );
};
