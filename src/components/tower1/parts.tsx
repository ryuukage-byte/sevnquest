// ==============================================================================
// TOWER 1 — KOMPONEN BERSAMA (furigana, suara, kerangka Room, umpan balik)
// Material visual mengikuti DESIGN.md: panel kulit berjahit, wadah cekung solid,
// tanpa gradient/glow; aksen warna hanya pada teks, ikon, dan badge kecil.
// ==============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CheckCircle2, Ear, Languages, MessageSquare, PenLine, Shapes, Volume2, XCircle } from 'lucide-react';
import { RoomSkill } from '../../engine/tower1/types';
import { TOWER1_SKILL_LABEL } from '../../data/tower1/floors';
import { parseRuby } from '../../engine/tower1/jp';
import { speakJapanese, stopSpeaking } from '../../utils/audio';

/** Teks Jepang dengan markup furigana "[漢字|かんじ]". */
export const Jp: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <span className={`font-jp ${className}`}>
    {parseRuby(text).map((p, i) =>
      p.ruby ? (
        <ruby key={i}>
          {p.base}
          <rt className="text-[0.5em] font-bold text-gold tracking-normal">{p.ruby}</rt>
        </ruby>
      ) : (
        <React.Fragment key={i}>{p.base}</React.Fragment>
      )
    )}
  </span>
);

/** true bila perangkat punya suara Jepang. Suara dimuat asinkron, jadi dipantau. */
export function useJapaneseVoice(): boolean {
  const [ok, setOk] = useState(() => detectVoice());
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const update = () => setOk(detectVoice());
    window.speechSynthesis.addEventListener?.('voiceschanged', update);
    update();
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', update);
  }, []);
  return ok;
}

function detectVoice(): boolean {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.getVoices().some(v => v.lang?.toLowerCase().startsWith('ja'));
  } catch {
    return false;
  }
}

export const SpeakButton: React.FC<{
  text: string;
  enabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  autoPlayKey?: string | number;
}> = ({ text, enabled = true, size = 'md', label = 'Dengarkan', autoPlayKey }) => {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stopSpeaking(); };
  }, []);

  // Tombol ditekan pemain selalu berbunyi (tidak ikut saklar efek suara); hanya putar-otomatis yang mengikutinya.
  const play = () => {
    const started = Date.now();
    setPlaying(true);
    setFailed(false);
    speakJapanese(text, 0.85).finally(() => {
      if (!mounted.current) return;
      setPlaying(false);
      // Selesai nyaris seketika = tidak ada suara yang benar-benar terputar.
      if (Date.now() - started < 250) setFailed(true);
    });
  };

  useEffect(() => {
    if (autoPlayKey === undefined || !enabled) return;
    const t = window.setTimeout(play, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayKey]);

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      title={label}
      className={`btn-physical-secondary rounded-xl inline-flex items-center justify-center gap-1.5 text-gold ${
        size === 'sm' ? 'p-1.5' : 'p-2.5'
      }`}
    >
      <Volume2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
      {playing && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
      {failed && <span className="text-[10px] font-bold text-wine-accent">Suara tidak terputar</span>}
    </button>
  );
};

