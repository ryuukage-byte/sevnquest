import React, { useEffect, useState } from 'react';
import { Heart, Loader2, Infinity as InfinityIcon, Award } from 'lucide-react';
import { fetchDonorBoard, type DonorBoardRow } from '../../lib/billing';
import { useAccess } from '../../state/entitlement';
import { BADGES } from '../../utils/access';

const kanjiOf = (level: number) => BADGES.find(b => b.level === level)?.kanji ?? '';

/**
 * Papan donatur: hanya di dalam app (pengguna login), terpisah dari papan skor belajar.
 * Nominal tidak ditampilkan; donatur yang memilih anonim tampil sebagai "Donatur anonim".
 */
export const DonorBoard: React.FC = () => {
  const { openUpgrade } = useAccess();
  const [rows, setRows] = useState<DonorBoardRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDonorBoard().then(setRows).catch(() => { setError(true); setRows([]); });
  }, []);

  const lifetime = (rows || []).filter(r => r.is_lifetime);
  const badged = (rows || []).filter(r => !r.is_lifetime && r.badge_level > 0);
  const monthly = (rows || []).filter(r => r.monthly_this_month);
  const name = (r: DonorBoardRow) => r.display_name || 'Donatur anonim';

  return (
    <div className="space-y-4">
      <div className="px-3.5 py-2.5 text-xs text-center text-text-secondary bg-surface-inset rounded-xl border border-border-subtle">
        Terima kasih untuk semua yang menjaga SevnQuest tetap hidup. Papan ini terpisah dari peringkat belajar; donasi tidak memberi EXP.
      </div>

      {rows === null && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>}
      {error && <p className="text-center text-xs text-rose-400">Papan donatur belum bisa dimuat. Coba lagi nanti.</p>}

      {lifetime.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gold font-heading flex items-center gap-1.5">
            <InfinityIcon className="w-4 h-4" /> Lifetime · 永遠 Eien
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {lifetime.map((r, i) => (
              <div key={`l${i}`} className="flex items-center gap-2.5 p-3 rounded-2xl border border-gold/50 bg-gold/10">
                <span className="text-lg">👑</span>
                <span className="flex-1 min-w-0 font-bold text-sm text-text-primary truncate">{name(r)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {badged.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary font-heading flex items-center gap-1.5">
            <Award className="w-4 h-4 text-gold" /> Pemegang Badge
          </h3>
          <div className="space-y-1.5">
            {badged.map((r, i) => (
              <div key={`b${i}`} className="flex items-center gap-3 p-2.5 rounded-xl border border-border-subtle bg-surface-inset">
                <span className="w-10 text-center font-heading text-gold">{kanjiOf(r.badge_level)}</span>
                <span className="flex-1 min-w-0 text-sm font-bold text-text-primary truncate">{name(r)}</span>
                <span className="text-[11px] text-text-secondary">{r.badge_title}</span>
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
          <div className="flex flex-wrap gap-1.5">
            {monthly.map((r, i) => (
              <span key={`m${i}`} className="px-2.5 py-1 rounded-full border border-border-subtle bg-surface-inset text-xs text-text-primary">
                {name(r)}
              </span>
            ))}
          </div>
        </section>
      )}

      {rows && rows.length === 0 && !error && (
        <p className="text-center text-xs text-text-muted py-6">Belum ada donatur. Jadilah yang pertama!</p>
      )}

      <button
        onClick={() => openUpgrade()}
        className="btn-cta w-full py-3 text-xs font-heading font-black flex items-center justify-center gap-2"
      >
        <Heart className="w-4 h-4" /> Donasi
      </button>
    </div>
  );
};
