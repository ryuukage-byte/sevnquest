/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerStats, StageClearData, Mission, DeckItemCategory, UserDeck } from '../types/rpg';
import { calculateMaxHp, calculateMaxMp } from '../data/tiers';
import { getEffectiveTier, getJlptLevelForTierIndex } from '../utils/ascension';
import { INITIAL_DAILY_MISSIONS, INITIAL_WEEKLY_MISSIONS } from '../data/missions';
import { createDefaultBookmarkDeck, toggleBookmarkItem, toggleItemInDeck, DEFAULT_BOOKMARK_DECK_ID } from '../utils/decks';
import { playSound } from '../utils/audio';
import { recordItemAttempt, recordItemInteraction, buildSmartRecallQueue } from '../utils/mastery';
import { recordStudyActivity } from '../utils/activity';
import { safeSetItem } from '../utils/storage';
import { getTodayLocalDate } from '../utils/time';
import { getGameOverHp, HP_POTION_ID } from '../utils/recovery';
import { DEFAULT_STATS } from '../state/defaultStats';
import { canonicalEntityId } from '../state/canonicalizeStats';
import { STORAGE_KEY_SIGNATURE } from '../state/storageKeys';
import { applyLevelFromExp } from '../state/derivedState';
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
  const handleRewardPlayer = (expGained: number, goldGained: number = 0) => {
    const preview = applyLevelFromExp({ ...stats, totalExp: Math.round(Math.max(0, (stats.totalExp || 0) + expGained)) });
    if (preview.levelsGained > 0) {
      playSound('levelup', stats.soundEnabled);
      showToast(`Naik ke Level ${preview.stats.level}! +${preview.stats.unallocatedPoints - (stats.unallocatedPoints || 0)} poin atribut`, 4000);
    }
    setStats(prev => {
      const newTotalExp = Math.round(Math.max(0, (prev.totalExp || 0) + expGained));
      const { effectiveTierIndex, isGated, gatedReason } = getEffectiveTier({
        ...prev,
        totalExp: newTotalExp,
      });

      // Level adalah fungsi dari totalExp: naik level memberi poin atribut dan menambah HP/MP maksimum.
      const { stats: leveled } = applyLevelFromExp({
        ...prev,
        totalExp: newTotalExp,
        tierIndex: Math.max(0, effectiveTierIndex),
        tierPromotionGated: isGated,
        gatedReason: gatedReason,
        gold: Math.round(Math.max(0, (prev.gold || 0) + goldGained)),
      });
      return leveled;
    });
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
    interactionTypeOverride?: 'writing' | 'flashcard' | 'quiz'
  ) => {
    // ID kanonik: alias lama / karakter kanji tidak boleh membuat record mastery ganda.
    if (itemId) itemId = canonicalEntityId(itemId);
    // Jenis kesalahan dari sesi kuis yang baru selesai (sekali pakai; kosong untuk mode tanpa kuis)
    const detectedErrors = consumePendingErrors();
    if (expGained > 0 || goldGained > 0) {
      handleRewardPlayer(expGained, goldGained);
    }

    const effectiveInteraction: 'writing' | 'flashcard' | 'quiz' =
      interactionTypeOverride || (moduleId === 'kanji' ? 'writing' : (moduleId === 'kotoba' ? 'flashcard' : 'quiz'));

    // ID agregat sesi (drill/tryout/dungeon/star_rush) bukan item materi: jangan dibuat record mastery,
    // kalau tidak itemMastery membengkak (ID dungeon unik per sesi) dan antrean recall berisi item hantu.
    const isSessionAggregate =
      moduleId === 'questions' ||
      moduleId === 'tryOuts' ||
      (itemId !== undefined && /^(dungeon_|drill_|tryout_|star_rush)/.test(itemId));

    // Advance mission progress based on completed module
    if (effectiveInteraction === 'writing' || moduleId === 'kanji') advanceMissions('kanji', 1);
    if (moduleId === 'bunpou') advanceMissions('bunpou', 1);
    else if (moduleId === 'kotoba' && effectiveInteraction !== 'writing') advanceMissions('kotoba', 1);
    else if (moduleId === 'choukai') advanceMissions('choukai', 1);
    else if (moduleId === 'dokkai') {
      const isPerfect = score !== undefined && total !== undefined && total > 0 && score === total;
      advanceMissions('dokkai', 1, { isPerfect });
    }
    else if (moduleId === 'boss') {
      advanceMissions('boss', 1);
    }

    if (score && score > 0) {
      advanceMissions('quiz', score);
    }

    // Update Item Mastery, Recall Queue & Study Statistics
    setStats(prev => {
      let updatedMastery = prev.itemMastery || {};
      let updatedRecallQueue = prev.recallQueue || [];

      if (itemId && !isSessionAggregate && score !== undefined && total !== undefined) {
        const cat = moduleId === 'boss' ? 'bunpou' : moduleId;
        const currentItem = prev.itemMastery ? prev.itemMastery[itemId] : undefined;
        const isContextual = moduleId === 'dokkai' || moduleId === 'boss';
        const updatedRecord = recordItemAttempt(
          currentItem,
          itemId,
          cat,
          score,
          total,
          detectedErrors.length > 0 ? detectedErrors : undefined,
          isContextual,
          effectiveInteraction
        );
        updatedMastery = {
          ...updatedMastery,
          [itemId]: updatedRecord
        };
        try {
          updatedRecallQueue = buildSmartRecallQueue(updatedMastery);
        } catch (e) {
          console.warn('Failed to update recall queue', e);
        }
      }

      let newStats: PlayerStats = {
        ...prev,
        itemMastery: updatedMastery,
        recallQueue: updatedRecallQueue,
      };

      // Record Activity for Stats Profile (the specific module)
      const effectiveId = itemId || `study_${moduleId}_${Date.now()}`;
      if (effectiveInteraction === 'writing' || moduleId === 'kanji') newStats = recordStudyActivity(newStats, 'kanjiWriting', effectiveId);
      else if (moduleId === 'kotoba') newStats = recordStudyActivity(newStats, 'flashcards', effectiveId);
      else if (moduleId === 'boss') newStats = recordStudyActivity(newStats, 'bossBattles', effectiveId);
      else if (moduleId === 'questions') newStats = recordStudyActivity(newStats, 'questions', effectiveId, total || 1);
      else if (moduleId === 'tryOuts') newStats = recordStudyActivity(newStats, 'tryOuts', effectiveId, 1);
      else newStats = recordStudyActivity(newStats, moduleId as any, effectiveId);

      // Record total questions answered if it was a quiz
      if (total && total > 1 && moduleId !== 'kanji' && moduleId !== 'kotoba' && effectiveInteraction !== 'writing') {
        newStats = recordStudyActivity(newStats, 'questions', effectiveId, total);
      }

      return newStats;
    });
  };

  // Lightweight Item Interaction Handler (Flashcard flip, Quick Kanji draw, Bunpou practice)
  const handleRecordItemInteraction = useCallback((
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
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
        success
      );
      const updatedMastery = {
        ...(prev.itemMastery || {}),
        [itemId]: updatedRecord
      };
      let newStats: PlayerStats = {
        ...prev,
        itemMastery: updatedMastery
      };

      if (interactionType === 'writing') {
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
  const handleItemReviewed = (itemId: string, category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai', isCorrect: boolean) => {
    itemId = canonicalEntityId(itemId);
    setStats(prev => {
      const currentMastery = { ...(prev.itemMastery || {}) };
      const existing = currentMastery[itemId];
      const updated = recordItemAttempt(
        existing,
        itemId,
        category,
        isCorrect ? 7 : 4,
        7
      );
      currentMastery[itemId] = updated;
      return {
        ...prev,
        itemMastery: currentMastery,
        recallQueue: buildSmartRecallQueue(currentMastery)
      };
    });
  };

  const handleCompleteRecallSession = (totalReviewed: number, correctCount: number, expGained: number, goldGained: number) => {
    handleRewardPlayer(expGained, goldGained);

    advanceMissions('kotoba', Math.min(5, totalReviewed));
    if (correctCount > 0) {
      advanceMissions('quiz', correctCount);
    }

    setIsRecallActive(false);
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

    handleRewardPlayer(mission.rewardExp, mission.rewardGold);
    if (mission.rewardGems) {
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
