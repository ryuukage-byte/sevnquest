import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Headphones, Music, Clapperboard, ChevronRight, ChevronLeft, Play, Sparkles } from 'lucide-react';
import { parseYouTubeId } from '../../utils/youtube';
import { playSound } from '../../utils/audio';
import { ImmersionStage } from './ImmersionStage';
import { ImmersionTemplatePanel } from './ImmersionTemplatePanel';
import type { ImmersionTemplate } from '../../engine/textStudy/immersionTemplate';
import type { CaptionState, LyricLine, SubDungeon } from './immersionTypes';

interface Props {
  onClose: () => void;
  soundEnabled?: boolean;
}

const SUB_DUNGEONS: { id: SubDungeon; title: string; icon: React.ComponentType<{ className?: string }>; description: string; placeholder: string }[] = [
  {
    id: 'music',
    title: 'Ruang Musik',
    icon: Music,
    description: 'Dengarkan lagu Jepang, ikuti liriknya baris demi baris.',
    placeholder: 'Tempel link lagu YouTube…',
  },
  {
    id: 'video',
    title: 'Ruang Video',
    icon: Clapperboard,
    description: 'Tonton video Jepang apa pun, bedah subtitle-nya jadi bahan belajar.',
    placeholder: 'Tempel link video YouTube…',
  },
];

const CAPTION_ERRORS: Record<string, string> = {
  no_captions: 'Video ini tidak punya subtitle.',
  no_japanese: 'Video ini tidak punya subtitle bahasa Jepang.',
  unavailable: 'Video tidak tersedia atau dibatasi (usia/login), jadi subtitle tidak bisa diambil.',
  blocked: 'YouTube menolak permintaan dari server. Coba lagi nanti.',
};

export const ImmersionDungeonModal: React.FC<Props> = ({ onClose, soundEnabled = true }) => {
  const [sub, setSub] = useState<SubDungeon | null>(null);
  const [input, setInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [captions, setCaptions] = useState<CaptionState>({ status: 'idle' });
  // Subtitle YouTube yang terambil (dipakai prompt AI) dan template JSON yang dimuat pengguna.
  const [fetched, setFetched] = useState<LyricLine[] | null>(null);
  const [template, setTemplate] = useState<ImmersionTemplate | null>(null);
  const [showAi, setShowAi] = useState(false);

  const click = () => playSound('click', soundEnabled);
  const current = SUB_DUNGEONS.find(s => s.id === sub);

  useEffect(() => {
    if (!videoId) {
      setCaptions({ status: 'idle' });
      setFetched(null);
      return;
    }
    if (template && template.videoId === videoId) {
      setCaptions({ status: 'ready', lines: template.lines, kind: 'template' });
      return;
    }
    setFetched(null);
    const ctrl = new AbortController();
    setCaptions({ status: 'loading' });
    fetch(`/api/captions?v=${videoId}`, { signal: ctrl.signal })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(CAPTION_ERRORS[body?.error] ?? 'Subtitle gagal diambil.');
        return body as { kind: 'manual' | 'auto'; lines: LyricLine[] };
      })
      .then(body => {
        setFetched(body.lines);
        setCaptions({ status: 'ready', lines: body.lines, kind: body.kind });
      })
      .catch(err => {
        if (ctrl.signal.aborted) return;
        setCaptions({ status: 'error', message: err instanceof Error && err.message ? err.message : 'Subtitle gagal diambil.' });
      });
    return () => ctrl.abort();
  }, [videoId, template]);

  const backToChoice = () => {
    click();
    setSub(null);
    setInput('');
    setVideoId(null);
    setTemplate(null);
    setShowAi(false);
    setError(false);
  };

  const handleLoad = () => {
    click();
    const id = parseYouTubeId(input);
    setTemplate(null); // tekan Putar = kembali memakai subtitle YouTube
    setVideoId(id);
    setError(!id);
  };

  const loadTemplate = (t: ImmersionTemplate) => {
    setInput(`https://youtu.be/${t.videoId}`);
    setError(false);
    setTemplate(t);
    setVideoId(t.videoId);
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className={`panel panel-stitched relative w-full ${videoId ? 'max-w-6xl' : 'max-w-3xl'} max-h-[94vh] flex flex-col border border-border-subtle rounded-3xl shadow-2xl overflow-hidden bg-surface-card animate-scale-up`}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-heading font-black text-text-primary truncate">Dungeon Imersi{current ? ` · ${current.title}` : ''}</h3>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold/20 text-gold border border-border-subtle uppercase tracking-wider">
                  Dalam pengembangan
                </span>
              </div>
              <p className="text-[11px] text-text-secondary truncate">Belajar dari konten Jepang yang kamu suka.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={() => { click(); onClose(); }} className="btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer p-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!current && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUB_DUNGEONS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { click(); setSub(s.id); }}
                  className="panel panel-stitched p-5 rounded-3xl border border-border-subtle bg-surface-card hover:bg-surface-elevated transition-all cursor-pointer text-left space-y-3 group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary group-hover:text-gold transition-colors shadow-inner">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-text-primary font-heading group-hover:text-gold transition-colors">{s.title}</h4>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-body">{s.description}</p>
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo font-heading">
                    Masuk <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {current && (
            <div className="space-y-4">
              <div className="space-y-3">
                <button type="button" onClick={backToChoice} className="flex items-center gap-1 text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer">
                  <ChevronLeft className="w-4 h-4" /> Pilih ruang lain
                </button>

                {!videoId && <p className="text-sm text-text-secondary">{current.description}</p>}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleLoad(); }}
                    placeholder={current.placeholder}
                    className="flex-1 min-w-0 px-4 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-sm font-body text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary shadow-inner"
                  />
                  <button
                    type="button"
                    disabled={!input.trim()}
                    onClick={handleLoad}
                    className="btn-physical-primary shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-heading font-black text-sm select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4 text-gold" />
                    <span>Putar</span>
                  </button>
                </div>

                {error && <p className="text-xs text-crimson font-medium">Link YouTube tidak dikenali. Coba salin ulang dari tombol Bagikan.</p>}

                <button
                  type="button"
                  onClick={() => setShowAi(v => !v)}
                  className={`ui-chip px-3 py-1.5 text-xs font-heading font-bold cursor-pointer flex items-center gap-1.5 ${showAi ? 'is-active' : ''}`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Prompt AI &amp; JSON
                </button>
                {showAi && <ImmersionTemplatePanel videoId={videoId} fetchedLines={fetched} onLoad={loadTemplate} />}
              </div>

              {videoId && <ImmersionStage videoId={videoId} captions={captions} />}

              <p className="text-[11px] text-text-muted leading-relaxed">
                Pemutar memakai embed resmi YouTube. Subtitle diambil dari YouTube dan hanya ditampilkan untukmu, tidak disimpan di server.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>,
    document.body
  );
};
