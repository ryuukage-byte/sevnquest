import { parseYouTubeId } from './youtube';

export type ShortVideoPlatform = 'tiktok' | 'instagram' | 'youtube';

export interface ShortVideo {
  platform: ShortVideoPlatform;
  /** Tautan asli, dipakai untuk tombol "Buka di ...". */
  url: string;
  /** Alamat embed yang dimuat di dalam layar pemutar. */
  embedUrl: string;
}

const TIKTOK_ID_RE = /^\d+$/;
const INSTAGRAM_CODE_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Ubah tautan TikTok, Instagram Reels, atau YouTube (Shorts/watch) menjadi alamat embed.
 * Null jika tautan tidak dikenali. Tautan pendek (vm.tiktok.com) tidak didukung karena perlu di-resolve dulu.
 */
export function parseShortVideoUrl(input: string): ShortVideo | null {
  const text = input.trim();
  if (!text) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'tiktok.com') {
    // https://www.tiktok.com/@user/video/1234567890
    const videoIdx = parts.indexOf('video');
    const id = videoIdx >= 0 ? parts[videoIdx + 1] : undefined;
    if (!id || !TIKTOK_ID_RE.test(id)) return null;
    return { platform: 'tiktok', url: url.toString(), embedUrl: `https://www.tiktok.com/embed/v2/${id}` };
  }

  if (host === 'instagram.com') {
    // https://www.instagram.com/reel/AbC123/ atau /reels/ atau /p/
    const [kind, code] = parts;
    if (!['reel', 'reels', 'p'].includes(kind) || !code || !INSTAGRAM_CODE_RE.test(code)) return null;
    const embedKind = kind === 'p' ? 'p' : 'reel';
    return { platform: 'instagram', url: url.toString(), embedUrl: `https://www.instagram.com/${embedKind}/${code}/embed/` };
  }

  const youtubeId = parseYouTubeId(text);
  if (youtubeId) {
    return {
      platform: 'youtube',
      url: `https://www.youtube.com/shorts/${youtubeId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  return null;
}
