import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { CaptionAnalysis, TimedEntry } from '../../engine/textStudy/captionAnalysis';
import type { SavedWord } from '../../hooks/useSavedWords';
import { formatMs } from '../../utils/youtube';
import { RubyText } from '../learning/RubyText';
import type { CaptionState, LyricLine } from './immersionTypes';

type Tab = 'transkrip' | 'kotoba' | 'pola' | 'simpanan';

interface Props {
  captions: CaptionState;
  lines: LyricLine[];
  analysis: CaptionAnalysis;
  activeIndex: number;
  showFurigana: boolean;
  showTranslation: boolean;
  saved: SavedWord[];
  currentVideoId: string;
  onJump: (index: number) => void;
  onSeekMs: (ms: number) => void;
  onRemoveSaved: (word: SavedWord) => void;
}

const MAX_TIME_CHIPS = 4;
const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';

const TimeChips: React.FC<{ indexes: number[]; lines: LyricLine[]; onJump: (index: number) => void }> = ({ indexes, lines, onJump }) => (
  <div className="flex flex-wrap items-center gap-1 mt-2">
    {indexes.slice(0, MAX_TIME_CHIPS).map(i => (
      <button key={i} type="button" onClick={() => onJump(i)} className="ui-chip px-2 py-0.5 text-[10px] font-mono cursor-pointer">
        {formatMs(lines[i].startMs)}
      </button>
    ))}
    {indexes.length > MAX_TIME_CHIPS && <span className="text-[10px] font-mono text-text-muted">+{indexes.length - MAX_TIME_CHIPS}</span>}
  </div>
);

function EntryList<T extends { id: string }>({
  entries,
  lines,
  onJump,
  head,
  body,
}: {
  entries: TimedEntry<T>[];
  lines: LyricLine[];
  onJump: (index: number) => void;
  head: (item: T) => React.ReactNode;
  body: (item: T) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {entries.map(e => (
        <div key={e.item.id} className={card}>
          {head(e.item)}
          {body(e.item)}
          {e.forms.length > 0 && <div className="text-[11px] text-text-muted mt-1">Di teks: {e.forms.join('、')}</div>}
          <TimeChips indexes={e.lines} lines={lines} onJump={onJump} />
        </div>
      ))}
    </div>
  );
}

