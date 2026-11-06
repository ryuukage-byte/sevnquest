/**
 * Logika murni pengumuman broadcast admin (tanpa Supabase / DOM) — bisa diuji dengan tsx --test.
 */

export type AnnouncementKind = 'info' | 'update' | 'important';

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
}

export const ANNOUNCEMENT_LIMITS = { title: 120, body: 8000, ctaLabel: 40, ctaUrl: 500 } as const;

const KINDS: readonly AnnouncementKind[] = ['info', 'update', 'important'];

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
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
  const kind = KINDS.includes(r.kind as AnnouncementKind) ? (r.kind as AnnouncementKind) : 'info';
  const ctaUrl = str(r.cta_url);
  return {
    id,
    title,
    body,
    kind,
    ctaLabel: str(r.cta_label),
    ctaUrl: ctaUrl && /^https:\/\//i.test(ctaUrl) ? ctaUrl : null,
    isPublished: r.is_published === true,
    startsAt,
    endsAt: str(r.ends_at),
    createdAt: str(r.created_at) ?? startsAt,
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

/** Pengumuman aktif yang belum dibaca, terbaru dulu. */
export function pickUnseen(list: Announcement[], seenIds: readonly string[], now: Date = new Date()): Announcement[] {
  const seen = new Set(seenIds);
  return list
    .filter(a => isAnnouncementActive(a, now) && !seen.has(a.id))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
}

/** Gabungkan id yang sudah dibaca; buang id yang tak lagi aktif agar penyimpanan tidak membengkak. */
export function mergeSeen(seenIds: readonly string[], newlySeen: string, activeIds?: readonly string[]): string[] {
  const set = new Set(seenIds);
  set.add(newlySeen);
  let out = [...set];
  if (activeIds) {
    const active = new Set(activeIds);
    out = out.filter(id => active.has(id) || id === newlySeen);
  }
  return out.slice(-200);
}

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
  };
}

export const EMPTY_DRAFT: AnnouncementDraft = {
  title: '', body: '', kind: 'update', ctaLabel: '', ctaUrl: '', startsAt: '', endsAt: '',
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
    const line = raw.trimEnd();
    const t = line.trim();
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
