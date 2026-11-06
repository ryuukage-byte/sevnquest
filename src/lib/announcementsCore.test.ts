import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Announcement,
  EMPTY_DRAFT,
  EMPTY_READER_STATE,
  ackGate,
  addId,
  bannerList,
  bodyExcerpt,
  draftToRow,
  endForDuration,
  isAnnouncementActive,
  parseAnnouncementRow,
  parseBody,
  parseInline,
  popupQueue,
  remainingLabel,
  validateDraft,
} from './announcementsCore';

const NOW = new Date('2026-11-06T12:00:00Z');

function ann(over: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a1', title: 'T', body: 'B', kind: 'info', ctaLabel: null, ctaUrl: null,
    isPublished: true, startsAt: '2026-11-01T00:00:00Z', endsAt: null, createdAt: '2026-11-01T00:00:00Z',
    display: 'both', dismissible: true, popupFrequency: 'once', minReadSeconds: 0, requireAck: false,
    ...over,
  };
}

test('parseAnnouncementRow: defaults for v1 rows, rejects unsafe CTA, clamps read time', () => {
  const v1 = parseAnnouncementRow({
    id: 'x', title: 'Hi', body: 'Body', kind: 'weird', cta_label: 'Go', cta_url: 'javascript:alert(1)',
    is_published: true, starts_at: '2026-11-01T00:00:00Z', ends_at: null, created_at: '2026-11-01T00:00:00Z',
  });
  assert.ok(v1);
  assert.equal(v1.kind, 'info');
  assert.equal(v1.ctaUrl, null);
  assert.deepEqual(
    [v1.display, v1.dismissible, v1.popupFrequency, v1.minReadSeconds, v1.requireAck],
    ['both', true, 'once', 0, false],
  );
  const v2 = parseAnnouncementRow({
    id: 'y', title: 'Hi', body: 'B', starts_at: '2026-11-01T00:00:00Z',
    display: 'banner', dismissible: false, popup_frequency: 'every_open', min_read_seconds: 999, require_ack: true,
  });
  assert.deepEqual(
    [v2?.display, v2?.dismissible, v2?.popupFrequency, v2?.minReadSeconds, v2?.requireAck],
    ['banner', false, 'every_open', 120, true],
  );
  assert.equal(parseAnnouncementRow({ id: 'x' }), null);
});

test('isAnnouncementActive respects publish flag and window', () => {
  assert.equal(isAnnouncementActive(ann(), NOW), true);
  assert.equal(isAnnouncementActive(ann({ isPublished: false }), NOW), false);
  assert.equal(isAnnouncementActive(ann({ startsAt: '2026-11-07T00:00:00Z' }), NOW), false);
  assert.equal(isAnnouncementActive(ann({ endsAt: '2026-11-05T00:00:00Z' }), NOW), false);
});

test('popupQueue: once vs every_open, closed, session, banner-only excluded, important first', () => {
  const list = [
    ann({ id: 'once' }),
    ann({ id: 'every', popupFrequency: 'every_open' }),
    ann({ id: 'banner', display: 'banner' }),
    ann({ id: 'imp', kind: 'important', startsAt: '2026-10-01T00:00:00Z' }),
  ];
  assert.deepEqual(popupQueue(list, EMPTY_READER_STATE, NOW).map(a => a.id), ['imp', 'once', 'every']);
  // acked/closed: once disappears for good, every_open still pops each new session
  const s = { ...EMPTY_READER_STATE, acked: ['once', 'every'], closed: ['imp'] };
  assert.deepEqual(popupQueue(list, s, NOW).map(a => a.id), ['every']);
  // already shown this session: nothing repeats until the app is reopened
  assert.deepEqual(popupQueue(list, { ...s, shownThisSession: ['every'] }, NOW).map(a => a.id), []);
});

test('bannerList: hidden only works when dismissible; popup-only excluded', () => {
  const list = [
    ann({ id: 'pinned', dismissible: false }),
    ann({ id: 'normal' }),
    ann({ id: 'popup', display: 'popup' }),
  ];
  const s = { ...EMPTY_READER_STATE, hidden: ['pinned', 'normal'] };
  assert.deepEqual(bannerList(list, s, NOW).map(a => a.id), ['pinned']);
  assert.deepEqual(bannerList(list, EMPTY_READER_STATE, NOW).map(a => a.id).sort(), ['normal', 'pinned']);
});

