import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ScrollText, Lightbulb, BookOpen, Languages, Shapes, Swords, ChevronRight, RotateCcw, Check, GraduationCap } from 'lucide-react';
import { analyzeText, MAX_INPUT_CHARS, type TextAnalysis, type WordHit } from '../../engine/textStudy/textAnalyzer';
import { TextStudyUnderstand } from './TextStudyUnderstand';
import { buildTextQuiz, type TextQuizQuestion } from '../../engine/textStudy/textQuiz';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { calcEngineExp, getEntityBaseExp } from '../../utils/rewards';
import { playSound } from '../../utils/audio';

interface Props {
  onClose: () => void;
  soundEnabled?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
}

type Phase = 'input' | 'result' | 'understand' | 'quiz' | 'summary';
type Tab = 'kalimat' | 'kotoba' | 'pola' | 'kanji';

const SAMPLES = [
  { label: 'Contoh kalimat', text: '昨日、友達と映画を見に行きました。' },
  { label: 'Contoh paragraf', text: '私は毎朝六時に起きます。顔を洗ってから、朝ご飯を食べなければなりません。学校まで歩いて二十分ぐらいかかりますが、天気がいい日は気持ちがいいです。' },
];

// Entitas yang sudah pernah memberi EXP dari dungeon ini (per sesi halaman) — mencegah farming dengan teks yang sama.
const rewardedEntities = new Set<string>();

function pickDokkai(): string {
  const pool = Object.values(DOKKAI_DATABASE).filter(d => d.text && d.text.length <= 600);
  const d = pool[Math.floor(Math.random() * pool.length)];
  return d?.text ?? SAMPLES[1].text;
}

const HighlightedSentence: React.FC<{ text: string; words: WordHit[]; onPick: (w: WordHit) => void; activeId?: string }> = ({ text, words, onPick, activeId }) => {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const w of words) {
    if (w.start > cursor) parts.push(<span key={`t${cursor}`}>{text.slice(cursor, w.start)}</span>);
    const active = activeId === w.item.id;
    parts.push(
      <button
        key={`w${w.start}`}
        type="button"
        onClick={() => onPick(w)}
        className={`px-0.5 rounded-md border-b-2 transition-colors cursor-pointer ${
          active ? 'bg-gold/25 border-gold text-text-primary' : 'border-gold/40 hover:bg-gold/15'
        }`}
      >
        {w.surface}
      </button>
    );
    cursor = w.end;
  }
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <p className="text-base sm:text-lg leading-loose font-body text-text-primary">{parts}</p>;
};

