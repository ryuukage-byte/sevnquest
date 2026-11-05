// Jalankan: npm test   (node:test + tsx; memakai data nyata dari database sumber)
import test from 'node:test';
import assert from 'node:assert/strict';
import { KANJI_DATABASE } from '../../data/kanji';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KANJI_QUESTION_BANK, BUNPOU_QUESTION_BANK } from '../../data/questionBank';
import {
  BASIC_DRILL_SUBCATEGORIES,
  getQuestionLibrary,
  markedWordInPrompt,
  refineSubCategory,
  type UnifiedQuestionItem,
} from '../../data/questionLibrary';
import { detectReadingTraps, readingDiff } from './readingTraps';
import {
  buildQuestionInsight,
  buildStar,
  describeFragment,
  detectFormFamily,
  findStarSlots,
  lookupWord,
  matchPattern,
  parsePrompt,
  parseStarOrder,
  questionInsightKind,
} from './questionInsight';

const SRC = { kotoba: KOTOBA_DATABASE, kanji: KANJI_DATABASE, bunpou: BUNPOU_DATABASE };
const POOL = getQuestionLibrary();
const byId = (id: string) => {
  const q = POOL.find(x => x.id === id);
  assert.ok(q, `soal ${id} ada di Bank Soal`);
  return q!;
};
const trapKinds = (a: string, b: string) => detectReadingTraps(a, b).map(t => t.kind);

// ---------------------------------------------------------------------------
// Bank Soal
// ---------------------------------------------------------------------------

test('bank soal: seluruh Bank Kanji & Tata Bahasa masuk, bukan 100 soal pertama', () => {
  assert.equal(POOL.filter(q => q.id.startsWith('kq_')).length, KANJI_QUESTION_BANK.length);
  assert.equal(POOL.filter(q => q.id.startsWith('bq_')).length, BUNPOU_QUESTION_BANK.length);
  assert.equal(new Set(POOL.map(q => q.id)).size, POOL.length, 'id soal unik');
});

test('bank soal: level diambil dari data, bukan dipukul rata N3', () => {
  const kanjiLevels = new Set(POOL.filter(q => q.id.startsWith('kq_')).map(q => q.level));
  const bunpouLevels = new Set(POOL.filter(q => q.id.startsWith('bq_')).map(q => q.level));
  for (const lvl of ['N5', 'N4', 'N2', 'N1']) {
    assert.ok(kanjiLevels.has(lvl as never), `Bank Kanji punya ${lvl}`);
    assert.ok(bunpouLevels.has(lvl as never), `Bank Tata Bahasa punya ${lvl}`);
  }
  const n5 = POOL.find(q => q.materialId === 'bp_n5_001');
  assert.equal(n5?.level, 'N5');
});

test('bank soal: pembahasan asli tryout dipakai, bukan teks generik', () => {
  const q = byId('to_n3_2023_07_bd_n3_2023_07_bd_soal-1');
  assert.equal(q.explanationCurated, true);
  assert.match(q.explanation ?? '', /を中心に/);
  const generic = byId('to_n3_002_mg_mojiGoi_1');
  assert.equal(generic.explanationCurated, false);
});

test('bank soal: label dikoreksi dari bentuk soal', () => {
  assert.equal(refineSubCategory('kanji_writing', '駅前の( )を安く買った。', ['チャレンジ', '住所', '土地', '近所']), 'vocab_context');
  assert.equal(refineSubCategory('vocab_usage', '最近は毎月決まった金額で（　）。', ['どれだけよかった', 'どれだけよかったか', 'a', 'b']), 'grammar_form');
  assert.equal(
    refineSubCategory('vocab_context', 'わたしは すいえいが すきです。', ['わたしは はしるのが すきです。', 'わたしは およぐのが すきです。', 'x。', 'y。']),
    'synonym',
  );
  assert.equal(refineSubCategory('kanji_reading', 'その いけんには 反対です。', ['はんたい', 'ほんたい', 'はんだい', 'ほんだい']), 'kanji_reading');
  // Perintah N5 berhiragana: 「___のことばは どう かきますか」 → penulisan.
  assert.ok(POOL.some(q => q.prompt === 'らいげつ けっこんします。' && q.subCategory === 'kanji_writing'));
});

