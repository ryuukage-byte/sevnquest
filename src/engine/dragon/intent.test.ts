import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpret, extractDeckSlots, rankFeatures, matchTheme } from './intent';
import { dragonTierForRank, DRAGON_TIERS } from '../../data/dragon/tiers';

const cmds = (r: ReturnType<typeof interpret>) => r.choices.map(c => c.command).filter(Boolean);

test('bikin flashcard tanpa topik: naga menanyakan topik dan menunggu jawaban', () => {
  const r = interpret('Aku mau bikin flashcard');
  assert.equal(r.intent, 'create_deck_ask');
  assert.equal(r.awaiting?.kind, 'deck_topic');
  assert.ok(cmds(r).some(c => c?.type === 'deck_ai'));
});

test('jawaban topik melengkapi isian deck', () => {
  const ask = interpret('bikin flashcard kanji');
  assert.equal(ask.awaiting?.prefill.focus, 'kanji');
  const r = interpret('makanan', { awaiting: ask.awaiting });
  assert.equal(r.intent, 'create_deck');
  const deck = cmds(r).find(c => c?.type === 'deck_ai');
  assert.ok(deck && deck.type === 'deck_ai');
  assert.equal(deck.prefill.focus, 'kanji');
  assert.equal(deck.prefill.topic, 'makanan');
  assert.equal(deck.prefill.themeId, 'kuliner');
});

test('pertanyaan lain saat menunggu topik tidak dianggap topik', () => {
  const ask = interpret('Aku mau bikin flashcard');
  assert.equal(interpret('Apa itu Recall?', { awaiting: ask.awaiting }).intent, 'topic:recall');
  assert.equal(interpret('Aku mau bikin flashcard', { awaiting: ask.awaiting }).intent, 'create_deck_ask');
  assert.equal(interpret('batal', { awaiting: ask.awaiting }).intent, 'cancel');
});

test('kalimat lengkap: jenis, level, jumlah, dan topik terbaca sekaligus', () => {
  const s = extractDeckSlots('tolong buatkan deck kosakata N5 20 kata tentang sekolah');
  assert.equal(s.focus, 'kotoba');
  assert.deepEqual(s.levels, ['N5']);
  assert.equal(s.count, 20);
  assert.equal(s.topic, 'sekolah');
  const r = interpret('tolong buatkan deck kosakata N5 20 kata tentang sekolah');
  assert.equal(r.intent, 'create_deck');
});

test('tema siap pakai dikenali dari kata kunci', () => {
  assert.equal(matchTheme('belanja'), 'konbini');
  assert.equal(matchTheme('xyzabc'), undefined);
});

test('penjelasan fitur memakai teks data, plus tombol buka', () => {
  const r = interpret('apa itu recall?');
  assert.equal(r.intent, 'topic:recall');
  assert.deepEqual(cmds(r)[0], { type: 'recall' });
  assert.ok((r.sections || []).length > 0, 'penjelasan rinci, bukan cuma tombol');
  const tower = interpret('Apa itu Menara?');
  assert.deepEqual(cmds(tower)[0], { type: 'tower' });
});

test('navigasi: kata kunci membawa ke sub-tab Library yang tepat', () => {
  assert.equal(rankFeatures('kamus kanji')[0].id, 'kanji');
  assert.deepEqual(cmds(interpret('kamus kanji'))[0], { type: 'library', tab: 'kanji' });
  assert.equal(rankFeatures('latihan soal')[0].id, 'soal');
  assert.deepEqual(cmds(interpret('latihan soal'))[0], { type: 'library', tab: 'soal' });
  const r = interpret('misi harian');
  assert.equal(r.intent, 'topic:misi-harian');
  assert.deepEqual(cmds(r)[0], { type: 'tab', tab: 'daily' });
});

test('sapaan, pemula, dan tidak dikenal', () => {
  assert.equal(interpret('halo').intent, 'greeting');
  assert.equal(interpret('aku pemula, mulai dari mana?').intent, 'topic:pemula');
  const unknown = interpret('qwerty zzz');
  assert.equal(unknown.intent, 'unknown');
  // Tidak boleh buntu: daftar semua topik + pilihan populer.
  assert.ok((unknown.sections || []).length >= 4);
  assert.ok(unknown.choices.length >= 3);
  assert.equal(interpret('   ').intent, 'empty');
});

