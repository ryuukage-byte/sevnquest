// Jilid Choukai (聴解) — versi minimal: daftar video & channel YouTube berbahasa Jepang
// untuk latihan mendengar. Data: src/data/choukaiYoutube.ts (diisi manual).
// Semua video diputar di dalam SevnQuest (Immersion; layar penuh lewat tombol pemutar). Transkrip tampil bila
// tersimpan di src/data/choukaiTranscripts; selain itu panel transkrip menampilkan "segera hadir".

import React, { useMemo, useState } from 'react';
import { BookOpen, Headphones, PlayCircle, Search, Tv } from 'lucide-react';
import {
  CHOUKAI_CATEGORY_LABELS, CHOUKAI_LEVELS, CHOUKAI_YOUTUBE,
  type ChoukaiCategory, type ChoukaiLevel, type ChoukaiYoutubeEntry,
} from '../../data/choukaiYoutube';
import { parseYouTubeId } from '../../utils/youtube';
import { playSound } from '../../utils/audio';
import { ImmersionDungeonModal } from '../dungeon/ImmersionDungeonModal';
import { hasChoukaiTranscript, loadChoukaiTranscript } from '../../data/choukaiTranscripts';
import type { ImmersionTemplate } from '../../engine/textStudy/immersionTemplate';
import type { ItemMasteryRecord } from '../../types/content';

interface Props {
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
  onRecordInteraction?: (itemId: string, category: 'choukai', interactionType: 'flashcard') => void;
  /** Daftar entri; default data bawaan. Disediakan untuk pengujian. */
  entries?: readonly ChoukaiYoutubeEntry[];
}

