// Ruang belajar Writing Companion untuk satu bacaan (layar penuh).
// HP: layar dibagi atas–bawah — kotak paragraf (±40%) dan panel pembahasan (sisanya), masing-masing
// bergulir sendiri sehingga keduanya selalu terlihat. Desktop: dua kolom berdampingan.
// Pengguna menulis di buku/kertas; aplikasi hanya memandu (goresan + penjelasan).

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, ChevronLeft, ChevronRight, Languages, PenLine, Type, Volume2, X } from 'lucide-react';
import {
  buildCompanionDoc, explainSelection, isSelectedChar, resolveSelection, stepSelection, tokenReading, writableChars,
  type CompanionSentence, type SelectMode, type Selection, type SelectionExplanation,
} from '../../../engine/writingCompanion/companion';
import { getFuriganaSegments } from '../../../utils/furiganaUtils';
import { playSound, speakJapanese } from '../../../utils/audio';
import { useBackButton } from '../../../hooks/useBackButton';
import { StrokeOrderPlayer } from './StrokeOrderPlayer';
import { loadDone, saveDone, type CompanionSource } from './storage';

const MODES: { value: SelectMode; label: string }[] = [
  { value: 'word', label: 'Kata' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'phrase', label: 'Frasa' },
];
const SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl'] as const;

const label = 'text-[10px] font-mono font-bold uppercase tracking-wider text-gold-soft';
const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';

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
// RUANG BELAJAR
// ------------------------------------------------------------------------------

interface Props {
  source: CompanionSource;
  soundEnabled?: boolean;
  onClose: () => void;
  /** Dipanggil saat tanda "sudah ditulis" berubah, agar kartu di daftar ikut diperbarui. */
  onProgress?: () => void;
}

