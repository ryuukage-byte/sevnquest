import {
  ItemMasteryRecord,
  MasteryStatus,
  MasteryDifficultyLevel,
  RecallQueueItem,
  RecallPriorityTier,
  TrueMasteryBreakdown,
  Question,
  KotobaItem,
  ErrorType,
  ErrorPatternRecord,
  LanguageProfile,
  SubSkillRating
} from '../types/content';
import { BUNPOU_DATABASE } from '../data/bunpou';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { DOKKAI_DATABASE } from '../data/dokkai';
import { CHOUKAI_DATABASE } from '../data/choukai';
import { PlayerStats } from '../types/rpg';
import { fisherYatesShuffle } from './smartRandomizer';
import { getFusionPatternForBunpou, pickRecallVerb, buildConjugationQuestion } from '../engine/recall/bunpouEngines';

// SRS Interval progression (in days)
const SRS_INTERVALS_DAYS = [1, 2, 4, 7, 14, 30];

// Batas mastery (%) yang bisa diraih hanya lewat interaksi ringan (flashcard flip, latihan tanpa nilai).
const INTERACTION_MASTERY_CAP = 70;

const STATUS_RANK: Record<MasteryStatus, number> = {
  LOCKED: 0,
  AVAILABLE: 1,
  LEARNING: 2,
  COMPLETED: 3,
  MASTERED: 4,
  PERFECTED: 5,
};

// Humanized diagnostic insights for each error type
const ERROR_DIAGNOSTIC_INSIGHTS: Record<ErrorType, { label: string; explanation: string; advice: string }> = {
  PASSIVE_CONFUSION: {
    label: 'Tertukar Pasif (受身形)',
    explanation: 'Kamu memilih bentuk Causative bukannya Passive. Kamu menguasai rumus dasarnya, namun keliru menentukan siapa subjek yang menerima tindakan.',
    advice: 'Perhatikan partikel に yang menandai pelaku tindakan dan subjek kalimat yang terkena dampak.'
  },
  CAUSATIVE_CONFUSION: {
    label: 'Tertukar Kausatif (使役形)',
    explanation: 'Tertukar antara membuat/membiarkan orang lain melakukan (Causative) dengan dibuat melakukan oleh orang lain (Causative-Passive).',
    advice: 'Ingat pola: [Orang A] は [Orang B] に [Kata Kerja (さ)せる] = Orang A menyuruh/mengizinkan Orang B.'
  },
  PARTICLE_MISMATCH: {
    label: 'Ketidaksesuaian Partikel (助詞)',
    explanation: 'Partikel penanda objek, target, atau sumber tindakan (に / を / は / で) tidak selaras dengan predikat kalimat.',
    advice: 'Periksa kata kerja transitif (他動詞) vs intransitif (自動詞) yang menentukan pasangan partikel.'
  },
  NUANCE_CONTEXT: {
    label: 'Nuansa & Konteks Situasi',
    explanation: 'Rumus pola tata bahasa benar, namun nuansanya kurang cocok untuk situasi formal, permohonan santun, atau kebiasaan.',
    advice: 'Pahami sudut pandang pembicara: apakah mengekspresikan penyesalan (～てしまう), persiapan (～ておく), atau izin (～てもいい).'
  },
  KANJI_READING_MISMATCH: {
    label: 'Bacaan Kanji (Onyomi vs Kunyomi)',
    explanation: 'Keliru antara bacaan Onyomi (bacaan gabungan kata majemuk/Jukugo) dan Kunyomi (bacaan asli Jepang yang berdiri sendiri).',
    advice: 'Kanji tunggal dengan okurigana biasanya dibaca Kunyomi; gabungan 2+ kanji umumnya dibaca Onyomi.'
  },
  KANJI_SIMILAR_CONFUSION: {
    label: 'Kanji Serupa (Bentuk Visual)',
    explanation: 'Terkecoh dengan kanji lain yang memiliki bentuk radikal (部首) atau guratan visual mirip.',
    advice: 'Fokus pada radikal sebelah kiri (hen) yang membedakan makna dasar (misal: 氵 air vs 扌 tangan vs 言 perkataan).'
  },
  VOCAB_DISTRACTOR: {
    label: 'Distraktor Kosakata',
    explanation: 'Pilihan kata mirip secara fonetik atau terjemahan harfiah, namun kolokasi alami dalam bahasa Jepang berbeda.',
    advice: 'Hafalkan kosakata dalam frasa berpasangan (collocation) bukan sekadar kata tunggal lepas.'
  },
  INFERENCE_OVERLOOK: {
    label: 'Konteks Tersirat Dokkai',
    explanation: 'Melewatkan petunjuk tersirat atau kata penghubung kontras (しかし、ところが) di dalam teks bacaan.',
    advice: 'Cari kesimpulan penulis yang biasanya terletak di akhir paragraf setelah kata transisi.'
  },
  LISTENING_DISTRACTOR: {
    label: 'Penjebak Percakapan Choukai',
    explanation: 'Terkecoh kata kunci di awal dialog sebelum pembicara meralat atau mengubah keputusan di akhir obrolan.',
    advice: 'Dengarkan hingga kalimat penutup pembicara: kata seperti「やっぱり」「でも」sering membalikkan rencana awal.'
  },
  GENERAL_MISTAKE: {
    label: 'Kesalahan Konseptual',
    explanation: 'Jawaban yang dipilih belum sesuai dengan materi dasar yang diujikan.',
    advice: 'Ulas kembali lembar rangkuman materi dan perhatikan contoh kalimat penerapannya.'
  }
};

/**
 * Enhanced Attempt Recorder:
 * Distinguishes Raw Score vs True Retention Mastery
 * (Accuracy + Consistency + Spaced Repetition + Contextual Dokkai/Boss Application)
 */
