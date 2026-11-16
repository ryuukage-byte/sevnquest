// Pemutar urutan goresan (view-only) untuk Writing Companion: animasi hanzi-writer + diagram langkah
// per goresan yang mudah ditiru di kertas. Tidak ada kanvas menulis: pengguna menulis di buku sendiri.

import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Footprints, Loader2, Pause, Play, Repeat, RotateCcw } from 'lucide-react';
import { fetchSingleCharStrokeData } from '../../learning/KanjiWritingCanvas';
import { lookupKanji } from '../../../engine/writingCompanion/companion';
import { playSound } from '../../../utils/audio';

interface StrokeData {
  strokes: string[];
  medians: number[][][];
}

interface Props {
  chars: string[];
  soundEnabled?: boolean;
}

const SPEEDS = [
  { value: 0.5, label: 'Pelan' },
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Cepat' },
];

function readThemeColors() {
  if (typeof document === 'undefined') return { ink: '#262420', outline: 'rgba(120,120,120,0.25)' };
  const cs = getComputedStyle(document.documentElement);
  const ink = cs.getPropertyValue('--color-text-primary').trim() || '#262420';
  return { ink, outline: 'rgba(128, 128, 140, 0.22)' };
}

function useThemeColors() {
  const [colors, setColors] = useState(readThemeColors);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readThemeColors()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

/** Satu kotak diagram: goresan sebelumnya tebal, goresan ke-`step` merah + titik awal bernomor. */
const StepCell: React.FC<{ data: StrokeData; step: number }> = ({ data, step }) => {
  const start = data.medians[step]?.[0];
  return (
    <figure className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 1024 1024" className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-surface-inset border border-border-subtle" aria-hidden="true">
        <line x1="512" y1="0" x2="512" y2="1024" className="stroke-border-subtle" strokeWidth="6" strokeDasharray="24 24" />
        <line x1="0" y1="512" x2="1024" y2="512" className="stroke-border-subtle" strokeWidth="6" strokeDasharray="24 24" />
        <g transform="translate(0, 900) scale(1, -1)">
          {data.strokes.map((d, i) => (
            <path key={i} d={d} className={i < step ? 'fill-text-primary' : i === step ? 'fill-wine-accent' : 'fill-text-muted opacity-15'} />
          ))}
          {start && <circle cx={start[0]} cy={start[1]} r="44" className="fill-gold" />}
        </g>
      </svg>
      <figcaption className="text-[10px] font-mono text-text-muted">{step + 1}</figcaption>
    </figure>
  );
};

export const StrokeOrderPlayer: React.FC<Props> = ({ chars, soundEnabled = true }) => {
  const [active, setActive] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [looping, setLooping] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<StrokeData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const hostRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const colors = useThemeColors();
  const char = chars[Math.min(active, chars.length - 1)];
  const click = () => playSound('click', soundEnabled);

  useEffect(() => { setActive(0); }, [chars.join('')]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !char) return;
    let cancelled = false;
    host.innerHTML = '';
    setStatus('loading');
    setData(null);
    setStepIdx(0);
    setLooping(false);
    const size = Math.min(220, Math.max(160, host.clientWidth || 200));
    const writer = HanziWriter.create(host, char, {
      width: size,
      height: size,
      padding: 12,
      showOutline: true,
      showCharacter: false,
      strokeAnimationSpeed: speed,
      delayBetweenStrokes: Math.round(260 / speed),
      strokeColor: colors.ink,
      outlineColor: colors.outline,
      highlightColor: '#e2555b',
      charDataLoader: (c, onLoad, onError) => {
        fetchSingleCharStrokeData(c)
          .then(d => {
            if (cancelled) return;
            setData(d as StrokeData);
            setStatus('ready');
            onLoad(d);
          })
          .catch(err => {
            if (cancelled) return;
            setStatus('error');
            onError(err);
          });
      },
      onLoadCharDataSuccess: () => {
        if (!cancelled) writer.animateCharacter();
      },
    });
    writerRef.current = writer;
    return () => {
      cancelled = true;
      writer.pauseAnimation().catch(() => undefined);
      writerRef.current = null;
      host.innerHTML = '';
    };
    // Warna & kecepatan baru dipakai saat huruf dibuat ulang; perubahan kecepatan juga membuat ulang.
  }, [char, speed, colors.ink]);

  const play = async () => {
    const w = writerRef.current;
    if (!w) return;
    click();
    setLooping(false);
    setStepIdx(0);
    await w.hideCharacter();
    w.animateCharacter();
  };

  const toggleLoop = async () => {
    const w = writerRef.current;
    if (!w) return;
    click();
    if (looping) {
      await w.pauseAnimation();
      await w.showCharacter();
      setLooping(false);
    } else {
      setLooping(true);
      await w.hideCharacter();
      w.loopCharacterAnimation();
    }
  };

  const step = async () => {
    const w = writerRef.current;
    if (!w || !data) return;
    click();
    if (looping) { await w.pauseAnimation(); setLooping(false); }
    const total = data.strokes.length;
    const next = stepIdx >= total ? 0 : stepIdx;
    if (next === 0) await w.hideCharacter();
    await w.animateStroke(next);
    setStepIdx(next + 1);
  };

  const kanji = char ? lookupKanji(char) : undefined;
  const total = data?.strokes.length ?? kanji?.strokeCount ?? 0;

  if (!chars.length) {
    return <p className="text-sm text-text-secondary">Bagian ini tidak memuat kanji atau kana yang bisa dianimasikan.</p>;
  }

  return (
    <div className="space-y-4">
      {chars.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pilih huruf">
          {chars.map((c, i) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => { click(); setActive(i); }}
              className={`ui-chip !p-0 w-10 h-10 inline-flex items-center justify-center text-lg font-jp ${i === active ? 'is-active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div className="relative shrink-0 w-[200px] h-[200px] rounded-2xl bg-surface-inset border border-border-subtle overflow-hidden">
          {/* Garis bantu kotak tulis (田字格) */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <line x1="50" y1="0" x2="50" y2="100" className="stroke-border-subtle" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="0" y1="50" x2="100" y2="50" className="stroke-border-subtle" strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>
          <div ref={hostRef} className="relative w-full h-full flex items-center justify-center" aria-label={`Animasi urutan goresan ${char}`} role="img" />
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center">
              <span className="text-5xl font-jp text-text-primary">{char}</span>
              <span className="text-[11px] text-text-muted">Data goresan belum tersedia (cek koneksi).</span>
            </div>
          )}
        </div>

        <div className="flex-1 w-full space-y-3">
          <div>
            <p className="text-3xl font-jp font-bold text-text-primary leading-none">{char}</p>
            <p className="text-xs text-text-secondary mt-1">
              {total ? `${total} goresan` : 'Jumlah goresan belum diketahui'}
              {kanji?.radical ? ` · radikal ${kanji.radical}${kanji.radicalName ? ` (${kanji.radicalName})` : ''}` : ''}
            </p>
            {kanji?.meaningId && <p className="text-sm text-text-primary mt-1">{kanji.meaningId}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={play} disabled={status !== 'ready'} className="btn-skeuo-indigo px-3 py-2 text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
              <Play className="w-3.5 h-3.5" /> Putar
            </button>
            <button type="button" onClick={step} disabled={status !== 'ready'} className="btn-physical-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
              {stepIdx >= total && total > 0 ? <RotateCcw className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
              {stepIdx >= total && total > 0 ? 'Ulang langkah' : `Goresan ${Math.min(stepIdx + 1, total || 1)}`}
            </button>
            <button type="button" onClick={toggleLoop} disabled={status !== 'ready'} aria-pressed={looping} className="btn-physical-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
              {looping ? <Pause className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />} {looping ? 'Henti' : 'Ulang terus'}
            </button>
          </div>

          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Kecepatan animasi">
            <span className="text-[11px] text-text-muted mr-1">Kecepatan</span>
            {SPEEDS.map(s => (
              <button key={s.value} type="button" role="radio" aria-checked={speed === s.value} onClick={() => { click(); setSpeed(s.value); }} className={`ui-chip px-2.5 py-1 text-[11px] font-bold ${speed === s.value ? 'is-active' : ''}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && data.strokes.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold-soft">Diagram langkah — tiru di kertas</h4>
          <p className="text-[11px] text-text-muted">Merah = goresan yang sedang ditulis, titik emas = titik awal goresan.</p>
          <div className="flex flex-wrap gap-2">
            {data.strokes.map((_, i) => <StepCell key={i} data={data} step={i} />)}
          </div>
        </section>
      )}
    </div>
  );
};
