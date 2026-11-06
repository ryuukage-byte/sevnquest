/**
 * Logika murni pengumuman broadcast admin (tanpa Supabase / DOM) — bisa diuji dengan tsx --test.
 */

export type AnnouncementKind = 'info' | 'update' | 'important';
/** Di mana pengumuman tampil: pop-up saat buka aplikasi, kartu di dashboard (Castle), atau keduanya. */
export type AnnouncementDisplay = 'popup' | 'banner' | 'both';
/** Seberapa sering pop-up muncul: sekali per perangkat, atau setiap aplikasi dibuka sampai berakhir. */
export type PopupFrequency = 'once' | 'every_open';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  kind: AnnouncementKind;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isPublished: boolean;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  display: AnnouncementDisplay;
  /** false => pop-up tanpa tombol tutup (wajib konfirmasi) & kartu dashboard tak bisa disembunyikan. */
  dismissible: boolean;
  popupFrequency: PopupFrequency;
  /** Tombol konfirmasi terkunci selama N detik (0 = langsung). */
  minReadSeconds: number;
  /** Pemain wajib mencentang "Saya sudah membaca". */
  requireAck: boolean;
}

export interface AnnouncementDraft {
  title: string;
  body: string;
  kind: AnnouncementKind;
  ctaLabel: string;
  ctaUrl: string;
  /** ISO string atau '' (= mulai sekarang). */
  startsAt: string;
  /** ISO string atau '' (= tanpa batas). */
  endsAt: string;
  display: AnnouncementDisplay;
  dismissible: boolean;
  popupFrequency: PopupFrequency;
  minReadSeconds: number;
  requireAck: boolean;
}

export const ANNOUNCEMENT_LIMITS = { title: 120, body: 8000, ctaLabel: 40, ctaUrl: 500, minReadSeconds: 120 } as const;

const KINDS: readonly AnnouncementKind[] = ['info', 'update', 'important'];
const DISPLAYS: readonly AnnouncementDisplay[] = ['popup', 'banner', 'both'];
const FREQUENCIES: readonly PopupFrequency[] = ['once', 'every_open'];

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function clampSeconds(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0;
  return Math.min(ANNOUNCEMENT_LIMITS.minReadSeconds, Math.max(0, n));
}

/** Baris DB (snake_case, tak tepercaya) -> Announcement; null bila tidak valid. */
export function parseAnnouncementRow(row: unknown): Announcement | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const title = str(r.title);
  const body = str(r.body);
  const startsAt = str(r.starts_at);
  if (!id || !title || !body || !startsAt) return null;
  const ctaUrl = str(r.cta_url);
  return {
    id,
    title,
    body,
    kind: KINDS.includes(r.kind as AnnouncementKind) ? (r.kind as AnnouncementKind) : 'info',
    ctaLabel: str(r.cta_label),
    ctaUrl: ctaUrl && /^https:\/\//i.test(ctaUrl) ? ctaUrl : null,
    isPublished: r.is_published === true,
    startsAt,
    endsAt: str(r.ends_at),
    createdAt: str(r.created_at) ?? startsAt,
    display: DISPLAYS.includes(r.display as AnnouncementDisplay) ? (r.display as AnnouncementDisplay) : 'both',
    dismissible: r.dismissible !== false,
    popupFrequency: FREQUENCIES.includes(r.popup_frequency as PopupFrequency)
      ? (r.popup_frequency as PopupFrequency)
      : 'once',
    minReadSeconds: clampSeconds(r.min_read_seconds),
    requireAck: r.require_ack === true,
  };
}

/** Aktif = terbit, sudah mulai, belum berakhir. */
export function isAnnouncementActive(a: Announcement, now: Date = new Date()): boolean {
  if (!a.isPublished) return false;
  const t = now.getTime();
  if (Date.parse(a.startsAt) > t) return false;
  if (a.endsAt && Date.parse(a.endsAt) <= t) return false;
  return true;
}

const KIND_RANK: Record<AnnouncementKind, number> = { important: 0, update: 1, info: 2 };

/** Penting dulu, lalu terbaru. */
function byPriority(a: Announcement, b: Announcement): number {
  return KIND_RANK[a.kind] - KIND_RANK[b.kind] || Date.parse(b.startsAt) - Date.parse(a.startsAt);
}

/** Status lokal per perangkat. */
export interface ReaderState {
  /** Sudah dikonfirmasi dibaca (permanen di perangkat). */
  acked: readonly string[];
  /** Pop-up yang ditutup (X) tanpa konfirmasi — untuk frekuensi once tidak muncul lagi. */
  closed: readonly string[];
  /** Kartu dashboard yang disembunyikan pemain (hanya berlaku bila dismissible). */
  hidden: readonly string[];
  /** Pop-up yang sudah tampil di sesi ini (untuk frekuensi every_open). */
  shownThisSession: readonly string[];
}

