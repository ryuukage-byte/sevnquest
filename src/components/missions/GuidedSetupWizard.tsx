import React, { useMemo, useState } from 'react';
import { Compass, Target, CalendarClock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ItemMasteryRecord } from '../../types/content';
import type { GuidedCategory, GuidedFocus, GuidedMode, GuidedProfile, JlptLevel, StartLevel } from '../../engine/curriculum/types';
import {
  analyzePlan, targetOptionsFor, PROFILE_LIMITS, EVALUATION_EVERY_DAYS, EVALUATION_QUESTIONS,
} from '../../engine/curriculum/curriculum';
import { getCurriculum, getFoundation } from '../../engine/curriculum/sources';
import { playSound } from '../../utils/audio';

interface GuidedSetupWizardProps {
  initial?: GuidedProfile;
  hasActivePlan?: boolean;
  /** Riwayat belajar: menentukan gap (materi inti yang belum dipelajari) dan diagnosis fondasi. */
  mastery?: Record<string, ItemMasteryRecord>;
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
const DURATIONS = [30, 60, 90, 120, 180, 365];
const MINUTES = [15, 30, 45, 60, 90, 120];
const FOCUS: { value: GuidedFocus; label: string }[] = [
  { value: 'balanced', label: 'Seimbang' },
  { value: 'kotoba', label: 'Kotoba' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'bunpou', label: 'Bunpou' },
];
const CATEGORIES: readonly GuidedCategory[] = ['kotoba', 'kanji', 'bunpou'];
const CATEGORY_LABEL: Record<GuidedCategory, string> = { kotoba: 'Kotoba', kanji: 'Kanji', bunpou: 'Bunpou' };

const DEFAULT_PROFILE: GuidedProfile = {
  mode: 'target', currentLevel: 'PEMULA', targetLevel: 'N5', durationDays: 60, minutesPerDay: 30, focus: 'balanced',
};

const fmt = (n: number) => n.toLocaleString('id-ID');
const duration = (days: number) => (days >= 60 ? `${fmt(days)} hari (±${Math.round(days / 30)} bulan)` : `${fmt(days)} hari`);

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

const Field: React.FC<{ title: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="space-y-1.5 relative z-10">
    <p className="text-xs font-bold text-text-primary font-heading">{title}</p>
    {children}
    {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
  </div>
);

export const GuidedSetupWizard: React.FC<GuidedSetupWizardProps> = ({ initial, hasActivePlan, mastery, soundEnabled = true, onSubmit, onCancel }) => {
  const [profile, setProfile] = useState<GuidedProfile>(() => ({ ...DEFAULT_PROFILE, ...initial, mode: initial ? (initial.mode ?? 'time') : 'target' }));
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
  const curriculum = useMemo(() => getCurriculum(profile), [profile.currentLevel, profile.targetLevel]);
  const analysis = useMemo(() => analyzePlan(profile, curriculum, mastery), [profile, curriculum, mastery]);
  const foundation = useMemo(() => getFoundation(profile.currentLevel, mastery), [profile.currentLevel, mastery]);

  const levelName = curriculum.levels.length > 1
    ? `${curriculum.levels[0]}–${curriculum.levels[curriculum.levels.length - 1]}`
    : curriculum.levels[0];
  const isTarget = profile.mode === 'target';
  const overLimit = isTarget && analysis.requiredDays > PROFILE_LIMITS.durationDays.max;
  const gapTotal = CATEGORIES.reduce((n, c) => n + analysis.categories[c].gap, 0);
  const foundationCore = foundation.reduce((n, f) => n + f.core, 0);
  const foundationLearned = foundation.reduce((n, f) => n + f.learned, 0);
  const foundationPct = foundationCore > 0 ? Math.round((foundationLearned / foundationCore) * 100) : 0;
  const perluasan = analysis.categories.kotoba.library - analysis.categories.kotoba.core;

  // Keputusan kelayakan: informasi terpenting, ditaruh paling atas.
  const verdict = gapTotal === 0
    ? { ok: true, title: `Materi inti ${levelName} sudah kamu pelajari semua`, body: 'Tidak ada materi baru untuk dijadwalkan. Pilih target yang lebih tinggi, atau pertahankan lewat Recall.' }
    : overLimit
      ? {
          ok: false,
          title: `${profile.minutesPerDay} menit/hari belum realistis untuk ${profile.targetLevel}`,
          body: `Menuntaskan materi inti butuh ±${duration(analysis.requiredDays)}, melebihi batas program ${PROFILE_LIMITS.durationDays.max} hari. `
            + `Tambah waktu harian, atau jalani program ini sebagai tahap pertama (mencakup ±${analysis.coveragePercent}% materi inti).`,
        }
      : isTarget
        ? {
            ok: true,
            title: `Perkiraan: ${duration(analysis.days)} sampai tuntas`,
            body: `Dengan ${profile.minutesPerDay} menit/hari, seluruh ${fmt(gapTotal)} materi inti ${levelName} yang belum kamu pelajari selesai dalam ±${fmt(analysis.days)} hari, termasuk waktu mengulangnya.`,
          }
        : analysis.feasible
          ? {
              ok: true,
              title: `Cukup untuk menuntaskan materi inti ${levelName}`,
              body: `${fmt(analysis.days)} hari × ${profile.minutesPerDay} menit mencakup seluruh ${fmt(gapTotal)} materi yang belum kamu pelajari`
                + (analysis.requiredDays < analysis.days ? ` (perkiraan selesai sekitar hari ke-${fmt(analysis.requiredDays)}).` : '.'),
            }
          : {
              ok: false,
              title: `Belum cukup untuk menuntaskan ${profile.targetLevel}`,
              body: `${fmt(analysis.days)} hari × ${profile.minutesPerDay} menit mencakup ±${analysis.coveragePercent}% materi inti ${levelName}; program ini difokuskan pada materi prioritas. `
                + `Untuk tuntas: ±${duration(analysis.requiredDays)} dengan ${profile.minutesPerDay} menit/hari`
                + (analysis.requiredMinutesPerDay <= PROFILE_LIMITS.minutesPerDay.max
                  ? `, atau ±${fmt(analysis.requiredMinutesPerDay)} menit/hari dalam ${fmt(analysis.days)} hari.`
                  : '.'),
            };

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {/* Formulir */}
      <div className="panel panel-stitched p-4 sm:p-5 border border-border-subtle shadow-md space-y-3.5">
        <div className="relative z-10">
          <h3 className="text-base font-bold font-heading text-text-primary flex items-center gap-2">
            <Compass className="w-5 h-5 text-gold" /> {hasActivePlan ? 'Ubah Kurikulum' : 'Susun Kurikulum Belajarmu'}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Kurikulum disusun dari materi inti level target yang belum kamu pelajari, lalu dibagi menjadi misi harian + Recall.
          </p>
        </div>

        <Field
          title="Jenis program"
          hint={isTarget
            ? 'Kamu menentukan target dan waktu harian; sistem menghitung berapa lama sampai tuntas.'
            : 'Kamu menentukan durasi dan waktu harian; sistem menyatakan seberapa banyak materi prioritas yang realistis.'}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'target' as GuidedMode, label: 'Capai Target', Icon: Target },
              { value: 'time' as GuidedMode, label: 'Atur Waktu', Icon: CalendarClock },
            ]).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => set('mode', value)}
                aria-pressed={profile.mode === value}
                className={`skeuo-tier-pill flex items-center justify-center gap-1.5 ${profile.mode === value ? 'active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          title="Level saat ini"
          hint={profile.currentLevel === 'PEMULA'
            ? 'Mulai dari awal. Materi yang pernah kamu pelajari otomatis dilewati.'
            : (
              <span className="flex items-start gap-1">
                {foundationPct < 50 && <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--color-bunpou)' }} />}
                <span>
                  Riwayat belajarmu mencatat {foundationPct}% materi inti sampai {profile.currentLevel} ({fmt(foundationLearned)} dari {fmt(foundationCore)}).
                  {foundationPct < 50 && ' Pilihan level tidak diverifikasi: jika belum yakin, mulai dari level lebih rendah — yang sudah dikuasai akan cepat terlewati.'}
                </span>
              </span>
            )}
        >
          <Pills options={START_LEVELS} value={profile.currentLevel} onChange={v => set('currentLevel', v)} />
        </Field>

        <Field title="Target level">
          <Pills options={targets.map(t => ({ value: t, label: t }))} value={profile.targetLevel} onChange={(v: JlptLevel) => set('targetLevel', v)} />
        </Field>

        <Field title="Waktu belajar per hari">
          <Pills options={MINUTES.map(m => ({ value: m, label: `${m} menit` }))} value={profile.minutesPerDay} onChange={v => set('minutesPerDay', v)} />
        </Field>

        {!isTarget && (
          <>
            <Field title="Durasi program">
              <Pills options={DURATIONS.map(d => ({ value: d, label: `${d} hari` }))} value={profile.durationDays} onChange={v => set('durationDays', v)} />
            </Field>
            <Field title="Prioritas" hint="Dipakai saat waktu tidak cukup untuk semua kategori.">
              <Pills options={FOCUS} value={profile.focus} onChange={v => set('focus', v)} />
            </Field>
          </>
        )}
      </div>

      {/* Analisis: kelayakan dulu, baru rinciannya */}
      <div className="panel panel-stitched p-4 sm:p-5 border border-border-subtle shadow-md space-y-3">
        <div
          className="rounded-2xl border p-3.5 relative z-10"
          style={{
            borderColor: verdict.ok ? 'var(--color-state-success)' : 'var(--color-bunpou)',
            background: 'var(--color-surface-inset)',
          }}
          role="status"
        >
          <p className="text-sm font-bold font-heading flex items-start gap-2" style={{ color: verdict.ok ? 'var(--color-state-success)' : 'var(--color-bunpou)' }}>
            {verdict.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{verdict.title}</span>
          </p>
          <p className="text-xs text-text-secondary mt-1">{verdict.body}</p>
          {!isTarget && !analysis.feasible && gapTotal > 0 && analysis.requiredDays <= PROFILE_LIMITS.durationDays.max && (
            <button
              type="button"
              onClick={() => set('mode', 'target')}
              className="btn-physical-secondary mt-2.5 px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5"
            >
              Jadikan program sampai tuntas ({fmt(analysis.requiredDays)} hari) <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Library -> inti target -> sudah dipelajari -> perlu dipelajari */}
        <div className="relative z-10 overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="text-text-muted text-right">
                <th className="text-left font-normal py-1">Materi {levelName}</th>
                <th className="font-normal px-1.5">Inti target</th>
                <th className="font-normal px-1.5">Sudah</th>
                <th className="font-normal px-1.5">Perlu</th>
                <th className="font-normal pl-1.5">Program ini</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(c => {
                const a = analysis.categories[c];
                return (
                  <tr key={c} className="text-right text-text-primary border-t border-border-subtle">
                    <td className="text-left py-1.5 font-bold" style={{ color: `var(--color-${c})` }}>{CATEGORY_LABEL[c]}</td>
                    <td className="px-1.5">{fmt(a.core)}</td>
                    <td className="px-1.5">{fmt(a.learned)}</td>
                    <td className="px-1.5">{fmt(a.gap)}</td>
                    <td className="pl-1.5 font-bold" style={{ color: a.planned >= a.gap ? 'var(--color-state-success)' : 'var(--color-bunpou)' }}>
                      {fmt(a.planned)}{a.gap > 0 && a.planned < a.gap ? ` (${Math.floor((a.planned / a.gap) * 100)}%)` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {perluasan > 0 && (
            <p className="text-[11px] text-text-muted mt-1.5">
              Library memuat {fmt(analysis.categories.kotoba.library)} kotoba {levelName}; {fmt(perluasan)} di antaranya kosakata perluasan
              (level perkiraan) yang bukan syarat target dan tetap bisa dijelajahi bebas.
            </p>
          )}
        </div>

        {/* Beban harian */}
        <div className="grid grid-cols-3 gap-2 relative z-10">
          {CATEGORIES.map(c => (
            <div key={c} className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `var(--color-${c})` }}>{CATEGORY_LABEL[c]} / hari</p>
              <p className="text-lg font-bold font-mono text-text-primary">{analysis.categories[c].quota}</p>
              <p className="text-[10px] text-text-muted">±{curriculum.learnMinutes[c]} mnt/materi</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-text-muted relative z-10">
          Rata-rata per hari: materi baru ±{analysis.newMinutesPerDay} menit + Recall ±{analysis.recallMinutesPerDay} menit
          (tiap materi diulang ±{analysis.reviewsPerItem}× selama program). Porsi Recall tidak tetap: mengikuti jumlah materi yang jatuh tempo hari itu,
          dan materi baru menyesuaikan. Tiap {EVALUATION_EVERY_DAYS} hari ada evaluasi {EVALUATION_QUESTIONS} soal level target
          (kosakata, kanji, tata bahasa, dan bacaan).
        </p>

        <div className="flex items-center gap-2 relative z-10">
          <button
            disabled={gapTotal === 0}
            onClick={() => { playSound('correct', soundEnabled); onSubmit(profile); }}
            className="btn-cta flex-1 py-2.5 px-5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {hasActivePlan ? 'Simpan & Susun Ulang' : verdict.ok ? 'Mulai Program' : 'Mulai sebagai Program Prioritas'}
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
