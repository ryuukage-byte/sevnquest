import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Crown } from 'lucide-react';
import { LessonRoom, LessonStep } from '../../../engine/tower1/types';
import { readingOf } from '../../../engine/tower1/jp';
import { speakJapanese } from '../../../utils/audio';
import { BeatStrip, Jp, RoomFrame, SpeakButton, useJapaneseVoice } from '../parts';

interface Props {
  room: LessonRoom;
  soundEnabled: boolean;
  onDone: () => void;
}

const StepBody: React.FC<{ step: LessonStep; soundEnabled: boolean; hasVoice: boolean }> = ({ step, soundEnabled, hasVoice }) => {
  const wideGrid = (step.grid ?? []).some(c => Array.from(c.glyph).length > 3);
  return (
    <div className="space-y-4">
      {step.title && <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading">{step.title}</h3>}

      {step.glyph && (
        <div className="p-5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Jp text={step.glyph} className="text-5xl sm:text-6xl font-bold text-text-primary leading-[1.5]" />
            {step.say && hasVoice && <SpeakButton text={step.say} enabled={soundEnabled} />}
          </div>
          {step.reading && <span className="text-sm font-mono font-bold text-gold">{step.reading}</span>}
        </div>
      )}

      {step.body && <p className="text-sm text-text-secondary leading-relaxed">{step.body}</p>}

      {step.grid && (
        <div className={`grid gap-2 ${wideGrid ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'}`}>
          {step.grid.map((cell, i) => {
            const speak = cell.say && hasVoice && soundEnabled ? () => speakJapanese(readingOf(cell.say!), 0.85) : undefined;
            return (
              <button
                key={i}
                type="button"
                onClick={speak}
                disabled={!speak}
                className="panel rounded-xl p-2.5 flex flex-col items-center justify-center gap-0.5 hover:border-border-primary disabled:cursor-default min-h-[64px]"
              >
                <Jp text={cell.glyph} className="text-2xl sm:text-3xl font-bold text-text-primary leading-[1.4]" />
                {cell.sub && <span className="text-[10px] sm:text-[11px] text-text-muted font-medium text-center leading-tight">{cell.sub}</span>}
              </button>
            );
          })}
        </div>
      )}

      {step.beats && (
        <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
          <BeatStrip beats={step.beats} />
          <p className="text-center text-[11px] text-text-muted mt-2">{step.beats.length} ketukan</p>
        </div>
      )}

      {step.chunks && (
        <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
          <div className="flex flex-wrap items-end justify-center gap-2">
            {step.chunks.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`px-3 py-2 rounded-xl border text-xl sm:text-2xl font-bold flex items-center gap-1.5 ${
                    c.king ? 'bg-surface-elevated border-border-primary text-gold' : 'bg-surface-card border-border-subtle text-text-primary'
                  }`}
                >
                  {c.king && <Crown className="w-4 h-4 text-gold" />}
                  <Jp text={c.text} className="leading-[1.5]" />
                </div>
                {c.role && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${c.king ? 'text-gold' : 'text-text-muted'}`}>{c.role}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {step.compare && (
        <dl className="rounded-2xl bg-surface-inset border border-border-subtle shadow-inner divide-y divide-border-subtle overflow-hidden">
          {step.compare.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs sm:text-sm">
              <dt className="font-bold text-text-primary font-jp">{row.label}</dt>
              <dd className="text-text-secondary text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {step.example && (
        <div className="p-3.5 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Jp text={step.example.jp} className="text-lg sm:text-xl font-bold text-text-primary leading-[1.8] block" />
            <span className="text-xs text-text-secondary">{step.example.meaning}</span>
          </div>
          {step.example.say && hasVoice && <SpeakButton text={step.example.say} enabled={soundEnabled} size="sm" />}
        </div>
      )}
    </div>
  );
};

export const LessonRoomView: React.FC<Props> = ({ room, soundEnabled, onDone }) => {
  const [i, setI] = useState(0);
  const hasVoice = useJapaneseVoice();
  const step = room.steps[i];
  const last = i === room.steps.length - 1;

  return (
    <RoomFrame skill={room.skill} kicker={room.kicker} title={room.title} progress={{ done: i, total: room.steps.length }}>
      <StepBody key={i} step={step} soundEnabled={soundEnabled} hasVoice={hasVoice} />
      <div className="flex gap-2 pt-1">
        {i > 0 && (
          <button
            type="button"
            onClick={() => setI(i - 1)}
            className="btn-physical-secondary px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="btn-physical-primary flex-1 py-3 rounded-2xl font-bold text-sm font-heading flex items-center justify-center gap-2"
        >
          <span>{last ? 'Selesai Membaca' : 'Lanjut'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </RoomFrame>
  );
};
