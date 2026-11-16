// Jilid VII — Writing Companion (書): pendamping menyalin paragraf Jepang dengan tangan.
// Kotak 1: paragraf yang bisa dipilih per Kata / Kanji / Frasa (bagian terpilih disorot).
// Kotak 2: panel pembahasan — "Writing" (animasi urutan goresan) dan "Explanation"
// (romaji, arti, perubahan bentuk, partikel, pola, makna sesuai konteks).
// SevnQuest hanya pemandu: pengguna menulis di buku/kertas, bukan mengetik di aplikasi.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, ClipboardPaste, Languages, MousePointer2, NotebookPen,
  PenLine, Shuffle, Type, Volume2, X,
} from 'lucide-react';
import { getDokkaiCollection } from '../../engine/dokkaiStudy/collection';
import { DOKKAI_LEVELS, type DokkaiLevel, type DokkaiPassage } from '../../engine/dokkaiStudy/types';
import {
  buildCompanionDoc, explainSelection, isSelectedChar, resolveSelection, stepSelection, tokenReading, writableChars,
  type CompanionDoc, type CompanionSentence, type SelectMode, type Selection, type SelectionExplanation,
} from '../../engine/writingCompanion/companion';
import { getFuriganaSegments } from '../../utils/furiganaUtils';
import { playSound, speakJapanese } from '../../utils/audio';
import { StrokeOrderPlayer } from './writingCompanion/StrokeOrderPlayer';

interface Props {
  soundEnabled?: boolean;
}

const MAX_CUSTOM = 1200;
const LAST_KEY = 'writing_companion_last';
const DONE_KEY = (id: string) => `writing_companion_done:${id}`;

const MODES: { value: SelectMode; label: string; hint: string }[] = [
  { value: 'word', label: 'Kata', hint: 'Ketuk untuk memilih satu kata atau partikel' },
  { value: 'kanji', label: 'Kanji', hint: 'Ketuk untuk memilih satu huruf' },
  { value: 'phrase', label: 'Frasa', hint: 'Ketuk untuk memilih pola atau unit kata + partikel' },
];
const SIZES = ['text-lg', 'text-xl', 'text-2xl'] as const;

const label = 'text-[10px] font-mono font-bold uppercase tracking-wider text-gold-soft';
const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';

interface Source {
  id: string;
  title: string;
  text: string;
  translations?: Record<string, string>;
  meta: string;
}

const fromPassage = (p: DokkaiPassage): Source => ({
  id: p.id, title: p.title, text: p.text, translations: p.sentenceTranslations, meta: `${p.levelLabel} · ${p.sourceLabel}`,
});

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* penyimpanan tidak tersedia */ }
}
function loadDone(id: string): Set<number> {
  try { return new Set(JSON.parse(safeGet(DONE_KEY(id)) || '[]') as number[]); } catch { return new Set(); }
}

// ------------------------------------------------------------------------------
// KOTAK 1 — PARAGRAF
// ------------------------------------------------------------------------------

