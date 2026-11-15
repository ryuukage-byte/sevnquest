import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, Shuffle } from 'lucide-react';
import type { Lesson, Scene, Token, TokenRole } from './lessonSchema';

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
    <section className="engine" aria-label={lesson.title}>
      <div className="engine-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
        {lesson.scenes.map((s, i) => (
          <button key={s.id} className={i === index ? 'dot on' : i < index ? 'dot done' : 'dot'} onClick={() => go(i)} aria-label={`Scene ${i + 1}`} />
        ))}
      </div>

      <div className="stage">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={scene.id}
            className="scene"
            custom={dir}
            initial={{ opacity: 0, x: 40 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * dir }}
            transition={{ duration: 0.28 }}
          >
            <SceneView scene={scene} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="engine-controls">
        <button className="btn ghost" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden /> Sebelumnya</button>
        <button className="btn ghost icon" onClick={() => setAuto(a => !a)} aria-pressed={auto} aria-label={auto ? 'Jeda otomatis' : 'Putar otomatis'}>
          {auto ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
        <span className="count">{index + 1} / {total}</span>
        <button className="btn primary" onClick={() => go(index + 1)} disabled={index === total - 1}>Lanjut <ArrowRight size={16} aria-hidden /></button>
      </div>
    </section>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  switch (scene.type) {
    case 'introduction':
      return (
        <div className="center">
          <motion.h1 className="jp-hero" initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.4em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.08em' }} transition={{ duration: 0.9 }}>
            {scene.content.title}
          </motion.h1>
          <motion.p className="muted lead" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            {scene.content.subtitle}
          </motion.p>
        </div>
      );
    case 'structure':
      return (
        <div className="center">
          <h2>{scene.content.heading}</h2>
          <div className="row">
            {scene.content.pattern.map((r, i) => (
              <motion.div key={`${r}${i}`} className={`chip role-${r}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i + 0.1 }}>
                {ROLE_LABEL[r]}
              </motion.div>
            ))}
          </div>
          <p className="muted">{scene.content.caption}</p>
        </div>
      );
    case 'transformation':
      return <Transformation scene={scene} />;
    case 'comparison':
      return (
        <div className="compare">
          <motion.div className="panel" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
            <small>{scene.content.leftLabel ?? 'A'}</small>
            <p className="big">{scene.content.left}</p>
          </motion.div>
          <motion.div className="panel accent" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <small>{scene.content.rightLabel ?? 'B'}</small>
            <p className="big jp">{scene.content.right}</p>
          </motion.div>
        </div>
      );
    case 'practice':
      return <Practice scene={scene} />;
    case 'summary':
      return (
        <div className="center">
          <h2>{scene.content.heading}</h2>
          <ul className="points">
            {scene.content.points.map((p, i) => (
              <motion.li key={p} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 * i }}>
                <Check size={16} aria-hidden /> {p}
              </motion.li>
            ))}
          </ul>
        </div>
      );
  }
}

function TokenCard({ t, showJa }: { t: Token; showJa: boolean }) {
  return (
    <motion.div layout transition={SPRING} className={`token role-${t.role}`}>
      <small>{ROLE_LABEL[t.role]}</small>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={showJa ? 'ja' : 'id'} className={showJa ? 'jp' : ''} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
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
    <div className="center">
      <h2>{heading}</h2>
      <div className="row morph" aria-live="polite">
        {order.map(t => <TokenCard key={t.id} t={t} showJa={morphed} />)}
      </div>
      <p className="muted">{caption}</p>
      <button className="btn primary" onClick={() => setMorphed(m => !m)}>
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
    <div className="center">
      <h2>{prompt}</h2>
      <div className={`slots ${checked ? (correct ? 'ok' : 'bad') : ''}`} aria-label="Jawaban">
        {picked.length === 0 && <span className="muted">Ketuk kata di bawah sesuai urutan</span>}
        {picked.map(id => (
          <button key={id} className={`token role-${byId.get(id)!.role}`} onClick={() => { setPicked(p => p.filter(x => x !== id)); setChecked(false); }}>
            <span className="jp">{byId.get(id)!.ja}</span>
          </button>
        ))}
      </div>
      <div className="row">
        {pool.map(t => (
          <button key={t.id} className={`token role-${t.role}`} onClick={() => { setPicked(p => [...p, t.id]); setChecked(false); }}>
            <small>{t.id_text}</small><span className="jp">{t.ja}</span>
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" disabled={picked.length !== answer.length} onClick={() => setChecked(true)}>Periksa</button>
        <button className="btn ghost" onClick={() => { setPicked([]); setChecked(false); }}><RotateCcw size={16} aria-hidden /> Ulang</button>
      </div>
      {checked && (
        <p role="status" className={correct ? 'good' : 'warn'}>
          {correct ? 'Tepat! Subjek, objek, lalu kata kerja.' : 'Belum tepat. Ingat: kata kerja selalu di akhir.'}
        </p>
      )}
    </div>
  );
}
