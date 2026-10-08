import type { TopicPlan } from '../../api/deck-topic';

export type { TopicPlan };

const TIMEOUT_MS = 9000;
const cache = new Map<string, TopicPlan>();
/** Setelah server menjawab "belum dikonfigurasi", jangan menunggu lagi pada sesi ini. */
let unavailable = false;

/**
 * Minta perluasan topik ke /api/deck-topic. Mengembalikan null untuk SEMUA kegagalan
 * (belum dikonfigurasi, kuota, offline, timeout): pemanggil cukup memakai pencocokan lokal.
 */
export async function requestTopicPlan(topic: string): Promise<TopicPlan | null> {
  const key = topic.trim().toLowerCase();
  if (!key || unavailable) return null;
  const cached = cache.get(key);
  if (cached) return cached;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/deck-topic', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim() }),
    });
    if (res.status === 503 || res.status === 404) unavailable = true;
    if (!res.ok) return null;
    const data = (await res.json()) as { plan?: TopicPlan };
    if (!data.plan) return null;
    cache.set(key, data.plan);
    return data.plan;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
