import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PairRoom, RoomOutcome } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';
import { playSound, speakJapanese } from '../../../utils/audio';
import { readingOf } from '../../../engine/tower1/jp';
import { Jp, RoomComplete, RoomFrame, useJapaneseVoice } from '../parts';

interface Props {
  room: PairRoom;
  soundEnabled: boolean;
  onDone: (outcome: RoomOutcome) => void;
}

/** Ketuk satu di kiri lalu pasangannya di kanan. Pasangan "bersih" = tidak pernah salah pilih. */
export const PairRoomView: React.FC<Props> = ({ room, soundEnabled, onDone }) => {
  const rightOrder = useMemo(
    () => seededShuffle(room.pairs.map((_, i) => i), hashString(room.id)),
    [room]
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongRight, setWrongRight] = useState<number | null>(null);
  const mistakes = useRef<Set<number>>(new Set());
  const hasVoice = useJapaneseVoice();

  const allDone = matched.size === room.pairs.length;
  const clean = room.pairs.length - mistakes.current.size;

  if (allDone) {
    return (
      <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title}>
        <RoomComplete correct={clean} total={room.pairs.length} onContinue={() => onDone({ correct: clean, total: room.pairs.length })} />
      </RoomFrame>
    );
  }

  const tapRight = (rightIdx: number) => {
    if (selected === null || matched.has(rightIdx)) return;
    if (rightIdx === selected) {
      playSound('correct', soundEnabled);
      setMatched(prev => new Set(prev).add(rightIdx));
      setSelected(null);
    } else {
      playSound('wrong', soundEnabled);
      mistakes.current.add(selected);
      setWrongRight(rightIdx);
      window.setTimeout(() => setWrongRight(null), 450);
    }
  };

  return (
    <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title} progress={{ done: matched.size, total: room.pairs.length }}>
      <p className="text-sm text-text-secondary">{room.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2" aria-label="Kiri">
          {room.pairs.map(([left], i) => {
            const isMatched = matched.has(i);
            const isSel = selected === i;
            return (
              <button
                key={i}
                type="button"
                disabled={isMatched}
                onClick={() => {
                  setSelected(isSel ? null : i);
                  // Dengar aksara yang diketuk: bunyi ikut terhubung ke bentuknya.
                  if (!isSel && hasVoice && soundEnabled) void speakJapanese(readingOf(left), 0.85);
                }}
                className={`w-full min-h-[52px] rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  isMatched
                    ? 'bg-surface-inset border-border-subtle text-text-muted opacity-40'
                    : isSel
                      ? 'bg-surface-elevated border-border-primary text-text-primary shadow-md'
                      : 'panel hover:border-border-primary text-text-primary'
                }`}
              >
                <Jp text={left} className="text-2xl font-bold" />
                {isMatched && <CheckCircle2 className="w-4 h-4 text-state-success" />}
              </button>
            );
          })}
        </div>
        <div className="space-y-2" aria-label="Kanan">
          {rightOrder.map(i => {
            const isMatched = matched.has(i);
            const isWrong = wrongRight === i;
            return (
              <button
                key={i}
                type="button"
                disabled={isMatched || selected === null}
                onClick={() => tapRight(i)}
                className={`w-full min-h-[52px] rounded-xl border flex items-center justify-center gap-2 text-lg font-bold transition-all ${
                  isMatched
                    ? 'bg-surface-inset border-border-subtle text-text-muted opacity-40'
                    : isWrong
                      ? 'bg-wine-accent/15 border-border-subtle text-wine-accent'
                      : 'panel hover:border-border-primary text-text-primary disabled:opacity-70'
                }`}
              >
                <Jp text={room.pairs[i][1]} />
                {isMatched && <CheckCircle2 className="w-4 h-4 text-state-success" />}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-text-muted text-center">
        {selected === null ? 'Ketuk satu kartu di kiri.' : 'Sekarang ketuk pasangannya di kanan.'}
      </p>
    </RoomFrame>
  );
};
