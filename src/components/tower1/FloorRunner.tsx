// ==============================================================================
// TOWER 1 — LANTAI: peta ruangan → Room → hasil
// Satu lantai punya beberapa ruangan (Room). Ruangan dibuka berurutan; keluar di tengah
// lantai tidak menghilangkan ruangan yang sudah selesai.
// ==============================================================================

import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Coins, Lock, LogOut, Play, RotateCcw, Star, X } from 'lucide-react';
import { FloorSpec, Room, RoomOutcome } from '../../engine/tower1/types';
import { TOWER1_DOMAIN_LABEL, TOWER1_SKILL_LABEL } from '../../data/tower1/floors';
import { clearRoomOutcomes, loadRoomOutcomes, saveRoomOutcome } from '../../engine/tower1/progress';
import { playSound } from '../../utils/audio';
import { LessonRoomView } from './rooms/LessonRoomView';
import { ChoiceRoomView } from './rooms/ChoiceRoomView';
import { PairRoomView } from './rooms/PairRoomView';
import { BuildRoomView } from './rooms/BuildRoomView';
import { PickRoomView } from './rooms/PickRoomView';
import { SKILL_ICON } from './parts';

export interface FinishInfo {
  stars: 1 | 2 | 3;
  accuracy: number;
  firstClear: boolean;
  exp: number;
  gold: number;
  unlocked: { id: number; code: string; name: string }[];
  /** Lantai rekomendasi berikutnya yang sudah dibangun (null bila tidak ada). */
  next: { id: number; code: string; name: string } | null;
}

interface Props {
  spec: FloorSpec;
  rooms: Room[];
  soundEnabled: boolean;
  /** Mencatat penyelesaian dan mengembalikan ringkasan untuk layar hasil. */
  onFinish: (accuracy: number) => FinishInfo;
  onExit: () => void;
  onOpenFloor?: (id: number) => void;
}

type Stage = 'map' | 'room' | 'result';

