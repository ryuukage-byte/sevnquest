import { getLesson, PRODUCT } from '../products';
import { loadProgress } from '../lib/storage';

export default function Discover({ go }: { go: (to: string) => void }) {
  const progress = loadProgress();
  return (
    <section className="flex flex-col gap-4 pt-4">
      <div>
        <h1 className="text-heading-page">Peta Belajar</h1>
        <p className="text-body-regular">{PRODUCT.tagline}</p>
      </div>
      {PRODUCT.modules.map((m, mi) => (
        <div key={m.id} className="panel flex flex-col gap-3">
          <div>
            <span className="rpg-badge font-mono">MODUL {mi + 1}</span>
            <h2 className="text-heading-section mt-2">{m.title}</h2>
            <p className="text-body-regular">{m.subtitle}</p>
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {m.lessonIds.map(id => {
              const l = getLesson(id);
              if (!l) return null;
              const done = progress[id]?.completed;
              return (
                <li key={id}>
                  <button className="rpg-card-interactive !p-3 w-full text-left flex items-center justify-between gap-3" onClick={() => go(`/learn/${id}`)}>
                    <span className="text-card-title">{l.title}</span>
                    <span className={done ? 'rpg-badge-status' : 'rpg-badge'}>{done ? 'Selesai' : `${l.minutes} menit`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
