// ==============================================================================
// TOWER 1 — PEMBANGUN ROOM (membentuk Room latihan dari kolam aksara/kata)
// Pengecoh dipilih deterministik (seed dari isi soal) supaya tes stabil dan
// hasil bank soal tidak berubah antar-render.
// ==============================================================================

import { BuildItem, BuildRoom, ChoiceQuestion, ChoiceRoom, PairRoom } from '../../engine/tower1/types';
import { hashString, seededShuffle, splitBeats } from '../../engine/tower1/jp';
import { KanaCell } from './kana';
import { Word } from './words';

function pickDistractors<T>(
  pool: T[],
  exclude: (t: T) => boolean,
  count: number,
  seedKey: string,
  keyOf: (t: T) => string = t => String(t)
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of seededShuffle(pool.filter(x => !exclude(x)), hashString(seedKey))) {
    const key = keyOf(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length === count) break;
  }
  return out;
}

/** Mendengar bunyi → memilih aksara. */
export function soundToKanaRoom(
  id: string,
  title: string,
  cells: KanaCell[],
  pool: KanaCell[],
  opts: { kicker?: string; count?: number; passRatio?: number; showRomaji?: boolean } = {}
): ChoiceRoom {
  const chosen = seededShuffle(cells, hashString(id)).slice(0, opts.count ?? cells.length);
  return {
    id, title, kind: 'choice', skill: 'tulisan', kicker: opts.kicker ?? 'Latih', passRatio: opts.passRatio,
    questions: chosen.map(c => {
      // Pengecoh tidak boleh sebunyi dengan jawaban (じ/ぢ, ず/づ) dan tidak boleh kembar satu sama lain.
      const opts4 = [c, ...pickDistractors(pool, x => x.k === c.k || x.r === c.r, 3, `${id}:${c.k}`, x => x.r)];
      const options = seededShuffle(opts4, hashString(`${id}:o:${c.k}`)).map(x => x.k);
      return {
        prompt: 'Dengarkan bunyinya, lalu pilih aksara yang tepat.',
        say: c.k,
        listenOnly: true,
        fallback: opts.showRomaji === false ? undefined : c.r,
        options,
        answer: options.indexOf(c.k),
        explain: `「${c.k}」 dibaca "${c.r}".`
      } satisfies ChoiceQuestion;
    })
  };
}

/** Melihat aksara → memilih bunyi (romaji sebagai label bunyi). */
export function kanaToSoundRoom(
  id: string,
  title: string,
  cells: KanaCell[],
  pool: KanaCell[],
  opts: { kicker?: string; count?: number; passRatio?: number } = {}
): ChoiceRoom {
  const chosen = seededShuffle(cells, hashString(id)).slice(0, opts.count ?? cells.length);
  return {
    id, title, kind: 'choice', skill: 'tulisan', kicker: opts.kicker ?? 'Latih', passRatio: opts.passRatio,
    questions: chosen.map(c => {
      const distractors = pickDistractors(pool, x => x.r === c.r, 3, `${id}:${c.k}`, x => x.r);
      const options = seededShuffle([c, ...distractors], hashString(`${id}:o:${c.k}`)).map(x => x.r);
      return {
        prompt: 'Bagaimana bunyi aksara ini?',
        glyph: c.k,
        say: c.k,
        options,
        answer: options.indexOf(c.r),
        explain: `「${c.k}」 dibaca "${c.r}".`
      } satisfies ChoiceQuestion;
    })
  };
}

/** Pasangan aksara ↔ bunyi (ketuk kiri lalu kanan). */
export function kanaPairRoom(id: string, title: string, cells: KanaCell[], kicker = 'Latih'): PairRoom {
  return {
    id, title, kind: 'pair', skill: 'tulisan', kicker,
    prompt: 'Pasangkan aksara dengan bunyinya.',
    pairs: cells.map(c => [c.k, c.r] as [string, string])
  };
}

