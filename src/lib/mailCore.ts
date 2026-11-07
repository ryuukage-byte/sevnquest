/**
 * Logika murni (tanpa Supabase/React) untuk Kotak Pos: surat-menyurat pemain <-> admin.
 * Skema & aturan server: supabase/migrations/20261107b_letters.sql.
 */

export type LetterCategory = 'general' | 'bug' | 'account' | 'suggestion' | 'thanks';
export type Stationery =
  | 'classic' | 'sakura' | 'night'                                       // Free
  | 'kilat'                                                               // Premium
  | 'hanami' | 'ume' | 'take' | 'matsu' | 'tsuki' | 'taiyou' | 'fuji';   // Super Premium Lv.1..7

/** Alamat Kantor Pos Pusat (admin). */
export const ADMIN_ADDRESS = 'SQ-PUSAT';
export const ADMIN_NAME = 'Admin SevnQuest';
export const ADMIN_OFFICE = 'Kantor Pos Pusat';

/** Batas panjang surat. Batas surat per hari bergantung tier (lihat mail_plan_for di server). */
export const LETTER_LIMITS = { subject: 120, body: 5000 } as const;

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
  /** Rank tier minimal untuk memakai kertas ini (lihat TIER_TITLES / mail_paper_rank di server). */
  rank: number;
  paper: string;
  ink: string;
  muted: string;
  rule: string;
  /** Warna aksen: perangko, ornamen, cap. */
  accent: string;
  /** Kanji tanda air di sudut kertas. */
  emblem?: string;
  /** Lapisan latar tambahan (CSS background) di bawah garis kertas. */
  pattern?: string;
  /** Bingkai kertas. */
  frame?: 'airmail';
  /** Ornamen gambar di kertas. */
  ornament?: 'moon' | 'sun' | 'mountain';
}

/**
 * Kertas surat. Warna tetap (tidak ikut tema): ini kertas, bukan panel aplikasi.
 * Free: Klasik, Pastel, Malam. Premium: Pos Kilat. Super Premium Lv.1..7: satu kertas eksklusif per level;
 * tiap tier juga bisa memakai kertas tier di bawahnya. Server memvalidasi (mail_paper_rank).
 */
export const STATIONERY: StationeryStyle[] = [
  { value: 'classic', label: 'Klasik', rank: 0, paper: '#f3ead6', ink: '#3b2f22', muted: '#7a6a55', rule: 'rgba(122,106,85,0.18)', accent: '#7a6a55' },
  { value: 'sakura', label: 'Pastel', rank: 0, paper: '#f9e8ec', ink: '#4f2232', muted: '#8f5a6a', rule: 'rgba(143,90,106,0.18)', accent: '#8f5a6a' },
  { value: 'night', label: 'Malam', rank: 0, paper: '#1f2742', ink: '#e7eaf6', muted: '#9aa3c4', rule: 'rgba(154,163,196,0.16)', accent: '#9aa3c4' },
  {
    value: 'kilat', label: 'Pos Kilat', rank: 1, paper: '#f4f7fc', ink: '#1f2e55', muted: '#5a6b93', rule: 'rgba(74,92,166,0.16)',
    accent: '#3a5ca8', frame: 'airmail', emblem: '速',
  },
  {
    value: 'hanami', label: 'Hanami', rank: 2, paper: '#fcebf1', ink: '#5a2236', muted: '#a0607a', rule: 'rgba(217,112,143,0.18)',
    accent: '#d9708f', emblem: '桜',
    pattern: 'radial-gradient(circle at 92% 8%, rgba(217,112,143,0.22) 0 18px, transparent 19px), radial-gradient(circle at 84% 16%, rgba(217,112,143,0.14) 0 10px, transparent 11px)',
  },
  {
    value: 'ume', label: 'Ume', rank: 3, paper: '#f7e7ef', ink: '#4a1d33', muted: '#8d4f6c', rule: 'rgba(156,61,107,0.16)',
    accent: '#9c3d6b', emblem: '梅',
    pattern: 'radial-gradient(circle at 8% 92%, rgba(156,61,107,0.18) 0 22px, transparent 23px), radial-gradient(circle at 16% 84%, rgba(156,61,107,0.12) 0 12px, transparent 13px)',
  },
  {
    value: 'take', label: 'Take', rank: 4, paper: '#ecf4e6', ink: '#24391b', muted: '#5d7a4c', rule: 'rgba(79,122,58,0.16)',
    accent: '#4f7a3a', emblem: '竹',
    pattern: 'repeating-linear-gradient(90deg, rgba(79,122,58,0.06) 0 2px, transparent 2px 34px)',
  },
  {
    value: 'matsu', label: 'Matsu', rank: 5, paper: '#1f3a2e', ink: '#e8f1e9', muted: '#9fc3a6', rule: 'rgba(159,195,166,0.16)',
    accent: '#a7d1a9', emblem: '松',
    pattern: 'linear-gradient(160deg, rgba(167,209,169,0.10), transparent 45%)',
  },
  {
    value: 'tsuki', label: 'Tsuki', rank: 6, paper: '#18203b', ink: '#eceff9', muted: '#a9b1d3', rule: 'rgba(169,177,211,0.14)',
    accent: '#d9c27a', emblem: '月', ornament: 'moon',
  },
  {
    value: 'taiyou', label: 'Taiyou', rank: 7, paper: '#fff2de', ink: '#4a2c0f', muted: '#9a6a3a', rule: 'rgba(224,120,43,0.16)',
    accent: '#e0782b', emblem: '陽', ornament: 'sun',
    pattern: 'radial-gradient(circle at 100% 0%, rgba(224,120,43,0.22) 0 60px, rgba(224,120,43,0.08) 61px 110px, transparent 111px)',
  },
  {
    value: 'fuji', label: 'Fuji', rank: 8, paper: '#eef2f8', ink: '#1d2a44', muted: '#5b6b8c', rule: 'rgba(59,89,152,0.14)',
    accent: '#3b5998', emblem: '富士', ornament: 'mountain',
    pattern: 'linear-gradient(180deg, rgba(59,89,152,0.08), transparent 40%)',
  },
];

