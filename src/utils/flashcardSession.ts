/**
 * Aturan sesi flashcard (murni, agar bisa diuji tanpa React):
 *  - mikro-EXP flip dibayar sekali per kartu per sesi, hanya saat kartu dibalik KE sisi jawaban;
 *    membalik kembali atau membalik berkali-kali tidak membayar lagi.
 *  - flip hanyalah paparan jawaban, bukan penilaian: tidak membuat attempt, skor, atau SRS.
 */
import { ENGINE_EXP_MULTIPLIER } from './rewards';

/** Mikro-EXP satu flip: base × 0,005, minimal 0,01, 2 desimal. */
export function flipExpFor(baseExp: number): number {
  return Math.max(0.01, Number((baseExp * ENGINE_EXP_MULTIPLIER.flashcard_flip).toFixed(2)));
}

/** true bila flip ini harus dibayar; menandai kartu sebagai sudah dibayar. */
export function claimFlipReward(paid: Set<string>, cardKey: string, flippingToBack: boolean): boolean {
  if (!flippingToBack || paid.has(cardKey)) return false;
  paid.add(cardKey);
  return true;
}
