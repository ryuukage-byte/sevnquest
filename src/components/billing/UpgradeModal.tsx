import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X, Crown, Copy, Check, Loader2, Download, Clock, Heart, Lock, AlertCircle, Upload, ChevronLeft, Minus, Plus,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import {
  BADGES, badgeForTotal, nextBadge, monthlyRemaining, lifetimeUnitsLeft, daysUntil, formatIdr, planLabel,
  type Entitlement,
} from '../../utils/access';
import {
  billingErrorMessage, cancelPaymentOrder, createPaymentOrder, fetchOrder, listMyOrders, submitPaymentClaim, uploadPaymentProof,
  type DonationKind, type PaymentOrder,
} from '../../lib/billing';
import type { UpgradeRequest } from '../../state/entitlement';

/** Kode QRIS statis merchant (SEVNSOUL STORE, NMID ID1026625677186), hanya kode QR hitam-putih tanpa poster. */
export const QRIS_IMAGE_URL = '/payment/qris-sevnsoul.png';
export const MERCHANT_NMID = 'ID1026625677186';
export const MERCHANT_NAME = 'SEVNSOUL STORE, DIGITAL & KREATIF';

const FULL_FEATURES = [
  'Semua materi N4 sampai N1, Kaigo, dan SSW',
  'Bedah Soal tanpa batas (gratis 3 soal per hari)',
  'Seluruh Bank Soal dan semua tryout, Tower lantai 61–100, semua mode Dungeon',
  'Deck AI dan Imersi YouTube',
  'Latihan Ekstra Recall tanpa batas',
];

