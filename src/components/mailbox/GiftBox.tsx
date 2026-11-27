import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Gift, Check, Crown, Mail, Send, FileText, ListOrdered, CalendarDays, Infinity as InfinityIcon, Trophy, KeyRound, Copy,
  Lightbulb, PenLine, Award, Ticket, Store,
} from 'lucide-react';
import type { LetterGift } from '../../lib/mailCore';
import { BADGES, FULL_FEATURES, formatIdr, monthTierFeatures } from '../../utils/access';

const KIND_LABEL: Record<LetterGift['kind'], string> = {
  monthly: 'Donasi Bulanan',
  yearly: 'Paket Tahunan',
  lifetime: 'Setoran Lifetime',
  gift_key: 'Key Hadiah',
  pass: 'Pack Pass',
};

/** Wadah washi berjahit sashiko (aturan gaya: tanpa gradient, ada serat & jahitan). */
const Washi: React.FC<{ children: React.ReactNode; edge?: string; stitch?: string; className?: string }> = ({
  children, edge = 'border-border-subtle', stitch = 'border-[color:var(--thread)]', className = '',
}) => (
  <div className={`relative rounded-2xl border bg-surface-inset overflow-hidden ${edge} ${className}`}>
    <div className="skeuo-grain" />
    <span aria-hidden className={`pointer-events-none absolute inset-1.5 rounded-[14px] border border-dashed ${stitch}`} />
    <div className="relative z-[2] p-4">{children}</div>
  </div>
);

// --------------------------- Kotak tertutup ---------------------------

/** Kotak hadiah yang belum dibuka. Ketuk "Buka" -> tutup kotak terangkat, lalu onOpened dipanggil. */
export const GiftBoxClosed: React.FC<{ gift: LetterGift; subject: string; onOpen: () => void }> = ({ gift, subject, onOpen }) => {
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (opening) return;
    setOpening(true);
    window.setTimeout(onOpen, 650);
  };
  return (
    <Washi edge="border-gold/60" stitch="border-gold/40">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Kiriman dari Kantor Pos Pusat</p>
        <button type="button" onClick={open} className="relative w-36 h-32 focus:outline-none" aria-label="Buka kotak hadiah">
          {/* Badan kotak */}
          <span className="absolute left-3 right-3 bottom-0 h-20 rounded-b-xl border border-gold/60 bg-surface-card shadow-md overflow-hidden">
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 bg-wine-accent" />
            <span aria-hidden className="absolute inset-1 rounded-b-lg border border-dashed border-gold/40" />
          </span>
          {/* Tutup kotak */}
          <motion.span
            className="absolute left-1 right-1 top-7 h-8 rounded-lg border border-gold/60 bg-surface-elevated shadow-md"
            animate={opening ? { y: -36, rotate: -14, opacity: 0 } : { y: [0, -3, 0] }}
            transition={opening ? { duration: 0.55, ease: 'easeOut' } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-5 bg-wine-accent" />
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-0.5">
              <span className="w-5 h-4 rounded-full border-4 border-wine-accent -rotate-12" />
              <span className="w-5 h-4 rounded-full border-4 border-wine-accent rotate-12" />
            </span>
          </motion.span>
        </button>
        <div className="space-y-1">
          <h3 className="font-heading font-black text-text-primary">{subject}</h3>
          <p className="text-xs text-text-secondary">
            {KIND_LABEL[gift.kind]} · {formatIdr(gift.amount)}
          </p>
        </div>
        <button type="button" onClick={open} disabled={opening} className="btn-cta px-5 py-2.5 text-xs font-heading font-black flex items-center gap-2">
          <Gift className="w-4 h-4" /> {opening ? 'Membuka...' : 'Buka kotak hadiah'}
        </button>
      </div>
    </Washi>
  );
};

// --------------------------- Isi kotak ---------------------------

