// Cloudflare Pages Function: GET /api/captions?v=<videoId> (logika sama dengan api/captions.ts di Vercel).
import { CaptionError, fetchCaptions } from '../../api/captions';
import { checkAccess, type GateEnv } from '../../api/_entitlement';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequest = async ({ request, env }: { request: Request; env: GateEnv }) => {
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  // Imersi YouTube hanya untuk paket Full/Lifetime (PRD 6.4).
  const gate = await checkAccess(request.headers.get('Authorization'), 'immersion', env || {});
  if (!gate.ok) return json(gate.status, { error: gate.error });
  const v = new URL(request.url).searchParams.get('v') ?? '';
  try {
    return json(200, await fetchCaptions(v));
  } catch (err) {
    if (err instanceof CaptionError) return json(err.code === 'bad_id' ? 400 : 502, { error: err.code, detail: err.message });
    return json(500, { error: 'internal' });
  }
};
