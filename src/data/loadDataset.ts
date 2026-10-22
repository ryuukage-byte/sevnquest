/**
 * Pemuat dataset untuk build produksi. Plugin `sevn-datasets` (vite.config.ts) mengganti impor dataset besar
 * di src/data/db dengan modul kecil `export default await loadDataset(url)`, sehingga konsumen tetap memakai
 * impor biasa (sinkron). Teks JSON di-parse lalu dibuang — tidak menetap di memori seperti literal di dalam
 * skrip — dan berkasnya di-preload dari index.html bila dibutuhkan jalur boot.
 *
 * Gangguan jaringan dicoba ulang. Kegagalan akhir memakai pesan yang dikenali pemulihan chunk
 * (lazyWithRetry / BootSplash), karena modul yang gagal dievaluasi tidak bisa diimpor ulang tanpa muat ulang.
 */
const RETRY_DELAYS_MS = [500, 1500];

export const DATASET_LOAD_ERROR = 'Failed to fetch dynamically imported module';

export async function loadDataset<T = unknown>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, attempt > 0 ? { cache: 'reload' } : undefined);
      const type = res.headers.get('content-type') || '';
      // Host SPA bisa membalas berkas yang hilang dengan index.html (200): itu bukan dataset.
      if (!res.ok || type.includes('text/html')) throw new Error(`HTTP ${res.status} ${type}`.trim());
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new TypeError(`${DATASET_LOAD_ERROR}: ${url} (${reason})`);
}
