// Perencana belajar deterministik: tanpa AI, tanpa Math.random, tanpa Date.now. Input sama -> rencana sama.
import {
  avgMinutesPerItem, CATEGORIES, levelAt, scopeForPlan, segmentsFor, totalFor,
} from './curriculum';
import type {
  Category, ItemRange, LearningPlan, PlanDay, PlanError, PlanInput, PlanWeek,
} from './types';

export const LIMITS = {
  durationDays: { min: 7, max: 730 },
  dailyMinutes: { min: 10, max: 480 },
  daysPerWeek: { min: 1, max: 7 },
} as const;

/** Hari ke-n (dari belajar pertama) sebuah materi diulang — interval SRS ringkas. */
export const REVIEW_OFFSETS = [1, 3, 7, 14, 28] as const;
/** Satu sesi ulang memakan sekian bagian dari waktu belajar awalnya. */
export const REVIEW_COST_RATIO = 0.25;
export const EVALUATION_EVERY = 7;
export const CONSOLIDATION_SHARE = 0.05;
export const COMFORT_MINUTES = 180;

const FOCUS_WEIGHTS: Record<PlanInput['focus'], Record<Category, number>> = {
  balanced: { kotoba: 0.5, kanji: 0.25, bunpou: 0.25 },
  kotoba: { kotoba: 0.65, kanji: 0.2, bunpou: 0.15 },
  kanji: { kotoba: 0.35, kanji: 0.45, bunpou: 0.2 },
  bunpou: { kotoba: 0.35, kanji: 0.2, bunpou: 0.45 },
};
/** Senin=1 ... Sabtu=6, Minggu=0 — Minggu paling akhir diambil. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function parseDate(s: string): number {
  return Date.parse(`${s}T00:00:00Z`);
}
function fmtDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function validateInput(i: PlanInput): PlanError | null {
  const bad = (message: string): PlanError => ({ code: 'invalid_input', message });
  if (!Number.isInteger(i.durationDays) || i.durationDays < LIMITS.durationDays.min || i.durationDays > LIMITS.durationDays.max)
    return bad(`Durasi harus ${LIMITS.durationDays.min}-${LIMITS.durationDays.max} hari.`);
  if (!Number.isInteger(i.dailyMinutes) || i.dailyMinutes < LIMITS.dailyMinutes.min || i.dailyMinutes > LIMITS.dailyMinutes.max)
    return bad(`Waktu belajar harian harus ${LIMITS.dailyMinutes.min}-${LIMITS.dailyMinutes.max} menit.`);
  if (!Number.isInteger(i.daysPerWeek) || i.daysPerWeek < LIMITS.daysPerWeek.min || i.daysPerWeek > LIMITS.daysPerWeek.max)
    return bad('Hari belajar per minggu harus 1-7.');
  if (!DATE_RE.test(i.startDate) || Number.isNaN(parseDate(i.startDate))) return bad('Tanggal mulai tidak valid (YYYY-MM-DD).');
  return null;
}

/** Sidik jari stabil dari input — dipakai nanti sebagai kunci idempotensi saat import ke SevnQuest. */
export function planFingerprint(i: PlanInput): string {
  const s = [i.goal, i.startLevel, i.durationDays, i.dailyMinutes, i.daysPerWeek, i.startDate, i.focus].join('|');
  let h = 0x811c9dc5;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `plan-${h.toString(16).padStart(8, '0')}`;
}

/** Tanggal belajar: hari kalender dalam durasi yang jatuh pada hari belajar mingguan. */
function studyDates(i: PlanInput): { dates: number[]; restDays: number } {
  const allowed = new Set(WEEKDAY_ORDER.slice(0, i.daysPerWeek));
  const start = parseDate(i.startDate);
  const dates: number[] = [];
  for (let d = 0; d < i.durationDays; d++) {
    const ms = start + d * DAY_MS;
    if (allowed.has(new Date(ms).getUTCDay())) dates.push(ms);
  }
  return { dates, restDays: i.durationDays - dates.length };
}

