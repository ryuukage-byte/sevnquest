import { DeckType, DeckItemCategory, UserDeck, DeckItemRef } from '../types/rpg';
import { KOTOBA_DATABASE } from '../data/kotoba';
import { KANJI_DATABASE } from '../data/kanji';
import { BUNPOU_DATABASE } from '../data/bunpou';

export interface AiDeckPromptOptions {
  topic: string;
  level?: string;
  type?: DeckType;
  count?: number;
  customNotes?: string;
}

export interface ParsedAiDeckItem {
  word: string;
  reading?: string;
  meaning: string;
  category?: DeckItemCategory;
  exampleJp?: string;
  exampleReading?: string;
  exampleId?: string;
  level?: string;
}

export interface ParsedAiDeck {
  title: string;
  description: string;
  type: DeckType;
  coverIcon: string;
  level: string;
  items: ParsedAiDeckItem[];
}

/**
 * Builds an optimized, high-fidelity prompt for Google Gemini AI.
 * Explicitly instructs the AI to return clean, valid JSON formatted for Nihongo Quest.
 */
export function buildGeminiDeckPrompt(options: AiDeckPromptOptions): string {
  const { topic, level = 'N5', type = 'mixed', count = 10, customNotes } = options;

  const typeDescMap: Record<DeckType, string> = {
    mixed: 'Campuran kosakata, kanji, dan tata bahasa situasional',
    kotoba: 'Fokus kosakata (kata benda, kata kerja, kata sifat, frasa sehari-hari)',
    kanji: 'Fokus huruf kanji beserta onyomi, kunyomi, dan maknanya',
    bunpou: 'Fokus pola tata bahasa, rumus, dan nuansa penggunaannya',
    flashcard: 'Fokus drill bolak-balik arti dan cara baca cepat',
    writing: 'Fokus aksara kanji dan kosakata dengan huruf kanji yang bisa ditulis',
  };

  return `Peran: Kamu adalah Kurator Pembelajaran Bahasa Jepang untuk game "Nihongo Quest".
Tugas: Buatlah materi pembelajaran bahasa Jepang bertema khusus dalam format JSON valid dan terstruktur rapi.

SPESIFIKASI DECK:
- Tema / Topik: "${topic}"
- Target Level: ${level === 'ALL' || level === 'Semua Level' ? 'Semua Level (N5 sampai N3 disesuaikan konteks)' : level}
- Fokus Materi: ${typeDescMap[type] || 'Campuran'}
- Jumlah Materi: ${count} kartu
${customNotes && customNotes.trim() ? `- Instruksi Tambahan: "${customNotes.trim()}"\n` : ''}

ATURAN WAJIB FORMAT OUTPUT:
1. Output HANYA berupa objek JSON murni (boleh dibungkus markdown \`\`\`json ... \`\`\`).
2. JANGAN sertakan kalimat pembuka, salam, atau teks penjelasan apa pun di luar blok JSON.
3. Seluruh terjemahan ("meaning" dan "exampleId") HARUS menggunakan Bahasa Indonesia yang alami, luwes, dan akurat (bukan Google Translate kaku).
4. Anotasi bacaan ("reading" dan "exampleReading") WAJIB akurat dalam hiragana / furigana.

STRUKTUR JSON YANG DIHARUSKAN:
{
  "title": "Nama Deck Menarik (Bahasa Indonesia, 2-5 kata)",
  "description": "Deskripsi singkat isi materi dan manfaatnya bagi petualang (1-2 kalimat)",
  "type": "${type}",
  "coverIcon": "Pilih satu emoji yang paling cocok dengan tema (misal: ☕, 🍱, 💼, 🌸, ⚡, 🏹)",
  "level": "${level}",
  "items": [
    {
      "word": "Kata asli / karakter kanji / pola tata bahasa",
      "reading": "Cara baca hiragana / furigana",
      "meaning": "Arti kata dalam Bahasa Indonesia",
      "category": "kotoba",
      "exampleJp": "Contoh kalimat bahasa Jepang yang natural dan relevan",
      "exampleReading": "Cara baca contoh kalimat lengkap dengan furigana",
      "exampleId": "Arti contoh kalimat dalam Bahasa Indonesia"
    }
  ]
}

Keterangan nilai "category" untuk setiap item:
- "kotoba": jika berupa kosakata / frasa
- "kanji": jika berupa satu aksara kanji
- "bunpou": jika berupa pola kalimat / tata bahasa

Silakan buatkan ${count} item terbaik sekarang!`;
}

/**
 * Robustly parses and extracts JSON from Gemini output.
 * Handles markdown wrapping, conversational prefixes, and trailing text.
 */
