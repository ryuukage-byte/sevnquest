/**
 * Penambahan EXP dengan presisi pecahan.
 *
 * `totalExp` tetap bilangan bulat (level, tier, leaderboard, cloud, dan tampilan semua membacanya sebagai
 * bilangan bulat). Pecahan reward (mis. mikro-EXP flip kartu = base × 0,005) disimpan di `expFraction`
 * (0 ≤ nilai < 1) dan dibawa ke reward berikutnya, jadi tidak ada EXP yang hilang karena pembulatan.
 * Hitungan memakai satuan mikro-EXP (bilangan bulat) agar tidak ada drift floating point.
 */
const MICRO = 1_000_000;

export interface ExpAwardResult {
  totalExp: number;
  expFraction: number;
}

export function applyExpGain(totalExp: number, expFraction: number | undefined, gained: number): ExpAwardResult {
  const safeTotal = Number.isFinite(totalExp) ? Math.max(0, totalExp) : 0;
  const safeFraction = Number.isFinite(expFraction) ? Math.min(Math.max(expFraction as number, 0), 1) : 0;
  const safeGain = Number.isFinite(gained) ? Math.max(0, gained) : 0;

  const micro = Math.round(safeTotal * MICRO) + Math.round(safeFraction * MICRO) + Math.round(safeGain * MICRO);
  const whole = Math.floor(micro / MICRO);
  return { totalExp: whole, expFraction: (micro - whole * MICRO) / MICRO };
}

/** Tampilan EXP hasil sesi: maksimal 2 desimal, tanpa nol di belakang (mis. 12, 12.5, 0.1). */
export function formatExp(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value * 100) / 100);
}
