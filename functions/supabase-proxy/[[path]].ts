// Cloudflare Pages Function: /supabase-proxy/* → Supabase (pengganti rewrite di vercel.json).
// Perlu karena beberapa ISP memblokir *.supabase.co. Env opsional: SUPABASE_URL.
const DEFAULT_TARGET = 'https://iokhdhqnpslpwsxspvaj.supabase.co';

export const onRequest = async ({ request, env }: { request: Request; env: { SUPABASE_URL?: string } }) => {
  const url = new URL(request.url);
  const target = new URL((env.SUPABASE_URL || DEFAULT_TARGET) + url.pathname.replace(/^\/supabase-proxy/, '') + url.search);
  return fetch(new Request(target, request));
};
