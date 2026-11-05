// Pengenal "jebakan bacaan" untuk soal 漢字読み: membandingkan bacaan yang benar dengan pilihan
// pengecoh dan menamai perbedaannya (tenten, maru, vokal panjang, つ kecil, ゃゅょ kecil, ん).
// Murni string → string, tanpa database, sehingga mudah diuji.

export type ReadingTrapKind = 'dakuten' | 'handakuten' | 'long_vowel' | 'sokuon' | 'youon' | 'hatsuon';

export interface ReadingTrap {
  kind: ReadingTrapKind;
  label: string;
  detail: string;
}

export interface DiffPiece {
  text: string;
  /** true = sama dengan bacaan yang benar; false = huruf yang berbeda. */
  same: boolean;
}

export const TRAP_LABEL: Record<ReadingTrapKind, string> = {
  dakuten: 'Jebakan tenten (゛)',
  handakuten: 'Jebakan maru (゜)',
  long_vowel: 'Jebakan vokal panjang',
  sokuon: 'Jebakan つ kecil (っ)',
  youon: 'Jebakan ゃ・ゅ・ょ kecil',
  hatsuon: 'Jebakan ん',
};

const katakanaToHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

/** "かんけい (kankei)" → "かんけい"; katakana → hiragana; spasi dibuang. */
export function cleanReadingOption(opt: string): string {
  return katakanaToHiragana(opt.replace(/\s*[（(][^)）]*[)）]/g, '').replace(/[\s　]/g, '').trim());
}

export const isKanaOnly = (s: string) => /^[ぁ-ゖァ-ヺー]+$/.test(s);

const DAKUTEN: Record<string, string> = {
  が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ',
  ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ',
  だ: 'た', ぢ: 'ち', づ: 'つ', で: 'て', ど: 'と',
  ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ', ゔ: 'う',
};
const HANDAKUTEN: Record<string, string> = { ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ' };
const SMALL: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', ゎ: 'わ' };

const VOWEL_ROWS: [string, string][] = [
  ['a', 'あかがさざただなはばぱまやらわゃ'],
  ['i', 'いきぎしじちぢにひびぴみりぃ'],
  ['u', 'うくぐすずつづぬふぶぷむゆるゅぅゔ'],
  ['e', 'えけげせぜてでねへべぺめれぇ'],
  ['o', 'おこごそぞとどのほぼぽもよろをょぉ'],
];
function vowelOf(ch: string): string | undefined {
  for (const [v, row] of VOWEL_ROWS) if (row.includes(ch)) return v;
  return undefined;
}

const mapChars = (s: string, table: Record<string, string>) => Array.from(s, ch => table[ch] ?? ch).join('');

/** Buang pemanjang vokal: おう/うう → お/う, えい/ええ → え, ああ・いい・おお → satu, dan ー. */
function stripLong(s: string): string {
  const chars = Array.from(s);
  const out: string[] = [];
  for (const ch of chars) {
    const prev = out[out.length - 1];
    const v = prev ? vowelOf(prev) : undefined;
    if (ch === 'ー' && prev) continue;
    if (v && ch === 'う' && (v === 'o' || v === 'u')) continue;
    if (v && ch === 'い' && (v === 'e' || v === 'i')) continue;
    if (v && ch === 'あ' && v === 'a') continue;
    if (v && ch === 'え' && v === 'e') continue;
    if (v && ch === 'お' && v === 'o') continue;
    out.push(ch);
  }
  return out.join('');
}

const TRANSFORMS: Record<ReadingTrapKind, (s: string) => string> = {
  youon: s => mapChars(s, SMALL),
  dakuten: s => mapChars(s, DAKUTEN),
  handakuten: s => mapChars(s, HANDAKUTEN),
  // がっこう / がくこう / がこう disamakan: っ, atau く・つ・ち・き yang bisa menjadi っ sebelum k/s/t/p.
  sokuon: s => s.replace(/っ|[くつちき](?=[かきくけこさしすせそたちつてとぱぴぷぺぽ])/g, ''),
  hatsuon: s => s.replace(/ん/g, ''),
  long_vowel: stripLong,
};
// Urutan penerapan tetap: ゃ→や dulu agar しゅう/しゆう tetap dikenali sebagai vokal panjang.
const ORDER: ReadingTrapKind[] = ['youon', 'dakuten', 'handakuten', 'sokuon', 'hatsuon', 'long_vowel'];

function subsets(size: number): ReadingTrapKind[][] {
  const out: ReadingTrapKind[][] = [];
  const rec = (start: number, acc: ReadingTrapKind[]) => {
    if (acc.length === size) {
      out.push(acc.slice());
      return;
    }
    for (let i = start; i < ORDER.length; i++) rec(i + 1, [...acc, ORDER[i]]);
  };
  rec(0, []);
  return out;
}
const SUBSETS = [1, 2, 3].flatMap(subsets);

/** Selisih per huruf (LCS) antara bacaan benar dan pilihan; hasil berupa potongan pilihan. */
export function readingDiff(correct: string, option: string): DiffPiece[] {
  const a = Array.from(correct);
  const b = Array.from(option);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pieces: DiffPiece[] = [];
  const push = (text: string, same: boolean) => {
    const last = pieces[pieces.length - 1];
    if (last && last.same === same) last.text += text;
    else pieces.push({ text, same });
  };
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      push(b[j], true);
      i++;
      j++;
    } else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      push(b[j], false);
      j++;
    }
  }
  return pieces;
}

