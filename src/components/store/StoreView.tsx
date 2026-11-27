/**
 * Toko Pack (Buku Saku → tab Toko). Spesifikasi: docs/prd/PRD_TOKO_PACK.md bagian 4.
 * Gaya Washi & Sashiko: permukaan polos token, serat washi + jahitan, tanpa gradient dan tanpa ikon sparkle.
 */
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, BookOpen, CalendarClock, Check, Lock, Package, Play, Plus, RefreshCw, Ticket, WifiOff, Zap,
} from 'lucide-react';
import type { OfficialBook } from '../../types/books';
import type { StoreState } from '../../state/store';
import {
  examSourceLabel, passShortfall, unlockBlock, type PassState, type StorePack,
} from '../../lib/storeCore';
import { resolveDeckItem } from '../../utils/decks';
import { playSound } from '../../utils/audio';
import { UnlockPackDialog } from './UnlockPackDialog';

interface StoreViewProps {
  store: StoreState;
  /** Pengguna Full aktif: boleh membeli pass tambahan. */
  canBuyPasses: boolean;
  onOpenOwned: (book: OfficialBook) => void;
  onPreview: (pack: StorePack) => void;
  onBuyPasses: () => void;
  onUpgrade: () => void;
  soundEnabled?: boolean;
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Wadah washi berjahit (pola yang sama dengan Kotak Pos). */
const Washi: React.FC<{ children: React.ReactNode; className?: string; tone?: 'gold' | 'plain' }> = ({ children, className = '', tone = 'plain' }) => (
  <div className={`relative rounded-3xl border bg-surface-card overflow-hidden ${tone === 'gold' ? 'border-gold/50' : 'border-border-subtle'} ${className}`}>
    <div className="skeuo-grain" />
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-1.5 rounded-[20px] border border-dashed ${tone === 'gold' ? 'border-gold/35' : 'border-[color:var(--thread)]'}`}
    />
    <div className="relative z-[2]">{children}</div>
  </div>
);

const PassBadge: React.FC<{ count: number; className?: string }> = ({ count, className = '' }) => (
  <span className={`rpg-badge-reward inline-flex items-center gap-1 ${className}`}>
    <Ticket className="w-3.5 h-3.5" /> {count} pass
  </span>
);

const PassHeader: React.FC<{
  pass: PassState | null;
  canBuy: boolean;
  onBuy: () => void;
  onUpgrade: () => void;
  soundEnabled: boolean;
}> = ({ pass, canBuy, onBuy, onUpgrade, soundEnabled }) => {
  const next = fmtDate(pass?.nextGrantAt ?? null);
  return (
    <Washi tone="gold">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Toko Pack</span>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide flex items-center gap-2.5">
            <span className="text-gold font-jp">店</span>
            <span>Pack Kurasi</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary">
            Flashcard yang disusun dari soal ujian JLPT resmi. Pack yang sudah dibuka menjadi milikmu selamanya.
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-2xl bg-surface-inset border border-gold/40 flex items-center justify-center text-gold">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Saldo pass</div>
              <div className="text-2xl font-black font-heading text-text-primary leading-none">{pass ? pass.balance : '-'}</div>
            </div>
          </div>
          {next && pass && pass.nextGrantAmount > 0 && (
            <span className="text-[11px] text-text-secondary flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-gold" /> {pass.nextGrantAmount} pass berikutnya: {next}
            </span>
          )}
          {canBuy ? (
            <button
              type="button"
              onClick={() => { playSound('click', soundEnabled); onBuy(); }}
              className="btn btn-pill text-xs gap-1.5 text-gold"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah pass
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { playSound('click', soundEnabled); onUpgrade(); }}
              className="btn btn-pill text-xs gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Pass didapat dari donasi
            </button>
          )}
        </div>
      </div>
    </Washi>
  );
};

const PackCard: React.FC<{ pack: StorePack; pass: PassState; onOpen: () => void }> = ({ pack, pass, onOpen }) => {
  const block = unlockBlock(pack, pass);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="skeuo-card text-left w-full rounded-3xl p-4 sm:p-5 relative overflow-hidden flex gap-4 items-start"
    >
      <div className="skeuo-grain" />
      <div className="relative z-[2] w-14 h-16 rounded-2xl bg-surface-inset border border-border-subtle flex flex-col items-center justify-center shrink-0">
        <Zap className="w-5 h-5 text-gold" />
        <span className="text-[9px] font-mono text-text-muted mt-1 uppercase">{pack.level}</span>
      </div>
      <div className="relative z-[2] flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-black text-text-primary text-base leading-tight">{pack.title}</h3>
          {pack.owned ? (
            <span className="rpg-badge-status inline-flex items-center gap-1 shrink-0"><Check className="w-3 h-3" /> Dimiliki</span>
          ) : (
            <PassBadge count={pack.pricePasses} className="shrink-0" />
          )}
        </div>
        <p className="text-xs text-text-secondary line-clamp-2">{pack.description}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-text-muted">
          <span className="ui-chip">{pack.itemCount} kata</span>
          {pack.sources.length > 0 && <span className="ui-chip">{pack.sources.length} ujian resmi</span>}
          {pack.status === 'draft' && <span className="ui-chip text-rose-400">Draft (admin)</span>}
          {pack.status === 'retired' && <span className="ui-chip">Tidak dijual lagi</span>}
        </div>
        {!pack.owned && block === 'insufficient' && (
          <p className="text-[11px] text-text-muted">Kurang {passShortfall(pack, pass)} pass</p>
        )}
      </div>
    </button>
  );
};

const PackDetail: React.FC<{
  pack: StorePack;
  pass: PassState;
  canBuy: boolean;
  onBack: () => void;
  onUnlock: () => void;
  onOpenOwned: () => void;
  onPreview: () => void;
  onBuy: () => void;
  onUpgrade: () => void;
  soundEnabled: boolean;
}> = ({ pack, pass, canBuy, onBack, onUnlock, onOpenOwned, onPreview, onBuy, onUpgrade, soundEnabled }) => {
  const block = unlockBlock(pack, pass);
  const preview = useMemo(
    () => pack.preview.map(ref => ({ ref, item: resolveDeckItem(ref) })).filter(x => x.item),
    [pack.preview],
  );
  const click = (fn: () => void) => () => { playSound('click', soundEnabled); fn(); };

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      <button
        type="button"
        onClick={click(onBack)}
        className="flex items-center gap-2 text-xs sm:text-sm font-heading font-bold text-text-muted hover:text-text-primary transition-colors p-2 rounded-xl hover:bg-surface-inset"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Toko
      </button>

      <Washi tone="gold">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-20 rounded-2xl bg-surface-inset border border-border-subtle flex flex-col items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-gold" />
              <span className="text-[9px] font-mono text-text-muted mt-1 uppercase">{pack.level}</span>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rpg-badge">{pack.level}</span>
                {pack.owned ? (
                  <span className="rpg-badge-status inline-flex items-center gap-1"><Check className="w-3 h-3" /> Dimiliki</span>
                ) : (
                  <PassBadge count={pack.pricePasses} />
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">{pack.title}</h1>
              <p className="text-xs sm:text-sm text-text-secondary">{pack.description}</p>
            </div>
          </div>

          {pack.chapters.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {pack.chapters.map(ch => (
                <div key={ch.id} className="rounded-2xl border border-dashed border-[color:var(--thread)] bg-surface-inset px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{ch.title}</div>
                  <div className="font-heading font-black text-text-primary">{ch.count} kata</div>
                </div>
              ))}
            </div>
          )}

          {pack.sources.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Sumber: ujian JLPT resmi</div>
              <div className="flex flex-wrap gap-1.5">
                {pack.sources.map(s => <span key={s} className="ui-chip text-[10px] font-mono">{examSourceLabel(s)}</span>)}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {pack.owned ? (
              <button type="button" onClick={click(onOpenOwned)} className="btn-cta px-5 py-3 text-sm font-heading font-black flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4" /> Buka di Buku Saku
              </button>
            ) : block === null ? (
              <button type="button" onClick={click(onUnlock)} className="btn-cta px-5 py-3 text-sm font-heading font-black flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4" /> Buka dengan {pack.pricePasses} pass
              </button>
            ) : block === 'insufficient' ? (
              <button
                type="button"
                onClick={click(canBuy ? onBuy : onUpgrade)}
                className="btn-physical-primary px-5 py-3 rounded-2xl text-sm font-heading font-black flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {canBuy ? `Kurang ${passShortfall(pack, pass)} pass · Tambah pass` : 'Dapatkan pass lewat donasi'}
              </button>
            ) : (
              <span className="text-xs text-text-muted">Pack ini sedang tidak dijual.</span>
            )}
            {!pack.owned && preview.length > 0 && (
              <button type="button" onClick={click(onPreview)} className="btn-physical-secondary px-5 py-3 rounded-2xl text-sm font-heading font-bold flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Coba {preview.length} kartu gratis
              </button>
            )}
          </div>
        </div>
      </Washi>

      {preview.length > 0 && (
        <Washi>
          <div className="p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-bold text-text-primary font-heading flex items-center gap-2">
              <Package className="w-4 h-4 text-gold" /> Pratinjau: {preview.length} kata teratas
            </h2>
            <ul className="divide-y divide-border-subtle">
              {preview.map(({ ref, item }) => (
                <li key={`${ref.category}_${ref.id}`} className="py-2.5 flex items-start gap-3">
                  <span className="font-jp font-bold text-text-primary text-base min-w-[4.5rem]">{item!.displayTitle}</span>
                  <span className="flex-1 min-w-0">
                    {item!.displayReading && <span className="block text-[11px] text-text-muted font-jp">{item!.displayReading}</span>}
                    <span className="block text-xs text-text-secondary">{item!.displayMeaning}</span>
                    {ref.notes && <span className="block text-[10px] text-text-muted mt-0.5">{ref.notes}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Washi>
      )}
    </div>
  );
};

export const StoreView: React.FC<StoreViewProps> = ({
  store, canBuyPasses, onOpenOwned, onPreview, onBuyPasses, onUpgrade, soundEnabled = true,
}) => {
  const { catalog, loading, error, ownedBooks, refresh, unlock } = store;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<StorePack | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const pass = catalog?.pass ?? null;
  const packs = catalog?.packs ?? [];
  const selected = packs.find(p => p.id === selectedId) ?? null;
  const forSale = packs.filter(p => !p.owned);

  const openOwnedById = (packId: string) => {
    const book = ownedBooks.find(b => b.id === packId);
    if (book) onOpenOwned(book);
    else void refresh();
  };

  const doUnlock = async () => {
    if (!confirming) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const book = await unlock(confirming.id);
      playSound('levelup', soundEnabled);
      setConfirming(null);
      setSelectedId(null);
      onOpenOwned(book);
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : String(err));
      playSound('wrong', soundEnabled);
    } finally {
      setUnlocking(false);
    }
  };

  const dialog = confirming && pass && (
    <UnlockPackDialog
      pack={confirming}
      balance={pass.balance}
      busy={unlocking}
      error={unlockError}
      soundEnabled={soundEnabled}
      onConfirm={() => void doUnlock()}
      onClose={() => { if (!unlocking) { setConfirming(null); setUnlockError(null); } }}
    />
  );

  if (selected && pass) {
    return (
      <>
        <PackDetail
          pack={selected}
          pass={pass}
          canBuy={canBuyPasses}
          onBack={() => setSelectedId(null)}
          onUnlock={() => { setUnlockError(null); setConfirming(selected); }}
          onOpenOwned={() => openOwnedById(selected.id)}
          onPreview={() => onPreview(selected)}
          onBuy={onBuyPasses}
          onUpgrade={onUpgrade}
          soundEnabled={soundEnabled}
        />
        {dialog}
      </>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <PassHeader pass={pass} canBuy={canBuyPasses} onBuy={onBuyPasses} onUpgrade={onUpgrade} soundEnabled={soundEnabled} />

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl border border-border-subtle bg-surface-inset text-xs text-text-secondary">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <p className="flex-1">{error}</p>
          <button type="button" onClick={() => void refresh()} className="btn btn-pill text-[11px] gap-1 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        </div>
      )}

      {ownedBooks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-text-primary font-heading flex items-center gap-2 px-1">
            <BookOpen className="w-4 h-4 text-gold" /> Pack Saya ({ownedBooks.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ownedBooks.map(book => (
              <button
                key={book.id}
                type="button"
                onClick={() => { playSound('click', soundEnabled); onOpenOwned(book); }}
                className="skeuo-card text-left w-full rounded-3xl p-4 relative overflow-hidden flex items-center gap-3"
              >
                <div className="skeuo-grain" />
                <div className="relative z-[2] w-11 h-12 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-gold" />
                </div>
                <div className="relative z-[2] flex-1 min-w-0">
                  <div className="font-heading font-black text-text-primary truncate">{book.title}</div>
                  <div className="text-[11px] text-text-muted">
                    {book.chapters.length} bab · {book.chapters.reduce((n, c) => n + c.items.length, 0)} kata
                  </div>
                </div>
                <span className="relative z-[2] rpg-badge-status inline-flex items-center gap-1 shrink-0"><Check className="w-3 h-3" /> Milikmu</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold text-text-primary font-heading flex items-center gap-2 px-1">
          <Package className="w-4 h-4 text-gold" /> Katalog
        </h2>
        {loading && !catalog ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-busy="true">
            {[0, 1, 2].map(i => <div key={i} className="h-28 rounded-3xl border border-border-subtle bg-surface-inset animate-pulse" />)}
          </div>
        ) : forSale.length === 0 && catalog ? (
          <p className="text-xs text-text-muted px-1">
            {packs.length > 0 ? 'Semua pack sudah kamu miliki. Pack baru akan muncul di sini.' : 'Belum ada pack yang dijual. Nantikan pack pertama.'}
          </p>
        ) : (
          pass && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {forSale.map(p => (
                <PackCard key={p.id} pack={p} pass={pass} onOpen={() => { playSound('click', soundEnabled); setSelectedId(p.id); }} />
              ))}
            </div>
          )
        )}
      </section>

      <Washi>
        <div className="p-4 text-[11px] text-text-secondary space-y-1">
          <p className="font-bold text-text-primary text-xs">Cara mendapat pass</p>
          <p>Donasi bulanan (Tingkat 1): 3 pass setiap bulan. Paket Tahunan: 3 pass setiap 30 hari, total 36. Setoran Lifetime: 3 pass per setoran.</p>
          <p>Pengguna Full bisa menambah pass satuan. Pass tidak pernah hangus.</p>
        </div>
      </Washi>
      {dialog}
    </div>
  );
};
