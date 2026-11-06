import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Loader2, Check, Ban, RefreshCw, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import { formatIdr, planLabel } from '../../utils/access';
import { AutoVerifyPanel } from './AutoVerifyPanel';
import {
  adminApprove, adminListOrders, adminProofUrl, adminReject, billingErrorMessage, type AdminOrder, type OrderStatus,
} from '../../lib/billing';

const FILTERS: { id: string; label: string; statuses: OrderStatus[] }[] = [
  { id: 'open', label: 'Perlu dicek', statuses: ['claimed', 'pending'] },
  { id: 'expired', label: 'Kedaluwarsa', statuses: ['expired'] },
  { id: 'done', label: 'Selesai', statuses: ['paid', 'rejected'] },
];

const REJECT_REASONS = [
  'Pembayaran dengan nominal ini tidak ditemukan',
  'Nominal yang masuk kurang dari tagihan',
  'Bukti bayar tidak valid',
];

function fmt(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Halaman verifikasi pembayaran (PRD 6.3 fase 1). Admin membuka riwayat transaksi di app GoPay Merchant di sebelahnya
 * dan mencocokkan nominal unik + jam bayar. Akses dijaga di server (RPC memeriksa tabel admins).
 */
export const AdminPaymentsModal: React.FC<{ onClose: () => void; soundEnabled?: boolean }> = ({ onClose, soundEnabled = true }) => {
  const [filter, setFilter] = useState(FILTERS[0]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofUrls, setProofUrls] = useState<Record<string, string | null>>({});

  useBackButton(true, () => { onClose(); }, 'admin_payments');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await adminListOrders(filter.statuses));
      setSelected(new Set());
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const total = useMemo(
    () => orders.filter(o => selected.has(o.id)).reduce((s, o) => s + o.amount_idr, 0),
    [orders, selected]
  );

  const approve = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (ids.length > 1 && !window.confirm(`Setujui ${ids.length} pesanan? Pastikan semua nominal sudah ada di riwayat GoPay Merchant.`)) return;
    setError(null);
    for (const id of ids) {
      setBusyId(id);
      try {
        await adminApprove(id);
      } catch (err) {
        setError(`${orders.find(o => o.id === id)?.order_code}: ${billingErrorMessage(err)}`);
        break;
      }
    }
    setBusyId(null);
    playSound('fanfare', soundEnabled);
    void load();
  };

  const reject = async (o: AdminOrder) => {
    const reason = window.prompt(
      `Alasan menolak ${o.order_code} (${formatIdr(o.amount_idr)}):\n` + REJECT_REASONS.map((r, i) => `${i + 1}. ${r}`).join('\n') +
        '\n\nKetik nomor atau alasan sendiri.',
      '1'
    );
    if (reason === null) return;
    const idx = Number(reason.trim());
    const text = Number.isInteger(idx) && idx >= 1 && idx <= REJECT_REASONS.length ? REJECT_REASONS[idx - 1] : reason.trim();
    setBusyId(o.id);
    try {
      await adminReject(o.id, text);
      void load();
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const showProof = async (o: AdminOrder) => {
    if (!o.proof_path) return;
    const url = await adminProofUrl(o.proof_path);
    setProofUrls(prev => ({ ...prev, [o.id]: url }));
    if (url) window.open(url, '_blank', 'noopener');
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const actionable = (o: AdminOrder) => o.status === 'claimed' || o.status === 'pending' || o.status === 'expired';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-2 sm:p-4 bg-black/80 overflow-y-auto">
      <div className="w-full max-w-3xl my-4 panel bg-surface-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-surface-inset/80">
          <h2 className="font-bold text-text-primary text-base font-heading flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold" /> Verifikasi Pembayaran
          </h2>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="btn-physical-secondary w-8 h-8 rounded-xl flex items-center justify-center p-0" title="Muat ulang">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="btn-physical-secondary w-8 h-8 rounded-xl flex items-center justify-center p-0" title="Tutup">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <p className="text-[11px] text-text-muted leading-relaxed">
            Pesanan yang nominalnya terbaca dari notifikasi HP disetujui otomatis. Sisanya: buka riwayat transaksi di app
            GoPay Merchant, cocokkan <b>nominal persis</b> dan jam bayar, lalu setujui. Jangan menyetujui hanya dari screenshot.
          </p>

          <AutoVerifyPanel />

          <div className="flex gap-1.5 text-xs font-bold">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl border ${filter.id === f.id ? 'bg-surface-elevated border-border-primary text-text-primary' : 'border-border-subtle text-text-muted'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          {selected.size > 0 && (
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gold/50 bg-surface-elevated text-xs">
              <span>{selected.size} dipilih · total {formatIdr(total)}</span>
              <button onClick={() => approve([...selected])} className="btn-cta px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Setujui semua
              </button>
            </div>
          )}

          {!loading && orders.length === 0 && <p className="text-center text-xs text-text-muted py-8">Tidak ada pesanan.</p>}

          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className={`rounded-2xl border p-3 text-xs ${o.status === 'claimed' ? 'border-indigo/50 bg-indigo/5' : 'border-border-subtle bg-surface-inset'}`}>
                <div className="flex items-start gap-2.5">
                  {actionable(o) && (
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} className="mt-1 w-4 h-4 accent-amber-500" />
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono font-black text-lg text-gold">{formatIdr(o.amount_idr)}</span>
                      <span className="font-bold text-text-primary">{planLabel(o.tier_code, o.base_price_idr)}</span>
                      <span className="text-[10px] uppercase text-text-muted">{o.status}</span>
                    </div>
                    <div className="text-text-secondary truncate">
                      {o.player_name || '—'} · {o.user_email || o.user_id}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono">
                      {o.order_code} · dibuat {fmt(o.created_at)}
                      {o.paid_at_reported && <> · <span className="text-text-primary">bayar {fmt(o.paid_at_reported)}</span></>}
                      {o.verified_at && <> · diproses {fmt(o.verified_at)}</>}
                    </div>
                    {o.reject_reason && <div className="text-[11px] text-rose-400">Ditolak: {o.reject_reason}</div>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {o.proof_path && (
                      <button onClick={() => showProof(o)} className="px-2.5 py-1.5 rounded-lg border border-border-subtle text-text-secondary flex items-center gap-1" title="Lihat bukti">
                        <ImageIcon className="w-3.5 h-3.5" /> {proofUrls[o.id] === null ? 'Gagal' : 'Bukti'}
                      </button>
                    )}
                    {(actionable(o) || o.status === 'rejected') && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => approve([o.id])}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-500/50 text-emerald-400 font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Setujui
                      </button>
                    )}
                    {actionable(o) && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => reject(o)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 flex items-center gap-1 disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" /> Tolak
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