export function recordItemAttempt(
  existingRecord: ItemMasteryRecord | undefined,
  itemId: string,
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
  score: number,
  totalQuestions: number,
  detectedErrorTypes?: ErrorType[],
  isContextualApplication: boolean = false,
  interactionType?: 'writing' | 'flashcard' | 'quiz',
  source?: string
): ItemMasteryRecord {
  const now = new Date();
  const dateStr = now.toISOString();
  // Sanitasi: NaN / Infinity / nilai negatif tidak boleh masuk ke record (satu NaN membuat
  // masteryPercentage & mistakeCount NaN selamanya). Skor di-clamp ke [0, total].
  totalQuestions = Number.isFinite(totalQuestions) && totalQuestions > 0 ? totalQuestions : 0;
  score = Number.isFinite(score) ? Math.min(Math.max(score, 0), totalQuestions) : 0;
  const ratio = totalQuestions > 0 ? score / totalQuestions : 0;
  const isPerfect = score === totalQuestions && totalQuestions > 0;
  const mistakesInThisAttempt = Math.max(0, totalQuestions - score);

  // Determine effective interaction type if not specified
  const effectiveInteraction: 'writing' | 'flashcard' | 'quiz' = 
    interactionType || (category === 'kanji' ? 'writing' : 'quiz');

  // Compile error patterns
  const existingErrors: ErrorPatternRecord[] = existingRecord?.errorPatterns ? [...existingRecord.errorPatterns] : [];
  if (detectedErrorTypes && detectedErrorTypes.length > 0) {
    for (const errType of detectedErrorTypes) {
      const idx = existingErrors.findIndex(e => e.errorType === errType);
      if (idx >= 0) {
        existingErrors[idx] = {
          ...existingErrors[idx],
          count: existingErrors[idx].count + 1,
          lastOccurred: dateStr
        };
      } else {
        existingErrors.push({
          errorType: errType,
          count: 1,
          lastOccurred: dateStr,
          itemId,
          contextNote: ERROR_DIAGNOSTIC_INSIGHTS[errType]?.explanation
        });
      }
    }
  }

  if (!existingRecord) {
    // First attempt: Cap mastery at 70% to strictly require spaced retention & contextual validation
    let initialStatus: MasteryStatus = 'LEARNING';
    let masteryLvl: MasteryDifficultyLevel = 1;

    if (ratio >= 0.85) {
      initialStatus = 'COMPLETED';
      masteryLvl = 2;
    } else if (ratio < 0.6) {
      initialStatus = 'LEARNING';
      masteryLvl = 1;
    }

    const calculatedMastery = Math.round(ratio * 70); // Max 70% on first session
    const interval = isPerfect ? 2 : 1;
    const nextDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

    return {
      itemId,
      category,
      status: initialStatus,
      masteryPercentage: calculatedMastery,
      masteryLevel: masteryLvl,
      firstAttemptScore: { score, total: totalQuestions, date: dateStr },
      bestScore: { score, total: totalQuestions },
      bestScoreAchievedAt: dateStr,
      attemptsCount: 1,
      writingCount: effectiveInteraction === 'writing' ? 1 : 0,
      flashcardCount: effectiveInteraction === 'flashcard' ? 1 : 0,
      quizCount: effectiveInteraction === 'quiz' ? 1 : 0,
      recallCount: source === 'recall' ? 1 : 0,
      consecutivePerfects: isPerfect ? 1 : 0,
      mistakeCount: mistakesInThisAttempt,
      lastReviewedAt: dateStr,
      nextReviewDue: nextDue,
      reviewIntervalDays: interval,
      decayFactor: 1.0,
      errorPatterns: existingErrors,
      contextualSuccessCount: isContextualApplication && isPerfect ? 1 : 0,
      lastInteraction: { type: effectiveInteraction, source, at: dateStr }
    };
  }

  // Update existing record
  const attemptsCount = existingRecord.attemptsCount + 1;
  const writingCount = (existingRecord.writingCount || 0) + (effectiveInteraction === 'writing' ? 1 : 0);
  const flashcardCount = (existingRecord.flashcardCount || 0) + (effectiveInteraction === 'flashcard' ? 1 : 0);
  const quizCount = (existingRecord.quizCount || 0) + (effectiveInteraction === 'quiz' ? 1 : 0);
  const mistakeCount = existingRecord.mistakeCount + mistakesInThisAttempt;
  const consecutivePerfects = isPerfect ? existingRecord.consecutivePerfects + 1 : 0;
  const contextualSuccessCount = (existingRecord.contextualSuccessCount || 0) + (isContextualApplication && ratio >= 0.8 ? 1 : 0);

  const oldBestRatio = existingRecord.bestScore.total ? existingRecord.bestScore.score / existingRecord.bestScore.total : 0;
  const isNewBest = ratio > oldBestRatio;
  
  const bestScoreVal = Math.max(oldBestRatio, ratio);
  const bestScoreObj = isNewBest ? { score, total: totalQuestions } : existingRecord.bestScore;
  const bestScoreAchievedAt = isNewBest ? dateStr : (existingRecord.bestScoreAchievedAt || dateStr);

  // 1. Decayed Best Accuracy (20%)
  const daysSinceBest = (now.getTime() - new Date(bestScoreAchievedAt).getTime()) / (1000 * 60 * 60 * 24);
  const halfLifeDays = 30;
  const decayFactor = Math.pow(0.5, daysSinceBest / halfLifeDays);
  // floor at current accuracy so it doesn't fall below the latest performance
  const decayedBestAccuracy = Math.max(ratio, bestScoreVal * decayFactor);

  // 2. Current Accuracy (25%)
  const currentAccuracy = ratio;

  // 3. Retention Streak (20%)
  const retentionScore = Math.min(consecutivePerfects / 5, 1);

  // 4. Freshness (15%)
  const daysSinceLastReview = (now.getTime() - new Date(existingRecord.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24);
  const currentSRSInterval = existingRecord.reviewIntervalDays || 1;
  const freshnessRatio = daysSinceLastReview / currentSRSInterval;
  let freshnessScore = 1;
  if (freshnessRatio <= 1) freshnessScore = 1;
  else if (freshnessRatio <= 2) freshnessScore = 1 - (freshnessRatio - 1) * 0.5;
  else freshnessScore = Math.max(0, 0.5 - (freshnessRatio - 2) * 0.25);

  // 5. Contextual Application (20%)
  let rawMastery = 0;
  const hasContextualData = contextualSuccessCount > 0;
  
  if (!hasContextualData) {
    // Renormalize other 4 dimensions to 100%
    const scale = 1 / 0.8;
    rawMastery = (decayedBestAccuracy * 20 * scale) + 
                 (currentAccuracy * 25 * scale) + 
                 (retentionScore * 20 * scale) + 
                 (freshnessScore * 15 * scale);
  } else {
    // Contextual score maxes out at 3 successes
    const contextualScore = Math.min(contextualSuccessCount / 3, 1);
    rawMastery = (decayedBestAccuracy * 20) + 
                 (currentAccuracy * 25) + 
                 (retentionScore * 20) + 
                 (freshnessScore * 15) + 
                 (contextualScore * 20);
  }
  
  const masteryPercentage = Math.min(100, Math.max(0, Math.round(rawMastery)));

  // Mastery Level (1 to 5)
  let masteryLevel: MasteryDifficultyLevel = 1;
  if (masteryPercentage >= 95 && attemptsCount >= 3 && consecutivePerfects >= 2) {
    masteryLevel = 5; // Production & Total Stability
  } else if (masteryPercentage >= 85 && attemptsCount >= 2) {
    masteryLevel = 4; // Context / Nuance
  } else if (masteryPercentage >= 70) {
    masteryLevel = 3; // Conjugation & Collocation
  } else if (masteryPercentage >= 50) {
    masteryLevel = 2; // Recognition & Fill in Blank
  } else {
    masteryLevel = 1; // Basic Exposure
  }

  // Status transitions
  let status: MasteryStatus = 'LEARNING';
  if (masteryPercentage >= 98 && attemptsCount >= 3 && consecutivePerfects >= 2 && (existingRecord.reviewIntervalDays || 1) >= 4) {
    status = 'PERFECTED';
  } else if (masteryPercentage >= 80 && attemptsCount >= 2) {
    status = 'MASTERED';
  } else if (ratio >= 0.7 || masteryPercentage >= 60) {
    status = 'COMPLETED';
  } else {
    status = 'LEARNING';
  }

  // Spaced repetition interval progression
  let nextIntervalDays = existingRecord.reviewIntervalDays || 1;
  if (isPerfect) {
    const srsIdx = Math.min(SRS_INTERVALS_DAYS.length - 1, consecutivePerfects);
    nextIntervalDays = SRS_INTERVALS_DAYS[srsIdx];
  } else if (ratio < 0.6) {
    nextIntervalDays = 1; // Reset to 1 day if struggling
  } else {
    // Salah sebagian (60%-99%): turun satu anak tangga SRS (minimal 1 hari). Sebelumnya interval
    // dibiarkan (mis. 30 hari) sehingga item yang baru saja salah dijadwalkan ulang sebulan lagi.
    const currentIdx = SRS_INTERVALS_DAYS.findIndex(d => d >= nextIntervalDays);
    const stepDownIdx = Math.max(0, (currentIdx === -1 ? SRS_INTERVALS_DAYS.length - 1 : currentIdx) - 1);
    nextIntervalDays = Math.min(nextIntervalDays, SRS_INTERVALS_DAYS[stepDownIdx]);
  }

  const nextDue = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000).toISOString();

  // Manage weakness flags
  let weaknessFlags = existingRecord.weaknessFlags ? [...existingRecord.weaknessFlags] : [];
  if (mistakesInThisAttempt > 0) {
    if (category === 'bunpou' && !weaknessFlags.includes('conjugation')) {
      weaknessFlags.push('conjugation');
    }
  } else if (isPerfect && weaknessFlags.length > 0) {
    weaknessFlags = weaknessFlags.slice(1);
  }

  return {
    ...existingRecord,
    status,
    masteryPercentage,
    masteryLevel,
    bestScore: bestScoreObj,
    bestScoreAchievedAt,
    attemptsCount,
    writingCount,
    flashcardCount,
    quizCount,
    recallCount: (existingRecord.recallCount || 0) + (source === 'recall' ? 1 : 0),
    consecutivePerfects,
    mistakeCount,
    lastReviewedAt: dateStr,
    nextReviewDue: nextDue,
    reviewIntervalDays: nextIntervalDays,
    decayFactor: 1.0,
    weaknessFlags,
    errorPatterns: existingErrors,
    contextualSuccessCount,
    lastInteraction: { type: effectiveInteraction, source, at: dateStr }
  };
}

/** Dua event identik (jenis + asal sama) dalam jendela ini dianggap satu: re-render / StrictMode / klik ganda. */
const INTERACTION_DEDUPE_MS = 3000;

