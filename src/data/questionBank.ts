/**
 * Pintu tunggal ke bank soal & dataset turunan.
 * Konsumen (kanji.ts, bunpou.ts, dungeonGenerator, QuestionLibraryView) mengimpor dari sini,
 * bukan dari berkas JSON mentah, sehingga hanya ada satu jalur akses ke tiap dataset
 * (dan satu tempat untuk menggantinya dengan pemuat asinkron kelak).
 */
import kanjiQuestionsJson from './db/kanji_questions.json';
import bunpouQuestionsJson from './db/bunpou_questions.json';
import kanjiExtremeStagesJson from './db/kanji_extreme_100_stages.json';

export const KANJI_QUESTION_BANK = kanjiQuestionsJson;
export const BUNPOU_QUESTION_BANK = bunpouQuestionsJson;
export const KANJI_EXTREME_STAGES = kanjiExtremeStagesJson;
