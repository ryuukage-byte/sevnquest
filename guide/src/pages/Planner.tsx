import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, Save } from 'lucide-react';
import { generatePlan, isPlanError, LIMITS } from '../planner/planner';
import { savePlan } from '../lib/storage';
import type { Focus, Goal, PlanInput, StartLevel } from '../planner/types';

const GOALS: { v: Goal; l: string }[] = [
  { v: 'N5', l: 'JLPT N5' }, { v: 'N4', l: 'JLPT N4' }, { v: 'N3', l: 'JLPT N3' }, { v: 'N2', l: 'JLPT N2' }, { v: 'N1', l: 'JLPT N1' },
  { v: 'JFT', l: 'JFT-Basic' }, { v: 'SSW2', l: 'SSW 2' },
];
const STARTS: { v: StartLevel; l: string }[] = [
  { v: 'none', l: 'Dari nol' }, { v: 'N5', l: 'Sudah N5' }, { v: 'N4', l: 'Sudah N4' }, { v: 'N3', l: 'Sudah N3' }, { v: 'N2', l: 'Sudah N2' },
];
const FOCUS: { v: Focus; l: string }[] = [
  { v: 'balanced', l: 'Seimbang' }, { v: 'kotoba', l: 'Kosakata' }, { v: 'kanji', l: 'Kanji' }, { v: 'bunpou', l: 'Tata bahasa' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
const num = (v: string, fallback: number) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : fallback);

export default function Planner({ query }: { query: string }) {
  const q = new URLSearchParams(query).get('goal') as Goal | null;
  const [input, setInput] = useState<PlanInput>({
    goal: q && GOALS.some(g => g.v === q) ? q : 'N3',
    startLevel: 'N4', durationDays: 180, dailyMinutes: 45, daysPerWeek: 6, startDate: todayIso(), focus: 'balanced',
  });
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => { setInput(p => ({ ...p, [k]: v })); setSaved(false); };

  const plan = useMemo(() => generatePlan(input), [input]);

  return (
    <section className="block">
      <h1>Learning Planner</h1>
      <p className="muted">Jadwal dihitung dari jumlah materi di kurikulum SevnQuest dengan aturan tetap (bukan tebakan AI), sehingga hasilnya konsisten dan bisa diuji.</p>

      <form className="form" onSubmit={e => e.preventDefault()}>
        <label>Target
          <select value={input.goal} onChange={e => set('goal', e.target.value as Goal)}>{GOALS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}</select>
        </label>
        <label>Level saat ini
          <select value={input.startLevel} onChange={e => set('startLevel', e.target.value as StartLevel)}>{STARTS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}</select>
        </label>
        <label>Durasi (hari)
          <input type="number" min={LIMITS.durationDays.min} max={LIMITS.durationDays.max} value={input.durationDays} onChange={e => set('durationDays', num(e.target.value, 0))} />
        </label>
        <label>Belajar per hari (menit)
          <input type="number" min={LIMITS.dailyMinutes.min} max={LIMITS.dailyMinutes.max} step={5} value={input.dailyMinutes} onChange={e => set('dailyMinutes', num(e.target.value, 0))} />
        </label>
        <label>Hari belajar per minggu
          <input type="number" min={1} max={7} value={input.daysPerWeek} onChange={e => set('daysPerWeek', num(e.target.value, 0))} />
        </label>
        <label>Tanggal mulai
          <input type="date" value={input.startDate} onChange={e => set('startDate', e.target.value)} />
        </label>
        <label>Fokus
          <select value={input.focus} onChange={e => set('focus', e.target.value as Focus)}>{FOCUS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}</select>
        </label>
      </form>

      {isPlanError(plan) ? (
        <p className="warn" role="alert"><AlertTriangle size={16} aria-hidden /> {plan.message}</p>
      ) : (
        <>
          {plan.warnings.map(w => <p key={w} className="warn" role="alert"><AlertTriangle size={16} aria-hidden /> {w}</p>)}

          <div className="stats">
            <div><strong>{Math.round(plan.summary.coverage * 100)}%</strong><span>materi tercakup</span></div>
            <div><strong>{plan.summary.studyDays}</strong><span>hari belajar</span></div>
            <div><strong>{plan.summary.restDays}</strong><span>hari istirahat</span></div>
            <div><strong>{plan.summary.evaluationDays}</strong><span>hari evaluasi</span></div>
            <div><strong>{plan.summary.requiredMinutesPerDay}</strong><span>menit/hari ideal</span></div>
          </div>

          <h2 className="kicker">Roadmap ({input.startDate} sampai {plan.summary.endDate})</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Minggu</th><th>Fokus</th><th>Kosakata</th><th>Kanji</th><th>Tata bahasa</th><th>Menit</th></tr></thead>
              <tbody>
                {plan.weeks.map(w => (
                  <tr key={w.week}>
                    <td>{w.week}</td><td>{w.label}</td><td>{w.newItems.kotoba}</td><td>{w.newItems.kanji}</td><td>{w.newItems.bunpou}</td><td>{w.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="kicker">7 hari pertama</h2>
          <div className="grid">
            {plan.days.slice(0, 7).map(d => (
              <article key={d.dayNumber} className="card static">
                <strong>Hari {String(d.dayNumber).padStart(2, '0')} <small className="muted">{d.date}</small></strong>
                {d.kind === 'evaluation' && <span className="tag">Evaluasi</span>}
                {d.newItems.map(it => (
                  <span key={it.category}>{it.category === 'kotoba' ? 'Kosakata' : it.category === 'kanji' ? 'Kanji' : 'Tata bahasa'}: {it.count} ({it.level})</span>
                ))}
                {d.reviewOf.length > 0 && <span className="muted">Ulasan hari {d.reviewOf.join(', ')}</span>}
                <span className="meta">{Math.round(d.estimatedMinutes)} menit</span>
              </article>
            ))}
          </div>

          <div className="row">
            <button className="btn primary" onClick={() => { savePlan(input); setSaved(true); }}><Save size={16} aria-hidden /> Simpan di perangkat ini</button>
            <button className="btn ghost" disabled title="Perlu login SevnQuest (segera hadir)"><CalendarCheck size={16} aria-hidden /> Impor ke SevnQuest</button>
          </div>
          {saved && <p role="status" className="good">Tersimpan. Lihat di My Journey.</p>}
        </>
      )}
    </section>
  );
}
