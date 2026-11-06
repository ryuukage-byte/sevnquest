// Jalankan: npm test   (node:test + tsx; memakai data nyata dari database & paket tryout)
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDokkaiCollection, isUsablePassage, questionFitsPassage, deriveTitle } from './collection';
import { buildDokkaiStudy, wordLevel, bandOf, detectQuestionKind, isLikelyFalseHit } from './study';
import { DOKKAI_TEMPLATES, generateDokkai, regenerateFromId, templatesForLevel } from './generator';
import { DOKKAI_LEVELS } from './types';
import { normSentence, splitParagraphs } from './text';

test('koleksi: bacaan database + tryout, tanpa placeholder/rumpang/sampah PDF', () => {
  const c = getDokkaiCollection();
  assert.ok(c.length > 150, `jumlah bacaan ${c.length}`);
  assert.ok(c.some(p => p.source === 'database'));
  for (const lv of DOKKAI_LEVELS) assert.ok(c.some(p => p.source === 'tryout' && p.level === lv), `tryout ${lv}`);
  const ids = new Set<string>();
  for (const p of c) {
    assert.ok(!ids.has(p.id), `id ganda ${p.id}`);
    ids.add(p.id);
    assert.ok(isUsablePassage(p.text), p.id);
    assert.ok(!/Tunggu AI|Tôi Yêu|\[\d{2}\]/.test(p.text), p.id);
    assert.ok(p.questions.length > 0);
    for (const q of p.questions) {
      assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length, q.id);
      assert.ok(q.options.every(o => o.trim()), q.id);
    }
  }
});

test('koleksi: soal yang tertempel di bacaan yang salah dibuang', () => {
  const text = '日本では、音楽を聞きに行ったり、絵や映画を見に行ったりすることが好きな人でも、子供が小さいうちは、行くのを我慢してしまうことがあります。';
  assert.equal(questionFitsPassage({ prompt: 'スーパーのサービスを利用して、「私」は今、引っ越しについてどう考えているか。', options: ['届けてもらった商品に満足した', '配達が遅い'] }, text), false);
  assert.equal(questionFitsPassage({ prompt: '行くのを我慢してしまうことがあるのはどうしてか。', options: ['子供を連れて行けないから'] }, text), true);
  assert.equal(questionFitsPassage({ prompt: 'Hari apa gedung tutup?', options: ['Sabtu', 'Minggu'] }, text), true);
});

test('judul bacaan tryout diambil dari baris judul / kalimat pertama', () => {
  assert.equal(deriveTitle('第3回山川市マラソン大会\nボランティアを募集します。'), '第3回山川市マラソン大会');
  assert.equal(deriveTitle('（２）\n6歳の娘がボールを上手に投げられるようになりたいと言う。'), '6歳の娘がボールを上手に投げられるようになり…');
  assert.equal(deriveTitle('注1）分別する：種類ごとに分ける\nゴミの出し方が変わります。'), 'ゴミの出し方が変わります');
});

test('level kata: label kamus N1 untuk kata dasar dikoreksi oleh level kanjinya', () => {
  assert.equal(wordLevel({ word: 'ご飯', jlpt: 'N1' }), 'N4');
  assert.equal(wordLevel({ word: '学校', jlpt: 'N5' }), 'N5');
  assert.equal(wordLevel({ word: '我慢', jlpt: 'N3' }), 'N3');
  assert.equal(bandOf('N2', 'N4'), 'above');
  assert.equal(bandOf('N4', 'N4'), 'at');
  assert.equal(bandOf('N5', 'N3'), 'below');
});

test('kecocokan kana pendek yang salah (うに dari ように) disaring', () => {
  const fake = { surface: 'うに', item: { word: 'うに' } } as any;
  const real = { surface: 'もう', item: { word: 'もう' } } as any;
  assert.equal(isLikelyFalseHit(fake), true);
  assert.equal(isLikelyFalseHit(real), false);
});

test('jenis soal dikenali dari kalimat perintah', () => {
  assert.equal(detectQuestionKind('この文章のテーマは何か。', false).kind, 'idea');
  assert.equal(detectQuestionKind('行くのを我慢してしまうことがありますとあるが、どうしてか。', false).kind, 'reason');
  assert.equal(detectQuestionKind('ダンさんが必ずしなければならないことは何か。', true).kind, 'info');
  assert.equal(detectQuestionKind('この文章全体で伝えたい最も適切な内容は何ですか。', false).kind, 'idea');
});

