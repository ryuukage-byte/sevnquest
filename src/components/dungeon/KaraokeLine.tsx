import React, { useCallback, useSyncExternalStore } from 'react';
import { activeWordIndex, type TimedWord } from '../../engine/textStudy/wordTiming';
import { RubyText } from '../learning/RubyText';

/** Penyimpanan waktu pemutar: hanya pelanggan yang indeks katanya berubah yang dirender ulang. */
export interface TimeStore {
  get(): number;
  set(ms: number): void;
  subscribe(listener: () => void): () => void;
}

export function createTimeStore(): TimeStore {
  let ms = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => ms,
    set: next => {
      ms = next;
      listeners.forEach(l => l());
    },
    subscribe: l => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export type LyricView = 'sentence' | 'word';

interface Props {
  words: TimedWord[];
  store: TimeStore;
  showFurigana: boolean;
  /** 'sentence': satu kalimat utuh; 'word': kartu per kata dengan arti di bawahnya. */
  view?: LyricView;
  /** Arti singkat tiap kata (sejajar dengan `words`), dipakai pada tampilan per kata. */
  glosses?: (string | null)[];
  /** Klik kartu kata -> loncat ke awal kata itu (tampilan per kata). */
  onSeek?: (ms: number) => void;
  className?: string;
}

/** Sudah lewat = terang, sedang diucapkan = emas, belum = redup. */
const tone = (i: number, activeIdx: number) => (i < activeIdx ? 'text-text-primary' : i === activeIdx ? 'text-gold' : 'text-text-muted');

/** Lirik dengan sorotan kata demi kata, sebagai satu kalimat atau kartu per kata. */
export const KaraokeLine: React.FC<Props> = ({ words, store, showFurigana, view = 'sentence', glosses, onSeek, className = '' }) => {
  const activeIdx = useSyncExternalStore(
    store.subscribe,
    useCallback(() => activeWordIndex(words, store.get()), [words, store])
  );

  if (view === 'word') {
    return (
      <div className={`flex flex-wrap justify-center gap-2 ${className}`}>
        {words.map((w, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSeek?.(w.startMs)}
            className={`flex flex-col items-center justify-start min-w-12 max-w-32 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-colors ${
              i === activeIdx ? 'bg-surface-elevated border-border-primary' : 'bg-surface-card border-border-subtle hover:bg-surface-elevated'
            }`}
          >
            <span className={tone(i, activeIdx)}>
              <RubyText japanese={w.text} showFurigana={showFurigana} />
            </span>
            {glosses && (
              <span className="mt-0.5 text-[11px] leading-tight text-text-secondary text-center line-clamp-2 min-h-[1.5em]">{glosses[i] ?? ''}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className={tone(i, activeIdx)}>
          <RubyText japanese={w.text} showFurigana={showFurigana} />
        </span>
      ))}
    </span>
  );
};
