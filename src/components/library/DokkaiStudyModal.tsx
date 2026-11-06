// "Bedah Dokkai" — satu bacaan menjadi pelajaran bertahap:
// Baca & Pahami → Kotoba · Kanji · Pola → Inti Bacaan → 3 Soal + Pembahasan → Hasil.
// Isi disusun engine dokkaiStudy dari teks itu sendiri + database Kotoba/Kanji/Bunpou SevnQuest.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Languages, Lightbulb,
  Quote, RotateCcw, Sparkles, Target, Trophy, Volume2, X,
} from 'lucide-react';
import type { DokkaiPassage } from '../../engine/dokkaiStudy/types';
import { DOKKAI_LEVELS } from '../../engine/dokkaiStudy/types';
import {
  ROLE_LABEL, buildDokkaiStudy, isLikelyFalseHit, sentenceGloss, wordLevel,
  type DokkaiStudy, type LevelBand, type StudyQuestion,
} from '../../engine/dokkaiStudy/study';
import type { SentenceAnalysis } from '../../engine/textStudy/textAnalyzer';
import { FORM_LABEL } from '../../engine/textStudy/textAnalyzer';
import { getWordTypeLabel } from '../../utils/wordType';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';

type Step = 'baca' | 'materi' | 'inti' | 'soal' | 'hasil';
const STEPS: { id: Step; label: string }[] = [
  { id: 'baca', label: 'Pahami' },
  { id: 'materi', label: 'Kotoba · Kanji · Pola' },
  { id: 'inti', label: 'Inti Bacaan' },
  { id: 'soal', label: '3 Soal' },
  { id: 'hasil', label: 'Hasil' },
];

type CompleteHandler = (
  moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
  expGained: number,
  goldGained: number,
  itemId?: string,
  score?: number,
  total?: number,
  interactionType?: 'writing' | 'flashcard' | 'quiz',
) => void;

interface Props {
  passage: DokkaiPassage;
  readerLevel: string;
  onReaderLevelChange: (lv: string) => void;
  onClose: () => void;
  /** Hanya untuk bacaan hasil generator: rakit bacaan baru dengan pengaturan sama. */
  onRegenerate?: () => void;
  soundEnabled?: boolean;
  onCompleteStudyItem?: CompleteHandler;
  onRewardPlayer?: (exp: number, gold: number) => void;
}

const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';
const label = 'text-[10px] font-mono font-bold uppercase tracking-wider text-gold-soft';

const BAND_STYLE: Record<LevelBand, string> = {
  above: 'bg-amber-500/20 border-b-2 border-amber-500 rounded-sm',
  at: 'border-b border-dotted border-sky-500/70',
  below: '',
};
const BAND_LABEL: Record<LevelBand, string> = { above: 'Di atas levelmu', at: 'Sesuai levelmu', below: 'Di bawah levelmu' };
const BAND_BADGE: Record<LevelBand, string> = {
  above: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  at: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  below: 'bg-surface-inset text-text-muted',
};

const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h4 className={label}>{title}</h4>
      {right}
    </div>
    {children}
  </section>
);

// ------------------------------------------------------------------------------
// Kalimat dengan penanda level per kata
// ------------------------------------------------------------------------------

const MarkedSentence: React.FC<{
  s: SentenceAnalysis;
  bandOfWord: (id: string) => LevelBand | undefined;
  furigana: boolean;
  markLevel: boolean;
  highlight?: boolean;
}> = ({ s, bandOfWord, furigana, markLevel, highlight }) => {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const w of s.words) {
    if (w.start < cursor || isLikelyFalseHit(w)) continue;
    if (w.start > cursor) parts.push(<RubyText key={`t${cursor}`} text={s.text.slice(cursor, w.start)} showFurigana={furigana} />);
    const band = bandOfWord(w.item.id);
    parts.push(
      <span key={`w${w.start}`} className={markLevel && band ? BAND_STYLE[band] : ''}>
        <RubyText text={w.surface} showFurigana={furigana} />
      </span>,
    );
    cursor = w.end;
  }
  if (cursor < s.text.length) parts.push(<RubyText key="tail" text={s.text.slice(cursor)} showFurigana={furigana} />);
  return <span className={highlight ? 'bg-gold/15 rounded' : ''}>{parts}</span>;
};

