import { useMemo } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { getLesson, LESSONS } from '../products';
import MorphLearningEngine from '../engine/MorphLearningEngine';
import { loadProgress, saveLessonProgress } from '../lib/storage';

export default function Learn({ lessonId, go }: { lessonId?: string; go: (to: string) => void }) {
  const progress = useMemo(loadProgress, [lessonId]);
  const lesson = lessonId ? getLesson(lessonId) : undefined;

  if (lessonId && !lesson) {
    return <section className="panel mt-4 flex flex-col gap-3 items-start"><p className="text-body-regular">Materi tidak ditemukan.</p><button className="skeuo-btn" onClick={() => go('/learn')}>KEMBALI</button></section>;
  }

  if (lesson) {
    const last = progress[lesson.id]?.lastScene ?? 0;
    return (
      <section className="flex flex-col gap-3 pt-4">
        <button className="skeuo-btn self-start gap-1.5" onClick={() => go('/learn')}><ArrowLeft size={14} aria-hidden /> SEMUA MATERI</button>
        <h1 className="text-heading-page">{lesson.title}</h1>
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
    <section className="flex flex-col gap-4 pt-4">
      <div>
        <h1 className="text-heading-page">Learn</h1>
        <p className="text-body-regular">Materi dibagi menjadi scene yang saling bertransisi, bukan artikel panjang.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LESSONS.map(l => {
          const p = progress[l.id];
          const pct = p?.completed ? 100 : p ? Math.round(((p.lastScene + 1) / l.scenes.length) * 100) : 0;
          return (
            <button key={l.id} className="rpg-card-interactive text-left flex flex-col gap-2 items-start" onClick={() => go(`/learn/${l.id}`)}>
              <span className="rpg-badge font-mono">{l.level} / {l.category}</span>
              <span className="text-card-title font-heading text-base">{l.title}</span>
              <span className="text-body-regular">{l.summary}</span>
              <div className="rpg-progress-track"><div className="rpg-progress-fill" style={{ width: `${pct}%` }} /></div>
              <span className="text-caption-meta inline-flex items-center gap-1.5"><Clock size={12} aria-hidden /> {l.minutes} menit · {p?.completed ? 'Selesai' : p ? `Scene ${p.lastScene + 1}/${l.scenes.length}` : 'Belum dimulai'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
