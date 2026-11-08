import { safeGetItem, safeSetItem } from './storage';

const DEVICE_KEY = 'sevnquest_device_id';

/** ID acak per browser/perangkat, disimpan lokal. Dipakai untuk membatasi jumlah perangkat per akun. */
export function getDeviceId(): string {
  const existing = safeGetItem(DEVICE_KEY);
  if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  safeSetItem(DEVICE_KEY, id);
  return id;
}

/** Nama ramah perangkat dari user agent, mis. "Chrome · Android". */
export function describeUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser';
  const os = /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Perangkat';
  return `${browser} · ${os}`;
}

export function getDeviceLabel(): string {
  return typeof navigator !== 'undefined' ? describeUserAgent(navigator.userAgent || '') : 'Perangkat';
}
