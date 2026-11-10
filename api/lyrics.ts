// ==============================================================================
// GET /api/lyrics?title=<judul>&artist=<artis>[&album=<album>][&duration=<detik>]
// : lirik berwaktu sebuah lagu dari LRCLIB (lrclib.net), basis data lirik terbuka yang lirik LRC-nya
// dibuat pengguna. Proxy ini dipakai supaya klien tidak memanggil LRCLIB langsung dari browser.
//
// Urutan pencarian mengikuti mixmusic (lyrics/lyrics.go, MIT):
//   1. /get dengan judul, artis, album, dan durasi: kecocokan persis.
//   2. Bila tidak ada, /search dengan judul dan artis, lalu hasil dengan durasi terdekat (maks. 12 detik).
//      Lirik berwaktu didahulukan: lirik biasa dinilai 2 detik lebih jauh.
// Lirik berwaktu dibaca dengan parseLrc. Lirik tanpa waktu dikembalikan apa adanya sebagai baris teks.
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'http';
import { isSynced, parseLrc, type TimedLine } from '../src/engine/lyrics/lrc';

export interface LyricsQuery {
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
}

/** Bentuk satu catatan dari LRCLIB; hanya kolom yang dipakai. */
export interface LrclibRecord {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number | null;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

export interface LyricsTrack {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
}

const SOURCE = { name: 'LRCLIB', url: 'https://lrclib.net' } as const;

export type LyricsPayload =
  | { status: 'synced'; source: typeof SOURCE; track: LyricsTrack; lines: TimedLine[] }
  | { status: 'plain'; source: typeof SOURCE; track: LyricsTrack; plainLines: string[] }
  | { status: 'instrumental'; source: typeof SOURCE; track: LyricsTrack };

export type LyricsErrorCode = 'bad_query' | 'not_found' | 'busy' | 'upstream_error';

export class LyricsError extends Error {
  constructor(public code: LyricsErrorCode, detail = '') {
    super(detail ? `${code}: ${detail}` : code);
  }
}

const BASE_URL = 'https://lrclib.net/api';
// Kontak pengembang sebaiknya ditaruh di sini bila LRCLIB memintanya. Jangan isi dengan data pengguna.
const USER_AGENT = 'lyrics-proxy/1.0';
const TIMEOUT_MS = 8000;
/** Sama seperti mixmusic: kandidat /search dengan durasi selisih lebih dari ini ditolak. */
const MAX_DURATION_DIFF_SEC = 12;
/** Lirik tanpa waktu dinilai selisih 2 detik, supaya lirik berwaktu yang sedikit lebih jauh tetap menang. */
const PLAIN_PENALTY_SEC = 2;
const MAX_TEXT_CHARS = 200;
const MAX_DURATION_SEC = 7200;

function clean(value: string | null, max: number): string | undefined {
  const v = (value ?? '').trim();
  return v === '' ? undefined : v.slice(0, max);
}

/** Membaca query dari URL. Null bila judul atau artis kosong, atau durasi tidak masuk akal. */
export function parseQuery(params: URLSearchParams): LyricsQuery | null {
  const title = clean(params.get('title'), MAX_TEXT_CHARS);
  const artist = clean(params.get('artist'), MAX_TEXT_CHARS);
  if (!title || !artist) return null;
  const album = clean(params.get('album'), MAX_TEXT_CHARS);
  const rawDuration = clean(params.get('duration'), 16);
  let durationSec: number | undefined;
  if (rawDuration !== undefined) {
    const n = Number(rawDuration);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_DURATION_SEC) return null;
    durationSec = n;
  }
  return { title, artist, album, durationSec };
}

/**
 * Memilih catatan dari hasil /search: yang paling dekat durasinya, dengan lirik berwaktu didahulukan.
 * Catatan tanpa lirik sama sekali dibuang. Null bila tidak ada yang selisihnya masih wajar.
 */
