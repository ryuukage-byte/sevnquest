/**
 * Toko Pack & Pack Pass: tipe dan parser respons RPC (murni, tanpa I/O).
 * RPC ada di supabase/migrations/20261127_store_packs.sql; spesifikasi di docs/prd/PRD_TOKO_PACK.md.
 */
import type { OfficialBook, OfficialChapter } from '../types/books';
import type { DeckItemCategory, DeckItemRef } from '../types/rpg';

export interface PassState {
  balance: number;
  /** Kapan pass jatah berikutnya masuk (drip tahunan/Lifetime); null bila tidak ada drip berjalan. */
  nextGrantAt: string | null;
  nextGrantAmount: number;
  /** Boleh membeli pass tambahan (akses Full aktif). */
  canBuy: boolean;
  priceIdr: number;
  maxPerOrder: number;
}

export interface PackChapterSummary {
  id: string;
  title: string;
  count: number;
}

export interface StorePack {
  id: string;
  title: string;
  level: string;
  description: string;
  coverIcon: string;
  pricePasses: number;
  itemCount: number;
  chapters: PackChapterSummary[];
  /** Id ujian sumber, mis. n3_2024_12. */
  sources: string[];
  /** Kartu pratinjau gratis. */
  preview: DeckItemRef[];
  status: 'draft' | 'published' | 'retired';
  contentVersion: number;
  owned: boolean;
  unlockedAt: string | null;
}

export interface StoreCatalog {
  packs: StorePack[];
  pass: PassState;
}

export interface PackContents {
  packId: string;
  contentVersion: number;
  book: OfficialBook;
}

export interface OwnedPackRef {
  packId: string;
  unlockedAt: string | null;
  contentVersion: number;
}

export const DEFAULT_PASS_STATE: PassState = {
  balance: 0,
  nextGrantAt: null,
  nextGrantAmount: 0,
  canBuy: false,
  priceIdr: 7000,
  maxPerOrder: 20,
};

/** Pilihan jumlah di layar Tambah Pass. */
export const PASS_QUANTITY_OPTIONS = [1, 3, 5, 10] as const;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const int = (v: unknown, fallback = 0, max = 1e9): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.trunc(n)) : fallback;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const CATEGORIES = new Set<DeckItemCategory>(['kotoba', 'kanji', 'bunpou']);

export function parseItemRef(v: unknown): DeckItemRef | null {
  const r = obj(v);
  const id = str(r.id);
  const category = r.category as DeckItemCategory;
  if (!id || !CATEGORIES.has(category)) return null;
  return {
    id,
    category,
    addedAt: str(r.addedAt, '1970-01-01T00:00:00.000Z'),
    ...(typeof r.notes === 'string' && r.notes ? { notes: r.notes } : {}),
  };
}

const items = (v: unknown): DeckItemRef[] => arr(v).map(parseItemRef).filter((x): x is DeckItemRef => x !== null);

export function parsePassState(raw: unknown): PassState {
  const r = obj(raw);
  const d = DEFAULT_PASS_STATE;
  return {
    balance: int(r.balance),
    nextGrantAt: strOrNull(r.next_grant_at),
    nextGrantAmount: int(r.next_grant_amount),
    canBuy: r.can_buy === true,
    priceIdr: int(r.price_idr, d.priceIdr) || d.priceIdr,
    maxPerOrder: int(r.max_per_order, d.maxPerOrder, 100) || d.maxPerOrder,
  };
}

const STATUSES = new Set(['draft', 'published', 'retired']);

export function parseStorePack(raw: unknown): StorePack | null {
  const r = obj(raw);
  const id = str(r.id);
  if (!id) return null;
  return {
    id,
    title: str(r.title, id),
    level: str(r.level),
    description: str(r.description),
    coverIcon: str(r.cover_icon, 'package'),
    pricePasses: Math.max(1, int(r.price_passes, 1, 20)),
    itemCount: int(r.item_count),
    chapters: arr(r.chapter_summary).map(c => {
      const o = obj(c);
      return { id: str(o.id), title: str(o.title), count: int(o.count) };
    }),
    sources: arr(r.sources).filter((s): s is string => typeof s === 'string'),
    preview: items(r.preview),
    status: (STATUSES.has(str(r.status)) ? r.status : 'published') as StorePack['status'],
    contentVersion: int(r.content_version),
    owned: r.owned === true,
    unlockedAt: strOrNull(r.unlocked_at),
  };
}

export function parseStoreCatalog(raw: unknown): StoreCatalog {
  const r = obj(raw);
  return {
    packs: arr(r.packs).map(parseStorePack).filter((p): p is StorePack => p !== null),
    pass: parsePassState(r.pass),
  };
}

const BOOK_LEVELS = new Set<OfficialBook['level']>(['KANA', 'N5', 'N4', 'N3', 'N2', 'N1', 'Kaigo', 'TEMATIK']);

