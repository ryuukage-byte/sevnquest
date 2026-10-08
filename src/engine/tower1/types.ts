// ==============================================================================
// TOWER 1 — TOWER OF TUTORIAL · TIPE (Floor schema + Room architecture)
// ------------------------------------------------------------------------------
// Tower 1 mengajarkan cara MELIHAT bahasa Jepang (decode), bukan memakainya.
// Arsitektur lengkap + koreksi DAG: docs/TOWER1_ARCHITECTURE.md
// ==============================================================================

/** ready = sudah bisa dimainkan; sealed = ada di DAG tetapi belum dibangun. */
export type FloorStatus = 'ready' | 'sealed';

export type FloorDomain = 'orientation' | 'A' | 'B' | 'C' | 'D' | 'kotoba' | 'konjugasi' | 'kanji' | 'pola' | 'ujian';

export interface FloorCapability {
  /** Apa yang dilihat pemain. */
  see: string;
  /** Apa yang dilakukan pemain. */
  do: string;
  /** Apa yang berubah pada kemampuannya. */
  change: string;
  /** Bagaimana kita tahu ia benar-benar belajar (mastery signal). */
  signal: string;
  /** Salah paham yang paling mungkin muncul. */
  misconception: string;
}

export interface FloorSpec {
  id: number;
  /** Kode tiga digit seperti di blueprint ("001"). */
  code: string;
  name: string;
  subtitle: string;
  status: FloorStatus;
  domain: FloorDomain;
  /** Posisi horizontal di peta (0..4, boleh pecahan). */
  col: number;
  /** Prasyarat keras: semua harus selesai agar lantai terbuka. */
  hard: number[];
  /** Prasyarat lunak: tidak mengunci, hanya menentukan urutan rekomendasi & tata letak. */
  soft: number[];
  /** Big Idea (BI1..BI8) yang dilatih lantai ini. */
  bigIdeas: string[];
  capability: FloorCapability;
  reward: { exp: number; gold: number };
  /** Menara tempat lantai ini berada (default 1). */
  tower?: 1 | 2;
  /** Jenis Room lantai ini bila Room-nya dibangun belakangan (Menara 2). */
  skills?: RoomSkill[];
}

// ------------------------------------------------------------------------------
// ROOM ARCHITECTURE — satu lantai = urutan Room. Lima jenis Room sudah cukup
// untuk seluruh Tower 1, dan semuanya memakai bahan visual yang sama.
//
// Markup teks Jepang: "[漢字|かんじ]" dirender sebagai furigana (<ruby>).
// ------------------------------------------------------------------------------

/**
 * Jenis kemampuan yang dilatih sebuah Room (inilah yang dilihat pemain, bukan peran node di graf).
 * pola = pola/aturan · bunyi = pendengaran & ketukan · tulisan = aksara · kata = arti kata ·
 * kalimat = susunan kalimat · menulis = menyusun/menulis sendiri.
 */
export type RoomSkill = 'pola' | 'bunyi' | 'tulisan' | 'kata' | 'kalimat' | 'menulis';

export interface RoomBase {
  id: string;
  /** Jenis kemampuan yang dilatih Room ini. */
  skill: RoomSkill;
  /** Judul pendek Room. */
  title: string;
  /** Label kecil di atas judul (misal "Temukan", "Latih", "Ujian"). */
  kicker?: string;
}

export interface LessonStep {
  title?: string;
  /** Glyph besar (aksara tunggal / kata). Mendukung markup furigana. */
  glyph?: string;
  /** Teks yang dibacakan TTS; tanpa ini tombol suara tidak tampil. */
  say?: string;
  /** Teks bantu di bawah glyph (misal romaji). */
  reading?: string;
  /** Isi penjelasan (Indonesia). */
  body?: string;
  /** Contoh kata/kalimat Jepang beserta artinya. */
  example?: { jp: string; meaning: string; say?: string };
  /** Pita ketukan (mora) — tiap elemen satu kotak ketukan. */
  beats?: string[];
  /** Kalimat yang dipotong per bagian, dengan peran opsional. */
  chunks?: { text: string; role?: string; king?: boolean }[];
  /** Deretan sel kecil (tabel aksara). */
  grid?: { glyph: string; sub?: string; say?: string }[];
  /** Perbandingan dua baris (misal Indonesia vs Jepang). */
  compare?: { label: string; value: string }[];
}

export interface LessonRoom extends RoomBase {
  kind: 'lesson';
  steps: LessonStep[];
}

export interface ChoiceQuestion {
  prompt: string;
  /** Glyph/kata besar yang ditampilkan di atas pilihan (mendukung furigana). */
  glyph?: string;
  /** Jika ada: tombol dengar. Dengan listenOnly, glyph disembunyikan. */
  say?: string;
  listenOnly?: boolean;
  /** Teks yang ditampilkan bila perangkat tidak punya suara Jepang. */
  fallback?: string;
  options: string[];
  /** Indeks jawaban benar pada options (sebelum diacak). */
  answer: number;
  explain?: string;
  /** Pita ketukan yang ditampilkan setelah menjawab. */
  reveal?: string[];
}

export interface ChoiceRoom extends RoomBase {
  kind: 'choice';
  questions: ChoiceQuestion[];
  /** Jika diisi: rasio benar-pertama minimal agar Room dianggap lulus (0..1). */
  passRatio?: number;
}

export interface PairRoom extends RoomBase {
  kind: 'pair';
  prompt: string;
  /** Pasangan [kiri, kanan]; kiri biasanya aksara, kanan bunyi/arti. */
  pairs: [string, string][];
}

export interface BuildItem {
  prompt: string;
  say?: string;
  fallback?: string;
  /** Urutan token yang benar. */
  answer: string[];
  /** Token pengecoh tambahan. */
  extra?: string[];
  explain?: string;
}

export interface BuildRoom extends RoomBase {
  kind: 'build';
  items: BuildItem[];
  passRatio?: number;
}

export interface PickToken {
  text: string;
  /** Furigana opsional untuk token ini. */
  ruby?: string;
}

export interface PickItem {
  prompt: string;
  tokens: PickToken[];
  /** Indeks token yang harus diketuk. */
  correct: number[];
  meaning?: string;
  explain?: string;
}

export interface PickRoom extends RoomBase {
  kind: 'pick';
  items: PickItem[];
  passRatio?: number;
}

export type Room = LessonRoom | ChoiceRoom | PairRoom | BuildRoom | PickRoom;

/** Hasil satu Room latihan (benar pada percobaan pertama). */
export interface RoomOutcome {
  correct: number;
  total: number;
}

// ------------------------------------------------------------------------------
// PROGRES
// ------------------------------------------------------------------------------

export interface FloorClearRecord {
  stars: 1 | 2 | 3;
  /** Akurasi percobaan-pertama pada percobaan terbaik (0..100). */
  accuracy: number;
  clearedAt: string;
  attempts: number;
}

export interface Tower1Progress {
  cleared: Record<number, FloorClearRecord>;
}

export type FloorNodeState = 'sealed' | 'locked' | 'available' | 'cleared';
