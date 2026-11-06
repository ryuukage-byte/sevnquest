// Akses backend untuk monetisasi (RPC di supabase/migrations/20261104_monetization.sql).
import { supabase } from './supabase';
import { parseEntitlement, type Entitlement } from '../utils/access';

export type OrderStatus = 'pending' | 'claimed' | 'paid' | 'rejected' | 'expired' | 'cancelled';

export interface PaymentOrder {
  id: string;
  order_code: string;
  user_id: string;
  tier_code: string;
  period_months: number;
  base_price_idr: number;
  unique_code: number;
  amount_idr: number;
  status: OrderStatus;
  paid_at_reported: string | null;
  proof_path: string | null;
  reject_reason: string | null;
  verified_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface AdminOrder extends PaymentOrder {
  user_email: string | null;
  player_name: string | null;
}

export interface DonorBoardRow {
  display_name: string | null;
  is_anonymous: boolean;
  badge_level: number;
  badge_title: string | null;
  is_lifetime: boolean;
  monthly_this_month: boolean;
}

export type DonationKind = 'monthly' | 'lifetime';

/** Pesan Indonesia untuk kode error dari RPC. */
export function billingErrorMessage(err: unknown): string {
  const msg = (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err || '')) || '';
  if (/invalid_amount/.test(msg)) return 'Nominal tidak valid. Donasi bulanan minimal Rp 5.000; setoran lifetime kelipatan Rp 25.000.';
  if (/exceeds_lifetime_target/.test(msg)) return 'Setoran melebihi sisa menuju Rp 700.000. Kurangi jumlah setoran.';
  if (/already_lifetime/.test(msg)) return 'Kamu sudah Lifetime. Terima kasih!';
  if (/too_many_pending/.test(msg)) return 'Masih ada 3 pesanan belum dibayar. Bayar atau batalkan salah satunya dulu.';
  if (/invalid_plan/.test(msg)) return 'Paket tidak tersedia.';
  if (/not_authenticated|JWT/.test(msg)) return 'Sesi login habis. Silakan masuk lagi.';
  if (/order_not_claimable/.test(msg)) return 'Pesanan ini sudah diproses atau dibatalkan.';
  if (/forbidden/.test(msg)) return 'Akun ini bukan admin.';
  if (/no_unique_code/.test(msg)) return 'Antrian pembayaran sedang penuh. Coba lagi nanti.';
  if (/Failed to fetch|NetworkError|aborted/i.test(msg)) return 'Tidak ada koneksi. Coba lagi.';
  // Halaman error HTML (mis. Cloudflare 520) jangan pernah ditampilkan mentah.
  if (/<\/?(html|head|body|div|span|!doctype)/i.test(msg) || /\b5\d\d\b.*(cloudflare|gateway)/i.test(msg) || msg.length > 300) {
    return 'Server sedang bermasalah. Muat ulang halaman lalu coba lagi sebentar lagi.';
  }
  return msg || 'Terjadi kesalahan.';
}

export async function fetchEntitlement(): Promise<Entitlement> {
  const { data, error } = await supabase.rpc('get_my_entitlement');
  if (error) throw error;
  return parseEntitlement(data);
}

export async function createPaymentOrder(kind: DonationKind, amountIdr: number): Promise<PaymentOrder> {
  const { data, error } = await supabase.rpc('create_payment_order', { p_kind: kind, p_amount: Math.round(amountIdr) });
  if (error) throw error;
  return data as PaymentOrder;
}

export async function fetchOrder(orderId: string): Promise<PaymentOrder | null> {
  const { data, error } = await supabase.from('payment_orders').select('*').eq('id', orderId).maybeSingle();
  if (error) throw error;
  return (data as PaymentOrder) || null;
}

export interface GatewayEvent {
  received_at: string;
  amount_idr: number | null;
  result: 'approved' | 'unmatched' | 'ambiguous' | 'no_amount' | string;
  raw_text: string | null;
  order_code: string | null;
}

export interface GatewayStatus {
  configured: boolean;
  key_created_at: string | null;
  last_event_at: string | null;
  events: GatewayEvent[];
}

export async function adminGatewayStatus(): Promise<GatewayStatus> {
  const { data, error } = await supabase.rpc('admin_gateway_status');
  if (error) throw error;
  const d = (data || {}) as Partial<GatewayStatus>;
  return { configured: !!d.configured, key_created_at: d.key_created_at ?? null, last_event_at: d.last_event_at ?? null, events: d.events || [] };
}

/** Buat kunci webhook baru (kunci lama langsung tidak berlaku). Kunci hanya ditampilkan sekali. */
export async function adminRotateGatewayKey(): Promise<string> {
  const { data, error } = await supabase.rpc('admin_rotate_gateway_key');
  if (error) throw error;
  return String(data);
}

export async function listMyOrders(): Promise<PaymentOrder[]> {
  const { data, error } = await supabase
    .from('payment_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as PaymentOrder[];
}

/** Unggah screenshot bukti bayar ke bucket privat. Mengembalikan path yang disimpan di pesanan. */
export async function uploadPaymentProof(userId: string, orderId: string, file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${orderId}.${ext}`;
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function submitPaymentClaim(orderId: string, paidAt: Date, proofPath: string | null): Promise<PaymentOrder> {
  const { data, error } = await supabase.rpc('submit_payment_claim', {
    p_order_id: orderId,
    p_paid_at: paidAt.toISOString(),
    p_proof_path: proofPath,
  });
  if (error) throw error;
  return data as PaymentOrder;
}

export async function cancelPaymentOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_payment_order', { p_order_id: orderId });
  if (error) throw error;
}

export async function adminListOrders(statuses: OrderStatus[]): Promise<AdminOrder[]> {
  const { data, error } = await supabase.rpc('admin_list_orders', { p_statuses: statuses });
  if (error) throw error;
  return (data || []) as AdminOrder[];
}

export async function adminApprove(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_payment', { p_order_id: orderId });
  if (error) throw error;
}

export async function adminReject(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_payment', { p_order_id: orderId, p_reason: reason });
  if (error) throw error;
}

export async function adminProofUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function fetchDonorBoard(): Promise<DonorBoardRow[]> {
  const { data, error } = await supabase.rpc('get_donor_board');
  if (error) throw error;
  return (data || []) as DonorBoardRow[];
}

export async function fetchDonorAnonymous(): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_my_donor_preferences');
  if (error) throw error;
  return Boolean((data as { anonymous?: boolean } | null)?.anonymous);
}

export async function setDonorAnonymous(anonymous: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_donor_anonymous', { p_anonymous: anonymous });
  if (error) throw error;
}

/** Header Authorization untuk fungsi server yang dikunci per tier (Deck AI, Imersi). */
export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
