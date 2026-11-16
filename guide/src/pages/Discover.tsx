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
      {PRODUCT.paths.map(path => {
        const ready = path.chapters.filter(c => c.lessonId && getLesson(c.lessonId)).length;
        return (
          <div key={path.id} className="panel flex flex-col gap-3">
            <div>
              <span className="rpg-badge font-mono">{ready}/{path.chapters.length} BAB TERBIT</span>
              <h2 className="text-heading-section mt-2">{path.title}</h2>
              <p className="text-body-regular">{path.subtitle}</p>
            </div>
            <ol className="list-none p-0 m-0 flex flex-col gap-2">
              {path.chapters.map((c, i) => {
                const l = c.lessonId ? getLesson(c.lessonId) : undefined;
                const num = String(i + 1).padStart(2, '0');
                if (!l) {
                  return (
                    <li key={c.id} className="rpg-card !p-3 flex items-center justify-between gap-3 opacity-60">
                      <span className="text-card-title"><span className="font-mono text-text-muted mr-2">{num}</span>{c.title}</span>
                      <span className="rpg-badge">Segera hadir</span>
                    </li>
                  );
                }
                const done = progress[l.id]?.completed;
                return (
                  <li key={c.id}>
                    <button className="rpg-card-interactive !p-3 w-full text-left flex items-center justify-between gap-3" onClick={() => go(`/learn/${l.id}`)}>
                      <span className="text-card-title"><span className="font-mono text-text-muted mr-2">{num}</span>{c.title}</span>
                      <span className={done ? 'rpg-badge-status' : 'rpg-badge'}>{done ? 'Selesai' : `${l.minutes} menit`}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}
