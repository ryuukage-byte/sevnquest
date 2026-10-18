import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RETRY_DELAYS_MS = [400, 1500];
const AUTO_RELOAD_KEY = 'sevn_pwa_auto_retry';
const AUTO_RELOAD_COOLDOWN_MS = 30_000;

/** Modul lazy yang gagal dimuat; dibuat ulang saat pemain menekan "Coba Pulihkan". */
const failedResets = new Set<() => void>();

/**
 * React.lazy menyimpan promise yang gagal selamanya, sehingga render ulang hanya melempar error yang sama.
 * Panggil ini sebelum me-reset ErrorBoundary supaya impor benar-benar dicoba lagi.
 */
export function resetFailedLazyModules(): void {
  failedResets.forEach((reset) => reset());
  failedResets.clear();
}

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch|MIME type/i.test(msg);
}

/** Chunk hilang/basi (mis. setelah deploy baru): muat ulang sekali untuk mengambil index.html terbaru. */
function tryAutoReload(): boolean {
  if (typeof window === 'undefined' || navigator.onLine === false) return false;
  const reload = (window as unknown as { __sevnForceReload?: () => void }).__sevnForceReload;
  if (typeof reload !== 'function') return false;
  try {
    const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
    if (last && Date.now() - last < AUTO_RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  reload();
  return true;
}

/** Catat URL chunk yang gagal supaya "Bersihkan Cache & Muat Ulang" bisa membuang salinan HTTP-nya. */
function rememberStaleUrl(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  const url = msg.match(/https?:\/\/\S+?\.(?:js|mjs|css)/)?.[0];
  if (!url) return;
  const w = window as unknown as { __sevnStaleUrls?: string[] };
  (w.__sevnStaleUrls ||= []).push(url);
}

async function loadWithRetry<T>(factory: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await factory();
    } catch (err) {
      lastError = err;
      if (!isChunkLoadError(err) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  if (isChunkLoadError(lastError)) rememberStaleUrl(lastError);
  if (isChunkLoadError(lastError) && tryAutoReload()) {
    // Halaman sedang dimuat ulang: biarkan fallback Suspense tampil, jangan kedipkan layar error.
    return new Promise<T>(() => {});
  }
  throw lastError;
}

/**
 * Pengganti React.lazy untuk chunk yang dimuat dinamis: mencoba ulang saat jaringan tersendat,
 * memuat ulang halaman sekali bila chunk sudah tidak ada, dan bisa dipulihkan lewat ErrorBoundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ComponentType<React.ComponentProps<T>> {
  const make = (): LazyExoticComponent<T> =>
    lazy(() =>
      loadWithRetry(factory).catch((err) => {
        failedResets.add(() => {
          Current = make();
        });
        throw err;
      }),
    );
  let Current = make();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: React.ComponentProps<T>) => createElement(Current as any, props);
}
