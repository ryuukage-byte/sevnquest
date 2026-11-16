// Jilid VII — Writing Companion (書): pendamping menyalin paragraf Jepang dengan tangan.
// Daftar bacaan (seperti Dokkai): tiap bacaan punya kartu sendiri dan dibuka di ruang belajar
// WritingCompanionStudy — kotak paragraf yang bisa dipilih + panel pembahasan (Writing / Explanation).

import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, NotebookPen, Search } from 'lucide-react';
import { getDokkaiCollection } from '../../engine/dokkaiStudy/collection';
import { splitParagraphs } from '../../engine/dokkaiStudy/text';
import { splitSentences } from '../../engine/textStudy/textAnalyzer';
import { DOKKAI_LEVELS, type DokkaiLevel, type DokkaiPassage } from '../../engine/dokkaiStudy/types';
import { playSound } from '../../utils/audio';
import { WritingCompanionStudy } from './writingCompanion/WritingCompanionStudy';
import { loadDone, type CompanionSource } from './writingCompanion/storage';

interface Props {
  soundEnabled?: boolean;
}

const MAX_CUSTOM = 1200;
const PAGE = 24;
const HAS_JP = /[぀-ヿ一-龯]/;

const fromPassage = (p: DokkaiPassage): CompanionSource => ({
  id: p.id, title: p.title, text: p.text, translations: p.sentenceTranslations, meta: `${p.levelLabel} · ${p.sourceLabel}`,
});

function shape(text: string) {
  const paras = splitParagraphs(text);
  return { paragraphs: paras.length, sentences: paras.reduce((n, p) => n + splitSentences(p).length, 0) };
}

export const WritingCompanionView: React.FC<Props> = ({ soundEnabled = true }) => {
  const collection = useMemo(() => getDokkaiCollection(), []);
  const shapes = useMemo(() => new Map(collection.map(p => [p.id, shape(p.text)])), [collection]);
  const [level, setLevel] = useState<'all' | DokkaiLevel>('N5');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [active, setActive] = useState<CompanionSource | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  // Naik tiap kali progres berubah agar angka "ditulis" pada kartu dibaca ulang.
  const [progressTick, setProgressTick] = useState(0);

  const click = () => playSound('click', soundEnabled);

  const filtered = useMemo(() => {
    const q = query.trim();
    const ql = q.toLowerCase();
    return collection.filter(p =>
      (level === 'all' || p.level === level) &&
      (!q || p.title.toLowerCase().includes(ql) || p.text.includes(q) || p.sourceLabel.toLowerCase().includes(ql)),
    );
  }, [collection, level, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of collection) c[p.level] = (c[p.level] || 0) + 1;
    return c;
  }, [collection]);

  const doneCounts = useMemo(
    () => new Map(filtered.slice(0, limit).map(p => [p.id, loadDone(p.id).size])),
    [filtered, limit, progressTick, active],
  );

  const startCustom = () => {
    const text = customText.trim().slice(0, MAX_CUSTOM);
    if (!HAS_JP.test(text)) return;
    click();
    let h = 0;
    for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
    setActive({ id: `custom:${(h >>> 0).toString(36)}`, title: 'Teks sendiri', text, meta: `${text.length} huruf` });
  };

  const pill = (on: boolean) => `ui-chip px-3 py-1.5 text-xs font-bold ${on ? 'is-active' : ''}`;

  return (
    <div className="space-y-5">
      {/* Pengantar + teks sendiri */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle lg:col-span-3 space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Jilid VII · 書</span>
          <h2 className="text-lg font-bold font-heading text-text-primary flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-gold" /> Writing Companion
          </h2>
          <p className="text-sm text-text-secondary">
            Siapkan buku dan pena. Pilih bacaan, salin paragrafnya dengan tangan, lalu ketuk bagian yang sedang kamu tulis:
          </p>
          <ol className="text-xs text-text-secondary grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <li><b className="text-text-primary">Writing</b> — animasi urutan goresan + diagram langkah untuk ditiru</li>
            <li><b className="text-text-primary">Explanation</b> — romaji, arti, bentuk kata, partikel, pola, makna sesuai konteks</li>
          </ol>
        </div>

        <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-bold font-heading text-text-primary">Salin teks sendiri</h3>
          </div>
          {!customOpen ? (
            <>
              <p className="text-xs text-text-secondary">Punya paragraf dari buku pelajaran, lirik, atau artikel? Tempel di sini dan belajar menyalinnya.</p>
              <button type="button" onClick={() => { click(); setCustomOpen(true); }} className="btn-physical-secondary w-full px-4 py-2 text-xs">
                Tempel teks
              </button>
            </>
          ) : (
            <>
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value.slice(0, MAX_CUSTOM))}
                rows={4}
                placeholder="Tempel paragraf bahasa Jepang di sini…"
                className="w-full p-3 rounded-2xl bg-surface-inset border border-border-subtle text-base font-jp text-text-primary"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-text-muted">{customText.length} / {MAX_CUSTOM}</span>
                <button type="button" onClick={startCustom} disabled={!HAS_JP.test(customText)} className="btn-skeuo-gold px-4 py-2 text-xs disabled:opacity-50">
                  Mulai menyalin
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="panel panel-stitched p-4 rounded-3xl border border-border-subtle space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
            placeholder="Cari judul atau isi bacaan…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border-subtle text-sm text-text-primary"
          />
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
          {filtered.slice(0, limit).map(p => {
            const sh = shapes.get(p.id) ?? { paragraphs: 0, sentences: 0 };
            const done = Math.min(doneCounts.get(p.id) ?? 0, sh.sentences);
            const complete = sh.sentences > 0 && done >= sh.sentences;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { click(); setActive(fromPassage(p)); }}
                className="panel panel-stitched text-left p-4 rounded-2xl border border-border-subtle hover:border-gold/50 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-text-primary">{p.levelLabel}</span>
                  <span className="text-[10px] font-mono text-text-muted truncate">{p.sourceLabel}</span>
                </div>
                <div className="font-jp font-bold text-text-primary leading-snug line-clamp-2">{p.title}</div>
                <p className="font-jp text-xs text-text-secondary line-clamp-2">{p.text.replace(/\s+/g, ' ').slice(0, 90)}</p>
                <div className="flex items-center justify-between gap-2 text-[10.5px] font-mono text-text-muted">
                  <span>{sh.paragraphs} paragraf · {sh.sentences} kalimat</span>
                  {done > 0 && (
                    <span className={`inline-flex items-center gap-1 ${complete ? 'text-state-success' : 'text-gold-soft'}`}>
                      <CheckCircle2 className="w-3 h-3" /> {done}/{sh.sentences} ditulis
                    </span>
                  )}
                </div>
                {sh.sentences > 0 && (
                  <div className="h-1 rounded-full bg-surface-inset overflow-hidden" aria-hidden="true">
                    <div className={`h-full ${complete ? 'bg-state-success' : 'bg-gold'}`} style={{ width: `${(done / sh.sentences) * 100}%` }} />
                  </div>
                )}
              </button>
            );
          })}
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
        <WritingCompanionStudy
          source={active}
          soundEnabled={soundEnabled}
          onClose={() => setActive(null)}
          onProgress={() => setProgressTick(t => t + 1)}
        />
      )}
    </div>
  );
};
