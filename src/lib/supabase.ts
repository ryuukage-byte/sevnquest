import { createClient } from '@supabase/supabase-js';
import { PlayerStats } from '../types/rpg';
import { getIsoWeekId } from '../utils/weekId';
import { UserMasteryEntity, UserActivityEntity } from '../types/identity';
import { getTierForExp, calculateLevelFromExp } from '../data/tiers';
import type { TowerCloudState } from '../engine/tower/world/towerCloudState';

/**
 * true => tulis leaderboard/skor lewat RPC aman berbasis auth.uid()
 * (lihat supabase/migrations/20261001_secure_leaderboard_and_saves.sql). Default false agar
 * klien tetap kompatibel dengan skema lama sampai migrasi dijalankan.
 */
const SECURE_LEADERBOARD =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SECURE_LEADERBOARD === 'true';

/** Tabel/fungsi belum ada di proyek (migrasi belum dijalankan) -> fallback ke jalur lama. */
function isMissingRelation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST202' || err.code === '42883' ||
    /does not exist|schema cache|Could not find the (table|function)/i.test(err.message || '')
  );
}

const directUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://iokhdhqnpslpwsxspvaj.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';

/**
 * Di web yang di-host (Vercel dsb.) permintaan lewat proxy same-origin `/supabase-proxy` (lihat vercel.json)
 * karena beberapa ISP (mis. di Indonesia) memblokir *.supabase.co sehingga login gagal "Failed to fetch".
 * Di localhost / file / host tanpa rewrite (GitHub Pages, standalone) langsung ke supabase.co.
 * Bila proxy gagal, resilientFetch otomatis jatuh ke directUrl dan mengingatnya (proxyBroken).
 */
function canUseSameOriginProxy(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const { protocol, hostname } = window.location;
  if (protocol !== 'https:' && protocol !== 'http:') return false;
  return !/^(localhost|127\.0\.0\.1|\[::1\]|.*\.github\.io)$/i.test(hostname);
}

function getSupabaseUrl(): string {
  return canUseSameOriginProxy() ? `${window.location.origin}/supabase-proxy` : directUrl;
}

/** true setelah proxy terbukti tidak tersedia (404 / HTML / error jaringan) -> langsung ke supabase.co. */
let proxyBroken = false;
const PROXY_PREFIX_RE = /^https?:\/\/[^/]+(\/[^/]+)*\/supabase-proxy/;

const supabaseUrl = getSupabaseUrl();

/**
 * Resilient Fetch wrapper:
 * 1. Enforces a 7-second timeout so network requests never hang indefinitely.
 * 2. Detects non-API HTML responses (e.g. SPA servers returning index.html) and errors,
 *    automatically falling back to directUrl (supabase.co).
 */
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (proxyBroken && urlStr.includes('/supabase-proxy')) {
    urlStr = urlStr.replace(PROXY_PREFIX_RE, directUrl);
    input = urlStr;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  
  const externalSignal = init?.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');

    // If reverse proxy returned 404, server error, or served HTML instead of JSON
    if ((!res.ok || isHtml) && urlStr.includes('/supabase-proxy')) {
      const fallbackUrl = urlStr.replace(/^https?:\/\/[^/]+(\/[^/]+)*\/supabase-proxy/, directUrl);
      const fbController = new AbortController();
      const fbTimer = setTimeout(() => fbController.abort(), 12000);
      try {
        const fallbackRes = await fetch(fallbackUrl, { ...init, signal: fbController.signal });
        clearTimeout(fbTimer);
        proxyBroken = true;
        return fallbackRes;
      } catch {
        clearTimeout(fbTimer);
      }
    }
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (urlStr.includes('/supabase-proxy')) {
      const fallbackUrl = urlStr.replace(/^https?:\/\/[^/]+(\/[^/]+)*\/supabase-proxy/, directUrl);
      const fbController = new AbortController();
      const fbTimer = setTimeout(() => fbController.abort(), 12000);
      try {
        const fallbackRes = await fetch(fallbackUrl, { ...init, signal: fbController.signal });
        clearTimeout(fbTimer);
        proxyBroken = true;
        return fallbackRes;
      } catch (fbErr) {
        clearTimeout(fbTimer);
      }
    }
    throw err;
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

function initSupabase() {
  if (supabaseUrl && supabaseKey) {
    try {
      return createClient(supabaseUrl, supabaseKey, {
        global: {
          fetch: resilientFetch
        }
      });
    } catch (err) {
      console.warn('Supabase client creation failed, using fallback:', err);
    }
  }

  function createQueryStub(): any {
    const chain: any = {
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      eq: () => chain,
      gt: () => chain,
      lt: () => chain,
      gte: () => chain,
      lte: () => chain,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (val: any) => any) => Promise.resolve(resolve({ data: [], count: 0, error: null })),
    };
    return chain;
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Database offline' },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: 'Database offline' },
      }),
      signInWithIdToken: async () => ({
        data: { user: null, session: null },
        error: { message: 'Database offline' },
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => createQueryStub(),
      insert: async () => ({ data: null, error: null }),
      upsert: async () => ({ data: null, error: null }),
      update: () => createQueryStub(),
      delete: () => createQueryStub(),
    }),
    rpc: async () => ({ data: null, error: null }),
  } as any;
}