/**
 * Lightweight Item Interaction Recorder.
 *
 * Memisahkan TIGA hal yang dulu tercampur:
 *  - paparan   ('view')      : materi hanya dibuka. Hanya menambah viewCount; tidak ada skor, mastery, atau SRS.
 *  - latihan   ('writing' / 'flashcard'): dicatat di penghitung masing-masing + waktu terakhir, tetapi TANPA
 *                skor fiktif: bukan percobaan bernilai (attemptsCount tetap), mastery tidak berubah.
 *  - performa  ('quiz')      : jawaban benar/salah yang nyata -> dinilai lewat recordItemAttempt (SRS penuh).
 * Record baru dari paparan/latihan memiliki bestScore 0/0 dan mastery 0: "belum ada hasil", bukan "sudah 90%".
 */
export function recordItemInteraction(
  existingRecord: ItemMasteryRecord | undefined,
  itemId: string,
  category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
  interactionType: 'view' | 'writing' | 'flashcard' | 'quiz',
  success: boolean = true,
  source?: string
): ItemMasteryRecord {
  const now = new Date();
  const dateStr = now.toISOString();

  const last = existingRecord?.lastInteraction;
  // Jawaban kuis adalah hasil nyata (tidak di-dedupe); hanya paparan/latihan ringan yang rawan event ganda.
  if (
    interactionType !== 'quiz' &&
    last &&
    last.type === interactionType &&
    last.source === source &&
    now.getTime() - Date.parse(last.at) >= 0 &&
    now.getTime() - Date.parse(last.at) < INTERACTION_DEDUPE_MS
  ) {
    return existingRecord as ItemMasteryRecord;
  }

  if (interactionType === 'quiz') {
    return recordItemAttempt(existingRecord, itemId, category, success ? 1 : 0, 1, undefined, false, 'quiz', source);
  }

  const lastInteraction = { type: interactionType, source, at: dateStr } as const;
  const isPractice = interactionType !== 'view';

  if (!existingRecord) {
    const interval = 1;
    return {
      itemId,
      category,
      status: 'LEARNING',
      masteryPercentage: 0,
      masteryLevel: 1,
      bestScore: { score: 0, total: 0 },
      bestScoreAchievedAt: dateStr,
      attemptsCount: 0,
      writingCount: interactionType === 'writing' ? 1 : 0,
      flashcardCount: interactionType === 'flashcard' ? 1 : 0,
      quizCount: 0,
      viewCount: interactionType === 'view' ? 1 : 0,
      consecutivePerfects: 0,
      mistakeCount: isPractice && !success ? 1 : 0,
      lastReviewedAt: dateStr,
      nextReviewDue: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString(),
      reviewIntervalDays: interval,
      decayFactor: 1.0,
      contextualSuccessCount: 0,
      lastInteraction
    };
  }

  if (!isPractice) {
    // Paparan murni: jangan sentuh jadwal SRS / skor / waktu review.
    return { ...existingRecord, viewCount: (existingRecord.viewCount || 0) + 1, lastInteraction };
  }

  return {
    ...existingRecord,
    writingCount: (existingRecord.writingCount || 0) + (interactionType === 'writing' ? 1 : 0),
    flashcardCount: (existingRecord.flashcardCount || 0) + (interactionType === 'flashcard' ? 1 : 0),
    mistakeCount: success ? existingRecord.mistakeCount : (existingRecord.mistakeCount || 0) + 1,
    consecutivePerfects: success ? existingRecord.consecutivePerfects : 0,
    lastReviewedAt: dateStr,
    lastInteraction
  };
}

/** Pernah berlatih sungguhan (menulis / flashcard / kuis / jawaban bernilai), bukan sekadar membuka materi. */
export function hasPracticed(r: ItemMasteryRecord): boolean {
  return (r.writingCount || 0) + (r.flashcardCount || 0) + (r.quizCount || 0) + (r.attemptsCount || 0) > 0;
}

/**
 * Sudah pernah DIUJI (kuis atau sesi Recall dengan engine apa pun)? Record lama tanpa penghitung `quizCount` dianggap sudah
 * diuji supaya tidak membanjiri antrean; record baru selalu punya `quizCount` (0 = belum diuji).
 */
export function hasBeenRecallTested(r: ItemMasteryRecord): boolean {
  return r.quizCount === undefined || r.quizCount > 0 || (r.recallCount || 0) > 0;
}

/**
 * Intelligent Language Profile & Weakness Analyzer ("Your Language Profile")
 * Breaks down capabilities into 5 Pillars and granular sub-skills
 */
