// Cloudflare Pages Function: GET /api/captions?v=<videoId> (logika sama dengan api/captions.ts di Vercel).
import { CaptionError, fetchCaptions } from '../../api/captions';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const onRequest = async ({ request }: { request: Request }) => {
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  const v = new URL(request.url).searchParams.get('v') ?? '';
  try {
    return json(200, await fetchCaptions(v));
  } catch (err) {
    if (err instanceof CaptionError) return json(err.code === 'bad_id' ? 400 : 502, { error: err.code, detail: err.message });
    return json(500, { error: 'internal' });
  }
};