test('ackGate: countdown and required checkbox', () => {
  const a = { minReadSeconds: 10, requireAck: true };
  assert.deepEqual(ackGate(a, 3, true), { remainingSeconds: 7, canConfirm: false });
  assert.deepEqual(ackGate(a, 10, false), { remainingSeconds: 0, canConfirm: false });
  assert.deepEqual(ackGate(a, 12, true), { remainingSeconds: 0, canConfirm: true });
  assert.deepEqual(ackGate({ minReadSeconds: 0, requireAck: false }, 0, false), { remainingSeconds: 0, canConfirm: true });
});

test('addId adds and prunes inactive ids', () => {
  assert.deepEqual(addId(['a', 'gone'], 'b', ['a', 'b']), ['a', 'b']);
  assert.deepEqual(addId(['a'], 'a'), ['a']);
});

test('endForDuration and remainingLabel', () => {
  assert.equal(endForDuration('', null, NOW), '');
  assert.equal(endForDuration('', 24, NOW), '2026-11-07T12:00:00.000Z');
  // future start: counted from start
  assert.equal(endForDuration('2026-11-10T00:00:00Z', 1, NOW), '2026-11-10T01:00:00.000Z');
  // past start (editing): counted from now
  assert.equal(endForDuration('2026-11-01T00:00:00Z', 1, NOW), '2026-11-06T13:00:00.000Z');
  assert.equal(remainingLabel(null, NOW), null);
  assert.equal(remainingLabel('2026-11-06T12:30:00Z', NOW), 'berakhir 30 menit lagi');
  assert.equal(remainingLabel('2026-11-06T17:00:00Z', NOW), 'berakhir 5 jam lagi');
  assert.equal(remainingLabel('2026-11-09T12:00:00Z', NOW), 'berakhir 3 hari lagi');
  assert.equal(remainingLabel('2026-11-05T00:00:00Z', NOW), null);
});

test('validateDraft: content, CTA, window, read time, pinned banner needs an end', () => {
  assert.match(validateDraft(EMPTY_DRAFT) ?? '', /Judul/);
  const ok = { ...EMPTY_DRAFT, title: 'T', body: 'B' };
  assert.equal(validateDraft(ok), null);
  assert.match(validateDraft({ ...ok, ctaLabel: 'Go' }) ?? '', /URL/);
  assert.match(validateDraft({ ...ok, ctaLabel: 'Go', ctaUrl: 'http://x.com' }) ?? '', /https/);
  assert.match(validateDraft({ ...ok, startsAt: '2026-11-06T00:00:00Z', endsAt: '2026-11-05T00:00:00Z' }) ?? '', /berakhir/);
  assert.match(validateDraft({ ...ok, minReadSeconds: 500 }) ?? '', /baca minimum/);
  assert.match(validateDraft({ ...ok, dismissible: false }) ?? '', /wajib punya waktu berakhir/);
  assert.equal(validateDraft({ ...ok, dismissible: false, display: 'popup' }), null);
  assert.equal(validateDraft({ ...ok, dismissible: false, endsAt: new Date(Date.now() + 3600_000).toISOString() }), null);
});

test('draftToRow maps all options', () => {
  const row = draftToRow(
    { ...EMPTY_DRAFT, title: ' T ', body: ' B ', ctaLabel: 'Go', display: 'banner', dismissible: false,
      popupFrequency: 'every_open', minReadSeconds: 15, requireAck: true },
    true,
  );
  assert.equal(row.title, 'T');
  assert.equal(row.cta_label, null);
  assert.deepEqual(
    [row.display, row.dismissible, row.popup_frequency, row.min_read_seconds, row.require_ack, row.is_published],
    ['banner', false, 'every_open', 15, true, true],
  );
});

test('parseBody / parseInline / bodyExcerpt', () => {
  const blocks = parseBody('Halo\nsemua\n\n## Judul\n- satu\n* dua\n> kutip\n---\nakhir');
  assert.deepEqual(blocks.map(b => b.type), ['paragraph', 'heading', 'bullet', 'bullet', 'quote', 'divider', 'paragraph']);
  assert.deepEqual(parseInline('a **b** *c* <img>'), [
    { text: 'a ' }, { text: 'b', bold: true }, { text: ' ' }, { text: 'c', italic: true }, { text: ' <img>' },
  ]);
  assert.equal(bodyExcerpt('## Judul\nHalo **semua**!\n- satu\n---'), 'Halo semua! satu');
  assert.equal(bodyExcerpt('x'.repeat(200), 20).length, 20);
});
