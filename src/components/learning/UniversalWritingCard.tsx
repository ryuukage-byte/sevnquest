import React, { useEffect } from 'react';
import { KanjiWritingCanvas, preloadStrokeData } from './KanjiWritingCanvas';
import { KotobaWritingPractice } from './KotobaWritingPractice';
import { ResolvedDeckItem } from '../../utils/decks';
import { KanjiItem, KotobaItem } from '../../types/content';
import { WritingRewardResult } from '../../utils/rewards';

import { asWritable } from '../../engine/traits/traits';

export type UniversalWritingItem =
  | ResolvedDeckItem
  | KanjiItem
  | KotobaItem
  | {
      id?: string;
      category?: 'kanji' | 'kotoba' | 'bunpou';
      displayTitle?: string;
      displayReading?: string;
      displayMeaning?: string;
      level?: string;
      kanji?: KanjiItem;
      kotoba?: KotobaItem;
      character?: string;
      word?: string;
      [key: string]: any;
    };

export interface UniversalWritingCardProps {
  item: UniversalWritingItem;
  onFinish: (score: number, reward?: WritingRewardResult) => void;
  soundEnabled?: boolean;
  totalSheets?: number;
  showStopwatch?: boolean;
  nextButtonLabel?: string;
  onCancel?: () => void;
  className?: string;
}

export const UniversalWritingCard: React.FC<UniversalWritingCardProps> = ({
  item,
  onFinish,
  soundEnabled = true,
  totalSheets = 1,
  showStopwatch = true,
  nextButtonLabel,
  onCancel,
  className = '',
}) => {
  const writableTrait = asWritable(item);

  // Preload stroke data immediately
  useEffect(() => {
    if (writableTrait?.character) {
      preloadStrokeData(writableTrait.character);
    }
  }, [writableTrait?.character]);

  // If item cannot be written, provide a safe fallback or return null
  if (!writableTrait) {
    return (
      <div className={`w-full text-center p-6 panel panel-stitched rounded-2xl text-text-muted ${className}`}>
        Materi ini tidak memiliki data goresan untuk ditulis.
      </div>
    );
  }

  // 1. Single Kanji drawing canvas
  if (writableTrait.isSingleKanji) {
    return (
      <div className={`w-full flex justify-center ${className}`}>
        <KanjiWritingCanvas
          kanjiChar={writableTrait.character}
          level={writableTrait.level}
          meaning={writableTrait.meaning}
          strokeCount={writableTrait.strokeCount}
          onyomi={writableTrait.onyomi || ''}
          kunyomi={writableTrait.kunyomi || ''}
          relatedWords={writableTrait.sourceItem?.relatedWords}
          soundEnabled={soundEnabled}
          totalSheets={totalSheets}
          showStopwatch={showStopwatch}
          nextButtonLabel={nextButtonLabel}
          onCancel={onCancel}
          onCompleteSheet={(_sheet, _score, _reward) => {
            // Sheet completion recorded; do NOT auto-advance before user reviews explanation
          }}
          onFinish={(reward) => {
            const score = (reward as any)?.accuracyScore ?? 100;
            onFinish(score, reward);
          }}
        />
      </div>
    );
  }

  // 2. Multi-character Kotoba writing practice
  const kotobaItem: KotobaItem =
    (writableTrait.sourceItem?.word ? writableTrait.sourceItem : null) || {
      id: (item as any).id || 'custom_kotoba_write',
      word: writableTrait.character,
      reading: (item as any).reading || (item as any).displayReading || writableTrait.character,
      meaningId: writableTrait.meaning || 'Latihan Menulis',
      meaningEn: (item as any).meaningEn || 'Writing Practice',
      meaningJa: writableTrait.character,
      jlpt: writableTrait.level || 'N5',
      wordType: 'noun',
      kanjiComponents: writableTrait.characters,
      exampleSentence: {
        japanese: `${writableTrait.character}を練習します。`,
        reading: `${writableTrait.character}をれんしゅうします。`,
        meaningId: `Berlatih menulis ${writableTrait.character}.`,
      },
    };

  return (
    <div className={`w-full ${className}`}>
      <KotobaWritingPractice
        kotoba={kotobaItem}
        soundEnabled={soundEnabled}
        nextButtonLabel={nextButtonLabel}
        onCancel={onCancel}
        onFinishWord={(score, reward) => {
          onFinish(score, reward);
        }}
      />
    </div>
  );
};

