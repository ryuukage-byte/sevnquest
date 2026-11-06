/**
 * Akses Supabase untuk pengumuman broadcast admin (tabel public.announcements, lihat
 * supabase/migrations/20261106_announcements.sql). Semua fungsi tidak pernah melempar:
 * offline / tabel belum ada => daftar kosong, sehingga aplikasi tetap jalan normal.
 */
import { supabase } from './supabase';
import {
  Announcement,
  AnnouncementDraft,
  draftToRow,
  mergeSeen,
  parseAnnouncementRow,
} from './announcementsCore';

const SEEN_KEY = 'nq_announcements_seen';
const COLUMNS = 'id,title,body,kind,cta_label,cta_url,is_published,starts_at,ends_at,created_at';

function rows(data: unknown): Announcement[] {
  if (!Array.isArray(data)) return [];
  return data.map(parseAnnouncementRow).filter((a): a is Announcement => a !== null);
}

function errMessage(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return 'Terjadi kesalahan.';
  if (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message || '')) {
    return 'Tabel pengumuman belum dibuat di database (jalankan migrasi 20261106_announcements.sql).';
  }
  if (err.code === '42501' || /row-level security|permission denied/i.test(err.message || '')) {
    return 'Akses ditolak: akun ini bukan admin.';
  }
  return err.message || 'Terjadi kesalahan.';
}

/** Pengumuman yang sedang aktif (RLS sudah memfilter untuk non-admin). */
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select(COLUMNS)
      .eq('is_published', true)
      .lte('starts_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return rows(data);
  } catch {
    return [];
  }
}

/** true bila pengguna yang login terdaftar di public.admins. */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

// --------------------------- Status "sudah dibaca" (per perangkat) ---------------------------

export function loadSeenIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markSeen(id: string, activeIds?: readonly string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(mergeSeen(loadSeenIds(), id, activeIds)));
  } catch {
    /* storage diblokir: abaikan */
  }
}

// --------------------------- Operasi admin ---------------------------

export type AdminResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function adminListAnnouncements(): Promise<AdminResult<Announcement[]>> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return { ok: false, error: errMessage(error) };
    return { ok: true, data: rows(data) };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Tidak dapat terhubung ke server.' };
  }
}

export async function adminSaveAnnouncement(
  draft: AnnouncementDraft,
  publish: boolean,
  id?: string,
): Promise<AdminResult> {
  try {
    const row = draftToRow(draft, publish);
    const { error } = id
      ? await supabase.from('announcements').update(row).eq('id', id)
      : await supabase.from('announcements').insert(row);
    if (error) return { ok: false, error: errMessage(error) };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Tidak dapat terhubung ke server.' };
  }
}

export async function adminSetPublished(id: string, published: boolean): Promise<AdminResult> {
  try {
    const { error } = await supabase.from('announcements').update({ is_published: published }).eq('id', id);
    if (error) return { ok: false, error: errMessage(error) };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Tidak dapat terhubung ke server.' };
  }
}

export async function adminDeleteAnnouncement(id: string): Promise<AdminResult> {
  try {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return { ok: false, error: errMessage(error) };
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Tidak dapat terhubung ke server.' };
  }
}
