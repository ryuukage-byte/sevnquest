import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Swords } from 'lucide-react';
import { FORM_LABEL, type SentenceAnalysis, type TextAnalysis } from '../../engine/textStudy/textAnalyzer';
import { getWordTypeLabel } from '../../utils/wordType';
import { playSound } from '../../utils/audio';

interface Props {
  analysis: TextAnalysis;
  soundEnabled?: boolean;
  /** Kembali ke ringkasan hasil bedah. */
  onBack: () => void;
  onStartQuiz: () => void;
}

const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';
const label = 'text-[10px] font-mono font-bold uppercase tracking-wider text-gold-soft';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h4 className={label}>{title}</h4>
    {children}
  </section>
);

/** Kalimat dengan bagian pola ditandai. */
const MarkedSentence: React.FC<{ s: SentenceAnalysis }> = ({ s }) => {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const g of s.grammar) {
    const from = g.end - g.phrase.length;
    if (from < cursor) continue;
    if (from > cursor) parts.push(<span key={`t${cursor}`}>{s.text.slice(cursor, from)}</span>);
    parts.push(<mark key={`g${g.start}`} className="px-0.5 rounded bg-indigo/25 text-text-primary border-b-2 border-indigo">{g.phrase}</mark>);
    cursor = g.end;
  }
  if (cursor < s.text.length) parts.push(<span key="tail">{s.text.slice(cursor)}</span>);
  return <p className="text-lg sm:text-xl leading-loose font-body text-text-primary">{parts}</p>;
};

