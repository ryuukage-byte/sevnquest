// ==============================================================================
// PENJAGA OPSI PILIHAN GANDA
// Pengecoh tidak boleh kembar satu sama lain dan tidak boleh sama dengan jawaban,
// supaya soal tidak punya dua jawaban "benar" (mis. opsi "u" muncul dua kali).
// ==============================================================================

const norm = (s: string) => s.trim().toLowerCase();

/** Ambil `count` pengecoh unik (dibandingkan tanpa beda huruf besar/spasi) yang berbeda dari jawaban. */
export function pickUniqueDistractors(correct: string, candidates: Array<string | undefined | null>, count: number): string[] {
  const seen = new Set<string>([norm(correct)]);
  const out: string[] = [];
  for (const c of candidates) {
    if (!c || !c.trim()) continue;
    const key = norm(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length === count) break;
  }
  return out;
}

/** Benar jika opsi unik dan indeks jawaban menunjuk ke opsi yang ada. */
export function isValidChoiceSet(options: string[], correctIndex: number): boolean {
  if (correctIndex < 0 || correctIndex >= options.length) return false;
  return new Set(options.map(norm)).size === options.length;
}