export const supabase = initSupabase();

// ==========================================
// AUTHENTICATION HELPERS
// ==========================================

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn('Warning getting session:', error.message);
    return data?.session || null;
  } catch (err) {
    console.warn('Supabase offline or unreachable:', err);
    return null;
  }
}

/**
 * Masuk/daftar dengan Google memakai ID token dari Google Identity Services (popup bernama aplikasi,
 * bukan domain supabase.co). Sesi ditangkap oleh onAuthStateChange (useCloudSync).
 * `nonce` = nilai ASLI; Google menerima hash SHA-256-nya. Mengembalikan pesan error, atau null bila berhasil.
 */
export async function signInWithGoogleIdToken(token: string, nonce: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce });
  return error ? error.message || 'Login Google gagal.' : null;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('Warning signing out:', error.message);
    return error;
  } catch (err) {
    console.warn('Supabase offline on signout:', err);
    return err;
  }
}

// ==========================================
// LEADERBOARD & STATS HELPERS
// ==========================================

export interface LeaderboardEntry {
  user_id: string;
  player_name: string;
  level: number;
  total_exp: number;
  tier_index: number;
  last_updated: string;
  avatar_url?: string;
  stat_tryout?: number;
  stat_flashcard?: number;
  stat_kanji?: number;
  stat_boss?: number;
  signature?: string;
}

export interface WeeklyLeaderboardEntry {
  user_id: string;
  week_id: string;
  player_name: string;
  tier_index: number;
  score: number;
  updated_at: string;
  avatar_url?: string;
}

/**
 * Gets the current ISO week ID matching PostgreSQL 'IYYY-"W"IW'
 */
export function getCurrentWeekId(): string {
  // Berbasis UTC, identik dengan week_id yang ditulis server (lihat utils/weekId.ts).
  return getIsoWeekId();
}

/**
 * Send a raw score event to the server.
 * The server securely calculates and updates the leaderboards.
 */
