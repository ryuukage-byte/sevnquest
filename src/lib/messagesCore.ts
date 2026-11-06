/**
 * Logika murni (tanpa Supabase/React) untuk pesan pemain <-> admin.
 * Lihat supabase/migrations/20261107_messages.sql untuk skema & aturan server.
 */

export type MessageCategory = 'general' | 'bug' | 'account' | 'suggestion';
export type ThreadStatus = 'open' | 'closed';
export type ThreadFilter = 'open' | 'closed' | 'unread' | 'all';

export interface MessageThread {
  id: string;
  userId: string;
  userName: string | null;
  subject: string;
  category: MessageCategory;
  status: ThreadStatus;
  createdAt: string;
  lastMessageAt: string;
  lastSender: 'user' | 'admin';
  userUnread: number;
  adminUnread: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  fromAdmin: boolean;
  body: string;
  createdAt: string;
}

export const MESSAGE_LIMITS = { subject: 120, body: 4000, openThreads: 5 } as const;

export const CATEGORIES: { value: MessageCategory; label: string }[] = [
  { value: 'general', label: 'Umum' },
  { value: 'bug', label: 'Lapor Bug' },
  { value: 'account', label: 'Akun & Progres' },
  { value: 'suggestion', label: 'Saran' },
];

export function categoryLabel(c: MessageCategory): string {
  return CATEGORIES.find(x => x.value === c)?.label ?? 'Umum';
}

const CATEGORY_SET = new Set<string>(CATEGORIES.map(c => c.value));

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function int(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function parseThreadRow(row: unknown): MessageThread | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const userId = str(r.user_id);
  const subject = str(r.subject);
  if (!id || !userId || !subject) return null;
  const category = str(r.category);
  const createdAt = str(r.created_at) ?? new Date(0).toISOString();
  return {
    id,
    userId,
    userName: str(r.user_name),
    subject,
    category: category && CATEGORY_SET.has(category) ? (category as MessageCategory) : 'general',
    status: r.status === 'closed' ? 'closed' : 'open',
    createdAt,
    lastMessageAt: str(r.last_message_at) ?? createdAt,
    lastSender: r.last_sender === 'admin' ? 'admin' : 'user',
    userUnread: int(r.user_unread),
    adminUnread: int(r.admin_unread),
  };
}

export function parseMessageRow(row: unknown): ChatMessage | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const threadId = str(r.thread_id);
  const body = str(r.body);
  if (!id || !threadId || body === null) return null;
  return {
    id,
    threadId,
    fromAdmin: r.from_admin === true,
    body,
    createdAt: str(r.created_at) ?? new Date(0).toISOString(),
  };
}

export interface NewThreadDraft {
  subject: string;
  category: MessageCategory;
  body: string;
}

export const EMPTY_THREAD_DRAFT: NewThreadDraft = { subject: '', category: 'general', body: '' };

/** Pesan galat pertama, atau null bila valid. */
export function validateNewThread(d: NewThreadDraft): string | null {
  const subject = d.subject.trim();
  if (!subject) return 'Subjek wajib diisi.';
  if (subject.length > MESSAGE_LIMITS.subject) return `Subjek maksimal ${MESSAGE_LIMITS.subject} karakter.`;
  return validateBody(d.body);
}

export function validateBody(body: string): string | null {
  const b = body.trim();
  if (!b) return 'Pesan tidak boleh kosong.';
  if (b.length > MESSAGE_LIMITS.body) return `Pesan maksimal ${MESSAGE_LIMITS.body} karakter.`;
  return null;
}

/** Percakapan "belum dibaca" untuk pihak yang melihat. */
export function isUnreadFor(t: MessageThread, viewer: 'user' | 'admin'): boolean {
  return viewer === 'admin' ? t.adminUnread > 0 : t.userUnread > 0;
}

/** Urutan kotak masuk: belum dibaca dulu, lalu terbaru. */
export function sortThreads(list: MessageThread[], viewer: 'user' | 'admin'): MessageThread[] {
  return [...list].sort((a, b) => {
    const ua = isUnreadFor(a, viewer) ? 1 : 0;
    const ub = isUnreadFor(b, viewer) ? 1 : 0;
    if (ua !== ub) return ub - ua;
    return Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt);
  });
}

export function filterThreads(list: MessageThread[], filter: ThreadFilter, viewer: 'user' | 'admin'): MessageThread[] {
  switch (filter) {
    case 'open':
      return list.filter(t => t.status === 'open');
    case 'closed':
      return list.filter(t => t.status === 'closed');
    case 'unread':
      return list.filter(t => isUnreadFor(t, viewer));
    default:
      return list;
  }
}

/** "baru saja", "5 mnt lalu", "3 jam lalu", "kemarin", atau tanggal. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, now.getTime() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'kemarin';
  if (d < 7) return `${d} hari lalu`;
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Terjemahkan galat Supabase ke pesan yang ramah pemain. */
export function messageError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return 'Terjadi kesalahan.';
  const msg = err.message || '';
  if (
    err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST202' || err.code === '42883' ||
    /does not exist|schema cache|Could not find the (table|function)/i.test(msg)
  ) {
    return 'Fitur pesan belum aktif di server (migrasi 20261107_messages.sql belum dijalankan).';
  }
  if (err.code === 'P0001' || err.code === 'P0002') return msg;
  if (err.code === '42501' || /row-level security|permission denied|Akses ditolak|Harus login/i.test(msg)) {
    return /Harus login/i.test(msg) ? 'Masuk ke akun dulu untuk mengirim pesan.' : 'Akses ditolak.';
  }
  if (err.code === '23514') return 'Isi pesan tidak valid (kosong atau terlalu panjang).';
  if (/Failed to fetch|NetworkError|timeout|aborted/i.test(msg)) return 'Tidak dapat terhubung ke server. Coba lagi.';
  return msg || 'Terjadi kesalahan.';
}
