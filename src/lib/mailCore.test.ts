import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminLetter,
  Letter,
  adminBox,
  mailError,
  parseAdminLetterRow,
  parseLetterRow,
  playerBox,
  postmark,
  replySubject,
  signatureOf,
  stationeryStyle,
  validateLetter,
} from './mailCore';

const ME = 'me';

function letter(over: Partial<Letter> = {}): Letter {
  return {
    id: 'l1', fromAdmin: false, isAnonymous: false, senderName: 'Budi', senderAddress: 'SQ-AAAA-BBBB',
    recipientId: null, toAdmin: true, subject: 'S', body: 'B', category: 'general', stationery: 'classic',
    replyTo: null, sentAt: '2026-11-01T00:00:00Z', readAt: null, repliedAt: null,
    archivedByRecipient: false, archivedBySender: false, ...over,
  };
}

function adminLetter(over: Partial<AdminLetter> = {}): AdminLetter {
  return {
    id: 'a1', isAnonymous: false, senderName: 'Budi', senderAddress: 'SQ-AAAA-BBBB', subject: 'S', body: 'B',
    category: 'general', stationery: 'classic', sentAt: '2026-11-01T00:00:00Z', readAt: null, repliedAt: null,
    archived: false, ...over,
  };
}

test('parseLetterRow: defaults and anonymity hides identity even if server sent it', () => {
  const l = parseLetterRow({
    id: 'x', subject: 'Hai', body: 'Isi', category: 'weird', stationery: 'gold',
    is_anonymous: true, sender_name: 'Bocor', sender_address: 'SQ-XXXX-YYYY', from_admin: 'true',
  });
  assert.ok(l);
  assert.equal(l.category, 'general');
  assert.equal(l.stationery, 'classic');
  assert.equal(l.senderName, null);
  assert.equal(l.senderAddress, null);
  assert.equal(l.fromAdmin, false);
  assert.equal(parseLetterRow({ id: 'x' }), null);
  assert.equal(parseLetterRow(null), null);
});

test('parseAdminLetterRow', () => {
  const a = parseAdminLetterRow({ id: 'a', subject: 's', body: 'b', is_anonymous: false, sender_name: 'Sari', archived: true, category: 'thanks' });
  assert.ok(a);
  assert.equal(a.senderName, 'Sari');
  assert.equal(a.archived, true);
  assert.equal(a.category, 'thanks');
});

test('playerBox: inbox / sent / archive, newest first', () => {
  const list = [
    letter({ id: 'sent-old', sentAt: '2026-11-01T00:00:00Z' }),
    letter({ id: 'sent-new', sentAt: '2026-11-03T00:00:00Z' }),
    letter({ id: 'sent-arch', archivedBySender: true }),
    letter({ id: 'in', fromAdmin: true, toAdmin: false, recipientId: ME, sentAt: '2026-11-02T00:00:00Z' }),
    letter({ id: 'in-arch', fromAdmin: true, toAdmin: false, recipientId: ME, archivedByRecipient: true }),
  ];
  assert.deepEqual(playerBox(list, ME, 'inbox').map(l => l.id), ['in']);
  assert.deepEqual(playerBox(list, ME, 'sent').map(l => l.id), ['sent-new', 'sent-old']);
  assert.deepEqual(playerBox(list, ME, 'archive').map(l => l.id).sort(), ['in-arch', 'sent-arch']);
});

test('adminBox filters', () => {
  const list = [
    adminLetter({ id: 'new' }),
    adminLetter({ id: 'read', readAt: 'x' }),
    adminLetter({ id: 'done', readAt: 'x', repliedAt: 'y' }),
    adminLetter({ id: 'arch', archived: true }),
  ];
  assert.deepEqual(adminBox(list, 'unread').map(l => l.id), ['new']);
  assert.deepEqual(adminBox(list, 'unanswered').map(l => l.id).sort(), ['new', 'read']);
  assert.equal(adminBox(list, 'all').length, 3);
  assert.deepEqual(adminBox(list, 'archive').map(l => l.id), ['arch']);
});

test('validateLetter', () => {
  assert.equal(validateLetter({ subject: ' ', body: 'x' }), 'Perihal surat wajib diisi.');
  assert.equal(validateLetter({ subject: 'ok', body: ' ' }), 'Isi surat tidak boleh kosong.');
  assert.match(validateLetter({ subject: 'a'.repeat(121), body: 'x' }) ?? '', /maksimal 120/);
  assert.match(validateLetter({ subject: 'ok', body: 'a'.repeat(5001) }) ?? '', /maksimal 5000/);
  assert.equal(validateLetter({ subject: 'ok', body: 'isi' }), null);
});

test('replySubject does not stack prefixes', () => {
  assert.equal(replySubject('Progres hilang'), 'Balasan: Progres hilang');
  assert.equal(replySubject('Balasan: Re: Progres hilang'), 'Balasan: Progres hilang');
  assert.equal(replySubject('x'.repeat(200)).length, 120);
});

test('signatureOf', () => {
  assert.equal(signatureOf({ isAnonymous: true, senderName: 'Budi' }), 'Seseorang (anonim)');
  assert.equal(signatureOf({ isAnonymous: false, senderName: 'Budi' }), 'Budi');
  assert.equal(signatureOf({ fromAdmin: true, isAnonymous: false, senderName: null }), 'Admin SevnQuest');
  assert.equal(signatureOf({ isAnonymous: false, senderName: null }), 'Pemain SevnQuest');
});

test('postmark', () => {
  const now = new Date(2026, 10, 6, 15, 0);
  assert.match(postmark(new Date(2026, 10, 6, 9, 5).toISOString(), now), /09.05/);
  assert.equal(postmark(new Date(2026, 10, 5, 9, 5).toISOString(), now), 'kemarin');
  assert.match(postmark(new Date(2026, 10, 1).toISOString(), now), /1 Nov/);
  assert.equal(postmark('nope', now), '');
});

test('stationeryStyle falls back to classic', () => {
  assert.equal(stationeryStyle('night').value, 'night');
  assert.equal(stationeryStyle('x' as never).value, 'classic');
});

test('mailError', () => {
  assert.match(mailError({ code: 'PGRST202', message: 'Could not find the function' }), /20261107b/);
  assert.equal(mailError({ code: 'P0001', message: 'Kamu sudah mengirim 10 surat hari ini. Coba lagi besok.' }), 'Kamu sudah mengirim 10 surat hari ini. Coba lagi besok.');
  assert.equal(mailError({ code: '42501', message: 'Harus login untuk mengirim surat.' }), 'Masuk ke akun dulu untuk membuka kotak pos.');
  assert.match(mailError({ message: 'Failed to fetch' }), /kantor pos/);
});
