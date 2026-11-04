import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, Crown, Copy, Check, Loader2, Download, Clock, Heart, Lock, AlertCircle, Upload, Sparkles, ChevronLeft, Infinity as InfinityIcon,
} from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import {
  ACCESS_PLANS, DONOR_PLANS, DONOR_BENEFITS, LIFETIME_PLAN, TIER_LABEL, daysUntil, formatIdr, planLabel,
  type Entitlement, type PlanOption,
} from '../../utils/access';
import {
  billingErrorMessage, cancelPaymentOrder, createPaymentOrder, listMyOrders, submitPaymentClaim, uploadPaymentProof,
  type PaymentOrder,
} from '../../lib/billing';
import type { UpgradeRequest } from '../../state/entitlement';

/** Kode QRIS statis merchant (SEVNSOUL STORE, NMID ID1026625677186), hanya kode QR hitam-putih tanpa poster. */
export const QRIS_IMAGE_URL = '/payment/qris-sevnsoul.png';
export const MERCHANT_NMID = 'ID1026625677186';
export const MERCHANT_NAME = 'SEVNSOUL STORE, DIGITAL & KREATIF';

const ACCESS_FEATURES: Record<'medium' | 'full', string[]> = {
  medium: [
    'Semua materi N4 dan N3 (kotoba, kanji, bunpou, soal)',
    'Tower lantai 61–100',
    'Tryout N4–N3 dan semua mode Dungeon',
    'Latihan Ekstra Recall tanpa batas',
  ],
  full: [
    'Semua isi Medium',
    'Materi N2, N1, Kaigo, dan SSW',
    'Semua tryout',
    'Deck AI dan Imersi YouTube',
    'Early access fitur baru',
  ],
};

const STATUS_LABEL: Record<PaymentOrder['status'], string> = {
  pending: 'Menunggu pembayaran',
  claimed: 'Menunggu verifikasi',
  paid: 'Aktif',
  rejected: 'Ditolak',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
};

