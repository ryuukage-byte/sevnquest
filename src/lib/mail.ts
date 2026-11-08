/**
 * Akses Supabase + store status Kotak Pos (lihat supabase/migrations/20261107b_letters.sql).
 * Semua fungsi tidak pernah melempar: offline / tabel belum ada => hasil { ok: false } atau status kosong.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import {
  AdminLetter,
  Letter,
  LetterDraft,
  Stationery,
  mailError,
  parseAdminLetterRow,
  parseLetterRow,
} from './mailCore';

/** Kolom eksplisit: sender_id sengaja tidak diminta (server juga tidak mengizinkannya). */
const LETTER_COLUMNS =
  'id,from_admin,is_anonymous,sender_name,sender_address,recipient_id,to_admin,subject,body,category,' +
  'stationery,reply_to,priority,sent_at,read_at,replied_at,archived_by_recipient,archived_by_sender';
const REFRESH_EVENT = 'nq:mail-refresh';
const POLL_MS = 3 * 60 * 1000;

export type MailResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<MailResult<T>>): Promise<MailResult<T>> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: mailError({ message: (e as Error)?.message }) };
  }
}

export async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// --------------------------- Store status kotak pos ---------------------------

export interface MailStatus {
  /** false => belum login (tamu). */
  signedIn: boolean;
  /** Status sudah dimuat setidaknya sekali. */
  loaded: boolean;
  /** Alamat kotak pos pemain, mis. SQ-K7MP-2Q4X (null bila belum tersedia). */
  address: string | null;
  /** Surat masuk yang belum dibaca. */
  unread: number;
  /** Surat di Kantor Pos Pusat yang belum dibaca (hanya admin). */
  adminUnread: number;
  isAdmin: boolean;
  /** Tier Kotak Pos: 0 Free, 1 Premium, 2..8 Super Premium Lv.1..7, 9 Admin. */
  tierRank: number;
  tierLabel: string;
  /** Batas surat per hari (null = tanpa batas, mis. admin). */
  dailyLimit: number | null;
  /** Surat yang sudah dikirim hari ini (tanggal WIB). */
  sentToday: number;
  /** Prioritas surat pemain di Kantor Pos Pusat. */
  priority: number;
  /** Galat terakhir (mis. migrasi belum dijalankan). */
  error: string | null;
}

const INITIAL: MailStatus = {
  signedIn: false, loaded: false, address: null, unread: 0, adminUnread: 0, isAdmin: false,
  tierRank: 0, tierLabel: 'Free', dailyLimit: null, sentToday: 0, priority: 0, error: null,
};
let snapshot: MailStatus = INITIAL;
const listeners = new Set<() => void>();
let started = false;
let inflight: Promise<void> | null = null;

function emit(next: MailStatus): void {
  const same = (Object.keys(next) as (keyof MailStatus)[]).every(k => next[k] === snapshot[k]);
  if (same) return;
  snapshot = next;
  listeners.forEach(l => l());
}

async function fetchStatus(): Promise<MailStatus> {
  if (!(await currentUserId())) return { ...INITIAL, loaded: true };
  try {
    const { data, error } = await supabase.rpc('my_mail_status');
    if (error) return { ...snapshot, signedIn: true, loaded: true, error: mailError(error) };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object') return { ...snapshot, signedIn: true, loaded: true };
    return {
      signedIn: true,
      loaded: true,
      address: typeof row.address === 'string' ? row.address : null,
      unread: Math.max(0, Number(row.unread) || 0),
      adminUnread: Math.max(0, Number(row.admin_unread) || 0),
      isAdmin: row.am_admin === true,
      tierRank: Math.max(0, Number(row.tier_rank) || 0),
      tierLabel: typeof row.tier_label === 'string' ? row.tier_label : 'Free',
      dailyLimit: row.daily_limit == null ? null : Math.max(0, Number(row.daily_limit) || 0),
      sentToday: Math.max(0, Number(row.sent_today) || 0),
      priority: Math.max(0, Number(row.priority) || 0),
      error: null,
    };
  } catch {
    return { ...snapshot, loaded: true };
  }
}

/** Muat ulang status (digabung bila sudah ada permintaan berjalan). */
export function refreshMailStatus(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetchStatus()
    .then(emit)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function start(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.setTimeout(() => void refreshMailStatus(), 1500);
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void refreshMailStatus();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshMailStatus();
  });
  window.addEventListener(REFRESH_EVENT, () => void refreshMailStatus());
  try {
    supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshMailStatus(), 500);
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

/** Hook React: status kotak pos (alamat + jumlah surat belum dibaca). */
export function useMailStatus(): MailStatus {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function requestMailRefresh(): void {
  try {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  } catch {
    /* non-browser */
  }
}

function afterWrite<T>(res: MailResult<T>): MailResult<T> {
  if (res.ok) requestMailRefresh();
  return res;
}

// --------------------------- Data ---------------------------

/** Semua surat milik pemain (masuk + terkirim, termasuk arsip). */
export function listMyLetters(): Promise<MailResult<Letter[]>> {
  return run(async () => {
    const { data, error } = await supabase
      .from('letters')
      .select(LETTER_COLUMNS)
      .order('sent_at', { ascending: false })
      .limit(300);
    if (error) return { ok: false, error: mailError(error) };
    const list = Array.isArray(data) ? data.map(parseLetterRow).filter((l): l is Letter => l !== null) : [];
    return { ok: true, data: list };
  });
}

/** Kantor Pos Pusat: surat untuk admin (tanpa identitas pengirim anonim). */
export function adminListLetters(): Promise<MailResult<AdminLetter[]>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('admin_list_letters');
    if (error) return { ok: false, error: mailError(error) };
    const list = Array.isArray(data) ? data.map(parseAdminLetterRow).filter((l): l is AdminLetter => l !== null) : [];
    return { ok: true, data: list };
  });
}

/** Poskan surat ke admin. */
export function sendLetter(draft: LetterDraft, senderName?: string): Promise<MailResult<string>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('send_letter', {
      p_subject: draft.subject.trim(),
      p_body: draft.body.trim(),
      p_category: draft.category,
      p_stationery: draft.stationery,
      p_anonymous: draft.anonymous,
      p_sender_name: draft.anonymous ? null : senderName?.trim() || null,
    });
    if (error) return { ok: false, error: mailError(error) };
    return afterWrite({ ok: true, data: String(data) });
  });
}

/** Admin membalas surat: balasan diantar ke kotak pos pengirim asli. */
export function adminReplyLetter(
  letterId: string,
  subject: string,
  body: string,
  stationery: Stationery,
): Promise<MailResult<string>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('admin_reply_letter', {
      p_letter_id: letterId,
      p_subject: subject.trim(),
      p_body: body.trim(),
      p_stationery: stationery,
    });
    if (error) return { ok: false, error: mailError(error) };
    return afterWrite({ ok: true, data: String(data) });
  });
}

export function markLetterRead(letterId: string): Promise<MailResult> {
  return run(async () => {
    const { error } = await supabase.rpc('mark_letter_read', { p_letter_id: letterId });
    return afterWrite(error ? { ok: false, error: mailError(error) } : { ok: true, data: undefined });
  });
}

export function archiveLetter(letterId: string, archived: boolean): Promise<MailResult> {
  return run(async () => {
    const { error } = await supabase.rpc('archive_letter', { p_letter_id: letterId, p_archived: archived });
    return afterWrite(error ? { ok: false, error: mailError(error) } : { ok: true, data: undefined });
  });
}
