import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { LESSONS } from '../products';
import { deletePlan, loadPlans, loadProgress } from '../lib/storage';
import { generatePlan, isPlanError } from '../planner/planner';

export default function Journey({ go }: { go: (to: string) => void }) {
  const [plans, setPlans] = useState(loadPlans);
  const progress = loadProgress();
  const done = LESSONS.filter(l => progress[l.id]?.completed);

  return (
    <section className="flex flex-col gap-4 pt-4">
      <div>
        <h1 className="text-heading-page">My Journey</h1>
        <p className="text-body-regular">Mode tamu: data tersimpan di perangkat ini. Login untuk menyinkronkan ke SevnQuest (segera hadir).</p>
      </div>

      <div className="panel flex flex-col gap-2">
        <h2 className="text-heading-section">Materi selesai ({done.length}/{LESSONS.length})</h2>
        {done.length === 0
          ? <p className="text-body-regular">Belum ada. <a className="text-gold" href="#/learn">Mulai belajar</a>.</p>
          : <ul className="m-0 pl-5 text-body-regular">{done.map(l => <li key={l.id}>{l.title}</li>)}</ul>}
      </div>

      <h2 className="text-heading-section">Rencana belajar tersimpan</h2>
      {plans.length === 0 && <p className="text-body-regular">Belum ada rencana. <button className="text-gold underline" onClick={() => go('/planner')}>Buat rencana</button>.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map(p => {
          const plan = generatePlan(p);
          if (isPlanError(plan)) return null;
          return (
            <article key={plan.fingerprint} className="panel flex flex-col gap-2 items-start">
              <span className="text-card-title font-heading text-base">{p.goal} · {p.durationDays} hari</span>
              <span className="text-body-regular">{p.dailyMinutes} menit × {p.daysPerWeek} hari/minggu · mulai {p.startDate}</span>
              <span className="rpg-badge-reward">Cakupan {Math.round(plan.summary.coverage * 100)}%</span>
              <button className="skeuo-btn gap-1.5" onClick={() => { deletePlan(p); setPlans(loadPlans()); }}><Trash2 size={12} aria-hidden /> HAPUS</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
