// ==============================================================================
// GUIDED LEARNING — GENERATOR KURIKULUM, MISI HARIAN & PENJADWALAN ULANG (murni, tanpa React)
//
//  Curriculum Generator : buildCurriculum()  -> materi apa saja selama program + urutannya
//  Daily Mission        : planDay()          -> tugas untuk satu hari (dibekukan di plan.today)
//  Progress Tracker     : dayProgress() / planOverview() -> diturunkan dari itemMastery
//  Schedule Adjustment  : planDay() menghitung ulang jatah dari SISA materi & SISA hari; materi yang
//                         tertunda tetap berada di depan urutan, kurikulum tidak dibuat ulang.
//  Recall               : tidak diduplikasi di sini. Materi yang sudah dipelajari otomatis masuk antrean
//                         Recall (utils/mastery.buildSmartRecallQueue) dengan engine latihan yang sesuai.
// ==============================================================================

import type { ItemMasteryRecord } from '../../types/content';
import { RECALL_LIMITS, normalizeRecallDaily, type RecallDaily } from '../recall/session';
import type {
  Curriculum, CurriculumSources, DailyQuota, GuidedCategory, GuidedDay, GuidedFocus, GuidedItemState,
  GuidedMissionKey, GuidedPlan, GuidedProfile, JlptLevel, StartLevel,
} from './types';

export const LEVEL_ORDER: readonly JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const GUIDED_CATEGORIES: readonly GuidedCategory[] = ['kotoba', 'kanji', 'bunpou'];

/** Perkiraan menit untuk mempelajari satu materi baru (heuristik awal — mudah disetel di sini). */
export const MINUTES_PER_ITEM: Readonly<DailyQuota> = { kotoba: 2, kanji: 3, bunpou: 6 };
/** Perkiraan menit per jawaban Recall. */
export const MINUTES_PER_RECALL = 0.5;
/** Porsi waktu harian yang dicadangkan untuk Recall. */
const RECALL_SHARE = 0.2;
const RECALL_MIN_MINUTES = 5;
/** Saat tertinggal, jatah harian boleh naik paling banyak sebesar ini dari jatah dasar. */
const CATCH_UP_FACTOR = 1.5;
/** Saat antrean Recall menumpuk, materi baru dikurangi paling banyak sampai separuhnya. */
const RECALL_PRESSURE_FLOOR = 0.5;

