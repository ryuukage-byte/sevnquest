/**
 * Akses Supabase + store bersama untuk pengumuman broadcast admin
 * (tabel public.announcements; lihat supabase/migrations/20261106*_announcements*.sql).
 *
 * Store dipakai bersama oleh pop-up (App) dan kartu dashboard (HomeView), dan menyegarkan diri:
 * saat aplikasi kembali ke depan, tiap 5 menit, dan segera setelah admin mengirim/mengubah pengumuman.
 * Semua fungsi tidak pernah melempar: offline / tabel belum ada => daftar kosong, aplikasi tetap normal.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { getVisitorId } from './visitors';
import {
  Announcement,
  AnnouncementDraft,
  ReaderState,
  addId,
  draftToRow,
  parseAnnouncementRow,
} from './announcementsCore';

const ACKED_KEY = 'nq_announcements_seen';
const CLOSED_KEY = 'nq_announcements_closed';
const HIDDEN_KEY = 'nq_announcements_hidden';
const SESSION_KEY = 'nq_announcements_session';
const REFRESH_EVENT = 'nq:announcements-refresh';
const POLL_MS = 5 * 60 * 1000;
const COLUMNS =
  'id,title,body,kind,cta_label,cta_url,is_published,starts_at,ends_at,created_at,' +
  'display,dismissible,popup_frequency,min_read_seconds,require_ack';

function rows(data: unknown): Announcement[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseAnnouncementRow).filter((a): a is Announcement => a !== null);
}

function errMessage(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return 'Terjadi kesalahan.';
  const msg = err.message || '';
  if (err.code === '42P01' || err.code === 'PGRST205' || err.code === '42703' || /does not exist|schema cache/i.test(msg)) {
    return 'Struktur database pengumuman belum lengkap (jalankan migrasi 20261106b_announcements_v2.sql).';
  }
  if (err.code === '42501' || /row-level security|permission denied|not authorized/i.test(msg)) {
    return 'Akses ditolak: akun ini bukan admin.';
  }
  return msg || 'Terjadi kesalahan.';
}

// --------------------------- Penyimpanan lokal ---------------------------

function readList(storage: Storage | undefined, key: string): string[] {
  try {
    const raw = storage?.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(storage: Storage | undefined, key: string, ids: string[]): void {
  try {
    storage?.setItem(key, JSON.stringify(ids));
  } catch {
    /* storage diblokir: abaikan */
  }
}

const local = typeof window !== 'undefined' ? window.localStorage : undefined;
const session = typeof window !== 'undefined' ? window.sessionStorage : undefined;

function loadReaderState(): ReaderState {
  return {
    acked: readList(local, ACKED_KEY),
    closed: readList(local, CLOSED_KEY),
    hidden: readList(local, HIDDEN_KEY),
    shownThisSession: readList(session, SESSION_KEY),
  };
}

// --------------------------- Store ---------------------------

export interface AnnouncementsSnapshot {
  list: Announcement[];
  reader: ReaderState;
  loaded: boolean;
}

let snapshot: AnnouncementsSnapshot = { list: [], reader: loadReaderState(), loaded: false };
const listeners = new Set<() => void>();
let started = false;
let inflight: Promise<void> | null = null;

function emit(next: Partial<AnnouncementsSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach(l => l());
}

async function fetchActive(): Promise<Announcement[] | null> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(COLUMNS)
      .eq('is_published', true)
      .lte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: false })
      .limit(20);
    if (error) return null;
    return rows(data);
  } catch {
    return null;
  }
}

/** Muat ulang daftar pengumuman aktif (digabung bila sudah ada permintaan berjalan). */
export function refreshAnnouncements(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const list = await fetchActive();
    emit({ list: list ?? snapshot.list, reader: loadReaderState(), loaded: true });
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function start(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Jeda singkat agar tidak bersaing dengan boot / sinkron cloud.
  window.setTimeout(() => void refreshAnnouncements(), 1200);
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void refreshAnnouncements();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshAnnouncements();
  });
  window.addEventListener(REFRESH_EVENT, () => void refreshAnnouncements());
}

