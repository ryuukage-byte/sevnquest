import { ArrowDown, Rocket } from 'lucide-react';
import { PATHS } from '../data/catalog';

export default function Home({ go }: { go: (to: string) => void }) {
  const steps = ['Understand', 'Plan', 'Practice', 'Master'];
  return (
    <>
      <section className="hero">
        <h1>MASTER JAPANESE</h1>
        <p className="lead">Learn with understanding. Build your own learning journey.</p>
        <button className="btn primary big" onClick={() => go('/learn')}><Rocket size={18} aria-hidden /> START LEARNING</button>
      </section>

      <section className="block">
        <h2 className="kicker">CHOOSE YOUR PATH</h2>
        <div className="grid">
          {PATHS.filter(p => ['beginner', 'jft', 'n5', 'ssw2'].includes(p.id)).map(p => (
            <button key={p.id} className="card" onClick={() => go('/discover')}>
              <strong>{p.title}</strong><span className="muted">{p.subtitle}</span>
            </button>
          ))}
          <button className="card" onClick={() => go('/discover')}><strong>JLPT N5 - N1</strong><span className="muted">Lima jenjang, satu jalur</span></button>
        </div>
      </section>

      <section className="block">
        <h2 className="kicker">HOW IT WORKS</h2>
        <ol className="flow">
          {steps.map((s, i) => (
            <li key={s}>{s}{i < steps.length - 1 && <ArrowDown size={16} aria-hidden />}</li>
          ))}
        </ol>
      </section>

      <section className="block center">
        <h2 className="kicker">START YOUR JOURNEY</h2>
        <button className="btn primary big" onClick={() => go('/planner')}>CREATE STUDY PLAN</button>
        <p className="muted">Tanpa login. Masuk hanya saat ingin menyimpan rencana ke akun SevnQuest.</p>
      </section>
    </>
  );
}
