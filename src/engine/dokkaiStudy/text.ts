// Utilitas teks kecil untuk Dokkai: normalisasi, pemecah paragraf, dan kemiripan bigram huruf.

/** Kunci normal kalimat: tanpa spasi & tanda baca akhir (untuk peta terjemahan). */
export const normSentence = (s: string): string =>
  s.normalize('NFKC').replace(/[\s　。．.！!？?」』]/g, '').trim();

/** Teks dari sumber kadang menyimpan "\n" literal; ubah jadi baris baru dan rapikan spasi. */
export function cleanPassageText(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Paragraf = blok dipisah baris kosong; bila tidak ada baris kosong, tiap baris dianggap paragraf. */
export function splitParagraphs(text: string): string[] {
  const t = cleanPassageText(text);
  const blocks = /\n\s*\n/.test(t) ? t.split(/\n\s*\n/) : t.split('\n');
  return blocks.map(b => b.replace(/\n/g, '')).map(b => b.trim()).filter(b => /[぀-ヿ一-龯]/.test(b));
}

const STRIP_RE = /[\s　、。，．,.!！?？「」『』（）()［］\[\]【】・：:；;…\-―～〜"'“”\d０-９]/g;
// Potongan fungsi yang terlalu umum untuk jadi bukti kemiripan isi.
const FUNCTION_BIGRAMS = new Set([
  'です', 'ます', 'した', 'して', 'ない', 'ある', 'いる', 'こと', 'もの', 'する', 'ので', 'から', 'まで',
  'では', 'には', 'とは', 'での', 'への', 'との', 'った', 'って', 'れる', 'られ', 'せる', 'よう', 'ため',
  'ている', 'てい', 'いま', 'まし', 'ませ', 'せん', 'でし', 'しょ', 'ょう', 'う。',
]);

export function bigrams(s: string): Set<string> {
  const t = s.normalize('NFKC').replace(STRIP_RE, '');
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2);
    if (!FUNCTION_BIGRAMS.has(b)) out.add(b);
  }
  return out;
}

/** Proporsi bigram `a` yang juga ada di `b` (0..1). */
export function coverage(a: Set<string>, b: Set<string>): number {
  if (a.size === 0) return 0;
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return hit / a.size;
}
