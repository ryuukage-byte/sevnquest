import type { Lesson } from '../engine/lessonSchema';

const modules = import.meta.glob('./lessons/*.json', { eager: true, import: 'default' }) as Record<string, Lesson>;
export const LESSONS: Lesson[] = Object.values(modules).sort((a, b) => a.id.localeCompare(b.id));
export const getLesson = (id: string) => LESSONS.find(l => l.id === id);

export interface PathInfo { id: string; title: string; subtitle: string; goal: string; lessonLevel?: Lesson['level'] }

export const PATHS: PathInfo[] = [
  { id: 'beginner', title: 'Beginner', subtitle: 'Belajar bahasa Jepang dari nol', goal: 'N5', lessonLevel: 'N5' },
  { id: 'jft', title: 'JFT-Basic', subtitle: 'Persiapan ujian JFT-Basic', goal: 'JFT' },
  { id: 'n5', title: 'JLPT N5', subtitle: 'Fondasi: kana, kanji dasar, tata bahasa awal', goal: 'N5', lessonLevel: 'N5' },
  { id: 'n4', title: 'JLPT N4', subtitle: 'Percakapan sehari-hari', goal: 'N4', lessonLevel: 'N4' },
  { id: 'n3', title: 'JLPT N3', subtitle: 'Jembatan menuju bahasa menengah', goal: 'N3', lessonLevel: 'N3' },
  { id: 'n2', title: 'JLPT N2', subtitle: 'Bahasa kerja dan media', goal: 'N2', lessonLevel: 'N2' },
  { id: 'n1', title: 'JLPT N1', subtitle: 'Tingkat lanjut', goal: 'N1', lessonLevel: 'N1' },
  { id: 'ssw2', title: 'SSW 2', subtitle: 'Dari SSW 1 menuju SSW 2', goal: 'SSW2' },
];
