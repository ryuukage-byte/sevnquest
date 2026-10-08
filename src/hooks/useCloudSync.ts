import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { PlayerStats, StageClearData, Mission } from '../types/rpg';
import { calculateMaxHp, calculateMaxMp, calculateLevelFromExp } from '../data/tiers';
import { getEffectiveTier } from '../utils/ascension';
import { getLocalIsoWeekId } from '../utils/time';
import { safeSetItem } from '../utils/storage';
import { mergeStatsCollections, mergeStageProgress } from '../utils/cloudMerge';
import { supabase, getSession, saveGameToCloud, loadGameFromCloud, upsertLeaderboard, type CloudSavePayload } from '../lib/supabase';
import { collectTowerState, applyTowerState, mergeTowerState } from '../engine/tower/world/towerCloudState';
import { DEFAULT_STATS } from '../state/defaultStats';
import { stripDerivedStats, withDerivedStats } from '../state/derivedState';
import { canonicalizeStats } from '../state/canonicalizeStats';
import {
  STORAGE_KEY_STATS,
  STORAGE_KEY_STAGES,
  STORAGE_KEY_DAILY,
  STORAGE_KEY_WEEKLY,
  STORAGE_KEY_LAST_SYNC,
  CLOUD_SAVE_MIN_INTERVAL_MS,
} from '../state/storageKeys';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface Params {
  stats: PlayerStats;
  stageProgress: Record<string, StageClearData>;
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  statsRef: MutableRefObject<PlayerStats>;
  stageProgressRef: MutableRefObject<Record<string, StageClearData>>;
  dailyMissionsRef: MutableRefObject<Mission[]>;
  weeklyMissionsRef: MutableRefObject<Mission[]>;
  setStats: Dispatch<SetStateAction<PlayerStats>>;
  setStageProgress: Dispatch<SetStateAction<Record<string, StageClearData>>>;
  setDailyMissions: Dispatch<SetStateAction<Mission[]>>;
  setWeeklyMissions: Dispatch<SetStateAction<Mission[]>>;
  showToast: (message: string, ms?: number) => void;
}

/**
 * Autentikasi + rekonsiliasi cloud ↔ lokal + autosave (dengan gerbang hidrasi) + sinkron leaderboard.
 * Dipindah apa adanya dari App.tsx (lihat AUDIT_REPORT A-04/A-05).
 */
