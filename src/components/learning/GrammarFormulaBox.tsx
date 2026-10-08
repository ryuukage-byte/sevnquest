import React, { useState, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { BunpouItem } from '../../types/content';
import { ConjugationSheet } from './ConjugationSheet';

interface GrammarFormulaBoxProps {
  item: BunpouItem;
  className?: string;
}

export interface FormulaRow {
  partOfSpeech: string; // e.g. "K. Kerja", "K. Sifat -i", "K. Sifat -na", "K. Benda"
  jpLabel?: string; // e.g. "動詞", "い形容詞", "な形容詞", "名詞"
  formHint: string; // e.g. "(biasa)", "( な )", "( の )", "(bentuk -te)"
  suffixText?: string; // Suffix if row-specific
  linkedPatternId?: string; // For clickable conjugation sheet
}

export interface FormulaGroup {
  title?: string;
  rows: FormulaRow[];
  sharedSuffix: string[]; // e.g. ["んですが、", "のですが、"] or ["んだけど、"]
}

/**
 * Derives structured bracket rows for a BunpouItem.
 */
export function getFormulaGroups(item: BunpouItem): FormulaGroup[] {
  const normTitle = (item.title || '').toLowerCase();

  // 1. Special curation for 〜んですが / 〜んだけど
  if (normTitle.includes('んですが') || normTitle.includes('んだけど') || item.id === 'bp_n4_189') {
    return [
      {
        title: 'Bentuk Sopan / Formal',
        rows: [
          { partOfSpeech: 'K. Kerja', jpLabel: '動詞', formHint: '(biasa)', linkedPatternId: 'v_plain' },
          { partOfSpeech: 'K. Sifat -i', jpLabel: 'い形容詞', formHint: '(biasa)', linkedPatternId: 'adj_i_plain' },
          { partOfSpeech: 'K. Sifat -na', jpLabel: 'な形容詞', formHint: 'な', linkedPatternId: 'adj_na_na' },
          { partOfSpeech: 'K. Benda', jpLabel: '名詞', formHint: 'な', linkedPatternId: 'noun_na' },
        ],
        sharedSuffix: ['んですが、', 'のですが、'],
      },
      {
        title: 'Bentuk Santai / Akrab (Casual)',
        rows: [
          { partOfSpeech: 'K. Kerja', jpLabel: '動詞', formHint: '(biasa)', linkedPatternId: 'v_plain' },
          { partOfSpeech: 'K. Sifat -i', jpLabel: 'い形容詞', formHint: '(biasa)', linkedPatternId: 'adj_i_plain' },
          { partOfSpeech: 'K. Sifat -na', jpLabel: 'な形容詞', formHint: 'な', linkedPatternId: 'adj_na_na' },
          { partOfSpeech: 'K. Benda', jpLabel: '名詞', formHint: 'な', linkedPatternId: 'noun_na' },
        ],
        sharedSuffix: ['んだけど、', 'のだ／んだ、'],
      },
    ];
  }

  // 2. Check if item has subFormulas with connectionConditions
  if (item.subFormulas && item.subFormulas.length > 0) {
    const groups: FormulaGroup[] = [];

    item.subFormulas.forEach((sub) => {
      const rows: FormulaRow[] = (sub.connectionConditions || []).map((cond) => {
        let pos = cond.partOfSpeech;
        let formHint = cond.rule;

        if (pos.includes('Kata Kerja') || pos.includes('V')) {
          pos = 'K. Kerja';
        } else if (pos.includes('Sifat-i') || pos.includes('A')) {
          pos = 'K. Sifat -i';
        } else if (pos.includes('Sifat-na') || pos.includes('na')) {
          pos = 'K. Sifat -na';
        } else if (pos.includes('Kata Benda') || pos.includes('N')) {
          pos = 'K. Benda';
        }

        return {
          partOfSpeech: pos,
          formHint,
        };
      });

      if (rows.length > 0) {
        groups.push({
          title: sub.token || sub.meaning,
          rows,
          sharedSuffix: [sub.token],
        });
      }
    });

    if (groups.length > 0) return groups;
  }

  // 3. Fallback: Parse from raw formula string
  const raw = item.formula || '';
  const rows: FormulaRow[] = [];
  const suffix = item.title.replace(/^[〜~]/, '');

  if (raw.includes('Verb') || raw.includes('Kata Kerja') || raw.includes('K. Kerja') || raw.includes('V')) {
    let hint = '(biasa)';
    if (raw.includes('Vます') || raw.includes('masu') || raw.includes('Bentuk Masu')) hint = '(tanpa -masu)';
    else if (raw.includes('Vて') || raw.includes('te') || raw.includes('Bentuk-te')) hint = '(bentuk -te)';
    else if (raw.includes('Vた') || raw.includes('ta') || raw.includes('Bentuk-ta')) hint = '(bentuk -ta)';
    else if (raw.includes('Vない') || raw.includes('nai') || raw.includes('Bentuk-nai')) hint = '(bentuk -nai)';
    rows.push({ partOfSpeech: 'K. Kerja', jpLabel: '動詞', formHint: hint, linkedPatternId: 'v_plain' });
  }

  if (raw.includes('い-adjective') || raw.includes('Kata Sifat-i') || raw.includes('い形') || raw.includes('A-i') || raw.includes('A')) {
    rows.push({ partOfSpeech: 'K. Sifat -i', jpLabel: 'い形容詞', formHint: '(biasa)', linkedPatternId: 'adj_i_plain' });
  }

  if (raw.includes('な-adjective') || raw.includes('Kata Sifat-na') || raw.includes('な形') || raw.includes('na')) {
    let hint = 'な';
    if (raw.includes('na ＋ である') || raw.includes('である')) hint = 'な / である';
    rows.push({ partOfSpeech: 'K. Sifat -na', jpLabel: 'な形容詞', formHint: hint, linkedPatternId: 'adj_na_na' });
  }

  if (raw.includes('Noun') || raw.includes('Kata Benda') || raw.includes('K. Benda') || raw.includes('名詞') || raw.includes('N')) {
    let hint = 'の';
    if (raw.includes('Noun ＋ な') || raw.includes('Kata Benda ＋ な') || raw.includes('N な')) hint = 'な';
    else if (raw.includes('Noun ＋ である') || raw.includes('Kata Benda ＋ である')) hint = 'である';
    rows.push({ partOfSpeech: 'K. Benda', jpLabel: '名詞', formHint: hint, linkedPatternId: 'noun_na' });
  }

  if (rows.length === 0) {
    rows.push({
      partOfSpeech: 'Rumus Dasar',
      formHint: raw || item.title,
    });
  }

  return [
    {
      rows,
      sharedSuffix: [suffix],
    },
  ];
}

/**
 * GrammarFormulaBox Component
 *
 * Renders an educational bracket-grouped formula box matching Japanese instructional slides
 * (e.g. green background, clean bracket grouping parts of speech, and high readability).
 */
export const GrammarFormulaBox: React.FC<GrammarFormulaBoxProps> = ({ item, className = '' }) => {
  const groups = useMemo(() => getFormulaGroups(item), [item]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeSheet, setActiveSheet] = useState<{
    patternId: string;
    type: 'conjugation' | 'auxiliary' | 'connector';
  } | null>(null);

  const currentGroup = groups[activeGroupIndex] || groups[0];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tab Switcher if multiple groups (e.g. Formal vs Casual) */}
      {groups.length > 1 && (
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-inset border border-border-subtle">
          {groups.map((grp, gIdx) => (
            <button
              key={gIdx}
              type="button"
              onClick={() => setActiveGroupIndex(gIdx)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                activeGroupIndex === gIdx
                  ? 'seg-active text-gold font-black'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {grp.title || `Bentuk ${gIdx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Main Slide-Style Formula Card */}
      <div className="relative rounded-2xl p-4 sm:p-5 bg-surface-card panel-stitched border border-border-subtle shadow-md text-text-primary select-none overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-3 top-2 text-emerald-900/10 dark:text-emerald-500/10 font-black font-jp text-5xl pointer-events-none">
          接続
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Stack of parts of speech & forms */}
          <div className="space-y-2 w-full sm:w-auto">
            {currentGroup.rows.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2.5 font-mono text-xs sm:text-sm">
                <span className="w-24 sm:w-28 font-black text-emerald-950 dark:text-amber-300 font-heading shrink-0 flex items-center gap-1">
                  <span>{row.partOfSpeech}</span>
                </span>
                <span className="text-emerald-950 dark:text-emerald-100 font-black px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle shadow-inner">
                  {row.formHint}
                </span>
              </div>
            ))}
          </div>

          {/* Center: Visual Connecting Bracket */}
          <div className="hidden sm:flex items-center justify-center px-1">
            <div className="w-3.5 h-28 border-r-2 border-t-2 border-b-2 border-border-subtle rounded-r-lg" />
          </div>

          {/* Right: Suffix tokens (e.g. んですが、 / のですが、) */}
          <div className="flex flex-col sm:items-start justify-center gap-1.5 pl-0 sm:pl-2 w-full sm:w-auto border-t sm:border-t-0 border-border-subtle pt-3 sm:pt-0">
            {currentGroup.sharedSuffix.map((suf, sIdx) => (
              <div
                key={sIdx}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 border border-border-subtle text-white font-jp font-extrabold text-base sm:text-lg tracking-wide shadow-xs flex items-center gap-2"
              >
                <span className="text-emerald-200 dark:text-emerald-300 font-bold text-xs sm:text-sm font-mono">+</span>
                <span>{suf}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Hint */}
        <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200/90 font-bold">
          <span className="flex items-center gap-1.5">
            <span>💡</span>
            <span>Sambungkan kata depan dalam bentuk di atas dengan akhiran pola</span>
          </span>
          <span className="hidden sm:inline font-mono text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
            Standar JLPT / JFT
          </span>
        </div>
      </div>

      {/* Conjugation Sheet Modal (if clicked) */}
      {activeSheet && (
        <ConjugationSheet
          patternId={activeSheet.patternId}
          type={activeSheet.type}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </div>
  );
};
