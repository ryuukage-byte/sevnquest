import type { ProductConfig } from '../types';

export const config: ProductConfig = {
  id: 'beginner',
  title: 'Pemula',
  tagline: 'Dari nol sampai bisa membaca dan menyusun kalimat dasar.',
  heroTitle: 'MULAI DARI NOL',
  heroSubtitle: 'Belajar bahasa Jepang dengan memahami, selangkah demi selangkah.',
  modules: [
    { id: 'kana', title: 'Hiragana', subtitle: 'Huruf dasar bahasa Jepang', lessonIds: ['beginner-001', 'beginner-002', 'beginner-003'] },
    { id: 'sapaan', title: 'Sapaan & Perkenalan', subtitle: 'Kalimat pertama yang langsung terpakai', lessonIds: ['beginner-004', 'beginner-005'] },
    { id: 'kalimat', title: 'Struktur Kalimat', subtitle: 'Urutan kata dan partikel', lessonIds: ['beginner-006', 'beginner-007'] },
    { id: 'angka', title: 'Angka', subtitle: 'Menghitung 1 sampai 10', lessonIds: ['beginner-008'] },
  ],
  planner: {
    goals: [{ v: 'N5', l: 'Fondasi pemula (setara JLPT N5)' }],
    starts: [{ v: 'none', l: 'Dari nol' }],
    focuses: ['balanced', 'kotoba', 'kanji', 'bunpou'],
    defaults: { durationDays: 240, dailyMinutes: 45, daysPerWeek: 6 },
  },
};