test('bank soal: latihan dasar tidak membanjiri Latihan Harian "Semua Format"', () => {
  assert.ok(BASIC_DRILL_SUBCATEGORIES.has('moji_basic'));
  const strokes = POOL.find(q => /goresan/.test(q.prompt) && q.id.startsWith('kq_'));
  assert.equal(strokes?.subCategory, 'moji_basic');
  assert.equal(questionInsightKind(strokes!), null, 'soal goresan tidak punya Bedah Soal');
});

test('bank soal: kata yang ditandai di prompt bank', () => {
  assert.equal(markedWordInPrompt('「彼と私は何の(関係)もありません。」 Cara baca kata yang dikurung adalah...'), '関係');
  assert.equal(markedWordInPrompt('「母はいつも私を深く愛してくれている。」上の文の「愛して」の読み方として正しいのはどれですか？'), '愛して');
});

// ---------------------------------------------------------------------------
// Jebakan bacaan
// ---------------------------------------------------------------------------

test('jebakan bacaan: tenten, maru, vokal panjang, つ kecil, ゃゅょ, ん', () => {
  assert.deepEqual(trapKinds('ようき', 'ようぎ'), ['dakuten']);
  assert.deepEqual(trapKinds('しんぱい', 'しんはい'), ['handakuten']);
  assert.deepEqual(trapKinds('こうこう', 'ここう'), ['long_vowel']);
  assert.deepEqual(trapKinds('ゆうひ', 'ゆひ'), ['long_vowel']);
  assert.deepEqual(trapKinds('がっこう', 'がくこう'), ['sokuon']);
  assert.deepEqual(trapKinds('がっこう', 'がこう'), ['sokuon']);
  assert.deepEqual(trapKinds('きょう', 'きよう'), ['youon']);
  assert.deepEqual(trapKinds('かんけい (kankei)', 'かけい'), ['hatsuon']);
  assert.deepEqual(trapKinds('ゆうひ', 'ゆうび'), ['dakuten']);
  // Kata lain sama sekali bukan "jebakan bunyi".
  assert.deepEqual(trapKinds('ようき', 'どうぐ'), []);
});

test('jebakan bacaan: selisih huruf ditandai', () => {
  const diff = readingDiff('ようき', 'ようぎ');
  assert.deepEqual(diff, [
    { text: 'よう', same: true },
    { text: 'ぎ', same: false },
  ]);
});

// ---------------------------------------------------------------------------
// Prompt, kata, pola, konjugasi
// ---------------------------------------------------------------------------

test('prompt: kalimat, kata yang diuji, dan bagian kosong', () => {
  const bank = parsePrompt('「(係員)に聞いてください。」 Cara baca kata yang dikurung adalah...');
  assert.equal(bank.sentence, '係員に聞いてください。');
  assert.equal(bank.target, '係員');
  assert.match(bank.question ?? '', /Cara baca/);

  const jft = parsePrompt('わたしは 「会社「に いきます。');
  assert.equal(jft.target, '会社');
  assert.equal(jft.sentence, 'わたしは 会社に いきます。');

  const blank = parsePrompt('この本は世界中の人々に（　）います。');
  assert.ok(blank.blank && !blank.blank.trailing);

  const trailing = parsePrompt('文の適切な形を選びなさい：「私は友だちに花をあげました。（　）」');
  assert.equal(trailing.sentence, '私は友だちに花をあげました。（　）');
  assert.ok(trailing.blank?.trailing, 'kotak di ujung = "pola apa yang dipakai", bukan isian');
});

