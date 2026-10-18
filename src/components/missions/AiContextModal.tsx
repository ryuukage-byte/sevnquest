import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface AiContextModalProps {
  /** Dokumen konteks hasil buildDailyMissionAiContext. */
  text: string;
  summary: string;
  /** Judul modal; default untuk Misi Harian. */
  title?: string;
  soundEnabled?: boolean;
  onClose: () => void;
}

/** Salin ke clipboard; bila API diblokir (mis. http biasa), pilih teks di textarea lalu pakai execCommand. */
async function copyText(text: string, fallback: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!fallback) return false;
    try {
      fallback.focus();
      fallback.select();
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
}

export const AiContextModal: React.FC<AiContextModalProps> = ({ text, summary, title = 'Misi Harian untuk ChatGPT / Claude', soundEnabled = true, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(timer.current); };
  }, [onClose]);

  const handleCopy = async () => {
    const ok = await copyText(text, areaRef.current);
    playSound(ok ? 'coin' : 'click', soundEnabled);
    setStatus(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[9980] flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="Konteks AI"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl panel panel-stitched p-4 sm:p-5 space-y-3 max-h-[92dvh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="breadcrumb-label text-gold-soft">KONTEKS AI</p>
            <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary">{title}</h3>
            <p className="text-[11px] text-text-secondary">{summary}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          ref={areaRef}
          readOnly
          value={text}
          onFocus={e => e.currentTarget.select()}
          className="flex-1 min-h-[40dvh] w-full rounded-xl bg-surface-inset border border-border-subtle p-3 text-xs font-mono text-text-primary resize-none shadow-inner"
          aria-label="Isi konteks AI"
        />

        <p className="text-[11px] text-text-muted">
          Hanya berisi materi dan instruksi singkat untuk AI. Tidak ada data akunmu. Tempel di ChatGPT atau Claude, lalu tanyakan apa saja.
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${status === 'failed' ? 'text-state-danger' : 'text-state-success'}`} role="status" aria-live="polite">
            {status === 'copied' ? 'Tersalin ke clipboard' : status === 'failed' ? 'Gagal menyalin otomatis; teks sudah terpilih, salin manual (Ctrl+C).' : ''}
          </span>
          <button type="button" onClick={handleCopy} className="btn-physical-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
            {status === 'copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {status === 'copied' ? 'Tersalin' : 'Salin Konteks AI'}
          </button>
        </div>
      </div>
    </div>
  );
};
