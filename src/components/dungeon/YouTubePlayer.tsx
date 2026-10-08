import React, { useEffect, useRef } from 'react';

/** Subset YT.Player yang dipakai. */
interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT as YTNamespace);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('iframe_api gagal dimuat'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** Kendali pemutar untuk komponen induk. */
export interface PlayerControl {
  /** Loncat ke waktu tertentu lalu putar. */
  seekToMs(ms: number): void;
  togglePlay(): void;
  setRate(rate: number): void;
  getTimeMs(): number;
  /** Jeda otomatis begitu waktu mencapai nilai ini (sekali pakai); null = batalkan. */
  setPauseAt(ms: number | null): void;
}

interface Props {
  videoId: string;
  /** Dipanggil ~20x/detik selama pemutar hidup, dengan posisi saat ini (ms). */
  onTime?: (ms: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  /** Dipanggil saat pemutar dijeda otomatis karena mencapai batas dari setPauseAt. */
  onBoundaryPause?: () => void;
  controlRef?: React.MutableRefObject<PlayerControl | null>;
}

const POLL_MS = 50;
// YT.PlayerState: 1 = PLAYING, 3 = BUFFERING (maksud pengguna tetap memutar)
const isPlayingState = (state: number) => state === 1 || state === 3;

export const YouTubePlayer: React.FC<Props> = ({ videoId, onTime, onPlayingChange, onBoundaryPause, controlRef }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const pauseAtRef = useRef<number | null>(null);
  const onTimeRef = useRef(onTime);
  const onPlayingRef = useRef(onPlayingChange);
  const onBoundaryRef = useRef(onBoundaryPause);
  onTimeRef.current = onTime;
  onPlayingRef.current = onPlayingChange;
  onBoundaryRef.current = onBoundaryPause;

  useEffect(() => {
    let player: YTPlayer | null = null;
    let timer: number | undefined;
    let cancelled = false;
    pauseAtRef.current = null;

    loadYouTubeApi()
      .then(YT => {
        if (cancelled || !hostRef.current) return;
        // YT mengganti elemen target dengan iframe; beri anak baru supaya React tidak kehilangan host.
        const target = document.createElement('div');
        hostRef.current.replaceChildren(target);
        player = new YT.Player(target, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: { rel: 0, playsinline: 1 },
          events: {
            onReady: () => {
              if (controlRef) {
                controlRef.current = {
                  seekToMs: ms => {
                    player?.seekTo(ms / 1000, true);
                    player?.playVideo();
                  },
                  togglePlay: () => {
                    if (!player) return;
                    if (isPlayingState(player.getPlayerState())) player.pauseVideo();
                    else player.playVideo();
                  },
                  setRate: rate => player?.setPlaybackRate(rate),
                  getTimeMs: () => (player ? player.getCurrentTime() * 1000 : 0),
                  setPauseAt: ms => {
                    pauseAtRef.current = ms;
                  },
                };
              }
              timer = window.setInterval(() => {
                if (!player) return;
                const ms = player.getCurrentTime() * 1000;
                // Jeda dulu, baru laporkan waktu: induk tidak sempat menganggap baris sudah berganti.
                if (pauseAtRef.current !== null && ms >= pauseAtRef.current) {
                  pauseAtRef.current = null;
                  player.pauseVideo();
                  onBoundaryRef.current?.();
                }
                onTimeRef.current?.(ms);
              }, POLL_MS);
            },
            onStateChange: (e: { data: number }) => onPlayingRef.current?.(isPlayingState(e.data)),
          },
        });
      })
      .catch(() => { /* jaringan/blokir iklan: pemutar kosong, transkrip tetap bisa dibaca */ });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (controlRef) controlRef.current = null;
      player?.destroy();
    };
  }, [videoId, controlRef]);

  return <div ref={hostRef} className="w-full h-full [&_iframe]:w-full [&_iframe]:h-full" />;
};
