import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregate, buildDictIndex, buildPackBook, classifyQuestion, examLabel, extractFromExam,
  matchReadingTarget, matchSurface, usageWord, type DictEntry, type Exam,
} from './packBuilder';

const DICT: DictEntry[] = [
  { id: 'k_kubaru', word: '配る', reading: 'くばる', jlpt: 'N3', wordType: 'verb' },
  { id: 'k_hade', word: '派手', reading: 'はで', jlpt: 'N2', wordType: 'adjective-na' },
  { id: 'k_sakan', word: '盛ん', reading: 'さかん', jlpt: 'N3', wordType: 'adjective-na' },
  { id: 'k_ayashii', word: '怪しい', reading: 'あやしい', jlpt: 'N3', wordType: 'adjective-i' },
  { id: 'k_kakomu', word: '囲む', reading: 'かこむ', jlpt: 'N3', wordType: 'verb' },
  { id: 'k_junban', word: '順番', reading: 'じゅんばん', jlpt: 'N4', wordType: 'noun' },
  { id: 'k_naiyou', word: '内容', reading: 'ないよう', jlpt: 'N3', wordType: 'noun' },
  { id: 'k_kigyou', word: '企業', reading: 'きぎょう', jlpt: 'N3', wordType: 'noun' },
  { id: 'k_kaisha', word: '会社', reading: 'かいしゃ', jlpt: 'N5', wordType: 'noun' },
  { id: 'k_akubi', word: '欠伸', reading: 'あくび', jlpt: 'N2', wordType: 'noun' },
  { id: 'k_akubi2', word: '悪日', reading: 'あくび', jlpt: 'N1', wordType: 'noun' },
  { id: 'k_kekkou', word: '結構', reading: 'けっこう', jlpt: 'N1', wordType: 'noun' },
  { id: 'k_kekkou2', word: '決行', reading: 'けっこう', jlpt: 'N1', wordType: 'noun' },
  { id: 'k_nokosu', word: '残す', reading: 'のこす', jlpt: 'N4', wordType: 'verb' },
];
const idx = buildDictIndex(DICT);

test('classifyQuestion mengenali kelima jenis soal 文字・語彙', () => {
  assert.equal(classifyQuestion('問題1 ___のことばの読み方として最もよいものを'), 'reading');
  assert.equal(classifyQuestion('問題2 ＿＿＿のことばを漢字で書くとき、最もよいものを'), 'writing');
  assert.equal(classifyQuestion('問題3 （　）に入れるのに最もよいものを'), 'context');
  assert.equal(classifyQuestion('問題4 ___に意味が最も近いものを'), 'paraphrase');
  assert.equal(classifyQuestion('問題5 つぎのことばの使い方として最もよいものを'), 'usage');
  assert.equal(classifyQuestion(undefined), 'unknown');
});

test('soal 読み方: kata berkonjugasi di kalimat dicocokkan lewat bacaan jawaban', () => {
  assert.equal(matchReadingTarget(idx, '山田さんがちらしを配った。', 'くばった', 'N3'), 'k_kubaru');
  assert.equal(matchReadingTarget(idx, 'これは残さないでください。', 'のこさないで', 'N3'), 'k_nokosu');
  assert.equal(matchReadingTarget(idx, '山田さんがちらしを配った。', 'ひろった', 'N3'), null);
});

test('matchSurface: na-adjektiva, kana untuk kata berkanji, bentuk turunan, dan homonim', () => {
  assert.equal(matchSurface(idx, '派手な', 'N3'), 'k_hade');
  assert.equal(matchSurface(idx, 'あやしい', 'N3'), 'k_ayashii');
  assert.equal(matchSurface(idx, 'かこまれた', 'N3'), 'k_kakomu');
  assert.equal(matchSurface(idx, 'あくび', 'N3'), 'k_akubi', 'homonim: level terdekat menang');
  assert.equal(matchSurface(idx, 'けっこう', 'N3'), null, 'homonim seri: tidak ditebak');
  assert.equal(matchSurface(idx, '順審', 'N3'), null, 'kanji karangan tidak cocok');
});

test('usageWord mengambil kata dari baris pertama dan membuang awalan instruksi', () => {
  assert.equal(usageWord('円滑\n1. 藤田さんは…'), '円滑');
  assert.equal(usageWord('言葉の使い方として最もよいものを選びなさい: 風潮'), '風潮');
  assert.equal(usageWord('内容'), '内容');
});

