/**
 * Teks yang diucapkan TTS harus sama dengan yang dibaca pemain di layar.
 *
 * - Anotasi yang bukan bahasa Jepang (romaji/terjemahan dalam kurung, 〜, kotak isian kosong) tidak diucapkan.
 * - Bila teks punya bacaan (furigana), ucapan diturunkan dari segmentasi furigana yang SAMA dengan tampilan
 *   (alignFurigana): kanji yang bacaannya berisiko dibaca lain oleh mesin TTS diganti kana furigananya,
 *   sisanya tetap kanji agar intonasi alami. Penentuan "berisiko" dihitung saat build dengan penganalisis
 *   morfologi (lihat buildSpeechHint & plugin sevn-speech-hints di vite.config.ts).
 */
import { alignFurigana, type RubySegment } from './furiganaUtils';

const LATIN = /[A-Za-zＡ-Ｚａ-ｚ]/;
const JAPANESE_LETTER = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff々〆〇]/;

/** Ubah katakana → hiragana (untuk membandingkan bacaan). */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function normalizeForCompare(text: string): string {
  return toHiragana(text).replace(/[\s　・]/g, '');
}

/**
 * Bersihkan teks sebelum diucapkan:
 * - "(kankei)", "（jalan-jalan setiap pagi）", "【Level 3】" → dihapus (anotasi Latin / label UI)
 * - "（　）", "＿＿＿", "…" → jeda singkat
 * - "〜わけではない" → "わけではない"; "た.べる" / "-さん" (notasi kun-yomi) → "たべる" / "さん"
 * - "まいつき / まいげつ" → "まいつき、まいげつ"
 */
export function cleanSpeechText(text: string): string {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/【[^】]*】/g, ' ');
  // Kurung berisi huruf Latin = romaji / terjemahan / catatan, bukan bagian kalimat Jepang.
  s = s.replace(/[（(]([^（）()]*)[）)]/g, (m, inner: string) => {
    if (LATIN.test(inner)) return ' ';
    return JAPANESE_LETTER.test(inner) ? m : '、'; // "（　？　）" = kotak isian → jeda
  });
  s = s.replace(/[＿_]{2,}/g, '、').replace(/[…‥]+/g, '、');
  s = s.replace(/[〜～~]/g, '');
  s = s.replace(/([ぁ-んァ-ヶ])[.．]([ぁ-んァ-ヶ])/g, '$1$2');
  s = s.replace(/(^|[\s、,])[-－](?=[ぁ-んァ-ヶ一-龯])/g, '$1');
  s = s.replace(/\s*[/／|｜]\s*/g, '、');
  s = s.replace(/[\r\n]+/g, '。');
  s = s.replace(/[\s　]+/g, ' ').trim();
  s = s.replace(/^[、。,\s]+|[、,\s]+$/g, '');
  return s;
}

/**
 * Bagian berbahasa Jepang dari teks soal campuran (instruksi Indonesia + kalimat Jepang): isi 「…」 bila ada,
 * selain itu baris yang tidak berisi huruf Latin. Mencegah suara Jepang membaca kalimat berbahasa Indonesia.
 */
export function japaneseSpeechFromPrompt(prompt: string): string {
  const text = (prompt ?? '').replace(/【[^】]*】/g, '');
  const quoted = [...text.matchAll(/「([^」]+)」/g)].map(m => m[1]);
  if (quoted.length > 0) return quoted.join('、');
  return text
    .split(/\n+/)
    .filter(line => JAPANESE_LETTER.test(line) && !LATIN.test(line.replace(/[（(][^（）()]*[）)]/g, '')))
    .join('。');
}

export interface DialoguePart {
  speaker: 'male' | 'female' | 'narrator';
  text: string;
}

const SPEAKER_LABEL = /(男の人|女の人|男性|女性|男の子|女の子|男|女|[ＡＢAB])\s*[：:]/g;

/**
 * Pecah naskah choukai berlabel pembicara ("女の人：…男の人：…") menjadi bagian per pembicara. Label tidak
 * diucapkan (seperti audio JLPT). Teks tanpa label → satu bagian narator.
 */
export function splitDialogue(text: string): DialoguePart[] {
  const matches = [...text.matchAll(SPEAKER_LABEL)];
  if (matches.length < 2) return [{ speaker: 'narrator', text }];
  const parts: DialoguePart[] = [];
  const head = text.slice(0, matches[0].index).trim();
  if (head) parts.push({ speaker: 'narrator', text: head });
  matches.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    const body = text.slice(start, end).trim();
    if (!body) return;
    const label = m[1];
    const speaker = /女|[ＢB]/.test(label) ? 'female' : 'male';
    parts.push({ speaker, text: body });
  });
  return parts;
}

/** Bacaan hanya bila berupa kana (bacaan pola bunpou bisa berupa rumus seperti "Vます + 方", bukan furigana). */
export function kanaReadingOf(reading?: string): string | undefined {
  const r = (reading ?? '').trim();
  return r && /^[\u3040-\u30ff〜～~ー・\s、。]+$/.test(r) ? r : undefined;
}

/** Kana yang diucapkan untuk segmen furigana: furigana untuk kanji, teks asli (termasuk katakana) untuk sisanya. */
export function kanaFromSegments(segments: RubySegment[]): string {
  return segments.map(s => s.ruby ?? s.text).join('');
}