function Perk({ Icon, label, value }: { Icon: React.FC<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 px-2.5 py-2 rounded-xl border border-border-subtle bg-surface-card">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold" />
      <span className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between gap-x-2 text-[11px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-text-primary text-right">{value}</span>
      </span>
    </li>
  );
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Isi kotak hadiah: fitur yang didapat, key (bila hadiah), dan ajakan request fitur. */
export const GiftContents: React.FC<{ gift: LetterGift; onRequestFeature: () => void }> = ({ gift, onRequestFeature }) => {
  const [copied, setCopied] = useState(false);
  const badge = BADGES.find(b => b.level === gift.badgeLevel) ?? null;
  const until = gift.isLifetime ? 'selamanya' : fmtDate(gift.accessExpiresAt);
  const tier = gift.monthTier > 0 ? monthTierFeatures(gift.monthTier) : null;

  const copyKey = async () => {
    if (!gift.key) return;
    try {
      await navigator.clipboard.writeText(gift.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard diblokir */
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-3">
      <Washi edge="border-gold/60" stitch="border-gold/40">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-black text-text-primary text-sm flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-gold" /> Isi kotak hadiah
            </h3>
            <span className="rpg-badge-reward">{KIND_LABEL[gift.kind]}</span>
          </div>

          {gift.kind === 'gift_key' && gift.key && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-text-secondary">Berikan key ini kepada penerima. Ditukar di Pengaturan, menu Tukar Key.</p>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-gold/50 bg-surface-card">
                <KeyRound className="w-4 h-4 text-gold shrink-0" />
                <code className="flex-1 min-w-0 font-mono font-black text-sm text-text-primary tracking-wider truncate">{gift.key}</code>
                <button type="button" onClick={() => void copyKey()} className="btn btn-pill text-[11px] gap-1 shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
          )}

          {gift.kind === 'pass' && (
            <ul className="grid gap-1.5">
              <Perk Icon={Ticket} label="Pass masuk" value={`${gift.passes} pass`} />
              <Perk Icon={Ticket} label="Saldo pass" value={`${gift.passBalance} pass`} />
              <Perk Icon={Store} label="Dipakai di" value="Buku Saku, tab Toko" />
            </ul>
          )}

          {gift.kind !== 'gift_key' && gift.kind !== 'pass' && (
            <ul className="grid gap-1.5">
              <Perk Icon={Crown} label="Akses" value={until ? `Full sampai ${until}` : 'Full'} />
              {gift.kind === 'monthly' && tier && (
                <>
                  <Perk Icon={ListOrdered} label="Tingkat bulan ini" value={`Tingkat ${tier.tier}`} />
                  <Perk Icon={Mail} label="Surat ke admin" value={`${tier.mailPerDay} surat/hari`} />
                  <Perk Icon={Send} label="Layanan pos" value={tier.postService} />
                  <Perk Icon={FileText} label="Kertas surat" value={`${tier.paperCount} kertas${tier.newPaper ? ` · ${tier.newPaper}` : ''}`} />
                  <Perk Icon={Lightbulb} label="Request konten" value={tier.requestPriority} />
                </>
              )}
              {gift.kind === 'yearly' && (
                <>
                  <Perk Icon={CalendarDays} label="Paket" value="Tahunan, setara Tingkat 1 selama 365 hari" />
                  <Perk Icon={Trophy} label="Papan donatur" value="Hall of Fame, urutan teratas" />
                </>
              )}
              {(gift.kind === 'yearly' || gift.kind === 'lifetime') && (
                <Perk Icon={InfinityIcon} label="Tabungan lifetime" value={`${formatIdr(gift.lifetimeTotal)} / ${formatIdr(700000)}`} />
              )}
              {gift.isLifetime && <Perk Icon={Trophy} label="Status" value="Lifetime · Hall of Fame" />}
              {badge && (
                <Perk Icon={Award} label="Badge donatur" value={<><span className="font-heading text-gold">{badge.kanji}</span> {badge.title}</>} />
              )}
            </ul>
          )}

          {gift.kind !== 'gift_key' && gift.kind !== 'pass' && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Termasuk akses Full</p>
              <ul className="text-[11px] text-text-secondary space-y-0.5">
                {FULL_FEATURES.map(x => (
                  <li key={x} className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Washi>

      <Washi>
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h4 className="font-heading font-black text-sm text-text-primary">Butuh fitur atau materi tertentu?</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Ceritakan apa yang kamu perlukan untuk belajar. Surat dari donatur dibaca lebih dulu, dan permintaanmu masuk antrean
                prioritas pengembangan.
              </p>
            </div>
            <button type="button" onClick={onRequestFeature} className="btn btn-pill text-xs gap-1.5 text-indigo">
              <PenLine className="w-3.5 h-3.5" /> Tulis permintaan fitur
            </button>
          </div>
        </div>
      </Washi>
    </motion.div>
  );
};
