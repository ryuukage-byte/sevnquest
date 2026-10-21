import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MissionAiContextButtonProps {
  /** Menyusun dokumen konteks saat dibutuhkan (klik salin atau buka pratinjau). */
  buildText: () => string;
}

export const MissionAiContextButton: React.FC<MissionAiContextButtonProps> = ({ buildText }) => {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard diblokir (mis. http biasa): buka pratinjau agar teksnya bisa disalin manual.
      setFailed(true);
      setShowPreview(true);
    }
  };

  return (
    <>
      <button
        onClick={copy}
        className="btn-physical-secondary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
        aria-label="Salin konteks misi untuk AI"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Tersalin' : 'Salin Konteks AI'}
      </button>
      <button
        onClick={() => setShowPreview(v => !v)}
        aria-expanded={showPreview}
        className="text-[11px] text-text-muted underline underline-offset-2 hover:text-text-secondary"
      >
        {showPreview ? 'Tutup pratinjau' : 'Pratinjau'}
      </button>
      {showPreview && (
        <div className="w-full space-y-2">
          {failed && (
            <p className="text-[11px]" style={{ color: 'var(--color-state-danger)' }}>
              Gagal menyalin otomatis. Pilih teks di bawah lalu salin manual.
            </p>
          )}
          <textarea
            readOnly
            value={buildText()}
            rows={12}
            onFocus={e => e.currentTarget.select()}
            className="w-full text-[11px] font-mono bg-surface-inset border border-border-subtle rounded-xl p-2 text-text-secondary"
          />
        </div>
      )}
    </>
  );
};