/** Isi pack (OfficialBook) dari server. Bab tanpa item dibuang; hasil null bila tidak ada bab yang valid. */
export function parsePackBook(raw: unknown, packId: string): OfficialBook | null {
  const r = obj(raw);
  const theme = obj(r.colorTheme);
  const chapters: OfficialChapter[] = arr(r.chapters)
    .map((c, i) => {
      const o = obj(c);
      return {
        id: str(o.id, `${packId}_ch${i + 1}`),
        bookId: packId,
        chapterNumber: int(o.chapterNumber, i + 1) || i + 1,
        titleJp: str(o.titleJp),
        titleId: str(o.titleId, `Bab ${i + 1}`),
        ...(typeof o.subtitle === 'string' ? { subtitle: o.subtitle } : {}),
        ...(typeof o.description === 'string' ? { description: o.description } : {}),
        ...(typeof o.coverIcon === 'string' ? { coverIcon: o.coverIcon } : {}),
        items: items(o.items),
      };
    })
    .filter(ch => ch.items.length > 0);
  if (chapters.length === 0) return null;
  const level = str(r.level) as OfficialBook['level'];
  return {
    id: packId,
    title: str(r.title, packId),
    japaneseTitle: str(r.japaneseTitle),
    subtitle: str(r.subtitle),
    description: str(r.description),
    level: BOOK_LEVELS.has(level) ? level : 'TEMATIK',
    category: 'thematic',
    coverIcon: str(r.coverIcon, '速'),
    colorTheme: {
      accentColor: str(theme.accentColor, 'text-gold'),
      badgeBg: str(theme.badgeBg, 'bg-gold/15 text-gold border-gold/30'),
      borderAccent: str(theme.borderAccent, 'border-gold/40 hover:border-gold'),
      cardBg: str(theme.cardBg, 'bg-surface-card'),
    },
    chapters,
  };
}

export function parsePackContents(raw: unknown): PackContents | null {
  const r = obj(raw);
  const packId = str(r.pack_id);
  if (!packId) return null;
  const book = parsePackBook(r.book, packId);
  if (!book) return null;
  return { packId, contentVersion: int(r.content_version), book };
}

export function parseOwnedPacks(raw: unknown): OwnedPackRef[] {
  return arr(raw)
    .map(v => {
      const o = obj(v);
      const packId = str(o.pack_id);
      return packId ? { packId, unlockedAt: strOrNull(o.unlocked_at), contentVersion: int(o.content_version) } : null;
    })
    .filter((x): x is OwnedPackRef => x !== null);
}

/** Pack milik user yang isinya perlu diunduh ulang (belum ada di cache atau versi cache lebih lama). */
export function packsNeedingSync(owned: OwnedPackRef[], cached: Record<string, { contentVersion: number } | undefined>): string[] {
  return owned.filter(p => !cached[p.packId] || cached[p.packId]!.contentVersion < p.contentVersion).map(p => p.packId);
}

export type UnlockBlock = 'owned' | 'unavailable' | 'insufficient' | null;

/** Alasan tombol Buka tidak aktif (tampilan saja; server tetap memeriksa). */
export function unlockBlock(pack: StorePack, pass: PassState): UnlockBlock {
  if (pack.owned) return 'owned';
  if (pack.status !== 'published') return 'unavailable';
  if (pass.balance < pack.pricePasses) return 'insufficient';
  return null;
}

export function passShortfall(pack: StorePack, pass: PassState): number {
  return Math.max(0, pack.pricePasses - pass.balance);
}

/** Nominal dasar pesanan pass (sebelum kode unik). Null bila jumlah tidak valid. */
export function passOrderAmount(quantity: number, pass: Pick<PassState, 'priceIdr' | 'maxPerOrder'> = DEFAULT_PASS_STATE): number | null {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > pass.maxPerOrder) return null;
  return quantity * pass.priceIdr;
}

/** n3_2024_12 → "Des 2024" */
export function examSourceLabel(examId: string): string {
  const m = examId.match(/_(\d{4})_(\d{2})$/);
  if (!m) return examId;
  return `${m[2] === '07' ? 'Jul' : m[2] === '12' ? 'Des' : m[2]} ${m[1]}`;
}

/** Pesan Indonesia untuk kode error RPC Toko. */
export function storeErrorMessage(err: unknown): string {
  const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err ?? '');
  if (/already_owned/.test(msg)) return 'Pack ini sudah kamu miliki.';
  if (/insufficient_passes/.test(msg)) return 'Pass kamu belum cukup untuk membuka pack ini.';
  if (/pack_not_available|pack_not_found/.test(msg)) return 'Pack ini sedang tidak tersedia.';
  if (/not_owned/.test(msg)) return 'Buka pack ini dulu untuk melihat isinya.';
  if (/not_full/.test(msg)) return 'Pass tambahan hanya untuk pengguna Full yang masih aktif.';
  if (/pass_gift_not_supported/.test(msg)) return 'Pass belum bisa dihadiahkan.';
  if (/invalid_amount/.test(msg)) return 'Jumlah pass tidak valid.';
  if (/too_many_pending/.test(msg)) return 'Masih ada 3 pesanan belum dibayar. Bayar atau batalkan salah satunya dulu.';
  if (/not_authenticated|JWT/.test(msg)) return 'Sesi login habis. Silakan masuk lagi.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Toko butuh koneksi internet. Pack yang sudah kamu miliki tetap bisa dilatih.';
  return 'Terjadi kesalahan. Coba lagi sebentar lagi.';
}