export async function sendScoreEvent(eventType: 'quiz_answer' | 'kanji_write', refId: string, isCorrect: boolean) {
  try {
    const statsRaw = localStorage.getItem('nihongo_quest_player_stats_v2');
    if (!statsRaw) return;
    const stats = JSON.parse(statsRaw);
    const userId = stats.userId;
    if (!userId) return;
    // Tamu tidak punya catatan di server: hanya pemain login yang masuk leaderboard/skor mingguan.
    if (!(await getSession())) return;

    const rawExp = Number(stats.totalExp) || 0;
    const effectiveTierIndex = Math.round(getTierForExp(Math.round(rawExp)).tierIndex || 0);

    // Jalur aman: identitas dari auth.uid() di server (p_user_id tidak dikirim). Jalur lama menerima
    // p_user_id dari klien sehingga dapat dipalsukan.
    const { error } = SECURE_LEADERBOARD
      ? await supabase.rpc('submit_score_event_v2', {
          p_event_type: eventType,
          p_ref_id: refId,
          p_is_correct: isCorrect,
          p_player_name: stats.playerName || 'Unknown Player',
          p_tier_index: effectiveTierIndex
        })
      : await supabase.rpc('submit_score_event', {
          p_user_id: userId,
          p_player_name: stats.playerName || 'Unknown Player',
          p_tier_index: effectiveTierIndex,
          p_event_type: eventType,
          p_ref_id: refId,
          p_is_correct: isCorrect
        });

    if (error) {
      console.error('Error submitting score event:', error);
    }

    // Also stream event to the new relational user_activity table
    logUserActivityEvent({
      userId,
      activityType: eventType,
      entityId: refId,
      result: isCorrect ? 'correct' : 'wrong',
      score: isCorrect ? 10 : 0,
      createdAt: new Date().toISOString()
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to submit score event:', err);
  }
}

/**
 * Force sync total EXP and Level to the leaderboard table.
 * Used for legacy users who gained EXP before connecting to the cloud.
 */
export async function upsertLeaderboard(stats: PlayerStats) {
  if (!stats.userId) return;
  
  try {
    const roundedExp = Math.round(Number(stats.totalExp) || 0);
    const effectiveTierIndex = Math.round(getTierForExp(roundedExp).tierIndex || 0);

    // Tamu tidak punya catatan di server: hanya pemain login yang masuk leaderboard.
    if (!(await getSession())) return;

    if (SECURE_LEADERBOARD) {
      // Server menolak EXP turun dan membatasi laju kenaikan.
      const { error: rpcError } = await supabase.rpc('upsert_leaderboard_entry', {
        p_player_name: stats.playerName || 'Unknown Player',
        p_level: Math.max(Math.round(Number(stats.level) || 1), calculateLevelFromExp(roundedExp)),
        p_total_exp: roundedExp,
        p_avatar_url: stats.avatar || null,
        p_stat_tryout: Math.round(Number(stats.studyStats?.tryOuts?.total) || 0),
        p_stat_flashcard: Math.round(Number(stats.studyStats?.flashcards?.total) || 0),
        p_stat_kanji: Math.round(Number(stats.studyStats?.kanjiWriting?.total) || 0),
        p_stat_boss: Math.round(Number(stats.studyStats?.bossBattles?.total) || 0)
      });
      if (rpcError) console.error('Error upserting leaderboard (rpc):', rpcError);
      return;
    }

    const { error } = await supabase
      .from('leaderboard')
      .upsert({
        user_id: stats.userId,
        player_name: stats.playerName || 'Unknown Player',
        level: Math.max(Math.round(Number(stats.level) || 1), calculateLevelFromExp(roundedExp)),
        total_exp: roundedExp,
        tier_index: effectiveTierIndex,
        avatar_url: stats.avatar || null,
        stat_tryout: Math.round(Number(stats.studyStats?.tryOuts?.total) || 0),
        stat_flashcard: Math.round(Number(stats.studyStats?.flashcards?.total) || 0),
        stat_kanji: Math.round(Number(stats.studyStats?.kanjiWriting?.total) || 0),
        stat_boss: Math.round(Number(stats.studyStats?.bossBattles?.total) || 0),
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error upserting leaderboard:', error);
    }
  } catch (err) {
    console.error('Failed to upsert leaderboard:', err);
  }
}

export const STORAGE_KEY_LB_CACHE = 'nihongo_quest_leaderboard_alltime_cache';
export const STORAGE_KEY_WEEKLY_CACHE = 'nihongo_quest_leaderboard_weekly_cache';

/**
 * Fetch players from the All-Time leaderboard (default limit: 100).
 * Falls back to local storage cache if network is temporarily unreachable.
 */
export async function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_exp', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Warning fetching leaderboard from network, checking cache:', error.message);
      const cached = localStorage.getItem(STORAGE_KEY_LB_CACHE);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      return [];
    }

    if (data && data.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_LB_CACHE, JSON.stringify(data));
      } catch {}
    }

    return (data || []) as LeaderboardEntry[];
  } catch (err) {
    console.warn('Failed to get leaderboard, checking cache:', err);
    const cached = localStorage.getItem(STORAGE_KEY_LB_CACHE);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  }
}

