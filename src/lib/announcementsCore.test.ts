import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Announcement,
  EMPTY_DRAFT,
  draftToRow,
  isAnnouncementActive,
  mergeSeen,
  parseAnnouncementRow,
  parseBody,
  parseInline,
  pickUnseen,
  validateDraft,
} from './announcementsCore';

const NOW = new Date('2026-11-06T12:00:00Z');

function ann(over: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a1', title: 'T', body: 'B', kind: 'info', ctaLabel: null, ctaUrl: null,
    isPublished: true, startsAt: '2026-11-01T00:00:00Z', endsAt: null, createdAt: '2026-11-01T00:00:00Z',
    ...over,
  };
}

test('parseAnnouncementRow: valid, invalid, and unsafe CTA', () => {
  const a = parseAnnouncementRow({
    id: 'x', title: 'Hi', body: 'Body', kind: 'weird', cta_label: 'Go', cta_url: 'javascript:alert(1)',
    is_published: true, starts_at: '2026-11-01T00:00:00Z', ends_at: null, created_at: '2026-11-01T00:00:00Z',
  });
  assert.ok(a);
  assert.equal(a.kind, 'info');
  assert.equal(a.ctaUrl, null);
  assert.equal(parseAnnouncementRow({ id: 'x' }), null);
  assert.equal(parseAnnouncementRow(null), null);
});

test('isAnnouncementActive respects publish flag and window', () => {
  assert.equal(isAnnouncementActive(ann(), NOW), true);
  assert.equal(isAnnouncementActive(ann({ isPublished: false }), NOW), false);
  assert.equal(isAnnouncementActive(ann({ startsAt: '2026-11-07T00:00:00Z' }), NOW), false);
  assert.equal(isAnnouncementActive(ann({ endsAt: '2026-11-05T00:00:00Z' }), NOW), false);
  assert.equal(isAnnouncementActive(ann({ endsAt: '2026-11-08T00:00:00Z' }), NOW), true);
});

test('pickUnseen filters seen/inactive and sorts newest first', () => {
  const list = [
    ann({ id: 'old', startsAt: '2026-10-01T00:00:00Z' }),
    ann({ id: 'new', startsAt: '2026-11-05T00:00:00Z' }),
    ann({ id: 'seen' }),
    ann({ id: 'draft', isPublished: false }),
  ];
  assert.deepEqual(pickUnseen(list, ['seen'], NOW).map(a => a.id), ['new', 'old']);
});

test('mergeSeen adds id and prunes ids no longer active', () => {
  assert.deepEqual(mergeSeen(['a', 'gone'], 'b', ['a', 'b']), ['a', 'b']);
  assert.deepEqual(mergeSeen(['a'], 'a'), ['a']);
});

test('validateDraft catches missing fields, CTA pairs, bad urls and windows', () => {
  assert.match(validateDraft(EMPTY_DRAFT) ?? '', /Judul/);
  const ok = { ...EMPTY_DRAFT, title: 'T', body: 'B' };
  assert.equal(validateDraft(ok), null);
  assert.match(validateDraft({ ...ok, ctaLabel: 'Go' }) ?? '', /URL/);
  assert.match(validateDraft({ ...ok, ctaLabel: 'Go', ctaUrl: 'http://x.com' }) ?? '', /https/);
  assert.equal(validateDraft({ ...ok, ctaLabel: 'Go', ctaUrl: 'https://x.com' }), null);
  assert.match(
    validateDraft({ ...ok, startsAt: '2026-11-06T00:00:00Z', endsAt: '2026-11-05T00:00:00Z' }) ?? '',
    /berakhir/,
  );
});

test('draftToRow trims and nulls an incomplete CTA', () => {
  const row = draftToRow({ ...EMPTY_DRAFT, title: ' T ', body: ' B ', ctaLabel: 'Go' }, true);
  assert.equal(row.title, 'T');
  assert.equal(row.cta_label, null);
  assert.equal(row.is_published, true);
  assert.equal(row.ends_at, null);
});

test('parseBody handles headings, bullets, quotes, dividers and paragraphs', () => {
  const blocks = parseBody('Halo\nsemua\n\n## Judul\n- satu\n* dua\n> kutip\n---\nakhir');
  assert.deepEqual(blocks.map(b => b.type), ['paragraph', 'heading', 'bullet', 'bullet', 'quote', 'divider', 'paragraph']);
  const first = blocks[0];
  assert.equal(first.type === 'paragraph' && first.spans[0].text, 'Halo\nsemua');
});

test('parseInline splits bold and italic, keeps html as plain text', () => {
  assert.deepEqual(parseInline('a **b** *c* <img>'), [
    { text: 'a ' }, { text: 'b', bold: true }, { text: ' ' }, { text: 'c', italic: true }, { text: ' <img>' },
  ]);
});