const STATUS_LABEL: Record<PaymentOrder['status'], string> = {
  pending: 'Menunggu pembayaran',
  claimed: 'Menunggu verifikasi',
  paid: 'Tercatat',
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

function monthName(month: string | null): string {
  const d = month ? new Date(`${month}-01T00:00:00`) : new Date();
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

const ProgressBar: React.FC<{ value: number; max: number; tone?: 'gold' | 'indigo' }> = ({ value, max, tone = 'gold' }) => (
  <div className="h-2.5 rounded-full bg-surface-card border border-border-subtle overflow-hidden">
    <div
      className={`h-full rounded-full transition-all ${tone === 'gold' ? 'bg-gold' : 'bg-indigo'}`}
      style={{ width: `${Math.min(100, Math.round((value / Math.max(1, max)) * 100))}%` }}
    />
  </div>
);

interface Props {
  request: UpgradeRequest;
  userId: string | null;
  entitlement: Entitlement;
  soundEnabled?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

type View = { kind: 'plans' } | { kind: 'order'; order: PaymentOrder };

export const UpgradeModal: React.FC<Props> = ({ request, userId, entitlement, soundEnabled = true, onClose, onChanged }) => {
  const cfg = entitlement.config;
  const [tab, setTab] = useState<'monthly' | 'lifetime'>(request.tab === 'donor' ? 'lifetime' : 'monthly');
  const [view, setView] = useState<View>({ kind: 'plans' });
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [busy, setBusy] = useState<DonationKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = monthlyRemaining(entitlement);
  const unitsLeft = lifetimeUnitsLeft(entitlement);
  const [monthlyAmount, setMonthlyAmount] = useState<string>(() => String(Math.max(cfg.monthlyMin, remaining || cfg.monthlyThreshold)));
  const [units, setUnits] = useState(1);

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

  const openOrders = useMemo(() => orders.filter(o => o.status === 'pending' || o.status === 'claimed'), [orders]);
  // Donasi yang sudah diklaim tapi belum diverifikasi, supaya hitungan "kurang Rp X" tidak membingungkan.
  const claimedMonthly = useMemo(
    () => openOrders.filter(o => o.tier_code === 'monthly' && o.status === 'claimed').reduce((s, o) => s + o.base_price_idr, 0),
    [openOrders]
  );

  const donate = async (kind: DonationKind, amount: number) => {
    setError(null);
    setBusy(kind);
    playSound('click', soundEnabled);
    try {
      const order = await createPaymentOrder(kind, amount);
      setView({ kind: 'order', order });
      void reloadOrders();
    } catch (err) {
      setError(billingErrorMessage(err));
      playSound('wrong', soundEnabled);
    } finally {
      setBusy(null);
    }
  };

  const monthlyValue = Math.floor(Number(monthlyAmount.replace(/\D/g, '')) || 0);
  const monthlyValid = monthlyValue >= cfg.monthlyMin && monthlyValue <= 10_000_000;
  const afterThis = entitlement.monthTotal + monthlyValue;
  const unitsSafe = Math.max(1, Math.min(units, unitsLeft || 1));
  const lifeAmount = unitsSafe * cfg.lifetimeUnit;
  const badge = badgeForTotal(entitlement.lifetimeTotal);
  const next = nextBadge(entitlement.lifetimeTotal);
  const expiresIn = daysUntil(entitlement.accessExpiresAt);

  const chips = Array.from(new Set([remaining > 0 ? Math.max(cfg.monthlyMin, remaining) : 0, 5000, 10000, cfg.monthlyThreshold, 25000, 50000]))
    .filter(v => v >= cfg.monthlyMin)
    .sort((a, b) => a - b)
    .slice(0, 6);

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
              {view.kind === 'order' ? 'Pembayaran QRIS' : 'Dukung SevnQuest'}
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

          {view.kind === 'plans' && (
            <>
              {/* Status saat ini */}
              <div className="rounded-2xl border border-border-subtle bg-surface-inset p-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                <span className="text-text-muted">Akses:</span>
                <span className="font-bold text-text-primary font-heading">
                  {entitlement.isLifetime ? 'Full selamanya' : entitlement.accessTier === 'full' ? 'Full' : 'Gratis (kana sampai N5)'}
                </span>
                {!entitlement.isLifetime && entitlement.accessTier === 'full' && entitlement.accessExpiresAt && (
                  <span className={entitlement.accessInGrace ? 'text-rose-400' : 'text-text-secondary'}>
                    {entitlement.accessInGrace
                      ? `masa tenggang, berakhir ${formatDate(entitlement.accessExpiresAt)}`
                      : `sampai ${formatDate(entitlement.accessExpiresAt)}${expiresIn !== null && expiresIn <= 3 ? ` (${expiresIn} hari lagi)` : ''}`}
                  </span>
                )}
                {badge && (
                  <span className="px-2 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold font-bold">{badge.kanji} {badge.title}</span>
                )}
              </div>

              {request.label && request.requiredTier && request.requiredTier !== 'basic' && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-gold/40 bg-gold/10 text-xs text-text-primary">
                  <Lock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <p>
                    <b>{request.label}</b> butuh akses Full. Gratis mencakup kana sampai N5; Full terbuka lewat donasi di bawah.
                  </p>
                </div>
              )}

              {openOrders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary font-heading">Donasi berjalan</h3>
                  {openOrders.map(o => (
                    <OrderRow key={o.id} order={o} onOpen={() => setView({ kind: 'order', order: o })} />
                  ))}
                </div>
              )}

              {/* Tab */}
              <div className="flex gap-1.5 p-1 rounded-2xl bg-surface-inset border border-border-subtle text-xs font-bold">
                {(['monthly', 'lifetime'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); playSound('click', soundEnabled); }}
                    className={`flex-1 py-2 rounded-xl transition-all ${tab === t ? 'bg-surface-elevated text-text-primary border border-border-subtle' : 'text-text-muted'}`}
                  >
                    {t === 'monthly' ? 'Bulanan (nominal bebas)' : 'Lifetime (per Rp 25 rb)'}
                  </button>
                ))}
              </div>

              {tab === 'monthly' && (
                <div className="rounded-2xl border border-border-subtle bg-surface-inset p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-heading font-black text-text-primary text-sm flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-400" /> Donasi {monthName(entitlement.month)}
                    </h3>
                    <span className="font-mono text-xs text-text-secondary">
                      {formatIdr(entitlement.monthTotal)} / {formatIdr(cfg.monthlyThreshold)}
                    </span>
                  </div>
                  <ProgressBar value={entitlement.monthUnlocked ? cfg.monthlyThreshold : entitlement.monthTotal} max={cfg.monthlyThreshold} />
                  <p className="text-xs text-text-primary">
                    {entitlement.monthUnlocked
                      ? 'Full bulan ini sudah terbuka. Donasi tambahan tetap tercatat sebagai dukungan. Terima kasih!'
                      : <>Kurang <b className="text-gold">{formatIdr(remaining)}</b> lagi untuk membuka <b>Full {cfg.fullDays} hari</b>.</>}
                  </p>
                  {claimedMonthly > 0 && (
                    <p className="text-[11px] text-indigo">{formatIdr(claimedMonthly)} sedang menunggu verifikasi dan belum masuk hitungan.</p>
                  )}
                  <ul className="text-[11px] text-text-secondary space-y-0.5">
                    {FULL_FEATURES.map(f => <li key={f} className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{f}</li>)}
                  </ul>

                  <div className="flex flex-wrap gap-1.5">
                    {chips.map(v => (
                      <button
                        key={v}
                        onClick={() => setMonthlyAmount(String(v))}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono ${monthlyValue === v ? 'border-gold text-gold bg-gold/10' : 'border-border-subtle text-text-secondary'}`}
                      >
                        {formatIdr(v)}{v === remaining && remaining > 0 ? ' (pas)' : ''}
                      </button>
                    ))}
                  </div>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold text-text-secondary">Nominal (bebas, min. {formatIdr(cfg.monthlyMin)})</span>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-surface-card">
                      <span className="text-xs text-text-muted">Rp</span>
                      <input
                        inputMode="numeric"
                        value={monthlyValue ? monthlyValue.toLocaleString('id-ID') : ''}
                        onChange={e => setMonthlyAmount(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-mono text-text-primary focus:outline-none"
                        placeholder={String(cfg.monthlyThreshold)}
                      />
                    </div>
                  </label>
                  {monthlyValid && !entitlement.monthUnlocked && (
                    <p className="text-[11px] text-text-muted">
                      {afterThis >= cfg.monthlyThreshold
                        ? `Setelah donasi ini diverifikasi, Full ${cfg.fullDays} hari langsung terbuka.`
                        : `Setelah donasi ini: ${formatIdr(afterThis)} — kurang ${formatIdr(cfg.monthlyThreshold - afterThis)} lagi.`}
                    </p>
                  )}
                  <button
                    disabled={!!busy || !monthlyValid}
                    onClick={() => donate('monthly', monthlyValue)}
                    className="btn-cta w-full py-3 text-xs font-heading font-black flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy === 'monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                    Donasi {monthlyValid ? formatIdr(monthlyValue) : ''}
                  </button>
                  <p className="text-[10px] text-text-muted">
                    Total dihitung per bulan kalender (WIB) dan kembali ke 0 tiap awal bulan. Full terbuka sekali per bulan, berlaku
                    {` ${cfg.fullDays}`} hari sejak donasi yang mencapai ambang diverifikasi.
                  </p>
                </div>
              )}

              {tab === 'lifetime' && (
                <div className="rounded-2xl border border-gold/50 bg-gradient-to-br from-gold/10 to-transparent p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-heading font-black text-text-primary text-sm flex items-center gap-1.5">
                      <InfinityIcon className="w-4 h-4 text-gold" /> Tabungan Lifetime
                    </h3>
                    <span className="font-mono text-xs text-text-secondary">
                      {formatIdr(entitlement.lifetimeTotal)} / {formatIdr(cfg.lifetimeTarget)}
                    </span>
                  </div>
                  <ProgressBar value={entitlement.lifetimeTotal} max={cfg.lifetimeTarget} />
                  <p className="text-xs text-text-primary">
                    {entitlement.isLifetime
                      ? 'Kamu sudah Lifetime: Full selamanya dan title 永遠 Eien. Terima kasih!'
                      : <>Setor kelipatan <b>{formatIdr(cfg.lifetimeUnit)}</b>. Tiap setoran membuka <b>Full {cfg.fullDays} hari</b>, dan total {formatIdr(cfg.lifetimeTarget)} = <b>Full selamanya</b>.{next && <> Badge berikutnya: <b className="text-gold">{next.kanji} {next.title}</b> (kurang {formatIdr(next.minTotal - entitlement.lifetimeTotal)}).</>}</>}
                  </p>

                  {/* Tangga badge */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {BADGES.map(b => {
                      const got = entitlement.lifetimeTotal >= b.minTotal;
                      return (
                        <div
                          key={b.level}
                          className={`rounded-xl border px-1.5 py-1.5 text-center ${got ? 'border-gold/60 bg-gold/15' : 'border-border-subtle bg-surface-inset opacity-70'}`}
                        >
                          <div className={`text-sm font-heading ${got ? 'text-gold' : 'text-text-muted'}`}>{b.kanji}</div>
                          <div className="text-[10px] font-bold text-text-primary">{b.title}</div>
                          <div className="text-[9px] font-mono text-text-muted">{b.minTotal >= 1000 ? `${b.minTotal / 1000}rb` : b.minTotal}</div>
                        </div>
                      );
                    })}
                  </div>

                  {!entitlement.isLifetime && unitsLeft > 0 && (
                    <>
                      <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border-subtle bg-surface-card">
                        <span className="text-xs text-text-secondary">Jumlah setoran</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setUnits(u => Math.max(1, u - 1))}
                            className="w-7 h-7 rounded-lg border border-border-subtle flex items-center justify-center disabled:opacity-40"
                            disabled={unitsSafe <= 1}
                            title="Kurangi"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-text-primary w-24 text-center">{unitsSafe} × 25 rb</span>
                          <button
                            onClick={() => setUnits(u => Math.min(unitsLeft, u + 1))}
                            className="w-7 h-7 rounded-lg border border-border-subtle flex items-center justify-center disabled:opacity-40"
                            disabled={unitsSafe >= unitsLeft}
                            title="Tambah"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <button
                        disabled={!!busy}
                        onClick={() => donate('lifetime', lifeAmount)}
                        className="btn-cta w-full py-3 text-xs font-heading font-black flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {busy === 'lifetime' ? <Loader2 className="w-4 h-4 animate-spin" /> : <InfinityIcon className="w-4 h-4" />}
                        Setor {formatIdr(lifeAmount)}
                      </button>
                      <p className="text-[10px] text-text-muted">
                        Satu setoran (berapa pun kelipatannya) membuka Full {cfg.fullDays} hari, bersambung dengan masa Full yang masih aktif.
                        "Selamanya" berarti selama SevnQuest beroperasi. Deck AI tetap dibatasi 30 kali per hari.
                      </p>
                    </>
                  )}
                </div>
              )}

              {orders.some(o => o.status !== 'pending' && o.status !== 'claimed') && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-text-muted">Riwayat donasi</summary>
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
      <span className="font-bold text-text-primary block truncate">{planLabel(order.tier_code, order.base_price_idr)}</span>
      <span className="text-[10px] text-text-muted font-mono">{order.order_code} · {formatDate(order.created_at)}</span>
    </span>
    <span className="font-mono font-bold text-text-primary">{formatIdr(order.amount_idr)}</span>
    <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
  </button>
);

/**
 * QRIS untuk dibayar. Dengan `amount`, kode QR dibuat ulang dari QRIS statis merchant dengan nominal terisi
 * (QRIS bernominal); pembeli cukup scan. Bila pembuatan gagal, jatuh ke gambar QRIS statis.
 */
const QrisCard: React.FC<{ amount?: number }> = ({ amount }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    if (!amount) return;
    (async () => {
      try {
        const [{ default: QRCode }, { toDynamicQris, MERCHANT_STATIC_QRIS }] = await Promise.all([
          import('qrcode'),
          import('../../utils/qris'),
        ]);
        const url = await QRCode.toDataURL(toDynamicQris(MERCHANT_STATIC_QRIS, amount), {
          errorCorrectionLevel: 'M', margin: 2, width: 560,
        });
        if (!cancelled) setDataUrl(url);
      } catch (err) {
        console.warn('[qris] gagal membuat QRIS bernominal, memakai QRIS statis:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [amount]);

  const src = dataUrl || QRIS_IMAGE_URL;
  return (
    <div className="space-y-2">
      <div className="rounded-2xl overflow-hidden border border-border-subtle bg-white mx-auto max-w-[280px] p-2">
        <img
          src={src}
          alt={`QRIS ${MERCHANT_NAME}`}
          className="w-full h-auto block"
          style={{ imageRendering: 'pixelated' }}
          loading="eager"
        />
        <div className="text-center pb-1 pt-0.5 leading-tight">
          <div className="text-[11px] font-bold text-neutral-900">QRIS · {MERCHANT_NAME}</div>
          <div className="text-[10px] text-neutral-600 font-mono">NMID {MERCHANT_NMID}</div>
          {dataUrl && amount ? (
            <div className="text-[11px] font-bold text-neutral-900 mt-0.5">Nominal terisi: {formatIdr(amount)}</div>
          ) : null}
        </div>
      </div>
      <div className="flex justify-center">
        <a
          href={src}
          download={dataUrl ? `QRIS-SevnQuest-${amount}.png` : 'QRIS-SevnQuest.png'}
          className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-inset"
        >
          <Download className="w-3.5 h-3.5" /> Simpan gambar QRIS (untuk scan dari galeri)
        </a>
      </div>
    </div>
  );
};

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

  // Pantau status: pembayaran yang terdeteksi otomatis langsung terlihat tanpa memuat ulang.
  useEffect(() => {
    if (order.status !== 'pending' && order.status !== 'claimed' && order.status !== 'expired') return;
    let stopped = false;
    const tick = async () => {
      try {
        const fresh = await fetchOrder(order.id);
        if (!stopped && fresh && fresh.status !== order.status) {
          if (fresh.status === 'paid') playSound('fanfare', soundEnabled);
          onUpdated(fresh);
        }
      } catch {
        /* coba lagi pada putaran berikutnya */
      }
    };
    const timer = setInterval(tick, 8000);
    return () => { stopped = true; clearInterval(timer); };
  }, [order.id, order.status]);

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
          <div className="font-bold text-text-primary">{planLabel(order.tier_code, order.base_price_idr)}</div>
          <div className="font-mono text-text-muted">Kode pesanan {order.order_code}</div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[expired ? 'expired' : order.status]}`}>
          {STATUS_LABEL[expired ? 'expired' : order.status]}
        </span>
      </div>

      {order.status === 'paid' && (
        <div className="p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-300">
          Donasi sudah diverifikasi pada {formatDate(order.verified_at)} dan tercatat di akunmu. Terima kasih sudah mendukung SevnQuest!
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
          <p>Klaim diterima. Pembayaran biasanya terdeteksi otomatis; bila tidak, admin mengecek setiap malam dan donasi tercatat <b>paling lambat 1×24 jam</b>. Kamu boleh menutup halaman ini.</p>
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
              Donasi {formatIdr(order.base_price_idr)} dikurangi kode unik {order.unique_code}. Nominal persis ini yang dipakai untuk
              mencocokkan pembayaran ke akunmu secara otomatis.
            </p>
            {order.status === 'pending' && (
              <p className={`text-[11px] ${expired ? 'text-rose-400' : 'text-text-secondary'}`}>
                {expired ? 'Batas waktu lewat. Bila sudah terlanjur bayar, tetap kirim klaim di bawah.' : `Bayar sebelum ${formatDate(order.expires_at)}`}
              </p>
            )}
          </div>

          <QrisCard amount={order.amount_idr} />

          <ol className="text-xs text-text-secondary space-y-1 list-decimal pl-5">
            <li>Buka e-wallet atau m-banking apa pun yang mendukung QRIS.</li>
            <li>Scan QRIS di atas (atau simpan gambarnya lalu scan dari galeri).</li>
            <li>Pastikan nama merchant <b>{MERCHANT_NAME}</b> dan nominal <b className="text-gold">{formatIdr(order.amount_idr)}</b> (sudah terisi; bila aplikasi tetap meminta nominal, ketik persis angka itu).</li>
            <li>Bayar. Biasanya terverifikasi otomatis dalam 1–2 menit dan halaman ini berubah sendiri.</li>
            <li>Belum berubah setelah beberapa menit? Tekan <b>Saya sudah bayar</b> supaya admin mengecek.</li>
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
