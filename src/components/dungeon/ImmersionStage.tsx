import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Plus, Check } from 'lucide-react';
import { analyzeCaptionLines, glossForWord } from '../../engine/textStudy/captionAnalysis';
import { useSavedWords, type SavedWord } from '../../hooks/useSavedWords';
import { activeLineIndex, formatMs, nextPause } from '../../utils/youtube';
import { wordsForLine } from '../../engine/textStudy/wordTiming';
import { KaraokeLine, createTimeStore, type LyricView } from './KaraokeLine';
import { YouTubePlayer, type PlayerControl } from './YouTubePlayer';
import { ImmersionSidebar } from './ImmersionSidebar';
import type { CaptionState, LyricLine } from './immersionTypes';

interface Props {
  videoId: string;
  captions: CaptionState;
}

const NO_LINES: LyricLine[] = [];
const RATES = [1, 0.75, 0.5];
const VIEW_KEY = 'sevnquest.immersion.view.v1';

function loadView(): LyricView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'sentence' ? 'sentence' : 'word';
  } catch {
    return 'word';
  }
}

export const ImmersionStage: React.FC<Props> = ({ videoId, captions }) => {
  const lines = captions.status === 'ready' ? captions.lines : NO_LINES;
  const analysis = useMemo(() => analyzeCaptionLines(lines), [lines]);
  const { saved, toggle } = useSavedWords();

  const controlRef = useRef<PlayerControl | null>(null);
  const timeStore = useRef(createTimeStore()).current;
  const [playedIdx, setPlayedIdx] = useState(-1);
  // Setelah jeda otomatis di akhir baris, kartu tetap menampilkan baris yang baru selesai.
  const [holdIdx, setHoldIdx] = useState<number | null>(null);
  const armedIdxRef = useRef(-1);
  const activeIdx = holdIdx ?? playedIdx;
  const [playing, setPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [showWords, setShowWords] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [view, setView] = useState<LyricView>(loadView);

  const changeView = (next: LyricView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch { /* penyimpanan diblokir: pilihan berlaku selama sesi */ }
  };
  const [pauseEachLine, setPauseEachLine] = useState(false);

  useEffect(() => {
    setPlayedIdx(-1);
    setHoldIdx(null);
    setPlaying(false);
    setRateIdx(0);
  }, [videoId]);

  // Jeda tiap baris: pasang batas jeda berikutnya setiap pemutaran dimulai atau baris berganti.
  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;
    const next = pauseEachLine && playing ? nextPause(lines, control.getTimeMs()) : null;
    armedIdxRef.current = next?.index ?? -1;
    control.setPauseAt(next?.ms ?? null);
  }, [pauseEachLine, playing, playedIdx, lines]);

  useEffect(() => {
    if (playing) setHoldIdx(null);
  }, [playing]);

  const handleTime = (ms: number) => {
    timeStore.set(ms);
    const idx = activeLineIndex(lines, ms);
    setPlayedIdx(prev => (prev === idx ? prev : idx));
  };

  const jump = (index: number) => {
    const line = lines[index];
    if (!line) return;
    setHoldIdx(null);
    controlRef.current?.seekToMs(line.startMs);
  };

  const cycleRate = () => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    controlRef.current?.setRate(RATES[next]);
  };

  const focused = activeIdx >= 0 ? analysis.perLine[activeIdx] : null;
  const focusedWords = useMemo(() => (focused ? wordsForLine(lines[focused.index]) : null), [focused, lines]);
  const glosses = useMemo(
    () => (focused && focusedWords ? focusedWords.words.map(w => glossForWord(w.text, focused.words)) : []),
    [focused, focusedWords]
  );
  const savedIds = useMemo(() => new Set(saved.map(w => w.id)), [saved]);
  const canStep = lines.length > 0;
  const hasTranslation = useMemo(() => lines.some(l => l.translation), [lines]);

  const saveWord = (w: NonNullable<typeof focused>['words'][number], line: NonNullable<typeof focused>): SavedWord => ({
    id: w.item.id,
    word: w.item.word,
    reading: w.item.reading,
    meaning: w.item.meaningId,
    jlpt: w.item.jlpt,
    videoId,
    startMs: line.startMs,
    line: line.text,
  });

  const iconBtn = 'btn-physical-secondary w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer p-0 disabled:opacity-40 disabled:cursor-not-allowed';
  const chip = (on: boolean) => `ui-chip px-3 py-1.5 text-xs font-heading font-bold cursor-pointer ${on ? 'is-active' : ''}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <div className="aspect-video w-full rounded-3xl overflow-hidden border border-border-subtle bg-black shadow-md">
          <YouTubePlayer key={videoId} videoId={videoId} onTime={handleTime} onPlayingChange={setPlaying}
            onBoundaryPause={() => setHoldIdx(armedIdxRef.current >= 0 ? armedIdxRef.current : null)}
            controlRef={controlRef}
          />
        </div>

        <div className="panel panel-stitched rounded-3xl bg-surface-card border border-border-subtle shadow-md p-4 sm:p-5 space-y-4">
          <div className="bg-surface-inset border border-border-subtle rounded-2xl shadow-inner p-4 min-h-36 space-y-3">
            {!focused ? (
              <p className="text-sm text-text-secondary text-center py-8">
                {captions.status === 'ready' ? 'Putar videonya, atau pilih sebuah baris di transkrip.' : 'Kalimat yang sedang diputar akan tampil di sini.'}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>Baris {focused.index + 1}/{lines.length}</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => changeView('sentence')} className={`ui-chip px-2.5 py-1 text-[10px] font-heading font-bold cursor-pointer ${view === 'sentence' ? 'is-active' : ''}`}>Per kalimat</button>
                    <button type="button" onClick={() => changeView('word')} className={`ui-chip px-2.5 py-1 text-[10px] font-heading font-bold cursor-pointer ${view === 'word' ? 'is-active' : ''}`}>Per kotoba</button>
                    <span className="ml-1">{formatMs(focused.startMs)}</span>
                  </div>
                </div>
                <div className="text-center">
                  {focusedWords && (
                    <KaraokeLine
                      words={focusedWords.words}
                      store={timeStore}
                      showFurigana={showFurigana}
                      view={view}
                      glosses={glosses}
                      onSeek={ms => controlRef.current?.seekToMs(ms)}
                      className={view === 'word' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}
                    />
                  )}
                </div>
                {showTranslation && lines[focused.index].translation && (
                  <p className="text-sm text-text-secondary text-center leading-relaxed">{lines[focused.index].translation}</p>
                )}
                {focusedWords?.estimated && (
                  <p className="text-[10px] text-text-muted text-center">Sorotan kata diperkirakan: subtitle ini tidak membawa waktu per kata.</p>
                )}

                {showWords && (
                  <div className="space-y-3 pt-3 border-t border-border-subtle">
                    {focused.words.length === 0 && focused.grammar.length === 0 && (
                      <p className="text-sm text-text-secondary text-center">Tidak ada kotoba atau pola di baris ini yang dikenali database.</p>
                    )}
                    {focused.words.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {focused.words.map(w => {
                          const isSaved = savedIds.has(w.item.id);
                          return (
                            <div key={w.item.id} className="flex items-start gap-2 text-sm leading-snug">
                              <button
                                type="button"
                                aria-label={isSaved ? 'Hapus dari Kata Saya' : 'Simpan ke Kata Saya'}
                                onClick={() => toggle(saveWord(w, focused))}
                                className={`ui-chip ${isSaved ? 'is-active' : ''} w-7 h-7 shrink-0 flex items-center justify-center p-0 cursor-pointer`}
                              >
                                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              </button>
                              <div className="min-w-0">
                                <span className="font-heading font-black text-text-primary">{w.item.word}</span>
                                {w.item.reading && w.item.reading !== w.item.word && <span className="text-text-secondary">（{w.item.reading}）</span>}
                                <span className="ml-1 text-[10px] font-mono text-text-muted">{w.item.jlpt}</span>
                                <div className="text-text-primary">{w.item.meaningId}</div>
                                {w.inflected && <div className="text-[11px] text-text-muted">Di teks: 「{w.surface}」</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {focused.grammar.length > 0 && (
                      <div className="space-y-1.5 pt-3 border-t border-border-subtle">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Kemungkinan pola</div>
                        {focused.grammar.map(g => (
                          <div key={g.item.id} className="text-sm leading-snug">
                            <b className="text-text-primary">{g.item.title}</b>
                            <span className="ml-2 text-xs font-mono text-gold">{g.item.formula}</span>
                            <div className="text-text-primary">{g.item.meaningId}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {captions.status === 'ready' && captions.kind === 'template' && (
            <p className="text-[11px] text-text-muted text-center">Data dari JSON yang kamu muat. Teks dan terjemahan sesuai isi JSON, bukan dari YouTube.</p>
          )}
          {captions.status === 'ready' && captions.kind === 'auto' && (
            <p className="text-[11px] text-text-muted text-center">Subtitle dibuat otomatis oleh YouTube, jadi bisa ada salah dengar.</p>
          )}

          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button type="button" aria-label="Ulang baris ini" disabled={activeIdx < 0} onClick={() => jump(activeIdx)} className={iconBtn}>
              <RotateCcw className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Baris sebelumnya" disabled={!canStep || activeIdx <= 0} onClick={() => jump(activeIdx - 1)} className={iconBtn}>
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => controlRef.current?.togglePlay()}
              className="btn-physical-primary h-11 px-6 rounded-2xl flex items-center gap-2 font-heading font-black text-sm cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{playing ? 'Jeda' : 'Putar'}</span>
            </button>
            <button type="button" aria-label="Baris berikutnya" disabled={!canStep || activeIdx >= lines.length - 1} onClick={() => jump(activeIdx + 1)} className={iconBtn}>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={cycleRate} className={chip(RATES[rateIdx] !== 1)}>Kecepatan {RATES[rateIdx]}×</button>
            <button type="button" onClick={() => setShowFurigana(v => !v)} className={chip(showFurigana)}>Furigana</button>
            <button type="button" onClick={() => setShowWords(v => !v)} className={chip(showWords)}>Arti kata</button>
            {hasTranslation && <button type="button" onClick={() => setShowTranslation(v => !v)} className={chip(showTranslation)}>Terjemahan</button>}
            <button type="button" onClick={() => setPauseEachLine(v => !v)} className={chip(pauseEachLine)}>Jeda tiap baris</button>
          </div>
        </div>
      </div>

      <ImmersionSidebar
        captions={captions}
        lines={lines}
        analysis={analysis}
        activeIndex={activeIdx}
        showFurigana={showFurigana}
        showTranslation={showTranslation}
        saved={saved}
        currentVideoId={videoId}
        onJump={jump}
        onSeekMs={ms => controlRef.current?.seekToMs(ms)}
        onRemoveSaved={toggle}
      />
    </div>
  );
};
