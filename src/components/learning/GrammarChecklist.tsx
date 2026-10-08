import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { BunpouItem } from '../../types/content';

interface GrammarChecklistProps {
  item: BunpouItem;
  className?: string;
}

/**
 * Parses and returns structured checklist points for a grammar item.
 * If the item has explicit bullet points or structured notes, it uses them.
 * Otherwise, it formats the meaning, nuance, and explanation into clean educational bullets.
 */
export function getGrammarCheckpoints(item: BunpouItem): { text: string; type?: 'function' | 'nuance' | 'note' }[] {
  const points: { text: string; type?: 'function' | 'nuance' | 'note' }[] = [];

  // 1. Explicit checkpoints if item has them in metadata/explanation
  if ((item as any).checkpoints && Array.isArray((item as any).checkpoints)) {
    return (item as any).checkpoints.map((pt: string) => ({ text: pt, type: 'function' }));
  }

  // 2. Special curation for well-known key patterns like 〜んですが / 〜んだけど
  const normTitle = item.title.toLowerCase();
  if (normTitle.includes('んですが') || normTitle.includes('んだけど') || item.id === 'bp_n4_189') {
    return [
      {
        text: 'Digunakan untuk **membuka percakapan** atau **menjelaskan situasi** sebelum meminta sesuatu (biasanya berupa pertanyaan atau permohonan).',
        type: 'function',
      },
      {
        text: 'Terdengar **jauh lebih halus dan sopan** jika dibandingkan meminta sesuatu secara langsung (*to the point*).',
        type: 'nuance',
      },
      {
        text: 'Bentuk 「**〜んですが**」 digunakan untuk ragam **sopan/formal**, sedangkan 「**〜んだけど**」 untuk situasi **santai/akrab** dengan teman.',
        type: 'note',
      },
    ];
  }

  // 3. General intelligent extraction
  // Primary meaning / function
  if (item.meaningId) {
    const cleanMeaning = item.meaningId.replace(/^Tata bahasa\s+\w+[:：]?\s*/i, '').trim();
    points.push({
      text: `Digunakan untuk menyatakan **${cleanMeaning}**.`,
      type: 'function',
    });
  }

  // Nuance if provided
  if (item.nuance) {
    points.push({
      text: item.nuance,
      type: 'nuance',
    });
  } else if (item.explanation) {
    // If explanation has practical notes
    const sentences = item.explanation
      .split(/(?<=[.!?。])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.includes('Catatan:') && !s.includes('This joins'));

    if (sentences.length > 0 && points.length < 2) {
      points.push({
        text: sentences[0],
        type: 'nuance',
      });
    }
  }

  return points;
}

/**
 * GrammarChecklist Component
 *
 * Renders verified educational bullet points with green checkmarks (✅),
 * matching the clear and professional presentation of Japanese learning slides.
 */
export const GrammarChecklist: React.FC<GrammarChecklistProps> = ({ item, className = '' }) => {
  const checkpoints = getGrammarCheckpoints(item);

  if (checkpoints.length === 0) return null;

  // Render markdown bold **text** safely
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-emerald-950 dark:text-emerald-300">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-emerald-900/90 dark:text-text-secondary">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 shadow-inner ${className}`}
    >
      <div className="flex items-center gap-2 pb-1.5 border-b border-border-subtle">
        <CheckCircle2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-300 font-heading">
          Fungsi & Situasi Penggunaan (使い分け)
        </span>
      </div>

      <div className="space-y-2">
        {checkpoints.map((cp, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            {cp.type === 'note' ? (
              <div className="w-4 h-4 mt-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-400 border border-border-subtle flex items-center justify-center shrink-0 text-[10px] font-bold font-mono">
                💡
              </div>
            ) : (
              <div className="w-4 h-4 mt-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-border-subtle flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
              </div>
            )}
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-body flex-1">
              {renderFormattedText(cp.text)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
