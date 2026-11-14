// Cloudflare Pages Function: POST /api/payment-notify (logika di api/_paymentNotify.ts).
// Dipanggil HP admin (aplikasi SevnQuest Notifier, atau MacroDroid) saat notifikasi uang masuk GoPay muncul.
import { handlePaymentNotify, type NotifyBody } from '../../api/_paymentNotify';
import type { GateEnv } from '../../api/_entitlement';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const onRequest = async ({ request, env }: { request: Request; env: GateEnv }) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const ct = request.headers.get('Content-Type') || '';
  let body: NotifyBody | null = null;
  if (ct.includes('application/json')) {
    body = (await request.json().catch(() => null)) as NotifyBody | null;
  } else {
    // MacroDroid juga bisa mengirim form atau teks polos.
    const textBody = await request.text().catch(() => '');
    if (ct.includes('application/x-www-form-urlencoded')) {
      const p = new URLSearchParams(textBody);
      body = {
        text: p.get('text') ?? '', title: p.get('title') ?? '', amount: p.get('amount') ?? undefined, key: p.get('key') ?? undefined,
        package: p.get('package') ?? undefined, posted_at: p.get('posted_at') ?? undefined,
      };
    } else {
      body = { text: textBody };
    }
  }
  const out = await handlePaymentNotify(request.headers.get('X-Webhook-Key'), body, env || {});
  return json(out.status, out.body);
};