export const PROFILE_LIMITS = {
  durationDays: { min: 7, max: 365 },
  minutesPerDay: { min: 10, max: 180 },
} as const;

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
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function normalizeProfile(p: GuidedProfile): GuidedProfile {
  const num = (v: number, fallback: number) => (Number.isFinite(v) ? Math.round(v) : fallback);
  return {
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

export function recallMinutesFor(minutesPerDay: number): number {
  return Math.min(minutesPerDay / 2, Math.max(RECALL_MIN_MINUTES, Math.round(minutesPerDay * RECALL_SHARE)));
}

/** Jatah materi baru per hari menurut waktu belajar & preferensi (sebelum dibatasi jumlah materi yang ada). */
export function computeBaseQuota(profile: GuidedProfile): DailyQuota {
  const p = normalizeProfile(profile);
  const newMinutes = p.minutesPerDay - recallMinutesFor(p.minutesPerDay);
  const w = FOCUS_WEIGHTS[p.focus];
  const q = (c: GuidedCategory) => Math.max(1, Math.round((newMinutes * w[c]) / MINUTES_PER_ITEM[c]));
  return { kotoba: q('kotoba'), kanji: q('kanji'), bunpou: q('bunpou') };
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

/**
 * Pilih paling banyak `capacity` materi dari beberapa level. Bila tidak muat, tiap level mendapat porsi
 * sebanding dengan ukurannya (level lebih tinggi tidak "kehabisan jatah" oleh level lebih rendah),
 * dan dari tiap level diambil materi terdepan menurut urutan prioritasnya.
 */
export function selectAcrossLevels<T>(byLevel: T[][], capacity: number): T[][] {
  const total = byLevel.reduce((n, l) => n + l.length, 0);
  if (total <= capacity) return byLevel.map(l => l.slice());
  const shares = byLevel.map(l => Math.floor((capacity * l.length) / total));
  let rest = capacity - shares.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0 && i < byLevel.length; i++) {
    if (shares[i] < byLevel[i].length) { shares[i]++; rest--; }
  }
  return byLevel.map((l, i) => l.slice(0, shares[i]));
}

type KotobaSource = CurriculumSources['kotoba'][number];

/** Kosakata kurasi didahulukan dari entri kamus yang levelnya hanya perkiraan; yang punya contoh kalimat lebih dulu. */
function kotobaQualityRank(k: KotobaSource): number {
  const estimated = (k.tags || []).includes('jlpt-estimasi') ? 2 : 0;
  return estimated + (k.exampleSentence ? 0 : 1);
}

/**
 * Susun kosakata satu level supaya selaras dengan urutan kanji: kata yang memakai kanji kurikulum muncul
 * setelah kanji itu dijadwalkan; kata tanpa kanji baru (kana / kanji level sebelumnya) mengisi sisanya.
 */
export function arrangeKotoba(words: KotobaSource[], kanjiOrder: string[], quota: DailyQuota): string[] {
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

/** Curriculum Generator: pilih & urutkan materi dari basis data menurut profil. Deterministik. */
export function buildCurriculum(profileInput: GuidedProfile, sources: CurriculumSources): Curriculum {
  const profile = normalizeProfile(profileInput);
  const levels = levelsForProfile(profile.currentLevel, profile.targetLevel);
  const base = computeBaseQuota(profile);
  const days = profile.durationDays;

  const kanjiByLevel = levels.map(lv => uniqueById(sources.kanji).filter(k => k.jlpt === lv));
  const bunpouByLevel = levels.map(lv => uniqueById(sources.bunpou).filter(b => b.level === lv));
  const kotobaByLevel = levels.map(lv => {
    const pool = uniqueById(sources.kotoba).filter(k => k.jlpt === lv);
    return pool
      .map((k, i) => ({ k, i, rank: kotobaQualityRank(k) }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map(x => x.k);
  });

  const kanjiSel = selectAcrossLevels(kanjiByLevel, base.kanji * days);
  const bunpouSel = selectAcrossLevels(bunpouByLevel, base.bunpou * days);
  const kotobaSel = selectAcrossLevels(kotobaByLevel, base.kotoba * days);

  const count = (l: unknown[][]) => l.reduce((n, x) => n + x.length, 0);
  const fit = (c: GuidedCategory, planned: number) => (planned === 0 ? 0 : Math.min(base[c], Math.max(1, Math.ceil(planned / days))));
  const quota: DailyQuota = {
    kotoba: fit('kotoba', count(kotobaSel)),
    kanji: fit('kanji', count(kanjiSel)),
    bunpou: fit('bunpou', count(bunpouSel)),
  };

  const kotoba = kotobaSel.flatMap((words, i) => arrangeKotoba(words, kanjiSel[i].map(k => k.character), quota));

  return {
    levels,
    kotoba,
    kanji: kanjiSel.flat().map(k => k.id),
    bunpou: bunpouSel.flat().map(b => b.id),
    quota,
    recallMinutes: recallMinutesFor(profile.minutesPerDay),
    coverage: {
      kotoba: { available: count(kotobaByLevel), planned: count(kotobaSel) },
      kanji: { available: count(kanjiByLevel), planned: count(kanjiSel) },
      bunpou: { available: count(bunpouByLevel), planned: count(bunpouSel) },
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

export function itemState(r: ItemMasteryRecord | undefined): GuidedItemState {
  if (!r) return 'baru';
  if (!practiced(r)) return 'dibuka';
  return r.status === 'MASTERED' || r.status === 'PERFECTED' ? 'dikuasai' : 'dipelajari';
}

/** "Selesai" untuk misi kurikulum = sudah dipelajari (berlatih), bukan sekadar dibuka. */
export function isLearned(mastery: Mastery, id: string): boolean {
  return practiced(mastery?.[id]);
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

export function createPlan(profile: GuidedProfile, today: string, nowIso: string = new Date().toISOString()): GuidedPlan {
  return { version: 1, status: 'active', profile: normalizeProfile(profile), startDate: today, createdAt: nowIso, updatedAt: nowIso };
}

/**
 * Daily Mission + Schedule Adjustment.
 * Jatah per kategori = sisa materi ÷ sisa hari (naik bila tertinggal, paling banyak ×1,5 jatah dasar),
 * lalu dikurangi bila antrean Recall melebihi waktu yang dicadangkan. Materi diambil dari DEPAN urutan yang
 * belum dipelajari, sehingga yang tertunda kemarin otomatis didahulukan.
 */
export function planDay(
  plan: GuidedPlan,
  curriculum: Curriculum,
  mastery: Mastery,
  today: string,
  recallQueueSize: number = 0
): GuidedDay {
  const { profile } = plan;
  const daysLeft = Math.max(1, profile.durationDays - dayIndexOf(plan, today) + 1);

  const recallNeeded = Math.min(Math.max(0, recallQueueSize), RECALL_LIMITS.dailyCap) * MINUTES_PER_RECALL;
  const newMinutes = Math.max(1, profile.minutesPerDay - curriculum.recallMinutes);
  const overflow = Math.max(0, recallNeeded - curriculum.recallMinutes);
  const pressure = clamp(1 - overflow / newMinutes, RECALL_PRESSURE_FLOOR, 1);

  const previous = plan.today && plan.today.date < today
    ? new Set([...plan.today.kotoba, ...plan.today.kanji, ...plan.today.bunpou])
    : new Set<string>();

  const pick = (c: GuidedCategory): string[] => {
    const remaining = curriculum[c].filter(id => !isLearned(mastery, id));
    if (remaining.length === 0) return [];
    const base = Math.max(1, curriculum.quota[c]);
    const needed = Math.ceil(remaining.length / daysLeft);
    const quota = Math.max(1, Math.floor(clamp(needed, 1, Math.ceil(base * CATCH_UP_FACTOR)) * pressure));
    return remaining.slice(0, quota);
  };

  const kotoba = pick('kotoba');
  const kanji = pick('kanji');
  const bunpou = pick('bunpou');
  const fresh = kotoba.length + kanji.length + bunpou.length;

  return {
    date: today,
    kotoba,
    kanji,
    bunpou,
    carried: [...kotoba, ...kanji, ...bunpou].filter(id => previous.has(id)),
    recallTarget: Math.min(RECALL_LIMITS.sessionSize, Math.max(0, recallQueueSize) + fresh),
    claimed: {},
  };
}

/** Pastikan plan punya penugasan untuk `today`. Mengembalikan objek yang sama bila tidak ada perubahan. */
export function ensureToday(
  plan: GuidedPlan | undefined,
  curriculum: Curriculum | undefined,
  mastery: Mastery,
  today: string,
  recallQueueSize: number = 0,
  nowIso: string = new Date().toISOString()
): GuidedPlan | undefined {
  if (!plan || !curriculum || plan.status !== 'active') return plan;
  // Tanggal mundur (jam perangkat diubah / data dari perangkat lain): pertahankan penugasan yang ada.
  if (plan.today && plan.today.date >= today) return plan;
  if (today < plan.startDate) return plan;
  return { ...plan, today: planDay(plan, curriculum, mastery, today, recallQueueSize), updatedAt: nowIso };
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
  /** Jumlah materi baru hari ini yang berasal dari hari sebelumnya. */
  carriedCount: number;
  doneCount: number;
  totalCount: number;
  allComplete: boolean;
  claimable: number;
  estimatedMinutes: number;
}

/** Progress Tracker (harian): diturunkan dari itemMastery + penghitung Recall harian. */
export function dayProgress(day: GuidedDay, mastery: Mastery, recallDaily: RecallDaily | undefined): DayProgress {
  const missions: MissionProgress[] = [];
  for (const key of GUIDED_CATEGORIES) {
    const ids = day[key];
    if (ids.length === 0) continue;
    const done = ids.filter(id => isLearned(mastery, id)).length;
    missions.push({
      key, ids, done, total: ids.length, complete: done >= ids.length, claimed: Boolean(day.claimed[key]),
      minutesLeft: Math.ceil((ids.length - done) * MINUTES_PER_ITEM[key]),
    });
  }
  if (day.recallTarget > 0) {
    const answered = normalizeRecallDaily(recallDaily, day.date).answered;
    const done = Math.min(day.recallTarget, answered);
    missions.push({
      key: 'recall', ids: [], done, total: day.recallTarget, complete: done >= day.recallTarget,
      claimed: Boolean(day.claimed.recall), minutesLeft: Math.ceil((day.recallTarget - done) * MINUTES_PER_RECALL),
    });
  }
  const carried = new Set(day.carried);
  return {
    date: day.date,
    missions,
    carriedCount: day.carried.filter(id => carried.has(id) && !isLearned(mastery, id)).length,
    doneCount: missions.filter(m => m.complete).length,
    totalCount: missions.length,
    allComplete: missions.length > 0 && missions.every(m => m.complete),
    claimable: missions.filter(m => m.complete && !m.claimed).length,
    estimatedMinutes: missions.reduce(
      (n, m) => n + (m.key === 'recall' ? m.total * MINUTES_PER_RECALL : m.total * MINUTES_PER_ITEM[m.key]), 0),
  };
}

export type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'finished';

export interface PlanOverview {
  dayIndex: number;
  durationDays: number;
  daysLeft: number;
  categories: Record<GuidedCategory, { planned: number; learned: number; mastered: number }>;
  planned: number;
  learned: number;
  mastered: number;
  percent: number;
  /** Selisih terhadap target sampai KEMARIN (positif = tertinggal sekian materi). */
  behindBy: number;
  pace: PaceStatus;
}

/** Progress Tracker (program): berapa yang sudah dipelajari / dikuasai, dan apakah sesuai jadwal. */
export function planOverview(plan: GuidedPlan, curriculum: Curriculum, mastery: Mastery, today: string): PlanOverview {
  const dayIndex = dayIndexOf(plan, today);
  const durationDays = plan.profile.durationDays;
  const categories = {} as PlanOverview['categories'];
  let planned = 0;
  let learned = 0;
  let mastered = 0;
  let expected = 0;
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
    expected += Math.min(ids.length, Math.floor((ids.length * Math.min(dayIndex - 1, durationDays)) / durationDays));
  }
  const behindBy = expected - learned;
  const tolerance = Math.max(1, Math.round((planned / durationDays) * 0.5));
  const pace: PaceStatus = planned > 0 && learned >= planned ? 'finished'
    : behindBy > tolerance ? 'behind'
    : behindBy < -tolerance ? 'ahead'
    : 'on_track';
  return {
    dayIndex, durationDays, daysLeft: Math.max(0, durationDays - dayIndex + 1),
    categories, planned, learned, mastered,
    percent: planned > 0 ? Math.round((learned / planned) * 100) : 0,
    behindBy, pace,
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