export function pickRecord(records: readonly LrclibRecord[], durationSec?: number): LrclibRecord | null {
  let best: LrclibRecord | null = null;
  let bestDiff = Infinity;
  for (const r of records) {
    const synced = !!r.syncedLyrics?.trim();
    const hasPlain = !!r.plainLyrics?.trim();
    if (!synced && !hasPlain && !r.instrumental) continue;
    let diff = 0;
    if (durationSec && durationSec > 0) diff = Math.abs((r.duration ?? 0) - durationSec);
    if (!synced) diff += PLAIN_PENALTY_SEC;
    if (diff < bestDiff) {
      best = r;
      bestDiff = diff;
    }
  }
  return best && bestDiff <= MAX_DURATION_DIFF_SEC ? best : null;
}

function plainLinesOf(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map(l => l.trim());
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Catatan dari /get diterima bila durasinya dekat dengan durasi yang diminta. LRCLIB kadang mengembalikan
 * versi lain dari lagu yang sama (mis. durasi 100 detik untuk lagu 212 detik), dan lirik versi itu salah.
 */
export function isDurationClose(r: LrclibRecord, durationSec?: number): boolean {
  if (!durationSec || durationSec <= 0) return true;
  if (!r.duration) return true;
  return Math.abs(r.duration - durationSec) <= MAX_DURATION_DIFF_SEC;
}

/** Mengubah catatan LRCLIB menjadi bentuk yang dikirim ke klien. Null bila catatan tidak punya lirik. */
export function toPayload(r: LrclibRecord): LyricsPayload | null {
  const track: LyricsTrack = {
    title: r.trackName ?? '',
    artist: r.artistName ?? '',
    album: r.albumName || undefined,
    durationMs: r.duration ? Math.round(r.duration * 1000) : undefined,
  };
  if (r.instrumental) return { status: 'instrumental', source: SOURCE, track };
  const lrc = r.syncedLyrics?.trim() ?? '';
  if (lrc) {
    const lines = parseLrc(lrc);
    if (isSynced(lines)) return { status: 'synced', source: SOURCE, track, lines };
  }
  const plain = plainLinesOf(r.plainLyrics ?? '');
  if (plain.some(l => l !== '')) return { status: 'plain', source: SOURCE, track, plainLines: plain };
  return null;
}

async function lrclib(path: string, params: URLSearchParams): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (res.status === 429 || res.status === 503) throw new LyricsError('busy', `HTTP ${res.status}`);
  if (!res.ok) throw new LyricsError('upstream_error', `HTTP ${res.status}`);
  return res.json();
}

/** Mencari lirik sebuah lagu. Melempar LyricsError bila tidak ada atau LRCLIB tidak bisa dihubungi. */
export async function fetchLyrics(q: LyricsQuery): Promise<LyricsPayload> {
  const exactParams = new URLSearchParams({ track_name: q.title, artist_name: q.artist });
  if (q.album) exactParams.set('album_name', q.album);
  if (q.durationSec) exactParams.set('duration', String(Math.round(q.durationSec)));

  let record = (await lrclib('/get', exactParams)) as LrclibRecord | null;
  if (record && !isDurationClose(record, q.durationSec)) record = null;
  if (!record) {
    const searchParams = new URLSearchParams({ track_name: q.title, artist_name: q.artist });
    const found = (await lrclib('/search', searchParams)) as LrclibRecord[] | null;
    record = pickRecord(Array.isArray(found) ? found : [], q.durationSec);
  }
  const payload = record ? toPayload(record) : null;
  if (!payload) throw new LyricsError('not_found');
  return payload;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const send = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    // Lirik sebuah lagu jarang berubah; cache sehari di tepi, tapi jangan simpan galat.
    res.setHeader('Cache-Control', status === 200 ? 'public, max-age=86400' : 'no-store');
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'GET') return send(405, { error: 'method_not_allowed' });
  const q = parseQuery(new URL(req.url ?? '', 'http://x').searchParams);
  if (!q) return send(400, { error: 'bad_query' });
  try {
    send(200, await fetchLyrics(q));
  } catch (err) {
    if (err instanceof LyricsError) {
      const status = err.code === 'not_found' ? 404 : err.code === 'busy' ? 503 : 502;
      return send(status, { error: err.code, detail: err.message });
    }
    send(500, { error: 'internal' });
  }
}
