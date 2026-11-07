import React from 'react';
import { Stamp } from 'lucide-react';
import { LetterCategory, Stationery, categoryLabel, letterDate, stationeryStyle } from '../../lib/mailCore';

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

/** Selembar surat di atas kertas bergaris. Warna kertas tetap, tidak ikut tema aplikasi. */
export const LetterPaper: React.FC<LetterPaperProps> = ({
  stationery, date, toName, toAddress, subject, category, body, children, signature, signatureAddress, note,
}) => {
  const s = stationeryStyle(stationery);
  return (
    <article
      className="relative rounded-2xl border shadow-lg px-4 py-5 sm:px-7 sm:py-7 font-body"
      style={{
        background: `repeating-linear-gradient(to bottom, transparent 0, transparent 27px, ${s.rule} 27px, ${s.rule} 28px), ${s.paper}`,
        color: s.ink,
        borderColor: s.rule,
      }}
    >
      {/* Perangko */}
      <div
        className="absolute top-4 right-4 sm:top-5 sm:right-5 w-12 h-14 rounded-sm flex flex-col items-center justify-center gap-0.5 border-2 border-dashed rotate-3"
        style={{ borderColor: s.muted, color: s.muted }}
        aria-hidden="true"
      >
        <Stamp className="w-5 h-5" />
        <span className="text-[7px] font-black uppercase tracking-wider leading-none">SQ Pos</span>
      </div>

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
    </article>
  );
};
