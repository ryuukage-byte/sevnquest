// ==============================================================================
// GET /api/captions?v=<videoId> : ambil caption Jepang sebuah video YouTube (SPIKE).
//
// Memakai endpoint internal YouTube (innertube) yang TIDAK resmi: bisa berubah atau diblokir kapan saja,
// terutama dari IP datacenter. Tujuan spike ini hanya mengukur apakah jalur ini hidup di produksi.
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'http';

export interface CaptionWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface CaptionLine {
  startMs: number;
  endMs: number;
  text: string;
  /** Hanya ada pada caption otomatis: YouTube menyertakan waktu tiap kata. */
  words?: CaptionWord[];
}

export interface CaptionResult {
  videoId: string;
  language: string;
  kind: 'manual' | 'auto';
  lines: CaptionLine[];
}

export type CaptionErrorCode = 'bad_id' | 'blocked' | 'unavailable' | 'no_captions' | 'no_japanese' | 'upstream_error';

export class CaptionError extends Error {
  constructor(public code: CaptionErrorCode, detail = '') {
    super(detail ? `${code}: ${detail}` : code);
  }
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const TIMEOUT_MS = 8000;
const ANDROID_VERSION = '20.10.38';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string };
  captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
}

async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function getPlayer(videoId: string): Promise<PlayerResponse> {
  const res = await timedFetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 11) gzip`,
    },
    body: JSON.stringify({
      context: { client: { clientName: 'ANDROID', clientVersion: ANDROID_VERSION, androidSdkVersion: 30, hl: 'ja', gl: 'JP' } },
      videoId,
    }),
  });
  if (res.status === 403 || res.status === 429) throw new CaptionError('blocked', `HTTP ${res.status}`);
  if (!res.ok) throw new CaptionError('upstream_error', `player HTTP ${res.status}`);
  return (await res.json()) as PlayerResponse;
}

const MS_PER_CHAR = 220;
const LAST_WORD_MIN_MS = 300;
const LAST_WORD_MAX_MS = 1500;

interface Json3Seg {
  utf8?: string;
  tOffsetMs?: number;
}

interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Json3Seg[];
}

/**
 * json3 -> baris. Event tanpa `segs` (penanda jendela) dan teks kosong dibuang.
 * Caption otomatis membawa tOffsetMs per segmen: dari situ dibentuk waktu tiap kata, dan akhir baris
 * dihitung dari kata terakhir (dDurationMs pada caption otomatis sering tumpang tindih dengan baris berikut).
 */
export function parseJson3(raw: unknown): CaptionLine[] {
  const events = (raw as { events?: Json3Event[] })?.events ?? [];
  const lines: CaptionLine[] = [];
  for (const e of events) {
    if (!e.segs || e.tStartMs === undefined) continue;
    const start = e.tStartMs;
    const eventEnd = start + (e.dDurationMs ?? 0);
    const segs = e.segs
      .map(s => ({ text: (s.utf8 ?? '').replace(/\s*\n\s*/g, ' ').trim(), offset: s.tOffsetMs ?? 0 }))
      .filter(s => s.text);
    if (segs.length === 0) continue;

    const text = segs.map(s => s.text).join('');
    const hasWordTiming = segs.length > 1 && e.segs.some(s => s.tOffsetMs !== undefined);
    if (!hasWordTiming) {
      lines.push({ startMs: start, endMs: eventEnd, text });
      continue;
    }

    const words: CaptionWord[] = segs.map((seg, i) => {
      const wordStart = start + seg.offset;
      if (i + 1 < segs.length) return { text: seg.text, startMs: wordStart, endMs: start + segs[i + 1].offset };
      const guess = Math.min(Math.max(seg.text.length * MS_PER_CHAR, LAST_WORD_MIN_MS), LAST_WORD_MAX_MS);
      return { text: seg.text, startMs: wordStart, endMs: wordStart + Math.min(Math.max(eventEnd - wordStart, 0) || guess, guess) };
    });
    lines.push({ startMs: start, endMs: words[words.length - 1].endMs, text, words });
  }
  return lines;
}

export async function fetchCaptions(videoId: string): Promise<CaptionResult> {
  if (!ID_RE.test(videoId)) throw new CaptionError('bad_id');

  const player = await getPlayer(videoId);
  const status = player.playabilityStatus?.status;
  if (status && status !== 'OK') {
    const reason = player.playabilityStatus?.reason ?? '';
    throw new CaptionError(/bot|sign in/i.test(reason) ? 'blocked' : 'unavailable', `${status} ${reason}`.trim());
  }

  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) throw new CaptionError('no_captions');

  const ja = tracks.filter(t => t.languageCode === 'ja' || t.languageCode.startsWith('ja-'));
  if (ja.length === 0) throw new CaptionError('no_japanese', tracks.map(t => t.languageCode).join(','));
  const track = ja.find(t => t.kind !== 'asr') ?? ja[0];

  const url = new URL(track.baseUrl);
  url.searchParams.set('fmt', 'json3');
  const res = await timedFetch(url.toString());
  if (res.status === 403 || res.status === 429) throw new CaptionError('blocked', `timedtext HTTP ${res.status}`);
  if (!res.ok) throw new CaptionError('upstream_error', `timedtext HTTP ${res.status}`);
  const body = await res.text();
  if (!body) throw new CaptionError('blocked', 'timedtext kosong');

  return {
    videoId,
    language: track.languageCode,
    kind: track.kind === 'asr' ? 'auto' : 'manual',
    lines: parseJson3(JSON.parse(body)),
  };
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse
): Promise<void> {
  const send = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'GET') return send(405, { error: 'method_not_allowed' });
  const v = new URL(req.url ?? '', 'http://x').searchParams.get('v') ?? '';
  try {
    send(200, await fetchCaptions(v));
  } catch (err) {
    if (err instanceof CaptionError) return send(err.code === 'bad_id' ? 400 : 502, { error: err.code, detail: err.message });
    send(500, { error: 'internal' });
  }
}
