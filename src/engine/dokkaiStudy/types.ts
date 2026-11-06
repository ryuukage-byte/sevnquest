// Tipe bersama modul Dokkai (読解): koleksi bacaan, generator, dan analisis belajar.

export type DokkaiLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type DokkaiSource = 'database' | 'tryout' | 'generated';

export interface DokkaiQuestionData {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Pembahasan asli (database/tryout) atau buatan template generator. */
  explanation?: string;
  /** Kalimat bukti di teks bila diketahui pasti (generator). */
  evidence?: string;
  /** Instruksi bagian ujian (問題4 …) bila ada. */
  instruction?: string;
}

export interface DokkaiPassage {
  id: string;
  title: string;
  level: DokkaiLevel;
  /** Label level asli untuk tampilan (mis. 'JFT'). */
  levelLabel: string;
  source: DokkaiSource;
  /** Asal bacaan (mis. "JLPT N3 Juli 2023", "Database Dokkai", "Rakit Dokkai"). */
  sourceLabel: string;
  category?: string;
  text: string;
  questions: DokkaiQuestionData[];
  /** Glosarium bawaan (database dokkai). */
  vocabularyList?: { word: string; reading: string; meaning: string }[];
  /** Terjemahan per kalimat, kunci = kalimat Jepang yang dinormalkan (lihat normSentence). */
  sentenceTranslations?: Record<string, string>;
  /** Inti bacaan yang diketahui pasti (generator). */
  mainIdea?: { text: string; translation?: string };
}

export const LEVEL_RANK: Record<string, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4, JFT: 1 };
export const DOKKAI_LEVELS: DokkaiLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const levelRank = (lv: string | undefined): number => LEVEL_RANK[(lv || '').toUpperCase()] ?? 5;
