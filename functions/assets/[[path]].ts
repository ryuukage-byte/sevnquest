// Cloudflare Pages Function: /assets/* yang tidak ada harus 404, bukan index.html.
// Tanpa ini fallback SPA membalas chunk basi dengan HTML ber-header `immutable` (dari public/_headers),
// yang lalu tersimpan setahun di browser dan membuat modul lazy gagal dimuat terus-menerus.
export const onRequest = async ({ next }: { next: () => Promise<Response> }) => {
  const res = await next();
  if ((res.headers.get('content-type') || '').includes('text/html')) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return res;
};