test('pemetaan rank dukungan ke tier naga', () => {
  assert.equal(DRAGON_TIERS.length, 7);
  const expect: [number, string][] = [
    [0, 'hatchling'], [1, 'juvenile'], [2, 'young'], [3, 'adult'], [4, 'adult'],
    [5, 'elder'], [6, 'elder'], [7, 'ancient'], [8, 'celestial'], [9, 'celestial'], [-1, 'hatchling'], [NaN, 'hatchling'],
  ];
  for (const [rank, id] of expect) assert.equal(dragonTierForRank(rank).id, id, `rank ${rank}`);
});

test('sorotan: perintah dipetakan ke elemen navigasi, kecuali sudah di tab itu', async () => {
  const { guideTargetFor } = await import('./guideTarget');
  assert.equal(guideTargetFor({ type: 'tab', tab: 'deck' }, 'home')?.selector, '[data-tour="nav-deck"]');
  assert.equal(guideTargetFor({ type: 'tab', tab: 'weekly' }, 'home')?.selector, '[data-tour="nav-daily"]');
  assert.equal(guideTargetFor({ type: 'deck_ai', prefill: {} }, 'home')?.label, 'Buku Saku');
  assert.equal(guideTargetFor({ type: 'library', tab: 'kanji' }, 'home')?.selector, '[data-tour="nav-library"]');
  assert.equal(guideTargetFor({ type: 'tab', tab: 'deck' }, 'deck'), null);
  assert.equal(guideTargetFor({ type: 'deck_ai', prefill: {} }, 'deck'), null);
  assert.equal(guideTargetFor({ type: 'status' }, 'home')?.selector, '[data-tour="hero-card"]');
  assert.equal(guideTargetFor({ type: 'status' }, 'library'), null);
  assert.equal(guideTargetFor({ type: 'tour' }, 'home'), null);
  assert.equal(guideTargetFor({ type: 'recall' }, 'home'), null);
});

test('belajar menulis kanji: panduan lengkap (tempat, nilai, bonus) + tur bertahap', () => {
  const r = interpret('mau belajar nulis kanji');
  assert.equal(r.intent, 'guide_writing');
  const titles = (r.sections || []).map(s => s.title);
  assert.deepEqual(titles, ['Tempat latihan', 'Cara penilaian', 'Bonus EXP']);
  assert.ok(r.sections![0].items.length >= 4, 'minimal 4 tempat latihan');
  assert.ok(r.sections![1].items.some(i => i.includes('15') && i.includes('100')), 'aturan nilai disebut');
  assert.deepEqual(r.choices[0].command, { type: 'guide_tour', tour: 'menulis-kanji' });
  // Variasi kalimat
  assert.equal(interpret('gimana cara latihan menulis?').intent, 'guide_writing');
  assert.equal(interpret('urutan goresan kanji').intent, 'guide_writing');
});

test('menulis kana menyebut Kana Dojo; membuat deck tetap diutamakan', () => {
  const kana = interpret('aku mau latihan nulis hiragana');
  assert.equal(kana.intent, 'guide_writing');
  assert.ok(kana.sections![0].items.some(i => i.includes('Kana Dojo')));
  assert.ok(!interpret('mau nulis kanji').sections![0].items.some(i => i.includes('Kana Dojo')));
  assert.equal(interpret('bikin deck kanji buat latihan nulis').intent, 'create_deck_ask');
});

