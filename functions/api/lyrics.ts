// Cloudflare Pages Function: GET /api/lyrics?title=&artist=[&album=][&duration=] (logika sama dengan api/lyrics.ts).
import { LyricsError, fetchLyrics, parseQuery } from '../../api/lyrics';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Lirik sebuah lagu jarang berubah; cache sehari di tepi, tapi jangan simpan galat.
      'Cache-Control': status === 200 ? 'public, max-age=86400' : 'no-store',
    },
  });

export const onRequest = async ({ request }: { request: Request }) => {
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  const q = parseQuery(new URL(request.url).searchParams);
  if (!q) return json(400, { error: 'bad_query' });
  try {
    return json(200, await fetchLyrics(q));
  } catch (err) {
    if (err instanceof LyricsError) {
      const status = err.code === 'not_found' ? 404 : err.code === 'busy' ? 503 : 502;
      return json(status, { error: err.code, detail: err.message });
    }
    return json(500, { error: 'internal' });
  }
};
