import React from 'react';
import { Stamp } from 'lucide-react';
import { LetterCategory, Stationery, StationeryStyle, categoryLabel, letterDate, stationeryStyle } from '../../lib/mailCore';

interface LetterPaperProps {
  stationery: Stationery;
  /** ISO tanggal kirim; kosong => hari ini (pratinjau). */
  date?: string;
  toName: string;
  toAddress: string;
  subject: string;
  category: LetterCategory;
  /** Isi surat; bila `children` diberikan, dipakai sebagai area isi (mis. textarea saat menulis). */
  body?: string;
  children?: React.ReactNode;
  signature: string;
  signatureAddress?: string | null;
  /** Catatan kecil di atas perihal, mis. "Membalas surat: ...". */
  note?: string | null;
}

/** Ornamen kertas eksklusif (bulan / matahari / gunung Fuji), digambar dengan SVG statis. */
function Ornament({ s }: { s: StationeryStyle }) {
  if (s.ornament === 'moon') {
    return (
      <svg className="absolute left-4 bottom-4 pointer-events-none" width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="26" fill={s.accent} opacity="0.18" />
        <circle cx="46" cy="30" r="22" fill={s.paper} />
      </svg>
    );
  }
  if (s.ornament === 'sun') {
    return (
      <svg className="absolute right-0 top-0 pointer-events-none" width="90" height="90" viewBox="0 0 90 90" aria-hidden="true">
        <circle cx="90" cy="0" r="34" fill={s.accent} opacity="0.28" />
      </svg>
    );
  }
  if (s.ornament === 'mountain') {
    return (
      <svg className="absolute left-0 right-0 bottom-0 w-full pointer-events-none" height="70" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 70 L150 14 Q200 -4 250 14 L400 70 Z" fill={s.accent} opacity="0.13" />
        <path d="M160 18 Q200 2 240 18 L222 30 L208 22 L196 32 L184 22 Z" fill={s.paper} opacity="0.9" />
      </svg>
    );
  }
  return null;
}

/** Selembar surat di atas kertas bergaris. Kertas tier tertentu punya bingkai, pola, tanda air, dan ornamen sendiri. */
export const LetterPaper: React.FC<LetterPaperProps> = ({
  stationery, date, toName, toAddress, subject, category, body, children, signature, signatureAddress, note,
}) => {
  const s = stationeryStyle(stationery);
  const lines = `repeating-linear-gradient(to bottom, transparent 0, transparent 27px, ${s.rule} 27px, ${s.rule} 28px)`;
  const background = [lines, s.pattern, s.paper].filter(Boolean).join(', ');

  const article = (
    <article
      className="relative overflow-hidden rounded-2xl border shadow-lg px-4 py-5 sm:px-7 sm:py-7 font-body"
      style={{ background, color: s.ink, borderColor: s.rule }}
    >
      {s.emblem && (
        <span
          className="absolute right-3 bottom-1 font-heading font-black leading-none pointer-events-none select-none"
          style={{ color: s.accent, opacity: 0.09, fontSize: s.emblem.length > 1 ? 72 : 110 }}
          aria-hidden="true"
        >
          {s.emblem}
        </span>
      )}
      <Ornament s={s} />

      {/* Perangko */}
      <div
        className="absolute top-4 right-4 sm:top-5 sm:right-5 w-12 h-14 rounded-sm flex flex-col items-center justify-center gap-0.5 border-2 border-dashed rotate-3"
        style={{ borderColor: s.accent, color: s.accent }}
        aria-hidden="true"
      >
        {s.emblem ? (
          <span className="font-heading font-black leading-none" style={{ fontSize: s.emblem.length > 1 ? 13 : 20 }}>{s.emblem}</span>
        ) : (
          <Stamp className="w-5 h-5" />
        )}
        <span className="text-[7px] font-black uppercase tracking-wider leading-none">SQ Pos</span>
      </div>

      <div className="relative">
        <p className="text-xs text-right pr-16 sm:pr-20" style={{ color: s.muted }}>
          {letterDate(date || new Date().toISOString())}
        </p>

        <div className="mt-3 text-sm space-y-0.5 pr-14">
          <p>
            <span style={{ color: s.muted }}>Kepada Yth. </span>
            <span className="font-bold">{toName}</span>
          </p>
          <p className="text-xs font-mono" style={{ color: s.muted }}>{toAddress}</p>
        </div>

        {note && (
          <p className="mt-3 text-[11px] italic" style={{ color: s.muted }}>{note}</p>
        )}

        <p className="mt-3 text-sm">
          <span style={{ color: s.muted }}>Perihal: </span>
          <span className="font-bold break-words">{subject || '—'}</span>
          <span className="ml-2 text-[10px] uppercase tracking-wider font-bold" style={{ color: s.muted }}>
            [{categoryLabel(category)}]
          </span>
        </p>

        <div className="mt-4 text-[15px] leading-7">
          {children ?? <p className="whitespace-pre-wrap break-words">{body}</p>}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="text-right text-sm min-w-[40%]">
            <p style={{ color: s.muted }}>Salam hangat,</p>
            <p className="font-heading font-bold text-base mt-1 break-words">{signature}</p>
            {signatureAddress && <p className="text-xs font-mono" style={{ color: s.muted }}>{signatureAddress}</p>}
          </div>
        </div>
      </div>
    </article>
  );

  if (s.frame === 'airmail') {
    // Bingkai pos udara: garis miring merah-biru seperti amplop kilat.
    return (
      <div
        className="rounded-[20px] p-[7px] shadow-lg"
        style={{
          background: 'repeating-linear-gradient(135deg, #c8463c 0 12px, #f4f7fc 12px 20px, #3a5ca8 20px 32px, #f4f7fc 32px 40px)',
        }}
      >
        {article}
      </div>
    );
  }
  return article;
};
