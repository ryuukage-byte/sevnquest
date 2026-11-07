// Kartu Recall untuk kalimat Choukai yang disimpan pemain (sentence mining).
// Putar potongan video kalimat itu -> pilih kata yang hilang -> transkrip lengkap & terjemahan terbuka.
// Hasil dinilai sistem (pilihan benar/salah), sesuai aturan Recall: tidak ada penilaian diri.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Play, RotateCcw, XCircle } from 'lucide-react';
import { YouTubePlayer, type PlayerControl } from '../dungeon/YouTubePlayer';
import { loadChoukaiTranscript } from '../../data/choukaiTranscripts';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { analyzeCaptionLines } from '../../engine/textStudy/captionAnalysis';
import { BLANK, buildSentenceCloze, parseChoukaiSentenceId } from '../../engine/choukaiSentence/choukaiSentence';
import type { CaptionLineInput } from '../../engine/textStudy/captionAnalysis';

interface Props {
  itemId: string;
  /** Memutar target kata antar sesi. */
  seed: number;
  showFurigana?: boolean;
  isLast: boolean;
  onResult: (correct: boolean) => void;
  onNext: () => void;
}

type LoadState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; line: CaptionLineInput };

const POOL = Object.values(KOTOBA_DATABASE).map(k => ({ id: k.id, word: k.word, jlpt: k.jlpt }));

export const ChoukaiSentenceRecall: React.FC<Props> = ({ itemId, seed, isLast, onResult, onNext }) => {
  const ref = useMemo(() => parseChoukaiSentenceId(itemId), [itemId]);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [picked, setPicked] = useState<number | null>(null);
  const [heard, setHeard] = useState(false);
  const controlRef = useRef<PlayerControl | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    setPicked(null);
    setHeard(false);
    if (!ref) {
      setState({ status: 'missing' });
      return;
    }
    loadChoukaiTranscript(ref.videoId)
      .then(t => {
        if (!alive) return;
        const line = t?.lines.find(l => Math.round(l.startMs) === ref.startMs);
        setState(line ? { status: 'ready', line } : { status: 'missing' });
      })
      .catch(() => alive && setState({ status: 'missing' }));
    return () => {
      alive = false;
    };
  }, [ref]);

  const cloze = useMemo(() => {
    if (state.status !== 'ready') return null;
    const words = analyzeCaptionLines([state.line]).perLine[0]?.words ?? [];
    return buildSentenceCloze(state.line.text, words, POOL, seed);
  }, [state, seed]);

  const play = () => {
    if (state.status !== 'ready') return;
    setHeard(true);
    controlRef.current?.setPauseAt(state.line.endMs);
    controlRef.current?.seekToMs(state.line.startMs);
  };

  const choose = (i: number) => {
    if (picked !== null || !cloze) return;
    setPicked(i);
    onResult(i === cloze.correctIndex);
  };

  const nextBtn = (
    <button type="button" onClick={onNext} className="rpg-btn rpg-btn-primary w-full py-3 text-xs sm:text-sm gap-2">
      <span>{isLast ? 'Selesai' : 'Materi Berikutnya'}</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  );

  if (state.status === 'loading') {
    return <p className="text-xs text-text-secondary text-center py-6">Memuat kalimat…</p>;
  }
  if (state.status === 'missing' || !ref) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-text-secondary text-center py-4">Transkrip kalimat ini tidak ditemukan lagi, jadi kartunya dilewati.</p>
        {nextBtn}
      </div>
    );
  }

  const answered = picked !== null;
  return (
    <div className="space-y-4 pt-1">
      <p className="text-xs text-text-secondary text-center">Dengarkan kalimatnya, lalu pilih kata yang hilang.</p>
      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border-subtle bg-black">
        <YouTubePlayer key={ref.videoId} videoId={ref.videoId} controlRef={controlRef} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={play} className="btn-skeuo-gold flex-1 px-4 py-2.5 text-xs">
          {heard ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />} {heard ? 'Putar ulang kalimat' : 'Putar kalimat'}
        </button>
      </div>

      {cloze ? (
        <>
          <p className="font-jp text-lg sm:text-xl text-text-primary text-center leading-relaxed">
            {answered ? (
              <>
                {cloze.masked.split(BLANK)[0]}
                <span className="text-gold font-bold underline underline-offset-4">{cloze.target.surface}</span>
                {cloze.masked.split(BLANK)[1]}
              </>
            ) : cloze.masked}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {cloze.options.map((opt, i) => {
              const isCorrect = i === cloze.correctIndex;
              const tone = !answered ? 'btn-physical-secondary'
                : isCorrect ? 'border-gold bg-gold/15 text-text-primary'
                : i === picked ? 'border-border-subtle opacity-70' : 'border-border-subtle opacity-40';
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={answered}
                  onClick={() => choose(i)}
                  className={`px-3 py-3 rounded-xl border font-jp text-base flex items-center justify-center gap-2 ${tone}`}
                >
                  {opt}
                  {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-gold" />}
                  {answered && i === picked && !isCorrect && <XCircle className="w-4 h-4 text-text-muted" />}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
              <p className="text-xs text-text-secondary">
                <strong className="text-text-primary font-jp">{cloze.target.item.word}</strong>
                {cloze.target.item.reading ? ` (${cloze.target.item.reading})` : ''}
                {cloze.target.item.meaningId ? ` — ${cloze.target.item.meaningId}` : ''}
              </p>
              {state.line.translation && <p className="text-xs text-text-secondary">{state.line.translation}</p>}
              {nextBtn}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="font-jp text-lg text-text-primary text-center">{state.line.text}</p>
          <p className="text-xs text-text-muted text-center">Kalimat ini tidak punya kata dari kamus untuk diuji, jadi kartunya dilewati.</p>
          {nextBtn}
        </div>
      )}
    </div>
  );
};
