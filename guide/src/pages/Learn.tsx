import { useMemo } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { getLesson, LESSONS } from '../data/catalog';
import MorphLearningEngine from '../engine/MorphLearningEngine';
import { loadProgress, saveLessonProgress } from '../lib/storage';

export default function Learn({ lessonId, go }: { lessonId?: string; go: (to: string) => void }) {
  const progress = useMemo(loadProgress, [lessonId]);
  const lesson = lessonId ? getLesson(lessonId) : undefined;

  if (lessonId && !lesson) return <section className="block"><p>Materi tidak ditemukan.</p><button className="btn ghost" onClick={() => go('/learn')}>Kembali</button></section>;

  if (lesson) {
    const last = progress[lesson.id]?.lastScene ?? 0;
    return (
      <section className="block">
        <button className="btn ghost" onClick={() => go('/learn')}><ArrowLeft size={16} aria-hidden /> Semua materi</button>
        <h1>{lesson.title}</h1>
        <MorphLearningEngine
          lesson={lesson}
          initialScene={progress[lesson.id]?.completed ? 0 : last}
          onSceneChange={i => saveLessonProgress(lesson.id, i, false)}
          onComplete={() => saveLessonProgress(lesson.id, lesson.scenes.length - 1, true)}
        />
      </section>
    );
  }

  return (
    <section className="block">
      <h1>Learn</h1>
      <p className="muted">Materi dibagi menjadi scene yang saling bertransisi, bukan artikel panjang.</p>
      <div className="grid">
        {LESSONS.map(l => {
          const p = progress[l.id];
          return (
            <button key={l.id} className="card" onClick={() => go(`/learn/${l.id}`)}>
              <span className="tag">{l.level} / {l.category}</span>
              <strong>{l.title}</strong>
              <span className="muted">{l.summary}</span>
              <span className="meta"><Clock size={14} aria-hidden /> {l.minutes} menit · {p?.completed ? 'Selesai' : p ? `Scene ${p.lastScene + 1}/${l.scenes.length}` : 'Belum dimulai'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
