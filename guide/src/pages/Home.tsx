import { ArrowDown, Rocket } from 'lucide-react';
import { getLesson, LESSONS, PRODUCT } from '../products';

export default function Home({ go }: { go: (to: string) => void }) {
  const steps = ['Understand', 'Plan', 'Practice', 'Master'];
  return (
    <div className="flex flex-col gap-8 pt-4">
      <section className="panel panel-stitched text-center flex flex-col items-center gap-4 py-12">
        <span className="rpg-badge-reward">PAKET {PRODUCT.title.toUpperCase()}</span>
        <h1 className="font-heading text-4xl sm:text-6xl tracking-[0.1em] text-text-primary m-0">{PRODUCT.heroTitle}</h1>
        <p className="text-body-regular max-w-md">{PRODUCT.heroSubtitle}</p>
        <p className="font-heading italic text-text-secondary max-w-md">{PRODUCT.method}</p>
        <button className="btn rpg-btn rpg-btn-primary px-8 py-3" onClick={() => go(`/learn/${LESSONS[0]?.id ?? ''}`)}><Rocket size={18} aria-hidden /> MULAI BELAJAR</button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-heading-section">Isi Paket</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRODUCT.paths.map(path => {
            const ready = path.chapters.filter(c => c.lessonId && getLesson(c.lessonId)).length;
            return (
              <button key={path.id} className="rpg-card-interactive text-left flex flex-col gap-1" onClick={() => go('/discover')}>
                <span className="text-card-title font-heading text-base">{path.title}</span>
                <span className="text-body-regular">{path.subtitle}</span>
                <span className="text-caption-meta">{ready} dari {path.chapters.length} bab sudah terbit</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 items-center">
        <h2 className="text-heading-section self-start">How It Works</h2>
        <ol className="list-none p-0 m-0 flex flex-col items-center gap-2">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2 font-heading text-xl text-text-primary">
              {s}{i < steps.length - 1 && <ArrowDown size={16} className="text-gold" aria-hidden />}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel text-center flex flex-col items-center gap-3">
        <h2 className="text-heading-section">Start Your Journey</h2>
        <button className="btn rpg-btn btn-cta max-w-sm" onClick={() => go('/planner')}>BUAT RENCANA BELAJAR</button>
        <p className="text-body-regular">Tanpa login. Masuk hanya saat ingin menyimpan rencana ke akun SevnQuest.</p>
      </section>
    </div>
  );
}
