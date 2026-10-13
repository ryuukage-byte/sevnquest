// ==============================================================================
// GUIDED LEARNING — PERENCANA KURIKULUM (murni, tanpa React)
//
// Definisi sukses kurikulum: menuntaskan MATERI INTI level target dan mempertahankannya (teruji di Recall),
// bukan sekadar menghabiskan jatah harian. Alurnya:
//
//   Target kompetensi   : buildCurriculum()  -> materi inti level target (bukan seluruh Library), terurut prasyarat
//   Analisis gap        : analyzePlan()      -> inti − yang sudah dipelajari = yang masih perlu dipelajari
//   Estimasi beban      : analyzePlan()      -> menit belajar (menurut tingkat kesulitan) + menit pengulangan (SRS)
//   Kelayakan target    : analyzePlan()      -> cukup / belum cukup, durasi & menit yang dibutuhkan
//   Misi harian adaptif : planDay()          -> jatah dari sisa gap ÷ sisa hari, disesuaikan beban Recall & retensi
//   Evaluasi            : planDay()/planOverview() -> evaluasi berkala + cakupan / retensi / penguasaan
//
// Recall tidak diduplikasi di sini: materi yang sudah dipelajari otomatis masuk antrean Recall
// (utils/mastery.buildSmartRecallQueue) dengan engine latihan yang sesuai jenis materinya.
// ==============================================================================

import type { ItemMasteryRecord } from '../../types/content';
import { RECALL_LIMITS, normalizeRecallDaily, type RecallDaily } from '../recall/session';
import type {
  CategoryAnalysis, CategoryCount, Curriculum, CurriculumSources, DailyQuota, DayNote, GuidedCategory, GuidedDay,
  GuidedFocus, GuidedItemState, GuidedMissionKey, GuidedPlan, GuidedProfile, JlptLevel, PlanAnalysis, StartLevel,
} from './types';

export const LEVEL_ORDER: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const GUIDED_CATEGORIES: readonly GuidedCategory[] = ['kotoba', 'kanji', 'bunpou'];

/** Menit dasar mempelajari satu materi baru di level N5 (heuristik awal — mudah disetel di sini). */
export const BASE_LEARN_MINUTES: Readonly<DailyQuota> = { kotoba: 2, kanji: 3, bunpou: 6 };
/** Materi level lebih tinggi butuh waktu lebih lama (nuansa, pola mirip, kanji lebih rumit). */
export const LEVEL_DIFFICULTY: Readonly<Record<JlptLevel, number>> = { N5: 1, N4: 1.1, N3: 1.25, N2: 1.4, N1: 1.6 };
/** Perkiraan menit per jawaban Recall. */
export const MINUTES_PER_RECALL = 0.5;
/** Hari ke-berapa (sejak dipelajari) sebuah materi diulang, mengikuti interval SRS 1·2·4·7·14·30. */
const REVIEW_DAYS = [1, 3, 7, 14, 28, 58];
/** Recall paling banyak memakai porsi ini dari waktu harian; sisanya tetap untuk materi baru. */
const RECALL_MAX_SHARE = 0.6;
/** Batas penyesuaian jatah harian terhadap jatah rencana. */
const FIT_MIN = 0.4;
const FIT_MAX = 1.3;
/** Retensi di bawah ini (dari materi yang sudah diuji) -> materi baru dikurangi dulu. */
const RETENTION_FLOOR = 0.6;
const RETENTION_MIN_TESTED = 10;
const RETENTION_THROTTLE = 0.7;
/** Evaluasi berkala: tiap sekian hari, sekian soal latihan level target. */
export const EVALUATION_EVERY_DAYS = 7;
export const EVALUATION_QUESTIONS = 10;

export const PROFILE_LIMITS = {
  durationDays: { min: 7, max: 730 },
  minutesPerDay: { min: 10, max: 480 },
} as const;
/** Di atas ini beban harian dianggap berat (peringatan, bukan larangan). */
export const COMFORT_MINUTES_PER_DAY = 180;

const FOCUS_WEIGHTS: Readonly<Record<GuidedFocus, DailyQuota>> = {
  balanced: { kotoba: 0.5, kanji: 0.25, bunpou: 0.25 },
  kotoba: { kotoba: 0.65, kanji: 0.2, bunpou: 0.15 },
  kanji: { kotoba: 0.35, kanji: 0.45, bunpou: 0.2 },
  bunpou: { kotoba: 0.35, kanji: 0.2, bunpou: 0.45 },
};

