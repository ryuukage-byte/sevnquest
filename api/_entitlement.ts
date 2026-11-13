// ==============================================================================
// Gating keras untuk fungsi server (PRD 6.4): Deck AI dan Imersi hanya untuk paket Full/Lifetime.
//
// Fungsi memanggil RPC Supabase dengan JWT pengguna (header Authorization dari klien), sehingga
// keputusan akses dibuat di database, bukan di klien. Berawalan "_" supaya tidak menjadi endpoint Vercel.
// Env opsional: SUPABASE_URL, SUPABASE_ANON_KEY (anon key memang publik).
// ==============================================================================

export interface GateEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export type GatedKind = 'deckAi' | 'immersion';

export type GateResult = { ok: true } | { ok: false; status: number; error: string };

const DEFAULT_SUPABASE_URL = 'https://iokhdhqnpslpwsxspvaj.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';
const TIMEOUT_MS = 6000;

/** Batas Deck AI per hari (WIB), juga dibatasi maksimal 30 di database. */
export const DECK_AI_DAILY_LIMIT = 30;

function bearer(authHeader: string | null | undefined): string | null {
  const m = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec((authHeader || '').trim());
  return m ? m[1] : null;
}

async function rpc(env: GateEnv, token: string, fn: string, body: unknown, fetchImpl: typeof fetch): Promise<Response> {
  const base = (env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetchImpl(`${base}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY || DEFAULT_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deck AI: memanggil consume_ai_quota (cek tier Full + menambah hitungan harian dalam satu langkah).
 * Imersi: memanggil get_my_entitlement dan memeriksa access_tier.
 */
export async function checkAccess(
  authHeader: string | null | undefined,
  kind: GatedKind,
  env: GateEnv,
  fetchImpl: typeof fetch = fetch
): Promise<GateResult> {
  const token = bearer(authHeader);
  if (!token) return { ok: false, status: 401, error: 'login_required' };
  try {
    if (kind === 'deckAi') {
      const res = await rpc(env, token, 'consume_ai_quota', { p_limit: DECK_AI_DAILY_LIMIT }, fetchImpl);
      if (res.status === 401) return { ok: false, status: 401, error: 'login_required' };
      if (!res.ok) return { ok: false, status: 503, error: 'entitlement_unavailable' };
      const data = (await res.json()) as { allowed?: boolean; reason?: string };
      if (data?.allowed === true) return { ok: true };
      if (data?.reason === 'quota') return { ok: false, status: 429, error: 'daily_quota' };
      if (data?.reason === 'not_authenticated') return { ok: false, status: 401, error: 'login_required' };
      return { ok: false, status: 403, error: 'tier_required' };
    }
    const res = await rpc(env, token, 'get_my_entitlement', {}, fetchImpl);
    if (res.status === 401) return { ok: false, status: 401, error: 'login_required' };
    if (!res.ok) return { ok: false, status: 503, error: 'entitlement_unavailable' };
    const data = (await res.json()) as { access_tier?: string; monetization_public?: boolean };
    // Saklar monetisasi mati: Imersi terbuka untuk semua yang login.
    if (data?.monetization_public === false) return { ok: true };
    return data?.access_tier === 'full' ? { ok: true } : { ok: false, status: 403, error: 'tier_required' };
  } catch {
    return { ok: false, status: 503, error: 'entitlement_unavailable' };
  }
}
