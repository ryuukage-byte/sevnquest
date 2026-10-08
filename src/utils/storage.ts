/**
 * Safe localStorage helpers.
 * Semua tulis ke storage dibungkus try/catch supaya QuotaExceededError / mode privat
 * tidak melempar error ke UI dan pemanggil bisa tahu apakah penyimpanan berhasil.
 */

export type StorageWriteResult = 'ok' | 'quota' | 'error';

export function isQuotaExceeded(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

export function safeSetItem(key: string, value: string): StorageWriteResult {
  try {
    localStorage.setItem(key, value);
    return 'ok';
  } catch (err) {
    if (isQuotaExceeded(err)) {
      console.warn(`[storage] Kuota penuh saat menulis "${key}"`, err);
      return 'quota';
    }
    console.warn(`[storage] Gagal menulis "${key}"`, err);
    return 'error';
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeReadJson<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
