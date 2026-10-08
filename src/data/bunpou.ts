import { BunpouItem, BunpouMixedSet, Question } from '../types/content';
import { getSubBranchesForBunpou } from './bunpouSubKnowledge';
import { enrichBunpouItem } from './bunpouMetadata';
import bunpouJson from './db/bunpou.json';
import { BUNPOU_QUESTION_BANK as questionsJson } from './questionBank';
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

interface RawQuestion {
  id: string;
  material_id: string;
  type: string;
  prompt: string;
  ruby?: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

// Group questions by material_id
const questionsByMaterial = new Map<string, Question[]>();
(questionsJson as RawQuestion[]).forEach(q => {
  if (!questionsByMaterial.has(q.material_id)) {
    questionsByMaterial.set(q.material_id, []);
  }
  questionsByMaterial.get(q.material_id)!.push({
    id: q.id,
    prompt: q.prompt,
    ruby: q.ruby,
    options: q.options,
    correctIndex: q.correct_answer,
    explanation: q.explanation
  });
});

export const BUNPOU_DATABASE: Record<string, BunpouItem> = {};

(bunpouJson as RawBunpou[]).forEach(item => {
  const questions = questionsByMaterial.get(item.id) || [];
  
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
    questions: questions.length > 0 ? questions : [
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

// Collect questions from all grammar points in a given week prefix
function collectWeekQuestions(weekPrefix: string): Question[] {
  const allQuestions: Question[] = [];
  for (const [id, item] of Object.entries(BUNPOU_DATABASE)) {
    if (id.startsWith(weekPrefix) && item.questions) {
      // Take 1 random question from each grammar point for variety
      const randomQ = item.questions[Math.floor(Math.random() * item.questions.length)];
      if (randomQ) allQuestions.push(randomQ);
    }
  }
  // Shuffle using Fisher-Yates
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }
  return allQuestions;
}

// Generate mixed sets for all 6 weeks dynamically
function buildMixedSets(): Record<string, BunpouMixedSet> {
  const sets: Record<string, BunpouMixedSet> = {};
  
  for (let w = 1; w <= 6; w++) {
    const weekPrefix = `w${w}`;
    const weekQuestions = collectWeekQuestions(weekPrefix);
    
    // General mixed set
    sets[`bunpou_mixed_w${w}`] = {
      id: `bunpou_mixed_w${w}`,
      title: `Week ${w} Mixed Grammar Test`,
      description: `Tantangan 7 soal acak dari seluruh tata bahasa Week ${w}.`,
      questions: weekQuestions.slice(0, 7)
    };
    
    // Boss set (same pool, different slice)
    sets[`set_w${w}_boss`] = {
      id: `set_w${w}_boss`,
      title: `Week ${w} Boss Mixed Grammar Test`,
      description: `Ujian boss akhir minggu: 7 soal campuran dari seluruh tata bahasa Week ${w}.`,
      questions: weekQuestions.slice(0, 7)
    };
  }

  // Legacy alias
  sets['bunpou_mixed_001'] = sets['bunpou_mixed_w1'] || {
    id: 'bunpou_mixed_001',
    title: 'N3 Bunpou Mastery Mixed Test',
    description: 'Tantangan 7 soal acak dari seluruh tata bahasa bab ini.',
    questions: collectWeekQuestions('w1').slice(0, 7)
  };

  return sets;
}

export const BUNPOU_MIXED_DATABASE = buildMixedSets();
