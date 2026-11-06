// Jilid IV — Dokkai (読解): kumpulan bacaan dari database & seluruh paket simulasi tryout,
// plus "Rakit Dokkai" yang membuat bacaan baru dengan kosakata sesuai level.
// Setiap bacaan dibuka di DokkaiStudyModal: Baca & Pahami → Kotoba·Kanji·Pola → Inti → 3 Soal.

import React, { useMemo, useState } from 'react';
import { BookOpen, FileText, Search, Sparkles, Wand2 } from 'lucide-react';
import { getDokkaiCollection } from '../../engine/dokkaiStudy/collection';
import { generateDokkai, templatesForLevel } from '../../engine/dokkaiStudy/generator';
import { DOKKAI_LEVELS, type DokkaiLevel, type DokkaiPassage, type DokkaiSource } from '../../engine/dokkaiStudy/types';
import { playSound } from '../../utils/audio';
import { DokkaiStudyModal } from './DokkaiStudyModal';

type CompleteHandler = React.ComponentProps<typeof DokkaiStudyModal>['onCompleteStudyItem'];

interface Props {
  soundEnabled?: boolean;
  onCompleteStudyItem?: CompleteHandler;
  onRewardPlayer?: (exp: number, gold: number) => void;
}

const READER_LEVEL_KEY = 'dokkai_reader_level';
const PAGE = 24;

const SOURCE_TABS: { value: 'all' | DokkaiSource; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'tryout', label: 'Simulasi Tryout' },
  { value: 'database', label: 'Database Dokkai' },
];

function loadReaderLevel(): DokkaiLevel | null {
  try {
    const v = localStorage.getItem(READER_LEVEL_KEY);
    return v && (DOKKAI_LEVELS as string[]).includes(v) ? (v as DokkaiLevel) : null;
  } catch {
    return null;
  }
}

