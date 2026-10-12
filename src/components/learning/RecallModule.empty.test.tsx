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