export function useCloudSync({
  stats, stageProgress, dailyMissions, weeklyMissions,
  statsRef, stageProgressRef, dailyMissionsRef, weeklyMissionsRef,
  setStats, setStageProgress, setDailyMissions, setWeeklyMissions,
  showToast,
}: Params) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  // Hanya terisi setelah sinkron BERHASIL di sesi ini. Dulu dibaca dari localStorage sehingga jam
  // sesi lama tampil di Pengaturan walau sinkron sekarang gagal.
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  // Auto-save ke cloud TIDAK boleh jalan sebelum rekonsiliasi awal selesai; kalau tidak, state lokal
  // yang masih kosong (perangkat baru / koneksi lambat) bisa menimpa save di cloud.
  const [cloudHydrated, setCloudHydrated] = useState(false);

  const failureToastShownRef = useRef(false);

  // Selalu sertakan progres Tower saat menyimpan ke cloud.
  const saveToCloud = useCallback(
    (payload: CloudSavePayload) =>
      saveGameToCloud({ ...payload, stats: stripDerivedStats(payload.stats), towerState: collectTowerState() }),
    []
  );

  const markSynced = useCallback(() => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSyncedAt(nowStr);
    safeSetItem(STORAGE_KEY_LAST_SYNC, nowStr);
  }, []);

  // Cloud Sync Handler
  const handleCloudSync = useCallback(async (userIdParam?: string, isRetry = false): Promise<boolean> => {
    try {
      setCloudSyncStatus('syncing');
      // Melempar error bila jaringan/server gagal => masuk catch, tidak ada yang ditimpa.
      const cloudData = await loadGameFromCloud();
      const currentStats = statsRef.current;
      const currentStages = stageProgressRef.current;
      const currentDaily = dailyMissionsRef.current;
      const currentWeekly = weeklyMissionsRef.current;
      const targetUserId = userIdParam || currentStats.userId;

      if (!cloudData) {
        // No cloud save exists yet, push local progress if we have any
        if (targetUserId) {
          const pushed = await saveToCloud({
            stats: { ...currentStats, userId: targetUserId },
            stageProgress: currentStages,
            dailyMissions: currentDaily,
            weeklyMissions: currentWeekly,
            updatedAt: new Date().toISOString()
          });
          // saveGameToCloud tidak melempar error; false = simpan benar-benar gagal.
          if (!pushed) throw new Error('Gagal menyimpan progres awal ke cloud');
        }
        markSynced();
        setCloudSyncStatus('synced');
        return true;
      }

      // We have cloud data! Compare progress
      const cloudStats = cloudData.stats || {};
      const cloudExp = cloudStats.totalExp || 0;
      const cloudLevel = cloudStats.level || 1;
      const localExp = currentStats.totalExp || 0;
      const localLevel = currentStats.level || 1;

      console.log(`[CloudSync] Cloud: Lv.${cloudLevel} (${cloudExp} EXP) vs Local: Lv.${localLevel} (${localExp} EXP)`);

      const cloudWins = cloudExp > localExp || cloudLevel > localLevel;
      const localWins = !cloudWins && (localExp > cloudExp || localLevel > cloudLevel);

      // Koleksi (itemMastery, userDecks, stageProgress) selalu di-union supaya progres yang hanya
      // ada di satu sisi tidak hilang. Skalar (level/EXP/gold, dst.) mengikuti sisi yang lebih maju.
      const mergedStages = mergeStageProgress(currentStages, cloudData.stageProgress);
      // Progres Tower: lantai tertinggi menang, union skill tree & achievement.
      applyTowerState(mergeTowerState(collectTowerState(), cloudData.towerState));

      let mergedStats: PlayerStats;
      if (cloudWins) {
        const finalLevel = Math.max(cloudStats.level || 1, calculateLevelFromExp(cloudExp));
        const finalHp = calculateMaxHp(finalLevel, cloudStats.vit || 0);
        const finalMp = calculateMaxMp(finalLevel, cloudStats.int || 0);
        const candidateMerged: PlayerStats = {
          ...DEFAULT_STATS,
          ...currentStats,
          ...cloudStats,
          userId: targetUserId || currentStats.userId,
          level: finalLevel,
          totalExp: cloudExp,
        };
        const { effectiveTierIndex } = getEffectiveTier(candidateMerged);

        mergedStats = mergeStatsCollections({
          ...candidateMerged,
          tierIndex: effectiveTierIndex,
          hp: Math.max(currentStats.hp, finalHp),
          maxHp: finalHp,
          mp: Math.max(currentStats.mp, finalMp),
          maxMp: finalMp,
          theme: currentStats.theme || cloudStats.theme || 'dark',
          soundEnabled: currentStats.soundEnabled !== undefined ? currentStats.soundEnabled : true,
        }, currentStats, cloudStats);
      } else {
        mergedStats = mergeStatsCollections(
          { ...currentStats, userId: targetUserId || currentStats.userId },
          currentStats,
          cloudStats
        );
      }

      // recallQueue (turunan) tidak ikut tersimpan/terkirim; hitung ulang dari itemMastery gabungan.
      mergedStats = withDerivedStats(canonicalizeStats(mergedStats));
      setStats(mergedStats);
      safeSetItem(STORAGE_KEY_STATS, JSON.stringify(stripDerivedStats(mergedStats)));
      setStageProgress(mergedStages);
      safeSetItem(STORAGE_KEY_STAGES, JSON.stringify(mergedStages));

      if (cloudWins) {
        // Misi cloud hanya dipakai bila masih berlaku di periode yang sama (hari / minggu ISO ini).
        const cloudDate = cloudData.updatedAt ? new Date(cloudData.updatedAt) : null;
        if (cloudDate && !Number.isNaN(cloudDate.getTime())) {
          if (cloudData.dailyMissions?.length && cloudDate.toDateString() === new Date().toDateString()) {
            setDailyMissions(cloudData.dailyMissions);
            safeSetItem(STORAGE_KEY_DAILY, JSON.stringify(cloudData.dailyMissions));
          }
          if (cloudData.weeklyMissions?.length && getLocalIsoWeekId(cloudDate) === getLocalIsoWeekId()) {
            setWeeklyMissions(cloudData.weeklyMissions);
            safeSetItem(STORAGE_KEY_WEEKLY, JSON.stringify(cloudData.weeklyMissions));
          }
        }
        markSynced();
        setCloudSyncStatus('synced');
        showToast(`Progres dipulihkan dari Cloud (Level ${mergedStats.level} • ${cloudExp.toLocaleString()} EXP)!`, 5000);
        return true;
      }

      // Lokal lebih maju / sama: dorong snapshot gabungan ke cloud
      const pushed = await saveToCloud({
        stats: mergedStats,
        stageProgress: mergedStages,
        dailyMissions: currentDaily,
        weeklyMissions: currentWeekly,
        updatedAt: new Date().toISOString()
      });
      if (!pushed) throw new Error('Gagal menyimpan snapshot gabungan ke cloud');
      markSynced();
      setCloudSyncStatus('synced');
      if (localWins) showToast(`Progres lokal (Level ${localLevel}) tersimpan ke Cloud!`);
      return true;
    } catch (err) {
      // Tepat setelah login, token sesi / jaringan sering belum siap sehingga percobaan pertama gagal
      // padahal yang kedua berhasil. Coba ulang sekali sebelum memberi tahu pemain.
      if (!isRetry) {
        console.warn('[CloudSync] Sinkron pertama gagal, mencoba lagi...', err);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return handleCloudSync(userIdParam, true);
      }
      console.error('[CloudSync] Error during sync:', err);
      setCloudSyncStatus('error');
      // Cukup sekali per sesi; status 'error' tetap terlihat di Pengaturan.
      if (!failureToastShownRef.current) {
        failureToastShownRef.current = true;
        showToast('Gagal sinkronisasi dengan cloud. Progres lokal tetap aman.');
      }
      return false;
    }
  }, [markSynced, showToast, saveToCloud]);

  // Authentication Listener & Cloud Sync
  useEffect(() => {
    let cancelled = false;
    // Hanya satu rekonsiliasi pada satu waktu; event auth beruntun (INITIAL_SESSION + SIGNED_IN)
    // tidak boleh menjalankan dua sync paralel.
    let syncInFlight: Promise<boolean> | null = null;

    // supabase-js memancarkan ulang SIGNED_IN tiap tab kembali fokus; tanpa ini sinkron (dan toast gagal)
    // terulang terus. Rekonsiliasi cukup sekali per pengguna.
    let reconciledUserId: string | null = null;

    const reconcile = (userId: string) => {
      if (syncInFlight) return syncInFlight;
      if (reconciledUserId === userId) return Promise.resolve(true);
      reconciledUserId = userId;
      setCloudHydrated(false);
      syncInFlight = handleCloudSync(userId).finally(() => {
        syncInFlight = null;
        // Sync gagal pun tetap membuka gerbang autosave: loadGameFromCloud melempar error,
        // sehingga cloud tidak pernah ditimpa oleh state yang belum direkonsiliasi.
        if (!cancelled) setCloudHydrated(true);
      });
      return syncInFlight;
    };

    getSession().then((session) => {
      if (cancelled) return;
      setIsAuthenticated(!!session);
      if (session?.user) {
        setStats(prev => ({ ...prev, userId: session.user.id }));
        reconcile(session.user.id);
      } else {
        setCloudHydrated(true); // tamu: tidak ada save cloud yang bisa tertimpa
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setStats(prev => ({ ...prev, userId: session.user.id }));
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          reconcile(session.user.id);
        }
      } else {
        reconciledUserId = null;
        setLastSyncedAt(null);
        setCloudHydrated(true);
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe?.();
    };
  }, [handleCloudSync]);

// Sync to Cloud Save (debounced 3s to avoid excessive requests).
  // Menunggu rekonsiliasi awal (cloudHydrated) agar state lokal yang belum final tidak menimpa cloud.
  const lastCloudSaveAtRef = useRef(0);
  useEffect(() => {
    if (!stats.userId || !cloudHydrated) return;

    // Debounce 3 dtk, tetapi minimal CLOUD_SAVE_MIN_INTERVAL_MS antar-simpan: pelacak waktu belajar
    // mengubah stats tiap 10 detik, dan tiap simpan mengirim payload penuh + upsert seluruh mastery.
    const sinceLast = Date.now() - lastCloudSaveAtRef.current;
    const delay = Math.max(3000, CLOUD_SAVE_MIN_INTERVAL_MS - sinceLast);

    const timerId = setTimeout(async () => {
      try {
        lastCloudSaveAtRef.current = Date.now();
        const saved = await saveToCloud({
          stats,
          stageProgress,
          dailyMissions,
          weeklyMissions,
          updatedAt: new Date().toISOString()
        });
        // Dulu markSynced() dipanggil tanpa memeriksa hasil, sehingga "Sinkron: <jam>" muncul walau gagal.
        if (saved) {
          markSynced();
          setCloudSyncStatus('synced');
        } else {
          setCloudSyncStatus('error');
        }
      } catch (err) {
        console.warn('Cloud auto-save error:', err);
      }
    }, delay);

    return () => clearTimeout(timerId);
  }, [stats, stageProgress, dailyMissions, weeklyMissions, isAuthenticated, cloudHydrated, markSynced]);

  // Sinkron leaderboard cepat saat EXP / nama berubah. Efek samping ini sengaja dipisah dari
  // updater setStats (updater harus murni; React dapat memanggilnya dua kali).
  useEffect(() => {
    if (!stats.userId || !cloudHydrated) return;
    const timerId = setTimeout(() => {
      upsertLeaderboard(statsRef.current).catch(e => console.warn('Instant leaderboard sync warning:', e));
    }, 1200);
    return () => clearTimeout(timerId);
  }, [stats.totalExp, stats.playerName, stats.userId, cloudHydrated]);

  return { isAuthenticated, setIsAuthenticated, cloudSyncStatus, lastSyncedAt, saveToCloud };
}