/**
 * Total pemain di leaderboard all-time. Tidak bergantung pada login, jadi tamu
 * juga mendapat angka yang benar. Mengembalikan null bila query gagal.
 */
export async function getLeaderboardTotalCount(): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from('leaderboard')
      .select('*', { count: 'exact', head: true });
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

export interface UserRankInfo {
  entry: LeaderboardEntry;
  rank: number;
  totalPlayers: number;
  cutoffExpTop100: number;
}

/**
 * Fetch user's exact rank and leaderboard entry across all players in the database.
 * If preloadedEntries (top 100 from getLeaderboard) is provided, calculates rank instantly!
 */
export async function getUserLeaderboardRank(
  userId: string,
  preloadedEntries?: LeaderboardEntry[]
): Promise<UserRankInfo | null> {
  if (!userId) return null;
  try {
    // FAST PATH: Check if user is already present in the preloaded Top 100 entries
    if (preloadedEntries && preloadedEntries.length > 0) {
      const foundIndex = preloadedEntries.findIndex((e) => e.user_id === userId);
      if (foundIndex >= 0) {
        const userEntry = preloadedEntries[foundIndex];
        const cutoff = preloadedEntries[Math.min(99, preloadedEntries.length - 1)]?.total_exp ?? 0;

        // Only need a single lightweight HEAD query for total player count
        const { count: totalCount } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true });

        return {
          entry: userEntry,
          rank: foundIndex + 1,
          totalPlayers: totalCount ?? (preloadedEntries.length || 100),
          cutoffExpTop100: cutoff,
        };
      }
    }

    // NORMAL PATH: User is outside top 100 or no preloaded data
    const { data: userEntry, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !userEntry) return null;

    // Run higherCount, totalCount, and cutoff queries in parallel
    const [higherRes, totalRes, rank100Res] = await Promise.all([
      supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('total_exp', userEntry.total_exp),
      supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true }),
      preloadedEntries && preloadedEntries.length >= 100
        ? Promise.resolve({ data: { total_exp: preloadedEntries[99].total_exp } })
        : supabase
            .from('leaderboard')
            .select('total_exp')
            .order('total_exp', { ascending: false })
            .range(99, 99)
            .maybeSingle(),
    ]);

    return {
      entry: userEntry as LeaderboardEntry,
      rank: (higherRes.count ?? 0) + 1,
      totalPlayers: totalRes.count ?? 100,
      cutoffExpTop100: rank100Res.data?.total_exp ?? 0,
    };
  } catch (err) {
    console.warn('Failed to calculate user rank:', err);
    return null;
  }
}

/**
 * Fetch top 100 players from the Weekly Arena leaderboard.
 */
export async function getWeeklyLeaderboard(weekId: string, limit = 100): Promise<WeeklyLeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_scores')
      .select('*')
      .eq('week_id', weekId)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Warning fetching weekly leaderboard:', error.message);
      const cached = localStorage.getItem(STORAGE_KEY_WEEKLY_CACHE);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
      return [];
    }

    if (data && data.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_WEEKLY_CACHE, JSON.stringify(data));
      } catch {}
    }

    return (data || []) as WeeklyLeaderboardEntry[];
  } catch (err) {
    console.warn('Failed to get weekly leaderboard:', err);
    const cached = localStorage.getItem(STORAGE_KEY_WEEKLY_CACHE);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }
}