const zero = (): Record<Category, number> => ({ kotoba: 0, kanji: 0, bunpou: 0 });
const r1 = (n: number) => Math.round(n * 10) / 10;

export function generatePlan(input: PlanInput): LearningPlan | PlanError {
  const invalid = validateInput(input);
  if (invalid) return invalid;

  const scope = scopeForPlan(input.goal, input.startLevel);
  if (scope.length === 0)
    return { code: 'already_at_level', message: 'Level awalmu sudah mencapai target. Pilih target yang lebih tinggi.' };

  const totals = zero();
  const cost = zero();
  const segs = {} as Record<Category, ReturnType<typeof segmentsFor>>;
  for (const c of CATEGORIES) {
    totals[c] = totalFor(scope, c);
    cost[c] = avgMinutesPerItem(scope, c);
    segs[c] = segmentsFor(scope, c);
  }

  const { dates, restDays } = studyDates(input);
  const consolidation = dates.length >= 21 ? Math.ceil(dates.length * CONSOLIDATION_SHARE) : 0;
  const kindOf = (n: number): PlanDay['kind'] => {
    if (n > dates.length - consolidation) return 'consolidation';
    return n % EVALUATION_EVERY === 0 ? 'evaluation' : 'learn';
  };
  const learnDayCount = dates.reduce((n, _, k) => n + (kindOf(k + 1) === 'learn' ? 1 : 0), 0);

  const remaining = { ...totals };
  const next = zero(); // pointer: materi berikutnya (0-based) per kategori
  const carry = zero();
  const learnMinutesByDay = new Map<number, number>();
  const learnDayNumbers: number[] = [];
  const days: PlanDay[] = [];
  let learnLeft = learnDayCount;

  const totalMinutesNeeded = CATEGORIES.reduce((n, c) => n + totals[c] * cost[c], 0);

  for (let k = 0; k < dates.length; k++) {
    const dayNumber = k + 1;
    const kind = kindOf(dayNumber);

    const reviewOf: number[] = [];
    let reviewMinutes = 0;
    for (const off of REVIEW_OFFSETS) {
      const src = dayNumber - off;
      const m = learnMinutesByDay.get(src);
      if (m) {
        reviewOf.push(src);
        reviewMinutes += m * REVIEW_COST_RATIO;
      }
    }
    reviewMinutes = Math.min(reviewMinutes, input.dailyMinutes);

    const newItems: ItemRange[] = [];
    let newMinutes = 0;

    if (kind === 'learn') {
      const remainingMinutes = CATEGORIES.reduce((n, c) => n + remaining[c] * cost[c], 0);
      const budget = Math.max(0, input.dailyMinutes - reviewMinutes);
      const pace = remainingMinutes / Math.max(1, learnLeft);
      const spend = learnLeft === 1 ? budget : Math.min(budget, pace);

      const live = CATEGORIES.filter(c => remaining[c] > 0);
      const wSum = live.reduce((n, c) => n + FOCUS_WEIGHTS[input.focus][c], 0) || 1;
      for (const c of live) {
        const wantMinutes = spend * (FOCUS_WEIGHTS[input.focus][c] / wSum);
        const exact = wantMinutes / cost[c] + carry[c];
        const n = Math.min(remaining[c], Math.floor(exact));
        carry[c] = exact - n;
        if (n > 0) {
          const from = next[c] + 1;
          const to = next[c] + n;
          newItems.push({ category: c, from, to, count: n, level: levelAt(segs[c], from) });
          next[c] += n;
          remaining[c] -= n;
          newMinutes += n * cost[c];
        }
      }
      learnLeft--;
      learnMinutesByDay.set(dayNumber, newMinutes);
      learnDayNumbers.push(dayNumber);
    }

    const estimated = kind === 'evaluation' ? input.dailyMinutes : newMinutes + reviewMinutes;
    days.push({
      dayNumber,
      date: fmtDate(dates[k]),
      kind,
      newItems,
      reviewOf,
      reviewMinutes: r1(kind === 'evaluation' ? input.dailyMinutes : reviewMinutes),
      newMinutes: r1(newMinutes),
      estimatedMinutes: r1(Math.min(estimated, input.dailyMinutes)),
    });
  }

  const planned = zero();
  for (const c of CATEGORIES) planned[c] = totals[c] - remaining[c];
  const totalItems = CATEGORIES.reduce((n, c) => n + totals[c], 0);
  const plannedItems = CATEGORIES.reduce((n, c) => n + planned[c], 0);
  const coverage = totalItems ? plannedItems / totalItems : 1;

  // Kebutuhan menit/hari agar seluruh materi muat (belajar + ulang), pada jumlah hari belajar efektif.
  const requiredMinutesPerDay = dates.length
    ? Math.ceil((totalMinutesNeeded * (1 + REVIEW_OFFSETS.length * REVIEW_COST_RATIO) * 1.15) / dates.length)
    : 0;

  const warnings: string[] = [];
  const feasible = coverage >= 0.99;
  if (!feasible)
    warnings.push(
      `Dengan pengaturan ini baru ${Math.round(coverage * 100)}% materi target yang muat. ` +
        `Tambah durasi/hari belajar, atau sekitar ${requiredMinutesPerDay} menit per hari, untuk menuntaskan semuanya.`,
    );
  if (input.dailyMinutes > COMFORT_MINUTES) warnings.push('Beban harian di atas 3 jam — pastikan tetap realistis dan sisakan waktu istirahat.');
  if (dates.length === 0) warnings.push('Tidak ada hari belajar dalam rentang ini.');

  const weeks = buildWeeks(days, input);
  const endDate = fmtDate(parseDate(input.startDate) + (input.durationDays - 1) * DAY_MS);

  return {
    fingerprint: planFingerprint(input),
    input,
    days,
    weeks,
    warnings,
    summary: {
      totalItems: totals,
      plannedItems: planned,
      coverage,
      studyDays: dates.length,
      restDays,
      evaluationDays: days.filter(d => d.kind === 'evaluation').length,
      consolidationDays: days.filter(d => d.kind === 'consolidation').length,
      requiredMinutesPerDay,
      feasible,
      endDate,
    },
  };
}