export interface MorphToken {
  surface: string;
  /** Bacaan katakana dari penganalisis; kosong/'*' bila tidak dikenal. */
  reading?: string;
}

/**
 * Teks ucapan hibrida untuk pasangan (teks, bacaan) dari data, dihitung saat build:
 * potong teks menjadi unit terkecil yang batasnya sama untuk token penganalisis dan segmen furigana; unit yang
 * bacaannya menurut penganalisis (≈ cara mesin TTS membaca) sama dengan furigana tetap ditulis apa adanya,
 * unit yang berbeda diganti kana furigananya. Mengembalikan null bila bacaan tidak bisa diselaraskan.
 */
export function buildSpeechHint(text: string, reading: string, tokens: MorphToken[]): string | null {
  const alignment = alignFurigana(text, reading);
  if (!alignment.aligned) return null;
  const segments = alignment.segments;
  if (segments.map(s => s.text).join('') !== text) return null;
  if (tokens.map(t => t.surface).join('') !== text) return null;

  const segEnds = new Set<number>();
  let pos = 0;
  for (const seg of segments) { pos += seg.text.length; segEnds.add(pos); }
  const tokEnds = new Set<number>();
  pos = 0;
  for (const tok of tokens) { pos += tok.surface.length; tokEnds.add(pos); }

  let out = '';
  let unitStart = 0;
  let segIdx = 0;
  let segPos = 0;
  let tokIdx = 0;
  let tokPos = 0;
  for (let end = 1; end <= text.length; end++) {
    if (!(segEnds.has(end) && tokEnds.has(end))) continue;
    let ours = '';
    let oursSpoken = '';
    while (segIdx < segments.length && segPos < end) {
      const seg = segments[segIdx];
      ours += seg.ruby ?? seg.text;
      oursSpoken += seg.ruby ?? seg.text;
      segPos += seg.text.length;
      segIdx++;
    }
    let theirs = '';
    while (tokIdx < tokens.length && tokPos < end) {
      const tok = tokens[tokIdx];
      theirs += tok.reading && tok.reading !== '*' ? tok.reading : tok.surface;
      tokPos += tok.surface.length;
      tokIdx++;
    }
    const surface = text.slice(unitStart, end);
    out += normalizeForCompare(ours) === normalizeForCompare(theirs) ? surface : oursSpoken;
    unitStart = end;
  }
  return out;
}

export interface SpeechResolveContext {
  /** Teks ucapan hasil build untuk pasangan data yang berisiko dibaca lain (kunci: speechHintKey). */
  hints?: ReadonlyMap<string, string> | Record<string, string>;
  /** true bila pasangan (teks, bacaan) berasal dari data dan sudah dinilai saat build. */
  isKnownPair?: (text: string, reading: string) => boolean;
}

/** Kunci ringkas (FNV-1a 32-bit, base36) untuk pasangan teks + bacaan. */
export function speechHintKey(text: string, reading: string): string {
  let h = 0x811c9dc5;
  const s = `${text}\u0001${reading}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function lookupHint(hints: SpeechResolveContext['hints'], key: string): string | undefined {
  if (!hints) return undefined;
  if (hints instanceof Map) return hints.get(key);
  return Object.prototype.hasOwnProperty.call(hints, key) ? (hints as Record<string, string>)[key] : undefined;
}

/**
 * Teks yang diucapkan untuk `text` yang ditampilkan dengan furigana `reading` (opsional).
 * - Pasangan dari data: teks hibrida hasil build (kanji yang berisiko → kana), selain itu teks asli.
 * - Pasangan lain (deck kustom, teks buatan): kana dari segmentasi furigana yang ditampilkan.
 * - Tanpa bacaan: teks asli yang dibersihkan (mesin TTS yang menentukan bacaan, sama seperti furigana kamus).
 */
export function resolveSpeechText(text: string, reading?: string, ctx: SpeechResolveContext = {}): string {
  const rawText = (text ?? '').trim();
  const rawReading = (reading ?? '').trim();
  if (!rawText) return cleanSpeechText(rawReading);
  if (!rawReading || rawReading === rawText) return cleanSpeechText(rawText);
  // Beberapa bacaan ("なん / なに") atau beberapa bentuk tulisan ("丸い / 円い" = まるい): ucapkan bacaannya,
  // seperti yang tertulis sebagai furigana, bukan tiap bentuk kanji satu per satu.
  if (/[/／]/.test(rawReading + rawText)) return cleanSpeechText(rawReading);

  const hint = lookupHint(ctx.hints, speechHintKey(rawText, rawReading));
  if (hint !== undefined) return cleanSpeechText(hint);
  if (ctx.isKnownPair?.(rawText, rawReading)) return cleanSpeechText(rawText);

  const cleanedText = cleanSpeechText(rawText);
  const cleanedReading = cleanSpeechText(rawReading);
  const alignment = alignFurigana(cleanedText, cleanedReading);
  if (alignment.aligned) return kanaFromSegments(alignment.segments);
  // Bacaan yang tidak cocok dengan teks (mis. hanya kana dari kata lain): ucapkan bacaannya bila teks tanpa kana,
  // karena itulah yang tertulis sebagai furigana; selain itu teks asli.
  return /[ぁ-んァ-ヶ]/.test(cleanedText) ? cleanedText : cleanedReading || cleanedText;
}
