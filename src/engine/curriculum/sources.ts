import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import type { ItemMasteryRecord } from '../../types/content';
import { buildCurriculum, isCoreKotoba, isLearned, normalizeProfile, LEVEL_ORDER } from './curriculum';
import { sortBunpouForLearning } from './bunpouOrder';
import type { Curriculum, CurriculumSources, GuidedProfile, JlptLevel, StartLevel } from './types';

let sources: CurriculumSources | null = null;

/** Basis data materi SevnQuest sebagai sumber kurikulum. Kotoba/kanji: urutan basis data; bunpou: urutan belajar kurasi. */
export function getCurriculumSources(): CurriculumSources {
  if (!sources) {
    sources = {
      kotoba: Object.values(KOTOBA_DATABASE),
      kanji: Object.values(KANJI_DATABASE),
      bunpou: sortBunpouForLearning(Object.values(BUNPOU_DATABASE)),
    };
  }
  return sources;
}

let cache: { key: string; curriculum: Curriculum } | null = null;

/** Kurikulum untuk profil ini dari basis data asli. Hanya bergantung pada level, jadi cukup satu hasil terakhir yang disimpan. */
export function getCurriculum(profile: GuidedProfile): Curriculum {
  const p = normalizeProfile(profile);
  const key = `${p.currentLevel}>${p.targetLevel}`;
  if (cache?.key !== key) cache = { key, curriculum: buildCurriculum(p, getCurriculumSources()) };
  return cache.curriculum;
}

export interface FoundationLevel {
  level: JlptLevel;
  /** Materi inti level ini. */
  core: number;
  /** Yang tercatat sudah dipelajari di riwayat belajar. */
  learned: number;
}

/**
 * Diagnosis fondasi: memilih "level saat ini = N2" tidak membuktikan N2 sudah dikuasai. Fungsi ini melaporkan
 * berapa materi inti level-level di BAWAH program yang benar-benar tercatat dipelajari, supaya pengguna bisa
 * memutuskan mulai dari level yang lebih rendah.
 */
export function getFoundation(
  currentLevel: StartLevel,
  mastery: Record<string, ItemMasteryRecord> | undefined
): FoundationLevel[] {
  if (currentLevel === 'PEMULA') return [];
  const src = getCurriculumSources();
  const levels = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(currentLevel) + 1);
  return levels.map(level => {
    const ids = [
      ...src.kotoba.filter(k => k.jlpt === level && isCoreKotoba(k)).map(k => k.id),
      ...src.kanji.filter(k => k.jlpt === level).map(k => k.id),
      ...src.bunpou.filter(b => b.level === level).map(b => b.id),
    ];
    return { level, core: ids.length, learned: ids.filter(id => isLearned(mastery, id)).length };
  });
}
