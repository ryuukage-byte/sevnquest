import React, { useEffect, useState } from 'react';
import { Heart, Loader2, Award, Crown, Medal, Trophy, CalendarDays } from 'lucide-react';
import { fetchDonorBoard, type DonorBoardRow } from '../../lib/billing';
import { useAccess } from '../../state/entitlement';
import { BADGES } from '../../utils/access';

const kanjiOf = (level: number) => BADGES.find(b => b.level === level)?.kanji ?? '';

/** Urutkan donatur bulan ini dari total terbesar (month_rank dari server), cadangan: tingkat tertinggi. */
export function sortMonthlyDonors(rows: DonorBoardRow[]): DonorBoardRow[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const ra = a.r.month_rank ?? Number.MAX_SAFE_INTEGER;
      const rb = b.r.month_rank ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      const ta = a.r.month_tier ?? 0;
      const tb = b.r.month_tier ?? 0;
      if (ta !== tb) return tb - ta;
      return a.i - b.i;
    })
    .map(x => x.r);
}

/** Gaya podium untuk 3 donatur teratas bulan ini (permukaan washi polos, jahitan sashiko berwarna). */
const PODIUM = [
  { label: '1', edge: 'border-gold', stitch: 'border-gold/50', icon: 'text-gold', Icon: Crown },
  { label: '2', edge: 'border-slate-400/70', stitch: 'border-slate-400/40', icon: 'text-slate-400', Icon: Medal },
  { label: '3', edge: 'border-amber-700/80', stitch: 'border-amber-700/50', icon: 'text-amber-700', Icon: Medal },
] as const;

/** Jahitan sashiko di dalam kartu (garis putus-putus seperti kain dijahit). */
const Stitch: React.FC<{ className?: string }> = ({ className = 'border-[color:var(--thread)]' }) => (
  <span aria-hidden className={`pointer-events-none absolute inset-1 rounded-[12px] border border-dashed ${className}`} />
);

/** Bagian papan: panel washi dengan serat kertas dan jahitan sashiko. */
const BoardSection: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent = '' }) => (
  <section className={`panel panel-stitched !p-4 sm:!p-5 overflow-hidden ${accent}`}>
    <div className="skeuo-grain" />
    <div className="relative z-10 space-y-3">{children}</div>
  </section>
);

const TierChip: React.FC<{ tier?: number | null }> = ({ tier }) =>
  tier && tier > 0 ? <span className="rpg-badge-reward shrink-0">Tingkat {tier}</span> : null;

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

  // Hall of Fame: pemegang Lifetime dulu, lalu pembeli Tahunan (server sudah mengurutkan dari total terbesar).
  const fame = (rows || []).filter(r => r.is_lifetime || r.is_yearly)
    .sort((a, b) => Number(b.is_lifetime) - Number(a.is_lifetime));
  const badged = (rows || []).filter(r => !r.is_lifetime && !r.is_yearly && r.badge_level > 0);
  const monthly = sortMonthlyDonors((rows || []).filter(r => r.monthly_this_month));
  const podium = monthly.slice(0, 3);
  const rest = monthly.slice(3);
  const name = (r: DonorBoardRow) => r.display_name || 'Donatur anonim';

  return (
    <div className="space-y-4">
      <div className="px-3.5 py-2.5 text-xs text-center text-text-secondary bg-surface-inset rounded-xl border border-border-subtle">
        Terima kasih untuk semua yang menjaga SevnQuest tetap hidup. Papan ini terpisah dari peringkat belajar; donasi tidak memberi EXP.
      </div>

      {rows === null && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>}
      {error && <p className="text-center text-xs text-rose-400">Papan donatur belum bisa dimuat. Coba lagi nanti.</p>}

      {fame.length > 0 && (
        <BoardSection accent="!border-gold/60">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gold font-heading flex items-center gap-1.5">
              <Trophy className="w-4 h-4" fill="currentColor" /> Hall of Fame
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Mereka berada di urutan teratas, dan akan diusahakan selalu mendapat fitur-fitur yang dibutuhkan selama SevnQuest masih
              hidup.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {fame.map((r, i) => (
              <div key={`f${i}`} className="relative flex items-center gap-3 p-3 rounded-2xl border border-gold/60 bg-surface-inset">
                <Stitch className="border-gold/40" />
                <span className="relative shrink-0 w-10 h-10 rounded-full border border-gold/50 bg-surface-card text-gold flex items-center justify-center">
                  {r.is_lifetime ? <Crown className="w-5 h-5" fill="currentColor" /> : <CalendarDays className="w-5 h-5" />}
                </span>
                <span className="relative flex-1 min-w-0">
                  <span className="block font-bold text-sm text-text-primary truncate">{name(r)}</span>
                  {r.badge_level > 0 && (
                    <span className="block text-[11px] text-text-secondary truncate">
                      <span className="font-heading text-gold">{kanjiOf(r.badge_level)}</span> {r.badge_title}
                    </span>
                  )}
                </span>
                <span className="relative rpg-badge-reward shrink-0">{r.is_lifetime ? 'Selamanya' : 'Tahunan'}</span>
              </div>
            ))}
          </div>
        </BoardSection>
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
        <BoardSection>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary font-heading flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400" fill="currentColor" /> Donatur Bulan Ini
            </h3>
            <span className="text-[10px] text-text-muted">{monthly.length} donatur · urut dari donasi terbesar</span>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {podium.map((r, i) => {
              const st = PODIUM[i];
              return (
                <li
                  key={`p${i}`}
                  className={`relative flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-3 sm:py-4 rounded-2xl border bg-surface-inset ${st.edge} ${i === 0 ? 'sm:order-2' : i === 1 ? 'sm:order-1' : 'sm:order-3'}`}
                >
                  <Stitch className={st.stitch} />
                  <span className={`relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full border bg-surface-card flex items-center justify-center ${st.edge} ${st.icon}`}>
                    <st.Icon className="w-5 h-5" fill={i === 0 ? 'currentColor' : 'none'} />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-card border border-border-subtle text-[10px] font-black text-text-primary flex items-center justify-center">
                      {st.label}
                    </span>
                  </span>
                  <div className="relative flex-1 min-w-0 w-full flex sm:flex-col items-center justify-between gap-1.5">
                    <span className={`min-w-0 max-w-full truncate font-bold text-text-primary ${i === 0 ? 'text-base' : 'text-sm'}`}>{name(r)}</span>
                    <TierChip tier={r.month_tier} />
                  </div>
                </li>
              );
            })}
          </ol>

          {rest.length > 0 && (
            <ol className="space-y-1.5" start={4}>
              {rest.map((r, i) => (
                <li key={`m${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border-subtle bg-surface-inset">
                  <span className="w-6 text-center text-xs font-black text-text-muted">{i + 4}</span>
                  <Heart className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span className="flex-1 min-w-0 text-sm font-semibold text-text-primary truncate">{name(r)}</span>
                  <TierChip tier={r.month_tier} />
                </li>
              ))}
            </ol>
          )}
        </BoardSection>
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
