/**
 * Akses Supabase + store status "Api Bareng" (lihat supabase/migrations/20261108_friend_streaks.sql).
 * Semua fungsi tidak pernah melempar: offline / migrasi belum ada => { ok: false } atau status kosong.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { currentUserId } from './mail';
import { EMPTY_FRIEND_STATE, FriendStreakState, friendError, parseFriendState } from './friendStreakCore';

const REFRESH_EVENT = 'nq:friend-refresh';
const POLL_MS = 3 * 60 * 1000;

export type FriendResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export interface FriendStatus extends FriendStreakState {
  signedIn: boolean;
  loaded: boolean;
  error: string | null;
}

const INITIAL: FriendStatus = { ...EMPTY_FRIEND_STATE, signedIn: false, loaded: false, error: null };
let snapshot: FriendStatus = INITIAL;
let snapshotKey = '';
const listeners = new Set<() => void>();
let started = false;
let inflight: Promise<void> | null = null;
/** Nama tampilan pemain, dikirim ke server agar teman melihat nama terbaru. */
let playerName = '';

export function setFriendPlayerName(name: string): void {
  playerName = (name || '').trim().slice(0, 40);
}

function emit(next: FriendStatus): void {
  const key = JSON.stringify(next);
  if (key === snapshotKey) return;
  snapshotKey = key;
  snapshot = next;
  listeners.forEach(l => l());
}

async function fetchStatus(): Promise<FriendStatus> {
  if (!(await currentUserId())) return { ...INITIAL, loaded: true };
  try {
    const { data, error } = await supabase.rpc('my_friend_streaks', { p_name: playerName || null });
    if (error) return { ...snapshot, signedIn: true, loaded: true, error: friendError(error) };
    return { ...parseFriendState(data), signedIn: true, loaded: true, error: null };
  } catch {
    return { ...snapshot, loaded: true };
  }
}

export function refreshFriendStatus(): Promise<void> {
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
  window.setTimeout(() => void refreshFriendStatus(), 1800);
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void refreshFriendStatus();
  }, POLL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshFriendStatus();
  });
  window.addEventListener(REFRESH_EVENT, () => void refreshFriendStatus());
  try {
    supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshFriendStatus(), 600);
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

/** Hook React: status Api Bareng (kode teman, daftar teman, api tiap pasangan). */
export function useFriendStatus(): FriendStatus {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

async function run<T>(fn: () => Promise<FriendResult<T>>): Promise<FriendResult<T>> {
  try {
    const res = await fn();
    if (res.ok) void refreshFriendStatus();
    return res;
  } catch (e) {
    return { ok: false, error: friendError({ message: (e as Error)?.message }) };
  }
}

/** Nyalakan api hari ini (setelah syarat misi harian terpenuhi). Idempoten di server. */
export function checkInFlame(): Promise<FriendResult<number>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('friend_streak_checkin', { p_name: playerName || null });
    if (error) return { ok: false, error: friendError(error) };
    return { ok: true, data: Number(data) || 0 };
  });
}

/** Ajak teman lewat kode teman. 'accepted' bila dia sudah lebih dulu mengajak. */
export function requestFriend(code: string): Promise<FriendResult<'sent' | 'accepted'>> {
  return run(async () => {
    const { data, error } = await supabase.rpc('friend_streak_request', { p_code: code, p_name: playerName || null });
    if (error) return { ok: false, error: friendError(error) };
    return { ok: true, data: data === 'accepted' ? 'accepted' : 'sent' };
  });
}

export function respondFriend(id: string, accept: boolean): Promise<FriendResult> {
  return run(async () => {
    const { error } = await supabase.rpc('friend_streak_respond', { p_id: id, p_accept: accept });
    return error ? { ok: false, error: friendError(error) } : { ok: true, data: undefined };
  });
}

export function removeFriend(id: string): Promise<FriendResult> {
  return run(async () => {
    const { error } = await supabase.rpc('friend_streak_remove', { p_id: id });
    return error ? { ok: false, error: friendError(error) } : { ok: true, data: undefined };
  });
}

export function nudgeFriend(id: string): Promise<FriendResult> {
  return run(async () => {
    const { error } = await supabase.rpc('friend_streak_nudge', { p_id: id });
    return error ? { ok: false, error: friendError(error) } : { ok: true, data: undefined };
  });
}
