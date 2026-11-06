/**
 * Logika murni (tanpa Supabase/React) untuk Kotak Pos: surat-menyurat pemain <-> admin.
 * Skema & aturan server: supabase/migrations/20261107b_letters.sql.
 */

export type LetterCategory = 'general' | 'bug' | 'account' | 'suggestion' | 'thanks';
export type Stationery = 'classic' | 'sakura' | 'night';

/** Alamat Kantor Pos Pusat (admin). */
export const ADMIN_ADDRESS = 'SQ-PUSAT';
export const ADMIN_NAME = 'Admin SevnQuest';
export const ADMIN_OFFICE = 'Kantor Pos Pusat';

export const LETTER_LIMITS = { subject: 120, body: 5000, perDay: 10 } as const;

export const CATEGORIES: { value: LetterCategory; label: string }[] = [
  { value: 'general', label: 'Umum' },
  { value: 'bug', label: 'Lapor Bug' },
  { value: 'account', label: 'Akun & Progres' },
  { value: 'suggestion', label: 'Saran' },
  { value: 'thanks', label: 'Terima Kasih' },
];

export interface StationeryStyle {
  value: Stationery;
  label: string;
  paper: string;
  ink: string;
  muted: string;
  rule: string;
}

/** Warna kertas tetap (tidak ikut tema): ini kertas surat, bukan panel aplikasi. */
export const STATIONERY: StationeryStyle[] = [
  { value: 'classic', label: 'Klasik', paper: '#f3ead6', ink: '#3b2f22', muted: '#7a6a55', rule: 'rgba(122,106,85,0.18)' },
  { value: 'sakura', label: 'Sakura', paper: '#f9e8ec', ink: '#4f2232', muted: '#8f5a6a', rule: 'rgba(143,90,106,0.18)' },
  { value: 'night', label: 'Malam', paper: '#1f2742', ink: '#e7eaf6', muted: '#9aa3c4', rule: 'rgba(154,163,196,0.16)' },
];

export function stationeryStyle(s: Stationery): StationeryStyle {
  return STATIONERY.find(x => x.value === s) ?? STATIONERY[0];
}

export function categoryLabel(c: LetterCategory): string {
  return CATEGORIES.find(x => x.value === c)?.label ?? 'Umum';
}

/** Surat seperti terlihat pemain (tanpa sender_id; server tidak memberikannya). */
export interface Letter {
  id: string;
  fromAdmin: boolean;
  isAnonymous: boolean;
  senderName: string | null;
  senderAddress: string | null;
  recipientId: string | null;
  toAdmin: boolean;
  subject: string;
  body: string;
  category: LetterCategory;
  stationery: Stationery;
  replyTo: string | null;
  sentAt: string;
  readAt: string | null;
  repliedAt: string | null;
  archivedByRecipient: boolean;
  archivedBySender: boolean;
}

/** Surat di Kantor Pos Pusat seperti terlihat admin. */
export interface AdminLetter {
  id: string;
  isAnonymous: boolean;
  senderName: string | null;
  senderAddress: string | null;
  subject: string;
  body: string;
  category: LetterCategory;
  stationery: Stationery;
  sentAt: string;
  readAt: string | null;
  repliedAt: string | null;
  archived: boolean;
}

const CATEGORY_SET = new Set<string>(CATEGORIES.map(c => c.value));
const STATIONERY_SET = new Set<string>(STATIONERY.map(s => s.value));

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function cat(v: unknown): LetterCategory {
  return typeof v === 'string' && CATEGORY_SET.has(v) ? (v as LetterCategory) : 'general';
}

function paper(v: unknown): Stationery {
  return typeof v === 'string' && STATIONERY_SET.has(v) ? (v as Stationery) : 'classic';
}

export function parseLetterRow(row: unknown): Letter | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const subject = str(r.subject);
  const body = str(r.body);
  if (!id || subject === null || body === null) return null;
  const anon = r.is_anonymous === true;
  return {
    id,
    fromAdmin: r.from_admin === true,
    isAnonymous: anon,
    senderName: anon ? null : str(r.sender_name),
    senderAddress: anon ? null : str(r.sender_address),
    recipientId: str(r.recipient_id),
    toAdmin: r.to_admin === true,
    subject,
    body,
    category: cat(r.category),
    stationery: paper(r.stationery),
    replyTo: str(r.reply_to),
    sentAt: str(r.sent_at) ?? new Date(0).toISOString(),
    readAt: str(r.read_at),
    repliedAt: str(r.replied_at),
    archivedByRecipient: r.archived_by_recipient === true,
    archivedBySender: r.archived_by_sender === true,
  };
}

