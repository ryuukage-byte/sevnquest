// Universal Question Cleaner and Normalizer
// Extracts instructions, translations, pure Japanese prompts, and furigana readings.

import { Question } from '../types/content';
import { normalizeJapanesePunctuation } from './furiganaUtils';

export interface NormalizedQuestion extends Question {
  instruction: string;
  instructionId: string;
  prompt: string;
  ruby?: string;
  translation?: string;
}

/**
 * Normalizes any Question object to guarantee:
 * 1. Pure Japanese prompt (without mixed Indonesian instructions or leaked translations)
 * 2. Formal Japanese instruction header with Indonesian sub-caption
 * 3. Separate translation field for toggleable display
 * 4. Normalized ruby reading
 */
export function normalizeQuestion(q: Question): NormalizedQuestion {
  let prompt = (q.prompt || '').trim();
  let instruction = q.instruction?.trim();
  let instructionId = q.instructionId?.trim();
  let translation = q.translation?.trim();
  let ruby = q.ruby?.trim();

  // 1. Extract 'Arti: ...' or '(Arti: ...)' or 'Arti kalimat: ...' from prompt
  const artiMatch = prompt.match(/(?:\n*|\s*)\(?(?:Arti|Arti kalimat|Terjemahan):\s*([^\n\)]+)\)?/i);
  if (artiMatch) {
    if (!translation) {
      translation = artiMatch[1].trim();
    }
    prompt = prompt.replace(artiMatch[0], '').trim();
  }

  // 2. Remove Level badges (e.g. 【Level 4: Context Collocation】)
  prompt = prompt.replace(/^【Level[^】]+】[\s\n]*/i, '').trim();

  // 3. Extract and separate Indonesian instruction prefixes
  if (!instruction) {
    if (/lengkapi(lah)?\s*kalimat/i.test(prompt)) {
      instruction = '次の文の（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。';
      instructionId = 'Lengkapilah kalimat berikut dengan jawaban yang paling tepat.';
      prompt = prompt.replace(/^lengkapi(lah)?\s*kalimat[^\n:]*[:\n]*/i, '').trim();
    } else if (/pola\s*tata\s*bahasa/i.test(prompt)) {
      instruction = '次の文に最も適した文法パターンを選びなさい。';
      instructionId = 'Pilihlah pola tata bahasa yang paling tepat.';
      prompt = prompt.replace(/^pilih\s*pola\s*tata\s*bahasa[^\n:]*[:\n]*/i, '').trim();
    } else if (/(?:arti|makna).*?(?:kata|kosakata)/i.test(prompt)) {
      instruction = '次の言葉の意味として最も適切なものを一つ選びなさい。';
      instructionId = 'Pilihlah arti yang paling tepat untuk kosakata berikut.';
      prompt = prompt.replace(/^.*?(?:arti|makna).*?(?:kata|kosakata)[^\n:「]*[:\s]*/i, '').trim();
    } else if (/bahasa\s*jepang\s*yang\s*tepat/i.test(prompt)) {
      instruction = '次の意味を表す日本語として最も適切なものを一つ選びなさい。';
      instructionId = 'Pilihlah bahasa Jepang yang paling tepat.';
      prompt = prompt.replace(/^bahasa\s*jepang\s*yang\s*tepat[^\n:]*[:\n]*/i, '').trim();
    } else if (/(?:cara\s*penulisan|cara\s*baca|bacaan\s*yang\s*tepat)/i.test(prompt)) {
      instruction = '___の言葉の正しい読み方を選びなさい。';
      instructionId = 'Pilihlah cara baca yang paling tepat.';
      prompt = prompt.replace(/^pilih\s*cara\s*(?:penulisan|bacaan|baca)[^\n:]*[:\n]*/i, '').trim();
    } else if (/kanji/i.test(prompt) && /(?:arti|baca|makna)/i.test(prompt)) {
      instruction = '漢字に関する問題として最も適切なものを一つ選びなさい。';
      instructionId = 'Pilihlah jawaban yang paling tepat untuk kanji berikut.';
      prompt = prompt.replace(/^(?:apa|pilih)[^\n:]*kanji[^\n:]*[:\n]*/i, '').trim();
    } else if (/susun\s*kata/i.test(prompt)) {
      instruction = '次の文の★に入る最もよいものを、1・2・3・4から一つ選びなさい。';
      instructionId = 'Susunlah kata-kata dan temukan bagian yang berada pada tanda ★.';
      prompt = prompt.replace(/^susun[^\n:]*[:\n]*/i, '').trim();
    }
  }

  // 4. Extract word and reading if formatted like: 「言葉」 (reading) or 「言葉」
  const wordWithReadingMatch = prompt.match(/^「([^」]+)」(?:\s*\(([^\)]+)\))?$/);
  if (wordWithReadingMatch) {
    prompt = wordWithReadingMatch[1].trim();
    if (!ruby && wordWithReadingMatch[2]) {
      ruby = wordWithReadingMatch[2].trim();
    }
  }

  // 5. Unwrap surrounding quotes or brackets if present: 「...」 or "..."
  const bracketMatch = prompt.match(/^「([^」]+)」$/);
  if (bracketMatch) {
    prompt = bracketMatch[1].trim();
  }

  // 6. Clean quotes: "..." -> ...
  if (prompt.startsWith('"') && prompt.endsWith('"') && prompt.length > 2) {
    prompt = prompt.substring(1, prompt.length - 1).trim();
  }

  // 7. If prompt still has a leading colon or dashes, remove them
  prompt = prompt.replace(/^[:：\-—]\s*/, '').trim();

  // Normalize punctuation (brackets, underscores)
  prompt = normalizeJapanesePunctuation(prompt);
  if (ruby) {
    ruby = normalizeJapanesePunctuation(ruby);
  }

  return {
    ...q,
    instruction: instruction || '次の問いに最も適した答えを一つ選びなさい。',
    instructionId: instructionId || 'Pilihlah satu jawaban yang paling tepat.',
    prompt,
    ruby: ruby || undefined,
    translation: translation || undefined,
  };
}
