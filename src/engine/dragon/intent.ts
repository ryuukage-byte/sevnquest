/**
 * Mesin maksud (intent) Naga Pemandu: 100% lokal, tanpa AI/LLM, tanpa jaringan.
 *
 * Masukan: teks pemain + konteks percakapan singkat. Keluaran: balasan + pilihan tindakan.
 * Tindakan berupa DragonCommand yang dijalankan App (navigasi / membuka fitur); mesin ini tidak
 * menyentuh state pemain atau logika belajar apa pun.
 */
import { GROUP_LABEL, KNOWLEDGE, topicById, type KnowledgeTopic, type TopicGroup } from '../../data/dragon/knowledge';
import { DECK_THEMES } from '../../data/deckThemes';
import type { DeckAiPrefill } from '../deck/deckPrefill';
import type { DeckType } from '../../types/rpg';
import type { TourId } from './tours';

export type DragonTab = 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'settings';
export type LibrarySubTab = 'kotoba' | 'kanji' | 'bunpou' | 'soal';

export type DragonCommand =
  | { type: 'tab'; tab: DragonTab }
  | { type: 'library'; tab: LibrarySubTab }
  | { type: 'recall' }
  | { type: 'tower' }
  | { type: 'status' }
  | { type: 'tour' }
  | { type: 'official_books' }
  | { type: 'deck_ai'; prefill: DeckAiPrefill }
  /** Pasang aplikasi (PWA): dialog pasang bawaan, atau panduan pasang bila tidak tersedia. */
  | { type: 'install' }
  /** Ditangani panel naga sendiri (tidak berpindah halaman). */
  | { type: 'dragon_tiers' }
  /** Tur bertahap: naga menyorot langkah demi langkah sampai tujuan. */
  | { type: 'guide_tour'; tour: TourId };

/** Perintah yang dijalankan App (navigasi); sisanya ditangani panel naga sendiri. */
export type AppCommand = Exclude<DragonCommand, { type: 'dragon_tiers' } | { type: 'guide_tour' }>;

export interface DragonChoice {
  label: string;
  /** Tindakan langsung. */
  command?: DragonCommand;
  /** Atau: kirim teks ini sebagai pesan pemain berikutnya. */
  say?: string;
  /** Atau: tampilkan penjelasan topik basis pengetahuan ini (id). */
  topic?: string;
}

export type ReplyMood = 'talking' | 'happy' | 'pointing' | 'greeting';

/** Bagian penjelasan terstruktur di bawah balon (mis. "Tempat latihan", "Cara penilaian"). */
export interface DragonSection {
  title: string;
  items: string[];
}

export type DragonAwait = { kind: 'deck_topic'; prefill: DeckAiPrefill };

export interface DragonReply {
  intent: string;
  text: string;
  mood: ReplyMood;
  choices: DragonChoice[];
  sections?: DragonSection[];
  /** Naga menunggu jawaban lanjutan (mis. topik deck). */
  awaiting?: DragonAwait;
}

export interface DragonContext {
  awaiting?: DragonAwait;
  name?: string;
}

// --------------------------------------------------------------------------- Normalisasi

export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

const has = (n: string, re: RegExp) => re.test(n);

// --------------------------------------------------------------------------- Slot deck

const TYPE_WORDS: { re: RegExp; type: DeckType }[] = [
  { re: /\b(campur|campuran|mixed|semua jenis)\b/, type: 'mixed' },
  { re: /\bkanji\b/, type: 'kanji' },
  { re: /\b(bunpou|bunpo|grammar|pola( kalimat)?|tata ?bahasa)\b/, type: 'bunpou' },
  { re: /\b(kotoba|kosakata|kosa kata|vocab|vocabulary|kata)\b/, type: 'kotoba' },
];

export const DECK_COUNTS = [10, 15, 20, 30, 40];