export const TextStudyUnderstand: React.FC<Props> = ({ analysis, soundEnabled = true, onBack, onStartQuiz }) => {
  const [index, setIndex] = useState(0);
  const total = analysis.sentences.length;
  const s = analysis.sentences[index];
  const isLast = index === total - 1;
  const click = () => playSound('click', soundEnabled);

  if (!s) return null;

  // Kata unik per kalimat (tanpa duplikat item).
  const seen = new Set<string>();
  const words = s.words.filter(w => (seen.has(w.item.id) ? false : (seen.add(w.item.id), true)));
  const inflected = s.words.filter(w => w.inflected && w.form);

  const go = (next: number) => { click(); setIndex(next); };

  return (
    <div className="space-y-4">
      {/* Progres */}
      <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>Kalimat {index + 1} / {total}</span>
        <div className="flex gap-1" aria-hidden>
          {analysis.sentences.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-gold' : i < index ? 'w-3 bg-gold/50' : 'w-3 bg-border-subtle'}`} />
          ))}
        </div>
      </div>

      {/* 1. Kalimat asli */}
      <Section title="1 · Kalimat asli">
        <div className={card}><MarkedSentence s={s} /></div>
      </Section>

      {/* 2. Arti */}
      <Section title="2 · Arti">
        {s.translation ? (
          <div className={`${card} text-sm text-text-primary`}>{s.translation}</div>
        ) : (
          <div className={`${card} space-y-1`}>
            <div className="text-sm text-text-primary">{s.gloss || 'Belum ada kata yang dikenali dari kalimat ini.'}</div>
            <div className="text-[11px] text-text-muted">Terjemahan lengkap belum tersedia untuk kalimat ini. Di atas hanya arti kata-kata yang dikenali, urut sesuai kemunculan.</div>
          </div>
        )}
      </Section>

      {/* 3. Kosakata */}
      <Section title="3 · Kosakata penting">
        {words.length === 0 ? (
          <div className={`${card} text-sm text-text-secondary`}>Tidak ada kosakata dari database di kalimat ini.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {words.map(w => (
              <div key={w.item.id} className={card}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-heading font-black text-text-primary">{w.item.word}<span className="ml-1.5 text-xs font-normal text-text-secondary">（{w.item.reading}）</span></span>
                  <span className="text-[10px] font-mono text-text-muted shrink-0">{w.item.jlpt}</span>
                </div>
                <div className="text-sm text-text-primary mt-0.5">{w.item.meaningId}</div>
                <div className="text-[11px] text-gold-soft mt-0.5">{getWordTypeLabel(w.item.wordType)}</div>
              </div>
            ))}
          </div>
        )}
        {analysis.unknown.length > 0 && (() => {
          const here = analysis.unknown.filter(u => s.text.includes(u));
          return here.length > 0 ? <p className="text-[11px] text-text-muted">Belum dikenal database: {here.join('、')}</p> : null;
        })()}
      </Section>

      {/* 4. Pola kalimat */}
      <Section title="4 · Pola kalimat (grammar)">
        {s.grammar.length === 0 ? (
          <div className={`${card} text-sm text-text-secondary`}>Tidak ada pola tata bahasa dari database yang terdeteksi di kalimat ini.</div>
        ) : (
          <div className="space-y-2">
            {s.grammar.map(g => {
              const fn = g.item.functions?.join(' · ');
              const note = g.item.keyTakeaway || g.item.nuance;
              return (
                <div key={g.item.id + g.start} className={`${card} space-y-1.5`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-heading font-black text-text-primary text-lg">～{g.key}</span>
                    <span className="text-[10px] font-mono text-text-muted shrink-0">{g.item.level}</span>
                  </div>
                  <dl className="text-sm space-y-1">
                    <div><dt className="inline text-text-muted">Bagian yang terdeteksi: </dt><dd className="inline font-body font-bold text-text-primary">{g.phrase}</dd></div>
                    <div><dt className="inline text-text-muted">Arti: </dt><dd className="inline text-text-primary">{g.item.meaningId}</dd></div>
                    {fn && <div><dt className="inline text-text-muted">Fungsi: </dt><dd className="inline text-text-primary">{fn}</dd></div>}
                    {g.item.formula && <div><dt className="inline text-text-muted">Rumus: </dt><dd className="inline font-mono text-xs text-gold">{g.item.formula}</dd></div>}
                    {note && <div className="text-xs text-text-secondary">{note}</div>}
                  </dl>
                  {g.item.explanation && (
                    <details className="text-xs text-text-secondary">
                      <summary className="cursor-pointer text-text-muted">Penjelasan lengkap</summary>
                      <p className="mt-1 leading-relaxed whitespace-pre-line">{g.item.explanation}</p>
                    </details>
                  )}
                </div>
              );
            })}
            <p className="text-[11px] text-text-muted">Deteksi pola bersifat perkiraan; cek kembali dengan konteks kalimat.</p>
          </div>
        )}
      </Section>

      {/* 5. Partikel */}
      <Section title="5 · Partikel penting">
        {s.particles.length === 0 ? (
          <div className={`${card} text-sm text-text-secondary`}>Tidak ada partikel yang terdeteksi.</div>
        ) : (
          <div className="space-y-1.5">
            {s.particles.map(p => (
              <div key={p.start} className={`${card} flex items-start gap-3`}>
                <span className="font-heading font-black text-xl text-gold w-8 text-center shrink-0">{p.particle}</span>
                <div className="min-w-0 text-sm">
                  <div className="text-text-primary">{p.function}</div>
                  <div className="text-[11px] text-text-muted font-body">…{s.text.slice(Math.max(0, p.start - 4), p.end + 2)}…</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 6. Perubahan kata */}
      {inflected.length > 0 && (
        <Section title="6 · Perubahan kata (konjugasi)">
          <div className="space-y-1.5">
            {inflected.map(w => (
              <div key={w.start} className={`${card} text-sm`}>
                <b className="font-body text-text-primary">{w.surface}</b>
                <span className="text-text-muted"> ← </span>
                <span className="text-text-primary">{w.item.word}</span>
                <span className="text-text-secondary"> · {FORM_LABEL[w.form!] ?? w.form}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7. Struktur */}
      <Section title={`${inflected.length > 0 ? '7' : '6'} · Struktur kalimat`}>
        <div className={`${card} space-y-2`}>
          <div className="flex flex-wrap items-stretch gap-1.5">
            {s.chunks.map((c, i) => (
              <div key={i} className="px-2.5 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-center">
                <div className="font-body font-bold text-text-primary">{c.text}</div>
                <div className="text-[10px] text-text-muted">{c.role}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">Urutan Jepang: keterangan → pelaku/topik → objek → predikat di akhir kalimat.</p>
        </div>
      </Section>

      {/* Navigasi */}
      <div className="flex gap-2 pt-2 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => (index === 0 ? (click(), onBack()) : go(index - 1))}
          className="btn-physical-secondary flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{index === 0 ? 'Ringkasan' : 'Sebelumnya'}</span>
        </button>
        {isLast ? (
          <button type="button" onClick={onStartQuiz} className="btn-cta flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm cursor-pointer">
            <Swords className="w-4 h-4 text-gold" />
            <span>Mulai Latihan</span>
          </button>
        ) : (
          <button type="button" onClick={() => go(index + 1)} className="btn-cta flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm cursor-pointer">
            <span>Kalimat berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
