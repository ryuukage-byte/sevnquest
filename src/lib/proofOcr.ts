// Baca teks screenshot bukti bayar di browser admin (tesseract.js, dimuat hanya saat dibutuhkan).
// Hasilnya hanya petunjuk "verified" untuk admin; persetujuan tetap manual.
import { checkProofText, type ProofCheck } from '../utils/proofCheck';

type OcrWorker = { recognize: (img: string) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

let workerPromise: Promise<OcrWorker> | null = null;
const cache = new Map<string, ProofCheck>();

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(m => m.createWorker('eng') as unknown as Promise<OcrWorker>)
      .catch(err => {
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

/** OCR satu antrean (worker tunggal) agar tidak membebani perangkat admin. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Baca screenshot (URL bertanda tangan) lalu cocokkan dengan nominal pesanan.
 * cacheKey = id pesanan + path bukti, supaya bukti yang diganti dibaca ulang.
 */
export function checkProofImage(cacheKey: string, imageUrl: string, expectedAmount: number): Promise<ProofCheck> {
  const hit = cache.get(cacheKey);
  if (hit) return Promise.resolve(hit);
  const job = queue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(imageUrl);
    const result = checkProofText(data.text || '', expectedAmount);
    cache.set(cacheKey, result);
    return result;
  });
  queue = job.catch(() => undefined);
  return job;
}