export function parseAdminLetterRow(row: unknown): AdminLetter | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const subject = str(r.subject);
  const body = str(r.body);
  if (!id || subject === null || body === null) return null;
  const anon = r.is_anonymous === true;
  return {
    id,
    isAnonymous: anon,
    senderName: anon ? null : str(r.sender_name),
    senderAddress: anon ? null : str(r.sender_address),
    subject,
    body,
    category: cat(r.category),
    stationery: paper(r.stationery),
    sentAt: str(r.sent_at) ?? new Date(0).toISOString(),
    readAt: str(r.read_at),
    repliedAt: str(r.replied_at),
    archived: r.archived === true,
  };
}

// --------------------------- Kotak (laci) ---------------------------

export type PlayerBox = 'inbox' | 'sent' | 'archive';

/** Surat di kotak pos pemain: masuk (dialamatkan ke saya), terkirim (dari saya), arsip. */
export function playerBox(letters: Letter[], myId: string, box: PlayerBox): Letter[] {
  const incoming = (l: Letter) => l.recipientId === myId;
  const archived = (l: Letter) => (incoming(l) ? l.archivedByRecipient : l.archivedBySender);
  const list = letters.filter(l => {
    if (box === 'archive') return archived(l);
    if (archived(l)) return false;
    return box === 'inbox' ? incoming(l) : !incoming(l);
  });
  return [...list].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

export type AdminBox = 'unread' | 'unanswered' | 'all' | 'archive';

export function adminBox(letters: AdminLetter[], box: AdminBox): AdminLetter[] {
  const list = letters.filter(l => {
    if (box === 'archive') return l.archived;
    if (l.archived) return false;
    if (box === 'unread') return !l.readAt;
    if (box === 'unanswered') return !l.repliedAt;
    return true;
  });
  return [...list].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
}

// --------------------------- Menulis ---------------------------

export interface LetterDraft {
  subject: string;
  body: string;
  category: LetterCategory;
  stationery: Stationery;
  anonymous: boolean;
}

export const EMPTY_LETTER: LetterDraft = { subject: '', body: '', category: 'general', stationery: 'classic', anonymous: false };

export function validateLetter(d: Pick<LetterDraft, 'subject' | 'body'>): string | null {
  const subject = d.subject.trim();
  const body = d.body.trim();
  if (!subject) return 'Perihal surat wajib diisi.';
  if (subject.length > LETTER_LIMITS.subject) return `Perihal maksimal ${LETTER_LIMITS.subject} karakter.`;
  if (!body) return 'Isi surat tidak boleh kosong.';
  if (body.length > LETTER_LIMITS.body) return `Isi surat maksimal ${LETTER_LIMITS.body} karakter.`;
  return null;
}

/** Perihal balasan: "Balasan: <perihal>" tanpa menumpuk "Balasan: Balasan: ...". */
export function replySubject(subject: string): string {
  const base = subject.replace(/^(\s*(Balasan|Re)\s*:\s*)+/i, '').trim();
  return `Balasan: ${base}`.slice(0, LETTER_LIMITS.subject);
}

/** Nama penanda tangan surat. */
export function signatureOf(l: { fromAdmin?: boolean; isAnonymous: boolean; senderName: string | null }): string {
  if (l.fromAdmin) return ADMIN_NAME;
  if (l.isAnonymous) return 'Seseorang (anonim)';
  return l.senderName || 'Pemain SevnQuest';
}

// --------------------------- Format ---------------------------

/** Tanggal surat: "6 November 2026". */
export function letterDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Cap pos singkat untuk daftar: "14.32" hari ini, "kemarin", atau "6 Nov". */
export function postmark(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

/** Terjemahkan galat Supabase ke pesan yang ramah pemain. */
export function mailError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return 'Terjadi kesalahan.';
  const msg = err.message || '';
  if (
    err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST202' || err.code === '42883' ||
    /does not exist|schema cache|Could not find the (table|function)/i.test(msg)
  ) {
    return 'Kantor pos belum dibuka di server (migrasi 20261107b_letters.sql belum dijalankan).';
  }
  if (err.code === 'P0001' || err.code === 'P0002') return msg;
  if (/Harus login/i.test(msg)) return 'Masuk ke akun dulu untuk membuka kotak pos.';
  if (err.code === '42501' || /row-level security|permission denied|Akses ditolak/i.test(msg)) return 'Akses ditolak.';
  if (err.code === '23514') return 'Isi surat tidak valid (kosong atau terlalu panjang).';
  if (/Failed to fetch|NetworkError|timeout|aborted/i.test(msg)) return 'Tidak dapat terhubung ke kantor pos. Coba lagi.';
  return msg || 'Terjadi kesalahan.';
}
