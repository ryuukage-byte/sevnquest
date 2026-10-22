import { BunpouItem } from '../types/content';
import { getSubBranchesForBunpou } from './bunpouSubKnowledge';
import { enrichBunpouItem } from './bunpouMetadata';
import bunpouJson from './db/bunpou.json';
import { LEGACY_BUNPOU_ID_ALIASES, defineLookupAlias } from './entityIds';

// Catatan (C1): dulu seluruh korpus db/sentences.json (3,6 MB) di-import di sini hanya untuk melengkapi `reading`
// contoh yang kosong. Semua contoh di db/bunpou.json sudah punya reading (dijaga oleh bunpou.golden.test.ts),
// jadi korpus itu tidak lagi dimuat ke klien.

interface RawExample {
  jp: string;
  en?: string;
  id?: string;
  reading?: string;
}

interface RawBunpou {
  id: string;
  map_id?: string;
  stage_id?: string;
  title: string;
  formula: string;
  meaning_en: string;
  meaning_id: string;
  explanation_note?: string;
  examples: RawExample[];
  question_ids: string[];
}

export const BUNPOU_DATABASE: Record<string, BunpouItem> = {};

(bunpouJson as RawBunpou[]).forEach(item => {
  // Format examples with canonical readings
  const examples = (item.examples || []).map(ex => {
    let cleanMeaningId = ex.id;
    const isPlaceholder = !cleanMeaningId || cleanMeaningId.startsWith('Contoh penggunaan pola');
    if (isPlaceholder) {
      cleanMeaningId = `Contoh penerapan pola ${item.title}.`;
    }

    return {
      japanese: ex.jp,
      reading: ex.reading || ex.jp,
      meaningId: cleanMeaningId || `Contoh penerapan pola ${item.title}.`,
      meaningEn: ex.en || ex.id
    };
  });

  // Determine level from ID (e.g. bp_n5_004 -> N5)
  // For legacy N3 items (e.g. w1d1g1), default to N3
  let detectedLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = 'N3';
  if (item.id.includes('_n5_')) detectedLevel = 'N5';
  else if (item.id.includes('_n4_')) detectedLevel = 'N4';
  else if (item.id.includes('_n2_')) detectedLevel = 'N2';
  else if (item.id.includes('_n1_')) detectedLevel = 'N1';

  const bunpouItem: BunpouItem = {
    id: item.id,
    title: item.title,
    reading: (item as any).reading || (item.title === '〜方' ? '〜かた' : (item.formula || '文法パターン')),
    meaningId: item.meaning_id || `Tata bahasa ${detectedLevel}`,
    meaningEn: item.meaning_en || `${detectedLevel} Grammar Pattern`,
    level: detectedLevel,
    explanation: item.explanation_note
      ? `${item.meaning_id}. Catatan: ${item.explanation_note}`
      : `${item.meaning_id}.`,
    formula: item.formula || '',
    examples,
    // Soal kurasi (db/bunpou_questions.json) menggantikan soal bawaan ini lewat bunpouQuestions.ts (lihat fullData.ts).
    questions: [
      {
        id: `${item.id}_default_q1`,
        prompt: `Arti yang tepat untuk pola 「${item.title}」 adalah:`,
        options: [item.meaning_id, 'Menyatakan larangan keras', 'Menunjukkan kemungkinan masa lalu', 'Menyatakan dugaan spekulatif'],
        correctIndex: 0,
        explanation: `${item.title}: ${item.meaning_id}`
      }
    ]
  };

  bunpouItem.subFormulas = getSubBranchesForBunpou(bunpouItem);
  const enrichedItem = enrichBunpouItem(bunpouItem);

  BUNPOU_DATABASE[item.id] = enrichedItem;
});

// Alias ID lama (bunpou_001 -> w1d1g1, dst.): kunci PENCARIAN non-enumerable yang menunjuk ke materi
// kanonik yang sama (sebelumnya disalin sebagai 5 entri tambahan yang menggandakan materi).
for (const [legacyId, canonicalId] of Object.entries(LEGACY_BUNPOU_ID_ALIASES)) {
  const canonical = BUNPOU_DATABASE[canonicalId];
  if (canonical) defineLookupAlias(BUNPOU_DATABASE, legacyId, canonical);
}