export const EMPTY_READER_STATE: ReaderState = { acked: [], closed: [], hidden: [], shownThisSession: [] };

/** Pengumuman yang harus tampil sebagai pop-up sekarang, berurutan. */
export function popupQueue(list: Announcement[], s: ReaderState, now: Date = new Date()): Announcement[] {
  const done = new Set([...s.acked, ...s.closed]);
  const shown = new Set(s.shownThisSession);
  return list
    .filter(a => a.display !== 'banner' && isAnnouncementActive(a, now))
    .filter(a => !shown.has(a.id) && (a.popupFrequency === 'every_open' || !done.has(a.id)))
    .sort(byPriority);
}

/** Pengumuman yang tampil sebagai kartu di dashboard. */
export function bannerList(list: Announcement[], s: ReaderState, now: Date = new Date()): Announcement[] {
  const hidden = new Set(s.hidden);
  return list
    .filter(a => a.display !== 'popup' && isAnnouncementActive(a, now))
    .filter(a => !(a.dismissible && hidden.has(a.id)))
    .sort(byPriority);
}

/** Gerbang tombol konfirmasi: hitung mundur baca minimum + centang wajib. */
export function ackGate(
  a: Pick<Announcement, 'minReadSeconds' | 'requireAck'>,
  elapsedSeconds: number,
  checked: boolean,
): { remainingSeconds: number; canConfirm: boolean } {
  const remainingSeconds = Math.max(0, Math.ceil(a.minReadSeconds - elapsedSeconds));
  return { remainingSeconds, canConfirm: remainingSeconds === 0 && (!a.requireAck || checked) };
}

/** Tambah id ke daftar; buang id yang tak lagi aktif agar penyimpanan tidak membengkak. */
export function addId(ids: readonly string[], id: string, activeIds?: readonly string[]): string[] {
  const set = new Set(ids);
  set.add(id);
  let out = [...set];
  if (activeIds) {
    const active = new Set(activeIds);
    out = out.filter(x => active.has(x) || x === id);
  }
  return out.slice(-200);
}

// ---------------------------------------------------------------------------
// Durasi tayang
// ---------------------------------------------------------------------------

export const DURATION_PRESETS: { label: string; hours: number | null }[] = [
  { label: '1 jam', hours: 1 },
  { label: '1 hari', hours: 24 },
  { label: '3 hari', hours: 72 },
  { label: '7 hari', hours: 168 },
  { label: '30 hari', hours: 720 },
  { label: 'Tanpa batas', hours: null },
];

/** ISO waktu berakhir untuk preset durasi, dihitung dari waktu mulai — atau dari sekarang bila mulai sudah lewat/kosong. */
export function endForDuration(startsAt: string, hours: number | null, now: Date = new Date()): string {
  if (hours === null) return '';
  const parsed = startsAt ? Date.parse(startsAt) : NaN;
  const start = Number.isNaN(parsed) ? now.getTime() : Math.max(parsed, now.getTime());
  return new Date(start + hours * 3600_000).toISOString();
}

/** Teks sisa waktu tayang, mis. "berakhir 2 hari lagi". */
export function remainingLabel(endsAt: string | null, now: Date = new Date()): string | null {
  if (!endsAt) return null;
  const ms = Date.parse(endsAt) - now.getTime();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const h = ms / 3600_000;
  if (h < 1) return `berakhir ${Math.max(1, Math.round(ms / 60_000))} menit lagi`;
  if (h < 48) return `berakhir ${Math.round(h)} jam lagi`;
  return `berakhir ${Math.round(h / 24)} hari lagi`;
}

// ---------------------------------------------------------------------------
// Draf admin
// ---------------------------------------------------------------------------