export const ImmersionSidebar: React.FC<Props> = ({ captions, lines, analysis, activeIndex, showFurigana, showTranslation, saved, currentVideoId, onJump, onSeekMs, onRemoveSaved }) => {
  const [tab, setTab] = useState<Tab>('transkrip');
  const boxRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Gulir kotak transkrip saja (bukan halaman) agar baris aktif tetap di tengah.
  useEffect(() => {
    if (tab !== 'transkrip') return;
    const box = boxRef.current;
    const el = activeRef.current;
    if (!box || !el) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [activeIndex, tab]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'transkrip', label: 'Transkrip' },
    { id: 'kotoba', label: 'Kotoba', count: analysis.vocab.length },
    { id: 'pola', label: 'Pola', count: analysis.grammar.length },
    { id: 'simpanan', label: 'Kata Saya', count: saved.length },
  ];

  const ready = captions.status === 'ready' && lines.length > 0;

  return (
    <div className="panel panel-stitched rounded-3xl bg-surface-card border border-border-subtle shadow-md p-3 sm:p-4 flex flex-col gap-3 min-h-0">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`ui-chip px-3 py-1.5 text-xs font-heading font-bold cursor-pointer ${tab === t.id ? 'is-active' : ''}`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 font-mono text-[10px] opacity-70">{t.count}</span>}
          </button>
        ))}
      </div>

      <div ref={boxRef} className="relative overflow-y-auto min-h-0 max-h-80 lg:max-h-[34rem] pr-1">
        {tab === 'simpanan' ? (
          saved.length === 0 ? (
            <div className={`${card} text-sm text-text-secondary`}>Belum ada kata. Tekan tanda + pada kata di bawah kalimat untuk menyimpannya beserta baris dan waktunya.</div>
          ) : (
            <div className="space-y-2">
              {saved.map(w => (
                <div key={w.id} className={card}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-heading font-black text-text-primary text-lg">{w.word}</span>
                      {w.reading && w.reading !== w.word && <span className="text-xs text-text-secondary ml-1">（{w.reading}）</span>}
                      <span className="ml-2 text-[10px] font-mono text-text-muted">{w.jlpt}</span>
                    </div>
                    <button type="button" aria-label="Hapus dari Kata Saya" onClick={() => onRemoveSaved(w)} className="text-text-muted hover:text-crimson cursor-pointer shrink-0 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-text-primary">{w.meaning}</div>
                  <button
                    type="button"
                    disabled={w.videoId !== currentVideoId}
                    onClick={() => onSeekMs(w.startMs)}
                    className="mt-2 text-left text-[11px] text-text-muted enabled:hover:text-text-primary enabled:cursor-pointer"
                  >
                    <span className="font-mono">{formatMs(w.startMs)}</span> · {w.line}
                  </button>
                </div>
              ))}
              <p className="text-[11px] text-text-muted">Tersimpan di perangkat ini. Klik baris konteks untuk memutar ulang bagian videonya (hanya untuk video yang sedang dibuka).</p>
            </div>
          )
        ) : captions.status === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary p-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Mengambil subtitle…
          </div>
        ) : captions.status === 'error' ? (
          <div className={`${card} text-sm text-text-secondary`}>{captions.message}</div>
        ) : !ready ? (
          <div className={`${card} text-sm text-text-secondary`}>Subtitle belum tersedia.</div>
        ) : tab === 'transkrip' ? (
          <div className="space-y-0.5">
            {lines.map((line, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={i}
                  ref={active ? activeRef : undefined}
                  type="button"
                  onClick={() => onJump(i)}
                  className={`w-full flex items-baseline gap-3 px-3 py-2 rounded-xl text-left cursor-pointer border transition-colors ${
                    active ? 'bg-surface-elevated border-border-primary' : 'border-transparent hover:bg-surface-elevated'
                  }`}
                >
                  <span className={`font-mono text-[11px] shrink-0 w-9 ${active ? 'text-gold' : 'text-text-muted'}`}>{formatMs(line.startMs)}</span>
                  <span className="min-w-0">
                    <RubyText japanese={line.text} showFurigana={showFurigana} className={`text-base ${active ? 'text-text-primary font-bold' : 'text-text-secondary'}`} />
                    {showTranslation && line.translation && <span className="block text-xs text-text-muted mt-0.5">{line.translation}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ) : tab === 'kotoba' ? (
          <EntryList
            entries={analysis.vocab}
            lines={lines}
            onJump={onJump}
            head={item => (
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading font-black text-text-primary text-lg">{item.word}</span>
                <span className="text-[10px] font-mono text-text-muted">{item.jlpt}</span>
              </div>
            )}
            body={item => (
              <>
                {item.reading && item.reading !== item.word && <div className="text-xs text-text-secondary">{item.reading}</div>}
                <div className="text-sm text-text-primary mt-1">{item.meaningId}</div>
              </>
            )}
          />
        ) : analysis.grammar.length === 0 ? (
          <div className={`${card} text-sm text-text-secondary`}>Tidak ada pola tata bahasa yang terdeteksi.</div>
        ) : (
          <div className="space-y-2">
            <EntryList
              entries={analysis.grammar}
              lines={lines}
              onJump={onJump}
              head={item => (
                <div className="flex items-start justify-between gap-2">
                  <span className="font-heading font-black text-text-primary">{item.title}</span>
                  <span className="text-[10px] font-mono text-text-muted shrink-0">{item.level}</span>
                </div>
              )}
              body={item => (
                <>
                  <div className="text-xs font-mono text-gold">{item.formula}</div>
                  <div className="text-sm text-text-primary">{item.meaningId}</div>
                </>
              )}
            />
            <p className="text-[11px] text-text-muted">Deteksi pola bersifat perkiraan, terutama pada lirik. Cek kembali dengan konteks.</p>
          </div>
        )}
      </div>
    </div>
  );
};