const CAT_LABEL: Record<Category, string> = { kotoba: 'Kosakata', kanji: 'Kanji', bunpou: 'Tata bahasa' };

function buildWeeks(days: PlanDay[], input: PlanInput): PlanWeek[] {
  const start = parseDate(input.startDate);
  const byWeek = new Map<number, PlanDay[]>();
  for (const d of days) {
    const w = Math.floor((parseDate(d.date) - start) / (7 * DAY_MS)) + 1;
    byWeek.set(w, [...(byWeek.get(w) ?? []), d]);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, ds]) => {
      const newItems = zero();
      let minutes = 0;
      for (const d of ds) {
        minutes += d.estimatedMinutes;
        for (const it of d.newItems) newItems[it.category] += it.count;
      }
      const top = CATEGORIES.slice().sort((a, b) => newItems[b] - newItems[a]);
      const learnCount = ds.filter(d => d.kind === 'learn').length;
      const label = learnCount === 0
        ? 'Ulasan & penguatan'
        : ds.some(d => d.kind === 'evaluation') && learnCount <= 2
          ? 'Evaluasi & ulasan'
          : newItems[top[0]] > 0 && newItems[top[1]] > 0
            ? `${CAT_LABEL[top[0]]} & ${CAT_LABEL[top[1]]}`
            : CAT_LABEL[top[0]];
      return { week, startDate: ds[0].date, studyDays: ds.length, newItems, minutes: Math.round(minutes), label };
    });
}

export function isPlanError(x: LearningPlan | PlanError): x is PlanError {
  return 'code' in x;
}
