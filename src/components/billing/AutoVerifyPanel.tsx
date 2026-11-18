import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, KeyRound, Copy, Check, Loader2, ChevronDown, ChevronUp, RefreshCw, Link2 } from 'lucide-react';
import { adminGatewayStatus, adminRotateGatewayKey, billingErrorMessage, buildNotifierSetupLink, type GatewayStatus } from '../../lib/billing';
import { formatIdr } from '../../utils/access';

const RESULT_LABEL: Record<string, { text: string; cls: string }> = {
  approved: { text: 'Disetujui otomatis', cls: 'text-emerald-400' },
  unmatched: { text: 'Tidak ada pesanan cocok', cls: 'text-text-muted' },
  ambiguous: { text: 'Lebih dari satu pesanan cocok', cls: 'text-gold' },
  no_amount: { text: 'Nominal tidak terbaca', cls: 'text-rose-400' },
};

function fmt(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CopyField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</div>
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
        }}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border-subtle bg-surface-card text-left font-mono text-[11px] text-text-primary break-all"
      >
        <span className="flex-1">{value}</span>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0 opacity-70" />}
      </button>
    </div>
  );
};

/**
 * Tombol dan kode QR untuk menghubungkan aplikasi SevnQuest Notifier: keduanya memuat deep link yang sama
 * (URL endpoint + kunci webhook). Tombol dipakai bila panel dibuka di HP; QR dipindai bila dibuka di laptop.
 */
