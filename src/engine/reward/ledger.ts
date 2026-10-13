import { DAY_CLAIM_TTL_DAYS, EVENT_KEY_TTL_DAYS, REWARD_LEDGER_MAX, REWARD_POLICY } from './policy';
import type {
  RewardClaim, RewardDecision, RewardLedgerEntry, RewardRequest, RewardState,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD menurut kalender LOKAL (konsisten dengan reset misi harian). */
export function localDayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function finiteNonNegative(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Hapus penanda yang sudah kedaluwarsa. Mengembalikan objek yang sama bila tidak ada yang dihapus. */
export function pruneClaims(
  claims: Record<string, RewardClaim> | undefined,
  now: Date
): Record<string, RewardClaim> {
  const src = claims || {};
  const t = now.getTime();
  let changed = false;
  const out: Record<string, RewardClaim> = {};
  for (const [k, c] of Object.entries(src)) {
    if (c.until && Date.parse(c.until) <= t) { changed = true; continue; }
    out[k] = c;
  }
  return changed ? out : src;
}

/** Kunci penanda batas untuk request ini, atau null bila sumbernya tak dibatasi. */
export function limitKey(req: Pick<RewardRequest, 'source' | 'ref'>, now: Date): string | null {
  const policy = REWARD_POLICY[req.source];
  if (policy.scope === 'none') return null;
  const ref = req.ref ?? '';
  return policy.scope === 'day'
    ? `lim:${req.source}:${ref}:${localDayKey(now)}`
    : `lim:${req.source}:${ref}`;
}

export const eventClaimKey = (req: Pick<RewardRequest, 'source' | 'eventKey'>): string | null =>
  req.eventKey ? `evt:${req.source}:${req.eventKey}` : null;

/**
 * Putuskan reward TANPA mengubah apa pun (murni). Urutan: kosong -> kejadian ganda -> batas.
 * Dipakai untuk pratinjau UI dan oleh `commitReward`.
 */
export function decideReward(state: RewardState, req: RewardRequest, now: Date = new Date()): RewardDecision {
  const exp = finiteNonNegative(req.exp);
  const gold = finiteNonNegative(req.gold);
  if (exp === 0 && gold === 0) return { granted: false, reason: 'empty', exp: 0, gold: 0 };

  const claims = pruneClaims(state.rewardClaims, now);

  const evt = eventClaimKey(req);
  if (evt && claims[evt]) return { granted: false, reason: 'duplicate_event', exp: 0, gold: 0 };

  const lim = limitKey(req, now);
  const policy = REWARD_POLICY[req.source];
  if (lim && policy.limit !== undefined && (claims[lim]?.n ?? 0) >= policy.limit) {
    return { granted: false, reason: 'limit_reached', exp: 0, gold: 0 };
  }
  return { granted: true, exp, gold };
}

/**
 * Terapkan keputusan ke ledger + penanda. Mengembalikan state baru (hanya field reward) dan keputusan.
 * Bila ditolak, state dikembalikan apa adanya (kecuali penanda kedaluwarsa yang dibersihkan).
 */
export function commitReward(
  state: RewardState,
  req: RewardRequest,
  now: Date = new Date()
): { state: Required<RewardState>; decision: RewardDecision } {
  const claims = pruneClaims(state.rewardClaims, now);
  const ledger = state.rewardLedger || [];
  const decision = decideReward({ rewardClaims: claims, rewardLedger: ledger }, req, now);
  if (!decision.granted) return { state: { rewardClaims: claims, rewardLedger: ledger }, decision };

  const nextClaims: Record<string, RewardClaim> = { ...claims };
  const at = now.toISOString();

  const evt = eventClaimKey(req);
  if (evt) nextClaims[evt] = { n: 1, at, until: new Date(now.getTime() + EVENT_KEY_TTL_DAYS * DAY_MS).toISOString() };

  const lim = limitKey(req, now);
  if (lim) {
    const policy = REWARD_POLICY[req.source];
    const prev = nextClaims[lim];
    const until = policy.scope === 'day'
      ? new Date(now.getTime() + DAY_CLAIM_TTL_DAYS * DAY_MS).toISOString()
      : policy.ttlDays ? new Date(now.getTime() + policy.ttlDays * DAY_MS).toISOString() : undefined;
    nextClaims[lim] = { n: (prev?.n ?? 0) + 1, at, ...(until ? { until } : {}) };
  }

  const entry: RewardLedgerEntry = {
    id: `${now.getTime().toString(36)}-${ledger.length.toString(36)}`,
    at,
    source: req.source,
    ...(req.ref !== undefined ? { ref: req.ref } : {}),
    ...(req.eventKey !== undefined ? { eventKey: req.eventKey } : {}),
    exp: decision.exp,
    gold: decision.gold,
    ...(req.note ? { note: req.note } : {}),
  };
  const nextLedger = [...ledger, entry].slice(-REWARD_LEDGER_MAX);
  return { state: { rewardClaims: nextClaims, rewardLedger: nextLedger }, decision };
}

/**
 * Gabungkan dua salinan (lokal + cloud) tanpa kehilangan penanda: union, `n` terbesar menang,
 * kedaluwarsa terjauh menang. Riwayat di-union per ID, diurut waktu, dibatasi REWARD_LEDGER_MAX.
 */
export function mergeRewardState(a: RewardState, b: RewardState, now: Date = new Date()): Required<RewardState> {
  const claims: Record<string, RewardClaim> = {};
  for (const src of [pruneClaims(b.rewardClaims, now), pruneClaims(a.rewardClaims, now)]) {
    for (const [k, c] of Object.entries(src)) {
      const cur = claims[k];
      if (!cur) { claims[k] = c; continue; }
      const until = !cur.until || !c.until ? undefined : (cur.until > c.until ? cur.until : c.until);
      claims[k] = { n: Math.max(cur.n, c.n), at: cur.at > c.at ? cur.at : c.at, ...(until ? { until } : {}) };
    }
  }
  const byId = new Map<string, RewardLedgerEntry>();
  for (const e of [...(b.rewardLedger || []), ...(a.rewardLedger || [])]) byId.set(e.id, e);
  const ledger = [...byId.values()].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0)).slice(-REWARD_LEDGER_MAX);
  return { rewardClaims: claims, rewardLedger: ledger };
}
