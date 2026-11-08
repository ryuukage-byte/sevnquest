// ==============================================================================
// POST /api/payment-notify : terima notifikasi "uang masuk" dari HP admin (mis. MacroDroid yang membaca
// notifikasi GoPay Merchant), ambil nominalnya, lalu teruskan ke RPC gateway_payment_received.
//
// Body JSON yang diterima (semua opsional kecuali salah satu nominal):
//   { "text": "<isi notifikasi>", "title": "<judul notifikasi>", "amount": 16983 }
// Kunci webhook di header "X-Webhook-Key" (atau field "key"). Kunci dibuat admin di halaman
// Verifikasi Pembayaran; database hanya menyimpan hash-nya.
// Berawalan "_" supaya tidak menjadi endpoint Vercel sendiri.
// ==============================================================================

import type { GateEnv } from './_entitlement';

const DEFAULT_SUPABASE_URL = 'https://iokhdhqnpslpwsxspvaj.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';

/**
 * Ambil nominal rupiah pertama dari teks notifikasi. Menerima "Rp25.001", "Rp 25.001,00", "IDR 25,001",
 * "Rp25001". Mengembalikan null bila tidak ada.
 */
export function parseIdrAmount(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = /(?:Rp\.?|IDR)\s*([0-9][0-9.,]*)/i.exec(text);
  if (!m) return null;
  let raw = m[1].replace(/[.,]$/, '');
  // Desimal sen di akhir (",00" / ".00") dibuang; pemisah ribuan lalu dihapus.
  raw = raw.replace(/[.,]\d{2}$/, (s) => (/^[.,]\d{2}$/.test(s) && /[.,]\d{3}/.test(raw) ? '' : s));
  const digits = raw.replace(/[.,]/g, '');
  const n = Number(digits);
  return Number.isInteger(n) && n > 0 && n < 100_000_000 ? n : null;
}

/** true untuk notifikasi uang masuk ("Pembayaran QRIS statis diterima", "Uang masuk", "received"). */
export function isIncomingPayment(text: string): boolean {
  const t = text.toLowerCase();
  if (/(berhasil (dibayar|membayar)|kamu membayar|pembayaran berhasil|transfer ke|top ?up|tarik tunai|cashback)/.test(t)) return false;
  return /(diterima|uang masuk|dana masuk|menerima|received)/.test(t);
}

export interface NotifyBody {
  text?: unknown;
  title?: unknown;
  amount?: unknown;
  key?: unknown;
}

export interface NotifyResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handlePaymentNotify(
  headerKey: string | null,
  body: NotifyBody | null,
  env: GateEnv,
  fetchImpl: typeof fetch = fetch
): Promise<NotifyResult> {
  const key = (headerKey || (typeof body?.key === 'string' ? body.key : '') || '').trim();
  if (!key) return { status: 401, body: { error: 'missing_key' } };

  const title = typeof body?.title === 'string' ? body.title : '';
  const text = typeof body?.text === 'string' ? body.text : '';
  const raw = `${title} ${text}`.trim().slice(0, 500);
  const explicit = Number(body?.amount);
  // Notifikasi datang dari app GoPay biasa, yang juga memberi tahu pembayaran KELUAR milik admin sendiri.
  // Hanya notifikasi uang MASUK yang boleh menyetujui pesanan; selain itu nominal dikosongkan (tercatat no_amount).
  const amount = !isIncomingPayment(raw)
    ? null
    : Number.isInteger(explicit) && explicit > 0 ? explicit : parseIdrAmount(raw);

  const base = (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anon = env.SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
  try {
    const res = await fetchImpl(`${base}/rest/v1/rpc/gateway_payment_received`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({ p_key: key, p_amount: amount, p_raw: raw }),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const msg = String((data && (data.message || data.error)) || '');
      if (/invalid_key/.test(msg)) return { status: 401, body: { error: 'invalid_key' } };
      if (/rate_limited/.test(msg)) return { status: 429, body: { error: 'rate_limited' } };
      return { status: 502, body: { error: 'upstream_error' } };
    }
    return { status: 200, body: { amount, ...(data || {}) } };
  } catch {
    return { status: 502, body: { error: 'upstream_error' } };
  }
}