export function calculateLanguageProfile(
  itemMastery: Record<string, ItemMasteryRecord> = {}
): LanguageProfile {
  const records = Object.values(itemMastery);

  if (records.length === 0) {
    return {
      overallPercentage: 0,
      pillars: {
        bunpou: { percentage: 0, label: 'Tata Bahasa (文法)', subSkills: [] },
        kotoba: { percentage: 0, label: 'Kosakata (語彙)', subSkills: [] },
        kanji: { percentage: 0, label: 'Kanji (漢字)', subSkills: [] },
        dokkai: { percentage: 0, label: 'Membaca (読解)', subSkills: [] },
        choukai: { percentage: 0, label: 'Mendengar (聴解)', subSkills: [] },
      },
      criticalWeaknesses: [],
      tutorSummary: 'Tutor: Belum ada data pembelajaran. Ayo selesaikan stage untuk mendapatkan analisis kemampuanmu!'
    };
  }

  // Helper to compute sub-skill score
  const getSubSkillPercentage = (filterFn: (r: ItemMasteryRecord) => boolean, defaultPct: number = 75) => {
    const matched = records.filter(filterFn);
    if (matched.length === 0) return defaultPct;
    const sum = matched.reduce((acc, curr) => acc + curr.masteryPercentage, 0);
    return Math.round(sum / matched.length);
  };

  // 1. BUNPOU SUB-SKILLS
  const passivePct = getSubSkillPercentage(r => r.category === 'bunpou' && (r.itemId.includes('001') || r.itemId.includes('passive') || (r.weaknessFlags || []).includes('ukemi_passive')), 68);
  const causativePct = getSubSkillPercentage(r => r.category === 'bunpou' && (r.itemId.includes('002') || r.itemId.includes('causative')), 82);
  const teFormPct = getSubSkillPercentage(r => r.category === 'bunpou' && (r.itemId.includes('003') || r.itemId.includes('te')), 92);
  const conditionalsPct = getSubSkillPercentage(r => r.category === 'bunpou' && r.itemId.includes('004'), 74);
  const particlesPct = getSubSkillPercentage(r => r.category === 'bunpou' && r.itemId.includes('005'), 70);

  const bunpouSubSkills: SubSkillRating[] = [
    {
      name: 'Bentuk Pasif (受身形)',
      japaneseName: '受身形',
      category: 'bunpou',
      percentage: passivePct,
      status: passivePct < 70 ? 'CRITICAL_WEAKNESS' : passivePct < 85 ? 'NEEDS_PRACTICE' : 'OPTIMAL',
      recentMistakeNotes: passivePct < 75 ? ['Sering tertukar antara pasif langsung dan pasif penderitaan (迷惑の受身).'] : []
    },
    {
      name: 'Bentuk Kausatif (使役形)',
      japaneseName: '使役形',
      category: 'bunpou',
      percentage: causativePct,
      status: causativePct < 70 ? 'CRITICAL_WEAKNESS' : causativePct < 85 ? 'NEEDS_PRACTICE' : 'OPTIMAL'
    },
    {
      name: 'Bentuk-Te & Verba Bantu (て形・補助動詞)',
      japaneseName: 'て形・補助動詞',
      category: 'bunpou',
      percentage: teFormPct,
      status: teFormPct < 70 ? 'CRITICAL_WEAKNESS' : 'OPTIMAL'
    },
    {
      name: 'Bentuk Pengandaian (ば・たら・なら)',
      japaneseName: '条件形',
      category: 'bunpou',
      percentage: conditionalsPct,
      status: conditionalsPct < 70 ? 'CRITICAL_WEAKNESS' : conditionalsPct < 85 ? 'NEEDS_PRACTICE' : 'OPTIMAL'
    },
    {
      name: 'Partikel & Struktur Kalimat (助詞・構文)',
      japaneseName: '助詞・構文',
      category: 'bunpou',
      percentage: particlesPct,
      status: particlesPct < 70 ? 'CRITICAL_WEAKNESS' : particlesPct < 85 ? 'NEEDS_PRACTICE' : 'OPTIMAL'
    }
  ];

  const bunpouAvg = Math.round(bunpouSubSkills.reduce((a, b) => a + b.percentage, 0) / bunpouSubSkills.length);

  // 2. KOTOBA SUB-SKILLS
  const nounsVerbsPct = getSubSkillPercentage(r => r.category === 'kotoba' && !r.itemId.includes('adj'), 86);
  const adjectivesPct = getSubSkillPercentage(r => r.category === 'kotoba' && r.itemId.includes('adj'), 80);
  const collocationsPct = getSubSkillPercentage(r => r.category === 'kotoba' && r.itemId.includes('colloc'), 78);

  const kotobaSubSkills: SubSkillRating[] = [
    {
      name: 'Kata Benda & Kata Kerja Aksi (名詞・動詞)',
      japaneseName: '名詞・動詞',
      category: 'kotoba',
      percentage: nounsVerbsPct,
      status: nounsVerbsPct < 70 ? 'NEEDS_PRACTICE' : 'OPTIMAL'
    },
    {
      name: 'Kata Sifat & Kata Keterangan (形容詞・副詞)',
      japaneseName: '形容詞・副詞',
      category: 'kotoba',
      percentage: adjectivesPct,
      status: adjectivesPct < 70 ? 'NEEDS_PRACTICE' : 'OPTIMAL'
    },
    {
      name: 'Kolokasi & Ungkapan Idiom (連語・慣用表現)',
      japaneseName: '連語・慣用表現',
      category: 'kotoba',
      percentage: collocationsPct,
      status: collocationsPct < 70 ? 'CRITICAL_WEAKNESS' : 'OPTIMAL'
    }
  ];

  const kotobaAvg = Math.round(kotobaSubSkills.reduce((a, b) => a + b.percentage, 0) / kotobaSubSkills.length);

  // 3. KANJI SUB-SKILLS
  const kanjiReadingPct = getSubSkillPercentage(r => r.category === 'kanji' && (r.errorPatterns || []).some(e => e.errorType === 'KANJI_READING_MISMATCH'), 79);
  const kanjiWritingPct = getSubSkillPercentage(r => r.category === 'kanji' && r.itemId.includes('write'), 64);
  const kanjiRecognitionPct = getSubSkillPercentage(r => r.category === 'kanji', 88);

  const kanjiSubSkills: SubSkillRating[] = [
    {
      name: 'Pelafalan Kanji (音読み・訓読み)',
      japaneseName: '音読み・訓読み',
      category: 'kanji',
      percentage: kanjiReadingPct,
      status: kanjiReadingPct < 70 ? 'CRITICAL_WEAKNESS' : 'OPTIMAL'
    },
    {
      name: 'Radikal & Struktur Kanji (部首・構成)',
      japaneseName: '部首・書き分け',
      category: 'kanji',
      percentage: kanjiWritingPct,
      status: kanjiWritingPct < 70 ? 'CRITICAL_WEAKNESS' : 'NEEDS_PRACTICE',
      recentMistakeNotes: kanjiWritingPct < 70 ? ['Kerap keliru membedakan kanji dengan radikal tangan 扌 vs air 氵.'] : []
    },
    {
      name: 'Pengenalan Kontekstual (文脈認識)',
      japaneseName: '文脈認識',
      category: 'kanji',
      percentage: kanjiRecognitionPct,
      status: 'OPTIMAL'
    }
  ];

  const kanjiAvg = Math.round(kanjiSubSkills.reduce((a, b) => a + b.percentage, 0) / kanjiSubSkills.length);

  // 4. DOKKAI SUB-SKILLS
  const dokkaiMainIdeaPct = getSubSkillPercentage(r => r.category === 'dokkai' && r.itemId.includes('main'), 82);
  const dokkaiDetailPct = getSubSkillPercentage(r => r.category === 'dokkai' && r.itemId.includes('detail'), 75);
  const dokkaiInferencePct = getSubSkillPercentage(r => r.category === 'dokkai', 71);

  const dokkaiSubSkills: SubSkillRating[] = [
    {
      name: 'Pemahaman Gagasan Utama (主旨把握)',
      japaneseName: '主旨把握',
      category: 'dokkai',
      percentage: dokkaiMainIdeaPct,
      status: 'OPTIMAL'
    },
    {
      name: 'Pencarian Informasi Detail (情報検索)',
      japaneseName: '情報検索',
      category: 'dokkai',
      percentage: dokkaiDetailPct,
      status: 'STABLE'
    },
    {
      name: 'Inferensi Kontekstual (推論・文脈把握)',
      japaneseName: '推論・文脈',
      category: 'dokkai',
      percentage: dokkaiInferencePct,
      status: dokkaiInferencePct < 70 ? 'CRITICAL_WEAKNESS' : 'NEEDS_PRACTICE'
    }
  ];

  const dokkaiAvg = Math.round(dokkaiSubSkills.reduce((a, b) => a + b.percentage, 0) / dokkaiSubSkills.length);

  // 5. CHOUKAI SUB-SKILLS
  const choukaiKeywordsPct = getSubSkillPercentage(r => r.category === 'choukai' && r.itemId.includes('kw'), 65);
  const choukaiIntentionPct = getSubSkillPercentage(r => r.category === 'choukai', 58);

  const choukaiSubSkills: SubSkillRating[] = [
    {
      name: 'Deteksi Frasa Kunci (重要語句)',
      japaneseName: '重要語句聞き取り',
      category: 'choukai',
      percentage: choukaiKeywordsPct,
      status: choukaiKeywordsPct < 70 ? 'CRITICAL_WEAKNESS' : 'NEEDS_PRACTICE'
    },
    {
      name: 'Intensi Pembicara & Ringkasan (話者の意図)',
      japaneseName: '意図理解・要約',
      category: 'choukai',
      percentage: choukaiIntentionPct,
      status: 'CRITICAL_WEAKNESS',
      recentMistakeNotes: choukaiIntentionPct < 70 ? ['Terkecoh kata penjebak di awal dialog sebelum keputusan akhir diumumkan.'] : []
    }
  ];

  const choukaiAvg = Math.round(choukaiSubSkills.reduce((a, b) => a + b.percentage, 0) / choukaiSubSkills.length);

  // Overall Global Weighted Average
  const overallPercentage = Math.round(
    (bunpouAvg * 0.28) +
    (kotobaAvg * 0.22) +
    (kanjiAvg * 0.18) +
    (dokkaiAvg * 0.20) +
    (choukaiAvg * 0.12)
  );

  // Extract Critical Weaknesses
  const criticalWeaknesses: LanguageProfile['criticalWeaknesses'] = [];
  if (passivePct < 75) {
    criticalWeaknesses.push({
      category: 'bunpou',
      title: 'Konstruksi Pasif (受身形)',
      subSkill: 'Passive Conjugation',
      severity: 'critical',
      advice: 'Kamu memahami rumus dasar pasif, namun sering keliru menentukan subjek pelaku tindakan dalam kalimat panjang.',
      targetItemId: 'bunpou_001'
    });
  }
  if (kanjiWritingPct < 70) {
    criticalWeaknesses.push({
      category: 'kanji',
      title: 'Pembedaan Radikal Visual Kanji',
      subSkill: 'Radicals & Writing',
      severity: 'warning',
      advice: 'Fokus pada radikal sebelah kiri (扌tangan vs 氵air) saat membaca kata majemuk.'
    });
  }
  if (choukaiIntentionPct < 70) {
    criticalWeaknesses.push({
      category: 'choukai',
      title: 'Penjebak Percakapan Choukai',
      subSkill: 'Speaker Intention',
      severity: 'critical',
      advice: 'Dengarkan percakapan sampai tuntas karena kata sambung di akhir sering membalikkan keputusan awal.'
    });
  }

  // Personal Tutor Summary
  let tutorSummary = 'Profil kemampuanmu berkembang seimbang. Terus pertahankan ritme belajar harian!';
  if (criticalWeaknesses.length > 0) {
    const mainWeak = criticalWeaknesses[0];
    tutorSummary = `Perhatian Tutor: Kemampuan Kosakata (${kotobaAvg}%) dan Membaca (${dokkaiAvg}%) sangat solid, namun kamu memerlukan penguatan khusus pada ${mainWeak.title}. Jalankan sesi Recall untuk memperbaikinya.`;
  }

  return {
    overallPercentage,
    pillars: {
      bunpou: { percentage: bunpouAvg, label: 'Tata Bahasa (Bunpou)', subSkills: bunpouSubSkills },
      kotoba: { percentage: kotobaAvg, label: 'Kosakata (Kotoba)', subSkills: kotobaSubSkills },
      kanji: { percentage: kanjiAvg, label: 'Karakter Kanji', subSkills: kanjiSubSkills },
      dokkai: { percentage: dokkaiAvg, label: 'Pemahaman Bacaan (Dokkai)', subSkills: dokkaiSubSkills },
      choukai: { percentage: choukaiAvg, label: 'Pendengaran (Choukai)', subSkills: choukaiSubSkills },
    },
    criticalWeaknesses,
    tutorSummary
  };
}