/** Kata yang dibuang saat mengambil topik bebas. */
const STOPWORDS = new Set([
  'aku', 'saya', 'gue', 'gw', 'ku', 'mau', 'ingin', 'pengen', 'pingin', 'pgn', 'tolong', 'dong', 'ya', 'yah', 'deh', 'sih', 'nih', 'yuk', 'ayo',
  'bikin', 'bikinin', 'bikinkan', 'buat', 'buatin', 'buatkan', 'membuat', 'susun', 'susunin', 'susunkan', 'create', 'make', 'bantu', 'bantuin',
  'flashcard', 'flashcards', 'flash', 'card', 'deck', 'dek', 'kartu', 'hafalan', 'baru', 'sebuah', 'satu', 'yang', 'untuk', 'buat', 'utk',
  'tentang', 'tema', 'bertema', 'topik', 'seputar', 'soal', 'mengenai', 'dengan', 'isi', 'berisi', 'level', 'jlpt', 'item', 'kata', 'kotoba',
  'kosakata', 'kosa', 'vocab', 'vocabulary', 'kanji', 'bunpou', 'bunpo', 'grammar', 'pola', 'kalimat', 'tata', 'bahasa', 'tatabahasa',
  'campur', 'campuran', 'mixed', 'semua', 'jenis', 'n1', 'n2', 'n3', 'n4', 'n5', 'latihan', 'belajar', 'jepang', 'nihongo', 'dan', 'atau', 'di', 'ke',
  'naga', 'tatsu', 'kak', 'min', 'bang', 'kamu', 'bisa', 'gak', 'nggak', 'ga', 'apa', 'aja', 'saja',
  'nulis', 'menulis', 'tulis', 'writing', 'hafal', 'menghafal', 'ngafal',
]);

export interface DeckSlots extends DeckAiPrefill {
  /** true bila pemain menyebut topik (bukan hanya jenis/level). */
  hasTopic: boolean;
}

