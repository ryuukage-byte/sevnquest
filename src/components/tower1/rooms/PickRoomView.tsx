import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { PickRoom, RoomOutcome } from '../../../engine/tower1/types';
import { playSound } from '../../../utils/audio';
import { usePracticeQueue } from '../usePracticeQueue';
import { Feedback, Jp, RetryPanel, RoomComplete, RoomFrame, SpeakButton, useJapaneseVoice } from '../parts';

interface Props {
  room: PickRoom;
  soundEnabled: boolean;
  onDone: (outcome: RoomOutcome) => void;
}

/** Ketuk bagian kalimat yang diminta (raja, kanji, ekor, ...). */
export const PickRoomView: React.FC<Props> = ({ room, soundEnabled, onDone }) => {
  const q = usePracticeQueue(room.items.length, room.passRatio);
  const [sel, setSel] = useState<number[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const hasVoice = useJapaneseVoice();

  const item = q.current !== undefined ? room.items[q.current] : undefined;

  if (q.done) {
    return (
      <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title}>
        {q.failed ? (
          <RetryPanel ratio={q.ratio} need={room.passRatio ?? 0} onRetry={q.retry} />
        ) : (
          <RoomComplete correct={q.outcome.correct} total={q.outcome.total} onContinue={() => onDone(q.outcome)} />
        )}
      </RoomFrame>
    );
  }
  if (!item) return null;

  const toggle = (i: number) => {
    if (checked !== null) return;
    setSel(s => (s.includes(i) ? s.filter(x => x !== i) : [...s, i]));
  };

  const check = () => {
    const ok = sel.length === item.correct.length && item.correct.every(c => sel.includes(c));
    setChecked(ok);
    q.record(ok);
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
  };

  return (
    <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title} progress={q.progress}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary leading-relaxed">{item.prompt}</p>
        {hasVoice && <SpeakButton text={item.tokens.map(t => t.ruby ?? t.text).join('')} enabled={soundEnabled} label="Dengarkan kalimat" />}
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Bagian kalimat">
          {item.tokens.map((t, i) => {
            const isSel = sel.includes(i);
            const isCorrect = item.correct.includes(i);
            let style = isSel
              ? 'bg-surface-elevated border-border-primary text-text-primary shadow-md'
              : 'panel hover:border-border-primary text-text-primary';
            if (checked !== null) {
              if (isCorrect) style = 'bg-state-success/15 border-state-success text-state-success font-bold';
              else if (isSel) style = 'bg-wine-accent/15 border-border-subtle text-wine-accent font-bold';
              else style = 'bg-surface-inset border-border-subtle text-text-muted opacity-50';
            }
            return (
              <button
                key={i}
                type="button"
                disabled={checked !== null}
                onClick={() => toggle(i)}
                aria-pressed={isSel}
                className={`min-h-[52px] px-4 py-2 rounded-xl border text-xl sm:text-2xl leading-[1.7] transition-all ${style}`}
              >
                <Jp text={t.ruby ? `[${t.text}|${t.ruby}]` : t.text} className="font-bold" />
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-text-muted text-center mt-3">Spasi hanya alat bantu belajar; teks asli tidak berspasi.</p>
      </div>

      {checked === null ? (
        <button
          type="button"
          onClick={check}
          disabled={sel.length === 0}
          className="btn-physical-primary w-full py-3 rounded-2xl font-bold text-sm font-heading disabled:opacity-40"
        >
          Periksa
        </button>
      ) : (
        <Feedback
          correct={checked}
          explain={item.explain}
          extra={
            item.meaning ? (
              <div className="p-2.5 rounded-lg bg-surface-card/80 border border-border-subtle flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
                <p className="text-xs text-text-primary">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading mr-1.5">Arti</span>
                  {item.meaning}
                </p>
              </div>
            ) : undefined
          }
          onNext={() => { setSel([]); setChecked(null); q.next(); }}
        />
      )}
    </RoomFrame>
  );
};