/**
 * TRUE MASTERY 4-DIMENSIONAL ENGINE:
 * Distinguishes Skill Acquisition (Bunpou/Kotoba/Kanji) vs Skill Application (Dokkai/Choukai)
 * Formula: Knowledge (20%) + Recognition (25%) + Application (35%) + Retention (20%)
 */
function calculateItemTrueMastery(
  record: ItemMasteryRecord,
  _allRecords: Record<string, ItemMasteryRecord> = {}
): TrueMasteryBreakdown {
  let title = record.itemId;
  if (record.category === 'bunpou' && BUNPOU_DATABASE[record.itemId]) {
    title = BUNPOU_DATABASE[record.itemId].title;
  } else if (record.category === 'kotoba' && KOTOBA_DATABASE[record.itemId]) {
    title = `${KOTOBA_DATABASE[record.itemId].word} (${KOTOBA_DATABASE[record.itemId].reading})`;
  } else if (record.category === 'kanji' && KANJI_DATABASE[record.itemId]) {
    title = `${KANJI_DATABASE[record.itemId].character}`;
  } else if (record.category === 'dokkai' && DOKKAI_DATABASE[record.itemId]) {
    title = DOKKAI_DATABASE[record.itemId].title;
  }

  // 1. Knowledge (Teori & Formula Familiarity): 0 - 100%
  const knowledge = Math.min(100, (record.attemptsCount > 0 ? 60 : 20) + (record.bestScore.total > 0 ? 30 : 0) + 10);

  // 2. Recognition (Multiple Choice Quiz Accuracy): 0 - 100%
  const recognitionRatio = record.bestScore.total > 0 ? record.bestScore.score / record.bestScore.total : 0;
  const recognition = Math.round(recognitionRatio * 100);

  // 3. Application (Evidence from Dokkai Context & Boss Battles): 0 - 100%
  let application = 70;
  if (record.weaknessFlags?.includes('dokkai_context_fail')) {
    application = Math.max(30, 50 - record.mistakeCount * 10);
  } else if (record.contextualSuccessCount && record.contextualSuccessCount > 0) {
    application = Math.min(100, 75 + record.contextualSuccessCount * 10);
  } else if (record.consecutivePerfects >= 2) {
    application = 85;
  }

  // 4. Retention (SRS Decay & Long-term Stability): 0 - 100%
  const retention = Math.min(
    100,
    Math.max(
      20,
      Math.round(
        (record.decayFactor || 1.0) * 100 -
        (record.mistakeCount * 7) +
        (record.consecutivePerfects * 8) +
        (record.reviewIntervalDays > 7 ? 15 : 0)
      )
    )
  );

  // Weighted True Mastery Index
  const trueMastery = Math.round(
    knowledge * 0.20 +
    recognition * 0.25 +
    application * 0.35 +
    retention * 0.20
  );

  // Determine Level Tier (1 to 5)
  let levelTier: MasteryDifficultyLevel = 1;
  if (trueMastery >= 90 && application >= 85) levelTier = 5;
  else if (trueMastery >= 75) levelTier = 4;
  else if (trueMastery >= 60) levelTier = 3;
  else if (trueMastery >= 40) levelTier = 2;
  else levelTier = 1;

  // Diagnostic Status Label
  let statusLabel = 'Dalam Pembelajaran';
  if (knowledge >= 85 && application < 65) {
    statusLabel = 'Tahu Rumus, Namun Belum Terbiasa di Dokkai';
  } else if (trueMastery >= 90) {
    statusLabel = 'Penguasaan Sejati (Siap Produksi Kalimat)';
  } else if (trueMastery >= 75) {
    statusLabel = 'Kompeten dalam Konteks Kalimat';
  } else if (record.mistakeCount >= 3) {
    statusLabel = 'Titik Lemah Kritis (Sering Tertukar)';
  } else if (retention < 60) {
    statusLabel = 'Memori Mulai Memudar (Perlu SRS)';
  }

  return {
    itemId: record.itemId,
    category: record.category,
    title,
    knowledge,
    recognition,
    application,
    retention,
    trueMastery,
    statusLabel,
    levelTier
  };
}

// Kolam pengecoh per (JLPT, jenis kata), dibangun sekali; antrean Recall dihitung ulang tiap stats berubah.
let kotobaPools: Map<string, KotobaItem[]> | null = null;
function getKotobaPool(key: string): KotobaItem[] {
  if (!kotobaPools) {
    kotobaPools = new Map();
    for (const k of Object.values(KOTOBA_DATABASE)) {
      if (!k || !k.word || !k.meaningId) continue;
      const poolKey = `${k.jlpt}|${k.wordType}`;
      const list = kotobaPools.get(poolKey);
      if (list) list.push(k); else kotobaPools.set(poolKey, [k]);
    }
  }
  return kotobaPools.get(key) || [];
}

/** Pengecoh nyata: kosakata lain yang sejenis (JLPT + jenis kata sama), bukan teks statis tak terkait. */
function pickKotobaDistractors(target: KotobaItem, count: number): KotobaItem[] {
  const pool = getKotobaPool(`${target.jlpt}|${target.wordType}`);
  const picked: KotobaItem[] = [];
  const seenWords = new Set([target.word]);
  const seenMeanings = new Set([target.meaningId]);
  const maxTries = Math.min(pool.length, 60);
  for (let i = 0; i < maxTries && picked.length < count; i++) {
    const cand = pool[Math.floor(Math.random() * pool.length)];
    if (seenWords.has(cand.word) || seenMeanings.has(cand.meaningId)) continue;
    seenWords.add(cand.word);
    seenMeanings.add(cand.meaningId);
    picked.push(cand);
  }
  return picked;
}

/**
 * 5-TIER ADAPTIVE QUESTION GENERATOR:
 * Level 1: Pattern / Meaning Recognition
 * Level 2: Fill-in-the-blank (Particle / Basic verb form)
 * Level 3: Conjugation Transformation
 * Level 4: Context Selection / Nuance Distractors
 * Level 5: Interactive Sentence Production (Arrange Word Scramble)
 */
