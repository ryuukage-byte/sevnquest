import { PATHS, LESSONS } from '../data/catalog';

export default function Discover({ go }: { go: (to: string) => void }) {
  return (
    <section className="flex flex-col gap-4 pt-4">
      <div>
        <h1 className="text-heading-page">Discover</h1>
        <p className="text-body-regular">Pilih jalur belajar. Materi interaktif tersedia bertahap.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PATHS.map(p => {
          const n = p.lessonLevel ? LESSONS.filter(l => l.level === p.lessonLevel).length : 0;
          return (
            <article key={p.id} className="panel flex flex-col gap-2 items-start">
              <h2 className="text-card-title font-heading text-base">{p.title}</h2>
              <p className="text-body-regular">{p.subtitle}</p>
              <span className={n > 0 ? 'rpg-badge-status' : 'rpg-badge'}>{n > 0 ? `${n} materi interaktif` : 'Materi segera hadir'}</span>
              <div className="flex gap-2 flex-wrap mt-1">
                {n > 0 && <button className="skeuo-btn-gold" onClick={() => go('/learn')}>BELAJAR</button>}
                <button className="skeuo-btn" onClick={() => go(`/planner?goal=${p.goal}`)}>BUAT RENCANA</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
