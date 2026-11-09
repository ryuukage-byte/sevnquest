/**
 * Mesin maksud (intent) Naga Pemandu: 100% lokal, tanpa AI/LLM, tanpa jaringan.
 *
 * Masukan: teks pemain + konteks percakapan singkat. Keluaran: balasan + pilihan tindakan.
 * Tindakan berupa DragonCommand yang dijalankan App (navigasi / membuka fitur); mesin ini tidak
 * menyentuh state pemain atau logika belajar apa pun.
 */
import { FEATURES, type FeatureEntry } from '../../data/appFeatures';
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

// --------------------------------------------------------------------------- Pencocokan fitur

interface DragonFeature {
  id: string;
  title: string;
  keywords: string[];
  explain: string;
  command: DragonCommand;
}

/** Ubah target Pencarian Fitur ke perintah naga (dengan sub-tab Library yang tepat). */
function toCommand(f: FeatureEntry): DragonCommand {
  if (f.id === 'kotoba' || f.id === 'kanji' || f.id === 'bunpou') return { type: 'library', tab: f.id };
  const t = f.target;
  if (t.type === 'tab') return { type: 'tab', tab: t.tab };
  if (t.type === 'status') return { type: 'status' };
  if (t.type === 'recall') return { type: 'recall' };
  return { type: 'tour' };
}

const EXTRA_FEATURES: DragonFeature[] = [
  { id: 'menara', title: 'Menara Nihongo', keywords: ['menara', 'tower', 'lantai'], command: { type: 'tower' },
    explain: 'Menara Nihongo adalah jalur belajar bertahap per lantai. Setiap lantai membuka materi berikutnya.' },
  { id: 'soal', title: 'Bank Soal', keywords: ['soal', 'latihan soal', 'kuis', 'quiz', 'ujian', 'tryout', 'test', 'tes'], command: { type: 'library', tab: 'soal' },
    explain: 'Bank Soal di Library berisi latihan soal bergaya JLPT lengkap dengan pembahasan.' },
  { id: 'buku-resmi', title: 'Buku Resmi', keywords: ['buku', 'resmi', 'official', 'bab', 'kana', 'dojo', 'hiragana', 'katakana'], command: { type: 'official_books' },
    explain: 'Buku Resmi di Buku Saku berisi materi tersusun per bab, termasuk Kuil Aksara Kana Dojo untuk pemula.' },
  { id: 'naga', title: 'Tier Naga', keywords: ['naga', 'dragon', 'tier', 'evolusi', 'berevolusi', 'evolve', 'unlock', 'donasi', 'dukung', 'premium'], command: { type: 'dragon_tiers' },
    explain: 'Aku punya 7 tier: Hatchling sampai Celestial. Tier lebih tinggi terbuka dari dukungan (Donasi) dan hanya mengubah penampilanku, bukan materi belajarmu.' },
];

/** Fitur khusus naga ditaruh di depan: menang bila skornya seri (mis. "menara" vs World). */
export const DRAGON_FEATURES: DragonFeature[] = [
  ...EXTRA_FEATURES,
  ...FEATURES.map(f => ({
    id: f.id,
    title: f.title,
    keywords: [...tokenize(f.title), ...f.keywords.split(' ')],
    explain: f.explain,
    command: toCommand(f),
  })),
];

const STEM_STOP = new Set(['dan', 'yang', 'cara', 'mau', 'aku', 'apa', 'itu', 'buka', 'ke', 'di', 'mana']);

/** Skor kecocokan: kata utuh = 2, awalan (≥4 huruf) = 1. */
function scoreFeature(tokens: string[], f: DragonFeature): number {
  let s = 0;
  for (const t of tokens) {
    if (t.length < 2 || STEM_STOP.has(t)) continue;
    if (f.keywords.includes(t)) s += 2;
    else if (t.length >= 4 && f.keywords.some(k => k.length >= 4 && (k.startsWith(t) || t.startsWith(k)))) s += 1;
  }
  return s;
}

export function rankFeatures(text: string, limit = 3): DragonFeature[] {
  const toks = tokenize(text);
  return DRAGON_FEATURES
    .map(f => ({ f, s: scoreFeature(toks, f) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.f);
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

function explainFeature(f: DragonFeature): DragonReply {
  return {
    intent: 'explain',
    mood: 'pointing',
    text: f.explain,
    choices: [{ label: `Buka ${f.title}`, command: f.command }],
  };
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
      { label: 'Kanji Speed Rush', command: { type: 'tab', tab: 'maps' } },
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
const RE_BEGINNER = /\b(pemula|mulai dari mana|mulai darimana|baru mulai|dari nol|newbie|belum bisa apa)\b/;
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
      text: `Aku ${name}. Aku bisa mengantarmu ke fitur mana pun, menjelaskan cara pakainya, dan menyiapkan deck flashcard sesuai topik yang kamu mau. Coba tanya, misalnya "apa itu Recall?".`,
      choices: [
        { label: 'Bikin flashcard', say: 'Aku mau bikin flashcard' },
        { label: 'Apa itu Recall?', say: 'Apa itu Recall?' },
        { label: 'Apa itu Menara?', say: 'Apa itu Menara?' },
        { label: 'Tier naga', command: { type: 'dragon_tiers' } },
      ],
    };
  }

  // Latihan menulis (kanji / kana): panduan lengkap, bukan sekadar menunjuk satu menu.
  if (has(n, RE_WRITE) && !wantsDeck) {
    return writingGuide(has(n, RE_KANA) && !/\bkanji\b/.test(n));
  }

  // Membuat deck / flashcard.
  if (wantsDeck && !has(n, RE_EXPLAIN)) {
    const slots = extractDeckSlots(n);
    const prefill = cleanPrefill(slots);
    return slots.hasTopic ? deckReady(prefill) : askDeckTopic(prefill);
  }

  if (has(n, RE_BEGINNER)) {
    return {
      intent: 'beginner',
      mood: 'pointing',
      text: 'Mulai dari aksara dulu: buka Buku Resmi, lalu Kuil Aksara Kana Dojo untuk hiragana dan katakana. Kalau mau kenalan dengan menu SevnQuest, ikuti tur singkatnya.',
      choices: [
        { label: 'Buka Buku Resmi', command: { type: 'official_books' } },
        { label: 'Tur singkat', command: { type: 'tour' } },
      ],
    };
  }

  const ranked = rankFeatures(n);

  if (has(n, RE_EXPLAIN)) {
    if (ranked[0]) return explainFeature(ranked[0]);
    return {
      intent: 'explain_unknown',
      mood: 'talking',
      text: 'Fitur mana yang mau kujelaskan?',
      choices: ['Flashcard', 'Recall', 'Menara', 'Misi Harian'].map(t => ({ label: t, say: `Apa itu ${t}?` })),
    };
  }

  if (ranked.length) {
    const [top, ...rest] = ranked;
    return {
      intent: 'navigate',
      mood: 'pointing',
      text: `Sepertinya kamu mencari ${top.title}. ${top.explain}`,
      choices: [
        { label: `Buka ${top.title}`, command: top.command },
        ...rest.map(f => ({ label: f.title, command: f.command })),
      ],
    };
  }

  return {
    intent: 'unknown',
    mood: 'talking',
    text: 'Hmm, aku belum paham maksudmu. Coba pakai kata lain, atau pilih salah satu ini.',
    choices: STARTER_CHOICES,
  };
}