// ==========================================
// CLOUD SAVE & CROSS-DEVICE SYNC
// ==========================================

export interface CloudSavePayload {
  stats: Partial<PlayerStats>;
  stageProgress: Record<string, any>;
  dailyMissions: any[];
  weeklyMissions: any[];
  /** Progres Tower (lantai, skill tree, achievement). Opsional untuk kompatibilitas save lama. */
  towerState?: TowerCloudState;
  updatedAt: string;
}

/**
 * Save complete game progress to Supabase user_metadata and leaderboard
 */
export async function saveGameToCloud(saveData: CloudSavePayload): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (error || !targetUser) {
      // Even if unauthenticated/guest, sync the public leaderboard record
      if (saveData.stats?.userId && (saveData.stats.level || saveData.stats.totalExp)) {
        await upsertLeaderboard(saveData.stats as PlayerStats);
      }
      return false;
    }

    // 1. Simpan save penuh. Utama: tabel user_saves (tidak ikut JWT). Fallback: user_metadata
    //    (dipakai selama migrasi SQL belum dijalankan / tabel belum ada).
    let metadataSaved = false;
    const { error: saveError } = await supabase
      .from('user_saves')
      .upsert({ user_id: targetUser.id, payload: saveData, updated_at: saveData.updatedAt }, { onConflict: 'user_id' });

    if (!saveError) {
      metadataSaved = true;
      // Lazy migration: setelah tersimpan di tabel, kosongkan save besar di user_metadata (ikut JWT).
      if (targetUser.user_metadata?.cloud_save) {
        const { error: clearError } = await supabase.auth.updateUser({
          data: { cloud_save: null, cloud_save_updated_at: saveData.updatedAt, cloud_save_migrated: true }
        });
        if (clearError) console.warn('Failed to clear legacy cloud_save metadata:', clearError.message);
      }
    } else {
      if (!isMissingRelation(saveError)) {
        console.warn('Failed to upsert user_saves, falling back to metadata:', saveError.message);
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          cloud_save: saveData,
          cloud_save_updated_at: saveData.updatedAt
        }
      });
      if (updateError) {
        console.warn('Failed to update cloud_save metadata:', updateError.message);
      }
      metadataSaved = !updateError;
    }

    // 2. Also ensure leaderboard row is synced
    if (saveData.stats && (saveData.stats.level || saveData.stats.totalExp)) {
      await upsertLeaderboard({
        ...saveData.stats,
        userId: targetUser.id
      } as PlayerStats);
    }

    // 3. Also sync relational user_mastery table in background
    if (saveData.stats?.itemMastery) {
      const masteryRecords: UserMasteryEntity[] = Object.values(saveData.stats.itemMastery).map(item => ({
        userId: targetUser.id,
        entityType: (item.category as any) || 'bunpou',
        entityId: item.itemId,
        masteryState: item.status || 'LEARNING',
        knowledgeScore: Math.round(item.masteryPercentage || 0),
        recognitionScore: Math.round(item.masteryPercentage || 0),
        applicationScore: item.contextualSuccessCount ? Math.min(100, item.contextualSuccessCount * 20) : 0,
        retentionScore: Math.round(Math.min(100, (item.decayFactor || 1.0) * 100)),
        trueMasteryPercentage: item.masteryPercentage || 0,
        masteryLevel: item.masteryLevel || 1,
        attemptsCount: item.attemptsCount || 0,
        writingCount: item.writingCount || 0,
        flashcardCount: item.flashcardCount || 0,
        quizCount: item.quizCount || 0,
        correctCount: Math.max(0, (item.attemptsCount || 0) - (item.mistakeCount || 0)),
        wrongCount: item.mistakeCount || 0,
        streak: item.consecutivePerfects || 0,
        consecutivePerfects: item.consecutivePerfects || 0,
        lastReviewedAt: item.lastReviewedAt || new Date().toISOString(),
        nextReviewDue: item.nextReviewDue,
        weaknessFlags: item.weaknessFlags,
        errorPatterns: item.errorPatterns
      }));
      syncUserMasteryRelational(masteryRecords).catch(() => {});
    }

    return metadataSaved;
  } catch (err) {
    console.warn('Failed to save game to cloud:', err);
    return false;
  }
}

