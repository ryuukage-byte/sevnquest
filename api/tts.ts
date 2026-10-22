// ==============================================================================
// GET /api/tts?text=…&voice=female|male&rate=0.95 : suara neural bahasa Jepang (OPSIONAL).
//
// Dipakai klien bila perangkat tidak punya suara Jepang, atau bila pemain memilih "Suara cloud (Neural)" di
// Menu → Audio & Suara. Memakai Google Cloud Text-to-Speech (suara ja-JP Neural2). Tanpa konfigurasi endpoint
// membalas 503 dan klien memakai suara perangkat (Web Speech).
//
// Konfigurasi (server saja, jangan berawalan VITE_):
//   TTS_GOOGLE_API_KEY  kunci API dengan Cloud Text-to-Speech API aktif (kuota gratis bulanan berlaku)
//   TTS_VOICE_FEMALE    opsional, bawaan ja-JP-Neural2-B
//   TTS_VOICE_MALE      opsional, bawaan ja-JP-Neural2-C
// Respons audio boleh di-cache selamanya (teks + suara + kecepatan sama → audio sama), jadi CDN menghemat kuota.
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'http';

export interface TtsEnv {
  TTS_GOOGLE_API_KEY?: string;
  TTS_VOICE_FEMALE?: string;
  TTS_VOICE_MALE?: string;
}

export interface TtsResult {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}

const MAX_TEXT_LENGTH = 300;
const TIMEOUT_MS = 8000;
const RATE_LIMIT = 90; // permintaan per menit per IP (best-effort pada serverless)
const JAPANESE = /[぀-ヿ㐀-鿿豈-﫿]/;

const hits = new Map<string, number[]>();
export function ttsRateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) || []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

const jsonResult = (status: number, body: unknown, cache = 'no-store'): TtsResult => ({
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  body: JSON.stringify(body),
});

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Validasi parameter lalu sintesis. Hanya teks berbahasa Jepang yang dilayani (endpoint bukan TTS umum). */
export async function synthesize(
  query: URLSearchParams,
  env: TtsEnv,
  fetchImpl: typeof fetch = fetch
): Promise<TtsResult> {
  if (!env.TTS_GOOGLE_API_KEY) return jsonResult(503, { error: 'not_configured' }, 'public, max-age=300');
  if (query.get('probe') === '1') return jsonResult(200, { enabled: true }, 'public, max-age=300');

  const text = (query.get('text') || '').trim();
  if (!text || text.length > MAX_TEXT_LENGTH || !JAPANESE.test(text)) return jsonResult(400, { error: 'bad_text' });
  const voiceName = query.get('voice') === 'male'
    ? env.TTS_VOICE_MALE || 'ja-JP-Neural2-C'
    : env.TTS_VOICE_FEMALE || 'ja-JP-Neural2-B';
  const rate = Math.round(Math.min(1.5, Math.max(0.5, Number(query.get('rate')) || 1)) * 20) / 20;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(env.TTS_GOOGLE_API_KEY)}`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ja-JP', name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
        }),
      }
    );
    if (!res.ok) return jsonResult(res.status === 429 ? 429 : 502, { error: res.status === 429 ? 'quota' : 'upstream_error' });
    const data = (await res.json()) as { audioContent?: string };
    if (!data.audioContent) return jsonResult(502, { error: 'bad_output' });
    return {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' },
      body: decodeBase64(data.audioContent),
    };
  } catch {
    return jsonResult(504, { error: 'timeout' });
  } finally {
    clearTimeout(timer);
  }
}

/** Hanya halaman aplikasi sendiri yang boleh memakai endpoint ini dari browser. */
export function isCrossSite(secFetchSite: string | null | undefined): boolean {
  return secFetchSite === 'cross-site';
}

// Handler Vercel (Node runtime); middleware dev memakai handler yang sama.
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const send = (out: TtsResult) => {
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(typeof out.body === 'string' ? out.body : Buffer.from(out.body));
  };
  if (req.method !== 'GET') return send(jsonResult(405, { error: 'method_not_allowed' }));
  const site = req.headers['sec-fetch-site'];
  if (isCrossSite(Array.isArray(site) ? site[0] : site)) return send(jsonResult(403, { error: 'forbidden' }));
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  if (ttsRateLimited(ip)) return send(jsonResult(429, { error: 'rate_limited' }));
  const query = new URL(req.url || '/', 'http://localhost').searchParams;
  send(await synthesize(query, process.env as TtsEnv));
}