export function parseGeminiDeckJson(rawText: string): {
  success: boolean;
  deck?: ParsedAiDeck;
  error?: string;
} {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Teks input kosong.' };
  }

  let cleaned = rawText.trim();

  // Strip markdown codeblocks like ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // Find the outermost JSON object bounds: first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return {
      success: false,
      error: 'Tidak ditemukan blok data JSON yang valid ({ ... }) pada teks yang ditempelkan.',
    };
  }

  const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonSubstring);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Data JSON yang diparsing bukan berupa objek.' };
    }

    if (!parsed.title || typeof parsed.title !== 'string') {
      return { success: false, error: 'Data JSON tidak memiliki judul deck ("title").' };
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return { success: false, error: 'Daftar materi ("items") kosong atau bukan berupa array.' };
    }

    // Clean and validate items
    const validItems: ParsedAiDeckItem[] = [];

    for (const rawItem of parsed.items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const word = String(rawItem.word || rawItem.title || rawItem.character || '').trim();
      const meaning = String(rawItem.meaning || rawItem.meaningId || rawItem.arti || '').trim();

      if (!word || !meaning) continue;

      const reading = String(rawItem.reading || rawItem.bacaan || word).trim();
      let category: DeckItemCategory = 'kotoba';
      if (rawItem.category === 'kanji' || rawItem.category === 'bunpou') {
        category = rawItem.category;
      } else if (parsed.type === 'kanji' || word.length === 1 && /[\u4E00-\u9FAF]/.test(word)) {
        category = 'kanji';
      } else if (parsed.type === 'bunpou' || word.includes('〜') || word.includes('~')) {
        category = 'bunpou';
      }

      validItems.push({
        word,
        reading,
        meaning,
        category,
        exampleJp: rawItem.exampleJp || rawItem.example || undefined,
        exampleReading: rawItem.exampleReading || undefined,
        exampleId: rawItem.exampleId || rawItem.exampleMeaning || undefined,
        level: rawItem.level || parsed.level || 'N5',
      });
    }

    if (validItems.length === 0) {
      return {
        success: false,
        error: 'Tidak ada item yang memiliki pasangan kata ("word") dan arti ("meaning") yang valid.',
      };
    }

    const validDeck: ParsedAiDeck = {
      title: parsed.title.trim(),
      description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
      type: (parsed.type as DeckType) || 'mixed',
      coverIcon: typeof parsed.coverIcon === 'string' && parsed.coverIcon.trim() ? parsed.coverIcon.trim() : '📖',
      level: typeof parsed.level === 'string' ? parsed.level.trim() : 'N5',
      items: validItems,
    };

    return { success: true, deck: validDeck };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal membaca format JSON: ${err.message || 'Sintaks tidak valid.'}`,
    };
  }
}

/**
 * Converts a parsed AI deck into a complete, runtime-ready UserDeck.
 * If a word matches an existing item in the local database, links its database ID.
 */
export function convertAiDeckToUserDeck(parsed: ParsedAiDeck): UserDeck {
  const now = new Date().toISOString();
  const deckId = `deck_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Pre-index local database words for quick linking
  const kotobaMap = new Map<string, string>();
  for (const [id, item] of Object.entries(KOTOBA_DATABASE)) {
    if (item && item.word) kotobaMap.set(item.word, id);
  }

  const kanjiMap = new Map<string, string>();
  for (const [id, item] of Object.entries(KANJI_DATABASE)) {
    if (item && item.character) kanjiMap.set(item.character, id);
  }

  const bunpouMap = new Map<string, string>();
  for (const [id, item] of Object.entries(BUNPOU_DATABASE)) {
    if (item && item.title) {
      bunpouMap.set(item.title.replace(/^[〜~]/, ''), id);
    }
  }

  const deckItems: DeckItemRef[] = parsed.items.map((item, idx) => {
    let resolvedId = `custom_${deckId}_${idx + 1}`;

    if (item.category === 'kotoba' && kotobaMap.has(item.word)) {
      resolvedId = kotobaMap.get(item.word)!;
    } else if (item.category === 'kanji' && kanjiMap.has(item.word)) {
      resolvedId = kanjiMap.get(item.word)!;
    } else if (item.category === 'bunpou') {
      const cleanTitle = item.word.replace(/^[〜~]/, '');
      if (bunpouMap.has(cleanTitle)) {
        resolvedId = bunpouMap.get(cleanTitle)!;
      }
    }

    return {
      id: resolvedId,
      category: item.category || 'kotoba',
      addedAt: now,
      customData: {
        word: item.word,
        reading: item.reading,
        meaning: item.meaning,
        exampleJp: item.exampleJp,
        exampleReading: item.exampleReading,
        exampleId: item.exampleId,
        level: item.level || parsed.level || 'N5',
      },
    };
  });

  return {
    id: deckId,
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    coverIcon: parsed.coverIcon,
    level: parsed.level,
    createdAt: now,
    updatedAt: now,
    items: deckItems,
  };
}
