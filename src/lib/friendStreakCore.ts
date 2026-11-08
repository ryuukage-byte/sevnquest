/**
 * Logika murni (tanpa Supabase/React) untuk "Api Bareng": streak berdua dengan teman.
 * Skema & aturan server: supabase/migrations/20261108_friend_streaks.sql.
 *
 * Api sebuah pasangan bertambah 1 setiap hari KEDUANYA menyelesaikan misi harian.
 * Satu hari terlewat (salah satu tidak menyala) => api padam dan mulai lagi dari 1.
 */
import type { Mission } from '../types/rpg';
import { MISSIONS_WITHOUT_LIVE_TRIGGER } from '../state/missions';

/** Jumlah misi harian yang harus selesai untuk menyalakan api hari ini. */
export const FLAME_MIN_MISSIONS = 3;

/** Format kode teman = alamat Kotak Pos, mis. SQ-K7MP-2Q4X. */
export const FRIEND_CODE_RE = /^SQ-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export interface FlameProgress {
  done: number;
  required: number;
  ready: boolean;
}

/**
 * Progres menyalakan api hari ini dari misi harian. Misi yang tidak bisa diselesaikan di aplikasi
 * (MISSIONS_WITHOUT_LIVE_TRIGGER) tidak ikut menaikkan syarat, supaya syarat selalu bisa dicapai.
 */
export function flameProgress(dailyMissions: readonly Mission[]): FlameProgress {
  const doable = dailyMissions.filter(m => !MISSIONS_WITHOUT_LIVE_TRIGGER[m.id]);
  const required = Math.max(1, Math.min(FLAME_MIN_MISSIONS, doable.length));
  const done = dailyMissions.filter(m => m.completed).length;
  return { done: Math.min(done, required), required, ready: done >= required };
}

/** Normalisasi masukan kode teman: huruf besar, tanpa spasi, tanda hubung dilengkapi. null bila tidak valid. */
export function normalizeFriendCode(input: string): string | null {
  const raw = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^SQ[A-Z0-9]{8}$/.test(raw)) return null;
  const code = `SQ-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
  return FRIEND_CODE_RE.test(code) ? code : null;
}

export type FriendStatus = 'active' | 'pending';

export interface FriendStreak {
  id: string;
  status: FriendStatus;
  /** Ajakan masuk (dia yang mengajak, menunggu jawabanku). */
  incoming: boolean;
  friendName: string;
  friendCode: string | null;
  /** Api saat ini (0 bila sudah padam). */
  streakDays: number;
  longestStreak: number;
  friendDone: boolean;
  /** Dia mengingatkanku hari ini. */
  nudgedMe: boolean;
  /** Aku sudah mengingatkan dia hari ini. */
  iNudged: boolean;
  /** Api menyala kemarin tapi belum menyala hari ini: padam bila tidak dinyalakan sebelum tengah malam. */
  atRisk: boolean;
}

export interface FriendStreakState {
  /** Tanggal server (WIB), YYYY-MM-DD. */
  today: string | null;
  myCode: string | null;
  /** Aku sudah menyalakan api hari ini (tercatat di server). */
  meDone: boolean;
  friends: FriendStreak[];
}

export const EMPTY_FRIEND_STATE: FriendStreakState = { today: null, myCode: null, meDone: false, friends: [] };

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const int = (v: unknown): number => Math.max(0, Math.floor(Number(v) || 0));

export function parseFriendRow(row: unknown): FriendStreak | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const status = r.status === 'active' || r.status === 'pending' ? r.status : null;
  if (!id || !status) return null;
  return {
    id,
    status,
    incoming: r.incoming === true,
    friendName: (str(r.friend_name) ?? 'Pemain').slice(0, 40),
    friendCode: str(r.friend_code),
    streakDays: int(r.streak_days),
    longestStreak: int(r.longest_streak),
    friendDone: r.friend_done === true,
    nudgedMe: r.nudged_me === true,
    iNudged: r.i_nudged === true,
    atRisk: r.at_risk === true,
  };
}

export function parseFriendState(data: unknown): FriendStreakState {
  if (!data || typeof data !== 'object') return EMPTY_FRIEND_STATE;
  const d = data as Record<string, unknown>;
  const friends = Array.isArray(d.friends)
    ? d.friends.map(parseFriendRow).filter((f): f is FriendStreak => f !== null)
    : [];
  return { today: str(d.today), myCode: str(d.my_code), meDone: d.me_done === true, friends };
}

export type FlameLook = 'lit' | 'half' | 'risk' | 'out';

/**
 * Tampilan api sebuah pasangan aktif:
 *  lit  = keduanya sudah menyala hari ini
 *  half = baru salah satu
 *  risk = api masih hidup (menyala kemarin) tapi belum ada yang menyala hari ini
 *  out  = padam / belum pernah menyala
 */
export function flameLook(f: FriendStreak, meDone: boolean): FlameLook {
  if (meDone && f.friendDone) return 'lit';
  if (meDone || f.friendDone) return f.streakDays > 0 || f.atRisk ? 'half' : 'out';
  return f.streakDays > 0 ? 'risk' : 'out';
}

/** Kalimat status singkat untuk satu teman aktif. */
export function flameCaption(f: FriendStreak, meDone: boolean): string {
  if (meDone && f.friendDone) return 'Api hari ini menyala!';
  if (meDone) return f.streakDays > 0 ? `Tinggal ${f.friendName} yang belum belajar` : `Menunggu ${f.friendName} belajar`;
  if (f.friendDone) return `${f.friendName} sudah belajar, giliranmu!`;
  if (f.streakDays > 0) return 'Belum ada yang belajar hari ini, api bisa padam';
  return 'Selesaikan misi harian berdua untuk menyalakan api';
}

/** Teman aktif yang boleh diingatkan sekarang. */
export function canNudge(f: FriendStreak): boolean {
  return f.status === 'active' && !f.friendDone && !f.iNudged;
}

/** Angka lencana: ajakan masuk + teman yang mengingatkanku (selama apiku belum menyala). */
export function friendBadgeCount(state: FriendStreakState): number {
  let n = 0;
  for (const f of state.friends) {
    if (f.status === 'pending' && f.incoming) n++;
    else if (f.status === 'active' && f.nudgedMe && !state.meDone) n++;
  }
  return n;
}

/** Api terbesar yang sedang hidup di antara teman aktif. */
export function bestFlame(state: FriendStreakState): number {
  return state.friends.reduce((max, f) => (f.status === 'active' ? Math.max(max, f.streakDays) : max), 0);
}

export function friendError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return 'Terjadi kesalahan.';
  const msg = err.message || '';
  if (
    err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST202' || err.code === '42883' ||
    /does not exist|schema cache|Could not find the (table|function)/i.test(msg)
  ) {
    return 'Api Bareng belum aktif di server (migrasi 20261108_friend_streaks.sql belum dijalankan).';
  }
  if (err.code === 'P0001' || err.code === 'P0002') return msg;
  if (/Harus login/i.test(msg)) return 'Masuk ke akun dulu untuk main Api Bareng.';
  if (err.code === '42501' || /row-level security|permission denied|Akses ditolak/i.test(msg)) return 'Akses ditolak.';
  if (/Failed to fetch|NetworkError|timeout|aborted/i.test(msg)) return 'Tidak dapat terhubung ke server. Coba lagi.';
  return msg || 'Terjadi kesalahan.';
}