const NotifierConnect: React.FC<{ endpoint: string; webhookKey: string }> = ({ endpoint, webhookKey }) => {
  const link = buildNotifierSetupLink(endpoint, webhookKey);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setQr(null);
    (async () => {
      try {
        const { default: QRCode } = await import('qrcode');
        const url = await QRCode.toDataURL(link, { errorCorrectionLevel: 'M', margin: 2, width: 480 });
        if (!cancelled) setQr(url);
      } catch (err) {
        console.warn('[notifier] gagal membuat kode QR:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [link]);

  return (
    <div className="space-y-2 pt-1">
      <a
        href={link}
        className="btn-physical-secondary w-full px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5"
      >
        <Link2 className="w-4 h-4 text-gold" />
        Hubungkan ke SevnQuest Notifier
      </a>
      <p className="text-text-muted">
        Buka tombol ini dari HP yang sudah memasang aplikasi SevnQuest Notifier. Sedang di laptop? Pindai kode QR di bawah
        dengan kamera HP itu.
      </p>
      {qr && (
        <div className="rounded-xl overflow-hidden border border-border-subtle bg-white mx-auto max-w-[220px] p-2">
          <img src={qr} alt="Kode QR untuk menghubungkan SevnQuest Notifier" className="w-full h-auto block" style={{ imageRendering: 'pixelated' }} />
        </div>
      )}
      <p className="text-text-muted">Kode QR ini memuat kunci webhook. Jangan dibagikan atau di-screenshot ke orang lain.</p>
    </div>
  );
};

/**
 * Verifikasi otomatis lewat notifikasi HP: HP Android admin meneruskan notifikasi uang masuk GoPay / GoPay
 * Merchant ke /api/payment-notify lewat aplikasi SevnQuest Notifier (alternatif: MacroDroid). Nominal unik
 * dicocokkan ke pesanan.
 */
export const AutoVerifyPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = typeof window !== 'undefined' ? `${window.location.origin}/api/payment-notify` : '/api/payment-notify';

  const load = useCallback(async () => {
    try {
      setStatus(await adminGatewayStatus());
    } catch (err) {
      setError(billingErrorMessage(err));
    }
  }, []);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const rotate = async () => {
    if (status?.configured && !window.confirm('Buat kunci baru? Kunci lama langsung tidak berlaku, jadi kunci di HP harus diganti.')) return;
    setBusy(true);
    setError(null);
    try {
      setNewKey(await adminRotateGatewayKey());
      void load();
    } catch (err) {
      setError(billingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const active = status?.last_event_at && Date.now() - Date.parse(status.last_event_at) < 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-inset text-xs">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 p-3 text-left">
        <Smartphone className="w-4 h-4 text-gold" />
        <span className="flex-1 font-bold text-text-primary">Verifikasi otomatis lewat HP</span>
        {status && (
          <span className={`text-[10px] ${status.configured ? (active ? 'text-emerald-400' : 'text-gold') : 'text-text-muted'}`}>
            {status.configured ? (active ? 'Aktif' : 'Kunci ada, belum ada notifikasi 24 jam') : 'Belum diatur'}
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {error && <p className="text-rose-400">{error}</p>}

          {newKey ? (
            <div className="space-y-2 p-3 rounded-xl border border-gold/50 bg-gold/10">
              <p className="text-text-primary font-bold">Kunci baru dibuat. Salin sekarang — kunci tidak bisa ditampilkan lagi.</p>
              <CopyField label="Kunci webhook (header X-Webhook-Key)" value={newKey} />
              <CopyField label="URL" value={endpoint} />
              <NotifierConnect endpoint={endpoint} webhookKey={newKey} />
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={rotate}
              className="btn-physical-secondary px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4 text-gold" />}
              {status?.configured ? 'Buat kunci baru' : 'Buat kunci webhook'}
            </button>
          )}

          <details className="space-y-1" open={!status?.configured}>
            <summary className="cursor-pointer font-bold text-text-secondary">Cara memasang di HP (aplikasi SevnQuest Notifier, Android)</summary>
            <ol className="list-decimal pl-5 space-y-1 text-text-secondary mt-1">
              <li>Unduh APK <b>SevnQuest Notifier</b> ke HP Android yang menerima notifikasi pembayaran (app <b>GoPay</b> atau <b>GoPay Merchant</b>).</li>
              <li>Pasang APK itu. Bila diminta, izinkan pemasangan dari sumber ini.</li>
              <li>Buka aplikasinya, lalu izinkan <b>akses notifikasi</b> untuk SevnQuest Notifier.</li>
              <li>Hubungkan: tekan <b>Buat kunci webhook</b> di atas, lalu tekan <b>Hubungkan ke SevnQuest Notifier</b> dari HP itu, atau pindai kode QR-nya dengan kamera HP.</li>
              <li>Di Pengaturan HP → Baterai, matikan optimasi baterai untuk SevnQuest Notifier (set ke <b>Tidak dibatasi</b>) supaya tetap berjalan di latar belakang.</li>
              <li>Tekan <b>Kirim uji</b> di aplikasi. Kiriman uji tampil di log di bawah.</li>
            </ol>
            <p className="text-text-muted mt-1">
              Hanya notifikasi uang masuk ("diterima") yang dihitung; notifikasi pembayaranmu sendiri diabaikan. Pesanan disetujui
              otomatis bila nominal cocok dengan tepat satu pesanan terbuka (≤ 48 jam); selain itu tetap menunggu verifikasi manual.
            </p>
          </details>

          <details className="space-y-1">
            <summary className="cursor-pointer font-bold text-text-secondary">Alternatif: MacroDroid</summary>
            <ol className="list-decimal pl-5 space-y-1 text-text-secondary mt-1">
              <li>Pasang <b>MacroDroid</b> dari Play Store di HP yang menerima notifikasi pembayaran merchant (app <b>GoPay</b>, judul "Pembayaran QRIS statis diterima").</li>
              <li>Buat Macro baru. <b>Trigger</b>: Notification → Notification Received → pilih app yang memunculkan notifikasi itu (biasanya <b>GoPay</b>) → teks berisi <b>diterima</b>.</li>
              <li><b>Action</b>: Connectivity → HTTP Request. Metode <b>POST</b>, URL di atas, tipe isi <b>application/json</b>.</li>
              <li>Header: <code>X-Webhook-Key</code> = kunci di atas.</li>
              <li>Body: <code>{'{"title":"[notification_title]","text":"[notification]"}'}</code></li>
              <li>Izinkan akses notifikasi untuk MacroDroid, lalu di Pengaturan HP → Baterai, set MacroDroid ke <b>Tidak dibatasi</b>.</li>
              <li>Uji dengan donasi kecil. Notifikasi yang masuk tampil di log di bawah.</li>
            </ol>
            <p className="text-text-muted mt-1">Pakai salah satu saja. Bila keduanya aktif, satu pembayaran terkirim dua kali.</p>
          </details>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-secondary">Notifikasi terakhir</span>
              <button onClick={() => void load()} className="text-text-muted hover:text-text-primary" title="Muat ulang">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {!status?.events.length && <p className="text-text-muted">Belum ada notifikasi masuk.</p>}
            {status?.events.map((e, i) => {
              const r = RESULT_LABEL[e.result] || { text: e.result, cls: 'text-text-muted' };
              return (
                <div key={i} className="p-2 rounded-lg border border-border-subtle bg-surface-card">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-text-muted">{fmt(e.received_at)}</span>
                    <span className="font-mono font-bold text-text-primary">{e.amount_idr ? formatIdr(e.amount_idr) : '—'}</span>
                    <span className={r.cls}>{r.text}{e.order_code ? ` · ${e.order_code}` : ''}</span>
                  </div>
                  {e.raw_text && <div className="text-[10px] text-text-muted truncate">{e.raw_text}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
