/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerStats, StageClearData, Mission, DeckItemCategory, UserDeck } from '../types/rpg';
import { calculateMaxHp, calculateMaxMp } from '../data/tiers';
import { getEffectiveTier, getJlptLevelForTierIndex } from '../utils/ascension';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import { createDefaultBookmarkDeck, toggleBookmarkItem, toggleItemInDeck, DEFAULT_BOOKMARK_DECK_ID } from '../utils/decks';
import { playSound } from '../utils/audio';
import { recordItemAttempt, recordItemInteraction, buildSmartRecallQueue, hasBeenRecallTested } from '../utils/mastery';
import { recordRecallAnswer, recordRecallSession } from '../engine/recall/session';
import { recordStudyActivity } from '../utils/activity';
import { safeSetItem } from '../utils/storage';
import { getTodayLocalDate, getLocalIsoWeekId } from '../utils/time';
import { awardExp, LEGACY_META } from '../engine/reward/awardExp';
import type { RewardDecision, RewardMeta, StudyCompleteResult } from '../engine/reward/types';
import { getGameOverHp, HP_POTION_ID } from '../utils/recovery';
import { DEFAULT_STATS } from '../state/defaultStats';
import { canonicalEntityId } from '../state/canonicalizeStats';
import { STORAGE_KEY_SIGNATURE } from '../state/storageKeys';
import {
  applyStudyToStats, getStudyMissionAdvances, resolveStudyInteraction,
} from '../state/playerProgress';
import { consumePendingErrors } from '../utils/errorClassifier';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';
import type { TabType } from '../components/layout/BottomNavigation';

interface Params {
  stats: PlayerStats;
  setStats: Dispatch<SetStateAction<PlayerStats>>;
  dailyMissions: Mission[];
  setDailyMissions: Dispatch<SetStateAction<Mission[]>>;
  setWeeklyMissions: Dispatch<SetStateAction<Mission[]>>;
  setStageProgress: Dispatch<SetStateAction<Record<string, StageClearData>>>;
  setIsRecallActive: Dispatch<SetStateAction<boolean>>;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
  showToast: (message: string, ms?: number) => void;
}

