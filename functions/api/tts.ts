// Cloudflare Pages Function: GET /api/tts (logika sama dengan api/tts.ts di Vercel).
// Env (Pages → Settings → Variables and Secrets): TTS_GOOGLE_API_KEY, opsional TTS_VOICE_FEMALE / TTS_VOICE_MALE.
import { isCrossSite, synthesize, ttsRateLimited, type TtsEnv } from '../../api/tts';

export const onRequest = async ({ request, env }: { request: Request; env: TtsEnv }) => {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  if (isCrossSite(request.headers.get('Sec-Fetch-Site'))) return json(403, { error: 'forbidden' });
  if (ttsRateLimited(request.headers.get('CF-Connecting-IP') || 'unknown')) return json(429, { error: 'rate_limited' });
  const out = await synthesize(new URL(request.url).searchParams, env);
  return new Response(out.body, { status: out.status, headers: out.headers });
};