const EXAM_A: Exam = {
  id: 'n3_2024_12',
  questions: [
    { id: 'a1', instruction: '問題1 ___のことばの読み方として', prompt: 'ちらしを配った。', options: ['ひろった', 'くばった'], correctIndex: 1 },
    { id: 'a2', instruction: '問題2 ___のことばを漢字で書くとき', prompt: 'じゅんばんに見て', options: ['順番', '順審'], correctIndex: 0 },
    { id: 'a3', instruction: '問題3 （　）に入れるのに', prompt: '（　）シャツ', options: ['派手な', '盛んな', '感'], correctIndex: 0 },
    { id: 'a4', instruction: '問題4 ___に意味が最も近いものを', prompt: '来週、企業の説明会があります。', options: ['会社', '旅行'], correctIndex: 0 },
    { id: 'a5', instruction: '問題5 つぎのことばの使い方として', prompt: '内容', options: ['…'], correctIndex: 0 },
  ],
};
const EXAM_B: Exam = {
  id: 'n3_2025_07',
  questions: [
    { id: 'b1', instruction: '問題3 （　）に入れるのに', prompt: '（　）', options: ['盛んな', '派手な'], correctIndex: 0 },
  ],
};

test('extractFromExam memberi peran yang benar per jenis soal', () => {
  const { hits, misses } = extractFromExam(idx, EXAM_A, 'N3');
  const roleOf = (id: string) => hits.filter(h => h.id === id).map(h => h.role);
  assert.deepEqual(roleOf('k_kubaru'), ['target']);
  assert.deepEqual(roleOf('k_junban'), ['target']);
  assert.deepEqual(roleOf('k_hade'), ['answer']);
  assert.deepEqual(roleOf('k_sakan'), ['distractor']);
  assert.deepEqual(roleOf('k_kaisha'), ['answer']);
  assert.deepEqual(roleOf('k_naiyou'), ['target']);
  const kigyou = hits.find(h => h.id === 'k_kigyou');
  assert.equal(kigyou?.role, 'target');
  assert.equal(kigyou?.lowConfidence, true, 'target 言い換え ditebak, ditandai perlu tinjau');
  assert.equal(misses.length, 0, 'opsi satu huruf dan pengecoh 表記 tidak dicatat sebagai miss');
});

test('aggregate + buildPackBook: urut frekuensi, bab per jumlah ujian, tebakan tidak ikut', () => {
  const hits = [...extractFromExam(idx, EXAM_A, 'N3').hits, ...extractFromExam(idx, EXAM_B, 'N3').hits];
  const stats = aggregate(hits);
  const hade = stats.find(s => s.id === 'k_hade');
  assert.deepEqual(hade?.exams, ['n3_2024_12', 'n3_2025_07']);
  assert.equal(hade?.answer, 1);
  assert.equal(hade?.distractor, 1);

  const book = buildPackBook({
    packId: 'kilat-n3', level: 'N3', examIds: ['n3_2025_07', 'n3_2024_12'], stats,
    addedAt: '2026-11-27T00:00:00.000Z',
    chapters: [
      { minExams: 2, titleId: 'Sering', titleJp: '頻出', description: '' },
      { minExams: 1, maxExams: 1, titleId: 'Pernah Muncul', titleJp: '既出', description: '' },
    ],
  });
  assert.deepEqual(book.sources, ['n3_2024_12', 'n3_2025_07']);
  assert.equal(book.chapters[0].titleId, 'Sering');
  assert.deepEqual(book.chapters[0].items.map(i => i.id).sort(), ['k_hade', 'k_sakan']);
  const all = book.chapters.flatMap(c => c.items.map(i => i.id));
  assert.ok(!all.includes('k_kigyou'), 'kata ber-lowConfidence tidak masuk tanpa includeLowConfidence');
  assert.equal(new Set(all).size, all.length, 'satu kata hanya di satu bab');
  assert.match(book.chapters[0].items[0].notes ?? '', /^Muncul di 2 ujian \(Des 2024, Jul 2025\)/);
  assert.ok(book.chapters.every(c => c.items.every(i => i.category === 'kotoba')));
});

test('examLabel', () => {
  assert.equal(examLabel('n1_2023_07'), 'Jul 2023');
  assert.equal(examLabel('n3_2020_12'), 'Des 2020');
  assert.equal(examLabel('jft_001'), 'jft_001');
});