/** Satu kalimat: tiap huruf berupa span ber-data agar ketukan bisa dipetakan ke posisi. */
const SentenceView: React.FC<{
  s: CompanionSentence;
  sel: Selection | null;
  furigana: boolean;
  done: boolean;
}> = ({ s, sel, furigana, done }) => {
  const charSpan = (i: number) => {
    const on = isSelectedChar(sel, s.index, i);
    return (
      <span
        key={i}
        data-si={s.index}
        data-ci={i}
        className={`cursor-pointer rounded-[3px] transition-colors ${on ? 'bg-gold/35 text-text-primary shadow-[inset_0_-2px_0_var(--color-gold)]' : 'hover:bg-indigo/15'}`}
      >
        {s.text[i]}
      </span>
    );
  };
  return (
    <span className={done ? 'opacity-60' : undefined}>
      {s.tokens.map(t => {
        const reading = furigana ? tokenReading(t) : undefined;
        if (!reading) {
          const out: React.ReactNode[] = [];
          for (let i = t.start; i < t.end; i++) out.push(charSpan(i));
          return <React.Fragment key={t.id}>{out}</React.Fragment>;
        }
        // Furigana per kanji (okurigana tanpa ruby); posisi huruf tetap dipetakan.
        let pos = t.start;
        return (
          <React.Fragment key={t.id}>
            {getFuriganaSegments(t.text, reading).map((seg, k) => {
              const from = pos;
              pos += seg.text.length;
              const chars: React.ReactNode[] = [];
              for (let i = from; i < from + seg.text.length; i++) chars.push(charSpan(i));
              return seg.ruby && seg.isKanji ? (
                <ruby key={k}>{chars}<rt className="text-[0.5em] text-furigana select-none">{seg.ruby}</rt></ruby>
              ) : <React.Fragment key={k}>{chars}</React.Fragment>;
            })}
          </React.Fragment>
        );
      })}
      {done && <Check className="inline w-3.5 h-3.5 ml-0.5 text-state-success align-baseline" aria-label="sudah ditulis" />}
    </span>
  );
};

// ------------------------------------------------------------------------------
// KOTAK 2 — PEMBAHASAN
// ------------------------------------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h4 className={label}>{title}</h4>
    {children}
  </section>
);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