function subscribe(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hook React: daftar pengumuman aktif + status baca lokal. */
export function useAnnouncements(): AnnouncementsSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

/** Minta semua pengamat memuat ulang (dipakai panel admin setelah menyimpan). */
export function requestAnnouncementsRefresh(): void {
  try {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  } catch {
    /* non-browser */
  }
}

// --------------------------- Aksi pemain ---------------------------

function activeIds(): string[] {
  return snapshot.list.map(a => a.id);
}

/** Pop-up sudah ditampilkan di sesi ini (mencegah muncul berulang sebelum aplikasi dibuka ulang). */
export function markShownThisSession(id: string): void {
  writeList(session, SESSION_KEY, addId(readList(session, SESSION_KEY), id));
  emit({ reader: loadReaderState() });
}

/** Pemain menutup pop-up tanpa konfirmasi (hanya bila dismissible). */
export function markClosed(id: string): void {
  writeList(local, CLOSED_KEY, addId(readList(local, CLOSED_KEY), id, activeIds()));
  markShownThisSession(id);
}

/** Pemain menyembunyikan kartu dashboard (hanya bila dismissible). */
export function hideBanner(id: string): void {
  writeList(local, HIDDEN_KEY, addId(readList(local, HIDDEN_KEY), id, activeIds()));
  emit({ reader: loadReaderState() });
}

/** Pemain mengonfirmasi sudah membaca: simpan lokal + catat ke server (untuk statistik admin). */
export function markRead(id: string): void {
  writeList(local, ACKED_KEY, addId(readList(local, ACKED_KEY), id, activeIds()));
  markShownThisSession(id);
  void (async () => {
    try {
      await supabase.rpc('mark_announcement_read', { p_announcement_id: id, p_reader_id: getVisitorId() });
    } catch {
      /* statistik tidak boleh mengganggu aplikasi */
    }
  })();
}

// --------------------------- Admin ---------------------------

/** true bila pengguna yang login terdaftar di public.admins. */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

export type AdminResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<AdminResult<T>>): Promise<AdminResult<T>> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Tidak dapat terhubung ke server.' };
  }
}

export function adminListAnnouncements(): Promise<AdminResult<Announcement[]>> {
  return run(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100);
    return error ? { ok: false, error: errMessage(error) } : { ok: true, data: rows(data) };
  });
}

export interface ReadStats {
  readers: number;
  members: number;
  guests: number;
}

/** Jumlah pemain yang sudah mengonfirmasi membaca, per pengumuman. */
export function adminReadStats(): Promise<AdminResult<Record<string, ReadStats>>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('admin_announcement_stats');
    if (error) return { ok: false, error: errMessage(error) };
    const out: Record<string, ReadStats> = {};
    for (const r of Array.isArray(data) ? data : []) {
      if (r && typeof r.announcement_id === 'string') {
        out[r.announcement_id] = {
          readers: Number(r.readers) || 0,
          members: Number(r.members) || 0,
          guests: Number(r.guests) || 0,
        };
      }
    }
    return { ok: true, data: out };
  });
}

function afterWrite<T>(res: AdminResult<T>): AdminResult<T> {
  if (res.ok) requestAnnouncementsRefresh();
  return res;
}

export function adminSaveAnnouncement(draft: AnnouncementDraft, publish: boolean, id?: string): Promise<AdminResult> {
  return run(async () => {
    const row = draftToRow(draft, publish);
    const { error } = id
      ? await supabase.from('announcements').update(row).eq('id', id)
      : await supabase.from('announcements').insert(row);
    return afterWrite(error ? { ok: false, error: errMessage(error) } : { ok: true, data: undefined });
  });
}

export function adminSetPublished(id: string, published: boolean): Promise<AdminResult> {
  return run(async () => {
    const { error } = await supabase.from('announcements').update({ is_published: published }).eq('id', id);
    return afterWrite(error ? { ok: false, error: errMessage(error) } : { ok: true, data: undefined });
  });
}

export function adminDeleteAnnouncement(id: string): Promise<AdminResult> {
  return run(async () => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    return afterWrite(error ? { ok: false, error: errMessage(error) } : { ok: true, data: undefined });
  });
}