/** Rincian satu kalimat: arti, kata, konjugasi, pola. */
const SentenceBreakdown: React.FC<{ s: SentenceAnalysis; study: DokkaiStudy }> = ({ s, study }) => {
  const seen = new Set<string>();
  const words = s.words.filter(w => !isLikelyFalseHit(w) && (seen.has(w.item.id) ? false : (seen.add(w.item.id), true)));
  const bandById = new Map(study.words.map(w => [w.item.id, w.band]));
  const gloss = s.translation || sentenceGloss(s);
  return (
    <div className="mt-2 p-3 rounded-xl bg-surface border border-border-subtle space-y-2.5 text-left">
      <div>
        <div className="text-[10px] font-mono uppercase text-text-muted">{s.translation ? 'Arti' : 'Arti kata demi kata (bukan terjemahan)'}</div>
        <div className="text-sm text-text-primary">{gloss || '—'}</div>
      </div>
      {words.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {words.map(w => {
            const band = bandById.get(w.item.id) || 'below';
            return (
              <span key={w.item.id} className={`px-2 py-1 rounded-lg text-xs ${BAND_BADGE[band]}`} title={BAND_LABEL[band]}>
                <span className="font-jp font-bold">{w.item.word}</span>
                {w.item.reading && w.item.reading !== w.item.word && <span className="opacity-70">（{w.item.reading}）</span>} {(w.item.meaningId || '').split(/[;；]/)[0]}
                {w.inflected && w.form && <span className="block text-[10px] opacity-80">「{w.surface}」 = {FORM_LABEL[w.form] || w.form}</span>}
              </span>
            );
          })}
        </div>
      )}
      {s.grammar.length > 0 && (
        <div className="space-y-1">
          {s.grammar.map(g => (
            <div key={g.item.id + g.start} className="text-xs">
              <span className="font-jp font-bold text-indigo">～{g.key}</span>
              <span className="text-text-muted"> ({g.item.level}) · </span>
              <span className="text-text-primary">{g.item.meaningId}</span>
              <span className="text-text-muted"> — di teks: </span>
              <span className="font-jp text-text-secondary">{g.phrase}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------
// Tahap 1: Baca & Pahami
// ------------------------------------------------------------------------------

const ReadStep: React.FC<{ study: DokkaiStudy; soundEnabled: boolean }> = ({ study, soundEnabled }) => {
  const [furigana, setFurigana] = useState(false);
  const [markLevel, setMarkLevel] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const bandById = useMemo(() => new Map(study.words.map(w => [w.item.id, w.band])), [study]);

  const toggle = (on: boolean) => `ui-chip px-3 py-1.5 text-xs font-bold ${on ? 'is-active' : ''}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={furigana} className={toggle(furigana)} onClick={() => setFurigana(v => !v)}>
          {furigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Furigana
        </button>
        <button type="button" aria-pressed={markLevel} className={toggle(markLevel)} onClick={() => setMarkLevel(v => !v)}>
          <Target className="w-3.5 h-3.5" /> Tandai level kata
        </button>
        <button type="button" aria-pressed={showFlow} className={toggle(showFlow)} onClick={() => setShowFlow(v => !v)}>
          <Lightbulb className="w-3.5 h-3.5" /> Peran paragraf
        </button>
      </div>
      {markLevel && (
        <div className="flex flex-wrap gap-3 text-[11px] text-text-secondary">
          <span><span className={`px-1 ${BAND_STYLE.above}`}>漢字</span> di atas level {study.readerLevel}</span>
          <span><span className={`px-1 ${BAND_STYLE.at}`}>漢字</span> sesuai level {study.readerLevel}</span>
          <span className="text-text-muted">Ketuk kalimat untuk melihat arti, kata, dan pola.</span>
        </div>
      )}

      <div className="space-y-3">
        {study.paragraphs.map((p, pi) => {
          const sents = study.sentencesByParagraph[pi] || [];
          const role = ROLE_LABEL[p.role];
          return (
            <div key={pi} className={`${card} space-y-2`}>
              {showFlow && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo">
                    ¶{pi + 1} · {role.label}{p.marker ? ` 「${p.marker}」` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => { void speakJapanese(p.text); playSound('click', soundEnabled); }}
                    className="btn-physical-secondary p-1.5"
                    aria-label="Dengarkan paragraf"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-lg leading-loose font-jp text-text-primary">
                {sents.map((s, si) => {
                  const key = `${pi}-${si}`;
                  return (
                    <span
                      key={key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpen(open === key ? null : key)}
                      onKeyDown={e => { if (e.key === 'Enter') setOpen(open === key ? null : key); }}
                      className={`cursor-pointer hover:bg-gold/10 rounded transition-colors ${open === key ? 'bg-gold/15' : ''}`}
                    >
                      <MarkedSentence s={s} bandOfWord={id => bandById.get(id)} furigana={furigana} markLevel={markLevel} />
                    </span>
                  );
                })}
              </p>
              {sents.map((s, si) => (open === `${pi}-${si}` ? <SentenceBreakdown key={si} s={s} study={study} /> : null))}
              {showFlow && (
                <div className="text-[11px] text-text-secondary border-t border-border-subtle pt-2">
                  <span className="text-text-muted">Kalimat kunci: </span>
                  <span className="font-jp">{p.keySentence}</span>
                  {p.keyGloss && <span className="block text-text-muted">→ {p.keyGloss}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------
// Tahap 2: Kotoba · Kanji · Pola
// ------------------------------------------------------------------------------

const MaterialStep: React.FC<{ study: DokkaiStudy }> = ({ study }) => {
  const [tab, setTab] = useState<'kotoba' | 'kanji' | 'pola'>('kotoba');
  const [showBelow, setShowBelow] = useState(false);
  const groups: LevelBand[] = ['above', 'at', 'below'];
  const tabBtn = (id: typeof tab, text: string, n: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`ui-chip flex-1 justify-center px-3 py-2 text-xs font-bold ${tab === id ? 'is-active' : ''}`}
    >
      {text} <span className="font-mono opacity-70">{n}</span>
    </button>
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {tabBtn('kotoba', 'Kotoba', study.words.length)}
        {tabBtn('kanji', 'Kanji', study.kanji.length)}
        {tabBtn('pola', 'Pola', study.grammar.length)}
      </div>

      {tab === 'kotoba' && (
        <div className="space-y-4">
          {study.glossary.length > 0 && (
            <Section title="Glosarium bacaan ini">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {study.glossary.map(g => (
                  <div key={g.word} className={card}>
                    <span className="font-jp font-black text-text-primary">{g.word}</span>
                    <span className="ml-1.5 text-xs text-text-secondary">（{g.reading}）</span>
                    <div className="text-sm text-text-primary">{g.meaning}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {groups.map(band => {
            const list = study.words.filter(w => w.band === band);
            if (list.length === 0) return null;
            if (band === 'below' && !showBelow) {
              return (
                <button key={band} type="button" onClick={() => setShowBelow(true)} className="btn-physical-secondary w-full px-3 py-2 text-xs">
                  Tampilkan {list.length} kata di bawah level {study.readerLevel}
                </button>
              );
            }
            return (
              <Section key={band} title={`${BAND_LABEL[band]} (${study.readerLevel}) · ${list.length}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {list.map(w => (
                    <div key={w.item.id} className={`${card} space-y-0.5`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-jp font-black text-text-primary">
                          {w.item.word}
                          {w.item.reading && w.item.reading !== w.item.word && <span className="ml-1.5 text-xs font-normal text-text-secondary">（{w.item.reading}）</span>}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 rounded ${BAND_BADGE[band]}`}>{wordLevel(w.item)}</span>
                      </div>
                      <div className="text-sm text-text-primary">{w.item.meaningId}</div>
                      <div className="text-[11px] text-gold-soft">
                        {getWordTypeLabel(w.item.wordType)}
                        {w.surfaces.some(sf => sf !== w.item.word) && <span className="text-text-muted"> · di teks: {w.surfaces.join('、')}</span>}
                        {w.count > 1 && <span className="text-text-muted"> · muncul {w.count}×</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })}
          {study.analysis.unknown.length > 0 && (
            <p className="text-[11px] text-text-muted">Belum dikenal database: <span className="font-jp">{study.analysis.unknown.slice(0, 20).join('、')}</span></p>
          )}
          <p className="text-[11px] text-text-muted">Level kata diperkirakan dari label database dan level kanji penyusunnya.</p>
        </div>
      )}

      {tab === 'kanji' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {study.kanji.map(k => (
            <div key={k.item.id} className={`${card} space-y-1`}>
              <div className="flex items-start justify-between">
                <span className="text-3xl font-jp font-black text-text-primary leading-none">{k.item.character}</span>
                <span className={`text-[10px] font-mono px-1.5 rounded ${BAND_BADGE[k.band]}`}>{k.item.jlpt}</span>
              </div>
              <div className="text-xs text-text-primary">{k.item.meaningId}</div>
              <div className="text-[10.5px] text-text-secondary font-jp leading-snug">
                {k.item.onyomi?.length > 0 && <div>音: {k.item.onyomi.slice(0, 3).join('・')}</div>}
                {k.item.kunyomi?.length > 0 && <div>訓: {k.item.kunyomi.slice(0, 3).join('・')}</div>}
              </div>
              {k.inWords.length > 0 && <div className="text-[10.5px] text-gold-soft font-jp">{k.inWords.join('・')}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'pola' && (
        <div className="space-y-2">
          {study.grammar.length === 0 && <div className={`${card} text-sm text-text-secondary`}>Tidak ada pola tata bahasa dari database yang terdeteksi.</div>}
          {study.grammar.map(g => (
            <div key={g.item.id} className={`${card} space-y-1`}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-jp font-black text-text-primary">～{g.matched}</span>
                <span className={`text-[10px] font-mono px-1.5 rounded shrink-0 ${BAND_BADGE[g.band]}`}>{g.item.level}</span>
              </div>
              <div className="text-sm text-text-primary">{g.item.meaningId}</div>
              {g.item.formula && <div className="font-mono text-xs text-gold">{g.item.formula}</div>}
              <div className="text-xs text-text-secondary font-jp">「{g.sentence}」</div>
              {(g.item.keyTakeaway || g.item.nuance) && <div className="text-[11px] text-text-muted">{g.item.keyTakeaway || g.item.nuance}</div>}
            </div>
          ))}
          <p className="text-[11px] text-text-muted">Deteksi pola bersifat perkiraan; cek kembali dengan konteks kalimat.</p>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------
// Tahap 3: Inti Bacaan
// ------------------------------------------------------------------------------

const TEXT_TYPE: Record<DokkaiStudy['mainIdea']['textType'], { name: string; tip: string }> = {
  narrative: { name: 'Cerita / pengalaman', tip: 'Ikuti urutan kejadian dan perubahan perasaan tokoh. Inti biasanya ada pada apa yang ia sadari atau rasakan di akhir.' },
  opinion: { name: 'Esai / uraian pendapat', tip: 'Cari kalimat pendapat/kesimpulan (〜と思う・〜べきだ・〜のではないか・大切なのは・このように) — biasanya di paragraf terakhir atau setelah しかし.' },
  info: { name: 'Teks informasi', tip: 'Bukan untuk dicari pendapatnya. Baca soal dulu, lalu cari syarat, tanggal, biaya, dan catatan (※・ただし) yang relevan.' },
};

const BASIS_LABEL = {
  given: 'Inti bacaan',
  question: 'Inti menurut soal ide pokok (jawaban benarnya)',
  auto: 'Kalimat yang paling mungkin menjadi inti (perkiraan)',
} as const;

const IdeaStep: React.FC<{ study: DokkaiStudy }> = ({ study }) => {
  const m = study.mainIdea;
  const tt = TEXT_TYPE[m.textType];
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-gold/40 bg-gold/10 space-y-2">
        <div className="text-[10px] font-mono font-bold uppercase text-gold">{BASIS_LABEL[m.basis]}</div>
        <p className="text-lg font-jp font-bold text-text-primary leading-relaxed">{m.text}</p>
        {m.translation && <p className="text-sm text-text-secondary">{m.translation}</p>}
      </div>

      <div className={`${card} space-y-1`}>
        <div className="text-[10px] font-mono uppercase text-text-muted">Jenis teks</div>
        <div className="text-sm font-bold text-text-primary">{tt.name}</div>
        <div className="text-xs text-text-secondary">{tt.tip}</div>
        {m.topicWords.length > 0 && (
          <div className="text-xs text-text-secondary pt-1">
            Kata kunci topik:{' '}
            {m.topicWords.map(w => <span key={w.id} className="font-jp font-bold text-text-primary mr-2">{w.word}<span className="font-body font-normal text-text-muted"> ({(w.meaningId || '').split(/[;；,]/)[0]})</span></span>)}
          </div>
        )}
      </div>

      <Section title="Kalimat kunci & alasannya">
        <div className="space-y-2">
          {m.keySentences.map((k, i) => (
            <div key={i} className={`${card} space-y-1`}>
              <p className="font-jp text-text-primary">「{k.text}」</p>
              {k.gloss && <p className="text-xs text-text-secondary">→ {k.gloss}</p>}
              <p className="text-[11px] text-gold-soft">Kenapa penting: {k.reason}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Alur bacaan">
        <ol className="space-y-2">
          {study.paragraphs.map(p => (
            <li key={p.index} className="flex gap-2">
              <span className="w-6 h-6 shrink-0 rounded-full bg-indigo/15 text-indigo text-xs font-bold flex items-center justify-center">{p.index + 1}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-text-primary">{ROLE_LABEL[p.role].label}</div>
                <div className="text-[11px] text-text-muted">{ROLE_LABEL[p.role].hint}</div>
                <div className="text-xs font-jp text-text-secondary mt-0.5">{p.keySentence}</div>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
};

// ------------------------------------------------------------------------------
// Tahap 4: Soal
// ------------------------------------------------------------------------------

const QuestionCard: React.FC<{
  q: StudyQuestion;
  index: number;
  answer?: number;
  onAnswer: (i: number) => void;
  soundEnabled: boolean;
}> = ({ q, index, answer, onAnswer, soundEnabled }) => {
  const [showGloss, setShowGloss] = useState(false);
  const answered = answer !== undefined;
  return (
    <div className="space-y-3">
      <div className={`${card} space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-indigo">Soal {index + 1} · {q.kindLabel}</span>
          {q.supplementary && <span className="text-[10px] font-mono text-text-muted">soal tambahan</span>}
        </div>
        <p className="text-base font-jp font-bold text-text-primary leading-relaxed">{q.prompt}</p>
        {q.promptGloss && (
          <button type="button" onClick={() => setShowGloss(v => !v)} className={`ui-chip px-2.5 py-1 text-[11px] font-bold ${showGloss ? 'is-active' : ''}`}>
            <Languages className="w-3.5 h-3.5" /> {showGloss ? 'Sembunyikan arti soal' : 'Bantu arti soal'}
          </button>
        )}
        {showGloss && q.promptGloss && <p className="text-xs text-text-secondary">→ {q.promptGloss}</p>}
      </div>

      <div className="space-y-2.5">
        {q.options.map((o, i) => {
          const isCorrect = i === q.correctIndex;
          const chosen = answer === i;
          const style = !answered
            ? 'btn-physical-secondary !justify-start !items-start'
            : isCorrect
              ? 'rounded-2xl border border-emerald-500 bg-emerald-500/10'
              : chosen
                ? 'rounded-2xl border border-rose-500 bg-rose-500/10'
                : 'rounded-2xl border border-border-subtle opacity-70';
          const review = q.reviews[i];
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => { onAnswer(i); playSound(isCorrect ? 'correct' : 'wrong', soundEnabled); }}
              data-option={i}
              className={`w-full text-left p-3 font-normal ${style}`}
            >
              <div className="flex gap-2">
                <span className="w-6 h-6 shrink-0 rounded-lg bg-surface-inset border border-border-subtle text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="min-w-0 space-y-1">
                  <div className="font-jp text-text-primary">{o}</div>
                  {answered && review && (
                    <>
                      {review.gloss && <div className="text-[11px] text-text-muted">→ {review.gloss}</div>}
                      <div className={`text-[11px] font-bold ${isCorrect ? 'text-emerald-500' : 'text-text-secondary'}`}>
                        {isCorrect ? '✓ ' : '✗ '}{review.verdict}
                      </div>
                      {!isCorrect && review.closest && !q.supplementary && (
                        <div className="text-[11px] text-text-muted font-jp">Bandingkan: 「{review.closest}」</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="space-y-2">
          <div className={`p-3 rounded-2xl border ${answer === q.correctIndex ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10'}`}>
            <div className="text-sm font-bold text-text-primary">
              {answer === q.correctIndex ? 'Benar!' : `Kurang tepat — jawabannya nomor ${q.correctIndex + 1}.`}
            </div>
          </div>
          {q.evidence && (
            <div className={`${card} space-y-1`}>
              <div className="text-[10px] font-mono uppercase text-gold-soft flex items-center gap-1"><Quote className="w-3 h-3" /> Bukti di teks</div>
              <p className="font-jp text-text-primary bg-gold/10 rounded px-1">{q.evidence}</p>
              {q.evidenceGloss && <p className="text-xs text-text-secondary">→ {q.evidenceGloss}</p>}
            </div>
          )}
          <div className={`${card} space-y-1`}>
            <div className="text-[10px] font-mono uppercase text-gold-soft">Pembahasan{q.autoExplanation ? ' (disusun otomatis dari pencocokan teks)' : ''}</div>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">{q.explanation}</p>
          </div>
          {!q.autoExplanation && (
            <div className={`${card} space-y-1`}>
              <div className="text-[10px] font-mono uppercase text-gold-soft flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Strategi soal {q.kindLabel.toLowerCase()}</div>
              <p className="text-xs text-text-secondary leading-relaxed">{q.strategy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------
// Bacaan polos (sebelum dibahas)
// ------------------------------------------------------------------------------

const PlainReading: React.FC<{ study: DokkaiStudy; soundEnabled: boolean }> = ({ study, soundEnabled }) => {
  const [furigana, setFurigana] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={furigana} onClick={() => setFurigana(v => !v)} className={`ui-chip px-3 py-1.5 text-xs font-bold ${furigana ? 'is-active' : ''}`}>
          {furigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Furigana
        </button>
        <button
          type="button"
          onClick={() => { void speakJapanese(study.passage.text); playSound('click', soundEnabled); }}
          className="btn-physical-secondary px-3 py-1.5 text-xs"
        >
          <Volume2 className="w-3.5 h-3.5" /> Dengarkan
        </button>
      </div>
      <article className="space-y-4">
        {study.paragraphs.map((p, i) => (
          <p key={i} className="text-lg leading-loose font-jp text-text-primary">
            {(study.sentencesByParagraph[i] || []).map((s, j) => <RubyText key={j} text={s.text} showFurigana={furigana} />)}
          </p>
        ))}
      </article>
      <p className="text-xs text-text-muted border-t border-border-subtle pt-3">
        Baca sampai selesai dulu. Setelah itu tekan <b className="text-text-secondary">Bahas bacaan</b> untuk membedah paragraf, kosakata, kanji, pola, dan intinya, atau <b className="text-text-secondary">Kerjakan soal</b> untuk langsung menguji pemahamanmu.
      </p>
    </div>
  );
};

// ------------------------------------------------------------------------------
// MODAL
// ------------------------------------------------------------------------------

export const DokkaiStudyModal: React.FC<Props> = ({
  passage, readerLevel, onReaderLevelChange, onClose, onRegenerate, soundEnabled = true, onCompleteStudyItem, onRewardPlayer,
}) => {
  const study = useMemo(() => buildDokkaiStudy(passage, readerLevel), [passage, readerLevel]);
  // Bacaan dibuka polos dulu; fitur bedah baru muncul setelah pengguna menekan "Bahas".
  const [mode, setMode] = useState<'plain' | 'study'>('plain');
  const [step, setStep] = useState<Step>('baca');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const rewarded = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);

  // Bacaan baru (mis. hasil Rakit ulang) → mulai dari awal.
  useEffect(() => { setMode('plain'); setStep('baca'); setQIndex(0); setAnswers({}); }, [passage.id]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [mode, step, qIndex, passage.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const click = () => playSound('click', soundEnabled);
  const stepIdx = STEPS.findIndex(s => s.id === step);
  const total = study.questions.length;
  const score = study.questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const allAnswered = Object.keys(answers).length === total;

  const finish = () => {
    if (!rewarded.current.has(passage.id)) {
      rewarded.current.add(passage.id);
      const exp = score * 12;
      const gold = score * 4;
      if (onCompleteStudyItem) onCompleteStudyItem('dokkai', exp, gold, passage.id, score, total, 'quiz');
      else if (exp > 0) onRewardPlayer?.(exp, gold);
    }
    setStep('hasil');
    playSound(score === total ? 'levelUp' : 'click', soundEnabled);
  };

  const goNext = () => {
    click();
    if (step === 'soal') {
      if (qIndex < total - 1) setQIndex(qIndex + 1);
      else finish();
      return;
    }
    const next = STEPS[stepIdx + 1];
    if (next && next.id !== 'hasil') setStep(next.id);
  };
  const goPrev = () => {
    click();
    if (step === 'soal' && qIndex > 0) { setQIndex(qIndex - 1); return; }
    const prev = STEPS[stepIdx - 1];
    if (prev) setStep(prev.id);
    else setMode('plain');
  };
  const startStudy = (at: Step) => { click(); setStep(at); setMode('study'); };
  const restartQuiz = () => { click(); setAnswers({}); setQIndex(0); setStep('soal'); };

  const nextDisabled = step === 'soal' && answers[qIndex] === undefined;

  return createPortal(
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { onClose(); click(); }} className="fixed inset-0 bg-black/75" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Bedah Dokkai ${passage.title}`}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="panel panel-stitched relative w-full max-w-2xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden h-[min(94vh,900px)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-4 py-3 sm:px-5 border-b border-border-subtle bg-surface-inset">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 font-heading">
              <BookOpen className="w-4 h-4 text-gold shrink-0" />
              <span className="font-jp truncate">{passage.title}</span>
            </h3>
            <p className="text-[11px] text-text-muted font-mono truncate">
              <span className="text-text-secondary font-bold">{passage.levelLabel}</span> · {passage.sourceLabel} · {study.stats.chars} huruf · {study.stats.sentences} kalimat
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="text-[10px] font-mono text-text-muted hidden sm:block" htmlFor="dokkai-reader-level">Levelku</label>
            <select
              id="dokkai-reader-level"
              value={readerLevel}
              onChange={e => onReaderLevelChange(e.target.value)}
              className="bg-surface border border-border-subtle rounded-lg text-xs font-bold px-1.5 py-1 text-text-primary cursor-pointer"
              title="Kata di atas level ini ditandai"
            >
              {DOKKAI_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
            </select>
            <button type="button" onClick={() => { onClose(); click(); }} className="btn-physical-secondary p-1.5" aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rel tahapan (hanya saat dibahas) */}
        {mode === 'study' && (
          <ol className="flex items-center gap-2 px-3 sm:px-5 py-2.5 border-b border-border-subtle overflow-x-auto no-scrollbar" aria-label="Tahapan">
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const locked = s.id === 'hasil' && !allAnswered;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => { click(); setStep(s.id); }}
                    aria-current={active ? 'step' : undefined}
                    className={`ui-chip px-3 py-1.5 text-xs font-bold ${active ? 'is-active' : ''}`}
                  >
                    <span className="font-mono opacity-70">{i + 1}</span> {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {/* Isi */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
          {mode === 'plain' && <PlainReading study={study} soundEnabled={soundEnabled} />}
          {mode === 'study' && step === 'baca' && <ReadStep study={study} soundEnabled={soundEnabled} />}
          {mode === 'study' && step === 'materi' && <MaterialStep study={study} />}
          {mode === 'study' && step === 'inti' && <IdeaStep study={study} />}
          {mode === 'study' && step === 'soal' && study.questions[qIndex] && (
            <>
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>Soal {qIndex + 1} / {total}</span>
                <div className="flex gap-1" aria-hidden>
                  {study.questions.map((q, i) => (
                    <span key={i} className={`h-1.5 rounded-full ${i === qIndex ? 'w-6 bg-gold' : answers[i] === undefined ? 'w-3 bg-border-subtle' : answers[i] === q.correctIndex ? 'w-3 bg-emerald-500' : 'w-3 bg-rose-500'}`} />
                  ))}
                </div>
              </div>
              <details className={`${card} text-sm`}>
                <summary className="cursor-pointer text-xs font-bold text-text-secondary select-none">Lihat teks bacaan</summary>
                <div className="mt-2 font-jp text-text-primary leading-loose whitespace-pre-line">{passage.text}</div>
              </details>
              <QuestionCard
                key={`${passage.id}-${qIndex}`}
                q={study.questions[qIndex]}
                index={qIndex}
                answer={answers[qIndex]}
                onAnswer={i => setAnswers(a => ({ ...a, [qIndex]: i }))}
                soundEnabled={soundEnabled}
              />
            </>
          )}
          {mode === 'study' && step === 'hasil' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center">
                <Trophy className="w-8 h-8 text-gold" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-text-primary">{score} <span className="text-base text-text-muted">/ {total}</span></div>
                <div className="text-sm text-text-secondary">
                  {score === total ? 'Sempurna! Kamu memahami bacaan ini.' : score >= 2 ? 'Bagus! Tinjau lagi soal yang salah.' : 'Coba baca ulang bagian Inti Bacaan lalu ulangi soalnya.'}
                </div>
                <div className="text-xs font-mono text-gold mt-1">+{score * 12} EXP · +{score * 4} Gold</div>
              </div>
              <div className="text-left space-y-2">
                {study.questions.map((q, i) => (
                  <button key={q.id} type="button" onClick={() => { click(); setQIndex(i); setStep('soal'); }} className="btn-physical-secondary w-full !justify-start !items-start text-left p-3 font-normal">
                    {answers[i] === q.correctIndex ? <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                    <span className="min-w-0">
                      <span className="block text-xs font-jp text-text-primary">{q.prompt}</span>
                      <span className="block text-[11px] text-text-muted">Kunci: <span className="font-jp">{q.options[q.correctIndex]}</span></span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button type="button" onClick={() => { click(); setMode('plain'); }} className="btn-physical-secondary px-5 py-2.5 text-xs">
                  <BookOpen className="w-4 h-4" /> Baca ulang
                </button>
                <button type="button" onClick={restartQuiz} className="btn-skeuo-indigo px-5 py-2.5 text-xs">
                  <RotateCcw className="w-4 h-4" /> Ulangi soal
                </button>
                {onRegenerate && (
                  <button type="button" onClick={() => { click(); onRegenerate(); }} className="btn-skeuo-gold px-5 py-2.5 text-xs">
                    <Sparkles className="w-4 h-4" /> Rakit bacaan baru
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigasi: bacaan polos */}
        {mode === 'plain' && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-5 border-t border-border-subtle bg-surface-inset">
            <button type="button" onClick={() => startStudy('soal')} className="btn-physical-secondary px-4 py-2 text-xs">
              <Target className="w-4 h-4" /> Kerjakan soal
            </button>
            <button type="button" onClick={() => startStudy('baca')} className="btn-skeuo-gold px-4 py-2 text-xs">
              <Lightbulb className="w-4 h-4" /> Bahas bacaan
            </button>
          </div>
        )}

        {/* Navigasi: pembahasan */}
        {mode === 'study' && step !== 'hasil' && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5 border-t border-border-subtle bg-surface-inset">
            <button type="button" onClick={goPrev} className="btn-physical-secondary px-3 py-2 text-xs">
              <ChevronLeft className="w-4 h-4" /> {stepIdx === 0 ? 'Bacaan polos' : 'Kembali'}
            </button>
            <button type="button" onClick={goNext} disabled={nextDisabled} className="btn-skeuo-gold px-4 py-2 text-xs disabled:opacity-50">
              {step === 'soal' ? (qIndex < total - 1 ? 'Soal berikutnya' : 'Lihat hasil') : step === 'inti' ? 'Mulai 3 soal' : 'Lanjut'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default DokkaiStudyModal;