test('kata: bentuk konjugasi dikembalikan ke kata dasar tanpa salah potong', () => {
  assert.equal(lookupWord('直して', SRC)?.info.word, '直す', '直して bukan 直 (じき) + して');
  assert.equal(lookupWord('なって', SRC)?.info.word, '成る', 'verba fungsi kana memilih なる = menjadi');
  assert.equal(lookupWord('迷って', SRC)?.info.word, '迷う');
  assert.equal(lookupWord('ぴったり', SRC)?.info.word, 'ぴったり');
  assert.equal(lookupWord('建設する', SRC)?.info.word, '建設');
});

test('pola: pilihan dicocokkan ke database Bunpou', () => {
  assert.equal(matchPattern('ように', SRC, 'N4')?.quality, 'exact');
  // にしたがって belum ada di database; jangan disamakan dengan したがって ("oleh karena itu").
  assert.equal(matchPattern('にしたがって', SRC, 'N3'), undefined);
  assert.match(matchPattern('以上は', SRC, 'N2')?.title ?? '', /以上/);
  assert.equal(matchPattern('降っていない', SRC, 'N4'), undefined, 'potongan rumus "いない" bukan pola ないはない');
});

test('konjugasi: pilihan satu keluarga kata dikenali bentuknya', () => {
  const forms = detectFormFamily(['読まれて', '読んで', '読ませて', '読めなくて'], SRC);
  assert.deepEqual(forms.map(f => f?.formKey), ['passive+te', 'te', 'causative+te', 'potential+nakute']);
  assert.ok(forms.every(f => f?.lemma === '読む'));
  const suru = detectFormFamily(['建設する', '建設される', '建設させる', '建設して'], SRC);
  assert.deepEqual(suru.map(f => f?.formKey), ['jisho', 'passive', 'causative', 'te']);
  assert.equal(detectFormFamily(['が', 'で', 'の', 'を'], SRC).length, 0);
});

test('urai potongan: pola panjang menang atas kata di dalamnya', () => {
  const pieces = describeFragment('出られるように', SRC).map(p => p.surface);
  assert.deepEqual(pieces, ['出られる', 'ように'], 'bukan 出られる + うに (landak laut)');
  const run = describeFragment('走ってくるのが', SRC).map(p => p.surface);
  assert.deepEqual(run, ['走って', 'くる', 'の', 'が']);
});

// ---------------------------------------------------------------------------
// Susun kalimat ★
// ---------------------------------------------------------------------------

test('★: urutan dibaca dari pembahasan dan harus sepakat dengan kunci', () => {
  assert.deepEqual(parseStarOrder('Urutan yang benar: 目の疲れ(4) 見すぎ(3) による(2) が(1).', ['が', 'による', '見すぎ', '目の疲れ']), [3, 2, 1, 0]);
  assert.deepEqual(parseStarOrder('Urutan: 4なんて → 1と思った → 3のを → 2よく', ['と思った', 'よく', 'のを', 'なんて']), [3, 0, 2, 1]);
  assert.equal(findStarSlots('A　＿＿ ＿＿ ＿★＿ ＿＿ 。').length, 4);
  const q = byId('to_n3_2023_07_bd_n3_2023_07_bd_soal-14');
  const build = buildStar(q);
  assert.ok(build);
  assert.equal(build!.starPos, 2);
  assert.equal(build!.order[build!.starPos], q.correctIndex);
  // Data yang bertentangan (urutan ≠ posisi ★) tidak ditampilkan.
  const broken: UnifiedQuestionItem = { ...q, explanation: 'Urutan yang benar: が(1) による(2) 見すぎ(3) 目の疲れ(4).' };
  assert.equal(buildStar(broken), undefined);
});

// ---------------------------------------------------------------------------
// Bedah Soal utuh
// ---------------------------------------------------------------------------

