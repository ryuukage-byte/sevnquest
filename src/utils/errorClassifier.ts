import type { ErrorType, Question } from '../types/content';

/**
 * Klasifikasi jenis kesalahan untuk jawaban salah. Tidak ada data soal yang membawa `errorTypeMap`,
 * jadi jenis kesalahan disimpulkan dari konteks soal (tag, instruksi, ID, bentuk pilihan).
 * Bila `Question.errorTypeMap[selectedIndex]` ada, itu yang dipakai (override eksplisit dari data).
 */
const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'から', 'まで', 'の', 'も', 'より', 'や', 'ので', 'のに'];

/** "まいしゅう (maishuu)" -> "まいしゅう"; buang spasi & tanda kurung penjelas. */
function core(option: string | undefined): string {
  return (option || '').split(/[\s（(]/)[0].trim();
}

export function classifyWrongAnswer(q: Question, selectedIndex: number): ErrorType {
  const mapped = q.errorTypeMap?.[selectedIndex];
  if (mapped) return mapped;

  const tag = (q.contextTag || '').toLowerCase();
  const id = q.id || '';
  const prompt = q.prompt || '';
  const instruction = `${q.instruction || ''} ${q.instructionId || ''}`.toLowerCase();

  if (/passive|ukemi/.test(tag)) return 'PASSIVE_CONFUSION';
  if (/causative|shieki/.test(tag)) return 'CAUSATIVE_CONFUSION';
  if (/listening|choukai/.test(tag) || q.audioPrompt) return 'LISTENING_DISTRACTOR';
  if (/inference|dokkai|reading_comp/.test(tag)) return 'INFERENCE_OVERLOOK';

  const hasKanji = (t: string) => /[一-龥]/.test(t);
  const kanjiQuestion = id.startsWith('kj_') || /kanji/.test(tag) || /漢字/.test(instruction);
  const asksReading = /読み方|読み|ひらがな|cara baca|kunyomi|onyomi|kun'yomi|on'yomi/i.test(`${prompt} ${instruction}`) || /reading|yomi/.test(tag);
  const options = q.options || [];

  if (kanjiQuestion || asksReading) {
    if (asksReading) return 'KANJI_READING_MISMATCH';
    // Pilihan sama-sama berisi kanji (mis. memilih kanji yang mirip) -> tertukar kanji serupa
    if (options.length > 0 && options.every(o => hasKanji(core(o)))) return 'KANJI_SIMILAR_CONFUSION';
    return 'GENERAL_MISTAKE';
  }

  const correct = core(options[q.correctIndex]);
  const chosen = core(options[selectedIndex]);

  // Pasif vs kausatif: bentuk pasif (〜れる/られる) tertukar dengan kausatif (〜せる/させる), dan sebaliknya
  const passiveForm = /(ら)?れ(る|て|た|ない|ます|ば)/;
  const causativeForm = /(さ)?せ(る|て|た|ない|ます|ば)/;
  if (passiveForm.test(correct) && causativeForm.test(chosen) && !passiveForm.test(chosen)) return 'PASSIVE_CONFUSION';
  if (causativeForm.test(correct) && passiveForm.test(chosen) && !causativeForm.test(chosen)) return 'CAUSATIVE_CONFUSION';

  if (PARTICLES.includes(correct) && PARTICLES.includes(chosen)) return 'PARTICLE_MISMATCH';

  if (/^(kotoba|kt_|rc_kotoba)/.test(id) || /vocab|kotoba|word/.test(tag)) return 'VOCAB_DISTRACTOR';
  if (/nuance|context/.test(tag)) return 'NUANCE_CONTEXT';

  // Soal isian (（　）): bila pilihan adalah bentuk dari kata yang sama (stem sama) -> kesalahan bentuk umum;
  // bila pilihannya ungkapan/kata berbeda -> memilih padanan yang tidak cocok dengan konteks
  if (/（　）|[(]\s*[)]/.test(prompt) && correct && chosen) {
    return correct[0] === chosen[0] ? 'GENERAL_MISTAKE' : 'NUANCE_CONTEXT';
  }
  return 'GENERAL_MISTAKE';
}

/**
 * Jalur "pending error": QuizEngine menaruh jenis kesalahan sesi tepat sebelum melapor selesai; handler
 * hasil belajar (handleStudyComplete) mengambilnya SEKALI saat mencatat percobaan ke mastery. Kedaluwarsa
 * 3 detik supaya sisa dari konteks yang tidak mengonsumsinya (mis. Tower) tidak menempel ke percobaan lain.
 */
let pending: { types: ErrorType[]; at: number } | null = null;
const PENDING_TTL_MS = 3000;

export function setPendingErrors(types: ErrorType[]): void {
  pending = types.length > 0 ? { types: [...types], at: Date.now() } : null;
}

export function consumePendingErrors(): ErrorType[] {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at <= PENDING_TTL_MS ? p.types : [];
}
