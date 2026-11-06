/**
 * Akses Supabase + store "belum dibaca" untuk pesan pemain <-> admin
 * (tabel public.message_threads / public.messages; lihat supabase/migrations/20261107_messages.sql).
 *
 * Semua fungsi tidak pernah melempar: offline / tabel belum ada => hasil { ok: false } atau 0 belum dibaca.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import {
  ChatMessage,
  MessageThread,
  NewThreadDraft,
  ThreadStatus,
  messageError,
  parseMessageRow,
  parseThreadRow,
} from './messagesCore';

const THREAD_COLUMNS =
  'id,user_id,user_name,subject,category,status,created_at,last_message_at,last_sender,user_unread,admin_unread';
const MESSAGE_COLUMNS = 'id,thread_id,from_admin,body,created_at';
const REFRESH_EVENT = 'nq:messages-refresh';
const POLL_MS = 3 * 60 * 1000;

export type MsgResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<MsgResult<T>>): Promise<MsgResult<T>> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: messageError({ message: (e as Error)?.message }) };
  }
}

function threads(data: unknown): MessageThread[] {
  return Array.isArray(data) ? data.map(parseThreadRow).filter((t): t is MessageThread => t !== null) : [];
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// --------------------------- Store belum dibaca ---------------------------

export interface MessageUnreadSnapshot {
  /** Balasan admin yang belum dibaca pemain ini. */
  userUnread: number;
  /** Pesan pemain yang belum dibaca admin (0 bila bukan admin). */
  adminUnread: number;
  isAdmin: boolean;
}

const EMPTY: MessageUnreadSnapshot = { userUnread: 0, adminUnread: 0, isAdmin: false };
let snapshot: MessageUnreadSnapshot = EMPTY;
const listeners = new Set<() => void>();
let started = false;
let inflight: Promise<void> | null = null;

function emit(next: MessageUnreadSnapshot): void {
  if (
    next.userUnread === snapshot.userUnread &&
    next.adminUnread === snapshot.adminUnread &&
    next.isAdmin === snapshot.isAdmin
  ) return;
  snapshot = next;
  listeners.forEach(l => l());
}

async function fetchUnread(): Promise<MessageUnreadSnapshot> {
  if (!(await currentUserId())) return EMPTY;
  try {
    const { data, error } = await supabase.rpc('my_message_unread');
    if (error) return EMPTY;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object') return EMPTY;
    return {
      userUnread: Math.max(0, Number(row.user_unread) || 0),
      adminUnread: Math.max(0, Number(row.admin_unread) || 0),
      isAdmin: row.am_admin === true,
    };
  } catch {
    return snapshot;
  }
}

/** Muat ulang jumlah belum dibaca (digabung bila sudah ada permintaan berjalan). */
export function refreshMessageUnread(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetchUnread()
    .then(emit)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function start(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.setTimeout(() => void refreshMessageUnread(), 2000);
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void refreshMessageUnread();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshMessageUnread();
  });
  window.addEventListener(REFRESH_EVENT, () => void refreshMessageUnread());
  try {
    supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshMessageUnread(), 500);
    });
  } catch {
    /* klien tanpa auth (mode offline) */
  }
}

function subscribe(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hook React: jumlah pesan belum dibaca (untuk lencana navigasi & kartu dashboard). */
export function useMessageUnread(): MessageUnreadSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function requestMessageUnreadRefresh(): void {
  try {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  } catch {
    /* non-browser */
  }
}

// --------------------------- Buka panel pesan dari luar Pengaturan ---------------------------

let pendingOpen = false;

/** Dipanggil sebelum pindah ke tab Pengaturan agar panel pesan langsung terlihat. */
export function requestOpenMessages(): void {
  pendingOpen = true;
}

export function consumeOpenMessagesRequest(): boolean {
  const v = pendingOpen;
  pendingOpen = false;
  return v;
}

// --------------------------- Data ---------------------------

function afterWrite<T>(res: MsgResult<T>): MsgResult<T> {
  if (res.ok) requestMessageUnreadRefresh();
  return res;
}

/** Percakapan milik pemain yang login. */
export function listMyThreads(): Promise<MsgResult<MessageThread[]>> {
  return run(async () => {
    const uid = await currentUserId();
    if (!uid) return { ok: true, data: [] };
    const { data, error } = await supabase
      .from('message_threads')
      .select(THREAD_COLUMNS)
      .eq('user_id', uid)
      .order('last_message_at', { ascending: false })
      .limit(50);
    return error ? { ok: false, error: messageError(error) } : { ok: true, data: threads(data) };
  });
}

/** Kotak masuk admin: semua percakapan pemain lain (RLS menolak non-admin). */
export function adminListThreads(): Promise<MsgResult<MessageThread[]>> {
  return run(async () => {
    const uid = await currentUserId();
    let q = supabase.from('message_threads').select(THREAD_COLUMNS);
    if (uid) q = q.neq('user_id', uid);
    const { data, error } = await q.order('last_message_at', { ascending: false }).limit(200);
    return error ? { ok: false, error: messageError(error) } : { ok: true, data: threads(data) };
  });
}

export function getThread(id: string): Promise<MsgResult<MessageThread | null>> {
  return run(async () => {
    const { data, error } = await supabase.from('message_threads').select(THREAD_COLUMNS).eq('id', id).maybeSingle();
    return error ? { ok: false, error: messageError(error) } : { ok: true, data: parseThreadRow(data) };
  });
}

export function listThreadMessages(threadId: string): Promise<MsgResult<ChatMessage[]>> {
  return run(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return { ok: false, error: messageError(error) };
    const list = Array.isArray(data) ? data.map(parseMessageRow).filter((m): m is ChatMessage => m !== null) : [];
    return { ok: true, data: list };
  });
}

/** Pemain membuat percakapan baru. Mengembalikan id percakapan. */
export function createThread(draft: NewThreadDraft, userName?: string): Promise<MsgResult<string>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('create_message_thread', {
      p_subject: draft.subject.trim(),
      p_category: draft.category,
      p_body: draft.body.trim(),
      p_user_name: userName?.trim() || null,
    });
    if (error) return { ok: false, error: messageError(error) };
    return afterWrite({ ok: true, data: String(data) });
  });
}

/** Kirim pesan ke percakapan (pemain pemilik atau admin; server menentukan from_admin). */
export function sendMessage(threadId: string, body: string): Promise<MsgResult> {
  return run(async () => {
    const { error } = await supabase.rpc('send_thread_message', { p_thread_id: threadId, p_body: body.trim() });
    return afterWrite(error ? { ok: false, error: messageError(error) } : { ok: true, data: undefined });
  });
}

export function markThreadRead(threadId: string): Promise<MsgResult> {
  return run(async () => {
    const { error } = await supabase.rpc('mark_message_thread_read', { p_thread_id: threadId });
    return afterWrite(error ? { ok: false, error: messageError(error) } : { ok: true, data: undefined });
  });
}

export function adminSetThreadStatus(threadId: string, status: ThreadStatus): Promise<MsgResult> {
  return run(async () => {
    const { error } = await supabase.rpc('admin_set_thread_status', { p_thread_id: threadId, p_status: status });
    return afterWrite(error ? { ok: false, error: messageError(error) } : { ok: true, data: undefined });
  });
}

export function adminDeleteThread(threadId: string): Promise<MsgResult> {
  return run(async () => {
    const { error } = await supabase.from('message_threads').delete().eq('id', threadId);
    return afterWrite(error ? { ok: false, error: messageError(error) } : { ok: true, data: undefined });
  });
}
