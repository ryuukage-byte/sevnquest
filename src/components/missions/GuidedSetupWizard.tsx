import React, { useMemo, useState } from 'react';
import { Compass, Sparkles } from 'lucide-react';
import type { GuidedCategory, GuidedFocus, GuidedProfile, JlptLevel, StartLevel } from '../../engine/curriculum/types';
import { targetOptionsFor, MINUTES_PER_ITEM, PROFILE_LIMITS } from '../../engine/curriculum/curriculum';
import { getCurriculum } from '../../engine/curriculum/sources';
import { playSound } from '../../utils/audio';

interface GuidedSetupWizardProps {
  initial?: GuidedProfile;
  hasActivePlan?: boolean;
  soundEnabled?: boolean;
  onSubmit: (profile: GuidedProfile) => void;
  onCancel?: () => void;
}

const START_LEVELS: { value: StartLevel; label: string }[] = [
  { value: 'PEMULA', label: 'Pemula' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
];
const DURATIONS = [30, 60, 90, 120, 180];
const MINUTES = [15, 30, 45, 60, 90];
const FOCUS: { value: GuidedFocus; label: string }[] = [
  { value: 'balanced', label: 'Seimbang' },
  { value: 'kotoba', label: 'Kotoba' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'bunpou', label: 'Bunpou' },
];
const CATEGORY_LABEL: Record<GuidedCategory, string> = { kotoba: 'Kotoba', kanji: 'Kanji', bunpou: 'Bunpou' };

const DEFAULT_PROFILE: GuidedProfile = { currentLevel: 'PEMULA', targetLevel: 'N5', durationDays: 60, minutesPerDay: 30, focus: 'balanced' };

function Pills<T extends string | number>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`skeuo-tier-pill ${o.value === value ? 'active' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Field: React.FC<{ step: string; title: string; hint?: string; children: React.ReactNode }> = ({ step, title, hint, children }) => (
  <div className="space-y-1.5 relative z-10">
    <p className="text-xs font-bold text-text-primary font-heading">
      <span className="font-mono text-gold mr-1.5">{step}</span>{title}
    </p>
    {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    {children}
  </div>
);

export const GuidedSetupWizard: React.FC<GuidedSetupWizardProps> = ({ initial, hasActivePlan, soundEnabled = true, onSubmit, onCancel }) => {
  const [profile, setProfile] = useState<GuidedProfile>(initial || DEFAULT_PROFILE);
  const set = <K extends keyof GuidedProfile>(key: K, value: GuidedProfile[K]) => {
    playSound('click', soundEnabled);
    setProfile(prev => {
      const next = { ...prev, [key]: value };
      // Target selalu di atas level saat ini.
      const targets = targetOptionsFor(next.currentLevel);
      if (!targets.includes(next.targetLevel)) next.targetLevel = targets[0];
      return next;
    });
  };

  const targets = targetOptionsFor(profile.currentLevel);
  const curriculum = useMemo(() => getCurriculum(profile), [profile]);
  const newMinutes = (['kotoba', 'kanji', 'bunpou'] as const).reduce((n, c) => n + curriculum.quota[c] * MINUTES_PER_ITEM[c], 0);
  const partial = (['kotoba', 'kanji', 'bunpou'] as const).filter(c => curriculum.coverage[c].planned < curriculum.coverage[c].available);

  return (
    <div className="space-y-3">
      <div className="panel panel-stitched p-4 sm:p-5 border border-border-subtle shadow-md space-y-4">
        <div className="relative z-10">
          <h3 className="text-base font-bold font-heading text-text-primary flex items-center gap-2">
            <Compass className="w-5 h-5 text-gold" /> {hasActivePlan ? 'Ubah Kurikulum' : 'Susun Kurikulum Belajarmu'}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Tentukan level, target, dan waktu belajarmu. SevnQuest menyusun urutan materi lalu membaginya menjadi misi harian,
            lengkap dengan jadwal Recall. Eksplorasi bebas di Library tetap tersedia.
          </p>
        </div>

        <Field step="01" title="Level saat ini" hint="Level yang sudah kamu kuasai. Materi yang pernah kamu pelajari otomatis dilewati.">
          <Pills options={START_LEVELS} value={profile.currentLevel} onChange={v => set('currentLevel', v)} />
        </Field>

        <Field step="02" title="Target level">
          <Pills options={targets.map(t => ({ value: t, label: t }))} value={profile.targetLevel} onChange={(v: JlptLevel) => set('targetLevel', v)} />
        </Field>

        <Field step="03" title="Durasi program">
          <Pills options={DURATIONS.map(d => ({ value: d, label: `${d} hari` }))} value={profile.durationDays} onChange={v => set('durationDays', v)} />
        </Field>

        <Field step="04" title="Waktu belajar per hari">
          <Pills options={MINUTES.map(m => ({ value: m, label: `${m} menit` }))} value={profile.minutesPerDay} onChange={v => set('minutesPerDay', v)} />
        </Field>

        <Field step="05" title="Preferensi belajar" hint="Menentukan pembagian waktu antara kotoba, kanji, dan bunpou.">
          <Pills options={FOCUS} value={profile.focus} onChange={v => set('focus', v)} />
        </Field>
      </div>

      {/* Pratinjau: dihitung langsung dari basis data materi */}
      <div className="panel panel-stitched p-4 sm:p-5 border border-border-subtle shadow-md space-y-3">
        <p className="text-xs font-bold text-text-primary font-heading flex items-center gap-1.5 relative z-10">
          <Sparkles className="w-4 h-4 text-gold" /> Pratinjau kurikulum {curriculum.levels.join(' + ')}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10">
          {(['kotoba', 'kanji', 'bunpou'] as const).map(c => (
            <div key={c} className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `var(--color-${c})` }}>{CATEGORY_LABEL[c]} / hari</p>
              <p className="text-lg font-bold font-mono text-text-primary">{curriculum.quota[c]}</p>
            </div>
          ))}
          <div className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--color-choukai)' }}>Recall / hari</p>
            <p className="text-lg font-bold font-mono text-text-primary">±{Math.round(curriculum.recallMinutes)}<span className="text-[11px] text-text-muted"> mnt</span></p>
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          {(['kotoba', 'kanji', 'bunpou'] as const).map(c => {
            const cov = curriculum.coverage[c];
            const pct = cov.available > 0 ? Math.round((cov.planned / cov.available) * 100) : 0;
            return (
              <div key={c} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-text-muted">
                  <span>{CATEGORY_LABEL[c]}: {cov.planned} dari {cov.available} materi</span>
                  <span>{pct}%</span>
                </div>
                <div className="skeuo-progress-track">
                  <div className={`skeuo-progress-bar ${pct >= 100 ? 'completed' : ''}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-text-muted relative z-10">
          Materi baru ±{Math.round(newMinutes)} menit + Recall ±{Math.round(curriculum.recallMinutes)} menit per hari
          (batas {PROFILE_LIMITS.minutesPerDay.min}–{PROFILE_LIMITS.minutesPerDay.max} menit).
          {partial.length > 0 && (
            <> Dengan waktu ini, {partial.map(c => CATEGORY_LABEL[c]).join(' dan ')} belum tercakup seluruhnya —
            materi prioritas didahulukan. Tambah durasi atau waktu harian untuk cakupan lebih luas.</>
          )}
        </p>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={() => { playSound('correct', soundEnabled); onSubmit(profile); }}
            className="btn-cta flex-1 py-2.5 px-5 text-xs flex items-center justify-center gap-1.5"
          >
            {hasActivePlan ? 'Simpan & Susun Ulang' : 'Mulai Program'}
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn-physical-secondary px-4 py-2.5 rounded-xl text-xs font-bold">Batal</button>
          )}
        </div>
        {hasActivePlan && (
          <p className="text-[11px] text-text-muted relative z-10">
            Menyusun ulang memulai hitungan hari dari Day 01. Materi yang sudah kamu pelajari tetap tercatat dan tidak ditugaskan lagi.
          </p>
        )}
      </div>
    </div>
  );
};
