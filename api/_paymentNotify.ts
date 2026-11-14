// ==============================================================================
// POST /api/payment-notify : terima notifikasi "uang masuk" dari HP admin (aplikasi SevnQuest Notifier, atau
// MacroDroid, yang membaca notifikasi GoPay / GoPay Merchant), ambil nominalnya, lalu teruskan ke RPC
// gateway_payment_received.
//
// Body JSON yang diterima (semua opsional kecuali salah satu nominal):
//   { "text": "<isi notifikasi>", "title": "<judul notifikasi>", "amount": 16983,
//     "package": "<nama paket app sumber>", "posted_at": <epoch ms notifikasi muncul> }
// "package" dan "posted_at" dikirim SevnQuest Notifier; keduanya hanya menjadi penanda sumber di log admin
// dan tidak pernah ikut menentukan uang masuk atau nominal.
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

/**
 * Pola pembayaran KELUAR atau bukan-donasi (dicek lebih dulu, menang atas pola uang masuk). App GoPay biasa
 * juga memberi tahu transaksi milik admin sendiri; teks persisnya bisa berubah antarversi, jadi daftar ini
 * sengaja lebar: salah menolak hanya berarti pesanan menunggu verifikasi manual, sedangkan salah menerima
 * bisa menyetujui pesanan orang dengan uang yang sebenarnya keluar.
 */
const OUTGOING_PATTERNS: RegExp[] = [
  /berhasil (dibayar|membayar|dikirim|mengirim|terkirim|ditransfer|ditarik)/,
  /kamu (telah |sudah |baru saja |berhasil )?(membayar|bayar|mengirim|kirim|mentransfer|transfer)/,
  /pembayaran(mu| kamu)? (berhasil|ke )/,
  /transfer(mu| kamu)? (berhasil|ke )/,
  /(dikirim|terkirim|ditransfer|dibayar|dibayarkan|bayar) ke /,
  // "Rp10.000 ke Budi": nominal langsung diikuti tujuan berarti uang keluar.
  /rp\.?\s?[0-9][0-9.,]*\s+ke /,
  // "sudah diterima Budi" / "diterima oleh Budi": penerimanya orang lain.
  /diterima (oleh|sama) /,
  /top ?up|isi saldo|tarik tunai|penarikan|pencairan|cashback|refund|pengembalian dana|tagihan/,
];

/**
 * true untuk notifikasi uang masuk. Dua sumber: app GoPay Merchant ("Pembayaran QRIS statis diterima",
 * isi "Rp 4.000 di Sevnsoul Store, ...") dan app GoPay biasa ("Kamu menerima Rp10.000 dari ...").
 * Notifikasi keluar milik admin sendiri (lihat OUTGOING_PATTERNS) selalu false.
 */
export function isIncomingPayment(text: string): boolean {
  const t = cleanText(text).toLowerCase();
  if (OUTGOING_PATTERNS.some((re) => re.test(t))) return false;
  if (/(diterima|uang masuk|dana masuk|menerima|received)/.test(t)) return true;
  // Isi notifikasi QRIS merchant tanpa judul: "Rp 4.999 di Sevnsoul Store, Digital & Kreatif."
  return new RegExp(`rp\\s?[0-9][0-9.,]*\\s+di\\s+${MERCHANT_KEYWORD}`).test(t);
}

/** Nama merchant (huruf kecil) yang muncul di notifikasi uang masuk QRIS. */
export const MERCHANT_KEYWORD = 'sevnsoul store';

/** Rapikan teks notifikasi: entitas HTML (&amp;) dan placeholder Magic Text yang tidak terisi ([notification_title]). */
export function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\[(not_?|notification)[a-z_]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface NotifyBody {
  text?: unknown;
  title?: unknown;
  amount?: unknown;
  key?: unknown;
  /** Nama paket app Android yang memunculkan notifikasi (dikirim SevnQuest Notifier). */
  package?: unknown;
  /** Waktu notifikasi muncul di HP, epoch milidetik (dikirim SevnQuest Notifier). */
  posted_at?: unknown;
}

const PACKAGE_MAX = 80;
const PACKAGE_RE = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

/** Nama paket Android yang sah ("com.gojek.gopay"), atau null. Nilai lain dibuang, bukan ditolak. */
export function sanitizePackage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.length <= PACKAGE_MAX && PACKAGE_RE.test(v) ? v : null;
}

/** posted_at (angka atau string angka, epoch ms) yang masuk akal, atau null. */
export function sanitizePostedAt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  // 2020-01-01 .. 2100-01-01: menyaring detik (bukan ms), nol, dan angka ngawur.
  return Number.isFinite(n) && n >= 1_577_836_800_000 && n < 4_102_444_800_000 ? Math.floor(n) : null;
}

const DELAY_NOTE_MIN_MS = 2 * 60_000;
const DELAY_NOTE_MAX_MS = 7 * 24 * 60 * 60_000;

/**
 * Penanda sumber singkat untuk log admin, mis. "[com.gojek.gopay]" atau "[com.gojek.gopay, tertunda 14 mnt]".
 * Keterlambatan hanya ditulis bila notifikasi baru terkirim >= 2 menit setelah muncul (HP sempat offline).
 * String kosong bila tidak ada yang layak ditulis (pengirim lama seperti MacroDroid).
 */
export function sourceMarker(pkg: string | null, postedAt: number | null, now: number): string {
  const parts: string[] = [];
  if (pkg) parts.push(pkg);
  if (postedAt !== null) {
    const delay = now - postedAt;
    if (delay >= DELAY_NOTE_MIN_MS && delay <= DELAY_NOTE_MAX_MS) {
      const min = Math.round(delay / 60_000);
      parts.push(min < 120 ? `tertunda ${min} mnt` : `tertunda ${Math.round(min / 60)} jam`);
    }
  }
  return parts.length ? `[${parts.join(', ')}]` : '';
}

export interface NotifyResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handlePaymentNotify(
  headerKey: string | null,
  body: NotifyBody | null,
  env: GateEnv,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now()
): Promise<NotifyResult> {
  const key = (headerKey || (typeof body?.key === 'string' ? body.key : '') || '').trim();
  if (!key) return { status: 401, body: { error: 'missing_key' } };

  const title = typeof body?.title === 'string' ? body.title : '';
  const text = typeof body?.text === 'string' ? body.text : '';
  // Teks notifikasi murni: HANYA ini yang dipakai untuk deteksi uang masuk dan parsing nominal.
  const notifText = cleanText(`${title} ${text}`);
  const explicit = Number(body?.amount);
  // Notifikasi datang dari app GoPay biasa, yang juga memberi tahu pembayaran KELUAR milik admin sendiri.
  // Hanya notifikasi uang MASUK yang boleh menyetujui pesanan; selain itu nominal dikosongkan (tercatat no_amount).
  const amount = !isIncomingPayment(notifText)
    ? null
    : Number.isInteger(explicit) && explicit > 0 ? explicit : parseIdrAmount(notifText);
  // Penanda sumber ditaruh di DEPAN supaya tetap terlihat di log admin yang memotong teks; ditempel setelah
  // deteksi dan parsing selesai, jadi isinya tidak bisa memengaruhi keduanya.
  const marker = sourceMarker(sanitizePackage(body?.package), sanitizePostedAt(body?.posted_at), now);
  const raw = (marker ? `${marker} ${notifText}` : notifText).slice(0, 500);

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