export const WritingCompanionStudy: React.FC<Props> = ({ source, soundEnabled = true, onClose, onProgress }) => {
  const doc = useMemo(() => buildCompanionDoc(source.text, source.translations), [source]);
  const [mode, setMode] = useState<SelectMode>('word');
  const [panel, setPanel] = useState<'writing' | 'explanation'>('writing');
  const [sel, setSel] = useState<Selection | null>(null);
  const [furigana, setFurigana] = useState(false);
  const [size, setSize] = useState(1);
  const [para, setPara] = useState<number | 'all'>(doc.paragraphs.length > 1 ? 0 : 'all');
  const [done, setDone] = useState<Set<number>>(() => loadDone(source.id));

  const click = () => playSound('click', soundEnabled);
  const close = () => { click(); onClose(); };

  useBackButton(true, () => { onClose(); });

  // Kunci gulir halaman di belakang ruang belajar.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const explanation = useMemo(() => (sel ? explainSelection(doc, sel) : null), [doc, sel]);
  const chars = useMemo(() => (explanation ? writableChars(explanation.text) : []), [explanation]);

  // Ganti mode → seleksi menyesuaikan pada posisi yang sama.
  useEffect(() => {
    if (!sel || sel.mode === mode) return;
    setSel(resolveSelection(doc, sel.si, sel.start, mode));
  }, [mode]);

  // Seleksi pindah ke paragraf lain (lewat panah) → tampilkan paragraf itu.
  useEffect(() => {
    if (!sel || para === 'all') return;
    const p = doc.sentences[sel.si]?.paragraph;
    if (p !== undefined && p !== para) setPara(p);
  }, [sel]);

  const visibleParas = para === 'all' ? doc.paragraphs.map((_, i) => i) : [para];

  const onParagraphClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-ci]') as HTMLElement | null;
    if (!el) return;
    const next = resolveSelection(doc, Number(el.dataset.si), Number(el.dataset.ci), mode);
    if (!next) return;
    click();
    setSel(prev => (prev && prev.si === next.si && prev.start === next.start && prev.end === next.end ? null : next));
  };

  const move = (dir: 1 | -1) => {
    const firstSi = doc.paragraphs[para === 'all' ? 0 : para]?.[0] ?? 0;
    const next = sel ? stepSelection(doc, sel, dir) : resolveSelection(doc, firstSi, 0, mode) ?? stepSelection(doc, { si: firstSi, start: 0, end: 1, mode }, 1);
    if (next) { click(); setSel(next); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape') setSel(null);
  };

  const toggleDone = (si: number) => {
    click();
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(si)) next.delete(si); else next.add(si);
      saveDone(source.id, next);
      return next;
    });
    onProgress?.();
  };

  const chip = (on: boolean) => `ui-chip px-2.5 py-1 text-[11px] font-bold shrink-0 ${on ? 'is-active' : ''}`;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-black/75" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Writing Companion: ${source.title}`}
        className="panel relative w-full sm:max-w-6xl h-[100dvh] sm:h-[min(94vh,920px)] sm:rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header ringkas */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 border-b border-border-subtle bg-surface-inset">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 font-heading">
              <BookOpen className="w-4 h-4 text-gold shrink-0" />
              <span className="font-jp truncate">{source.title}</span>
            </h3>
            <p className="text-[10.5px] text-text-muted font-mono truncate">{source.meta} · {done.size}/{doc.sentences.length} kalimat ditulis</p>
          </div>
          <button type="button" onClick={close} className="btn-physical-secondary p-1.5 shrink-0" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi: atas-bawah di HP, dua kolom di desktop */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-2">
          {/* KOTAK 1 — Paragraf */}
          <div className="h-[40%] lg:h-auto shrink-0 lg:shrink min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-border-subtle">
            <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar border-b border-border-subtle">
              {MODES.map(m => (
                <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => { click(); setMode(m.value); }} className={chip(mode === m.value)}>
                  {m.label}
                </button>
              ))}
              <span className="w-px h-4 bg-border-subtle shrink-0 mx-0.5" aria-hidden="true" />
              <button type="button" onClick={() => { click(); setFurigana(f => !f); }} aria-pressed={furigana} className={chip(furigana)} title="Furigana">
                <span className="font-jp">ふ</span>
              </button>
              <button type="button" onClick={() => { click(); setSize(s => (s + 1) % SIZES.length); }} className={`${chip(false)} inline-flex items-center gap-0.5`} title="Ukuran huruf">
                <Type className="w-3 h-3" />{size + 1}
              </button>
              {doc.paragraphs.length > 1 && (
                <>
                  <span className="w-px h-4 bg-border-subtle shrink-0 mx-0.5" aria-hidden="true" />
                  {doc.paragraphs.map((_, i) => (
                    <button key={i} type="button" onClick={() => { click(); setPara(i); }} aria-pressed={para === i} className={`${chip(para === i)} font-mono`} title={`Paragraf ${i + 1}`}>
                      ¶{i + 1}
                    </button>
                  ))}
                  <button type="button" onClick={() => { click(); setPara('all'); }} aria-pressed={para === 'all'} className={chip(para === 'all')}>
                    Semua
                  </button>
                </>
              )}
            </div>
            <div
              role="application"
              aria-label="Paragraf untuk disalin. Ketuk bagian untuk pembahasan, panah kiri/kanan untuk pindah."
              tabIndex={0}
              onClick={onParagraphClick}
              onKeyDown={onKeyDown}
              className={`flex-1 min-h-0 overflow-y-auto px-4 py-3 font-jp ${SIZES[size]} ${furigana ? 'leading-[2.5]' : 'leading-loose'} text-text-primary space-y-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60 select-none`}
            >
              {visibleParas.map(pi => (
                <p key={pi} className="indent-[1em]">
                  {doc.paragraphs[pi].map(si => (
                    <SentenceView key={si} s={doc.sentences[si]} sel={sel} furigana={furigana} done={done.has(si)} />
                  ))}
                </p>
              ))}
            </div>
          </div>

          {/* KOTAK 2 — Pembahasan */}
          <div className="flex-1 min-h-0 flex flex-col">
            {!explanation ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <PenLine className="w-7 h-7 text-text-muted" />
                <p className="text-sm font-bold text-text-primary">Panel pembahasan masih kosong</p>
                <p className="text-xs text-text-secondary max-w-xs">
                  Salin paragraf di atas ke bukumu. Ketuk kata, kanji, atau frasa yang sedang kamu tulis untuk melihat goresan dan penjelasannya.
                </p>
              </div>
            ) : (
              <>
                <div className="px-3 pt-2 pb-2 space-y-2 border-b border-border-subtle">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-jp font-bold text-text-primary break-all">{explanation.text}</span>
                      {explanation.reading && explanation.reading !== explanation.text && (
                        <span className="text-xs font-jp text-text-secondary">{explanation.reading}</span>
                      )}
                      {explanation.romaji && <span className="text-[11px] font-mono text-text-muted">{explanation.romaji}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => { click(); speakJapanese(explanation.reading || explanation.text).catch(() => undefined); }} className="btn-physical-secondary p-1.5" aria-label="Dengarkan">
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => move(-1)} className="btn-physical-secondary p-1.5" aria-label="Bagian sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
                      <button type="button" onClick={() => move(1)} className="btn-physical-secondary p-1.5" aria-label="Bagian berikutnya"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="Jenis pembahasan">
                    <button type="button" role="tab" aria-selected={panel === 'writing'} onClick={() => { click(); setPanel('writing'); }} className={`${chip(panel === 'writing')} inline-flex items-center justify-center gap-1.5 py-1.5`}>
                      <PenLine className="w-3.5 h-3.5" /> Writing
                    </button>
                    <button type="button" role="tab" aria-selected={panel === 'explanation'} onClick={() => { click(); setPanel('explanation'); }} className={`${chip(panel === 'explanation')} inline-flex items-center justify-center gap-1.5 py-1.5`}>
                      <Languages className="w-3.5 h-3.5" /> Explanation
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
                  {panel === 'writing'
                    ? <StrokeOrderPlayer chars={chars} soundEnabled={soundEnabled} />
                    : <ExplanationBody ex={explanation} />}
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
