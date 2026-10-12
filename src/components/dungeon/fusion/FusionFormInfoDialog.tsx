import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { FusionFormInfo } from '../../../engine/fusion/formInfo';

interface Props { info: FusionFormInfo; onClose: () => void }

/** Popover kecil: penjelasan singkat sebuah bentuk kata. */
export const FusionFormInfoDialog: React.FC<Props> = ({ info, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={info.title} onClick={e => e.stopPropagation()} className="panel w-full sm:max-w-sm flex flex-col gap-2 p-4 bg-surface-card border border-border-subtle rounded-3xl shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-heading font-black text-text-primary break-words min-w-0">{info.title}</h4>
          <button type="button" aria-label="Tutup" onClick={onClose} className="btn-physical-secondary w-9 h-9 shrink-0 rounded-lg flex items-center justify-center cursor-pointer p-0"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-text-primary font-body break-words">{info.rule}</p>
        <ul className="space-y-0.5 text-sm font-body text-gold" lang="ja">
          {info.examples.map(e => <li key={e} className="break-words">{e}</li>)}
        </ul>
        <p className="text-xs text-text-secondary font-body break-words">{info.use}</p>
      </div>
    </div>,
    document.body
  );
};
