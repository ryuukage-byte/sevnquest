// Penyimpanan lokal Writing Companion: tanda kalimat "sudah ditulis" per bacaan.

export interface CompanionSource {
  id: string;
  title: string;
  text: string;
  translations?: Record<string, string>;
  meta: string;
}

const DONE_KEY = (id: string) => `writing_companion_done:${id}`;

export function loadDone(id: string): Set<number> {
  try {
    const raw = localStorage.getItem(DONE_KEY(id));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((n): n is number => typeof n === 'number') : []);
  } catch {
    return new Set();
  }
}

export function saveDone(id: string, done: Set<number>) {
  try { localStorage.setItem(DONE_KEY(id), JSON.stringify([...done])); } catch { /* penyimpanan tidak tersedia */ }
}