/** Hadiah klaim per misi harian (lewat ledger `mission_claim`, sekali per misi per hari). */
export const GUIDED_REWARDS: Readonly<Record<GuidedMissionKey, { exp: number; gold: number }>> = {
  kotoba: { exp: 75, gold: 50 },
  kanji: { exp: 100, gold: 70 },
  bunpou: { exp: 80, gold: 60 },
  recall: { exp: 120, gold: 100 },
  evaluasi: { exp: 150, gold: 120 },
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function normalizeProfile(p: GuidedProfile): GuidedProfile {
  const num = (v: number, fallback: number) => (Number.isFinite(v) ? Math.round(v) : fallback);
  return {
    // Program lama (sebelum ada mode) adalah program berbasis waktu.
    mode: p.mode === 'target' || p.mode === 'deadline' ? p.mode : 'time',
    currentLevel: p.currentLevel,
    targetLevel: p.targetLevel,
    durationDays: clamp(num(p.durationDays, 60), PROFILE_LIMITS.durationDays.min, PROFILE_LIMITS.durationDays.max),
    minutesPerDay: clamp(num(p.minutesPerDay, 30), PROFILE_LIMITS.minutesPerDay.min, PROFILE_LIMITS.minutesPerDay.max),
    focus: FOCUS_WEIGHTS[p.focus] ? p.focus : 'balanced',
  };
}

/** Level yang dipelajari: semua level DI ATAS level saat ini sampai target (N4 -> N3 = [N3]). */
export function levelsForProfile(currentLevel: StartLevel, targetLevel: JlptLevel): JlptLevel[] {
  const end = LEVEL_ORDER.indexOf(targetLevel);
  const start = currentLevel === 'PEMULA' ? 0 : LEVEL_ORDER.indexOf(currentLevel) + 1;
  // Target tidak di atas level saat ini: program menjadi pemantapan level target.
  if (start > end) return [targetLevel];
  return LEVEL_ORDER.slice(start, end + 1);
}

/** Target yang sah untuk level saat ini (selalu di atasnya). */
export function targetOptionsFor(currentLevel: StartLevel): JlptLevel[] {
  const start = currentLevel === 'PEMULA' ? 0 : LEVEL_ORDER.indexOf(currentLevel) + 1;
  return LEVEL_ORDER.slice(start);
}

function uniqueById<T extends { id: string }>(items: ReadonlyArray<T>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (!it || !it.id || seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

type KotobaSource = CurriculumSources['kotoba'][number];

/**
 * Kosakata INTI = entri yang levelnya dikurasi. Entri kamus yang levelnya hanya perkiraan ('jlpt-estimasi')
 * adalah perluasan Library: tetap bisa dijelajahi, tetapi bukan syarat mencapai level target.
 */
export function isCoreKotoba(k: KotobaSource): boolean {
  return !(k.tags || []).includes('jlpt-estimasi');
}

/**
 * Susun kosakata satu level supaya selaras dengan urutan kanji (prasyarat): kata yang memakai kanji kurikulum
 * muncul setelah kanji itu dijadwalkan; kata tanpa kanji baru (kana / kanji level sebelumnya) mengisi sisanya.
 */
export function arrangeKotoba(words: KotobaSource[], kanjiOrder: string[], quota: Pick<DailyQuota, 'kotoba' | 'kanji'>): string[] {
  const kanjiIndex = new Map<string, number>();
  kanjiOrder.forEach((ch, i) => kanjiIndex.set(ch, i));

  const linked: { id: string; unlock: number }[] = [];
  const free: string[] = [];
  for (const w of words) {
    let unlock = -1;
    for (const ch of w.kanjiComponents || []) {
      const idx = kanjiIndex.get(ch);
      if (idx !== undefined && idx > unlock) unlock = idx;
    }
    if (unlock >= 0) linked.push({ id: w.id, unlock });
    else free.push(w.id);
  }
  linked.sort((a, b) => a.unlock - b.unlock); // stabil: urutan prioritas dipertahankan

  const perDay = Math.max(1, quota.kotoba);
  const linkedTarget = Math.ceil(perDay * 0.6);
  const out: string[] = [];
  let li = 0;
  let fi = 0;
  for (let day = 0; li < linked.length || fi < free.length; day++) {
    const unlockedUntil = (day + 1) * Math.max(1, quota.kanji);
    let taken = 0;
    while (taken < linkedTarget && li < linked.length && linked[li].unlock < unlockedUntil) { out.push(linked[li++].id); taken++; }
    while (taken < perDay && fi < free.length) { out.push(free[fi++]); taken++; }
    while (taken < perDay && li < linked.length && linked[li].unlock < unlockedUntil) { out.push(linked[li++].id); taken++; }
    // Tidak ada lagi yang "siap": lanjutkan dengan kata berikutnya agar hari tidak kosong.
    while (taken < perDay && li < linked.length) { out.push(linked[li++].id); taken++; }
  }
  return out;
}

/**
 * Target kompetensi: SELURUH materi inti level program, terurut (level rendah dulu; kanji → kosakata yang
 * memakainya; bunpou menurut urutan sumber, yang sudah berupa urutan belajar). Tidak bergantung pada waktu:
 * waktu hanya menentukan seberapa jauh kurikulum ini bisa ditempuh (lihat analyzePlan).
 */
export function buildCurriculum(profileInput: GuidedProfile, sources: CurriculumSources): Curriculum {
  const profile = normalizeProfile(profileInput);
  const levels = levelsForProfile(profile.currentLevel, profile.targetLevel);

  const allKotoba = uniqueById(sources.kotoba);
  const kanjiByLevel = levels.map(lv => uniqueById(sources.kanji).filter(k => k.jlpt === lv));
  const bunpouByLevel = levels.map(lv => uniqueById(sources.bunpou).filter(b => b.level === lv));
  const kotobaLibraryByLevel = levels.map(lv => allKotoba.filter(k => k.jlpt === lv));
  const kotobaByLevel = kotobaLibraryByLevel.map(pool =>
    pool
      .filter(isCoreKotoba)
      // yang punya contoh kalimat lebih dulu (lebih mudah dipelajari dalam konteks)
      .map((k, i) => ({ k, i, rank: k.exampleSentence ? 0 : 1 }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map(x => x.k)
  );

  const kotoba = kotobaByLevel.flatMap((words, i) => {
    const kanji = kanjiByLevel[i];
    // Kanji & kosakata satu level selesai bersamaan: laju kanji sebanding dengan jumlahnya.
    const perDay = 10;
    const kanjiPerDay = Math.max(1, Math.round((perDay * kanji.length) / Math.max(1, words.length)));
    return arrangeKotoba(words, kanji.map(k => k.character), { kotoba: perDay, kanji: kanjiPerDay });
  });

  const count = (l: unknown[][]) => l.reduce((n, x) => n + x.length, 0);
  const avgMinutes = (c: GuidedCategory, byLevel: unknown[][]) => {
    const n = count(byLevel);
    if (n === 0) return BASE_LEARN_MINUTES[c];
    const total = byLevel.reduce((sum, items, i) => sum + items.length * BASE_LEARN_MINUTES[c] * LEVEL_DIFFICULTY[levels[i]], 0);
    return Math.round((total / n) * 10) / 10;
  };

  return {
    levels,
    kotoba,
    kanji: kanjiByLevel.flat().map(k => k.id),
    bunpou: bunpouByLevel.flat().map(b => b.id),
    library: { kotoba: count(kotobaLibraryByLevel), kanji: count(kanjiByLevel), bunpou: count(bunpouByLevel) },
    learnMinutes: {
      kotoba: avgMinutes('kotoba', kotobaByLevel),
      kanji: avgMinutes('kanji', kanjiByLevel),
      bunpou: avgMinutes('bunpou', bunpouByLevel),
    },
  };
}

// ------------------------------------------------------------------------------
// Status materi
// ------------------------------------------------------------------------------

type Mastery = Record<string, ItemMasteryRecord> | undefined;

/** Sama dengan utils/mastery.hasPracticed (disalin agar modul ini tidak memuat basis data materi). */
function practiced(r: ItemMasteryRecord | undefined): boolean {
  if (!r) return false;
  return (r.writingCount || 0) + (r.flashcardCount || 0) + (r.quizCount || 0) + (r.attemptsCount || 0) > 0;
}

/** Sudah benar-benar diuji (kuis / Recall), bukan hanya latihan ringan. */
function tested(r: ItemMasteryRecord): boolean {
  return (r.quizCount || 0) > 0 || (r.recallCount || 0) > 0 || (r.attemptsCount || 0) > 0;
}

export function itemState(r: ItemMasteryRecord | undefined): GuidedItemState {
  if (!r) return 'baru';
  if (!practiced(r)) return 'dibuka';
  return r.status === 'MASTERED' || r.status === 'PERFECTED' ? 'dikuasai' : 'dipelajari';
}

/** "Selesai" untuk misi kurikulum = sudah dipelajari (berlatih), bukan sekadar dibuka. */
export function isLearned(mastery: Mastery, id: string): boolean {
  return practiced(mastery?.[id]);
}

/** Jumlah materi yang jatuh tempo diulang pada saat `now` (beban Recall aktual hari ini). */
export function countRecallDue(mastery: Mastery, now: Date = new Date()): number {
  if (!mastery) return 0;
  const t = now.getTime();
  let n = 0;
  for (const r of Object.values(mastery)) {
    if (!r || !practiced(r)) continue;
    const due = Date.parse(r.nextReviewDue);
    if (Number.isFinite(due) && due <= t) n++;
  }
  return n;
}

// ------------------------------------------------------------------------------
// Analisis gap, estimasi beban, kelayakan
// ------------------------------------------------------------------------------

/** Rata-rata pengulangan per materi selama program: materi dipelajari merata, jadi usia rata-ratanya ≈ separuh durasi. */
export function reviewsPerItem(days: number): number {
  const horizon = Math.max(1, days) / 2;
  return Math.max(2, REVIEW_DAYS.filter(d => d <= horizon).length);
}

function gapOf(curriculum: Curriculum, mastery: Mastery): { learned: CategoryCount; gap: CategoryCount } {
  const learned = { kotoba: 0, kanji: 0, bunpou: 0 };
  const gap = { kotoba: 0, kanji: 0, bunpou: 0 };
  for (const c of GUIDED_CATEGORIES) {
    for (const id of curriculum[c]) {
      if (isLearned(mastery, id)) learned[c]++;
      else gap[c]++;
    }
  }
  return { learned, gap };
}

/**
 * Bagi anggaran menit ke tiga kategori menurut prioritas. Kategori yang gap-nya sudah tertutup mengembalikan
 * sisa anggarannya ke kategori lain, sehingga waktu tidak pernah menganggur selama masih ada gap.
 */
function allocate(budgetMinutes: number, gap: CategoryCount, cost: CategoryCount, weights: DailyQuota): CategoryCount {
  const planned: CategoryCount = { kotoba: 0, kanji: 0, bunpou: 0 };
  let open = GUIDED_CATEGORIES.filter(c => gap[c] > 0);
  let budget = Math.max(0, budgetMinutes);
  while (open.length > 0 && budget > 0) {
    const wSum = open.reduce((s, c) => s + weights[c], 0) || 1;
    const capped = open.filter(c => (budget * weights[c]) / wSum >= (gap[c] - planned[c]) * cost[c]);
    if (capped.length === 0) {
      for (const c of open) planned[c] += Math.floor((budget * weights[c]) / wSum / cost[c]);
      break;
    }
    for (const c of capped) {
      budget -= (gap[c] - planned[c]) * cost[c];
      planned[c] = gap[c];
    }
    open = open.filter(c => !capped.includes(c));
  }
  for (const c of GUIDED_CATEGORIES) planned[c] = clamp(planned[c], 0, gap[c]);
  return planned;
}

/**
 * Analisis gap + estimasi beban + kelayakan target.
 * Beban satu materi = menit mempelajarinya + menit mengulangnya selama program (jumlah pengulangan × menit/jawaban).
 * `feasible` berarti durasi & waktu harian cukup untuk menuntaskan SELURUH gap materi inti.
 */
export function analyzePlan(profileInput: GuidedProfile, curriculum: Curriculum, mastery: Mastery): PlanAnalysis {
  const profile = normalizeProfile(profileInput);
  const { learned, gap } = gapOf(curriculum, mastery);

  const costFor = (days: number): CategoryCount => {
    const review = reviewsPerItem(days) * MINUTES_PER_RECALL;
    return {
      kotoba: curriculum.learnMinutes.kotoba + review,
      kanji: curriculum.learnMinutes.kanji + review,
      bunpou: curriculum.learnMinutes.bunpou + review,
    };
  };
  const workloadFor = (days: number) => {
    const cost = costFor(days);
    return GUIDED_CATEGORIES.reduce((sum, c) => sum + gap[c] * cost[c], 0);
  };

  // Mode tenggat: waktu harian adalah HASIL hitung (beban ÷ tenggat), bukan masukan.
  const minutes = profile.mode === 'deadline'
    ? clamp(Math.ceil(workloadFor(profile.durationDays) / profile.durationDays), PROFILE_LIMITS.minutesPerDay.min, PROFILE_LIMITS.minutesPerDay.max)
    : profile.minutesPerDay;

  // Durasi yang dibutuhkan bergantung pada jumlah pengulangan, yang bergantung pada durasi -> beberapa iterasi cukup.
  let requiredDays = 60;
  for (let i = 0; i < 4; i++) requiredDays = Math.max(1, Math.ceil(workloadFor(requiredDays) / minutes));

  const days = profile.mode === 'target'
    ? clamp(requiredDays, PROFILE_LIMITS.durationDays.min, PROFILE_LIMITS.durationDays.max)
    : profile.durationDays;

  const cost = costFor(days);
  const planned = allocate(minutes * days, gap, cost, FOCUS_WEIGHTS[profile.focus]);
  const review = reviewsPerItem(days);

  const categories = {} as Record<GuidedCategory, CategoryAnalysis>;
  let newMinutes = 0;
  let recallMinutes = 0;
  for (const c of GUIDED_CATEGORIES) {
    const quota = planned[c] === 0 ? 0 : Math.max(1, Math.round(planned[c] / days));
    categories[c] = {
      library: curriculum.library[c],
      core: curriculum[c].length,
      learned: learned[c],
      gap: gap[c],
      planned: planned[c],
      quota,
    };
    newMinutes += (planned[c] / days) * curriculum.learnMinutes[c];
    recallMinutes += (planned[c] / days) * review * MINUTES_PER_RECALL;
  }

  const gapTotal = GUIDED_CATEGORIES.reduce((n, c) => n + gap[c], 0);
  const plannedTotal = GUIDED_CATEGORIES.reduce((n, c) => n + planned[c], 0);
  const workloadMinutes = workloadFor(days);

  return {
    mode: profile.mode,
    days,
    minutesPerDay: minutes,
    categories,
    workloadMinutes: Math.round(workloadMinutes),
    requiredDays,
    requiredMinutesPerDay: Math.ceil(workloadMinutes / days),
    feasible: plannedTotal >= gapTotal,
    coveragePercent: gapTotal > 0 ? Math.floor((plannedTotal / gapTotal) * 100) : 100,
    reviewsPerItem: review,
    newMinutesPerDay: Math.round(newMinutes),
    recallMinutesPerDay: Math.round(recallMinutes),
  };
}

// ------------------------------------------------------------------------------
// Tanggal
// ------------------------------------------------------------------------------

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/** Hari ke-berapa dalam program (1 = hari pertama). */
export function dayIndexOf(plan: Pick<GuidedPlan, 'startDate'>, today: string): number {
  return Math.max(1, dayNumber(today) - dayNumber(plan.startDate) + 1);
}

// ------------------------------------------------------------------------------
// Plan & misi harian
// ------------------------------------------------------------------------------

/**
 * Buat program. Mode 'target': durasi = durasi yang dibutuhkan untuk menuntaskan gap; mode 'deadline': menit/hari =
 * menit yang dibutuhkan untuk menuntaskan gap sebelum tenggat. Titik awal (`baseline`)
 * dan sasaran (`goal`) dicatat agar laju belajar bisa diukur tanpa menyimpan seluruh daftar materi.
 */
export function createPlan(
  profileInput: GuidedProfile,
  today: string,
  curriculum: Curriculum,
  mastery: Mastery,
  nowIso: string = new Date().toISOString()
): GuidedPlan {
  const analysis = analyzePlan(profileInput, curriculum, mastery);
  const profile = { ...normalizeProfile(profileInput), durationDays: analysis.days, minutesPerDay: analysis.minutesPerDay };
  const pick = (f: (a: CategoryAnalysis) => number): CategoryCount => ({
    kotoba: f(analysis.categories.kotoba), kanji: f(analysis.categories.kanji), bunpou: f(analysis.categories.bunpou),
  });
  return {
    version: 1, status: 'active', profile, startDate: today, createdAt: nowIso, updatedAt: nowIso,
    baseline: pick(a => a.learned),
    goal: pick(a => a.planned),
  };
}

export interface DayContext {
  /** Waktu saat ini (menentukan materi mana yang sudah jatuh tempo). */
  now?: Date;
  /** Paksa jumlah jatuh tempo (untuk tes); bila kosong dihitung dari mastery. */
  dueCount?: number;
  /** Penghitung aktivitas belajar (untuk titik awal evaluasi berkala). */
  studyStats?: { questions?: { total: number }; tryOuts?: { total: number } };
}

/** Retensi materi kurikulum yang sudah diuji: berapa yang masih bertahan (mastery ≥ 60%). */
function retentionOf(curriculum: Curriculum, mastery: Mastery): { tested: number; retained: number } {
  let t = 0;
  let kept = 0;
  for (const c of GUIDED_CATEGORIES) {
    for (const id of curriculum[c]) {
      const r = mastery?.[id];
      if (!r || !practiced(r) || !tested(r)) continue;
      t++;
      if ((r.masteryPercentage || 0) >= 60) kept++;
    }
  }
  return { tested: t, retained: kept };
}

/**
 * Misi harian adaptif + penjadwalan ulang.
 *  1. Jatah rencana = alokasi SISA gap ke SISA hari (yang tertunda otomatis ikut terhitung; kurikulum tidak dibuat ulang).
 *  2. Recall mengikuti jumlah materi yang benar-benar jatuh tempo hari ini; waktu materi baru = sisanya.
 *     Recall ringan -> boleh sedikit lebih banyak materi baru; Recall menumpuk -> materi baru dikurangi.
 *  3. Retensi rendah -> materi baru dikurangi dulu (menambah materi di atas fondasi yang goyah tidak berguna).
 *  4. Tiap 7 hari ada evaluasi: soal latihan level target (kosakata/kanji/tata bahasa/bacaan dalam konteks).
 * Materi diambil dari DEPAN urutan yang belum dipelajari, sehingga yang tertunda kemarin didahulukan.
 */
export function planDay(
  plan: GuidedPlan,
  curriculum: Curriculum,
  mastery: Mastery,
  today: string,
  ctx: DayContext = {}
): GuidedDay {
  const profile = normalizeProfile(plan.profile);
  const dayIndex = dayIndexOf(plan, today);
  const daysLeft = Math.max(1, profile.durationDays - dayIndex + 1);

  const remaining = {} as Record<GuidedCategory, string[]>;
  const gap = { kotoba: 0, kanji: 0, bunpou: 0 };
  for (const c of GUIDED_CATEGORIES) {
    remaining[c] = curriculum[c].filter(id => !isLearned(mastery, id));
    gap[c] = remaining[c].length;
  }

  // 1. Jatah rencana dari sisa gap ÷ sisa hari (beban per materi memakai durasi program asli).
  const review = reviewsPerItem(profile.durationDays) * MINUTES_PER_RECALL;
  const cost: CategoryCount = {
    kotoba: curriculum.learnMinutes.kotoba + review,
    kanji: curriculum.learnMinutes.kanji + review,
    bunpou: curriculum.learnMinutes.bunpou + review,
  };
  // Mode tenggat: anggaran hari ini = sisa beban ÷ sisa hari (naik bila tertinggal, turun bila lebih cepat),
  // supaya tenggatnya yang dipertahankan, bukan menit hariannya.
  const minutes = profile.mode === 'deadline'
    ? clamp(
        Math.ceil(GUIDED_CATEGORIES.reduce((n, c) => n + gap[c] * cost[c], 0) / daysLeft),
        PROFILE_LIMITS.minutesPerDay.min, PROFILE_LIMITS.minutesPerDay.max
      )
    : profile.minutesPerDay;
  const planned = allocate(minutes * daysLeft, gap, cost, FOCUS_WEIGHTS[profile.focus]);
  const base: CategoryCount = { kotoba: 0, kanji: 0, bunpou: 0 };
  let plannedNewMinutes = 0;
  for (const c of GUIDED_CATEGORIES) {
    // Dibulatkan ke atas supaya sasaran tercapai; kelebihan menitnya dipangkas oleh batas keras di bawah.
    base[c] = planned[c] === 0 ? 0 : Math.max(1, Math.ceil(planned[c] / daysLeft));
    plannedNewMinutes += base[c] * curriculum.learnMinutes[c];
  }

  // 2. Recall adaptif: beban aktual hari ini.
  const due = Math.max(0, ctx.dueCount ?? countRecallDue(mastery, ctx.now));
  const recallCapByTime = Math.floor((minutes * RECALL_MAX_SHARE) / MINUTES_PER_RECALL);
  const recallAnswers = Math.min(due, RECALL_LIMITS.dailyCap, recallCapByTime);
  const recallMinutes = recallAnswers * MINUTES_PER_RECALL;
  const notes: DayNote[] = [];
  let fit = plannedNewMinutes > 0 ? clamp((minutes - recallMinutes) / plannedNewMinutes, FIT_MIN, FIT_MAX) : 1;
  if (fit < 0.85) notes.push('recall_heavy');
  else if (fit > 1.1) notes.push('recall_light');

  // 3. Retensi rendah -> perkuat dulu.
  const retention = retentionOf(curriculum, mastery);
  if (retention.tested >= RETENTION_MIN_TESTED && retention.retained / retention.tested < RETENTION_FLOOR) {
    fit *= RETENTION_THROTTLE;
    notes.push('retention_low');
  }

  const count: CategoryCount = { kotoba: 0, kanji: 0, bunpou: 0 };
  for (const c of GUIDED_CATEGORIES) {
    count[c] = gap[c] === 0 || base[c] === 0 ? 0 : Math.min(gap[c], Math.max(1, Math.round(base[c] * fit)));
  }
  // Materi yang dipelajari hari ini langsung memenuhi syarat Recall (dibatasi jatah materi baru Recall per hari).
  const recallTargetFor = (fresh: number) => Math.min(
    RECALL_LIMITS.dailyCap, recallCapByTime,
    due + Math.min(fresh, RECALL_LIMITS.newPerDay)
  );
  // Batas keras: materi baru + Recall tidak boleh melebihi waktu harian. Yang dikurangi lebih dulu adalah kategori
  // yang paling memakan waktu. Tiap kategori yang masih punya gap sebisa mungkin tetap mendapat satu materi; bila
  // itu pun tidak muat (Recall sedang berat), kategori termahal dilewati hari ini — minimal satu materi baru tetap ada.
  const totalMinutes = () => {
    const fresh = count.kotoba + count.kanji + count.bunpou;
    return GUIDED_CATEGORIES.reduce((n, c) => n + count[c] * curriculum.learnMinutes[c], 0)
      + recallTargetFor(fresh) * MINUTES_PER_RECALL;
  };
  while (totalMinutes() > minutes) {
    const byLoad = (a: GuidedCategory, b: GuidedCategory) => count[b] * curriculum.learnMinutes[b] - count[a] * curriculum.learnMinutes[a];
    const trim = GUIDED_CATEGORIES.filter(c => count[c] > 1).sort(byLoad)[0];
    if (trim) { count[trim]--; continue; }
    const open = GUIDED_CATEGORIES.filter(c => count[c] === 1).sort(byLoad);
    if (open.length <= 1) break;
    count[open[0]] = 0;
  }

  const kotoba = remaining.kotoba.slice(0, count.kotoba);
  const kanji = remaining.kanji.slice(0, count.kanji);
  const bunpou = remaining.bunpou.slice(0, count.bunpou);
  const fresh = kotoba.length + kanji.length + bunpou.length;

  const previous = plan.today && plan.today.date < today
    ? new Set([...plan.today.kotoba, ...plan.today.kanji, ...plan.today.bunpou])
    : new Set<string>();

  const recallTarget = recallTargetFor(fresh);

  const day: GuidedDay = {
    date: today,
    kotoba,
    kanji,
    bunpou,
    carried: [...kotoba, ...kanji, ...bunpou].filter(id => previous.has(id)),
    recallTarget,
    minutes,
    recallMinutes: Math.round(recallTarget * MINUTES_PER_RECALL),
    notes,
    claimed: {},
  };

  // 4. Evaluasi berkala.
  if (dayIndex % EVALUATION_EVERY_DAYS === 0) {
    day.evalTarget = EVALUATION_QUESTIONS;
    day.evalBaseline = {
      questions: ctx.studyStats?.questions?.total || 0,
      tryOuts: ctx.studyStats?.tryOuts?.total || 0,
    };
  }
  return day;
}

/** Pastikan plan punya penugasan untuk `today`. Mengembalikan objek yang sama bila tidak ada perubahan. */
export function ensureToday(
  plan: GuidedPlan | undefined,
  curriculum: Curriculum | undefined,
  mastery: Mastery,
  today: string,
  ctx: DayContext = {},
  nowIso: string = new Date().toISOString()
): GuidedPlan | undefined {
  if (!plan || !curriculum || plan.status !== 'active') return plan;
  // Tanggal mundur (jam perangkat diubah / data dari perangkat lain): pertahankan penugasan yang ada.
  if (plan.today && plan.today.date >= today) return plan;
  if (today < plan.startDate) return plan;
  return { ...plan, today: planDay(plan, curriculum, mastery, today, ctx), updatedAt: nowIso };
}

export interface MissionProgress {
  key: GuidedMissionKey;
  ids: string[];
  done: number;
  total: number;
  complete: boolean;
  claimed: boolean;
  /** Perkiraan menit untuk menyelesaikan sisa misi. */
  minutesLeft: number;
}

export interface DayProgress {
  date: string;
  missions: MissionProgress[];
  /** Jumlah materi tertunda dari hari sebelumnya yang belum dipelajari. */
  carriedCount: number;
  doneCount: number;
  totalCount: number;
  allComplete: boolean;
  claimable: number;
  estimatedMinutes: number;
}

/** Progress harian: diturunkan dari itemMastery + penghitung Recall harian + penghitung soal latihan. */
export function dayProgress(
  day: GuidedDay,
  mastery: Mastery,
  recallDaily: RecallDaily | undefined,
  studyStats?: DayContext['studyStats'],
  learnMinutes: CategoryCount = BASE_LEARN_MINUTES
): DayProgress {
  const missions: MissionProgress[] = [];
  let estimated = 0;
  for (const key of GUIDED_CATEGORIES) {
    const ids = day[key];
    if (ids.length === 0) continue;
    const done = ids.filter(id => isLearned(mastery, id)).length;
    estimated += ids.length * learnMinutes[key];
    missions.push({
      key, ids, done, total: ids.length, complete: done >= ids.length, claimed: Boolean(day.claimed[key]),
      minutesLeft: Math.ceil((ids.length - done) * learnMinutes[key]),
    });
  }
  if (day.recallTarget > 0) {
    const answered = normalizeRecallDaily(recallDaily, day.date).answered;
    const done = Math.min(day.recallTarget, answered);
    estimated += day.recallTarget * MINUTES_PER_RECALL;
    missions.push({
      key: 'recall', ids: [], done, total: day.recallTarget, complete: done >= day.recallTarget,
      claimed: Boolean(day.claimed.recall), minutesLeft: Math.ceil((day.recallTarget - done) * MINUTES_PER_RECALL),
    });
  }
  if (day.evalTarget && day.evalBaseline) {
    // Satu simulasi ujian selesai = evaluasi terpenuhi; soal drill dihitung per soal.
    const answered = Math.max(0, (studyStats?.questions?.total || 0) - day.evalBaseline.questions)
      + Math.max(0, (studyStats?.tryOuts?.total || 0) - day.evalBaseline.tryOuts) * day.evalTarget;
    const done = Math.min(day.evalTarget, answered);
    missions.push({
      key: 'evaluasi', ids: [], done, total: day.evalTarget, complete: done >= day.evalTarget,
      claimed: Boolean(day.claimed.evaluasi), minutesLeft: day.evalTarget - done,
    });
  }
  return {
    date: day.date,
    missions,
    carriedCount: day.carried.filter(id => !isLearned(mastery, id)).length,
    doneCount: missions.filter(m => m.complete).length,
    totalCount: missions.length,
    allComplete: missions.length > 0 && missions.every(m => m.complete),
    claimable: missions.filter(m => m.complete && !m.claimed).length,
    estimatedMinutes: Math.round(estimated),
  };
}

export type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'finished';

export interface PlanOverview {
  dayIndex: number;
  durationDays: number;
  daysLeft: number;
  /** Per kategori: materi inti target, yang sudah dipelajari, yang sudah dikuasai. */
  categories: Record<GuidedCategory, { planned: number; learned: number; mastered: number }>;
  /** Total materi inti level target. */
  planned: number;
  learned: number;
  mastered: number;
  /** CAKUPAN: materi inti yang sudah dipelajari (%). */
  percent: number;
  /** RETENSI: dari materi yang sudah diuji, berapa yang bertahan (%); null = belum ada yang diuji. */
  retentionPercent: number | null;
  tested: number;
  /** PENGUASAAN: materi inti berstatus dikuasai (%). */
  masteredPercent: number;
  /** Sasaran program (mode waktu bisa lebih kecil dari seluruh gap) dan capaian sejak program dimulai. */
  goal: number;
  progressed: number;
  /** Selisih terhadap sasaran sampai KEMARIN (positif = tertinggal sekian materi). */
  behindBy: number;
  pace: PaceStatus;
  /** Perkiraan hari yang masih dibutuhkan untuk menuntaskan seluruh materi inti dengan waktu harian ini. */
  daysToComplete: number;
}

const sumCount = (c: CategoryCount | undefined) => (c ? c.kotoba + c.kanji + c.bunpou : 0);

/** Progress program: cakupan, retensi, penguasaan, dan laju terhadap sasaran. */
export function planOverview(plan: GuidedPlan, curriculum: Curriculum, mastery: Mastery, today: string): PlanOverview {
  const profile = normalizeProfile(plan.profile);
  const dayIndex = dayIndexOf(plan, today);
  const durationDays = profile.durationDays;
  const categories = {} as PlanOverview['categories'];
  let planned = 0;
  let learned = 0;
  let mastered = 0;
  for (const c of GUIDED_CATEGORIES) {
    const ids = curriculum[c];
    let l = 0;
    let m = 0;
    for (const id of ids) {
      const s = itemState(mastery?.[id]);
      if (s === 'dipelajari' || s === 'dikuasai') l++;
      if (s === 'dikuasai') m++;
    }
    categories[c] = { planned: ids.length, learned: l, mastered: m };
    planned += ids.length;
    learned += l;
    mastered += m;
  }
  const retention = retentionOf(curriculum, mastery);

  // Laju: capaian sejak program dimulai dibanding sasaran yang seharusnya tercapai sampai kemarin.
  const goal = plan.goal ? sumCount(plan.goal) : planned;
  const progressed = Math.max(0, learned - sumCount(plan.baseline));
  const expected = Math.floor((goal * Math.min(dayIndex - 1, durationDays)) / durationDays);
  const behindBy = expected - progressed;
  const tolerance = Math.max(1, Math.round((goal / durationDays) * 0.5));
  const pace: PaceStatus = planned > 0 && learned >= planned ? 'finished'
    : behindBy > tolerance ? 'behind'
    : behindBy < -tolerance ? 'ahead'
    : 'on_track';

  const analysis = analyzePlan({ ...profile, mode: 'target' }, curriculum, mastery);
  return {
    dayIndex, durationDays, daysLeft: Math.max(0, durationDays - dayIndex + 1),
    categories, planned, learned, mastered,
    percent: planned > 0 ? Math.round((learned / planned) * 100) : 0,
    retentionPercent: retention.tested > 0 ? Math.round((retention.retained / retention.tested) * 100) : null,
    tested: retention.tested,
    masteredPercent: planned > 0 ? Math.round((mastered / planned) * 100) : 0,
    goal, progressed, behindBy, pace,
    daysToComplete: learned >= planned ? 0 : analysis.requiredDays,
  };
}

/** Tandai misi sudah diklaim (hadiahnya sendiri dijaga ledger reward; ini hanya status tampilan). */
export function markClaimed(plan: GuidedPlan, key: GuidedMissionKey, date: string, nowIso: string = new Date().toISOString()): GuidedPlan {
  if (!plan.today || plan.today.date !== date || plan.today.claimed[key]) return plan;
  return { ...plan, today: { ...plan.today, claimed: { ...plan.today.claimed, [key]: true } }, updatedAt: nowIso };
}

/** Gabungan lokal ↔ cloud: plan yang terakhir diubah menang; klaim hari yang sama di-union. */
export function mergeGuidedPlan(a: GuidedPlan | undefined, b: GuidedPlan | undefined): GuidedPlan | undefined {
  if (!a) return b;
  if (!b) return a;
  const [winner, other] = a.updatedAt >= b.updatedAt ? [a, b] : [b, a];
  if (
    winner.createdAt === other.createdAt && winner.today && other.today && winner.today.date === other.today.date
  ) {
    const claimed = { ...other.today.claimed, ...winner.today.claimed };
    return { ...winner, today: { ...winner.today, claimed } };
  }
  return winner;
}