/** Melihat kata (tanpa Romaji) → memilih arti. */
export function wordMeaningRoom(
  id: string,
  title: string,
  words: Word[],
  allWords: Word[],
  opts: { kicker?: string; count?: number; passRatio?: number } = {}
): ChoiceRoom {
  const chosen = seededShuffle(words, hashString(id)).slice(0, opts.count ?? words.length);
  return {
    id, title, kind: 'choice', skill: 'kata', kicker: opts.kicker ?? 'Latih', passRatio: opts.passRatio,
    questions: chosen.map(w => {
      const distractors = pickDistractors(allWords, x => x.id === w.id || x.jp === w.jp, 3, `${id}:${w.jp}`, x => x.id);
      const options = seededShuffle([w, ...distractors], hashString(`${id}:o:${w.jp}`)).map(x => x.id);
      return {
        prompt: 'Baca kata ini. Apa artinya?',
        glyph: w.jp,
        say: w.jp,
        options,
        answer: options.indexOf(w.id),
        explain: `「${w.jp}」 berarti "${w.id}".`
      } satisfies ChoiceQuestion;
    })
  };
}

/** Mendengar kata → memilih arti (tanpa melihat aksara). */
export function wordListenRoom(
  id: string,
  title: string,
  words: Word[],
  allWords: Word[],
  opts: { kicker?: string; count?: number; passRatio?: number } = {}
): ChoiceRoom {
  const chosen = seededShuffle(words, hashString(id)).slice(0, opts.count ?? words.length);
  return {
    id, title, kind: 'choice', skill: 'kata', kicker: opts.kicker ?? 'Latih', passRatio: opts.passRatio,
    questions: chosen.map(w => {
      const distractors = pickDistractors(allWords, x => x.id === w.id || x.jp === w.jp, 3, `${id}:${w.jp}`, x => x.id);
      const options = seededShuffle([w, ...distractors], hashString(`${id}:o:${w.jp}`)).map(x => x.id);
      return {
        prompt: 'Dengarkan kata ini. Apa artinya?',
        say: w.jp,
        listenOnly: true,
        fallback: w.jp,
        options,
        answer: options.indexOf(w.id),
        explain: `「${w.jp}」 berarti "${w.id}".`
      } satisfies ChoiceQuestion;
    })
  };
}

/** Arti → menyusun kata dari ubin aksara. */
export function wordBuildRoom(
  id: string,
  title: string,
  words: Word[],
  poolChars: string[],
  opts: { kicker?: string; count?: number; passRatio?: number; extra?: number } = {}
): BuildRoom {
  const chosen = seededShuffle(words, hashString(id)).slice(0, opts.count ?? words.length);
  return {
    id, title, kind: 'build', skill: 'menulis', kicker: opts.kicker ?? 'Latih', passRatio: opts.passRatio,
    items: chosen.map(w => {
      const answer = splitBeats(w.jp);
      const extra = pickDistractors(Array.from(new Set(poolChars)), c => answer.includes(c), opts.extra ?? 2, `${id}:x:${w.jp}`);
      return {
        prompt: `Susun kata untuk "${w.id}".`,
        say: w.jp,
        fallback: undefined,
        answer,
        extra,
        explain: `"${w.id}" ditulis 「${w.jp}」.`
      } satisfies BuildItem;
    })
  };
}

/** Pasangan aksara-miripan → pertanyaan pembeda. */
export function lookalikeRoom(
  id: string,
  title: string,
  items: { glyph: string; sound: string; confusedWith: string; note: string }[],
  kicker = 'Latih'
): ChoiceRoom {
  return {
    id, title, kind: 'choice', skill: 'tulisan', kicker,
    questions: items.map(it => {
      const options = seededShuffle([it.sound, it.confusedWith], hashString(`${id}:${it.glyph}`));
      return {
        prompt: 'Aksara ini sering tertukar. Bagaimana bunyinya?',
        glyph: it.glyph,
        say: it.glyph,
        options,
        answer: options.indexOf(it.sound),
        explain: it.note
      } satisfies ChoiceQuestion;
    })
  };
}