/**
 * Load complete game progress from Supabase user_metadata or fallback to leaderboard
 */
export async function loadGameFromCloud(): Promise<CloudSavePayload | null> {
  // Catatan: `null` berarti "benar-benar tidak ada save di cloud". Kegagalan jaringan / server
  // WAJIB dilempar (throw) agar pemanggil tidak menganggap cloud kosong lalu menimpanya
  // dengan data lokal.
  const { data: { user } } = await supabase.auth.getUser();
  const targetUser = user || (await getSession())?.user;
  if (!targetUser) return null;

  // 1. Dual-read: tabel user_saves + user_metadata (legacy). Yang updatedAt-nya lebih baru menang;
  //    kegagalan selain "tabel belum ada" dilempar supaya cloud tidak ditimpa.
  const legacySave = (targetUser.user_metadata?.cloud_save as CloudSavePayload | undefined) || null;
  const { data: savedRow, error: savedError } = await supabase
    .from('user_saves')
    .select('payload, updated_at')
    .eq('user_id', targetUser.id)
    .maybeSingle();
  if (savedError && !isMissingRelation(savedError)) {
    throw new Error(`Gagal membaca user_saves: ${savedError.message}`);
  }
  const tableSave = (savedRow?.payload as CloudSavePayload | undefined) || null;
  if (tableSave && legacySave) {
    return Date.parse(legacySave.updatedAt || '') > Date.parse(tableSave.updatedAt || '') ? legacySave : tableSave;
  }
  if (tableSave || legacySave) {
    return (tableSave || legacySave) as CloudSavePayload;
  }

  // 2. Fallback: check leaderboard table for level & exp
  // maybeSingle(): 0 baris => data null tanpa error (PGRST116 tidak dilempar).
  const { data: lbData, error: lbError } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (lbError) {
    throw new Error(`Gagal membaca leaderboard: ${lbError.message}`);
  }

  if (lbData && (lbData.level || lbData.total_exp)) {
    return {
      stats: {
        level: lbData.level || 1,
        totalExp: lbData.total_exp || 0,
        playerName: lbData.player_name,
        avatar: lbData.avatar_url,
        characterGender: lbData.character_gender || 'male',
        tierIndex: lbData.tier_index || 0,
        studyStats: {
          questions: { total: 0, uniqueIds: [] },
          flashcards: { total: lbData.stat_flashcard || 0, uniqueIds: [] },
          kanjiWriting: { total: lbData.stat_kanji || 0, uniqueIds: [] },
          tryOuts: { total: lbData.stat_tryout || 0, uniqueIds: [] },
          dokkai: { total: 0, uniqueIds: [] },
          choukai: { total: 0, uniqueIds: [] },
          bunpou: { total: 0, uniqueIds: [] },
          stages: { total: 0, uniqueIds: [] },
          bossBattles: { total: lbData.stat_boss || 0, uniqueIds: [] }
        }
      },
      stageProgress: {},
      dailyMissions: [],
      weeklyMissions: [],
      updatedAt: lbData.last_updated || new Date().toISOString()
    };
  }

  return null;
}

// ==========================================
// RELATIONAL IDENTITY ARCHITECTURE HELPERS
// ==========================================

/**
 * Sync relational user mastery items directly to user_mastery table.
 */
