import { useCallback, useState } from 'react';

/** Kata yang disimpan dari Dungeon Imersi, lengkap dengan konteks lirik/subtitle-nya. */
export interface SavedWord {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  jlpt: string;
  videoId: string;
  startMs: number;
  line: string;
}

const KEY = 'sevnquest.immersion.savedWords.v1';

function load(): SavedWord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persist(words: SavedWord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(words));
  } catch { /* penyimpanan penuh/diblokir: daftar tetap hidup selama sesi */ }
}

export function useSavedWords() {
  const [saved, setSaved] = useState<SavedWord[]>(load);

  const toggle = useCallback((word: SavedWord) => {
    setSaved(prev => {
      const next = prev.some(w => w.id === word.id) ? prev.filter(w => w.id !== word.id) : [...prev, word];
      persist(next);
      return next;
    });
  }, []);

  return { saved, toggle };
}