const STATUS_STYLE: Record<PaymentOrder['status'], string> = {
  pending: 'text-gold border-gold/40 bg-gold/10',
  claimed: 'text-indigo border-indigo/40 bg-indigo/10',
  paid: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  rejected: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  expired: 'text-text-muted border-border-subtle bg-surface-inset',
  cancelled: 'text-text-muted border-border-subtle bg-surface-inset',
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  request: UpgradeRequest;
  userId: string | null;
  entitlement: Entitlement;
  soundEnabled?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

type View = { kind: 'plans' } | { kind: 'order'; order: PaymentOrder } | { kind: 'free-donation' };

export const UpgradeModal: React.FC<Props> = ({ request, userId, entitlement, soundEnabled = true, onClose, onChanged }) => {
  const [tab, setTab] = useState<'access' | 'donor'>(request.tab || 'access');
  const [view, setView] = useState<View>({ kind: 'plans' });
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useBackButton(true, () => {
    if (view.kind !== 'plans') {
      setView({ kind: 'plans' });
      return false;
    }
    onClose();
  }, 'upgrade_modal');

  const reloadOrders = useCallback(async () => {
    try {
      setOrders(await listMyOrders());
    } catch (err) {
      console.warn('[upgrade] gagal memuat pesanan:', err);
    }
  }, []);

  useEffect(() => { void reloadOrders(); }, [reloadOrders]);

  const openOrders = useMemo(
    () => orders.filter(o => o.status === 'pending' || o.status === 'claimed'),
    [orders]
  );

  const handleBuy = async (plan: PlanOption) => {
    setError(null);
    setBusy(`${plan.tierCode}:${plan.periodMonths}`);
    playSound('click', soundEnabled);
    try {
      const order = await createPaymentOrder(plan.tierCode, plan.periodMonths);
      setView({ kind: 'order', order });
      void reloadOrders();
    } catch (err) {
      setError(billingErrorMessage(err));
      playSound('wrong', soundEnabled);
    } finally {
      setBusy(null);
    }
  };

  const expiresIn = daysUntil(entitlement.accessExpiresAt);
  const donorAllowed = entitlement.accessTier !== 'basic' || entitlement.isLifetime;

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 overflow-y-auto">
      <div className="w-full max-w-2xl my-4 panel panel-stitched bg-surface-card border border-border-subtle rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="skeuo-grain" />

        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-border-subtle bg-surface-inset/80 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {view.kind !== 'plans' ? (
              <button
                onClick={() => { setView({ kind: 'plans' }); playSound('click', soundEnabled); }}
                className="btn-physical-secondary w-8 h-8 rounded-xl flex items-center justify-center p-0 shrink-0"
                title="Kembali"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold shrink-0">
                <Crown className="w-4 h-4" />
              </div>
            )}
            <h2 className="font-bold text-text-primary text-base sm:text-lg font-heading tracking-wide truncate">
              {view.kind === 'order' ? 'Pembayaran QRIS' : view.kind === 'free-donation' ? 'Donasi Bebas' : 'Upgrade & Dukung SevnQuest'}
            </h2>
          </div>
          <button
            onClick={() => { playSound('click', soundEnabled); onClose(); }}
            className="btn-physical-secondary w-8 h-8 rounded-xl flex items-center justify-center p-0 shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 relative z-10 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-500/15 border border-border-subtle rounded-2xl text-rose-400 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {view.kind === 'order' && (
            <OrderView
              order={view.order}
              userId={userId}
              soundEnabled={soundEnabled}
              onUpdated={(o) => { setView({ kind: 'order', order: o }); void reloadOrders(); onChanged(); }}
              onCancelled={() => { setView({ kind: 'plans' }); void reloadOrders(); }}
            />
          )}

          {view.kind === 'free-donation' && <FreeDonationView />}

          {view.kind === 'plans' && (
            <>
              {/* Status saat ini */}
              <div className="rounded-2xl border border-border-subtle bg-surface-inset p-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <span className="text-text-muted">Paket kamu:</span>
                <span className="font-bold text-text-primary font-heading">
                  {entitlement.isLifetime ? 'Lifetime (Full selamanya)' : TIER_LABEL[entitlement.accessTier]}
                </span>
                {!entitlement.isLifetime && entitlement.accessExpiresAt && (
                  <span className={entitlement.accessInGrace ? 'text-rose-400' : 'text-text-secondary'}>
                    {entitlement.accessInGrace
                      ? `Masa tenggang — berakhir ${formatDate(entitlement.accessExpiresAt)}`
                      : `Aktif sampai ${formatDate(entitlement.accessExpiresAt)}${expiresIn !== null && expiresIn <= 3 ? ` (${expiresIn} hari lagi)` : ''}`}
                  </span>
                )}
                {entitlement.lifetimeTitle && (
                  <span className="px-2 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold font-bold">永遠 {entitlement.lifetimeTitle}</span>
                )}
                {entitlement.donorTitle && (
                  <span className="px-2 py-0.5 rounded-full border border-indigo/40 bg-indigo/10 text-indigo font-bold">
                    D{entitlement.donorLevel} {entitlement.donorTitle}
                  </span>
                )}
              </div>

              {request.label && request.requiredTier && request.requiredTier !== 'basic' && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-gold/40 bg-gold/10 text-xs text-text-primary">
                  <Lock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <p>
                    <b>{request.label}</b> tersedia mulai paket <b>{TIER_LABEL[request.requiredTier]}</b>.
                    Paket gratis mencakup kana sampai N5.
                  </p>
                </div>
              )}

              {openOrders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary font-heading">Pesanan berjalan</h3>
                  {openOrders.map(o => (
                    <OrderRow key={o.id} order={o} onOpen={() => setView({ kind: 'order', order: o })} />
                  ))}
                </div>
              )}

              {/* Tab */}
              <div className="flex gap-1.5 p-1 rounded-2xl bg-surface-inset border border-border-subtle text-xs font-bold">
                {(['access', 'donor'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); playSound('click', soundEnabled); }}
                    className={`flex-1 py-2 rounded-xl transition-all ${tab === t ? 'bg-surface-elevated text-text-primary border border-border-subtle' : 'text-text-muted'}`}
                  >
                    {t === 'access' ? 'Paket Belajar' : 'Donatur & Lifetime'}
                  </button>
                ))}
              </div>

              {tab === 'access' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['medium', 'full'] as const).map(tier => (
                    <div key={tier} className={`rounded-2xl border p-4 space-y-3 ${tier === 'full' ? 'border-gold/50 bg-gold/5' : 'border-border-subtle bg-surface-inset'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading font-black text-text-primary text-base">{TIER_LABEL[tier]}</h3>
                        {entitlement.accessTier === tier && !entitlement.isLifetime && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400">Aktif</span>
                        )}
                      </div>
                      <ul className="space-y-1 text-xs text-text-secondary">
                        {ACCESS_FEATURES[tier].map(f => (
                          <li key={f} className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />{f}</li>
                        ))}
                      </ul>
                      <div className="space-y-1.5">
                        {ACCESS_PLANS.filter(p => p.tierCode === tier).map(p => (
                          <button
                            key={p.periodMonths}
                            disabled={!!busy || entitlement.isLifetime}
                            onClick={() => handleBuy(p)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border-subtle bg-surface-card hover:border-border-primary text-xs disabled:opacity-50 transition-all"
                          >
                            <span className="text-text-secondary">{p.periodMonths} bulan</span>
                            <span className="font-bold text-text-primary font-mono flex items-center gap-1.5">
                              {busy === `${p.tierCode}:${p.periodMonths}` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              {formatIdr(p.priceIdr)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="sm:col-span-2 text-[11px] text-text-muted leading-relaxed">
                    Membeli lagi saat masih aktif akan menambah masa aktif. Naik dari Medium ke Full langsung aktif; sisa Medium tetap
                    berlaku setelah Full berakhir. Gratis selamanya: kana sampai N5.
                  </p>
                </div>
              )}

              {tab === 'donor' && (
                <div className="space-y-3">
                  {/* Lifetime */}
                  <div className="rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/15 to-transparent p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading font-black text-text-primary text-base flex items-center gap-1.5">
                        <InfinityIcon className="w-4 h-4 text-gold" /> Lifetime · title 永遠 Eien
                      </h3>
                      <span className="font-mono font-black text-gold">{formatIdr(LIFETIME_PLAN.priceIdr)}</span>
                    </div>
                    <ul className="text-xs text-text-secondary space-y-1">
                      <li>Akses Full selamanya, sekali bayar</li>
                      <li>Title permanen <b>Eien</b> yang tidak pernah hilang</li>
                      <li>Nama di papan donatur bagian Lifetime</li>
                    </ul>
                    <p className="text-[10px] text-text-muted">
                      "Selamanya" berarti selama SevnQuest beroperasi. Deck AI tetap mengikuti batas wajar harian (30 per hari).
                    </p>
                    <button
                      disabled={!!busy || entitlement.isLifetime}
                      onClick={() => handleBuy(LIFETIME_PLAN)}
                      className="btn-cta w-full py-2.5 text-xs font-heading font-black flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {busy === 'lifetime:0' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {entitlement.isLifetime ? 'Kamu sudah Lifetime' : 'Beli Lifetime'}
                    </button>
                  </div>

                  {/* Donatur bulanan */}
                  <div className="rounded-2xl border border-border-subtle bg-surface-inset p-4 space-y-2">
                    <h3 className="font-heading font-black text-text-primary text-sm flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-400" /> Title Donatur Bulanan
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Benefit kosmetik dan komunitas, tidak memengaruhi EXP atau papan skor belajar.
                      {!donorAllowed && ' Butuh paket Medium, Full, atau Lifetime yang aktif.'}
                    </p>
                    <div className="space-y-1.5">
                      {DONOR_PLANS.map((p, i) => (
                        <button
                          key={p.tierCode}
                          disabled={!!busy || !donorAllowed}
                          onClick={() => handleBuy(p)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-subtle bg-surface-card hover:border-border-primary text-left text-xs disabled:opacity-50 transition-all"
                        >
                          <span className="font-mono font-bold text-indigo w-6">{p.label}</span>
                          <span className="flex-1 min-w-0">
                            <span className="font-bold text-text-primary">{p.title}</span>
                            <span className="block text-[10px] text-text-muted truncate">{DONOR_BENEFITS[i]}</span>
                          </span>
                          <span className="font-mono font-bold text-text-primary flex items-center gap-1.5">
                            {busy === `${p.tierCode}:1` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {formatIdr(p.priceIdr)}<span className="text-text-muted font-normal">/bln</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => { setView({ kind: 'free-donation' }); playSound('click', soundEnabled); }}
                    className="w-full py-2.5 text-xs text-text-muted hover:text-text-primary underline-offset-2 hover:underline"
                  >
                    Donasi bebas tanpa benefit (nominal bebas)
                  </button>
                </div>
              )}

              {orders.some(o => o.status !== 'pending' && o.status !== 'claimed') && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-text-muted">Riwayat pesanan</summary>
                  <div className="space-y-2 mt-2">
                    {orders.filter(o => o.status !== 'pending' && o.status !== 'claimed').map(o => (
                      <OrderRow key={o.id} order={o} onOpen={() => setView({ kind: 'order', order: o })} />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const OrderRow: React.FC<{ order: PaymentOrder; onOpen: () => void }> = ({ order, onOpen }) => (
  <button
    onClick={onOpen}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-subtle bg-surface-inset hover:border-border-primary text-left text-xs"
  >
    <span className="flex-1 min-w-0">
      <span className="font-bold text-text-primary block truncate">{planLabel(order.tier_code, order.period_months)}</span>
      <span className="text-[10px] text-text-muted font-mono">{order.order_code} · {formatDate(order.created_at)}</span>
    </span>
    <span className="font-mono font-bold text-text-primary">{formatIdr(order.amount_idr)}</span>
    <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
  </button>
);

const QrisCard: React.FC = () => (
  <div className="space-y-2">
    <div className="rounded-2xl overflow-hidden border border-border-subtle bg-white mx-auto max-w-[280px] p-2">
      <img
        src={QRIS_IMAGE_URL}
        alt={`QRIS ${MERCHANT_NAME}`}
        className="w-full h-auto block"
        style={{ imageRendering: 'pixelated' }}
        loading="eager"
      />
      <div className="text-center pb-1 pt-0.5 leading-tight">
        <div className="text-[11px] font-bold text-neutral-900">QRIS · {MERCHANT_NAME}</div>
        <div className="text-[10px] text-neutral-600 font-mono">NMID {MERCHANT_NMID}</div>
      </div>
    </div>
    <div className="flex justify-center">
      <a
        href={QRIS_IMAGE_URL}
        download="QRIS-SevnQuest.png"
        className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-inset"
      >
        <Download className="w-3.5 h-3.5" /> Simpan gambar QRIS (untuk scan dari galeri)
      </a>
    </div>
  </div>
);

const FreeDonationView: React.FC = () => (
  <div className="space-y-4">
    <p className="text-xs text-text-secondary leading-relaxed">
      Scan QRIS di bawah dengan e-wallet atau m-banking apa pun, lalu isi nominal bebas. Donasi seperti ini tidak memberi badge,
      karena tidak bisa dicocokkan ke akunmu. Untuk title donatur, pilih paket di tab Donatur & Lifetime.
    </p>
    <QrisCard />
    <p className="text-center text-[11px] text-text-muted">Merchant: {MERCHANT_NAME}</p>
  </div>
);

const OrderView: React.FC<{
  order: PaymentOrder;
  userId: string | null;
  soundEnabled: boolean;
  onUpdated: (o: PaymentOrder) => void;
  onCancelled: () => void;
}> = ({ order, userId, soundEnabled, onUpdated, onCancelled }) => {
  const [copied, setCopied] = useState(false);
  const [paidAt, setPaidAt] = useState(() => toLocalInputValue(new Date()));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = order.status === 'pending' && Date.parse(order.expires_at) < Date.now();
  const canClaim = order.status === 'pending' || order.status === 'claimed' || order.status === 'expired';

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(order.amount_idr));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const submitClaim = async () => {
    setError(null);
    if (file && file.size > 3 * 1024 * 1024) {
      setError('Ukuran screenshot maksimal 3 MB.');
      return;
    }
    setBusy(true);
    try {
      let proofPath: string | null = null;
      if (file && userId) {
        // Bukti hanya pendukung: gagal unggah tidak boleh menggagalkan klaim.
        try {
          proofPath = await uploadPaymentProof(userId, order.id, file);
        } catch (err) {
          console.warn('[upgrade] unggah bukti gagal, klaim dikirim tanpa bukti:', err);
        }
      }
      const when = paidAt ? new Date(paidAt) : new Date();
      const updated = await submitPaymentClaim(order.id, Number.isFinite(when.getTime()) ? when : new Date(), proofPath);
      playSound('fanfare', soundEnabled);
      onUpdated(updated);
    } catch (err) {
      setError(billingErrorMessage(err));
      playSound('wrong', soundEnabled);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelPaymentOrder(order.id);
      onCancelled();
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div>
          <div className="font-bold text-text-primary">{planLabel(order.tier_code, order.period_months)}</div>
          <div className="font-mono text-text-muted">Kode pesanan {order.order_code}</div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[expired ? 'expired' : order.status]}`}>
          {STATUS_LABEL[expired ? 'expired' : order.status]}
        </span>
      </div>

      {order.status === 'paid' && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300">
          Pembayaran sudah diverifikasi pada {formatDate(order.verified_at)}. Paketmu aktif. Terima kasih sudah mendukung SevnQuest!
        </div>
      )}
      {order.status === 'rejected' && (
        <div className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300 space-y-1">
          <p>Pembayaran tidak bisa diverifikasi{order.reject_reason ? `: ${order.reject_reason}` : '.'}</p>
          <p>Bila kamu yakin sudah membayar, hubungi kami lewat Pengaturan → Call Center dengan kode pesanan {order.order_code}.</p>
        </div>
      )}
      {order.status === 'claimed' && (
        <div className="p-3.5 rounded-2xl border border-indigo/40 bg-indigo/10 text-xs text-text-primary flex gap-2">
          <Clock className="w-4 h-4 text-indigo shrink-0 mt-0.5" />
          <p>Klaim diterima. Admin mencocokkan pembayaran setiap malam; paket aktif <b>paling lambat 1×24 jam</b>. Kamu boleh menutup halaman ini.</p>
        </div>
      )}

      {(order.status === 'pending' || order.status === 'claimed' || order.status === 'expired') && (
        <>
          <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-center space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">Bayar tepat sejumlah</div>
            <button onClick={copyAmount} className="inline-flex items-center gap-2 font-mono font-black text-3xl text-gold" title="Salin nominal">
              {formatIdr(order.amount_idr)}
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 opacity-70" />}
            </button>
            <p className="text-[11px] text-text-muted">
              Harga {formatIdr(order.base_price_idr)} dikurangi kode unik {order.unique_code}. Nominal yang persis dipakai untuk
              mencocokkan pembayaran ke akunmu — jangan dibulatkan.
            </p>
            {order.status === 'pending' && (
              <p className={`text-[11px] ${expired ? 'text-rose-400' : 'text-text-secondary'}`}>
                {expired ? 'Batas waktu lewat. Bila sudah terlanjur bayar, tetap kirim klaim di bawah.' : `Bayar sebelum ${formatDate(order.expires_at)}`}
              </p>
            )}
          </div>

          <QrisCard />

          <ol className="text-xs text-text-secondary space-y-1 list-decimal pl-5">
            <li>Buka e-wallet atau m-banking apa pun yang mendukung QRIS.</li>
            <li>Scan QRIS di atas (atau simpan gambarnya lalu scan dari galeri).</li>
            <li>Pastikan nama merchant <b>{MERCHANT_NAME}</b>.</li>
            <li>Ketik nominal <b className="text-gold">{formatIdr(order.amount_idr)}</b> persis, lalu bayar.</li>
            <li>Kembali ke sini dan tekan <b>Saya sudah bayar</b>.</li>
          </ol>

          {canClaim && (
            <div className="rounded-2xl border border-border-subtle bg-surface-inset p-4 space-y-3">
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-text-secondary">Jam bayar</span>
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={e => setPaidAt(e.target.value)}
                  className="w-full bg-surface-card border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-text-secondary">Screenshot bukti bayar (opsional, maks. 3 MB)</span>
                <span className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-subtle text-xs text-text-muted cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="truncate">{file ? file.name : order.proof_path ? 'Bukti sudah terunggah (pilih untuk mengganti)' : 'Pilih gambar'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                </span>
              </label>
              <button
                disabled={busy}
                onClick={submitClaim}
                className="btn-cta w-full py-3 text-xs font-heading font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {order.status === 'claimed' ? 'Perbarui klaim' : 'Saya sudah bayar'}
              </button>
              {order.status === 'pending' && !expired && (
                <button disabled={busy} onClick={cancel} className="w-full text-[11px] text-text-muted hover:text-rose-400">
                  Batalkan pesanan
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
