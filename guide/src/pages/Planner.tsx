import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, Save } from 'lucide-react';
import { generatePlan, isPlanError, LIMITS } from '../planner/planner';
import { savePlan } from '../lib/storage';
import { PRODUCT } from '../products';
import type { Focus, Goal, PlanInput, StartLevel } from '../planner/types';

const { goals: GOALS, starts: STARTS, focuses, defaults } = PRODUCT.planner;
const FOCUS_LABEL: Record<Focus, string> = { balanced: 'Seimbang', kotoba: 'Kosakata', kanji: 'Kanji', bunpou: 'Tata bahasa' };
const FOCUS = focuses.map(v => ({ v, l: FOCUS_LABEL[v] }));


const todayIso = () => new Date().toISOString().slice(0, 10);
const num = (v: string, fallback: number) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : fallback);

export default function Planner({ query }: { query: string }) {
  const q = new URLSearchParams(query).get('goal') as Goal | null;
  const [input, setInput] = useState<PlanInput>({
    goal: q && GOALS.some(g => g.v === q) ? q : GOALS[0].v,
    startLevel: STARTS[0].v, ...defaults, startDate: todayIso(), focus: 'balanced',
  });
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => { setInput(p => ({ ...p, [k]: v })); setSaved(false); };

  const plan = useMemo(() => generatePlan(input), [input]);

  return (
    <section className="flex flex-col gap-4 pt-4">
      <div><h1 className="text-heading-page">Perencana Belajar</h1>
      <p className="text-body-regular">Jadwal dihitung dari jumlah materi di kurikulum SevnQuest dengan aturan tetap (bukan tebakan AI), sehingga hasilnya konsisten dan bisa diuji.</p></div>

      <form className="panel grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={e => e.preventDefault()}>
        <label className="flex flex-col gap-1 text-caption-meta">Target
          <select className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" value={input.goal} onChange={e => set('goal', e.target.value as Goal)}>{GOALS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-caption-meta">Level saat ini
          <select className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" value={input.startLevel} onChange={e => set('startLevel', e.target.value as StartLevel)}>{STARTS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-caption-meta">Durasi (hari)
          <input className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" type="number" min={LIMITS.durationDays.min} max={LIMITS.durationDays.max} value={input.durationDays} onChange={e => set('durationDays', num(e.target.value, 0))} />
        </label>
        <label className="flex flex-col gap-1 text-caption-meta">Belajar per hari (menit)
          <input className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" type="number" min={LIMITS.dailyMinutes.min} max={LIMITS.dailyMinutes.max} step={5} value={input.dailyMinutes} onChange={e => set('dailyMinutes', num(e.target.value, 0))} />
        </label>
        <label className="flex flex-col gap-1 text-caption-meta">Hari belajar per minggu
          <input className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" type="number" min={1} max={7} value={input.daysPerWeek} onChange={e => set('daysPerWeek', num(e.target.value, 0))} />
        </label>
        <label className="flex flex-col gap-1 text-caption-meta">Tanggal mulai
          <input className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" type="date" value={input.startDate} onChange={e => set('startDate', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-caption-meta">Fokus
          <select className="bg-surface-inset text-text-primary border border-border-subtle rounded-xl px-3 py-2.5 text-sm font-medium min-h-11" value={input.focus} onChange={e => set('focus', e.target.value as Focus)}>{FOCUS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}</select>
        </label>
      </form>

      {isPlanError(plan) ? (
        <p className="panel flex gap-2 items-start text-body-regular !text-state-danger" role="alert"><AlertTriangle size={16} className="shrink-0" aria-hidden /> {plan.message}</p>
      ) : (
        <>
          {plan.warnings.map(w => <p key={w} className="panel flex gap-2 items-start text-body-regular" role="alert"><AlertTriangle size={16} className="shrink-0 text-gold" aria-hidden /> {w}</p>)}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="panel !p-3 flex flex-col"><strong className="font-heading text-2xl text-gold">{Math.round(plan.summary.coverage * 100)}%</strong><span className="text-caption-meta">materi tercakup</span></div>
            <div className="panel !p-3 flex flex-col"><strong className="font-heading text-2xl text-gold">{plan.summary.studyDays}</strong><span className="text-caption-meta">hari belajar</span></div>
            <div className="panel !p-3 flex flex-col"><strong className="font-heading text-2xl text-gold">{plan.summary.restDays}</strong><span className="text-caption-meta">hari istirahat</span></div>
            <div className="panel !p-3 flex flex-col"><strong className="font-heading text-2xl text-gold">{plan.summary.evaluationDays}</strong><span className="text-caption-meta">hari evaluasi</span></div>
            <div className="panel !p-3 flex flex-col"><strong className="font-heading text-2xl text-gold">{plan.summary.requiredMinutesPerDay}</strong><span className="text-caption-meta">menit/hari ideal</span></div>
          </div>

          <h2 className="text-heading-section">Peta Jalan ({input.startDate} sampai {plan.summary.endDate})</h2>
          <div className="panel !p-0 overflow-x-auto">
            <table className="w-full text-xs font-medium text-text-secondary [&_th]:text-left [&_th]:font-mono [&_th]:text-text-muted [&_th]:p-3 [&_td]:p-3 [&_td]:border-t [&_td]:border-border-subtle whitespace-nowrap">
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

          <h2 className="text-heading-section">7 hari pertama</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.days.slice(0, 7).map(d => (
              <article key={d.dayNumber} className="panel flex flex-col gap-1 items-start">
                <strong className="text-card-title font-heading text-base">Hari {String(d.dayNumber).padStart(2, '0')} <small className="text-text-muted font-mono text-[10px]">{d.date}</small></strong>
                {d.kind === 'evaluation' && <span className="rpg-badge-reward">Evaluasi</span>}
                {d.newItems.map(it => (
                  <span key={it.category} className="text-body-regular">{it.category === 'kotoba' ? 'Kosakata' : it.category === 'kanji' ? 'Kanji' : 'Tata bahasa'}: {it.count} ({it.level})</span>
                ))}
                {d.reviewOf.length > 0 && <span className="text-caption-meta">Ulasan hari {d.reviewOf.join(', ')}</span>}
                <span className="text-caption-meta">{Math.round(d.estimatedMinutes)} menit</span>
              </article>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="btn rpg-btn rpg-btn-primary" onClick={() => { savePlan(input); setSaved(true); }}><Save size={16} aria-hidden /> Simpan di perangkat ini</button>
            <button className="btn rpg-btn opacity-50 cursor-not-allowed" disabled title="Perlu login SevnQuest (segera hadir)"><CalendarCheck size={16} aria-hidden /> Impor ke SevnQuest</button>
          </div>
          {saved && <p role="status" className="text-state-success text-sm font-bold">Tersimpan. Lihat di Perjalananku.</p>}
        </>
      )}
    </section>
  );
}