/** Validasi draf admin. Mengembalikan pesan error (bahasa Indonesia) atau null. */
export function validateDraft(d: AnnouncementDraft): string | null {
  const title = d.title.trim();
  const body = d.body.trim();
  if (!title) return 'Judul wajib diisi.';
  if (title.length > ANNOUNCEMENT_LIMITS.title) return `Judul maksimal ${ANNOUNCEMENT_LIMITS.title} karakter.`;
  if (!body) return 'Isi pengumuman wajib diisi.';
  if (body.length > ANNOUNCEMENT_LIMITS.body) return `Isi maksimal ${ANNOUNCEMENT_LIMITS.body} karakter.`;
  const label = d.ctaLabel.trim();
  const url = d.ctaUrl.trim();
  if (label && !url) return 'Isi URL tombol, atau kosongkan label tombol.';
  if (url && !label) return 'Isi label tombol, atau kosongkan URL tombol.';
  if (label.length > ANNOUNCEMENT_LIMITS.ctaLabel) return `Label tombol maksimal ${ANNOUNCEMENT_LIMITS.ctaLabel} karakter.`;
  if (url && !/^https:\/\/\S+$/i.test(url)) return 'URL tombol harus diawali https://';
  if (url.length > ANNOUNCEMENT_LIMITS.ctaUrl) return 'URL tombol terlalu panjang.';
  if (d.startsAt && Number.isNaN(Date.parse(d.startsAt))) return 'Waktu mulai tidak valid.';
  if (d.endsAt) {
    const end = Date.parse(d.endsAt);
    if (Number.isNaN(end)) return 'Waktu berakhir tidak valid.';
    const start = d.startsAt ? Date.parse(d.startsAt) : Date.now();
    if (end <= start) return 'Waktu berakhir harus setelah waktu mulai.';
  }
  if (!Number.isInteger(d.minReadSeconds) || d.minReadSeconds < 0 || d.minReadSeconds > ANNOUNCEMENT_LIMITS.minReadSeconds) {
    return `Waktu baca minimum 0–${ANNOUNCEMENT_LIMITS.minReadSeconds} detik.`;
  }
  if (!d.dismissible && d.display !== 'popup' && !d.endsAt) {
    return 'Kartu dashboard yang tidak bisa ditutup wajib punya waktu berakhir (pilih durasi).';
  }
  return null;
}

/** Draf -> payload insert/update Supabase. */
export function draftToRow(d: AnnouncementDraft, publish: boolean): Record<string, unknown> {
  const label = d.ctaLabel.trim();
  const url = d.ctaUrl.trim();
  return {
    title: d.title.trim(),
    body: d.body.trim(),
    kind: d.kind,
    cta_label: label && url ? label : null,
    cta_url: label && url ? url : null,
    is_published: publish,
    starts_at: d.startsAt ? new Date(d.startsAt).toISOString() : new Date().toISOString(),
    ends_at: d.endsAt ? new Date(d.endsAt).toISOString() : null,
    display: d.display,
    dismissible: d.dismissible,
    popup_frequency: d.popupFrequency,
    min_read_seconds: d.minReadSeconds,
    require_ack: d.requireAck,
  };
}

export function announcementToDraft(a: Announcement): AnnouncementDraft {
  return {
    title: a.title,
    body: a.body,
    kind: a.kind,
    ctaLabel: a.ctaLabel ?? '',
    ctaUrl: a.ctaUrl ?? '',
    startsAt: a.startsAt,
    endsAt: a.endsAt ?? '',
    display: a.display,
    dismissible: a.dismissible,
    popupFrequency: a.popupFrequency,
    minReadSeconds: a.minReadSeconds,
    requireAck: a.requireAck,
  };
}

export const EMPTY_DRAFT: AnnouncementDraft = {
  title: '',
  body: '',
  kind: 'update',
  ctaLabel: '',
  ctaUrl: '',
  startsAt: '',
  endsAt: '',
  display: 'both',
  dismissible: true,
  popupFrequency: 'once',
  minReadSeconds: 0,
  requireAck: false,
};

// ---------------------------------------------------------------------------
// Format isi: Markdown ringan, dirender sebagai elemen React (tanpa HTML mentah -> aman dari XSS).
//   "# / ## / ### judul"  -> heading
//   "- teks" / "* teks"   -> butir
//   "> teks"              -> kutipan
//   "---"                 -> garis pemisah
//   **tebal** dan *miring* di dalam baris
// ---------------------------------------------------------------------------

export type InlineSpan = { text: string; bold?: boolean; italic?: boolean };

export type BodyBlock =
  | { type: 'heading'; spans: InlineSpan[] }
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'bullet'; spans: InlineSpan[] }
  | { type: 'quote'; spans: InlineSpan[] }
  | { type: 'divider' };

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) spans.push({ text: m[1], bold: true });
    else spans.push({ text: m[2], italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.length ? spans : [{ text: '' }];
}

export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ type: 'paragraph', spans: parseInline(para.join('\n')) });
      para = [];
    }
  };
  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const t = raw.trim();
    if (!t) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); blocks.push({ type: 'divider' }); continue; }
    if ((m = t.match(/^#{1,6}\s+(.*)$/))) { flush(); blocks.push({ type: 'heading', spans: parseInline(m[1]) }); continue; }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) { flush(); blocks.push({ type: 'bullet', spans: parseInline(m[1]) }); continue; }
    if ((m = t.match(/^>\s?(.*)$/))) { flush(); blocks.push({ type: 'quote', spans: parseInline(m[1]) }); continue; }
    para.push(t);
  }
  flush();
  return blocks;
}

/** Cuplikan satu baris untuk kartu dashboard (tanpa sintaks Markdown). */
export function bodyExcerpt(body: string, max = 110): string {
  const plain = body
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^(-{3,}|\*{3,}|_{3,})$/.test(l) && !/^#{1,6}\s/.test(l))
    .map(l => l.replace(/^[-*•>]\s?/, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}
