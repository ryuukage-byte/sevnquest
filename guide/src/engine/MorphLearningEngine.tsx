import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, Shuffle } from 'lucide-react';
import { Check as CheckIcon, X as XIcon } from 'lucide-react';
import { SECTIONS, sentenceJa, sentenceRomaji, type Lesson, type Part, type Scene, type Token, type TokenRole } from './lessonSchema';

const ROLE_LABEL: Record<TokenRole, string> = {
  subject: 'SUBJEK', object: 'OBJEK', verb: 'KATA KERJA', particle: 'PARTIKEL', other: '',
};
const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

interface Props {
  lesson: Lesson;
  initialScene?: number;
  onSceneChange?: (index: number) => void;
  onComplete?: () => void;
}

/** Merender scene berdasarkan konfigurasi materi. Satu komponen untuk semua materi. */
export default function MorphLearningEngine({ lesson, initialScene = 0, onSceneChange, onComplete }: Props) {
  const total = lesson.scenes.length;
  const [index, setIndex] = useState(Math.min(Math.max(initialScene, 0), total - 1));
  const [dir, setDir] = useState(1);
  const [auto, setAuto] = useState(false);
  const scene = lesson.scenes[index];

  const go = useCallback((to: number) => {
    if (to < 0 || to >= total) return;
    setDir(to > index ? 1 : -1);
    setIndex(to);
    onSceneChange?.(to);
    if (to === total - 1) onComplete?.();
  }, [index, total, onSceneChange, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  // Auto-play hanya untuk scene yang punya durasi; scene interaktif (latihan) tidak pernah maju sendiri.
  useEffect(() => {
    if (!auto || !scene.duration || scene.type === 'practice' || index >= total - 1) return;
    const t = window.setTimeout(() => go(index + 1), scene.duration);
    return () => window.clearTimeout(t);
  }, [auto, scene, index, total, go]);

  return (
    <section className="panel flex flex-col gap-4" aria-label={lesson.title}>
      <div className="flex gap-1.5 justify-center" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
        {lesson.scenes.map((s, i) => (
          <button key={s.id} className={`h-1.5 w-6 rounded-full border-0 p-0 ${i === index ? 'bg-gold' : i < index ? 'bg-indigo' : 'bg-surface-elevated'}`} onClick={() => go(i)} aria-label={`Scene ${i + 1}`} />
        ))}
      </div>

      <div className="engine-stage">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={scene.id}
            className="w-full py-3"
            custom={dir}
            initial={{ opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * dir }}
            transition={{ duration: 0.28 }}
          >
            {scene.section && <div className="flex justify-center mb-3"><span className="rpg-badge font-mono">{SECTIONS[scene.section]}</span></div>}
            <SceneView scene={scene} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button className="skeuo-btn gap-1.5" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden /> Sebelumnya</button>
        <button className="skeuo-btn" onClick={() => setAuto(a => !a)} aria-pressed={auto} aria-label={auto ? 'Jeda otomatis' : 'Putar otomatis'}>
          {auto ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
        <span className="text-caption-meta font-mono">{index + 1} / {total}</span>
        <button className="skeuo-btn-gold gap-1.5" onClick={() => go(index + 1)} disabled={index === total - 1}>Lanjut <ArrowRight size={16} aria-hidden /></button>
      </div>
    </section>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  switch (scene.type) {
    case 'introduction':
      return (
        <div className="flex flex-col items-center text-center gap-4">
          <motion.h1 className="font-jp text-5xl sm:text-6xl font-bold text-text-primary m-0" initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.4em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.08em' }} transition={{ duration: 0.9 }}>
            {scene.content.title}
          </motion.h1>
          <motion.p className="text-body-regular text-base" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            {scene.content.subtitle}
          </motion.p>
        </div>
      );
    case 'structure':
      return (
        <div className="flex flex-col items-center text-center gap-4">
          <h2 className="text-heading-section">{scene.content.heading}</h2>
          <div className="flex gap-3 flex-wrap justify-center items-center">
            {scene.content.pattern.map((r, i) => (
              <motion.div key={`${r}${i}`} className={`sq-token role-${r} font-mono !text-xs tracking-widest font-bold`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i + 0.1 }}>
                {ROLE_LABEL[r]}
              </motion.div>
            ))}
          </div>
          <p className="text-body-regular max-w-md">{scene.content.caption}</p>
        </div>
      );
    case 'transformation':
      return <Transformation scene={scene} />;
    case 'comparison':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <motion.div className="panel !bg-surface-inset" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
            <small className="text-caption-meta font-mono tracking-widest">{scene.content.leftLabel ?? 'A'}</small>
            <p className="text-xl font-bold text-text-primary mt-2">{scene.content.left}</p>
          </motion.div>
          <motion.div className="panel !border-gold" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <small className="text-caption-meta font-mono tracking-widest">{scene.content.rightLabel ?? 'B'}</small>
            <p className="text-xl font-bold font-jp text-text-primary mt-2">{scene.content.right}</p>
          </motion.div>
        </div>
      );
    case 'practice':
      return <Practice scene={scene} />;
    case 'kana':
      return (
        <div className="flex flex-col items-center text-center gap-4">
          <h2 className="text-heading-section">{scene.content.heading}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 w-full max-w-xl">
            {scene.content.items.map((it, i) => (
              <motion.div key={it.char} className="sq-token !min-w-0 !px-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                <span className={`font-jp font-bold whitespace-nowrap ${it.char.length > 1 ? 'text-3xl' : 'text-4xl'}`}>{it.char}</span>
                <small>{it.romaji}</small>
              </motion.div>
            ))}
          </div>
          {scene.content.caption && <p className="text-body-regular max-w-md">{scene.content.caption}</p>}
        </div>
      );
    case 'vocab':
      return (
        <div className="flex flex-col items-center gap-4 w-full">
          <h2 className="text-heading-section">{scene.content.heading}</h2>
          <ul className="list-none p-0 m-0 w-full max-w-xl flex flex-col gap-3">
            {scene.content.items.map((it, i) => (
              <motion.li key={it.ja} className="sq-token !flex-row !justify-between !items-center !text-left gap-4" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }}>
                <span className="flex flex-col">
                  <span className="font-jp text-2xl font-bold">{it.ja}</span>
                  <small>{it.reading}</small>
                </span>
                <span className="text-body-regular !text-right">{it.id_text}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      );
    case 'quiz':
      return <Quiz scene={scene} />;
    case 'explain':
      return (
        <div className="flex flex-col items-center gap-4 w-full">
          <h2 className="text-heading-section text-center">{scene.content.heading}</h2>
          {scene.content.terms && (
            <div className="flex flex-wrap gap-2 justify-center">
              {scene.content.terms.map(t => (
                <span key={t.term} className="sq-token !min-w-0 !py-2 !px-3 !text-base">
                  <span className="font-jp font-bold">{t.term}</span>
                  <small>{t.reading} = {t.meaning}</small>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3 w-full max-w-xl text-left">
            {scene.content.paragraphs.map((p, i) => (
              <motion.p key={i} className="text-body-regular !text-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 * i }}>{p}</motion.p>
            ))}
          </div>
          {scene.content.analogy && (
            <div className="panel !bg-surface-inset w-full max-w-xl text-left">
              <small className="text-caption-meta font-mono tracking-widest">ANALOGI</small>
              <p className="text-body-regular !text-sm mt-1">{scene.content.analogy}</p>
            </div>
          )}
        </div>
      );
    case 'example':
      return <Example scene={scene} />;
    case 'mistakes':
      return (
        <div className="flex flex-col items-center gap-4 w-full">
          <h2 className="text-heading-section text-center">{scene.content.heading}</h2>
          <div className="flex flex-col gap-3 w-full max-w-xl">
            {scene.content.items.map(it => (
              <div key={it.wrong} className="panel !bg-surface-inset text-left flex flex-col gap-2">
                <p className="m-0 flex gap-2 items-start text-state-danger font-jp"><XIcon size={16} className="shrink-0 mt-1" aria-hidden /> <span>{it.wrong}</span></p>
                <p className="m-0 flex gap-2 items-start text-state-success font-jp"><CheckIcon size={16} className="shrink-0 mt-1" aria-hidden /> <span>{it.right}</span></p>
                <p className="text-body-regular !text-sm m-0">{it.why}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'summary':
      return (
        <div className="flex flex-col items-center text-center gap-4">
          <h2 className="text-heading-section">{scene.content.heading}</h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-3 text-left">
            {scene.content.points.map((p, i) => (
              <motion.li key={p} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 * i }}>
                <Check size={16} className="text-state-success shrink-0 mt-0.5" aria-hidden /> {p}
              </motion.li>
            ))}
          </ul>
        </div>
      );
  }
}

function TokenCard({ t, showJa }: { t: Token; showJa: boolean }) {
  return (
    <motion.div layout transition={SPRING} className={`sq-token role-${t.role}`}>
      <small>{ROLE_LABEL[t.role]}</small>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={showJa ? 'ja' : 'id'} className={showJa ? 'font-jp' : ''} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {showJa ? t.ja : t.id_text}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

function Transformation({ scene }: { scene: Extract<Scene, { type: 'transformation' }> }) {
  const { tokens, from, to, heading, caption } = scene.content;
  const [morphed, setMorphed] = useState(false);
  const byId = useMemo(() => new Map(tokens.map(t => [t.id, t])), [tokens]);
  const order = (morphed ? to : from).map(id => byId.get(id)!);
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="text-heading-section">{heading}</h2>
      <div className="flex gap-3 flex-wrap justify-center items-center min-h-24" aria-live="polite">
        {order.map(t => <TokenCard key={t.id} t={t} showJa={morphed} />)}
      </div>
      <p className="text-body-regular max-w-md">{caption}</p>
      <button className="btn rpg-btn rpg-btn-primary" onClick={() => setMorphed(m => !m)}>
        {morphed ? <><RotateCcw size={16} aria-hidden /> Kembali</> : <><Shuffle size={16} aria-hidden /> Ubah ke bahasa Jepang</>}
      </button>
    </div>
  );
}

function Practice({ scene }: { scene: Extract<Scene, { type: 'practice' }> }) {
  const { tokens, answer, prompt } = scene.content;
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const byId = useMemo(() => new Map(tokens.map(t => [t.id, t])), [tokens]);
  const correct = picked.length === answer.length && picked.every((id, i) => id === answer[i]);
  const pool = tokens.filter(t => !picked.includes(t.id));
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="text-heading-section">{prompt}</h2>
      <div className={`sq-slots ${checked ? (correct ? 'ok' : 'bad') : ''}`} aria-label="Jawaban">
        {picked.length === 0 && <span className="text-caption-meta">Ketuk kata di bawah sesuai urutan</span>}
        {picked.map(id => (
          <button key={id} className={`sq-token role-${byId.get(id)!.role}`} onClick={() => { setPicked(p => p.filter(x => x !== id)); setChecked(false); }}>
            <span className="font-jp">{byId.get(id)!.ja}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap justify-center items-center">
        {pool.map(t => (
          <button key={t.id} className={`sq-token role-${t.role}`} onClick={() => { setPicked(p => [...p, t.id]); setChecked(false); }}>
            <small>{t.id_text}</small><span className="font-jp">{t.ja}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap justify-center items-center">
        <button className="btn rpg-btn rpg-btn-primary disabled:opacity-50" disabled={picked.length !== answer.length} onClick={() => setChecked(true)}>Periksa</button>
        <button className="skeuo-btn gap-1.5" onClick={() => { setPicked([]); setChecked(false); }}><RotateCcw size={16} aria-hidden /> Ulang</button>
      </div>
      {checked && (
        <p role="status" className={`text-sm font-bold ${correct ? 'text-state-success' : 'text-state-danger'}`}>
          {correct ? 'Tepat! Subjek, objek, lalu kata kerja.' : 'Belum tepat. Ingat: kata kerja selalu di akhir.'}
        </p>
      )}
    </div>
  );
}

function Quiz({ scene }: { scene: Extract<Scene, { type: 'quiz' }> }) {
  const { question, big, options, answer, explanation, why } = scene.content;
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="text-heading-section">{question}</h2>
      {big && <div className="font-jp text-6xl font-bold text-text-primary">{big}</div>}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {options.map((o, i) => {
          const state = !done ? '' : i === answer ? 'ok' : i === picked ? 'bad' : '';
          return (
            <button
              key={o}
              disabled={done}
              onClick={() => setPicked(i)}
              className={`sq-token !flex-row !justify-center font-jp ${state === 'ok' ? 'role-particle' : state === 'bad' ? 'role-verb' : ''}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {done && (
        <p role="status" className={`text-sm font-bold ${picked === answer ? 'text-state-success' : 'text-state-danger'}`}>
          {picked === answer ? 'Tepat!' : `Belum tepat. Jawabannya: ${options[answer]}`}
          {picked !== answer && why?.[picked!] ? ` ${why[picked!]}` : ''}
          {explanation ? ` ${explanation}` : ''}
        </p>
      )}
      {done && picked !== answer && (
        <button className="skeuo-btn gap-1.5" onClick={() => setPicked(null)}><RotateCcw size={14} aria-hidden /> COBA LAGI</button>
      )}
    </div>
  );
}

function Example({ scene }: { scene: Extract<Scene, { type: 'example' }> }) {
  const { heading, parts, translation, note } = scene.content;
  const [active, setActive] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const cur: Part | null = active === null ? null : parts[active];
  return (
    <div className="flex flex-col items-center text-center gap-4 w-full">
      {heading && <h2 className="text-heading-section">{heading}</h2>}
      <div className="flex flex-wrap gap-2 justify-center">
        {parts.map((p, i) => (
          <button key={i} onClick={() => setActive(a => (a === i ? null : i))} aria-pressed={active === i}
            className={`sq-token !min-w-0 !py-2 !px-3 role-${p.role} ${active === i ? '!bg-surface-elevated' : ''}`}>
            <span className="font-jp text-2xl font-bold">{p.ja}{i === parts.length - 1 ? '。' : ''}</span>
          </button>
        ))}
      </div>
      <p className="font-jp text-xl font-bold m-0 sr-only">{sentenceJa(parts)}</p>
      <p className="font-mono text-sm text-text-secondary m-0">{sentenceRomaji(parts)}</p>
      <p className="text-body-regular !text-base m-0">{translation}</p>
      <div className="min-h-12" aria-live="polite">
        {cur ? (
          <p className="panel !bg-surface-inset !py-2 !px-4 m-0 text-sm text-text-primary">
            <span className="font-jp font-bold">{cur.ja}</span> ({cur.romaji}) = {cur.id_text}
          </p>
        ) : <p className="text-caption-meta m-0">Ketuk satu bagian kalimat untuk melihat artinya.</p>}
      </div>
      <button className="skeuo-btn" onClick={() => setShowAll(v => !v)}>{showAll ? 'SEMBUNYIKAN ANALISIS' : 'TAMPILKAN ANALISIS'}</button>
      {showAll && (
        <ul className="list-none p-0 m-0 w-full max-w-md text-left flex flex-col gap-1 text-sm text-text-secondary">
          {parts.map((p, i) => <li key={i}><span className="font-jp font-bold text-text-primary">{p.ja}</span> ({p.romaji}) = {p.id_text}</li>)}
        </ul>
      )}
      {note && <p className="text-body-regular !text-sm max-w-md">{note}</p>}
    </div>
  );
}
