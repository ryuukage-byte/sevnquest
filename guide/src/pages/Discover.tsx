import { PATHS, LESSONS } from '../data/catalog';

export default function Discover({ go }: { go: (to: string) => void }) {
  return (
    <section className="block">
      <h1>Discover</h1>
      <p className="muted">Pilih jalur belajar. Materi interaktif tersedia bertahap.</p>
      <div className="grid">
        {PATHS.map(p => {
          const n = p.lessonLevel ? LESSONS.filter(l => l.level === p.lessonLevel).length : 0;
          return (
            <article key={p.id} className="card static">
              <strong>{p.title}</strong>
              <span className="muted">{p.subtitle}</span>
              <span className="tag">{n > 0 ? `${n} materi interaktif` : 'Materi segera hadir'}</span>
              <div className="row">
                {n > 0 && <button className="btn ghost" onClick={() => go('/learn')}>Belajar</button>}
                <button className="btn ghost" onClick={() => go(`/planner?goal=${p.goal}`)}>Buat rencana</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