const ExplanationBody: React.FC<{ ex: SelectionExplanation }> = ({ ex }) => {
  const { context } = ex;
  const sel = context.sentence.indexOf(ex.text);
  return (
    <div className="space-y-5">
      {ex.words.length > 0 && (
        <Section title="Kosakata">
          {ex.words.map((w, i) => (
            <div key={i} className={`${card} space-y-1.5`}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-lg font-jp font-bold text-text-primary">{w.dictionaryForm}</span>
                {w.dictionaryReading && w.dictionaryReading !== w.dictionaryForm && (
                  <span className="text-sm font-jp text-text-secondary">【{w.dictionaryReading}】</span>
                )}
                {w.wordType && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-border-subtle text-text-secondary">
                    {w.wordType}{w.wordTypeJp ? ` · ${w.wordTypeJp}` : ''}
                  </span>
                )}
                <span className="text-[10px] font-mono text-text-muted">{w.item.jlpt}</span>
              </div>
              {w.meaning && <p className="text-sm text-text-primary">{w.meaning}</p>}
              {w.definition && <p className="text-xs text-text-secondary">{clip(w.definition, 220)}</p>}
              {w.inflection && (
                <div className="mt-1 p-2 rounded-xl border border-indigo/40 bg-indigo/10 space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo">Perubahan bentuk</p>
                  <p className="text-sm font-jp text-text-primary">
                    {w.dictionaryForm} <span className="text-text-muted">→</span> <b>{w.surface}</b>
                    <span className="text-xs text-text-secondary"> ({w.reading} · {w.romaji})</span>
                  </p>
                  <p className="text-xs text-text-secondary">{w.inflection.label}</p>
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {ex.kanji.length > 0 && (
        <Section title="Kanji">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ex.kanji.map(k => (
              <div key={k.char} className={`${card} flex gap-3`}>
                <span className="text-3xl font-jp font-bold text-text-primary leading-none">{k.char}</span>
                <div className="min-w-0 text-xs space-y-0.5">
                  {k.item ? (
                    <>
                      <p className="text-sm text-text-primary">{k.item.meaningId}</p>
                      {k.item.onyomi.length > 0 && <p className="text-text-secondary"><b>On</b> <span className="font-jp">{k.item.onyomi.slice(0, 3).join('、')}</span></p>}
                      {k.item.kunyomi.length > 0 && <p className="text-text-secondary"><b>Kun</b> <span className="font-jp">{k.item.kunyomi.slice(0, 3).join('、')}</span></p>}
                      <p className="text-text-muted">{k.item.strokeCount} goresan · {k.item.jlpt}</p>
                    </>
                  ) : <p className="text-text-muted">Belum ada di database kanji.</p>}
                  {k.readingInContext && (
                    <p className="text-text-primary">Di sini dibaca <b className="font-jp">{k.readingInContext}</b>{k.inWord ? <> dalam <span className="font-jp">{k.inWord}</span></> : null}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ex.particles.length > 0 && (
        <Section title="Fungsi partikel">
          {ex.particles.map((p, i) => (
            <div key={i} className={`${card} flex gap-3 items-start`}>
              <span className="text-2xl font-jp font-bold text-kana leading-none">{p.particle}</span>
              <div className="text-sm space-y-0.5">
                <p className="text-text-primary">{p.function}</p>
                {p.marks && p.role && (
                  <p className="text-xs text-text-secondary">
                    Di kalimat ini menandai <span className="font-jp text-text-primary">「{p.marks}」</span> sebagai <b>{p.role}</b>.
                  </p>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {ex.grammar.length > 0 && (
        <Section title="Pola tata bahasa">
          {ex.grammar.map((g, i) => (
            <div key={i} className={`${card} space-y-1`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-base font-jp font-bold text-text-primary">{g.item.title}</span>
                <span className="text-[10px] font-mono text-text-muted">{g.item.level}</span>
              </div>
              <p className="text-sm text-text-primary">{g.item.meaningId}</p>
              {g.item.formula && <p className="text-xs font-jp text-text-secondary">Rumus: {g.item.formula}</p>}
              <p className="text-xs text-text-secondary">Di teks: <span className="font-jp text-text-primary">{g.phrase}</span></p>
              {g.item.explanation && <p className="text-xs text-text-secondary">{clip(g.item.explanation, 260)}</p>}
            </div>
          ))}
        </Section>
      )}

      {ex.unknown.length > 0 && ex.words.length === 0 && (
        <p className="text-xs text-text-muted">
          <span className="font-jp">{ex.unknown.join('、')}</span> belum dikenali database sebagai kata utuh — lihat arti tiap kanji di atas.
        </p>
      )}

      <Section title="Makna dalam konteks">
        <div className={`${card} space-y-2`}>
          <p className="text-base font-jp leading-relaxed text-text-primary">
            {sel >= 0 ? (
              <>
                {context.sentence.slice(0, sel)}
                <mark className="bg-gold/35 text-text-primary rounded px-0.5">{ex.text}</mark>
                {context.sentence.slice(sel + ex.text.length)}
              </>
            ) : context.sentence}
          </p>
          {context.translation ? (
            <p className="text-sm text-text-primary">{context.translation}</p>
          ) : context.gloss ? (
            <p className="text-xs text-text-secondary"><b>Gambaran arti kata per kata:</b> {context.gloss}</p>
          ) : null}
          {context.role && context.chunk && (
            <p className="text-xs text-text-secondary">
              Bagian <span className="font-jp text-text-primary">「{context.chunk}」</span> berperan sebagai <b>{context.role}</b> dalam kalimat ini.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
};

// ------------------------------------------------------------------------------
// VIEW
// ------------------------------------------------------------------------------

export const WritingCompanionView: React.FC<Props> = ({ soundEnabled = true }) => {
  const collection = useMemo(() => getDokkaiCollection(), []);
  const [level, setLevel] = useState<DokkaiLevel>('N5');
  const [source, setSource] = useState<Source | null>(() => {
    const last = safeGet(LAST_KEY);
    const p = (last && collection.find(x => x.id === last)) || collection.find(x => x.level === 'N5') || collection[0];
    return p ? fromPassage(p) : null;
  });
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [mode, setMode] = useState<SelectMode>('word');
  const [panel, setPanel] = useState<'writing' | 'explanation'>('writing');
  const [sel, setSel] = useState<Selection | null>(null);
  const [furigana, setFurigana] = useState(false);
  const [size, setSize] = useState(1);
  const [done, setDone] = useState<Set<number>>(() => (source ? loadDone(source.id) : new Set()));
  const paragraphRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(true);

  // Di layar sempit panel berada di bawah paragraf: tampilkan pintasan bila panel tidak terlihat.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [source]);

  const click = () => playSound('click', soundEnabled);

  const doc: CompanionDoc | null = useMemo(
    () => (source ? buildCompanionDoc(source.text, source.translations) : null),
    [source],
  );
  const explanation = useMemo(() => (doc && sel ? explainSelection(doc, sel) : null), [doc, sel]);
  const chars = useMemo(() => (explanation ? writableChars(explanation.text) : []), [explanation]);

  const passages = useMemo(() => collection.filter(p => p.level === level), [collection, level]);

  const openSource = (s: Source) => {
    setSource(s);
    setSel(null);
    setDone(loadDone(s.id));
    if (!s.id.startsWith('custom:')) safeSet(LAST_KEY, s.id);
  };

  const pickPassage = (id: string) => {
    const p = collection.find(x => x.id === id);
    if (p) { click(); openSource(fromPassage(p)); }
  };

  const randomPassage = () => {
    if (!passages.length) return;
    click();
    openSource(fromPassage(passages[Math.floor(Math.random() * passages.length)]));
  };

  const useCustom = () => {
    const text = customText.trim().slice(0, MAX_CUSTOM);
    if (!/[぀-ヿ一-龯]/.test(text)) return;
    click();
    openSource({ id: `custom:${text.length}:${text.slice(0, 12)}`, title: 'Teks sendiri', text, meta: `${text.length} huruf` });
    setCustomOpen(false);
  };

  // Ganti mode → seleksi diubah mengikuti mode baru pada posisi yang sama.
  useEffect(() => {
    if (!doc || !sel || sel.mode === mode) return;
    setSel(resolveSelection(doc, sel.si, sel.start, mode));
  }, [mode]);

  const onParagraphClick = (e: React.MouseEvent) => {
    if (!doc) return;
    const el = (e.target as HTMLElement).closest('[data-ci]') as HTMLElement | null;
    if (!el) return;
    const next = resolveSelection(doc, Number(el.dataset.si), Number(el.dataset.ci), mode);
    if (!next) return;
    click();
    setSel(prev => (prev && prev.si === next.si && prev.start === next.start && prev.end === next.end ? null : next));
  };

  const move = (dir: 1 | -1) => {
    if (!doc) return;
    const next = sel ? stepSelection(doc, sel, dir) : resolveSelection(doc, 0, 0, mode);
    if (next) { click(); setSel(next); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape') setSel(null);
  };

  const toggleDone = (si: number) => {
    if (!source) return;
    click();
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(si)) next.delete(si); else next.add(si);
      safeSet(DONE_KEY(source.id), JSON.stringify([...next]));
      return next;
    });
  };

  const pill = (on: boolean) => `ui-chip px-3 py-1.5 text-xs font-bold ${on ? 'is-active' : ''}`;
  const totalSentences = doc?.sentences.length ?? 0;
  const activeMode = MODES.find(m => m.value === mode)!;

  return (
    <div className="space-y-5">
      {/* Pengantar + sumber paragraf */}
      <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="space-y-1 max-w-2xl">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">Jilid VII · 書</span>
            <h2 className="text-lg font-bold font-heading text-text-primary flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-gold" /> Writing Companion
            </h2>
            <p className="text-sm text-text-secondary">
              Siapkan buku dan pena. Salin paragraf di bawah dengan tangan, lalu ketuk bagian yang sedang kamu tulis:
              <b className="text-text-primary"> Writing</b> menampilkan urutan goresan, <b className="text-text-primary">Explanation</b> menjelaskan bacaan, arti, bentuk kata, partikel, dan polanya.
            </p>
          </div>
          <button type="button" onClick={() => { click(); setCustomOpen(o => !o); }} className="btn-physical-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5 self-start lg:self-auto">
            <ClipboardPaste className="w-3.5 h-3.5" /> Tempel teks sendiri
          </button>
        </div>

        {customOpen && (
          <div className="space-y-2">
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value.slice(0, MAX_CUSTOM))}
              rows={4}
              placeholder="Tempel paragraf bahasa Jepang di sini…"
              className="w-full p-3 rounded-2xl bg-surface-inset border border-border-subtle text-base font-jp text-text-primary"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-text-muted">{customText.length} / {MAX_CUSTOM}</span>
              <button type="button" onClick={useCustom} disabled={!/[぀-ヿ一-龯]/.test(customText)} className="btn-skeuo-gold px-4 py-2 text-xs disabled:opacity-50">
                Pakai teks ini
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Level bacaan">
            {DOKKAI_LEVELS.map(lv => (
              <button key={lv} type="button" role="radio" aria-checked={level === lv} className={pill(level === lv)} onClick={() => { click(); setLevel(lv); }}>
                {lv}
              </button>
            ))}
          </div>
          <select
            aria-label="Pilih bacaan"
            value={source && passages.some(p => p.id === source.id) ? source.id : ''}
            onChange={e => pickPassage(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface-inset border border-border-subtle text-sm text-text-primary"
          >
            <option value="" disabled>{passages.length ? `Pilih bacaan ${level} (${passages.length})` : `Belum ada bacaan ${level}`}</option>
            {passages.map(p => <option key={p.id} value={p.id}>{p.title} — {p.sourceLabel}</option>)}
          </select>
          <button type="button" onClick={randomPassage} disabled={!passages.length} className="btn-physical-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
            <Shuffle className="w-3.5 h-3.5" /> Acak
          </button>
        </div>
      </div>

      {source && doc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* KOTAK 1 — Paragraf */}
          <div ref={paragraphRef} className="panel panel-stitched rounded-3xl border border-border-subtle p-4 sm:p-5 space-y-3 scroll-mt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold font-heading text-text-primary flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-gold shrink-0" /> <span className="truncate">{source.title}</span>
                </h3>
                <p className="text-[11px] font-mono text-text-muted">{source.meta} · {done.size}/{totalSentences} kalimat ditulis</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { click(); setFurigana(f => !f); }} aria-pressed={furigana} className={`ui-chip px-2 py-1 text-[11px] font-bold ${furigana ? 'is-active' : ''}`} title="Furigana">
                  <span className="font-jp">ふ</span>
                </button>
                <button type="button" onClick={() => { click(); setSize(s => (s + 1) % SIZES.length); }} className="ui-chip px-2 py-1 text-[11px] font-bold inline-flex items-center gap-1" title="Ukuran huruf">
                  <Type className="w-3.5 h-3.5" /> {size + 1}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Mode pilih">
              <MousePointer2 className="w-3.5 h-3.5 text-text-muted" />
              {MODES.map(m => (
                <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => { click(); setMode(m.value); }} className={pill(mode === m.value)}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted -mt-1">{activeMode.hint}. Panah ← → untuk pindah.</p>

            <div
              role="application"
              aria-label="Paragraf untuk disalin"
              tabIndex={0}
              onClick={onParagraphClick}
              onKeyDown={onKeyDown}
              className={`max-h-[45vh] lg:max-h-[65vh] overflow-y-auto p-4 rounded-2xl bg-surface-inset border border-border-subtle font-jp ${SIZES[size]} ${furigana ? 'leading-[2.6]' : 'leading-loose'} text-text-primary space-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 select-none`}
            >
              {doc.paragraphs.map((ids, pi) => (
                <p key={pi} className="indent-[1em]">
                  {ids.map(si => (
                    <SentenceView key={si} s={doc.sentences[si]} sel={sel} furigana={furigana} done={done.has(si)} />
                  ))}
                </p>
              ))}
            </div>
          </div>

          {/* KOTAK 2 — Pembahasan */}
          <div ref={panelRef} className="panel panel-stitched rounded-3xl border border-border-subtle p-4 sm:p-5 space-y-4 lg:sticky lg:top-4 scroll-mt-4">
            {!explanation ? (
              <div className="py-10 text-center space-y-3">
                <PenLine className="w-8 h-8 mx-auto text-text-muted" />
                <p className="text-sm font-bold text-text-primary">Panel pembahasan masih kosong</p>
                <p className="text-xs text-text-secondary max-w-xs mx-auto">
                  Ketuk kata, kanji, atau frasa pada paragraf yang sedang kamu salin. Penjelasannya akan muncul di sini.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl sm:text-3xl font-jp font-bold text-text-primary break-all">{explanation.text}</p>
                    {explanation.reading && explanation.reading !== explanation.text && (
                      <p className="text-sm font-jp text-text-secondary">{explanation.reading}</p>
                    )}
                    {explanation.romaji && <p className="text-xs font-mono text-text-muted">{explanation.romaji}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => { click(); speakJapanese(explanation.reading || explanation.text).catch(() => undefined); }} className="btn-physical-secondary p-1.5" aria-label="Dengarkan">
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => move(-1)} className="btn-physical-secondary p-1.5" aria-label="Bagian sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
                    <button type="button" onClick={() => move(1)} className="btn-physical-secondary p-1.5" aria-label="Bagian berikutnya"><ChevronRight className="w-4 h-4" /></button>
                    <button type="button" onClick={() => { click(); setSel(null); }} className="btn-physical-secondary p-1.5" aria-label="Tutup pembahasan"><X className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Jenis pembahasan">
                  <button type="button" role="tab" aria-selected={panel === 'writing'} onClick={() => { click(); setPanel('writing'); }} className={`${pill(panel === 'writing')} inline-flex items-center justify-center gap-1.5 py-2`}>
                    <PenLine className="w-3.5 h-3.5" /> Writing
                  </button>
                  <button type="button" role="tab" aria-selected={panel === 'explanation'} onClick={() => { click(); setPanel('explanation'); }} className={`${pill(panel === 'explanation')} inline-flex items-center justify-center gap-1.5 py-2`}>
                    <Languages className="w-3.5 h-3.5" /> Explanation
                  </button>
                </div>

                <div className="max-h-none lg:max-h-[60vh] lg:overflow-y-auto pr-0.5">
                  {panel === 'writing'
                    ? <StrokeOrderPlayer chars={chars} soundEnabled={soundEnabled} />
                    : <ExplanationBody ex={explanation} />}
                </div>

                <button
                  type="button"
                  onClick={() => { click(); paragraphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className="lg:hidden w-full btn-physical-secondary px-3 py-2 text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowUp className="w-3.5 h-3.5" /> Kembali ke paragraf
                </button>

                {sel && (
                  <button
                    type="button"
                    onClick={() => toggleDone(sel.si)}
                    aria-pressed={done.has(sel.si)}
                    className={`w-full px-3 py-2 text-xs inline-flex items-center justify-center gap-1.5 ${done.has(sel.si) ? 'btn-skeuo-gold' : 'btn-physical-secondary'}`}
                  >
                    <Check className="w-3.5 h-3.5" /> {done.has(sel.si) ? 'Kalimat ini sudah kutulis' : 'Tandai kalimat ini sudah kutulis'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {explanation && !panelVisible && (
        <button
          type="button"
          onClick={() => { click(); panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          className="lg:hidden fixed left-4 right-4 bottom-20 z-30 btn-skeuo-indigo px-4 py-2.5 text-sm inline-flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="font-jp font-bold truncate max-w-[50%]">{explanation.text}</span>
          <span className="text-xs">Lihat pembahasan</span>
          <ArrowDown className="w-4 h-4 shrink-0" />
        </button>
      )}
    </div>
  );
};
