import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecallModule } from './RecallModule';

const noop = () => {};
const render = (props: Partial<React.ComponentProps<typeof RecallModule>>) =>
  renderToStaticMarkup(
    <RecallModule
      recallQueue={[]}
      playerMp={0}
      playerInt={0}
      onItemReviewed={noop}
      onCompleteRecallSession={noop}
      onExit={noop}
      {...props}
    />
  );

test('8. antrean kosong menampilkan empty state, bukan soal sisipan', () => {
  const noProgress = render({ hasProgress: false });
  assert.match(noProgress, /BELUM ADA MATERI DIULANG/);
  assert.doesNotMatch(noProgress, /Alasan Pengujian|True Mastery/);

  const allFresh = render({ hasProgress: true });
  assert.match(allFresh, /SEMUA MATERI TELAH SEGAR/);

  assert.match(render({ syncStatus: 'syncing' }), /MEMUAT PROGRESMU/);
});

test('item tanpa angka mastery tidak menampilkan "True Mastery" rekaan', () => {
  const html = render({
    recallQueue: [{
      id: 'recall_x', itemId: 'x', category: 'kotoba', title: 'T', subtitle: 'S',
      reason: 'NEW_UNTESTED', reasonText: 'Baru dipelajari', urgencyScore: 85, priorityTier: 'REVIEW',
      difficultyLevel: 1,
      sampleQuestion: { id: 'q', prompt: 'P', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'E' },
    }],
  });
  assert.doesNotMatch(html, /True Mastery/);
  assert.match(html, /Baru dipelajari/);
});

import { buildSmartRecallQueue, recordItemInteraction } from '../../utils/mastery';
import { KOTOBA_DATABASE } from '../../data/kotoba';

test('Recall merender engine flashcard & canvas (bukan hanya pilihan ganda)', () => {
  const k = Object.values(KOTOBA_DATABASE).find(x => x.word === '黒')!;
  const flash = buildSmartRecallQueue({ [k.id]: recordItemInteraction(undefined, k.id, 'kotoba', 'flashcard', true) });
  assert.equal(flash[0].exerciseFormat, 'flashcard');
  const htmlFlash = render({ recallQueue: flash });
  assert.match(htmlFlash, /Ingat/);
  assert.match(htmlFlash, /Lupa/);
  assert.doesNotMatch(htmlFlash, /50\/50/);

  const canvas = buildSmartRecallQueue({ [k.id]: recordItemInteraction(undefined, k.id, 'kotoba', 'writing', true) });
  assert.equal(canvas[0].exerciseFormat, 'canvas');
  const htmlCanvas = render({ recallQueue: canvas });
  assert.match(htmlCanvas, /dari ingatan/);
  assert.doesNotMatch(htmlCanvas, /50\/50/);
});

import { BUNPOU_DATABASE } from '../../data/bunpou';
import { getFusionPatternForBunpou } from '../../engine/recall/bunpouEngines';

test('Recall merender engine Grammar Fusion untuk bunpou berpola', () => {
  const b = Object.values(BUNPOU_DATABASE).find(x => getFusionPatternForBunpou(x.id))!;
  const q = buildSmartRecallQueue({ [b.id]: recordItemInteraction(undefined, b.id, 'bunpou', 'writing', true) });
  assert.equal(q[0].exerciseFormat, 'fusion');
  const html = render({ recallQueue: q });
  assert.match(html, /Rakit pola/);
  assert.doesNotMatch(html, /50\/50/);
});