export const TextStudyDungeonModal: React.FC<Props> = ({ onClose, soundEnabled = true, onRewardPlayer }) => {
  const [phase, setPhase] = useState<Phase>('input');
  const [tab, setTab] = useState<Tab>('kalimat');
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [picked, setPicked] = useState<WordHit | null>(null);

  const [quiz, setQuiz] = useState<TextQuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [correct, setCorrect] = useState<string[]>([]);
  const [reward, setReward] = useState({ exp: 0, gold: 0 });

  const click = () => playSound('click', soundEnabled);
  const hasContent = !!analysis && (analysis.vocab.length > 0 || analysis.grammar.length > 0 || analysis.kanji.length > 0);

  const handleAnalyze = () => {
    click();
    const result = analyzeText(input);
    setAnalysis(result);
    setPicked(null);
    setTab('kalimat');
    setPhase('result');
  };

  const startUnderstand = () => {
    if (!analysis || !hasContent) return;
    click();
    setPhase('understand');
  };

  const startQuiz = () => {
    if (!analysis) return;
    click();
    const q = buildTextQuiz(analysis);
    if (q.length === 0) return;
    setQuiz(q);
    setQIndex(0);
    setAnswer(null);
    setCorrect([]);
    setPhase('quiz');
  };

  const finishQuiz = (rightIds: string[]) => {
    let exp = 0;
    for (const q of quiz.filter(x => rightIds.includes(x.id))) {
      if (rewardedEntities.has(q.entityId)) continue;
      rewardedEntities.add(q.entityId);
      const category = q.kind === 'grammar' ? 'bunpou' : 'kotoba';
      exp += calcEngineExp(getEntityBaseExp(category, q.entityId) ?? 15, 'quiz');
    }
    const gold = Math.round(exp / 2);
    setReward({ exp, gold });
    if (exp > 0) onRewardPlayer?.(exp, gold);
    setPhase('summary');
  };

  const handleAnswer = (i: number) => {
    if (answer !== null) return;
    const q = quiz[qIndex];
    const ok = i === q.correctIndex;
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
    setAnswer(i);
    if (ok) setCorrect(c => [...c, q.id]);
  };

  const handleNext = () => {
    click();
    if (qIndex + 1 >= quiz.length) {
      finishQuiz(correct);
    } else {
      setQIndex(qIndex + 1);
      setAnswer(null);
    }
  };

  const tabs = useMemo(
    () => [
      { id: 'kalimat' as Tab, label: 'Bedah Kalimat', icon: ScrollText, count: analysis?.sentences.length ?? 0 },
      { id: 'kotoba' as Tab, label: 'Kotoba', icon: BookOpen, count: analysis?.vocab.length ?? 0 },
      { id: 'pola' as Tab, label: 'Pola', icon: Languages, count: analysis?.grammar.length ?? 0 },
      { id: 'kanji' as Tab, label: 'Kanji', icon: Shapes, count: analysis?.kanji.length ?? 0 },
    ],
    [analysis]
  );

  const card = 'p-3 rounded-2xl bg-surface-inset border border-border-subtle';

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/85"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="panel panel-stitched relative w-full max-w-3xl max-h-[94vh] flex flex-col border border-border-subtle rounded-3xl shadow-2xl overflow-hidden bg-surface-card animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-text-primary truncate">Dungeon Perpustakaan Teks</h3>
              <p className="text-[11px] text-text-secondary truncate">Tempel teks Jepang apa pun, ubah jadi bahan belajar.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={() => { click(); onClose(); }} className="btn-physical-secondary w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer p-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* INPUT */}
          {phase === 'input' && (
            <div className="space-y-3">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
                rows={9}
                placeholder="Tempel atau ketik 1 kalimat, 1 paragraf, atau 1 dokkai penuh di sini…  例：昨日、友達と映画を見に行きました。"
                className="w-full px-4 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-base font-body text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary shadow-inner"
              />
              <div className="flex flex-wrap items-center gap-2">
                {SAMPLES.map(s => (
                  <button key={s.label} type="button" onClick={() => { click(); setInput(s.text); }} className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer">
                    {s.label}
                  </button>
                ))}
                <button type="button" onClick={() => { click(); setInput(pickDokkai()); }} className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer">
                  Dokkai acak
                </button>
                <span className="ml-auto text-[11px] font-mono text-text-muted">{input.length}/{MAX_INPUT_CHARS}</span>
              </div>
              <button
                type="button"
                disabled={!input.trim()}
                onClick={handleAnalyze}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-heading font-black text-sm select-none ${
                  input.trim() ? 'btn-cta cursor-pointer' : 'bg-surface-inset text-text-muted border border-border-subtle opacity-50 cursor-not-allowed'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-gold" />
                <span>Bedah Teks Ini</span>
              </button>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Analisis dilakukan di perangkatmu dengan mencocokkan teks ke database Kotoba, Bunpou, dan Kanji. Pengenalan pola bersifat perkiraan — kata di luar database ditandai “belum dikenal”.
              </p>
            </div>
          )}

          {/* RESULT */}
          {phase === 'result' && analysis && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { click(); setTab(t.id); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-heading font-bold cursor-pointer border ${
                      tab === t.id ? 'bg-gold/20 border-gold text-text-primary' : 'bg-surface-inset border-border-subtle text-text-secondary'
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    <span className="font-mono text-[10px] opacity-70">{t.count}</span>
                  </button>
                ))}
              </div>

              {!hasContent && (
                <div className={`${card} text-sm text-text-secondary`}>
                  Belum ada kata, pola, atau kanji dari teks ini yang cocok dengan database. Coba teks yang memakai kanji atau kosakata umum.
                </div>
              )}

              {tab === 'kalimat' && (
                <div className="space-y-3">
                  {picked && (
                    <div className="p-3 rounded-2xl bg-gold/10 border border-gold/40 text-sm space-y-0.5">
                      <div className="font-heading font-black text-text-primary">
                        {picked.item.word} <span className="font-normal text-text-secondary">（{picked.item.reading}）</span>
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-inset border border-border-subtle">{picked.item.jlpt}</span>
                      </div>
                      <div className="text-text-primary">{picked.item.meaningId}</div>
                      {picked.inflected && <div className="text-[11px] text-text-muted">Di teks berbentuk 「{picked.surface}」 (bentuk konjugasi dari kamus 「{picked.item.word}」)</div>}
                    </div>
                  )}
                  {analysis.sentences.map((s, i) => (
                    <div key={i} className={`${card} space-y-2`}>
                      <HighlightedSentence text={s.text} words={s.words} onPick={setPicked} activeId={picked?.item.id} />
                      {s.grammar.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.grammar.map(g => (
                            <span key={g.item.id} className="text-[11px] px-2 py-1 rounded-lg bg-indigo/15 border border-border-subtle text-text-secondary">
                              <b className="text-text-primary">{g.matched}</b> · {g.item.meaningId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {analysis.unknown.length > 0 && (
                    <p className="text-[11px] text-text-muted">Belum dikenal database: {analysis.unknown.slice(0, 20).join('、')}</p>
                  )}
                </div>
              )}

              {tab === 'kotoba' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.vocab.map(v => (
                    <div key={v.item.id} className={card}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-heading font-black text-text-primary text-lg">{v.item.word}</span>
                        <span className="text-[10px] font-mono text-text-muted">{v.item.jlpt}{v.count > 1 ? ` · ×${v.count}` : ''}</span>
                      </div>
                      <div className="text-xs text-text-secondary">{v.item.reading}</div>
                      <div className="text-sm text-text-primary mt-1">{v.item.meaningId}</div>
                      {v.surfaces[0] !== v.item.word && <div className="text-[11px] text-text-muted mt-1">Di teks: {v.surfaces.join('、')}</div>}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'pola' && (
                <div className="space-y-2">
                  {analysis.grammar.length === 0 && <div className={`${card} text-sm text-text-secondary`}>Tidak ada pola tata bahasa yang terdeteksi.</div>}
                  {analysis.grammar.map(g => (
                    <div key={g.item.id} className={`${card} space-y-1`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-heading font-black text-text-primary">{g.item.title}</span>
                        <span className="text-[10px] font-mono text-text-muted shrink-0">{g.item.level}</span>
                      </div>
                      <div className="text-xs font-mono text-gold">{g.item.formula}</div>
                      <div className="text-sm text-text-primary">{g.item.meaningId}</div>
                      <div className="text-[11px] text-text-muted">Terdeteksi dari 「{g.matched}」 pada: {g.sentence}</div>
                    </div>
                  ))}
                  {analysis.grammar.length > 0 && <p className="text-[11px] text-text-muted">Deteksi pola bersifat perkiraan; cek kembali dengan konteks kalimat.</p>}
                </div>
              )}

              {tab === 'kanji' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {analysis.kanji.length === 0 && <div className={`${card} col-span-full text-sm text-text-secondary`}>Tidak ada kanji dari teks ini yang ada di database.</div>}
                  {analysis.kanji.map(k => (
                    <div key={k.id} className={`${card} text-center`}>
                      <div className="text-3xl font-heading font-black text-text-primary">{k.character}</div>
                      <div className="text-xs text-text-primary mt-1">{k.meaningId}</div>
                      <div className="text-[10px] text-text-muted mt-1 break-words">{[...k.onyomi, ...k.kunyomi].join(' · ')}</div>
                      <div className="text-[10px] font-mono text-text-muted">{k.jlpt} · {k.strokeCount} goresan</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* AYO PAHAMI: penjelasan bertahap per kalimat sebelum latihan */}
          {phase === 'understand' && analysis && (
            <TextStudyUnderstand analysis={analysis} soundEnabled={soundEnabled} onBack={() => setPhase('result')} onStartQuiz={startQuiz} />
          )}

          {/* QUIZ */}
          {phase === 'quiz' && quiz.length > 0 && (() => {
            const q = quiz[qIndex];
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                  <span>Soal {qIndex + 1}/{quiz.length}</span>
                  <span>Benar {correct.length}</span>
                </div>
                <div className={`${card} space-y-2`}>
                  <div className="font-heading font-black text-text-primary">{q.prompt}</div>
                  {q.context && <div className="text-sm text-text-secondary font-body">{q.context}</div>}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((o, i) => {
                    const isRight = i === q.correctIndex;
                    const state = answer === null ? 'idle' : isRight ? 'right' : i === answer ? 'wrong' : 'idle';
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={answer !== null}
                        onClick={() => handleAnswer(i)}
                        className={`p-3 rounded-2xl text-left text-sm border transition-all cursor-pointer ${
                          state === 'right' ? 'bg-state-success/20 border-state-success' : state === 'wrong' ? 'bg-state-danger/20 border-state-danger' : 'bg-surface-inset border-border-subtle hover:border-border-primary'
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
                {answer !== null && (
                  <div className="space-y-2">
                    <div className="text-xs text-text-secondary">{q.explanation}</div>
                    <button type="button" onClick={handleNext} className="btn-cta w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-heading font-black text-sm cursor-pointer">
                      <span>{qIndex + 1 >= quiz.length ? 'Selesai' : 'Lanjut'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUMMARY */}
          {phase === 'summary' && (
            <div className="text-center space-y-3 py-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/15 text-gold border border-border-subtle flex items-center justify-center">
                <Check className="w-7 h-7" />
              </div>
              <div className="font-heading font-black text-xl text-text-primary">{correct.length} / {quiz.length} benar</div>
              <div className="text-sm text-gold font-mono font-bold">+{reward.exp} EXP · +{reward.gold} Gold</div>
              {reward.exp === 0 && correct.length > 0 && <p className="text-[11px] text-text-muted">Materi ini sudah pernah memberi EXP dari dungeon ini — coba teks baru untuk hadiah lagi.</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {(phase === 'result' || phase === 'summary') && (
          <div className="flex gap-2 p-4 border-t border-border-subtle shrink-0">
            <button type="button" onClick={() => { click(); setPhase('input'); }} className="btn-physical-secondary flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold cursor-pointer">
              <RotateCcw className="w-4 h-4" />
              <span>Teks baru</span>
            </button>
            {phase === 'result' && (
              <button
                type="button"
                disabled={!hasContent}
                onClick={startUnderstand}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm ${hasContent ? 'btn-cta cursor-pointer' : 'bg-surface-inset text-text-muted opacity-50 cursor-not-allowed'}`}
              >
                <GraduationCap className="w-4 h-4 text-gold" />
                <span>Ayo Pahami</span>
              </button>
            )}
            {phase === 'summary' && (
              <button type="button" onClick={startQuiz} className="btn-cta flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm cursor-pointer">
                <Swords className="w-4 h-4 text-gold" />
                <span>Ulangi Latihan</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>,
    document.body
  );
};