export const DokkaiLibraryView: React.FC<Props> = ({ soundEnabled = true, onCompleteStudyItem, onRewardPlayer }) => {
  const collection = useMemo(() => getDokkaiCollection(), []);
  const [level, setLevel] = useState<'all' | DokkaiLevel>('all');
  const [source, setSource] = useState<'all' | DokkaiSource>('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [savedReaderLevel, setSavedReaderLevel] = useState<DokkaiLevel | null>(loadReaderLevel);
  const [active, setActive] = useState<DokkaiPassage | null>(null);

  // Rakit Dokkai
  const [genLevel, setGenLevel] = useState<DokkaiLevel>(savedReaderLevel ?? 'N4');
  const [genTemplate, setGenTemplate] = useState<string>('random');
  const genTemplates = templatesForLevel(genLevel);

  const click = () => playSound('click', soundEnabled);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collection.filter(p =>
      (level === 'all' || p.level === level) &&
      (source === 'all' || p.source === source) &&
      (!q || p.title.toLowerCase().includes(q) || p.text.includes(query.trim()) || p.sourceLabel.toLowerCase().includes(q)),
    );
  }, [collection, level, source, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of collection) c[p.level] = (c[p.level] || 0) + 1;
    return c;
  }, [collection]);

  const readerLevelFor = (p: DokkaiPassage) => savedReaderLevel ?? p.level;
  const setReaderLevel = (lv: string) => {
    if (!(DOKKAI_LEVELS as string[]).includes(lv)) return;
    setSavedReaderLevel(lv as DokkaiLevel);
    try { localStorage.setItem(READER_LEVEL_KEY, lv); } catch { /* penyimpanan tidak tersedia */ }
  };

  const generate = () => {
    click();
    setActive(generateDokkai({ level: genLevel, templateId: genTemplate === 'random' ? undefined : genTemplate }));
  };

  const regenerate = active?.source === 'generated'
    ? () => setActive(generateDokkai({ level: active.level, templateId: genTemplate === 'random' ? undefined : genTemplate }))
    : undefined;

  const pill = (on: boolean) => `ui-chip px-3 py-1.5 text-xs font-bold ${on ? 'is-active' : ''}`;

  return (
    <div className="space-y-5">
      {/* Penjelasan + Rakit Dokkai */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle lg:col-span-3 space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Jilid IV · 読解</span>
          <h2 className="text-lg font-bold font-heading text-text-primary">Bedah Dokkai</h2>
          <p className="text-sm text-text-secondary">
            {collection.length} bacaan dari Database Dokkai dan semua paket Simulasi Tryout. Setiap bacaan dibedah menjadi:
          </p>
          <ol className="text-xs text-text-secondary grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <li><b className="text-text-primary">1. Baca & Pahami</b> — peran tiap paragraf, ketuk kalimat untuk arti & pola</li>
            <li><b className="text-text-primary">2. Kotoba · Kanji · Pola</b> — ditandai di atas / sesuai levelmu</li>
            <li><b className="text-text-primary">3. Inti Bacaan</b> — gagasan utama, kalimat kunci, alur</li>
            <li><b className="text-text-primary">4. 3 Soal</b> — bukti di teks & alasan tiap pilihan</li>
          </ol>
        </div>

        <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-bold font-heading text-text-primary">Rakit Dokkai Baru</h3>
          </div>
          <p className="text-xs text-text-secondary">
            Bacaan baru dengan kosakata yang dipilih sesuai level: tidak memakai kata di atas level yang dipilih, lengkap dengan terjemahan per kalimat dan 3 soal berpembahasan.
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Level bacaan">
            {DOKKAI_LEVELS.map(lv => (
              <button key={lv} type="button" role="radio" aria-checked={genLevel === lv} className={pill(genLevel === lv)} onClick={() => { setGenLevel(lv); setGenTemplate('random'); }}>
                {lv}
              </button>
            ))}
          </div>
          <select
            value={genTemplate}
            onChange={e => setGenTemplate(e.target.value)}
            className="w-full bg-surface border border-border-subtle rounded-xl text-xs px-2 py-2 text-text-primary cursor-pointer"
            aria-label="Jenis bacaan"
          >
            <option value="random">Jenis bacaan: acak</option>
            {genTemplates.map(t => <option key={t.id} value={t.id}>{t.topic}</option>)}
          </select>
          {genLevel === 'N1' && <p className="text-[11px] text-text-muted">N1 memakai kerangka esai/email N2 dengan pilihan kosakata N1.</p>}
          <button type="button" onClick={generate} className="btn-skeuo-gold w-full px-4 py-2.5 text-xs">
            <Sparkles className="w-4 h-4" /> Rakit bacaan {genLevel}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="panel panel-stitched p-4 rounded-3xl border border-border-subtle space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
              placeholder="Cari judul atau isi bacaan (日本語 / Indonesia)…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border-subtle text-sm text-text-primary"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {SOURCE_TABS.map(t => (
              <button key={t.value} type="button" className={pill(source === t.value)} onClick={() => { click(); setSource(t.value); setLimit(PAGE); }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" className={pill(level === 'all')} onClick={() => { click(); setLevel('all'); setLimit(PAGE); }}>Semua level</button>
          {DOKKAI_LEVELS.map(lv => (
            <button key={lv} type="button" className={pill(level === lv)} onClick={() => { click(); setLevel(lv); setLimit(PAGE); }}>
              {lv} <span className="font-mono opacity-60">{counts[lv] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Daftar bacaan */}
      {filtered.length === 0 ? (
        <div className="panel panel-stitched p-10 rounded-3xl border border-border-subtle text-center text-sm text-text-muted">Tidak ada bacaan yang cocok dengan filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.slice(0, limit).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { click(); setActive(p); }}
              className="panel panel-stitched text-left p-4 rounded-2xl border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-primary">{p.levelLabel}</span>
                <span className="text-[10px] font-mono text-text-muted truncate flex items-center gap-1">
                  {p.source === 'tryout' ? <FileText className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                  {p.sourceLabel}
                </span>
              </div>
              <div className="font-jp font-bold text-text-primary leading-snug line-clamp-2">{p.title}</div>
              <p className="font-jp text-xs text-text-secondary line-clamp-2">{p.text.replace(/\s+/g, ' ').slice(0, 90)}</p>
              <div className="text-[10.5px] font-mono text-text-muted">
                {p.text.replace(/\s/g, '').length} huruf · {p.questions.length} soal asli{p.questions.length < 3 ? ' (+ soal tambahan)' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <div className="text-center">
          <button type="button" onClick={() => { click(); setLimit(l => l + PAGE); }} className="btn-physical-secondary px-5 py-2 text-xs">
            Muat lagi ({filtered.length - limit} bacaan)
          </button>
        </div>
      )}

      {active && (
        <DokkaiStudyModal
          passage={active}
          readerLevel={readerLevelFor(active)}
          onReaderLevelChange={setReaderLevel}
          onClose={() => setActive(null)}
          onRegenerate={regenerate}
          soundEnabled={soundEnabled}
          onCompleteStudyItem={onCompleteStudyItem}
          onRewardPlayer={onRewardPlayer}
        />
      )}
    </div>
  );
};

export default DokkaiLibraryView;
