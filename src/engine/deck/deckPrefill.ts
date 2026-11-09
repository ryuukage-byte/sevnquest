import type { DeckType } from '../../types/rpg';

/**
 * Isian awal untuk Penyusun Deck (AIDeckCustomizerModal), mis. disiapkan oleh Naga Pemandu
 * sebelum pemain pindah ke Buku Saku. Semua field opsional; modal tetap memakai alurnya sendiri.
 */
export interface DeckAiPrefill {
  topic?: string;
  /** id tema siap pakai di DECK_THEMES. */
  themeId?: string;
  focus?: DeckType;
  levels?: string[];
  count?: number;
}

/** Permintaan berpenghitung (pola sama dengan libraryTabRequest): `n` naik tiap permintaan baru. */
export interface DeckAiRequest {
  prefill: DeckAiPrefill;
  n: number;
}
