import React, { useState } from 'react';
import { Headphones } from 'lucide-react';
import { ChoiceRoom, RoomOutcome } from '../../../engine/tower1/types';
import { readingOf } from '../../../engine/tower1/jp';
import { playSound } from '../../../utils/audio';
import { usePracticeQueue } from '../usePracticeQueue';
import { BeatStrip, Feedback, Jp, RetryPanel, RoomComplete, RoomFrame, SpeakButton, useJapaneseVoice } from '../parts';

interface Props {
  room: ChoiceRoom;
  soundEnabled: boolean;
  onDone: (outcome: RoomOutcome) => void;
}

export const ChoiceRoomView: React.FC<Props> = ({ room, soundEnabled, onDone }) => {
  const q = usePracticeQueue(room.questions.length, room.passRatio);
  const [picked, setPicked] = useState<number | null>(null);
  const hasVoice = useJapaneseVoice();

  const question = q.current !== undefined ? room.questions[q.current] : undefined;

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
  if (!question) return null;

  const answered = picked !== null;
  const isCorrect = picked === question.answer;
  const listenBlocked = question.listenOnly && !hasVoice;
  // Ucapkan BACAAN (furigana menggantikan kanji), bukan kanji mentah: TTS sering salah membaca kanji,
  // sehingga suara yang keluar tidak cocok dengan pilihan jawaban yang tertulis dalam kana.
  const spoken = question.say ? readingOf(question.say) : undefined;

  const choose = (idx: number) => {
    if (answered) return;
    setPicked(idx);
    const ok = idx === question.answer;
    q.record(ok);
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
  };

  return (
    <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title} progress={q.progress}>
      <p className="text-sm text-text-secondary leading-relaxed">{question.prompt}</p>

      {/* Sorotan soal: glyph besar atau pemicu dengar */}
      <div className="p-5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-col items-center gap-3">
        {question.listenOnly ? (
          <>
            <div className="ui-icon-box w-14 h-14 rounded-2xl text-gold">
              <Headphones className="w-7 h-7" />
            </div>
            {spoken && hasVoice && <SpeakButton text={spoken} enabled={soundEnabled} label="Putar suara" autoPlayKey={`${q.pos}-${q.run}`} />}
            {listenBlocked && (
              <p className="text-[11px] text-text-muted text-center">
                Perangkat ini tidak punya suara Jepang. Teks dipakai sebagai gantinya:{' '}
                <strong className="text-text-primary font-jp text-base">{question.fallback ?? spoken}</strong>
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            {question.glyph && <Jp text={question.glyph} className="text-4xl sm:text-5xl font-bold text-text-primary leading-[1.6]" />}
            {spoken && hasVoice && <SpeakButton text={readingOf(question.say!)} enabled={soundEnabled} />}
          </div>
        )}
      </div>

      <div className="space-y-2" role="group" aria-label="Pilihan jawaban">
        {question.options.map((opt, idx) => {
          let style = 'panel hover:border-border-primary text-text-primary';
          if (answered) {
            if (idx === question.answer) style = 'bg-state-success/15 border-state-success text-state-success font-bold';
            else if (idx === picked) style = 'bg-wine-accent/15 border-border-subtle text-wine-accent font-bold';
            else style = 'bg-surface-inset border-border-subtle text-text-muted opacity-40';
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={answered}
              onClick={() => choose(idx)}
              className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left text-sm font-medium flex items-center gap-3 transition-all ${style}`}
            >
              <span className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle text-xs flex items-center justify-center font-mono font-bold text-indigo shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              <Jp text={opt} className="text-base leading-snug" />
            </button>
          );
        })}
      </div>

      {answered && (
        <Feedback
          correct={isCorrect}
          explain={question.explain}
          extra={question.reveal ? <BeatStrip beats={question.reveal} /> : undefined}
          onNext={() => { setPicked(null); q.next(); }}
        />
      )}
    </RoomFrame>
  );
};
