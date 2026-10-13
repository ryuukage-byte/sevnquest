import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { buildCurriculum, normalizeProfile } from './curriculum';
import type { Curriculum, CurriculumSources, GuidedProfile } from './types';

/** Basis data materi SevnQuest sebagai sumber kurikulum (urutan = urutan basis data). */
export function getCurriculumSources(): CurriculumSources {
  return {
    kotoba: Object.values(KOTOBA_DATABASE),
    kanji: Object.values(KANJI_DATABASE),
    bunpou: Object.values(BUNPOU_DATABASE),
  };
}

let cache: { key: string; curriculum: Curriculum } | null = null;

/** Kurikulum untuk profil ini dari basis data asli. Deterministik, jadi cukup satu hasil terakhir yang disimpan. */
export function getCurriculum(profile: GuidedProfile): Curriculum {
  const key = JSON.stringify(normalizeProfile(profile));
  if (cache?.key !== key) cache = { key, curriculum: buildCurriculum(profile, getCurriculumSources()) };
  return cache.curriculum;
}
