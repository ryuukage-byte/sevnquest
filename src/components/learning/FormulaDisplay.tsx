import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { parseFormula, splitFormulaVariants, FormulaToken } from '../../utils/formulaParser';
import { getFormulaBreakdownExamples } from '../../utils/formulaBreakdownUtils';
import { BunpouItem } from '../../types/content';
import { ConjugationSheet } from './ConjugationSheet';

interface FormulaDisplayProps {
  formula: string;
  item?: BunpouItem;
}

/**
 * FormulaDisplay — Interactive formula renderer for the Bunpou module.
 *
 * Separates multi-variant formulas into individual readable lines with distinct variant badges.
 * Clicking a clickable token opens the ConjugationSheet bottom-sheet modal.
 * Clicking the formula card container expands downwards to show concise breakdown examples.
 */
export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ formula, item }) => {
  const [activeSheet, setActiveSheet] = useState<{
    patternId: string;
    type: 'conjugation' | 'auxiliary' | 'connector';
  } | null>(null);

  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  // Split multi-variant formulas cleanly using parenthesis/bracket aware parser
  const variants = useMemo(() => {
    return splitFormulaVariants(formula);
  }, [formula]);

  const parsedVariants = useMemo(() => {
    return variants.map(variant => ({
      raw: variant,
      tokens: parseFormula(variant),
      examples: getFormulaBreakdownExamples(variant, formula, item),
    }));
  }, [variants, formula, item]);

  const handleTokenClick = (token: FormulaToken) => {
    if (token.linkedPatternId && token.linkedType) {
      setActiveSheet({
        patternId: token.linkedPatternId,
        type: token.linkedType,
      });
    }
  };

  const toggleExpand = (vIndex: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [vIndex]: !prev[vIndex],
    }));
  };

  return (
    <div className="space-y-2.5">
      {parsedVariants.map((variantItem, vIndex) => {
        const isExpanded = !!expandedIndices[vIndex];
        const breakdownExamples = variantItem.examples;

        return (
          <div
            key={vIndex}
            className="rounded-2xl bg-surface-inset border border-border-subtle transition-all duration-200 overflow-hidden shadow-xs hover:border-border-primary"
          >
            {/* Clickable Header Area */}
            <div
              onClick={() => toggleExpand(vIndex)}
              className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5 cursor-pointer select-none group"
              title="Klik untuk melihat contoh pemakaian singkat"
            >
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                {parsedVariants.length > 1 && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-card text-gold border border-border-subtle mr-1 select-none shrink-0 shadow-xs">
                    Pola {vIndex + 1}
                  </span>
                )}
                {variantItem.tokens.map((token, i) => {
                  const isClickable = !!token.linkedPatternId;

                  if (token.type === 'separator') {
                    return (
                      <span
                        key={i}
                        className="text-xs sm:text-sm font-mono text-text-muted px-0.5 select-none font-bold"
                      >
                        {token.text}
                      </span>
                    );
                  }

                  if (isClickable) {
                    const isAuxiliary = token.type === 'auxiliary';
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTokenClick(token);
                        }}
                        className={`
                          text-xs sm:text-sm font-mono font-semibold
                          cursor-pointer transition-all duration-150 rounded-sm px-1.5 py-0.5 active:scale-95
                          ${
                            isAuxiliary
                              ? 'text-gold hover:opacity-90 border-b border-dashed border-border-subtle hover:border-border-primary hover:bg-gold/10'
                              : 'text-indigo hover:opacity-90 border-b border-dashed border-border-subtle hover:border-border-primary hover:bg-indigo/10'
                          }
                        `}
                        title={
                          isAuxiliary
                            ? `Klik untuk lihat perubahan kata akhiran "${token.text}" (sopan, lampau, negatif dll)`
                            : `Klik untuk lihat aturan konjugasi "${token.text}" (Golongan 1, 2, 3)`
                        }
                      >
                        {token.text}
                      </button>
                    );
                  }

                  // Non-clickable literal
                  return (
                    <span
                      key={i}
                      className="text-xs sm:text-sm font-mono text-text-primary px-0.5 font-medium"
                    >
                      {token.text}
                    </span>
                  );
                })}
              </div>

              {/* Right subtle transparent hint text */}
              <div className="flex items-center gap-1 text-[11px] text-text-muted/70 group-hover:text-text-primary transition-colors shrink-0 ml-auto pl-1">
                <span className="font-heading font-medium tracking-tight">
                  {isExpanded ? 'tutup contoh' : 'klik untuk contoh'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180 text-text-primary' : 'text-text-muted/60'
                  }`}
                />
              </div>
            </div>

            {/* Downwards Expanded Area */}
            {isExpanded && (
              <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 pt-2 border-t border-border-subtle/70 space-y-2 animate-fadeIn bg-surface-card/30">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading pt-0.5">
                  Contoh Singkat Perubahan Kata (実例):
                </div>

                <div className="space-y-1.5">
                  {breakdownExamples.length > 0 ? (
                    breakdownExamples.map((ex, exIdx) => (
                      <div
                        key={exIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5 p-2.5 rounded-xl bg-surface-card border border-border-subtle shadow-xs"
                      >
                        {/* 1. Rumus kombinasi */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-indigo text-xs font-mono font-bold">
                            {ex.formula}
                          </span>
                          <span className="text-text-muted text-xs font-mono">=</span>
                        </div>

                        {/* 2. Contoh kata singkat */}
                        <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                          <span className="text-sm font-bold font-jp text-text-primary">
                            {ex.exampleJp}
                          </span>
                          {ex.exampleReading && (
                            <span className="text-xs text-text-muted font-mono font-medium">
                              ({ex.exampleReading})
                            </span>
                          )}
                        </div>

                        {/* 3. Terjemah bahasa Indonesia */}
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary sm:text-right font-medium">
                          <span className="text-text-muted sm:hidden">=</span>
                          <span>{ex.meaningId}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-text-muted text-center italic">
                      Contoh singkat tidak tersedia untuk pola ini.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Conjugation / Auxiliary Sheet Modal */}
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
