// Cloudflare Pages Function: POST /api/deck-topic (logika sama dengan api/deck-topic.ts di Vercel).
// Env (Pages → Settings → Variables and Secrets): DECK_AI_BASE_URL, DECK_AI_API_KEY, DECK_AI_MODEL.
import { planTopic, rateLimited, type PlanEnv } from '../../api/deck-topic';
import { checkAccess, type GateEnv } from '../../api/_entitlement';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const onRequest = async ({ request, env }: { request: Request; env: PlanEnv & GateEnv }) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (rateLimited(request.headers.get('CF-Connecting-IP') || 'unknown')) return json(429, { error: 'rate_limited' });
  // Deck AI hanya untuk paket Full/Lifetime, maksimal 30 per hari (PRD 6.4).
  const gate = await checkAccess(request.headers.get('Authorization'), 'deckAi', env);
  if (!gate.ok) return json(gate.status, { error: gate.error });
  const body = await request.json().catch(() => null);
  const out = await planTopic(body, env);
  return json(out.status, out.body);
};