function generateAdaptiveQuestion(
  item: RecallQueueItem,
  level: MasteryDifficultyLevel,
  engine?: 'listening' | null
): Question {
  const itemId = item.itemId;
  // Mode pilihan ganda/engine non-susun-kalimat: tidak boleh memakai tampilan Level 5 (susun kalimat).
  const mcqLevel = (Math.min(level, 4)) as MasteryDifficultyLevel;

  // 1. Bunpou Adaptive Questions
  if (item.category === 'bunpou') {
    const bp = BUNPOU_DATABASE[itemId];
    if (bp) {
      if (level === 5) {
        // Level 5: Sentence Production
        const ex = bp.examples[0] || {
          japanese: '私は先生に褒められた。',
          reading: 'わたしは せんせいに ほめられた。',
          meaningId: 'Saya dipuji oleh guru.'
        };
        const words = ex.japanese.endsWith('。')
          ? ex.japanese.slice(0, -1).split(/(?<=[はにをでが]|ました|られた|ておく|てしまう)/)
          : ex.japanese.split(/(?<=[はにをでが])/);
        const filteredWords = words.filter(w => w.length > 0);
        const scrambled = fisherYatesShuffle(filteredWords);

        return {
          id: `rc_lv5_${itemId}`,
          prompt: `【Level 5: Sentence Production】\nSusun kata-kata berikut agar membentuk kalimat tata bahasa 「${bp.title}」 dengan arti:\n"${ex.meaningId}"`,
          options: [
            ex.japanese,
            scrambled.slice().reverse().join(''),
            scrambled.join(''),
            `山田さんは${ex.japanese}`
          ],
          correctIndex: 0,
          difficultyLevel: 5,
          scrambleWords: scrambled,
          orderedTarget: filteredWords,
          explanation: `Urutan yang tepat: 「${ex.japanese}」 (${ex.meaningId}). Pola: ${bp.formula}`
        };
      }

      if (level === 3) {
        // Level 3: Conjugation
        return {
          id: `rc_lv3_${itemId}`,
          prompt: `【Level 3: Conjugation】\nBagaimanakah perubahan bentuk kata kerja yang tepat untuk menerapkan pola 「${bp.title}」?`,
          options: [
            bp.formula,
            'Kata kerja bentuk Kamus + ない',
            'Kata kerja bentuk ます + たい',
            'Kata benda + のみ'
          ],
          correctIndex: 0,
          difficultyLevel: 3,
          explanation: `Rumus konjugasi 「${bp.title}」 adalah: ${bp.formula}`
        };
      }

      if (level === 4) {
        // Level 4: Context / Nuance
        const q4 = bp.questions?.find(q => q.contextTag?.includes('nuance')) || bp.questions?.[bp.questions.length - 1] || bp.questions?.[0];
        if (q4) {
          return {
            ...q4,
            prompt: `【Level 4: Context & Nuance】\n${q4.prompt}`,
            difficultyLevel: 4
          };
        }
      }

      // Default Level 1 or 2: Use existing curated questions if available
      const baseQ = bp.questions?.[0];
      if (baseQ) {
        return {
          ...baseQ,
          prompt: `【Level ${level}: ${level === 1 ? 'Pattern Recognition' : 'Fill Blank'}】\n${baseQ.prompt}`,
          difficultyLevel: level
        };
      }

      // Fallback: Generate from example or title when bp.questions is undefined
      const ex = bp.examples?.[0];
      if (ex) {
        const patternTitle = bp.title.split(/[(（＋／]/)[0].trim().replace(/^[〜~]/, '');
        const prompt = ex.japanese.includes(patternTitle)
          ? ex.japanese.replace(patternTitle, '（　）')
          : ex.japanese;
        return {
          id: `rc_gen_bp_${itemId}`,
          prompt: `【Level ${level}: Pola Tata Bahasa】\nLengkapilah kalimat berikut agar sesuai dengan pola 「${bp.title}」:\n${prompt}\n(Arti: ${ex.meaningId})`,
          options: [
            patternTitle || bp.title,
            '〜わけではない',
            '〜はずがない',
            '〜に違いない'
          ],
          correctIndex: 0,
          difficultyLevel: level,
          explanation: `Pola 「${bp.title}」 (${bp.meaningId}): ${ex.japanese}`
        };
      }
    }
  }

  // 2. Kotoba Adaptive Questions
  if (item.category === 'kotoba') {
    const kt = KOTOBA_DATABASE[itemId];
    if (kt) {
      const wrongWords = pickKotobaDistractors(kt, 3);
      const rec = item.masteryRecord;

      // Engine LISTENING: dengar bacaan kata (tanpa melihat tulisannya), pilih artinya.
      if (engine === 'listening' && kt.reading && wrongWords.length === 3) {
        const spoken = kt.reading.split(/[/／、,]/)[0].trim();
        const options = fisherYatesShuffle([kt.meaningId, ...wrongWords.map(w => w.meaningId)]);
        return {
          id: `rc_ls_${kt.id}`,
          prompt: `【Listening】\nDengarkan kosakata berikut, lalu pilih artinya yang tepat. (Tekan ikon speaker untuk memutar ulang.)`,
          audioPrompt: spoken,
          options,
          correctIndex: options.indexOf(kt.meaningId),
          difficultyLevel: mcqLevel,
          explanation: `Yang diucapkan: 「${kt.word}」 (${kt.reading}) = ${kt.meaningId}.`
        };
      }

      // Dilatih lewat menulis (dan belum naik ke level konteks): uji ingatan penulisannya.
      if (level < 4 && (rec?.writingCount || 0) > 0 && kt.reading && wrongWords.length === 3) {
        const options = fisherYatesShuffle([kt.word, ...wrongWords.map(w => w.word)]);
        return {
          id: `rc_wr_${kt.id}`,
          prompt: `【Level ${level}: Writing Recall】\nBagaimana cara menulis kosakata 「${kt.reading}」 (${kt.meaningId}) dengan benar?`,
          options,
          correctIndex: options.indexOf(kt.word),
          difficultyLevel: level,
          explanation: `Penulisan yang benar: 「${kt.word}」 (${kt.reading}) = ${kt.meaningId}.`
        };
      }

      if (level >= 4 && kt.exampleSentence && kt.exampleSentence.japanese.includes(kt.word) && wrongWords.length === 3) {
        const options = fisherYatesShuffle([kt.word, ...wrongWords.map(w => w.word)]);
        const correctIndex = options.indexOf(kt.word);
        return {
          id: `rc_lv4_${kt.id}`,
          prompt: `【Level 4: Context Collocation】\nLengkapilah kalimat berikut dengan kosakata yang tepat:\n「${kt.exampleSentence.japanese.replace(kt.word, '（　？　）')}」\n(Arti: ${kt.exampleSentence.meaningId})`,
          options,
          correctIndex,
          difficultyLevel: 4,
          explanation: `Jawaban tepat adalah 「${kt.word}」 (${kt.reading}): ${kt.meaningId}. Kalimat lengkap: ${kt.exampleSentence.japanese}`
        };
      }

      const fallbackMeanings = [
        'Melakukan perjalanan dinas ke luar kota',
        'Menyimpan barang untuk persiapan masa depan',
        'Menolak tawaran secara halus'
      ];
      const wrongMeanings = wrongWords.length === 3 ? wrongWords.map(w => w.meaningId) : fallbackMeanings;
      const options = fisherYatesShuffle([kt.meaningId, ...wrongMeanings]);
      const correctIndex = options.indexOf(kt.meaningId);
      return {
        id: `rc_lv1_${kt.id}`,
        prompt: `【Level ${level}: Kosakata】\nApa arti yang tepat untuk kosakata 「${kt.word}」 (${kt.reading})?`,
        options,
        correctIndex,
        difficultyLevel: level,
        explanation: `Kosakata 「${kt.word}」 (${kt.reading}) bermakna: ${kt.meaningId}`
      };
    }
  }

  // 3. Kanji Adaptive Questions
  if (item.category === 'kanji') {
    const kj = KANJI_DATABASE[itemId];
    if (kj && kj.questions && kj.questions.length > 0) {
      const q = kj.questions[0];
      return {
        ...q,
        prompt: `【Level ${level}: Kanji】\n${q.prompt}`,
        difficultyLevel: mcqLevel
      };
    }
    if (kj && kj.meaningId) {
      // Kanji tanpa soal kurasi: uji arti dengan pengecoh dari kanji lain, bukan teks statis.
      const others = Object.values(KANJI_DATABASE)
        .filter(k => k && k.character !== kj.character && k.meaningId && k.meaningId !== kj.meaningId);
      const wrong: string[] = [];
      for (let i = 0; i < 40 && wrong.length < 3 && others.length > 0; i++) {
        const m = others[Math.floor(Math.random() * others.length)].meaningId;
        if (!wrong.includes(m)) wrong.push(m);
      }
      if (wrong.length === 3) {
        const options = fisherYatesShuffle([kj.meaningId, ...wrong]);
        return {
          id: `rc_kj_${kj.id}`,
          prompt: `【Level ${level}: Kanji】\nApa arti kanji 「${kj.character}」?`,
          options,
          correctIndex: options.indexOf(kj.meaningId),
          difficultyLevel: level,
          explanation: `Kanji 「${kj.character}」 bermakna: ${kj.meaningId}.`
        };
      }
    }
  }

  // 4. Dokkai (bacaan): satu soal kurasi dari wacana; wacana ditampilkan UI, soal bergilir tiap giliran.
  if (item.category === 'dokkai') {
    const dk = DOKKAI_DATABASE[itemId];
    if (dk && dk.questions?.length) {
      const q = dk.questions[(item.masteryRecord?.attemptsCount || 0) % dk.questions.length];
      return { ...q, prompt: `【Dokkai: ${dk.title}】\n${q.prompt}`, difficultyLevel: mcqLevel };
    }
  }

  // 5. Choukai (mendengar): audio diputar UI, transkrip disembunyikan sampai dijawab.
  if (item.category === 'choukai') {
    const ck = CHOUKAI_DATABASE[itemId];
    if (ck && ck.questions?.length) {
      const q = ck.questions[(item.masteryRecord?.attemptsCount || 0) % ck.questions.length];
      return { ...q, prompt: `【Choukai】\n${q.prompt}`, audioPrompt: ck.audioText, difficultyLevel: mcqLevel };
    }
  }

  // Fallback default question
  return {
    id: `rc_gen_${itemId}`,
    prompt: `【Level ${level}】 Manakah penggunaan yang tepat untuk materi 「${item.title}」?`,
    options: [
      item.subtitle || 'Pilihan arti yang tepat',
      'Bukan pola yang sesuai konteks ini',
      'Bentuk tata bahasa lampau yang salah',
      'Bentuk kebalikan dari kalimat utama'
    ],
    correctIndex: 0,
    difficultyLevel: level,
    explanation: `${item.title}: ${item.subtitle}`
  };
}

/**
 * Pilih ENGINE latihan Recall yang sesuai cara materi itu dipelajari, bukan selalu pilihan ganda:
 *  - canvas    : kotoba/kanji yang pernah ditulis -> kanvas menulis (KanjiWritingCanvas / KotobaWritingPractice)
 *  - lainnya   : soal pilihan ganda / susun kalimat (null = pakai format soal hasil generateAdaptiveQuestion)
 * Tidak ada engine "balik kartu lalu nilai diri sendiri": hasil Recall menggerakkan mastery & jadwal SRS, jadi harus
 * berasal dari jawaban yang bisa dinilai (data), bukan pengakuan ingat / lupa. Materi yang dipelajari lewat
 * flashcard diuji dengan soal arti/konteks.
 * Belum diuji -> mengikuti cara berlatihnya; sudah diuji -> bergantian engine tiap sesi (attemptsCount genap/ganjil)
 * supaya ingatan diuji dari beberapa sisi. Level >= 4 (konteks/produksi kalimat) tetap soal.
 */
export function selectRecallEngine(item: Pick<RecallQueueItem, 'category' | 'itemId' | 'difficultyLevel' | 'masteryRecord'>): 'fusion' | 'conjugation' | 'canvas' | 'listening' | null {
  const r = item.masteryRecord;
  if (!r) return null;

  // Bunpou dengan pola "V<bentuk> ＋ akhiran": Grammar Fusion (produksi) dan konjugasi (bentuk yang dituntut pola).
  if (item.category === 'bunpou' && BUNPOU_DATABASE[item.itemId]) {
    const pattern = getFusionPatternForBunpou(item.itemId);
    if (pattern) {
      const turn = r.attemptsCount || 0;
      const canConj = pattern.requiredConjugation !== 'jisho';
      // Urutan bergantian per sesi; 'null' = soal pilihan ganda kurasi bunpou.
      const seq: Array<'fusion' | 'conjugation' | null> = ['fusion'];
      if (canConj) seq.push('conjugation');
      seq.push(null);
      if (!hasBeenRecallTested(r)) return 'fusion';
      return seq[turn % seq.length];
    }
  }
  if (item.difficultyLevel >= 4) return null;
  const canWrite = (item.category === 'kotoba' && !!KOTOBA_DATABASE[item.itemId]) ||
    (item.category === 'kanji' && !!KANJI_DATABASE[item.itemId]);
  const wrote = (r.writingCount || 0) > 0 && canWrite;
  if (!hasBeenRecallTested(r)) return wrote ? 'canvas' : null;
  // Sudah diuji: bergantian antar engine yang cocok; null = soal pilihan ganda/konteks.
  const rotation: Array<'canvas' | 'listening' | null> = [];
  if (wrote) rotation.push('canvas');
  const kt = item.category === 'kotoba' ? KOTOBA_DATABASE[item.itemId] : undefined;
  if (kt?.reading) rotation.push('listening');
  if (rotation.length === 0) return null;
  rotation.push(null);
  return rotation[(r.attemptsCount || 0) % rotation.length];
}

// Waktu ISO record di-parse sekali per objek record: record tidak pernah diubah di tempat (pembaruan selalu membuat
// objek baru), sedangkan antrean dibangun ulang dari seluruh riwayat setiap kali ada jawaban.
const recordTimes = new WeakMap<ItemMasteryRecord, { due: number; reviewed: number }>();
function recordTimesOf(r: ItemMasteryRecord): { due: number; reviewed: number } {
  let t = recordTimes.get(r);
  if (!t) {
    t = { due: new Date(r.nextReviewDue).getTime(), reviewed: new Date(r.lastReviewedAt).getTime() };
    recordTimes.set(r, t);
  }
  return t;
}

interface RecallCandidate {
  item: RecallQueueItem;
  /** Waktu tinjau terakhir (ms), di-parse sekali per item, bukan di tiap perbandingan sort. */
  reviewedAt: number;
}

/** Urutan stabil saat urgensi sama: yang paling lama tidak disentuh dulu, lalu ID. Tidak bergantung urutan penyisipan. */
function compareRecallPriority(a: RecallCandidate, b: RecallCandidate): number {
  if (b.item.urgencyScore !== a.item.urgencyScore) return b.item.urgencyScore - a.item.urgencyScore;
  if (a.reviewedAt !== b.reviewedAt) return a.reviewedAt - b.reviewedAt;
  return a.item.itemId < b.item.itemId ? -1 : a.item.itemId > b.item.itemId ? 1 : 0;
}

function resolveRecallLabels(r: ItemMasteryRecord, tm?: number): { title: string; subtitle: string } {
  let title = r.itemId;
  let subtitle = tm === undefined ? r.category.toUpperCase() : `${r.category.toUpperCase()} • True Mastery: ${tm}%`;
  if (r.category === 'bunpou') {
    const bp = BUNPOU_DATABASE[r.itemId];
    if (bp) { title = bp.title; subtitle = bp.meaningId; }
  } else if (r.category === 'kotoba') {
    const kt = KOTOBA_DATABASE[r.itemId];
    if (kt) { title = `${kt.word} (${kt.reading})`; subtitle = kt.meaningId; }
  } else if (r.category === 'kanji') {
    const kj = KANJI_DATABASE[r.itemId];
    if (kj) { title = `${kj.character} 【${kj.onyomi.join(', ')}】`; subtitle = kj.meaningId; }
  } else if (r.category === 'dokkai') {
    const dk = DOKKAI_DATABASE[r.itemId];
    if (dk) { title = dk.title; subtitle = dk.category; }
  }
  return { title, subtitle };
}

/**
 * Intelligent Recall Queue builder that prioritizes weak, decayed, and due items
 * Generates clear, personalized Tutor Insights and 4-tier Priority Badges.
 *
 * Sumber data HANYA `itemMastery` (riwayat belajar pemain). Dua kelompok kelayakan:
 *  - SUDAH DIUJI (quizCount > 0 / record lama): aturan mastery + SRS yang ada (CRITICAL/WEAK/REVIEW/MAINTAIN).
 *  - BARU DILATIH, BELUM DIUJI (menulis/flashcard tanpa kuis): masuk antrean sekali sebagai REVIEW tanpa angka
 *    mastery rekaan; setelah dijawab di Recall ia mengikuti jadwal SRS biasa.
 * Materi yang hanya dibuka (paparan) tidak masuk antrean.
 */
export function buildSmartRecallQueue(
  itemMastery: Record<string, ItemMasteryRecord> = {},
  maxItems: number = 30
): RecallQueueItem[] {
  const records = Object.values(itemMastery);
  const now = new Date().getTime();
  const queue: RecallCandidate[] = [];

  for (const r of records) {
    try {
      if (!r || !r.itemId || !hasPracticed(r)) continue;

      const times = recordTimesOf(r);
      const isDue = times.due <= now;
      const daysSinceLastReview = (now - times.reviewed) / (1000 * 60 * 60 * 24);

      let urgencyScore = 0;
      let priorityTier: RecallPriorityTier = 'REVIEW';
      let reason: RecallQueueItem['reason'] = 'SRS_DUE';
      let reasonText = '';
      let tutorInsight = '';
      let tm: number | undefined;
      let levelTier: MasteryDifficultyLevel = 1;

      if (!hasBeenRecallTested(r)) {
        // Belum ada hasil nilai: jangan mengarang mastery/"lemah". Cukup tandai perlu diuji pertama kali.
        priorityTier = 'REVIEW';
        reason = 'NEW_UNTESTED';
        urgencyScore = 85 + Math.min(10, (r.writingCount || 0) * 2 + (r.flashcardCount || 0));
        reasonText = (r.writingCount || 0) > 0
          ? 'Baru berlatih menulis - belum pernah diuji ingatannya'
          : 'Baru dipelajari - belum pernah diuji ingatannya';
        tutorInsight = 'Tutor: Materi ini baru kamu pelajari. Uji ingatanmu sekarang agar jadwal ulangnya (SRS) bisa dihitung dari hasil nyata.';
      } else {
        const trueMasteryBreakdown = calculateItemTrueMastery(r, itemMastery);
        tm = trueMasteryBreakdown.trueMastery;
        levelTier = trueMasteryBreakdown.levelTier;

        // 🔴 1. CRITICAL PRIORITY: Consecutive mistakes or Dokkai Contextual failure
        if (r.weaknessFlags?.includes('dokkai_context_fail') || r.mistakeCount >= 3 || tm < 45) {
          priorityTier = 'CRITICAL';
          urgencyScore = 150 + r.mistakeCount * 10 + (100 - tm);
          reason = r.weaknessFlags?.includes('dokkai_context_fail') ? 'DOKKAI_WEAKNESS' : 'HIGH_MISTAKES';
          reasonText = r.weaknessFlags?.includes('dokkai_context_fail')
            ? `Gagal dalam konteks Dokkai wacana panjang`
            : `Sering keliru (${r.mistakeCount}x salah berturut-turut)`;
          tutorInsight = `Tutor: Titik lemah kritis terdeteksi! Kamu menguasai rumus dasarnya, namun keliru ketika diuji dalam variasi konteks kalimat.`;
        }
        // 🟠 2. WEAK PRIORITY: Low True Mastery (< 70%)
        else if (tm < 70 || r.status === 'LEARNING') {
          priorityTier = 'WEAK';
          urgencyScore = 100 + (100 - tm) + (r.mistakeCount * 5);
          reason = 'LOW_MASTERY';
          reasonText = `True Mastery baru ${tm}% - butuh penguatan`;
          tutorInsight = `Tutor: Masih dalam tahap penguasaan awal. Latih variasi bentuk konjugasi dan partikelnya.`;
        }
        // 🟡 3. REVIEW PRIORITY: SRS Schedule Due Today
        else if (isDue) {
          priorityTier = 'REVIEW';
          urgencyScore = 75 + Math.min(25, Math.floor(daysSinceLastReview) * 2);
          reason = 'SRS_DUE';
          reasonText = `Jadwal tinjau berkala (SRS) untuk mengunci memori`;
          tutorInsight = `Tutor: Waktu tepat mengulang agar materi berpindah ke memori jangka panjang permanen.`;
        }
        // 🟢 4. MAINTAIN PRIORITY: Mastered items checked for retention
        else if (daysSinceLastReview > 5 && r.status !== 'PERFECTED') {
          priorityTier = 'MAINTAIN';
          urgencyScore = 40 + Math.min(30, Math.floor(daysSinceLastReview));
          reason = 'DECAYED';
          reasonText = `Sudah ${Math.floor(daysSinceLastReview)} hari tidak dilatih`;
          tutorInsight = `Tutor: Materi ini sudah kamu kuasai (${tm}%), ulangi sejenak untuk menjaga retensi.`;
        }
      }

      if (urgencyScore > 0) {
        const item: RecallQueueItem = {
          id: `recall_${r.itemId}`,
          itemId: r.itemId,
          category: r.category,
          title: '', // diisi hanya untuk item terpilih (resolveRecallLabels di bawah)
          subtitle: '',
          reason,
          reasonText,
          urgencyScore,
          priorityTier,
          difficultyLevel: levelTier,
          trueMasteryScore: tm,
          tutorInsight,
          masteryRecord: r
        };
        queue.push({ item, reviewedAt: times.reviewed || 0 });
      }
    } catch (err) {
      console.warn('[SmartRecall] Failed to build recall item for record:', r?.itemId, err);
    }
  }

  queue.sort(compareRecallPriority);

  // Label & soal hanya dibuat untuk item yang benar-benar terpilih (bukan seluruh riwayat). Item yang labelnya
  // gagal dibentuk dilewati dan digantikan kandidat berikutnya.
  const top: RecallQueueItem[] = [];
  for (const { item } of queue) {
    if (top.length >= maxItems) break;
    try {
      const labels = resolveRecallLabels(item.masteryRecord!, item.trueMasteryScore);
      item.title = labels.title;
      item.subtitle = labels.subtitle;
      top.push(item);
    } catch (err) {
      console.warn('[SmartRecall] Failed to build recall item for record:', item.itemId, err);
    }
  }

  for (const item of top) {
    try {
      let engine = selectRecallEngine(item);

      if (engine === 'fusion' || engine === 'conjugation') {
        const pattern = getFusionPatternForBunpou(item.itemId);
        const verb = pattern ? pickRecallVerb(pattern) : null;
        if (pattern && verb) {
          item.fusion = { patternId: pattern.id, verb };
          if (engine === 'conjugation') {
            const q = buildConjugationQuestion(pattern, verb, fisherYatesShuffle, Math.min(item.difficultyLevel, 3) as MasteryDifficultyLevel);
            if (q) item.sampleQuestion = q; else engine = null;
          }
        } else {
          engine = null;
        }
      }

      if (!item.sampleQuestion) item.sampleQuestion = generateAdaptiveQuestion(item, item.difficultyLevel, engine === 'listening' ? 'listening' : null);
      if (engine === 'listening' && !item.sampleQuestion.id.startsWith('rc_ls_')) engine = null;
      const sid = item.sampleQuestion.id;
      const readingEngine = item.category === 'dokkai' && DOKKAI_DATABASE[item.itemId] && item.sampleQuestion.prompt.startsWith('【Dokkai')
        ? 'dokkai'
        : item.category === 'choukai' && CHOUKAI_DATABASE[item.itemId] && item.sampleQuestion.prompt.startsWith('【Choukai')
          ? 'choukai' : null;
      item.exerciseFormat = engine || readingEngine || (sid.startsWith('rc_wr_') ? 'writing_recall' : sid.startsWith('rc_lv4_') ? 'context' : sid.startsWith('rc_lv1_') ? 'meaning' : 'curated');
    } catch (err) {
      console.warn('[SmartRecall] Failed to generate question for:', item.itemId, err);
    }
  }
  return top;
}

export function calculateCoverage(stats: PlayerStats) {
  const studyStats = stats.studyStats;
  if (!studyStats) {
    return {
      bunpou: 0,
      kotoba: 0,
      kanji: 0,
      dokkai: 0,
      choukai: 0,
      overall: 0,
      bunpouTotal: Object.keys(BUNPOU_DATABASE).length,
      kotobaTotal: Object.keys(KOTOBA_DATABASE).length,
      kanjiTotal: Object.keys(KANJI_DATABASE).length,
      dokkaiTotal: Object.keys(DOKKAI_DATABASE).length,
      choukaiTotal: Object.keys(CHOUKAI_DATABASE).length,
    };
  }

  const getCov = (uniqueCount: number, total: number) => {
    return total > 0 ? Math.round((Math.min(uniqueCount, total) / total) * 100) : 0;
  };

  const bunpouTotal = Object.keys(BUNPOU_DATABASE).length;
  const kotobaTotal = Object.keys(KOTOBA_DATABASE).length;
  const kanjiTotal = Object.keys(KANJI_DATABASE).length;
  const dokkaiTotal = Object.keys(DOKKAI_DATABASE).length;
  const choukaiTotal = Object.keys(CHOUKAI_DATABASE).length;

  const b = getCov(studyStats.bunpou.uniqueIds.length, bunpouTotal);
  const k = getCov(studyStats.flashcards.uniqueIds.length, kotobaTotal);
  const kj = getCov(studyStats.kanjiWriting.uniqueIds.length, kanjiTotal);
  const d = getCov(studyStats.dokkai.uniqueIds.length, dokkaiTotal);
  const c = getCov(studyStats.choukai.uniqueIds.length, choukaiTotal);

  return {
    bunpou: b,
    kotoba: k,
    kanji: kj,
    dokkai: d,
    choukai: c,
    overall: Math.round((b + k + kj + d + c) / 5),
    bunpouTotal,
    kotobaTotal,
    kanjiTotal,
    dokkaiTotal,
    choukaiTotal,
  };
}