export function extractDeckSlots(text: string): DeckSlots {
  const n = normalize(text);
  const out: DeckSlots = { hasTopic: false };

  for (const t of TYPE_WORDS) {
    if (t.re.test(n)) { out.focus = t.type; break; }
  }

  const levels = [...new Set([...n.matchAll(/\bn([1-5])\b/g)].map(m => `N${m[1]}`))];
  if (levels.length) out.levels = levels;

  const num = n.match(/\b(\d{1,3})\s*(kata|kartu|item|soal|buah)?\b/);
  if (num) {
    const c = Number(num[1]);
    if (DECK_COUNTS.includes(c)) out.count = c;
  }

  // Topik: utamakan teks sesudah "tentang/tema/topik/seputar"; kalau tidak ada, sisa kata yang bermakna.
  const after = n.match(/\b(?:tentang|tema|bertema|topik|seputar|mengenai)\s+(.+)$/);
  const source = after ? after[1] : n;
  const words = source.split(' ').filter(w => w && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  const topic = words.join(' ').slice(0, 40).trim();
  if (topic) {
    out.topic = topic;
    out.hasTopic = true;
    const theme = matchTheme(topic);
    if (theme) out.themeId = theme;
  }
  return out;
}

/** Cocokkan topik bebas ke tema siap pakai (kata kunci tema / labelnya). */
export function matchTheme(topic: string): string | undefined {
  const toks = tokenize(topic);
  if (!toks.length) return undefined;
  for (const th of DECK_THEMES) {
    const words = new Set([th.id, ...tokenize(th.label), ...th.keywords.map(k => k.toLowerCase())]);
    if (toks.some(t => words.has(t))) return th.id;
  }
  return undefined;
}

// --------------------------------------------------------------------------- Pencocokan topik

/** Kata umum yang tidak membedakan topik. */
const MATCH_STOP = new Set([
  'aku', 'saya', 'gue', 'gw', 'mau', 'ingin', 'pengen', 'apa', 'itu', 'ini', 'gimana', 'bagaimana', 'cara', 'caranya',
  'dan', 'yang', 'di', 'ke', 'dari', 'buat', 'untuk', 'bisa', 'gak', 'ga', 'nggak', 'tidak', 'ya', 'dong', 'sih', 'nih',
  'kak', 'min', 'tolong', 'bantu', 'kalau', 'kalo', 'aja', 'saja', 'ada', 'kok', 'kenapa', 'mana', 'buka', 'lihat', 'liat',
  'tatsu', 'naga', 'jelaskan', 'jelasin', 'maksudnya', 'fitur', 'menu', 'tentang', 'soal', 'nya', 'deh', 'lagi',
]);
// "naga", "menu", "soal" tetap dicocokkan lewat frasa/kata kunci topik masing-masing (lihat scoreTopic).
const STOP_EXEMPT_FOR: Record<string, string[]> = { naga: ['naga'], menu: ['pengaturan'], soal: ['soal'] };

/**
 * Jarak edit Damerau (OSA): sisip, hapus, ganti, dan tukar dua huruf bersebelahan masing-masing 1.
 * Salah ketik tersering di HP adalah huruf tertukar ("peringakt"), jadi ini lebih adil dari Levenshtein.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

const PREFIXES = ['meng', 'meny', 'mem', 'men', 'me', 'di', 'ber', 'ter', 'ke', 'pe', 'se'];
const SUFFIXES = ['nya', 'kan', 'lah', 'in', 'an', 'ku', 'mu', 'i'];

/** Bentuk dasar kasar sebuah kata Indonesia: "diinstal" → "instal", "aplikasinya" → "aplikasi". */
export function stemVariants(t: string): string[] {
  const out = new Set([t]);
  const strip = (w: string) => {
    for (const suf of SUFFIXES) if (w.length - suf.length >= 4 && w.endsWith(suf)) out.add(w.slice(0, -suf.length));
  };
  strip(t);
  for (const pre of PREFIXES) {
    if (t.length - pre.length >= 4 && t.startsWith(pre)) {
      const base = t.slice(pre.length);
      out.add(base);
      strip(base);
    }
  }
  return [...out];
}

/** Skor satu kata terhadap satu kata kunci: persis 3, awalan 2, salah ketik 3/2/1 (makin panjang makin yakin). */
function wordScore(t: string, kw: string): number {
  if (t === kw) return 3;
  if (t.length >= 4 && kw.length >= 4 && (kw.startsWith(t) || t.startsWith(kw))) return 2;
  if (t.length >= 5 && kw.length >= 5) {
    const d = editDistance(t, kw, 2);
    if (d <= 1) return t.length >= 6 ? 3 : 2;
    if (d === 2 && t.length >= 8) return 1;
  }
  return 0;
}

export function scoreTopic(n: string, toks: string[], topic: KnowledgeTopic): number {
  let s = 0;
  const padded = ` ${n} `;
  const singles: string[] = [];
  for (const kw of topic.keywords) {
    if (kw.includes(' ')) {
      if (padded.includes(` ${kw} `)) s += 3 + kw.split(' ').length;
    } else singles.push(kw);
  }
  const titleToks = tokenize(topic.title);
  for (const t of toks) {
    if (t.length < 2) continue;
    if (MATCH_STOP.has(t) && !(STOP_EXEMPT_FOR[t] || []).includes(topic.id)) continue;
    let best = 0;
    for (const v of stemVariants(t)) {
      for (const kw of singles) {
        const w = wordScore(v, kw);
        if (w > best) best = w;
        if (best === 3) break;
      }
      if (best === 3) break;
    }
    s += best;
    if (titleToks.includes(t)) s += 1;
  }
  return s;
}

export function matchTopics(text: string, limit = 3): { topic: KnowledgeTopic; score: number }[] {
  const n = normalize(text);
  const toks = tokenize(n);
  return KNOWLEDGE
    .map(topic => ({ topic, score: scoreTopic(n, toks, topic) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Topik terbaik untuk teks (urut skor); dipakai juga oleh tes. */
export function rankFeatures(text: string, limit = 3): KnowledgeTopic[] {
  return matchTopics(text, limit).map(x => x.topic);
}

/** Skor minimal agar naga yakin (setara satu kata kunci persis). */
const CONFIDENT = 3;

/** Jawaban lengkap untuk satu topik: penjelasan, bagian rinci, tombol tindakan, dan topik terkait. */
export function replyForTopic(id: string): DragonReply {
  if (id === 'menulis') return writingGuide(false);
  const topic = topicById(id);
  if (!topic) return fallbackReply();
  const related = (topic.related || [])
    .map(r => topicById(r))
    .filter((t): t is KnowledgeTopic => Boolean(t))
    .map(t => ({ label: t.title, topic: t.id }));
  return {
    intent: `topic:${topic.id}`,
    mood: 'pointing',
    text: topic.text,
    sections: topic.sections,
    choices: [...topic.actions, ...related].slice(0, 4),
  };
}

/** Daftar semua topik per kelompok: dipakai untuk "bisa bantu apa" dan saat naga belum paham. */
function topicMenuSections(): DragonSection[] {
  return (Object.keys(GROUP_LABEL) as TopicGroup[]).map(g => ({
    title: GROUP_LABEL[g],
    items: KNOWLEDGE.filter(t => t.group === g).map(t => t.title),
  }));
}

const POPULAR_TOPICS = ['pemula', 'flashcard', 'recall', 'pasang-app'];

function fallbackReply(suggestions: KnowledgeTopic[] = []): DragonReply {
  if (suggestions.length) {
    return {
      intent: 'suggest',
      mood: 'talking',
      text: 'Aku belum yakin maksudmu. Mungkin salah satu ini?',
      choices: suggestions.map(t => ({ label: t.title, topic: t.id })),
    };
  }
  return {
    intent: 'unknown',
    mood: 'talking',
    text: 'Aku belum menemukan topik itu. Ini semua hal yang bisa kujelaskan; ketik salah satu judulnya, atau pakai kata lain.',
    sections: topicMenuSections(),
    choices: POPULAR_TOPICS.map(id => topicById(id)!).map(t => ({ label: t.title, topic: t.id })),
  };
}

// --------------------------------------------------------------------------- Balasan

const FOCUS_LABEL: Partial<Record<DeckType, string>> = { kotoba: 'kosakata', kanji: 'kanji', bunpou: 'pola kalimat', mixed: 'campuran' };

export const STARTER_CHOICES: DragonChoice[] = [
  { label: 'Bikin flashcard', say: 'Aku mau bikin flashcard' },
  { label: 'Mulai dari mana?', say: 'Aku pemula, mulai dari mana?' },
  { label: 'Ulang Recall', command: { type: 'recall' } },
  { label: 'Jelaskan fitur', say: 'Kamu bisa bantu apa?' },
];

function describeDeck(p: DeckAiPrefill): string {
  const parts: string[] = [];
  parts.push(`deck ${(p.focus && FOCUS_LABEL[p.focus]) || 'flashcard'}`);
  if (p.topic) parts.push(`bertema "${p.topic}"`);
  if (p.levels?.length) parts.push(`level ${p.levels.join(', ')}`);
  if (p.count) parts.push(`${p.count} item`);
  return parts.join(' ');
}

function deckReady(prefill: DeckAiPrefill): DragonReply {
  return {
    intent: 'create_deck',
    mood: 'pointing',
    text: `Siap! Aku sudah siapkan ${describeDeck(prefill)}. Materinya diambil dari database SevnQuest, jadi cek isinya dulu sebelum disimpan ya.`,
    choices: [
      { label: 'Susun deck sekarang', command: { type: 'deck_ai', prefill } },
      { label: 'Ganti topik', say: 'Aku mau bikin flashcard' },
      { label: 'Buka Buku Saku', command: { type: 'tab', tab: 'deck' } },
    ],
  };
}

function askDeckTopic(prefill: DeckAiPrefill): DragonReply {
  return {
    intent: 'create_deck_ask',
    mood: 'talking',
    text: `Boleh! Mau ${describeDeck(prefill)} tentang apa? Pilih tema di bawah atau ketik topikmu sendiri, misalnya "makanan" atau "sekolah".`,
    awaiting: { kind: 'deck_topic', prefill },
    choices: [
      ...DECK_THEMES.slice(0, 4).map(th => ({
        label: th.label,
        command: { type: 'deck_ai' as const, prefill: { ...prefill, themeId: th.id, topic: th.title } },
      })),
      { label: 'Pilih sendiri', command: { type: 'deck_ai', prefill } },
    ],
  };
}

function cleanPrefill(s: DeckSlots): DeckAiPrefill {
  const out: DeckAiPrefill = {};
  if (s.topic) out.topic = s.topic;
  if (s.themeId) out.themeId = s.themeId;
  if (s.focus) out.focus = s.focus;
  if (s.levels) out.levels = s.levels;
  if (s.count) out.count = s.count;
  return out;
}

// --------------------------------------------------------------------------- Panduan topik

const RE_WRITE = /\b(nulis|menulis|tulis|nulisin|writing|goresan|stroke|urutan goresan)\b/;
const RE_KANA = /\b(hiragana|katakana|kana)\b/;

/** Panduan lengkap latihan menulis: tempat, cara penilaian, bonus EXP, dan tur bertahap. */
export function writingGuide(kana: boolean): DragonReply {
  return {
    intent: 'guide_writing',
    mood: 'pointing',
    text: kana
      ? 'Bisa! Hiragana dan katakana dilatih di tempat yang sama dengan kanji. Ini rangkumannya:'
      : 'Bisa! Ada beberapa tempat untuk latihan menulis kanji. Ini rangkumannya:',
    sections: [
      {
        title: 'Tempat latihan',
        items: [
          kana
            ? 'Library → Kanji → filter Hiragana/Katakana → pilih huruf → Latihan Menulis.'
            : 'Library → Kanji → pilih kanji → Latihan Menulis. Cocok untuk satu per satu.',
          'Buku Saku → buka deck → Latihan Menulis. Menulis semua isi deck berurutan.',
          'Library → Kotoba → buka kata → Latih dengan Menulis. Menulis kata utuh dari ingatan.',
          'World → Arena Arcade → Kanji Speed Rush. Tulis sebanyak mungkin dalam 60 detik.',
          ...(kana ? ['Untuk pemula: Buku Saku → Buku Resmi → Kuil Aksara Kana Dojo.'] : []),
        ],
      },
      {
        title: 'Cara penilaian',
        items: [
          'Nilai mulai 100, berkurang 15 setiap goresan salah (paling rendah 0).',
          'Nilai 60 ke atas dihitung lulus: tercatat ke mastery dan skor peringkat.',
          'Salah 2 kali di goresan yang sama, petunjuk goresannya muncul.',
          'Tombol Animasi memutar urutan goresan; Ulangi membersihkan kanvas.',
        ],
      },
      {
        title: 'Bonus EXP',
        items: [
          'Watermark OFF +35%, tanpa Animasi +25%, tanpa salah +25%, waktu wajar +10%.',
          'Memutar Animasi lebih dari sekali atau salah 3 kali atau lebih mengurangi bonus.',
        ],
      },
    ],
    choices: [
      { label: 'Pandu aku sampai kanvas', command: { type: 'guide_tour', tour: 'menulis-kanji' } },
      { label: 'Latihan dari deck', command: { type: 'tab', tab: 'deck' } },
      { label: 'Kanji Speed Rush', command: { type: 'guide_tour', tour: 'arcade' } },
      { label: 'Bikin deck kanji', say: 'Aku mau bikin flashcard kanji' },
    ],
  };
}

const RE_GREET = /^(halo|hallo|hai|hi|hello|hey|hei|pagi|siang|sore|malam|ohayou|ohayo|konnichiwa|konbanwa|selamat (pagi|siang|sore|malam)|assalamualaikum|permisi)\b/;
const RE_THANKS = /\b(makasih|makasi|terima ?kasih|thanks|thank you|thx|arigatou|arigato|mantap|keren)\b/;
const RE_HELP = /\b(bisa apa|bisa bantu apa|kamu siapa|siapa kamu|bantuan|help|fitur apa saja|fitur apa aja|apa saja fiturnya)\b/;
const RE_CREATE = /\b(bikin|bikinin|bikinkan|buat|buatin|buatkan|membuat|susun|susunin|susunkan|create|make|generate)\b/;
const RE_DECKWORD = /\b(flashcard|flashcards|flash card|deck|dek|kartu|hafalan)\b/;
const RE_TOPICWORD = /\b(tentang|tema|bertema|topik|seputar|mengenai)\b/;
const RE_EXPLAIN = /\b(apa itu|apaan|jelaskan|jelasin|terangkan|gimana cara|bagaimana cara|cara pakai|cara menggunakan|fungsi|maksudnya|maksud)\b/;
const RE_CANCEL = /^(batal|gak jadi|ga jadi|nggak jadi|tidak jadi|cancel|skip)\b/;
const RE_ANY = /^(terserah|bebas|apa aja|apa saja|random|acak)\b/;

/** Inti mesin: teks pemain → balasan naga. Fungsi murni. */
export function interpret(text: string, ctx: DragonContext = {}): DragonReply {
  const n = normalize(text);
  const name = ctx.name || 'Tatsu';

  if (!n) {
    return { intent: 'empty', mood: 'talking', text: 'Ketik apa yang mau kamu lakukan, atau pilih salah satu di bawah.', choices: STARTER_CHOICES };
  }

  const wantsDeck = has(n, RE_DECKWORD) && (has(n, RE_CREATE) || has(n, RE_TOPICWORD));
  const wordCount = n.split(' ').length;

  // Lanjutan: naga sedang menunggu topik deck. Pertanyaan/perintah lain tetap diproses seperti biasa.
  const answersTopic = ctx.awaiting?.kind === 'deck_topic'
    && !wantsDeck && !has(n, RE_EXPLAIN) && !has(n, RE_HELP) && !(has(n, RE_GREET) && wordCount <= 4) && wordCount <= 6;
  if (ctx.awaiting?.kind === 'deck_topic' && answersTopic) {
    const base = ctx.awaiting.prefill;
    if (has(n, RE_CANCEL)) {
      return { intent: 'cancel', mood: 'talking', text: 'Oke, tidak jadi. Ada lagi yang bisa kubantu?', choices: STARTER_CHOICES };
    }
    if (has(n, RE_ANY)) {
      return {
        intent: 'create_deck',
        mood: 'pointing',
        text: 'Baik, aku buka Penyusun Deck. Kamu bisa pilih tema atau ketik topik di sana.',
        choices: [{ label: 'Buka Penyusun Deck', command: { type: 'deck_ai', prefill: base } }],
      };
    }
    const slots = extractDeckSlots(n);
    const topic = slots.topic || n.slice(0, 40);
    const prefill: DeckAiPrefill = {
      ...base,
      ...cleanPrefill(slots),
      topic,
      themeId: slots.themeId ?? matchTheme(topic),
    };
    return deckReady(prefill);
  }

  if (has(n, RE_GREET) && wordCount <= 4) {
    return { intent: 'greeting', mood: 'greeting', text: `Halo! Aku ${name}, naga pemandumu di SevnQuest. Mau ngapain hari ini?`, choices: STARTER_CHOICES };
  }

  if (has(n, RE_THANKS) && wordCount <= 5) {
    return { intent: 'thanks', mood: 'happy', text: 'Sama-sama! Semangat belajarnya, aku temani terus.', choices: [] };
  }

  if (has(n, RE_HELP)) {
    return {
      intent: 'help',
      mood: 'talking',
      text: `Aku ${name}. Aku bisa menjelaskan semua fitur SevnQuest, menunjukkan letaknya langsung di layar, dan menyiapkan deck flashcard untukmu. Ini topik yang kupahami; tanya saja dengan kalimatmu sendiri.`,
      sections: topicMenuSections(),
      choices: [
        { label: 'Bikin flashcard', say: 'Aku mau bikin flashcard' },
        ...POPULAR_TOPICS.slice(0, 3).map(id => topicById(id)!).map(t => ({ label: t.title, topic: t.id })),
      ],
    };
  }

  const matches = matchTopics(n);
  const top = matches[0];

  // Latihan menulis (kanji / kana): panduan lengkap, bukan sekadar menunjuk satu menu.
  // Kecuali jelas topik lain ("tulis surat ke admin", "tulis nama").
  const otherWritingTopic = top && top.score >= CONFIDENT && ['kotak-pos', 'profil', 'akun', 'pengaturan'].includes(top.topic.id);
  if (has(n, RE_WRITE) && !wantsDeck && !otherWritingTopic) {
    return writingGuide(has(n, RE_KANA) && !/\bkanji\b/.test(n));
  }

  // Membuat deck / flashcard.
  if (wantsDeck && !has(n, RE_EXPLAIN)) {
    const slots = extractDeckSlots(n);
    const prefill = cleanPrefill(slots);
    return slots.hasTopic ? deckReady(prefill) : askDeckTopic(prefill);
  }

  // Topik basis pengetahuan: jawaban lengkap + tombol tindakan.
  if (top && top.score >= CONFIDENT) return replyForTopic(top.topic.id);

  // Cocok tipis (mis. salah ketik jauh): tawarkan kandidat, bukan jalan buntu.
  if (matches.length) return fallbackReply(matches.map(m => m.topic));

  return fallbackReply();
}
