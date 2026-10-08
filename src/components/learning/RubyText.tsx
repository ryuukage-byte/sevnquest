import React, { useMemo } from 'react';
import { getFuriganaSegments, isKanji } from '../../utils/furiganaUtils';

export interface RubyTextProps {
  japanese?: string;
  text?: string;
  reading?: string;
  ruby?: string;
  showFurigana?: boolean;
  excludeKanji?: string[];
  highlightKanji?: string;
  targetWord?: string;
  className?: string;
}

/**
 * RubyText — Renders Japanese text with inline <ruby><rt> furigana annotations.
 *
 * Supports polymorphic prop naming (japanese/text, reading/ruby).
 * If no reading is provided, automatically looks up kanji compounds in the furigana dictionary.
 * If targetWord is provided (e.g. for Kanji Reading questions), ruby is strictly suppressed
 * on that target word and it is styled with a distinct, high-contrast underline accent.
 */
export const RubyText: React.FC<RubyTextProps> = ({
  japanese,
  text,
  reading,
  ruby,
  showFurigana = true,
  excludeKanji,
  highlightKanji,
  targetWord,
  className = '',
}) => {
  const actualJapanese = (japanese ?? text ?? '').trim();
  const actualReading = (reading ?? ruby ?? '').trim();

  // If targetWord is provided, extract all its kanji characters to exclude them from receiving ruby
  const targetChars = useMemo(() => {
    if (!targetWord) return [];
    return Array.from(targetWord).filter(c => isKanji(c));
  }, [targetWord]);

  const effectiveExcludeKanji = useMemo(() => {
    const list = [...(excludeKanji || [])];
    if (targetChars.length > 0) {
      list.push(...targetChars);
    }
    return list.length > 0 ? list : undefined;
  }, [excludeKanji, targetChars]);

  const segments = useMemo(() => {
    if (!showFurigana || !actualJapanese) {
      return null;
    }
    const excludeSet = effectiveExcludeKanji ? new Set<string>(effectiveExcludeKanji) : undefined;
    return getFuriganaSegments(actualJapanese, actualReading || undefined, excludeSet);
  }, [actualJapanese, actualReading, showFurigana, effectiveExcludeKanji]);

  const renderSegmentText = (str: string): React.ReactNode => {
    if (!str) return null;

    if (targetWord && str.includes(targetWord)) {
      const parts = str.split(targetWord);
      return parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-amber-800 dark:text-amber-300 font-bold underline decoration-amber-600/80 dark:decoration-amber-300/80 decoration-[2.5px] underline-offset-[5px] bg-amber-500/15 dark:bg-amber-400/15 px-1.5 py-0.5 rounded-lg shadow-sm inline-block mx-0.5 border border-border-subtle">
              {targetWord}
            </span>
          )}
          {part ? renderSegmentText(part) : null}
        </React.Fragment>
      ));
    }

    if (highlightKanji && str.includes(highlightKanji)) {
      return str.split('').map((char, i) => (
        char === highlightKanji ? (
          <span key={i} className="text-red-700 dark:text-amber-400 font-bold">{char}</span>
        ) : (
          <span key={i}>{char}</span>
        )
      ));
    }

    return str;
  };

  // If furigana is disabled or no segments generated, render plain text with target word highlighted
  if (!showFurigana || !segments || segments.length === 0) {
    return <span className={`font-jp ${className}`}>{renderSegmentText(actualJapanese)}</span>;
  }

  const hasRuby = segments.some(s => s.isKanji && s.ruby);
  if (!hasRuby) {
    return <span className={`font-jp ${className}`}>{renderSegmentText(actualJapanese)}</span>;
  }

  return (
    <span className={`ruby-text font-jp leading-relaxed ${className}`}>
      {segments.map((segment, index) => {
        if (segment.isKanji && segment.ruby) {
          return (
            <ruby key={index} className="ruby-word">
              {renderSegmentText(segment.text)}
              <rp>(</rp>
              <rt className="text-[0.62em] font-semibold leading-none select-none text-[#3f3a32] dark:text-[#f0be52] font-jp tracking-tight">
                {segment.ruby}
              </rt>
              <rp>)</rp>
            </ruby>
          );
        }
        return <span key={index}>{renderSegmentText(segment.text)}</span>;
      })}
    </span>
  );
};