test('bedah soal 漢字読み: bacaan per kanji, jebakan tenten, kata lain', () => {
  const ins = buildQuestionInsight(byId('to_n3_002_mg_mojiGoi_1'), SRC, POOL)!;
  assert.equal(ins.kind, 'reading');
  assert.equal(ins.target, '容器');
  assert.deepEqual(ins.parts?.filter(p => p.isKanji).map(p => `${p.text}=${p.reading}`), ['容=よう', '器=き']);
  const [yougi, youki, dougu] = ins.options;
  assert.equal(youki.isCorrect, true);
  assert.deepEqual(yougi.traps?.map(t => t.kind), ['dakuten']);
  assert.equal(dougu.altWords?.[0]?.word, '道具');
  assert.deepEqual(ins.steps.slice(0, 2), ['task', 'sentence']);
  assert.ok(ins.steps.includes('options') && ins.steps.includes('answer'));
  assert.equal(ins.answer.curated, false, 'soal tanpa pembahasan diberi ringkasan otomatis');
  assert.ok(ins.answer.summary[0].includes('ようき'));
});

test('bedah soal 文法: kalimat terisi, bentuk tiap pilihan, terjemahan dari pembahasan', () => {
  const ins = buildQuestionInsight(byId('bq_w1d1g1_q1'), SRC, POOL)!;
  assert.equal(ins.kind, 'grammar');
  assert.equal(ins.sentence?.text, 'この本は世界中の人々に読まれています。');
  assert.equal(ins.sentence?.segments.find(s => s.role === 'answer')?.text, '読まれて');
  assert.equal(ins.sentence?.translationSource, 'explanation');
  assert.equal(ins.options[0].form?.formKey, 'passive+te');
  assert.ok(ins.similar.length > 0 && ins.similar.every(s => s.item.id !== 'bq_w1d1g1_q1'));
  assert.ok(ins.similar.some(s => s.item.materialId === 'w1d1g1'), 'soal serupa dari materi yang sama');
});

test('bedah soal ★: langkah Susun Kalimat dan kalimat utuh', () => {
  const ins = buildQuestionInsight(byId('to_n3_2023_07_bd_n3_2023_07_bd_soal-14'), SRC, POOL)!;
  assert.ok(ins.steps.includes('build'));
  assert.equal(ins.sentence?.segments.find(s => s.role === 'answer')?.text, 'による');
  assert.ok(ins.sentence?.text.startsWith('パソコンや携帯電話の目の疲れ見すぎによるが原因で'));
});

test('bedah soal 音読み・訓読み: pengecoh adalah bacaan kanji lain', () => {
  const q = POOL.find(x => x.prompt === 'Tebak Kunyomi (訓読み) dari Kanji: 「何」')!;
  const ins = buildQuestionInsight(q, SRC, POOL)!;
  assert.equal(ins.kind, 'onkun');
  assert.equal(ins.kanji?.char, '何');
  const wrong = ins.options.filter(o => !o.isCorrect);
  assert.ok(wrong.every(o => o.owner && o.owner.text !== '何'));
});

test('bedah soal: seluruh bank soal terurai tanpa error dan konsisten', () => {
  let built = 0;
  for (const q of POOL) {
    const ins = buildQuestionInsight(q, SRC, POOL);
    if (!ins) continue;
    built++;
    assert.equal(ins.options.length, q.options.length, q.id);
    assert.equal(ins.options.filter(o => o.isCorrect).length, 1, q.id);
    assert.equal(ins.options[q.correctIndex].isCorrect, true, q.id);
    assert.equal(ins.steps[0], 'task', q.id);
    assert.ok(ins.steps.includes('options') && ins.steps.includes('answer'), q.id);
    assert.ok(ins.similar.length <= 3 && ins.similar.every(s => s.item.id !== q.id), q.id);
    assert.ok(ins.options.every(o => o.verdict.length > 0), q.id);
  }
  assert.ok(built > 9000, `Bedah Soal tersedia untuk ${built} soal`);
});