export async function syncUserMasteryRelational(masteryRecords: UserMasteryEntity[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser || !masteryRecords.length) return false;

    const rows = masteryRecords.map(rec => ({
      user_id: targetUser.id,
      entity_type: rec.entityType,
      entity_id: rec.entityId,
      mastery_state: rec.masteryState || 'LEARNING',
      knowledge_score: rec.knowledgeScore || 0,
      recognition_score: rec.recognitionScore || 0,
      application_score: rec.applicationScore || 0,
      retention_score: rec.retentionScore || 0,
      true_mastery_percentage: rec.trueMasteryPercentage || 0,
      mastery_level: rec.masteryLevel || 1,
      attempts_count: rec.attemptsCount || 0,
      practice_count_writing: rec.writingCount || 0,
      practice_count_flashcard: rec.flashcardCount || 0,
      practice_count_quiz: rec.quizCount || 0,
      correct_count: rec.correctCount || 0,
      wrong_count: rec.wrongCount || 0,
      streak: rec.streak || 0,
      consecutive_perfects: rec.consecutivePerfects || 0,
      last_reviewed_at: rec.lastReviewedAt || new Date().toISOString(),
      next_review_due: rec.nextReviewDue || null,
      weakness_flags: rec.weaknessFlags || [],
      error_patterns: rec.errorPatterns || [],
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('user_mastery')
      .upsert(rows, { onConflict: 'user_id,entity_type,entity_id' });

    if (error) {
      console.warn('Note: user_mastery table sync error (database migration pending in Supabase):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to sync relational user mastery:', err);
    return false;
  }
}

/**
 * Log discrete user activity to user_activity event stream table.
 */
export async function logUserActivityEvent(activity: Omit<UserActivityEntity, 'id'>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser) return false;

    const { error } = await supabase
      .from('user_activity')
      .insert({
        user_id: targetUser.id,
        activity_type: activity.activityType,
        entity_type: activity.entityType || null,
        entity_id: activity.entityId || null,
        result: activity.result,
        score: activity.score || 0,
        xp_gained: activity.xpGained || 0,
        duration_seconds: activity.durationSeconds || 0,
        metadata: activity.metadata || {},
        created_at: activity.createdAt || new Date().toISOString()
      });

    if (error) {
      console.warn('Note: user_activity table insert error (database migration pending in Supabase):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to log user activity event:', err);
    return false;
  }
}

/**
 * Load relational user mastery records for current user.
 */
export async function loadUserMasteryRelational(): Promise<UserMasteryEntity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUser = user || (await getSession())?.user;
    if (!targetUser) return [];

    const { data, error } = await supabase
      .from('user_mastery')
      .select('*')
      .eq('user_id', targetUser.id);

    if (error) {
      console.warn('Note: user_mastery table fetch error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      masteryState: row.mastery_state,
      knowledgeScore: Number(row.knowledge_score) || 0,
      recognitionScore: Number(row.recognition_score) || 0,
      applicationScore: Number(row.application_score) || 0,
      retentionScore: Number(row.retention_score) || 0,
      trueMasteryPercentage: Number(row.true_mastery_percentage) || 0,
      masteryLevel: row.mastery_level || 1,
      attemptsCount: row.attempts_count || 0,
      writingCount: row.practice_count_writing || 0,
      flashcardCount: row.practice_count_flashcard || 0,
      quizCount: row.practice_count_quiz || 0,
      correctCount: row.correct_count || 0,
      wrongCount: row.wrong_count || 0,
      streak: row.streak || 0,
      consecutivePerfects: row.consecutive_perfects || 0,
      firstSeen: row.first_seen,
      lastReviewedAt: row.last_reviewed_at,
      nextReviewDue: row.next_review_due,
      weaknessFlags: row.weakness_flags || [],
      errorPatterns: row.error_patterns || [],
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.warn('Failed to load relational user mastery:', err);
    return [];
  }
}


