/**
 * Pintu tunggal ke bank soal mentah & dataset turunan, khusus untuk modul lazy (dungeonGenerator,
 * QuestionLibraryView). Jalur boot tidak boleh mengimpor berkas ini: bank soal dimuat di latar belakang
 * lewat `ensureFullData()` (fullData.ts), sementara kanji.ts / bunpou.ts hanya memuat materi intinya.
 */
import kanjiExtremeStagesJson from './db/kanji_extreme_100_stages.json';

export { KANJI_QUESTION_BANK } from './kanjiQuestions';
export { BUNPOU_QUESTION_BANK } from './bunpouQuestions';
export const KANJI_EXTREME_STAGES = kanjiExtremeStagesJson;