// --------------------------- Tier Kotak Pos ---------------------------

/** Gelar Super Premium Lv.1..7 (sama dengan badge donatur di server). */
export const TIER_TITLES = ['Sakura', 'Ume', 'Take', 'Matsu', 'Tsuki', 'Taiyou', 'Fuji'] as const;

/** Nama tier dari rank: 0 Free, 1 Premium, 2..8 Super Premium Lv.1..7, 9 Admin. */
export function rankLabel(rank: number): string {
  if (rank >= 9) return 'Admin';
  if (rank <= 0) return 'Free';
  if (rank === 1) return 'Premium';
  const lv = Math.min(rank - 1, 7);
  return `Super Premium Lv.${lv} · ${TIER_TITLES[lv - 1]}`;
}

/** Nama layanan pos sesuai prioritas surat. */
export function priorityLabel(priority: number): string {
  if (priority >= 9) return 'Dinas';
  if (priority <= 0) return 'Pos Biasa';
  if (priority === 1) return 'Pos Kilat';
  return `Kilat Khusus · ${TIER_TITLES[Math.min(priority - 1, 7) - 1]}`;
}

export function paperUnlocked(paper: Stationery, rank: number): boolean {
  return stationeryStyle(paper).rank <= rank;
}

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
  priority: number;
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
  /** 0 Pos Biasa .. 8 Kilat Khusus Fuji. */
  priority: number;
  /** Nama tier pengirim saat surat dikirim (mis. "Premium"). */
  senderTier: string | null;
}

const CATEGORY_SET = new Set<string>(CATEGORIES.map(c => c.value));
const STATIONERY_SET = new Set<string>(STATIONERY.map(s => s.value));

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function cat(v: unknown): LetterCategory {
  return typeof v === 'string' && CATEGORY_SET.has(v) ? (v as LetterCategory) : 'general';
}

function prio(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(9, Math.max(0, Math.floor(n))) : 0;
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
    priority: prio(r.priority),
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
    priority: prio(r.priority),
    senderTier: str(r.sender_tier),
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
  // Prioritas tertinggi dulu, lalu terbaru.
  return [...list].sort((a, b) => b.priority - a.priority || Date.parse(b.sentAt) - Date.parse(a.sentAt));
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
