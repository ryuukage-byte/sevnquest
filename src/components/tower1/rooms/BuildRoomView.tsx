import React, { useMemo, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { BuildRoom, RoomOutcome } from '../../../engine/tower1/types';
import { hashString, seededShuffle } from '../../../engine/tower1/jp';
import { playSound } from '../../../utils/audio';
import { usePracticeQueue } from '../usePracticeQueue';
import { Feedback, RetryPanel, RoomComplete, RoomFrame, SpeakButton, useJapaneseVoice } from '../parts';

interface Props {
  room: BuildRoom;
  soundEnabled: boolean;
  onDone: (outcome: RoomOutcome) => void;
}

/** Susun ubin aksara menjadi kata. Ubin ditandai dengan indeksnya agar aksara kembar tidak tertukar. */
export const BuildRoomView: React.FC<Props> = ({ room, soundEnabled, onDone }) => {
  const q = usePracticeQueue(room.items.length, room.passRatio);
  const hasVoice = useJapaneseVoice();
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);

  const item = q.current !== undefined ? room.items[q.current] : undefined;

  const tiles = useMemo(() => {
    if (!item) return [] as string[];
    return seededShuffle([...item.answer, ...(item.extra ?? [])], hashString(`${room.id}:${q.pos}:${q.run}:${item.answer.join('')}`));
  }, [item, room.id, q.pos, q.run]);

  if (q.done) {
    return (
      <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title}>
        {q.failed ? (
          <RetryPanel ratio={q.ratio} need={room.passRatio ?? 0} onRetry={() => { setPlaced([]); setChecked(null); q.retry(); }} />
        ) : (
          <RoomComplete correct={q.outcome.correct} total={q.outcome.total} onContinue={() => onDone(q.outcome)} />
        )}
      </RoomFrame>
    );
  }
  if (!item) return null;

  const built = placed.map(i => tiles[i]);
  const check = () => {
    const ok = built.join('') === item.answer.join('');
    setChecked(ok);
    q.record(ok);
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
  };

  return (
    <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title} progress={q.progress}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary leading-relaxed">{item.prompt}</p>
        {item.say && hasVoice && <SpeakButton text={item.say} enabled={soundEnabled} />}
      </div>

      {/* Baki jawaban */}
      <div
        className="min-h-[72px] p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-wrap items-center justify-center gap-2"
        aria-label="Susunan jawabanmu"
      >
        {placed.length === 0 && <span className="text-xs text-text-muted">Ketuk aksara di bawah untuk menyusun kata.</span>}
        {placed.map((tileIdx, i) => (
          <button
            key={`${tileIdx}-${i}`}
            type="button"
            disabled={checked !== null}
            onClick={() => setPlaced(p => p.filter((_, k) => k !== i))}
            className="btn-physical-secondary min-w-[3.25rem] h-[3.25rem] px-3 rounded-xl text-xl leading-none font-jp font-bold text-text-primary flex items-center justify-center"
          >
            {tiles[tileIdx]}
          </button>
        ))}
      </div>

      {/* Bank ubin */}
      <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-wrap items-center justify-center gap-2.5" role="group" aria-label="Pilihan aksara">
        {tiles.map((t, i) => {
          const used = placed.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={used || checked !== null}
              onClick={() => setPlaced(p => [...p, i])}
              className={`min-w-[3.25rem] h-[3.25rem] px-3 rounded-xl text-xl leading-none font-jp font-bold flex items-center justify-center transition-all ${
                used ? 'border border-dashed border-border-subtle text-transparent' : 'btn-physical-secondary text-text-primary'
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {checked === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPlaced(p => p.slice(0, -1))}
            disabled={placed.length === 0}
            className="btn-physical-secondary px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" />
            <span>Hapus</span>
          </button>
          <button
            type="button"
            onClick={check}
            disabled={placed.length === 0}
            className="btn-physical-primary flex-1 py-3 rounded-2xl font-bold text-sm font-heading disabled:opacity-40"
          >
            Periksa
          </button>
        </div>
      ) : (
        <Feedback correct={checked} explain={item.explain} onNext={() => { setPlaced([]); setChecked(null); q.next(); }} />
      )}
    </RoomFrame>
  );
};