/** Pita ketukan (mora): satu kotak per ketukan. */
export const BeatStrip: React.FC<{ beats: string[]; className?: string }> = ({ beats, className = '' }) => (
  <div className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`} aria-label={`${beats.length} ketukan`}>
    {beats.map((b, i) => (
      <div key={i} className="flex flex-col items-center gap-1">
        <div className="min-w-[2.75rem] h-11 px-2 rounded-xl bg-surface-inset border border-border-subtle shadow-inner flex items-center justify-center text-lg font-jp font-bold text-text-primary">
          {b}
        </div>
        <span className="text-[10px] font-mono font-bold text-text-muted">{i + 1}</span>
      </div>
    ))}
  </div>
);

/** Ikon tiap jenis Room. */
export const SKILL_ICON: Record<RoomSkill, React.ReactNode> = {
  pola: <Shapes className="w-4 h-4" />,
  bunyi: <Ear className="w-4 h-4" />,
  tulisan: <BookOpen className="w-4 h-4" />,
  kata: <Languages className="w-4 h-4" />,
  kalimat: <MessageSquare className="w-4 h-4" />,
  menulis: <PenLine className="w-4 h-4" />
};

/** Kerangka Room latihan: jenis Room, tahap (kicker), judul, bar progres. */
export const RoomFrame: React.FC<{
  skill: RoomSkill;
  kicker?: string;
  title: string;
  progress?: { done: number; total: number };
  children: React.ReactNode;
}> = ({ skill, kicker, title, progress, children }) => (
  <section className="panel panel-stitched rounded-3xl p-4 sm:p-6 border border-border-subtle shadow-md space-y-4">
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading block">
            {TOWER1_SKILL_LABEL[skill]}{kicker ? ` · ${kicker}` : ''}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading truncate">{title}</h2>
        </div>
        {progress && (
          <span className="text-[11px] font-mono font-bold text-text-muted shrink-0">
            {Math.min(progress.done + 1, progress.total)} / {progress.total}
          </span>
        )}
      </div>
      {progress && (
        <div className="h-2 w-full rpg-progress-track rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo rounded-full transition-all duration-300"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      )}
    </header>
    {children}
  </section>
);

/** Pita umpan balik setelah menjawab (satu-satunya tempat outline hijau/merah yang diizinkan). */
export const Feedback: React.FC<{
  correct: boolean;
  explain?: string;
  extra?: React.ReactNode;
  onNext: () => void;
  nextLabel?: string;
}> = ({ correct, explain, extra, onNext, nextLabel = 'Lanjut' }) => (
  <div
    role="status"
    className={`p-4 rounded-2xl border text-xs space-y-3 ${
      correct ? 'bg-state-success/10 border-state-success/30' : 'bg-wine-accent/10 border-border-subtle'
    }`}
  >
    <div className="font-bold flex items-center gap-1.5 font-heading text-sm">
      {correct ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-state-success" />
          <span className="text-state-success">Tepat!</span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 text-wine-accent" />
          <span className="text-wine-accent">Belum tepat. Soal ini akan kembali.</span>
        </>
      )}
    </div>
    {explain && <p className="text-text-primary leading-relaxed text-xs sm:text-sm">{explain}</p>}
    {extra}
    <button
      type="button"
      onClick={onNext}
      autoFocus
      className="btn-physical-primary w-full py-3 rounded-2xl font-bold text-sm font-heading"
    >
      {nextLabel}
    </button>
  </div>
);

/** Layar "belum lulus" untuk Room ujian. */
export const RetryPanel: React.FC<{ ratio: number; need: number; onRetry: () => void }> = ({ ratio, need, onRetry }) => (
  <div className="text-center space-y-4 py-4">
    <div className="ui-icon-box w-14 h-14 rounded-2xl mx-auto text-wine-accent">
      <XCircle className="w-7 h-7" />
    </div>
    <div className="space-y-1">
      <h3 className="text-base font-bold text-text-primary font-heading">Belum cukup untuk lanjut</h3>
      <p className="text-xs sm:text-sm text-text-secondary">
        Akurasi percobaan pertamamu <strong className="text-gold font-mono">{Math.round(ratio * 100)}%</strong>; ujian ini
        butuh <strong className="text-gold font-mono">{Math.round(need * 100)}%</strong>. Itu wajar. Ulangi untuk menguatkan ingatan.
      </p>
    </div>
    <button type="button" onClick={onRetry} className="btn-physical-primary py-3 px-6 rounded-2xl font-bold text-sm font-heading">
      Ulangi Ujian
    </button>
  </div>
);

/** Penutup Room latihan: ringkasan akurasi percobaan-pertama + tombol lanjut. */
export const RoomComplete: React.FC<{ correct: number; total: number; onContinue: () => void }> = ({ correct, total, onContinue }) => (
  <div className="text-center space-y-4 py-4">
    <div className="ui-icon-box w-14 h-14 rounded-2xl mx-auto text-state-success">
      <CheckCircle2 className="w-7 h-7" />
    </div>
    <div className="space-y-1">
      <h3 className="text-base font-bold text-text-primary font-heading">Room selesai</h3>
      <p className="text-xs sm:text-sm text-text-secondary">
        Benar pada percobaan pertama:{' '}
        <strong className="text-gold font-mono">{correct} / {total}</strong>
      </p>
    </div>
    <button type="button" onClick={onContinue} className="btn-physical-primary py-3 px-6 rounded-2xl font-bold text-sm font-heading">
      Lanjut
    </button>
  </div>
);

/**
 * Modal harus dirender ke document.body: pembungkus tab memakai will-change: transform,
 * yang membuat `position: fixed` di dalamnya menempel ke pembungkus (bukan ke layar).
 */
export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  typeof document === 'undefined' ? null : createPortal(children, document.body);