/** Pasangan potongan yang berubah: [di bacaan benar, di pilihan]. */
function changedPairs(correct: string, option: string): [string, string][] {
  const a = Array.from(correct);
  const b = Array.from(option);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const from = a.slice(pre, a.length - suf).join('');
  const to = b.slice(pre, b.length - suf).join('');
  return from || to ? [[from, to]] : [];
}

function describe(kind: ReadingTrapKind, correct: string, option: string): string {
  const [pair] = changedPairs(correct, option);
  const from = pair?.[0] || '∅';
  const to = pair?.[1] || '∅';
  const shown = `「${from}」 → 「${to}」`;
  switch (kind) {
    case 'dakuten':
      return `Bunyinya sama kecuali tenten: ${shown}.`;
    case 'handakuten':
      return `Bunyinya sama kecuali maru (゜): ${shown}.`;
    case 'long_vowel':
      return option.length < correct.length
        ? `Vokal panjangnya dipendekkan: 「${correct}」 punya bunyi panjang yang hilang di 「${option}」.`
        : `Vokal pendek dipanjangkan: 「${option}」 menambah bunyi panjang yang tidak ada di 「${correct}」.`;
    case 'sokuon':
      return option.includes('っ') && !correct.includes('っ')
        ? `Ditambah つ kecil (っ) yang seharusnya tidak ada.`
        : `つ kecil (っ) dihilangkan atau dipindah: ${shown}.`;
    case 'youon':
      return `Ukuran ゃ・ゅ・ょ berbeda: ${shown}. Huruf kecil menyatu dengan huruf sebelumnya (きょ = kyo, きよ = kiyo).`;
    case 'hatsuon':
      return `Ada/tidaknya ん berbeda: ${shown}.`;
  }
}

/**
 * Nama jebakan yang membedakan pilihan dari bacaan benar. Kosong bila perbedaannya bukan
 * jebakan bunyi (mis. pilihan adalah bacaan kata lain).
 */
export function detectReadingTraps(correctRaw: string, optionRaw: string): ReadingTrap[] {
  const correct = cleanReadingOption(correctRaw);
  const option = cleanReadingOption(optionRaw);
  if (!correct || !option || correct === option) return [];
  if (!isKanaOnly(correct) || !isKanaOnly(option)) return [];
  for (const set of SUBSETS) {
    let a = correct;
    let b = option;
    for (const kind of ORDER) {
      if (!set.includes(kind)) continue;
      a = TRANSFORMS[kind](a);
      b = TRANSFORMS[kind](b);
    }
    if (a === b) return set.map(kind => ({ kind, label: TRAP_LABEL[kind], detail: describe(kind, correct, option) }));
  }
  return [];
}
