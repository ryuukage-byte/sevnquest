// Pemeriksa teks screenshot bukti bayar (hasil OCR). Murni, tanpa React/Supabase, supaya bisa diuji.
// Hanya PETUNJUK untuk admin: persetujuan tetap manual.

export interface ProofCheck {
  /** Nominal transfer pesanan (dengan kode unik) ditemukan persis. */
  amountOk: boolean;
  /** Nama toko QRIS (SevnSoul) ditemukan. */
  merchantOk: boolean;
  /** Ada kata status berhasil (Sukses/Berhasil/Success/Lunas). */
  successOk: boolean;
  /** Semua nominal rupiah yang terbaca (untuk ditampilkan bila tidak cocok). */
  amounts: number[];
  verdict: 'verified' | 'partial' | 'mismatch';
}

/** Kata kunci nama toko, sudah dinormalisasi (huruf kecil, tanpa spasi). */
export const MERCHANT_KEYS = ['sevnsoul'] as const;

/** Ambil semua angka berformat nominal (Rp8.001, 8,001, 17.001,00, 102001) dari teks OCR. */
export function extractAmounts(text: string): number[] {
  const out: number[] = [];
  // Angka berpemisah ribuan (8.001, 17,001) selalu dihitung; angka polos (102001) hanya bila diawali Rp/IDR,
  // supaya kode pos atau nomor referensi tidak ikut terbaca sebagai nominal.
  const re = /(?:(rp|idr)\s*)?(?<![\d.,])(\d{1,3}(?:[.,]\d{3})+|\d{4,9})(?:[.,]00)?(?![\d])/gi;
  for (const m of text.matchAll(re)) {
    const grouped = /[.,]/.test(m[2]);
    if (!grouped && !m[1]) continue;
    const n = Number(m[2].replace(/[^\d]/g, ''));
    if (Number.isFinite(n) && n >= 1000 && n <= 100_000_000 && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Huruf kecil, buang spasi/tanda baca, dan perbaiki salah baca OCR yang umum (0->o, 1->l, 5->s). */
function squash(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/5/g, 's')
    .replace(/[^a-z]/g, '');
}

export function checkProofText(text: string, expectedAmount: number, merchantKeys: readonly string[] = MERCHANT_KEYS): ProofCheck {
  const amounts = extractAmounts(text || '');
  const amountOk = amounts.includes(Math.round(expectedAmount));
  const flat = squash(text || '');
  const merchantOk = merchantKeys.some(k => flat.includes(k));
  const successOk = /\b(sukses|berhasil|success(ful)?|lunas|paid|transaksi berhasil)\b/i.test(text || '');
  const verdict = amountOk && merchantOk && successOk ? 'verified' : amountOk || merchantOk ? 'partial' : 'mismatch';
  return { amountOk, merchantOk, successOk, amounts, verdict };
}
