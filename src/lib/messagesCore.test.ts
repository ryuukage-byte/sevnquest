import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MessageThread,
  filterThreads,
  messageError,
  parseMessageRow,
  parseThreadRow,
  relativeTime,
  sortThreads,
  validateBody,
  validateNewThread,
} from './messagesCore';

function thread(over: Partial<MessageThread> = {}): MessageThread {
  return {
    id: 't1', userId: 'u1', userName: 'Budi', subject: 'S', category: 'general', status: 'open',
    createdAt: '2026-11-01T00:00:00Z', lastMessageAt: '2026-11-01T00:00:00Z', lastSender: 'user',
    userUnread: 0, adminUnread: 0, ...over,
  };
}

test('parseThreadRow: defaults, unknown category, invalid rows', () => {
  const t = parseThreadRow({
    id: 'a', user_id: 'u', subject: 'Halo', category: 'weird', status: 'x',
    created_at: '2026-11-01T00:00:00Z', user_unread: '2', admin_unread: -3,
  });
  assert.ok(t);
  assert.equal(t.category, 'general');
  assert.equal(t.status, 'open');
  assert.equal(t.lastMessageAt, '2026-11-01T00:00:00Z');
  assert.equal(t.userUnread, 2);
  assert.equal(t.adminUnread, 0);
  assert.equal(t.lastSender, 'user');
  assert.equal(parseThreadRow({ id: 'a' }), null);
  assert.equal(parseThreadRow(null), null);
});

test('parseMessageRow: from_admin only when strictly true', () => {
  const m = parseMessageRow({ id: 'm', thread_id: 't', body: 'x', from_admin: 'true', created_at: 'z' });
  assert.ok(m);
  assert.equal(m.fromAdmin, false);
  assert.equal(parseMessageRow({ id: 'm', thread_id: 't', body: 'x', from_admin: true })?.fromAdmin, true);
  assert.equal(parseMessageRow({ id: 'm', body: 'x' }), null);
});

test('validateNewThread / validateBody', () => {
  assert.equal(validateNewThread({ subject: ' ', category: 'bug', body: 'x' }), 'Subjek wajib diisi.');
  assert.match(validateNewThread({ subject: 'a'.repeat(121), category: 'bug', body: 'x' }) ?? '', /maksimal 120/);
  assert.equal(validateNewThread({ subject: 'ok', category: 'bug', body: '  ' }), 'Pesan tidak boleh kosong.');
  assert.equal(validateNewThread({ subject: 'ok', category: 'bug', body: 'isi' }), null);
  assert.match(validateBody('a'.repeat(4001)) ?? '', /maksimal 4000/);
});

test('sortThreads: unread first for the viewer, then newest', () => {
  const list = [
    thread({ id: 'old', lastMessageAt: '2026-11-01T00:00:00Z' }),
    thread({ id: 'new', lastMessageAt: '2026-11-05T00:00:00Z' }),
    thread({ id: 'unreadAdmin', lastMessageAt: '2026-10-01T00:00:00Z', adminUnread: 1 }),
    thread({ id: 'unreadUser', lastMessageAt: '2026-10-02T00:00:00Z', userUnread: 1 }),
  ];
  assert.deepEqual(sortThreads(list, 'admin').map(t => t.id), ['unreadAdmin', 'new', 'old', 'unreadUser']);
  assert.deepEqual(sortThreads(list, 'user').map(t => t.id), ['unreadUser', 'new', 'old', 'unreadAdmin']);
});

test('filterThreads', () => {
  const list = [thread({ id: 'a' }), thread({ id: 'b', status: 'closed' }), thread({ id: 'c', adminUnread: 2 })];
  assert.deepEqual(filterThreads(list, 'open', 'admin').map(t => t.id), ['a', 'c']);
  assert.deepEqual(filterThreads(list, 'closed', 'admin').map(t => t.id), ['b']);
  assert.deepEqual(filterThreads(list, 'unread', 'admin').map(t => t.id), ['c']);
  assert.equal(filterThreads(list, 'all', 'admin').length, 3);
});

test('relativeTime', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  assert.equal(relativeTime('2026-11-06T11:59:40Z', now), 'baru saja');
  assert.equal(relativeTime('2026-11-06T11:55:00Z', now), '5 mnt lalu');
  assert.equal(relativeTime('2026-11-06T09:00:00Z', now), '3 jam lalu');
  assert.equal(relativeTime('2026-11-05T10:00:00Z', now), 'kemarin');
  assert.equal(relativeTime('2026-11-03T12:00:00Z', now), '3 hari lalu');
  assert.equal(relativeTime('nope', now), '');
});

test('messageError maps server errors', () => {
  assert.match(messageError({ code: 'PGRST202', message: 'Could not find the function' }), /migrasi 20261107/);
  assert.equal(messageError({ code: 'P0001', message: 'Terlalu banyak pesan. Coba lagi nanti.' }), 'Terlalu banyak pesan. Coba lagi nanti.');
  assert.equal(messageError({ code: '42501', message: 'Harus login untuk mengirim pesan.' }), 'Masuk ke akun dulu untuk mengirim pesan.');
  assert.equal(messageError({ code: '42501', message: 'Akses ditolak.' }), 'Akses ditolak.');
  assert.match(messageError({ message: 'Failed to fetch' }), /terhubung/);
});