const pill = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
    active ? 'bg-gold/15 border-gold/60 text-text-primary' : 'bg-surface border-border-subtle text-text-secondary hover:border-gold/40'
  }`;

export const ChoukaiLibraryView: React.FC<Props> = ({ soundEnabled = true, entries = CHOUKAI_YOUTUBE, itemMastery, onRecordInteraction }) => {
  const [kind, setKind] = useState<'all' | 'video' | 'channel'>('all');
  const [level, setLevel] = useState<'all' | ChoukaiLevel>('all');
  const [category, setCategory] = useState<'all' | ChoukaiCategory>('all');
  const [query, setQuery] = useState('');
  const [immersion, setImmersion] = useState<{ videoId: string; template: ImmersionTemplate | null } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const openPlain = (videoId: string) => {
    click();
    setLoadError(null);
    setImmersion({ videoId, template: null });
  };

  const openTranscript = async (videoId: string) => {
    click();
    setLoadError(null);
    setLoadingId(videoId);
    try {
      const template = await loadChoukaiTranscript(videoId);
      if (template) setImmersion({ videoId, template });
      else setLoadError('Transkrip video ini gagal dimuat.');
    } catch {
      setLoadError('Transkrip video ini gagal dimuat.');
    } finally {
      setLoadingId(null);
    }
  };

  const click = () => playSound('click', soundEnabled);

  const usedCategories = useMemo(
    () => (Object.keys(CHOUKAI_CATEGORY_LABELS) as ChoukaiCategory[]).filter(c => entries.some(e => e.category === c)),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e =>
      (kind === 'all' || e.kind === kind) &&
      (level === 'all' || e.level === level) &&
      (category === 'all' || e.category === category) &&
      (!q || e.title.toLowerCase().includes(q) || (e.author ?? '').toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q)),
    );
  }, [entries, kind, level, category, query]);

  return (
    <div className="space-y-4">
      <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle space-y-2">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-gold" />
          <h2 className="text-lg font-bold font-heading text-text-primary">Choukai — Library Video</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Kumpulan video dan channel berbahasa Jepang untuk melatih telinga pada kecepatan bicara asli.
          Tonton video berbahasa Jepang langsung di sini (bisa layar penuh). Dengarkan dulu tanpa membaca, lalu ulangi.
          Video bertanda <b className="text-text-primary">Tonton + Transkrip</b> bisa diputar kalimat demi kalimat, dibedah kotoba
          dan polanya, dan kalimatnya disimpan ke Recall. Transkrip untuk video lain segera hadir.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="panel panel-stitched p-10 rounded-3xl border border-border-subtle text-center space-y-2">
          <Tv className="w-8 h-8 mx-auto text-text-muted" />
          <p className="text-sm font-bold text-text-primary">Koleksi sedang disiapkan</p>
          <p className="text-xs text-text-muted">Daftar video dan channel Choukai akan segera ditambahkan.</p>
        </div>
      ) : (
        <>
          <div data-tour="choukai-search" className="panel panel-stitched p-4 rounded-3xl border border-border-subtle space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari judul, channel, atau catatan…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border-subtle text-sm text-text-primary"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {([['all', 'Semua'], ['video', 'Video'], ['channel', 'Channel']] as const).map(([v, label]) => (
                  <button key={v} type="button" className={pill(kind === v)} onClick={() => { click(); setKind(v); }}>{label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" className={pill(level === 'all')} onClick={() => { click(); setLevel('all'); }}>Semua level</button>
              {CHOUKAI_LEVELS.map(lv => (
                <button key={lv} type="button" className={pill(level === lv)} onClick={() => { click(); setLevel(lv); }}>
                  {lv === 'Semua' ? 'Campuran' : lv}
                </button>
              ))}
            </div>
            {usedCategories.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" className={pill(category === 'all')} onClick={() => { click(); setCategory('all'); }}>Semua kategori</button>
                {usedCategories.map(c => (
                  <button key={c} type="button" className={pill(category === c)} onClick={() => { click(); setCategory(c); }}>
                    {CHOUKAI_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="panel panel-stitched p-10 rounded-3xl border border-border-subtle text-center text-sm text-text-muted">
              Tidak ada video atau channel yang cocok dengan filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(e => {
                const videoId = e.kind === 'video' ? parseYouTubeId(e.url) : null;
                const stored = !!videoId && hasChoukaiTranscript(videoId);
                return (
                  <div
                    key={e.id}
                    className="panel panel-stitched flex flex-col text-left rounded-2xl border border-border-subtle hover:border-gold/50 transition-colors overflow-hidden"
                  >
                    {videoId ? (
                      <button
                        type="button"
                        onClick={() => (stored ? openTranscript(videoId) : openPlain(videoId))}
                        className="relative aspect-video bg-surface-inset cursor-pointer"
                        aria-label={`Tonton: ${e.title}`}
                      >
                        <img
                          src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <PlayCircle className="w-10 h-10 text-white/90 absolute inset-0 m-auto drop-shadow" />
                      </button>
                    ) : (
                      <div className="aspect-video bg-surface-inset flex items-center justify-center">
                        <Tv className="w-10 h-10 text-text-muted" />
                      </div>
                    )}
                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-primary">
                          {e.level === 'Semua' ? 'Campuran' : e.level}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted truncate">
                          {e.kind === 'channel' ? 'Channel' : 'Video'} · {CHOUKAI_CATEGORY_LABELS[e.category]}
                        </span>
                      </div>
                      <div className="font-jp font-bold text-text-primary leading-snug line-clamp-2">{e.title}</div>
                      {e.author && <div className="text-xs text-text-secondary truncate">{e.author}</div>}
                      {e.note && <p className="text-xs text-text-secondary line-clamp-3">{e.note}</p>}
                      <div className="flex items-center gap-2 pt-1 mt-auto">
                        {videoId && (
                          <button
                            type="button"
                            onClick={() => (stored ? openTranscript(videoId) : openPlain(videoId))}
                            disabled={loadingId === videoId}
                            className="btn-skeuo-gold flex-1 px-3 py-2 text-xs"
                          >
                            {stored ? <BookOpen className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                            {loadingId === videoId ? 'Memuat…' : stored ? 'Tonton + Transkrip' : 'Tonton'}
                          </button>
                        )}
                        {videoId && !stored && (
                          <span className="text-[10px] font-mono text-text-muted shrink-0">Transkrip segera hadir</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {loadError && (
        <div role="alert" className="panel panel-stitched p-3 rounded-2xl border border-border-subtle text-center text-xs text-text-secondary">{loadError}</div>
      )}

      {immersion && (
        <ImmersionDungeonModal
          key={immersion.videoId}
          soundEnabled={soundEnabled}
          initialVideoId={immersion.videoId}
          initialTemplate={immersion.template ?? undefined}
          transcriptComingSoon={!immersion.template}
          sentenceRecall={onRecordInteraction && immersion.template ? {
            isSaved: id => !!itemMastery?.[id],
            onSave: id => onRecordInteraction(id, 'choukai', 'flashcard'),
          } : undefined}
          onClose={() => setImmersion(null)}
        />
      )}
    </div>
  );
};

export default ChoukaiLibraryView;