export const FloorRunner: React.FC<Props> = ({ spec, rooms, soundEnabled, onFinish, onExit, onOpenFloor }) => {
  const [stage, setStage] = useState<Stage>('map');
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<Record<string, RoomOutcome>>(() => loadRoomOutcomes(spec.id));
  const [info, setInfo] = useState<FinishInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  const firstOpen = useMemo(() => {
    const i = rooms.findIndex(r => !done[r.id]);
    return i === -1 ? rooms.length : i;
  }, [rooms, done]);

  const completeRoom = (idx: number, outcome?: RoomOutcome) => {
    const nextDone = saveRoomOutcome(spec.id, rooms[idx].id, outcome ?? { correct: 0, total: 0 });
    setDone(nextDone);
    if (rooms.every(r => nextDone[r.id])) {
      const values = rooms.map(r => nextDone[r.id]);
      const total = values.reduce((s, o) => s + o.total, 0);
      const correct = values.reduce((s, o) => s + o.correct, 0);
      const accuracy = total > 0 ? (correct / total) * 100 : 100;
      setInfo(onFinish(accuracy));
      clearRoomOutcomes(spec.id);
      setStage('result');
      playSound('victory', soundEnabled);
    } else {
      // Lanjut langsung ke ruangan berikutnya yang belum selesai; peta hanya bila tidak ada.
      const next = rooms.findIndex((r, i) => i > idx && !nextDone[r.id]);
      if (next === -1) setStage('map');
      else {
        setActive(next);
        setStage('room');
      }
    }
  };

  const restart = () => {
    clearRoomOutcomes(spec.id);
    setDone({});
    setInfo(null);
    setAttempt(a => a + 1);
    setStage('map');
  };

  // --------------------------------------------------------------------------
  // HASIL
  // --------------------------------------------------------------------------
  if (stage === 'result' && info) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-fade-in">
        <div className="panel panel-stitched rounded-3xl p-5 sm:p-6 border border-border-subtle shadow-md space-y-5 text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading">Lantai {spec.code} selesai</span>
            <h2 className="text-xl font-bold text-text-primary font-heading">{spec.name}</h2>
          </div>

          <div className="flex items-center justify-center gap-2" aria-label={`${info.stars} bintang`}>
            {[1, 2, 3].map(n => (
              <Star key={n} className={`w-10 h-10 ${n <= info.stars ? 'text-gold fill-gold' : 'text-text-muted'}`} strokeWidth={n <= info.stars ? 1.5 : 1.25} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
              <span className="text-[10px] text-text-muted block">Akurasi</span>
              <span className="text-lg font-bold text-gold font-mono">{Math.round(info.accuracy)}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
              <span className="text-[10px] text-text-muted block">EXP</span>
              <span className="text-lg font-bold text-gold font-mono flex items-center justify-center gap-1">
                {info.firstClear ? `+${info.exp}` : '0'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
              <span className="text-[10px] text-text-muted block">Emas</span>
              <span className="text-lg font-bold text-gold font-mono flex items-center justify-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {info.firstClear ? `+${info.gold}` : '0'}
              </span>
            </div>
          </div>
          {!info.firstClear && (
            <p className="text-[11px] text-text-muted">Hadiah hanya diberikan pada penyelesaian pertama. Bintangmu tetap diperbarui bila lebih baik.</p>
          )}

          {info.unlocked.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner text-left space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading">Lantai baru terbuka</span>
              <div className="flex flex-wrap gap-1.5">
                {info.unlocked.map(u => (
                  <button key={u.id} type="button" onClick={() => onOpenFloor?.(u.id)} className="ui-chip px-3 py-1.5 text-xs font-bold">
                    {u.code} · {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {info.next && (
            <button
              type="button"
              onClick={() => onOpenFloor?.(info.next!.id)}
              className="btn-physical-primary w-full py-3 rounded-2xl font-bold text-sm font-heading flex items-center justify-center gap-2"
            >
              <span className="truncate">Lanjut: Lantai {info.next.code} · {info.next.name}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={onExit} className="btn-physical-secondary flex-1 py-3 rounded-2xl font-bold text-sm font-heading flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              <span>Kembali ke Menara</span>
            </button>
            <button type="button" onClick={restart} className="btn-physical-secondary flex-1 py-3 rounded-2xl font-bold text-sm font-heading flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Ulangi Lantai</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ROOM AKTIF
  // --------------------------------------------------------------------------
  if (stage === 'room') {
    const room = rooms[active];
    const key = `${attempt}-${room.id}`;
    return (
      <div className="w-full max-w-2xl mx-auto space-y-3 animate-fade-in">
        <div className="panel rounded-2xl px-3.5 py-2.5 border border-border-subtle shadow-sm flex items-center gap-3">
          <button type="button" onClick={() => setStage('map')} className="btn-physical-secondary p-2 rounded-xl shrink-0" aria-label="Kembali ke peta ruangan">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-primary font-heading truncate block">
              Lantai {spec.code} · Ruangan {active + 1}
            </span>
            <span className="text-[10px] text-text-muted truncate block">{room.title}</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-text-muted shrink-0">{active + 1}/{rooms.length}</span>
        </div>

        {room.kind === 'lesson' && <LessonRoomView key={key} room={room} soundEnabled={soundEnabled} onDone={() => completeRoom(active)} />}
        {room.kind === 'choice' && <ChoiceRoomView key={key} room={room} soundEnabled={soundEnabled} onDone={o => completeRoom(active, o)} />}
        {room.kind === 'pair' && <PairRoomView key={key} room={room} soundEnabled={soundEnabled} onDone={o => completeRoom(active, o)} />}
        {room.kind === 'build' && <BuildRoomView key={key} room={room} soundEnabled={soundEnabled} onDone={o => completeRoom(active, o)} />}
        {room.kind === 'pick' && <PickRoomView key={key} room={room} soundEnabled={soundEnabled} onDone={o => completeRoom(active, o)} />}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // PETA RUANGAN
  // --------------------------------------------------------------------------
  const doneCount = rooms.filter(r => done[r.id]).length;
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="panel panel-stitched rounded-3xl p-4 sm:p-5 border border-border-subtle shadow-md space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ui-icon-box w-14 h-14 rounded-2xl flex-col shrink-0">
              <span className="text-[9px] font-bold text-text-muted leading-none">LANTAI</span>
              <span className="text-xl font-black text-gold font-heading leading-tight">{spec.code}</span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">{TOWER1_DOMAIN_LABEL[spec.domain]}</span>
              <h2 className="text-lg font-bold text-text-primary font-heading leading-tight">{spec.name}</h2>
              <p className="text-xs text-text-secondary">{spec.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onExit} className="btn-physical-secondary p-2 rounded-xl shrink-0" aria-label="Kembali ke menara">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Ruangan selesai</span>
            <span className="font-mono font-bold text-gold">{doneCount}/{rooms.length}</span>
          </div>
          <div className="h-2 w-full rpg-progress-track rounded-full overflow-hidden">
            <div className="h-full bg-indigo rounded-full transition-all duration-300" style={{ width: `${(doneCount / rooms.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
          <span className="font-bold text-text-primary">Buktinya: </span>
          {spec.capability.signal}
        </p>
      </div>

      <ol className="relative space-y-2.5" aria-label="Ruangan di lantai ini">
        {rooms.map((room, i) => {
          const result = done[room.id];
          const isCurrent = i === firstOpen;
          const locked = i > firstOpen;
          const practice = room.kind !== 'lesson';
          return (
            <li key={room.id} className="flex items-stretch gap-3">
              {/* tiang penghubung antar-ruangan */}
              <div className="flex flex-col items-center w-9 shrink-0">
                <div className={`ui-icon-box w-9 h-9 rounded-xl shrink-0 ${isCurrent ? 'is-active text-gold' : ''}`}>
                  {result ? <Check className="w-4 h-4 text-state-success" /> : locked ? <Lock className="w-4 h-4 text-text-muted" /> : SKILL_ICON[room.skill]}
                </div>
                {i < rooms.length - 1 && <div className="flex-1 w-px bg-border-primary mt-1" />}
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  playSound('click', soundEnabled);
                  setActive(i);
                  setStage('room');
                }}
                className={`flex-1 min-w-0 text-left rounded-2xl p-3.5 flex items-center gap-3 transition-all ${
                  isCurrent ? 'panel border border-border-primary shadow-md' : 'panel border border-border-subtle'
                } ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:border-border-primary'}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading block">
                    Ruangan {i + 1} · {TOWER1_SKILL_LABEL[room.skill]}
                  </span>
                  <span className="text-sm font-bold text-text-primary font-heading truncate block">{room.title}</span>
                  {result && practice && (
                    <span className="text-[11px] text-text-secondary">Benar pertama kali: <strong className="font-mono text-gold">{result.correct}/{result.total}</strong></span>
                  )}
                  {room.kind !== 'lesson' && 'passRatio' in room && room.passRatio ? (
                    <span className="text-[10px] text-text-muted block">Ujian · butuh {Math.round(room.passRatio * 100)}%</span>
                  ) : null}
                </div>
                {isCurrent && (
                  <span className="btn-physical-primary px-3 py-2 rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 shrink-0">
                    <Play className="w-3.5 h-3.5" />
                    {doneCount === 0 ? 'Mulai' : 'Lanjut'}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {doneCount > 0 && (
        <button type="button" onClick={restart} className="btn-physical-secondary w-full py-2.5 rounded-2xl text-xs font-bold font-heading flex items-center justify-center gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Mulai Lantai dari Awal</span>
        </button>
      )}
    </div>
  );
};
