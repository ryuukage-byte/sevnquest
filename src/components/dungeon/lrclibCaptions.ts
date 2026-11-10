// ==============================================================================
// LRCLIB -> SUBTITLE PEMUTAR
// Mengambil lirik berwaktu dari /api/lyrics dan mengubahnya menjadi CaptionState, bentuk yang sama dengan
// subtitle YouTube, sehingga ImmersionStage tidak perlu tahu sumbernya. Lirik ini tidak punya waktu per kata,
// jadi ImmersionStage memakai perkiraan (wordTiming) dan menyorot per baris.
// ==============================================================================

import { toSungLines } from '../../engine/lyrics/lyricLines';
import type { CaptionState, LyricLine } from './immersionTypes';

export interface LrclibQuery {
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
}

/** Bentuk respons /api/lyrics yang dipakai klien. */
export type LyricsResponse =
  | { status: 'synced'; track: { durationMs?: number }; lines: { startMs: number; text: string }[] }
  | { status: 'plain'; plainLines: string[] }
  | { status: 'instrumental' };

const ERRORS: Record<string, string> = {
  bad_query: 'Judul dan artis wajib diisi.',
  not_found: 'Lirik lagu ini tidak ditemukan di LRCLIB. Coba periksa lagi judul dan artisnya.',
  busy: 'LRCLIB sedang sibuk. Coba lagi sebentar lagi.',
  upstream_error: 'LRCLIB tidak bisa dihubungi sekarang.',
};

/** Mengubah respons lirik menjadi CaptionState. Lirik tanpa waktu dan lagu instrumental menjadi pesan galat. */
export function lyricsToCaption(body: LyricsResponse): CaptionState {
  if (body.status === 'instrumental') return { status: 'error', message: 'Lagu ini instrumental, jadi tidak ada lirik untuk dibaca.' };
  if (body.status === 'plain') {
    return { status: 'error', message: 'Lirik ini tidak berwaktu di LRCLIB, jadi tidak bisa diikuti baris demi baris.' };
  }
  const lines: LyricLine[] = toSungLines(body.lines, body.track.durationMs).map(l => ({ startMs: l.startMs, endMs: l.endMs, text: l.text }));
  if (lines.length === 0) return { status: 'error', message: 'Lirik ini kosong di LRCLIB.' };
  return { status: 'ready', lines, kind: 'lrclib' };
}

/** Memanggil /api/lyrics. Galat jaringan dan galat dari server diubah menjadi pesan untuk pengguna. */
export async function fetchLrclibCaptions(q: LrclibQuery, signal?: AbortSignal): Promise<CaptionState> {
  const params = new URLSearchParams({ title: q.title, artist: q.artist });
  if (q.album) params.set('album', q.album);
  if (q.durationSec) params.set('duration', String(Math.round(q.durationSec)));
  let res: Response;
  try {
    res = await fetch(`/api/lyrics?${params.toString()}`, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    return { status: 'error', message: 'Gagal menghubungi server lirik.' };
  }
  const body = (await res.json().catch(() => null)) as LyricsResponse | { error?: string } | null;
  if (!res.ok || !body || !('status' in body)) {
    const code = (body as { error?: string } | null)?.error ?? '';
    return { status: 'error', message: ERRORS[code] ?? 'Lirik gagal diambil dari LRCLIB.' };
  }
  return lyricsToCaption(body);
}