/** Handler aksi pemain (reward, misi, mastery, stage, atribut, reset, bookmark). Dipindah dari App.tsx. */
export function usePlayerActions({
  stats, setStats, dailyMissions, setDailyMissions, setWeeklyMissions, setStageProgress,
  setIsRecallActive, setActiveTab,
  showToast,
}: Params) {
// Give EXP & Gold reward directly (pure base EXP, respects JLPT Ascension gates)
  const handleRewardPlayer = (expGained: number, goldGained: number = 0, meta: RewardMeta = LEGACY_META): RewardDecision => {
    const req = { ...meta, exp: expGained, gold: goldGained };
    // Pratinjau terhadap snapshot render: untuk toast level-up dan nilai kembalian ke UI. Keputusan RESMI
    // (idempotency/batas/ledger) diambil di dalam updater di bawah terhadap state terbaru.
    const preview = awardExp(stats, req);
    if (preview.decision.granted && preview.stats.level > stats.level) {
      playSound('levelup', stats.soundEnabled);
      showToast(`Naik ke Level ${preview.stats.level}! +${preview.stats.unallocatedPoints - (stats.unallocatedPoints || 0)} poin atribut`, 4000);
    }
    setStats(prev => awardExp(prev, req).stats);
    return preview.decision;
  };

  const advanceMissions = (
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'streak' | 'stage_clear' | 'boss' | 'quiz',
    amount: number = 1,
    extra?: { isPerfect?: boolean; streakCount?: number }
  ) => {
    setDailyMissions(prev =>
      prev.map(m => {
        let shouldIncrement = false;
        let incAmount = amount;

        if (m.id === 'dm_01' && category === 'bunpou') shouldIncrement = true;
        else if (m.id === 'dm_02' && category === 'kotoba') shouldIncrement = true;
        else if (m.id === 'dm_03' && category === 'kanji') shouldIncrement = true;
        else if (m.id === 'dm_04' && category === 'choukai') shouldIncrement = true;
        else if (m.id === 'dm_05' && (category === 'quiz' || category === 'bunpou' || category === 'kotoba' || category === 'choukai')) shouldIncrement = true;

        if (shouldIncrement) {
          const newProgress = Math.min(m.target, m.progress + incAmount);
          return {
            ...m,
            progress: newProgress,
            completed: newProgress >= m.target,
          };
        }
        return m;
      })
    );

    setWeeklyMissions(prev =>
      prev.map(m => {
        let shouldIncrement = false;
        let incAmount = amount;

        if (m.id === 'wm_01' && category === 'stage_clear') shouldIncrement = true;
        else if (m.id === 'wm_02' && category === 'streak') {
          const currentStreak = extra?.streakCount ?? stats.streakDays;
          const newProgress = Math.min(m.target, Math.max(m.progress, currentStreak));
          return {
            ...m,
            progress: newProgress,
            completed: newProgress >= m.target,
          };
        }
        else if (m.id === 'wm_03' && category === 'dokkai' && extra?.isPerfect) shouldIncrement = true;
        else if (m.id === 'wm_04' && (category === 'boss' || category === 'stage_clear')) shouldIncrement = true;

        if (shouldIncrement) {
          const newProgress = Math.min(m.target, m.progress + incAmount);
          return {
            ...m,
            progress: newProgress,
            completed: newProgress >= m.target,
          };
        }
        return m;
      })
    );
  };

  // Universal Study Activity Completion Handler (Works across Stages, Library, Decks, & Practice)
  const handleStudyComplete = (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number,
    interactionTypeOverride?: 'writing' | 'flashcard' | 'quiz',
    rewardMeta?: RewardMeta
  ): StudyCompleteResult => {
    // ID kanonik: alias lama / karakter kanji tidak boleh membuat record mastery ganda.
    if (itemId) itemId = canonicalEntityId(itemId);
    // Jenis kesalahan dari sesi kuis yang baru selesai (sekali pakai; kosong untuk mode tanpa kuis)
    const detectedErrors = consumePendingErrors();
    let rewardDecision: RewardDecision | undefined;
    if (expGained > 0 || goldGained > 0) {
      // Sesi dungeon punya ID unik per sesi -> dipakai sebagai identitas kejadian (cegah bayar dua kali).
      const meta: RewardMeta = rewardMeta ?? {
        source: 'study_unclassified',
        ref: itemId,
        ...(itemId && /^dungeon_/.test(itemId) ? { eventKey: itemId } : {}),
      };
      rewardDecision = handleRewardPlayer(expGained, goldGained, meta);
    }

    const interaction = resolveStudyInteraction(moduleId, interactionTypeOverride);

    for (const adv of getStudyMissionAdvances({ moduleId, interaction, score, total })) {
      advanceMissions(adv.category, adv.amount, adv.extra);
    }

    // score/total undefined = tidak ada penilaian (mis. flashcard): dicatat sebagai latihan, bukan attempt.
    setStats(prev => applyStudyToStats(prev, { moduleId, itemId, score, total, interaction, detectedErrors }));
    return rewardDecision;
  };

  // Lightweight Item Interaction Handler (Flashcard flip, Quick Kanji draw, Bunpou practice)
  const handleRecordItemInteraction = useCallback((
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'view' | 'writing' | 'flashcard' | 'quiz',
    success: boolean = true
  ) => {
    itemId = canonicalEntityId(itemId);
    setStats(prev => {
      const currentItem = prev.itemMastery ? prev.itemMastery[itemId] : undefined;
      const updatedRecord = recordItemInteraction(
        currentItem,
        itemId,
        category,
        interactionType,
        success,
        'library'
      );
      // Event ganda (re-render / StrictMode) mengembalikan record yang sama: tidak ada perubahan state.
      if (updatedRecord === currentItem) return prev;
      const updatedMastery = {
        ...(prev.itemMastery || {}),
        [itemId]: updatedRecord
      };
      // Antrean Recall adalah turunan itemMastery: harus dihitung ulang di sini juga, kalau tidak
      // interaksi Library baru muncul di Recall setelah refresh.
      let recallQueue = prev.recallQueue || [];
      try { recallQueue = buildSmartRecallQueue(updatedMastery); } catch (e) { console.warn('Failed to update recall queue', e); }
      let newStats: PlayerStats = {
        ...prev,
        itemMastery: updatedMastery,
        recallQueue
      };

      if (interactionType === 'view') {
        // Paparan bukan aktivitas belajar: tidak masuk statistik studi.
      } else if (interactionType === 'writing') {
        newStats = recordStudyActivity(newStats, 'kanjiWriting', itemId, 1);
      } else if (interactionType === 'flashcard') {
        newStats = recordStudyActivity(newStats, 'flashcards', itemId, 1);
      } else if (interactionType === 'quiz') {
        newStats = recordStudyActivity(newStats, category === 'bunpou' ? 'bunpou' : 'questions', itemId, 1);
      }

      return newStats;
    });
  }, []);

  // Hasil lantai Tower -> mastery/SRS & activity. masteryGain = { itemId: totalDelta }; delta > 0 = benar.
  // ID yang bukan materi (mis. "round_2_INSCRIPTION") dilewati.
  const handleTowerMastery = useCallback((masteryGain: Record<string, number>) => {
    setStats(prev => {
      let mastery = prev.itemMastery || {};
      let next: PlayerStats = prev;
      let changed = false;
      for (const [rawId, delta] of Object.entries(masteryGain || {})) {
        const id = canonicalEntityId(rawId);
        const category: 'kotoba' | 'kanji' | 'bunpou' | null =
          KOTOBA_DATABASE[id] ? 'kotoba' : KANJI_DATABASE[id] ? 'kanji' : BUNPOU_DATABASE[id] ? 'bunpou' : null;
        if (!category) continue;
        mastery = { ...mastery, [id]: recordItemInteraction(mastery[id], id, category, 'quiz', delta > 0) };
        next = recordStudyActivity(next, 'questions', id, 1);
        changed = true;
      }
      if (!changed) return prev;
      let recallQueue = next.recallQueue || [];
      try { recallQueue = buildSmartRecallQueue(mastery); } catch (e) { console.warn('Failed to update recall queue', e); }
      return { ...next, itemMastery: mastery, recallQueue };
    });
  }, []);

  // Launch targeted remediation recall directly from diagnostic
  const handleStartRemediationRecall = (_itemIds: string[]) => {
    setIsRecallActive(true);
  };

  // Recall handlers
  const handleItemReviewed = (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    isCorrect: boolean,
    interactionType: 'writing' | 'flashcard' | 'quiz' = 'quiz'
  ) => {
    itemId = canonicalEntityId(itemId);
    setStats(prev => {
      const currentMastery = { ...(prev.itemMastery || {}) };
      const existing = currentMastery[itemId];
      const updated = recordItemAttempt(
        existing,
        itemId,
        category,
        isCorrect ? 7 : 4,
        7,
        undefined,
        false,
        interactionType,
        'recall'
      );
      currentMastery[itemId] = updated;
      return {
        ...prev,
        itemMastery: currentMastery,
        recallQueue: buildSmartRecallQueue(currentMastery),
        // Kuota harian: jawaban ini + apakah materinya baru pertama kali diuji (dihitung dari record SEBELUM dijawab).
        recallDaily: recordRecallAnswer(prev.recallDaily, getTodayLocalDate(), !existing || !hasBeenRecallTested(existing))
      };
    });
  };

  const handleCompleteRecallSession = (totalReviewed: number, correctCount: number, expGained: number, goldGained: number) => {
    handleRewardPlayer(expGained, goldGained, { source: 'recall_session', note: `${correctCount}/${totalReviewed} benar` });

    advanceMissions('kotoba', Math.min(5, totalReviewed));
    if (correctCount > 0) {
      advanceMissions('quiz', correctCount);
    }

    setStats(prev => ({ ...prev, recallDaily: recordRecallSession(prev.recallDaily, getTodayLocalDate()) }));
    // Layar ringkasan sesi (RecallModule) ditutup lewat tombolnya (onExit); menutup di sini membuatnya tak pernah terlihat.
  };

  // Mana usage helper (e.g. for quiz hints)
  const handleUseMp = (amount: number): boolean => {
    if (stats.mp >= amount) {
      setStats(prev => ({ ...prev, mp: prev.mp - amount }));
      return true;
    }
    return false;
  };

  // Attribute Point allocation inside CharacterStatusModal
  const handleAllocateStat = (statName: 'str' | 'agi' | 'int' | 'vit') => {
    if (stats.unallocatedPoints <= 0) return;
    playSound('coin', stats.soundEnabled);

    setStats(prev => {
      const updated = {
        ...prev,
        [statName]: prev[statName] + 1,
        unallocatedPoints: prev.unallocatedPoints - 1,
      };
      updated.maxHp = calculateMaxHp(updated.level, updated.vit);
      updated.maxMp = calculateMaxMp(updated.level, updated.int);
      return updated;
    });
  };

  // Handle Ascension across JLPT tiers
  const handleAscendTier = (targetTierIndex: number, _targetJlpt: string | null) => {
    playSound('levelup', stats.soundEnabled);
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.log('Confetti effect failed', e);
    }

    setStats(prev => {
      const currentJlpt = getJlptLevelForTierIndex(prev.tierIndex ?? 0);
      const existingAscended = prev.ascendedLevels || [];
      const updatedAscended = Array.from(new Set([...existingAscended, currentJlpt as any]));

      const candidateStats: PlayerStats = {
        ...prev,
        tierIndex: targetTierIndex,
        ascendedLevels: updatedAscended as ('N5' | 'N4' | 'N3' | 'N2' | 'N1')[],
        tierPromotionGated: false,
        gatedReason: undefined,
      };

      const { effectiveTierIndex } = getEffectiveTier(candidateStats);
      candidateStats.tierIndex = Math.max(targetTierIndex, effectiveTierIndex);

      return candidateStats;
    });
  };



  // Claim Mission Reward
  const handleClaimMission = (mission: Mission) => {
    if (mission.claimed) return;
    if (!mission.completed && (mission.progress || 0) < mission.target) return;

    // Identitas klaim = misi + periode (hari / minggu ISO): klik ganda atau klaim ulang tidak dibayar dua kali.
    const period = mission.type === 'daily' ? getTodayLocalDate() : getLocalIsoWeekId();
    const decision = handleRewardPlayer(mission.rewardExp, mission.rewardGold, {
      source: 'mission_claim',
      ref: `${mission.id}:${period}`,
      note: mission.title,
    });
    const alreadyPaid = !decision.granted && decision.reason !== 'empty';
    if (mission.rewardGems && !alreadyPaid) {
      setStats(prev => ({ ...prev, gems: prev.gems + (mission.rewardGems || 0) }));
    }

    if (dailyMissions.some(m => m.id === mission.id)) {
      setDailyMissions(prev =>
        prev.map(m => (m.id === mission.id ? { ...m, claimed: true } : m))
      );
    } else {
      setWeeklyMissions(prev =>
        prev.map(m => (m.id === mission.id ? { ...m, claimed: true } : m))
      );
    }
  };

  // Reset Progress
  const handleGameOver = () => {
    playSound('wrong', stats.soundEnabled);
    // Kekalahan punya konsekuensi: HP tersisa minimal. Pulihkan lewat Potion atau Istirahat di Dojo
    // (Profil Karakter). Auto-heal hanya aktif saat pengembangan.
    setStats(prev => ({ ...prev, hp: import.meta.env.DEV ? prev.maxHp : getGameOverHp(prev.maxHp) }));
    showToast('HP habis! Gunakan Potion atau Istirahat di Dojo (Profil Karakter) untuk memulihkan HP.', 6000);
  };

  const handleHpDamage = (amount: number) => {
    setStats(prev => ({ ...prev, hp: Math.max(0, prev.hp - amount) }));
  };

  const handleResetData = () => {
    // userId dipertahankan: identitas leaderboard/cloud tidak boleh hilang saat progres di-reset,
    // dan autosave (yang membutuhkan userId) akan menimpa save cloud dengan state yang sudah bersih.
    setStats(prev => ({
      ...DEFAULT_STATS,
      userId: prev.userId,
      lastStudyDate: getTodayLocalDate(),
      userDecks: [createDefaultBookmarkDeck()],
    }));
    setStageProgress({});
    setDailyMissions(INITIAL_DAILY_MISSIONS);
    setWeeklyMissions(INITIAL_WEEKLY_MISSIONS);
    setIsRecallActive(false);
    setActiveTab('home');
    playSound('click', true);
  };

  // Handle Name Update
  const handleUpdateName = (newName: string) => {
    const trimmed = newName.trim().slice(0, 30);
    if (!trimmed) return;
    setStats(prev => ({ ...prev, playerName: trimmed }));
  };

  // Handle Player Signature / Bio Motto Update
  const handleUpdateSignature = (newSignature: string) => {
    const trimmed = newSignature.trim().slice(0, 60);
    safeSetItem('nihongo_quest_player_signature', trimmed);
    setStats(prev => ({ ...prev, signature: trimmed }));
  };

  const handleToggleBookmark = useCallback((id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => {
    setStats(prev => {
      let updatedDecks: UserDeck[];
      if (targetDeckId && targetDeckId !== DEFAULT_BOOKMARK_DECK_ID) {
        const { userDecks } = toggleItemInDeck(prev.userDecks, targetDeckId, id, category, notes);
        updatedDecks = userDecks;
      } else {
        const { userDecks } = toggleBookmarkItem(prev.userDecks, id, category, notes);
        updatedDecks = userDecks;
      }
      return { ...prev, userDecks: updatedDecks };
    });
  }, []);

  // Pembaruan deck dari semua tab. Persistensi lokal & cloud ditangani efek debounce + flush di atas,
  // bukan di dalam updater state.
  const handleUpdateDecks = useCallback((updatedDecks: UserDeck[]) => {
    setStats(prev => ({ ...prev, userDecks: updatedDecks }));
  }, []);

  return {
    handleRewardPlayer, advanceMissions, handleStudyComplete, handleRecordItemInteraction, handleTowerMastery,
    handleStartRemediationRecall, handleItemReviewed, handleCompleteRecallSession,
    handleUseMp, handleAllocateStat, handleAscendTier, handleClaimMission, handleGameOver, handleHpDamage,
    handleResetData, handleUpdateName, handleUpdateSignature, handleToggleBookmark,
    handleUpdateDecks,
  };
}