test('tur menulis kanji: urutan langkah sampai kanvas, langkah tab dilewati bila sudah di Library', async () => {
  const { TOURS, stepNeedsSpotlight, singleStepTour } = await import('./tours');
  const steps = TOURS['menulis-kanji'].steps;
  assert.deepEqual(steps.map(s => s.selector), [
    '[data-tour="nav-library"]', '[data-tour="kanji-item"]', '[data-tour="kanji-write-tab"]', '[data-tour="writing-canvas"]',
  ]);
  assert.deepEqual(steps.map(s => s.action.kind), ['command', 'click', 'click', 'info']);
  assert.ok(steps[3].points!.some(p => p.includes('60')));
  assert.equal(stepNeedsSpotlight(steps[0], 'home'), true);
  assert.equal(stepNeedsSpotlight(steps[0], 'library'), false);
  assert.equal(stepNeedsSpotlight(steps[1], 'library'), true);
  assert.equal(singleStepTour({ type: 'tab', tab: 'deck' }, 'home')?.steps.length, 1);
  assert.equal(singleStepTour({ type: 'tab', tab: 'deck' }, 'deck'), null);
});

test('pertanyaan sehari-hari dipetakan ke topik yang tepat', () => {
  const cases: [string, string][] = [
    ['Download gimana', 'pasang-app'],
    ['cara install aplikasinya', 'pasang-app'],
    ['dowload aplikasi', 'pasang-app'],          // salah ketik
    ['bisa diinstal di iphone?', 'pasang-app'],
    ['gimana cara login', 'akun'],
    ['ganti hp progres hilang gak?', 'akun'],
    ['lapor bug', 'kotak-pos'],
    ['tulis surat ke admin', 'kotak-pos'],       // bukan latihan menulis
    ['ganti tema gelap', 'pengaturan'],
    ['matikan suara', 'pengaturan'],
    ['ganti nama', 'profil'],
    ['hp ku habis', 'hp-mp'],
    ['cara dapat exp', 'koin'],
    ['rank mingguan reset kapan', 'peringkat'],
    ['streak ku putus', 'streak'],
    ['choukai kok gak ada', 'choukai'],
    ['dungeon kaigo', 'dungeon'],
    ['ada game apa aja', 'arcade'],
    ['naik tier gimana', 'status'],
    ['donasi', 'donasi'],
    ['grup komunitas', 'komunitas'],
    ['bacaan dokkai', 'dokkai'],
    ['simpan kata favorit', 'bookmark'],
    ['buku resmi', 'buku-resmi'],
    ['kurikulum belajar', 'misi-harian'],
    ['menara', 'menara'],
    ['flashcard', 'flashcard'],
  ];
  for (const [q, id] of cases) assert.equal(interpret(q).intent, `topic:${id}`, q);
});

test('semua topik: jawaban lengkap, tombol valid, dan bisa ditemukan', async () => {
  const { KNOWLEDGE } = await import('../../data/dragon/knowledge');
  const { TOURS } = await import('./tours');
  const { replyForTopic } = await import('./intent');
  const ids = new Set(KNOWLEDGE.map(t => t.id));
  assert.equal(ids.size, KNOWLEDGE.length, 'id topik unik');
  for (const t of KNOWLEDGE) {
    const r = replyForTopic(t.id);
    assert.ok(r.text.length > 20, t.id);
    assert.ok(r.choices.some(c => c.command), `${t.id}: punya tombol tindakan`);
    for (const c of t.actions) {
      if (c.command?.type === 'guide_tour') assert.ok(TOURS[c.command.tour], `${t.id}: tur ${c.command.tour} ada`);
    }
    for (const rel of t.related || []) assert.ok(ids.has(rel), `${t.id}: topik terkait ${rel} ada`);
    // Kata kunci utama topik harus membawa ke topik itu sendiri.
    assert.equal(rankFeatures(t.keywords[0])[0]?.id, t.id, `"${t.keywords[0]}" → ${t.id}`);
  }
});

test('pencocokan toleran salah ketik', async () => {
  const { editDistance } = await import('./intent');
  assert.equal(editDistance('dowload', 'download'), 1);
  assert.equal(editDistance('pengaturan', 'pengaturan'), 0);
  assert.ok(editDistance('abc', 'xyzxyz') > 2);
  assert.equal(interpret('peringakt').intent, 'topic:peringkat');
  assert.equal(interpret('leaderbord').intent, 'topic:peringkat');
});