test('bedah dokkai tryout: paragraf, materi, inti, dan tepat 3 soal berpembahasan', () => {
  const c = getDokkaiCollection();
  const p = c.find(x => x.text.includes('子供を預かってくれる音楽会場'))!;
  assert.ok(p, 'bacaan musik/anak ada');
  const s = buildDokkaiStudy(p);
  assert.ok(s.paragraphs.length >= 3);
  assert.ok(s.paragraphs.some(x => x.role === 'turn'), 'paragraf しかし dikenali sebagai pembalikan');
  assert.ok(s.words.length > 10 && s.kanji.length > 10 && s.grammar.length > 3);
  assert.equal(s.mainIdea.basis, 'question');
  assert.match(s.mainIdea.text, /楽しめる環境/);
  assert.equal(s.questions.length, 3);
  for (const q of s.questions) {
    assert.ok(q.evidence && p.text.replace(/\s/g, '').includes(q.evidence.replace(/\s/g, '')), `bukti ada di teks: ${q.evidence}`);
    assert.ok(q.explanation.length > 10);
    assert.equal(q.reviews.length, q.options.length);
    assert.equal(q.reviews.filter(r => r.correct).length, 1);
  }
});

test('bacaan dengan < 3 soal dilengkapi soal kosakata dalam konteks', () => {
  const c = getDokkaiCollection();
  const p = c.find(x => x.questions.length === 1 && x.level === 'N5' && /[一-龯]/.test(x.text))!;
  const s = buildDokkaiStudy(p);
  assert.equal(s.questions.length, 3);
  const sup = s.questions.filter(q => q.supplementary);
  assert.ok(sup.length >= 1);
  for (const q of sup) {
    assert.equal(new Set(q.options).size, 4, 'pilihan unik');
    assert.ok(q.evidence && p.text.includes(q.evidence.replace(/^\s+|\s+$/g, '').slice(0, 5)));
  }
});

test('level pembaca mengubah penandaan kata (di atas / sesuai / di bawah)', () => {
  const p = getDokkaiCollection().find(x => x.level === 'N2')!;
  const n5 = buildDokkaiStudy(p, 'N5');
  const n1 = buildDokkaiStudy(p, 'N1');
  assert.ok(n5.stats.above > n1.stats.above);
});

test('Rakit Dokkai: setiap template valid untuk setiap level & seed', () => {
  for (const lv of DOKKAI_LEVELS) {
    assert.ok(templatesForLevel(lv).length >= 2, `template ${lv}`);
    for (const tpl of templatesForLevel(lv)) for (let seed = 1; seed <= 25; seed++) {
      const g = generateDokkai({ level: lv, templateId: tpl.id, seed });
      assert.equal(g.source, 'generated');
      assert.equal(g.questions.length, 3, g.id);
      const flat = g.text.replace(/\s/g, '');
      for (const q of g.questions) {
        assert.equal(q.options.length, 4, `${g.id} ${q.prompt} ${q.options}`);
        assert.equal(new Set(q.options).size, 4, `${g.id} pilihan unik ${q.options}`);
        assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
        assert.ok(q.evidence && flat.includes(q.evidence.replace(/\s/g, '')), `${g.id} bukti di teks`);
        assert.ok(q.explanation && !q.explanation.includes('undefined'), g.id);
      }
      // Semua kalimat punya terjemahan.
      for (const para of splitParagraphs(g.text)) assert.ok(para.length > 0);
      for (const line of g.text.split(/\n+/)) for (const sent of line.split(/(?<=[。！？])/)) {
        if (!sent.trim()) continue;
        assert.ok(g.sentenceTranslations![normSentence(sent)], `${g.id} terjemahan: ${sent}`);
      }
      assert.ok(!/undefined|\$\{/.test(g.text + JSON.stringify(g.sentenceTranslations)), g.id);
      // Studi lengkap bisa dibangun & inti pasti.
      const s = buildDokkaiStudy(g);
      assert.equal(s.mainIdea.basis, 'given');
      assert.equal(s.questions.filter(q => q.autoExplanation).length, 0);
    }
  }
});

test('Rakit Dokkai: kosakata slot tidak melebihi level target', () => {
  const N1_ONLY = ['オンライン学習', '普及しつつ', '要するに', '経費精算'];
  for (let seed = 1; seed <= 60; seed++) {
    for (const tpl of templatesForLevel('N2')) {
      const t = generateDokkai({ level: 'N2', templateId: tpl.id, seed }).text;
      for (const w of N1_ONLY) assert.ok(!t.includes(w), `N2 memakai kata N1 ${w}`);
    }
  }
  // Untuk N1, kosakata N1 benar-benar dipakai (dengan bobot lebih besar).
  const n1Texts = Array.from({ length: 30 }, (_, i) => generateDokkai({ level: 'N1', templateId: 'n2_essay', seed: i + 1 }).text).join('');
  assert.ok(N1_ONLY.some(w => n1Texts.includes(w)));
});

test('Rakit Dokkai: deterministik & bisa dibuka ulang dari id', () => {
  const a = generateDokkai({ level: 'N3', seed: 42 });
  const b = regenerateFromId(a.id)!;
  assert.equal(b.text, a.text);
  assert.deepEqual(b.questions.map(q => q.correctIndex), a.questions.map(q => q.correctIndex));
  assert.equal(DOKKAI_TEMPLATES.length >= 8, true);
});
