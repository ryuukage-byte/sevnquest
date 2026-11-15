import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { LESSONS } from '../data/catalog';
import { deletePlan, loadPlans, loadProgress } from '../lib/storage';
import { generatePlan, isPlanError } from '../planner/planner';

export default function Journey({ go }: { go: (to: string) => void }) {
  const [plans, setPlans] = useState(loadPlans);
  const progress = loadProgress();
  const done = LESSONS.filter(l => progress[l.id]?.completed);

  return (
    <section className="block">
      <h1>My Journey</h1>
      <p className="muted">Mode tamu: data tersimpan di perangkat ini. Login untuk menyinkronkan ke SevnQuest (segera hadir).</p>

      <h2 className="kicker">Materi selesai ({done.length}/{LESSONS.length})</h2>
      {done.length === 0 ? <p className="muted">Belum ada. <a href="#/learn">Mulai belajar</a>.</p>
        : <ul className="points">{done.map(l => <li key={l.id}>{l.title}</li>)}</ul>}

      <h2 className="kicker">Rencana belajar tersimpan</h2>
      {plans.length === 0 && <p className="muted">Belum ada rencana. <button className="link" onClick={() => go('/planner')}>Buat rencana</button>.</p>}
      <div className="grid">
        {plans.map(p => {
          const plan = generatePlan(p);
          if (isPlanError(plan)) return null;
          return (
            <article key={plan.fingerprint} className="card static">
              <strong>{p.goal} · {p.durationDays} hari</strong>
              <span className="muted">{p.dailyMinutes} menit × {p.daysPerWeek} hari/minggu · mulai {p.startDate}</span>
              <span className="tag">Cakupan {Math.round(plan.summary.coverage * 100)}%</span>
              <button className="btn ghost" onClick={() => { deletePlan(p); setPlans(loadPlans()); }}><Trash2 size={14} aria-hidden /> Hapus</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
