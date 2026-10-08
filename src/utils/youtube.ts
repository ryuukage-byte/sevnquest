const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

/** Ambil video id dari URL YouTube (watch, youtu.be, shorts, live, embed) atau id polos. Null jika tidak valid. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (ID_RE.test(text)) return text;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (HOSTS.has(host)) {
    const [kind, second] = url.pathname.split('/').filter(Boolean);
    id = kind === 'watch' ? url.searchParams.get('v') : ['shorts', 'live', 'embed', 'v'].includes(kind) ? second ?? null : null;
  }
  return id && ID_RE.test(id) ? id : null;
}

export function formatMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface TimedLine {
  startMs: number;
  endMs: number;
}

const MIN_PLAY_MS = 300; // baris pendek tetap terdengar sebelum jeda
const PAUSE_TAIL_MS = 150; // napas setelah kata terakhir, supaya akhir kata tidak terpotong
const PAUSE_LEAD_MS = 50; // berhenti sedikit sebelum baris berikut mulai, supaya suku kata pertamanya tidak ikut terdengar

/** Waktu (ms) untuk menjeda setelah baris `idx` selesai diputar. */
export function pauseBoundaryMs(lines: readonly TimedLine[], idx: number): number {
  const line = lines[idx];
  const next = lines[idx + 1];
  const end = next ? Math.min(line.endMs + PAUSE_TAIL_MS, next.startMs - PAUSE_LEAD_MS) : line.endMs + PAUSE_TAIL_MS;
  return Math.max(line.startMs + MIN_PLAY_MS, end);
}

/** Batas jeda berikutnya yang belum terlewati pada `timeMs` beserta baris yang diakhirinya; null jika sudah melewati baris terakhir. */
export function nextPause(lines: readonly TimedLine[], timeMs: number): { ms: number; index: number } | null {
  if (lines.length === 0) return null;
  const idx = Math.max(activeLineIndex(lines, timeMs), 0);
  const boundary = pauseBoundaryMs(lines, idx);
  if (timeMs < boundary) return { ms: boundary, index: idx };
  return idx + 1 < lines.length ? { ms: pauseBoundaryMs(lines, idx + 1), index: idx + 1 } : null;
}

/** Indeks baris terakhir yang startMs-nya <= timeMs (binary search); -1 jika belum ada baris yang mulai. */
export function activeLineIndex(lines: readonly { startMs: number }[], timeMs: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].startMs <= timeMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
